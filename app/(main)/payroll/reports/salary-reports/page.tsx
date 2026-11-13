"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Search,
  Download,
  Filter,
  X,
  Check,
  ChevronRight,
  Users,
  UserRound,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";

type Option = {
  value: string;
  label: string;
};

type FilterOption = {
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

const API_URL = process.env.NEXT_PUBLIC_URL;

const MONTHS: Option[] = [
  { value: "1", label: "Jan" },
  { value: "2", label: "Feb" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Apr" },
  { value: "5", label: "May" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Aug" },
  { value: "9", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

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
  { value: "", label: "All" },
  { value: "1", label: "Regular" },
  { value: "2", label: "Casual" },
  { value: "3", label: "Apprentice" },
];

const DAYS_OPTIONS: Option[] = [
  { value: "", label: "All" },
  { value: "1", label: "YES" },
  { value: "2", label: "NO" },
];

const PAYMENT_OPTIONS: Option[] = [
  { value: "", label: "All" },
  { value: "1", label: "YES" },
  { value: "2", label: "NO" },
];

const FILTER_CONFIG: FilterConfig[] = [
  {
    key: "Region",
    title: "Regions",
    codeKeys: [
      "Region_Code",
      "RegionCode",
      "REGION_CODE",
      "Code",
      "value",
      "value",
    ],
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

const REPORTS = {
  salary: {
    name: "Salary Report",
    endpoint: "/hrmsreport/SalaryReport",
    permission: "12.1.6",
    pdfPermission: "12.1.21",
  },
  status: {
    name: "Salary Report With All Status",
    endpoint: "/hrmsreport/SalaryReportWithStatus",
    permission: "12.1.7",
    pdfPermission: "12.1.22",
  },
  old: {
    name: "OLD Salary Report",
    endpoint: "/hrmsreport/OLDSalaryReport",
    permission: "12.1.16",
    pdfPermission: "12.1.23",
  },
  ytd: {
    name: "YTD Salary Report",
    endpoint: "/hrmsreport/YTDSalaryReport",
    permission: "12.1.18",
  },
};

const getText = (...values: any[]): string => {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
};

const getArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;

  if (value && Array.isArray(value.data)) {
    return value.data;
  }

  if (value && Array.isArray(value.recordset)) {
    return value.recordset;
  }

  return [];
};

const getResponseRows = (response: any): any[] => {
  const candidates = [
    response?.data?.data,
    response?.data?.Result,
    response?.data?.result,
    response?.data?.recordset,
    response?.data?.Data,
    response?.data?.employees,
    response?.data?.Employees,
    response?.data,
  ];

  for (const item of candidates) {
    if (Array.isArray(item)) return item;

    if (item && typeof item === "object") {
      const nested = [
        item.data,
        item.Result,
        item.result,
        item.recordset,
        item.Data,
        item.employees,
        item.Employees,
      ];

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
      return String(item[key]);
    }
  }

  return "";
};

const getCode = (value: any) =>
  value === null || value === undefined
    ? ""
    : String(value).split(" - ")[0].trim();

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
          code && name && code !== name ? `${code} - ${name}` : name || code,
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

const getMonthDates = (year: string, month: string) => {
  const first = new Date(Number(year), Number(month) - 1, 1);
  const last = new Date(Number(year), Number(month), 0);

  return {
    from: formatDate(first),
    to: formatDate(last),
  };
};

const formatDateForAPI = (dateStr: any) => {
  if (!dateStr) return "";

  const value = String(dateStr).trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  // DD/MM/YYYY
  const parts = value.split("/");

  if (parts.length === 3) {
    const [day, month, year] = parts;

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return "";
};

const normalizeEmployee = (item: any) => {
  const code = getText(
    item?.value,
    item?.EMPCODE,
    item?.EmpCode,
    item?.EmployeeCode,
    item?.empcode,
    item?.Code,
  );

  const name = getText(
    item?.label?.split(" - ").slice(1).join(" - "),
    item?.EmployeeName,
    item?.EmpName,
    item?.EMP_NAME,
    item?.Name,
    item?.EMPNAME,
  );

  return {
    code,
    name: name || code,
    designation: getText(item?.DESIGNATION, item?.Designation, item?.DesigName),
    branch: getText(
      item?.LocationName,
      item?.BranchName,
      item?.LOC_NAME,
      item?.Location,
      item?.Branch,
    ),
    type: getText(item?.EmployeeType, item?.EmpType, item?.EMP_TYPE),
    raw: item,
  };
};

function FilterScope({
  config,
  options,
  selected,
  search,
  onSearch,
  onToggle,
  onSelectAll,
  onClear,
}: {
  config: FilterConfig;
  options: FilterOption[];
  selected: string[];
  search: string;
  onSearch: (value: string) => void;
  onToggle: (value: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return options;

    return options.filter((item) => item.label.toLowerCase().includes(term));
  }, [options, search]);

  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={`Search ${config.title.toLowerCase()}`}
            className="h-[38px] w-full rounded-lg border border-[#dce5f1] bg-[#f8fafc] pl-9 pr-3 text-[12px] text-[#152b4b] outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-indigo-900"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSelectAll}
            className="whitespace-nowrap text-[12px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Select all
          </button>

          <button
            type="button"
            onClick={onClear}
            className="whitespace-nowrap text-[12px] font-medium text-slate-500 hover:text-red-500"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="max-h-[265px] min-h-[180px] overflow-y-auto rounded-lg border border-[#e7edf5] p-2 dark:border-slate-800">
        {filtered.length ? (
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {filtered.map((item) => {
              const checked = selected.includes(item.value);

              return (
                <label
                  key={item.value}
                  className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition ${
                    checked
                      ? "bg-indigo-50 dark:bg-indigo-500/10"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(item.value)}
                    className="h-4 w-4 shrink-0 rounded border-[#cbd5e1] text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
                  />

                  <span className="min-w-0 break-words text-[12px] text-[#52627c] dark:text-slate-300">
                    {item.label}
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <div className="flex h-[170px] flex-col items-center justify-center text-center">
            <Search size={22} className="mb-2 text-slate-300" />

            <p className="text-[12px] text-slate-400">
              No {config.title.toLowerCase()} found
            </p>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-slate-500">
          {selected.length} selected
        </span>

        <span className="text-[11px] text-slate-400">
          {options.length} available
        </span>
      </div>
    </div>
  );
}

function DownloadRow({
  title,
  excel,
  pdf,
  onExcel,
  onPdf,
}: {
  title: string;
  excel?: boolean;
  pdf?: boolean;
  onExcel?: () => void;
  onPdf?: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 border-b border-[#e8edf5] px-4 py-3 last:border-b-0 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
      <span className="min-w-0 text-[12px] font-medium text-[#152b4b] dark:text-slate-200">
        {title}
      </span>

      <div className="flex shrink-0 items-center gap-2">
        {excel && (
          <button
            type="button"
            onClick={onExcel}
            className="inline-flex h-[31px] items-center justify-center gap-1.5 rounded-lg border border-[#dce5f1] bg-white px-3 text-[11px] font-semibold text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-emerald-500/10"
          >
            <Download size={13} />
            Excel
          </button>
        )}

        {pdf && (
          <button
            type="button"
            onClick={onPdf}
            className="inline-flex h-[31px] items-center justify-center gap-1.5 rounded-lg border border-[#dce5f1] bg-white px-3 text-[11px] font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-red-500/10"
          >
            <Download size={13} />
            PDF
          </button>
        )}
      </div>
    </div>
  );
}

export default function SalaryReportsPage() {
  const user = useCurrentUser();

  const [loading, setLoading] = useState(false);
  const [masterLoading, setMasterLoading] = useState(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);

  const [month, setMonth] = useState(String(CURRENT_DATE.getMonth() + 1));

  const [year, setYear] = useState(String(CURRENT_YEAR));

  const initialDates = getMonthDates(
    String(CURRENT_YEAR),
    String(CURRENT_DATE.getMonth() + 1),
  );

  const [dateFrom, setDateFrom] = useState(initialDates.from);
  const [dateTo, setDateTo] = useState(initialDates.to);

  const [miscDates, setMiscDates] = useState<any[]>([]);

  const [filters, setFilters] = useState<Record<FilterKey, FilterOption[]>>({
    Region: [],
    CHANNEL: [],
    CLUSTER: [],
    Location: [],
    SECTION: [],
    DIVISION: [],
    DESIGNATION: [],
  });

  const [selected, setSelected] = useState<Record<FilterKey, string[]>>({
    Region: [],
    CHANNEL: [],
    CLUSTER: [],
    Location: [],
    SECTION: [],
    DIVISION: [],
    DESIGNATION: [],
  });

  const [searches, setSearches] = useState<Record<FilterKey, string>>({
    Region: "",
    CHANNEL: "",
    CLUSTER: "",
    Location: "",
    SECTION: "",
    DIVISION: "",
    DESIGNATION: "",
  });

  const [activeFilter, setActiveFilter] = useState<FilterKey>("Region");

  const [employeeMaster, setEmployeeMaster] = useState<any[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  const [employeeType, setEmployeeType] = useState("");
  const [totalDays, setTotalDays] = useState("");
  const [finalPayment, setFinalPayment] = useState("");

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

  // --------------------------------------------------
  // DATE INPUT HANDLING
  // --------------------------------------------------

  const handleInputChange = (name: string, value: any) => {
    const val = String(value ?? "");

    if (name === "month") {
      setMonth(val);

      const dates = getMonthDates(year, val);

      setDateFrom(dates.from);
      setDateTo(dates.to);
    }

    if (name === "year") {
      setYear(val);

      const dates = getMonthDates(val, month);

      setDateFrom(dates.from);
      setDateTo(dates.to);
    }

    if (name === "employeeType") {
      setEmployeeType(val);
    }

    if (name === "totalDays") {
      setTotalDays(val);
    }

    if (name === "finalPayment") {
      setFinalPayment(val);
    }
  };

  // --------------------------------------------------
  // LOAD MASTER FILTERS
  // --------------------------------------------------

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
      console.error("Salary report master error:", error);

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

  // --------------------------------------------------
  // MISC DATE API
  // --------------------------------------------------

  const fetchMiscDates = useCallback(async () => {
    if (!user?.Comp_Code || !user?.branch) return;

    try {
      const response = await postApi("/hrmsreport/findMasters", {
        multiloc: user.branch,
        Month: month,
        Year: year,
      });

      const misc = response?.data?.data?.MiscDate;

      setMiscDates(getArray(misc));
    } catch (error) {
      console.error("Misc date error:", error);
      setMiscDates([]);
    }
  }, [user?.Comp_Code, user?.branch, month, year, postApi]);

  useEffect(() => {
    if (user?.Comp_Code && user?.branch) {
      fetchMiscDates();
    }
  }, [fetchMiscDates, user?.Comp_Code, user?.branch]);

  useEffect(() => {
    if (!miscDates?.length) return;

    const misc = miscDates[0];

    const from = formatDateForAPI(misc?.Misc_Dtl1);
    const to = formatDateForAPI(misc?.Misc_Dtl2);

    if (from) setDateFrom(from);
    if (to) setDateTo(to);
  }, [miscDates]);

  // --------------------------------------------------
  // EMPLOYEE MASTER
  // Existing API: /users/findAllEmployee
  // --------------------------------------------------

  const loadEmployeeMaster = useCallback(async () => {
    if (!user?.Comp_Code || !user?.branch) return;

    try {
      setEmployeeLoading(true);

      const response = await postApi("/users/findAllEmployee", {
        branch: user.branch,
      });

      const rows = getResponseRows(response);

      setEmployeeMaster(
        rows.map(normalizeEmployee).filter((item: any) => item.code),
      );

      setSelectedEmployee(null);
      setEmployeeSearch("");
    } catch (error) {
      console.error("Employee master error:", error);

      setEmployeeMaster([]);

      Swal.fire({
        icon: "error",
        title: "Unable to load employees",
        text: getApiError(error),
      });
    } finally {
      setEmployeeLoading(false);
    }
  }, [user?.Comp_Code, user?.branch, postApi]);

  useEffect(() => {
    if (user?.Comp_Code && user?.branch) {
      loadEmployeeMaster();
    }
  }, [loadEmployeeMaster, user?.Comp_Code, user?.branch]);

  // --------------------------------------------------
  // EMPLOYEE SEARCH
  // --------------------------------------------------

  const employeeOptions = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase();

    if (!term) return [];

    return employeeMaster
      .filter((item) => {
        return (
          item.code.toLowerCase().includes(term) ||
          item.name.toLowerCase().includes(term)
        );
      })
      .slice(0, 10);
  }, [employeeMaster, employeeSearch]);

  // --------------------------------------------------
  // FILTER SELECTION
  // --------------------------------------------------

  const toggleFilter = (key: FilterKey, value: string) => {
    setSelected((previous) => ({
      ...previous,
      [key]: previous[key].includes(value)
        ? previous[key].filter((item) => item !== value)
        : [...previous[key], value],
    }));
  };

  const selectAllFilter = (key: FilterKey) => {
    setSelected((previous) => ({
      ...previous,
      [key]: filters[key].map((item) => item.value),
    }));
  };

  const clearOneFilter = (key: FilterKey) => {
    setSelected((previous) => ({
      ...previous,
      [key]: [],
    }));
  };

  const totalSelected = useMemo(
    () =>
      Object.values(selected).reduce(
        (total, values) => total + values.length,
        0,
      ),
    [selected],
  );

  const clearAllFilters = () => {
    setSelected({
      Region: [],
      CHANNEL: [],
      CLUSTER: [],
      Location: [],
      SECTION: [],
      DIVISION: [],
      DESIGNATION: [],
    });

    setSearches({
      Region: "",
      CHANNEL: "",
      CLUSTER: "",
      Location: "",
      SECTION: "",
      DIVISION: "",
      DESIGNATION: "",
    });

    setSelectedEmployee(null);
    setEmployeeSearch("");
    setEmployeeType("");
    setTotalDays("");
    setFinalPayment("");
  };

  const handleClearAll = () => {
    clearAllFilters();

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "Filters cleared",
      showConfirmButton: false,
      timer: 1200,
    });
  };

  // --------------------------------------------------
  // EXISTING REPORT PAYLOADS
  // Exact field names preserved from old page
  // --------------------------------------------------

  const getReportPayload = (
    reportType: "salary" | "status" | "old" | "ytd",
  ) => {
    const locationSelected = selected.Location.length > 0;

    const commonPayload = {
      dateFrom: dateFrom,
      dateto: dateTo,

      compcode: user?.Comp_Code,

      region: selected.Region.map(getCode).join(","),
      channel: selected.CHANNEL.map(getCode).join(","),
      Cluster: selected.CLUSTER.map(getCode).join(","),

      location: locationSelected
        ? selected.Location.map(getCode).join(",")
        : user?.branch,

      user_location: locationSelected
        ? selected.Location.map(getCode).join(",")
        : "",

      section: selected.SECTION.map(getCode).join(","),
      department: selected.DIVISION.map(getCode).join(","),
      designation: selected.DESIGNATION.map(getCode).join(","),

      empcode: selectedEmployee?.code || null,
      emptype: employeeType || "",
    };

    if (reportType === "old") {
      return {
        ...commonPayload,
        total_days: totalDays || "",
        Final_Payment: finalPayment || "",
      };
    }

    return commonPayload;
  };

  // --------------------------------------------------
  // DOWNLOAD REPORT
  // --------------------------------------------------

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();

    link.remove();

    window.URL.revokeObjectURL(url);
  };

  const handleDownload = async (
    reportType: "salary" | "status" | "old" | "ytd",
    format: "Excel" | "PDF",
  ) => {
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

    const report = REPORTS[reportType];

    const permission =
      format === "PDF" && report.pdfPermission
        ? report.pdfPermission
        : report.permission;

    if (!hasPermission(permission)) {
      Swal.fire({
        icon: "warning",
        title: "Access denied",
        text: "You do not have permission to download this report.",
      });

      return;
    }

    if (format === "PDF" && reportType === "ytd") {
      Swal.fire({
        icon: "warning",
        title: "PDF not available",
        text: "YTD Salary Report supports Excel download only.",
      });

      return;
    }

    try {
      setLoading(true);

      const payload = getReportPayload(reportType);

      const endpoint = `${report.endpoint}?compcode=${user?.Comp_Code}`;

      const response = await postApi(endpoint, payload, {
        responseType: "blob",
      });

      const contentType = response?.headers?.["content-type"] || "";

      const blob = response.data;

      if (!blob || blob.size === 0) {
        throw new Error("The report returned an empty file.");
      }

      // Handle API errors returned as Blob.
      if (
        contentType.includes("application/json") ||
        contentType.includes("text/plain")
      ) {
        const text = await blob.text();

        let message = text;

        try {
          const parsed = JSON.parse(text);

          message = parsed?.message || parsed?.Message || parsed?.error || text;
        } catch {
          // Keep plain-text error.
        }

        throw new Error(message || "Report generation failed.");
      }

      const extension =
        contentType.includes("pdf") || format === "PDF" ? "pdf" : "xlsx";

      const fileName = `${report.name.replace(/[^a-zA-Z0-9 ]/g, "")}.${extension}`;

      downloadBlob(
        new Blob([blob], {
          type: contentType || "application/octet-stream",
        }),
        fileName,
      );

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `${report.name} downloaded`,
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (error: any) {
      console.error("Report download error:", error);

      let message = getApiError(error);

      if (error?.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const parsed = JSON.parse(text);

          message = parsed?.message || parsed?.Message || parsed?.error || text;
        } catch {
          // Use normal error message.
        }
      }

      Swal.fire({
        icon: "error",
        title: "Report download failed",
        text: message,
      });
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // REFRESH
  // --------------------------------------------------

  const handleRefresh = async () => {
    await Promise.all([fetchMasters(), fetchMiscDates(), loadEmployeeMaster()]);
  };

  const activeConfig = FILTER_CONFIG.find((item) => item.key === activeFilter)!;

  const periodLabel = `${
    MONTHS.find((item) => item.value === month)?.label
  } ${year}`;

  return (
    <div className="min-h-screen min-w-0 bg-[#f5f8fc] p-3 transition-colors dark:bg-[#0b1220] sm:p-4 lg:p-5">
      <HashloaderComponent
        isLoading={loading || masterLoading || employeeLoading}
      />

      <div className="mx-auto max-w-[1800px] space-y-3.5">
        {/* PAGE HEADER */}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[12px] text-[#64748b] dark:text-slate-400"></div>

            <h1 className="text-[21px] font-bold leading-tight text-[#152b4b] dark:text-slate-100">
              Salary Reports
            </h1>
          </div>
        </div>

        {/* DATE AND PERIOD FILTERS */}

        <div className="rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="min-w-0">
              <Eselect
                title="Year"
                name="year"
                option={YEARS}
                initialValue={year}
                handleInputChange={handleInputChange}
                className="h-[41px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="Month"
                name="month"
                option={MONTHS}
                initialValue={month}
                handleInputChange={handleInputChange}
                className="h-[41px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Einput
                title="Date from"
                name="dateFrom"
                type="date"
                value={dateFrom}
                handleInputChange={(_, value) => setDateFrom(value || "")}
                className="h-[41px] w-full"
              />
            </div>

            <div className="min-w-0">
              <Einput
                title="Date to"
                name="dateTo"
                type="date"
                value={dateTo}
                handleInputChange={(_, value) => setDateTo(value || "")}
                className="h-[41px] w-full"
              />
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}

        <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
          {/* FILTER SCOPE */}

          <div className="min-w-0 overflow-hidden rounded-xl border border-[#dce5f1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8edf5] px-4 py-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Filter
                  size={17}
                  className="text-indigo-600 dark:text-indigo-400"
                />

                <h2 className="text-[14px] font-bold text-[#152b4b] dark:text-slate-100">
                  Filter scope
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#64748b] dark:text-slate-400">
                  {totalSelected} selected
                </span>

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Clear all
                </button>
              </div>
            </div>

            <div className="grid min-h-[365px] grid-cols-1 md:grid-cols-[190px_minmax(0,1fr)]">
              {/* FILTER CATEGORY SIDEBAR */}

              <div className="border-b border-[#e8edf5] bg-[#fbfcfe] p-2 dark:border-slate-800 dark:bg-slate-900 md:border-b-0 md:border-r">
                <div className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible">
                  {FILTER_CONFIG.map((config) => {
                    const isActive = activeFilter === config.key;

                    const count = selected[config.key].length;

                    const total = filters[config.key].length;

                    return (
                      <button
                        key={config.key}
                        type="button"
                        onClick={() => setActiveFilter(config.key)}
                        className={`flex min-w-max items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition md:min-w-0 ${
                          isActive
                            ? "bg-[#eef2ff] text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                            : "text-[#52627c] hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span className="text-[12px] font-semibold">
                          {config.title}
                        </span>

                        <span
                          className={`text-[11px] ${
                            isActive ? "text-indigo-500" : "text-slate-400"
                          }`}
                        >
                          {count}/{total}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ACTIVE FILTER OPTIONS */}

              <div className="min-w-0 p-3.5 sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-[13px] font-bold text-[#152b4b] dark:text-slate-100">
                      {activeConfig.title}
                    </h3>

                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Select one or more {activeConfig.title.toLowerCase()}
                    </p>
                  </div>

                  <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                    {selected[activeFilter].length} selected
                  </span>
                </div>

                <FilterScope
                  config={activeConfig}
                  options={filters[activeFilter]}
                  selected={selected[activeFilter]}
                  search={searches[activeFilter]}
                  onSearch={(value) =>
                    setSearches((prev) => ({
                      ...prev,
                      [activeFilter]: value,
                    }))
                  }
                  onToggle={(value) => toggleFilter(activeFilter, value)}
                  onSelectAll={() => selectAllFilter(activeFilter)}
                  onClear={() => clearOneFilter(activeFilter)}
                />

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#e8edf5] pt-3 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400">
                    {filters[activeFilter].length} options available
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => clearOneFilter(activeFilter)}
                      className="inline-flex h-[30px] items-center gap-1 rounded-md border border-[#dce5f1] px-3 text-[11px] font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      <X size={12} />
                      Clear
                    </button>

                    <button
                      type="button"
                      onClick={() => selectAllFilter(activeFilter)}
                      className="inline-flex h-[30px] items-center gap-1 rounded-md bg-indigo-600 px-3 text-[11px] font-semibold text-white hover:bg-indigo-700"
                    >
                      <Check size={12} />
                      Select all
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}

          <div className="min-w-0 space-y-4">
            {/* DOWNLOAD PANEL */}

            <div className="overflow-hidden rounded-xl border border-[#dce5f1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-[#e8edf5] px-4 py-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Download
                    size={17}
                    className="text-indigo-600 dark:text-indigo-400"
                  />

                  <h2 className="text-[14px] font-bold text-[#152b4b] dark:text-slate-100">
                    Download
                  </h2>
                </div>

                <span className="text-[10px] text-slate-400">
                  {periodLabel}
                </span>
              </div>

              {hasPermission(REPORTS.salary.permission) && (
                <DownloadRow
                  title="Salary report"
                  excel
                  pdf={hasPermission(REPORTS.salary.pdfPermission)}
                  onExcel={() => handleDownload("salary", "Excel")}
                  onPdf={() => handleDownload("salary", "PDF")}
                />
              )}

              {hasPermission(REPORTS.status.permission) && (
                <DownloadRow
                  title="Salary report with status"
                  excel
                  pdf={hasPermission(REPORTS.status.pdfPermission)}
                  onExcel={() => handleDownload("status", "Excel")}
                  onPdf={() => handleDownload("status", "PDF")}
                />
              )}

              {hasPermission(REPORTS.old.permission) && (
                <DownloadRow
                  title="Old salary report"
                  excel
                  pdf={hasPermission(REPORTS.old.pdfPermission)}
                  onExcel={() => handleDownload("old", "Excel")}
                  onPdf={() => handleDownload("old", "PDF")}
                />
              )}

              {hasPermission(REPORTS.ytd.permission) && (
                <DownloadRow
                  title="YTD salary report"
                  excel
                  onExcel={() => handleDownload("ytd", "Excel")}
                />
              )}

              {!Object.values(REPORTS).some((report) =>
                hasPermission(report.permission),
              ) && (
                <div className="px-4 py-5 text-center text-[12px] text-slate-400">
                  No report permissions available.
                </div>
              )}
            </div>

            {/* EMPLOYEE SEARCH */}

            <div className="rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center gap-2">
                <Users
                  size={17}
                  className="text-indigo-600 dark:text-indigo-400"
                />

                <h2 className="text-[14px] font-bold text-[#152b4b] dark:text-slate-100">
                  Search by employee
                </h2>
              </div>

              {/* EMPLOYEE SEARCH INPUT */}

              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={employeeSearch}
                  onChange={(e) => {
                    setEmployeeSearch(e.target.value);
                    setSelectedEmployee(null);
                    setShowEmployeeDropdown(true);
                  }}
                  onFocus={() => setShowEmployeeDropdown(true)}
                  placeholder="Emp code or name"
                  className="h-[40px] w-full rounded-lg border border-[#dce5f1] bg-white pl-9 pr-9 text-[12px] text-[#152b4b] outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />

                {employeeSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmployeeSearch("");
                      setSelectedEmployee(null);
                      setShowEmployeeDropdown(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                )}

                {showEmployeeDropdown && employeeSearch.trim() && (
                  <div className="absolute left-0 right-0 top-[44px] z-30 max-h-[220px] overflow-y-auto rounded-lg border border-[#dce5f1] bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    {employeeOptions.length ? (
                      employeeOptions.map((item: any) => (
                        <button
                          key={item.code}
                          type="button"
                          onClick={() => {
                            setSelectedEmployee(item);

                            setEmployeeSearch(`${item.code} - ${item.name}`);

                            setShowEmployeeDropdown(false);
                          }}
                          className="flex w-full flex-col items-start border-b border-slate-100 px-3 py-2.5 text-left last:border-0 hover:bg-indigo-50 dark:border-slate-800 dark:hover:bg-slate-800"
                        >
                          <span className="text-[12px] font-semibold text-[#152b4b] dark:text-slate-100">
                            {item.name}
                          </span>

                          <span className="text-[11px] text-slate-400">
                            {item.code}
                            {item.branch ? ` · ${item.branch}` : ""}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-[11px] text-slate-400">
                        No employee found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SELECTED EMPLOYEE */}

              <div className="mt-2 flex items-center gap-1.5 text-[12px]">
                <UserRound size={13} className="text-slate-400" />

                <span className="text-slate-500 dark:text-slate-400">
                  Employee:
                </span>

                <span className="font-semibold text-[#152b4b] dark:text-slate-100">
                  {selectedEmployee?.name || "N/A"}
                </span>
              </div>

              {selectedEmployee && (
                <div className="mt-2 rounded-lg bg-indigo-50 px-3 py-2 dark:bg-indigo-500/10">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                      {selectedEmployee.code}
                    </span>

                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400">
                      {selectedEmployee.designation || "—"}
                    </span>
                  </div>
                </div>
              )}

              {/* EMPLOYEE FILTERS */}

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <Eselect
                    title="Emp type"
                    name="employeeType"
                    option={EMPLOYEE_TYPES}
                    initialValue={employeeType}
                    handleInputChange={handleInputChange}
                    className="h-[39px] w-full"
                  />
                </div>

                <div className="min-w-0">
                  <Eselect
                    title="Total days available"
                    name="totalDays"
                    option={DAYS_OPTIONS}
                    initialValue={totalDays}
                    handleInputChange={handleInputChange}
                    className="h-[39px] w-full"
                  />
                </div>

                <div className="min-w-0 sm:col-span-2">
                  <div className="sm:max-w-[calc(50%-6px)]">
                    <Eselect
                      title="Final payment available"
                      name="finalPayment"
                      option={PAYMENT_OPTIONS}
                      initialValue={finalPayment}
                      handleInputChange={handleInputChange}
                      className="h-[39px] w-full"
                    />
                  </div>
                </div>
              </div>

              {/* EMPLOYEE CLEAR */}

              <div className="mt-3 flex justify-end border-t border-[#e8edf5] pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEmployeeSearch("");
                    setSelectedEmployee(null);
                    setEmployeeType("");
                    setTotalDays("");
                    setFinalPayment("");
                  }}
                  className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400"
                >
                  Clear employee filters
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
