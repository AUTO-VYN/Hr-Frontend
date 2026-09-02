"use client";

import React from "react";
import clsx from "clsx";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "primary"
    | "outline"
    | "outlineBrand"
    | "ghost"
    | "icon"
    | "print"
    | ""
    | undefined;

  // ✅ Added "md" for slightly bigger than default
  size?: "default" | "sm" | "md" | "lg" | "icon" | "iconSm" | undefined;

  shape?: "rounded" | "pill" | undefined;
}

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  // Backward compatible
  default: "bg-brand text-white hover:brightness-105",
  "": "bg-brand text-white hover:brightness-105",
  print: "bg-brand text-white hover:brightness-105",

  // New
  primary: "bg-brand text-white hover:brightness-105",
  outline: "border border-line bg-white text-fg hover:bg-hoverbg",
  outlineBrand: "border border-brand/30 bg-white text-brand hover:bg-brand/5",
  ghost: "bg-transparent text-fg hover:bg-hoverbg",
  icon: "border border-line bg-white text-fg hover:bg-hoverbg",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-9 px-4 text-sm",
  sm: "h-8 px-3 text-sm",

  // ✅ Slightly bigger than default (good for Back / Save employee in header)
  md: "h-10 px-5 text-lg",

  lg: "h-11 px-6 text-base",
  icon: "h-9 w-9 p-0",
  iconSm: "h-8 w-8 p-0",
};

const shapeStyles: Record<NonNullable<ButtonProps["shape"]>, string> = {
  rounded: "rounded-lg",
  pill: "rounded-full",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "default",
      size = "default",
      shape = "pill",
      className,
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={clsx(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          shapeStyles[shape],
          variantStyles[variant ?? "default"],
          sizeStyles[size ?? "default"],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
export default Button;