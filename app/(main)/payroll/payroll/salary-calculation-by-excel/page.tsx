
"use client";

import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useCurrentUser } from "@/app/hooks/use-current-user";

import {
  Paperclip,
  Upload,
  Info,
  CloudUpload,
  Rows3,
  CircleCheck,
  CircleX,
  Calculator,
  UserRoundX,
  FileX,
  LockKeyhole,
  CalendarX,
  X,
  FileSpreadsheet,
  Search,
  Download,
} from "lucide-react";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

type Option = {
  value: string;
  label: string;
};

type ImportRow = {
  id: number;
  location: string;
  empCode: string;
  paidDays: number | string;
  status: string;
  reason: string;
};

const MONTHS: Option[] = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const INITIAL_SUMMARY = {
  rows: 0,
  imported: 0,
  rejected: 0,
  calculated: 0,
};

const getText = (...values: any[]): string => {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value);
    }
  }
  return "";
};

const getNumber = (...values: any[]): number => {
  for (const value of values) {
    if (
      value !== null &&
      value !== undefined &&
      value !== "" &&
      Number.isFinite(Number(value))
    ) {
      return Number(value);
    }
  }
  return 0;
};

const getApiError = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.message ||
  "Something went wrong. Please try again.";

const getResponseArray = (data: any, keys: string[]): any[] => {
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
};

const mapImportRow = (
  item: any,
  index: number,
  status: "Imported" | "Rejected"
): ImportRow => ({
  id: index,
  location: getText(
    item.Location,
    item.Loc_code,
    item.LocationName,
    item.loc_name,
    item.BranchName
  ),
  empCode: getText(
    item.EmpCode,
    item.EMPCODE,
    item.Emp_Code,
    item.EmployeeCode
  ),
  paidDays: getText(
    item.PaidDays,
    item.Paid_Days,
    item.Total_Days,
    item.Net_Present_Days
  ),
  status,
  reason: getText(
    item.Reason,
    item.Remark,
    item.Error,
    item.Message,
    item.reason
  ),
});

