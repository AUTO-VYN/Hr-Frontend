"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  FileSpreadsheet,
  ChevronDown,
  X,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

// --------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------

const EMPLOYEE_API = "/employee/all";
const TEMPLATE_API = "/hrmsreport/getSalaryTemplates";
const TEMPLATE_BY_ID_API = "/hrmsreport/getTemplateById";
const SALARY_REGISTER_API = "/hrmsreport/MonthlySalaryReportData";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type SelectOption = {
  value: string;
  label: string;
};

type RegisterRow = {
  id: number;
  empCode: string;
  employeeName: string;
  monthDays: number;
  presentDays: number;
  basic: number;
  hra: number;
  gross: number;
  netPayment: number;
  [key: string]: any;
};

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const getText = (...values: any[]): string => {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value);
    }
  }

  return "";
};

const getNumber = (...values: any[]): number => {
  for (const value of values) {
    if (
      value !== null &&
      value !== undefined &&
      value !== "" &&
      Number.isFinite(Number(value))
    ) {
      return Number(value);
    }
  }

  return 0;
};

const getResponseArray = (response: any): any[] => {
  if (Array.isArray(response)) return response;

  const possibleKeys = [
    "data",
    "Data",
    "result",
    "Result",
    "records",
    "Records",
    "rows",
    "Table",
    "recordset",
    "SalaryData",
    "salaryData",
  ];

  for (const key of possibleKeys) {
    if (Array.isArray(response?.[key])) {
      return response[key];
    }
  }

  return [];
};

const parseFields = (value: any): any[] => {
  if (Array.isArray(value)) return value;

  if (!value) return [];

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const getApiError = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.message ||
  "Unable to fetch salary register.";

const showSideAlert = (message: string, type: any = "info") => {
  Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true,
  }).fire({
    icon: type,
    title: message,
  });
};

// --------------------------------------------------
// EARNING AMOUNT HELPER
// --------------------------------------------------

const getEarningAmount = (earnings: any, keywords: string[]): number => {
  if (!earnings) return 0;

  if (Array.isArray(earnings)) {
    const item = earnings.find((entry: any) => {
      const name = getText(
        entry.Component_Name,
        entry.ComponentName,
        entry.Earning_Name,
        entry.EarningName,
        entry.Head_Name,
        entry.HeadName,
        entry.Name,
        entry.name,
        entry.Salary_Head,
        entry.SalaryHead,
        entry.Particulars,
      ).toLowerCase();

      return keywords.some((keyword) => name.includes(keyword));
    });

    return getNumber(
      item?.Amount,
      item?.amount,
      item?.Value,
      item?.value,
      item?.Salary,
      item?.salary,
      item?.Actual_Amount,
      item?.ActualAmount,
    );
  }

  if (typeof earnings === "object") {
    for (const key of Object.keys(earnings)) {
      if (keywords.some((keyword) => key.toLowerCase().includes(keyword))) {
        return getNumber(earnings[key]);
      }
    }
  }

  return 0;
};

// --------------------------------------------------
// MAP SALARY REGISTER ROW
// --------------------------------------------------

const mapRegisterRow = (
  item: any,
  index: number,
  selectedEmployee?: any,
): RegisterRow => {
  const earnings =
    item.earnings || item.Earnings || item.salary || item.Salary || [];

  const basic = getNumber(
    item.Basic,
    item.BASIC,
    item.Basic_Salary,
    item.BasicSalary,
    getEarningAmount(earnings, ["basic"]),
  );

  const hra = getNumber(
    item.HRA,
    item.Hra,
    item.HRA_Amount,
    item.HRAAmount,
    getEarningAmount(earnings, ["hra", "house rent"]),
  );

  const gross = getNumber(
    item["Gross Salary"],
    item.Gross,
    item["total Wages"],
    item["Total Wages"],
    item.Total_Wages,
    item.TotalWages,
    item.Gross_Salary,
    item.GrossSalary,
    item.gross_salary,
  );

  const netPayment = getNumber(
    item["NET PAYMENT"],
    item["Net Payment"],
    item["Net Salary"],
    item.Net_Salary,
    item.NetSalary,
    item.NetPay,
    item.Net_Pay,
    item.NetAmount,
    item.NetPaid,
    item.Net_Amount,
  );

  return {
    ...item,

    id: index,

    empCode: getText(
      item.EMPCODE,
      item["Employee Code"],
      item.Emp_Code,
      item.EmpCode,
      item.EmployeeCode,
      item.Employee_Code,
      selectedEmployee?.value,
    ),

    employeeName: getText(
      item.EMPFIRSTNAME,
      item["Employee Name"],
      item.Emp_Name,
      item.EmployeeName,
      item.EmpName,
      item.Name,
      item.Employee_Name,
      selectedEmployee?.label,
    ),

    monthDays: getNumber(
      item.Monthdays,
      item.Month_Days,
      item.MonthDays,
      item.Total_Days,
      item.TotalDays,
      item.Month_Days_Count,
    ),

    presentDays: getNumber(
      item["Present days"],
      item.Present_days,
      item.Present_Days,
      item.PresentDays,
      item["Days Paid"],
      item.Days_Paid,
      item.DaysPaid,
    ),

    basic,
    hra,
    gross,
    netPayment,
  };
};

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

