import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./globals.css";
import "./design.css";
export const metadata = {
  title: "Jornadapp · Tus horas, claras",
  description:
    "Registrá tu jornada, calculá tus horas extra y organizá tus cobros. Hecho para tu forma de trabajar.",
};
export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111426",
};
export default function Layout({ children }) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=JSON.parse(localStorage.getItem('jornada-v2')||'null');var t=s&&s.profile&&s.profile.theme;document.documentElement.dataset.theme=t==='dark'||t==='light'?t:matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
