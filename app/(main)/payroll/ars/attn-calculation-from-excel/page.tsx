"use client";

import React, { useMemo, useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  AlertTriangle,
  CheckCheck,
  CheckCircle2,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileDown,
  Inbox,
  Loader2,
  Paperclip,
  RotateCcw,
  Rows3,
  Search,
  Upload,
  UploadCloud,
  XCircle,
  Clock,
  Copy,
  Lock,
  UserX,
} from "lucide-react";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import useExcelDownload from "@/app/hooks/excel-download";
import HashloaderComponent from "@/components/Templates/hashloader";
import ReactTable from "@/components/Templates/reacttable";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import AButton from "@/components/atoms/Button";

type Row = Record<string, any>;
type Tab = "ok" | "bad";
type ToastType = "success" | "error" | "warning" | "info";

/* ------------------------------------------------------------------ */
/*  Constants & style tokens                                          */
/* ------------------------------------------------------------------ */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(
  (label, i) => ({ value: String(i + 1), label })
);

const UPLOAD_URL = `${process.env.NEXT_PUBLIC_URL}/ars/Emp_Atnrun_by_ExelData`;
const FY_START_MONTH_INDEX = 3; // April (0-indexed)
const FY_YEAR_COUNT = 5;
const TOAST_MS = 10000;

const card =
  "rounded-[12px] border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] dark:border-[#1F2937] dark:bg-[#111827]";
const sectionLabel =
  "text-[11px] font-semibold uppercase tracking-[0.03em] text-[#64748B] dark:text-[#94A3B8]";
const smallGhostBtn =
  "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-[#E2E8F0] bg-white px-3 py-[7px] text-[12px] font-[550] text-[#1E293B] transition hover:bg-[#F1F5F9] dark:border-[#1F2937] dark:bg-[#111827] dark:text-[#E7ECF3] dark:hover:bg-[#182235]";
const fieldBase =
  "w-full cursor-pointer appearance-none rounded-[9px] border border-[#E2E8F0] bg-white px-[10px] py-[9px] text-[12.5px] text-[#1E293B] outline-none transition focus:border-[#4F46E5] dark:border-[#1F2937] dark:bg-[#0E1524] dark:text-[#E7ECF3] dark:focus:border-[#8B84FF]";

const REJECT_RULES = [
  {
    title: "Unknown employee code",
    sub: "The code must exist in employee master and be active in that month.",
    icon: UserX,
    tint: "#E11D48",
  },
  {
    title: "Bad time or date format",
    sub: "Times as HH:MM in 24-hour clock, dates as DD/MM/YYYY inside the chosen month.",
    icon: Clock,
    tint: "#F59E0B",
  },
  {
    title: "Branch attendance locked",
    sub: "Locked branches reject new punches until the lock date moves.",
    icon: Lock,
    tint: "#7C3AED",
  },
  {
    title: "Duplicate row",
    sub: "One row per employee per date — the later row is rejected.",
    icon: Copy,
    tint: "#0EA5E9",
  },
];

/* ------------------------------------------------------------------ */
/*  Toast (same SweetAlert2 setup as the old page)                    */
/* ------------------------------------------------------------------ */
function showSideAlert(message: string, type: ToastType = "info") {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: TOAST_MS,
    timerProgressBar: true,
    customClass: {
      container: "side-alert-container",
      popup: `side-alert-${type}`,
      title: "side-alert-title",
      icon: "side-alert-icon",
    },
  });
  Toast.fire({ icon: type, title: message });
}

/* ------------------------------------------------------------------ */
/*  Date, financial year, and key-tolerant row getters                */
/* ------------------------------------------------------------------ */
const getCurrentFinancialYear = (): number => {
  const d = new Date();
  return d.getMonth() < FY_START_MONTH_INDEX ? d.getFullYear() - 1 : d.getFullYear();
};

// Same as the old page: starts at current FY + 1 and counts back
const getYearOptions = (): string[] => {
  const start = getCurrentFinancialYear() + 1;
  return Array.from({ length: FY_YEAR_COUNT }, (_, i) => String(start - i));
};

