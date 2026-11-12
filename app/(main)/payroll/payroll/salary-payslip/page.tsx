"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Swal from "sweetalert2";
import { useCurrentUser } from "@/app/hooks/use-current-user";

import { Search, Eye, Mail } from "lucide-react";

import AButton from "@/components/atoms/Button";
import Eselect from "@/components/atoms/Eselect";
import FilterCard from "@/components/atoms/FilterCard";
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

const YEARS: Option[] = Array.from({ length: 15 }, (_, index) => {
  const year = CURRENT_YEAR - index;

  return {
    value: String(year),
    label: String(year),
  };
});

const EMPLOYEE_TYPES: Option[] = [
  { value: "Regular", label: "Regular" },
  { value: "Casual", label: "Casual" },
];

const API_URL = process.env.NEXT_PUBLIC_URL;

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

const getEmployeeLocationCode = (
  employee: SlipRow,
  selectedLocations: string[] = [],
  userBranch?: string,
): string => {
  const raw = employee?.raw || {};

  const rawLocation = getText(
    raw?.Loc_code,
    raw?.LOC_CODE,
    raw?.LocationCode,
    raw?.LOCATION_CODE,
    raw?.locationCode,
    raw?.location_code,
    raw?.BranchCode,
    raw?.BRANCH_CODE,
    raw?.branchCode,
    raw?.Branch_Code,
    raw?.branch_code,
    raw?.Location,
    raw?.location,
  );

  // Raw employee location code is the first preference.
  if (rawLocation && rawLocation !== "—" && rawLocation !== "-") {
    return getCode(rawLocation);
  }

  // If exactly one location is selected, use that location.
  if (selectedLocations.length === 1) {
    return getCode(selectedLocations[0]);
  }

  // Use user branch only when it contains a single code.
  const branches = String(userBranch || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (branches.length === 1 && branches[0] !== "—") {
    return getCode(branches[0]);
  }

  return "";
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
  nameKeys: string[],
): FilterOption[] => {
  const result = data
    .map((item) => {
      const code = getLabel(item, codeKeys);
      const name = getLabel(item, nameKeys);

      if (!code && !name) return null;

      const value = code || name;

      const label =
        code && name && code !== name ? `${code} - ${name}` : name || code;

      return {
        value: String(value),
        label: String(label),
      };
    })
    .filter(Boolean) as FilterOption[];

  return Array.from(new Map(result.map((item) => [item.value, item])).values());
};

const formatAmount = (value: any): string => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(String(value).replace(/[₹,\s]/g, ""));

  if (Number.isNaN(amount)) return String(value);

  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
};

// Calendar month: 1st date se last date
const getMonthDates = (year: string, month: string) => {
  const y = Number(year);
  const m = Number(month);

  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 0);

  const format = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    dateFrom: format(startDate),
    dateto: format(endDate),
  };
};

// Supports both normal employee objects and { value, label } API options.
const normalizeEmployee = (item: any, index: number): SlipRow => {
  const empCode = getText(
    item?.value,
    item?.EMPCODE,
    item?.EmpCode,
    item?.EmployeeCode,
    item?.["Employee Code"],
    item?.empcode,
    item?.Code,
  );

  const employeeName = getText(
    item?.EmployeeName,
    item?.EmpName,
    item?.EMP_NAME,
    item?.Name,
    item?.["Employee Name"],
    item?.label?.split(" - ").slice(1).join(" - "),
  );

  return {
    id: empCode || String(index + 1),

    employeeName: employeeName || "Employee",

    designation:
      getText(
        item?.DESIGNATION,
        item?.Designation,
        item?.DesigName,
        item?.designation,
      ) || "—",

    empCode,

    empType:
      getText(
        item?.EmployeeType,
        item?.EmpType,
        item?.EMP_TYPE,
        item?.employeeType,
      ) || "—",

    branch:
      getText(
        item?.LocationName,
        item?.BranchName,
        item?.LOC_NAME,
        item?.Location,
        item?.Branch,
        item?.Loc_code,
      ) || "—",

    paidDays:
      getText(
        item?.PaidDays,
        item?.Paid_Days,
        item?.TotalPaidDays,
        item?.paidDays,
      ) || "—",

    gross: formatAmount(
      item?.GrossSalary ?? item?.Gross ?? item?.GROSS ?? item?.gross,
    ),

    netPaid: formatAmount(
      item?.NetPaid ??
        item?.NetSalary ??
        item?.NET_PAY ??
        item?.NetPay ??
        item?.netPaid,
    ),

    hrStatus:
      getText(item?.HRStatus, item?.HrStatus, item?.Status) || "Pending HR",

    raw: item,
  };
};

