"use client";
import { useState } from "react";
import { DAYS, PAY_MODES, scheduleHours } from "../lib/workspace.mjs";
import Icon from "./icon";
import DecimalInput from "./decimal-input";
import {
  COUNTRIES,
  CURRENCIES,
  countryFor,
  zoneFor,
  currencyFor,
  currencyName,
  zoneLabel,
} from "../lib/locations.mjs";
import CreatorCredit from "./creator-credit";
import CurrencyConfirmation from "./currency-confirmation";
export const SECTIONS = [
  "Tu perfil",
  "Tus horarios",
  "Cómo te pagan",
  "Cuándo cobrás",
  "Recordatorios",
];
const presets = [
  ["L–J 9 h · V 8 h", [9, 9, 9, 9, 8, 0, 0]],
  ["L–V 8 h · S 4 h", [8, 8, 8, 8, 8, 4, 0]],
  ["L–V 8 h", [8, 8, 8, 8, 8, 0, 0]],
];
export function ProfileFields({ value, onChange, locationLocked = false }) {
  const selected = countryFor(value);
  function changeCountry(code) {
    const country = COUNTRIES.find((c) => c.code === code);
    onChange({
      ...value,
      country: code,
      region: "",
      timeZone: country.timeZone,
      currency: country.currency,
    });
  }

  return (
    <div className="form-grid">
      <label>
        ¿Cómo te llamás?
        <input
          autoComplete="given-name"
          name="name"
          maxLength={80}
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="Tu nombre"
          required
        />
      </label>
      <label>
        País o territorio
        <select
          aria-label="País o territorio"
          value={selected.code}
          onChange={(e) => changeCountry(e.target.value)}
          disabled={locationLocked}
          required
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {selected.regionLabel}
        <select
          aria-label="Provincia, estado o departamento"
          value={value.region}
          onChange={(e) => onChange({ ...value, region: e.target.value })}
          disabled={locationLocked}
          required
        >
          <option value="">Elegí una opción</option>
          {selected.regions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
      </label>
      <label>
        Zona horaria
        <select
          aria-label="Zona horaria"
          value={zoneFor(value)}
          onChange={(e) => onChange({ ...value, timeZone: e.target.value })}
          disabled={locationLocked}
          required
        >
          {selected.timeZones.map((zone) => (
            <option key={zone} value={zone}>
              {zoneLabel(zone)}
            </option>
          ))}
        </select>
        <small>Confirmala si tu país tiene más de una zona.</small>
      </label>
      <label>
        Moneda de registro
        <select
          aria-label="Moneda de registro"
          value={currencyFor(value)}
          onChange={(e) => onChange({ ...value, currency: e.target.value })}
          disabled={locationLocked}
          required
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code} · {currencyName(code)}
            </option>
          ))}
        </select>
        <small>
          Moneda habitual de {selected.name}: {selected.currency}. Podés elegir
          otra; no realizamos conversiones de dinero.
        </small>
      </label>
      {locationLocked && (
        <p className="field-help wide">
          Cerrá la jornada activa antes de cambiar tu ubicación o zona horaria.
        </p>
      )}
      <label>
        Fecha de ingreso al trabajo <span className="optional">Opcional</span>
        <input
          type="date"
          value={value.employmentStart}
          onChange={(e) =>
            onChange({ ...value, employmentStart: e.target.value })
          }
        />
        <small>Se usa para estimar el aguinaldo proporcional.</small>
      </label>
      <label>
        Apariencia
        <select
          value={value.theme}
          onChange={(e) => onChange({ ...value, theme: e.target.value })}
        >
          <option value="system">Seguir el dispositivo</option>
          <option value="light">Clara</option>
          <option value="dark">Oscura</option>
        </select>
      </label>
      <p className="field-help wide">
        La ubicación no activa leyes laborales ni feriados automáticos. Las
        reglas de pago se configuran por separado. No necesitás subir
        documentos.
      </p>
    </div>
  );
}
export function ScheduleFields({ value, onChange }) {
  let total = 0;
  try {
    total = scheduleHours(value).reduce((a, b) => a + b, 0);
  } catch {}
  function preset(hours) {
    onChange(
      hours.map((h) =>
        h
          ? {
              start: "05:00",
              end: `${String(5 + h).padStart(2, "0")}:00`,
              breakMinutes: 0,
            }
          : { start: "", end: "", breakMinutes: 0 },
      ),
    );
  }
  function change(i, key, next) {
    onChange(
      value.map((day, index) => (index === i ? { ...day, [key]: next } : day)),
    );
  }
  return (
    <>
      <p className="field-help">
        Tu horario pactado define cuándo empiezan las extras. Podés trabajar 9
        horas habituales un día y 8 otro.
      </p>
      <div className="presets">
        {presets.map(([label, hours]) => (
          <button
            type="button"
            className="chip"
            key={label}
            onClick={() => preset(hours)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="schedule-table">
        <div className="schedule-head">
          <span>Día</span>
          <span>Entrada</span>
          <span>Salida</span>
          <span>Descanso (min)</span>
          <span>Laborable</span>
        </div>
        {DAYS.map((day, i) => (
          <div
            className={"schedule-row " + (!value[i].start ? "off" : "")}
            key={day}
          >
            <strong>{day}</strong>
            <input
              aria-label={`Entrada ${day}`}
              type="time"
              disabled={!value[i].start}
              value={value[i].start}
              onChange={(e) => change(i, "start", e.target.value)}
            />
            <input
              aria-label={`Salida ${day}`}
              type="time"
              disabled={!value[i].start}
              value={value[i].end}
              onChange={(e) => change(i, "end", e.target.value)}
            />
            <input
              aria-label={`Descanso ${day}`}
              type="number"
              min="0"
              max="1439"
              step="1"
              disabled={!value[i].start}
              value={value[i].breakMinutes}
              onChange={(e) =>
                change(i, "breakMinutes", Number(e.target.value))
              }
            />
            <input
              aria-label={`Laborable ${day}`}
              type="checkbox"
              checked={!!value[i].start}
              onChange={(e) =>
                onChange(
                  value.map((v, n) =>
                    n === i
                      ? e.target.checked
                        ? { start: "05:00", end: "13:00", breakMinutes: 0 }
                        : { start: "", end: "", breakMinutes: 0 }
                      : v,
                  ),
                )
              }
            />
          </div>
        ))}
      </div>
      <div className="inline-note">
        <Icon name="clock" />
        <span>
          <strong>{Number(total.toFixed(2))} horas semanales.</strong> Una
          salida anterior a la entrada corresponde al día siguiente. El descanso
          se descuenta.
        </span>
      </div>
    </>
  );
}
export function SalaryFields({
  value,
  onChange,
  initial = false,
  currencyCode = "ARS",
}) {
  const set = (key, v) => onChange({ ...value, [key]: v });
  return (
    <div className="form-grid">
      <label>
        ¿Cómo se calcula tu pago?
        <select
          value={value.mode}
          onChange={(e) => set("mode", e.target.value)}
        >
          {Object.entries(PAY_MODES).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        {currencyCode === "ARS"
          ? "Importe en pesos argentinos"
          : `Importe en ${currencyCode}`}
        <DecimalInput
          name="amount"

          min="0"
          max="1000000000000"

          value={value.amount}
          onValueChange={(n) => set("amount", n)}
          required
        />
        <small>
          {value.mode === "piecework"
            ? "Precio por unidad terminada."
            : `Importe ${PAY_MODES[value.mode].toLowerCase()}. Cargá el valor que querés usar en la estimación.`}
        </small>
      </label>
      {value.mode === "daily" && (
        <label>
          Horas incluidas por jornada
          <DecimalInput
            min="0.25"
            max="24"

            value={value.dailyHours}
            onValueChange={(n) => set("dailyHours", n)}
            required
          />
          <small>Las fracciones de jornada se estiman proporcionalmente.</small>
        </label>
      )}
      {value.mode === "piecework" ? (
        <label>
          ¿Qué unidad realizás?
          <input
            value={value.unit}
            maxLength={40}
            required
            onChange={(e) => set("unit", e.target.value)}
            placeholder="Metro, pieza, tarea…"
          />
        </label>
      ) : (
        <>
          {["monthly", "fortnightly"].includes(value.mode) && (
            <label>
              Valor hora para extras y feriados
              <DecimalInput
                min="0"

                value={value.overtimeRate}
                onValueChange={(n) => set("overtimeRate", n)}
                required
              />
              <small>
                Ingresalo según tus condiciones; no lo deducimos del sueldo
                neto.
              </small>
            </label>
          )}
          <label>
            Recargo de horas extra
            <select
              value={value.overtimeMultiplier}
              onChange={(e) =>
                set("overtimeMultiplier", Number(e.target.value))
              }
            >
              <option value="1">Sin recargo (1×)</option>
              <option value="1.5">50 % (1,5×)</option>
              <option value="2">100 % (2×)</option>
            </select>
          </label>
          <label>
            Feriado trabajado
            <select
              value={value.holidayMultiplier}
              onChange={(e) => set("holidayMultiplier", Number(e.target.value))}
            >
              <option value="1">Sin recargo (1×)</option>
              <option value="1.5">50 % (1,5×)</option>
              <option value="2">100 % (2×)</option>
            </select>
          </label>
          {!["monthly", "fortnightly"].includes(value.mode) && (
            <label className="check wide">
              <input
                type="checkbox"
                checked={value.vacationPaid}
                onChange={(e) => set("vacationPaid", e.target.checked)}
              />
              Incluir vacaciones pagas en la estimación
            </label>
          )}
        </>
      )}
      {!initial && (
        <label>
          Vigente desde
          <input
            type="date"
            required
            value={value.effectiveFrom}
            onChange={(e) => set("effectiveFrom", e.target.value)}
          />
          <small>Conservamos las condiciones anteriores a esta fecha.</small>
        </label>
      )}
      <div className="inline-note wide">
        <Icon name="info" />
        <span>
          {value.mode === "piecework"
            ? "Al tanto: ingresos = cantidad × precio. Registramos las horas, pero no sumamos extras automáticamente."
            : ["monthly", "fortnightly"].includes(value.mode)
              ? "El sueldo fijo se proyecta por días calendario. Es una estimación; no descuenta ausencias ni calcula aportes."
              : "Las extras se calculan sobre el horario pactado. Los feriados usan su propio multiplicador, sin acumular extras."}
        </span>
      </div>
    </div>
  );
}
const numberChange = (set, value, key, e) =>
  set({ ...value, [key]: Number(e.target.value) });
export function CycleFields({ value, onChange }) {
  const change = (key, e) => numberChange(onChange, value, key, e);
  const payDay = (title, key) => (
    <label>
      {title}
      <input
        type="number"
        min="1"
        max="31"
        step="1"
        value={value[key]}
        onChange={(e) => change(key, e)}
        required
      />
    </label>
  );
  const offset = (key) => (
    <label>
      Mes del cobro
      <select value={value[key]} onChange={(e) => change(key, e)}>
        <option value="0">Mismo mes trabajado</option>
        <option value="1">Mes siguiente</option>
        <option value="2">Dos meses después</option>
      </select>
    </label>
  );
  return (
    <>
      <label className="short-field">
        ¿Cada cuánto liquidan tu trabajo?
        <select
          value={value.kind}
          onChange={(e) => onChange({ ...value, kind: e.target.value })}
        >
          <option value="weekly">Por semana</option>
          <option value="fortnightly">Por quincena</option>
          <option value="monthly">Por mes</option>
        </select>
      </label>
      <p className="field-help">
        Esto es independiente de cómo se calcula tu pago: podés cobrar por hora
        y recibir dos pagos al mes.
      </p>
      {value.kind === "fortnightly" ? (
        <>
          <label className="short-field">
            Cierre de la primera quincena
            <input
              type="number"
              min="1"
              max="27"
              step="1"
              value={value.closeDay}
              onChange={(e) => change("closeDay", e)}
              required
            />
          </label>
          <div className="cycle-cards">
            <fieldset>
              <legend>Del 1 al {value.closeDay}</legend>
              {payDay("Día de cobro", "firstPayDay")}
              {offset("firstOffset")}
            </fieldset>
            <fieldset>
              <legend>Del {Number(value.closeDay) + 1} al fin de mes</legend>
              {payDay("Día de cobro", "secondPayDay")}
              {offset("secondOffset")}
            </fieldset>
          </div>
          <p className="field-help">
            Las fechas 20 y 5 son una propuesta editable. Confirmá qué pago
            corresponde a cada período.
          </p>
        </>
      ) : value.kind === "monthly" ? (
        <div className="form-grid">
          {payDay("Día de cobro", "monthlyPayDay")}
          {offset("monthlyOffset")}
        </div>
      ) : (
        <label className="short-field">
          Día de cobro posterior al cierre del domingo
          <select
            value={value.weeklyPayDay}
            onChange={(e) => change("weeklyPayDay", e)}
          >
            {[
              "Domingo",
              "Lunes",
              "Martes",
              "Miércoles",
              "Jueves",
              "Viernes",
              "Sábado",
            ].map((d, i) => (
              <option value={i} key={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="inline-note">
        <Icon name="calendar" />
        <span>
          Si un día de cobro no existe en ese mes, usamos el último día. No
          trasladamos fechas por fines de semana o feriados.
        </span>
      </div>
    </>
  );
}
export function ReminderFields({ value, onChange }) {
  return (
    <>
      <div className="feature-notice">
        <Icon name="bell" />
        <div>
          <h3>Una ayuda para acordarte de salir</h3>
          <p>
            En esta versión los avisos funcionan con la página abierta. No se
            envían con la aplicación cerrada ni por WhatsApp.
          </p>
        </div>
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
        />
        Mostrar recordatorios dentro de la aplicación
      </label>
      <div className="form-grid">
        <label>
          Primer aviso después de la salida (min)
          <input
            type="number"
            min="0"
            max="120"
            value={value.delayMinutes}
            onChange={(e) => numberChange(onChange, value, "delayMinutes", e)}
            required
          />
        </label>
        <label>
          Repetir cada (min)
          <input
            type="number"
            min="15"
            max="240"
            value={value.repeatMinutes}
            onChange={(e) => numberChange(onChange, value, "repeatMinutes", e)}
            required
          />
        </label>
        <label>
          Cantidad máxima de avisos
          <select
            value={value.maxReminders}
            onChange={(e) => numberChange(onChange, value, "maxReminders", e)}
          >
            <option value="1">1 aviso</option>
            <option value="2">2 avisos</option>
            <option value="3">3 avisos</option>
          </select>
        </label>
      </div>
      <p className="field-help">
        Solo avisamos si hay una entrada activa y una salida programada. Nunca
        cerramos tu jornada automáticamente.
      </p>
    </>
  );
}
export default function Setup({
  state,
  onSave,
  onCancel,
  cloudEnabled = false,
}) {
  const [draft, setDraft] = useState(() => structuredClone(state)),
    [step, setStep] = useState(0),
    [error, setError] = useState(""),
    [currencyConfirmed, setCurrencyConfirmed] = useState(false);
  const set = (key, value) => setDraft({ ...draft, [key]: value });
  function submit(e) {
    e.preventDefault();
    setError("");
    try {
      if (step === 1) scheduleHours(draft.schedule);
      if (step < 4) setStep(step + 1);
      else {
        onSave(
          { ...draft, configured: true },
          { confirmCurrencyCorrection: currencyConfirmed },
        );
      }
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <div className="setup-shell">
      <div className="setup-intro">
        <a className="brand" href="/">
          <Icon name="clock" size={32} /> jornadapp<span>.</span>
        </a>
        <span className="eyebrow">TU TIEMPO TIENE VALOR</span>
        <h1>
          Primero, hagámoslo
          <br />a tu medida.
        </h1>
        <p>
          Contanos cómo trabajás y cómo cobrás.
          <br />
          Nosotros te ayudamos a llevar las cuentas.
        </p>
        <ol>
          {SECTIONS.map((label, i) => (
            <li
              key={label}
              className={i === step ? "current" : i < step ? "done" : ""}
            >
              <span>{i < step ? <Icon name="check" size={16} /> : i + 1}</span>
              {label}
            </li>
          ))}
        </ol>
        <div className="setup-privacy">
          <Icon name="lock" size={18} />
          <span>
            Sin recibos ni documentos.
            <br />
            {cloudEnabled
              ? "Tu espacio está vinculado a tu cuenta."
              : "Por ahora, tus datos quedan en este navegador."}
          </span>
        </div>
      </div>
      <main className="setup-main">
        <div className="setup-top">
          <span>PASO {step + 1} DE 5</span>
          {onCancel && (
            <button className="text-button" onClick={onCancel}>
              Volver al panel
            </button>
          )}
        </div>
        <h2>
          {
            [
              "Hola, empecemos por vos.",
              "Cada jornada es distinta.",
              "¿Cuánto vale tu trabajo?",
              "Dejemos claras las fechas.",
              "Que no se te pase.",
            ][step]
          }
        </h2>
        <p className="setup-description">
          {
            [
              "Una configuración simple, sin papeles.",
              "Elegí un ejemplo o ajustá cada día a tu rutina.",
              "Podés cambiarlo después y registrar tus aumentos.",
              "Cuándo cierra el período y cuándo recibís el dinero.",
              "Elegí si querés una ayuda para registrar tu salida.",
            ][step]
          }
        </p>
        <form onSubmit={submit}>
          {step === 0 ? (
            <ProfileFields
              value={draft.profile}
              locationLocked={!!draft.activeSession}
              onChange={(v) => {
                if (currencyFor(v) !== currencyFor(draft.profile))
                  setCurrencyConfirmed(false);
                set("profile", v);
              }}
            />
          ) : step === 1 ? (
            <ScheduleFields
              value={draft.schedule}
              onChange={(v) => set("schedule", v)}
            />
          ) : step === 2 ? (
            <SalaryFields
              initial
              currencyCode={currencyFor(draft.profile)}
              value={draft.compensation[0]}
              onChange={(v) =>
                set("compensation", [v, ...draft.compensation.slice(1)])
              }
            />
          ) : step === 3 ? (
            <CycleFields
              value={draft.cycle}
              onChange={(v) => set("cycle", v)}
            />
          ) : (
            <ReminderFields
              value={draft.reminders}
              onChange={(v) => set("reminders", v)}
            />
          )}
          {step === 0 && (
            <CurrencyConfirmation
              previous={state}
              profile={draft.profile}
              confirmed={currencyConfirmed}
              onChange={setCurrencyConfirmed}
            />
          )}
          <p className="field-help">
            {step === 2
              ? "El importe inicial es de ejemplo. Reemplazalo por tu valor real."
              : ""}
          </p>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          <div className="setup-actions">
            {step > 0 ? (
              <button
                type="button"
                className="secondary"
                onClick={() => setStep(step - 1)}
              >
                Atrás
              </button>
            ) : (
              <span />
            )}
            <button className="primary">
              {step === 4 ? "Empezar mi registro" : "Continuar"}
              <Icon name="arrow" size={16} />
            </button>
          </div>
        </form>
        <CreatorCredit />
      </main>
    </div>
  );
}
