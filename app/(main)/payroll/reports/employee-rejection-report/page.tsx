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

const EMPLOYEE_REJECTION_API = "/employee/Employee_Rejection_Report";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type RejectionRow = {
  Emp_Code?: string;
  EMPLOYEENAME?: string;
  GENDER?: string;
  EmployeeType?: string;
  Department?: string;
  SECTION?: string;
  EMPLOYEEDESIGNATION?: string;
  Location?: string;
  dateoffice?: string;
  RejectBy?: string;
  Approver1Name?: string;
  Approver1Remark?: string;
  Approver2Name?: string;
  Approver2Remark?: string;
  Approver3Name?: string;
  Approver3Remark?: string;
  [key: string]: any;
};

type TableColumn = {
  Header: string;
  accessor: string;
  minWidth: number;
  width: number;
  Cell?: ({ value }: any) => React.ReactNode;
};

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const getCurrentDate = (monthsBack = 0) => {
  const today = new Date();

  today.setMonth(today.getMonth() - monthsBack);

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getText = (...values: any[]): string => {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      const text = String(value).trim();

      if (text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined") {
        return text;
      }
    }
  }

  return "";
};

const getApiError = (error: any) =>
  error?.response?.data?.Message ||
  error?.response?.data?.message ||
  error?.response?.data?.Error ||
  error?.message ||
  "Unable to fetch employee rejection report.";

// --------------------------------------------------
// DATE FORMAT
// --------------------------------------------------

const formatDate = (value: any) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", {
    month: "short",
  });
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
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
// COLUMN CONFIGURATION
// --------------------------------------------------

const REPORT_COLUMNS = [
  { key: "Emp_Code", label: "EMPLOYEE CODE", width: 140 },
  { key: "EMPLOYEENAME", label: "EMPLOYEE NAME", width: 240 },
  { key: "GENDER", label: "GENDER", width: 110 },
  { key: "EmployeeType", label: "EMPLOYEE TYPE", width: 160 },
  { key: "Department", label: "DEPARTMENT", width: 160 },
  { key: "SECTION", label: "SECTION", width: 140 },
  { key: "EMPLOYEEDESIGNATION", label: "EMPLOYEE DESIGNATION", width: 190 },
  { key: "Location", label: "LOCATION", width: 150 },
  { key: "dateoffice", label: "DATE OFFICE", width: 150 },
  { key: "RejectBy", label: "REJECT BY", width: 140 },
  { key: "Approver1Name", label: "APPROVER 1 NAME", width: 200 },
  { key: "Approver1Remark", label: "APPROVER 1 REMARK", width: 180 },
  { key: "Approver2Name", label: "APPROVER 2 NAME", width: 200 },
  { key: "Approver2Remark", label: "APPROVER 2 REMARK", width: 180 },
  { key: "Approver3Name", label: "APPROVER 3 NAME", width: 200 },
  { key: "Approver3Remark", label: "APPROVER 3 REMARK", width: 180 },
];

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

