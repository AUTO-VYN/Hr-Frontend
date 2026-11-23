"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
} from "lucide-react";

import AButton from "@/components/atoms/Button";
import HashloaderComponent from "@/components/Templates/hashloader";
import { StatCard } from "@/components/Templates/card";
import DataTable from "@/components/Templates/reacttable";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import { cn } from "@/lib/utils";

// Re-export atom components for convenience (Eselect is the standard select field)
export { AButton, Einput, Eselect, DataTable, StatCard };

// ----------------------------------------------------------------------
// EXCEL DROPZONE COMPONENT
// ----------------------------------------------------------------------

export interface ExcelDropzoneProps {
  file: File | null | undefined;
  onFileSelect: (file: File | null) => void;
  accept?: string;
  className?: string;
  hint?: string;
  disabled?: boolean;
}

export const ExcelDropzone: React.FC<ExcelDropzoneProps> = ({
  file,
  onFileSelect,
  accept = ".xlsx, .xls, .csv",
  className,
  hint = ".xlsx, .xls or .csv · use the sample file's column order",
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      const ext = droppedFile.name.split(".").pop()?.toLowerCase();
      if (ext === "xlsx" || ext === "xls" || ext === "csv") {
        onFileSelect(droppedFile);
      } else {
        alert("Please select a valid Excel file (.xlsx, .xls, .csv)");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();
      if (ext === "xlsx" || ext === "xls" || ext === "csv") {
        onFileSelect(selectedFile);
      } else {
        alert("Please select a valid Excel file (.xlsx, .xls, .csv)");
      }
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div
      onClick={() => !disabled && fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer",
        isDragOver
          ? "border-indigo-500 bg-indigo-50/60 dark:border-indigo-400 dark:bg-indigo-950/40"
          : "border-slate-200/90 bg-white hover:border-indigo-300 hover:bg-slate-50/60 dark:border-slate-700/80 dark:bg-[#0B1220]/60 dark:hover:border-indigo-500/50 dark:hover:bg-slate-800/40",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {file ? (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 shadow-xs">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-2 max-w-full">
            <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[260px] sm:max-w-[400px]">
              {file.name}
            </span>
            <button
              type="button"
              onClick={clearFile}
              className="p-1 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
              title="Remove file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            {(file.size / 1024).toFixed(1)} KB · Click or drag another file to replace
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 group-hover:scale-105 transition-transform shadow-xs">
            <Upload className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="text-[13px] text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              Drop your Excel file here, or{" "}
            </span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400 underline underline-offset-2">
              browse
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// TEMPLATE PROPS
// ----------------------------------------------------------------------

export interface TemplateSelectField {
  title?: string;
  name: string;
  option: { value: any; label: string }[];
  value?: any;
  handleInputChange?: (name: string, value: any) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export interface ExcelImportTemplateProps {
  title: string;
  subtitle?: string;
  onDownloadSample?: () => void;
  downloadSampleText?: string;
  onBack?: () => void;
  hideBack?: boolean;
  isLoading?: boolean;

  // Main Card Slot (Custom override if passed)
  uploadCard?: React.ReactNode;

  // Standard Built-in Upload Card Props
  file?: File | null;
  onFileSelect?: (file: File | null) => void;
  onImport?: () => void;
  importButtonText?: string;
  isImportDisabled?: boolean;
  selectFields?: TemplateSelectField[];
  filters?: React.ReactNode;
  dropzoneAccept?: string;
  dropzoneHint?: string;

  // Optional Right-side Helper Card (e.g. Deduction codes table)
  helperCard?: React.ReactNode;

  // Dynamic Columns Badge List
  columnsList?: string[];
  columnsCardFooterText?: string;

  // Clickable Cards for Imported vs Updated vs Non-Imported
  showStatusCards?: boolean;
  importedCount?: number;
  updatedCount?: number;
  showUpdatedCard?: boolean;
  nonImportedCount?: number;
  activeStatusTab?: "IMPORTED" | "UPDATED" | "NON_IMPORTED" | string;
  onStatusTabChange?: (tab: "IMPORTED" | "UPDATED" | "NON_IMPORTED") => void;

  // DataTable Props (Direct integration of reacttable.tsx)
  columns?: any[];
  data?: any[];
  tableProps?: Record<string, any>;

  // Custom table slot or children fallback
  table?: React.ReactNode;
  children?: React.ReactNode;
}

// ----------------------------------------------------------------------
// MAIN TEMPLATE COMPONENT
// ----------------------------------------------------------------------

export default function ExcelImportTemplate({
  title,
  subtitle,
  onDownloadSample,
  downloadSampleText = "Download sample",
  onBack,
  hideBack = false,
  isLoading = false,
  uploadCard,
  file,
  onFileSelect,
  onImport,
  importButtonText = "Import",
  isImportDisabled,
  selectFields,
  filters,
  dropzoneAccept,
  dropzoneHint,
  helperCard,
  columnsList,
  columnsCardFooterText = "After import, imported and rejected rows appear here with the reason for each rejection.",
  showStatusCards = false,
  importedCount = 0,
  updatedCount,
  showUpdatedCard = false,
  nonImportedCount = 0,
  activeStatusTab = "IMPORTED",
  onStatusTabChange,
  columns,
  data,
  tableProps,
  table,
  children,
}: ExcelImportTemplateProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#070D18] p-3 sm:p-4 lg:p-6 text-slate-800 dark:text-slate-100">
      <HashloaderComponent isLoading={isLoading} />

      <div className="mx-auto max-w-[1700px] w-full space-y-4">
        {/* ============================================================== */}
        {/* HEADER & ACTION BUTTONS */}
        {/* ============================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            {/* Title & Subtitle */}
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            {onDownloadSample && (
              <AButton
                type="button"
                variant="outline"
                size="md"
                onClick={onDownloadSample}
                className="rounded-lg border-slate-200 bg-white hover:bg-slate-50 text-indigo-700 dark:text-indigo-400 dark:border-slate-700 dark:bg-[#0B1220] dark:hover:bg-slate-800 px-4 text-md font-semibold shadow-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloadSampleText}</span>
              </AButton>
            )}

            {!hideBack && (
              <AButton
                type="button"
                variant="outline"
                size="md"
                onClick={handleBack}
                className="rounded-lg border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:text-slate-300 dark:border-slate-700 dark:bg-[#0B1220] dark:hover:bg-slate-800 px-4 text-md font-semibold shadow-xs flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </AButton>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* UPLOAD & HELPER SECTION */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Upload Card: either custom uploadCard OR built-in standardized card */}
          <div className={cn(helperCard ? "lg:col-span-8" : "lg:col-span-12")}>
            {uploadCard ? (
              uploadCard
            ) : onFileSelect ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] p-4 sm:p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] space-y-4">
                {/* Standard Select Fields using Eselect */}
                {selectFields && selectFields.length > 0 && (
                  <div
                    className={cn(
                      "grid gap-3",
                      selectFields.length === 1
                        ? "grid-cols-1"
                        : selectFields.length === 2
                        ? "grid-cols-1 sm:grid-cols-2"
                        : "grid-cols-1 sm:grid-cols-3"
                    )}
                  >
                    {selectFields.map((field) => (
                      <Eselect
                        key={field.name}
                        title={field.title}
                        name={field.name}
                        option={field.option}
                        initialValue={field.value}
                        handleInputChange={field.handleInputChange || (() => {})}
                        placeholder={field.placeholder || "Select"}
                        disabled={field.disabled || isLoading}
                        required={field.required}
                        redlabel={field.required !== false ? " *" : undefined}
                        labelClassName="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1"
                        className={cn("!h-10 w-full rounded-xl text-[13px]", field.className)}
                      />
                    ))}
                  </div>
                )}

                {/* Optional Custom Filters Slot */}
                {filters && <div>{filters}</div>}

                {/* Built-in Dropzone */}
                <ExcelDropzone
                  file={file}
                  onFileSelect={onFileSelect}
                  accept={dropzoneAccept}
                  hint={dropzoneHint}
                  disabled={isLoading}
                />

                {/* Import Action Footer */}
                {onImport && (
                  <div className="flex items-center justify-between pt-1">
                    <AButton
                      type="button"
                      onClick={onImport}
                      loading={isLoading}
                      disabled={isImportDisabled ?? (!file || isLoading)}
                      className="rounded-lg bg-[#818CF8] hover:bg-[#6366F1] disabled:bg-[#818CF8]/70 disabled:opacity-100 disabled:cursor-not-allowed text-white min-w-[100px] px-6 h-10 text-md font-semibold shadow-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                    >
                      {importButtonText}
                    </AButton>

                    {file && (
                      <span className="text-[12px] text-slate-500 dark:text-slate-400">
                        Selected:{" "}
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {file.name}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Optional Right-hand Helper Card */}
          {helperCard && (
            <div className="lg:col-span-4 min-w-0">
              {helperCard}
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* CLICKABLE STAT CARDS (IMPORTED vs UPDATED vs NON-IMPORTED) */}
        {/* Using StatCard component from components/Templates/card */}
        {/* ============================================================== */}
        {showStatusCards && (() => {
          const hasUpdated = showUpdatedCard || updatedCount !== undefined;
          return (
            <div
              className={cn(
                "grid gap-3.5 pt-1",
                hasUpdated ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"
              )}
            >
              {/* Card 1: Imported Data */}
              <StatCard
                title="Imported Data"
                count={importedCount}
                icon={<CheckCircle2 className="w-5 h-5" />}
                variant="emerald"
                isActive={activeStatusTab === "IMPORTED"}
                onClick={() => onStatusTabChange?.("IMPORTED")}
                subtitle="Successfully processed records"
                uppercase={false}
                className="!h-auto !min-h-[100px] border"
              />

              {/* Card 2: Updated Data (Middle card - shown if enabled/count provided) */}
              {hasUpdated && (
                <StatCard
                  title="Updated Data"
                  count={updatedCount ?? 0}
                  icon={<RefreshCw className="w-5 h-5" />}
                  variant="indigo"
                  isActive={activeStatusTab === "UPDATED"}
                  onClick={() => onStatusTabChange?.("UPDATED")}
                  subtitle="Existing updated records"
                  uppercase={false}
                  className="!h-auto !min-h-[100px] border"
                />
              )}

              {/* Card 3: Non-Imported Data */}
              <StatCard
                title="Non-Imported Data"
                count={nonImportedCount}
                icon={<AlertCircle className="w-5 h-5" />}
                variant="rose"
                isActive={activeStatusTab === "NON_IMPORTED"}
                onClick={() => onStatusTabChange?.("NON_IMPORTED")}
                subtitle="Rejected or failed records"
                uppercase={false}
                className="!h-auto !min-h-[100px] border"
              />
            </div>
          );
        })()}

        {/* ============================================================== */}
        {/* DYNAMIC COLUMNS CARD */}
        {/* ============================================================== */}
        {columnsList && columnsList.length > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] p-4 sm:p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-200">
                Columns in this import
              </h3>
              <span className="text-[12px] font-semibold text-slate-400 dark:text-slate-500">
                ({columnsList.length})
              </span>
            </div>

            {/* Badges list */}
            <div className="flex flex-wrap items-center gap-2 max-h-[108px] overflow-y-auto custom-scrollbar pr-1">
              {columnsList.map((col, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded-full bg-slate-100/80 dark:bg-slate-800 px-3 py-1 text-[12px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                >
                  {col}
                </span>
              ))}
            </div>

            {columnsCardFooterText && (
              <p className="text-[12px] text-slate-400 dark:text-slate-500 pt-1">
                {columnsCardFooterText}
              </p>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* DATA TABLE SECTION (Direct reacttable.tsx Integration) */}
        {/* ============================================================== */}
        {table ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] overflow-hidden shadow-xs">
            {table}
          </div>
        ) : columns && data ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] p-4 sm:p-5 overflow-hidden shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {activeStatusTab === "IMPORTED"
                  ? "Imported Records"
                  : activeStatusTab === "UPDATED"
                  ? "Updated Records"
                  : "Non-Imported Records (With Rejection Reasons)"}
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Showing {data.length} records
              </span>
            </div>

            <DataTable
              columns={columns}
              data={data}
              showTopSearch={true}
              searchPlaceholder="Search in results..."
              showExcelExport={true}
              showColumnFilters={true}
              showPageSizeInFooter={true}
              resetFilters={true}
              initialPageSize={10}
              {...tableProps}
            />
          </div>
        ) : null}

        {/* Any other arbitrary children */}
        {children}
      </div>
    </div>
  );
}
