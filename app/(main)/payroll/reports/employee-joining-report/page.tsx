
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { ArrowLeft, Search } from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import useExcelDownload from "@/app/hooks/excel-download";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";
import AButton from "@/components/atoms/Button";

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

type TypeCard = "all" | "regular" | "casual" | "apprentice";

type ColumnDefinition = {
  Header: string;
  accessor: string;
};

/* ------------------------------------------------------------------ */
/* CONSTANTS                                                          */
/* ------------------------------------------------------------------ */

const API_URL = process.env.NEXT_PUBLIC_URL;
const REPORT_ENDPOINT = "/hrmsreport/EmployeeJoiningReport";

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

const CURRENT_DATE = new Date();
const CURRENT_YEAR = CURRENT_DATE.getFullYear();

const MONTHS: Option[] = MONTH_NAMES.map((label, index) => ({
  value: String(index + 1),
  label,
}));

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

const EMPTY_SEARCH: Record<FilterKey, string> = {
  Region: "",
  CHANNEL: "",
  CLUSTER: "",
  Location: "",
  SECTION: "",
  DIVISION: "",
  DESIGNATION: "",
};

/* ------------------------------------------------------------------ */
/* FIXED REPORT COLUMNS                                               */
/* ------------------------------------------------------------------ */

const JOINING_REPORT_COLUMN_DEFS: ColumnDefinition[] = [
  { Header: "EMPCODE", accessor: "EMPCODE" },
  { Header: "EMPLOYEE NAME", accessor: "EMPLOYEENAME" },
  { Header: "GENDER", accessor: "GENDER" },
  { Header: "Employee Type", accessor: "EmployeeType" },
  { Header: "Region", accessor: "region1" },
  { Header: "CHANNEL", accessor: "CHANNEL" },
  { Header: "CLUSTER", accessor: "CLUSTER" },
  { Header: "Location", accessor: "Location" },
  { Header: "SECTION", accessor: "SECTION" },
  { Header: "Department", accessor: "Department" },
  { Header: "EMPLOYEE DESIGNATION", accessor: "EMPLOYEEDESIGNATION" },
  { Header: "JOINING DATE", accessor: "JOININGDATE" },
  { Header: "LAST WORK DATE", accessor: "LASTWOR_NEWDATE" },
  { Header: "PUNCH CODE", accessor: "PUNCHCODE" },
  { Header: "PF NO", accessor: "PFNO" },
  { Header: "UAN NO", accessor: "UAN_No" },
  { Header: "PF PER", accessor: "PFPER" },
  { Header: "PF NUMBER", accessor: "PFNUMBER" },
  { Header: "ESI NO", accessor: "ESINO" },
  { Header: "ESI NUMBER", accessor: "ESINUMBER" },
  { Header: "PAYMENT MODE", accessor: "PAYMENTMODE" },
  { Header: "BANK NAME", accessor: "BANKNAME" },
  { Header: "IFSC CODE", accessor: "IFSC_CODE" },
  { Header: "VERIFIED IFSC CODE", accessor: "VERIFIED_IFSC_CODE" },
  { Header: "BANK ACCOUNT NO", accessor: "BANKACCOUNTNO" },
  { Header: "VERIFIED BANK ACCOUNT NO", accessor: "VERIFIED_ACCOUNT_NO" },
  { Header: "NAME AT BANK", accessor: "Name_AT_BANK" },
  { Header: "OFFICIAL MOBILE NO", accessor: "MOBILENO" },
  { Header: "PERSONAL MOBILE NO", accessor: "PERMOBILENO" },
  { Header: "EMERGENCY MOBILE NO", accessor: "EMERGENCYNO" },
  { Header: "OFFICIAL EMAIL ID", accessor: "CORPORATEMAILID" },
  { Header: "PERSONAL EMAIL ID", accessor: "ALTERNET_MAIL" },
  { Header: "APPRENTICE DATE FROM", accessor: "Apprentice_Date_From" },
  { Header: "APPRENTICE DATE TO", accessor: "Apprentice_Date_To" },
  { Header: "DATE OF BIRTH", accessor: "DATEOFBIRTH" },
  { Header: "PAN NO", accessor: "PANNO" },
  { Header: "AADHAR NO", accessor: "AADHARNO" },
  { Header: "Prob. Period (days)", accessor: "PROBATIONPERIOD" },
  { Header: "Probation Period", accessor: "Prob_period" },
  { Header: "Confirmation Date", accessor: "Confirmation_Date" },
  { Header: "Marital Status", accessor: "Marital_Status" },
  { Header: "GRADE", accessor: "GRADE" },
  { Header: "MSPIN", accessor: "MSPIN" },
  { Header: "MSPIN ID", accessor: "MSPN_Id" },
  { Header: "LWF NO", accessor: "LWFNO" },
  { Header: "Pro Tax", accessor: "pro_tax" },
  { Header: "FATHER'S NAME", accessor: "FATHERNAME" },
  { Header: "MOTHER'S NAME", accessor: "MOTHERNAME" },
  { Header: "SPOUSE NAME", accessor: "SPOUSENAME" },
  { Header: "CURRENT ADDRESS", accessor: "CURRENTADDRESS1" },
  { Header: "PERMANENT ADDRESS", accessor: "PERMANENTADDRESS1" },
  { Header: "PIN CODE", accessor: "PINCODE" },
  { Header: "STATE", accessor: "STATE" },
  { Header: "SALARY HOLD", accessor: "SALARYHOLD" },
  { Header: "EMPLOYEE SHIFT", accessor: "EMPPLOYEESHIFT" },
  { Header: "WEEKLY OFF", accessor: "WEEKLYOFF" },
  { Header: "Android Id", accessor: "Android_id" },
  { Header: "IEMI", accessor: "IEMI" },
  { Header: "Geo-Offence Location", accessor: "GEOOFFENCELOC" },
  { Header: "Employee Punch Type", accessor: "Punch_Type" },
  { Header: "CATEGORY", accessor: "CATEGORY" },
  { Header: "COSTCENTRE", accessor: "COSTCENTRE" },
  { Header: "EFFECTIVE DATE", accessor: "Effective_date" },
  { Header: "BASIC", accessor: "BASICSALARY" },
  { Header: "HRA", accessor: "HRA" },
  { Header: "CONVEYANCE", accessor: "Conveyance" },
  { Header: "MEDICAL", accessor: "Medical" },
  { Header: "OTHER", accessor: "OTHER" },
  { Header: "UNIFORM", accessor: "Uniform" },
  { Header: "WASHING", accessor: "Washing" },
  { Header: "GROSS SALARY", accessor: "Gross_Salary" },
  { Header: "ANNUAL SALARY", accessor: "ANNUAL_GROSS" },
];

