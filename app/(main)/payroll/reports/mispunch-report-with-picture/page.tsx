"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

import { Search, RotateCcw, X, FileSpreadsheet } from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

// --------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------

const DATE_RANGE_API = "/hrmsreport/getDateRange";

const APPROVAL_REPORT_API = "/hrmsreport/OD_report_With_Pic";

const ATTENDANCE_REPORT_API = "/hrmsreport/attendance";

const STATUS_API_MAP: Record<string, number> = {
  "2": 1,
  "1": 2,
  "0": 3,
};

const ALL_BACKEND_STATUSES = [1, 2, 3];

const FETCH_PAGE_SIZE = 500;

const PREFERRED_HEADERS = [
  "srno",
  "Employee Code",
  "Employee Name",
  "Designation",
  "Department",
  "Section",
  "Branch",
  "Region",
  "Channel",
  "Cluster",
  "OD Type",
  "Start From",
  "End From",
  "Applied Type",
  "Total_OD_Days",
  "OD Status",
  "Approver 1 Name",
  "Approver 1 Action Status",
  "Approver 2 Name",
  "Approver 2 Action Status",
  "Approver 3 Name",
  "Approver 3 Action Status",
];

const ATTENDANCE_HEADERS = [
  "Srno",
  "Employee Code",
  "Employee Name",
  "Joining Date",
  "Region",
  "Channel",
  "Cluster",
  "Location",
  "Section",
  "Department",
  "Designation",
  "Paid Days",
  "Total Penalty Days",
  "Month Count",
];

const HIDDEN_KEYS = ["__rowId", "fileIn", "fileOut"];

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type SelectOption = {
  value: string;
  label: string;
};

type ReportRow = {
  [key: string]: any;
};

type ReportColumn = {
  Header: string;
  accessor: string;
  minWidth: number;
  width: number;
  Cell?: ({ value }: any) => React.ReactNode;
};

// --------------------------------------------------
// OPTIONS
// --------------------------------------------------

const REPORT_TYPE_OPTIONS: SelectOption[] = [
  {
    value: "Approval report",
    label: "Approval report",
  },
  {
    value: "Attendance report",
    label: "Attendance report",
  },
];

const STATUS_OPTIONS: SelectOption[] = [
  {
    value: "2",
    label: "Pending",
  },
  {
    value: "1",
    label: "Approved",
  },
  {
    value: "0",
    label: "Rejected",
  },
];

// --------------------------------------------------
// DATE HELPERS
// --------------------------------------------------

const getMonthStart = () => {
  const today = new Date();

  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0",
  )}-01`;
};

const getMonthEnd = () => {
  const today = new Date();

  const lastDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(lastDate.getDate()).padStart(2, "0")}`;
};

const getMonthEndOf = (value: string): string | null => {
  const parts = String(value || "").split("-");

  if (parts.length !== 3) return null;

  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);

  if (Number.isNaN(y) || Number.isNaN(m)) return null;

  const lastDate = new Date(y, m, 0);

  return `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(lastDate.getDate()).padStart(2, "0")}`;
};

// --------------------------------------------------
// COMMON HELPERS
// --------------------------------------------------

const getResponseArray = (response: any): any[] => {
  if (Array.isArray(response)) return response;

  const possibleArrays = [
    response?.data,
    response?.Data,
    response?.result,
    response?.Result,
    response?.records,
    response?.rows,
    response?.Table,
    response?.recordset,
    response?.data?.data,
    response?.data?.Data,
    response?.data?.result,
    response?.data?.Result,
  ];

  return possibleArrays.find(Array.isArray) || [];
};

const getApiError = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.response?.data?.error ||
  error?.message ||
  "Unable to fetch Mis-Punch Approver Report.";

const showSideAlert = (
  message: string,
  type: "success" | "error" | "warning" | "info" = "info",
) => {
  Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  }).fire({
    icon: type,
    title: message,
  });
};

// --------------------------------------------------
// FORMAT HELPERS
// --------------------------------------------------

