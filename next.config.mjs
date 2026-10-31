import { publicCloudConfig } from "./lib/public-cloud-config.mjs";
// Fail before bundling if a private key was accidentally placed in a public variable.
publicCloudConfig({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  key:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "",
  development: process.env.NODE_ENV === "development",
});
export default { allowedDevOrigins: ["127.0.0.1"] };
