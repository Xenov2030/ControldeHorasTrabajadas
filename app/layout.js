import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./globals.css";
import "./design.css";
import InstallApp from "../components/install-app";
export const metadata = {
  title: "JornadApp · Tu tiempo bien contado",
  applicationName: "JornadApp",
  appleWebApp: { capable: true, title: "JornadApp", statusBarStyle: "default" },
  icons: {
    icon: [
      {
        url: "/brand/favicon-32.png?v=clock-2",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/brand/favicon-192.png?v=clock-2",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    shortcut: "/favicon.ico?v=clock-2",
    apple: "/brand/favicon-180.png?v=clock-2",
  },
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
      <body>
        {children}
        <InstallApp />
      </body>
    </html>
  );
}
