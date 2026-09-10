"use client";

import React from "react";
import { cn } from "@/lib/utils";
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
  "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[#4338CA] text-white shadow-sm hover:bg-[#3730a3] active:scale-[0.98] rounded-xl dark:bg-[#4338CA] dark:hover:bg-[#4f46e5]",
  secondary:
    "bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98] rounded-xl dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200",
  outline:
    "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 rounded-xl dark:bg-[#0B1220] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white",
  ghost:
    "bg-transparent text-slate-700 hover:bg-slate-100 rounded-xl dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
  subtle:
    "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/80",
  link:
    "bg-transparent text-[#4338CA] underline-offset-4 hover:underline p-0 h-auto rounded-none dark:text-indigo-400",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:scale-[0.98] rounded-xl dark:bg-red-600 dark:hover:bg-red-500",
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
        className={cn(
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
