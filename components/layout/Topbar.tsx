"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Menu, ArrowLeft, X } from "lucide-react";
import { PAYROLL_MODULES } from "@/constant/modules";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser() as any;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMobileSearchOpen(false);
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileSearchOpen) {
        setMobileSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileSearchOpen]);

  const toggleMobileSidebar = () => {
    window.dispatchEvent(new CustomEvent("toggle-mobile-sidebar"));
  };

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
    <header className="sticky top-0 z-30 flex h-14 w-full items-center gap-1.5 sm:gap-3 border-b border-line bg-card px-2 sm:px-4">
      {/* Mobile Menu Hamburger Button */}
      <button
        type="button"
        onClick={toggleMobileSidebar}
        className="flex sm:hidden h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-muted hover:bg-hoverbg hover:text-fg shadow-2xs"
        aria-label="Toggle navigation menu"
      >
        <Menu className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
      </button>

      {/* Back Button */}
      <button
        type="button"
        onClick={() => window.history.back()}
        className="flex h-8 items-center gap-1 sm:gap-1.5 rounded-lg border border-line bg-card px-2 sm:px-2.5 text-[11.5px] sm:text-[12px] font-medium text-fg hover:bg-hoverbg shadow-2xs transition shrink-0 cursor-pointer"
        title="Back"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back</span>
      </button>

      {/* Breadcrumbs (Desktop lg+) */}
      <div className="hidden lg:flex min-w-0 flex-1 items-center gap-1.5 text-[12.5px] text-muted overflow-hidden whitespace-nowrap">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-muted/50 shrink-0">/</span>}
            <span className={`truncate ${i === crumbs.length - 1 ? "font-semibold text-fg" : ""}`}>
              {c}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Mobile Search Button */}
      <button
        type="button"
        onClick={() => {
          setMobileSearchOpen(true);
          setOpen(true);
          setTimeout(() => mobileInputRef.current?.focus(), 50);
        }}
        className="flex sm:hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-muted hover:bg-hoverbg hover:text-fg shadow-2xs cursor-pointer ml-auto"
        aria-label="Open search"
        title="Search"
      >
        <Search className="h-4 w-4" />
      </button>

      {/* Desktop Search Bar */}
      <div className="relative hidden sm:block w-56 md:w-72 lg:w-80 ml-auto lg:ml-0">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-field px-3 py-1.5">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            placeholder="Search any module, employee, or action..."
            className="w-full min-w-0 border-none bg-transparent text-[13px] text-fg outline-none placeholder:text-muted"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="text-muted hover:text-fg p-0.5 shrink-0 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
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

      {/* Full-width Mobile Search Overlay */}
      {mobileSearchOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 sm:hidden"
            onClick={() => setMobileSearchOpen(false)}
          />
          <div className="absolute inset-0 z-50 flex items-center gap-2 bg-card px-3 sm:hidden border-b border-line shadow-sm">
            <button
              type="button"
              onClick={() => {
                setMobileSearchOpen(false);
                setQ("");
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-muted hover:bg-hoverbg hover:text-fg shadow-2xs cursor-pointer"
              aria-label="Close search"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="relative flex-1 min-w-0">
              <div className="flex items-center gap-2 rounded-lg border border-line bg-field px-3 py-1.5">
                <Search className="h-4 w-4 shrink-0 text-muted" />
                <input
                  ref={mobileInputRef}
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setOpen(true);
                  }}
                  onFocus={() => setOpen(true)}
                  placeholder="Search any module, employee..."
                  className="w-full min-w-0 border-none bg-transparent text-[13px] text-fg outline-none placeholder:text-muted"
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => {
                      setQ("");
                      mobileInputRef.current?.focus();
                    }}
                    className="text-muted hover:text-fg p-0.5 shrink-0 cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {open && results.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-line bg-card p-1.5 shadow-card">
                  {results.map((r) => (
                    <button
                      key={r.href}
                      onMouseDown={() => {
                        router.push(r.href);
                        setMobileSearchOpen(false);
                        setOpen(false);
                      }}
                      className="flex w-full flex-col items-start rounded-lg px-2.5 py-2 text-left hover:bg-hoverbg cursor-pointer"
                    >
                      <span className="text-[13px] font-medium text-fg">{r.label}</span>
                      <span className="text-[11px] text-muted">{r.group}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Right User Actions */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button className="rounded-lg border border-line bg-card px-2 sm:px-2.5 py-1 sm:py-1.5 text-[10.5px] sm:text-[11px] font-semibold uppercase text-fg shrink-0">
          {user?.DB}
        </button>
        <ThemeToggle />

        <button className="rounded-lg border border-line bg-card px-2 sm:px-2.5 py-1 sm:py-1.5 text-[10.5px] sm:text-[11px] font-semibold uppercase text-fg shrink-0 whitespace-nowrap">
          {user?.EMPCODE}
        </button>
      </div>
    </header>
  );
}
