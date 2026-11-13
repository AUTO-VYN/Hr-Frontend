"use client";

import React, { useCallback, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  FileSpreadsheet,
  ChevronDown,
  X,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useDateRange } from "@/app/hooks/use-date-range";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

// --------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------

const INCENTIVE_REPORT_API = "/EmpMaster/IncPaidSalaryView";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type IncentiveRow = {
  id: number;
  empCode: string;
  employeeName: string;
  incentiveMonth: string;
  incentiveYear: string;
  incentiveName: string;
  remark: string;
  amount: number;
  disbAmount: number;
  location: string;
  [key: string]: any;
};

type ColumnDefinition = {
  key: keyof IncentiveRow;
  label: string;
};

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const getText = (...values: any[]): string => {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
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

const getResponseArray = (response: any): any[] => {
  if (Array.isArray(response)) {
    return response;
  }

  const possibleKeys = [
    "data",
    "Data",
    "result",
    "Result",
    "records",
    "Records",
    "rows",
    "Table",
    "recordset",
  ];

  for (const key of possibleKeys) {
    if (Array.isArray(response?.[key])) {
      return response[key];
    }
  }

  return [];
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);

const getApiError = (error: any): string => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.Message ||
    error?.response?.data?.error ||
    error?.message ||
    "Unable to fetch incentive report."
  );
};

const formatDateInput = (date: Date): string => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

const getCurrentDate = (monthsBack = 0): string => {
  const today = new Date();
  today.setMonth(today.getMonth() - monthsBack);

  return formatDateInput(today);
};

// --------------------------------------------------
// MAP API RESPONSE
// --------------------------------------------------

const mapIncentiveRow = (item: any, index: number): IncentiveRow => ({
  ...item,

  id: index,

  empCode: getText(
    item?.Emp_Code,
    item?.EMPCODE,
    item?.EmpCode,
    item?.EmployeeCode,
    item?.["EMP CODE"],
  ),

  employeeName: getText(
    item?.Emp_Name,
    item?.EMPFIRSTNAME,
    item?.EmployeeName,
    item?.EmpName,
    item?.Employee_Name,
    item?.["EMPLOYEE NAME"],
    item?.Name,
  ),

  incentiveMonth: getText(
    item?.IncMnth,
    item?.IncentiveMonth,
    item?.Incentive_Month,
    item?.Month,
    item?.["INCENTIVE MONTH"],
  ),

  incentiveYear: getText(
    item?.Inc_Yr,
    item?.IncentiveYear,
    item?.Incentive_Year,
    item?.Year,
    item?.["INCENTIVE YEAR"],
  ),

  incentiveName: getText(
    item?.Inc_Name,
    item?.IncentiveName,
    item?.Incentive_Name,
    item?.["INCENTIVE NAME"],
  ),

  remark: getText(item?.Remark, item?.Remarks, item?.REMARK),

  amount: getNumber(item?.Amount, item?.AMOUNT, item?.IncentiveAmount),

  disbAmount: getNumber(
    item?.Disb_Amt,
    item?.DisbAmount,
    item?.Disb_Amount,
    item?.DisbursedAmount,
    item?.["DISB. AMOUNT"],
  ),

  location: getText(
    item?.LocationName,
    item?.Location,
    item?.LOCATION,
    item?.Branch,
    item?.BranchName,
  ),
});

// --------------------------------------------------
// TABLE COLUMN DEFINITIONS
// --------------------------------------------------

const COLUMN_DEFS: ColumnDefinition[] = [
  { key: "empCode", label: "EMP CODE" },
  { key: "employeeName", label: "EMPLOYEE NAME" },
  { key: "incentiveMonth", label: "INCENTIVE MONTH" },
  { key: "incentiveYear", label: "INCENTIVE YEAR" },
  { key: "incentiveName", label: "INCENTIVE NAME" },
  { key: "remark", label: "REMARK" },
  { key: "amount", label: "AMOUNT" },
  { key: "disbAmount", label: "DISB. AMOUNT" },
  { key: "location", label: "LOCATION" },
];

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

