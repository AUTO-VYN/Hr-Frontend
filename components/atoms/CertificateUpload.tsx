"use client";

import React, { useMemo, useState } from "react";
import { Award, FileText, UploadCloud, Trash2 } from "lucide-react";

export type UploadItem = {
  name: string;              // <-- IMPORTANT: yahi aapka dynamic field key hoga (e.g. "Separation1", "AADHAR", etc.)
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  accept?: string;
};

type UploadValue = Record<string, File | null>;

type CertificatesUploadProps = {
  headerTitle?: string;       // e.g. "SEPARATION DOCUMENTS"
  value?: UploadValue;
  onChange?: (next: UploadValue) => void;
  disabled?: boolean;
  accept?: string;            // default accept (used when item.accept not provided)
  items?: UploadItem[];       // <-- pass tiles config from each page
};

function UploadTile({
  id,
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
  value,
  onChange,
  disabled = false,
  accept = "application/pdf,image/jpeg,image/jpg,image/png",
  items,
}: CertificatesUploadProps) {
  // local state fallback (agar parent controlled value na de)
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

  const update = (name: string, file: File | null) => {
    const next: UploadValue = { ...files, [name]: file };
    setLocal(next);
    onChange?.(next);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden dark:bg-[#0B1220] dark:border-slate-800">
      <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 border-b border-slate-200 dark:bg-[#0F1A2D] dark:border-slate-800">
        <span className="text-violet-600 dark:text-violet-400">
          <Award size={18} />
        </span>
        <div className="text-[14px] font-semibold tracking-[0.12em] text-slate-900 uppercase dark:text-slate-100">
          {headerTitle}
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {tiles.map((t) => (
            <UploadTile
              key={t.name}
              id={`upload-${t.name}`}
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