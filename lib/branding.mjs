// Public creator credit and owner-provided portfolio URL.
export const CREATOR = {
  name: "Nicolas Aguirres",
  portfolioUrl: "https://nicolasaguirrescode.com/",
};
export function portfolioLink(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
