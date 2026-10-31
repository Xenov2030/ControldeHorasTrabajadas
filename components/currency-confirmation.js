import { currencyFor } from "../lib/locations.mjs";
import { hasFinancialRecords } from "../lib/currency-change.mjs";
export default function CurrencyConfirmation({
  previous,
  profile,
  confirmed,
  onChange,
}) {
  const from = currencyFor(previous.profile),
    to = currencyFor(profile);
  if (from === to || !hasFinancialRecords(previous)) return null;
  return (
    <section className="currency-confirmation">
      <h3>
        Corregir la moneda: {from} → {to}
      </h3>
      <p>
        Se mantienen todos los valores numéricos. Confirmá únicamente si esos
        importes ya estaban expresados en {to}. No calculamos un tipo de cambio
        ni convertimos {from} a {to}.
      </p>
      <label className="check">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onChange(e.target.checked)}
          required
        />
        Confirmo que los importes guardados ya corresponden a {to}
      </label>
      <small>
        Antes de guardar se conserva una copia del espacio anterior, disponible
        en esta pantalla.
      </small>
    </section>
  );
}
