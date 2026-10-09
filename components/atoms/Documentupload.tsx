"use client";

import React, { useRef } from "react";
import { Paperclip, X, FileText } from "lucide-react";

type DocumentFileUploadProps = {
  file: File | null;
  onChange: (file: File | null) => void;
  title?: string;
  accept?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  height?: number | string;
};

export default function DocumentFileUpload({
  file,
  onChange,
  title = "DOCUMENT FILE",
  accept = ".pdf,.png,.jpg,.jpeg,.webp",
  placeholder = "Choose PDF or image",
  disabled = false,
  className = "",
  height = 34,
}: DocumentFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      onChange(selectedFile);
    }
  };

  const handleRemove = (event: React.MouseEvent) => {
    event.stopPropagation();

    onChange(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className={`min-w-0 w-full ${className}`}>
      <label className="mb-[5px] block text-[10px] font-[600] uppercase tracking-[0.02em] text-slate-500 dark:text-slate-400">
        {title} <span className="text-rose-500">*</span>
      </label>

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
        className={`
    flex w-full items-center gap-2
    rounded-[9px] border border-dashed
    border-slate-300 bg-white px-[13px]
    text-[12px] transition
    dark:border-slate-700 dark:bg-[#111827]
    ${
      disabled
        ? "cursor-not-allowed opacity-60"
        : "cursor-pointer hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-900"
    }
  `}
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
          title={file?.name || placeholder}
        >
          {file?.name || placeholder}
        </span>

        {file && !disabled && (
          <button
            type="button"
            title="Remove selected file"
            onClick={handleRemove}
            className="shrink-0 rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30"
          >
            <X size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