const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const pick = (r: Row, keys: string[]): string => {
  if (!r || typeof r !== "object") return "";

  // 1. Exact match
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }

  // 2. Case-insensitive & normalized match (handles EMP_CODE, Loc_Code, SEQ_NO, etc.)
  const targetKeysNormalized = keys.map((k) => k.toLowerCase().replace(/[-_\s]/g, ""));
  for (const [rk, rv] of Object.entries(r)) {
    if (rv === undefined || rv === null || String(rv).trim() === "") continue;
    const rkNormalized = rk.toLowerCase().replace(/[-_\s]/g, "");
    if (targetKeysNormalized.includes(rkNormalized)) {
      return String(rv).trim();
    }
  }

  return "";
};

const getLine = (r: Row, i: number) => pick(r, ["line", "Line", "row", "Row", "SEQ_NO", "seq_no"]) || `L${i + 1}`;
const getCode = (r: Row) => pick(r, ["EmpCode", "EMP_CODE", "Emp_Code", "empcode", "code", "EMPCODE"]);
const getName = (r: Row) => pick(r, ["Name", "name", "EmpName", "EMP_NAME", "Employee", "EmployeeName"]);
const getLocation = (r: Row) => pick(r, ["Location", "LOC_CODE", "Loc_Code", "location", "loc_code", "LocName", "Loc", "branch", "Branch"]);
const getDate = (r: Row) => pick(r, ["Date", "PunchDate", "DATE", "PUNCH_DATE", "date", "DateOffice", "dateoffice"]);
const getIn = (r: Row) => pick(r, ["InTime", "IN_TIME", "inTime", "inT", "In_1", "IN_1", "In"]);
const getOut = (r: Row) => pick(r, ["OutTime", "OUT_TIME", "outTime", "outT", "Out_1", "OUT_1", "Out"]);
const getReason = (r: Row) => pick(r, ["Reason", "reason", "REASON", "remark", "Remark", "error", "Error"]);

