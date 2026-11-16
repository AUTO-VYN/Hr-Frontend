"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps {
  id?: string;
  name?: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  title?: string;
  description?: string;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  id,
  name,
  checked,
  onChange,
  disabled = false,
  title,
  description,
  className,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  const switchPill = (
    <span
      className={cn(
        "w-[34px] h-[19px] rounded-full shrink-0 relative transition-colors duration-200 inline-block select-none",
        checked ? "bg-[#4F46E5]" : "bg-[#E2E8F0] dark:bg-[#334155]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] w-[15px] h-[15px] rounded-full bg-white shadow-xs transition-all duration-200",
          checked ? "left-[17px]" : "left-[2px]"
        )}
      />
    </span>
  );

  // If title/description is provided, render full clickable card
  if (title || description) {
    return (
      <button
        id={id}
        name={name}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          "w-full flex items-center gap-[12px] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[10px] bg-[#F8FAFC] dark:bg-[#0E1524] p-[12px_14px] cursor-pointer text-left hover:border-[#4F46E5] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]",
          disabled && "opacity-50 cursor-not-allowed hover:border-[#E2E8F0]",
          className
        )}
      >
        <span className="flex-1 min-w-0">
          {title && (
            <span className="block text-[12.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
              {title}
            </span>
          )}
          {description && (
            <span className="block text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-[2px]">
              {description}
            </span>
          )}
        </span>
        {switchPill}
      </button>
    );
  }

  // Standalone toggle pill
  return (
    <button
      id={id}
      name={name}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "inline-flex items-center cursor-pointer p-0 border-none bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] rounded-full",
        disabled && "cursor-not-allowed",
        className
      )}
    >
      {switchPill}
    </button>
  );
};

export default Switch;
