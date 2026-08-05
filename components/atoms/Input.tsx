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
}

const variantStyles: Record<InputVariant, string> = {
  filled:
    "bg-ink/5 border border-transparent focus:border-accent focus:bg-white rounded-xl",
  outline:
    "bg-white border border-ink/15 focus:border-accent rounded-xl",
  underline:
    "bg-transparent border-0 border-b-2 border-ink/15 focus:border-accent rounded-none px-0",
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
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name;
    return (
      <div className={clsx("w-full", containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              "h-11 w-full text-sm text-ink placeholder:text-muted/70 outline-none transition-colors duration-150 px-3",
              icon && "pl-9",
              variantStyles[variant],
              error && "!border-red-500",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-xs font-medium text-red-600">{error}</p>
        )}
      </div>
    );
  }
);
AInput.displayName = "AInput";

export default AInput;
