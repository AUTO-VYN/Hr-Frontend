"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { ArrowLeft } from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import useExcelDownload from "@/app/hooks/excel-download";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";
import AButton from "@/components/atoms/Button";
import FilterScope from "@/components/atoms/FilterScope";

/* ------------------------------------------------------------------ */
/* TYPES                                                              */
/* ------------------------------------------------------------------ */

type Option = {
  value: string;
  label: string;
};

type FilterKey =
  | "Region"
  | "CHANNEL"
  | "CLUSTER"
  | "Location"
  | "SECTION"
  | "DIVISION"
  | "DESIGNATION";

type FilterConfig = {
  key: FilterKey;
  title: string;
  codeKeys: string[];
  nameKeys: string[];
};

type ColumnKind = "code" | "name" | "number" | "date";
type TypeCard = "all" | "regular" | "casual" | "apprentice";

/* ------------------------------------------------------------------ */
/* CONSTANTS                                                          */
/* ------------------------------------------------------------------ */

const API_URL = process.env.NEXT_PUBLIC_URL;

const REPORT_ENDPOINT = "/hrmsreport/EmployeeBalanceReport";
const MASTER_ENDPOINT = "/hrmsreport/findMasters";

const REPORT_PERMISSION = "";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTHS: Option[] = MONTH_NAMES.map((label, index) => ({
  value: String(index + 1),
  label,
}));

const CURRENT_DATE = new Date();
const CURRENT_YEAR = CURRENT_DATE.getFullYear();

const YEARS: Option[] = Array.from({ length: 15 }, (_, index) => {
  const year = CURRENT_YEAR - index;

  return {
    value: String(year),
    label: String(year),
  };
});

const EMPLOYEE_TYPES: Option[] = [
  { value: "1", label: "Regular" },
  { value: "2", label: "Casual" },
  { value: "3", label: "Apprentice" },
];

const FILTER_CONFIG: FilterConfig[] = [
  {
    key: "Region",
    title: "Regions",
    codeKeys: ["Region_Code", "RegionCode", "REGION_CODE", "Code", "value"],
    nameKeys: ["Region_Name", "RegionName", "REGION_NAME", "Name", "label"],
  },
  {
    key: "CHANNEL",
    title: "Channel",
    codeKeys: ["Channel_Code", "ChannelCode", "CHANNEL_CODE", "Code", "value"],
    nameKeys: ["Channel_Name", "ChannelName", "CHANNEL_NAME", "Name", "label"],
  },
  {
    key: "CLUSTER",
    title: "Cluster",
    codeKeys: ["Cluster_Code", "ClusterCode", "CLUSTER_CODE", "Code", "value"],
    nameKeys: ["Cluster_Name", "ClusterName", "Name", "label"],
  },
  {
    key: "Location",
    title: "Locations",
    codeKeys: ["Loc_code", "LOC_CODE", "LocationCode", "Code", "value"],
    nameKeys: ["Loc_name", "LocationName", "LOC_NAME", "Name", "label"],
  },
  {
    key: "SECTION",
    title: "Sections",
    codeKeys: ["Section_Code", "SectionCode", "SECTION_CODE", "Code", "value"],
    nameKeys: ["Section_Name", "SectionName", "Name", "label"],
  },
  {
    key: "DIVISION",
    title: "Department",
    codeKeys: [
      "Division_Code",
      "DivisionCode",
      "DIVISION_CODE",
      "Code",
      "value",
    ],
    nameKeys: ["Division_Name", "DivisionName", "Name", "label"],
  },
  {
    key: "DESIGNATION",
    title: "Designation",
    codeKeys: [
      "Designation_Code",
      "DesignationCode",
      "Desig_Code",
      "DESIGNATION_CODE",
      "Code",
      "value",
    ],
    nameKeys: [
      "Designation_Name",
      "DesignationName",
      "Desig_Name",
      "DESIGNATION_NAME",
      "Name",
      "label",
    ],
  },
];

const EMPTY_SELECTED: Record<FilterKey, string[]> = {
  Region: [],
  CHANNEL: [],
  CLUSTER: [],
  Location: [],
  SECTION: [],
  DIVISION: [],
  DESIGNATION: [],
};

