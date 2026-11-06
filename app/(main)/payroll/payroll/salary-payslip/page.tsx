
"use client";

import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useCurrentUser } from "@/app/hooks/use-current-user";

import {
  Search,
  Eye,
  Mail,
  Download,
} from "lucide-react";

import AButton from "@/components/atoms/Button";
import Eselect from "@/components/atoms/Eselect";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

type Option = {
  value: string;
  label: string;
};

type FilterOption = {
  value: string;
  label: string;
};

type SlipRow = {
  id: string;
  employeeName: string;
  designation: string;
  empCode: string;
  empType: string;
  branch: string;
  paidDays: number | string;
  gross: string;
  netPaid: string;
  hrStatus: string;
  raw?: any;
};

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

const CURRENT_YEAR = new Date().getFullYear();

const YEARS: Option[] = Array.from(
  { length: 15 },
  (_, index) => {
    const year = CURRENT_YEAR - index;

    return {
      value: String(year),
      label: String(year),
    };
  }
);

const EMPLOYEE_TYPES: Option[] = [
  { value: "Regular", label: "Regular" },
  { value: "Casual", label: "Casual" },
];

const API_URL = process.env.NEXT_PUBLIC_URL;

const getText = (...values: any[]): string => {
  for (const value of values) {
    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
  }

  return "";
};

const getArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.data)) return value.data;
  if (value && Array.isArray(value.recordset)) return value.recordset;

  return [];
};

// Supports common Axios/API response structures.
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
    if (Array.isArray(item)) {
      return item;
    }

    if (item && typeof item === "object") {
      const nestedCandidates = [
        item?.data,
        item?.Result,
        item?.result,
        item?.recordset,
        item?.Data,
        item?.employees,
        item?.Employees,
      ];

      for (const nested of nestedCandidates) {
        if (Array.isArray(nested)) {
          return nested;
        }
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

const getCode = (value: any) => {
  if (value === null || value === undefined) return "";

  return String(value).split(" - ")[0].trim();
};

const getLabel = (item: any, keys: string[]): string => {
  if (typeof item === "string" || typeof item === "number") {
    return String(item);
  }

  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null) {
      return String(item[key]);
    }
  }

  return "";
};

const makeOptions = (
  data: any[],
  codeKeys: string[],
  nameKeys: string[]
): FilterOption[] => {
  const result = data
    .map((item) => {
      const code = getLabel(item, codeKeys);
      const name = getLabel(item, nameKeys);

      if (!code && !name) return null;

      const value = code || name;

      const label =
        code && name && code !== name
          ? `${code} - ${name}`
          : name || code;

      return {
        value: String(value),
        label: String(label),
      };
    })
    .filter(Boolean) as FilterOption[];

  return Array.from(
    new Map(result.map((item) => [item.value, item])).values()
  );
};

const formatAmount = (value: any): string => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(
    String(value).replace(/[₹,\s]/g, "")
  );

  if (Number.isNaN(amount)) return String(value);

  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
};

const getMonthDates = (year: string, month: string) => {
  const y = Number(year);
  const m = Number(month);

  const firstDate = new Date(y, m - 1, 1);
  const lastDate = new Date(y, m, 0);

  const format = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    dateFrom: format(firstDate),
    dateto: format(lastDate),
  };
};

// Supports both normal employee objects and { value, label } API options.
const normalizeEmployee = (
  item: any,
  index: number
): SlipRow => {
  const empCode = getText(
    item?.value,
    item?.EMPCODE,
    item?.EmpCode,
    item?.EmployeeCode,
    item?.["Employee Code"],
    item?.empcode,
    item?.Code
  );

  const employeeName = getText(
    item?.EmployeeName,
    item?.EmpName,
    item?.EMP_NAME,
    item?.Name,
    item?.["Employee Name"],
    item?.label?.split(" - ").slice(1).join(" - ")
  );

  return {
    id: empCode || String(index + 1),

    employeeName: employeeName || "Employee",

    designation:
      getText(
        item?.DESIGNATION,
        item?.Designation,
        item?.DesigName,
        item?.designation
      ) || "—",

    empCode,

    empType:
      getText(
        item?.EmployeeType,
        item?.EmpType,
        item?.EMP_TYPE,
        item?.employeeType
      ) || "—",

    branch:
      getText(
        item?.LocationName,
        item?.BranchName,
        item?.LOC_NAME,
        item?.Location,
        item?.Branch,
        item?.Loc_code
      ) || "—",

    paidDays:
      getText(
        item?.PaidDays,
        item?.Paid_Days,
        item?.TotalPaidDays,
        item?.paidDays
      ) || "—",

    gross: formatAmount(
      item?.GrossSalary ??
        item?.Gross ??
        item?.GROSS ??
        item?.gross
    ),

    netPaid: formatAmount(
      item?.NetPaid ??
        item?.NetSalary ??
        item?.NET_PAY ??
        item?.NetPay ??
        item?.netPaid
    ),

    hrStatus:
      getText(
        item?.HRStatus,
        item?.HrStatus,
        item?.Status
      ) || "Pending HR",

    raw: item,
  };
};

const normalizeSalaryData = (
  item: any,
  employee: SlipRow
): SlipRow => {
  const source = item || {};

  return {
    ...employee,

    employeeName: getText(
      source?.EmployeeName,
      source?.EmpName,
      source?.EMP_NAME,
      source?.Name,
      employee.employeeName
    ),

    designation: getText(
      source?.Designation,
      source?.DESIGNATION,
      source?.DesigName,
      employee.designation
    ),

    branch: getText(
      source?.LocationName,
      source?.BranchName,
      source?.Location,
      source?.Branch,
      employee.branch
    ),

    paidDays: getText(
      source?.PaidDays,
      source?.Paid_Days,
      source?.TotalPaidDays,
      employee.paidDays
    ),

    gross: formatAmount(
      source?.GrossSalary ??
        source?.Gross ??
        source?.GROSS ??
        source?.gross ??
        employee.raw?.GrossSalary
    ),

    netPaid: formatAmount(
      source?.NetPaid ??
        source?.NetSalary ??
        source?.NET_PAY ??
        source?.NetPay ??
        employee.raw?.NetPaid
    ),

    hrStatus: getText(
      source?.HRStatus,
      source?.HrStatus,
      source?.Status,
      employee.hrStatus
    ),

    raw: source,
  };
};

