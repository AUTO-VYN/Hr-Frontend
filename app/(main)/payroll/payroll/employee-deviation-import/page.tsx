"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  Paperclip,
  Upload,
  Info,
  Rows3,
  CheckCircle2,
  XCircle,
  UploadCloud,
  UserX,
  Lock,
  CalendarX2,
  Copy,
  X,
  FileSpreadsheet,
} from "lucide-react";

import axios from "axios";
import Swal from "sweetalert2";

import Image from "next/image";

import { Button } from "@/components/ui/button";
import DataTable from "@/components/Templates/reactTable";
import HashloaderComponent from "@/components/Templates/hashloader";
import { useCurrentUser } from "@/app/hooks/use-current-user";

/* =========================================================
   TYPES
========================================================= */

type ImportRow = {
  RowNo?: number;
  Empcode?: string;
  EmpCode?: string;
  EmpName?: string;
  Month?: string | number;
  Year?: string | number;
  DevDays?: number | string;
  DeviationDays?: number | string;
  rejectionReasons?: string;
  Status?: string;
  Message?: string;
  [key: string]: any;
};

type ImportSummary = {
  total: number;
  imported: number;
  rejected: number;
};

const EMPTY_SUMMARY: ImportSummary = {
  total: 0,
  imported: 0,
  rejected: 0,
};

const REJECT_REASONS = [
  {
    title: "Unknown employee code",
    text: "Employee code must exist in employee master.",
    icon: UserX,
    iconStyle: "bg-rose-50 text-rose-500",
  },
  {
    title: "Salary month locked",
    text: "Locked salary months may reject deviation entries.",
    icon: Lock,
    iconStyle: "bg-violet-50 text-violet-500",
  },
  {
    title: "Invalid deviation days",
    text: "Deviation days must be valid for the selected month.",
    icon: CalendarX2,
    iconStyle: "bg-amber-50 text-amber-500",
  },
  {
    title: "Duplicate row",
    text: "Duplicate employee deviation entries may be rejected.",
    icon: Copy,
    iconStyle: "bg-sky-50 text-sky-500",
  },
];

const hasValidExtension = (file: File) =>
  [".xlsx", ".xls"].some((ext) => file.name.toLowerCase().endsWith(ext));

const formatSignedDays = (value: number | string | undefined) => {
  const number = Number(value);

  if (!Number.isFinite(number)) return "-";

  const formatted = Number.isInteger(number)
    ? String(number)
    : number.toFixed(1);

  return `${number > 0 ? "+" : ""}${formatted}`;
};

/* =========================================================
   SUMMARY ROW
========================================================= */

const SummaryRow = ({
  label,
  value,
  icon: Icon,
  iconStyle,
  valueStyle,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  iconStyle: string;
  valueStyle: string;
}) => (
  <div className="flex items-center justify-between rounded-[13px] border border-[var(--border)] bg-[var(--card)] px-[12px] py-[11px]">
    <div className="flex items-center gap-[12px]">
      <span
        className={`flex h-[30px] w-[30px] items-center justify-center rounded-[9px] ${iconStyle}`}
      >
        <Icon size={15} />
      </span>

      <span className="text-[13px] text-[var(--muted)]">{label}</span>
    </div>

    <span className={`text-[14px] font-[750] ${valueStyle}`}>{value}</span>
  </div>
);

/* =========================================================
   STATUS BADGE
========================================================= */