const normalizeSalaryData = (item: any, employee: SlipRow): SlipRow => {
  const source = item || {};

  const read = (...keys: string[]) => {
    for (const key of keys) {
      const value = source?.[key];

      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        return value;
      }
    }

    return undefined;
  };

  const approvalValue = getText(
    read("HR_Aprvl", "HRApproval", "HR_Status", "HRStatus"),
  );

  return {
    ...employee,

    employeeName: getText(
      read("Employee Name", "EmployeeName", "EmpName", "EMP_NAME"),
      employee.employeeName,
    ),

    empCode: getText(
      read("Employee Code", "EMPCODE", "EmpCode", "EmployeeCode"),
      employee.empCode,
    ),

    designation: getText(
      read("Designation", "DESIGNATION", "DesigName"),
      employee.designation,
    ),

    branch: getText(
      read(
        "LocationName",
        "BranchName",
        "Location",
        "Branch",
        "Loc_code",
        "Loc_Code",
      ),
      employee.branch,
    ),

    paidDays:
      getText(
        read(
          "Days Paid",
          "PaidDays",
          "Paid_Days",
          "TotalPaidDays",
          "Present_days",
        ),
        employee.paidDays,
      ) || "—",

    gross: formatAmount(
      read(
        "total Wages",
        "Total Wages",
        "Total wages",
        "GrossSalary",
        "Gross",
        "GROSS",
        "gross",
      ),
    ),

    netPaid: formatAmount(
      read(
        "Net Salary",
        "NetSalary",
        "NetPaid",
        "NET_PAY",
        "NetPay",
        "netPaid",
      ),
    ),

    hrStatus:
      approvalValue === "1"
        ? "Approved"
        : approvalValue === "0"
          ? "Rejected"
          : getText(
              read("HRStatus", "HrStatus", "HR_Status"),
              employee.hrStatus,
            ) || "Pending HR",

    raw: source,
  };
};



