"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "./icon";

const INSTALLED_KEY = "jornadapp-installed-v1";
export default function InstallApp() {
  const [installed, setInstalled] = useState(null),
    [platform, setPlatform] = useState(""),
    [available, setAvailable] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const prompt = useRef(null),
    help = useRef(null),
    markInstalled = useRef(null);
  useEffect(() => {
    const standalone = matchMedia("(display-mode: standalone)");
    let alive = true;
    const inApp = () => standalone.matches || navigator.standalone === true;
    const remembered = () => {
      try {
        return localStorage.getItem(INSTALLED_KEY) === "1";
      } catch {
        return false;
      }
    };
    const save = () => {
      if (!alive) return;
      try {
        localStorage.setItem(INSTALLED_KEY, "1");
      } catch {}
      setInstalled(true);
      setAvailable(false);
      prompt.current = null;
      help.current?.close();
    };
    markInstalled.current = save;
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setPlatform(
      ios ? "ios" : /Android/.test(navigator.userAgent) ? "android" : "desktop",
    );
    async function check() {
      if (inApp()) {
        save();
        return;
      }
      let detected = false;
      if (navigator.getInstalledRelatedApps) {
        try {
          const apps = await navigator.getInstalledRelatedApps();
          detected = apps.some(
            (app) =>
              app.platform === "webapp" &&
              (app.url ===
                new URL("/manifest.webmanifest", location.origin).href ||
                app.id === new URL("/", location.origin).href),
          );
        } catch {}
      }
      if (!alive) return;
      if (detected) save();
      else if (!prompt.current) setInstalled(remembered());
    }
    const before = (event) => {
      event.preventDefault();
      if (inApp()) return;
      // A fresh offer also makes reinstalling possible after a previous uninstall.
      try {
        localStorage.removeItem(INSTALLED_KEY);
      } catch {}
      prompt.current = event;
      setInstalled(false);
      setAvailable(true);
      setMessage("");
    };
    const modeChanged = () => {
      if (inApp()) save();
      else void check();
    };
    const storageChanged = (event) => {
      if (event.key === INSTALLED_KEY) setInstalled(remembered() || inApp());
    };
    const visible = () => {
      if (document.visibilityState === "visible") void check();
    };
    window.addEventListener("beforeinstallprompt", before);
    window.addEventListener("appinstalled", save);
    window.addEventListener("storage", storageChanged);
    document.addEventListener("visibilitychange", visible);
    standalone.addEventListener("change", modeChanged);
    void check();
    return () => {
      alive = false;
      window.removeEventListener("beforeinstallprompt", before);
      window.removeEventListener("appinstalled", save);
      window.removeEventListener("storage", storageChanged);
      document.removeEventListener("visibilitychange", visible);
      standalone.removeEventListener("change", modeChanged);
    };
  }, []);
  async function install() {
    setMessage("");
    const offer = prompt.current;
    if (!offer) {
      help.current?.showModal();
      return;
    }
    prompt.current = null;
    setAvailable(false);
    setBusy(true);
    try {
      await offer.prompt();
      const choice = await offer.userChoice;
      if (choice.outcome !== "accepted")
        setMessage(
          "Podés instalarla más adelante desde el menú del navegador.",
        );
    } catch {
      setMessage("Usá el menú del navegador para instalar JornadApp.");
    } finally {
      setBusy(false);
    }
  }
  if (installed !== false || (!available && platform === "desktop"))
    return null;
  return (
    <div className="install-app">
      <button
        className="primary install-app-button"
        onClick={install}
        disabled={busy}
      >
        <Icon name="download" size={17} />
        {busy ? "Abriendo instalación…" : "Instalar JornadApp"}
      </button>
      {message && <p role="status">{message}</p>}
      <dialog
        ref={help}
        className="install-help panel"
        aria-labelledby="install-help-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) help.current.close();
        }}
      >
        <h2 id="install-help-title">
          Instalar JornadApp en tu{" "}
          {platform === "ios" ? "iPhone o iPad" : "celular"}
        </h2>
        {platform === "ios" ? (
          <ol>
            <li>Abrí esta página en Safari.</li>
            <li>
              Tocá <strong>Compartir</strong> (el cuadrado con la flecha hacia
              arriba).
            </li>
            <li>
              Elegí <strong>Agregar a pantalla de inicio</strong> y confirmá con{" "}
              <strong>Agregar</strong>.
            </li>
          </ol>
        ) : (
          <ol>
            <li>Abrí el menú de tu navegador (⋮).</li>
            <li>
              Buscá <strong>Instalar aplicación</strong> o{" "}
              <strong>Agregar a pantalla de inicio</strong>.
            </li>
            <li>Confirmá la instalación de JornadApp.</li>
          </ol>
        )}
        <p>
          Se instala desde el navegador, sin Play Store ni App Store. Abrila con
          el reloj de tu pantalla de inicio. Necesitás conexión para abrir y
          sincronizar la app.
        </p>
        <p>
          Si ya la agregaste y el navegador sigue mostrando el botón, podés
          ocultarlo acá.
        </p>
        <div className="button-row">
          <button className="primary" onClick={() => markInstalled.current?.()}>
            Ya la instalé
          </button>
          <button className="secondary" onClick={() => help.current.close()}>
            Cerrar instrucciones
          </button>
        </div>
      </dialog>
    </div>
  );
}