const ResultBadge = ({ status }: { status?: string }) => {
  const isImported = String(status).toLowerCase() === "imported";

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-[9px] py-[3px] text-[10.5px] font-[700] ${
        isImported
          ? "bg-emerald-50 text-emerald-600"
          : "bg-rose-50 text-rose-600"
      }`}
    >
      {isImported ? "Imported" : "Rejected"}
    </span>
  );
};

/* =========================================================
   PAGE
========================================================= */

export default function Approver2() {
  const user = useCurrentUser();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [results, setResults] = useState<ImportRow[]>([]);
  const [summary, setSummary] = useState<ImportSummary>(EMPTY_SUMMARY);

  const [hasImported, setHasImported] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "imported" | "rejected">(
    "all",
  );

  /* =========================================================
     TOAST
  ========================================================= */

  const showSideAlert = (
    message: string,
    type: "success" | "error" | "warning" | "info" = "success",
  ) => {
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
    });

    Toast.fire({
      icon: type,
      title: message,
    });
  };

  /* =========================================================
     DOWNLOAD SAMPLE
     EXISTING API PRESERVED
  ========================================================= */

  const showdata = async () => {
    try {
      window.location.href = `${process.env.NEXT_PUBLIC_URL}/ars/importformatEmpDevation?compcode=${user?.Comp_Code}`;
    } catch (error) {
      console.error("Error downloading sample:", error);
    }
  };

  /* =========================================================
     FILE SELECTION
  ========================================================= */

  const selectFile = (selected?: File | null) => {
    if (!selected) return;

    if (!hasValidExtension(selected)) {
      showSideAlert(
        "Please select a valid Excel file (.xlsx or .xls)",
        "warning",
      );
      return;
    }

    setFile(selected);
    setHasImported(false);
    setResults([]);
    setSummary(EMPTY_SUMMARY);
    setActiveTab("all");
  };

  const clearFile = () => {
    setFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    selectFile(event.dataTransfer.files?.[0]);
  };

  /* =========================================================
     IMPORT
     EXISTING API AND PAYLOAD PRESERVED
  ========================================================= */

  const handleImport = async () => {
    if (typeof user?.branch === "string") {
      showSideAlert("Cannot Import Data in MultiLocation", "info");
      return;
    }

    if (!file) {
      showSideAlert("Please select an Excel file first", "warning");
      return;
    }

    if (!user?.Comp_Code) {
      showSideAlert("Company code not found", "error");
      return;
    }

    try {
      setIsLoading(true);

      const formData = new FormData();

      // Original API payload
      formData.append("excel", file, file.name);
      formData.append("user", user?.id);
      formData.append("branch", user?.branch);
      formData.append("CREATED_BY", user?.EMPCODE);

      // Original API
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/importEmpDevation`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      console.log("Deviation import response:", response);

      if (response.status === 200) {
        const correctData: ImportRow[] = response?.data?.CorrectData || [];

        const erroredData: ImportRow[] = response?.data?.ErroredData || [];

        const allRows = [
          ...correctData.map((row) => ({
            ...row,
            Status: "Imported",
          })),
          ...erroredData.map((row) => ({
            ...row,
            Status: "Rejected",
          })),
        ];

        setResults(allRows);

        setSummary({
          total: allRows.length,
          imported: correctData.length,
          rejected: erroredData.length,
        });

        setHasImported(true);
        setActiveTab("all");

        showSideAlert(
          response?.data?.Message || "Excel imported successfully",
          erroredData.length > 0 ? "warning" : "success",
        );

        clearFile();
      }
    } catch (error: any) {
      console.error("Error uploading file:", error);

      showSideAlert(
        error?.response?.data?.Message || "Error! Invalid Format",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* =========================================================
     FILTERED DATA
  ========================================================= */

  const filteredResults = useMemo(() => {
    if (activeTab === "imported") {
      return results.filter(
        (row) => String(row.Status).toLowerCase() === "imported",
      );
    }

    if (activeTab === "rejected") {
      return results.filter(
        (row) => String(row.Status).toLowerCase() === "rejected",
      );
    }

    return results;
  }, [results, activeTab]);

  /* =========================================================
     TABLE COLUMNS
  ========================================================= */

  const columns = useMemo(
    () => [
      {
        Header: "ROW",
        accessor: "RowNo",
        width: 70,
        Cell: ({ value }: any) => (
          <span className="text-[12px] text-[var(--muted)]">
            {value ?? "-"}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE",
        id: "employee",
        accessor: "Empcode",
        width: 180,
        Cell: ({ row }: any) => {
          const item = row.original;

          return (
            <div className="py-[3px]">
              <p className="m-0 whitespace-nowrap text-[13px] font-[700] text-[var(--fg)]">
                {item.EmpName || item.Empcode || item.EmpCode || "-"}
              </p>

              <p className="mb-0 mt-[3px] text-[11.5px] text-[var(--muted)]">
                Code: {item.Empcode || item.EmpCode || "-"}
              </p>
            </div>
          );
        },
      },
      {
        Header: "MONTH",
        accessor: "Month",
        width: 100,
      },
      {
        Header: "YEAR",
        accessor: "Year",
        width: 90,
      },
      {
        Header: "DEVIATION DAYS",
        accessor: "DevDays",
        width: 140,
        Cell: ({ row, value }: any) => {
          const days = value ?? row.original.DeviationDays;

          const number = Number(days);

          return (
            <div
              className={`text-right text-[13px] font-[750] ${
                number >= 0 ? "text-emerald-600" : "text-rose-500"
              }`}
            >
              {formatSignedDays(days)}
            </div>
          );
        },
      },
      {
        Header: "RESULT",
        accessor: "Status",
        width: 110,
        Cell: ({ value }: any) => <ResultBadge status={value} />,
      },
      {
        Header: "REASON",
        accessor: "rejectionReasons",
        width: 300,
        Cell: ({ row, value }: any) => (
          <span className="text-[12px] text-[var(--muted)]">
            {value || row.original.Message || "-"}
          </span>
        ),
      },
    ],
    [],
  );

  /* =========================================================
     JSX
  ========================================================= */

  return (
    <main className="min-h-screen bg-[var(--bg)] px-[14px] py-[18px] text-[var(--fg)]">
      {/* HEADER */}

      <div className="mb-[17px] flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="m-0 flex items-center gap-3 text-[22px] font-[750] leading-tight tracking-[-0.02em]">
            <Image
              src="/Payrollicon/Excel_Import.png"
              alt="Autovyn"
              width={28}
              height={28}
            />
            Employee Deviation Excel Import
          </h1>

          <p className="mb-0 mt-[5px] text-[13px] text-[var(--muted)]">
            Import employee deviation days in bulk and review imported and
            rejected records.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="save" onClick={showdata}>
            Download Sample
          </Button>

          <Button variant="print" onClick={() => window.history.back()}>
            Back
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-[14px] xl:grid-cols-[minmax(0,1fr)_370px]">
        {/* LEFT COLUMN */}

        <div className="min-w-0 space-y-[14px]">
          {/* UPLOAD CARD */}

          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-[20px] shadow-[var(--shadow)]">
            <p className="mb-[8px] mt-0 text-[11.5px] font-[700] tracking-[0.03em] text-[var(--muted)]">
              DEVIATION SHEET <span className="text-rose-500">*</span>
            </p>

            <div className="flex flex-col gap-[12px] sm:flex-row sm:items-center">
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex h-[46px] min-w-0 flex-1 cursor-pointer items-center gap-[12px] rounded-[10px] border border-dashed px-[14px] transition ${
                  isDragging
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-[var(--border)] bg-[var(--field)] hover:border-indigo-400"
                }`}
              >
                <Paperclip size={16} className="shrink-0 text-[var(--muted)]" />

                <span className="min-w-0 flex-1 truncate text-[13px] font-[650] text-[var(--fg)]">
                  {file ? file.name : "Choose an Excel file (.xlsx / .xls)"}
                </span>

                {file ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      clearFile();
                    }}
                    className="shrink-0 text-[var(--muted)] hover:text-rose-500"
                    aria-label="Remove file"
                  >
                    <X size={15} />
                  </button>
                ) : (
                  <span className="shrink-0 text-[11.5px] text-[var(--muted)]">
                    or drag it here
                  </span>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(event) => selectFile(event.target.files?.[0])}
                />
              </div>

              <Button
                variant="save"
                onClick={handleImport}
                disabled={!file || isLoading}
                className="inline-flex h-[44px] items-center justify-center gap-2 rounded-[10px] px-[20px] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Upload size={15} />
                Import
              </Button>
            </div>

            <div className="mt-[16px] flex items-center gap-[10px] border-t border-[var(--border)] pt-[14px]">
              <Info size={15} className="shrink-0 text-[var(--muted)]" />

              <p className="m-0 text-[12px] text-[var(--muted)]">
                Upload the Excel file using the Download Sample format. Only
                .xlsx and .xls files are accepted.
              </p>
            </div>
          </div>

          {/* RESULT AREA */}

          {!hasImported ? (
            <div className="flex min-h-[258px] flex-col items-center justify-center rounded-[16px] border border-dashed border-[var(--border)] bg-[var(--card)] px-[20px] py-[40px] text-center">
              <span className="flex h-[50px] w-[50px] items-center justify-center rounded-[12px] border border-[var(--border)] bg-[var(--card)] text-[var(--muted)]">
                <FileSpreadsheet size={22} />
              </span>

              <h3 className="mb-0 mt-[16px] text-[14.5px] font-[700] text-[var(--fg)]">
                Nothing imported yet
              </h3>

              <p className="mb-0 mt-[8px] max-w-[500px] text-[13px] leading-[1.6] text-[var(--muted)]">
                Choose a deviation sheet and import. Imported and rejected
                records will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow)]">
              <div className="flex flex-col justify-between gap-2 border-b border-[var(--border)] px-[18px] py-[14px] sm:flex-row sm:items-center">
                <span className="text-[14px] font-[700] text-[var(--fg)]">
                  {filteredResults.length} rows processed
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                      activeTab === "all"
                        ? "bg-slate-700 text-white"
                        : "bg-[var(--field)] text-[var(--muted)]"
                    }`}
                  >
                    All ({summary.total})
                  </button>

                  <button
                    onClick={() => setActiveTab("imported")}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                      activeTab === "imported"
                        ? "bg-emerald-600 text-white"
                        : "bg-[var(--field)] text-[var(--muted)]"
                    }`}
                  >
                    Imported ({summary.imported})
                  </button>

                  <button
                    onClick={() => setActiveTab("rejected")}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                      activeTab === "rejected"
                        ? "bg-rose-600 text-white"
                        : "bg-[var(--field)] text-[var(--muted)]"
                    }`}
                  >
                    Rejected ({summary.rejected})
                  </button>
                </div>
              </div>

              <div className="w-full min-w-0 overflow-x-auto p-2">
                <DataTable
                  columns={columns}
                  data={filteredResults}
                  height="350px"
                  excelname="Employee Deviation Import"
                  filterPosition="FilterData"
                  numericFilterColumns={[]}
                />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}

        <aside className="space-y-[14px]">
          {/* IMPORT SUMMARY */}

          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-[18px] shadow-[var(--shadow)]">
            <p className="mb-[14px] mt-0 text-[11.5px] font-[700] tracking-[0.03em] text-[var(--muted)]">
              IMPORT SUMMARY
            </p>

            <div className="space-y-[10px]">
              <SummaryRow
                label="Rows in file"
                value={summary.total}
                icon={Rows3}
                iconStyle="bg-indigo-50 text-indigo-600"
                valueStyle="text-indigo-600"
              />

              <SummaryRow
                label="Imported"
                value={summary.imported}
                icon={CheckCircle2}
                iconStyle="bg-emerald-50 text-emerald-500"
                valueStyle="text-emerald-600"
              />

              <SummaryRow
                label="Non-Imported"
                value={summary.rejected}
                icon={XCircle}
                iconStyle="bg-rose-50 text-rose-500"
                valueStyle="text-rose-600"
              />
            </div>
          </div>

          {/* REJECTION REASONS */}

          <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-[18px] shadow-[var(--shadow)]">
            <p className="mb-[14px] mt-0 text-[11.5px] font-[700] tracking-[0.03em] text-[var(--muted)]">
              WHY ROWS GET REJECTED
            </p>

            <div className="space-y-[14px]">
              {REJECT_REASONS.map(({ title, text, icon: Icon, iconStyle }) => (
                <div key={title} className="flex items-start gap-[12px]">
                  <span
                    className={`flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[8px] ${iconStyle}`}
                  >
                    <Icon size={14} />
                  </span>

                  <div className="min-w-0">
                    <p className="m-0 text-[13px] font-[700] text-[var(--fg)]">
                      {title}
                    </p>

                    <p className="mb-0 mt-[3px] text-[12px] leading-[1.5] text-[var(--muted)]">
                      {text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* LOADER */}

      <HashloaderComponent isLoading={isLoading} />
    </main>
  );
}
