"use client";
import { useEffect, useRef, useState } from "react";
import { getSupabase } from "../../../lib/supabase-client";
import Icon from "../../../components/icon";
export default function Callback() {
  const [error, setError] = useState(""),
    started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function finish() {
      try {
        const url = new URL(window.location.href),
          code = url.searchParams.get("code");
        if (!code || url.searchParams.has("error")) throw new Error();
        const { error } = await getSupabase().auth.exchangeCodeForSession(code);
        if (error) throw error;
        window.location.replace("/");
      } catch {
        setError(
          "No pudimos completar el ingreso. Si usaste un correo, abrí el enlace en el mismo navegador donde lo pediste. Podés volver a intentar.",
        );
      }
    }
    void finish();
  }, []);
  return (
    <main className="loading">
      <Icon name="clock" size={35} />
      <strong>jornada.</strong>
      {error ? (
        <>
          <p role="alert">{error}</p>
          <a className="primary" href="/">
            Volver a ingresar
          </a>
        </>
      ) : (
        <p>Completando el ingreso a tu cuenta…</p>
      )}
    </main>
  );
}
