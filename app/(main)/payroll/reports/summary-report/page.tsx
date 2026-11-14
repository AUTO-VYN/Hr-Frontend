
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

import {
  Search,
  RotateCcw,
  FileSpreadsheet,
  X,
  ArrowLeft,
  Filter,
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

const DEVIATION_SUMMARY_API = "/hrmsreport/getDevStatusSummary";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type DeviationRow = {
  Emp_Code?: string;
  EMPLOYEENAME?: string;
  GENDER?: string;
  EmployeeType?: string;
  Department?: string;
  SECTION?: string;
  EMPLOYEEDESIGNATION?: string;
  Location?: string;
  DEVIATION_DAYS?: string | number;
  TotalDevEntries?: string | number;
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
    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    ) {
      return String(value);
    }
  }

  return "";
};

const getResponseArray = (response: any): any[] => {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.result)) {
    return response.result;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.Data)) {
    return response.Data;
  }

  if (Array.isArray(response?.Result)) {
    return response.Result;
  }

  if (Array.isArray(response?.records)) {
    return response.records;
  }

  if (Array.isArray(response?.rows)) {
    return response.rows;
  }

  if (Array.isArray(response?.Table)) {
    return response.Table;
  }

  if (Array.isArray(response?.recordset)) {
    return response.recordset;
  }

  return [];
};

const getApiError = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.message ||
  "Unable to fetch deviation summary report.";

// --------------------------------------------------
// ALERT
// --------------------------------------------------

const showSideAlert = (
  message: string,
  type: "success" | "error" | "warning" | "info" = "info"
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
  {
    key: "Emp_Code",
    label: "EMP CODE",
    width: 150,
  },
  {
    key: "EMPLOYEENAME",
    label: "EMPLOYEE NAME",
    width: 260,
  },
  {
    key: "GENDER",
    label: "GENDER",
    width: 130,
  },
  {
    key: "EmployeeType",
    label: "EMPLOYEE TYPE",
    width: 180,
  },
  {
    key: "Department",
    label: "DEPARTMENT",
    width: 180,
  },
  {
    key: "SECTION",
    label: "SECTION",
    width: 150,
  },
  {
    key: "EMPLOYEEDESIGNATION",
    label: "DESIGNATION",
    width: 190,
  },
  {
    key: "Location",
    label: "LOCATION",
    width: 160,
  },
  {
    key: "DEVIATION_DAYS",
    label: "DEVIATION DAYS",
    width: 150,
  },
];

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

