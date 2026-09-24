"use client";

import React, { useMemo, useState } from "react";
import { Award, Check, FileText, Paperclip, Trash2, UploadCloud } from "lucide-react";

export type UploadItem = {
  name: string; // Dynamic field key (e.g. "ppimg", "adhar", "pancard", etc.)
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  accept?: string;
};

type UploadValue = Record<string, File | null>;

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
}: {
  id: string;
  name?: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  file: File | null;
  disabled?: boolean;
  accept: string;
  onPick: (f: File | null) => void;
  onRemove: () => void;
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

        <div className="min-w-0 flex-1 pr-6">
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

      {file && !disabled && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
          aria-label={`Remove ${title}`}
          title="Remove"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

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
}: {
  id: string;
  name?: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  file: File | null;
  disabled?: boolean;
  accept: string;
  onPick: (f: File | null) => void;
  onRemove: () => void;
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

          {file?.name ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] text-slate-700 max-w-[220px] dark:border-slate-800 dark:bg-[#0B1220] dark:text-slate-200">
              <UploadCloud size={14} className="text-slate-500 dark:text-slate-400" />
              <span className="truncate">{file.name}</span>
            </div>
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

      {file && !disabled ? (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-3 right-3 inline-grid place-items-center h-9 w-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-[#0B1220] dark:hover:bg-[#0F1A2D]"
          aria-label={`Remove ${title}`}
          title="Remove"
        >
          <Trash2 size={16} className="text-red-500" />
        </button>
      ) : null}
    </div>
  );
}

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
            />
          ))}
        </div>
      </div>
    );
  }

  return (
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
            />
          ))}
        </div>
      </div>
    </div>
  );
}