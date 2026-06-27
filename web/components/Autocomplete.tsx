"use client";

import { useMemo, useRef, useState } from "react";

export type Option = { value: number; label: string };

/**
 * Champ de saisie avec autocomplétion (port de api/react/autocomplete.jsx).
 * Filtrage côté client sur le libellé. Réutilisé pour la sélection de club,
 * et plus tard pour les grimpeurs côté coach (doc 04, doc 08 §6).
 */
export default function Autocomplete({
  options,
  value,
  onChange,
  placeholder,
  id,
  required,
}: {
  options: Option[];
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? "",
    [options, value],
  );

  const text = open ? query : selectedLabel;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? options.filter((o) => o.label.toLowerCase().includes(q))
      : options;
    return list.slice(0, 50);
  }, [options, query]);

  return (
    <div className="position-relative">
      <input
        id={id}
        type="text"
        className="form-control"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        required={required && value === null}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value !== null) onChange(null);
        }}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && filtered.length > 0 && (
        <ul
          className="list-group position-absolute w-100 shadow-sm"
          style={{ zIndex: 1000, maxHeight: 240, overflowY: "auto" }}
        >
          {filtered.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                className="list-group-item list-group-item-action"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                  onChange(o.value);
                  setQuery("");
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