export default function DeviationSummaryReportPage() {
  const user = useCurrentUser();
  const router = useRouter();

  // useDateRange returns an object, not an array.
  const globalDateRange = useDateRange();

  // --------------------------------------------------
  // DATE STATES
  // --------------------------------------------------

  const [dateFrom, setDateFrom] = useState(
    globalDateRange?.from || getCurrentDate(1)
  );

  const [dateTo, setDateTo] = useState(
    globalDateRange?.to || getCurrentDate()
  );

  // --------------------------------------------------
  // REPORT STATES
  // --------------------------------------------------

  const [rows, setRows] = useState<DeviationRow[]>([]);

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
    [user?.Comp_Code]
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

    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime())
    ) {
      showSideAlert("Please select valid dates.", "warning");
      return false;
    }

    if (from > to) {
      showSideAlert(
        "Date from cannot be greater than date to.",
        "warning"
      );
      return false;
    }

    return true;
  }, [dateFrom, dateTo]);

  // --------------------------------------------------
  // MAP API RESPONSE
  // --------------------------------------------------

  const mapReportRows = useCallback(
    (result: any[]): DeviationRow[] => {
      return result.map((item: any) => {
        const deviationDays = getText(
          item?.TotalDevEntries,
          item?.DEVIATION_DAYS,
          item?.DeviationDays,
          item?.DEVIATION_DAYS_COUNT,
          item?.DEV_DAYS,
          item?.Dev_Days,
          item?.Deviation_Days,
          item?.DEVIATION,
          item?.Deviation,
          item?.DEV_DAYS_COUNT
        );

        return {
          ...item,

          Emp_Code: getText(
            item?.Emp_Code,
            item?.EMPCODE,
            item?.EmpCode,
            item?.EMP_CODE
          ),

          EMPLOYEENAME: getText(
            item?.EMPLOYEENAME,
            item?.EMPLOYEE_NAME,
            item?.EmployeeName,
            item?.EmpName,
            item?.EMP_NAME,
            item?.Emp_Name
          ),

          GENDER: getText(
            item?.GENDER,
            item?.Gender,
            item?.SEX
          ),

          EmployeeType: getText(
            item?.EmployeeType,
            item?.EMPLOYEE_TYPE,
            item?.Emp_Type,
            item?.EMP_TYPE
          ),

          Department: getText(
            item?.Department,
            item?.DEPARTMENT,
            item?.DEPT_NAME,
            item?.Dept_Name
          ),

          SECTION: getText(
            item?.SECTION,
            item?.Section,
            item?.SECTION_NAME,
            item?.Section_Name
          ),

          EMPLOYEEDESIGNATION: getText(
            item?.EMPLOYEEDESIGNATION,
            item?.DESIGNATION,
            item?.Designation,
            item?.DESIG_NAME,
            item?.Desig_Name
          ),

          Location: getText(
            item?.Location,
            item?.LOCATION,
            item?.BRANCH_NAME,
            item?.Branch_Name,
            item?.BRANCH
          ),

          DEVIATION_DAYS: deviationDays,
          TotalDevEntries: deviationDays,
        };
      });
    },
    []
  );

  // --------------------------------------------------
  // FETCH REPORT
  // --------------------------------------------------

  const fetchReport = useCallback(async () => {
    if (!user?.Comp_Code) {
      showSideAlert(
        "Company information missing. Please login again.",
        "warning"
      );
      return;
    }

    if (!user?.branch) {
      showSideAlert(
        "Branch information missing.",
        "warning"
      );
      return;
    }

    if (!validateDates()) return;

    setLoading(true);
    setHasSearched(false);

    try {
      // Existing API payload from your old page.
      const payload = {
        Loc_code: user?.branch,
        DateFrom: dateFrom,
        DateTo: dateTo,
      };

      console.log("Deviation Summary Payload:", payload);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${DEVIATION_SUMMARY_API}`,
        payload,
        {
          headers: apiHeaders,
        }
      );

      console.log(
        "Deviation Summary Response:",
        response.data
      );

      const responseData = response?.data;

      if (
        responseData?.Status === false ||
        responseData?.status === false ||
        responseData?.success === false
      ) {
        throw new Error(
          responseData?.message ||
          responseData?.Message ||
          "Unable to fetch report."
        );
      }

      // Existing API response: response.data.result
      const result = getResponseArray(responseData);

      const mappedRows = mapReportRows(result);

      setRows(mappedRows);

      setFilters(
        Object.fromEntries(
          REPORT_COLUMNS.map((column) => [column.key, ""])
        )
      );

      setSearch("");
      setHasSearched(true);

      if (mappedRows.length === 0) {
        showSideAlert(
          "No deviation records found.",
          "info"
        );
      } else {
        showSideAlert(
          `${mappedRows.length} records fetched successfully.`,
          "success"
        );
      }
    } catch (error: any) {
      console.error(
        "Deviation Summary Report Error:",
        error
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
    mapReportRows,
  ]);

  // --------------------------------------------------
  // INITIAL DATA FETCH
  // --------------------------------------------------

  useEffect(() => {
    if (user?.Comp_Code && user?.branch) {
      fetchReport();
    }
  }, [
    user?.Comp_Code,
    user?.branch,
    fetchReport,
  ]);

  // --------------------------------------------------
  // DATE CHANGE
  // --------------------------------------------------

  const handleDateChange = (
    name: string,
    value: string
  ) => {
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

  const handleFilterChange = (
    name: string,
    value: string
  ) => {
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
            .includes(query)
        );

      const matchesColumns = Object.entries(filters).every(
        ([key, value]) => {
          if (!value.trim()) return true;

          return String(row[key] ?? "")
            .toLowerCase()
            .includes(value.trim().toLowerCase());
        }
      );

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
        if (
          value === null ||
          value === undefined ||
          value === ""
        ) {
          return (
            <span className="text-slate-400">—</span>
          );
        }

        if (column.key === "Emp_Code") {
          return (
            <span className="font-mono text-[12px] font-bold text-[#152b4b] dark:text-slate-200">
              {String(value).toUpperCase()}
            </span>
          );
        }

        if (column.key === "DEVIATION_DAYS") {
          return (
            <span className="whitespace-nowrap text-[13px] font-semibold text-[#152b4b] dark:text-slate-200">
              {String(value)}
            </span>
          );
        }

        return (
          <span className="whitespace-nowrap text-[13px] text-[#152b4b] dark:text-slate-300">
            {String(value).toUpperCase()}
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
      Object.fromEntries(
        REPORT_COLUMNS.map((column) => [column.key, ""])
      )
    );
  };

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
          <h1 className="text-[20px] font-bold leading-tight text-[#152b4b] dark:text-slate-100 sm:text-[23px]">
            Dev Summary Report
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
                  handleInputChange={(
                    name: string,
                    value: string
                  ) => setSearch(value)}
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
                  <div
                    key={column.key}
                    className="min-w-0"
                  >
                    <label className="mb-1 block text-[11px] font-medium text-[#64748b] dark:text-slate-400">
                      {column.label}
                    </label>

                    <Einput
                      name={column.key}
                      type="text"
                      value={filters[column.key] || ""}
                      handleInputChange={(
                        name: string,
                        value: string
                      ) =>
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
                      <Search
                        size={20}
                        className="text-slate-400"
                      />
                    </div>

                    <h3 className="mt-3 text-[14px] font-semibold text-[#152b4b] dark:text-slate-100">
                      No records found
                    </h3>

                    <p className="mt-1 text-[12px] text-[#64748b] dark:text-slate-400">
                      No deviation records available for the selected dates.
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
                Deviation Summary Report
              </h3>

              <p className="mt-1 max-w-[400px] text-[12px] leading-5 text-[#64748b] dark:text-slate-400">
                Select the date range and click Show to view
                the deviation summary report.
              </p>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
