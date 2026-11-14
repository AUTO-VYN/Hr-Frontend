"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

import {
  Search,
  RotateCcw,
  X,
  ArrowLeft,
  Filter,
  FileSpreadsheet,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";
import EselectAll from "./EselectAll";

// --------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------

const EARLY_LATE_PUNCH_API = "/hrmsreport/getEarlyLatePunchReport";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type PunchFilterValue = "IN_BEFORE" | "IN_AFTER" | "OUT_BEFORE" | "OUT_AFTER";

type PunchRow = {
  EMPCODE?: string;
  EMP_NAME?: string;
  DESIGNATION?: string;
  LOCATION?: string;
  DEPARTMENT?: string;
  SECTION?: string;
  CHANNEL?: string;
  CLUSTER?: string;
  DATEOFFICE?: string;
  PUNCH_TIME?: string;
  DIFF_MINUTES?: number | string;
  FILTER_TYPE?: string;
  [key: string]: any;
};

type ReportColumn = {
  key: string;
  label: string;
  width: number;
  date?: boolean;
  punchTime?: boolean;
  difference?: boolean;
};

type TableColumn = {
  Header: string;
  accessor: string;
  minWidth: number;
  width: number;
  Cell?: ({ value, row }: any) => React.ReactNode;
};

// --------------------------------------------------
// DATE HELPER
// --------------------------------------------------

const getCurrentDate = () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// --------------------------------------------------
// COMMON HELPERS
// --------------------------------------------------

const getText = (...values: any[]): string => {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value);
    }
  }

  return "";
};

const getResponseArray = (response: any): any[] => {
  if (Array.isArray(response)) return response;

  const possibleArrays = [
    response?.result,
    response?.data,
    response?.Data,
    response?.Result,
    response?.records,
    response?.rows,
    response?.Table,
    response?.recordset,
    response?.data?.result,
    response?.data?.Data,
  ];

  return possibleArrays.find(Array.isArray) || [];
};

const getApiError = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.response?.data?.error ||
  error?.message ||
  "Unable to fetch Early & Late Punch Report.";

// --------------------------------------------------
// DATE FORMAT
// --------------------------------------------------

const formatDate = (value: any): string => {
  if (!value) return "";

  const raw = String(value);

  const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (dateOnlyMatch) {
    const date = new Date(
      Number(dateOnlyMatch[1]),
      Number(dateOnlyMatch[2]) - 1,
      Number(dateOnlyMatch[3]),
    );

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// --------------------------------------------------
// ALERT
// --------------------------------------------------

const showSideAlert = (
  message: string,
  type: "success" | "error" | "warning" | "info" = "info",
) => {
  Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
  }).fire({
    icon: type,
    title: message,
  });
};

// --------------------------------------------------
// PUNCH FILTER OPTIONS
// --------------------------------------------------

const PUNCH_FILTER_OPTIONS = [
  {
    value: "IN_BEFORE",
    label: "IN Before 30 Min (Early Arrival)",
  },
  {
    value: "IN_AFTER",
    label: "IN After 30 Min (Late Arrival)",
  },
  {
    value: "OUT_BEFORE",
    label: "OUT Before 30 Min (Early Departure)",
  },
  {
    value: "OUT_AFTER",
    label: "OUT After 30 Min (Late Stay / Overtime)",
  },
];

// --------------------------------------------------
// DEFAULT SELECTED FILTERS
// --------------------------------------------------

const DEFAULT_PUNCH_FILTER: PunchFilterValue[] = [
  "IN_BEFORE",
  "IN_AFTER",
  "OUT_BEFORE",
  "OUT_AFTER",
];

// --------------------------------------------------
// MAP UI FILTERS TO API FILTERS
// --------------------------------------------------

const getPunchFilterPayload = (filters: string[]): string[] => {
  const allowedFilters: PunchFilterValue[] = [
    "IN_BEFORE",
    "IN_AFTER",
    "OUT_BEFORE",
    "OUT_AFTER",
  ];

  return allowedFilters.filter((filter) => filters.includes(filter));
};

// --------------------------------------------------
// DIFFERENCE LABEL
// --------------------------------------------------

const getDifferenceLabel = (value: number | string, type: string): string => {
  const abs = Math.abs(Number(value) || 0);

  const labels: Record<string, string> = {
    IN_BEFORE: `${abs} mins early`,
    IN_AFTER: `${abs} mins late`,
    OUT_BEFORE: `${abs} mins before shift end`,
    OUT_AFTER: `${abs} mins after shift end`,
  };

  return labels[type] || `${abs} mins`;
};

// --------------------------------------------------
// DIFFERENCE COLORS
// --------------------------------------------------

