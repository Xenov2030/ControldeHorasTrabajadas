export function publicCloudConfig({
  url = "",
  key = "",
  development = false,
} = {}) {
  if (!url && !key) return { enabled: false };
  let validKey = key.startsWith("sb_publishable_");
  if (!validKey && key.split(".").length === 3) {
    try {
      const payload = JSON.parse(
        atob(key.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")),
      );
      validKey = payload.role === "anon";
    } catch {}
  }
  if (!validKey)
    throw new Error(
      "Supabase necesita una clave pública publishable o anon. Nunca uses service_role ni sb_secret en variables NEXT_PUBLIC.",
    );
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Falta una URL válida para el proyecto de Supabase.");
  }
  if (
    parsed.username ||
    parsed.password ||
    !(
      parsed.protocol === "https:" ||
      (development &&
        ["localhost", "127.0.0.1"].includes(parsed.hostname) &&
        parsed.protocol === "http:")
    )
  )
    throw new Error(
      "La URL pública de Supabase debe usar HTTPS y no contener credenciales.",
    );
  return { enabled: true, url: parsed.origin, key };
}
