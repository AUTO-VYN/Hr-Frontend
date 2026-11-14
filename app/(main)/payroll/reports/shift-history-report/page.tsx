"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

import { Search, RotateCcw, FileSpreadsheet, X, ArrowLeft } from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useDateRange } from "@/app/hooks/use-date-range";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

// --------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------

const SHIFT_HISTORY_API = "/employee/Shift_Change_History_Report";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type ShiftHistoryRow = {
  EMPCODE: string;
  ATTENDANCE_DATE: string;
  SHIFT: string;
  CREATED_BY: string;
  CREATED_AT: string;
  MODIFIED_ON: string;
  MODIFIED_BY: string;
  LOCATION: string;
  [key: string]: any;
};

type TableColumn = {
  Header: string;
  accessor: string;
  minWidth: number;
  width: number;
  Cell: ({ value }: any) => React.ReactNode;
};

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const getText = (...values: any[]): string => {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value);
    }
  }

  return "";
};

const getApiError = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.message ||
  "Unable to fetch shift history.";

const getCurrentDate = (monthsBack = 0) => {
  const today = new Date();

  today.setMonth(today.getMonth() - monthsBack);

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getResponseArray = (response: any): any[] => {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.result)) return response.result;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.Data)) return response.Data;

  return [];
};

// API date formatting: DD MMM YYYY
const formatDate = (value: any) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// API datetime formatting
const formatDateTime = (value: any) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

// --------------------------------------------------
// ALERT
// --------------------------------------------------

