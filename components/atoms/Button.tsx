"use client";

import React from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary"     // solid accent — main call to action
  | "secondary"   // solid ink — secondary action
  | "outline"     // bordered, transparent fill
  | "ghost"       // no border/fill until hover
  | "subtle"      // soft accent-tinted background
  | "link"        // text-only, underline on hover
  | "danger";     // destructive actions

export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface AButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const base =
  "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 " +
  "disabled:opacity-50 disabled:cursor-not-allowed select-none focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white shadow-card hover:bg-accent-dark active:scale-[0.98] rounded-xl",
  secondary:
    "bg-ink text-white hover:bg-slateink active:scale-[0.98] rounded-xl",
  outline:
    "bg-transparent border border-ink/15 text-ink hover:border-accent hover:text-accent rounded-xl",
  ghost:
    "bg-transparent text-ink hover:bg-ink/5 rounded-xl",
  subtle:
    "bg-accent-light text-accent-dark hover:bg-accent hover:text-white rounded-xl",
  link:
    "bg-transparent text-accent underline-offset-4 hover:underline p-0 h-auto rounded-none",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:scale-[0.98] rounded-xl",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "text-sm px-3 py-1.5 h-8",
  md: "text-sm px-4 py-2 h-10",
  lg: "text-base px-6 py-3 h-12",
  icon: "h-10 w-10 p-0",
};

const AButton = React.forwardRef<HTMLButtonElement, AButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      loadingText,
      fullWidth = false,
      icon,
      iconPosition = "left",
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={clsx(
          base,
          variantStyles[variant],
          variant !== "link" && sizeStyles[size],
          fullWidth && "w-full",
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText ?? children}
          </>
        ) : (
          <>
            {icon && iconPosition === "left" && icon}
            {children}
            {icon && iconPosition === "right" && icon}
          </>
        )}
      </button>
    );
  }
);
AButton.displayName = "AButton";

export default AButton;