const differenceColorMap: Record<string, string> = {
  IN_BEFORE: "text-green-600",
  IN_AFTER: "text-red-600",
  OUT_BEFORE: "text-yellow-600",
  OUT_AFTER: "text-blue-600",
};

// --------------------------------------------------
// REPORT COLUMNS
// --------------------------------------------------

const REPORT_COLUMNS: ReportColumn[] = [
  {
    key: "EMPCODE",
    label: "EMP CODE",
    width: 140,
  },
  {
    key: "EMP_NAME",
    label: "EMPLOYEE NAME",
    width: 260,
  },
  {
    key: "DESIGNATION",
    label: "DESIGNATION",
    width: 190,
  },
  {
    key: "LOCATION",
    label: "LOCATION",
    width: 150,
  },
  {
    key: "DEPARTMENT",
    label: "DEPARTMENT",
    width: 180,
  },
  {
    key: "SECTION",
    label: "SECTION",
    width: 140,
  },
  {
    key: "CHANNEL",
    label: "CHANNEL",
    width: 150,
  },
  {
    key: "CLUSTER",
    label: "CLUSTER",
    width: 150,
  },
  {
    key: "DATEOFFICE",
    label: "DATE",
    width: 160,
    date: true,
  },
  {
    key: "PUNCH_TIME",
    label: "IN TIME",
    width: 140,
    punchTime: true,
  },
  {
    key: "DIFF_MINUTES",
    label: "DIFF (MINS)",
    width: 170,
    difference: true,
  },
];

// --------------------------------------------------
// MAP API RESPONSE
// --------------------------------------------------

const mapReportRows = (result: any[]): PunchRow[] => {
  return result.map((item: any) => {
    const filterType = getText(
      item?.FILTER_TYPE,
      item?.Filter_Type,
      item?.filter_type,
    ).toUpperCase();

    return {
      ...item,

      EMPCODE: getText(
        item?.EMPCODE,
        item?.Emp_Code,
        item?.EmpCode,
        item?.EMP_CODE,
        item?.EmployeeCode,
      ),

      EMP_NAME: getText(
        item?.EMP_NAME,
        item?.EMPLOYEENAME,
        item?.EMPLOYEE_NAME,
        item?.EmployeeName,
        item?.EmpName,
        item?.Emp_Name,
      ),

      DESIGNATION: getText(
        item?.DESIGNATION,
        item?.EMPLOYEEDESIGNATION,
        item?.Designation,
        item?.DESIG_NAME,
        item?.Desig_Name,
      ),

      LOCATION: getText(
        item?.LOCATION,
        item?.Location,
        item?.BRANCH_NAME,
        item?.Branch_Name,
        item?.BRANCH,
        item?.LOC_NAME,
      ),

      DEPARTMENT: getText(
        item?.DEPARTMENT,
        item?.Department,
        item?.DEPT_NAME,
        item?.Dept_Name,
      ),

      SECTION: getText(
        item?.SECTION,
        item?.Section,
        item?.SECTION_NAME,
        item?.Section_Name,
      ),

      CHANNEL: getText(
        item?.CHANNEL,
        item?.Channel,
        item?.CHANNEL_NAME,
        item?.Channel_Name,
      ),

      CLUSTER: getText(
        item?.CLUSTER,
        item?.Cluster,
        item?.CLUSTER_NAME,
        item?.Cluster_Name,
      ),

      DATEOFFICE: getText(
        item?.DATEOFFICE,
        item?.PUNCH_DATE,
        item?.DATE,
        item?.PunchDate,
        item?.ATT_DATE,
        item?.PUNCHDATE,
        item?.REPORT_DATE,
      ),

      PUNCH_TIME: getText(
        item?.PUNCH_TIME,
        item?.PUNCHTIME,
        item?.IN_TIME,
        item?.OUT_TIME,
        item?.PunchTime,
      ),

      DIFF_MINUTES:
        item?.DIFF_MINUTES ??
        item?.DIFF_MIN ??
        item?.Diff_Minutes ??
        item?.DIFFERENCE ??
        0,

      FILTER_TYPE: filterType,
    };
  });
};

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

