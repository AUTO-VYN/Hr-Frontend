"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

import { Search, RotateCcw, X, FileSpreadsheet, Loader2 } from "lucide-react";

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

// Format date values without timezone conversion. API values such as
// 2025-06-26T00:00:00.000Z must display as 26-06-2025, not the raw ISO string.
const formatDateOnly = (value: any): string => {
  if (value === null || value === undefined || value === "") return "—";

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "—";
    return `${String(value.getDate()).padStart(2, "0")}-${String(
      value.getMonth() + 1,
    ).padStart(2, "0")}-${value.getFullYear()}`;
  }

  const raw = String(value).trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;

  const dmyMatch = raw.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (dmyMatch) return `${dmyMatch[1]}-${dmyMatch[2]}-${dmyMatch[3]}`;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return `${String(parsed.getDate()).padStart(2, "0")}-${String(
    parsed.getMonth() + 1,
  ).padStart(2, "0")}-${parsed.getFullYear()}`;
};

const formatDate = (value: any): string => {
  if (!value) return "";
  const raw = String(value).trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value: any): string => {
  if (value === null || value === undefined || value === "") return "—";

  const raw = String(value).trim();
  if (!raw) return "—";

  // ISO / SQL date-time, including milliseconds and Z / timezone offsets.
  const isoMatch = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/i,
  );
  if (isoMatch) {
    const [, year, month, day, hours, minutes, seconds] = isoMatch;
    const date = `${day}-${month}-${year}`;
    return hours
      ? `${date} ${hours}:${minutes || "00"}:${seconds || "00"}`
      : date;
  }

  // Also support DD-MM-YYYY / DD/MM/YYYY values returned by some APIs.
  const dmyMatch = raw.match(
    /^(\d{2})[-/](\d{2})[-/](\d{4})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (dmyMatch) {
    const [, day, month, year, hours, minutes, seconds] = dmyMatch;
    const date = `${day}-${month}-${year}`;
    return hours
      ? `${date} ${hours}:${minutes || "00"}:${seconds || "00"}`
      : date;
  }

  return raw;
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

const getFieldValue = (row: any, aliases: string[], fallback: any = "") => {
  if (!row) return fallback;
  const normalized: Record<string, any> = {};
  Object.keys(row).forEach((key) => {
    normalized[normalizeFieldName(key)] = row[key];
  });
  for (const alias of aliases) {
    const value = normalized[normalizeFieldName(alias)];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
};

const displayValue = (value: any) =>
  value === null || value === undefined || value === "" ? "—" : String(value);

const getImageSource = (value: any): string => {
  if (!value || typeof value !== "string") return "";
  const raw = value.trim();
  if (/^(https?:\/\/|data:image\/|blob:)/i.test(raw)) return raw;
  if (/^[A-Za-z0-9+/=\s]+$/.test(raw) && raw.length > 100) {
    return `data:image/jpeg;base64,${raw.replace(/\s/g, "")}`;
  }
  return raw;
};

const getStatusLabel = (value: any) => {
  const status = String(value ?? "")
    .trim()
    .toLowerCase();
  if (["1", "approved", "approve"].includes(status)) return "Approved";
  if (["0", "rejected", "reject"].includes(status)) return "Rejected";
  if (["2", "pending"].includes(status)) return "Pending";
  return displayValue(value);
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

  Region: ["Region", "Sal_Region", "SAL_REGION", "RegionName"],

  Channel: ["Channel", "ChannelName", "CHANNEL_NAME"],

  Cluster: ["Cluster", "ClusterName", "CLUSTER_NAME"],

  Location: [
    "Location",
    "LocationName",
    "Loc_Name",
    "LOC_NAME",
    "Branch",
    "BranchName",
  ],

  Section: ["Section", "SectionName", "SECTION_NAME"],

  Department: ["Department", "DepartmentName", "DEPARTMENT_NAME", "Dept_Name"],

  Designation: [
    "Designation",
    "DesignationName",
    "DESIGNATION_NAME",
    "Desig_Name",
  ],

  "Paid Days": ["PaidDays", "Paid_Days", "PAID_DAYS", "AttnPaidDays", "FPDays"],

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
        source.Srno ?? source.srno ?? source.SRNO ?? source.Sr_No ?? index + 1,
      __rowId: index + 1,
    };

    ATTENDANCE_HEADERS.slice(1).forEach((column) => {
      const aliases = ATTENDANCE_FIELD_ALIASES[column] || [];

      const matchingKey = aliases
        .map((alias) => normalizeFieldName(alias))
        .find((normalizedKey) => normalizedRecord[normalizedKey] !== undefined);

      mapped[column] = matchingKey ? normalizedRecord[matchingKey] : "";
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
  const user: any = useCurrentUser();
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

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  const serverPagination = useMemo(
    () => ({
      currentPage,
      pageSize,
      totalPages,
      totalRecords,
    }),
    [currentPage, pageSize, totalPages, totalRecords],
  );

  // --------------------------------------------------
  // TABLE STATES
  // --------------------------------------------------

  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    setIsSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        await fetchReport(1, pageSize, val, false);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  // --------------------------------------------------
  // EMPLOYEE DETAIL DIALOG
  // --------------------------------------------------

  const [selectedEmployee, setSelectedEmployee] = useState<ReportRow | null>(
    null,
  );
  const [attendanceDetailRows, setAttendanceDetailRows] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

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
    async (
      targetPage: number = 1,
      targetPageSize: number = 10,
      searchQuery: string = "",
      backendStatus?: number,
    ): Promise<{ rows: any[]; totalPages: number; totalRecords: number }> => {
      // ----------------------------------------------
      // ATTENDANCE REPORT
      // ----------------------------------------------

      if (reportType === "Attendance report") {
        const apiUrl = `${process.env.NEXT_PUBLIC_URL}${ATTENDANCE_REPORT_API}`;

        const payload = {
          dateFrom,
          dateto: dateTo,
          status: "3", // Current page ka status preserve kiya hai
          region: "",
          channel: "",
          search: searchQuery,
          Cluster: "",
          location: "",
          section: "",
          department: "",
          designation: "",
          emptype: "",
          empcode: "",
          reporttype: "attendance",
          LeftEmp: 1,
          page: targetPage,
          pageSize: targetPageSize,
          limit: targetPageSize,
          loc_code: Number(user?.branch),
        };

        const response = await axios.post(apiUrl, payload, {
          headers: apiHeaders,
          params: { compcode: user?.Comp_Code },
          timeout: 60000,
        });

        const firstData = response?.data;

        if (firstData?.success === false || firstData?.status === false) {
          throw new Error(
            firstData?.message || "Attendance report fetch failed",
          );
        }

        const collected = getResponseArray(firstData);

        const tPages = Math.max(
          1,
          Number(
            firstData?.pagination?.totalPages ??
            firstData?.data?.pagination?.totalPages ??
            1,
          ),
        );
        const tRecords = Number(
          firstData?.pagination?.totalRecords ??
          firstData?.pagination?.total ??
          firstData?.data?.pagination?.totalRecords ??
          firstData?.data?.pagination?.total ??
          0,
        );

        return {
          rows: collected,
          totalPages: tPages,
          totalRecords: tRecords || collected.length,
        };
      }

      // ----------------------------------------------
      // APPROVAL REPORT
      // ----------------------------------------------

      const apiUrl = `${process.env.NEXT_PUBLIC_URL}${APPROVAL_REPORT_API}`;

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
        page: targetPage,
        pageSize: targetPageSize,
        limit: targetPageSize,
        loc_code: user?.branch,
        search: searchQuery,
      };

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
      const tPages = Number(responseData?.pagination?.totalPages) || 1;
      const tRecords = Number(
        responseData?.pagination?.totalRecords ??
        responseData?.pagination?.total ??
        0,
      );

      return {
        rows: pageRows,
        totalPages: tPages,
        totalRecords: tRecords || pageRows.length,
      };
    },
    [reportType, dateFrom, dateTo, user?.branch, user?.Comp_Code, apiHeaders],
  );

  // --------------------------------------------------
  // FETCH REPORT
  // --------------------------------------------------

  const fetchReport = useCallback(
    async (
      targetPage: number = 1,
      targetPageSize: number = pageSize,
      searchQuery: string = search,
      showLoader: boolean = true,
    ) => {
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

      if (showLoader) {
        setLoading(true);
      }

      try {
        let result: any[] = [];
        let tPages = 1;
        let tRecords = 0;

        if (reportType === "Attendance report") {
          const res = await fetchRowsForStatus(
            targetPage,
            targetPageSize,
            searchQuery,
          );
          result = res.rows;
          tPages = res.totalPages;
          tRecords = res.totalRecords;
        } else {
          const backendStatus = STATUS_API_MAP[status] ?? 1;
          const res = await fetchRowsForStatus(
            targetPage,
            targetPageSize,
            searchQuery,
            backendStatus,
          );
          result = res.rows;
          tPages = res.totalPages;
          tRecords = res.totalRecords;
        }

        console.log(`${reportType} Page ${targetPage} Rows:`, result.length);

        let mappedRows: ReportRow[] = [];
        let dynamicHeaders: string[] = [];

        if (reportType === "Attendance report") {
          mappedRows = mapAttendanceRows(result);
          dynamicHeaders = ATTENDANCE_HEADERS;
        } else {
          mappedRows = mapReportRows(result, []).map((item, index) => ({
            ...item,
            srno: (targetPage - 1) * targetPageSize + index + 1,
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
        setCurrentPage(targetPage);
        setPageSize(targetPageSize);
        setTotalPages(tPages);
        setTotalRecords(tRecords);

        setFilters(Object.fromEntries(dynamicHeaders.map((key) => [key, ""])));
        setHasSearched(true);

        if (mappedRows.length === 0) {
          if (showLoader) {
            showSideAlert("No records found.", "info");
          }
        } else if (showLoader) {
          showSideAlert(
            `Page ${targetPage} loaded (${mappedRows.length} records).`,
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
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [
      user?.Comp_Code,
      user?.branch,
      validateFilters,
      pageSize,
      reportType,
      status,
      fetchRowsForStatus,
      search,
    ],
  );

  const handlePageChange = (newPage: number, showLoader = true) => {
    fetchReport(newPage, pageSize, search, showLoader);
  };

  const handlePageSizeChange = (newSize: number) => {
    const validSize = newSize === -1 ? 500 : newSize;
    fetchReport(1, validSize, search, true);
  };

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
  // EMPLOYEE DETAIL DIALOG
  // --------------------------------------------------

  const closeEmployeeDialog = () => {
    setSelectedEmployee(null);
    setAttendanceDetailRows([]);
    setDetailLoading(false);
  };

  const handleEmployeeRowClick = async (row: ReportRow) => {
    setSelectedEmployee(row);

    if (reportType !== "Attendance report") {
      return;
    }

    const employeeCode = getFieldValue(row, [
      "Employee Code",
      "EMPCODE",
      "EMP_CODE",
      "EmpCode",
      "Code",
    ]);

    if (!employeeCode) {
      setAttendanceDetailRows([]);
      return;
    }

    setDetailLoading(true);
    setAttendanceDetailRows([]);

    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_URL}${ATTENDANCE_REPORT_API}`;
      const pageSize = 500;
      const collected: any[] = [];

      const createDetailPayload = (page: number) => ({
        dateFrom,
        dateto: dateTo,
        status: "3",
        region: "",
        channel: "",
        Cluster: "",
        location: "",
        section: "",
        department: "",
        designation: "",
        emptype: "",
        empcode: String(employeeCode),
        reporttype: "attendance",
        LeftEmp: 1,
        page,
        pageSize,
        limit: pageSize,
        loc_code: Number(user?.branch),
        search: "",
      });

      const firstResponse = await axios.post(apiUrl, createDetailPayload(1), {
        headers: apiHeaders,
        params: { compcode: user?.Comp_Code },
        timeout: 60000,
      });

      const firstData = firstResponse?.data;
      if (firstData?.success === false || firstData?.status === false) {
        throw new Error(
          firstData?.message || "Unable to fetch employee attendance details.",
        );
      }

      collected.push(...getResponseArray(firstData));

      const totalPages = Math.max(
        1,
        Number(
          firstData?.pagination?.totalPages ??
          firstData?.data?.pagination?.totalPages ??
          1,
        ),
      );

      for (let page = 2; page <= totalPages; page += 1) {
        const response = await axios.post(apiUrl, createDetailPayload(page), {
          headers: apiHeaders,
          params: { compcode: user?.Comp_Code },
          timeout: 60000,
        });

        const pageData = response?.data;
        if (pageData?.success === false || pageData?.status === false) {
          throw new Error(
            pageData?.message || `Attendance detail page ${page} failed.`,
          );
        }
        collected.push(...getResponseArray(pageData));
      }

      const employeeRows = collected.filter((item) => {
        const code = getFieldValue(item, [
          "Employee Code",
          "EMPCODE",
          "EMP_CODE",
          "EmpCode",
          "Code",
        ]);
        return String(code) === String(employeeCode);
      });

      setAttendanceDetailRows(employeeRows);
    } catch (error: any) {
      console.error("Employee attendance detail error:", error);
      showSideAlert(
        error?.response?.data?.message ||
        error?.message ||
        "Unable to fetch attendance details.",
        "error",
      );
      setAttendanceDetailRows([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const getAttendanceDate = (item: any) =>
    getFieldValue(item, [
      "AttendanceDate",
      "AttnDate",
      "DATEOFFICE",
      "Date",
      "ATT_DATE",
      "PunchDate",
      "TRANS_DATE",
      "DATE",
    ]);

  const getAttendanceStatus = (item: any) =>
    getFieldValue(item, [
      "Status",
      "ATT_STATUS",
      "AttnStatus",
      "AttendanceStatus",
      "STATUS",
    ]);

  const getAttendanceInTime = (item: any) =>
    getFieldValue(item, [
      "InTime",
      "IN_TIME",
      "PunchIn",
      "PUNCH_IN",
      "TIME_IN",
      "In_Time",
    ]);

  const getAttendanceOutTime = (item: any) =>
    getFieldValue(item, [
      "OutTime",
      "OUT_TIME",
      "PunchOut",
      "PUNCH_OUT",
      "TIME_OUT",
      "Out_Time",
    ]);

  const getAttendanceInImage = (item: any) =>
    getImageSource(
      getFieldValue(item, [
        "fileIn",
        "InImage",
        "PunchInImage",
        "IN_IMAGE",
        "Punch_In_Image",
        "InPhoto",
      ]),
    );

  const getAttendanceOutImage = (item: any) =>
    getImageSource(
      getFieldValue(item, [
        "fileOut",
        "OutImage",
        "PunchOutImage",
        "OUT_IMAGE",
        "Punch_Out_Image",
        "OutPhoto",
      ]),
    );

  // --------------------------------------------------
  // DYNAMIC TABLE COLUMNS
  // --------------------------------------------------

  const columns = useMemo((): ReportColumn[] => {
    return headers.map((key) => ({
      Header: reportType === "Attendance report" ? key : getColumnLabel(key),
      accessor: key,
      minWidth: getColumnWidth(key),
      width: getColumnWidth(key),

      Cell: ({ value, row }: any) => {
        const cellContent = (() => {
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
        })();

        return (
          <div
            role="button"
            tabIndex={0}
            title="Click to view employee details"
            onClick={() => handleEmployeeRowClick(row?.original || {})}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleEmployeeRowClick(row?.original || {});
              }
            }}
            className="w-full cursor-pointer"
          >
            {cellContent}
          </div>
        );
      },
    }));
  }, [headers, reportType, handleEmployeeRowClick]);

  // --------------------------------------------------
  // FILTERED ROWS
  // --------------------------------------------------

  const filteredRows = useMemo(() => {
    const activeFilters = Object.entries(filters).filter(
      ([_, v]) => v && v.trim() !== "",
    );
    if (activeFilters.length === 0) return rows;

    return rows.filter((row) => {
      return activeFilters.every(([key, value]) => {
        return String(row[key] ?? "")
          .toLowerCase()
          .includes(value.trim().toLowerCase());
      });
    });
  }, [rows, filters]);

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
    setCurrentPage(1);
    setPageSize(10);
    setTotalPages(1);
    setTotalRecords(0);
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
            className={`grid grid-cols-1 items-end gap-4 sm:grid-cols-2 ${showStatusField
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
                onClick={() => fetchReport(1, pageSize, search, true)}
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
                of {totalRecords || rows.length} rows
              </p>
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
            <div className="relative w-full min-w-0">
              {isSearching && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-[1px] dark:bg-slate-900/60 rounded-2xl">
                  <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-md dark:border-slate-700 dark:bg-slate-800">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                    <span className="text-[12.5px] font-medium text-slate-700 dark:text-slate-200">
                      Searching...
                    </span>
                  </div>
                </div>
              )}
              <DataTable
                columns={columns}
                data={filteredRows}
                showTopSearch={true}
                resetFilters={true}
                showExcelExport={true}
                showColumnFilters={true}
                showPageSizeInFooter={true}
                serverMode={true}
                serverPagination={serverPagination}
                onServerPageChange={handlePageChange}
                onServerPageSizeChange={handlePageSizeChange}
                searchValue={search}
                onSearchChange={handleSearchChange}
              />
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

      {/* EMPLOYEE DETAIL DIALOG */}
      {selectedEmployee && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEmployeeDialog();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-detail-title"
            className={`relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-lg border border-slate-700 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-900 ${reportType === "Attendance report"
                ? "max-w-[1480px]"
                : "max-w-[1120px]"
              }`}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-300 px-5 py-3 dark:border-slate-700">
              <h2
                id="employee-detail-title"
                className="text-[16px] font-bold text-slate-900 dark:text-slate-100"
              >
                {reportType === "Attendance report"
                  ? "Attendance Details"
                  : "Mis-Punch Request Details"}
              </h2>
              <button
                type="button"
                onClick={closeEmployeeDialog}
                aria-label="Close dialog"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-blue-400 text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
              {reportType === "Approval report" ? (
                <div className="space-y-5 text-[12px] text-[#152b4b] dark:text-slate-200">
                  {/* EMPLOYEE INFORMATION */}
                  <section className="border-b border-slate-200 pb-4 dark:border-slate-700">
                    <h3 className="mb-3 text-[13px] font-semibold text-blue-800 dark:text-blue-300">
                      Employee Information
                    </h3>
                    <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                      {[
                        [
                          "Employee Code",
                          ["Employee Code", "EMPCODE", "EMP_CODE", "EmpCode"],
                        ],
                        [
                          "Employee Name",
                          ["Employee Name", "EMP_NAME", "EMPNAME", "EmpName"],
                        ],
                        [
                          "Date Of Joining",
                          [
                            "Date Of Joining",
                            "Joining Date",
                            "DOJ",
                            "DATE_OF_JOINING",
                          ],
                        ],
                        [
                          "Mobile No.",
                          ["Mobile No", "Mobile", "MOBILE_NO", "MobileNumber"],
                        ],
                        ["Company", ["Company", "CompanyName", "COMP_NAME"]],
                        [
                          "Designation",
                          ["Designation", "DESIGNATION", "Desig_Name"],
                        ],
                      ].map(([label, aliases]: any) => (
                        <div
                          key={label}
                          className="grid grid-cols-[130px_12px_minmax(0,1fr)] gap-1"
                        >
                          <span className="text-slate-500 dark:text-slate-400">
                            {label}
                          </span>
                          <span>:</span>
                          <span className="font-medium">
                            {label === "Date Of Joining"
                              ? formatDateOnly(
                                getFieldValue(selectedEmployee, aliases),
                              )
                              : displayValue(
                                getFieldValue(selectedEmployee, aliases),
                              )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* ORGANIZATIONAL DETAILS */}
                  <section className="border-b border-slate-200 pb-4 dark:border-slate-700">
                    <h3 className="mb-3 text-[13px] font-semibold text-blue-800 dark:text-blue-300">
                      Organizational Details
                    </h3>
                    <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                      {[
                        ["Channel", ["Channel", "CHANNEL_NAME"]],
                        ["Cluster", ["Cluster", "CLUSTER_NAME"]],
                        [
                          "Branch",
                          ["Branch", "Location", "Loc_Name", "LOCATION"],
                        ],
                        ["Section", ["Section", "SECTION_NAME"]],
                        [
                          "Department",
                          ["Department", "DEPARTMENT_NAME", "Dept_Name"],
                        ],
                        ["Region", ["Region", "Sal_Region", "SAL_REGION"]],
                      ].map(([label, aliases]: any) => (
                        <div
                          key={label}
                          className="grid grid-cols-[130px_12px_minmax(0,1fr)] gap-1"
                        >
                          <span className="text-slate-500 dark:text-slate-400">
                            {label}
                          </span>
                          <span>:</span>
                          <span className="font-medium">
                            {displayValue(
                              getFieldValue(selectedEmployee, aliases),
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* MIS-PUNCH DETAILS */}
                  <section className="border-b border-slate-200 pb-4 dark:border-slate-700">
                    <h3 className="mb-3 text-[13px] font-semibold text-blue-800 dark:text-blue-300">
                      Mis-Punch Details
                    </h3>
                    <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                      {[
                        [
                          "Start From",
                          ["Start From", "StartFrom", "DATE_FROM", "OD_FROM"],
                        ],
                        [
                          "End From",
                          ["End From", "EndFrom", "DATE_TO", "OD_TO"],
                        ],
                        [
                          "OD Type",
                          ["OD Type", "OD_TYPE", "Reason", "MIS_PUNCH_TYPE"],
                        ],
                        [
                          "Attn. Status",
                          [
                            "Attn. Status",
                            "AttnStatus",
                            "ATT_STATUS",
                            "AttendanceStatus",
                          ],
                        ],
                        [
                          "Shift Start Time",
                          ["Shift Start Time", "ShiftStartTime", "SHIFT_IN"],
                        ],
                        [
                          "Shift End Time",
                          ["Shift End Time", "ShiftEndTime", "SHIFT_OUT"],
                        ],
                        [
                          "Mispunch IN Applied On",
                          [
                            "Mispunch IN Applied On",
                            "MisPunchInAppliedOn",
                            "AppliedOnIn",
                            "IN_APPLIED_ON",
                          ],
                        ],
                        [
                          "Mispunch OUT Applied On",
                          [
                            "Mispunch OUT Applied On",
                            "MisPunchOutAppliedOn",
                            "AppliedOnOut",
                            "OUT_APPLIED_ON",
                          ],
                        ],
                        [
                          "Mispunch Entered By",
                          [
                            "Mispunch Entered By",
                            "EnteredBy",
                            "CreatedBy",
                            "USER_NAME",
                          ],
                        ],
                        [
                          "Applied Type",
                          ["Applied Type", "AppliedType", "OD_TYPE_NAME"],
                        ],
                        [
                          "Total Days",
                          [
                            "Total Days",
                            "Total_OD_Days",
                            "OD_DAYS",
                            "TOTAL_DAYS",
                          ],
                        ],
                        [
                          "Mis-Punch Status",
                          [
                            "Mis-Punch Status",
                            "OD Status",
                            "Status",
                            "OD_STATUS",
                          ],
                        ],
                        [
                          "Employee Remark",
                          [
                            "Employee Remark",
                            "Remark",
                            "EMP_REMARK",
                            "REMARKS",
                          ],
                        ],
                        [
                          "Employee SPL Remark",
                          [
                            "Employee SPL Remark",
                            "EmployeeSPLRemark",
                            "SPL_REMARK",
                          ],
                        ],
                      ].map(([label, aliases]: any) => {
                        const value = getFieldValue(selectedEmployee, aliases);
                        return (
                          <div
                            key={label}
                            className="grid grid-cols-[130px_12px_minmax(0,1fr)] gap-1"
                          >
                            <span className="text-slate-500 dark:text-slate-400">
                              {label}
                            </span>
                            <span>:</span>
                            <span className="font-medium">
                              {[
                                "Start From",
                                "End From",
                                "Mispunch IN Applied On",
                                "Mispunch OUT Applied On",
                              ].includes(label)
                                ? formatDateTime(value)
                                : displayValue(value)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* PUNCH IMAGES */}
                  <section className="border-b border-slate-200 pb-4 dark:border-slate-700">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      {[
                        [
                          "Mispunch In Image",
                          [
                            "fileIn",
                            "InImage",
                            "PunchInImage",
                            "IN_IMAGE",
                            "InPhoto",
                          ],
                        ],
                        [
                          "Mispunch Out Image",
                          [
                            "fileOut",
                            "OutImage",
                            "PunchOutImage",
                            "OUT_IMAGE",
                            "OutPhoto",
                          ],
                        ],
                      ].map(([label, aliases]: any) => {
                        const imageSrc = getImageSource(
                          getFieldValue(selectedEmployee, aliases),
                        );
                        return (
                          <div key={label}>
                            <p className="mb-1 text-[11px] text-slate-600 dark:text-slate-400">
                              {label}
                            </p>
                            <div className="flex h-[175px] items-center justify-center overflow-hidden rounded-xl border border-slate-400 bg-[#edf4fa] dark:border-slate-600 dark:bg-slate-800">
                              {imageSrc ? (
                                <img
                                  src={imageSrc}
                                  alt={label}
                                  className="h-full w-full object-contain"
                                />
                              ) : (
                                <span className="text-[12px] italic text-slate-400">
                                  {label.toLowerCase().includes("out")
                                    ? "Mispunch Out photo shows here"
                                    : "No Image Available"}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* APPROVER DETAILS */}
                  {[1, 2, 3].map((number) => {
                    const approverCode = getFieldValue(selectedEmployee, [
                      `Approver ${number} Emp Code`,
                      `Approver${number}EmpCode`,
                      `APPR_${number}`,
                      `APPR${number}_CODE`,
                      `APPROVER_${number}_CODE`,
                    ]);
                    const approverName = getFieldValue(selectedEmployee, [
                      `Approver ${number} Name`,
                      `Approver${number}Name`,
                      `APPR_${number}_NAME`,
                      `APPROVER_${number}_NAME`,
                    ]);
                    const actionStatus = getFieldValue(selectedEmployee, [
                      `Approver ${number} Action Status`,
                      `Approver${number}Status`,
                      `APPR_${number}_STATUS`,
                      `APPR_${number}_ACTION`,
                      `APPROVER_${number}_STATUS`,
                    ]);
                    const remarks = getFieldValue(selectedEmployee, [
                      `Approver ${number} Remarks`,
                      `Approver${number}Remark`,
                      `APPR_${number}_REMARK`,
                      `APPR_${number}_REMARKS`,
                    ]);
                    const actionOn = getFieldValue(selectedEmployee, [
                      `Approver ${number} Action Taken On`,
                      `Approver${number}ActionOn`,
                      `APPR_${number}_DATE`,
                      `APPR_${number}_ACTION_ON`,
                    ]);
                    return (
                      <section
                        key={number}
                        className="border-b border-slate-200 pb-4 last:border-0 dark:border-slate-700"
                      >
                        <h3 className="mb-3 text-[13px] font-semibold text-blue-800 dark:text-blue-300">
                          Approver {number} Details
                        </h3>
                        <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                          {[
                            ["Emp Code", approverCode],
                            ["Name", approverName],
                            ["Action Status", getStatusLabel(actionStatus)],
                            ["Remarks", remarks],
                            ["Action Taken On", actionOn],
                          ].map(([label, value]: any) => (
                            <div
                              key={label}
                              className="grid grid-cols-[130px_12px_minmax(0,1fr)] gap-1"
                            >
                              <span className="text-slate-500 dark:text-slate-400">
                                {label}
                              </span>
                              <span>:</span>
                              <span className="font-medium">
                                {displayValue(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[315px_minmax(0,1fr)]">
                  {/* EMPLOYEE SUMMARY */}
                  <aside className="space-y-4 border-b border-slate-300 pb-4 xl:border-b-0 xl:border-r xl:pr-5 dark:border-slate-700">
                    <section>
                      <h3 className="mb-3 text-[14px] font-bold text-slate-900 dark:text-slate-100">
                        Employee Information
                      </h3>
                      {[
                        [
                          "Employee Code",
                          ["Employee Code", "EMPCODE", "EMP_CODE", "EmpCode"],
                        ],
                        [
                          "Employee Name",
                          ["Employee Name", "EMP_NAME", "EMPNAME", "EmpName"],
                        ],
                        [
                          "Joining Date",
                          ["Joining Date", "JoiningDate", "DOJ"],
                        ],
                        [
                          "Designation",
                          ["Designation", "DESIGNATION", "Desig_Name"],
                        ],
                      ].map(([label, aliases]: any) => (
                        <div
                          key={label}
                          className="mb-2 grid grid-cols-[130px_10px_minmax(0,1fr)] gap-1 text-[12px]"
                        >
                          <span>{label}</span>
                          <span>:</span>
                          <span className="font-semibold">
                            {label === "Joining Date"
                              ? formatDateOnly(
                                getFieldValue(selectedEmployee, aliases),
                              )
                              : displayValue(
                                getFieldValue(selectedEmployee, aliases),
                              )}
                          </span>
                        </div>
                      ))}
                    </section>

                    <section className="border-t border-slate-300 pt-4 dark:border-slate-700">
                      <h3 className="mb-3 text-[14px] font-bold text-slate-900 dark:text-slate-100">
                        Organizational Details
                      </h3>
                      {[
                        ["Region", ["Region", "Sal_Region"]],
                        ["Channel", ["Channel", "ChannelName"]],
                        ["Cluster", ["Cluster", "ClusterName"]],
                        ["Location", ["Location", "Branch", "Loc_Name"]],
                        ["Section", ["Section", "SectionName"]],
                        ["Department", ["Department", "Dept_Name"]],
                      ].map(([label, aliases]: any) => (
                        <div
                          key={label}
                          className="mb-2 grid grid-cols-[130px_10px_minmax(0,1fr)] gap-1 text-[12px]"
                        >
                          <span>{label}</span>
                          <span>:</span>
                          <span className="font-semibold">
                            {displayValue(
                              getFieldValue(selectedEmployee, aliases),
                            )}
                          </span>
                        </div>
                      ))}
                    </section>

                    <section className="border-t border-slate-300 pt-4 dark:border-slate-700">
                      <h3 className="mb-3 text-[14px] font-bold text-slate-900 dark:text-slate-100">
                        Attendance Summary
                      </h3>
                      {[
                        ["Paid Days", ["Paid Days", "PaidDays", "PAID_DAYS"]],
                        [
                          "Total Penalty Days",
                          [
                            "Total Penalty Days",
                            "TotalPenaltyDays",
                            "Penalty_Days",
                          ],
                        ],
                        [
                          "Total Days in Period",
                          [
                            "Month Count",
                            "MonthCount",
                            "Month_Days",
                            "TotalMonth",
                          ],
                        ],
                      ].map(([label, aliases]: any) => (
                        <div
                          key={label}
                          className="mb-2 grid grid-cols-[140px_10px_minmax(0,1fr)] gap-1 text-[12px]"
                        >
                          <span>{label}</span>
                          <span>:</span>
                          <span className="font-bold">
                            {displayValue(
                              getFieldValue(selectedEmployee, aliases),
                            )}
                          </span>
                        </div>
                      ))}
                    </section>
                  </aside>

                  {/* DAILY ATTENDANCE */}
                  <section className="min-w-0">
                    <h3 className="mb-3 text-[14px] font-bold text-slate-900 dark:text-slate-100">
                      <span className="mr-2">🗓️</span>
                      Daily Attendance Records ({
                        attendanceDetailRows.length
                      }{" "}
                      records)
                    </h3>

                    {detailLoading ? (
                      <div className="flex min-h-[220px] items-center justify-center text-[13px] text-slate-500">
                        Loading employee attendance records...
                      </div>
                    ) : attendanceDetailRows.length === 0 ? (
                      <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-dashed border-slate-300 text-[13px] text-slate-500 dark:border-slate-700">
                        No daily attendance records available for this employee.
                      </div>
                    ) : (
                      <div className="max-h-[68vh] space-y-3 overflow-y-auto pr-1">
                        {attendanceDetailRows.map((item, index) => {
                          const inImage = getAttendanceInImage(item);
                          const outImage = getAttendanceOutImage(item);
                          return (
                            <article
                              key={`${getAttendanceDate(item) || "date"}-${index}`}
                              className="rounded-lg border border-slate-200 border-l-[3px] border-l-slate-800 bg-[#f4f8fc] p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800/60"
                            >
                              <h4 className="mb-4 text-[14px] font-bold text-slate-900 dark:text-slate-100">
                                🗓️{" "}
                                {formatDate(getAttendanceDate(item)) ||
                                  `Record ${index + 1}`}
                              </h4>
                              <div className="grid grid-cols-3 gap-3 text-[12px]">
                                <div>
                                  <p className="mb-1 text-slate-600 dark:text-slate-400">
                                    Status
                                  </p>
                                  <p className="font-bold text-slate-900 dark:text-slate-100">
                                    {displayValue(getAttendanceStatus(item))}
                                  </p>
                                </div>
                                <div>
                                  <p className="mb-1 text-slate-600 dark:text-slate-400">
                                    In Time
                                  </p>
                                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                                    {displayValue(getAttendanceInTime(item))}
                                  </p>
                                </div>
                                <div>
                                  <p className="mb-1 text-slate-600 dark:text-slate-400">
                                    Out Time
                                  </p>
                                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                                    {displayValue(getAttendanceOutTime(item))}
                                  </p>
                                </div>
                              </div>

                              {inImage || outImage ? (
                                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  {[
                                    ["Punch In Image", inImage],
                                    ["Punch Out Image", outImage],
                                  ].map(([label, imageSrc]: any) => (
                                    <div key={label}>
                                      <p className="mb-1 text-[11px] text-slate-500">
                                        {label}
                                      </p>
                                      <div className="flex h-[130px] items-center justify-center overflow-hidden rounded-md border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900">
                                        {imageSrc ? (
                                          <img
                                            src={imageSrc}
                                            alt={label}
                                            className="h-full w-full object-contain"
                                          />
                                        ) : (
                                          <span className="text-[11px] italic text-slate-400">
                                            No punch image available
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="mt-3 rounded border-l-[3px] border-slate-800 bg-white px-3 py-2 text-[12px] text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                  ⚠️ No punch images available for this date
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
