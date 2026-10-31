"use client";
import { useState } from "react";
import { addDays, parseDate, dateLabel } from "../lib/workspace.mjs";
import { vacationDays } from "../lib/vacations.mjs";

export function VacationForm({ state, today, onSave }) {
  const [start, setStart] = useState(today),
    [end, setEnd] = useState(today),
    [paid, setPaid] = useState(true),
    [note, setNote] = useState(""),
    [error, setError] = useState("");
  let days = 0;
  try {
    days = vacationDays(start, end);
  } catch {}
  return (
    <form
      className="entry-form"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          onSave({ id: crypto.randomUUID(), start, end, paid, note });
        } catch (err) {
          setError(err.message);
        }
      }}
    >
      <p>
        Elegí el período completo, incluidos los días de descanso. Podés
        registrar vacaciones pasadas o planificar las próximas. Las horas se
        asignan únicamente a tus días laborables.
      </p>
      <div className="form-grid">
        <label>
          Inicio de vacaciones
          <input
            type="date"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label>
          Fin de vacaciones
          <input
            type="date"
            required
            min={start}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <label className="check wide">
          <input
            type="checkbox"
            checked={paid}
            onChange={(e) => setPaid(e.target.checked)}
          />
          Vacaciones pagas
        </label>
        <label className="wide">
          Nota de vacaciones · opcional
          <input
            maxLength={200}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej.: descanso de verano"
          />
        </label>
      </div>
      <p>
        {days > 0
          ? `${days} días corridos, incluyendo inicio y fin.`
          : "Revisá las fechas del período."}
      </p>
      <p>
        En pago por hora o jornada se usa el valor habitual. El sueldo fijo
        conserva su proyección y no descuenta vacaciones sin pago
        automáticamente. No calculamos el plus vacacional ni días disponibles
        por antigüedad.
      </p>
      {state.activeSession && (
        <p role="alert">
          Cerrá tu entrada activa antes de guardar las vacaciones.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <button
        className="primary"
        disabled={!!state.activeSession}
        type="submit"
      >
        Guardar período de vacaciones
      </button>
    </form>
  );
}
export default function Vacations({
  state,
  today,
  reference,
  onReference,
  onRemove,
}) {
  const month = reference.slice(0, 7),
    first = month + "-01";
  const offset = (parseDate(first).getUTCDay() + 6) % 7;
  const date = parseDate(first),
    last = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
    ).getUTCDate();
  const periods = [...(state.vacationPeriods || [])].sort((a, b) =>
    b.start.localeCompare(a.start),
  );
  const vacationEntries = state.entries.filter((e) => e.type === "vacation");
  const label = new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  return (
    <section
      className="vacations-panel panel"
      aria-label="Calendario de vacaciones"
    >
      <div className="panel-heading">
        <h2>Tus vacaciones, a la vista</h2>
        <p>
          Planificadas, en curso y anteriores. Cada trabajo conserva sus propios
          períodos.
        </p>
      </div>
      <div className="vacations-layout">
        <div>
          <label className="vacation-month">
            Mes del calendario de vacaciones
            <input
              type="month"
              value={month}
              onChange={(e) => {
                if (/^\d{4}-\d{2}$/.test(e.target.value))
                  onReference(e.target.value + "-01");
              }}
            />
          </label>
          <div
            className="vacation-calendar"
            role="group"
            aria-label={`Vacaciones en ${label}`}
          >
            {["L", "M", "X", "J", "V", "S", "D"].map((day, i) => (
              <span className="vacation-weekday" key={i}>
                {day}
              </span>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={`blank-${i}`} aria-hidden="true" />
            ))}
            {Array.from({ length: last }, (_, i) => {
              const day = addDays(first, i),
                vacation =
                  periods.some((p) => p.start <= day && p.end >= day) ||
                  vacationEntries.some((e) => e.date === day);
              return (
                <span
                  key={day}
                  className={`vacation-day${vacation ? " booked" : ""}${day === today ? " today" : ""}`}
                  aria-label={`${dateLabel(day)}${vacation ? (day > today ? " · Vacaciones planificadas" : " · Vacaciones") : ""}`}
                >
                  {i + 1}
                  {vacation && <span aria-hidden="true">●</span>}
                </span>
              );
            })}
          </div>
          <p className="vacation-legend">
            <span aria-hidden="true">●</span> Días de vacaciones · El borde
            marca hoy.
          </p>
        </div>
        <div className="vacation-periods">
          {periods.length ? (
            <details open>
              <summary>Períodos guardados ({periods.length})</summary>
              {periods.map((period) => (
                <article className="vacation-period" key={period.id}>
                  <span className="badge">
                    {period.start > today
                      ? "Planificadas"
                      : period.end < today
                        ? "Finalizadas"
                        : "En vacaciones"}
                  </span>
                  <strong>
                    {dateLabel(period.start)} — {dateLabel(period.end)}
                  </strong>
                  <p>
                    {vacationDays(period.start, period.end)} días corridos ·{" "}
                    {period.paid ? "Pagas" : "Sin pago"}
                  </p>
                  {period.note && <p>{period.note}</p>}
                  <button
                    className="text-button danger"
                    aria-label={`Eliminar vacaciones del ${dateLabel(period.start)}`}
                    onClick={() => {
                      if (
                        window.confirm(
                          "¿Eliminar este período completo y sus jornadas de vacaciones?",
                        )
                      )
                        onRemove(period.id);
                    }}
                  >
                    Eliminar período
                  </button>
                </article>
              ))}
            </details>
          ) : (
            <p>
              Usá «Registrar vacaciones» para cargar un período completo. Los
              días de vacaciones que ya cargaste individualmente también
              aparecen en el calendario.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
