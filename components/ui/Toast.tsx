"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  AlertCircle,
  Info,
  XCircle,
  X,
} from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastProps {
  show: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
  position?:
    | "top-right"
    | "top-left"
    | "top-center"
    | "bottom-right"
    | "bottom-left"
    | "bottom-center";
}

const toastConfig = {
  success: {
    icon: CheckCircle2,
    borderColor: "border-green-500",
    iconColor: "text-green-500",
    bgColor: "bg-white",
  },
  error: {
    icon: XCircle,
    borderColor: "border-red-500",
    iconColor: "text-red-500",
    bgColor: "bg-white",
  },
  info: {
    icon: Info,
    borderColor: "border-blue-500",
    iconColor: "text-blue-500",
    bgColor: "bg-white",
  },
  warning: {
    icon: AlertCircle,
    borderColor: "border-orange-500",
    iconColor: "text-orange-500",
    bgColor: "bg-white",
  },
};

const positionClasses = {
  "top-right": "top-6 right-6",
  "top-left": "top-6 left-6",
  "top-center": "top-6 left-1/2 -translate-x-1/2",
  "bottom-right": "bottom-6 right-6",
  "bottom-left": "bottom-6 left-6",
  "bottom-center": "bottom-6 left-1/2 -translate-x-1/2",
};

export default function Toast({
  show,
  message,
  type = "info",
  duration = 3000,
  onClose,
  position = "top-right",
}: ToastProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!mounted || !show) return null;

  const config = toastConfig[type];
  const Icon = config.icon;

  const toastContent = (
    <div
      className={`fixed ${positionClasses[position]} z-[100000] animate-toast-slide-in`}
    >
      <div
        className={`flex items-center gap-3 ${config.bgColor} border-l-4 ${config.borderColor} shadow-2xl rounded-lg px-4 py-3 min-w-[300px] max-w-[400px]`}
      >
        <div className="flex-shrink-0">
          <Icon className={`h-6 w-6 ${config.iconColor}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 rounded-full p-1 hover:bg-gray-100 transition"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      <style jsx global>{`
        @keyframes toastSlideIn {
          from {
            transform: translateX(120%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-toast-slide-in {
          animation: toastSlideIn 0.35s ease-out forwards;
        }
      `}</style>
    </div>
  );

  return createPortal(toastContent, document.body);
}
