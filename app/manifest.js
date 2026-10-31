export default function manifest() {
  return {
    id: "/",
    name: "JornadApp · Tu tiempo bien contado",
    short_name: "JornadApp",
    description: "Tus trabajos, jornadas y cobros, con tu tiempo bien contado.",
    lang: "es-AR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#111426",
    theme_color: "#111426",
    icons: [
      {
        src: "/brand/favicon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    prefer_related_applications: false,
    related_applications: [
      {
        platform: "webapp",
        url: "https://controldehorastrabajadas.vercel.app/manifest.webmanifest",
        id: "https://controldehorastrabajadas.vercel.app/",
      },
    ],
  };
}
