import { validateWorkspace } from "./workspace.mjs";
export const LOCAL_WORKSPACE_KEY = "jornada-v2";
export const MAX_CLOUD_BYTES = 2000000;
export const accountKey = (id) => `jornada-account-v1:${id}`;
export const currencyBackupKey = (id) => `${accountKey(id)}:currency-backup`;
export function cloudPayload(value) {
  validateWorkspace(value);
  if (new TextEncoder().encode(JSON.stringify(value)).length > MAX_CLOUD_BYTES)
    throw new Error(
      "Este espacio supera el límite de 2 MB de la beta. Descargá una copia antes de reducir su tamaño.",
    );
  return value;
}
export async function readCloud(client, ownerId) {
  const { data, error } = await client
    .from("workspaces")
    .select("owner_id,payload,revision,updated_at")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (
    data.owner_id !== ownerId ||
    !Number.isSafeInteger(data.revision) ||
    data.revision < 1
  )
    throw new Error("La cuenta recibió una respuesta inesperada.");
  cloudPayload(data.payload);
  return data;
}
export async function readCloudRevision(client, ownerId) {
  const { data, error } = await client
    .from("workspaces")
    .select("owner_id,revision,updated_at")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw error;
  if (
    data &&
    (data.owner_id !== ownerId ||
      !Number.isSafeInteger(data.revision) ||
      data.revision < 1)
  )
    throw new Error("La cuenta recibió una revisión inesperada.");
  return data;
}
export async function writeCloud(client, ownerId, payload, revision, deviceId) {
  cloudPayload(payload);
  const { data, error } = await client.rpc("save_workspace", {
    p_owner_id: ownerId,
    p_expected_revision: revision,
    p_payload: payload,
    p_device_id: deviceId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.revision !== revision + 1)
    throw new Error("No se pudo confirmar el guardado remoto.");
  return row;
}
export function chooseWorkspace(remote, cache) {
  if (cache) {
    cloudPayload(cache.workspace);
    if (!Number.isSafeInteger(cache.baseRevision) || cache.baseRevision < 0)
      throw new Error("La copia local de la cuenta no es válida.");
  }
  const revision = remote?.revision || 0;
  if (cache?.dirty && cache.baseRevision !== revision)
    return { kind: "conflict", remote, cache };
  if (cache?.dirty)
    return {
      kind: "cached",
      workspace: cache.workspace,
      revision,
      dirty: true,
    };
  if (remote)
    return {
      kind: "remote",
      workspace: remote.payload,
      revision,
      dirty: false,
    };
  if (cache) return { kind: "recovery", cache };
  return { kind: "new", revision: 0 };
}
export function cloudMessage(error) {
  if (error?.code === "40001")
    return "Hay cambios guardados desde otro dispositivo. Conservamos tu copia local para revisarlos.";
  if (error?.code === "42501" || error?.status === 401)
    return "La sesión no permite guardar. Volvé a ingresar a tu cuenta.";
  return "No pudimos sincronizar. Tus cambios siguen guardados en este dispositivo. Revisá la conexión y reintentá.";
}

// Serialize writes and coalesce intermediate snapshots. Never retry a stale revision silently.
export class SyncQueue {
  constructor({
    revision = 0,
    write,
    onStatus = () => {},
    onSaved = () => {},
    onError = () => {},
  }) {
    this.revision = revision;
    this.write = write;
    this.onStatus = onStatus;
    this.onSaved = onSaved;
    this.onError = onError;
    this.pending = null;
    this.running = false;
    this.closed = false;
    this.paused = false;
    this.failureStatus = null;
  }
  get dirty() {
    return Boolean(this.pending) || this.running;
  }
  enqueue(value) {
    if (this.closed) throw new Error("La sesión cambió. Volvé a ingresar.");
    cloudPayload(value);
    this.pending = structuredClone(value);
    this.onStatus(this.paused ? this.failureStatus : "pending");
    if (!this.paused) void this.pump();
  }
  async pump() {
    if (this.running || this.closed || this.paused) return;
    this.running = true;
    try {
      while (this.pending && !this.closed) {
        const payload = this.pending;
        this.pending = null;
        try {
          const row = await this.write(payload, this.revision);
          if (this.closed) return;
          this.revision = row.revision;
          this.onSaved(row, Boolean(this.pending));
        } catch (error) {
          if (this.closed) return;
          if (!this.pending) this.pending = payload;
          this.paused = true;
          this.failureStatus = error?.code === "40001" ? "conflict" : "error";
          this.onStatus(this.failureStatus);
          this.onError(error);
          return;
        }
      }
    } finally {
      this.running = false;
      if (!this.closed && !this.paused && !this.pending)
        this.onStatus("synced");
    }
  }
  retry() {
    if (this.closed || this.failureStatus === "conflict") return;
    this.paused = false;
    this.failureStatus = null;
    void this.pump();
  }
  close() {
    this.closed = true;
    this.pending = null;
  }
}
