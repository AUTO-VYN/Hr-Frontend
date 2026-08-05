"use client";

import React, { useState } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { X, ArrowRight } from "lucide-react";
import { PAYROLL_MODULES, ModuleGroup } from "@/constant/modules";

function GroupIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as any)[name] || Icons.Folder;
  return <Cmp className={className} />;
}

export default function DashboardPage() {
  const [active, setActive] = useState<ModuleGroup | null>(null);
  const totalScreens = PAYROLL_MODULES.reduce((n, g) => n + g.items.length, 0);

  return (
    <div>
      <div className="mb-5">Dashboard</div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-bold text-fg">Modules</h1>
          <p className="text-sm text-muted">
            {PAYROLL_MODULES.length} modules &middot; {totalScreens}+ screens. Open a card for the full list.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PAYROLL_MODULES.map((group) => (
          <div
            key={group.slug}
            className="flex flex-col rounded-2xl border border-line bg-card p-4 shadow-card"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand">
                  <GroupIcon name={group.icon} className="h-4 w-4" />
                </span>
                <span className="text-[13px] font-bold uppercase tracking-wide text-fg">
                  {group.name}
                </span>
              </div>
              <span className="text-xs font-medium text-muted">{group.items.length}</span>
            </div>

            <div className="mb-3 flex flex-col gap-1">
              {group.items.slice(0, 4).map((item) => (
                <Link
                  key={item.slug}
                  href={`/payroll/${group.slug}/${item.slug}`}
                  className="truncate fluid-text-sm  text-muted hover:bg-hoverbg py-1 px-1 rounded-sm"
                >
                  {item.name}
                </Link>
              ))}
            </div>

            <button
              onClick={() => setActive(group)}
              className="mt-auto flex items-center justify-center gap-1.5 rounded-lg border border-line py-1.5 fluid-text-sm  font-semibold text-brand hover:bg-hoverbg"
            >
              View all {group.items.length} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* right-side flyout listing every screen in the selected module */}
      {active && (
        <>
          <div
            onClick={() => setActive(null)}
            className="fixed inset-0 z-40 bg-black/40"
          />
          <div className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-sm flex-col border-l border-line bg-card p-5 shadow-card">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand">
                  <GroupIcon name={active.icon} className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-[13px] font-bold uppercase tracking-wide text-fg">
                    {active.name}
                  </div>
                  <div className="text-xs text-muted">{active.items.length} screens</div>
                </div>
              </div>
              <button
                onClick={() => setActive(null)}
                className="rounded-lg p-1 text-muted hover:bg-hoverbg hover:text-fg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {active.items.map((item) => (
                <Link
                  key={item.slug}
                  href={`/payroll/${active.slug}/${item.slug}`}
                  onClick={() => setActive(null)}
                  className="flex items-center justify-between rounded-lg px-2.5 py-2 text-[13px] text-fg hover:bg-hoverbg"
                >
                  {item.name}
                  <ArrowRight className="h-3.5 w-3.5 text-muted" />
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
