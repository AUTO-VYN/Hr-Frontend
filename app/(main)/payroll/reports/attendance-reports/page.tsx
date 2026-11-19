"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, X } from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import Eselect from "@/components/atoms/Eselect";
import FilterCard from "@/components/atoms/FilterCard";
import HashloaderComponent from "@/components/Templates/hashloader";
import Einput from "@/components/atoms/Einput";
import AttendancePDFDownloader from "./AttendancePDFDownloader";

type Option = {
  value: string;
  label: string;
};

type ReportItem = {
  id: string;
  title: string;
  endpoint: string;
  format: "XLS" | "PDF" | "BOTH";
  reportType?: number;
  extraParams?: Record<string, any>;
  group: string;
};

const API_URL = process.env.NEXT_PUBLIC_URL;
const CURRENT_YEAR = new Date().getFullYear();

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

const LEFT_EMPLOYEE_OPTIONS: Option[] = [
  { value: "1", label: "YES" },
  { value: "0", label: "NO" },
];

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
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.recordset)) return value.recordset;
  if (Array.isArray(value?.Result)) return value.Result;
  if (Array.isArray(value?.result)) return value.result;

  return [];
};

const getResponseRows = (response: any): any[] => {
  const data = response?.data;

  const candidates = [
    data?.data,
    data?.Data,
    data?.result,
    data?.Result,
    data?.recordset,
    data?.recordsets?.[0],
    data?.employees,
    data?.Employees,
    data?.employee,
    data?.Employee,
    data,
  ];

  for (const item of candidates) {
    if (Array.isArray(item)) return item;

    if (item && typeof item === "object") {
      const nested = [
        item.data,
        item.Data,
        item.result,
        item.Result,
        item.recordset,
        item.recordsets?.[0],
        item.employees,
        item.Employees,
        item.employee,
        item.Employee,
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

const getCode = (value: any) => {
  if (value === null || value === undefined) return "";

  return String(value).split(" - ")[0].trim();
};

const makeOptions = (
  data: any[],
  codeKeys: string[],
  nameKeys: string[],
): Option[] => {
  const result = data
    .map((item) => {
      const code =
        typeof item === "string" || typeof item === "number"
          ? String(item)
          : getText(...codeKeys.map((key) => item?.[key]));

      const name =
        typeof item === "string" || typeof item === "number"
          ? String(item)
          : getText(...nameKeys.map((key) => item?.[key]));

      if (!code && !name) return null;

      const value = code || name;
      const label =
        code && name && code !== name ? `${code} - ${name}` : name || code;

      return {
        value: String(value),
        label: String(label),
      };
    })
    .filter(Boolean) as Option[];

  return Array.from(new Map(result.map((item) => [item.value, item])).values());
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};


const getMonthDates = (year: string, month: string) => {
  const selectedYear = Number(year);
  const selectedMonth = Number(month);

  // October aur November dono ke liye same attendance period
  if (selectedMonth === 10 || selectedMonth === 11) {
    return {
      dateFrom: formatDate(new Date(selectedYear, 9, 26)),
      dateTo: formatDate(new Date(selectedYear, 10, 25)),
    };
  }

  // Baaki months ke liye normal calendar period
  return {
    dateFrom: formatDate(
      new Date(selectedYear, selectedMonth - 1, 1)
    ),
    dateTo: formatDate(
      new Date(selectedYear, selectedMonth, 0)
    ),
  };
};


const REPORTS: ReportItem[] = [
  {
    id: "attendance-single",
    title: "Download Attendance (Single Line)",
    endpoint: "/hrmsreport/attendanceReport",
    format: "BOTH",
    reportType: 1,
    group: "ATTENDANCE REGISTERS",
  },
  {
    id: "attendance-multi",
    title: "Multi Line Attendance Report",
    endpoint: "/hrmsreport/attendanceReport",
    format: "BOTH",
    reportType: 2,
    group: "ATTENDANCE REGISTERS",
  },
  {
    id: "overtime",
    title: "Over Time Report",
    endpoint: "/hrmsreport/OtDaysReport",
    format: "XLS",
    extraParams: {
      reporttype: 2,
    },
    group: "OVERTIME & MOVEMENT",
  },
  {
    id: "gate-pass",
    title: "GatePass Report",
    endpoint: "/hrmsreport/digitalgatepass",
    format: "XLS",
    group: "OVERTIME & MOVEMENT",
  },
  {
    id: "mobile-attendance",
    title: "Mobile Attendance Report",
    endpoint: "/hrmsreport/MobileAttdenceReport",
    format: "XLS",
    group: "ATTENDANCE REGISTERS",
  },
  {
    id: "machine-punching",
    title: "Daily Machine Punching Report",
    endpoint: "/hrmsreport/PunchingReport",
    format: "XLS",
    group: "PUNCHES & IN/OUT",
  },
  {
    id: "without-inout",
    title: "Attn Without InOut Time Report",
    endpoint: "/hrmsreport/withoutInOutTymattendanceReport",
    format: "XLS",
    extraParams: {
      reporttype: 2,
      InoutTime: 1,
    },
    group: "PUNCHES & IN/OUT",
  },
  {
    id: "attendance-inout",
    title: "ATTN InOut Detailed Report",
    endpoint: "/hrmsreport/ATTNConsolidDateReport",
    format: "XLS",
    group: "PUNCHES & IN/OUT",
  },
  {
    id: "daily-attendance",
    title: "Daily Attendance Status Report",
    endpoint: "/hrmsreport/Daily_Attendance_Status_Report",
    format: "XLS",
    group: "ATTENDANCE REGISTERS",
  },
  {
    id: "outdoor-transaction",
    title: "Outdoor Transaction Report",
    endpoint: "/hrmsreport/OD_report",
    format: "XLS",
    group: "OVERTIME & MOVEMENT",
  },
  {
    id: "daily-overtime",
    title: "Daily OverTime Report",
    endpoint: "/hrmsreport/Daily_OT_Report",
    format: "XLS",
    group: "OVERTIME & MOVEMENT",
  },
];

const GROUPS = [
  "ATTENDANCE REGISTERS",
  "PUNCHES & IN/OUT",
  "OVERTIME & MOVEMENT",
];

export default function AttendanceReportsPage() {
  const user = useCurrentUser();
  const router = useRouter();

  const initialDates = getMonthDates(
    String(CURRENT_YEAR),
    String(new Date().getMonth() + 1),
  );

  const [loading, setLoading] = useState(false);
  const [masterLoading, setMasterLoading] = useState(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [dateFrom, setDateFrom] = useState(initialDates.dateFrom);
  const [dateTo, setDateTo] = useState(initialDates.dateTo);

  const [regions, setRegions] = useState<Option[]>([]);
  const [channels, setChannels] = useState<Option[]>([]);
  const [clusters, setClusters] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [sections, setSections] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [designations, setDesignations] = useState<Option[]>([]);

  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeCode, setEmployeeCode] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [employeeType, setEmployeeType] = useState("1");
  const [leftEmployees, setLeftEmployees] = useState("0");

  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedDesignations, setSelectedDesignations] = useState<string[]>(
    [],
  );

  const [regionSearch, setRegionSearch] = useState("");
  const [channelSearch, setChannelSearch] = useState("");
  const [clusterSearch, setClusterSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [sectionSearch, setSectionSearch] = useState("");
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [designationSearch, setDesignationSearch] = useState("");

  const postApi = useCallback(
    async (path: string, payload: any) => {
      if (!API_URL) {
        throw new Error("NEXT_PUBLIC_URL is not configured.");
      }

      if (!user?.Comp_Code) {
        throw new Error("Company code is not ready.");
      }

      return axios.post(`${API_URL}${path}`, payload, {
        headers: {
          compcode: user.Comp_Code,
          name: user?.name || "",
          token: user?.email || "",
        },
      });
    },
    [user?.Comp_Code, user?.name, user?.email],
  );

  const getApi = useCallback(
    async (path: string) => {
      if (!API_URL) {
        throw new Error("NEXT_PUBLIC_URL is not configured.");
      }

      if (!user?.Comp_Code) {
        throw new Error("Company code is not ready.");
      }

      return axios.get(`${API_URL}${path}`, {
        headers: {
          compcode: user.Comp_Code,
          name: user?.name || "",
          token: user?.email || "",
        },
      });
    },
    [user?.Comp_Code, user?.name, user?.email],
  );

  const handleInputChange = (name: string, value: any) => {
    const selectedValue = String(value ?? "");

    if (name === "year") setYear(selectedValue);
    if (name === "month") setMonth(selectedValue);
    if (name === "employeeType") setEmployeeType(selectedValue);
    if (name === "leftEmployees") setLeftEmployees(selectedValue);
  };

  const toggleItem = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setter((previous) =>
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value],
    );
  };

  const clearAllFilters = () => {
    setSelectedRegions([]);
    setSelectedChannels([]);
    setSelectedClusters([]);
    setSelectedLocations([]);
    setSelectedSections([]);
    setSelectedDepartments([]);
    setSelectedDesignations([]);

    setRegionSearch("");
    setChannelSearch("");
    setClusterSearch("");
    setLocationSearch("");
    setSectionSearch("");
    setDepartmentSearch("");
    setDesignationSearch("");

    setEmployeeCode("");
    setEmployeeSearch("");
    setSelectedEmployee(null);
    setEmployeeType("1");
    setLeftEmployees("0");
  };

  const fetchMasters = useCallback(async () => {
    if (!user?.Comp_Code || !user?.branch) return;

    try {
      setMasterLoading(true);

      const response = await postApi("/hrmsreport/findMasters", {
        multiloc: user.branch,
        Month: Number(month),
        Year: Number(year),
      });

      const data = response?.data?.data || response?.data?.Data || {};

      const locationData = Array.isArray(data?.Location?.[0])
        ? data.Location[0]
        : getArray(data?.Location);

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
          ["Cluster_Code", "ClusterCode", "CLUSTER_CODE", "Name", "label"],
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
      console.error("Attendance findMasters error:", error);

      Swal.fire({
        icon: "error",
        title: "Unable to load filters",
        text: getApiError(error),
      });
    } finally {
      setMasterLoading(false);
    }
  }, [postApi, user?.Comp_Code, user?.branch, month, year]);

  useEffect(() => {
    if (user?.Comp_Code && user?.branch) {
      fetchMasters();
    }
  }, [fetchMasters, user?.Comp_Code, user?.branch]);

  const fetchEmployees = useCallback(async () => {
    if (!user?.Comp_Code || !user?.branch) return [];

    const response = await postApi("/users/findAllEmployee", {
      branch: user.branch,
    });

    return getResponseRows(response);
  }, [postApi, user?.Comp_Code, user?.branch]);

  useEffect(() => {
    let active = true;

    const loadEmployees = async () => {
      if (!user?.Comp_Code || !user?.branch) return;

      try {
        setEmployeeLoading(true);

        const rows = await fetchEmployees();

        if (active) {
          setEmployees(rows);
        }
      } catch (error) {
        console.error("Employee master error:", error);

        if (active) {
          setEmployees([]);

          Swal.fire({
            icon: "error",
            title: "Unable to load employees",
            text: getApiError(error),
          });
        }
      } finally {
        if (active) setEmployeeLoading(false);
      }
    };

    loadEmployees();

    return () => {
      active = false;
    };
  }, [fetchEmployees, user?.Comp_Code, user?.branch]);

const employeeOptions = useMemo(() => {
  return employees
    .map((item: any) => {
      const code = getText(
        item?.EMPCODE,
        item?.EmpCode,
        item?.EmployeeCode,
        item?.Emp_Code,
        item?.Employee_Code,
        item?.EMP_CODE,
        item?.Emp_Code_No,
        item?.Employee_Code_No,
        item?.value,
        item?.Code,
      );

      const directName = getText(
        item?.EmployeeName,
        item?.EmpName,
        item?.EMP_NAME,
        item?.Emp_Name,
        item?.Employee_Name,
        item?.EMPLOYEE_NAME,
        item?.Name,
        item?.name,
      );

      const rawLabel = getText(item?.label);

      let name = directName;

      if (!name && rawLabel) {
        if (rawLabel.includes("|")) {
          name = rawLabel.split("|").slice(1).join("|").trim();
        } else if (code && rawLabel.startsWith(code)) {
          name = rawLabel
            .slice(code.length)
            .replace(/^[\s-]+/, "")
            .trim();
        } else {
          name = rawLabel;
        }
      }

      if (!code) return null;

      return {
        value: code,
        label: name ? `${code} - ${name}` : code,
        raw: item,
      };
    })
    .filter(Boolean) as (Option & { raw: any })[];
}, [employees]);

 const filteredEmployees = useMemo(() => {
  const search = employeeSearch.trim().toLowerCase();

  if (!search) return employeeOptions;

  return employeeOptions.filter(
    (item) =>
      item.value.toLowerCase().includes(search) ||
      item.label.toLowerCase().includes(search),
  );
}, [employeeOptions, employeeSearch]);

  const selectEmployee = (code: string) => {
    const selected = employeeOptions.find((item) => item.value === code);

    setEmployeeCode(code);
    setSelectedEmployee(selected?.raw || null);
    setEmployeeSearch("");
  };

  const clearEmployee = () => {
    setEmployeeCode("");
    setSelectedEmployee(null);
    setEmployeeSearch("");
  };

  const getEmployeeName = (employee: any) => {
    if (!employee) return "";

    const directName = getText(
      employee?.EmployeeName,
      employee?.EmpName,
      employee?.EMP_NAME,
      employee?.Emp_Name,
      employee?.Name,
      employee?.name,
    );

    if (directName) return directName;

    const label = getText(employee?.label);

    if (label.includes("|")) {
      return label.split("|").slice(1).join("|").trim();
    }

    const code = getText(
      employee?.EMPCODE,
      employee?.EmpCode,
      employee?.EmployeeCode,
      employee?.Emp_Code,
      employee?.value,
      employee?.Code,
    );

    if (code && label.startsWith(code)) {
      return label
        .slice(code.length)
        .replace(/^[\s-]+/, "")
        .trim();
    }

    return label;
  };

  const getEmployeeBranch = (employee: any) =>
    getText(
      employee?.LocationName,
      employee?.BranchName,
      employee?.Location,
      employee?.Branch,
      employee?.Loc_name,
      employee?.Loc_code,
    );

  const getEmployeeDepartment = (employee: any) =>
    getText(
      employee?.Department,
      employee?.DepartmentName,
      employee?.DIVISION_NAME,
      employee?.Division_Name,
    );

  const getEmployeeType = (employee: any) =>
    getText(
      employee?.EmployeeType,
      employee?.EmpType,
      employee?.EMP_TYPE,
      employee?.employeeType,
    );

  const getReportPayload = (report: ReportItem) => {
    const selectedRegionCodes = selectedRegions.map(getCode);
    const selectedChannelCodes = selectedChannels.map(getCode);
    const selectedClusterCodes = selectedClusters.map(getCode);
    const selectedLocationCodes = selectedLocations.map(getCode);
    const selectedSectionCodes = selectedSections.map(getCode);
    const selectedDepartmentCodes = selectedDepartments.map(getCode);
    const selectedDesignationCodes = selectedDesignations.map(getCode);

    return {
      dateFrom,
      dateto: dateTo,
      status: "3",
      region: selectedRegionCodes.length ? selectedRegionCodes.join(",") : "",
      channel: selectedChannelCodes.length
        ? selectedChannelCodes.join(",")
        : "",
      Cluster: selectedClusterCodes.length
        ? selectedClusterCodes.join(",")
        : "",
      location: selectedLocationCodes.length
        ? selectedLocationCodes.join(",")
        : "",
      section: selectedSectionCodes.length
        ? selectedSectionCodes.join(",")
        : "",
      department: selectedDepartmentCodes.length
        ? selectedDepartmentCodes.join(",")
        : "",
      designation: selectedDesignationCodes.length
        ? selectedDesignationCodes.join(",")
        : "",
      emptype: employeeType,
      empcode: employeeCode || "",
      reporttype:
        report.id === "attendance-single" || report.id === "attendance-multi"
          ? String(report.reportType)
          : report.id,
      LeftEmp: Number(leftEmployees),
      loc_code: Number(user?.branch) || 1,
      page: 1,
      pageSize: 10,
      limit: 10,
      search: "",
      ...report.extraParams,
    };
  };

  const downloadBlob = async (
    blob: Blob,
    fileName: string,
    format: "XLS" | "PDF",
  ) => {
    if (!(blob instanceof Blob)) {
      throw new Error("Invalid file response received from server.");
    }

    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    if (format === "PDF") {
      const signature = new TextDecoder().decode(bytes.slice(0, 5));

      if (signature !== "%PDF-") {
        throw new Error("Server did not return a valid PDF file.");
      }
    } else {
      const contentType = blob.type || "";

      if (
        contentType.includes("application/json") ||
        contentType.includes("text/")
      ) {
        const responseText = await blob.text();

        throw new Error(responseText || "Report download failed.");
      }
    }

    const mimeType =
      format === "PDF"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    const finalBlob = new Blob([buffer], { type: mimeType });
    const url = window.URL.createObjectURL(finalBlob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  };





const handleDownload = async (
  report: ReportItem,
  format: "XLS" | "PDF"
) => {
  const key = `${report.id}-${format}`;

  if (!user?.Comp_Code) {
    Swal.fire({
      icon: "warning",
      title: "User details missing",
      text: "Please login again and try.",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 2500,
    });
    return;
  }

  if (!dateFrom || !dateTo) {
    Swal.fire({
      icon: "warning",
      title: "Select date range",
      text: "Please select both From Date and To Date.",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 2500,
    });
    return;
  }

  if (new Date(dateFrom) > new Date(dateTo)) {
    Swal.fire({
      icon: "warning",
      title: "Invalid date range",
      text: "From Date cannot be greater than To Date.",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 2500,
    });
    return;
  }

  try {
    setDownloading(key);

    const payload = getReportPayload(report);

    const isAttendance =
      report.id === "attendance-single" ||
      report.id === "attendance-multi";

    const postReportIds = [
      "mobile-attendance",
      "daily-attendance",
      "machine-punching",
      "without-inout",
      "attendance-inout",
      "overtime",
      "gate-pass",
      "outdoor-transaction",
      "daily-overtime",
    ];

    const commonHeaders = {
      compcode: user.Comp_Code,
      name: user.name || "",
      token: user.email || "",
    };

    const outputFormat =
      format === "PDF" ? "pdf" : "excel";

    let response: any;

    // ==========================================
    // ATTENDANCE SINGLE / MULTI REPORT
    // ==========================================
  
if (isAttendance) {
  const attendancePayload = {
    reporttype: report.reportType,
    dateFrom: payload.dateFrom,
    dateto: payload.dateto,
    compcode: user.Comp_Code,
    region: payload.region || "",
    channel: payload.channel || "",
    Cluster: payload.Cluster || "",
    LeftEmp: String(payload.LeftEmp),
    department: payload.department || "",
    designation: payload.designation || "",
    empcode: payload.empcode || "",
    emptype: String(payload.emptype),
    location: Number(payload.location) || Number(user?.branch) || 1,
    section: payload.section || "",
    user_location: 0,
  };

  response = await axios.post(
    `${API_URL}${report.endpoint}?compcode=${user.Comp_Code}`,
    attendancePayload,
    {
      headers: commonHeaders,
      responseType: "blob",
    }
  );
}


    // ==========================================
    // OTHER POST REPORTS
    // ==========================================
    else if (postReportIds.includes(report.id)) {
      const commonReportPayload: any = {
        dateFrom: payload.dateFrom,
        dateto: payload.dateto,
        compcode: user.Comp_Code,
        region: payload.region,
        channel: payload.channel,
        Cluster: payload.Cluster,
        LeftEmp: String(payload.LeftEmp),
        department: payload.department,
        empcode: payload.empcode,
        emptype: String(payload.emptype),
        location:
          payload.location || Number(user?.branch) || 1,
        section: payload.section,
        user_location: 0,
      };

      // Designation required reports
      if (
        report.id === "mobile-attendance" ||
        report.id === "daily-attendance" ||
        report.id === "machine-punching" ||
        report.id === "without-inout" ||
        report.id === "overtime"
      ) {
        commonReportPayload.designation =
          payload.designation;
      }

      // Without In-Out
      if (report.id === "without-inout") {
        commonReportPayload.reporttype = 2;
        commonReportPayload.InoutTime = 1;
      }

      // Overtime
      if (report.id === "overtime") {
        commonReportPayload.reporttype = 2;
      }

      response = await axios.post(
        `${API_URL}${report.endpoint}?compcode=${user.Comp_Code}`,
        commonReportPayload,
        {
          headers: commonHeaders,
          responseType: "blob",
        }
      );
    }

    // ==========================================
    // OTHER GET REPORTS
    // ==========================================
    else {
      response = await axios.get(
        `${API_URL}${report.endpoint}`,
        {
          params: {
            ...payload,
            compcode: user.Comp_Code,
          },
          headers: commonHeaders,
          responseType: "blob",
        }
      );
    }

    // ==========================================
    // RESPONSE VALIDATION
    // ==========================================
    if (!response?.data) {
      throw new Error(
        "No report data received from server."
      );
    }

    // Check whether API returned an error instead of a file
    if (
      response.data instanceof Blob &&
      response.data.type.includes("application/json")
    ) {
      const errorText = await response.data.text();

      try {
        const errorData = JSON.parse(errorText);

        throw new Error(
          errorData?.message ||
          errorData?.Message ||
          errorData?.error ||
          "Report generation failed."
        );
      } catch (parseError: any) {
        if (parseError instanceof SyntaxError) {
          throw new Error(errorText || "Report generation failed.");
        }
        throw parseError;
      }
    }

    // ==========================================
    // DOWNLOAD FILE
    // ==========================================
    const fileName = `${report.title.replace(
      /[^a-zA-Z0-9-_]/g,
      "_"
    )}_${dateFrom}_to_${dateTo}`;

    await downloadBlob(
      response.data,
      fileName,
      format
    );

    // ==========================================
    // SUCCESS MESSAGE
    // ==========================================
    Swal.fire({
      icon: "success",
      title: "Download started",
      text: `${report.title} ${format} report downloaded successfully.`,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 2500,
    });

  } catch (error: any) {
    console.error("Report download error:", error);

    let errorMessage =
      "Unable to download report. Please try again.";

    if (error?.response?.data instanceof Blob) {
      try {
        const errorText =
          await error.response.data.text();

        console.error(
          "Report API error response:",
          errorText
        );

        try {
          const errorData = JSON.parse(errorText);

          errorMessage =
            errorData?.message ||
            errorData?.Message ||
            errorData?.error ||
            errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
      } catch (readError) {
        console.error(
          "Unable to read error response:",
          readError
        );
      }
    } else {
      errorMessage =
        error?.response?.data?.message ||
        error?.response?.data?.Message ||
        error?.response?.data?.error ||
        error?.message ||
        errorMessage;
    }

    Swal.fire({
      icon: "error",
      title: "Download failed",
      text: errorMessage,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3500,
    });

  } finally {
    setDownloading(null);
  }
};



  const handleYearMonthChange = (name: string, value: any) => {
    const selectedValue = String(value ?? "");

    if (name === "year") setYear(selectedValue);
    if (name === "month") setMonth(selectedValue);

    const nextYear = name === "year" ? selectedValue : year;
    const nextMonth = name === "month" ? selectedValue : month;

    if (
      nextYear &&
      nextMonth &&
      Number(nextYear) > 1900 &&
      Number(nextMonth) >= 1 &&
      Number(nextMonth) <= 12
    ) {
      const dates = getMonthDates(nextYear, nextMonth);

      setDateFrom(dates.dateFrom);
      setDateTo(dates.dateTo);
    }
  };

  const periodLabel = `${dateFrom || "—"} – ${dateTo || "—"}`;

  const scopeLabel = selectedEmployee
    ? `${employeeCode} · ${getEmployeeName(selectedEmployee)}`
    : "All employees matching selected filters";
const renderFilterCard = (
  title: string,
  options: Option[],
  selected: string[],
  setter: React.Dispatch<React.SetStateAction<string[]>>,
  search: string,
  setSearch: React.Dispatch<React.SetStateAction<string>>,
) => (
  <FilterCard
    title={title}
    options={options}
    selected={selected}
    onChange={(value: string) => toggleItem(value, setter)}
    search={search}
    onSearch={setSearch}
    onAll={(shouldSelect: boolean) => {
      setter(
        shouldSelect
          ? options.map((item) => item.value)
          : []
      );
    }}
  />
);

 const renderReportButton = (report: ReportItem, format: "XLS" | "PDF") => {
  const key = `${report.id}-${format}`;
  const isLoading = downloading === key;

  const isAttendance =
    report.id === "attendance-single" ||
    report.id === "attendance-multi";

  // Attendance PDF: use existing pdf-lib downloader component
if (isAttendance && format === "PDF") {
  const payload = getReportPayload(report);

  const attendancePayload = {
    ...payload,
    reporttype: report.reportType,
    compcode: user?.Comp_Code,
    output: "pdf",
    LeftEmp: String(payload.LeftEmp),
    location: payload.location || Number(user?.branch) || 1,
    user_location: 0,
  };

  return (
    <AttendancePDFDownloader
      key={key}
      url={`${API_URL}${report.endpoint}?compcode=${user?.Comp_Code}`}
      text="PDF"
      payload={attendancePayload}
      className="inline-flex h-[33px] min-w-[47px] items-center justify-center gap-1 rounded-[7px] border border-[#e2e8f0] bg-white px-2 text-[10px] font-semibold text-red-600 transition hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800 dark:text-red-400"
      icon={<Download size={10} />}
    />
  );
}

  // Existing XLS download button
  return (
    <button
      key={key}
      type="button"
      onClick={() => handleDownload(report, format)}
      disabled={!!downloading || masterLoading || employeeLoading}
      className={`inline-flex h-[32px] min-w-[62px] items-center justify-center gap-1.5 rounded-lg border border-[#dce5f1] bg-white px-2.5 text-[11px] font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 ${
        format === "PDF"
          ? "text-red-600 dark:text-red-400"
          : "text-emerald-600 dark:text-emerald-400"
      }`}
    >
      {isLoading ? (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <Download size={13} />
      )}
      {format}
    </button>
  );
};
  return (
    <div className="min-h-screen min-w-0 bg-[#f5f8fc] p-3 dark:bg-[#0b1220] sm:p-4 lg:p-6">
      <HashloaderComponent
        isLoading={loading || masterLoading || employeeLoading}
      />

      <div className="mx-auto max-w-[1800px] space-y-4">
        {/* PAGE HEADER */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[20px] font-bold text-[#152b4b] dark:text-slate-100 sm:text-[23px]">
              Attendance Reports
            </h1>
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_470px]">
          {/* LEFT CONTENT */}
          <div className="min-w-0 space-y-4">
            {/* DATE FILTERS */}
            <div className="rounded-xl border border-[#dce5f1] bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <Eselect
                    title="Year"
                    name="year"
                    option={YEARS}
                    initialValue={year}
                    handleInputChange={handleYearMonthChange}
                    className="h-[41px] w-full"
                  />
                </div>

                <div>
                  <Eselect
                    title="Month"
                    name="month"
                    option={MONTHS}
                    initialValue={month}
                    handleInputChange={handleYearMonthChange}
                    className="h-[41px] w-full"
                  />
                </div>

                <div>
                  <Einput
                    title="Date From "
                    type="date"
                    name="dateFrom"
                    value={dateFrom}
                    handleInputChange={(name: string, value: any) =>
                      setDateFrom(String(value ?? ""))
                    }
                    className="h-[41px] w-full"
                  />
                </div>

                <div>
                  <Einput
                    title="Date To"
                    type="date"
                    name="dateTo"
                    value={dateTo}
                    handleInputChange={(name: string, value: any) =>
                      setDateTo(String(value ?? ""))
                    }
                    className="h-[41px] w-full"
                  />
                </div>
              </div>
            </div>

            {/* FILTER HEADER */}
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] font-semibold tracking-[0.08em] text-[#64748b] dark:text-slate-400">
                FILTER EMPLOYEES
              </p>

              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                Clear all
              </button>
            </div>

            {/* FILTER CARDS */}
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {renderFilterCard(
                "Regions",
                regions,
                selectedRegions,
                setSelectedRegions,
                regionSearch,
                setRegionSearch,
              )}

              {renderFilterCard(
                "Channel",
                channels,
                selectedChannels,
                setSelectedChannels,
                channelSearch,
                setChannelSearch,
              )}

              {renderFilterCard(
                "Cluster",
                clusters,
                selectedClusters,
                setSelectedClusters,
                clusterSearch,
                setClusterSearch,
              )}

              {renderFilterCard(
                "Locations",
                locations,
                selectedLocations,
                setSelectedLocations,
                locationSearch,
                setLocationSearch,
              )}

              {renderFilterCard(
                "Sections",
                sections,
                selectedSections,
                setSelectedSections,
                sectionSearch,
                setSectionSearch,
              )}

              {renderFilterCard(
                "Department",
                departments,
                selectedDepartments,
                setSelectedDepartments,
                departmentSearch,
                setDepartmentSearch,
              )}

              <div className="sm:col-span-2 lg:col-span-3">
                {renderFilterCard(
                  "Designation",
                  designations,
                  selectedDesignations,
                  setSelectedDesignations,
                  designationSearch,
                  setDesignationSearch,
                )}
              </div>
            </div>

            {/* SINGLE EMPLOYEE */}
            <div className="w-full max-w-[430px] overflow-hidden rounded-xl border border-[#dce5f1] bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-[#e8edf5] px-4 py-3 dark:border-slate-800">
                <h3 className="text-[13px] font-semibold text-[#152b4b] dark:text-slate-100">
                  Single employee
                </h3>

                <button
                  type="button"
                  onClick={clearEmployee}
                  className="text-[12px] font-medium text-[#64748b] hover:text-indigo-600 dark:text-slate-400"
                >
                  Clear
                </button>
              </div>

              <div className="space-y-3 p-3">
                <div>
                  <Eselect
                    title="Employee code"
                    name="employeeCode"
                    option={filteredEmployees}
                    initialValue={employeeCode}
                    handleInputChange={(name: string, value: string) => {
                      if (name === "employeeCode") {
                        const selected = employeeOptions.find(
                          (item) => String(item.value) === String(value),
                        );

                        setEmployeeCode(value);
                        setSelectedEmployee(selected?.raw || null);
                        setEmployeeSearch("");
                      }
                    }}
                    className="h-[40px] w-full"
                  />

                  {selectedEmployee && (
                    <div className="mt-3 flex items-center gap-3 rounded-lg bg-indigo-50 p-3 dark:bg-indigo-500/10">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                        {getEmployeeName(selectedEmployee)
                          .slice(0, 2)
                          .toUpperCase() || "EM"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-[#152b4b] dark:text-slate-100">
                          {getEmployeeName(selectedEmployee)}
                        </p>

                        <p className="truncate text-[11px] text-[#64748b] dark:text-slate-400">
                          {employeeCode}
                          {getEmployeeType(selectedEmployee)
                            ? ` · ${getEmployeeType(selectedEmployee)}`
                            : ""}
                          {getEmployeeBranch(selectedEmployee)
                            ? ` · ${getEmployeeBranch(selectedEmployee)}`
                            : ""}
                          {getEmployeeDepartment(selectedEmployee)
                            ? ` · ${getEmployeeDepartment(selectedEmployee)}`
                            : ""}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={clearEmployee}
                        className="shrink-0 text-slate-400 hover:text-red-500"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Eselect
                      title="Emp type"
                      name="employeeType"
                      option={EMPLOYEE_TYPES}
                      initialValue={employeeType}
                      handleInputChange={handleInputChange}
                      className="h-[40px] w-full"
                    />
                  </div>

                  <div>
                    <Eselect
                      title="Left employees"
                      name="leftEmployees"
                      option={LEFT_EMPLOYEE_OPTIONS}
                      initialValue={leftEmployees}
                      handleInputChange={handleInputChange}
                      className="h-[40px] w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT DOWNLOAD PANEL */}
          <aside className="min-w-0 xl:sticky xl:top-4">
            <div className="overflow-hidden rounded-xl border border-[#dce5f1] bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-[#e8edf5] px-4 py-3 dark:border-slate-800">
                <h2 className="text-[14px] font-bold text-[#152b4b] dark:text-slate-100">
                  Download report
                </h2>

                <div className="mt-1.5 grid grid-cols-[55px_minmax(0,1fr)] gap-x-2 text-[12px]">
                  <span className="text-[#64748b] dark:text-slate-400">
                    Period
                  </span>
                  <span className="font-semibold text-[#152b4b] dark:text-slate-200">
                    {periodLabel}
                  </span>

                  <span className="text-[#64748b] dark:text-slate-400">
                    Scope
                  </span>
                  <span className="break-words font-semibold text-[#152b4b] dark:text-slate-200">
                    {scopeLabel}
                  </span>
                </div>
              </div>

              <div className="space-y-4 p-4">
                {GROUPS.map((group) => (
                  <section key={group}>
                    <h3 className="mb-2.5 text-[11px] font-semibold tracking-[0.07em] text-[#64748b] dark:text-slate-400">
                      {group}
                    </h3>

                    <div className="space-y-2.5">
                      {REPORTS.filter((report) => report.group === group).map(
                        (report) => (
                          <div
                            key={report.id}
                            className="flex min-w-0 items-center justify-between gap-2"
                          >
                            <span className="min-w-0 text-[12px] font-medium text-[#152b4b] dark:text-slate-200">
                              {report.title}
                            </span>

                            <div className="flex shrink-0 items-center gap-2">
                              {report.format === "BOTH" ? (
                                <>
                                  {renderReportButton(report, "XLS")}
                                  {renderReportButton(report, "PDF")}
                                </>
                              ) : (
                                renderReportButton(report, "XLS")
                              )}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