function SummaryItem({
  label,
  value,
  icon: Icon,
  color,
  iconBg,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  iconBg: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[#dce5f1] bg-[#f8fafc] px-3 py-3 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-lg ${iconBg}`}
        >
          <Icon size={16} className={color} />
        </div>

        <span className="truncate text-[12px] text-[#52627c] dark:text-slate-300">
          {label}
        </span>
      </div>

      <span className={`text-[15px] font-bold tabular-nums ${color}`}>
        {value}
      </span>
    </div>
  );
}

function RejectionReason({
  title,
  description,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div
        className={`mt-0.5 flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-lg ${iconBg}`}
      >
        <Icon size={15} className={iconColor} />
      </div>

      <div className="min-w-0">
        <p className="m-0 text-[12px] font-semibold text-[#152b4b] dark:text-slate-100">
          {title}
        </p>

        <p className="mt-0.5 text-[11px] leading-[17px] text-[#64748b] dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function SalaryCalculationExcelPage() {
  const user = useCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [month, setMonth] = useState(
    String(new Date().getMonth() + 1)
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [summary, setSummary] = useState(INITIAL_SUMMARY);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [hasImported, setHasImported] = useState(false);

  const [activeResult, setActiveResult] = useState<
    "all" | "imported" | "rejected"
  >("all");

  const apiHeaders = useMemo(
    () => ({
      compcode: user?.Comp_Code,
      name: user?.name,
    }),
    [user?.Comp_Code, user?.name]
  );

  const handleInputChange = (name: string, value: any) => {
    if (name === "month") {
      setMonth(String(value ?? ""));
    }

    if (name === "search") {
      setSearch(String(value ?? ""));
    }
  };

  const handleFile = (file?: File) => {
    if (!file) return;

    const isExcelFile = /\.(xlsx|xls)$/i.test(file.name);

    if (!isExcelFile) {
      Swal.fire({
        icon: "warning",
        title: "Invalid file",
        text: "Please select an Excel file (.xlsx or .xls).",
      });
      return;
    }

    setSelectedFile(file);
    setHasImported(false);
    setImportRows([]);
    setSummary(INITIAL_SUMMARY);
    setSearch("");
    setActiveResult("all");
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    handleFile(event.target.files?.[0]);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setHasImported(false);
    setImportRows([]);
    setSummary(INITIAL_SUMMARY);
    setSearch("");
    setActiveResult("all");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Download sample Excel
  const handleDownload = async () => {
    try {
      setLoading(true);

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/ars/Sample_Emp_Atnrun_by_ExelData?compcode=${user?.Comp_Code}`,
        {
          responseType: "blob",
        }
      );

      if (response.status !== 200) {
        throw new Error("Failed to download the sample file.");
      }

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "Sample_Emp_Atnrun_by_ExelData.xlsx";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Sample Excel download error:", error);

      Swal.fire({
        icon: "error",
        title: "Download failed",
        text: getApiError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  // Already processed salary calculation
  const fetchAlreadyProcessedData = useCallback(async () => {
    if (!user?.Comp_Code || !user?.branch) return;

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/SalaryLock/AlredyProcess_Slry_cal`,
        {
          locations: user.branch,
        },
        {
          headers: apiHeaders,
        }
      );

      const data = response.data;

      console.log("Already Process Response:", data);

      if (data?.Status && data?.modelVisible) {
        const rows = Array.isArray(data?.result)
          ? data.result
          : [];

        const tableRows = rows
          .map(
            (row: any) => `
              <tr>
                <td>${getText(row.Emp_Code) || "—"}</td>
                <td>${getText(row.Rerun) || "—"}</td>
                <td>${getText(row.loc_name) || "—"}</td>
                <td>${getText(row.Created_by) || "—"}</td>
                <td>${
                  row.Created_At
                    ? new Date(row.Created_At).toLocaleString("en-IN")
                    : "—"
                }</td>
              </tr>
            `
          )
          .join("");

        await Swal.fire({
          icon: "info",
          title: "Salary calculation already in progress",
          width: "1100px",
          html: `
            <div style="text-align:left">
              <div style="display:flex;flex-wrap:wrap;gap:20px;margin-bottom:16px;font-size:13px">
                <p><b>Total Pending Employees:</b> ${data?.total_emp || 0}</p>
                <p><b>Estimated Waiting Time:</b> ${data?.estimated_time || "0 minutes"}</p>
              </div>
              <div style="max-height:350px;overflow:auto">
                <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:left">
                  <thead>
                    <tr style="background:#f1f5f9">
                      <th style="padding:9px">Emp Code</th>
                      <th style="padding:9px">Month</th>
                      <th style="padding:9px">Location</th>
                      <th style="padding:9px">Imported By</th>
                      <th style="padding:9px">Imported On</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${tableRows || "<tr><td colspan='5' style='padding:12px'>No records found</td></tr>"}
                  </tbody>
                </table>
              </div>
            </div>
          `,
          confirmButtonText: "OK",
        });
      }
    } catch (error) {
      console.error("Already Process API error:", error);
    }
  }, [apiHeaders, user?.Comp_Code, user?.branch]);

  useEffect(() => {
    fetchAlreadyProcessedData();
  }, [fetchAlreadyProcessedData]);

  // Excel Import API
  const handleImport = async () => {
    if (!selectedFile) {
      Swal.fire({
        icon: "warning",
        title: "Select employee list",
        text: "Please choose an Excel file before importing.",
      });
      return;
    }

    if (!month) {
      Swal.fire({
        icon: "warning",
        title: "Select month",
        text: "Please select a salary month.",
      });
      return;
    }

    if (!user?.Comp_Code || !user?.branch) {
      Swal.fire({
        icon: "warning",
        title: "User information missing",
        text: "Company code or branch is not available.",
      });
      return;
    }

    setLoading(true);
    setHasImported(false);

    try {
      const formData = new FormData();

      const now = new Date();
      const importDate = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
      ].join("-");

      formData.append("excel", selectedFile, selectedFile.name);
      formData.append("created_by", user?.name || "");
      formData.append("USR_CODE", String(user?.id || ""));
      formData.append("Loc_Code", String(user?.branch || ""));
      formData.append("IMPORT_DATE", importDate);
      formData.append("MONTH", month);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/SalaryLock/Emp_Slryrun_by_ExelData`,
        formData,
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const data = response.data || {};

      console.log("Salary Excel Import Response:", data);

      // API response arrays
      const correctData = getResponseArray(data, [
        "CorrectData",
        "correctData",
        "ImportedData",
        "importedData",
      ]);

      const erroredData = getResponseArray(data, [
        "ErroredData",
        "erroredData",
        "RejectedData",
        "rejectedData",
      ]);

      const calculatedData = getResponseArray(data, [
        "CalculatedData",
        "calculatedData",
      ]);

      const importedRows = correctData.map((item: any, index: number) =>
        mapImportRow(item, index, "Imported")
      );

      const rejectedRows = erroredData.map((item: any, index: number) =>
        mapImportRow(
          item,
          correctData.length + index,
          "Rejected"
        )
      );

      const allRows = [...importedRows, ...rejectedRows];

      setImportRows(allRows);
      setHasImported(true);
      setActiveResult("all");
      setSearch("");

      setSummary({
        rows: getNumber(
          data?.totalRows,
          data?.TotalRows,
          data?.total_rows
        ) || allRows.length,
        imported: correctData.length,
        rejected: erroredData.length,
        calculated:
          getNumber(
            data?.calculated,
            data?.Calculated,
            data?.calculatedCount,
            data?.CalculatedCount
          ) || calculatedData.length,
      });

      // Warnings and locked locations
      if (data.warning || data.lockedLocations?.length) {
        const lockedLocations = Array.isArray(data.lockedLocations)
          ? data.lockedLocations
          : [];

        const lockedText = lockedLocations
          .map((item: any) =>
            typeof item === "object"
              ? getText(
                  item.loc_name,
                  item.Location,
                  item.LocationName,
                  item.Loc_code
                )
              : String(item)
          )
          .filter(Boolean)
          .join(", ");

        await Swal.fire({
          icon: "warning",
          title: "Import warning",
          text: [
            data.warning || "",
            lockedText ? `Locked locations: ${lockedText}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        });
      }

      if (data.success) {
        await Swal.fire({
          icon: "success",
          title: "Import completed",
          text:
            data.message ||
            `${correctData.length} employee(s) imported successfully.`,
          timer: 2000,
          showConfirmButton: false,
        });

        setSelectedFile(null);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else if (allRows.length > 0) {
        await Swal.fire({
          icon: "warning",
          title: "Import completed with issues",
          text:
            data.message ||
            `${erroredData.length} employee(s) could not be imported.`,
        });
      } else {
        throw new Error(
          data.message ||
            data.Message ||
            "Data import failed. Please check your Excel file."
        );
      }
    } catch (error: any) {
      console.error("Salary Excel Import API error:", error);

      Swal.fire({
        icon: "error",
        title: "Import failed",
        text: getApiError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  // Table filtering
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return importRows.filter((row) => {
      const matchesTab =
        activeResult === "all" ||
        (activeResult === "imported" && row.status === "Imported") ||
        (activeResult === "rejected" && row.status === "Rejected");

      const matchesSearch =
        !query ||
        row.empCode.toLowerCase().includes(query) ||
        row.location.toLowerCase().includes(query) ||
        row.status.toLowerCase().includes(query) ||
        row.reason.toLowerCase().includes(query);

      return matchesTab && matchesSearch;
    });
  }, [importRows, search, activeResult]);

  const columns = useMemo(
    () => [
      {
        Header: "LOCATION",
        accessor: "location",
        width: 180,
      },
      {
        Header: "EMPLOYEE CODE",
        accessor: "empCode",
        width: 160,
      },
      {
        Header: "PAID DAYS",
        accessor: "paidDays",
        width: 110,
      },
      {
        Header: "STATUS",
        accessor: "status",
        width: 130,
        Cell: ({ value }: any) => {
          const isRejected = value === "Rejected";

          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                isRejected
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
              }`}
            >
              {value}
            </span>
          );
        },
      },
      {
        Header: "REASON",
        accessor: "reason",
        width: 250,
        Cell: ({ value }: any) => (
          <span className="text-[11px] text-[#64748b] dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="min-h-screen min-w-0 bg-[#f5f8fc] p-3 transition-colors dark:bg-[#0b1220] sm:p-4 lg:p-5">
      <HashloaderComponent isLoading={loading} />

      <div className="mx-auto min-w-0 max-w-[1800px] space-y-4">
        {/* PAGE HEADER */}
        {/* PAGE HEADER */}
<div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <div className="min-w-0">
    <h1 className="text-[20px] font-bold leading-tight text-[#152b4b] dark:text-slate-100 sm:text-[23px]">
      Salary calculation from Excel
    </h1>

    <p className="mt-1 text-[12px] text-[#64748b] dark:text-slate-400 sm:text-[13px]">
      Run salary for a specific list of employees supplied in a
      sheet, instead of a whole branch or region.
    </p>
  </div>

  <div className="flex shrink-0 items-center">
    <AButton
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex h-[38px] w-full items-center justify-center gap-2 rounded-lg bg-[#64748b] px-4 text-[12px] font-semibold text-white transition hover:bg-[#475569] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
    >
      <Download size={15} />
      Download Sample Excel
    </AButton>
  </div>
</div>

        {/* MAIN GRID */}
        <div className="grid min-w-0 grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_370px]">
          {/* LEFT SECTION */}
          <div className="min-w-0 space-y-3">
            {/* UPLOAD PANEL */}
            <div className="min-w-0 rounded-xl border border-[#dce5f1] bg-white p-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-colors dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] sm:p-5">
              <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto] lg:items-end">
                {/* FILE INPUT */}
                <div className="min-w-0">
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#52627c] dark:text-slate-300">
                    Employee list <span className="text-rose-500">*</span>
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex min-h-[41px] min-w-0 cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed px-3 transition-colors ${
                      isDragging
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                        : "border-[#dce5f1] bg-[#f8fafc] hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-400"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Paperclip
                        size={17}
                        className="shrink-0 text-[#64748b] dark:text-slate-400"
                      />

                      {selectedFile ? (
                        <div className="flex min-w-0 items-center gap-2">
                          <FileSpreadsheet
                            size={15}
                            className="shrink-0 text-emerald-600"
                          />

                          <span className="truncate text-[12px] font-medium text-[#152b4b] dark:text-slate-100">
                            {selectedFile.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[12px] font-medium text-[#52627c] dark:text-slate-300">
                          Choose an .xlsx file
                        </span>
                      )}
                    </div>

                    {selectedFile ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeFile();
                        }}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-rose-50 hover:text-rose-500 dark:text-slate-400 dark:hover:bg-rose-500/10"
                        title="Remove file"
                      >
                        <X size={15} />
                      </button>
                    ) : (
                      <span className="hidden shrink-0 text-[11px] text-[#64748b] dark:text-slate-400 sm:block">
                        or drag it here
                      </span>
                    )}
                  </div>
                </div>

                {/* MONTH SELECT */}
                <div className="min-w-0">
                  <Eselect
                    title="MONTH"
                    redlabel="*"
                    name="month"
                    option={MONTHS}
                    initialValue={month}
                    handleInputChange={handleInputChange}
                    className="h-[41px] w-full"
                  />
                </div>

                {/* IMPORT BUTTON */}
                <div className="flex min-w-0 items-end">
                  <AButton
                    type="button"
                    onClick={handleImport}
                    disabled={loading || !selectedFile}
                    className="inline-flex h-[41px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#64748b] px-5 text-[12px] font-semibold text-white transition hover:bg-[#475569] disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
                  >
                    <Upload size={15} />
                    Import
                  </AButton>
                </div>
              </div>

              {/* FILE INFO */}
              <div className="mt-4 flex min-w-0 items-start gap-2 border-t border-[#e8edf5] pt-3.5 dark:border-slate-700">
                <Info
                  size={16}
                  className="mt-0.5 shrink-0 text-[#64748b] dark:text-slate-400"
                />

                <p className="text-[11px] leading-[18px] text-[#64748b] dark:text-slate-400">
                  Columns expected: Location, EmpCode, PaidDays
                  (optional). Leave paid days blank to use the calculated
                  attendance.
                </p>
              </div>

             
            </div>

            {/* IMPORT RESULT */}
            <div className="min-w-0 overflow-hidden rounded-xl border border-[#dce5f1] bg-white transition-colors dark:border-slate-700 dark:bg-slate-900">
              {hasImported && importRows.length > 0 ? (
                <>
                  <div className="flex min-w-0 flex-col gap-3 border-b border-[#e8edf5] p-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-[13px] font-semibold text-[#152b4b] dark:text-slate-100">
                        Import results
                      </h2>

                      <p className="mt-0.5 text-[10px] text-[#64748b] dark:text-slate-400">
                        Employee-wise import status
                      </p>
                    </div>

                    <div className="w-full sm:max-w-[230px]">
                      <Einput
                        title=""
                        name="search"
                        type="text"
                        value={search}
                        handleInputChange={handleInputChange}
                        className="h-[34px] w-full"
                      />
                    </div>
                  </div>

                  {/* RESULT FILTERS */}
                  <div className="flex flex-wrap items-center gap-2 border-b border-[#e8edf5] px-3 py-2 dark:border-slate-700">
                    {[
                      { id: "all", label: `All (${importRows.length})` },
                      {
                        id: "imported",
                        label: `Imported (${summary.imported})`,
                      },
                      {
                        id: "rejected",
                        label: `Rejected (${summary.rejected})`,
                      },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() =>
                          setActiveResult(
                            tab.id as "all" | "imported" | "rejected"
                          )
                        }
                        className={`rounded-lg border px-3 py-1.5 text-[10px] font-semibold transition ${
                          activeResult === tab.id
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-500/15 dark:text-indigo-300"
                            : "border-[#dce5f1] bg-white text-[#64748b] hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="w-full min-w-0 overflow-x-auto">
                    <div className="min-w-[750px]">
                      <DataTable
                        columns={columns}
                        data={filteredRows}
                        showTopSearch={false}
                        showExcelExport={false}
                        initialPageSize={10}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex min-h-[230px] min-w-0 flex-col items-center justify-center px-4 py-8 text-center sm:min-h-[260px]">
                  <div className="flex h-[50px] w-[50px] items-center justify-center rounded-2xl border border-[#dce5f1] bg-[#f8fafc] dark:border-slate-700 dark:bg-slate-800">
                    <CloudUpload
                      size={21}
                      className="text-[#64748b] dark:text-slate-400"
                    />
                  </div>

                  <h3 className="mt-3 text-[14px] font-semibold text-[#152b4b] dark:text-slate-100">
                    {hasImported ? "No import rows found" : "Nothing imported yet"}
                  </h3>

                  <p className="mt-1 max-w-[470px] text-[12px] leading-5 text-[#64748b] dark:text-slate-400">
                    Choose the employee list and salary month, then
                    import. Rows that cannot be calculated are listed
                    with a reason.
                  </p>

                  {selectedFile && (
                    <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-[11px] text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                      <FileSpreadsheet size={14} className="shrink-0" />
                      <span className="max-w-[240px] truncate">
                        {selectedFile.name}
                      </span>
                      <span>Ready to import</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {/* SUMMARY */}
            <div className="min-w-0 rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-colors dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#52627c] dark:text-slate-300">
                Import summary
              </h2>

              <div className="space-y-2">
                <SummaryItem
                  label="Rows in file"
                  value={summary.rows}
                  icon={Rows3}
                  color="text-indigo-600 dark:text-indigo-400"
                  iconBg="bg-indigo-100 dark:bg-indigo-500/15"
                />

                <SummaryItem
                  label="Imported"
                  value={summary.imported}
                  icon={CircleCheck}
                  color="text-emerald-600 dark:text-emerald-400"
                  iconBg="bg-emerald-100 dark:bg-emerald-500/15"
                />

                <SummaryItem
                  label="Rejected"
                  value={summary.rejected}
                  icon={CircleX}
                  color="text-rose-600 dark:text-rose-400"
                  iconBg="bg-rose-100 dark:bg-rose-500/15"
                />

                <SummaryItem
                  label="Calculated"
                  value={summary.calculated}
                  icon={Calculator}
                  color="text-violet-600 dark:text-violet-400"
                  iconBg="bg-violet-100 dark:bg-violet-500/15"
                />
              </div>
            </div>

            {/* REJECTION REASONS */}
            <div className="min-w-0 rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-colors dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
              <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-[#52627c] dark:text-slate-300">
                Why rows get rejected
              </h2>

              <div className="space-y-3.5">
                <RejectionReason
                  title="Unknown employee code"
                  description="The code must exist in employee master and be active in the salary month."
                  icon={UserRoundX}
                  iconBg="bg-rose-100 dark:bg-rose-500/15"
                  iconColor="text-rose-600 dark:text-rose-400"
                />

                <RejectionReason
                  title="No salary structure"
                  description="An employee with no structure for that month cannot be calculated."
                  icon={FileX}
                  iconBg="bg-orange-100 dark:bg-orange-500/15"
                  iconColor="text-orange-600 dark:text-orange-400"
                />

                <RejectionReason
                  title="Salary locked"
                  description="Locked locations reject calculation until the lock date moves."
                  icon={LockKeyhole}
                  iconBg="bg-violet-100 dark:bg-violet-500/15"
                  iconColor="text-violet-600 dark:text-violet-400"
                />

                <RejectionReason
                  title="Paid days out of range"
                  description="Paid days above the days in the month are rejected."
                  icon={CalendarX}
                  iconBg="bg-sky-100 dark:bg-sky-500/15"
                  iconColor="text-sky-600 dark:text-sky-400"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