/* Original Employee Balance Report columns */

const REPORT_COLUMNS: {
  header: string;
  keys: string[];
  kind?: ColumnKind;
}[] = [
  {
    header: "MONTH",
    keys: ["month", "sal_mnth"],
  },
  {
    header: "YEAR",
    keys: ["year", "sal_yr"],
  },
  {
    header: "EMPLOYEE CODE",
    keys: ["empcode", "employee_code", "emp_code"],
    kind: "code",
  },
  {
    header: "EMPLOYEE NAME",
    keys: ["empfirstname", "employeename", "empname", "employee_name", "name"],
    kind: "name",
  },
  {
    header: "LOCATION",
    keys: ["location", "locationname", "locname", "branch"],
  },
  {
    header: "OPENING BALANCE",
    keys: ["opening_balance", "openingbalance"],
    kind: "number",
  },
  {
    header: "DEDUCTION",
    keys: ["deduction"],
    kind: "number",
  },
  {
    header: "DIFFERENCE",
    keys: ["difference"],
    kind: "number",
  },
];

const TYPE_BADGE_CLASS: Record<string, string> = {
  regular:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  casual: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  apprentice: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
};

/* ------------------------------------------------------------------ */
/* HELPERS                                                            */
/* ------------------------------------------------------------------ */

const getArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.data)) return value.data;
  if (value && Array.isArray(value.recordset)) return value.recordset;

  return [];
};

const getResponseRows = (response: any): any[] => {
  const candidates = [
    response?.data?.data,
    response?.data?.Result,
    response?.data?.result,
    response?.data?.recordset,
    response?.data?.Data,
    response?.data,
  ];

  for (const item of candidates) {
    if (Array.isArray(item)) return item;

    if (item && typeof item === "object") {
      const nested = [item.data, item.Result, item.result, item.recordset];

      for (const value of nested) {
        if (Array.isArray(value)) return value;
      }
    }
  }

  return [];
};

const getApiError = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.response?.data?.error ||
  error?.message ||
  "Something went wrong. Please try again.";

const getLabel = (item: any, keys: string[]): string => {
  if (typeof item === "string" || typeof item === "number") {
    return String(item);
  }

  for (const key of keys) {
    if (
      item?.[key] !== undefined &&
      item?.[key] !== null &&
      String(item[key]).trim() !== ""
    ) {
      return String(item[key]).trim();
    }
  }

  return "";
};

const getCode = (value: any) =>
  value === null || value === undefined
    ? ""
    : String(value).split(" · ")[0].split(" - ")[0].trim();

const makeOptions = (
  data: any[],
  codeKeys: string[],
  nameKeys: string[],
): Option[] => {
  const result = data
    .map((item) => {
      const code = getLabel(item, codeKeys);
      const name = getLabel(item, nameKeys);

      if (!code && !name) return null;

      return {
        value: String(code || name),
        label:
          code && name && code !== name ? `${code} · ${name}` : name || code,
      };
    })
    .filter(Boolean) as Option[];

  return Array.from(new Map(result.map((item) => [item.value, item])).values());
};

const formatDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