export default function EmployeeRejectionReportPage() {
  const user = useCurrentUser();
  const router = useRouter();

  // Date range hook returns an object, not an array.
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

  const [rows, setRows] = useState<RejectionRow[]>([]);
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
  // DATE VALIDATION
  // --------------------------------------------------

  const validateDates = useCallback(() => {
    if (!dateFrom || !dateTo) {
      showSideAlert("Please select both dates.", "warning");
      return false;
    }

    const from = new Date(`${dateFrom}T00:00:00`);
    const to = new Date(`${dateTo}T00:00:00`);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      showSideAlert("Please select valid dates.", "warning");
      return false;
    }

    if (from > to) {
      showSideAlert("Date from cannot be greater than date to.", "warning");
      return false;
    }

    return true;
  }, [dateFrom, dateTo]);

  // --------------------------------------------------
  // FETCH REPORT API
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

    if (!validateDates()) return;

    setLoading(true);
    setHasSearched(false);

    try {
      // Existing working API payload
      const payload = {
        Loc_code: user.branch,
        DateFrom: dateFrom,
        DateTo: dateTo,
      };

      console.log(
        "Employee Rejection Report URL:",
        `${process.env.NEXT_PUBLIC_URL}${EMPLOYEE_REJECTION_API}`,
      );

      console.log("Employee Rejection Report Payload:", payload);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${EMPLOYEE_REJECTION_API}`,
        payload,
        {
          headers: apiHeaders,
        },
      );

      console.log("Employee Rejection Report Response:", response?.data);

      // Existing API returns:
      // { success: true, result: [...] }

      if (response?.data?.success !== true) {
        const message =
          response?.data?.Message ||
          response?.data?.message ||
          "Invalid request. Unable to fetch employee rejection report.";

        setRows([]);
        setHasSearched(true);

        showSideAlert(message, "error");
        return;
      }

      const result = Array.isArray(response?.data?.result)
        ? response.data.result
        : [];

      // --------------------------------------------------
      // MAP API RESPONSE
      // --------------------------------------------------

      const mappedRows: RejectionRow[] = result.map((item: any) => {
        const trimmedRow: any = {};

        Object.keys(item || {}).forEach((key) => {
          const value = item[key];

          trimmedRow[key] = typeof value === "string" ? value.trim() : value;
        });

        return {
          ...trimmedRow,

          Emp_Code: getText(
            trimmedRow.EMPCODE,
            trimmedRow.Emp_Code,
            trimmedRow.emp_code,
          ),

          EMPLOYEENAME: getText(
            trimmedRow.EMPLOYEENAME,
            trimmedRow.EmployeeName,
            trimmedRow.EMP_NAME,
          ),

          GENDER: getText(trimmedRow.GENDER, trimmedRow.Gender),

          EmployeeType: getText(
            trimmedRow.EmployeeType,
            trimmedRow.EMPLOYEETYPE,
            trimmedRow.EMP_TYPE,
          ),

          Department: getText(trimmedRow.Department, trimmedRow.DEPARTMENT),

          SECTION: getText(trimmedRow.SECTION, trimmedRow.Section),

          EMPLOYEEDESIGNATION: getText(
            trimmedRow.EMPLOYEEDESIGNATION,
            trimmedRow.Designation,
            trimmedRow.DESIGNATION,
          ),

          Location: getText(trimmedRow.Location, trimmedRow.LOCATION),

          dateoffice: getText(
            trimmedRow.dateoffice,
            trimmedRow.DateOffice,
            trimmedRow.DATEOFFICE,
          ),

          RejectBy: getText(
            trimmedRow.Reject_By,
            trimmedRow.RejectBy,
            trimmedRow.REJECTBY,
            trimmedRow.REJECT_BY,
          ),

          // APPROVER 1
          Approver1Name: getText(
            trimmedRow.Approver1,
            trimmedRow.Approver1Name,
          ),

          Approver1Remark: getText(
            trimmedRow.Appr_1_Rem,
            trimmedRow.Approver1Remark,
          ),

          // APPROVER 2
          Approver2Name: getText(
            trimmedRow.Approver2,
            trimmedRow.Approver2Name,
          ),

          Approver2Remark: getText(
            trimmedRow.Appr_2_Rem,
            trimmedRow.Approver2Remark,
          ),

          // APPROVER 3
          Approver3Name: getText(
            trimmedRow.Approver3,
            trimmedRow.Approver3Name,
          ),

          Approver3Remark: getText(
            trimmedRow.Appr_3_Rem,
            trimmedRow.Approver3Remark,
          ),
        };
      });
      setRows(mappedRows);

      setFilters(
        Object.fromEntries(REPORT_COLUMNS.map((column) => [column.key, ""])),
      );

      setSearch("");
      setHasSearched(true);

      if (mappedRows.length === 0) {
        showSideAlert("No employee rejection records found.", "info");
      } else {
        showSideAlert(
          `${mappedRows.length} records fetched successfully.`,
          "success",
        );
      }
    } catch (error: any) {
      console.error(
        "Employee Rejection Report Error:",
        error?.response?.data || error,
      );

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
    dateFrom,
    dateTo,
    apiHeaders,
    validateDates,
  ]);

  // --------------------------------------------------
  // INITIAL DATA FETCH
  // Fetch when user/company/branch becomes available.
  // Date changes alone will not automatically call API.
  // --------------------------------------------------

  useEffect(() => {
    if (user?.Comp_Code && user?.branch) {
      fetchReport();
    }

    // Date changes are handled by the Show button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.Comp_Code, user?.branch]);

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
  // COLUMN FILTER CHANGE
  // --------------------------------------------------

  const handleFilterChange = (name: string, value: string) => {
    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // --------------------------------------------------
  // FILTERED DATA
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
      Header: column.label,
      accessor: column.key,
      minWidth: column.width,
      width: column.width,

      Cell: ({ value }: any) => {
        if (value === null || value === undefined || value === "") {
          return <span className="text-slate-400">—</span>;
        }

        if (column.key === "Emp_Code" || column.key === "RejectBy") {
          return (
            <span className="font-mono text-[12px] font-bold text-[#152b4b] dark:text-slate-200">
              {String(value).toUpperCase()}
            </span>
          );
        }

        if (column.key === "dateoffice") {
          return (
            <span className="whitespace-nowrap text-[13px] text-[#152b4b] dark:text-slate-300">
              {formatDate(value)}
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
  }, []);

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
  // RENDER
  // --------------------------------------------------

  return (
    <div className="min-h-screen min-w-0 bg-[#f5f8fc] p-3 transition-colors dark:bg-[#0b1220] sm:p-4 lg:p-5">
      <HashloaderComponent isLoading={loading} />

      <div className="mx-auto max-w-[1800px] space-y-4">
        {/* PAGE HEADER */}

        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[20px] font-bold leading-tight text-[#152b4b] dark:text-slate-100 sm:text-[23px]">
            Employee Rejection Report
          </h1>
        </div>

        {/* DATE FILTER CARD */}

        <div className="rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(220px,360px)_minmax(220px,360px)_auto]">
            {/* DATE FROM */}

            <div className="min-w-0">
              <Einput
                name="dateFrom"
                type="date"
                title="Date from"
                value={dateFrom}
                handleInputChange={handleDateChange}
                className="h-[41px] w-full"
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
                className="h-[41px] w-full"
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
            <div className="w-full min-w-0 ">
              <div >
                {filteredRows.length > 0 ? (
                  <DataTable
                    columns={columns}
                    data={filteredRows}
                    showTopSearch={true}
                    resetFilters={true}
                    showExcelExport={true}
                    showColumnFilters={true}
                    showPageSizeInFooter={true}
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
                      No employee rejection records available for the selected
                      dates.
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
                Employee Rejection Report
              </h3>

              <p className="mt-1 max-w-[400px] text-[12px] leading-5 text-[#64748b] dark:text-slate-400">
                Select the date range and click Show to view the employee
                rejection report.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
