import { createClient } from "@supabase/supabase-js";
import { publicCloudConfig } from "./public-cloud-config.mjs";
let client;
export function cloudConfig() {
  try {
    return publicCloudConfig({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      key:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        "",
      development: process.env.NODE_ENV === "development",
    });
  } catch {
    return {
      enabled: true,
      error:
        "La configuración del guardado en la nube está incompleta. Revisá la URL y la clave pública de Supabase.",
    };
  }
}
export function getSupabase() {
  const config = cloudConfig();
  if (!config.enabled || config.error)
    throw new Error(config.error || "La nube no está configurada.");
  if (!client)
    client = createClient(config.url, config.key, {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  return client;
}
