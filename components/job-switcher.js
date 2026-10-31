"use client";
import { useState } from "react";
import { jobId, jobName, listJobs, MAX_JOBS } from "../lib/jobs.mjs";

export default function JobSwitcher({
  state,
  disabled,
  onSwitch,
  onAdd,
  onRename,
}) {
  const [mode, setMode] = useState(null),
    [name, setName] = useState(""),
    [error, setError] = useState("");
  const jobs = listJobs(state);
  function run(action) {
    try {
      action();
      setMode(null);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <section className="job-switcher" aria-label="Tus trabajos">
      <div className="job-switcher-row">
        <label>
          <span>TRABAJO ACTUAL</span>
          <select
            aria-label="Trabajo actual"
            value={jobId(state)}
            disabled={disabled}
            onChange={(e) => run(() => onSwitch(e.target.value))}
          >
            {jobs.map((job) => (
              <option key={jobId(job)} value={jobId(job)}>
                {jobName(job)}
                {job.activeSession ? " · Entrada activa" : ""}
              </option>
            ))}
          </select>
        </label>
        <button
          className="secondary"
          disabled={disabled}
          onClick={() => {
            setName(jobName(state));
            setMode("rename");
            setError("");
          }}
        >
          Renombrar trabajo
        </button>
        <button
          className="secondary"
          disabled={disabled || jobs.length >= MAX_JOBS}
          onClick={() => {
            setName("");
            setMode("add");
            setError("");
          }}
        >
          + Agregar trabajo
        </button>
      </div>
      <p>
        Horarios, jornadas y cobros separados por trabajo. Los resúmenes y
        recordatorios corresponden al trabajo seleccionado.
      </p>
      {jobs.some((job) => jobId(job) !== jobId(state) && job.activeSession) && (
        <p role="status">
          Tenés una entrada activa en otro trabajo. Seleccionalo para registrar
          su salida.
        </p>
      )}
      {mode && (
        <form
          className="job-name-form"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => (mode === "add" ? onAdd(name) : onRename(name)));
          }}
        >
          <label>
            Nombre del trabajo
            <input
              autoFocus
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej.: Taller · Turno mañana"
            />
          </label>
          <button className="primary" disabled={disabled} type="submit">
            {mode === "add" ? "Crear trabajo" : "Guardar nombre"}
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => {
              setMode(null);
              setError("");
            }}
          >
            Cancelar
          </button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
