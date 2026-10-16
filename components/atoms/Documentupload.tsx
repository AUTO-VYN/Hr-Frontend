"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import {
  Paperclip,
  X,
  FileText,
  Eye,
  Trash2,
  Check,
  ExternalLink,
} from "lucide-react";

export type DocumentFileUploadProps = {
  file: File | string | null;
  onChange: (file: File | null) => void;
  title?: string;
  accept?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  height?: number | string;
  required?: boolean;
  variant?: "bar" | "card";
  icon?: React.ReactNode;
  subtitle?: string;
  onPreview?: () => void;
  onRemove?: () => void;
};

export default function DocumentFileUpload({
  file,
  onChange,
  title,
  accept = ".pdf,.png,.jpg,.jpeg,.webp",
  placeholder = "Choose PDF or image",
  disabled = false,
  className = "",
  height = 34,
  required = false,
  variant = "bar",
  icon,
  subtitle,
  onPreview,
  onRemove,
}: DocumentFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalPreviewOpen, setInternalPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const fileName = useMemo(() => {
    if (!file) return "";
    if (file instanceof File) return file.name;
    if (typeof file === "string") {
      return file.split("/").pop() || title || "Document";
    }
    return "";
  }, [file, title]);

  const isPdf = useMemo(() => {
    if (!file) return false;
    if (file instanceof File) {
      return (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      );
    }
    if (typeof file === "string") {
      return file.toLowerCase().endsWith(".pdf");
    }
    return false;
  }, [file]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    if (file instanceof File) {
      const objUrl = URL.createObjectURL(file);
      setPreviewUrl(objUrl);
      return () => {
        URL.revokeObjectURL(objUrl);
      };
    }
    if (typeof file === "string") {
      if (
        file.startsWith("http://") ||
        file.startsWith("https://") ||
        file.startsWith("blob:") ||
        file.startsWith("data:")
      ) {
        setPreviewUrl(file);
      } else {
        const baseUrl = process.env.NEXT_PUBLIC_URL || "";
        setPreviewUrl(
          file.startsWith("/") ? `${baseUrl}${file}` : `${baseUrl}/${file}`
        );
      }
    }
  }, [file]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      onChange(selectedFile);
    }
  };

  const handleRemove = (event: React.MouseEvent) => {
    event.stopPropagation();
    onChange(null);
    onRemove?.();
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPreview) {
      onPreview();
    } else {
      setInternalPreviewOpen(true);
    }
  };

  // ---------------- CARD VARIANT ----------------
  if (variant === "card") {
    const hasFile = Boolean(file);

    return (
      <div className={`min-w-0 w-full ${className}`}>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={handleFileChange}
          className="hidden"
        />

        <div
          onClick={() => {
            if (!disabled) inputRef.current?.click();
          }}
          className={`group relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-[10px] border border-dashed p-4 text-center transition ${
            hasFile
              ? "border-emerald-300 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/20"
              : "border-slate-200 bg-white hover:border-[#4F46E5] hover:bg-indigo-50/20 dark:border-slate-800 dark:bg-[#0E1524] dark:hover:border-indigo-400"
          } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        >
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
              hasFile
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 group-hover:text-indigo-600"
            }`}
          >
            {hasFile ? (
              <Check className="h-4 w-4" />
            ) : (
              icon || <Paperclip className="h-4 w-4" />
            )}
          </span>

          <span className="mt-2 text-[12.5px] font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
            {title || placeholder}
          </span>

          <span className="mt-0.5 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
            {hasFile
              ? "Attached · Click to change"
              : subtitle || "Click to upload"}
          </span>

          {hasFile && (
            <div
              className="absolute right-2 top-2 flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={handlePreviewClick}
                className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-white hover:text-indigo-600 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Preview"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              {!disabled && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-white hover:text-rose-600 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Internal Preview Modal */}
        {internalPreviewOpen && previewUrl && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
            onClick={() => setInternalPreviewOpen(false)}
          >
            <div
              className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#111827] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
                <h3 className="font-semibold text-[14px] text-slate-800 dark:text-slate-200">
                  {title || fileName}
                </h3>
                <div className="flex items-center gap-2">
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setInternalPreviewOpen(false)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-1 items-center justify-center overflow-auto p-4 bg-slate-50 dark:bg-[#07101F] min-h-[400px]">
                {isPdf ? (
                  <iframe
                    src={previewUrl}
                    title={title || fileName}
                    className="h-[70vh] w-full rounded-lg border border-slate-200 bg-white"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt={title || fileName}
                    className="max-h-[72vh] max-w-full rounded-lg object-contain shadow-sm"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------- BAR VARIANT (DEFAULT) ----------------
  return (
    <div className={`min-w-0 w-full ${className}`}>
      {title && (
        <label className="mb-[5px] block text-[10px] font-[600] uppercase tracking-[0.02em] text-slate-500 dark:text-slate-400">
          {title} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        style={{
          height: typeof height === "number" ? `${height}px` : height,
        }}
        className={`flex w-full items-center gap-2 rounded-[9px] border border-dashed border-slate-300 bg-white px-[13px] text-[12px] transition dark:border-slate-700 dark:bg-[#111827] ${
          disabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-900"
        }`}
      >
        {file ? (
          <FileText size={17} className="shrink-0 text-rose-500" />
        ) : (
          <Paperclip
            size={17}
            className="shrink-0 text-slate-500 dark:text-slate-400"
          />
        )}

        <span
          className={`min-w-0 flex-1 truncate font-[500] ${
            file
              ? "text-slate-800 dark:text-slate-100"
              : "text-slate-600 dark:text-slate-300"
          }`}
          title={fileName || placeholder}
        >
          {fileName || placeholder}
        </span>

        {file && (
          <button
            type="button"
            title="Preview file"
            onClick={handlePreviewClick}
            className="shrink-0 rounded p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/30 transition cursor-pointer"
          >
            <Eye size={15} />
          </button>
        )}

        {file && !disabled && (
          <button
            type="button"
            title="Remove selected file"
            onClick={handleRemove}
            className="shrink-0 rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30 transition cursor-pointer"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Internal Preview Modal */}
      {internalPreviewOpen && previewUrl && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setInternalPreviewOpen(false)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#111827] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
              <h3 className="font-semibold text-[14px] text-slate-800 dark:text-slate-200">
                {title || fileName}
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setInternalPreviewOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-center overflow-auto p-4 bg-slate-50 dark:bg-[#07101F] min-h-[400px]">
              {isPdf ? (
                <iframe
                  src={previewUrl}
                  title={title || fileName}
                  className="h-[70vh] w-full rounded-lg border border-slate-200 bg-white"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt={title || fileName}
                  className="max-h-[72vh] max-w-full rounded-lg object-contain shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
