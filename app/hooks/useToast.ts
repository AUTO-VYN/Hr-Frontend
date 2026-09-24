"use client";

import { useState, useCallback } from "react";
import type { ToastType } from "@/components/ui/Toast";

export interface ToastState {
  show: boolean;
  message: string;
  type: ToastType;
}

export interface ToastOptions {
  title?: string;
  description?: string;
  message?: string;
  variant?: "default" | "destructive" | "success" | "warning" | "info";
  type?: ToastType;
}

export type ToastCallable = {
  (options: ToastOptions | string, type?: ToastType): void;
  show: boolean;
  message: string;
  type: ToastType;
};

export function useToast() {
  const [toastState, setToastState] = useState<ToastState>({
    show: false,
    message: "",
    type: "info",
  });

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      setToastState({ show: true, message, type });
    },
    []
  );

  const hideToast = useCallback(() => {
    setToastState((prev) => ({ ...prev, show: false }));
  }, []);

  const toast = useCallback(
    (options: ToastOptions | string, customType?: ToastType) => {
      let msg = "";
      let t: ToastType = customType || "info";

      if (typeof options === "string") {
        msg = options;
      } else if (options && typeof options === "object") {
        msg = options.title || options.description || options.message || "";
        if (options.variant === "destructive") {
          t = "error";
        } else if (options.variant === "default" || options.variant === "success") {
          t = "success";
        } else if (options.type) {
          t = options.type;
        }
      }

      showToast(msg, t);
    },
    [showToast]
  );

  // Attach state properties so components using `toast.show` (like ReleaseNotesDialog) continue to work
  const toastWithState = Object.assign(toast, toastState) as ToastCallable;

  return {
    toast: toastWithState,
    showToast,
    hideToast,
    // Shortcut methods
    success: (msg: string) => showToast(msg, "success"),
    error: (msg: string) => showToast(msg, "error"),
    info: (msg: string) => showToast(msg, "info"),
    warning: (msg: string) => showToast(msg, "warning"),
  };
}