/* ------------------------------------------------------------------ */
/* HELPERS                                                            */
/* ------------------------------------------------------------------ */

const getArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.recordset)) return value.recordset;
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
      const nested = [
        item.data,
        item.Result,
        item.result,
        item.recordset,
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
          code && name && code !== name
            ? `${code} · ${name}`
            : name || code,
      };
    })
    .filter(Boolean) as Option[];

  return Array.from(
    new Map(result.map((item) => [item.value, item])).values(),
  );
};

const formatDate = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

const getMonthDates = (year: string, month: string) => {
  const monthNumber = Number(month);

  if (!year || !month || monthNumber < 1 || monthNumber > 12) {
    return { from: "", to: "" };
  }

  const first = new Date(Number(year), monthNumber - 1, 1);
  const last = new Date(Number(year), monthNumber, 0);

  return {
    from: formatDate(first),
    to: formatDate(last),
  };
};

const formatMiscDate = (value: any): string => {
  if (!value) return "";

  const text = String(value).trim();

  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (match) {
    return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  }

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (isoMatch) return text.slice(0, 10);

  return "";
};

const normalizeKey = (value: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const cellText = (value: any) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const isEmptyValue = (value: any) =>
  value === null ||
  value === undefined ||
  String(value).trim() === "";

const parseAnyDate = (value: any): Date | null => {
  if (isEmptyValue(value)) return null;

  const text = String(value).trim();

  let match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (match) {
    return new Date(
      Number(match[3]),
      Number(match[2]) - 1,
      Number(match[1]),
    );
  }

  match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
    );
  }

  match = text.match(/^(\d{1,2})[-\s]([A-Za-z]{3})[-\s,]+(\d{4})$/);

  if (match) {
    const monthIndex = MONTH_NAMES.findIndex(
      (name) => name.toLowerCase() === match![2].toLowerCase(),
    );

    if (monthIndex >= 0) {
      return new Date(
        Number(match[3]),
        monthIndex,
        Number(match[1]),
      );
    }
  }

  return null;
};

