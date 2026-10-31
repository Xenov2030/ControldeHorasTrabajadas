import { monotributoConditions } from "../lib/employment.mjs";
import { currency, dateLabel } from "../lib/workspace.mjs";

export default function MonotributoNote({ state, start, end }) {
  const conditions = monotributoConditions(state.compensation, start, end);
  if (!conditions.length) return null;
  return (
    <section className="notice" aria-label="Monotributo del período">
      <div>
        <strong>Monotributo · Referencia personal</strong>
        {conditions.map((v) => (
          <p key={v.id}>
            Categoría {v.monotributoCategory}
            {v.effectiveFrom !== "1900-01-01"
              ? ` · Vigente desde ${dateLabel(v.effectiveFrom)}`
              : ""}
            . Cuota mensual:{" "}
            {v.monotributoMonthlyFee !== undefined
              ? currency(v.monotributoMonthlyFee, "ARS")
              : "sin informar"}
            .
          </p>
        ))}
        <p>
          La cuota mensual no está descontada del importe a cobrar. Es una
          obligación del contribuyente y puede cubrir varios trabajos: no se
          suma por cada empleo o quincena. Usamos la categoría y la cuota que
          informaste, sin calcular límites ni recategorizaciones.
        </p>
      </div>
    </section>
  );
}
