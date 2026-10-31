"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "../components/icon";
import CreatorCredit from "../components/creator-credit";
import WorkspaceGateway from "../components/workspace-gateway";
import {
  checkCurrencyCorrection,
  CURRENCY_BACKUP_KEY,
} from "../lib/currency-change.mjs";
import {
  countryFor,
  currencyFor,
  zoneFor,
  locationLabel,
  localClock,
  localInstant,
} from "../lib/locations.mjs";
import DecimalInput from "../components/decimal-input";
import { parseDecimal } from "../lib/decimal.mjs";
import Setup from "../components/setup";
import JobSwitcher from "../components/job-switcher";
import { addJob, switchJob, renameJob, jobId } from "../lib/jobs.mjs";
import Settings from "../components/settings";
import Sac from "../components/sac";
import {
  createWorkspace,
  validateWorkspace,
  migrateLegacy,
  localDate as dateInZone,
  parseDate,
  addDays,
  isoDate,
  bounds,
  paymentDate,
  periodTotals,
  scheduleHours,
  compensationAt,
  currency as formatCurrency,
  dateLabel,
  ENTRY_TYPES,
  PAY_MODES,
  duration,
  reminderFor,
  DAYS,
} from "../lib/workspace.mjs";
const STORAGE = "jornada-v2";
const NAV = [
  ["Resumen", "grid"],
  ["Mis jornadas", "calendar"],
  ["Aguinaldo", "gift"],
  ["Mis cobros", "wallet"],
  ["Configuración", "settings"],
];
function downloadFile(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
const numberLabel = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 2,
});
const decimalHours = (n) =>
  `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(n)} h`;

