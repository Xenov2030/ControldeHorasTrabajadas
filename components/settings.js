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
  currency,
  dateLabel,
  localDate,
  PAY_MODES,
} from "../lib/workspace.mjs";
import Icon from "./icon";
export default function Settings({ state, onSave, onBackup, onImport }) {
  const [section, setSection] = useState(0),
    [draft, setDraft] = useState(() => structuredClone(state)),
    [salary, setSalary] = useState(() => ({
      ...state.compensation.toSorted((a, b) =>
        b.effectiveFrom.localeCompare(a.effectiveFrom),
      )[0],
      id: "",
      effectiveFrom: localDate(),
    })),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
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
      onSave(next);
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
          <p>Configuración personal · Argentina, Mendoza</p>
        </div>
        <form onSubmit={submit}>
          {section === 0 ? (
            <ProfileFields
              value={draft.profile}
              onChange={(v) => set("profile", v)}
            />
          ) : section === 1 ? (
            <ScheduleFields
              value={draft.schedule}
              onChange={(v) => set("schedule", v)}
            />
          ) : section === 2 ? (
            <SalaryFields value={salary} onChange={setSalary} />
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
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          {saved && (
            <div className="alert success" role="status">
              Cambios guardados en este navegador.
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
                    <small>{PAY_MODES[v.mode]}</small>
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
            La copia JSON incluye perfil, horarios, jornadas y condiciones de
            pago. Guardala en un lugar privado; permite recuperar tus datos en
            este navegador.
          </p>
          <div className="button-row">
            <button className="secondary" onClick={onBackup}>
              <Icon name="download" size={16} />
              Descargar copia de seguridad
            </button>
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