export default function MonthlySalaryRegisterViewPage() {
  const user = useCurrentUser();

  // --------------------------------------------------
  // STATES
  // --------------------------------------------------

  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([]);
  const [employee, setEmployee] = useState("");

  const [templates, setTemplates] = useState<any[]>([]);
  const [template, setTemplate] = useState("");

  const currentDate = useMemo(() => new Date(), []);

  const [year, setYear] = useState(String(currentDate.getFullYear()));

  const [month, setMonth] = useState(String(currentDate.getMonth() + 1));

  const [rows, setRows] = useState<RegisterRow[]>([]);
  const [reportHeaders, setReportHeaders] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [search, setSearch] = useState("");
  const [showColumnFilters, setShowColumnFilters] = useState(false);

  const [filters, setFilters] = useState<Record<string, string>>({});

  // --------------------------------------------------
  // OPTIONS
  // --------------------------------------------------

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();

    return Array.from({ length: 10 }, (_, index) => {
      const value = String(currentYear - 5 + index);

      return {
        value,
        label: value,
      };
    });
  }, []);

  const monthOptions: SelectOption[] = useMemo(
    () => [
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
    ],
    [],
  );

  const templateOptions: SelectOption[] = useMemo(
    () =>
      templates.map((item) => ({
        value: String(item.id),
        label: item.template_name,
      })),
    [templates],
  );

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
  // FETCH EMPLOYEES
  // --------------------------------------------------

  const fetchEmployees = useCallback(async () => {
    if (!user?.Comp_Code) return;

    setEmployeeLoading(true);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${EMPLOYEE_API}`,
        {},
        {
          headers: apiHeaders,
        },
      );

      const responseData = response.data;

      if (responseData?.Status === false || responseData?.status === false) {
        throw new Error(
          responseData?.message ||
            responseData?.Message ||
            "Unable to load employees.",
        );
      }

      const result = getResponseArray(responseData);

      const options = result
        .map((item: any) => {
          const value = getText(
            item.EMPCODE,
            item.EmpCode,
            item.Emp_Code,
            item.EmployeeCode,
            item.Employee_Code,
            item.value,
          );

          const name = getText(
            item.Emp_Name,
            item.EmployeeName,
            item.EmpName,
            item.Name,
            item.Employee_Name,
            item.label,
          );

          if (!value) return null;

          return {
            value,
            label: `${value} · ${name || value}`,
          };
        })
        .filter(Boolean) as SelectOption[];

      setEmployeeOptions(options);

      setEmployee((previous) => {
        if (previous && options.some((item) => item.value === previous)) {
          return previous;
        }

        return options[0]?.value || "";
      });
    } catch (error: any) {
      console.error("Employee List Error:", error);

      setEmployeeOptions([]);

      Swal.fire({
        icon: "error",
        title: "Employee loading failed",
        text: getApiError(error),
      });
    } finally {
      setEmployeeLoading(false);
    }
  }, [user?.Comp_Code, apiHeaders]);

  useEffect(() => {
    if (user?.Comp_Code) {
      fetchEmployees();
    }
  }, [fetchEmployees, user?.Comp_Code]);

  // --------------------------------------------------
  // FETCH SAVED TEMPLATES
  // --------------------------------------------------

  const fetchTemplates = useCallback(async () => {
    if (!user?.Comp_Code || !user?.name) return;

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}${TEMPLATE_API}`,
        {
          params: {
            user_code: user.name,
          },
          headers: {
            compcode: user.Comp_Code,
          },
        },
      );

      const result = getResponseArray(response.data);

      setTemplates(result);

      setTemplate((previous) => {
        if (
          previous &&
          result.some((item: any) => String(item.id) === previous)
        ) {
          return previous;
        }

        return result.length ? String(result[0].id) : "";
      });
    } catch (error) {
      console.error("Template Fetch Error:", error);

      setTemplates([]);
      setTemplate("");

      showSideAlert("Unable to load saved templates", "error");
    }
  }, [user?.Comp_Code, user?.name]);

  useEffect(() => {
    if (user?.Comp_Code && user?.name) {
      fetchTemplates();
    }
  }, [fetchTemplates, user?.Comp_Code, user?.name]);

  // --------------------------------------------------
  // FETCH SALARY REGISTER
  // --------------------------------------------------

  const fetchRegister = useCallback(async () => {
    if (!user?.Comp_Code) {
      Swal.fire({
        icon: "warning",
        title: "Company information missing",
        text: "Please login again.",
      });
      return;
    }

    if (!template) {
      Swal.fire({
        icon: "warning",
        title: "Select template",
        text: "Please select a saved salary template.",
      });
      return;
    }

    if (!month || !year) {
      Swal.fire({
        icon: "warning",
        title: "Select salary period",
        text: "Please select month and year.",
      });
      return;
    }

    const selectedEmployee = employeeOptions.find(
      (item) => item.value === employee,
    );

    setLoading(true);
    setRows([]);
    setReportHeaders([]);
    setHasSearched(false);

    try {
      // STEP 1: FETCH SELECTED TEMPLATE

      const templateRes = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}${TEMPLATE_BY_ID_API}`,
        {
          params: {
            id: template,
          },
          headers: {
            compcode: user.Comp_Code,
          },
        },
      );

      const templateData = templateRes.data?.data || templateRes.data;

      // STEP 2: PARSE TEMPLATE FIELDS

      const rawFields = parseFields(templateData?.selected_fields);

      const locationFields = parseFields(templateData?.location_fields);

      const selectFields = rawFields
        .map((item: any) => ({
          field_key: item.field_key || item.field,

          alias: item.alias || item.field_key || item.field,

          block_id: item.block_id ?? null,
        }))
        .filter((item: any) => Boolean(item.field_key));

      if (!selectFields.length) {
        Swal.fire({
          icon: "warning",
          title: "Invalid template",
          text: "This template has no valid fields saved.",
        });

        return;
      }

      // STEP 3: FETCH MONTHLY SALARY REGISTER

      const dataRes = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${SALARY_REGISTER_API}`,
        {
          salyear: Number(year),
          SalMnth: Number(month),

          selectFields,

          location: locationFields.length ? locationFields : null,

          empType: "both",

          empCode: employee || null,
        },
        {
          headers: {
            compcode: user.Comp_Code,
            name: user.name,
          },
        },
      );

      const responseData = dataRes.data;

      console.log("Monthly Salary Register Response:", responseData);

      if (
        responseData?.success === false ||
        responseData?.Status === false ||
        responseData?.status === false
      ) {
        throw new Error(
          responseData?.message ||
            responseData?.Message ||
            "Unable to fetch salary register.",
        );
      }

      // STEP 4: SAVE API HEADERS

      const apiHeadersList: string[] = Array.isArray(responseData?.headers)
        ? responseData.headers
        : [];

      // Preserve the API header names and their order.
      const uniqueHeaders = Array.from(
        new Set(apiHeadersList.filter((header: any) => String(header).trim())),
      );

      setReportHeaders(uniqueHeaders);

      // STEP 5: MAP RESPONSE ROWS

      const result = getResponseArray(responseData);

      const mappedRows = result.map((item: any, index: number) =>
        mapRegisterRow(item, index, selectedEmployee),
      );

      setRows(mappedRows);
      setHasSearched(true);
      setSearch("");

      setFilters(
        Object.fromEntries(uniqueHeaders.map((header) => [header, ""])),
      );

      if (!mappedRows.length) {
        Swal.fire({
          icon: "info",
          title: "No records found",
          text: "No salary register records are available for the selected filters.",
        });
      }
    } catch (error: any) {
      console.error("Monthly Salary Register Error:", error);

      setRows([]);
      setReportHeaders([]);
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
    user?.name,
    employee,
    employeeOptions,
    month,
    year,
    template,
  ]);

  // --------------------------------------------------
  // FILTER HANDLING
  // --------------------------------------------------

  const handleFilterChange = (name: string, value: string) => {
    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetFilters = () => {
    setSearch("");

    setFilters(Object.fromEntries(reportHeaders.map((header) => [header, ""])));
  };

  // --------------------------------------------------
  // FILTERED DATA
  // --------------------------------------------------

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        reportHeaders.some((header) =>
          String(row[header] ?? "")
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
  }, [rows, search, filters, reportHeaders]);

  // --------------------------------------------------
  // TABLE COLUMNS - DYNAMIC API HEADERS
  // --------------------------------------------------

  const columns = useMemo(() => {
    const currencyFields = [
      "Basic",
      "HRA",
      "Gross",
      "Gross Salary",
      "NET PAYMENT",
      "Washing",
      "DD CLUB",
      "Uniform",
      "Medical",
      "Other",
      "CONVEN",
      "Bonus",
      "BONUS AMOUNT",
      "ANNUAL CTC",
      "Earn Basic",
      "Earn HRA",
      "Other Earn",
      "EARN GROSS SALARY",
      "EARN BONUS",
      "INCENTIVE AMOUNT",
      "Total Earn",
    ];

    const numberFields = [
      "Monthdays",
      "Present days",
      "LEAVEVALUE",
      "PD",
      "UNIFORM QTY",
    ];

    return reportHeaders.map((header) => ({
      Header: header,
      accessor: header,
      minWidth: 140,
      width:
        header === "EMPFIRSTNAME" ||
        header === "PERMANENTADDRESS1" ||
        header === "PERMANENTADDRESS2"
          ? 220
          : 150,

      Cell: ({ value }: any) => {
        if (value === null || value === undefined || value === "") {
          return <span className="text-slate-400">—</span>;
        }

        if (currencyFields.includes(header)) {
          return (
            <span className="font-medium tabular-nums text-[#152b4b] dark:text-slate-200">
              {formatCurrency(Number(value))}
            </span>
          );
        }

        if (numberFields.includes(header)) {
          return (
            <span className="tabular-nums text-[#152b4b] dark:text-slate-200">
              {value}
            </span>
          );
        }

        if (header === "EMPCODE" || header === "SRNO") {
          return (
            <span className="font-mono text-[12px] font-bold text-[#152b4b] dark:text-slate-200">
              {value}
            </span>
          );
        }

        if (header === "EMPFIRSTNAME") {
          return (
            <span className="font-medium text-[#152b4b] dark:text-slate-100">
              {value}
            </span>
          );
        }

        return (
          <span className="text-[12px] text-[#334155] dark:text-slate-300">
            {String(value)}
          </span>
        );
      },
    }));
  }, [reportHeaders]);

  // --------------------------------------------------
  // EXCEL EXPORT
  // --------------------------------------------------

  const exportToExcel = () => {
    if (!filteredRows.length) {
      Swal.fire({
        icon: "info",
        title: "No records",
        text: "There are no records available to export.",
      });
      return;
    }

    const headers = reportHeaders;

    const escapeCSV = (value: any) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...filteredRows.map((row) =>
        headers.map((header) => escapeCSV(row[header])).join(","),
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `Monthly_Salary_Register_${month}_${year}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  };

  // --------------------------------------------------
  // COLUMN FILTER DEFINITIONS
  // --------------------------------------------------

  const columnFilters = reportHeaders.map((header) => [header, header]);

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="min-h-screen min-w-0 bg-[#f5f8fc] p-3 transition-colors dark:bg-[#0b1220] sm:p-4 lg:p-5">
      <HashloaderComponent isLoading={loading || employeeLoading} />

      <div className="mx-auto max-w-[1800px] space-y-4">
        {/* PAGE HEADER */}

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-[12px] text-[#64748b] dark:text-slate-400"></div>

            <h1 className="text-[20px] font-bold leading-tight text-[#152b4b] dark:text-slate-100 sm:text-[23px]">
              Monthly Salary Register View
            </h1>
          </div>
        </div>

        {/* FILTER CARD */}

        <div className="rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1.1fr_1fr_1fr_1.1fr_auto]">
            {/* EMPLOYEE */}

            <div className="min-w-0">
              <Eselect
                title="Employee"
                name="employee"
                option={employeeOptions}
                initialValue={employee}
                handleInputChange={(name: string, value: any) =>
                  setEmployee(String(value || ""))
                }
                className="w-full h-[40px] "
              />
            </div>

            {/* YEAR */}

            <div className="min-w-0">
              <Eselect
                title="Year"
                name="year"
                option={yearOptions}
                initialValue={year}
                handleInputChange={(name: string, value: any) =>
                  setYear(String(value || ""))
                }
                className="w-full h-[40px] "
              />
            </div>

            {/* MONTH */}

            <div className="min-w-0">
              <Eselect
                title="Month"
                name="month"
                option={monthOptions}
                initialValue={month}
                handleInputChange={(name: string, value: any) =>
                  setMonth(String(value || ""))
                }
                className="w-full h-[40px] "
              />
            </div>

            {/* SAVED TEMPLATE */}

            <div className="min-w-0">
              <Eselect
                title="Saved template"
                name="template"
                option={templateOptions}
                initialValue={template}
                handleInputChange={(name: string, value: any) =>
                  setTemplate(String(value || ""))
                }
                className="w-full h-[40px] "
              />
            </div>

            {/* SHOW */}

            <div className="flex items-end">
              <AButton
                type="button"
                onClick={fetchRegister}
                disabled={loading || employeeLoading || !template}
                className="inline-flex h-[40px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 text-[13px] font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
              >
                <Search size={15} />
                Show
              </AButton>
            </div>
          </div>
        </div>

        {/* REGISTER TABLE CARD */}

        <div className="min-w-0 overflow-hidden rounded-xl border border-[#dce5f1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900">
          {/* TOOLBAR */}

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

            {/* ACTIONS */}

            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              {/* SEARCH */}

              <div className="relative min-w-0 flex-1 sm:w-[280px] sm:flex-none">
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

              {/* COLUMN FILTERS */}

              <AButton
                type="button"
                onClick={() => setShowColumnFilters((previous) => !previous)}
                className={`inline-flex h-[41px] items-center justify-center gap-2 rounded-lg border px-3.5 text-[12px] font-semibold transition ${
                  showColumnFilters
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300"
                    : "border-[#dce5f1] bg-white text-[#152b4b] hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                <SlidersHorizontal size={15} />
                Column filters
                <ChevronDown
                  size={14}
                  className={`transition-transform ${
                    showColumnFilters ? "rotate-180" : ""
                  }`}
                />
              </AButton>

              {/* RESET */}

              <AButton
                type="button"
                onClick={resetFilters}
                className="inline-flex h-[41px] items-center justify-center gap-2 rounded-lg border border-[#dce5f1] bg-white px-3.5 text-[12px] font-semibold text-[#152b4b] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <RotateCcw size={14} />
                Reset
              </AButton>

              {/* EXPORT */}

              <AButton
                type="button"
                onClick={exportToExcel}
                disabled={!filteredRows.length}
                className="inline-flex h-[41px] items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#dce5f1] bg-white px-3.5 text-[12px] font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
              >
                <FileSpreadsheet size={15} />
                Export to Excel
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
                {columnFilters.map(([key, label]) => (
                  <div key={key} className="min-w-0">
                    <label className="mb-1 block text-[11px] font-medium text-[#64748b] dark:text-slate-400">
                      {label}
                    </label>

                    <input
                      type="text"
                      value={filters[key] || ""}
                      onChange={(event) =>
                        handleFilterChange(key, event.target.value)
                      }
                      placeholder={`Search ${label.toLowerCase()}`}
                      className="h-[37px] w-full rounded-lg border border-[#dce5f1] bg-white px-2.5 text-[11px] text-[#152b4b] outline-none placeholder:text-slate-400 focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
                    showExcelExport={false}
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
                      Try changing the employee, month or year, or clear your
                      filters.
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
                Monthly Salary Register
              </h3>

              <p className="mt-1 max-w-[400px] text-[12px] leading-5 text-[#64748b] dark:text-slate-400">
                Select an employee, year, month and saved template, then click
                Show to view the monthly salary register.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