function EntryForm({
  state,
  onAdd,
  closing = false,
  onCancel,
  today,
  initialKind = "work",
}) {
  const localDate = (d) => dateInZone(d, zoneFor(state.profile));
  const clockTime = (d) => localClock(d, zoneFor(state.profile));
  const session = state.activeSession;
  const [kind, setKind] = useState(initialKind),
    [method, setMethod] = useState("times"),
    [date, setDate] = useState(
      closing ? localDate(new Date(session.startedAt)) : today,
    ),
    [start, setStart] = useState(
      closing ? clockTime(new Date(session.startedAt)) : "05:00",
    ),
    [end, setEnd] = useState(closing ? clockTime() : "13:00"),
    [exitDate, setExitDate] = useState(today),
    [nextDay, setNextDay] = useState(
      closing ? localDate(new Date(session.startedAt)) !== today : false,
    ),
    [hours, setHours] = useState(8),
    [rest, setRest] = useState(0),
    [quantity, setQuantity] = useState(0),
    [absenceJustified, setAbsenceJustified] = useState(true),
    [absencePaid, setAbsencePaid] = useState(false),
    [deductionAmount, setDeductionAmount] = useState(0),
    [error, setError] = useState("");
  const v = compensationAt(state.compensation, date);
  function submit(e) {
    e.preventDefault();
    try {
      if (closing) {
        const distance = (parseDate(exitDate) - parseDate(date)) / 86400000;
        if (distance < 0 || distance > 1)
          throw new Error(
            "La salida debe ser el día de entrada o el siguiente. Corregí la fecha real; esta versión admite turnos de hasta 24 horas.",
          );
        if (localInstant(exitDate, end, zoneFor(state.profile)) > Date.now())
          throw new Error("La salida real no puede estar en el futuro.");
      }
      const overnight = closing ? exitDate !== date : nextDay;
      const h =
        method === "times" && !["vacation", "absence"].includes(kind)
          ? duration(start, end, rest, overnight)
          : Number(hours);
      onAdd(
        {
          id: crypto.randomUUID(),
          date,
          type: kind,
          ...(kind === "absence"
            ? {
                absenceJustified,
                absencePaid,
                deductionAmount:
                  !absencePaid && ["monthly", "fortnightly"].includes(v?.mode)
                    ? deductionAmount
                    : 0,
                quantity: 0,
              }
            : {}),
          hours: h,
          quantity: kind === "absence" ? 0 : Number(quantity),
          note: new FormData(e.currentTarget).get("note") || "",
          ...(method === "times" && !["vacation", "absence"].includes(kind)
            ? { start, end, nextDay: overnight, breakMinutes: rest }
            : {}),
        },
        closing,
      );
      setError("");
      if (!closing) e.currentTarget.reset();
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <form className="entry-form" onSubmit={submit}>
      <div className="form-grid">
        <label>
          Fecha de entrada
          <input
            name="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={today}
            required
          />
        </label>
        <label>
          Tipo de jornada
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            disabled={closing}
          >
            {Object.entries(ENTRY_TYPES).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!["vacation", "absence"].includes(kind) && !closing && (
        <div className="segmented">
          <button
            type="button"
            className={method === "times" ? "selected" : ""}
            onClick={() => setMethod("times")}
          >
            Entrada y salida
          </button>
          <button
            type="button"
            className={method === "hours" ? "selected" : ""}
            onClick={() => setMethod("hours")}
          >
            Total de horas
          </button>
        </div>
      )}
      {method === "times" && !["vacation", "absence"].includes(kind) ? (
        <>
          <div className="form-grid">
            <label>
              Entrada
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
              />
            </label>
            <label>
              Salida real
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
              />
            </label>
          </div>
          <div className="form-grid">
            <label>
              Descanso sin pago (min)
              <input
                type="number"
                min="0"
                max="1439"
                step="1"
                value={rest}
                onChange={(e) => setRest(Number(e.target.value))}
              />
            </label>
            {closing ? (
              <label>
                Fecha de salida real
                <input
                  type="date"
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  min={date}
                  max={today}
                  required
                />
              </label>
            ) : (
              <label className="check">
                <input
                  type="checkbox"
                  checked={nextDay}
                  onChange={(e) => setNextDay(e.target.checked)}
                />
                Termina al día siguiente
              </label>
            )}
          </div>
        </>
      ) : (
        <label>
          Horas{" "}
          {kind === "vacation"
            ? "de vacaciones"
            : kind === "absence"
              ? "de ausencia"
              : "trabajadas"}
          <DecimalInput
            min="0.0166667"
            max="24"

            value={hours}
            onValueChange={setHours}
            required
          />
        </label>
      )}
      {v?.mode === "piecework" && !["vacation", "absence"].includes(kind) && (
        <label>
          Cantidad realizada ({v.unit})
          <DecimalInput
            min="0"

            value={quantity}
            onValueChange={setQuantity}
            required
          />
        </label>
      )}
      <label>
        {kind === "absence" ? "Motivo de la ausencia" : "Nota"}{" "}
        <span className="optional">Opcional</span>
        <input
          name="note"
          maxLength="200"
          placeholder={
            kind === "absence"
              ? "Por ejemplo: aviso previo a la empresa"
              : "Proyecto, tarea o comentario"
          }
        />
      </label>
      {kind === "absence" && (
        <div className="absence-fields">
          <div className="form-grid">
            <label>
              ¿La falta está justificada?
              <select
                value={String(absenceJustified)}
                onChange={(e) => setAbsenceJustified(e.target.value === "true")}
              >
                <option value="true">Sí, justificada</option>
                <option value="false">No, sin justificar</option>
              </select>
            </label>
            <label>
              ¿La ausencia es paga?
              <select
                value={String(absencePaid)}
                onChange={(e) => setAbsencePaid(e.target.value === "true")}
              >
                <option value="false">No, sin pago</option>
                <option value="true">Sí, con pago</option>
              </select>
            </label>
          </div>
          {!absencePaid && ["monthly", "fortnightly"].includes(v?.mode) && (
            <label>
              Descuento acordado por esta falta ({currencyFor(state.profile)})
              <DecimalInput
                value={deductionAmount}
                min="0"
                max="1000000000000"
                onValueChange={setDeductionAmount}
                required
              />
              <small>
                Ingresá el importe manualmente. Si dejás cero, no se descuenta
                del sueldo fijo.
              </small>
            </label>
          )}
          <div className="inline-note">
            <Icon name="info" />
            <span>
              Justificada no significa necesariamente paga. Registrá las
              condiciones acordadas: no aplicamos descuentos legales automáticos
              ni pedimos documentación.
            </span>
          </div>
        </div>
      )}
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      <button className="primary">
        <Icon name="check" size={17} />
        {closing
          ? "Confirmar salida real"
          : kind === "absence"
            ? "Guardar ausencia"
            : "Guardar jornada"}
      </button>
      {closing && (
        <button type="button" className="text-button" onClick={onCancel}>
          Seguir trabajando
        </button>
      )}
    </form>
  );
}
function SessionCard({
  state,
  now,
  today,
  setClosing,
  setError,
  safeCommit,
  setAdding,
}) {
  const localDate = (d) => dateInZone(d, zoneFor(state.profile));
  const clockTime = (d) => localClock(d, zoneFor(state.profile));
  return (
    <section className="panel session-card">
      <div className="card-kicker">
        <i className={state.activeSession ? "green-dot" : "quiet-dot"} />
        Tu jornada de hoy
      </div>
      <div className="clock-face">
        <div className="clock-orbit" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <span className="clock-caption">
          {state.activeSession
            ? "ENTRADA REGISTRADA"
            : `HORA LOCAL · ${countryFor(state.profile).name.toUpperCase()}`}
        </span>
        <span className="session-time">
          {state.activeSession
            ? clockTime(new Date(state.activeSession.startedAt))
            : clockTime(now)}
        </span>
      </div>
      <p>
        {state.activeSession
          ? `Entrada registrada · ${dateLabel(localDate(new Date(state.activeSession.startedAt)))}`
          : "Todo listo para empezar tu día."}
      </p>
      {state.activeSession ? (
        <button className="primary" onClick={() => setClosing(true)}>
          <Icon name="arrow" />
          Registrar salida
        </button>
      ) : (
        <button
          className="primary"
          onClick={() => {
            if (
              state.entries.some(
                (e) =>
                  e.date === today && ["vacation", "absence"].includes(e.type),
              )
            ) {
              setError(
                "Hoy tenés vacaciones o una ausencia registrada. Revisá ese registro antes de iniciar una jornada.",
              );
              return;
            }
            safeCommit({
              ...state,
              activeSession: {
                startedAt: new Date().toISOString(),
              },
            });
          }}
        >
          <Icon name="plus" />
          Registrar entrada
        </button>
      )}
      <button className="text-button" onClick={() => setAdding(true)}>
        Cargar una jornada manualmente
      </button>
      {state.activeSession && (
        <button
          className="text-button cancel-entry"
          onClick={() => {
            if (confirm("¿Descartar esta entrada sin guardar una jornada?"))
              safeCommit({ ...state, activeSession: null });
          }}
        >
          Descartar entrada equivocada
        </button>
      )}
    </section>
  );
}

function WeeklyChart({ state, end }) {
  const today = dateInZone(new Date(), zoneFor(state.profile));
  const latest = today < end ? today : end;
  const dates = Array.from({ length: 7 }, (_, i) => addDays(latest, i - 6)),
    totals = dates.map((d) => periodTotals(state, d, d)),
    max = Math.max(10, ...totals.map((t) => t.workedHours));
  return (
    <section className="panel chart-panel">
      <div className="panel-heading chart-heading">
        <div>
          <h2>Así viene tu semana</h2>
          <p>Últimos siete días hasta el {dateLabel(latest)}</p>
        </div>
        <div className="chart-insight">
          <strong>
            {numberLabel.format(
              totals.reduce((sum, t) => sum + t.workedHours, 0),
            )}
            <small> h</small>
          </strong>
          <span>en estos 7 días</span>
        </div>
        <div className="legend">
          <span>
            <i />
            Habituales
          </span>
          <span>
            <i />
            Extras
          </span>
        </div>
      </div>
      <div
        className="chart"
        role="img"
        aria-label={dates
          .map(
            (d, i) =>
              `${dateLabel(d)}: ${totals[i].workedHours} horas, ${totals[i].overtimeHours} extras`,
          )
          .join(". ")}
      >
        <div className="chart-lines">
          <span>{Math.ceil(max)} h</span>
          <span>{Math.ceil(max / 2)} h</span>
          <span>0 h</span>
        </div>
        <div className="bars">
          {dates.map((d, i) => (
            <div className="bar-column" key={d}>
              <div className="bar-space">
                <div
                  className="bar extra"
                  style={{
                    height: `${(totals[i].overtimeHours / max) * 100}%`,
                  }}
                />
                <div
                  className="bar normal"
                  style={{
                    height: `${((totals[i].regularHours + totals[i].holidayHours) / max) * 100}%`,
                  }}
                />
              </div>
              <strong>
                {DAYS[(parseDate(d).getUTCDay() + 6) % 7].slice(0, 3)}
              </strong>
              <small>
                {d.slice(8)}/{d.slice(5, 7)}
              </small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
function Records({ entries, onDelete, onExport, profile = {} }) {
  const currency = (n) => formatCurrency(n, currencyFor(profile));
  return (
    <section className="panel records">
      <div className="panel-heading split">
        <div>
          <h2>Registro de jornadas</h2>
          <p>Tus horas, con todo el detalle.</p>
        </div>
        <button
          className="secondary"
          onClick={onExport}
          disabled={!entries.length}
        >
          <Icon name="download" size={15} />
          <span>Exportar CSV</span>
        </button>
      </div>
      {entries.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Fecha / detalle</th>
                <th>Jornada</th>
                <th>Horas</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {entries
                .toSorted((a, b) => b.date.localeCompare(a.date))
                .map((e) => (
                  <tr key={e.id}>
                    <td>
                      <strong>{dateLabel(e.date)}</strong>
                      <small>
                        {e.start
                          ? `${e.start} → ${e.end}${e.nextDay ? " (+1 día)" : ""}`
                          : e.type === "absence"
                            ? "Ausencia registrada"
                            : "Carga por horas"}
                      </small>
                      {e.note && (
                        <small className="record-note">{e.note}</small>
                      )}
                    </td>
                    <td>
                      <span className={"badge " + e.type}>
                        {e.type === "absence"
                          ? e.absenceJustified
                            ? "Falta justificada"
                            : "Sin justificar"
                          : ENTRY_TYPES[e.type]}
                      </span>
                      {e.type === "absence" && (
                        <small>
                          {e.absencePaid ? "Con pago" : "Sin pago"}
                          {e.deductionAmount > 0
                            ? ` · Descuento: ${currency(e.deductionAmount)}`
                            : ""}
                        </small>
                      )}
                      {e.quantity > 0 && <small>{e.quantity} unidades</small>}
                    </td>
                    <td>{decimalHours(e.hours)}</td>
                    <td>
                      <button
                        className="icon-button danger"
                        aria-label={`Eliminar jornada del ${dateLabel(e.date)}`}
                        onClick={() => onDelete(e.id)}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <span className="empty-icon">
            <Icon name="calendar" size={30} />
          </span>
          <h3>Tu registro empieza acá</h3>
          <p>
            Agregá una jornada o registrá tu entrada.
            <br />
            Tus horas van a aparecer en este espacio.
          </p>
        </div>
      )}
      <div className="record-footer">
        {entries.length} registros en el período
        <span>{locationLabel(profile)}</span>
      </div>
    </section>
  );
}
function Payments({ state, onSave, today }) {
  const currency = (n) => formatCurrency(n, currencyFor(state.profile));
  const [reference, setReference] = useState(today),
    [error, setError] = useState("");
  const [start, end] = bounds(reference, state.cycle),
    due = paymentDate(start, state.cycle),
    total = periodTotals(state, start, end),
    paid = state.payments.filter((p) => p.start === start && p.end === end),
    received = paid.reduce((sum, p) => sum + p.amount, 0);
  function submit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      onSave({
        ...state,
        payments: [
          ...state.payments,
          {
            id: crypto.randomUUID(),
            start,
            end,
            date: f.get("date"),
            amount: parseDecimal(f.get("amount")),
          },
        ],
      });
      setError("");
      e.currentTarget.reset();
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <>
      <div className="notice">
        <Icon name="wallet" />
        <div>
          <strong>Generado y cobrado son cosas distintas.</strong>
          <p>
            Los importes estimados no se marcan como pagados automáticamente.
            Anotá cuánto recibiste realmente.
          </p>
        </div>
      </div>
      <div className="payment-layout">
        <section className="panel settings-panel">
          <label className="short-field">
            Fecha dentro del período
            <input
              type="date"
              value={reference}
              onChange={(e) => setReference(e.target.value || today)}
            />
          </label>
          <h2 className="mt">
            Del {dateLabel(start)} al {dateLabel(end)}
          </h2>
          <p>Cobro programado: {dateLabel(due)}</p>
          <div className="breakdown">
            <div>
              <span>Antes de aportes configurados</span>
              <strong>{currency(total.amount)}</strong>
            </div>
            <div>
              <span>Aportes y retenciones estimados</span>
              <strong>− {currency(total.payrollDeductionAmount)}</strong>
            </div>
            <div>
              <span>A cobrar estimado</span>
              <strong>{currency(total.netAmount)}</strong>
            </div>
            <div>
              <span>Cobrado registrado</span>
              <strong>{currency(received)}</strong>
            </div>
            <div>
              <span>Diferencia estimada</span>
              <strong>{currency(total.netAmount - received)}</strong>
            </div>
          </div>
          <form key={start} onSubmit={submit}>
            <h3>Registrar un cobro</h3>
            <div className="form-grid">
              <label>
                Fecha de cobro
                <input
                  name="date"
                  type="date"
                  defaultValue={today}
                  max={today}
                  required
                />
              </label>
              <label>
                {`Importe recibido (${currencyFor(state.profile)})`}
                <DecimalInput
                  name="amount"

                  min="0.01"
                  max="1000000000000"

                  required
                />
              </label>
            </div>
            {error && (
              <p className="alert error" role="alert">
                {error}
              </p>
            )}
            <button className="primary">Guardar cobro</button>
          </form>
        </section>
        <section className="panel settings-panel">
          <h2>Cobros del período</h2>
          {paid.length ? (
            paid.map((p) => (
              <div className="history-row" key={p.id}>
                <span>
                  <strong>{currency(p.amount)}</strong>
                  <small>{dateLabel(p.date)}</small>
                </span>
                <button
                  className="icon-button danger"
                  aria-label="Eliminar cobro"
                  onClick={() => {
                    if (confirm("¿Eliminar este cobro registrado?"))
                      onSave({
                        ...state,
                        payments: state.payments.filter((x) => x.id !== p.id),
                      });
                  }}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))
          ) : (
            <div className="empty compact">
              <Icon name="wallet" size={32} />
              <h3>Todavía no registraste cobros</h3>
              <p>El próximo pago previsto es el {dateLabel(due)}.</p>
            </div>
          )}
          <p className="field-help">
            No se calculan descuentos, aportes ni retenciones. La diferencia
            puede requerir una revisión con tu empleador.
          </p>
        </section>
      </div>
    </>
  );
}
export default function Home() {
  return (
    <WorkspaceGateway>
      {(cloud) => <WorkspaceApp cloud={cloud} />}
    </WorkspaceGateway>
  );
}
function WorkspaceApp({ cloud = null }) {
  const [state, setState] = useState(null),
    [tab, setTab] = useState("Resumen"),
    [error, setError] = useState(""),
    [storageBlocked, setStorageBlocked] = useState(false),
    [notice, setNotice] = useState(""),
    [reference, setReference] = useState(""),
    [viewKind, setViewKind] = useState(""),
    [showSetup, setShowSetup] = useState(false),
    [closing, setClosing] = useState(false),
    [adding, setAdding] = useState(false),
    [now, setNow] = useState(null),
    [reminder, setReminder] = useState(null),
    [dismissed, setDismissed] = useState(""),
    [premium, setPremium] = useState(false);
  const currencyBackupStorageKey =
    cloud?.currencyBackupKey || CURRENCY_BACKUP_KEY;
  const localDate = (d) => dateInZone(d, zoneFor(state?.profile));
  const currency = (n) => formatCurrency(n, currencyFor(state?.profile));
  const modalRef = useRef(null),
    returnFocus = useRef(null);
  useEffect(() => {
    try {
      let next;
      const raw = cloud ? null : localStorage.getItem(STORAGE),
        legacy = cloud ? null : localStorage.getItem("jornada-v1");
      next = cloud
        ? validateWorkspace(cloud.initialWorkspace)
        : raw
          ? validateWorkspace(JSON.parse(raw))
          : legacy
            ? migrateLegacy(JSON.parse(legacy))
            : createWorkspace();
      setState(next);
      setShowSetup(!next.configured);
      setViewKind(next.cycle.kind);
      setReference(dateInZone(new Date(), zoneFor(next.profile)));
    } catch {
      setState(createWorkspace());
      setStorageBlocked(true);
      setError(
        "Los datos locales no pudieron leerse. No los sobrescribimos. Podés descargar el archivo original para recuperarlo.",
      );
    }
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!state) return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      (document.documentElement.dataset.theme =
        state.profile.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : state.profile.theme);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [state?.profile.theme]);
  useEffect(() => {
    if (state && now) setReminder(reminderFor(state, now));
  }, [state, now]);
  const hasModal = adding || closing || premium;
  useEffect(() => {
    if (!hasModal) return;
    returnFocus.current = document.activeElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = modalRef.current;
    dialog?.focus();
    const key = (e) => {
      if (e.key === "Escape") {
        setAdding(false);
        setClosing(false);
        setPremium(false);
      }
      if (e.key === "Tab" && dialog) {
        const els = [
          ...dialog.querySelectorAll(
            'button,input,select,textarea,[tabindex="0"]',
          ),
        ].filter((el) => !el.disabled);
        const first = els[0],
          last = els.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialog)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      returnFocus.current?.focus();
    };
  }, [hasModal]);
  function commit(
    next,
    { replaceWorkspace = false, confirmCurrencyCorrection = false } = {},
  ) {
    if (storageBlocked)
      throw new Error(
        "El almacenamiento está bloqueado para proteger los datos anteriores.",
      );
    validateWorkspace(next);
    const saveCurrencyBackup =
      !replaceWorkspace &&
      checkCurrencyCorrection(state, next, confirmCurrencyCorrection);
    if (
      !replaceWorkspace &&
      state?.activeSession &&
      zoneFor(next.profile) !== zoneFor(state.profile)
    )
      throw new Error(
        "Cerrá la jornada activa antes de cambiar la zona horaria.",
      );
    try {
      if (cloud)
        cloud.save(next, { currencyBackup: saveCurrencyBackup ? state : null });
      else {
        if (saveCurrencyBackup)
          localStorage.setItem(CURRENCY_BACKUP_KEY, JSON.stringify(state));
        localStorage.setItem(STORAGE, JSON.stringify(next));
      }
    } catch {
      throw new Error(
        "No se pudo guardar. Revisá el espacio disponible o los permisos del navegador.",
      );
    }
    setState(next);
    setError("");
  }
  function changeJob(next) {
    commit(next, { replaceWorkspace: true });
    setTab("Resumen");
    setViewKind(next.cycle.kind);
    setReference(dateInZone(new Date(), zoneFor(next.profile)));
    setShowSetup(!next.configured);
    setDismissed("");
    setNotice("");
  }
  const jobSwitcher = state && (
    <JobSwitcher
      state={state}
      disabled={storageBlocked || hasModal}
      onSwitch={(id) => changeJob(switchJob(state, id))}
      onAdd={(name) => changeJob(addJob(state, name, crypto.randomUUID()))}
      onRename={(name) => commit(renameJob(state, name))}
    />
  );
  function safeCommit(next) {
    try {
      commit(next);
    } catch (err) {
      setError(err.message);
    }
  }
  if (!state || !now)
    return (
      <div className="loading">
        <Icon name="clock" size={36} />
        <strong>jornadapp.</strong>
        <p>Preparando tu espacio…</p>
      </div>
    );
  const today = localDate(now),
    viewCycle = { ...state.cycle, kind: viewKind || state.cycle.kind },
    [periodStart, periodEnd] = bounds(reference || today, viewCycle),
    totals = periodTotals(state, periodStart, periodEnd),
    selected = state.entries.filter(
      (e) => e.date >= periodStart && e.date <= periodEnd,
    ),
    current =
      compensationAt(state.compensation, today) || state.compensation[0],
    weekHours = scheduleHours(state.schedule).reduce((a, b) => a + b, 0);
  const candidates = [];
  for (let offset = -35; offset <= 40; offset++) {
    const [a, b] = bounds(addDays(today, offset), state.cycle),
      date = paymentDate(a, state.cycle);
    if (date >= today && !candidates.some((c) => c.start === a))
      candidates.push({ start: a, end: b, date });
  }
  candidates.sort((a, b) => a.date.localeCompare(b.date));
  const nextPay = candidates[0],
    nextAmount = nextPay
      ? periodTotals(state, nextPay.start, nextPay.end).netAmount
      : 0;
  function add(entry, close) {
    if (entry.date > today) throw new Error("No podés guardar trabajo futuro.");
    if (state.activeSession && ["vacation", "absence"].includes(entry.type))
      throw new Error(
        "Cerrá la jornada activa antes de registrar vacaciones o ausencias.",
      );
    if (
      close &&
      entry.date !== localDate(new Date(state.activeSession.startedAt))
    )
      throw new Error(
        "La fecha de entrada debe coincidir con la jornada abierta.",
      );
    commit({
      ...state,
      entries: [...state.entries, entry],
      activeSession: close ? null : state.activeSession,
    });
    setClosing(false);
    setAdding(false);
    setNotice(
      entry.type === "absence" ? "Ausencia guardada." : "Jornada guardada.",
    );
    setReference(entry.date);
  }
  function exportCsv() {
    const cell = (v) =>
      '"' +
      String(v ?? "")
        .replace(/^[\s]*[=+@-]/, "'$&")
        .replaceAll('"', '""') +
      '"';
    downloadFile(
      "\uFEFF" +
        [
          [
            "Fecha",
            "Tipo",
            "Entrada",
            "Salida",
            "Horas",
            "Cantidad",
            "Nota",
            "Justificada",
            "Paga",
            "Descuento",
          ],
          ...selected.map((e) => [
            e.date,
            ENTRY_TYPES[e.type],
            e.start,
            e.end,
            e.hours,
            e.quantity,
            e.note,
            e.type === "absence" ? (e.absenceJustified ? "Sí" : "No") : "",
            e.type === "absence" ? (e.absencePaid ? "Sí" : "No") : "",
            e.deductionAmount ?? "",
          ]),
        ]
          .map((row) => row.map(cell).join(";"))
          .join("\r\n"),
      `jornadas-${periodStart}-${periodEnd}.csv`,
      "text/csv;charset=utf-8",
    );
  }
  function backup() {
    downloadFile(
      JSON.stringify(state, null, 2),
      `jornada-copia-${today}.json`,
      "application/json",
    );
  }
  async function restore(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (file.size > 5e6)
        throw new Error("La copia debe pesar menos de 5 MB.");
      const next = validateWorkspace(JSON.parse(await file.text()));
      if (
        !confirm(
          "¿Reemplazar TODOS tus trabajos con esta copia? Descargá primero una copia si querés conservarlos.",
        )
      )
        return;
      commit(next, { replaceWorkspace: true });
      setNotice("Copia restaurada.");
      setTab("Resumen");
      setShowSetup(!next.configured);
    } catch (err) {
      setError(err.message);
    }
  }
  const sessionCard = (
    <SessionCard
      state={state}
      now={now}
      today={today}
      setClosing={setClosing}
      setError={setError}
      safeCommit={safeCommit}
      setAdding={setAdding}
    />
  );

  if (storageBlocked)
    return (
      <main className="recovery panel">
        <h1>Protejamos tus registros.</h1>
        <p role="alert">{error}</p>
        <button
          className="secondary"
          onClick={() => {
            try {
              downloadFile(
                localStorage.getItem(STORAGE) ||
                  localStorage.getItem("jornada-v1") ||
                  "",
                `jornada-recuperacion-${today}.txt`,
                "text/plain",
              );
            } catch {
              setError(
                "El navegador no permite acceder al almacenamiento. Habilitalo y recargá la página.",
              );
            }
          }}
        >
          Descargar datos originales
        </button>
        <p>
          No cambiamos ni borramos el archivo guardado. Revisá la copia antes de
          continuar.
        </p>
      </main>
    );
  if (showSetup)
    return (
      <>
        {jobSwitcher}
        <Setup
          key={jobId(state)}
          state={state}
          cloudEnabled={!!cloud}
          onSave={(next, options) => {
            commit(next, options);
            setViewKind(next.cycle.kind);
            setShowSetup(false);
            setNotice("Tu espacio ya está configurado.");
          }}
          onCancel={state.configured ? () => setShowSetup(false) : undefined}
        />
      </>
    );
  return (
    <div className="shell">
      <aside className="sidebar">
        <a className="brand" href="/">
          <Icon name="clock" size={30} /> jornadapp<span>.</span>
        </a>
        <div className="brand-caption">TU TIEMPO, BIEN CONTADO.</div>
        <div className="workspace-label">TU ESPACIO</div>
        <div className="workspace-card">
          <span className="avatar">
            <Icon name="user" size={17} />
          </span>
          <div>
            Personal<small>{locationLabel(state.profile)}</small>
          </div>
          <span className="green-dot" />
        </div>
        <nav aria-label="Navegación principal">
          {NAV.map(([label, icon]) => (
            <button
              key={label}
              className={tab === label ? "active" : ""}
              aria-current={tab === label ? "page" : undefined}
              onClick={() => {
                setTab(label);
                setNotice("");
              }}
            >
              <Icon name={icon} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <button className="sidebar-premium" onClick={() => setPremium(true)}>
          <span className="badge premium">PRÓXIMAMENTE</span>
          <strong>
            Menos pasos.
            <br />
            Más tranquilidad.
          </strong>
          <small>Conocé lo que viene con Premium.</small>
          <span className="premium-link">
            Descubrir Premium <Icon name="arrow" size={16} />
          </span>
        </button>
        <div className="aside-bottom">
          <span className="avatar">
            {(state.profile.name || "YO").slice(0, 2).toUpperCase()}
          </span>
          <div>
            <strong>{state.profile.name || "Mi espacio"}</strong>
            <small>
              {cloud
                ? "Beta · Cuenta personal"
                : "Plan gratuito · Versión local"}
            </small>
          </div>
        </div>
      </aside>
      <main className="main" key={jobId(state)}>
        {jobSwitcher}
        <header className="topbar">
          <a href="/" className="mobile-wordmark">
            <Icon name="clock" size={22} />
            jornadapp<span>.</span>
          </a>
          <span className="breadcrumb">
            Mi espacio <span className="slash">/</span>
            <strong>{tab}</strong>
          </span>
          <div className="header-actions">
            <span className="local-status">
              <i />
              {cloud
                ? cloud.status === "synced"
                  ? "Guardado en tu cuenta"
                  : "Cambios pendientes"
                : "Datos en este navegador"}
            </span>
            <label className="theme-control">
              <span className="sr-only">Apariencia</span>
              <Icon
                name={state.profile.theme === "dark" ? "moon" : "sun"}
                size={16}
              />
              <select
                aria-label="Apariencia"
                value={state.profile.theme}
                onChange={(e) =>
                  safeCommit({
                    ...state,
                    profile: { ...state.profile, theme: e.target.value },
                  })
                }
              >
                <option value="system">Automática</option>
                <option value="light">Clara</option>
                <option value="dark">Oscura</option>
              </select>
            </label>
          </div>
        </header>
        <div className="content">
          <div className="heading">
            <div className="hero-orbit" aria-hidden="true">
              <span />
              <span />
              <i />
              <b>j.</b>
            </div>
            <div className="hero-copy">
              <div className="eyebrow">
                {tab === "Resumen"
                  ? `HOLA, ${state.profile.name.toUpperCase() || "BIENVENIDO"}`
                  : "TU TIEMPO, BAJO CONTROL"}
              </div>
              <h1>
                {tab === "Resumen" ? (
                  <>
                    Tu esfuerzo,{" "}
                    <span className="heading-accent">en números.</span>
                  </>
                ) : (
                  tab
                )}
              </h1>
              <p>
                {tab === "Resumen"
                  ? "Tus horas y tus ingresos, en un solo lugar."
                  : tab === "Mis jornadas"
                    ? "Un registro simple para cada día de trabajo."
                    : tab === "Aguinaldo"
                      ? "Entendé cómo se compone tu estimación."
                      : tab === "Mis cobros"
                        ? "Lo que generaste y lo que llegó a tu bolsillo."
                        : "Un espacio que se adapta a tu forma de trabajar."}
              </p>
            </div>
            {["Resumen", "Mis jornadas"].includes(tab) && (
              <div className="period-controls">
                <label>
                  <span className="sr-only">Período</span>
                  <select
                    aria-label="Período"
                    value={viewKind}
                    onChange={(e) => setViewKind(e.target.value)}
                  >
                    <option value="fortnightly">Quincenal</option>
                    <option value="monthly">Mensual</option>
                    <option value="weekly">Semanal</option>
                  </select>
                </label>
                <label>
                  <span className="sr-only">Fecha del período</span>
                  <input
                    aria-label="Fecha del período"
                    type="date"
                    value={reference}
                    onChange={(e) => setReference(e.target.value || today)}
                  />
                </label>
                <small>
                  {dateLabel(periodStart)} — {dateLabel(periodEnd)}
                </small>
              </div>
            )}
          </div>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="alert success" role="status">
              <Icon name="check" size={17} />
              {notice}
              <button
                className="text-button"
                aria-label="Cerrar mensaje"
                onClick={() => setNotice("")}
              >
                ×
              </button>
            </div>
          )}
          {reminder && reminder.key !== dismissed && (
            <div className="alert reminder" role="status">
              <Icon name="bell" />
              <div>
                <strong>¿Ya terminaste tu jornada?</strong>
                <p>
                  Tu salida habitual es a las {reminder.expected}. Registrá la
                  hora real si ya saliste.
                </p>
              </div>
              <button className="secondary" onClick={() => setClosing(true)}>
                Registrar salida
              </button>
              <button
                className="icon-button"
                aria-label="Cerrar recordatorio"
                onClick={() => setDismissed(reminder.key)}
              >
                ×
              </button>
            </div>
          )}
          {tab === "Configuración" ? (
            <Settings
              state={state}
              onSave={(next, options) => {
                commit(next, options);
                setViewKind(next.cycle.kind);
              }}
              onBackup={backup}
              currencyBackupStorageKey={currencyBackupStorageKey}
              cloudEnabled={!!cloud}
              onConflictBackup={cloud?.downloadConflict}
              onImport={restore}
              onCurrencyBackup={() => {
                try {
                  const raw = localStorage.getItem(currencyBackupStorageKey);
                  if (raw)
                    downloadFile(
                      raw,
                      `jornada-antes-cambio-moneda-${today}.json`,
                      "application/json",
                    );
                } catch (err) {
                  setError(err.message);
                }
              }}
            />
          ) : tab === "Aguinaldo" ? (
            <Sac state={state} onSave={commit} today={today} />
          ) : tab === "Mis cobros" ? (
            <Payments state={state} onSave={commit} today={today} />
          ) : (
            <>
              {tab === "Resumen" && (
                <div className="mobile-session">{sessionCard}</div>
              )}
              <div className="overview-toolbar">
                <div>
                  <span className="section-label">
                    <Icon name="sparkles" size={13} />
                    TU ACTIVIDAD
                  </span>
                  <strong>Un período, todas tus cuentas.</strong>
                </div>
                <div className="button-row">
                  <button
                    className="secondary"
                    onClick={() => setAdding("absence")}
                  >
                    <Icon name="calendar" size={17} />
                    Registrar ausencia
                  </button>
                  <button className="primary" onClick={() => setAdding(true)}>
                    <Icon name="plus" size={17} />
                    Nueva jornada
                  </button>
                </div>
              </div>
              <section
                className="panel settings-panel"
                aria-label="Detalle del importe a cobrar"
              >
                <h2>Del importe calculado al bolsillo</h2>
                <div className="breakdown">
                  <div>
                    <span>Calculado antes de aportes configurados</span>
                    <strong>{currency(totals.amount)}</strong>
                  </div>
                  <div>
                    <span>Aportes y retenciones estimados</span>
                    <strong>− {currency(totals.payrollDeductionAmount)}</strong>
                  </div>
                  <div>
                    <span>A cobrar estimado</span>
                    <strong>{currency(totals.netAmount)}</strong>
                  </div>
                </div>
                <p>
                  La condición de cada fecha define los descuentos. Los importes
                  ingresados como netos y las partes no registradas no vuelven a
                  descontarse. Si no configuraste un porcentaje, no se aplican
                  aportes. Los descuentos por faltas ya están incluidos en el
                  importe calculado.
                </p>
                <button
                  className="text-button"
                  onClick={() => setTab("Configuración")}
                >
                  Revisar condición laboral y descuentos
                </button>
              </section>
              <div className="metrics">
                <article className="income">
                  <div>
                    <span>
                      A cobrar estimado · {currencyFor(state.profile)}
                    </span>
                    <Icon name="wallet" />
                  </div>
                  <strong>{currency(totals.netAmount)}</strong>
                  <small>
                    <span className="metric-dot" /> Según tus registros y
                    condiciones de pago
                  </small>
                </article>
                <article>
                  <div>
                    <span>Horas trabajadas</span>
                    <Icon name="clock" />
                  </div>
                  <strong>
                    {numberLabel.format(totals.workedHours)}
                    <em> h</em>
                  </strong>
                  <small>
                    {numberLabel.format(totals.regularHours)} habituales ·{" "}
                    {numberLabel.format(totals.holidayHours)} en feriados
                  </small>
                </article>
                <article>
                  <div>
                    <span>Horas extra</span>
                    <Icon name="bolt" />
                  </div>
                  <strong>
                    {numberLabel.format(totals.overtimeHours)}
                    <em> h</em>
                  </strong>
                  <small>
                    {current.mode === "piecework"
                      ? "Sin importe extra automático"
                      : `${currency(totals.extraAmount)} en extras, antes de aportes configurados`}
                  </small>
                </article>
                <article>
                  <div>
                    <span>Próximo cobro previsto</span>
                    <Icon name="calendar" />
                  </div>
                  <strong className="pay-date">
                    {nextPay
                      ? dateLabel(nextPay.date).slice(0, 5)
                      : "Sin fecha"}
                  </strong>
                  <small>{currency(nextAmount)} generados / proyectados</small>
                </article>
              </div>
              <section
                className="attendance-summary"
                aria-label="Asistencia del período"
              >
                <div>
                  <span className="attendance-icon">
                    <Icon name="calendar" size={19} />
                  </span>
                  <div>
                    <strong>Asistencia del período</strong>
                    <small>También cuentan los días que no trabajaste.</small>
                  </div>
                </div>
                <div>
                  <span>Justificadas</span>
                  <strong>{totals.justifiedAbsences}</strong>
                </div>
                <div>
                  <span>Sin justificar</span>
                  <strong>{totals.unjustifiedAbsences}</strong>
                </div>
                <div>
                  <span>Vacaciones</span>
                  <strong>{decimalHours(totals.vacationHours)}</strong>
                </div>
                {totals.deductionAmount > 0 && (
                  <div>
                    <span>Descuentos indicados</span>
                    <strong>{currency(totals.deductionAmount)}</strong>
                  </div>
                )}
              </section>
              {tab === "Resumen" ? (
                <div className="dashboard-columns">
                  <div className="dashboard-primary">
                    <WeeklyChart state={state} end={periodEnd} />
                    <div className="schedule-summary">
                      <Icon name="calendar" />
                      <strong>Mi jornada</strong>
                      <span>{Number(weekHours.toFixed(2))} h semanales</span>
                      <span>
                        {PAY_MODES[current.mode]} · {currency(current.amount)}
                      </span>
                      <button
                        className="text-button"
                        onClick={() => setTab("Configuración")}
                      >
                        Configurar <Icon name="arrow" size={14} />
                      </button>
                    </div>
                    <Records
                      profile={state.profile}
                      entries={selected}
                      onExport={exportCsv}
                      onDelete={(id) => {
                        if (confirm("¿Eliminar esta jornada?"))
                          safeCommit({
                            ...state,
                            entries: state.entries.filter((e) => e.id !== id),
                          });
                      }}
                    />
                  </div>
                  <div className="dashboard-secondary">
                    <div className="desktop-session">{sessionCard}</div>
                    <section className="whatsapp-card">
                      <div className="split">
                        <span className="whatsapp-icon">
                          <Icon name="chat" size={27} />
                        </span>
                        <span className="badge premium">
                          <Icon name="lock" size={11} />
                          Premium · Próximamente
                        </span>
                      </div>
                      <h2>Tu jornada, por WhatsApp.</h2>
                      <p>
                        La idea es simple: mandá «Entré» o «Salí» y listo.
                        Estamos preparando esta integración.
                      </p>
                      <button
                        className="secondary"
                        onClick={() => setPremium(true)}
                      >
                        Conocer las funciones
                      </button>
                    </section>
                    <section className="privacy-card">
                      <Icon name="lock" size={17} />
                      <p>
                        {cloud
                          ? "Tu cuenta sincroniza los registros. Revisá arriba si hay cambios pendientes antes de cerrar este dispositivo."
                          : "Tus registros quedan en este navegador. El acceso con cuenta todavía no está configurado."}{" "}
                        <button className="text-button" onClick={backup}>
                          Guardar una copia
                        </button>
                      </p>
                    </section>
                  </div>
                </div>
              ) : (
                <>
                  <div className="actions-heading">
                    <p>
                      Las jornadas nocturnas se asignan a la fecha de entrada.
                    </p>
                    <button className="primary" onClick={() => setAdding(true)}>
                      <Icon name="plus" size={17} />
                      Agregar jornada
                    </button>
                  </div>
                  <Records
                    profile={state.profile}
                    entries={selected}
                    onExport={exportCsv}
                    onDelete={(id) => {
                      if (confirm("¿Eliminar esta jornada?"))
                        safeCommit({
                          ...state,
                          entries: state.entries.filter((e) => e.id !== id),
                        });
                    }}
                  />
                </>
              )}
              <div className="notice">
                <Icon name="info" />
                <div>
                  <strong>Las reglas las elegís vos.</strong>
                  <p>
                    Los feriados se marcan manualmente. Los aportes se estiman
                    únicamente con tus porcentajes; no aplicamos convenios ni
                    impuestos automáticos.{" "}
                    {["monthly", "fortnightly"].includes(current.mode)
                      ? "El sueldo fijo es una proyección por días calendario. "
                      : ""}
                    Para revisar importes y fechas, entrá a Configuración.
                  </p>
                </div>
              </div>
            </>
          )}
          <footer>
            <span>Hecho para que tu tiempo tenga valor.</span>
            <span>
              {locationLabel(state.profile)} <i />{" "}
              {cloud ? "Beta" : "Versión en desarrollo"}
            </span>
            <CreatorCredit />
          </footer>
        </div>
      </main>
      <nav className="mobile-nav" aria-label="Navegación móvil">
        {NAV.map(([label, icon]) => (
          <button
            key={label}
            className={tab === label ? "active" : ""}
            aria-current={tab === label ? "page" : undefined}
            onClick={() => setTab(label)}
          >
            <Icon name={icon} />
            <span>
              {label === "Mis jornadas"
                ? "Jornadas"
                : label === "Mis cobros"
                  ? "Cobros"
                  : label === "Configuración"
                    ? "Perfil"
                    : label}
            </span>
          </button>
        ))}
      </nav>
      {hasModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setAdding(false);
              setClosing(false);
              setPremium(false);
            }
          }}
        >
          <section
            className="modal panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            tabIndex={-1}
            ref={modalRef}
          >
            <div className="split">
              <h2 id="modal-title">
                {premium
                  ? "Lo que viene con Jornadapp Premium"
                  : closing
                    ? "Confirmá tu hora de salida"
                    : adding === "absence"
                      ? "Registrar una ausencia"
                      : "Sumá una jornada"}
              </h2>
              <button
                className="icon-button"
                aria-label="Cerrar ventana"
                onClick={() => {
                  setAdding(false);
                  setClosing(false);
                  setPremium(false);
                }}
              >
                ×
              </button>
            </div>
            {premium ? (
              <>
                <p>
                  Queremos que puedas empezar gratis y elegir funciones
                  adicionales cuando te resulten útiles.
                </p>
                <ul className="feature-list">
                  <li>
                    <Icon name="chat" />
                    <div>
                      <strong>Registro por WhatsApp</strong>
                      <p>Enviar entradas, salidas y consultar tus horas.</p>
                    </div>
                  </li>
                  <li>
                    <Icon name="bell" />
                    <div>
                      <strong>Recordatorios con la app cerrada</strong>
                      <p>Avisos programados, con tu permiso.</p>
                    </div>
                  </li>
                  <li>
                    <Icon name="user" />
                    <div>
                      <strong>Espacios de empresa</strong>
                      <p>Empleados, permisos y revisión de jornadas.</p>
                    </div>
                  </li>
                </ul>
                <div className="inline-note">
                  <Icon name="info" />
                  <span>
                    Estas funciones todavía no están disponibles. No hay
                    suscripciones ni cobros habilitados.
                  </span>
                </div>
                <button className="primary" onClick={() => setPremium(false)}>
                  Entendido
                </button>
              </>
            ) : (
              <>
                <p>
                  {closing
                    ? "Si terminaste antes, corregí la hora. No usamos la hora del recordatorio como salida."
                    : adding === "absence"
                      ? "Registrá las horas de ausencia e indicá si están justificadas y si se pagan."
                      : "Registrá tus horarios o cargá directamente el total de horas."}
                </p>
                <EntryForm
                  key={closing ? "close" : String(adding)}
                  state={state}
                  onAdd={add}
                  closing={closing}
                  onCancel={() => setClosing(false)}
                  today={today}
                  initialKind={adding === "absence" ? "absence" : "work"}
                />
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
