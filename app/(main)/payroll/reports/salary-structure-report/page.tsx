"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Search,
  SlidersHorizontal,
  RotateCcw,
  FileSpreadsheet,
  X,
  ChevronDown,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useDateRange } from "@/app/hooks/use-date-range";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

// --------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------

const REPORT_API = "/employee/SalaryStructerReport";

type ReportRow = {
  id: number;
  empCode: string;
  employeeName: string;
  gender: string;
  employeeType: string;
  department: string;
  section: string;
  designation: string;
  location: string;
  grossSalary: number;
  basic: number;
  hra: number;
  conveyance: number;
  medical: number;
  other: number;
  salaryDifference: number;
  locationCode: string;
  serverId: string;
  recDate: string;
  effectiveDate: string;
  uniform: number;
  washing: number;
  exportType: string;
  entrUser: string;
  entrDate: string;
  entrTime: string;
  entrPc: string;
  modifiedUser: string;
  modifiedDate: string;
  modifiedTime: string;
  modifiedPc: string;
  [key: string]: any;
};

// --------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------

const getCurrentDate = (monthsBack = 0) => {
  const today = new Date();
  today.setMonth(today.getMonth() - monthsBack);

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getText = (...values: any[]): string => {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
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

const getApiError = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.response?.data?.error ||
  error?.message ||
  "Unable to fetch report data.";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);

// --------------------------------------------------
// API RESPONSE MAPPING
// --------------------------------------------------

const mapReportRow = (item: any, index: number): ReportRow => ({
  ...item,

  id: index,

  // Employee details
  empCode: getText(
    item?.Emp_Code,
    item?.EmpCode,
    item?.EMPCODE,
    item?.EmployeeCode,
    item?.Employee_Code,
  ),

  employeeName: getText(
    item?.EMPLOYEENAME,
    item?.Emp_Name,
    item?.EmployeeName,
    item?.EmpName,
    item?.Name,
    item?.Employee_Name,
  ),

  gender: getText(item?.GENDER, item?.Gender, item?.gender, item?.Sex),

  employeeType: getText(
    item?.EmployeeType,
    item?.Employee_Type,
    item?.Emp_Type,
    item?.EmpType,
    item?.Type,
  ),

  department: getText(
    item?.Department,
    item?.DepartmentName,
    item?.Dept_Name,
    item?.DeptName,
  ),

  section: getText(
    item?.SECTION,
    item?.Section,
    item?.SectionName,
    item?.Sect_Name,
    item?.SectName,
  ),

  designation: getText(
    item?.EMPLOYEEDESIGNATION,
    item?.Designation,
    item?.DesignationName,
    item?.Desig_Name,
    item?.DesigName,
  ),

  location: getText(
    item?.Location,
    item?.loc_name,
    item?.LocationName,
    item?.BranchName,
    item?.Loc_Name,
  ),

  // Salary details
  grossSalary: getNumber(
    item?.Gross_Salary,
    item?.GrossSalary,
    item?.Gross,
    item?.gross_salary,
    item?.Gross_Amount,
  ),

  basic: getNumber(
    item?.Basic,
    item?.BASIC,
    item?.Basic_Salary,
    item?.BasicSalary,
  ),

  hra: getNumber(item?.HRA, item?.Hra, item?.HRA_Amount, item?.HRAAmount),

  conveyance: getNumber(
    item?.Conveyance,
    item?.CONVEYANCE,
    item?.Conven,
    item?.CONVEN,
  ),

  medical: getNumber(item?.Medical, item?.MEDICAL),

  other: getNumber(item?.Other, item?.OTHER),

  salaryDifference: getNumber(
    item?.Salary_Difference,
    item?.SalaryDifference,
    item?.Salary_Diff,
    item?.SalaryDiff,
  ),

  // Location and server details
  locationCode: getText(item?.Loc_Code, item?.Loc_code, item?.Location_Code),

  serverId: getText(item?.ServerId, item?.Server_ID, item?.serverId),

  // Dates
  recDate: getText(item?.Rec_date, item?.Rec_Date, item?.REC_DATE),

  effectiveDate: getText(
    item?.Effective_date,
    item?.Effective_Date,
    item?.EFFECTIVE_DATE,
  ),

  // Other salary components
  uniform: getNumber(item?.Uniform, item?.UNIFORM),

  washing: getNumber(item?.Washing, item?.WASHING),

  exportType: getText(item?.Export_Type, item?.ExportType, item?.EXPORT_TYPE),

  // Entry information
  entrUser: getText(item?.ENTR_USER_label, item?.ENTR_USER, item?.Entr_User),

  entrDate: getText(item?.ENTR_DATE, item?.Entr_Date),

  entrTime: getText(item?.ENTR_TIME, item?.Entr_Time),

  entrPc: getText(item?.ENTR_PC, item?.Entr_PC),

  // Modification information
  modifiedUser: getText(
    item?.Mod_User_label,
    item?.Mod_User,
    item?.MOD_USER,
    item?.Mod_User_Code,
  ),

  modifiedDate: getText(item?.MOD_DATE, item?.Mod_Date),

  modifiedTime: getText(item?.MOD_TIME, item?.Mod_Time),

  modifiedPc: getText(item?.MOD_PC, item?.Mod_PC),
});

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

export default function SalaryStructureReportPage() {
  const user = useCurrentUser();
  const globalDateRange = useDateRange();

  // --------------------------------------------------
  // DATE STATES
  // --------------------------------------------------

  const [dateFrom, setDateFrom] = useState(
    globalDateRange?.from || getCurrentDate(1),
  );

  const [dateTo, setDateTo] = useState(
    globalDateRange?.to || getCurrentDate(0),
  );

  // --------------------------------------------------
  // REPORT STATES
  // --------------------------------------------------

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [search, setSearch] = useState("");
  const [showColumnFilters, setShowColumnFilters] = useState(false);

  const [filters, setFilters] = useState({
    empCode: "",
    employeeName: "",
    gender: "",
    employeeType: "",
    department: "",
    section: "",
    designation: "",
    location: "",
  });

  const apiHeaders = useMemo(
    () => ({
      compcode: user?.Comp_Code,
      name: user?.name,
    }),
    [user?.Comp_Code, user?.name],
  );

  // --------------------------------------------------
  // FETCH REPORT API
  // --------------------------------------------------

  const fetchReport = useCallback(async () => {
    if (!dateFrom || !dateTo) {
      Swal.fire({
        icon: "warning",
        title: "Select date range",
        text: "Please select both dates.",
      });
      return;
    }

    if (new Date(dateFrom) > new Date(dateTo)) {
      Swal.fire({
        icon: "warning",
        title: "Invalid date range",
        text: "Date from cannot be greater than date to.",
      });
      return;
    }

    if (!user?.Comp_Code || !user?.branch) {
      Swal.fire({
        icon: "warning",
        title: "Company information missing",
        text: "Please login again.",
      });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        Loc_code: user?.branch,
        DateFrom: dateFrom,
        DateTo: dateTo,
      };

      console.log("Salary Structure Report Payload:", payload);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${REPORT_API}`,
        payload,
        {
          headers: apiHeaders,
        },
      );

      console.log("Salary Structure Report Response:", response.data);

      const result = response?.data?.result;

      if (
        response?.data?.Status === false ||
        response?.data?.status === false ||
        response?.data?.success === false
      ) {
        throw new Error(
          response?.data?.message ||
            response?.data?.Message ||
            "Unable to fetch salary structure.",
        );
      }

      if (!Array.isArray(result)) {
        console.error("Unexpected API response structure:", response.data);
        throw new Error("Invalid report data received from server.");
      }

      const mappedRows = result.map((item: any, index: number) =>
        mapReportRow(item, index),
      );

      setRows(mappedRows);
      setHasSearched(true);
      setSearch("");

      setFilters({
        empCode: "",
        employeeName: "",
        gender: "",
        employeeType: "",
        department: "",
        section: "",
        designation: "",
        location: "",
      });

      if (mappedRows.length === 0) {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "info",
          title: "No records found",
          showConfirmButton: false,
          timer: 2000,
        });
      }
    } catch (error: any) {
      console.error("Salary Structure Report Error:", error);

      setRows([]);
      setHasSearched(true);

      Swal.fire({
        icon: "error",
        title: "Report failed",
        text: getApiError(error),
        confirmButtonColor: "#4f46e5",
      });
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, user?.Comp_Code, user?.branch, apiHeaders]);

  // --------------------------------------------------
  // INITIAL API CALL
  // --------------------------------------------------

  useEffect(() => {
    if (user?.branch && user?.Comp_Code) {
      fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.branch, user?.Comp_Code]);

  // --------------------------------------------------
  // FILTER HANDLING
  // --------------------------------------------------

  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetFilters = () => {
    setSearch("");

    setFilters({
      empCode: "",
      employeeName: "",
      gender: "",
      employeeType: "",
      department: "",
      section: "",
      designation: "",
      location: "",
    });
  };

  // --------------------------------------------------
  // FILTERED ROWS
  // --------------------------------------------------

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        [
          row.empCode,
          row.employeeName,
          row.gender,
          row.employeeType,
          row.department,
          row.section,
          row.designation,
          row.location,
          row.grossSalary,
          row.basic,
          row.hra,
          row.conveyance,
          row.medical,
          row.other,
          row.salaryDifference,
          row.locationCode,
          row.serverId,
          row.recDate,
          row.effectiveDate,
          row.uniform,
          row.washing,
          row.exportType,
          row.entrUser,
          row.entrDate,
          row.entrTime,
          row.entrPc,
          row.modifiedUser,
          row.modifiedDate,
          row.modifiedTime,
          row.modifiedPc,
        ].some((value) =>
          String(value ?? "")
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
  }, [rows, search, filters]);

  // --------------------------------------------------
  // UNIQUE FILTER OPTIONS
  // --------------------------------------------------

  const uniqueOptions = useMemo(() => {
    const keys = [
      "gender",
      "employeeType",
      "department",
      "section",
      "designation",
      "location",
    ];

    const result: Record<string, string[]> = {};

    keys.forEach((key) => {
      result[key] = Array.from(
        new Set(
          rows.map((row) => String(row[key] ?? "").trim()).filter(Boolean),
        ),
      ).sort();
    });

    return result;
  }, [rows]);

  // --------------------------------------------------
  // TABLE COLUMNS
  // --------------------------------------------------

  const columns = useMemo(
    () => [
      {
        Header: "EMPLOYEE CODE",
        accessor: "empCode",
        width: 135,
        Cell: ({ value }: any) => (
          <span className="font-mono text-[12px] font-semibold text-[#152b4b] dark:text-slate-200">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: "employeeName",
        width: 230,
        Cell: ({ value }: any) => (
          <span className="font-medium text-[#152b4b] dark:text-slate-100">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "GENDER",
        accessor: "gender",
        width: 100,
      },
      {
        Header: "EMPLOYEE TYPE",
        accessor: "employeeType",
        width: 140,
        Cell: ({ value }: any) => (
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
              String(value).toLowerCase() === "regular"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                : "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400"
            }`}
          >
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "DEPARTMENT",
        accessor: "department",
        width: 140,
      },
      {
        Header: "SECTION",
        accessor: "section",
        width: 120,
      },
      {
        Header: "EMPLOYEE DESIGNATION",
        accessor: "designation",
        width: 180,
      },
      {
        Header: "LOCATION",
        accessor: "location",
        width: 140,
      },
      {
        Header: "GROSS SALARY",
        accessor: "grossSalary",
        width: 145,
        Cell: ({ value }: any) => (
          <span className="font-semibold tabular-nums text-[#152b4b] dark:text-slate-100">
            {formatCurrency(Number(value))}
          </span>
        ),
      },
      {
        Header: "BASIC",
        accessor: "basic",
        width: 120,
        Cell: ({ value }: any) => formatCurrency(Number(value)),
      },
      {
        Header: "HRA",
        accessor: "hra",
        width: 110,
        Cell: ({ value }: any) => formatCurrency(Number(value)),
      },
      {
        Header: "CONVEYANCE",
        accessor: "conveyance",
        width: 130,
        Cell: ({ value }: any) => formatCurrency(Number(value)),
      },
      {
        Header: "MEDICAL",
        accessor: "medical",
        width: 120,
        Cell: ({ value }: any) => formatCurrency(Number(value)),
      },
      {
        Header: "OTHER",
        accessor: "other",
        width: 110,
        Cell: ({ value }: any) => formatCurrency(Number(value)),
      },
      {
        Header: "SALARY DIFF",
        accessor: "salaryDifference",
        width: 130,
        Cell: ({ value }: any) => (
          <span className="font-semibold tabular-nums text-[#152b4b] dark:text-slate-100">
            {formatCurrency(Number(value))}
          </span>
        ),
      },
      {
        Header: "LOCATION CODE",
        accessor: "locationCode",
        width: 120,
      },
      {
        Header: "SERVER ID",
        accessor: "serverId",
        width: 100,
      },
      {
        Header: "REC DATE",
        accessor: "recDate",
        width: 130,
      },
      {
        Header: "EFFECTIVE DATE",
        accessor: "effectiveDate",
        width: 140,
      },
      {
        Header: "UNIFORM",
        accessor: "uniform",
        width: 110,
        Cell: ({ value }: any) => formatCurrency(Number(value)),
      },
      {
        Header: "WASHING",
        accessor: "washing",
        width: 110,
        Cell: ({ value }: any) => formatCurrency(Number(value)),
      },
      {
        Header: "EXPORT TYPE",
        accessor: "exportType",
        width: 110,
      },
      {
        Header: "ENTR USER",
        accessor: "entrUser",
        width: 130,
      },
      {
        Header: "ENTR DATE",
        accessor: "entrDate",
        width: 130,
      },
      {
        Header: "ENTR TIME",
        accessor: "entrTime",
        width: 110,
      },
      {
        Header: "ENTR PC",
        accessor: "entrPc",
        width: 130,
      },
      {
        Header: "MODIFIED USER",
        accessor: "modifiedUser",
        width: 140,
      },
      {
        Header: "MODIFIED DATE",
        accessor: "modifiedDate",
        width: 140,
      },
      {
        Header: "MODIFIED TIME",
        accessor: "modifiedTime",
        width: 130,
      },
      {
        Header: "MODIFIED PC",
        accessor: "modifiedPc",
        width: 130,
      },
    ],
    [],
  );

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

    const exportColumns = [
      { header: "Employee Code", key: "empCode" },
      { header: "Employee Name", key: "employeeName" },
      { header: "Gender", key: "gender" },
      { header: "Employee Type", key: "employeeType" },
      { header: "Department", key: "department" },
      { header: "Section", key: "section" },
      { header: "Employee Designation", key: "designation" },
      { header: "Location", key: "location" },
      { header: "Gross Salary", key: "grossSalary" },
      { header: "Basic", key: "basic" },
      { header: "HRA", key: "hra" },
      { header: "Conveyance", key: "conveyance" },
      { header: "Medical", key: "medical" },
      { header: "Other", key: "other" },
      { header: "Salary Diff", key: "salaryDifference" },
      { header: "Location Code", key: "locationCode" },
      { header: "Server Id", key: "serverId" },
      { header: "Rec Date", key: "recDate" },
      { header: "Effective Date", key: "effectiveDate" },
      { header: "Uniform", key: "uniform" },
      { header: "Washing", key: "washing" },
      { header: "Export Type", key: "exportType" },
      { header: "Entr User", key: "entrUser" },
      { header: "Entr Date", key: "entrDate" },
      { header: "Entr Time", key: "entrTime" },
      { header: "Entr PC", key: "entrPc" },
      { header: "Modified User", key: "modifiedUser" },
      { header: "Modified Date", key: "modifiedDate" },
      { header: "Modified Time", key: "modifiedTime" },
      { header: "Modified PC", key: "modifiedPc" },
    ];

    const escapeCSV = (value: any) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csvContent = [
      exportColumns.map((column) => escapeCSV(column.header)).join(","),

      ...filteredRows.map((row) =>
        exportColumns.map((column) => escapeCSV(row[column.key])).join(","),
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `Salary_Structure_Report_${dateFrom}_to_${dateTo}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
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
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-[12px] text-[#64748b] dark:text-slate-400"></div>

            <h1 className="text-[20px] font-bold leading-tight text-[#152b4b] dark:text-slate-100 sm:text-[23px]">
              Salary Structure Report
            </h1>
          </div>
        </div>

        {/* DATE FILTER CARD */}

        <div className="rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(200px,350px)_minmax(200px,350px)_auto]">
            {/* DATE FROM */}

            <div className="min-w-0">
              <Einput
                title="Date from"
                name="dateFrom"
                type="date"
                value={dateFrom}
                handleInputChange={(name, value) => setDateFrom(value)}
                className="h-[40px] w-full"
              />
            </div>

            {/* DATE TO */}

            <div className="min-w-0">
              <Einput
                title="Date to"
                name="dateTo"
                type="date"
                value={dateTo}
                handleInputChange={(name, value) => setDateTo(value)}
                className="h-[40px] w-full"
              />
            </div>

            {/* SHOW BUTTON */}

            <div className="flex items-end">
              <AButton
                type="button"
                onClick={fetchReport}
                disabled={loading}
                className="inline-flex h-[40px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 text-[13px] font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
              >
                <Search size={15} />
                Show
              </AButton>
            </div>
          </div>
        </div>

        {/* REPORT TABLE CARD */}

        <div className="min-w-0 overflow-hidden rounded-xl border border-[#dce5f1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900">
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

            {/* ACTIONS */}

            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              {/* SEARCH */}

              <div className="relative min-w-0 flex-1 sm:w-[280px] sm:flex-none">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search in results..."
                  className="h-[41px] w-full rounded-lg border border-[#dce5f1] bg-white pl-9 pr-3 text-[12px] text-[#152b4b] outline-none placeholder:text-slate-400 focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* COLUMN FILTERS */}

              {/* <AButton
                type="button"
                onClick={() => setShowColumnFilters((prev) => !prev)}
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
              </AButton> */}

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

              {/* <AButton
                type="button"
                onClick={exportToExcel}
                disabled={!filteredRows.length}
                className="inline-flex h-[41px] items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#dce5f1] bg-white px-3.5 text-[12px] font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
              >
                <FileSpreadsheet size={15} />
                Export to Excel
              </AButton> */}
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
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["empCode", "Employee Code"],
                  ["employeeName", "Employee Name"],
                  ["gender", "Gender"],
                  ["employeeType", "Employee Type"],
                  ["department", "Department"],
                  ["section", "Section"],
                  ["designation", "Designation"],
                  ["location", "Location"],
                ].map(([key, label]) => {
                  const isSelect = [
                    "gender",
                    "employeeType",
                    "department",
                    "section",
                    "designation",
                    "location",
                  ].includes(key);

                  return (
                    <div key={key} className="min-w-0">
                      <label className="mb-1 block text-[11px] font-medium text-[#64748b] dark:text-slate-400">
                        {label}
                      </label>

                      {isSelect ? (
                        <select
                          value={filters[key as keyof typeof filters]}
                          onChange={(e) =>
                            handleFilterChange(key, e.target.value)
                          }
                          className="h-[37px] w-full rounded-lg border border-[#dce5f1] bg-white px-2.5 text-[11px] text-[#152b4b] outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                          <option value="">All</option>

                          {(uniqueOptions[key] || []).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={filters[key as keyof typeof filters]}
                          onChange={(e) =>
                            handleFilterChange(key, e.target.value)
                          }
                          placeholder={`Search ${label.toLowerCase()}`}
                          className="h-[37px] w-full rounded-lg border border-[#dce5f1] bg-white px-2.5 text-[11px] text-[#152b4b] outline-none placeholder:text-slate-400 focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TABLE */}

          {hasSearched ? (
            <div className="w-full min-w-0 overflow-x-auto">
              <div className="min-w-[1200px]">
                {filteredRows.length > 0 ? (
                  <DataTable
                    columns={columns}
                    data={filteredRows}
                    showTopSearch={false}
                    showExcelExport={true}
                    showColumnFilters={true}
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
                      Try changing the date range or clearing your filters.
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
                Salary Structure Report
              </h3>

              <p className="mt-1 max-w-[400px] text-[12px] leading-5 text-[#64748b] dark:text-slate-400">
                Select the date range above and click Show to view employee-wise
                salary structure details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