const formatDate = (value: any): string => {
  if (!value) return "";

  const raw = String(value);

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    const date = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
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

const formatDateTime = (value: any): string => {
  if (!value) return "";

  const raw = String(value);
  const parts = raw.split(/[ T]/);
  const datePart = parts[0];
  const timePart = parts[1];

  if (!datePart) return raw;

  const [year, month, day] = datePart.split("-");

  if (!year || !month || !day) return raw;

  const formattedDate = `${day}-${month}-${year}`;

  if (!timePart) return formattedDate;

  const timeOnly = timePart.split(".")[0];

  return `${formattedDate} ${timeOnly}`;
};

const isDateTimeColumn = (key: string) => {
  const normalized = key.toUpperCase();

  return normalized === "START FROM" || normalized === "END FROM";
};

const isDateColumn = (key: string) => {
  return /DATE|DT|TIME/i.test(key);
};

const getColumnLabel = (key: string) => {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .toUpperCase();
};

// --------------------------------------------------
// RESPONSE MAPPING
// --------------------------------------------------

const mapReportRows = (result: any[], headers: string[] = []): ReportRow[] => {
  return result.map((item: any, index: number) => {
    if (Array.isArray(item)) {
      const mapped: ReportRow = {};

      headers.forEach((header, i) => {
        mapped[header] = item[i];
      });

      return mapped;
    }

    return {
      ...item,
      __rowId: index + 1,
    };
  });
};

const normalizeFieldName = (key: string) =>
  String(key || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const ATTENDANCE_FIELD_ALIASES: Record<string, string[]> = {
  "Employee Code": [
    "EmployeeCode",
    "EmpCode",
    "EMP_CODE",
    "EMPCODE",
    "EMP_CODE1",
    "Code",
  ],

  "Employee Name": [
    "EmployeeName",
    "EmpName",
    "EMP_NAME",
    "EMPNAME",
    "Name",
    "Emp_Name",
  ],

  "Joining Date": [
    "JoiningDate",
    "DOJ",
    "DateOfJoining",
    "JoinDate",
    "JOIN_DATE",
    "DATE_OF_JOINING",
  ],

  Region: [
    "Region",
    "Sal_Region",
    "SAL_REGION",
    "RegionName",
  ],

  Channel: [
    "Channel",
    "ChannelName",
    "CHANNEL_NAME",
  ],

  Cluster: [
    "Cluster",
    "ClusterName",
    "CLUSTER_NAME",
  ],

  Location: [
    "Location",
    "LocationName",
    "Loc_Name",
    "LOC_NAME",
    "Branch",
    "BranchName",
  ],

  Section: [
    "Section",
    "SectionName",
    "SECTION_NAME",
  ],

  Department: [
    "Department",
    "DepartmentName",
    "DEPARTMENT_NAME",
    "Dept_Name",
  ],

  Designation: [
    "Designation",
    "DesignationName",
    "DESIGNATION_NAME",
    "Desig_Name",
  ],

  "Paid Days": [
    "PaidDays",
    "Paid_Days",
    "PAID_DAYS",
    "AttnPaidDays",
    "FPDays",
  ],

  "Total Penalty Days": [
    "TotalPenaltyDays",
    "Total_Penalty_Days",
    "TOTAL_PENALTY_DAYS",
    "PenaltyDays",
    "Penalty_Days",
    "TotalPenalty",
    "Total_Penalty",
  ],

  "Month Count": [
    "MonthCount",
    "Month_Count",
    "MONTH_COUNT",
    "MonthDays",
    "Month_Days",
    "TotalMonth",
  ],
};

const mapAttendanceRows = (result: any[]): ReportRow[] => {
  return result.map((item: any, index: number) => {
    const source = item || {};

    const normalizedRecord: Record<string, any> = {};

    Object.keys(source).forEach((key) => {
      normalizedRecord[normalizeFieldName(key)] = source[key];
    });

    const mapped: ReportRow = {
      Srno:
        source.Srno ??
        source.srno ??
        source.SRNO ??
        source.Sr_No ??
        index + 1,
      __rowId: index + 1,
    };

    ATTENDANCE_HEADERS.slice(1).forEach((column) => {
      const aliases = ATTENDANCE_FIELD_ALIASES[column] || [];

      const matchingKey = aliases
        .map((alias) => normalizeFieldName(alias))
        .find(
          (normalizedKey) =>
            normalizedRecord[normalizedKey] !== undefined,
        );

      mapped[column] = matchingKey
        ? normalizedRecord[matchingKey]
        : "";
    });

    return mapped;
  });
};

// --------------------------------------------------
// COLUMN WIDTH
// --------------------------------------------------

const getColumnWidth = (key: string): number => {
  const normalized = key.toUpperCase();

  if (
    normalized.includes("EMPLOYEE") ||
    normalized.includes("EMP_NAME") ||
    normalized.includes("NAME")
  ) {
    return 230;
  }

  if (normalized.includes("REMARK") || normalized.includes("REASON")) {
    return 220;
  }

  if (
    normalized.includes("DATE") ||
    normalized.includes("TIME") ||
    normalized.includes("FROM")
  ) {
    return 150;
  }

  if (normalized.includes("DESIGNATION") || normalized.includes("DEPARTMENT")) {
    return 180;
  }

  if (normalized.includes("EMPCODE") || normalized.includes("EMP_CODE")) {
    return 130;
  }

  return 150;
};

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

export default function MisPunchApproverReportPage() {
  const user = useCurrentUser();
  const router = useRouter();

  // --------------------------------------------------
  // FILTER STATES
  // --------------------------------------------------

  const [reportType, setReportType] = useState("Approval report");

  const [dateFrom, setDateFrom] = useState(getMonthStart());
  const [dateTo, setDateTo] = useState(getMonthEnd());

  const [status, setStatus] = useState("2");

  const showStatusField = reportType === "Approval report";

  // --------------------------------------------------
  // REPORT STATES
  // --------------------------------------------------

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // --------------------------------------------------
  // TABLE STATES
  // --------------------------------------------------

  const [search, setSearch] = useState("");

  const [showColumnFilters, setShowColumnFilters] = useState(false);

  const [filters, setFilters] = useState<Record<string, string>>({});

  // --------------------------------------------------
  // API HEADERS
  // --------------------------------------------------

  const apiHeaders = useMemo(
    () => ({
      compcode: user?.Comp_Code,
      name: user?.name,
    }),
    [user?.Comp_Code, user?.name],
  );

  // --------------------------------------------------
  // FETCH DEFAULT DATE RANGE
  // --------------------------------------------------

  useEffect(() => {
    if (!user?.Comp_Code) return;

    let cancelled = false;

    const fetchDateRange = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_URL}${DATE_RANGE_API}`,
          {
            headers: {
              compcode: user?.Comp_Code,
            },
          },
        );

        if (cancelled) return;

        const { DATE_FROM, DATE_TO } = res.data?.result || {};

        if (DATE_FROM && DATE_TO) {
          setDateFrom(DATE_FROM);
          setDateTo(DATE_TO);
        }
      } catch (error) {
        console.error("Date range API failed", error);
      }
    };

    fetchDateRange();

    return () => {
      cancelled = true;
    };
  }, [user?.Comp_Code]);

  // --------------------------------------------------
  // VALIDATION
  // --------------------------------------------------

  const validateFilters = useCallback(() => {
    if (!reportType) {
      showSideAlert("Please select report type.", "warning");
      return false;
    }

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
      showSideAlert("Date From cannot be greater than Date To.", "warning");
      return false;
    }

    if (showStatusField && !status) {
      showSideAlert("Please select status.", "warning");
      return false;
    }

    return true;
  }, [reportType, dateFrom, dateTo, status, showStatusField]);

  // --------------------------------------------------
  // FETCH REPORT DATA
  // --------------------------------------------------

  const fetchRowsForStatus = useCallback(
    async (backendStatus?: number): Promise<any[]> => {
      // ----------------------------------------------
      // ATTENDANCE REPORT
      // ----------------------------------------------

      if (reportType === "Attendance report") {
        const apiUrl = `${process.env.NEXT_PUBLIC_URL}${ATTENDANCE_REPORT_API}`;

        const PAGE_SIZE = 500;
        const PARALLEL_PAGES = 4;

        const createPayload = (page: number) => ({
          dateFrom,
          dateto: dateTo,
          status: "3", // Current page ka status preserve kiya hai
          region: "",
          channel: "",
          Cluster: "",
          location: "",
          section: "",
          department: "",
          designation: "",
          emptype: "",
          empcode: "",
          reporttype: "attendance",
          LeftEmp: 1,
          page,
          pageSize: PAGE_SIZE,
          limit: PAGE_SIZE,
          loc_code: Number(user?.branch),
          search: "",
        });

        // First page
        const firstResponse = await axios.post(apiUrl, createPayload(1), {
          headers: apiHeaders,
          params: { compcode: user?.Comp_Code },
          timeout: 60000,
        });

        const firstData = firstResponse?.data;

        if (firstData?.success === false || firstData?.status === false) {
          throw new Error(
            firstData?.message || "Attendance report fetch failed",
          );
        }

        const collected = [...getResponseArray(firstData)];

        const totalPages = Math.max(
          1,
          Number(
            firstData?.pagination?.totalPages ??
              firstData?.data?.pagination?.totalPages ??
              1,
          ),
        );

        console.log("Attendance Total Pages:", totalPages);
        console.log("Attendance Page 1 Records:", collected.length);

        // Remaining pages - 4 pages parallel mein
        for (
          let startPage = 2;
          startPage <= totalPages;
          startPage += PARALLEL_PAGES
        ) {
          const pageNumbers = Array.from(
            {
              length: Math.min(PARALLEL_PAGES, totalPages - startPage + 1),
            },
            (_, index) => startPage + index,
          );

          const responses = await Promise.all(
            pageNumbers.map(async (pageNo) => {
              const response = await axios.post(apiUrl, createPayload(pageNo), {
                headers: apiHeaders,
                params: { compcode: user?.Comp_Code },
                timeout: 60000,
              });

              console.log(`Attendance API Page ${pageNo}`);

              return {
                pageNo,
                data: response?.data,
              };
            }),
          );

          // Page order maintain rahega
          responses
            .sort((a, b) => a.pageNo - b.pageNo)
            .forEach(({ pageNo, data }) => {
              if (data?.success === false || data?.status === false) {
                throw new Error(
                  data?.message || `Attendance page ${pageNo} failed`,
                );
              }

              const pageRows = getResponseArray(data);

              console.log(
                `Attendance Page ${pageNo} Records:`,
                pageRows.length,
              );

              collected.push(...pageRows);
            });
        }

        console.log("Attendance Total Records:", collected.length);

        return collected;
      }

      // ----------------------------------------------
      // APPROVAL REPORT
      // ----------------------------------------------

      const apiUrl = `${process.env.NEXT_PUBLIC_URL}${APPROVAL_REPORT_API}`;

      let page = 1;
      let totalPages = 1;

      const collected: any[] = [];

      do {
        const payload = {
          dateFrom,
          dateto: dateTo,
          status: backendStatus ?? 1,
          region: "",
          channel: "",
          Cluster: "",
          location: "",
          section: "",
          department: "",
          designation: "",
          emptype: "",
          empcode: "",
          reporttype: "OD_report",
          LeftEmp: 1,
          page,
          pageSize: FETCH_PAGE_SIZE,
          limit: FETCH_PAGE_SIZE,
          loc_code: user?.branch,
          search: "",
        };

        console.log(
          `Approval Report Payload (status ${backendStatus}, page ${page}):`,
          payload,
        );

        const response = await axios.post(apiUrl, payload, {
          headers: apiHeaders,
          params: {
            compcode: user?.Comp_Code,
          },
        });

        const responseData = response?.data;

        if (
          responseData?.Status === false ||
          responseData?.status === false ||
          responseData?.success === false
        ) {
          throw new Error(
            responseData?.message ||
              responseData?.Message ||
              "Unable to fetch Approval report.",
          );
        }

        const pageRows = getResponseArray(responseData);

        collected.push(...pageRows);

        totalPages = Number(responseData?.pagination?.totalPages) || 1;

        page += 1;
      } while (page <= totalPages);

      return collected;
    },
    [reportType, dateFrom, dateTo, user?.branch, user?.Comp_Code, apiHeaders],
  );

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
      let result: any[] = [];

      if (reportType === "Attendance report") {
        // Attendance API is called only once.
        result = await fetchRowsForStatus();
      } else {
        // Approval report uses selected status.
        const backendStatuses =
          status === "All"
            ? ALL_BACKEND_STATUSES
            : [STATUS_API_MAP[status] ?? 1];

        for (const backendStatus of backendStatuses) {
          const statusRows = await fetchRowsForStatus(backendStatus);

          result = result.concat(statusRows);
        }
      }

      console.log(`${reportType} Total Rows:`, result.length);

  let mappedRows: ReportRow[] = [];
let dynamicHeaders: string[] = [];

if (reportType === "Attendance report") {
  // Attendance report fixed columns and field mapping
  mappedRows = mapAttendanceRows(result);

  dynamicHeaders = ATTENDANCE_HEADERS;
} else {
  // Approval report existing mapping unchanged
  mappedRows = mapReportRows(result, []).map((item, index) => ({
    ...item,
    srno: index + 1,
  }));

  if (mappedRows.length > 0) {
    const firstRowKeys = Object.keys(mappedRows[0]);

    dynamicHeaders = PREFERRED_HEADERS.filter((key) =>
      firstRowKeys.includes(key),
    );

    if (dynamicHeaders.length <= 1) {
      dynamicHeaders = [
        "srno",
        ...firstRowKeys.filter(
          (key) => key !== "srno" && !HIDDEN_KEYS.includes(key),
        ),
      ];
    }
  }
}

      setHeaders(dynamicHeaders);
      setRows(mappedRows);

      setFilters(Object.fromEntries(dynamicHeaders.map((key) => [key, ""])));

      setSearch("");
      setHasSearched(true);

      if (mappedRows.length === 0) {
        showSideAlert("No records found.", "info");
      } else {
        showSideAlert(
          `${mappedRows.length} records fetched successfully.`,
          "success",
        );
      }
    } catch (error: any) {
      console.error(`${reportType} Error:`, error);

      setRows([]);
      setHeaders([]);
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
    reportType,
    status,
    validateFilters,
    fetchRowsForStatus,
  ]);

  // --------------------------------------------------
  // INPUT HANDLERS
  // --------------------------------------------------

  const handleReportTypeChange = (name: string, value: string) => {
    setReportType(value);

    setRows([]);
    setHeaders([]);
    setFilters({});
    setSearch("");
    setHasSearched(false);

    setStatus("2");
  };

  const handleStatusChange = (name: string, value: string) => {
    setStatus(value);
    setRows([]);
    setHeaders([]);
    setHasSearched(false);
  };

  const handleDateFromChange = (name: string, value: string) => {
    setDateFrom(value);

    const monthEnd = getMonthEndOf(value);

    if (monthEnd) {
      setDateTo(monthEnd);
    }

    setRows([]);
    setHasSearched(false);
  };

  const handleDateToChange = (name: string, value: string) => {
    setDateTo(value);
    setRows([]);
    setHasSearched(false);
  };

  // --------------------------------------------------
  // COLUMN FILTER HANDLER
  // --------------------------------------------------

  const handleFilterChange = (name: string, value: string) => {
    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // --------------------------------------------------
  // DYNAMIC TABLE COLUMNS
  // --------------------------------------------------

  const columns = useMemo((): ReportColumn[] => {
    return headers.map((key) => ({
     Header:
  reportType === "Attendance report"
    ? key
    : getColumnLabel(key),
      accessor: key,
      minWidth: getColumnWidth(key),
      width: getColumnWidth(key),

      Cell: ({ value }: any) => {
        if (value === null || value === undefined || value === "") {
          return <span className="text-slate-400">—</span>;
        }

        const normalizedKey = key.toUpperCase();

        if (
          normalizedKey.includes("STATUS") ||
          normalizedKey.includes("APPROVAL")
        ) {
          return (
            <span className="whitespace-nowrap text-[12px] font-semibold text-[#152b4b] dark:text-slate-200">
              {String(value)}
            </span>
          );
        }

        if (isDateTimeColumn(key)) {
          return (
            <span className="whitespace-nowrap text-[13px] text-[#152b4b] dark:text-slate-300">
              {formatDateTime(value)}
            </span>
          );
        }

        if (isDateColumn(key)) {
          return (
            <span className="whitespace-nowrap text-[13px] text-[#152b4b] dark:text-slate-300">
              {formatDate(value)}
            </span>
          );
        }

        if (
          normalizedKey.includes("EMPCODE") ||
          normalizedKey.includes("EMP_CODE") ||
          normalizedKey.includes("EMPLOYEE CODE") ||
          normalizedKey === "SRNO" ||
          normalizedKey === "SR NO"
        ) {
          return (
            <span className="whitespace-nowrap font-mono text-[12px] font-bold text-[#152b4b] dark:text-slate-200">
              {String(value)}
            </span>
          );
        }

        return (
          <span className="text-[13px] text-[#152b4b] dark:text-slate-300">
            {String(value)}
          </span>
        );
      },
    }));
  }, [headers, reportType]);

  // --------------------------------------------------
  // FILTERED ROWS
  // --------------------------------------------------

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        headers.some((key) =>
          String(row[key] ?? "")
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
  }, [rows, headers, search, filters]);

  // --------------------------------------------------
  // RESET TABLE FILTERS
  // --------------------------------------------------

  const resetTableFilters = () => {
    setSearch("");

    setFilters(Object.fromEntries(headers.map((key) => [key, ""])));
  };

  // --------------------------------------------------
  // RESET ALL
  // --------------------------------------------------

  const resetAll = () => {
    setReportType("Approval report");
    setDateFrom(getMonthStart());
    setDateTo(getMonthEnd());
    setStatus("2");

    setRows([]);
    setHeaders([]);
    setSearch("");
    setFilters({});
    setHasSearched(false);
    setShowColumnFilters(false);
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
            {reportType === "Attendance report"
              ? "Attendance Report"
              : "Mis-Punch Approver Report"}
          </h1>
        </div>

        {/* FILTER SECTION */}

        <div className="rounded-2xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div
            className={`grid grid-cols-1 items-end gap-4 sm:grid-cols-2 ${
              showStatusField
                ? "xl:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(180px,1fr)_minmax(180px,1fr)_auto]"
                : "xl:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(180px,1fr)_auto]"
            }`}
          >
            {/* REPORT TYPE */}

            <div className="min-w-0">
              <Eselect
                title="Report type"
                name="reportType"
                option={REPORT_TYPE_OPTIONS}
                initialValue={reportType}
                handleInputChange={handleReportTypeChange}
                placeholder="Select report type"
                mb={0}
                className="h-[40px] w-full"
              />
            </div>

            {/* DATE FROM */}

            <div className="min-w-0">
              <Einput
                name="dateFrom"
                type="date"
                title="Date from"
                value={dateFrom}
                handleInputChange={handleDateFromChange}
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
                handleInputChange={handleDateToChange}
                className="h-[40px] w-full"
              />
            </div>

            {/* STATUS: ONLY FOR APPROVAL REPORT */}

            {showStatusField && (
              <div className="min-w-0">
                <Eselect
                  title="Status"
                  name="status"
                  option={STATUS_OPTIONS}
                  initialValue={status}
                  handleInputChange={handleStatusChange}
                  placeholder="Select status"
                  mb={0}
                  className="h-[40px] w-full"
                />
              </div>
            )}

            {/* SHOW BUTTON */}

            <div className="flex items-end">
              <AButton
                type="button"
                onClick={fetchReport}
                disabled={loading}
                className="inline-flex h-[40px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 text-[13px] font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 xl:w-auto"
              >
                <Search size={15} />
                Show
              </AButton>
            </div>
          </div>
        </div>

        {/* REPORT TABLE CARD */}

        <div className="min-w-0 overflow-hidden rounded-2xl border border-[#dce5f1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900">
          {/* TABLE TOOLBAR */}

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

            {/* TABLE ACTIONS */}

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
                onClick={resetTableFilters}
                className="inline-flex h-[41px] items-center justify-center gap-2 rounded-xl border border-[#dce5f1] bg-white px-3.5 text-[12px] font-semibold text-[#152b4b] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <RotateCcw size={14} />
                Reset
              </AButton>
            </div>
          </div>

          {/* COLUMN FILTER PANEL */}

          {showColumnFilters && hasSearched && (
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
                {headers.map((key) => (
                  <div key={key} className="min-w-0">
                    <label className="mb-1 block text-[11px] font-medium text-[#64748b] dark:text-slate-400">
                      {getColumnLabel(key)}
                    </label>

                    <Einput
                      name={key}
                      type="text"
                      value={filters[key] || ""}
                      handleInputChange={(name: string, value: string) =>
                        handleFilterChange(key, value)
                      }
                      placeholder={`Search ${getColumnLabel(
                        key,
                      ).toLowerCase()}`}
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
                    showPageSizeInFooter={true}
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
                      No records available for the selected filters.
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
                Mis-Punch Approver Report
              </h3>

              <p className="mt-1 max-w-[400px] text-[12px] leading-5 text-[#64748b] dark:text-slate-400">
                Select report type and date range, then click Show to view the
                report.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