const isExcel = (f: File) => /\.(xlsx|xls)$/i.test(f.name);

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */
export default function Approver2() {
  const user: any = useCurrentUser();
  const { handleExcelDownload, isLoading: isExcelLoading } = useExcelDownload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(String(getCurrentFinancialYear()));
  const [attempted, setAttempted] = useState(false);

  // Flow state
  const [importing, setImporting] = useState(false);
  const [hasImported, setHasImported] = useState(false);
  const [importMeta, setImportMeta] = useState({ month: "", year: "" });

  // Data state
  const [correct, setCorrect] = useState<Row[]>([]);
  const [errored, setErrored] = useState<Row[]>([]);
  const [tab, setTab] = useState<Tab>("bad");
  const [query, setQuery] = useState("");

  // Backend messages
  const [warning, setWarning] = useState("");
  const [locked, setLocked] = useState<any[]>([]);

  const clearMessages = () => {
    setWarning("");
    setLocked([]);
  };

  /* ---------------- Reset ---------------- */
  const handleReset = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setMonth("");
    setYear(String(getCurrentFinancialYear()));
    setAttempted(false);
    setImporting(false);
    setHasImported(false);
    setImportMeta({ month: "", year: "" });
    setCorrect([]);
    setErrored([]);
    setTab("bad");
    setQuery("");
    clearMessages();
    showSideAlert("Selection reset", "info");
  };

  /* ---------------- Download sample ---------------- */
  const handleDownloadSample = async () => {
    try {
      showSideAlert("Downloading sample file…", "info");
      const compcode = user?.Comp_Code || user?.compcode;
      if (compcode) {
        try {
          const response = await axios.get(
            `${process.env.NEXT_PUBLIC_URL}/ars/Sample_Emp_Atnrun_by_ExelData?compcode=${compcode}`,
            { responseType: "blob" }
          );
          if (response.status === 200 && response.data) {
            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "Sample_Emp_Atnrun_by_ExelData.xlsx";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            showSideAlert("Sample file downloaded successfully", "success");
            return;
          }
        } catch (e) {
          // Fall through to local public sample
        }
      }

      // Fallback
      const link = document.createElement("a");
      link.href = "/Sample_Emp_Atnrun_by_ExelData.xlsx";
      link.download = "Sample_Emp_Atnrun_by_ExelData.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSideAlert("Sample file downloaded successfully", "success");
    } catch (error) {
      console.error("Error downloading sample file:", error);
      showSideAlert("Error downloading sample file", "error");
    }
  };

  /* ---------------- File selection (click or drop) ---------------- */
  const acceptFile = (f?: File | null) => {
    if (!f) return;
    if (!isExcel(f)) {
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      showSideAlert("Please select a valid Excel file (.xlsx or .xls).", "warning");
      return;
    }
    clearMessages();
    setFile(f);
  };

  /* ---------------- Import ---------------- */
  const runImport = async () => {
    setAttempted(true);
    clearMessages();

    if (!file) {
      showSideAlert("Please select an Excel punch sheet first", "warning");
      return;
    }
    if (!month) {
      showSideAlert("Please pick the month the sheet belongs to", "warning");
      return;
    }

    setImporting(true);
    setHasImported(false);
    setCorrect([]);
    setErrored([]);

    try {
      const formData = new FormData();
      formData.append("excel", file, file.name);
      formData.append("created_by", user?.name ?? "");
      formData.append("USR_CODE", user?.id ?? "");
      formData.append("Loc_Code", user?.branch ?? "");
      formData.append("IMPORT_DATE", formatDate(new Date()));
      formData.append("MONTH", month);
      formData.append("YEAR", year);

      // Content-Type is left to the browser so the multipart boundary is set correctly
      const { data } = await axios.post(UPLOAD_URL, formData, {
        headers: {
          compcode: user?.Comp_Code,
          name: user?.name,
        },
      });

      if (data.warning || data.lockedLocations) {
        setWarning(String(data.warning ?? ""));
        setLocked(Array.isArray(data.lockedLocations) ? data.lockedLocations : []);
      }

      const e: Row[] = Array.isArray(data.ErroredData) ? data.ErroredData : [];
      const c: Row[] = Array.isArray(data.CorrectData) ? data.CorrectData : [];

      setErrored(e);
      setCorrect(c);
      setImportMeta({ month, year });
      setHasImported(true);
      setTab(e.length > 0 ? "bad" : "ok");

      if (data.success) {
        showSideAlert(data.message || `${c.length} rows imported, ${e.length} rejected`, "success");
        setMonth("");
        setFile(null);
        setAttempted(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        showSideAlert(data.message || "Data Import failed", c.length > 0 ? "info" : "error");
      }
    } catch (error: any) {
      console.error("Error uploading file:", error);
      showSideAlert(
        error?.response?.data?.message || "Error! Invalid Excel Format or Network Error",
        "error"
      );
    } finally {
      setImporting(false);
    }
  };

  /* ---------------- Table data, search, export ---------------- */
  const pool = tab === "ok" ? correct : errored;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((r) =>
      [getCode(r), getName(r), getLocation(r), getDate(r), getReason(r)].some((v) =>
        v.toLowerCase().includes(q)
      )
    );
  }, [pool, query]);

  const handleExportExcel = () => {
    if (visible.length === 0) {
      showSideAlert("No data to export", "info");
      return;
    }
    const exportCols = [
      { Header: "Row", accessor: "line" },
      { Header: "Emp code", accessor: "code" },
      { Header: "Employee", accessor: "name" },
      { Header: "Location", accessor: "location" },
      { Header: "Date", accessor: "date" },
      { Header: "In", accessor: "inT" },
      { Header: "Out", accessor: "outT" },
      { Header: tab === "bad" ? "Reason" : "Result", accessor: "reason" },
    ];
    const exportRows = visible.map((r, i) => ({
      line: getLine(r, i),
      code: getCode(r) || "—",
      name: getName(r) || "—",
      location: getLocation(r) || "—",
      date: getDate(r) || "—",
      inT: getIn(r) || "—",
      outT: getOut(r) || "—",
      reason: getReason(r) || (tab === "ok" ? "Ready to calculate" : "—"),
    }));
    handleExcelDownload(exportCols, exportRows);
  };

  const handleDownloadFailedExcel = () => {
    if (errored.length === 0) {
      showSideAlert("No failed rows to download", "info");
      return;
    }
    const exportCols = [
      { Header: "Row", accessor: "line" },
      { Header: "Emp code", accessor: "code" },
      { Header: "Employee", accessor: "name" },
      { Header: "Location", accessor: "location" },
      { Header: "Date", accessor: "date" },
      { Header: "In", accessor: "inT" },
      { Header: "Out", accessor: "outT" },
      { Header: "Reason", accessor: "reason" },
    ];
    const failedRows = errored.map((r, i) => ({
      line: getLine(r, i),
      code: getCode(r) || "—",
      name: getName(r) || "—",
      location: getLocation(r) || "—",
      date: getDate(r) || "—",
      inT: getIn(r) || "—",
      outT: getOut(r) || "—",
      reason: getReason(r) || "—",
    }));
    handleExcelDownload(exportCols, failedRows);
  };

  const monthLabel = MONTHS.find((m) => m.value === importMeta.month)?.label ?? "";
  const lockedText = locked
    .map((l) =>
      typeof l === "string" ? l : pick(l, ["Location", "location", "Loc", "branch"]) || JSON.stringify(l)
    )
    .join(", ");

  const importReady = !!file && !!month;
  const monthMissing = attempted && !month;
  const fileMissing = attempted && !file;

  const reasonColor = tab === "bad" ? "#E11D48" : "#10B981";

  /* ---------------- Render ---------------- */
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-['Inter',system-ui,sans-serif] text-[#1E293B] antialiased dark:bg-[#0A0F1C] dark:text-[#E7ECF3]">
      <main className="px-6 pb-[60px] pt-[22px]">
        <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
              Attendance calculation from Excel
            </h1>
            <p className="mt-[5px] text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
              Upload a punch sheet for a month. Rows that fail validation are listed with the reason, so you can fix
              and re-upload them.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex shrink-0 items-center gap-1.5 rounded-[9px] border border-[#E2E8F0] bg-white px-3.5 py-2 text-[12px] font-[550] text-[#64748B] shadow-sm transition hover:bg-[#F1F5F9] hover:text-[#1E293B] dark:border-[#1F2937] dark:bg-[#111827] dark:text-[#94A3B8] dark:hover:bg-[#182235] dark:hover:text-[#E7ECF3]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadSample}
              className="flex shrink-0 items-center gap-1.5 rounded-[9px] border border-[#E2E8F0] bg-white px-3.5 py-2 text-[12px] font-[550] text-[#1E293B] shadow-sm transition hover:bg-[#F1F5F9] dark:border-[#1F2937] dark:bg-[#111827] dark:text-[#E7ECF3] dark:hover:bg-[#182235]"
            >
              <FileSpreadsheet className="h-4 w-4 text-[#10B981]" />
              <span>Sample file</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-[14px] xl:grid-cols-[minmax(0,1fr)_330px]">
          {/* ---------------- LEFT COLUMN ---------------- */}
          <div className="flex min-w-0 flex-col gap-3">
            {/* Upload card */}
            <div className={`${card} p-[17px_19px]`}>
              <div className="mb-3.5 flex items-center justify-between">
                <span className={sectionLabel}>
                  Upload punch sheet
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadSample}
                    className="flex items-center gap-1.5 text-[11.5px] font-[550] text-[#4F46E5] transition hover:underline dark:text-[#8B84FF]"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-[#10B981]" />
                    <span>Download sample</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1.5 rounded-[8px] border border-[#E2E8F0] bg-white px-[11px] py-[5px] text-[11.5px] font-[550] text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#1E293B] dark:border-[#1F2937] dark:bg-[#111827] dark:text-[#94A3B8] dark:hover:bg-[#182235] dark:hover:text-[#E7ECF3]"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_150px_120px_auto]">
                {/* Punch sheet */}
                <div className="flex min-w-0 flex-col gap-[5px]">
                  <div className="flex items-center justify-between">
                    <span className={`${sectionLabel} ${fileMissing ? "!text-[#E11D48]" : ""}`}>
                      Punch sheet <span className="text-[#E11D48]">*</span>
                    </span>
                    {fileMissing && (
                      <span className="flex items-center gap-1 text-[10.5px] font-semibold text-[#E11D48]">
                        <AlertTriangle className="h-3 w-3" />
                        Required
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={(e) => {
                      e.preventDefault();
                      acceptFile(e.dataTransfer.files?.[0]);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    className={`flex h-[38px] w-full items-center gap-[10px] rounded-[9px] border border-dashed px-[11px] text-left text-[12.5px] transition ${
                      file
                        ? "border-emerald-500/50 bg-emerald-500/10 text-[#1E293B] dark:text-[#E7ECF3]"
                        : fileMissing
                        ? "border-[#E11D48] bg-rose-50/50 text-[#E11D48] dark:bg-rose-950/20"
                        : "border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] hover:border-[#4F46E5] dark:border-[#1F2937] dark:bg-[#0E1524] dark:text-[#94A3B8] dark:hover:border-[#8B84FF]"
                    }`}
                  >
                    {file ? (
                      <FileCheck2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    ) : (
                      <Paperclip className="h-4 w-4 shrink-0 opacity-70" />
                    )}
                    <span className="min-w-0 flex-1 truncate font-[550]">
                      {file ? file.name : "Choose an .xlsx punch sheet"}
                    </span>
                    <span className="shrink-0 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                      {file ? `${(file.size / 1024).toFixed(0)} KB` : "or drag it here"}
                    </span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={(e) => acceptFile(e.target.files?.[0])}
                  />
                </div>

                {/* Month */}
                <div className="flex min-w-0 flex-col gap-[5px]">
                  <div className="flex items-center justify-between">
                    <span className={`${sectionLabel} ${monthMissing ? "!text-[#E11D48]" : ""}`}>
                      Month <span className="text-[#E11D48]">*</span>
                    </span>
                    {monthMissing && (
                      <span className="flex items-center gap-1 text-[10.5px] font-semibold text-[#E11D48]">
                        <AlertTriangle className="h-3 w-3" />
                        Required
                      </span>
                    )}
                  </div>
                  <select
                    value={month}
                    onChange={(e) => {
                      clearMessages();
                      setMonth(e.target.value);
                    }}
                    className={`${fieldBase} ${
                      monthMissing ? "border-[#E11D48] ring-1 ring-[#E11D48]/30 focus:border-[#E11D48]" : ""
                    }`}
                  >
                    <option value="">Select month</option>
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year */}
                <div className="flex min-w-0 flex-col gap-[5px]">
                  <span className={sectionLabel}>Year</span>
                  <select
                    value={year}
                    onChange={(e) => {
                      clearMessages();
                      setYear(e.target.value);
                    }}
                    className={fieldBase}
                  >
                    {getYearOptions().map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Import */}
                <button
                  type="button"
                  disabled={importing}
                  onClick={runImport}
                  className={`flex h-9 items-center justify-center gap-[7px] rounded-[9px] px-[17px] text-[12.5px] font-semibold text-white transition ${
                    importing
                      ? "cursor-not-allowed bg-[#4F46E5]/70"
                      : importReady
                      ? "cursor-pointer bg-[#4F46E5] hover:brightness-110"
                      : "cursor-pointer bg-[#64748B] hover:brightness-110"
                  }`}
                >
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {importing ? "Importing…" : hasImported ? "Re-import" : "Import"}
                </button>
              </div>
            </div>

            {/* Backend warnings */}
            {warning && (
              <div className="rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                {warning}
              </div>
            )}
            {locked.length > 0 && (
              <div className="rounded-[10px] border border-purple-300 bg-purple-50 px-3 py-2 text-[12px] text-purple-800 dark:border-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                Locked: {lockedText}
              </div>
            )}

            {/* Results */}
            {hasImported ? (
              <div className={`${card} overflow-hidden`}>
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2.5 border-b border-[#E2E8F0] px-[15px] py-3 dark:border-[#1F2937]">
                  {(
                    [
                      { key: "ok", label: "Imported", count: correct.length, dot: "#10B981" },
                      { key: "bad", label: "Not imported", count: errored.length, dot: "#E11D48" },
                    ] as const
                  ).map((t) => {
                    const active = tab === t.key;
                    const activeTone =
                      t.key === "ok"
                        ? "border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5] dark:border-[#8B84FF] dark:bg-[#1E1B4B] dark:text-[#8B84FF]"
                        : "border-[#E11D48] bg-rose-50 text-[#E11D48] dark:border-rose-500 dark:bg-rose-950/40 dark:text-rose-300";
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => {
                          setTab(t.key);
                          setQuery("");
                        }}
                        className={`flex items-center gap-2 whitespace-nowrap rounded-[9px] border px-3 py-[6px] text-[12.5px] font-semibold transition ${
                          active
                            ? activeTone
                            : "border-[#E2E8F0] bg-white text-[#1E293B] hover:bg-[#F8FAFC] dark:border-[#1F2937] dark:bg-[#111827] dark:text-[#E7ECF3] dark:hover:bg-[#182235]"
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: t.dot }} />
                        {t.label}
                        <span className="tabular-nums text-[#64748B] dark:text-[#94A3B8]">{t.count}</span>
                      </button>
                    );
                  })}

                  <div className="flex-1" />

                  <div className="relative w-full sm:w-[200px]">
                    <Search className="absolute left-[9px] top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[#64748B] dark:text-[#94A3B8]" />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search rows"
                      className="h-8 w-full rounded-[9px] border border-[#E2E8F0] bg-white pl-[30px] pr-[10px] text-[12px] text-[#1E293B] outline-none placeholder:text-[#64748B]/70 focus:border-[#4F46E5] dark:border-[#1F2937] dark:bg-[#0E1524] dark:text-[#E7ECF3] dark:focus:border-[#8B84FF]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    disabled={isExcelLoading}
                    className={smallGhostBtn}
                  >
                    {isExcelLoading ? (
                      <Loader2 className="h-[14px] w-[14px] animate-spin" />
                    ) : (
                      <Download className="h-[14px] w-[14px]" />
                    )}
                    {isExcelLoading ? "Exporting…" : "Export"}
                  </button>
                </div>

                {/* Table */}
                <div className="max-h-[430px] overflow-auto">
                  <table className="w-full border-separate border-spacing-0 text-[12.5px]">
                    <thead>
                      <tr>
                        {[
                          { label: "Row", align: "text-left" },
                          { label: "Emp code", align: "text-left" },
                          { label: "Employee", align: "text-left" },
                          { label: "Date", align: "text-left" },
                          { label: "In", align: "text-right" },
                          { label: "Out", align: "text-right" },
                          { label: tab === "bad" ? "Reason" : "Result", align: "text-left" },
                        ].map((c) => (
                          <th
                            key={c.label}
                            className={`sticky top-0 z-[5] whitespace-nowrap border-b border-[#E2E8F0] bg-[#F8FAFC] px-3 py-[9px] text-[10.5px] font-[650] uppercase tracking-[0.05em] text-[#64748B] dark:border-[#1F2937] dark:bg-[#0E1524] dark:text-[#94A3B8] ${c.align}`}
                          >
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((r, i) => (
                        <tr key={i} className="transition hover:bg-[#F1F5F9] dark:hover:bg-[#182235]">
                          <td className="whitespace-nowrap border-b border-[#E2E8F0] px-3 py-[9px] text-[11.5px] text-[#64748B] dark:border-[#1F2937] dark:text-[#94A3B8]">
                            {getLine(r, i)}
                          </td>
                          <td className="whitespace-nowrap border-b border-[#E2E8F0] px-3 py-[9px] font-[550] dark:border-[#1F2937]">
                            {getCode(r) || "—"}
                          </td>
                          <td className="min-w-[170px] border-b border-[#E2E8F0] px-3 py-[9px] dark:border-[#1F2937]">
                            <span className="block truncate font-[550]">{getName(r) || "—"}</span>
                            <span className="mt-[2px] block text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                              {getLocation(r) || "—"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap border-b border-[#E2E8F0] px-3 py-[9px] text-[#64748B] dark:border-[#1F2937] dark:text-[#94A3B8]">
                            {getDate(r) || "—"}
                          </td>
                          <td className="whitespace-nowrap border-b border-[#E2E8F0] px-3 py-[9px] text-right font-[550] dark:border-[#1F2937]">
                            {getIn(r) || "—"}
                          </td>
                          <td className="whitespace-nowrap border-b border-[#E2E8F0] px-3 py-[9px] text-right font-[550] dark:border-[#1F2937]">
                            {getOut(r) || "—"}
                          </td>
                          <td className="min-w-[210px] border-b border-[#E2E8F0] px-3 py-[9px] dark:border-[#1F2937]">
                            {getReason(r) ? (
                              <span
                                className="inline-block rounded-full px-2 py-[3px] text-[10.5px] font-bold"
                                style={{ color: reasonColor, background: `${reasonColor}1F` }}
                              >
                                {getReason(r)}
                              </span>
                            ) : (
                              <span className="text-[#64748B] dark:text-[#94A3B8]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {visible.length === 0 && (
                    <div className="px-5 py-12 text-center">
                      <div className="mx-auto grid h-10 w-10 place-items-center rounded-[12px] border border-[#E2E8F0] bg-[#F8FAFC] dark:border-[#1F2937] dark:bg-[#0E1524]">
                        {query.trim() ? (
                          <Search className="h-5 w-5 text-[#64748B] dark:text-[#94A3B8]" />
                        ) : tab === "bad" ? (
                          <CheckCheck className="h-5 w-5 text-[#10B981]" />
                        ) : (
                          <Inbox className="h-5 w-5 text-[#64748B] dark:text-[#94A3B8]" />
                        )}
                      </div>
                      <h4 className="mt-3 text-[13px] font-[600]">
                        {query.trim()
                          ? "No row matches that search"
                          : tab === "bad"
                          ? "No rejected rows"
                          : "No imported rows"}
                      </h4>
                      {query.trim() && (
                        <p className="mt-1 text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                          Clear the search to see all rows.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex flex-wrap items-center gap-3 border-t border-[#E2E8F0] bg-[#F8FAFC] px-[15px] py-[11px] dark:border-[#1F2937] dark:bg-[#0E1524]">
                  <span className="min-w-0 flex-1 text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                    {correct.length} imported · {errored.length} not imported
                    {monthLabel && importMeta.year ? ` · ${monthLabel} ${importMeta.year}` : ""}
                  </span>

                  {tab === "bad" && errored.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDownloadFailedExcel}
                      disabled={isExcelLoading}
                      className="flex items-center gap-1.5 rounded-[9px] border border-[#E2E8F0] bg-white px-3 py-2 text-[12px] font-[550] text-[#1E293B] transition hover:bg-[#F1F5F9] dark:border-[#1F2937] dark:bg-[#111827] dark:text-[#E7ECF3] dark:hover:bg-[#182235]"
                    >
                      <FileDown className="h-3.5 w-3.5 text-[#E11D48]" />
                      Download failed rows
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-[12px] border border-dashed border-[#E2E8F0] bg-white px-6 py-14 text-center dark:border-[#1F2937] dark:bg-[#111827]">
                <div className="mx-auto grid h-11 w-11 place-items-center rounded-[13px] border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] dark:border-[#1F2937] dark:bg-[#0E1524] dark:text-[#94A3B8]">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <h3 className="mt-[13px] text-[13.5px] font-semibold">No sheet imported yet</h3>
                <p className="mx-auto mt-[5px] max-w-[420px] text-[12px] leading-[1.55] text-[#64748B] dark:text-[#94A3B8]">
                  Choose a punch sheet and month, then import. Imported and rejected rows will be listed here.
                </p>
              </div>
            )}
          </div>

          {/* ---------------- RIGHT COLUMN ---------------- */}
          <div className="flex flex-col gap-3 xl:sticky xl:top-[24px]">
            {/* Import summary (only real counts from the backend) */}
            <div className={`${card} p-[15px_17px_17px]`}>
              <span className={sectionLabel}>Import summary</span>
              <div className="mt-3 flex flex-col gap-[9px]">
                {[
                  { label: "Rows in file", value: hasImported ? correct.length + errored.length : 0, icon: Rows3, tint: "#4F46E5" },
                  { label: "Imported", value: hasImported ? correct.length : 0, icon: CheckCircle2, tint: "#10B981" },
                  { label: "Not imported", value: hasImported ? errored.length : 0, icon: XCircle, tint: "#E11D48" },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.label}
                      className="flex items-center gap-[10px] rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-[10px_11px] dark:border-[#1F2937] dark:bg-[#0E1524]"
                    >
                      <span
                        className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[8px]"
                        style={{ background: `${s.tint}1F`, color: s.tint }}
                      >
                        <Icon className="h-[14px] w-[14px]" />
                      </span>
                      <span className="min-w-0 flex-1 text-[12px] text-[#64748B] dark:text-[#94A3B8]">{s.label}</span>
                      <span className="shrink-0 text-[14px] font-[650] tabular-nums" style={{ color: s.tint }}>
                        {s.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Why rows get rejected */}
            <div className={`${card} p-[15px_17px_17px]`}>
              <span className={sectionLabel}>Why rows get rejected</span>
              <div className="mt-3 flex flex-col gap-3">
                {REJECT_RULES.map((r) => {
                  const Icon = r.icon;
                  return (
                    <div key={r.title} className="flex items-start gap-2.5">
                      <span
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px]"
                        style={{ background: `${r.tint}1F`, color: r.tint }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                          {r.title}
                        </span>
                        <span className="mt-0.5 block text-[11.5px] leading-[1.5] text-[#64748B] dark:text-[#94A3B8]">
                          {r.sub}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      <HashloaderComponent isLoading={importing || isExcelLoading} />
    </div>
  );
}