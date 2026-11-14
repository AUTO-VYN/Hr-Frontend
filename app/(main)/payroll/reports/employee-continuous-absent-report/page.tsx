
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

// --------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------

const CONTINUOUS_ABSENT_API =
  "/hrmsreport/getContinuousAbsentReport";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type AbsentRow = {
  EMPCODE?: string;
  EMP_NAME?: string;
  LOCATION?: string;
  SECTION?: string;
  DESIGNATION?: string;
  CHANNEL?: string;
  CLUSTER?: string;
  DEPARTMENT?: string;
  EMPLOYEE_TYPE?: string;
  JOINING_DATE?: string;
  MOBILENO?: string;
  CORPORATEMAILID?: string;
  PUNCHCODE?: string;
  EMP_SHIFT?: string;
  From_Date?: string;
  To_Date?: string;
  Absent_Days?: string | number;
  [key: string]: any;
};

type ReportColumn = {
  key: string;
  label: string;
  width: number;
  date?: boolean;
  numeric?: boolean;
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

const getCurrentDate = () => {
  const today = new Date();

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
  "Unable to fetch continuous absent report.";

const formatDate = (value: any): string => {
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
    key: "LOCATION",
    label: "LOCATION",
    width: 150,
  },
  {
    key: "SECTION",
    label: "SECTION",
    width: 140,
  },
  {
    key: "DESIGNATION",
    label: "DESIGNATION",
    width: 190,
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
    key: "DEPARTMENT",
    label: "DEPARTMENT",
    width: 180,
  },
  {
    key: "EMPLOYEE_TYPE",
    label: "EMP TYPE",
    width: 150,
  },
  {
    key: "JOINING_DATE",
    label: "JOINING DATE",
    width: 160,
    date: true,
  },
  {
    key: "MOBILENO",
    label: "MOBILE",
    width: 150,
  },
  {
    key: "CORPORATEMAILID",
    label: "EMAIL",
    width: 230,
  },
  {
    key: "PUNCHCODE",
    label: "PUNCH CODE",
    width: 150,
  },
  {
    key: "EMP_SHIFT",
    label: "SHIFT",
    width: 130,
  },
  {
    key: "From_Date",
    label: "FROM DATE",
    width: 150,
    date: true,
  },
  {
    key: "To_Date",
    label: "TO DATE",
    width: 150,
    date: true,
  },
  {
    key: "Absent_Days",
    label: "ABSENT DAYS",
    width: 140,
    numeric: true,
  },
];

// --------------------------------------------------
// MAP API RESPONSE
// --------------------------------------------------

const mapReportRows = (result: any[]): AbsentRow[] => {
  return result.map((item: any) => ({
    ...item,

    EMPCODE: getText(
      item?.EMPCODE,
      item?.Emp_Code,
      item?.EmpCode,
      item?.EMP_CODE,
      item?.EmployeeCode
    ),

    EMP_NAME: getText(
      item?.EMP_NAME,
      item?.EMPLOYEENAME,
      item?.EMPLOYEE_NAME,
      item?.EmployeeName,
      item?.EmpName,
      item?.Emp_Name
    ),

    LOCATION: getText(
      item?.LOCATION,
      item?.Location,
      item?.BRANCH_NAME,
      item?.Branch_Name,
      item?.BRANCH,
      item?.LOC_NAME
    ),

    SECTION: getText(
      item?.SECTION,
      item?.Section,
      item?.SECTION_NAME,
      item?.Section_Name
    ),

    DESIGNATION: getText(
      item?.DESIGNATION,
      item?.EMPLOYEEDESIGNATION,
      item?.Designation,
      item?.DESIG_NAME,
      item?.Desig_Name
    ),

    CHANNEL: getText(
      item?.CHANNEL,
      item?.Channel,
      item?.CHANNEL_NAME,
      item?.Channel_Name
    ),

    CLUSTER: getText(
      item?.CLUSTER,
      item?.Cluster,
      item?.CLUSTER_NAME,
      item?.Cluster_Name
    ),

    DEPARTMENT: getText(
      item?.DEPARTMENT,
      item?.Department,
      item?.DEPT_NAME,
      item?.Dept_Name
    ),

    EMPLOYEE_TYPE: getText(
      item?.EMPLOYEE_TYPE,
      item?.EmployeeType,
      item?.Emp_Type,
      item?.EMP_TYPE
    ),

    JOINING_DATE: getText(
      item?.JOINING_DATE,
      item?.JOININGDATE,
      item?.JoiningDate,
      item?.DOJ,
      item?.DateOfJoining
    ),

    MOBILENO: getText(
      item?.MOBILENO,
      item?.MOBILE_NO,
      item?.MobileNo,
      item?.Mobile,
      item?.PHONE
    ),

    CORPORATEMAILID: getText(
      item?.CORPORATEMAILID,
      item?.CORPORATE_EMAIL_ID,
      item?.EMAIL,
      item?.Email,
      item?.EmailId
    ),

    PUNCHCODE: getText(
      item?.PUNCHCODE,
      item?.PUNCH_CODE,
      item?.PunchCode,
      item?.Punch_Code
    ),

    EMP_SHIFT: getText(
      item?.EMP_SHIFT,
      item?.SHIFT,
      item?.Shift,
      item?.Shift_Name
    ),

    From_Date: getText(
      item?.From_Date,
      item?.FROM_DATE,
      item?.FromDate,
      item?.ABSENT_FROM
    ),

    To_Date: getText(
      item?.To_Date,
      item?.TO_DATE,
      item?.ToDate,
      item?.ABSENT_TO
    ),

    Absent_Days: getText(
      item?.Absent_Days,
      item?.ABSENT_DAYS,
      item?.AbsentDays,
      item?.ABSENT_COUNT,
      item?.TOTAL_ABSENT_DAYS
    ),
  }));
};

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

export default function ContinuousAbsentReportPage() {
  const user = useCurrentUser();
  const router = useRouter();

  // --------------------------------------------------
  // STATES
  // --------------------------------------------------

  const [reportDate, setReportDate] = useState(getCurrentDate());

  const [rows, setRows] = useState<AbsentRow[]>([]);

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

  const validateDate = useCallback(() => {
    if (!reportDate) {
      showSideAlert("Please select report date.", "warning");
      return false;
    }

    const selectedDate = new Date(`${reportDate}T00:00:00`);

    if (Number.isNaN(selectedDate.getTime())) {
      showSideAlert("Please select a valid date.", "warning");
      return false;
    }

    return true;
  }, [reportDate]);

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
      showSideAlert("Branch information missing.", "warning");
      return;
    }

    if (!validateDate()) return;

    setLoading(true);
    setHasSearched(false);

    try {
      // Keep the original API payload key: reportDate
      const payload = {
        reportDate: reportDate,
        Loc_code: user?.branch,
      };

      console.log("Continuous Absent Payload:", payload);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${CONTINUOUS_ABSENT_API}`,
        payload,
        {
          headers: apiHeaders,
        }
      );

      console.log("Continuous Absent Response:", response.data);

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
          "No continuous absent records found.",
          "info"
        );
      } else {
        showSideAlert(
          `${mappedRows.length} records fetched successfully.`,
          "success"
        );
      }
    } catch (error: any) {
      console.error("Continuous Absent Report Error:", error);

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
    apiHeaders,
    validateDate,
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
  // FILTER CHANGE
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

        if (column.numeric) {
          return (
            <span className="whitespace-nowrap text-[13px] font-bold text-red-600">
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
            Continuous Absent Report (3+ days)
          </h1>

       
        </div>

        {/* REPORT DATE FILTER */}

        <div className="rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-[minmax(220px,360px)_auto]">
            <div className="min-w-0">
              <Einput
                name="reportDate"
                type="date"
                title="Report date"
                value={reportDate}
                handleInputChange={handleDateChange}
                className="h-[41px] w-full"
              />
            </div>

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
            <div className="shrink-0">
              <p className="text-[13px] font-medium text-[#64748b] dark:text-slate-400">
                <span className="font-semibold text-[#152b4b] dark:text-slate-100">
                  {filteredRows.length}
                </span>{" "}
                of {rows.length} rows
              </p>
            </div>

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
                      No continuous absent records available for the selected
                      date.
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
                Continuous Absent Report (3+ days)
              </h3>

              <p className="mt-1 max-w-[400px] text-[12px] leading-5 text-[#64748b] dark:text-slate-400">
                Select the report date and click Show to view continuous absent
                employees.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