function FilterCard({
  title,
  options,
  selected,
  onChange,
  search,
  onSearch,
  onAll,
}: {
  title: string;
  options: FilterOption[];
  selected: string[];
  onChange: (value: string) => void;
  search: string;
  onSearch: (value: string) => void;
  onAll: () => void;
}) {
  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return options;

    return options.filter((item) =>
      item.label.toLowerCase().includes(term)
    );
  }, [options, search]);

  return (
    <div className="min-w-0 rounded-xl border border-[#dce5f1] bg-white p-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-[#e8edf5] pb-2.5 dark:border-slate-800">
        <span className="text-[12px] font-semibold text-[#152b4b] dark:text-slate-100">
          {title}
        </span>

        <button
          type="button"
          onClick={onAll}
          className="text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          All
        </button>
      </div>

      <div className="relative mb-2 mt-2.5">
        <Search
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          placeholder="Search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="h-[32px] w-full rounded-lg border border-[#dce5f1] bg-[#f8fafc] pl-7 pr-3 text-[11px] text-[#152b4b] outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <div className="max-h-[125px] space-y-1.5 overflow-y-auto pr-1">
        {filteredOptions.length ? (
          filteredOptions.map((item) => (
            <label
              key={item.value}
              className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <input
                type="checkbox"
                checked={selected.includes(item.value)}
                onChange={() => onChange(item.value)}
                className="h-3.5 w-3.5 rounded border-[#dce5f1] text-indigo-600 dark:border-slate-700 dark:bg-slate-800"
              />

              <span className="min-w-0 break-words text-[11px] text-[#52627c] dark:text-slate-300">
                {item.label}
              </span>
            </label>
          ))
        ) : (
          <p className="px-1.5 py-2 text-[11px] text-slate-400">
            No options found
          </p>
        )}
      </div>

      <div className="mt-2 border-t border-slate-100 pt-2 text-[10px] text-slate-400 dark:border-slate-800">
        {selected.length} selected
      </div>
    </div>
  );
}