export default function EarlyLatePunchReportPage() {
  const user = useCurrentUser();
  const router = useRouter();

  // --------------------------------------------------
  // STATES
  // --------------------------------------------------

  const [reportDate, setReportDate] = useState(getCurrentDate());

  const [punchFilter, setPunchFilter] =
    useState<string[]>(DEFAULT_PUNCH_FILTER);

  const [rows, setRows] = useState<PunchRow[]>([]);

  const [loading, setLoading] = useState(false);

  const [hasSearched, setHasSearched] = useState(false);

  const [search, setSearch] = useState("");

  const [showColumnFilters, setShowColumnFilters] = useState(false);

  const [filters, setFilters] = useState<Record<string, string>>({});

  // --------------------------------------------------
  // API HEADERS
  // --------------------------------------------------

  const apiHeaders = useMemo(
    () => ({
      compcode: user?.Comp_Code,
    }),
    [user?.Comp_Code],
  );

  // --------------------------------------------------
  // VALIDATE FILTERS
  // --------------------------------------------------

  const validateFilters = useCallback(() => {
    if (!reportDate) {
      showSideAlert("Please select date.", "warning");
      return false;
    }

    const selectedDate = new Date(`${reportDate}T00:00:00`);

    if (Number.isNaN(selectedDate.getTime())) {
      showSideAlert("Please select a valid date.", "warning");
      return false;
    }

    if (!punchFilter.length) {
      showSideAlert("Please select at least one punch filter.", "warning");
      return false;
    }

    return true;
  }, [reportDate, punchFilter]);

  // --------------------------------------------------
  // FETCH REPORT
  // --------------------------------------------------

  const fetchReport = useCallback(async () => {
    if (!user?.Comp_Code) {
      showSideAlert(
        "Company information missing. Please login again.",
        "warning",
      );
      return;
    }

    if (!user?.branch) {
      showSideAlert("Branch information missing.", "warning");
      return;
    }

    if (!validateFilters()) return;

    setLoading(true);
    setHasSearched(false);

    try {
      const payload = {
        selectedDate: reportDate,
        punchFilter: getPunchFilterPayload(punchFilter),
        Loc_code: user?.branch,
      };

      console.log("Early Late Punch Payload:", payload);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${EARLY_LATE_PUNCH_API}`,
        payload,
        {
          headers: apiHeaders,
        },
      );

      console.log("Early Late Punch Response:", response.data);

      const responseData = response?.data;

      if (
        responseData?.Status === false ||
        responseData?.status === false ||
        responseData?.success === false
      ) {
        throw new Error(
          responseData?.message ||
            responseData?.Message ||
            "Unable to fetch report.",
        );
      }

      const result = getResponseArray(responseData);

      const mappedRows = mapReportRows(result);

      setRows(mappedRows);

      setFilters(
        Object.fromEntries(REPORT_COLUMNS.map((column) => [column.key, ""])),
      );

      setSearch("");
      setHasSearched(true);

      if (mappedRows.length === 0) {
        showSideAlert("No Early & Late Punch records found.", "info");
      } else {
        showSideAlert(
          `${mappedRows.length} records fetched successfully.`,
          "success",
        );
      }
    } catch (error: any) {
      console.error("Early Late Punch Report Error:", error);

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
  }, [
    user?.Comp_Code,
    user?.branch,
    reportDate,
    punchFilter,
    apiHeaders,
    validateFilters,
  ]);

  // --------------------------------------------------
  // INITIAL FETCH
  // --------------------------------------------------

  useEffect(() => {
    if (user?.Comp_Code && user?.branch) {
      fetchReport();
    }
  }, [user?.Comp_Code, user?.branch, fetchReport]);

  // --------------------------------------------------
  // DATE CHANGE
  // --------------------------------------------------

  const handleDateChange = (name: string, value: string) => {
    setReportDate(value);
  };

  // --------------------------------------------------
  // PUNCH FILTER CHANGE - MULTI SELECT
  // --------------------------------------------------

  const handlePunchFilterChange = (name: string, value: string[]) => {
    setPunchFilter(Array.isArray(value) ? value : []);

    setRows([]);
    setHasSearched(false);
    setSearch("");
  };

  // --------------------------------------------------
  // COLUMN FILTER CHANGE
  // --------------------------------------------------

  const handleFilterChange = (name: string, value: string) => {
    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // --------------------------------------------------
  // FILTERED ROWS
  // --------------------------------------------------

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        REPORT_COLUMNS.some((column) =>
          String(row[column.key] ?? "")
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

  const columns = useMemo((): TableColumn[] => {
    return REPORT_COLUMNS.map((column) => ({
      Header:
        column.key === "PUNCH_TIME"
          ? rows.some((row) => String(row.FILTER_TYPE || "").startsWith("OUT"))
            ? "OUT TIME"
            : "IN TIME"
          : column.label,

      accessor: column.key,
      minWidth: column.width,
      width: column.width,

      Cell: ({ value, row }: any) => {
        if (value === null || value === undefined || value === "") {
          return <span className="text-slate-400">—</span>;
        }

        if (column.key === "EMPCODE") {
          return (
            <span className="whitespace-nowrap font-mono text-[12px] font-bold text-[#152b4b] dark:text-slate-200">
              {String(value).toUpperCase()}
            </span>
          );
        }

        if (column.date) {
          return (
            <span className="whitespace-nowrap text-[13px] text-[#152b4b] dark:text-slate-300">
              {formatDate(value)}
            </span>
          );
        }

        if (column.difference) {
          const type = row?.original?.FILTER_TYPE || "";

          return (
            <span
              className={`whitespace-nowrap text-[13px] font-bold ${
                differenceColorMap[type] || "text-[#152b4b] dark:text-slate-200"
              }`}
            >
              {getDifferenceLabel(value, type)}
            </span>
          );
        }

        if (column.punchTime) {
          return (
            <span className="whitespace-nowrap font-mono text-[13px] font-semibold text-[#152b4b] dark:text-slate-200">
              {String(value)}
            </span>
          );
        }

        return (
          <span className="whitespace-nowrap text-[13px] text-[#152b4b] dark:text-slate-300">
            {String(value)}
          </span>
        );
      },
    }));
  }, [rows]);

  // --------------------------------------------------
  // RESET FILTERS
  // --------------------------------------------------

  const resetFilters = () => {
    setSearch("");

    setFilters(
      Object.fromEntries(REPORT_COLUMNS.map((column) => [column.key, ""])),
    );
  };

  // --------------------------------------------------
  // BACK
  // --------------------------------------------------

  const handleBack = () => {
    router.back();
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
          <h1 className="text-[20px] font-bold leading-tight text-[#152b4b] dark:text-slate-100 sm:text-[23px]">
            Early & Late Punch Report (30+ min)
          </h1>
        </div>

        {/* FILTER SECTION */}

        <div className="rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(220px,360px)_minmax(260px,430px)_auto]">
            {/* SELECT DATE */}

            <div className="min-w-0">
              <Einput
                name="reportDate"
                type="date"
                title="Select date"
                value={reportDate}
                handleInputChange={handleDateChange}
                className="h-[41px] w-full"
              />
            </div>

            {/* PUNCH FILTER - MULTI SELECT */}

            <div className="min-w-0">
              <EselectAll
                title="Punch Filter"
                name="punchFilter"
                option={PUNCH_FILTER_OPTIONS}
                initialValue={punchFilter}
                handleInputChange={handlePunchFilterChange}
                isMulti={true}
                mb={0}
              />
            </div>

            {/* SHOW BUTTON */}

            <div className="flex items-end">
              <AButton
                type="button"
                onClick={fetchReport}
                disabled={loading}
                className="inline-flex h-[41px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-7 text-[13px] font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <Search size={15} />
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
              {/* GLOBAL SEARCH */}

              <div className="relative min-w-0 flex-1 sm:w-[285px] sm:flex-none">
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

              {/* RESET */}

              <AButton
                type="button"
                onClick={resetFilters}
                className="inline-flex h-[41px] items-center justify-center gap-2 rounded-lg border border-[#dce5f1] bg-white px-3.5 text-[12px] font-semibold text-[#152b4b] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <RotateCcw size={14} />
                Reset
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
                {REPORT_COLUMNS.map((column) => (
                  <div key={column.key} className="min-w-0">
                    <label className="mb-1 block text-[11px] font-medium text-[#64748b] dark:text-slate-400">
                      {column.label}
                    </label>

                    <Einput
                      name={column.key}
                      type="text"
                      value={filters[column.key] || ""}
                      handleInputChange={(name: string, value: string) =>
                        handleFilterChange(column.key, value)
                      }
                      placeholder={`Search ${column.label.toLowerCase()}`}
                      className="h-[37px] w-full"
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
                    showTopSearch={false}
                    showExcelExport={true}
                    showColumnFilters={true}
                    initialPageSize={10}
                  />
                ) : (
                  <div className="flex min-h-[250px] flex-col items-center justify-center px-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                      <Search size={20} className="text-slate-400" />
                    </div>

                    <h3 className="mt-3 text-[14px] font-semibold text-[#152b4b] dark:text-slate-100">
                      No records found
                    </h3>

                    <p className="mt-1 text-[12px] text-[#64748b] dark:text-slate-400">
                      No Early & Late Punch records available for the selected
                      date and filter.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[290px] flex-col items-center justify-center px-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#dce5f1] bg-[#f8fafc] dark:border-slate-700 dark:bg-slate-800">
                <FileSpreadsheet
                  size={23}
                  className="text-[#64748b] dark:text-slate-400"
                />
              </div>

              <h3 className="mt-3 text-[14px] font-semibold text-[#152b4b] dark:text-slate-100">
                Early & Late Punch Report (30+ min)
              </h3>

              <p className="mt-1 max-w-[400px] text-[12px] leading-5 text-[#64748b] dark:text-slate-400">
                Select a date and punch filter, then click Show to view the
                report.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
