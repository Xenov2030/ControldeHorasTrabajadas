"use client";
import { useEffect, useRef, useState } from "react";
import { decimalText, parseDecimal } from "../lib/decimal.mjs";

export default function DecimalInput({
  value,
  defaultValue = "",
  onValueChange,
  min,
  max,
  required = false,
  ...props
}) {
  const input = useRef(null),
    [raw, setRaw] = useState(() => decimalText(value ?? defaultValue));
  function check(text, node) {
    let message = "",
      number;
    if (text.trim() !== "") {
      try {
        number = parseDecimal(text);
        if (min != null && number < Number(min))
          message = `El valor mínimo es ${decimalText(min)}.`;
        if (max != null && number > Number(max))
          message = `El valor máximo es ${decimalText(max)}.`;
      } catch (err) {
        message = err.message;
      }
    }
    node?.setCustomValidity(message);
    return { number, message };
  }
  useEffect(() => {
    if (value !== undefined && document.activeElement !== input.current) {
      const text = decimalText(value);
      setRaw(text);
      check(text, input.current);
    }
  }, [value, min, max]);
  useEffect(() => {
    const form = input.current?.form;
    if (!form) return;
    const reset = () => {
      const text = decimalText(value ?? defaultValue);
      setRaw(text);
      input.current?.setCustomValidity("");
    };
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [value, defaultValue]);
  return (
    <input
      {...props}
      ref={input}
      type="text"
      inputMode="decimal"
      required={required}
      value={raw}
      onChange={(e) => {
        const text = e.target.value;
        setRaw(text);
        const result = check(text, e.target);
        if (result.number !== undefined && !result.message)
          onValueChange?.(result.number);
      }}
      onBlur={(e) => {
        const result = check(raw, e.target);
        if (result.number !== undefined && !result.message)
          setRaw(decimalText(result.number));
      }}
    />
  );
}