export default function EmployeeSalarySlipsPage() {
  const user = useCurrentUser();

  const [loading, setLoading] = useState(false);
  const [masterLoading, setMasterLoading] = useState(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);

  const [month, setMonth] = useState("7");
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [employeeType, setEmployeeType] = useState("Regular");
  const [employeeCode, setEmployeeCode] = useState("all");

  const [locations, setLocations] = useState<FilterOption[]>([]);
  const [regions, setRegions] = useState<FilterOption[]>([]);
  const [departments, setDepartments] = useState<FilterOption[]>([]);
  const [channels, setChannels] = useState<FilterOption[]>([]);
  const [clusters, setClusters] = useState<FilterOption[]>([]);
  const [sections, setSections] = useState<FilterOption[]>([]);

  // Employee master list from findAllForSalary API.
  const [employeeMaster, setEmployeeMaster] = useState<any[]>([]);

  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  const [locationSearch, setLocationSearch] = useState("");
  const [regionSearch, setRegionSearch] = useState("");
  const [deptSearch, setDeptSearch] = useState("");
  const [channelSearch, setChannelSearch] = useState("");
  const [clusterSearch, setClusterSearch] = useState("");
  const [sectionSearch, setSectionSearch] = useState("");

  const [slipRows, setSlipRows] = useState<SlipRow[]>([]);
  const [selectedSlips, setSelectedSlips] = useState<string[]>([]);
  const [salaryDetails, setSalaryDetails] = useState<Record<string, any>>({});
  const [hasSearched, setHasSearched] = useState(false);
const [designations, setDesignations] = useState<Option[]>([]);
const [selectedDesignations, setSelectedDesignations] = useState<string[]>([]);
const [designationSearch, setDesignationSearch] = useState("");


  const apiHeaders = useMemo(
    () => ({
      compcode: user?.Comp_Code,
      name: user?.name,
    }),
    [user?.Comp_Code, user?.name]
  );

 const postApi = useCallback(
  async (path: string, payload: any) => {
    const compcode = user?.Comp_Code;

    if (!compcode) {
      throw new Error("Company code is not ready.");
    }

    if (!API_URL) {
      throw new Error("NEXT_PUBLIC_URL is not configured.");
    }

    return axios.post(`${API_URL}${path}`, payload, {
      headers: {
        compcode,
        name: user?.name || "",
      },
    });
  },
  [user?.Comp_Code, user?.name]
);

  // Employee Code dropdown options.
  // API format: { value: "TMPL227", label: "TMPL227 - RUPAK SAHA" }
  const employeeCodeOptions = useMemo(() => {
    const rows = Array.isArray(employeeMaster)
      ? employeeMaster
      : [];

    const options = rows
      .map((item: any) => {
        const value = getText(
          item?.value,
          item?.EMPCODE,
          item?.EmpCode,
          item?.EmployeeCode,
          item?.["Employee Code"],
          item?.empcode,
          item?.Code
        );

        const label = getText(
          item?.label,
          item?.EmployeeName,
          item?.EmpName,
          item?.EMP_NAME,
          item?.Name,
          item?.["Employee Name"]
        );

        if (!value) return null;

        return {
          value,
          label: label || value,
        };
      })
      .filter(Boolean) as FilterOption[];

    const uniqueOptions = Array.from(
      new Map(
        options.map((item) => [item.value, item])
      ).values()
    );

    return [
      { value: "all", label: "All Employees" },
      ...uniqueOptions,
    ];
  }, [employeeMaster]);

  // Common select handler.
  const handleInputChange = (
    name: string,
    value: any
  ) => {
    const selectedValue = String(value ?? "");

    if (name === "month") {
      setMonth(selectedValue);
    }

    if (name === "year") {
      setYear(selectedValue);
    }

    if (name === "employeeType") {
      setEmployeeType(selectedValue);
      setEmployeeCode("all");
    }

    if (name === "employeeCode") {
      setEmployeeCode(selectedValue || "all");
    }
  };

  const toggleCheckboxItem = (
    item: string,
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setList((prev) =>
      prev.includes(item)
        ? prev.filter((value) => value !== item)
        : [...prev, item]
    );
  };

  // Load filter masters.

const fetchMasters = useCallback(async () => {
  if (!user?.Comp_Code || !user?.branch) return;

  try {
    setMasterLoading(true);

    const response = await postApi("/hrmsreport/findMasters", {
      multiloc: user?.branch,
      Month: month,
      Year: year,
    });

    const data = response?.data?.data;

    console.log("Find Masters Response:", data);

    if (!data) {
      console.warn("findMasters: response.data.data is empty");
      return;
    }

    const locationData = Array.isArray(data?.Location?.[0])
      ? data.Location[0]
      : Array.isArray(data?.Location)
        ? data.Location
        : [];

    setLocations(
      makeOptions(
        locationData,
        ["Loc_code", "LOC_CODE", "LocationCode", "Code", "value"],
        ["Loc_name", "LocationName", "LOC_NAME", "Name", "label"]
      )
    );

    setRegions(
      makeOptions(
        getArray(data?.Region),
        ["Region_Code", "RegionCode", "REGION_CODE", "Code", "value"],
        ["Region_Name", "RegionName", "REGION_NAME", "Name", "label"]
      )
    );

    setChannels(
      makeOptions(
        getArray(data?.CHANNEL),
        ["Channel_Code", "ChannelCode", "CHANNEL_CODE", "Code", "value"],
        ["Channel_Name", "ChannelName", "CHANNEL_NAME", "Name", "label"]
      )
    );

    setClusters(
      makeOptions(
        getArray(data?.CLUSTER),
        ["Cluster_Code", "ClusterCode", "CLUSTER_CODE", "Code", "value"],
        ["Cluster_Name", "ClusterName", "Name", "label"]
      )
    );

    setSections(
      makeOptions(
        getArray(data?.SECTION),
        ["Section_Code", "SectionCode", "SECTION_CODE", "Code", "value"],
        ["Section_Name", "SectionName", "Name", "label"]
      )
    );

    setDepartments(
      makeOptions(
        getArray(data?.DIVISION),
        ["Division_Code", "DivisionCode", "DIVISION_CODE", "Code", "value"],
        ["Division_Name", "DivisionName", "Name", "label"]
      )
    );

    // Designation
    setDesignations(
      makeOptions(
        getArray(data?.DESIGNATION),
        [
          "Designation_Code",
          "DesignationCode",
          "Desig_Code",
          "DESIGNATION_CODE",
          "Code",
          "value",
        ],
        [
          "Designation_Name",
          "DesignationName",
          "Desig_Name",
          "DESIGNATION_NAME",
          "Name",
          "label",
        ]
      )
    );

    console.log("Locations:", locationData);
    console.log("Regions:", data?.Region);
    console.log("Departments:", data?.DIVISION);
    console.log("Channels:", data?.CHANNEL);
    console.log("Clusters:", data?.CLUSTER);
    console.log("Sections:", data?.SECTION);
    console.log("Designations:", data?.DESIGNATION);

  } catch (error) {
    console.error("findMasters error:", error);

    Swal.fire({
      icon: "error",
      title: "Unable to load filters",
      text: getApiError(error),
    });
  } finally {
    setMasterLoading(false);
  }
}, [
  user?.Comp_Code,
  user?.branch,
  month,
  year,
  postApi,
]);


 useEffect(() => {
  if (!user?.Comp_Code || !user?.branch) return;

  fetchMasters();
}, [fetchMasters, user?.Comp_Code, user?.branch]);

  // Existing API payload retained: only Loc_code is sent.
const fetchEmployees = useCallback(async () => {
  if (!user?.Comp_Code) return [];

  const response = await postApi(
    "/employee/findAllForSalary",
    {
      Loc_code: selectedLocations.map(getCode).join(","),
    }
  );

  const rows = getResponseRows(response);

  console.log("Employee API Rows:", rows);

  return rows;
}, [postApi, selectedLocations, user?.Comp_Code]);

  // Load employee master for Employee Code dropdown.
 const loadEmployeeMaster = useCallback(async () => {
  if (!user?.Comp_Code) return;

  try {
    setEmployeeLoading(true);

    const rows = await fetchEmployees();
    setEmployeeMaster(rows);

    if (
      employeeCode !== "all" &&
      !rows.some((item: any) =>
        getText(
          item?.value,
          item?.EMPCODE,
          item?.EmpCode,
          item?.EmployeeCode
        ) === employeeCode
      )
    ) {
      setEmployeeCode("all");
    }
  } catch (error) {
    console.error("Employee dropdown error:", error);

    setEmployeeMaster([]);

    Swal.fire({
      icon: "error",
      title: "Unable to load employees",
      text: getApiError(error),
    });
  } finally {
    setEmployeeLoading(false);
  }
}, [fetchEmployees, employeeCode, user?.Comp_Code]);

  // Automatically refresh Employee Code dropdown when location changes.
  useEffect(() => {
    loadEmployeeMaster();
  }, [loadEmployeeMaster]);

  // Fetch individual employee salary details.
  const getSalaryForEmployee = useCallback(
    async (employee: SlipRow) => {
      const dates = getMonthDates(year, month);

      const payload = {
        location: getText(
          employee.raw?.Loc_code,
          employee.raw?.LocationCode,
          employee.raw?.LOC_CODE,
          getCode(employee.branch)
        ),

        department: getText(
          employee.raw?.DIVISION,
          employee.raw?.DivisionCode,
          employee.raw?.DepartmentCode,
          selectedDepartments.map(getCode).join(",")
        ),

        empcode: employee.empCode,
        dateFrom: dates.dateFrom,
        dateto: dates.dateto,
        employeeType,
        EmpType: employeeType,
        web: 1,
      };

      const response = await postApi(
        "/mobile/PaySlipDataWeb",
        payload
      );

      const rows = getResponseRows(response);

      return (
        rows[0] ??
        response?.data?.data ??
        response?.data?.Result ??
        response?.data ??
        {}
      );
    },
    [
      year,
      month,
      employeeType,
      selectedDepartments,
      postApi,
    ]
  );

  // Show salary slip results.
  const handleShowResults = async () => {
    if (!month || !year || !/^\d{4}$/.test(year)) {
      Swal.fire({
        icon: "warning",
        title: "Invalid period",
        text: "Please select a valid month and four-digit year.",
      });

      return;
    }

    try {
      setLoading(true);
      setSelectedSlips([]);
      setSalaryDetails({});
      setHasSearched(true);

      const employees = await fetchEmployees();

      let normalized = employees
        .map(normalizeEmployee)
        .filter((item) => item.empCode);

      if (employeeCode !== "all") {
        normalized = normalized.filter(
          (item) => item.empCode === employeeCode
        );
      }

      setSlipRows(normalized);

      if (!normalized.length) {
        setSalaryDetails({});

        Swal.fire({
          icon: "info",
          title: "No employees found",
          text: "No employees were found for the selected filters.",
        });

        return;
      }

      const detailEntries = await Promise.allSettled(
        normalized.map(async (employee) => ({
          empCode: employee.empCode,
          data: await getSalaryForEmployee(employee),
        }))
      );

      const details: Record<string, any> = {};
      const updatedRows = [...normalized];

      detailEntries.forEach((result) => {
        if (result.status !== "fulfilled") return;

        const { empCode, data } = result.value;

        details[empCode] = data;

        const index = updatedRows.findIndex(
          (item) => item.empCode === empCode
        );

        if (index !== -1) {
          updatedRows[index] = normalizeSalaryData(
            data,
            updatedRows[index]
          );
        }
      });

      setSalaryDetails(details);
      setSlipRows(updatedRows);

      const failedCount = detailEntries.filter(
        (item) => item.status === "rejected"
      ).length;

      if (failedCount) {
        Swal.fire({
          icon: "warning",
          title: "Results loaded with warnings",
          text: `${
            normalized.length - failedCount
          } salary slips loaded. ${failedCount} salary details could not be fetched.`,
        });
      } else {
        Swal.fire({
          icon: "success",
          title: "Results loaded",
          text: `${updatedRows.length} employee salary records fetched.`,
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error("Salary results error:", error);

      Swal.fire({
        icon: "error",
        title: "Unable to fetch salary slips",
        text: getApiError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  // Clear filters.
  const handleClearFilters = () => {
    setSelectedLocations([]);
    setSelectedRegions([]);
    setSelectedDepartments([]);
    setSelectedChannels([]);
    setSelectedClusters([]);
    setSelectedSections([]);

    setEmployeeType("Regular");
    setEmployeeCode("all");

    setLocationSearch("");
    setRegionSearch("");
    setDeptSearch("");
    setChannelSearch("");
    setClusterSearch("");
    setSectionSearch("");

    setSelectedSlips([]);
    setSlipRows([]);
    setSalaryDetails({});
    setHasSearched(false);
  };

  const handleSelectAllSlips = (checked: boolean) => {
    setSelectedSlips(
      checked ? slipRows.map((item) => item.id) : []
    );
  };

  const getSelectedRows = () =>
    slipRows.filter((item) =>
      selectedSlips.includes(item.id)
    );

  const escapeHtml = (value: any) =>
    String(value ?? "—")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  // Build salary slip HTML.


const buildSlipHtml = (employee: SlipRow) => {
  const details = salaryDetails[employee.empCode] || {};
  const raw = details?.data || details?.Result || details?.result || details;

  const period = `${
    MONTHS.find((item) => String(item.value) === String(month))?.label || month
  } ${year}`;

  const monthOptions = MONTHS.map(
    (item) => `
      <option
        value="${escapeHtml(item.value)}"
        ${String(item.value) === String(month) ? "selected" : ""}
      >
        ${escapeHtml(item.label)}
      </option>
    `
  ).join("");

  const currentYear = new Date().getFullYear();

  const availableYears = Array.from(
    { length: 11 },
    (_, index) => currentYear - 5 + index
  );

  if (!availableYears.includes(Number(year))) {
    availableYears.push(Number(year));
  }

  availableYears.sort((a, b) => b - a);

  const yearOptions = availableYears
    .map(
      (item) => `
        <option
          value="${item}"
          ${String(item) === String(year) ? "selected" : ""}
        >
          ${item}
        </option>
      `
    )
    .join("");

  const read = (...keys: string[]): any => {
    const normalizedKeys = keys.map((key) =>
      key.toLowerCase().replace(/[^a-z0-9]/g, "")
    );

    const foundKey = Object.keys(raw || {}).find((key) =>
      normalizedKeys.includes(
        key.toLowerCase().replace(/[^a-z0-9]/g, "")
      )
    );

    return foundKey ? raw[foundKey] : "";
  };

  const value = (val: any) =>
    val !== null && val !== undefined && String(val).trim() !== ""
      ? String(val)
      : "—";

  const money = (val: any) => {
    if (val === null || val === undefined || val === "") return "—";

    const amount = Number(String(val).replace(/[₹,\s]/g, ""));

    if (Number.isNaN(amount)) return String(val);

    return `₹${amount.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  };

  const compactMoney = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${Math.round(amount / 1000)}k`;
    return `₹${amount}`;
  };

  const companyName =
    getText(
      user?.Comp_Name,
      user?.CompanyName,
      user?.companyName,
      raw?.CompanyName,
      raw?.Comp_Name
    ) || "Company";

  const paymentDate = read(
    "PaidOn",
    "PaymentDate",
    "PaidDate",
    "CreditDate",
    "SalaryPaidDate"
  );

  const employeeDetails = [
    ["Employee code", employee.empCode],
    ["Employee name", employee.employeeName],
    ["Father's name", read("FatherName", "Father_Name", "FName")],
    ["Designation", employee.designation],
    ["Location", employee.branch],
    ["Department", read("Department", "DepartmentName", "DIVISION")],
    ["Bank", read("BankName", "Bank")],
    ["A/c no.", read("AccountNo", "AccountNumber", "AcNo", "BankAccount")],
    ["IFSC", read("IFSC", "IFSCCode")],
    ["Date of joining", read("DOJ", "DateOfJoining", "JoiningDate")],
    ["PF no.", read("PFNo", "PFNumber", "PFAccountNo")],
    ["ESI no.", read("ESINo", "ESINumber", "ESICNo")],
    ["UAN", read("UAN", "UANNo", "UANNumber")],
  ];

  const days = [
    ["Present", read("Present", "PresentDays", "TotalPresent")],
    ["Week off", read("WeekOff", "WeekOffDays", "WO")],
    ["Holiday", read("Holiday", "HolidayDays")],
    ["Leave", read("Leave", "LeaveDays", "TotalLeave")],
    ["Absent", read("Absent", "AbsentDays")],
  ];

  const paidDays = getText(
    read("PaidDays", "Paid_Days", "TotalPaidDays"),
    employee.paidDays
  );

  const makeRows = (source: any): [string, any][] => {
    if (Array.isArray(source)) {
      return source.map((item: any) => [
        getText(
          item?.Particular,
          item?.Component,
          item?.Name,
          item?.Head,
          item?.label
        ) || "Salary component",
        item?.Amount ?? item?.Value ?? item?.amount ?? 0,
      ]);
    }

    if (source && typeof source === "object") {
      return Object.entries(source).map(([key, val]) => [key, val]);
    }

    return [];
  };

  const earningsSource = read(
    "Earnings",
    "Earning",
    "SalaryEarnings",
    "EarningDetails"
  );

  const deductionsSource = read(
    "Deductions",
    "Deduction",
    "SalaryDeductions",
    "DeductionDetails"
  );

  const excluded = [
    "employee",
    "empcode",
    "employeecode",
    "employeename",
    "designation",
    "department",
    "location",
    "branch",
    "paiddays",
    "presentdays",
    "weekoff",
    "holiday",
    "leave",
    "absent",
    "grosssalary",
    "gross",
    "netsalary",
    "netpay",
    "netpaid",
    "netamount",
    "totalearning",
    "totaldeduction",
    "paymentdate",
    "paidon",
    "companyname",
    "bankname",
    "accountno",
    "ifsc",
    "uan",
    "pfno",
    "esino",
    "doj",
    "fathername",
  ];

  const scalarRows = Object.entries(raw || {}).filter(
    ([key, val]) =>
      !excluded.some((item) =>
        key.toLowerCase().replace(/[^a-z0-9]/g, "").includes(item)
      ) &&
      (typeof val === "string" || typeof val === "number") &&
      val !== ""
  );

  let earningRows = makeRows(earningsSource);
  let deductionRows = makeRows(deductionsSource);

  if (!earningRows.length && !deductionRows.length) {
    scalarRows.forEach(([key, val]) => {
      const normalizedKey = key.toLowerCase();

      if (
        /pf|provident|esi|esic|tax|tds|deduction|advance|loan|professional tax/.test(
          normalizedKey
        )
      ) {
        deductionRows.push([key, val]);
      } else if (
        /basic|hra|allowance|conveyance|bonus|incentive|earning|salary|overtime/.test(
          normalizedKey
        )
      ) {
        earningRows.push([key, val]);
      }
    });
  }

  const gross =
    read("GrossSalary", "Gross", "GROSS", "TotalEarning", "GrossEarnings") ||
    employee.raw?.GrossSalary;

  const totalDeduction = read(
    "TotalDeduction",
    "TotalDeductions",
    "DeductionTotal"
  );

  const netPay =
    read("NetPaid", "NetSalary", "NET_PAY", "NetPay", "NetAmount") ||
    employee.netPaid;

  const pfAmount = read("PF", "PFContribution", "ProvidentFund");
  const tdsAmount = read("TDS", "TDSAmount");
  const esiAmount = read("ESIC", "ESI", "ESIAmount");

  const historySource = read(
    "LastSixMonths",
    "SalaryHistory",
    "NetPayHistory",
    "MonthlySalaryHistory"
  );

  const historyRows = Array.isArray(historySource)
    ? historySource.slice(-6).map((item: any) => ({
        month: getText(
          item?.MonthName,
          item?.Month,
          item?.month,
          item?.Period
        ),
        amount: Number(
          item?.NetPay ??
          item?.NetPaid ??
          item?.NetSalary ??
          item?.Amount ??
          item?.Value ??
          0
        ),
      }))
    : [];

  const maxHistoryAmount = Math.max(
    ...historyRows.map((item) => item.amount),
    1
  );

  const historyChart = historyRows.length
    ? historyRows
        .map((item, index) => {
          const height =
            item.amount > 0
              ? Math.max(8, (item.amount / maxHistoryAmount) * 65)
              : 0;

          return `
            <div class="chart-column">
              <span class="chart-month">
                ${escapeHtml(item.month)}
              </span>

              <div class="chart-bar-wrap">
                <div
                  class="chart-bar ${index === historyRows.length - 1 ? "active" : ""}"
                  style="height:${height}px"
                ></div>
              </div>

              <span class="chart-value">
                ${escapeHtml(compactMoney(item.amount))}
              </span>
            </div>
          `;
        })
        .join("")
    : `<div class="chart-empty">Salary history not available</div>`;

  const ytdGross = read("YTDGross", "YTDGrossEarned", "YearToDateGross");
  const ytdNet = read("YTDNet", "YTDNetReceived", "YearToDateNet");
  const ytdPF = read("YTDPF", "YTDPFContribution", "YearToDatePF");
  const ytdTDS = read("YTDTDS", "YTDTDSDeducted", "YearToDateTDS");

  const formatRows = (rows: [string, any][]) =>
    rows.length
      ? rows
          .map(
            ([label, amount]) => `
              <div class="amount-row">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(money(amount))}</strong>
              </div>
            `
          )
          .join("")
      : `<div class="empty-row">No details available</div>`;

  const renderDetails = employeeDetails
    .map(
      ([label, val]) => `
        <div class="detail-row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value(val))}</strong>
        </div>
      `
    )
    .join("");

  const renderDays = days
    .map(
      ([label, val]) => `
        <div class="day-row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value(val))}</strong>
        </div>
      `
    )
    .join("");

  const safeAccount = getText(
    read("AccountNo", "AccountNumber", "AcNo", "BankAccount")
  );

  const maskedAccount =
    safeAccount.length > 4
      ? `XXXX${safeAccount.slice(-4)}`
      : safeAccount || "—";

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Salary Slip - ${escapeHtml(employee.empCode)}</title>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <style>
    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 18px;
      background: #f5f8fc;
      color: #152b4b;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
    }

    .page {
      width: 100%;
      max-width: 1800px;
      margin: auto;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 15px;
      margin-bottom: 15px;
    }

    .page-title {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 5px;
    }

    .subtitle {
      color: #71819b;
      font-size: 12px;
    }

    .period {
      display: flex;
      gap: 10px;
    }

    .period-box {
      min-width: 130px;
      padding: 7px 10px;
      background: white;
      border: 1px solid #dce5f1;
      border-radius: 9px;
    }

    .period-box span {
      display: block;
      color: #71819b;
      font-size: 10px;
      margin-bottom: 5px;
      font-weight: 600;
    }

    .period-select {
      width: 100%;
      border: none;
      outline: none;
      background: transparent;
      color: #152b4b;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 298px;
      gap: 14px;
      align-items: start;
    }

    .slip-card,
    .side-card {
      background: #fff;
      border: 1px solid #dce5f1;
      border-radius: 12px;
      box-shadow: 0 3px 12px rgba(15, 23, 42, .04);
      overflow: hidden;
    }

    .company-header {
      min-height: 69px;
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid #dce5f1;
    }

    .company-info {
      display: flex;
      align-items: center;
      gap: 13px;
      min-width: 0;
    }

    .logo {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
      border-radius: 10px;
      background: #5045ed;
      color: #fff;
      display: flex;
      justify-content: center;
      align-items: center;
      font-weight: 700;
      font-size: 13px;
    }

    .company-name { font-size: 13px; font-weight: 700; }
    .company-period { color: #71819b; font-size: 11px; margin-top: 3px; }

    .paid-badge {
      color: #08a77b;
      background: #dff8ef;
      padding: 5px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      white-space: nowrap;
    }

    .upper-section {
      display: grid;
      grid-template-columns: 1.25fr 1fr;
    }

    .employee-section,
    .days-section,
    .earning-section,
    .deduction-section {
      padding: 21px;
      min-width: 0;
    }

    .days-section,
    .deduction-section {
      border-left: 1px solid #dce5f1;
    }

    .section-title {
      margin: 0 0 13px;
      color: #657995;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: .45px;
      text-transform: uppercase;
    }

    .detail-row {
      display: grid;
      grid-template-columns: 115px minmax(0, 1fr);
      gap: 4px;
      padding: 5px 0;
      line-height: 1.35;
    }

    .detail-row span,
    .day-row span,
    .amount-row span { color: #657995; }

    .detail-row strong,
    .day-row strong {
      color: #152b4b;
      font-weight: 600;
      overflow-wrap: anywhere;
    }

    .day-row,
    .amount-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 6px 0;
      border-bottom: 1px solid #e2e8f0;
    }

    .day-row strong,
    .amount-row strong {
      text-align: right;
      font-weight: 600;
    }

    .paid-days {
      display: flex;
      justify-content: space-between;
      padding-top: 10px;
      font-weight: 700;
    }

    .paid-days strong { color: #5045ed; }

    .salary-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-top: 1px solid #dce5f1;
    }

    .deduction-section .total-row { color: #e11d48; }

    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding-top: 11px;
      margin-top: 4px;
      border-top: 1px solid #dce5f1;
      font-weight: 700;
    }

    .empty-row { padding: 12px 0; color: #94a3b8; }

    .net-pay {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 15px;
      padding: 17px 21px;
      background: #f8fafc;
      border-top: 1px solid #dce5f1;
    }

    .net-title {
      color: #657995;
      font-size: 10px;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .net-words { color: #71819b; font-size: 11px; }

    .net-value {
      color: #10b981;
      font-size: 23px;
      font-weight: 700;
      text-align: right;
    }

    .bank-credit {
      margin-top: 4px;
      color: #71819b;
      font-size: 10px;
      text-align: right;
    }

    .slip-footer {
      padding: 12px;
      border-top: 1px solid #dce5f1;
      color: #71819b;
      font-size: 10px;
      text-align: center;
    }

    .sidebar {
      display: grid;
      gap: 12px;
      min-width: 0;
    }

    .side-card { padding: 16px; }

    .side-title {
      color: #71819b;
      font-size: 10px;
      font-weight: 700;
      margin: 0 0 14px;
      text-transform: uppercase;
      letter-spacing: .3px;
    }

    .history-chart {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 7px;
      align-items: end;
      min-height: 105px;
    }

    .chart-column {
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .chart-month { color: #71819b; font-size: 9px; white-space: nowrap; }

    .chart-bar-wrap {
      width: 100%;
      height: 65px;
      display: flex;
      align-items: flex-end;
    }

    .chart-bar {
      width: 100%;
      min-height: 0;
      border-radius: 5px 5px 0 0;
      background: #d0ccfa;
      transition: height .2s ease;
    }

    .chart-bar.active { background: #5045ed; }

    .chart-value {
      color: #64748b;
      font-size: 9px;
      font-weight: 600;
      white-space: nowrap;
    }

    .chart-empty {
      grid-column: 1 / -1;
      padding: 25px 5px;
      color: #94a3b8;
      text-align: center;
      font-size: 11px;
    }

    .ytd-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px;
      margin-top: 8px;
      border: 1px solid #dce5f1;
      border-radius: 9px;
      background: #f8fafc;
    }

    .ytd-left {
      display: flex;
      align-items: center;
      gap: 9px;
      min-width: 0;
    }

    .ytd-icon {
      width: 25px;
      height: 25px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 7px;
      background: #e0f2fe;
      color: #0ea5e9;
      font-size: 13px;
      font-weight: 700;
    }

    .ytd-row:nth-of-type(2) .ytd-icon { background: #d1fae5; color: #10b981; }
    .ytd-row:nth-of-type(3) .ytd-icon { background: #ede9fe; color: #8b5cf6; }
    .ytd-row:nth-of-type(4) .ytd-icon { background: #ffe4e6; color: #e11d48; }

    .ytd-label { color: #71819b; font-size: 11px; }
    .ytd-row strong { color: #24334c; font-size: 12px; white-space: nowrap; }

    .help-text { color: #71819b; line-height: 1.6; font-size: 11px; }

    .help-link {
      display: inline-block;
      margin-top: 12px;
      color: #5045ed;
      font-weight: 600;
      font-size: 12px;
    }

    @media(max-width: 1100px) {
      .layout { grid-template-columns: minmax(0, 1fr) 260px; }
      .employee-section,
      .days-section,
      .earning-section,
      .deduction-section { padding: 16px; }
      .history-chart { gap: 5px; }
      .chart-value { font-size: 8px; }
    }

    @media(max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
      .sidebar { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media(max-width: 600px) {
      body { padding: 10px; }

      .topbar {
        align-items: flex-start;
        flex-direction: column;
      }

      .period { width: 100%; }
      .period-box { flex: 1; min-width: 0; }

      .company-header { align-items: flex-start; }

      .upper-section,
      .salary-section { grid-template-columns: 1fr; }

      .days-section,
      .deduction-section {
        border-left: 0;
        border-top: 1px solid #dce5f1;
      }

      .employee-section,
      .days-section,
      .earning-section,
      .deduction-section { padding: 16px; }

      .detail-row { grid-template-columns: 105px minmax(0, 1fr); }
      .sidebar { grid-template-columns: 1fr; }

      .net-pay {
        align-items: flex-start;
        flex-direction: column;
      }

      .net-value,
      .bank-credit { text-align: left; }

      .history-chart { gap: 8px; }
      .chart-value { font-size: 9px; }
    }

    @media print {
      @page { size: A4 landscape; margin: 8mm; }

      body {
        padding: 0;
        background: white;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .page { max-width: 100%; }
      .layout { grid-template-columns: minmax(0, 1fr) 260px; gap: 10px; }

      .slip-card,
      .side-card {
        box-shadow: none;
        break-inside: avoid;
      }

      .sidebar { gap: 8px; }
      .side-card { padding: 12px; }
    }
  </style>
</head>

<body>
  <div class="page">

    <div class="topbar">
      <div>
        <h1 class="page-title">My salary slip</h1>
        <div class="subtitle">
          Your own register for the month, exactly as payroll issued it.
        </div>
      </div>

      <div class="period">
        <div class="period-box">
          <span>MONTH</span>
          <select id="slipMonth" class="period-select">
            ${monthOptions}
          </select>
        </div>

        <div class="period-box">
          <span>YEAR</span>
          <select id="slipYear" class="period-select">
            ${yearOptions}
          </select>
        </div>
      </div>
    </div>

    <div class="layout">

      <main class="slip-card">

        <div class="company-header">
          <div class="company-info">
            <div class="logo">AV</div>
            <div>
              <div class="company-name">${escapeHtml(companyName)}</div>
              <div class="company-period">
                Salary register for ${escapeHtml(period)}
              </div>
            </div>
          </div>

          ${
            paymentDate
              ? `<span class="paid-badge">Paid on ${escapeHtml(paymentDate)}</span>`
              : `<span class="paid-badge">Salary statement</span>`
          }
        </div>

        <div class="upper-section">
          <section class="employee-section">
            <h3 class="section-title">Employee particulars</h3>
            ${renderDetails}
          </section>

          <section class="days-section">
            <h3 class="section-title">Days</h3>
            ${renderDays}

            <div class="paid-days">
              <span>Paid days</span>
              <strong>${escapeHtml(paidDays)}</strong>
            </div>
          </section>
        </div>

        <div class="salary-section">
          <section class="earning-section">
            <h3 class="section-title">Earnings</h3>
            ${formatRows(earningRows)}

            <div class="total-row">
              <span>Gross earnings</span>
              <strong>${escapeHtml(money(gross))}</strong>
            </div>
          </section>

          <section class="deduction-section">
            <h3 class="section-title">Deductions</h3>
            ${formatRows(deductionRows)}

            <div class="total-row">
              <span>Total deductions</span>
              <strong>${escapeHtml(money(totalDeduction))}</strong>
            </div>
          </section>
        </div>

        <div class="net-pay">
          <div>
            <div class="net-title">NET PAY</div>
            <div class="net-words">
              ${escapeHtml(
                read("NetPayWords", "AmountInWords", "NetAmountWords") ||
                "Salary credited for the selected month"
              )}
            </div>
          </div>

          <div>
            <div class="net-value">${escapeHtml(money(netPay))}</div>
            <div class="bank-credit">
              Credited to ${escapeHtml(read("BankName", "Bank") || "Bank")}
              ${escapeHtml(maskedAccount)}
            </div>
          </div>
        </div>

        <div class="slip-footer">
          This is a computer generated statement, hence no signature required.
        </div>
      </main>

      <aside class="sidebar">

        <div class="side-card">
          <h3 class="side-title">Net pay · Last 6 months</h3>
          <div class="history-chart">${historyChart}</div>
        </div>

        <div class="side-card">
          <h3 class="side-title">Year to date</h3>

          <div class="ytd-row">
            <div class="ytd-left">
              <div class="ytd-icon">↗</div>
              <span class="ytd-label">Gross earned</span>
            </div>
            <strong>${escapeHtml(money(ytdGross))}</strong>
          </div>

          <div class="ytd-row">
            <div class="ytd-left">
              <div class="ytd-icon">▣</div>
              <span class="ytd-label">Net received</span>
            </div>
            <strong>${escapeHtml(money(ytdNet))}</strong>
          </div>

          <div class="ytd-row">
            <div class="ytd-left">
              <div class="ytd-icon">▥</div>
              <span class="ytd-label">PF contributed</span>
            </div>
            <strong>${escapeHtml(money(ytdPF))}</strong>
          </div>

          <div class="ytd-row">
            <div class="ytd-left">
              <div class="ytd-icon">₹</div>
              <span class="ytd-label">TDS deducted</span>
            </div>
            <strong>${escapeHtml(money(ytdTDS))}</strong>
          </div>
        </div>

        <div class="side-card">
          <h3 class="side-title">Something wrong?</h3>
          <div class="help-text">
            If the paid days look wrong, raise it with your branch HR —
            they can raise a paid-days deviation for the month.
          </div>
          <div class="help-link">Raise with HR &nbsp; →</div>
        </div>

      </aside>
    </div>
  </div>

  <script>
    (function () {
      const monthSelect = document.getElementById("slipMonth");
      const yearSelect = document.getElementById("slipYear");

      function notifyPeriodChange() {
        if (!monthSelect || !yearSelect) return;

        const payload = {
          type: "SALARY_SLIP_PERIOD_CHANGE",
          empCode: ${JSON.stringify(employee.empCode)},
          month: monthSelect.value,
          year: yearSelect.value
        };

        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(payload, window.location.origin);
        }
      }

      monthSelect?.addEventListener("change", notifyPeriodChange);
      yearSelect?.addEventListener("change", notifyPeriodChange);
    })();
  </script>
</body>
</html>
`;
};


  const openSlip = (
    employee: SlipRow,
    shouldPrint = false
  ) => {
    const popup = window.open("", "_blank");

    if (!popup) {
      Swal.fire({
        icon: "warning",
        title: "Popup blocked",
        text: "Please allow popups to view or download the salary slip.",
      });

      return;
    }

    popup.document.open();
    popup.document.write(buildSlipHtml(employee));
    popup.document.close();

    if (shouldPrint) {
      popup.onload = () => {
        popup.focus();
        popup.print();
      };
    }
  };

  const handleViewSlip = (employee: SlipRow) => {
    openSlip(employee, false);
  };

  const handleDownloadSlip = (employee: SlipRow) => {
    openSlip(employee, true);
  };

  const handleDownloadSelected = () => {
    const selected = getSelectedRows();

    if (!selected.length) {
      Swal.fire({
        icon: "warning",
        title: "Select employees",
        text: "Please select at least one salary slip.",
      });

      return;
    }

    selected.forEach((employee, index) => {
      window.setTimeout(
        () => openSlip(employee, true),
        index * 500
      );
    });
  };

  const handleEmailSelected = async () => {
    const selected = getSelectedRows();

    if (!selected.length) {
      Swal.fire({
        icon: "warning",
        title: "Select employees",
        text: "Please select employees before sending email.",
      });

      return;
    }

    const result = await Swal.fire({
      icon: "question",
      title: "Email selected salary slips?",
      text: `${selected.length} employee(s) selected.`,
      showCancelButton: true,
      confirmButtonText: "Continue",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    Swal.fire({
      icon: "info",
      title: "Email PDF required",
      text: "The sendEmailSalary API requires a generated PDF file. This page currently opens printable salary slips; connect the PDF-generation output to the API's file field to send actual PDF attachments.",
    });
  };

  // Table columns.
  const columns = useMemo(
    () => [
      {
        Header: (
          <input
            type="checkbox"
            checked={
              slipRows.length > 0 &&
              selectedSlips.length === slipRows.length
            }
            onChange={(e) =>
              handleSelectAllSlips(e.target.checked)
            }
            className="h-4 w-4 rounded border-[#dce5f1] text-indigo-600"
          />
        ),
        accessor: "id",
        width: 55,
        Cell: ({ row }: any) => {
          const item = row.original;
          const isChecked = selectedSlips.includes(item.id);

          return (
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() =>
                setSelectedSlips((prev) =>
                  prev.includes(item.id)
                    ? prev.filter((id) => id !== item.id)
                    : [...prev, item.id]
                )
              }
              className="h-4 w-4 rounded border-[#dce5f1] text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
            />
          );
        },
      },
      {
        Header: "EMPLOYEE",
        accessor: "employeeName",
        width: 260,
        Cell: ({ row }: any) => {
          const item = row.original;

          return (
            <div>
              <p className="text-[12px] font-semibold text-[#152b4b] dark:text-slate-100">
                {item.employeeName}
              </p>

              <p className="text-[11px] text-[#64748b] dark:text-slate-400">
                {item.designation} · {item.empCode} · {item.empType}
              </p>
            </div>
          );
        },
      },
      {
        Header: "BRANCH",
        accessor: "branch",
        width: 150,
        Cell: ({ value }: any) => (
          <span className="text-[12px] text-[#52627c] dark:text-slate-300">
            {value}
          </span>
        ),
      },
      {
        Header: "PAID DAYS",
        accessor: "paidDays",
        width: 100,
        Cell: ({ value }: any) => (
          <span className="text-[12px] font-medium text-[#152b4b] dark:text-slate-200">
            {value}
          </span>
        ),
      },
      {
        Header: "GROSS",
        accessor: "gross",
        width: 120,
        Cell: ({ value }: any) => (
          <span className="text-[12px] font-medium text-[#152b4b] dark:text-slate-200">
            {value}
          </span>
        ),
      },
      {
        Header: "NET PAID",
        accessor: "netPaid",
        width: 120,
        Cell: ({ value }: any) => (
          <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">
            {value}
          </span>
        ),
      },
      {
        Header: "HR STATUS",
        accessor: "hrStatus",
        width: 140,
        Cell: ({ value }: any) => {
          const isApproved =
            String(value).toLowerCase() === "approved";

          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                isApproved
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
              }`}
            >
              {value}
            </span>
          );
        },
      },
      {
        Header: "SLIP",
        accessor: "actions",
        width: 140,
        Cell: ({ row }: any) => {
          const employee = row.original;

          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                title="View slip"
                onClick={() => handleViewSlip(employee)}
                className="flex h-7 w-7 items-center justify-center rounded border border-[#dce5f1] bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <Eye size={14} />
              </button>

              <button
                type="button"
                title="Email slip"
                onClick={() => {
                  setSelectedSlips((prev) =>
                    prev.includes(employee.id)
                      ? prev
                      : [...prev, employee.id]
                  );

                  Swal.fire({
                    icon: "info",
                    title: "Email salary slip",
                    text: "Select the employee and use Email selected. PDF attachment generation needs to be connected to the email API.",
                  });
                }}
                className="flex h-7 w-7 items-center justify-center rounded border border-[#dce5f1] bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <Mail size={14} />
              </button>

              <button
                type="button"
                title="Download slip"
                onClick={() => handleDownloadSlip(employee)}
                className="flex h-7 w-7 items-center justify-center rounded border border-[#dce5f1] bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <Download size={14} />
              </button>
            </div>
          );
        },
      },
    ],
    [selectedSlips, slipRows]
  );

  const periodLabel = `${
    MONTHS.find((item) => item.value === month)?.label || month
  } ${year}`;

  return (
    <div className="min-h-screen min-w-0 bg-[#f5f8fc] p-3 transition-colors dark:bg-[#0b1220] sm:p-4 lg:p-6">
      <HashloaderComponent
        isLoading={loading || masterLoading || employeeLoading}
      />

      <div className="mx-auto min-w-0 max-w-[1800px] space-y-4">

        {/* PAGE HEADER */}
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[20px] font-bold leading-tight text-[#152b4b] dark:text-slate-100 sm:text-[23px]">
              Employee salary slips
            </h1>

            <p className="mt-1 text-[12px] text-[#64748b] dark:text-slate-400 sm:text-[13px]">
              Narrow the population, check the list, then download one payslip per employee or a single one-pager for the whole selection.
            </p>
          </div>
        </div>

        {/* TOP FILTER BAR */}
       
<div className="rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">

    <div className="min-w-0">
      <Eselect
        title="MONTH"
        redlabel="*"
        name="month"
        option={MONTHS}
        initialValue={month}
        handleInputChange={handleInputChange}
        className="h-[41px] w-full"
      />
    </div>

    <div className="min-w-0">
      <Eselect
        title="YEAR"
        name="year"
        option={YEARS}
        initialValue={year}
        handleInputChange={handleInputChange}
        className="h-[41px] w-full"
      />
    </div>

    <div className="min-w-0">
      <Eselect
        title="EMPLOYEE TYPE"
        name="employeeType"
        option={EMPLOYEE_TYPES}
        initialValue={employeeType}
        handleInputChange={handleInputChange}
        className="h-[41px] w-full"
      />
    </div>

    <div className="min-w-0">
      <Eselect
        title="EMPLOYEE CODE"
        redlabel="*"
        name="employeeCode"
        option={employeeCodeOptions}
        initialValue={employeeCode}
        handleInputChange={handleInputChange}
        className="h-[41px] w-full"
      />
    </div>

    <div className="flex min-w-0 items-end gap-2 sm:col-span-2 lg:col-span-2">
      <AButton
        type="button"
        onClick={handleShowResults}
        disabled={loading || masterLoading || employeeLoading}
        className="inline-flex h-[41px] shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 text-[12px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        <Search size={15} />
        Show results
      </AButton>

      <button
        type="button"
        onClick={handleClearFilters}
        className="inline-flex h-[41px] shrink-0 items-center justify-center rounded-lg border border-[#dce5f1] bg-white px-4 text-[12px] font-semibold text-[#64748b] hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
      >
        Clear filters
      </button>
    </div>

  </div>


</div>


        {/* FILTER BOXES */}
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FilterCard
            title="Locations"
            options={locations}
            selected={selectedLocations}
            onChange={(value) =>
              toggleCheckboxItem(value, setSelectedLocations)
            }
            search={locationSearch}
            onSearch={setLocationSearch}
            onAll={() =>
              setSelectedLocations(locations.map((item) => item.value))
            }
          />

          <FilterCard
            title="Regions"
            options={regions}
            selected={selectedRegions}
            onChange={(value) =>
              toggleCheckboxItem(value, setSelectedRegions)
            }
            search={regionSearch}
            onSearch={setRegionSearch}
            onAll={() =>
              setSelectedRegions(regions.map((item) => item.value))
            }
          />

          <FilterCard
            title="Departments"
            options={departments}
            selected={selectedDepartments}
            onChange={(value) =>
              toggleCheckboxItem(value, setSelectedDepartments)
            }
            search={deptSearch}
            onSearch={setDeptSearch}
            onAll={() =>
              setSelectedDepartments(departments.map((item) => item.value))
            }
          />

          <FilterCard
            title="Channel"
            options={channels}
            selected={selectedChannels}
            onChange={(value) =>
              toggleCheckboxItem(value, setSelectedChannels)
            }
            search={channelSearch}
            onSearch={setChannelSearch}
            onAll={() =>
              setSelectedChannels(channels.map((item) => item.value))
            }
          />

          <FilterCard
            title="Cluster"
            options={clusters}
            selected={selectedClusters}
            onChange={(value) =>
              toggleCheckboxItem(value, setSelectedClusters)
            }
            search={clusterSearch}
            onSearch={setClusterSearch}
            onAll={() =>
              setSelectedClusters(clusters.map((item) => item.value))
            }
          />

          <FilterCard
            title="Sections"
            options={sections}
            selected={selectedSections}
            onChange={(value) =>
              toggleCheckboxItem(value, setSelectedSections)
            }
            search={sectionSearch}
            onSearch={setSectionSearch}
            onAll={() =>
              setSelectedSections(sections.map((item) => item.value))
            }
          />
          <FilterCard
  title="Designation"
  options={designations}
  selected={selectedDesignations}
  onChange={(value) =>
    toggleCheckboxItem(value, setSelectedDesignations)
  }
  search={designationSearch}
  onSearch={setDesignationSearch}
  onAll={() =>
    setSelectedDesignations(
      designations.map((item) => item.value)
    )
  }
/>
        </div>

        {/* RESULTS TABLE */}
        <div className="min-w-0 overflow-hidden rounded-xl border border-[#dce5f1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-[#e8edf5] px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold text-[#152b4b] dark:text-slate-100">
                {slipRows.length} payslips
              </span>

              <span className="text-[12px] text-[#64748b] dark:text-slate-400">
                Select the slips you want to send or download
              </span>
            </div>

            <span className="text-[11px] font-medium text-[#64748b] dark:text-slate-400">
              {selectedSlips.length} selected
            </span>
          </div>

          <div className="w-full min-w-0 overflow-x-auto">
            <div className="min-w-[950px]">
              <DataTable
                columns={columns}
                data={slipRows}
                showTopSearch={true}
                showExcelExport={false}
                initialPageSize={10}
              />
            </div>
          </div>

          {/* TABLE FOOTER */}
          <div className="flex flex-col gap-3 border-t border-[#e8edf5] px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[12px] text-[#64748b] dark:text-slate-400">
              {hasSearched
                ? `Salary register for ${periodLabel}`
                : "Select filters and click Show results"}
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <AButton
                type="button"
                onClick={handleEmailSelected}
                disabled={!selectedSlips.length || loading}
                className="inline-flex h-[38px] items-center justify-center gap-2 rounded-lg border border-[#dce5f1] bg-white px-4 text-[12px] font-semibold text-[#52627c] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <Mail size={15} />
                Email selected
              </AButton>

              <AButton
                type="button"
                onClick={handleDownloadSelected}
                disabled={!selectedSlips.length || loading}
                className="inline-flex h-[38px] items-center justify-center gap-2 rounded-lg bg-[#475569] px-4 text-[12px] font-semibold text-white transition hover:bg-[#334155] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download size={15} />
                Download
              </AButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
