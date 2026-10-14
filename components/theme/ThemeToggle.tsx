"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORE = "hrsetu.theme";

export function useTheme() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      try {
        window.localStorage.setItem(STORE, next ? "dark" : "light");
      } catch (e) {}
      return next;
    });
  };

  return { dark, toggle };
}

export default function ThemeToggle({ className }: { className?: string }) {
  const { dark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={`Switch to ${dark ? "Light" : "Dark"} mode`}
      className={
        "flex h-7.5 sm:h-auto items-center justify-center gap-1 sm:gap-1.5 rounded-lg border border-line bg-card px-1.5 min-[360px]:px-2 sm:px-2.5 py-1 sm:py-1.5 text-[10px] sm:text-[11.5px] font-medium text-fg hover:bg-hoverbg shrink-0 cursor-pointer " +
        (className || "")
      }
    >
      {dark ? <Sun className="h-3.5 w-3.5 shrink-0" /> : <Moon className="h-3.5 w-3.5 shrink-0" />}
      <span className="hidden min-[400px]:inline">{dark ? "Light" : "Dark"}</span>
    </button>
  );
}
