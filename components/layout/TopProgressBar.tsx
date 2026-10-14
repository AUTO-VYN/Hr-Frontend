"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

export default function TopProgressBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);
  const [isFastCompleting, setIsFastCompleting] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isNavigatingRef = useRef(false);
  const targetUrlRef = useRef<string | null>(null);
  const prevPathnameRef = useRef(pathname);

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
    timerRef.current = null;
    safetyTimeoutRef.current = null;
  };

  // 1. Slow Phase: Jab tak target URL nahi aayi hai (module load ho raha hai), slow chalegi aur 85% par freeze ho jaayegi
  const startSlow = useCallback((targetUrl?: string) => {
    clearTimers();
    if (targetUrl) {
      targetUrlRef.current = targetUrl;
    }
    setFading(false);
    setIsFastCompleting(false);
    setVisible(true);
    setProgress(10);
    isNavigatingRef.current = true;

    // Steady, slow progression: advances smoothly towards 85% and freezes there until URL arrives
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 85) {
          // 85% par pahunch kar freeze ho jaao, URL aane tak auto-complete bilkul mat karo!
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 85;
        }
        const remaining = 85 - prev;
        const step = Math.max(0.12, remaining * 0.025);
        return Math.min(85, prev + step);
      });
    }, 150);
  }, []);

  // 2. Fast Phase: Jaise hi URL aa gayi (module open ho gaya), fast 100% karke complete kar do
  const completeFast = useCallback(() => {
    if (!isNavigatingRef.current) return;
    clearTimers();
    isNavigatingRef.current = false;
    targetUrlRef.current = null;

    setIsFastCompleting(true);
    setProgress(100);

    setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
        setFading(false);
        setIsFastCompleting(false);
      }, 250);
    }, 160);
  }, []);

  // SIRF tabhi trigger hoga jab pathname SACH ME CHANGE ho (URL aa chuki hai)
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      if (isNavigatingRef.current) {
        completeFast();
      }
    }
  }, [pathname, completeFast]);

  // Click & Navigation listener
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // 1. Navigation link clicked (Sidebar module, Breadcrumb, Header link)
      const anchor = target.closest("a");
      if (anchor && anchor.href) {
        const targetAttr = anchor.getAttribute("target");
        if (targetAttr && targetAttr !== "_self") return;
        if (anchor.hasAttribute("download")) return;

        try {
          const url = new URL(anchor.href, window.location.href);
          if (url.origin === window.location.origin) {
            const currentPath = window.location.pathname + window.location.search;
            const nextPath = url.pathname + url.search;

            // Agar user kisi dusre module/URL par ja raha hai:
            if (nextPath !== currentPath) {
              startSlow(nextPath);
              return;
            }
          }
        } catch {
          // ignore invalid URLs
        }
      }

      // 2. In-page tab button clicked (e.g. within candidate details or sub-tabs)
      const tabButton = target.closest(
        'button[role="tab"], button[data-tab], button[data-tab-number], .tab-button, [data-nav-item]'
      );
      if (tabButton) {
        startSlow();
        setTimeout(() => {
          completeFast();
        }, 500);
        return;
      }
    };

    const handlePopState = () => {
      if (window.location.pathname !== prevPathnameRef.current) {
        startSlow(window.location.pathname);
      }
    };

    const handleCustomStart = () => startSlow();
    const handleCustomDone = () => completeFast();

    // Intercept programmatic router.push
    const originalPushState = window.history.pushState;
    window.history.pushState = function (...args) {
      try {
        const nextUrl = args[2];
        if (nextUrl) {
          const parsed = new URL(String(nextUrl), window.location.href);
          const currentPath = window.location.pathname + window.location.search;
          const nextPath = parsed.pathname + parsed.search;
          if (nextPath !== currentPath && !isNavigatingRef.current) {
            startSlow(nextPath);
          }
        }
      } catch {
        // ignore
      }
      return originalPushState.apply(this, args);
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("navigation-progress-start", handleCustomStart);
    window.addEventListener("navigation-progress-done", handleCustomDone);

    return () => {
      window.history.pushState = originalPushState;
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("navigation-progress-start", handleCustomStart);
      window.removeEventListener("navigation-progress-done", handleCustomDone);
      clearTimers();
    };
  }, [startSlow, completeFast]);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-0 left-0 right-0 z-50 h-[2.5px] sm:h-[3px] overflow-hidden bg-transparent"
      style={{
        opacity: fading ? 0 : 1,
        transition: fading ? "opacity 250ms ease-out" : "opacity 120ms ease-in",
      }}
    >
      <div
        className="relative h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-500 shadow-[0_0_10px_rgba(99,102,241,0.7)] dark:shadow-[0_0_12px_rgba(139,132,255,0.8)]"
        style={{
          width: `${progress}%`,
          transition: isFastCompleting
            ? "width 150ms ease-out"
            : "width 220ms cubic-bezier(0.1, 0.5, 0.1, 1)",
        }}
      >
        {/* Shimmer glow at the leading front edge */}
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-white/30 to-white/60 blur-[1px]" />
      </div>
    </div>
  );
}
