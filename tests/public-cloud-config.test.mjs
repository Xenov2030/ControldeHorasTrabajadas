import test from "node:test";
import assert from "node:assert/strict";
import { publicCloudConfig } from "../lib/public-cloud-config.mjs";
const url = "https://example.supabase.co";
test("no configuration keeps the existing local mode explicit", () =>
  assert.equal(publicCloudConfig().enabled, false));
test("public configuration accepts publishable keys and legacy anon keys", () => {
  assert.equal(
    publicCloudConfig({ url, key: "sb_publishable_public_only" }).enabled,
    true,
  );
  const key = "header." + btoa(JSON.stringify({ role: "anon" })) + ".signature";
  assert.equal(publicCloudConfig({ url, key }).enabled, true);
});
test("private Supabase keys cannot be embedded in the browser build", () => {
  assert.throws(() =>
    publicCloudConfig({ url, key: "sb_secret_never_public" }),
  );
  assert.throws(() =>
    publicCloudConfig({
      url,
      key:
        "header." +
        btoa(JSON.stringify({ role: "service_role" })) +
        ".signature",
    }),
  );
});
test("production configuration refuses partial setup or plaintext endpoints", () => {
  assert.throws(() => publicCloudConfig({ url }));
  assert.throws(() =>
    publicCloudConfig({
      url: "http://example.supabase.co",
      key: "sb_publishable_public_only",
    }),
  );
  assert.equal(
    publicCloudConfig({
      url: "http://127.0.0.1:54399",
      key: "sb_publishable_test_only",
      development: true,
    }).enabled,
    true,
  );
});
