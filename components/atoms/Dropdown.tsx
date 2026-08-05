"use client";

import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronDown, Search } from "lucide-react";

export interface DropdownOption {
  label: string;
  value: string | number;
}

export type DropdownVariant = "filled" | "outline" | "underline";

export interface ADropdownProps {
  label?: string;
  name: string;
  options: DropdownOption[];
  value?: string | number;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  variant?: DropdownVariant;
  error?: string;
  className?: string;
  onChange: (name: string, value: string | number) => void;
}

const variantStyles: Record<DropdownVariant, string> = {
  filled: "bg-ink/5 border border-transparent rounded-xl",
  outline: "bg-white border border-ink/15 rounded-xl",
  underline: "bg-transparent border-0 border-b-2 border-ink/15 rounded-none px-0",
};

const ADropdown: React.FC<ADropdownProps> = ({
  label,
  name,
  options,
  value,
  placeholder = "Select...",
  searchable = true,
  disabled = false,
  variant = "outline",
  error,
  className,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => String(o.value) === String(value));

  const filtered = query
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className={clsx("w-full", className)} ref={ref}>
      {label && (
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={clsx(
            "flex h-11 w-full items-center justify-between px-3 text-left text-sm transition-colors duration-150 disabled:opacity-50",
            variantStyles[variant],
            open && "border-accent",
            error && "!border-red-500"
          )}
        >
          <span className={clsx(!selected && "text-muted/70")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            className={clsx(
              "h-4 w-4 text-muted transition-transform duration-150",
              open && "rotate-180"
            )}
          />
        </button>

        {open && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-line bg-white shadow-card">
            {searchable && (
              <div className="flex items-center gap-2 border-b border-line px-3 py-2">
                <Search className="h-4 w-4 text-muted" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full text-sm outline-none"
                />
              </div>
            )}
            <div className="max-h-56 overflow-y-auto">
              {filtered.length === 0 && (
                <div className="px-3 py-3 text-sm text-muted">No options found</div>
              )}
              {filtered.map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(name, opt.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={clsx(
                    "cursor-pointer px-3 py-2 text-sm hover:bg-accent-light",
                    String(opt.value) === String(value) &&
                      "bg-accent-light font-semibold text-accent-dark"
                  )}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
};

export default ADropdown;
