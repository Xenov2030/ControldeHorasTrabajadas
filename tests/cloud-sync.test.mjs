import test from "node:test";
import assert from "node:assert/strict";
import { createWorkspace, addDays } from "../lib/workspace.mjs";
import {
  SyncQueue,
  chooseWorkspace,
  accountKey,
  cloudPayload,
  writeCloud,
  readCloud,
} from "../lib/cloud-sync.mjs";
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
test("cache keys separate account data", () =>
  assert.notEqual(accountKey("account-a"), accountKey("account-b")));
test("a clean cache never replaces newer remote data", () => {
  const old = createWorkspace(),
    remote = createWorkspace();
  remote.profile.name = "Remote";
  assert.equal(
    chooseWorkspace(
      { payload: remote, revision: 2 },
      { workspace: old, baseRevision: 1, dirty: false },
    ).workspace.profile.name,
    "Remote",
  );
});
test("pending data resumes only from the same revision; stale cache becomes a conflict", () => {
  const s = createWorkspace();
  assert.equal(
    chooseWorkspace(
      { payload: s, revision: 2 },
      { workspace: s, baseRevision: 1, dirty: true },
    ).kind,
    "conflict",
  );
  assert.equal(
    chooseWorkspace(
      { payload: s, revision: 2 },
      { workspace: s, baseRevision: 2, dirty: true },
    ).dirty,
    true,
  );
  assert.equal(chooseWorkspace(null, null).kind, "new");
});
test("invalid and oversized snapshots never reach the database", () => {
  assert.throws(() => cloudPayload({}));
  const s = createWorkspace();
  s.entries = Array.from({ length: 11000 }, (_, i) => ({
    id: String(i),
    date: addDays("2000-01-01", i),
    hours: 1,
    type: "work",
    quantity: 0,
    note: "x".repeat(200),
  }));
  assert.throws(() => cloudPayload(s), /2 MB/);
});
test("writes are serialized and intermediate snapshots coalesced", async () => {
  const requests = [],
    release = [];
  const q = new SyncQueue({
    revision: 1,
    write: (s, r) =>
      new Promise((resolve) => {
        requests.push({ s, r });
        release.push(resolve);
      }),
  });
  const a = createWorkspace();
  a.profile.name = "A";
  q.enqueue(a);
  const b = structuredClone(a);
  b.profile.name = "B";
  q.enqueue(b);
  const c = structuredClone(a);
  c.profile.name = "C";
  q.enqueue(c);
  assert.equal(requests.length, 1);
  release[0]({ revision: 2 });
  await tick();
  assert.equal(requests.length, 2);
  assert.equal(requests[1].r, 2);
  assert.equal(requests[1].s.profile.name, "C");
  release[1]({ revision: 3 });
  await tick();
  assert.equal(q.revision, 3);
  assert.equal(q.dirty, false);
});
test("network errors retain pending changes for a deliberate retry", async () => {
  let calls = 0;
  const q = new SyncQueue({
    write: async () => {
      if (++calls === 1) throw new Error("offline");
      return { revision: 1 };
    },
  });
  q.enqueue(createWorkspace());
  await tick();
  assert.equal(q.dirty, true);
  assert.equal(calls, 1);
  q.retry();
  await tick();
  assert.equal(calls, 2);
  assert.equal(q.dirty, false);
});
test("a conflict never retries automatically with a stale revision", async () => {
  let calls = 0;
  const q = new SyncQueue({
    write: async () => {
      calls++;
      throw { code: "40001" };
    },
  });
  q.enqueue(createWorkspace());
  await tick();
  q.retry();
  await tick();
  assert.equal(calls, 1);
  assert.equal(q.dirty, true);
});
test("closing a session stops queued writes and callbacks from an old account", async () => {
  let finish,
    saved = 0;
  const q = new SyncQueue({
    write: () => new Promise((resolve) => (finish = resolve)),
    onSaved: () => saved++,
  });
  q.enqueue(createWorkspace());
  q.enqueue(createWorkspace());
  q.close();
  finish({ revision: 1 });
  await tick();
  assert.equal(saved, 0);
  assert.throws(() => q.enqueue(createWorkspace()));
});
test("RPC includes the expected owner and revision and checks confirmation", async () => {
  let sent;
  const fake = {
    rpc: async (name, args) => {
      sent = { name, args };
      return { data: [{ revision: 2 }] };
    },
  };
  await writeCloud(fake, "owner-a", createWorkspace(), 1, "device");
  assert.equal(sent.name, "save_workspace");
  assert.equal(sent.args.p_owner_id, "owner-a");
  assert.equal(sent.args.p_expected_revision, 1);
  await assert.rejects(() =>
    writeCloud(
      { rpc: async () => ({ data: [{ revision: 99 }] }) },
      "owner-a",
      createWorkspace(),
      1,
      "device",
    ),
  );
});
test("reads require an owner filter and refuse mismatched responses", async () => {
  let owner;
  const fake = {
    from: () => ({
      select: () => ({
        eq: (key, value) => {
          assert.equal(key, "owner_id");
          owner = value;
          return {
            maybeSingle: async () => ({
              data: {
                owner_id: "other",
                payload: createWorkspace(),
                revision: 1,
              },
            }),
          };
        },
      }),
    }),
  };
  await assert.rejects(() => readCloud(fake, "expected"));
  assert.equal(owner, "expected");
});

test("revision polling requests metadata rather than downloading salary data repeatedly", async () => {
  const { readCloudRevision } = await import("../lib/cloud-sync.mjs");
  let selected;
  const client = {
    from: () => ({
      select: (fields) => {
        selected = fields;
        return {
          eq: () => ({
            maybeSingle: async () => ({ data: { owner_id: "a", revision: 2 } }),
          }),
        };
      },
    }),
  };
  const row = await readCloudRevision(client, "a");
  assert.equal(row.revision, 2);
  assert.equal(selected.includes("payload"), false);
});
