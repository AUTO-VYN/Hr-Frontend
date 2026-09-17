"use client";

import React from "react";

type Props = {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
};

export default function SectionCard({
  title,
  icon,
  children,
  action,
  className = "",
  bodyClassName = "p-4 sm:p-6",
}: Props) {
  return (
    <div
      className={`bg-white dark:bg-black rounded-2xl border border-[#E6E8EF] dark:border-[#2A2F3A] shadow-xs overflow-hidden ${className}`}
    >
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#F8FAFC] dark:bg-[#0B0F19] border-b border-[#E6E8EF] dark:border-[#2A2F3A]">
        <div className="flex items-center gap-2.5">
          {icon && (
            <span className="text-[#4F46E5] dark:text-indigo-400 shrink-0">
              {icon}
            </span>
          )}
          <h3 className="text-[13px] font-semibold tracking-[0.08em] text-[#0F172A] dark:text-slate-100 uppercase">
            {title}
          </h3>
        </div>
        {action && <div>{action}</div>}
      </div>

      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
