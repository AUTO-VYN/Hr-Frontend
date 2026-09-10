"use client";

import React from "react";
import clsx from "clsx";

export type InputVariant = "filled" | "outline" | "underline";

export interface AInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  title?: string;
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
    "bg-slate-100 border border-transparent focus:border-[#4338CA] focus:bg-white rounded-xl " +
    "dark:bg-slate-800/80 dark:border-transparent dark:focus:border-indigo-400 dark:focus:bg-slate-800",
  outline:
    "bg-white border border-slate-200 focus:border-[#4338CA] rounded-xl " +
    "dark:bg-[#0B1220] dark:border-slate-800 dark:focus:border-indigo-400",
  underline:
    "bg-transparent border-0 border-b-2 border-slate-200 focus:border-[#4338CA] rounded-none px-0 " +
    "dark:border-slate-700 dark:focus:border-indigo-400",
};

const AInput = React.forwardRef<HTMLInputElement, AInputProps>(
  (
    {
      label,
      title,
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
    const displayLabel = label || title;

    return (
      <div className={clsx("w-full", containerClassName)}>
        {displayLabel && (
          <label
            htmlFor={inputId}
            className="mb-1 block text-[11px] sm:text-[12px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"
          >
            {displayLabel}
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
              "h-11 w-full text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-colors duration-150 px-3",
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