const formatDisplayDate = (value: any) => {
  const date = parseAnyDate(value);

  return date
    ? `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
    : cellText(value);
};

const getEmployeeType = (
  value: any,
): "regular" | "casual" | "apprentice" | "" => {
  const type = cellText(value).trim().toLowerCase();

  if (
    type === "1" ||
    type.includes("regular") ||
    type.includes("permanent")
  ) {
    return "regular";
  }

  if (type === "2" || type.includes("casual")) {
    return "casual";
  }

  if (
    type === "3" ||
    type.includes("apprentice") ||
    type.includes("apprenticeship")
  ) {
    return "apprentice";
  }

  return "";
};

const getGenderType = (value: any): "male" | "female" | "" => {
  const gender = cellText(value).trim().toLowerCase();

  if (
    gender === "m" ||
    gender === "male" ||
    gender.startsWith("male ")
  ) {
    return "male";
  }

  if (
    gender === "f" ||
    gender === "female" ||
    gender.startsWith("female ")
  ) {
    return "female";
  }

  return "";
};

const Dash = () => (
  <span className="text-slate-300 dark:text-slate-600">—</span>
);

/* ------------------------------------------------------------------ */
/* NORMALIZE API ROWS                                                 */
/* ------------------------------------------------------------------ */

// API field names can differ in uppercase/lowercase/underscore.
// This maps actual API fields to the fixed report column accessors.

const normalizeReportRows = (rows: any[]) => {
  return rows.map((row) => {
    const normalizedRow = { ...row };
    const actualKeys = Object.keys(row || {});

    JOINING_REPORT_COLUMN_DEFS.forEach(({ accessor }) => {
      const exactKey = actualKeys.find(
        (key) => key === accessor,
      );

      const matchedKey =
        exactKey ||
        actualKeys.find(
          (key) => normalizeKey(key) === normalizeKey(accessor),
        );

      if (matchedKey !== undefined) {
        normalizedRow[accessor] = row[matchedKey];
      }
    });

    // Handle common alternate API field names.
    const aliases: Record<string, string[]> = {
      EmployeeType: [
        "EMPLOYEETYPE",
        "EmpType",
        "Employee_Type",
        "EMP_TYPE",
      ],
      EMPLOYEENAME: [
        "EMPLOYEE_NAME",
        "EMP_NAME",
        "EmployeeName",
        "Name",
      ],
      GENDER: ["Gender", "SEX"],
      region1: ["REGION", "Region", "Region_Name"],
      Department: ["DEPARTMENT", "Division_Name", "DIVISION"],
      EMPLOYEEDESIGNATION: [
        "DESIGNATION",
        "Designation",
        "EMP_DESIGNATION",
      ],
    };

    Object.entries(aliases).forEach(([target, possibleKeys]) => {
      if (!isEmptyValue(normalizedRow[target])) return;

      const alias = actualKeys.find((key) =>
        possibleKeys.some(
          (possible) => normalizeKey(possible) === normalizeKey(key),
        ),
      );

      if (alias !== undefined) {
        normalizedRow[target] = row[alias];
      }
    });

    return normalizedRow;
  });
};

/* ------------------------------------------------------------------ */
/* TABLE COLUMNS                                                      */
/* ------------------------------------------------------------------ */

const buildReportColumns = () => {
  const makeCell = (key: string) =>
    function Cell({ value }: any) {
      if (isEmptyValue(value)) return <Dash />;

      const normalized = normalizeKey(key);

      if (
        normalized.includes("date") ||
        normalized.includes("joining") ||
        normalized.includes("lastwor")
      ) {
        return <>{formatDisplayDate(value)}</>;
      }

      if (normalized === "empcode" || normalized === "punchcode") {
        return (
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            {String(value)}
          </span>
        );
      }

      if (
        normalized === "employeename" ||
        normalized === "empname"
      ) {
        return (
          <span className="font-semibold text-[12px] text-slate-900 dark:text-slate-100">
            {String(value)}
          </span>
        );
      }

      if (normalized === "employeetype") {
        const type = getEmployeeType(value);
        const text = String(value).trim();

        const badge =
          type === "regular"
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
            : type === "casual"
              ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
              : type === "apprentice"
                ? "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";

        const displayType =
          type === "regular"
            ? "Regular"
            : type === "casual"
              ? "Casual"
              : type === "apprentice"
                ? "Apprentice"
                : text;

        return (
          <span
            className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${badge}`}
          >
            {displayType}
          </span>
        );
      }

      return <>{cellText(value)}</>;
    };

  return JOINING_REPORT_COLUMN_DEFS.map(({ Header, accessor }) => ({
    Header,
    accessor,
    Cell: makeCell(accessor),
  }));
};

