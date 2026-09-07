"use client";

import React from "react";
import clsx from "clsx";

export type InputVariant = "filled" | "outline" | "underline";

export interface AInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  variant?: InputVariant;
  icon?: React.ReactNode;
  containerClassName?: string;

  // ✅ add this
  handleInputChange?: (
    e: React.ChangeEvent<HTMLInputElement>,
    value: string,
  ) => void;
}

const variantStyles: Record<InputVariant, string> = {
  filled:
    "bg-ink/5 border border-transparent focus:border-accent focus:bg-white rounded-xl " +
    "dark:bg-white/5 dark:border-transparent dark:focus:border-accent dark:focus:bg-white/10",
  outline:
    "bg-white border border-ink/15 focus:border-accent rounded-xl " +
    "dark:bg-black dark:border-slate-800 dark:focus:border-accent",
  underline:
    "bg-transparent border-0 border-b-2 border-ink/15 focus:border-accent rounded-none px-0 " +
    "dark:border-slate-700 dark:focus:border-accent",
};

const AInput = React.forwardRef<HTMLInputElement, AInputProps>(
  (
    {
      label,
      error,
      variant = "outline",
      icon,
      className,
      containerClassName,
      id,
      handleInputChange, // ✅ destructure so it won't go to DOM
      onChange, // ✅ keep original onChange too
      ...props
    },
    ref,
  ) => {
    const inputId = id || props.name;

    return (
      <div className={clsx("w-full", containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted dark:text-slate-300"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted dark:text-slate-400">
              {icon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={clsx(
              "h-11 w-full text-sm text-ink placeholder:text-muted/70 outline-none transition-colors duration-150 px-3",
              "dark:text-slate-100 dark:placeholder:text-slate-400/70",
              icon && "pl-9",
              variantStyles[variant],
              error && "!border-red-500",
              className,
            )}
            {...props}
            onChange={(e) => {
              onChange?.(e);
              handleInputChange?.(e, e.target.value);
            }}
          />
        </div>

        {error && (
          <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  },
);

AInput.displayName = "AInput";
export default AInput;