const getMonthDates = (year: string, month: string) => {
  const yearNumber = Number(year);
  const monthNumber = Number(month);

  if (
    !year ||
    !month ||
    !Number.isInteger(yearNumber) ||
    !Number.isInteger(monthNumber) ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    return {
      from: "",
      to: "",
    };
  }

  // Selected month ka actual last day
  const lastDay = new Date(yearNumber, monthNumber, 0).getDate();

  return {
    from: formatDate(new Date(yearNumber, monthNumber - 1, 1)),
    to: formatDate(new Date(yearNumber, monthNumber - 1, lastDay)),
  };
};
const formatDateForAPI = (dateStr: any) => {
  if (!dateStr) return "";

  const parts = String(dateStr).split("/");

  if (parts.length !== 3) return "";

  const [day, month, year] = parts;

  if (!day || !month || !year) return "";

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const calculateDates = (
  year: string,
  monthStart: string,
  monthEnd: string,
  month: number,
) => {
  const parsedYear = parseInt(year, 10);

  const fiscalYearStart =
    parseInt(monthStart, 10) >= month ? parsedYear : parsedYear + 1;

  const fiscalYearEnd =
    parseInt(monthEnd, 10) >= month ? parsedYear : parsedYear + 1;

  const startDate = new Date(fiscalYearStart, parseInt(monthStart, 10) - 1, 2);

  const endDate = new Date(fiscalYearEnd, parseInt(monthEnd, 10), 1);

  return {
    start: formatDate(startDate),
    end: formatDate(endDate),
  };
};

const normalizeKey = (value: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const prettyHeader = (key: string) =>
  key
    .replace(/[_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();

const cellText = (value: any) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);

  return String(value);
};

const isEmptyValue = (value: any) =>
  value === null || value === undefined || String(value).trim() === "";

const parseAnyDate = (value: any): Date | null => {
  if (isEmptyValue(value)) return null;

  const text = String(value).trim();

  let match = text.match(
    /^(\d{1,2})[-/\s]([A-Za-z]{3})[A-Za-z]*[-/\s,]+(\d{2,4})$/,
  );

  if (match) {
    const monthIndex = MONTH_NAMES.findIndex(
      (name) => name.toLowerCase() === match![2].toLowerCase(),
    );

    if (monthIndex >= 0) {
      let year = Number(match[3]);

      if (year < 100) year += 2000;

      return new Date(year, monthIndex, Number(match[1]));
    }
  }

  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);

  if (match) {
    return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  }

  match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  return null;
};

const formatDisplayDate = (value: any) => {
  const date = parseAnyDate(value);

  return date
    ? `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
    : cellText(value);
};

const Dash = () => (
  <span className="text-slate-300 dark:text-slate-600">—</span>
);

/* ------------------------------------------------------------------ */
/* REPORT TABLE COLUMNS                                               */
/* ------------------------------------------------------------------ */

const buildReportColumns = (rows: any[]): any[] => {
  if (!rows.length) return [];

  const apiKeys = Object.keys(rows[0]);

  const keyMap = new Map(apiKeys.map((key) => [normalizeKey(key), key]));

  const makeCell = (kind?: ColumnKind) =>
    function Cell({ value }: any) {
      if (isEmptyValue(value)) return <Dash />;

      if (kind === "code") {
        return (
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            {String(value)}
          </span>
        );
      }

      if (kind === "name") {
        return (
          <span className="font-semibold text-[12px] text-slate-900 dark:text-slate-100">
            {String(value)}
          </span>
        );
      }

      if (kind === "number") {
        const number = Number(value);

        return (
          <span className="font-medium tabular-nums">
            {Number.isFinite(number)
              ? number.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              : cellText(value)}
          </span>
        );
      }

      if (kind === "date") {
        return <>{formatDisplayDate(value)}</>;
      }

      return <>{cellText(value)}</>;
    };

  const fixed = REPORT_COLUMNS.map((def) => {
    const foundKey = def.keys
      .map(normalizeKey)
      .find((normalizedKey) => keyMap.has(normalizedKey));

    if (!foundKey) return null;

    const accessor = keyMap.get(foundKey) as string;

    return {
      Header: def.header,
      accessor,
      Cell: makeCell(def.kind),
    };
  }).filter(Boolean) as any[];

  if (fixed.length < 3) {
    return apiKeys
      .filter(
        (key) => typeof rows[0][key] !== "object" || rows[0][key] === null,
      )
      .map((key) => ({
        Header: prettyHeader(key).toUpperCase(),
        accessor: key,
        Cell: makeCell(),
      }));
  }

  return fixed;
};

/* ------------------------------------------------------------------ */
/* SMALL COMPONENTS                                                   */
/* ------------------------------------------------------------------ */

function PageTop({ onBackToFilters }: { onBackToFilters?: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mt-1 text-[22px] font-bold leading-tight text-slate-900 dark:text-slate-100">
            Employee Balance Report
          </h1>
        </div>

        {onBackToFilters && (
          <AButton
            onClick={onBackToFilters}
            className="inline-flex h-[40px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 text-[12px] font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft size={14} />
            Back to filters
          </AButton>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  dotClass,
  active,
  onClick,
}: {
  label: string;
  value: number;
  dotClass: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 rounded-2xl border px-4 py-3.5 text-left transition ${
        active
          ? "border-indigo-300 bg-indigo-50 dark:border-indigo-500/50 dark:bg-indigo-500/10"
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} />
        {label}
      </div>

      <p className="mt-2 text-[28px] font-bold leading-none text-slate-900 dark:text-slate-100">
        {value}
      </p>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* PAGE                                                               */
/* ------------------------------------------------------------------ */

export default function LeftEmployeeAnalysisPage() {
  const user = useCurrentUser();

  const { handleExcelDownload } = useExcelDownload();

  const [loading, setLoading] = useState(false);
  const [masterLoading, setMasterLoading] = useState(false);

  const [month, setMonth] = useState(String(CURRENT_DATE.getMonth() + 1));

  const [year, setYear] = useState(String(CURRENT_YEAR));

  const initialDates = getMonthDates(
    String(CURRENT_YEAR),
    String(CURRENT_DATE.getMonth() + 1),
  );

  const [dateFrom, setDateFrom] = useState(initialDates.from);
  const [dateTo, setDateTo] = useState(initialDates.to);

  const [employeeType, setEmployeeType] = useState("");

  const [miscDates, setMiscDates] = useState<any[]>([]);

  const [filters, setFilters] = useState<Record<FilterKey, Option[]>>({
    Region: [],
    CHANNEL: [],
    CLUSTER: [],
    Location: [],
    SECTION: [],
    DIVISION: [],
    DESIGNATION: [],
  });

  const [selected, setSelected] =
    useState<Record<FilterKey, string[]>>(EMPTY_SELECTED);

  const [showReport, setShowReport] = useState(false);

  const [rows, setRows] = useState<any[]>([]);

  const [typeCard, setTypeCard] = useState<TypeCard>("all");

  const [resetKey, setResetKey] = useState(0);

  /* ---------------- permission + api ---------------- */

  const hasPermission = useCallback(
    (permission?: string) => {
      if (!permission) return true;

      const roles = user?.role1;

      if (!roles) return false;

      if (Array.isArray(roles)) {
        return roles.includes(permission);
      }

      return String(roles)
        .split(",")
        .map((item) => item.trim())
        .includes(permission);
    },
    [user?.role1],
  );

  const postApi = useCallback(
    async (path: string, payload: any, config: any = {}) => {
      if (!user?.Comp_Code) {
        throw new Error("Company code is not ready.");
      }

      if (!API_URL) {
        throw new Error("NEXT_PUBLIC_URL is not configured.");
      }

      return axios.post(`${API_URL}${path}`, payload, {
        headers: {
          compcode: user.Comp_Code,
          name: user?.name || "",
        },
        ...config,
      });
    },
    [user?.Comp_Code, user?.name],
  );

  /* ---------------- calendar month date handling ---------------- */

  useEffect(() => {
    if (!year || !month) return;

    const dates = getMonthDates(year, month);

    if (dates.from && dates.to) {
      setDateFrom(dates.from);
      setDateTo(dates.to);
    }
  }, [year, month]);

  /* ---------------- input handling ---------------- */

  const handleInputChange = (name: string, value: any) => {
    const val = String(value ?? "");

    if (name === "month") setMonth(val);

    if (name === "year") setYear(val);

    if (name === "employeeType") setEmployeeType(val);
  };

  /* ---------------- fetch master data ---------------- */

  const fetchMasters = useCallback(async () => {
    if (!user?.Comp_Code || !user?.branch) return;

    try {
      setMasterLoading(true);

      const response = await postApi(MASTER_ENDPOINT, {
        multiloc: user.branch,
        Month: month,
        Year: year,
      });

      const data = response?.data?.data;

      if (!data) {
        throw new Error("Filter master data was not returned.");
      }

      const locationData = Array.isArray(data?.Location?.[0])
        ? data.Location[0]
        : getArray(data?.Location);

      const masterData: Record<FilterKey, any[]> = {
        Region: getArray(data?.Region),
        CHANNEL: getArray(data?.CHANNEL),
        CLUSTER: getArray(data?.CLUSTER),
        Location: locationData,
        SECTION: getArray(data?.SECTION),
        DIVISION: getArray(data?.DIVISION),
        DESIGNATION: getArray(data?.DESIGNATION),
      };

      const nextFilters = {} as Record<FilterKey, Option[]>;

      FILTER_CONFIG.forEach((config) => {
        nextFilters[config.key] = makeOptions(
          masterData[config.key],
          config.codeKeys,
          config.nameKeys,
        );
      });

      setFilters(nextFilters);

      setSelected((previous) => {
        const next = { ...previous };

        FILTER_CONFIG.forEach((config) => {
          const available = new Set(
            nextFilters[config.key].map((item) => item.value),
          );

          next[config.key] = previous[config.key].filter((value) =>
            available.has(value),
          );
        });

        return next;
      });

      // Keep original MiscDate functionality for October and November.
      const misc = getArray(data?.MiscDate);
      setMiscDates(misc);

      const selectedMonth = Number(month);

      if (selectedMonth === 10 || selectedMonth === 11) {
        if (misc.length > 0) {
          const from = formatDateForAPI(misc[0]?.Misc_Dtl1);
          const to = formatDateForAPI(misc[0]?.Misc_Dtl2);

          if (from) setDateFrom(from);
          if (to) setDateTo(to);
        } else {
          const calculated = calculateDates(year, month, month, 1);

          setDateFrom(calculated.start);
          setDateTo(calculated.end);
        }
      } else {
        // Other months: first day to actual last day of calendar month.
        const yearNumber = Number(year);
        const monthNumber = Number(month);

        if (
          Number.isInteger(yearNumber) &&
          Number.isInteger(monthNumber) &&
          monthNumber >= 1 &&
          monthNumber <= 12
        ) {
          const lastDay = new Date(yearNumber, monthNumber, 0).getDate();

          const formatDate = (date: Date) => {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, "0");
            const dd = String(date.getDate()).padStart(2, "0");

            return `${yyyy}-${mm}-${dd}`;
          };

          setDateFrom(formatDate(new Date(yearNumber, monthNumber - 1, 1)));

          setDateTo(formatDate(new Date(yearNumber, monthNumber - 1, lastDay)));
        }
      }
    } catch (error) {
      console.error("Employee balance master error:", error);

      Swal.fire({
        icon: "error",
        title: "Unable to load filters",
        text: getApiError(error),
      });
    } finally {
      setMasterLoading(false);
    }
  }, [user?.Comp_Code, user?.branch, month, year, postApi]);

  useEffect(() => {
    if (user?.Comp_Code && user?.branch) {
      fetchMasters();
    }
  }, [fetchMasters, user?.Comp_Code, user?.branch]);

  /* ---------------- filter scope ---------------- */

  const filterScopeCategories = useMemo(
    () =>
      FILTER_CONFIG.map((config) => ({
        key: config.key,
        label: config.title,
        options: filters[config.key].map((item) => ({
          value: item.value,
          label: item.label,
        })),
      })),
    [filters],
  );

  const totalSelected = useMemo(
    () =>
      Object.values(selected).reduce(
        (total, values) => total + values.length,
        0,
      ),
    [selected],
  );

  /* ---------------- clear filters ---------------- */

  const handleClearAll = () => {
    setSelected(EMPTY_SELECTED);
    setEmployeeType("");

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Filters cleared",
      showConfirmButton: false,
      timer: 1200,
    });
  };

  /* ---------------- original report payload ---------------- */

  const getReportPayload = () => ({
    month: Number(month),
    year: Number(year),

    region: selected.Region.map(getCode),

    channel: selected.CHANNEL.map(getCode),

    Cluster: selected.CLUSTER.map(getCode),

    location:
      selected.Location.length > 0
        ? selected.Location.map(getCode)
        : user?.branch,

    section: selected.SECTION.map(getCode),

    department: selected.DIVISION.map(getCode),

    designation: selected.DESIGNATION.map(getCode),

    empcode: "",

    emptype: employeeType || "",
  });

  /* ---------------- report actions ---------------- */

  const resetReportFilters = () => {
    setTypeCard("all");
    setResetKey((previous) => previous + 1);
  };

  const handleBackToFilters = () => {
    setShowReport(false);
    resetReportFilters();
  };

  /* ---------------- get employee balance report ---------------- */

  const handleViewReport = async () => {
    if (!month || !year) {
      Swal.fire({
        icon: "warning",
        title: "Select month and year",
        text: "Please select both Month and Year.",
      });

      return;
    }

    if (!dateFrom || !dateTo) {
      Swal.fire({
        icon: "warning",
        title: "Select date range",
        text: "Please select both Date From and Date To.",
      });

      return;
    }

    if (new Date(dateFrom) > new Date(dateTo)) {
      Swal.fire({
        icon: "warning",
        title: "Invalid date range",
        text: "Date From cannot be greater than Date To.",
      });

      return;
    }

    if (!hasPermission(REPORT_PERMISSION)) {
      Swal.fire({
        icon: "warning",
        title: "Access denied",
        text: "You do not have permission to view this report.",
      });

      return;
    }

    try {
      setLoading(true);

      const payload = getReportPayload();

      console.log("Employee Balance Report Payload:", payload);

      const response = await postApi(REPORT_ENDPOINT, payload);

      const reportData = getResponseRows(response);

      setRows(reportData);

      resetReportFilters();

      setShowReport(true);

      if (!reportData.length) {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "info",
          title: "No records found",
          showConfirmButton: false,
          timer: 1500,
        });
      }
    } catch (error) {
      console.error("Employee balance report error:", error);

      Swal.fire({
        icon: "error",
        title: "Unable to load report",
        text: getApiError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- report columns ---------------- */

  const baseColumns = useMemo(() => buildReportColumns(rows), [rows]);

  const typeKey = useMemo(
    () => baseColumns.find((column) => column.Header === "EMP TYPE")?.accessor,
    [baseColumns],
  );

  /* ---------------- report summary ---------------- */

  const summary = useMemo(() => {
    const count = (word: string) =>
      typeKey
        ? rows.filter((row) =>
            cellText(row[typeKey]).toLowerCase().includes(word),
          ).length
        : 0;

    return {
      total: rows.length,
      regular: count("regular"),
      casual: count("casual"),
      apprentice: count("apprentice"),
    };
  }, [rows, typeKey]);

  /* ---------------- employee type filtering ---------------- */

  const filteredRows = useMemo(() => {
    if (typeCard === "all" || !typeKey) {
      return rows;
    }

    return rows.filter((row) =>
      cellText(row[typeKey]).toLowerCase().includes(typeCard),
    );
  }, [rows, typeCard, typeKey]);

  /* ---------------- visible columns ---------------- */

  const visibleColumns = useMemo(
    () =>
      baseColumns.filter((column) =>
        rows.some((row) => !isEmptyValue(row[column.accessor])),
      ),
    [baseColumns, rows],
  );

  /* ---------------- totals ---------------- */

  const balanceTotals = useMemo(() => {
    const getTotal = (keys: string[]) => {
      const normalized = keys.map(normalizeKey);

      return rows.reduce((sum, row) => {
        const key = Object.keys(row).find((item) =>
          normalized.includes(normalizeKey(item)),
        );

        return sum + Number(key ? row[key] || 0 : 0);
      }, 0);
    };

    return {
      opening: getTotal(["OPENING_BALANCE", "OPENINGBALANCE"]),
      deduction: getTotal(["DEDUCTION"]),
      difference: getTotal(["DIFFERENCE"]),
    };
  }, [rows]);

  /* ---------------- excel export ---------------- */

  const handleExportExcel = () => {
    if (!filteredRows.length) {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "info",
        title: "No data to export",
        showConfirmButton: false,
        timer: 1500,
      });

      return;
    }

    handleExcelDownload(
      visibleColumns.map((column) => ({
        Header: column.Header,
        accessor: column.accessor,
      })),
      filteredRows,
    );
  };

  /* ================================================================ */
  /* REPORT VIEW                                                      */
  /* ================================================================ */

  if (showReport) {
    return (
      <div className="min-h-screen min-w-0 bg-[#f8fafc] p-4 dark:bg-[#0b1220] sm:p-6">
        <HashloaderComponent isLoading={loading || masterLoading} />

        <div className="mx-auto max-w-[1800px] space-y-4">
          <PageTop onBackToFilters={handleBackToFilters} />

          {/* STAT CARDS - EXISTING UI */}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total left employees"
              value={summary.total}
              dotClass="bg-indigo-500"
              active={typeCard === "all"}
              onClick={() => setTypeCard("all")}
            />

            <StatCard
              label="Regular"
              value={summary.regular}
              dotClass="bg-emerald-600"
              active={typeCard === "regular"}
              onClick={() => setTypeCard("regular")}
            />

            <StatCard
              label="Casual"
              value={summary.casual}
              dotClass="bg-orange-600"
              active={typeCard === "casual"}
              onClick={() => setTypeCard("casual")}
            />

            <StatCard
              label="Apprenticeship"
              value={summary.apprentice}
              dotClass="bg-[#0ea5e9]"
              active={typeCard === "apprentice"}
              onClick={() => setTypeCard("apprentice")}
            />
          </div>

          {/* TABLE CARD */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
              <p className="text-[12px] text-slate-500 dark:text-slate-400">
                <b className="text-slate-900 dark:text-slate-100">
                  {filteredRows.length}
                </b>{" "}
                of {rows.length} employees
              </p>
            </div>

            {filteredRows.length > 0 ? (
              <DataTable
                key={`${resetKey}-${filteredRows.length}-${visibleColumns.length}`}
                columns={visibleColumns}
                data={filteredRows}
                height={520}
                initialPageSize={10}
                showPageSizeInFooter={true}
                showTopSearch={true}
                showExcelExport={true}
                resetFilters={true}
                showColumnFilters={true}
                containerClassName="border-t border-slate-200 text-[12px] dark:border-slate-800"
              />
            ) : (
              <div className="flex min-h-[180px] items-center justify-center text-[13px] text-slate-500 dark:text-slate-400">
                No employee balance records found.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /* FILTER VIEW                                                      */
  /* ================================================================ */

  return (
    <div className="min-h-screen min-w-0 bg-[#f8fafc] p-4 transition-colors dark:bg-[#0b1220] sm:p-6">
      <HashloaderComponent isLoading={loading || masterLoading} />

      <div className="mx-auto max-w-[1800px] space-y-4">
        <PageTop />

        {/* FILTER CONTAINER */}
        <div className="w-full min-w-0 space-y-4 ">
          {/* PERIOD FILTERS */}
          <div className="w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
              <div className="min-w-0">
                <Eselect
                  title="Year"
                  name="year"
                  option={YEARS}
                  initialValue={year}
                  handleInputChange={handleInputChange}
                  className="h-[40px] w-full text-[12px]"
                />
              </div>

              <div className="min-w-0">
                <Eselect
                  title="Month"
                  name="month"
                  option={MONTHS}
                  initialValue={month}
                  handleInputChange={handleInputChange}
                  className="h-[40px] w-full text-[12px]"
                />
              </div>

              <div className="min-w-0">
                <Einput
                  title="Date from"
                  name="dateFrom"
                  type="date"
                  value={dateFrom}
                  handleInputChange={(_, value) => setDateFrom(value || "")}
                  className="h-[40px] w-full text-[12px]"
                />
              </div>

              <div className="min-w-0">
                <Einput
                  title="Date to"
                  name="dateTo"
                  type="date"
                  value={dateTo}
                  handleInputChange={(_, value) => setDateTo(value || "")}
                  className="h-[40px] w-full text-[12px]"
                />
              </div>

              <div className="min-w-0">
                <Eselect
                  title="Employee type"
                  name="employeeType"
                  option={EMPLOYEE_TYPES}
                  initialValue={employeeType}
                  handleInputChange={handleInputChange}
                  className="h-[40px] w-full text-[12px]"
                />
              </div>

              <AButton
                onClick={handleViewReport}
                className="h-[40px] whitespace-nowrap rounded-xl bg-indigo-600 px-5 text-[12px] font-semibold text-white transition hover:bg-indigo-700"
              >
                View report
              </AButton>
            </div>
          </div>

          {/* FILTER SCOPE */}
          <div className="w-full min-w-0 lg:w-[70%]">
            <FilterScope
              title="Filter scope"
              categories={filterScopeCategories}
              selected={selected}
              onChange={setSelected}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
