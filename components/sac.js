"use client";
import { useRef, useState } from "react";
import { currency as formatCurrency, sacEstimate } from "../lib/workspace.mjs";
import Icon from "./icon";
import { countryFor, currencyFor } from "../lib/locations.mjs";
import DecimalInput from "./decimal-input";
import { parseDecimal } from "../lib/decimal.mjs";
const monthName = (n) =>
  new Intl.DateTimeFormat("es-AR", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(2026, n, 1)),
  );
export default function Sac({ state, onSave, today }) {
  const currency = (n) => formatCurrency(n, currencyFor(state.profile));
  const [year, setYear] = useState(Number(today.slice(0, 4))),
    [half, setHalf] = useState(Number(today.slice(5, 7)) <= 6 ? 1 : 2),
    [message, setMessage] = useState(""),
    [dirty, setDirty] = useState(false),
    [formVersion, setFormVersion] = useState(0);
  const formRef = useRef(null);
  function changePeriod(nextYear, nextHalf, month = null) {
    if (
      dirty &&
      !window.confirm(
        "Tenés remuneraciones sin guardar. ¿Descartar esos cambios y cambiar de período?",
      )
    )
      return;
    setYear(nextYear);
    setHalf(nextHalf);
    setMessage("");
    setDirty(false);
    setFormVersion((n) => n + 1);
    if (month)
      requestAnimationFrame(() => {
        formRef.current?.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
        formRef.current?.elements
          .namedItem("base" + ((Number(month.slice(5)) - 1) % 6))
          ?.focus({ preventScroll: true });
      });
  }
  const history = [...state.sac].sort((a, b) => b.month.localeCompare(a.month));
  const monthLabel = (month) =>
    new Intl.DateTimeFormat("es-AR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(month + "-01T12:00:00Z"));
  const result = sacEstimate(
    state.sac,
    year,
    half,
    state.profile.employmentStart,
  );
  function save(e) {
    e.preventDefault();
    try {
      const form = new FormData(e.currentTarget);
      const rows = Array.from({ length: 6 }, (_, i) => {
        const month = `${year}-${String((half - 1) * 6 + i + 1).padStart(2, "0")}`,
          base = form.get("base" + i),
          extras = form.get("extras" + i);
        return base !== "" || extras !== ""
          ? {
              month,
              base: base === "" ? 0 : parseDecimal(base),
              extras: extras === "" ? 0 : parseDecimal(extras),
            }
          : null;
      }).filter(Boolean);
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
      setDirty(false);
      setMessage("Remuneraciones guardadas.");
    } catch (err) {
      setMessage(err.message);
    }
  }
  if (countryFor(state.profile).code !== "AR")
    return (
      <section className="panel settings-panel">
        <span className="icon-tile">
          <Icon name="gift" />
        </span>
        <h2>Aguinaldo según tu país</h2>
        <p>
          Tu ubicación es {countryFor(state.profile).name}. La fórmula
          disponible actualmente es el SAC de Argentina y no la aplicamos
          automáticamente a otros países. Podés seguir registrando jornadas y
          cobros; el cálculo local de aguinaldo queda pendiente.
        </p>
      </section>
    );
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
            una lectura de recibos. Esta estimación del SAC no descuenta los
            aportes configurados para tus jornadas.
          </p>
        </div>
      </div>
      <div className="notice">
        <Icon name="calendar" />
        <div>
          <strong>¿Empezaste a usar JornadApp a mitad de año?</strong>
          <p>
            Podés cargar sueldos anteriores: elegí el año y el semestre y
            completá cada mes. Ingresá la remuneración bruta computable, con la
            base sin extras y las extras separadas. No necesitás haber
            registrado las jornadas de esos meses. Estos importes se guardan en
            el historial de este trabajo y se usan para el SAC; no se registran
            como cobros recibidos.
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
              <select
                value={year}
                onChange={(e) => changePeriod(Number(e.target.value), half)}
              >
                {Array.from({ length: 101 }, (_, i) => 2100 - i).map(
                  (value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              Semestre
              <select
                value={half}
                onChange={(e) => changePeriod(year, Number(e.target.value))}
              >
                <option value="1">Enero – junio</option>
                <option value="2">Julio – diciembre</option>
              </select>
            </label>
          </div>
          <div className="button-row sac-period-navigation">
            <button
              type="button"
              className="secondary"
              disabled={year === 2000 && half === 1}
              onClick={() =>
                changePeriod(half === 1 ? year - 1 : year, half === 1 ? 2 : 1)
              }
            >
              Semestre anterior
            </button>
            <button
              type="button"
              className="secondary"
              disabled={year === 2100 && half === 2}
              onClick={() =>
                changePeriod(half === 2 ? year + 1 : year, half === 2 ? 1 : 2)
              }
            >
              Semestre siguiente
            </button>
          </div>
          <form
            ref={formRef}
            key={`${year}-${half}-${formVersion}`}
            onSubmit={save}
            onChange={() => {
              setDirty(true);
              setMessage("");
            }}
            className="sac-form"
          >
            <div className="sac-row sac-head">
              <span>Mes</span>
              <span>Base bruta sin extras ({currencyFor(state.profile)})</span>
              <span>Extras ({currencyFor(state.profile)})</span>
            </div>
            {Array.from({ length: 6 }, (_, i) => {
              const n = (half - 1) * 6 + i,
                month = `${year}-${String(n + 1).padStart(2, "0")}`,
                row = state.sac.find((r) => r.month === month);
              return (
                <div className="sac-row" key={month}>
                  <strong>{monthName(n)}</strong>
                  <DecimalInput
                    aria-label={`Base ${monthName(n)}`}
                    name={"base" + i}

                    min="0"

                    max="1000000000000"
                    defaultValue={row?.base ?? ""}
                    placeholder="Sin cargar"
                  />
                  <DecimalInput
                    aria-label={`Extras ${monthName(n)}`}
                    name={"extras" + i}

                    min="0"

                    max="1000000000000"
                    defaultValue={row?.extras ?? ""}
                    placeholder="Sin cargar"
                  />
                </div>
              );
            })}
            <button className="primary">Guardar remuneraciones</button>
            {dirty && <p role="status">Hay remuneraciones sin guardar.</p>}
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
      <section
        className="panel salary-records"
        aria-label="Historial de sueldos para aguinaldo"
      >
        <div className="panel-heading">
          <h2>Historial de sueldos cargados</h2>
          <p>
            {history.length} meses guardados en este trabajo. Los sueldos de
            otros trabajos se consultan desde su propio espacio.
          </p>
        </div>
        {history.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Base sin extras</th>
                  <th>Extras</th>
                  <th>Total computable</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.month}>
                    <td>{monthLabel(row.month)}</td>
                    <td>{currency(row.base)}</td>
                    <td>{currency(row.extras)}</td>
                    <td>{currency(row.base + row.extras)}</td>
                    <td>
                      <button
                        className="text-button"
                        aria-label={`Editar ${monthLabel(row.month)}`}
                        onClick={() =>
                          changePeriod(
                            Number(row.month.slice(0, 4)),
                            Number(row.month.slice(5)) <= 6 ? 1 : 2,
                            row.month,
                          )
                        }
                      >
                        Editar mes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <p>
              Todavía no cargaste sueldos. Elegí un período anterior o el
              actual, completá los importes y presioná «Guardar remuneraciones».
            </p>
          </div>
        )}
      </section>
    </>
  );
}
