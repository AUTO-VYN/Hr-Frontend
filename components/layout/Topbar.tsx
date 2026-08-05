"use client";

import React, { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { PAYROLL_MODULES } from "@/constant/modules";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser() as any;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const crumbs = useMemo(() => {
    if (!pathname || pathname === "/dashboard") return ["Home"];
    const parts = pathname.split("/").filter(Boolean); // e.g. ["payroll","masters","employee-master-dashboard"]
    if (parts[0] === "payroll") {
      const group = PAYROLL_MODULES.find((g) => g.slug === parts[1]);
      const item = group?.items.find((i) => i.slug === parts[2]);
      return ["Home", group?.name || parts[1], item?.name].filter(Boolean) as string[];
    }
    return ["Home", ...parts];
  }, [pathname]);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const query = q.trim().toLowerCase();
    const out: { label: string; group: string; href: string }[] = [];
    for (const g of PAYROLL_MODULES) {
      for (const item of g.items) {
        if (item.name.toLowerCase().includes(query)) {
          out.push({ label: item.name, group: g.name, href: `/payroll/${g.slug}/${item.slug}` });
        }
      }
    }
    return out.slice(0, 8);
  }, [q]);

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center gap-3 border-b border-line bg-card px-4">
      <div className="hidden min-w-0 flex-1 items-center gap-1.5 text-[12.5px] text-muted sm:flex">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-muted/50">/</span>}
            <span className={i === crumbs.length - 1 ? "font-semibold text-fg" : ""}>
              {c}
            </span>
          </React.Fragment>
        ))}
      </div>

      <div className="relative w-full max-w-md flex-1 sm:flex-none">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-field px-3 py-1.5">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search any module, employee, or action..."
            className="w-full min-w-0 border-none bg-transparent text-[13px] text-fg outline-none placeholder:text-muted"
          />
        </div>
        {open && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-xl border border-line bg-card p-1.5 shadow-card">
            {results.map((r) => (
              <button
                key={r.href}
                onMouseDown={() => router.push(r.href)}
                className="flex w-full flex-col items-start rounded-lg px-2.5 py-2 text-left hover:bg-hoverbg"
              >
                <span className="text-[13px] font-medium text-fg">{r.label}</span>
                <span className="text-[11px] text-muted">{r.group}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-[11px] font-semibold uppercase text-fg">
          {user?.DB}
        </button>
        <ThemeToggle />

        <button className="rounded-lg border border-line bg-card px-2.5 py-1.5 text-[11px] font-semibold uppercase text-fg">
          {user?.EMPCODE}
        </button>
      </div>
    </header>
  );
}
