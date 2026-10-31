"use client";
import DecimalInput from "./decimal-input";
import {
  EMPLOYMENT_TYPES,
  MONOTRIBUTO_CATEGORIES,
  employmentSettings,
} from "../lib/employment.mjs";

export default function EmploymentFields({
  value,
  onChange,
  countryCode = "AR",
}) {
  const settings = employmentSettings(value);
  const set = (key, next) => onChange({ ...value, [key]: next });
  const registered = ["registered", "mixed"].includes(settings.type);
  return (
    <fieldset className="employment-fields wide">
      <legend>Condición laboral y descuentos</legend>
      <p>
        En un empleo registrado, el sueldo bruto puede tener aportes y
        retenciones antes de cobrar. Si el importe ya es neto, no los
        descontamos otra vez. En un trabajo no registrado usamos el importe
        pactado, sin aplicar aportes de recibo.
      </p>
      <div className="form-grid">
        <label>
          ¿Cómo está registrado este trabajo?
          <select
            value={settings.type}
            onChange={(e) => set("employmentType", e.target.value)}
          >
            {Object.entries(EMPLOYMENT_TYPES)
              .filter(
                ([key]) =>
                  key !== "monotributo" ||
                  countryCode === "AR" ||
                  settings.type === "monotributo",
              )
              .map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
          </select>
        </label>
        {settings.type === "monotributo" && (
          <>
            <label>
              Categoría de monotributo
              <select
                required
                value={value.monotributoCategory || ""}
                onChange={(e) => set("monotributoCategory", e.target.value)}
              >
                <option value="" disabled>
                  Elegí tu categoría
                </option>
                {MONOTRIBUTO_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    Categoría {category}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cuota mensual de monotributo (ARS) · opcional
              <DecimalInput
                value={value.monotributoMonthlyFee}
                min="0"
                max="1000000000000"
                onValueChange={(n) => set("monotributoMonthlyFee", n)}
              />
              <small>
                Ingresá la cuota vigente que pagás. No usamos una tabla de
                importes automática.
              </small>
            </label>
            <p className="wide">
              La categoría y la cuota corresponden a tu situación como
              contribuyente. La cuota se muestra como referencia y no se
              descuenta del sueldo, de cada quincena ni una vez por trabajo. Si
              facturás por varios trabajos, no la sumes repetidamente. No
              estimamos la categoría ni la recategorización a partir de tus
              horas.
            </p>
          </>
        )}
        <label>
          El importe que ingresás es
          <select
            value={settings.basis}
            onChange={(e) => set("amountBasis", e.target.value)}
          >
            <option value="gross">Bruto / antes de descuentos</option>
            <option value="net">Neto / de bolsillo</option>
          </select>
        </label>
        {registered && settings.basis === "gross" && (
          <>
            <label>
              Aportes y retenciones estimados (%)
              <DecimalInput
                value={settings.rate}
                min="0"
                max="100"
                required
                onValueChange={(n) => set("deductionPercent", n)}
              />
              <small>
                Porcentaje total que querés estimar. Depende de tu país,
                convenio y situación; no se carga una tasa legal automática.
              </small>
            </label>
            {settings.type === "mixed" && (
              <label>
                Parte del importe registrada (%)
                <DecimalInput
                  value={settings.share}
                  min="0"
                  max="100"
                  required
                  onValueChange={(n) => set("registeredPercent", n)}
                />
                <small>
                  El porcentaje de aportes se aplica solo a esta parte del
                  importe; el resto se suma sin esos descuentos.
                </small>
              </label>
            )}
            <label className="check wide">
              <input
                type="checkbox"
                checked={settings.extras}
                onChange={(e) => set("deductExtras", e.target.checked)}
              />
              Aplicar también a las horas extra
            </label>
            <p className="wide">
              Si tus extras se pagan por separado sin esos descuentos, desmarcá
              la opción. Los feriados y vacaciones pagos usan la condición del
              pago habitual.
            </p>
            {settings.rate === 0 && (
              <p className="wide" role="status">
                Todavía no configuraste un porcentaje: la estimación no
                descontará aportes ni retenciones.
              </p>
            )}
          </>
        )}
        {settings.type === "unspecified" && (
          <p className="wide">
            Elegí la condición de este trabajo para estimar sus descuentos. Por
            ahora no se aplican aportes ni retenciones.
          </p>
        )}
        {registered && settings.basis === "net" && (
          <p className="wide">
            El importe y los valores hora de esta condición deben estar
            expresados de bolsillo, incluidas las extras. No se vuelven a
            descontar aportes.
          </p>
        )}
      </div>
    </fieldset>
  );
}