export default function IncentivePaidOutsideSalaryPage() {
  const user = useCurrentUser();
  const globalDateRange = useDateRange();

  // --------------------------------------------------
  // DATE STATES
  // --------------------------------------------------

  const today = useMemo(() => getCurrentDate(0), []);
  const oneMonthBack = useMemo(() => getCurrentDate(1), []);

  const [dateFrom, setDateFrom] = useState(
    globalDateRange?.from || oneMonthBack,
  );
  const [dateTo, setDateTo] = useState(globalDateRange?.to || today);

  // --------------------------------------------------
  // REPORT STATES
  // --------------------------------------------------

  const [rows, setRows] = useState<IncentiveRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // --------------------------------------------------
  // FILTER STATES
  // --------------------------------------------------

  const [search, setSearch] = useState("");
  const [showColumnFilters, setShowColumnFilters] = useState(false);

  const [filters, setFilters] = useState<Record<string, string>>(
    Object.fromEntries(COLUMN_DEFS.map((col) => [col.key, ""])),
  );

  // --------------------------------------------------
  // FETCH INCENTIVE REPORT
  // --------------------------------------------------

  const fetchIncentiveReport = useCallback(async () => {
    if (!user?.Comp_Code) {
      Swal.fire({
        icon: "warning",
        title: "Company information missing",
        text: "Please login again.",
      });

      return;
    }

    if (!user?.branch) {
      Swal.fire({
        icon: "warning",
        title: "Location missing",
        text: "Your branch/location information is not available.",
      });

      return;
    }

    if (!dateFrom || !dateTo) {
      Swal.fire({
        icon: "warning",
        title: "Select date range",
        text: "Please select both Date from and Date to.",
      });

      return;
    }

    if (dateFrom > dateTo) {
      Swal.fire({
        icon: "warning",
        title: "Invalid date range",
        text: "Date from cannot be greater than Date to.",
      });

      return;
    }

    setLoading(true);
    setRows([]);
    setHasSearched(false);

    try {
      // Exact payload from your existing working page.
      const payload = {
        Loc_code: user.branch,
        DateFrom: dateFrom,
        DateTo: dateTo,
      };

      console.log("Incentive Paid Outside Salary Payload:", payload);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${INCENTIVE_REPORT_API}`,
        payload,
        {
          headers: {
            compcode: user.Comp_Code,
          },
        },
      );

      console.log("Incentive Paid Outside Salary API Response:", response.data);

      const responseData = response?.data;

      if (
        responseData?.success === false ||
        responseData?.Status === false ||
        responseData?.status === false
      ) {
        throw new Error(
          responseData?.message ||
            responseData?.Message ||
            "Unable to fetch incentive report.",
        );
      }

      // API response: result.data.data
      const result = getResponseArray(responseData);

      const mappedRows = result.map((item: any, index: number) =>
        mapIncentiveRow(item, index),
      );

      setRows(mappedRows);
      setHasSearched(true);

      setSearch("");

      setFilters(Object.fromEntries(COLUMN_DEFS.map((col) => [col.key, ""])));

      if (mappedRows.length === 0) {
        Swal.fire({
          icon: "info",
          title: "No records found",
          text: "No incentive records are available for the selected dates.",
        });
      }
    } catch (error: any) {
      console.error("Incentive Paid Outside Salary Error:", error);

      setRows([]);
      setHasSearched(true);

      Swal.fire({
        icon: "error",
        title: "Report failed",
        text: getApiError(error),
      });
    } finally {
      setLoading(false);
    }
  }, [user?.Comp_Code, user?.branch, dateFrom, dateTo]);

  // --------------------------------------------------
  // FILTER HANDLING
  // --------------------------------------------------

  const handleFilterChange = (name: string, value: string) => {
    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // --------------------------------------------------
  // RESET FILTERS
  // --------------------------------------------------

  const resetFilters = () => {
    setSearch("");

    setFilters(Object.fromEntries(COLUMN_DEFS.map((col) => [col.key, ""])));
  };

  // --------------------------------------------------
  // FILTERED DATA
  // --------------------------------------------------

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        COLUMN_DEFS.some((col) =>
          String(row[col.key] ?? "")
            .toLowerCase()
            .includes(query),
        );

      const matchesColumns = Object.entries(filters).every(([key, value]) => {
        if (!value.trim()) return true;

        return String(row[key] ?? "")
          .toLowerCase()
          .includes(value.trim().toLowerCase());
      });

      return matchesSearch && matchesColumns;
    });
  }, [rows, search, filters]);

  // --------------------------------------------------
  // TABLE COLUMNS
  // --------------------------------------------------

  const columns = useMemo(
    () =>
      COLUMN_DEFS.map((col) => ({
        Header: col.label,
        accessor: col.key,

        minWidth: 130,

        width:
          col.key === "employeeName" || col.key === "incentiveName" ? 210 : 145,

        Cell: ({ value }: any) => {
          if (value === null || value === undefined || value === "") {
            return <span className="text-slate-400">—</span>;
          }

          if (col.key === "amount" || col.key === "disbAmount") {
            return (
              <span className="font-medium tabular-nums text-[#152b4b] dark:text-slate-200">
                {formatCurrency(Number(value))}
              </span>
            );
          }

          if (col.key === "empCode") {
            return (
              <span className="font-mono text-[12px] font-bold text-[#152b4b] dark:text-slate-200">
                {value}
              </span>
            );
          }

          if (col.key === "employeeName") {
            return (
              <span className="font-medium text-[#152b4b] dark:text-slate-100">
                {value}
              </span>
            );
          }

          return (
            <span className="text-[12px] text-[#334155] dark:text-slate-300">
              {String(value)}
            </span>
          );
        },
      })),
    [],
  );

  // --------------------------------------------------
  // EXPORT TO EXCEL (CSV)
  // --------------------------------------------------

  const exportToExcel = () => {
    if (!filteredRows.length) {
      Swal.fire({
        icon: "info",
        title: "No records",
        text: "There are no records available to export.",
      });

      return;
    }

    const escapeCSV = (value: any) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csvContent = [
      COLUMN_DEFS.map((col) => escapeCSV(col.label)).join(","),

      ...filteredRows.map((row) =>
        COLUMN_DEFS.map((col) => escapeCSV(row[col.key])).join(","),
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;

    link.download = `Incentive_Paid_Outside_Salary_${dateFrom}_to_${dateTo}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="min-h-screen min-w-0 bg-[#f5f8fc] p-3 transition-colors dark:bg-[#0b1220] sm:p-4 lg:p-5">
      <HashloaderComponent isLoading={loading} />

      <div className="mx-auto max-w-[1800px] space-y-4">
        {/* PAGE HEADER */}

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-[12px] text-[#64748b] dark:text-slate-400"></div>

            <h1 className="text-[20px] font-bold leading-tight text-[#152b4b] dark:text-slate-100 sm:text-[23px]">
              Incentive Paid Outside Salary
            </h1>
          </div>
        </div>

        {/* FILTER CARD */}

        <div className="rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
            {/* DATE FROM */}

            <div className="w-full sm:w-[230px]">
              <Einput
                title="Date from"
                name="dateFrom"
                type="date"
                value={dateFrom}
                handleInputChange={(name: string, value: string) =>
                  setDateFrom(value)
                }
                className="h-[40px] w-full"
              />
            </div>

            {/* DATE TO */}

            <div className="w-full sm:w-[230px]">
              <Einput
                title="Date to"
                name="dateTo"
                type="date"
                value={dateTo}
                handleInputChange={(name: string, value: string) =>
                  setDateTo(value)
                }
                className="h-[40px] w-full"
              />
            </div>

            {/* SHOW */}

            <div className="flex items-end">
              <AButton
                type="button"
                onClick={fetchIncentiveReport}
                disabled={loading}
                className="inline-flex h-[40px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 text-[13px] font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                Show
              </AButton>
            </div>
          </div>
        </div>

        {/* REPORT TABLE CARD */}

        <div className="min-w-0 overflow-hidden rounded-xl border border-[#dce5f1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900">
          {/* TOOLBAR */}

          <div className="flex min-w-0 flex-col gap-3 border-b border-[#e8edf5] p-3.5 dark:border-slate-700 lg:flex-row lg:items-center lg:justify-between">
            {/* ROW COUNT */}

            <div className="shrink-0">
              <p className="text-[13px] font-medium text-[#64748b] dark:text-slate-400">
                <span className="font-semibold text-[#152b4b] dark:text-slate-100">
                  {filteredRows.length}
                </span>{" "}
                of {rows.length} rows
              </p>
            </div>

            {/* ACTIONS */}

            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              {/* SEARCH */}

              <div className="relative min-w-0 flex-1 sm:w-[280px] sm:flex-none">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <Einput
                  name="search"
                  type="text"
                  value={search}
                  placeholder="Search in results..."
                  handleInputChange={(name: string, value: string) =>
                    setSearch(value)
                  }
                  className="h-[41px] w-full pl-9"
                />
              </div>

              {/* COLUMN FILTERS */}

              <AButton
                type="button"
                onClick={() => setShowColumnFilters((previous) => !previous)}
                className={`inline-flex h-[41px] items-center justify-center gap-2 rounded-lg border px-3.5 text-[12px] font-semibold transition ${
                  showColumnFilters
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300"
                    : "border-[#dce5f1] bg-white text-[#152b4b] hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                <SlidersHorizontal size={15} />
                Column filters
                <ChevronDown
                  size={14}
                  className={`transition-transform ${
                    showColumnFilters ? "rotate-180" : ""
                  }`}
                />
              </AButton>

              {/* RESET */}

              <AButton
                type="button"
                onClick={resetFilters}
                className="inline-flex h-[41px] items-center justify-center gap-2 rounded-lg border border-[#dce5f1] bg-white px-3.5 text-[12px] font-semibold text-[#152b4b] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <RotateCcw size={14} />
                Reset
              </AButton>

              {/* EXPORT */}

              <AButton
                type="button"
                onClick={exportToExcel}
                disabled={!filteredRows.length}
                className="inline-flex h-[41px] items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#dce5f1] bg-white px-3.5 text-[12px] font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
              >
                <FileSpreadsheet size={15} />
                Export to Excel
              </AButton>
            </div>
          </div>

          {/* COLUMN FILTER PANEL */}

          {showColumnFilters && (
            <div className="border-b border-[#e8edf5] bg-[#f8fafc] p-3.5 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[12px] font-semibold text-[#152b4b] dark:text-slate-100">
                  Filter individual columns
                </p>

                <button
                  type="button"
                  onClick={() => setShowColumnFilters(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {COLUMN_DEFS.map((col) => (
                  <div key={col.key} className="min-w-0">
                    <label className="mb-1 block text-[11px] font-medium text-[#64748b] dark:text-slate-400">
                      {col.label}
                    </label>

                    <input
                      type="text"
                      value={filters[col.key] || ""}
                      onChange={(event) =>
                        handleFilterChange(col.key, event.target.value)
                      }
                      placeholder={`Search ${col.label.toLowerCase()}`}
                      className="h-[37px] w-full rounded-lg border border-[#dce5f1] bg-white px-2.5 text-[11px] text-[#152b4b] outline-none placeholder:text-slate-400 focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TABLE */}

          {hasSearched ? (
            <div className="w-full min-w-0 overflow-x-auto">
              <div className="min-w-max">
                {filteredRows.length > 0 ? (
                  <DataTable
                    columns={columns}
                    data={filteredRows}
                    onRowDoubleClick={() => {}}
                  />
                ) : (
                  <div className="py-12 text-center text-[13px] text-[#64748b] dark:text-slate-400">
                    No matching records found.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-14 text-center text-[13px] text-[#64748b] dark:text-slate-400">
              Select a date range and click{" "}
              <span className="font-semibold text-[#152b4b] dark:text-slate-200">
                Show
              </span>{" "}
              to view records.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
