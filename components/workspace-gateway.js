"use client";
import { useEffect, useRef, useState } from "react";
import { cloudConfig, getSupabase } from "../lib/supabase-client";
import {
  accountKey,
  currencyBackupKey,
  cloudPayload,
  readCloud,
  readCloudRevision,
  writeCloud,
  chooseWorkspace,
  SyncQueue,
  cloudMessage,
  LOCAL_WORKSPACE_KEY,
} from "../lib/cloud-sync.mjs";
import { createWorkspace, migrateLegacy } from "../lib/workspace.mjs";
import CreatorCredit from "./creator-credit";
import BrandLogo from "./brand-logo";
import Icon from "./icon";

function download(value, name) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
function Loading() {
  return (
    <div className="loading">
      <BrandLogo />
      <p>Abriendo tu espacio personal…</p>
    </div>
  );
}
function AccountFrame({ children }) {
  return (
    <main className="account-screen">
      <div className="account-story">
        <a className="brand" href="/">
          <BrandLogo tone="dark" />
        </a>
        <span className="eyebrow">TU TIEMPO TE ACOMPAÑA</span>
        <h1>
          De tu trabajo
          <br />a tu bolsillo.
          <br />
          <span>Sin perder la cuenta.</span>
        </h1>
        <p>
          Tus jornadas, tus horas extra y tus cobros.
          <br />
          En el teléfono y en la computadora.
        </p>
        <div className="account-promises">
          <span>
            <Icon name="lock" />
            Un espacio privado por cuenta
          </span>
          <span>
            <Icon name="clock" />
            Tus registros, donde los necesites
          </span>
        </div>
      </div>
      <section className="account-content">
        <div className="account-card panel">{children}</div>
        <CreatorCredit />
      </section>
    </main>
  );
}
function SignIn({ client }) {
  const [busy, setBusy] = useState(""),
    [message, setMessage] = useState(""),
    [email, setEmail] = useState("");
  async function google() {
    setBusy("google");
    setMessage("");
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/auth/callback" },
      });
      if (error) throw error;
    } catch {
      setMessage(
        "No se pudo abrir Google. Revisá la conexión o usá el enlace por correo.",
      );
      setBusy("");
    }
  }
  async function mail(e) {
    e.preventDefault();
    setBusy("email");
    setMessage("");
    try {
      const { error } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin + "/auth/callback",
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      setMessage(
        "Si el correo puede recibir el enlace, te llegará un mensaje para ingresar. Abrilo en este mismo navegador.",
      );
    } catch {
      setMessage(
        "No pudimos enviar el enlace. Reintentá más tarde o ingresá con Google.",
      );
    }
    setBusy("");
  }
  return (
    <AccountFrame>
      <span className="badge premium">BETA</span>
      <h2>Tu espacio empieza acá.</h2>
      <p>
        Ingresá para guardar tus datos en tu cuenta y recuperarlos en otros
        dispositivos.
      </p>
      <button className="google-button" disabled={!!busy} onClick={google}>
        <span className="google-g" aria-hidden="true">
          G
        </span>
        {busy === "google" ? "Abriendo Google…" : "Continuar con Google"}
      </button>
      <div className="account-divider">
        <span />o recibí un enlace por correo
        <span />
      </div>
      <form onSubmit={mail}>
        <label>
          Tu correo electrónico
          <input
            type="email"
            autoComplete="email"
            value={email}
            maxLength={254}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vos@ejemplo.com"
            required
          />
        </label>
        <button className="primary" disabled={!!busy}>
          {busy === "email" ? "Enviando…" : "Enviar enlace para ingresar"}
        </button>
      </form>
      {message && (
        <div className="inline-note" role="status">
          {message}
        </div>
      )}
      <p className="account-footnote">
        No pedimos tu contraseña de Google ni recibos de sueldo. La importación
        de los registros anteriores de este navegador se elige después de
        ingresar.
      </p>
    </AccountFrame>
  );
}
export default function WorkspaceGateway({ children }) {
  const config = cloudConfig();
  if (!config.enabled) return children(null);
  if (config.error)
    return (
      <AccountFrame>
        <h2>La beta necesita terminar su configuración.</h2>
        <p>{config.error}</p>
      </AccountFrame>
    );
  return <CloudAccount>{children}</CloudAccount>;
}
function CloudAccount({ children }) {
  const [user, setUser] = useState(undefined),
    [error, setError] = useState("");
  const client = getSupabase();
  useEffect(() => {
    let alive = true,
      sequence = 0,
      lastToken;
    async function apply(session) {
      if (session?.access_token && session.access_token === lastToken) return;
      lastToken = session?.access_token;
      const request = ++sequence;
      if (!session) {
        if (alive) setUser(null);
        return;
      }
      try {
        const result = await client.auth.getUser();
        if (result.error || !result.data.user) throw result.error;
        if (alive && sequence === request) {
          setError("");
          setUser(result.data.user);
        }
      } catch {
        if (alive && sequence === request) {
          setError("No pudimos validar tu sesión. Volvé a ingresar.");
          setUser(null);
        }
      }
    }
    const { data } = client.auth.onAuthStateChange((_, session) => {
      queueMicrotask(() => apply(session));
    });
    client.auth.getSession().then(({ data, error }) => {
      if (error) {
        setError("No se pudo recuperar la sesión.");
        setUser(null);
      } else void apply(data.session);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [client]);
  if (user === undefined) return <Loading />;
  if (!user)
    return (
      <>
        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}
        <SignIn client={client} />
      </>
    );
  return (
    <AccountWorkspace key={user.id} client={client} user={user}>
      {children}
    </AccountWorkspace>
  );
}
function AccountWorkspace({ client, user, children }) {
  const [phase, setPhase] = useState("loading"),
    [initial, setInitial] = useState(null),
    [generation, setGeneration] = useState(0),
    [status, setStatus] = useState("loading"),
    [error, setError] = useState(""),
    [updated, setUpdated] = useState(null),
    [lastSaved, setLastSaved] = useState(null);
  const controller = useRef(null),
    latest = useRef(null),
    device = useRef(null),
    source = useRef(null),
    cacheSource = useRef(null),
    alive = useRef(true),
    dirty = useRef(false),
    refreshing = useRef(false);
  const key = accountKey(user.id),
    backupKey = currencyBackupKey(user.id);
  function persist(workspace, revision, pending) {
    localStorage.setItem(
      key,
      JSON.stringify({ workspace, baseRevision: revision, dirty: pending }),
    );
  }
  function install(workspace, revision, pending = false) {
    cloudPayload(workspace);
    controller.current?.close();
    latest.current = workspace;
    persist(workspace, revision, pending);
    const queue = new SyncQueue({
      revision,
      write: (payload, rev) =>
        writeCloud(client, user.id, payload, rev, device.current),
      onStatus: (value) => {
        if (!alive.current) return;
        dirty.current = value !== "synced";
        setStatus(value);
        if (value === "conflict") setPhase("conflict");
      },
      onSaved: (row, hasPending) => {
        if (!alive.current) return;
        try {
          persist(latest.current, row.revision, hasPending);
        } catch {
          setError(
            "El guardado remoto se confirmó, pero no se pudo actualizar la copia local. Descargá una copia.",
          );
          setLastSaved(row.updated_at);
          return;
        }
        setLastSaved(row.updated_at);
        setError("");
      },
      onError: (failure) => {
        if (alive.current) setError(cloudMessage(failure));
      },
    });
    controller.current = queue;
    dirty.current = pending;
    setInitial(workspace);
    setGeneration((n) => n + 1);
    setPhase("ready");
    setStatus(pending ? "pending" : "synced");
    setUpdated(null);
    if (pending) queue.enqueue(workspace);
  }
  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    async function load() {
      try {
        device.current =
          localStorage.getItem("jornada-device-v1") || crypto.randomUUID();
        localStorage.setItem("jornada-device-v1", device.current);
        const raw = localStorage.getItem(key),
          cache = raw ? JSON.parse(raw) : null;
        cacheSource.current = cache;
        const remote = await readCloud(client, user.id);
        if (cancelled) return;
        const choice = chooseWorkspace(remote, cache);
        if (choice.kind === "conflict") {
          latest.current = cache.workspace;
          setError(
            "Hay cambios de otro dispositivo y una copia pendiente en este navegador. No sobrescribimos ninguna versión.",
          );
          setPhase("conflict");
          setStatus("conflict");
          return;
        }
        if (choice.kind === "recovery") {
          source.current = choice.cache.workspace;
          setPhase("new");
          return;
        }
        if (choice.kind === "new") {
          const local = localStorage.getItem(LOCAL_WORKSPACE_KEY),
            legacy = localStorage.getItem("jornada-v1");
          if (local) {
            try {
              source.current = cloudPayload(JSON.parse(local));
            } catch {
              source.current = null;
            }
          } else if (legacy) {
            try {
              source.current = migrateLegacy(JSON.parse(legacy));
            } catch {
              source.current = null;
            }
          }
          setPhase("new");
          return;
        }
        install(choice.workspace, choice.revision, choice.dirty);
      } catch {
        if (!cancelled) {
          setPhase("error");
          setError(
            "No pudimos abrir tus datos. Revisá la conexión y que la base esté configurada. No creamos un espacio vacío sobre tus registros.",
          );
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
      alive.current = false;
      controller.current?.close();
    };
  }, [key, client, user.id]);
  useEffect(() => {
    if (phase !== "ready") return;
    async function check() {
      if (
        document.visibilityState !== "visible" ||
        controller.current?.dirty ||
        refreshing.current
      )
        return;
      refreshing.current = true;
      try {
        const remote = await readCloudRevision(client, user.id);
        if (
          alive.current &&
          remote &&
          remote.revision > controller.current.revision
        )
          setUpdated(remote);
      } catch {
        /* A failed check never changes confirmed data or overwrites the local cache. */
      } finally {
        refreshing.current = false;
      }
    }
    const online = () => {
      controller.current?.retry();
      void check();
    };
    const timer = setInterval(check, 45000);
    window.addEventListener("focus", check);
    window.addEventListener("online", online);
    document.addEventListener("visibilitychange", check);
    const unload = (e) => {
      if (controller.current?.dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", check);
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("beforeunload", unload);
    };
  }, [phase]);
  function save(workspace, { currencyBackup } = {}) {
    cloudPayload(workspace);
    if (!controller.current || phase !== "ready")
      throw new Error("Esperá a que se abra tu cuenta.");
    if (currencyBackup)
      localStorage.setItem(backupKey, JSON.stringify(currencyBackup));
    persist(workspace, controller.current.revision, true);
    latest.current = workspace;
    controller.current.enqueue(workspace);
  }
  function newWorkspace(importLocal) {
    try {
      let value = importLocal ? source.current : createWorkspace();
      if (!value) throw new Error();
      if (!importLocal) {
        const name =
          user.user_metadata?.full_name || user.user_metadata?.name || "";
        value.profile.name = typeof name === "string" ? name.slice(0, 80) : "";
      }
      install(value, 0, true);
    } catch {
      setError(
        "No pudimos preparar la cuenta. Conservamos los datos anteriores.",
      );
    }
  }
  async function useRemote() {
    if (phase === "ready" && controller.current?.dirty) {
      setError(
        "Hay cambios pendientes en este dispositivo. Esperá el guardado o resolvé el conflicto antes de cargar otra versión.",
      );
      return;
    }
    try {
      if (latest.current)
        localStorage.setItem(
          key + ":conflict-backup",
          JSON.stringify(latest.current),
        );
      const remote = await readCloud(client, user.id);
      if (!remote) throw new Error();
      install(remote.payload, remote.revision);
      setError("");
    } catch {
      setError(
        "No se pudo cargar la versión remota. Tu copia local sigue conservada.",
      );
    }
  }
  async function signOut() {
    if (
      controller.current?.dirty &&
      !confirm(
        "Quedan cambios pendientes. Se conservarán en este dispositivo para sincronizarlos cuando vuelvas a ingresar. ¿Cerrar sesión?",
      )
    )
      return;
    const pending = controller.current
      ? controller.current.dirty
      : cacheSource.current?.dirty;
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) {
      setError("No se pudo cerrar la sesión. Reintentá.");
      return;
    }
    controller.current?.close();
    if (!pending && controller.current && phase === "ready")
      localStorage.removeItem(key);
  }
  const accountHeader = (
    <div className="account-identity">
      <Icon name="user" size={17} />
      <span>{user.email || "Tu cuenta"}</span>
      <button className="text-button" onClick={signOut}>
        Cerrar sesión
      </button>
    </div>
  );
  if (phase === "loading") return <Loading />;
  if (phase === "error")
    return (
      <AccountFrame>
        {accountHeader}
        <h2>No se pudo cargar tu espacio.</h2>
        <p role="alert">{error}</p>
        <div className="button-row">
          <button className="primary" onClick={() => window.location.reload()}>
            Reintentar
          </button>
          <button
            className="secondary"
            onClick={() => {
              const raw = localStorage.getItem(key);
              if (raw)
                download(JSON.parse(raw), "jornada-recuperacion-cuenta.json");
            }}
          >
            Descargar copia de este dispositivo
          </button>
        </div>
      </AccountFrame>
    );
  if (phase === "new")
    return (
      <AccountFrame>
        {accountHeader}
        <h2>
          {source.current
            ? "¿Estos registros son tuyos?"
            : "Bienvenido a tu cuenta."}
        </h2>
        <p>
          {source.current
            ? "Encontramos un espacio anterior en este navegador. En un equipo compartido puede pertenecer a otra persona. Solo se importa si lo elegís; el original se conserva."
            : "Vamos a crear un espacio privado para tus horarios y cobros."}
        </p>
        {source.current && (
          <button className="primary" onClick={() => newWorkspace(true)}>
            Importar mis registros de este navegador
          </button>
        )}
        <button
          className={source.current ? "secondary" : "primary"}
          onClick={() => newWorkspace(false)}
        >
          Empezar una cuenta vacía
        </button>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
      </AccountFrame>
    );
  if (phase === "conflict")
    return (
      <AccountFrame>
        {accountHeader}
        <h2>Hay dos versiones de tus datos.</h2>
        <p role="alert">
          {error || "Otra sesión guardó cambios antes que este dispositivo."}
        </p>
        <p>
          Descargá tus cambios locales antes de cargar la versión de la cuenta.
          No los mezclamos ni sobrescribimos automáticamente.
        </p>
        <button
          className="secondary"
          onClick={() =>
            download(
              latest.current || cacheSource.current?.workspace,
              "jornada-cambios-pendientes.json",
            )
          }
        >
          Descargar mis cambios de este dispositivo
        </button>
        <button className="primary" onClick={useRemote}>
          Cargar la versión guardada en mi cuenta
        </button>
      </AccountFrame>
    );
  const cloud = {
    user,
    status,
    lastSaved,
    error,
    initialWorkspace: initial,
    storageKey: key,
    currencyBackupKey: backupKey,
    save,
    retry: () => controller.current?.retry(),
    signOut,
    downloadConflict: (() => {
      try {
        if (!localStorage.getItem(key + ":conflict-backup")) return null;
      } catch {
        return null;
      }
      return () => {
        try {
          const raw = localStorage.getItem(key + ":conflict-backup");
          if (raw)
            download(JSON.parse(raw), "jornada-ultima-copia-conflicto.json");
        } catch {
          setError("No se pudo descargar la copia de conflicto.");
        }
      };
    })(),
  };
  return (
    <>
      <div className="cloud-account-bar">
        {accountHeader}
        <div className={"cloud-status " + status}>
          <Icon name={status === "synced" ? "check" : "clock"} size={14} />
          <span>
            {status === "synced"
              ? "Guardado en tu cuenta"
              : status === "pending"
                ? "Guardado en dispositivo · Sincronizando…"
                : "Cambios pendientes en este dispositivo"}
          </span>
          {status === "error" && (
            <button className="text-button" onClick={cloud.retry}>
              Reintentar
            </button>
          )}
        </div>
      </div>
      {error && (
        <div className="cloud-warning" role="alert">
          {error}
        </div>
      )}
      {updated && (
        <div className="cloud-warning" role="status">
          Hay una versión más reciente de otro dispositivo.{" "}
          <button className="text-button" onClick={useRemote}>
            Cargar actualización
          </button>
        </div>
      )}
      <div key={generation}>{children(cloud)}</div>
    </>
  );
}