/* ------------------------------------------------------------------ */
/* SMALL UI COMPONENTS                                                */
/* ------------------------------------------------------------------ */

function PageHeader() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400" />
        <h1 className="mt-0.5 text-[22px] font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Employee Joining Report
        </h1>
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
      className={`min-w-0 rounded-xl border px-4 py-3.5 text-left transition ${
        active
          ? "border-indigo-300 bg-[#eef2ff] dark:border-indigo-500/50 dark:bg-indigo-500/10"
          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-600 dark:text-slate-300">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} />
        {label}
      </div>

      <p className="mt-2 text-[26px] font-bold leading-none text-slate-900 dark:text-slate-100">
        {value}
      </p>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* MAIN PAGE                                                          */
/* ------------------------------------------------------------------ */

export default function EmployeeJoiningReportPage() {
  const user = useCurrentUser();
  const { handleExcelDownload } = useExcelDownload();

  const [loading, setLoading] = useState(false);
  const [masterLoading, setMasterLoading] = useState(false);

  // Month and year
  const [month, setMonth] = useState(
    String(CURRENT_DATE.getMonth() + 1),
  );

  const [year, setYear] = useState(String(CURRENT_YEAR));

  const initialDates = getMonthDates(
    String(CURRENT_YEAR),
    String(CURRENT_DATE.getMonth() + 1),
  );

  const [dateFrom, setDateFrom] = useState(initialDates.from);
  const [dateTo, setDateTo] = useState(initialDates.to);

  const [employeeType, setEmployeeType] = useState("");

  // Master filters
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

  const [searches, setSearches] =
    useState<Record<FilterKey, string>>(EMPTY_SEARCH);

  const [activeFilter, setActiveFilter] =
    useState<FilterKey>("Region");

  // Report
  const [showReport, setShowReport] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [typeCard, setTypeCard] = useState<TypeCard>("all");
  const [resetKey, setResetKey] = useState(0);

  /* -------------------------------------------------------------- */
  /* API HELPER                                                     */
  /* -------------------------------------------------------------- */

  const postApi = useCallback(
    async (path: string, payload: any) => {
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
      });
    },
    [user?.Comp_Code, user?.name],
  );

  /* -------------------------------------------------------------- */
  /* MONTH/YEAR DATE HANDLING                                       */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    if (!year || !month) return;

    const dates = getMonthDates(year, month);

    if (dates.from && dates.to) {
      setDateFrom(dates.from);
      setDateTo(dates.to);
    }
  }, [year, month]);

  /* -------------------------------------------------------------- */
  /* FETCH MASTER DATA                                              */
  /* -------------------------------------------------------------- */

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

      const nextFilters = {} as Record<FilterKey, Option[]>;

      FILTER_CONFIG.forEach((config) => {
        nextFilters[config.key] = makeOptions(
          masterData[config.key],
          config.codeKeys,
          config.nameKeys,
        );
      });

      setFilters(nextFilters);

      // Preserve original MiscDate behavior.
      const miscDates = getArray(data?.MiscDate);

      if (miscDates.length > 0) {
        const misc = miscDates[0];

        const from = formatMiscDate(misc.Misc_Dtl1);
        const to = formatMiscDate(misc.Misc_Dtl2);

        if (from) setDateFrom(from);
        if (to) setDateTo(to);
      }
    } catch (error) {
      console.error("Master fetch error:", error);

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

  /* -------------------------------------------------------------- */
  /* FILTER SCOPE HANDLERS                                          */
  /* -------------------------------------------------------------- */

  const toggleFilter = (key: FilterKey, value: string) => {
    setSelected((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((item) => item !== value)
        : [...prev[key], value],
    }));
  };

  const selectAllFilter = (key: FilterKey) => {
    const allValues = filters[key].map((item) => item.value);

    setSelected((prev) => ({
      ...prev,
      [key]:
        prev[key].length === allValues.length ? [] : allValues,
    }));
  };

  const totalSelected = useMemo(
    () =>
      Object.values(selected).reduce(
        (acc, arr) => acc + arr.length,
        0,
      ),
    [selected],
  );

  const handleClearAll = () => {
    setSelected(EMPTY_SELECTED);
    setSearches(EMPTY_SEARCH);
    setEmployeeType("");
  };

  const activeConfig = FILTER_CONFIG.find(
    (item) => item.key === activeFilter,
  )!;

  const activeScopeOptions = useMemo(() => {
    const opts = filters[activeFilter] || [];
    const term = searches[activeFilter].trim().toLowerCase();

    if (!term) return opts;

    return opts.filter((item) =>
      item.label.toLowerCase().includes(term),
    );
  }, [filters, activeFilter, searches]);

  /* -------------------------------------------------------------- */
  /* RESET REPORT FILTERS                                           */
  /* -------------------------------------------------------------- */

  const resetInlineFilters = () => {
    setTypeCard("all");
    setResetKey((prev) => prev + 1);
  };

  /* -------------------------------------------------------------- */
  /* VIEW JOINING REPORT                                            */
  /* -------------------------------------------------------------- */

  const handleViewReport = async () => {
    if (!dateFrom || !dateTo) {
      Swal.fire({
        icon: "warning",
        title: "Select date range",
        text: "Please select Date From and Date To.",
      });
      return;
    }

    if (new Date(dateFrom) > new Date(dateTo)) {
      Swal.fire({
        icon: "warning",
        title: "Invalid date range",
        text: "Date From cannot exceed Date To.",
      });
      return;
    }

    try {
      setLoading(true);

      const payload = {
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
      };

      console.log("Employee Joining Report Payload:", payload);

      const response = await postApi(REPORT_ENDPOINT, payload);

      const reportData = getResponseRows(response);

      // Normalize all API field names to the fixed 70 column keys.
      const normalizedRows = normalizeReportRows(reportData);

      setRows(normalizedRows);
      resetInlineFilters();
      setShowReport(true);

      if (!normalizedRows.length) {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "info",
          title: "No joining records found",
          showConfirmButton: false,
          timer: 2000,
        });
      }
    } catch (error) {
      console.error("Joining report error:", error);

      Swal.fire({
        icon: "error",
        title: "Unable to load joining report",
        text: getApiError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------------------------- */
  /* REPORT COLUMNS                                                 */
  /* -------------------------------------------------------------- */

  const baseColumns = useMemo(
    () => buildReportColumns(),
    [],
  );

  /* -------------------------------------------------------------- */
  /* FILTERED ROWS                                                  */
  /* -------------------------------------------------------------- */

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (typeCard === "all") return true;

      return getEmployeeType(row.EmployeeType) === typeCard;
    });
  }, [rows, typeCard]);

  /* -------------------------------------------------------------- */
  /* SUMMARY                                                        */
  /* -------------------------------------------------------------- */

  const summary = useMemo(() => {
    const regular = rows.filter(
      (row) => getEmployeeType(row.EmployeeType) === "regular",
    ).length;

    const casual = rows.filter(
      (row) => getEmployeeType(row.EmployeeType) === "casual",
    ).length;

    const apprentice = rows.filter(
      (row) => getEmployeeType(row.EmployeeType) === "apprentice",
    ).length;

    const male = filteredRows.filter(
      (row) => getGenderType(row.GENDER) === "male",
    ).length;

    const female = filteredRows.filter(
      (row) => getGenderType(row.GENDER) === "female",
    ).length;

    return {
      total: filteredRows.length,
      regular,
      casual,
      apprentice,
      male,
      female,
    };
  }, [rows, filteredRows]);

  /* -------------------------------------------------------------- */
  /* EXCEL EXPORT                                                   */
  /* -------------------------------------------------------------- */

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
      baseColumns.map((col: any) => ({
        Header: col.Header,
        accessor: col.accessor,
      })),
      filteredRows,
    );
  };

  /* ================================================================ */
  /* VIEW 1: REPORT RESULTS                                           */
  /* ================================================================ */

  if (showReport) {
    return (
      <div className="min-h-screen min-w-0 bg-[#f8fafc] p-4 dark:bg-[#0b1220] sm:p-6">
        <HashloaderComponent isLoading={loading || masterLoading} />

        <div className="mx-auto max-w-[1800px] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PageHeader />

            <div className="flex flex-wrap gap-2">
              <AButton
                onClick={() => {
                  setShowReport(false);
                  resetInlineFilters();
                }}
                className="flex h-[36px] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                 <ArrowLeft size={14} />
                Back To Filters
              </AButton>
            </div>
          </div>

          {/* Summary Cards */}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
              label="Total Joining"
              value={summary.total}
              dotClass="bg-indigo-500"
              active={typeCard === "all"}
              onClick={() => setTypeCard("all")}
            />

            <StatCard
              label="Male"
              value={summary.male}
              dotClass="bg-blue-500"
              active={false}
              onClick={() => {}}
            />

            <StatCard
              label="Female"
              value={summary.female}
              dotClass="bg-pink-500"
              active={false}
              onClick={() => {}}
            />

            <StatCard
              label="Regular"
              value={summary.regular}
              dotClass="bg-emerald-500"
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

          {/* Table Card */}

          <div className="rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="text-[12px] text-slate-600 dark:text-slate-300">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {filteredRows.length}
                </span>{" "}
                of {rows.length} employees
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800">
              {filteredRows.length > 0 ? (
                <DataTable
                  key={resetKey}
                  columns={baseColumns}
                  data={filteredRows}
                  onRowDoubleClick={() => {}}
                  showTopSearch={true}
                  showExcelExport={true}
                  showColumnFilters={true}
                  showPageSizeInFooter={true}
                />
              ) : (
                <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                  <Search size={28} className="mb-2 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    No joining records found
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Try changing your report filters.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /* VIEW 2: FILTER SELECTION                                         */
  /* ================================================================ */

  return (
    <div className="min-h-screen min-w-0 bg-[#f8fafc] p-4 dark:bg-[#0b1220] sm:p-6">
      <HashloaderComponent isLoading={loading || masterLoading} />

      <div className="mx-auto max-w-[1600px] space-y-5">
        <PageHeader />

        {/* Top Parameter Filter Card */}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-11">
            <div className="lg:col-span-2">
              <Eselect
                title="Year"
                name="year"
                option={YEARS}
                initialValue={year}
                handleInputChange={(_, val) => setYear(val)}
                className="h-[40px] w-full"
              />
            </div>

            <div className="lg:col-span-2">
              <Eselect
                title="Month"
                name="month"
                option={MONTHS}
                initialValue={month}
                handleInputChange={(_, val) => setMonth(val)}
                className="h-[40px] w-full"
              />
            </div>

            <div className="lg:col-span-2">
              <Einput
                title="Date from"
                type="date"
                name="dateFrom"
                value={dateFrom}
                handleInputChange={(_, val) => setDateFrom(val)}
                className="h-[40px] w-full"
              />
            </div>

            <div className="lg:col-span-2">
              <Einput
                title="Date to"
                type="date"
                name="dateTo"
                value={dateTo}
                handleInputChange={(_, val) => setDateTo(val)}
                className="h-[40px] w-full"
              />
            </div>

            <div className="lg:col-span-2">
              <Eselect
                title="Employee type"
                name="employeeType"
                option={EMPLOYEE_TYPES}
                initialValue={employeeType}
                handleInputChange={(_, val) => setEmployeeType(val)}
                className="h-[40px] w-full"
              />
            </div>

            <div className="lg:col-span-1">
              <AButton
                onClick={handleViewReport}
                className="flex h-[40px] w-full items-center justify-center rounded-lg bg-[#4f46e5] px-2 text-[12px] font-semibold text-white transition hover:bg-indigo-700"
              >
                View Report
              </AButton>
            </div>
          </div>
        </div>

        {/* Master Scope Filter Box */}

        <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs md:w-[65%] dark:border-slate-800 dark:bg-slate-900">
          {/* Card Header */}

          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
            <h2 className="text-[14px] font-bold text-slate-900 dark:text-slate-100">
              Filter scope
            </h2>

            <div className="flex items-center gap-4 text-[12px]">
              <span className="text-slate-500 dark:text-slate-400">
                {totalSelected} selected
              </span>

              <button
                type="button"
                onClick={handleClearAll}
                className="font-semibold text-[#4f46e5] hover:underline dark:text-indigo-400"
              >
                Clear all
              </button>
            </div>
          </div>

          {/* Split Body */}

          <div className="grid min-h-[340px] grid-cols-1 md:grid-cols-12">
            {/* Left Category Sidebar */}

            <div className="border-b border-slate-100 p-2.5 dark:border-slate-800 md:col-span-4 md:border-b-0 md:border-r">
              <div className="space-y-1">
                {FILTER_CONFIG.map((item) => {
                  const isActive = activeFilter === item.key;
                  const count = selected[item.key]?.length || 0;
                  const total = filters[item.key]?.length || 0;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setActiveFilter(item.key)}
                      className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-left text-[12px] transition ${
                        isActive
                          ? "bg-[#eef2ff] font-semibold text-[#4f46e5] dark:bg-indigo-500/15 dark:text-indigo-400"
                          : "font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span>{item.title}</span>

                      <span
                        className={`text-[11px] ${
                          isActive
                            ? "text-[#4f46e5] dark:text-indigo-400"
                            : "text-slate-400"
                        }`}
                      >
                        {count}/{total}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Checkbox Selection Area */}

            <div className="p-4 md:col-span-8">
              {/* Search & Select All Row */}

              <div className="mb-4 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={searches[activeFilter]}
                    onChange={(e) =>
                      setSearches((prev) => ({
                        ...prev,
                        [activeFilter]: e.target.value,
                      }))
                    }
                    placeholder={`Search ${activeConfig.title.toLowerCase()}`}
                    className="h-[38px] w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-[12px] text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => selectAllFilter(activeFilter)}
                  className="whitespace-nowrap text-[12px] font-semibold text-[#4f46e5] hover:underline dark:text-indigo-400"
                >
                  Select all
                </button>
              </div>

              {/* Checkbox Options Grid */}

              <div className="max-h-[260px] overflow-y-auto pr-1">
                {activeScopeOptions.length > 0 ? (
                  <div className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
                    {activeScopeOptions.map((option) => {
                      const isChecked = selected[activeFilter].includes(
                        option.value,
                      );

                      return (
                        <label
                          key={option.value}
                          className="flex cursor-pointer items-center gap-2.5 rounded-md py-1 text-[12px] text-slate-700 transition hover:text-slate-900 dark:text-slate-300"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() =>
                              toggleFilter(activeFilter, option.value)
                            }
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
                          />

                          <span className="truncate">{option.label}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-[200px] flex-col items-center justify-center text-center text-slate-400">
                    <Search size={20} className="mb-1.5 opacity-50" />

                    <p className="text-[12px]">
                      No {activeConfig.title.toLowerCase()} found
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