export default function EmployeeSalarySlipsPage() {
  const user = useCurrentUser();
  const router = useRouter();

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
  const [selectedDesignations, setSelectedDesignations] = useState<string[]>(
    [],
  );
  const [designationSearch, setDesignationSearch] = useState("");

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
    [user?.Comp_Code, user?.name],
  );

  // Employee Code dropdown options.
  // API format: { value: "TMPL227", label: "TMPL227 - RUPAK SAHA" }
  const employeeCodeOptions = useMemo(() => {
    const rows = Array.isArray(employeeMaster) ? employeeMaster : [];

    const options = rows
      .map((item: any) => {
        const value = getText(
          item?.value,
          item?.EMPCODE,
          item?.EmpCode,
          item?.EmployeeCode,
          item?.["Employee Code"],
          item?.empcode,
          item?.Code,
        );

        const label = getText(
          item?.label,
          item?.EmployeeName,
          item?.EmpName,
          item?.EMP_NAME,
          item?.Name,
          item?.["Employee Name"],
        );

        if (!value) return null;

        return {
          value,
          label: label || value,
        };
      })
      .filter(Boolean) as FilterOption[];

    const uniqueOptions = Array.from(
      new Map(options.map((item) => [item.value, item])).values(),
    );

    return [{ value: "all", label: "All Employees" }, ...uniqueOptions];
  }, [employeeMaster]);

  // Common select handler.
  const handleInputChange = (name: string, value: any) => {
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
    setList: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setList((prev) =>
      prev.includes(item)
        ? prev.filter((value) => value !== item)
        : [...prev, item],
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
          ["Loc_name", "LocationName", "LOC_NAME", "Name", "label"],
        ),
      );

      setRegions(
        makeOptions(
          getArray(data?.Region),
          ["Region_Code", "RegionCode", "REGION_CODE", "Code", "value"],
          ["Region_Name", "RegionName", "REGION_NAME", "Name", "label"],
        ),
      );

      setChannels(
        makeOptions(
          getArray(data?.CHANNEL),
          ["Channel_Code", "ChannelCode", "CHANNEL_CODE", "Code", "value"],
          ["Channel_Name", "ChannelName", "CHANNEL_NAME", "Name", "label"],
        ),
      );

      setClusters(
        makeOptions(
          getArray(data?.CLUSTER),
          ["Cluster_Code", "ClusterCode", "CLUSTER_CODE", "Code", "value"],
          ["Cluster_Name", "ClusterName", "Name", "label"],
        ),
      );

      setSections(
        makeOptions(
          getArray(data?.SECTION),
          ["Section_Code", "SectionCode", "SECTION_CODE", "Code", "value"],
          ["Section_Name", "SectionName", "Name", "label"],
        ),
      );

      setDepartments(
        makeOptions(
          getArray(data?.DIVISION),
          ["Division_Code", "DivisionCode", "DIVISION_CODE", "Code", "value"],
          ["Division_Name", "DivisionName", "Name", "label"],
        ),
      );

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
          ],
        ),
      );
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
  }, [user?.Comp_Code, user?.branch, month, year, postApi]);

  useEffect(() => {
    if (!user?.Comp_Code || !user?.branch) return;

    fetchMasters();
  }, [fetchMasters, user?.Comp_Code, user?.branch]);

  // Existing API payload retained: only Loc_code is sent.
  const fetchEmployees = useCallback(async () => {
    if (!user?.Comp_Code) return [];

    const selectedLocationCodes = selectedLocations
      .map(getCode)
      .filter(Boolean);

    const locationCodes = selectedLocationCodes.length
      ? selectedLocationCodes.join(",")
      : getText(user?.branch);

    const response = await postApi("/employee/findAllForSalary", {
      Loc_code: locationCodes,
    });

    return getResponseRows(response);
  }, [postApi, selectedLocations, user?.Comp_Code, user?.branch]);

  // Load employee master for Employee Code dropdown.
  const loadEmployeeMaster = useCallback(async () => {
    if (!user?.Comp_Code) return;

    try {
      setEmployeeLoading(true);

      const rows = await fetchEmployees();
      setEmployeeMaster(rows);

      if (
        employeeCode !== "all" &&
        !rows.some(
          (item: any) =>
            getText(
              item?.value,
              item?.EMPCODE,
              item?.EmpCode,
              item?.EmployeeCode,
            ) === employeeCode,
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

      const location = getText(
        employee.raw?.Loc_code,
        employee.raw?.LocationCode,
        employee.raw?.LOC_CODE,
        employee.raw?.location,
        employee.raw?.LocationCode,
      );

      const payload = {
        location,
        department: "",
        empcode: [employee.empCode],
        dateFrom: dates.dateFrom,
        dateto: dates.dateto,
        employeeType: "",
        EmpType: "",
        web: 1,
      };

      console.log("PaySlipDataWeb Request:", payload);

      const response = await postApi("/mobile/PaySlipDataWeb", payload);

      console.log("PaySlipDataWeb Response:", response?.data);

      const rows = getResponseRows(response);

      return rows[0] || {};
    },
    [year, month, postApi],
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
        normalized = normalized.filter((item) => item.empCode === employeeCode);
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
        })),
      );

      const details: Record<string, any> = {};
      const updatedRows = [...normalized];

      detailEntries.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(
            `Salary API failed for ${normalized[index]?.empCode}:`,
            result.reason,
          );
          return;
        }

        const { empCode, data } = result.value;

        details[empCode] = data;

        const rowIndex = updatedRows.findIndex(
          (item) => item.empCode === empCode,
        );

        if (rowIndex !== -1) {
          updatedRows[rowIndex] = normalizeSalaryData(
            data,
            updatedRows[rowIndex],
          );
        }
      });

      setSalaryDetails(details);
      setSlipRows(updatedRows);

      const failedCount = detailEntries.filter(
        (item) => item.status === "rejected",
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
    setSelectedDesignations([]);

    setEmployeeType("Regular");
    setEmployeeCode("all");

    setLocationSearch("");
    setRegionSearch("");
    setDeptSearch("");
    setChannelSearch("");
    setClusterSearch("");
    setSectionSearch("");
    setDesignationSearch("");

    setSelectedSlips([]);
    setSlipRows([]);
    setSalaryDetails({});
    setHasSearched(false);
  };

  const handleSelectAllSlips = (checked: boolean) => {
    setSelectedSlips(checked ? slipRows.map((item) => item.id) : []);
  };

  const getSelectedRows = () =>
    slipRows.filter((item) => selectedSlips.includes(item.id));

  // Eye icon -> selected employee ka salary slip page
  const handleViewSlip = (employee: SlipRow) => {
    const location = getText(
      employee.raw?.Loc_code,
      employee.raw?.LocationCode,
      employee.raw?.LOC_CODE,
    );

    const params = new URLSearchParams({
      empcode: employee.empCode,
      name: employee.employeeName,
      month: MONTHS.find((item) => item.value === month)?.label || "",
      year,
      type: "",
    });

    if (location) {
      params.set("location", location);
    }

    router.push(`/payroll/payroll/self-salary-slip?${params.toString()}`);
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
      text: "The sendEmailSalary API requires a generated PDF file. Connect the PDF-generation output to the API's file field to send actual PDF attachments.",
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
              slipRows.length > 0 && selectedSlips.length === slipRows.length
            }
            onChange={(e) => handleSelectAllSlips(e.target.checked)}
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
                    : [...prev, item.id],
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
          const isApproved = String(value).toLowerCase() === "approved";

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
        width: 110,
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
                    prev.includes(employee.id) ? prev : [...prev, employee.id],
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
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedSlips, slipRows, month, year, employeeType],
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
              Narrow the population, check the list, then view or email the
              payslips for the selection.
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
            onChange={(value) => toggleCheckboxItem(value, setSelectedRegions)}
            search={regionSearch}
            onSearch={setRegionSearch}
            onAll={() => setSelectedRegions(regions.map((item) => item.value))}
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
            onChange={(value) => toggleCheckboxItem(value, setSelectedChannels)}
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
            onChange={(value) => toggleCheckboxItem(value, setSelectedClusters)}
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
            onChange={(value) => toggleCheckboxItem(value, setSelectedSections)}
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
              setSelectedDesignations(designations.map((item) => item.value))
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
                Select the slips you want to send
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
