"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Filter, ArrowLeft } from "lucide-react";

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

type Option = { value: string; label: string };
type FilterOption = { value: string; label: string };

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

type ColumnKind = "code" | "name" | "type" | "date";
type TypeCard = "all" | "regular" | "casual" | "apprentice";

/* ------------------------------------------------------------------ */
/* CONSTANTS                                                          */
/* ------------------------------------------------------------------ */

const API_URL = process.env.NEXT_PUBLIC_URL;
const REPORT_ENDPOINT = "/hrmsreport/leftEMPAnalaysisReport";
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
  return { value: String(year), label: String(year) };
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

const REPORT_COLUMNS: {
  header: string;
  keys: string[];
  kind?: ColumnKind;
}[] = [
  {
    header: "EMP CODE",
    keys: ["empcode", "employeecode", "empid", "ecode"],
    kind: "code",
  },
  {
    header: "EMPLOYEE NAME",
    keys: ["employeename", "empname", "name", "newempname"],
    kind: "name",
  },
  {
    header: "EMP TYPE",
    keys: ["employeetype", "emptype"],
    kind: "type",
  },
  { header: "COMPANY", keys: ["company", "companyname", "compname"] },
  { header: "REGION", keys: ["region", "regionname"] },
  { header: "CHANNEL", keys: ["channel", "channelname"] },
  { header: "CLUSTER", keys: ["cluster", "clustername"] },
  {
    header: "LOCATION",
    keys: ["location", "locationname", "locname", "branch", "branchname"],
  },
  { header: "SECTION", keys: ["section", "sectionname"] },
  {
    header: "DEPARTMENT",
    keys: ["department", "departmentname", "division", "divisionname"],
  },
  { header: "DESIGNATION", keys: ["designation", "designationname"] },
  {
    header: "DATE OF JOINING",
    keys: ["dateofjoining", "doj", "joiningdate"],
    kind: "date",
  },
  {
    header: "SOURCE OF JOINING",
    keys: ["sourcename", "sourceofjoining", "source_of_joining"],
  },
  {
    header: "RELIEVING DATE",
    keys: ["relievingdate", "dateofrelieving", "leftdate", "dateofleaving"],
    kind: "date",
  },
  {
    header: "REPORTING MANAGER CODE",
    keys: ["reportingmanagercode", "rmcode", "managercode"],
  },
  {
    header: "REPORTING MANAGER",
    keys: ["reportingmanager", "reportingmanagername", "rmname", "managername"],
  },
  { header: "DAYS WORKED", keys: ["daysworked", "workeddays", "totaldays"] },
  { header: "AGE", keys: ["age"] },
  { header: "RESIGNED STATUS", keys: ["resignedstatus", "resignstatus"] },
  {
    header: "NOTICE PERIOD STATUS",
    keys: ["noticeperiodstatus", "noticestatus"],
  },
  { header: "EXIT INTERVIEW TYPE", keys: ["exitinterviewtype"] },
  { header: "REMARKS", keys: ["remarks", "remark"] },
  { header: "CATEGORY", keys: ["category"] },
  {
    header: "RESIGNATION SUBMISSION DATE",
    keys: ["resignationsubmissiondate", "resignationdate", "resigndate"],
    kind: "date",
  },
  {
    header: "REASON FOR RESIGNATION",
    keys: ["reasonforresignation", "resignationreason", "reason"],
  },
  {
    header: "DATE OF EXIT INTERVIEW",
    keys: ["dateofexitinterview", "exitinterviewdate"],
    kind: "date",
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
): FilterOption[] => {
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
    .filter(Boolean) as FilterOption[];

  return Array.from(new Map(result.map((item) => [item.value, item])).values());
};

const formatDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Returns the first and last calendar date of the selected month.
 * JavaScript automatically handles different month lengths and leap years.
 */
const getMonthDates = (year: string, month: string) => {
  const monthNumber = Number(month);

  if (
    !year ||
    !month ||
    !Number.isInteger(Number(year)) ||
    !Number.isInteger(monthNumber) ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    return { from: "", to: "" };
  }

  const first = new Date(Number(year), monthNumber - 1, 1);
  const last = new Date(Number(year), monthNumber, 0);

  return {
    from: formatDate(first),
    to: formatDate(last),
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

  // Example: 15-Oct-2026 or 15 October 2026
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

  // Example: 15/10/2026
  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);

  if (match) {
    return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  }

  // Example: 2026-10-15
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

      if (kind === "type") {
        const text = String(value).trim();
        const lower = text.toLowerCase();

        const badge =
          Object.keys(TYPE_BADGE_CLASS).find((word) => lower.includes(word)) ||
          "";

        return (
          <span
            className={`inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ${
              TYPE_BADGE_CLASS[badge] ||
              "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {text}
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
      .map((key) => normalizeKey(key))
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
    const fallback = apiKeys
      .filter(
        (key) => typeof rows[0][key] !== "object" || rows[0][key] === null,
      )
      .map((key) => ({
        Header: prettyHeader(key).toUpperCase(),
        accessor: key,
        Cell: makeCell(),
      }));

    // Preserve the requested Source Of Joining header in fallback mode too.
    const sourceKey = ["sourcename", "sourceofjoining", "source_of_joining"]
      .map(normalizeKey)
      .find((key) => keyMap.has(key));

    if (
      sourceKey &&
      !fallback.some((column) => column.accessor === keyMap.get(sourceKey))
    ) {
      fallback.push({
        Header: "SOURCE OF JOINING",
        accessor: keyMap.get(sourceKey),
        Cell: makeCell(),
      });
    }

    return fallback;
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
            Left Employee Analysis
          </h1>
        </div>

        {onBackToFilters && (
          <AButton
            onClick={onBackToFilters}
            className="inline-flex h-[38px] items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 text-[12px] font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
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

  const [filters, setFilters] = useState<Record<FilterKey, FilterOption[]>>({
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

      if (Array.isArray(roles)) return roles.includes(permission);

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

  /**
   * Whenever month or year changes, recalculate the calendar range.
   * This effect is intentionally independent of the master API.
   */
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

    if (name === "month") {
      setMonth(val);
    }

    if (name === "year") {
      setYear(val);
    }

    if (name === "employeeType") {
      setEmployeeType(val);
    }
  };

  /* ---------------- masters ---------------- */

  const fetchMasters = useCallback(async () => {
    if (!user?.Comp_Code || !user?.branch) return;

    try {
      setMasterLoading(true);

      const response = await postApi("/hrmsreport/findMasters", {
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

      const nextFilters = {} as Record<FilterKey, FilterOption[]>;

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
    } catch (error) {
      console.error("Left employee master error:", error);

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

  /* ---------------- filter selection ---------------- */

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

  /* ---------------- report payload ---------------- */

  const getReportPayload = () => ({
    DATE_FROM: dateFrom,
    DATE_TO: dateTo,

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

  const handleViewReport = async () => {
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

      const response = await postApi(REPORT_ENDPOINT, getReportPayload());

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
      console.error("Left employee report error:", error);

      Swal.fire({
        icon: "error",
        title: "Unable to load report",
        text: getApiError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- report data ---------------- */

  const baseColumns = useMemo(() => buildReportColumns(rows), [rows]);

  const typeKey = useMemo(
    () => baseColumns.find((column) => column.Header === "EMP TYPE")?.accessor,
    [baseColumns],
  );

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

  const filteredRows = useMemo(() => {
    if (typeCard === "all" || !typeKey) return rows;

    return rows.filter((row) =>
      cellText(row[typeKey]).toLowerCase().includes(typeCard),
    );
  }, [rows, typeCard, typeKey]);

  /**
   * Source Of Joining is retained even if every row has a null value.
   * This also means Excel export includes the same column.
   */
  const visibleColumns = useMemo(
    () =>
      baseColumns.filter(
        (column) =>
          column.Header === "SOURCE OF JOINING" ||
          rows.some((row) => !isEmptyValue(row[column.accessor])),
      ),
    [baseColumns, rows],
  );

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

          {/* STAT CARDS */}

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
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /* FILTER VIEW                                                      */
  /* ================================================================ */

  return (
    <div className="min-h-screen min-w-0 bg-[#f8fafc] p-2 transition-colors dark:bg-[#0b1220]">
      <HashloaderComponent isLoading={loading || masterLoading} />

      <div className="mx-auto max-w-[1800px] space-y-4">
        <PageTop />

        {/* PERIOD FILTERS */}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
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

        <div className="w-full p-0 lg:w-[66%]">
          <FilterScope
            title="Filter scope"
            categories={filterScopeCategories}
            selected={selected}
            onChange={setSelected}
          />
        </div>
      </div>
    </div>
  );
}
