// A single comma or point is a decimal separator. Thousands use 1.234,56 / 1,234.56.
export function parseDecimal(input) {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) throw new Error("Ingresá un número válido.");
    return input;
  }
  const raw = String(input ?? "").trim();
  let normalized = raw;
  if (/^[+-]?\d{1,3}(\.\d{3})+,\d+$/.test(raw))
    normalized = raw.replaceAll(".", "").replace(",", ".");
  else if (/^[+-]?\d{1,3}(,\d{3})+\.\d+$/.test(raw))
    normalized = raw.replaceAll(",", "");
  else if (/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(raw))
    normalized = raw.replace(",", ".");
  else throw new Error("Usá un número como 3500,50 o 3500.50.");
  const result = Number(normalized);
  if (!Number.isFinite(result))
    throw new Error("El número es demasiado grande.");
  return result;
}
export function decimalText(value) {
  return value === "" || value == null
    ? ""
    : new Intl.NumberFormat("es-AR", {
        useGrouping: false,
        maximumFractionDigits: 12,
      }).format(value);
}
