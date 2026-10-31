const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const name = `jornada-beta-test-${process.pid}`;
const runtimeEnv = { ...process.env };
for (const key of [
  "DOCKER_HOST",
  "DOCKER_CONTEXT",
  "DOCKER_TLS",
  "DOCKER_TLS_VERIFY",
  "DOCKER_CERT_PATH",
])
  delete runtimeEnv[key];
const image =
  "postgres:16-alpine@sha256:0cefaabd882e42bcb2a2f3dc56d3ce4770560ba62fd7f197f1a2e008fd5731ab";
function docker(args, input) {
  const result = spawnSync(
    "docker",
    ["--host=unix:///var/run/docker.sock", ...args],
    { env: runtimeEnv, input, encoding: "utf8", maxBuffer: 3000000 },
  );
  if (result.status !== 0)
    throw new Error(result.stderr || result.error?.message || result.stdout);
  return result.stdout;
}
const sql = (text) =>
  docker(
    [
      "exec",
      "-i",
      name,
      "psql",
      "-U",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-q",
    ],
    text,
  );
(async () => {
  let started = false;
  try {
    docker([
      "run",
      "--rm",
      "--network",
      "none",
      "--name",
      name,
      "-e",
      "POSTGRES_HOST_AUTH_METHOD=trust",
      "-d",
      image,
    ]);
    started = true;
    let ready = false;
    for (let i = 0; i < 80; i++) {
      const p = spawnSync(
        "docker",
        [
          "--host=unix:///var/run/docker.sock",
          "exec",
          name,
          "pg_isready",
          "-U",
          "postgres",
        ],
        { env: runtimeEnv, encoding: "utf8" },
      );
      if (p.status === 0) {
        ready = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!ready) throw new Error("PostgreSQL did not become ready");
    sql(
      `create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');`,
    );
    const migration = fs.readFileSync(
      path.join(root, "supabase/migrations/202610310001_beta_workspaces.sql"),
      "utf8",
    );
    sql(migration);
    sql(migration);
    const { createWorkspace } = await import("../lib/workspace.mjs");
    const a = createWorkspace(),
      b = createWorkspace();
    a.profile.name = "Cuenta A";
    b.profile.name = "Cuenta B";
    const json = (value) =>
      "'" + JSON.stringify(value).replaceAll("'", "''") + "'::jsonb";
    const uidA = "11111111-1111-4111-8111-111111111111",
      uidB = "22222222-2222-4222-8222-222222222222",
      device = "33333333-3333-4333-8333-333333333333";
    const actor = (uid, body) =>
      `begin;set local role authenticated;select set_config('request.jwt.claim.sub','${uid}',true);${body}commit;`;
    sql(
      actor(
        uidA,
        `select * from public.save_workspace('${uidA}',0,${json(a)},'${device}');`,
      ),
    );
    console.log("PASS: initial workspace saved");
    sql(
      actor(
        uidB,
        `do $$ begin if exists(select 1 from public.workspaces) then raise exception 'RLS leaked account A';end if;end $$;select * from public.save_workspace('${uidB}',0,${json(b)},'${device}');`,
      ),
    );
    console.log("PASS: account B cannot read account A");
    sql(
      actor(
        uidA,
        `do $$ begin if (select count(*) from public.workspaces)<>1 then raise exception 'RLS leaked rows';end if;begin perform public.save_workspace('${uidB}',1,${json(a)},'${device}');raise exception 'Cross-account write allowed';exception when insufficient_privilege then null;end;begin update public.workspaces set revision=99;raise exception 'Direct write allowed';exception when insufficient_privilege then null;end;end $$;`,
      ),
    );
    console.log("PASS: cross-account RPC and direct writes rejected");
    a.profile.name = "Actualizado";
    sql(
      actor(
        uidA,
        `select * from public.save_workspace('${uidA}',1,${json(a)},'${device}');do $$ begin begin perform public.save_workspace('${uidA}',1,${json(b)},'${device}');raise exception 'Stale overwrite allowed';exception when serialization_failure then null;end;if (select payload->'profile'->>'name' from public.workspaces)<>'Actualizado' then raise exception 'Lost update';end if;end $$;`,
      ),
    );
    console.log("PASS: stale revisions cannot overwrite a newer save");
    sql(
      actor(
        uidA,
        `do $$ begin begin perform public.save_workspace('${uidA}',0,${json(b)},'${device}');raise exception 'Duplicate creation allowed';exception when serialization_failure then null;end;begin perform public.save_workspace('${uidA}',2,'{}'::jsonb,'${device}');raise exception 'Invalid JSON accepted';exception when invalid_parameter_value then null;end;begin perform public.save_workspace('${uidA}',2,null,'${device}');raise exception 'NULL payload accepted';exception when invalid_parameter_value then null;end;end $$;`,
      ),
    );
    console.log("PASS: duplicate creation and invalid payload rejected");
    sql(
      `begin;set local role anon;do $$ begin begin perform * from public.workspaces;raise exception 'Anonymous read allowed';exception when insufficient_privilege then null;end;begin perform public.save_workspace('${uidA}',0,${json(a)},'${device}');raise exception 'Anonymous write allowed';exception when insufficient_privilege then null;end;end $$;commit;`,
    );
    console.log("PASS: anonymous database access rejected");
    sql(
      `delete from auth.users where id='${uidA}';do $$ begin if exists(select 1 from public.workspaces where owner_id='${uidA}') then raise exception 'User data not removed';end if;if (select count(*) from public.workspaces)<>1 then raise exception 'Other account affected';end if;end $$;`,
    );
    console.log("PASS: deleting an account removes only its workspace");
    console.log(
      "7 PostgreSQL integration checks passed; migration is repeatable.",
    );
  } finally {
    if (started) docker(["stop", "--time", "1", name]);
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