const showSideAlert = (message: string, type: any = "info") => {
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
// MAIN PAGE
// --------------------------------------------------

export default function ShiftHistoryReportPage() {
  const user = useCurrentUser();
  const router = useRouter();

  const globalDateRange = useDateRange();

  // --------------------------------------------------
  // DATE STATES
  // --------------------------------------------------

  const [dateFrom, setDateFrom] = useState(
    globalDateRange?.from || getCurrentDate(1),
  );

  const [dateTo, setDateTo] = useState(globalDateRange?.to || getCurrentDate());

  // --------------------------------------------------
  // REPORT STATES
  // --------------------------------------------------

  const [rows, setRows] = useState<ShiftHistoryRow[]>([]);

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
  // TABLE HEADERS
  // --------------------------------------------------

  const reportHeaders = useMemo(
    () => [
      "EMPCODE",
      "ATTENDANCE_DATE",
      "SHIFT",
      "CREATED_BY",
      "CREATED_AT",
      "MODIFIED_ON",
      "MODIFIED_BY",
      "LOCATION",
    ],
    [],
  );

  // --------------------------------------------------
  // COLUMN LABELS
  // --------------------------------------------------

  const columnLabels: Record<string, string> = {
    EMPCODE: "EMP CODE",
    ATTENDANCE_DATE: "ATTENDANCE DATE",
    SHIFT: "SHIFT",
    CREATED_BY: "CREATED BY",
    CREATED_AT: "CREATED AT",
    MODIFIED_ON: "MODIFIED ON",
    MODIFIED_BY: "MODIFIED BY",
    LOCATION: "LOCATION",
  };

  // --------------------------------------------------
  // FETCH SHIFT HISTORY
  // --------------------------------------------------

  const fetchShiftHistory = useCallback(
    async (fromDate = dateFrom, toDate = dateTo) => {
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

      if (!fromDate || !toDate) {
        showSideAlert("Please select both dates.", "warning");
        return;
      }

      if (fromDate > toDate) {
        showSideAlert("Date from cannot be greater than date to.", "warning");
        return;
      }

      setLoading(true);

      setRows([]);
      setHasSearched(false);

      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}${SHIFT_HISTORY_API}`,
          {
            Loc_code: user.branch,
            DateFrom: fromDate,
            DateTo: toDate,
          },
          {
            headers: apiHeaders,
          },
        );

        console.log("Shift History API Response:", response.data);

        const responseData = response.data;

        if (
          responseData?.Status === false ||
          responseData?.status === false ||
          responseData?.success === false
        ) {
          throw new Error(
            responseData?.message ||
              responseData?.Message ||
              "Unable to fetch shift history.",
          );
        }

        // ------------------------------------------
        // GET API DATA
        // ------------------------------------------

        const result = getResponseArray(responseData);

        // ------------------------------------------
        // MAP ACTUAL API RESPONSE FIELDS
        // ------------------------------------------

        const mappedRows: ShiftHistoryRow[] = result.map((item: any) => ({
          ...item,

          EMPCODE: getText(item.EMPCODE, item.EmpCode),

          ATTENDANCE_DATE: getText(item.Atn_Date, item.ATTENDANCE_DATE),

          SHIFT: getText(item.Shift, item.SHIFT),

          CREATED_BY: getText(item.Created_By, item.CREATED_BY),

          CREATED_AT: getText(item.Created_At, item.CREATED_AT),

          MODIFIED_ON: getText(item.MOD_DATE, item.MODIFIED_ON),

          MODIFIED_BY: getText(item.MOD_USER, item.MODIFIED_BY),

          LOCATION: getText(item.Location_Name, item.LOCATION),
        }));

        setRows(mappedRows);

        setFilters(
          Object.fromEntries(reportHeaders.map((header) => [header, ""])),
        );

        setSearch("");
        setHasSearched(true);

        if (!mappedRows.length) {
          showSideAlert("No shift history records found.", "info");
        } else {
          showSideAlert(
            `${mappedRows.length} records fetched successfully.`,
            "success",
          );
        }
      } catch (error: any) {
        console.error("Shift History Report Error:", error);

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
    },
    [
      user?.Comp_Code,
      user?.branch,
      apiHeaders,
      dateFrom,
      dateTo,
      reportHeaders,
    ],
  );

  // --------------------------------------------------
  // INITIAL API CALL
  // --------------------------------------------------

  useEffect(() => {
    if (user?.Comp_Code && user?.branch) {
      fetchShiftHistory(dateFrom, dateTo);
    }
  }, [user?.Comp_Code, user?.branch, fetchShiftHistory]);

  // --------------------------------------------------
  // DATE CHANGE
  // --------------------------------------------------

  const handleDateChange = (name: string, value: string) => {
    if (name === "dateFrom") {
      setDateFrom(value);
    }

    if (name === "dateTo") {
      setDateTo(value);
    }
  };

  // --------------------------------------------------
  // COLUMN FILTER HANDLING
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

    setFilters(Object.fromEntries(reportHeaders.map((header) => [header, ""])));
  };

  // --------------------------------------------------
  // FILTERED DATA
  // --------------------------------------------------

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        reportHeaders.some((header) =>
          String(row[header] ?? "")
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
  }, [rows, search, filters, reportHeaders]);

  // --------------------------------------------------
  // TABLE COLUMNS
  // --------------------------------------------------

  const columns = useMemo((): TableColumn[] => {
    return reportHeaders.map((header) => ({
      Header: columnLabels[header] || header,

      accessor: header,

      minWidth: 140,

      width:
        header === "ATTENDANCE_DATE" ||
        header === "CREATED_AT" ||
        header === "MODIFIED_ON"
          ? 190
          : header === "LOCATION"
            ? 150
            : 160,

      Cell: ({ value }: any) => {
        if (value === null || value === undefined || value === "") {
          return <span className="text-slate-400">—</span>;
        }

        // Employee code
        if (header === "EMPCODE") {
          return (
            <span className="font-mono text-[12px] font-bold text-[#152b4b] dark:text-slate-200">
              {String(value)}
            </span>
          );
        }

        // Attendance date
        if (header === "ATTENDANCE_DATE") {
          return (
            <span className="whitespace-nowrap text-[12px] text-[#152b4b] dark:text-slate-300">
              {formatDate(value)}
            </span>
          );
        }

        // Created date
        if (header === "CREATED_AT") {
          return (
            <span className="whitespace-nowrap text-[12px] text-[#152b4b] dark:text-slate-300">
              {formatDateTime(value)}
            </span>
          );
        }

        // Modified date
        if (header === "MODIFIED_ON") {
          return (
            <span className="whitespace-nowrap text-[12px] text-[#152b4b] dark:text-slate-300">
              {formatDate(value)}
            </span>
          );
        }

        // Shift
        if (header === "SHIFT") {
          return (
            <span className="font-medium text-[#152b4b] dark:text-slate-200">
              {String(value).toUpperCase()}
            </span>
          );
        }

        return (
          <span className="text-[12px] text-[#152b4b] dark:text-slate-300">
            {String(value)}
          </span>
        );
      },
    }));
  }, [reportHeaders]);

  // --------------------------------------------------
  // BACK BUTTON
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
          <div className="min-w-0">
            <h1 className="text-[20px] font-bold leading-tight text-[#152b4b] dark:text-slate-100 sm:text-[23px]">
              Shift History Report
            </h1>
          </div>
        </div>

        {/* DATE FILTER CARD */}

        <div className="rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(250px,358px)_minmax(250px,358px)_auto]">
            {/* DATE FROM */}

            <div className="min-w-0">
              <Einput
                name="dateFrom"
                type="date"
                title="Date from"
                value={dateFrom}
                handleInputChange={handleDateChange}
                className="h-[40px] w-full"
              />
            </div>

            {/* DATE TO */}

            <div className="min-w-0">
              <Einput
                name="dateTo"
                type="date"
                title="Date to"
                value={dateTo}
                handleInputChange={handleDateChange}
                className="h-[40px] w-full"
              />
            </div>

            {/* SHOW BUTTON */}

            <div className="flex items-end">
              <AButton
                type="button"
                onClick={() => fetchShiftHistory()}
                disabled={loading}
                className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-7 text-[13px] font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
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
              {/* SEARCH */}

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
                {reportHeaders.map((header) => (
                  <div key={header} className="min-w-0">
                    <label className="mb-1 block text-[11px] font-medium text-[#64748b] dark:text-slate-400">
                      {columnLabels[header] || header}
                    </label>

                    <Einput
                      name={header}
                      type="text"
                      value={filters[header] || ""}
                      handleInputChange={(name: string, value: string) =>
                        handleFilterChange(header, value)
                      }
                      placeholder={`Search ${(columnLabels[header] || header).toLowerCase()}`}
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
                      No shift history available for the selected date range.
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
                Shift History Report
              </h3>

              <p className="mt-1 max-w-[400px] text-[12px] leading-5 text-[#64748b] dark:text-slate-400">
                Select Date From and Date To, then click Show to view the shift
                history report.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
