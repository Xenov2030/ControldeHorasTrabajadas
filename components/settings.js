"use client";
import { useEffect, useState } from "react";
import {
  ProfileFields,
  ScheduleFields,
  SalaryFields,
  CycleFields,
  ReminderFields,
  SECTIONS,
} from "./setup";
import {
  currency as formatCurrency,
  dateLabel,
  localDate,
  PAY_MODES,
} from "../lib/workspace.mjs";
import Icon from "./icon";
import { EMPLOYMENT_TYPES, employmentSettings } from "../lib/employment.mjs";
import CurrencyConfirmation from "./currency-confirmation";
import { CURRENCY_BACKUP_KEY } from "../lib/currency-change.mjs";
import { currencyFor, zoneFor, locationLabel } from "../lib/locations.mjs";
export default function Settings({
  state,
  onSave,
  onBackup,
  onImport,
  onCurrencyBackup,
  currencyBackupStorageKey = CURRENCY_BACKUP_KEY,
  cloudEnabled = false,
  onConflictBackup,
}) {
  const currency = (n) => formatCurrency(n, currencyFor(state.profile));
  const [section, setSection] = useState(0),
    [draft, setDraft] = useState(() => structuredClone(state)),
    [salary, setSalary] = useState(() => ({
      ...state.compensation.toSorted((a, b) =>
        b.effectiveFrom.localeCompare(a.effectiveFrom),
      )[0],
      id: "",
      effectiveFrom: localDate(new Date(), zoneFor(state.profile)),
    })),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [currencyConfirmed, setCurrencyConfirmed] = useState(false),
    [hasCurrencyBackup, setHasCurrencyBackup] = useState(false);
  useEffect(() => {
    try {
      setHasCurrencyBackup(
        Boolean(localStorage.getItem(currencyBackupStorageKey)),
      );
    } catch {}
  }, [state.profile.currency, currencyBackupStorageKey]);
  useEffect(() => {
    setDraft((d) => ({
      ...d,
      profile: { ...d.profile, theme: state.profile.theme },
    }));
  }, [state.profile.theme]);
  const set = (key, value) => {
    setDraft({ ...draft, [key]: value });
    setSaved(false);
  };
  function submit(e) {
    e.preventDefault();
    try {
      setError("");
      const next =
        section === 2
          ? {
              ...draft,
              compensation: [
                ...draft.compensation,
                { ...salary, id: crypto.randomUUID() },
              ],
            }
          : draft;
      onSave(next, { confirmCurrencyCorrection: currencyConfirmed });
      setDraft(structuredClone(next));
      setSaved(true);
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <>
      <div className="section-tabs" role="tablist" aria-label="Configuración">
        {SECTIONS.map((label, i) => (
          <button
            role="tab"
            aria-selected={section === i}
            key={label}
            className={section === i ? "selected" : ""}
            onClick={() => {
              setSection(i);
              setError("");
              setSaved(false);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <section className="panel settings-panel">
        <div className="panel-heading">
          <h2>
            {section === 2
              ? "Registrar un aumento o nueva condición"
              : SECTIONS[section]}
          </h2>
          <p>Configuración personal · {locationLabel(state.profile)}</p>
        </div>
        <form onSubmit={submit}>
          {section === 0 ? (
            <ProfileFields
              value={draft.profile}
              locationLocked={!!state.activeSession}
              onChange={(v) => {
                if (currencyFor(v) !== currencyFor(draft.profile))
                  setCurrencyConfirmed(false);
                set("profile", v);
              }}
            />
          ) : section === 1 ? (
            <ScheduleFields
              value={draft.schedule}
              onChange={(v) => set("schedule", v)}
            />
          ) : section === 2 ? (
            <SalaryFields
              value={salary}
              onChange={setSalary}
              currencyCode={currencyFor(state.profile)}
              countryCode={state.profile.country || "AR"}
            />
          ) : section === 3 ? (
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
          {section === 0 && (
            <CurrencyConfirmation
              previous={state}
              profile={draft.profile}
              confirmed={currencyConfirmed}
              onChange={setCurrencyConfirmed}
            />
          )}
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          {saved && (
            <div className="alert success" role="status">
              {cloudEnabled
                ? "Cambios guardados en este dispositivo. Revisá el estado de sincronización arriba."
                : "Cambios guardados en este navegador."}
            </div>
          )}
          <div className="form-actions">
            <button className="primary">
              {section === 2 ? "Agregar al historial" : "Guardar cambios"}
              <Icon name="check" size={16} />
            </button>
          </div>
        </form>
        {section === 2 && (
          <div className="salary-history">
            <h3>Historial de condiciones</h3>
            <p>
              Una nueva condición se aplica desde su fecha de vigencia. No
              reemplaza las anteriores.
            </p>
            {draft.compensation
              .toSorted((a, b) =>
                b.effectiveFrom.localeCompare(a.effectiveFrom),
              )
              .map((v) => (
                <div className="history-row" key={v.id}>
                  <span>
                    <strong>{currency(v.amount)}</strong>
                    <small>
                      {PAY_MODES[v.mode]} ·{" "}
                      {EMPLOYMENT_TYPES[employmentSettings(v).type]}
                      {v.employmentType === "monotributo"
                        ? ` · Categoría ${v.monotributoCategory}${v.monotributoMonthlyFee !== undefined ? ` · Cuota mensual ${formatCurrency(v.monotributoMonthlyFee, "ARS")} (referencia)` : ""}`
                        : ""}{" "}
                      ·{" "}
                      {employmentSettings(v).basis === "net"
                        ? "Neto ingresado"
                        : "Bruto ingresado"}{" "}
                      ·{" "}
                      {employmentSettings(v).basis === "gross" &&
                      employmentSettings(v).share > 0
                        ? `Aportes ${employmentSettings(v).rate}% sobre ${employmentSettings(v).share}%${employmentSettings(v).extras ? ", incluidas extras" : ", sin extras"}`
                        : "Sin nuevos aportes"}
                    </small>
                  </span>
                  <span>
                    {v.effectiveFrom === "1900-01-01"
                      ? "Condición inicial"
                      : `Desde ${dateLabel(v.effectiveFrom)}`}
                  </span>
                </div>
              ))}
          </div>
        )}
      </section>
      {section === 0 && (
        <section className="panel settings-panel backup-panel">
          <h2>Tu información, bajo tu control</h2>
          <p>
            La copia JSON incluye todos tus trabajos, con sus perfiles,
            horarios, jornadas y condiciones de pago. Guardala en un lugar
            privado; permite recuperar tus datos en este navegador.
          </p>
          <div className="button-row">
            <button className="secondary" onClick={onBackup}>
              <Icon name="download" size={16} />
              Descargar copia de seguridad
            </button>
            {hasCurrencyBackup && (
              <button className="secondary" onClick={onCurrencyBackup}>
                Descargar copia anterior al cambio de moneda
              </button>
            )}
            {onConflictBackup && (
              <button className="secondary" onClick={onConflictBackup}>
                Descargar última copia de conflicto
              </button>
            )}
            <label className="secondary file-button">
              Restaurar copia
              <input
                type="file"
                accept="application/json,.json"
                onChange={onImport}
              />
            </label>
          </div>
        </section>
      )}
    </>
  );
}
