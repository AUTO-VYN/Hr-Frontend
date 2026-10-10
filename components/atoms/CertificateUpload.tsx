"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Award,
  Check,
  ExternalLink,
  Eye,
  FileText,
  Paperclip,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

export type UploadItem = {
  name: string; // Dynamic field key (e.g. "ppimg", "adhar", "pancard", etc.)
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  accept?: string;
};

export type UploadValue = Record<string, File | any | null>;

type CertificatesUploadProps = {
  headerTitle?: string;
  headerIcon?: React.ReactNode;
  value?: UploadValue;
  onChange?: (next: UploadValue) => void;
  disabled?: boolean;
  accept?: string;
  items?: UploadItem[];
  compact?: boolean; // If true, renders horizontal compact tiles like Candidate Registration
  gridClassName?: string;
  className?: string;
  showAttachedCount?: boolean;
};

// ==========================================
// PREVIEW MODAL
// ==========================================
function PreviewModal({
  file,
  title,
  onClose,
}: {
  file: File | any;
  title: string;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string>("");

  const fileName = useMemo(() => {
    if (!file) return "";
    if (typeof file === "string") return file.split("/").pop() || title;
    return file.name || title;
  }, [file, title]);

  const fileType = useMemo(() => {
    if (!file) return "unknown";
    if (typeof file === "string") {
      const lower = file.toLowerCase();
      if (lower.endsWith(".pdf")) return "pdf";
      if (/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(lower)) return "image";
      return "unknown";
    }
    if (
      file.type === "application/pdf" ||
      file.name?.toLowerCase().endsWith(".pdf")
    ) {
      return "pdf";
    }
    if (
      file.type?.startsWith("image/") ||
      /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name || "")
    ) {
      return "image";
    }
    return "unknown";
  }, [file]);

  useEffect(() => {
    if (!file) return;

    if (typeof file === "string") {
      if (
        file.startsWith("http://") ||
        file.startsWith("https://") ||
        file.startsWith("data:") ||
        file.startsWith("blob:")
      ) {
        setUrl(file);
      } else {
        const baseUrl = process.env.NEXT_PUBLIC_URL || "";
        setUrl(file.startsWith("/") ? `${baseUrl}${file}` : `${baseUrl}/${file}`);
      }
      return;
    }

    if (file instanceof Blob || file instanceof File) {
      const objectUrl = URL.createObjectURL(file);
      setUrl(objectUrl);
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }
  }, [file]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleOpenExternal = () => {
    if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#0B1220] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F1A2D]">
          <div className="flex items-center gap-2.5 min-w-0 pr-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 truncate">
                {title}
              </h4>
              <p className="text-[11.5px] text-slate-400 truncate">
                {fileName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {url && (
              <button
                type="button"
                onClick={handleOpenExternal}
                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 text-xs font-medium inline-flex items-center gap-1.5 shadow-2xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Open in new tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Open in new tab</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center shadow-2xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 transition cursor-pointer"
              aria-label="Close preview"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[360px] max-h-[calc(90vh-65px)] bg-slate-100/50 dark:bg-[#07101F]">
          {!url ? (
            <div className="text-slate-400 text-sm">Loading preview...</div>
          ) : fileType === "pdf" ? (
            <iframe
              src={url}
              title={fileName}
              className="w-full h-[70vh] rounded-lg border border-slate-200 dark:border-slate-800 bg-white"
            />
          ) : fileType === "image" ? (
            <img
              src={url}
              alt={fileName}
              className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-sm"
            />
          ) : (
            <div className="text-center py-10 px-4">
              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {fileName}
              </p>
              <p className="text-xs text-slate-400 mb-4">
                Direct inline preview not available for this file type.
              </p>
              <button
                type="button"
                onClick={handleOpenExternal}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open / Download File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPACT UPLOAD TILE
// ==========================================
function CompactUploadTile({
  id,
  name,
  title,
  subtitle,
  icon,
  file,
  disabled,
  accept,
  onPick,
  onRemove,
  onPreview,
}: {
  id: string;
  name?: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  file: File | any | null;
  disabled?: boolean;
  accept: string;
  onPick: (f: File | null) => void;
  onRemove: () => void;
  onPreview: () => void;
}) {
  return (
    <div className="relative group">
      <label
        htmlFor={id}
        className={`p-3 rounded-lg border border-dashed flex items-center gap-2.5 transition ${
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
        } ${
          file
            ? "border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-700"
            : "border-slate-200 dark:border-slate-800 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800"
        }`}
      >
        <input
          id={id}
          name={name}
          type="file"
          accept={accept}
          disabled={disabled}
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />

        <div
          className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${
            file
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
          }`}
        >
          {file ? <Check className="h-4 w-4" /> : icon}
        </div>

        <div className="min-w-0 flex-1 pr-14">
          <div className="text-[12px] font-medium text-slate-800 dark:text-slate-200 truncate">
            {title}
          </div>
          <div
            className={`text-[11px] truncate mt-0.5 ${
              file
                ? "text-emerald-600 dark:text-emerald-400 font-medium"
                : "text-slate-400"
            }`}
          >
            {file ? file.name || "Attached" : subtitle || "Click to attach"}
          </div>
        </div>
      </label>

      {file && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="h-6.5 w-6.5 rounded flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
            aria-label={`Preview ${title}`}
            title="Preview file"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>

          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="h-6.5 w-6.5 rounded flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
              aria-label={`Remove ${title}`}
              title="Remove file"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================
// STANDARD UPLOAD TILE
// ==========================================
function UploadTile({
  id,
  name,
  title,
  subtitle,
  icon,
  file,
  disabled,
  accept,
  onPick,
  onRemove,
  onPreview,
}: {
  id: string;
  name?: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  file: File | any | null;
  disabled?: boolean;
  accept: string;
  onPick: (f: File | null) => void;
  onRemove: () => void;
  onPreview: () => void;
}) {
  return (
    <div className="relative">
      <label
        htmlFor={id}
        className={[
          "group block w-full rounded-xl border border-dashed",
          "border-slate-200 bg-white",
          "px-6 py-8",
          "hover:bg-slate-50 transition-colors",
          "dark:border-slate-800 dark:bg-[#0B1220] dark:hover:bg-[#0F1A2D]",
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
        ].join(" ")}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="h-10 w-10 rounded-full bg-violet-50 text-violet-600 grid place-items-center dark:bg-violet-500/10 dark:text-violet-300">
            {icon}
          </div>

          <div className="mt-4 text-[14px] font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </div>

          <div className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
            {subtitle}
          </div>

          {file ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPreview();
              }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 px-3 py-1.5 text-[12px] text-indigo-700 max-w-[220px] dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 transition cursor-pointer shadow-2xs group/pill"
              title="Click to preview file"
            >
              <Eye size={13} className="text-indigo-600 dark:text-indigo-400 group-hover/pill:scale-110 transition-transform shrink-0" />
              <span className="truncate">{file?.name || "Preview file"}</span>
            </button>
          ) : null}
        </div>

        <input
          id={id}
          name={name}
          type="file"
          accept={accept}
          disabled={disabled}
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </label>

      {file ? (
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPreview();
            }}
            className="inline-grid place-items-center h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition shadow-2xs dark:border-slate-800 dark:bg-[#0B1220] dark:text-slate-300 dark:hover:bg-indigo-950/40 cursor-pointer"
            aria-label={`Preview ${title}`}
            title="Preview file"
          >
            <Eye size={15} />
          </button>

          {!disabled ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }}
              className="inline-grid place-items-center h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-red-500 transition shadow-2xs dark:border-slate-800 dark:bg-[#0B1220] dark:hover:bg-rose-950/40 cursor-pointer"
              aria-label={`Remove ${title}`}
              title="Remove file"
            >
              <Trash2 size={15} />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function CertificatesUpload({
  headerTitle = "CERTIFICATES",
  headerIcon,
  value,
  onChange,
  disabled = false,
  accept = "application/pdf,image/jpeg,image/jpg,image/png",
  items,
  compact = false,
  gridClassName,
  className = "",
  showAttachedCount = true,
}: CertificatesUploadProps) {
  const [local, setLocal] = useState<UploadValue>({});
  const [previewTarget, setPreviewTarget] = useState<{
    file: File | any;
    title: string;
  } | null>(null);

  const files: UploadValue = useMemo(() => {
    return value ?? local;
  }, [value, local]);

  const defaultItems: UploadItem[] = [
    { name: "degree", title: "Degree certificate", subtitle: "Optional · PDF/JPG", icon: <FileText size={18} /> },
    { name: "skill", title: "Skill / technical certificate", subtitle: "Optional · PDF/JPG", icon: <FileText size={18} /> },
    { name: "language", title: "Language proficiency", subtitle: "Optional · PDF/JPG", icon: <FileText size={18} /> },
    { name: "other", title: "Other certificate", subtitle: "Optional · PDF/JPG", icon: <FileText size={18} /> },
  ];

  const tiles = items?.length ? items : defaultItems;

  const attachedCount = useMemo(() => {
    return Object.values(files).filter((f) => Boolean(f)).length;
  }, [files]);

  const update = (name: string, file: File | null) => {
    const next: UploadValue = { ...files, [name]: file };
    setLocal(next);
    onChange?.(next);
  };

  if (compact) {
    return (
      <>
        <div
          className={`rounded-xl border border-slate-200 bg-white p-4.5 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3.5 ${className}`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                {headerIcon ?? <Paperclip className="h-4 w-4" />}
              </div>
              <h3 className="text-sm sm:text-[14.5px] font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                {headerTitle}
              </h3>
            </div>
            {showAttachedCount && (
              <span className="text-[11.5px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                {attachedCount} attached
              </span>
            )}
          </div>

          <div
            className={
              gridClassName || "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5"
            }
          >
            {tiles.map((t) => (
              <CompactUploadTile
                key={t.name}
                id={`upload-${t.name}`}
                name={t.name}
                title={t.title}
                subtitle={t.subtitle ?? "Click to attach"}
                icon={t.icon ?? <FileText className="h-4 w-4" />}
                file={files[t.name] ?? null}
                disabled={disabled}
                accept={t.accept ?? accept}
                onPick={(f) => update(t.name, f)}
                onRemove={() => update(t.name, null)}
                onPreview={() =>
                  setPreviewTarget({ file: files[t.name], title: t.title })
                }
              />
            ))}
          </div>
        </div>

        {previewTarget && (
          <PreviewModal
            file={previewTarget.file}
            title={previewTarget.title}
            onClose={() => setPreviewTarget(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div
        className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden dark:bg-[#0B1220] dark:border-slate-800 ${className}`}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 dark:bg-[#0F1A2D] dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-violet-600 dark:text-violet-400">
              {headerIcon ?? <Award size={18} />}
            </span>
            <div className="text-[14px] font-semibold tracking-[0.12em] text-slate-900 uppercase dark:text-slate-100">
              {headerTitle}
            </div>
          </div>

          {showAttachedCount && (
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
              {attachedCount} attached
            </span>
          )}
        </div>

        <div className="p-5">
          <div
            className={
              gridClassName || "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
            }
          >
            {tiles.map((t) => (
              <UploadTile
                key={t.name}
                id={`upload-${t.name}`}
                name={t.name}
                title={t.title}
                subtitle={t.subtitle ?? "Optional · PDF/JPG"}
                icon={t.icon ?? <FileText size={18} />}
                file={files[t.name] ?? null}
                disabled={disabled}
                accept={t.accept ?? accept}
                onPick={(f) => update(t.name, f)}
                onRemove={() => update(t.name, null)}
                onPreview={() =>
                  setPreviewTarget({ file: files[t.name], title: t.title })
                }
              />
            ))}
          </div>
        </div>
      </div>

      {previewTarget && (
        <PreviewModal
          file={previewTarget.file}
          title={previewTarget.title}
          onClose={() => setPreviewTarget(null)}
        />
      )}
    </>
  );
}