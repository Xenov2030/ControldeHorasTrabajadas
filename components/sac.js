"use client";
import { useState } from "react";
import { currency, sacEstimate } from "../lib/workspace.mjs";
import Icon from "./icon";
const monthName = (n) =>
  new Intl.DateTimeFormat("es-AR", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(2026, n, 1)),
  );
export default function Sac({ state, onSave, today }) {
  const [year, setYear] = useState(Number(today.slice(0, 4))),
    [half, setHalf] = useState(Number(today.slice(5, 7)) <= 6 ? 1 : 2),
    [message, setMessage] = useState("");
  const result = sacEstimate(
    state.sac,
    year,
    half,
    state.profile.employmentStart,
  );
  function save(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const rows = Array.from({ length: 6 }, (_, i) => {
      const month = `${year}-${String((half - 1) * 6 + i + 1).padStart(2, "0")}`,
        base = form.get("base" + i),
        extras = form.get("extras" + i);
      return base !== "" || extras !== ""
        ? { month, base: Number(base), extras: Number(extras) }
        : null;
    }).filter(Boolean);
    try {
      onSave({
        ...state,
        sac: [
          ...state.sac.filter(
            (r) =>
              !r.month.startsWith(`${year}-`) ||
              Number(r.month.slice(5)) <= (half - 1) * 6 ||
              Number(r.month.slice(5)) > half * 6,
          ),
          ...rows,
        ],
      });
      setMessage("Remuneraciones guardadas.");
    } catch (err) {
      setMessage(err.message);
    }
  }
  return (
    <>
      <div className="notice">
        <Icon name="info" />
        <div>
          <strong>Una estimación para orientarte.</strong>
          <p>
            Cargá la remuneración computable de cada mes y sus extras, sin
            duplicarlas. Usamos la mitad del mejor total mensual del semestre,
            proporcional por fecha de ingreso. No es una liquidación legal ni
            una lectura de recibos.
          </p>
        </div>
      </div>
      <div className="sac-layout">
        <section className="panel">
          <div className="panel-heading">
            <h2>Tu semestre, mes por mes</h2>
            <p>
              Dejá vacío un mes si todavía no tenés el dato. Cero significa que
              lo confirmaste sin remuneración.
            </p>
          </div>
          <div className="sac-select">
            <label>
              Año
              <input
                type="number"
                min="2000"
                max="2100"
                value={year}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (n >= 2000 && n <= 2100) setYear(n);
                }}
              />
            </label>
            <label>
              Semestre
              <select
                value={half}
                onChange={(e) => setHalf(Number(e.target.value))}
              >
                <option value="1">Enero – junio</option>
                <option value="2">Julio – diciembre</option>
              </select>
            </label>
          </div>
          <form key={`${year}-${half}`} onSubmit={save} className="sac-form">
            <div className="sac-row sac-head">
              <span>Mes</span>
              <span>Base sin extras ($)</span>
              <span>Extras ($)</span>
            </div>
            {Array.from({ length: 6 }, (_, i) => {
              const n = (half - 1) * 6 + i,
                month = `${year}-${String(n + 1).padStart(2, "0")}`,
                row = state.sac.find((r) => r.month === month);
              return (
                <div className="sac-row" key={month}>
                  <strong>{monthName(n)}</strong>
                  <input
                    aria-label={`Base ${monthName(n)}`}
                    name={"base" + i}
                    type="number"
                    min="0"
                    step="0.01"
                    max="1000000000000"
                    defaultValue={row?.base ?? ""}
                    placeholder="Sin cargar"
                  />
                  <input
                    aria-label={`Extras ${monthName(n)}`}
                    name={"extras" + i}
                    type="number"
                    min="0"
                    step="0.01"
                    max="1000000000000"
                    defaultValue={row?.extras ?? ""}
                    placeholder="Sin cargar"
                  />
                </div>
              );
            })}
            <button className="primary">Guardar remuneraciones</button>
            {message && <p role="status">{message}</p>}
          </form>
        </section>
        <section className="panel sac-result">
          <span className="icon-tile">
            <Icon name="gift" />
          </span>
          <div className="eyebrow">AGUINALDO ESTIMADO</div>
          <strong className="big-amount">{currency(result.amount)}</strong>
          <p>
            {result.months}/6 meses cargados
            {result.months < 6 ? " · Estimación incompleta" : ""}
          </p>
          <div className="breakdown">
            <div>
              <span>Componente base</span>
              <strong>{currency(result.base)}</strong>
            </div>
            <div>
              <span>Incidencia de extras</span>
              <strong>{currency(result.extras)}</strong>
            </div>
            <div>
              <span>Mejor mes registrado</span>
              <strong>{result.bestMonth || "Sin datos"}</strong>
            </div>
            <div>
              <span>Proporción del semestre</span>
              <strong>{Math.round(result.factor * 100)} %</strong>
            </div>
          </div>
          <p>
            El desglose corresponde al mismo mes de mayor remuneración total.
            Cobrar las extras por separado no genera un SAC independiente.
          </p>
          {!state.profile.employmentStart && (
            <p className="field-help">
              Sin fecha de ingreso: asumimos el semestre completo. Podés
              agregarla en Configuración.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
