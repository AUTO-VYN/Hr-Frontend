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
const MASTER_API = "/employee/masters";
const LEAVE_REPORT_API = "/employee/LeaveBalanceReport";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type SelectOption = {
  value: string;
  label: string;
};

type LeaveReportRow = {
  id: number;
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

const getResponseArray = (response: any): any[] => {
  if (Array.isArray(response)) return response;

  const possibleKeys = [
    "result",
    "data",
    "Data",
    "Result",
    "records",
    "Records",
    "rows",
    "Table",
    "recordset",
  ];

  for (const key of possibleKeys) {
    if (Array.isArray(response?.[key])) {
      return response[key];
    }
  }

  return [];
};

const getApiError = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.message ||
  "Unable to fetch leave report.";

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
// MAP REPORT ROW
// --------------------------------------------------

const mapReportRow = (item: any, index: number): LeaveReportRow => ({
  ...item,
  id: index,

  Emp_Code: getText(
    item.Emp_Code,
    item.EMPCODE,
    item["Employee Code"],
    item.EmployeeCode,
  ),

  EMPLOYEENAME: getText(
    item.EMPLOYEENAME,
    item.EMPFIRSTNAME,
    item["Employee Name"],
    item.Emp_Name,
    item.EmployeeName,
  ),

  GENDER: getText(item.GENDER, item.Gender),
  EmployeeType: getText(item.EmployeeType, item["Employee Type"]),
  Department: getText(item.Department, item.DEPARTMENT),
  SECTION: getText(item.SECTION, item.Section),
  EMPLOYEEDESIGNATION: getText(
    item.EMPLOYEEDESIGNATION,
    item["Employee Designation"],
    item.Designation,
  ),
  Location: getText(item.Location, item.LOCATION, item.LocationName),
  Leave_Lable: getText(item.Leave_Lable, item["Leave Type"]),
  Leave_Mnth: getText(item.Leave_Mnth, item["Leave Month"]),
  Op_Bal: item.Op_Bal ?? item["Opening Balance"] ?? "",
  Gen_Lev: item.Gen_Lev ?? item["Gen Leave"] ?? "",
  Avail_Lev: item.Avail_Lev ?? item["Avail Leave"] ?? "",
  Cl_Bal: item.Cl_Bal ?? item["CL Balance"] ?? "",
  Leave_Yr: item.Leave_Yr ?? item["Leave Year"] ?? "",
});

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

export default function LeaveBalanceReportViewPage() {
  const user = useCurrentUser();

  // --------------------------------------------------
  // STATES
  // --------------------------------------------------

  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([]);
  const [employee, setEmployee] = useState("");

  const [leaveTypeOptions, setLeaveTypeOptions] = useState<SelectOption[]>([]);
  const [leaveType, setLeaveType] = useState("");

  const employeeTypeOptions: SelectOption[] = useMemo(
    () => [
      { value: "0", label: "LEFT EMPLOYEE" },
      { value: "1", label: "ACTIVE EMPLOYEE" },
      { value: "2", label: "ALL EMPLOYEE" },
    ],
    [],
  );

  const [employeeType, setEmployeeType] = useState("2");

  const currentDate = useMemo(() => new Date(), []);

  const [year, setYear] = useState(() => {
    const date = new Date();
    return String(
      date.getMonth() < 3 ? date.getFullYear() - 1 : date.getFullYear(),
    );
  });

  const [month, setMonth] = useState(
    String(currentDate.getMonth() + 1).padStart(2, "0"),
  );

  const [rows, setRows] = useState<LeaveReportRow[]>([]);
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
    const financialYear =
      new Date().getMonth() < 3 ? currentYear - 1 : currentYear;

    return Array.from({ length: 5 }, (_, index) => {
      const value = String(financialYear + 1 - index);

      return {
        value,
        label: value,
      };
    });
  }, []);

  const monthOptions: SelectOption[] = useMemo(
    () => [
      { value: "01", label: "01" },
      { value: "02", label: "02" },
      { value: "03", label: "03" },
      { value: "04", label: "04" },
      { value: "05", label: "05" },
      { value: "06", label: "06" },
      { value: "07", label: "07" },
      { value: "08", label: "08" },
      { value: "09", label: "09" },
      { value: "10", label: "10" },
      { value: "11", label: "11" },
      { value: "12", label: "12" },
    ],
    [],
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
        {
          branch: user?.branch,
        },
        {
          headers: apiHeaders,
        },
      );

      const responseData = response.data;

      if (
        responseData?.Status === false ||
        responseData?.status === false ||
        responseData?.success === false
      ) {
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
            item.EMPLOYEENAME,
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

        return "";
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
  }, [user?.Comp_Code, user?.branch, apiHeaders]);

  // --------------------------------------------------
  // FETCH LEAVE MASTER
  // --------------------------------------------------

  const fetchLeaveMaster = useCallback(async () => {
    if (!user?.Comp_Code) return;

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${MASTER_API}`,
        {},
        {
          headers: apiHeaders,
        },
      );

      const responseData = response.data;

      if (
        responseData?.Status === false ||
        responseData?.status === false ||
        responseData?.success === false
      ) {
        throw new Error(
          responseData?.message ||
            responseData?.Message ||
            "Unable to load leave types.",
        );
      }

      const leaveTypes =
        responseData?.data?.LEAVETYPE || responseData?.LEAVETYPE || [];

      const options = Array.isArray(leaveTypes)
        ? (leaveTypes
            .map((item: any) => {
              const value = getText(
                item.value,
                item.Value,
                item.LTYPE,
                item.LeaveType,
                item.Leave_Type,
                item.id,
                item.ID,
              );

              const label = getText(
                item.label,
                item.Label,
                item.Leave_Lable,
                item.Leave_Label,
                item.LeaveName,
                item.Leave_Name,
                item.name,
                item.Name,
              );

              if (!value) return null;

              return {
                value,
                label: label || value,
              };
            })
            .filter(Boolean) as SelectOption[])
        : [];

      setLeaveTypeOptions(options);

      setLeaveType((previous) => {
        if (previous && options.some((item) => item.value === previous)) {
          return previous;
        }

        return "";
      });
    } catch (error: any) {
      console.error("Leave Master Error:", error);

      setLeaveTypeOptions([]);

      showSideAlert("Unable to load leave types", "error");
    }
  }, [user?.Comp_Code, apiHeaders]);

  // --------------------------------------------------
  // INITIAL API CALLS
  // --------------------------------------------------

  useEffect(() => {
    if (!user?.Comp_Code) return;

    fetchEmployees();
    fetchLeaveMaster();
  }, [user?.Comp_Code, fetchEmployees, fetchLeaveMaster]);

  // --------------------------------------------------
  // FETCH LEAVE REPORT
  // --------------------------------------------------

  const fetchReport = useCallback(async () => {
    if (!user?.Comp_Code) {
      showSideAlert(
        "Company information missing. Please login again.",
        "warning",
      );
      return;
    }

    if (!month) {
      showSideAlert("Please select month.", "warning");
      return;
    }

    if (!year) {
      showSideAlert("Please select year.", "warning");
      return;
    }

    setLoading(true);
    setRows([]);
    setReportHeaders([]);
    setHasSearched(false);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${LEAVE_REPORT_API}`,
        {
          Loc_code: user?.branch,
          DateFrom: month,
          DateTo: year,
          LeaveType: leaveType,
          EMPCODE: employee,
          EMPLOYEETYPE: employeeType,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
          },
        },
      );

      const responseData = response.data;

      console.log(responseData, "Leave Balance Report Response");

      if (
        responseData?.success === false ||
        responseData?.Status === false ||
        responseData?.status === false
      ) {
        throw new Error(
          responseData?.message ||
            responseData?.Message ||
            "Unable to fetch leave report.",
        );
      }

      // API HEADERS

      const apiHeadersList: string[] = Array.isArray(responseData?.headers)
        ? responseData.headers
        : [];

      // API ROWS

      const result = getResponseArray(responseData);

      // Prefer headers received from API.
      // If API doesn't return headers, derive from first row.

      const uniqueHeaders = Array.from(
        new Set(
          (apiHeadersList.length
            ? apiHeadersList
            : result.length
              ? Object.keys(result[0]).filter((key) => key !== "id")
              : []
          ).filter((header: any) => String(header).trim()),
        ),
      );

      setReportHeaders(uniqueHeaders);

      const mappedRows = result.map((item: any, index: number) =>
        mapReportRow(item, index),
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
          text: "No leave records are available for the selected filters.",
        });
      }
    } catch (error: any) {
      console.error("Leave Report Error:", error);

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
    user?.branch,
    employee,
    month,
    year,
    leaveType,
    employeeType,
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
  // TABLE COLUMNS
  // --------------------------------------------------

  // --------------------------------------------------
  // TABLE COLUMNS - FIXED ORDER
  // --------------------------------------------------

  const columns = useMemo(() => {
    const fixedColumns = [
      { Header: "EMPLOYEE CODE", accessor: "Emp_Code" },
      { Header: "EMPLOYEE NAME", accessor: "EMPLOYEENAME" },
      { Header: "GENDER", accessor: "GENDER" },
      { Header: "EMPLOYEE TYPE", accessor: "EmployeeType" },
      { Header: "DEPARTMENT", accessor: "Department" },
      { Header: "SECTION", accessor: "SECTION" },
      { Header: "EMPLOYEE DESIGNATION", accessor: "EMPLOYEEDESIGNATION" },
      { Header: "LOCATION", accessor: "Location" },
      { Header: "LEAVE TYPE", accessor: "Leave_Lable" },
      { Header: "LEAVE MONTH", accessor: "Leave_Mnth" },
      { Header: "OPENING BALANCE", accessor: "Op_Bal" },
      { Header: "GEN LEAVE", accessor: "Gen_Lev" },
      { Header: "AVAIL LEAVE", accessor: "Avail_Lev" },
      { Header: "CL BALANCE", accessor: "Cl_Bal" },
      { Header: "LEAVE YEAR", accessor: "Leave_Yr" },
    ];

    return fixedColumns.map((column) => ({
      ...column,
      minWidth: 140,
      width:
        column.accessor === "EMPLOYEENAME" ||
        column.accessor === "EMPLOYEEDESIGNATION"
          ? 220
          : 150,

      Cell: ({ value }: any) => {
        if (value === null || value === undefined || value === "") {
          return <span className="text-slate-400">—</span>;
        }

        if (
          column.accessor === "Emp_Code" ||
          column.accessor === "EMPLOYEENAME"
        ) {
          return (
            <span className="font-medium text-[#152b4b] dark:text-slate-100">
              {String(value).toUpperCase()}
            </span>
          );
        }

        return (
          <span className="text-[12px] text-[#334155] dark:text-slate-300">
            {String(value).toUpperCase()}
          </span>
        );
      },
    }));
  }, []);

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
    link.download = `Leave_Balance_Report_${month}_${year}.csv`;

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
              Leave Balance Report
            </h1>
          </div>
        </div>

        {/* FILTER CARD */}

        <div className="rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1.1fr_1fr_1fr_1fr_1.1fr_auto]">
            {/* MONTH */}

            <div className="min-w-0">
              <Eselect
                title="Month "
                redlabel="*"
                name="month"
                option={monthOptions}
                initialValue={month}
                handleInputChange={(name: string, value: any) =>
                  setMonth(String(value || ""))
                }
                className="w-full h-[40px]"
              />
            </div>

            {/* YEAR */}

            <div className="min-w-0">
              <Eselect
                title="Year "
                redlabel="*"
                name="year"
                option={yearOptions}
                initialValue={year}
                handleInputChange={(name: string, value: any) =>
                  setYear(String(value || ""))
                }
                className="w-full h-[40px]"
              />
            </div>

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
                className="w-full h-[40px]"
              />
            </div>

            {/* LEAVE TYPE */}

            <div className="min-w-0">
              <Eselect
                title="Leave type"
                name="leaveType"
                option={leaveTypeOptions}
                initialValue={leaveType}
                handleInputChange={(name: string, value: any) =>
                  setLeaveType(String(value || ""))
                }
                className="w-full h-[40px]"
              />
            </div>

            {/* EMPLOYEE TYPE */}

            <div className="min-w-0">
              <Eselect
                title="Employee type"
                name="employeeType"
                option={employeeTypeOptions}
                initialValue={employeeType}
                handleInputChange={(name: string, value: any) =>
                  setEmployeeType(String(value || ""))
                }
                className="w-full h-[40px]"
              />
            </div>

            {/* SHOW */}

            <div className="flex items-end">
              <AButton
                type="button"
                onClick={fetchReport}
                disabled={loading || employeeLoading}
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
          {/* TOOLBAR */}

          <div className="flex min-w-0 flex-col gap-3 border-b border-[#e8edf5] p-3.5 dark:border-slate-700 lg:flex-row lg:items-center lg:justify-between">
            <div className="shrink-0 flex items-center gap-3">
              <p className="text-[13px] font-medium text-[#64748b] dark:text-slate-400">
                {hasSearched ? (
                  <>
                    <span className="font-semibold text-[#152b4b] dark:text-slate-100">
                      {filteredRows.length}
                    </span>{" "}
                    of {rows.length} rows
                  </>
                ) : (
                  <span>Not loaded yet</span>
                )}
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

              {/* RESET */}

              <AButton
                type="button"
                onClick={resetFilters}
                className="inline-flex h-[41px] items-center justify-center gap-2 rounded-lg border border-[#dce5f1] bg-white px-3.5 text-[12px] font-semibold text-[#152b4b] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <RotateCcw size={14} />
                Reset
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

          {/* TABLE / EMPTY STATE */}

          {hasSearched ? (
            <div className="w-full min-w-0 overflow-x-auto">
              <div className="min-w-max">
                {filteredRows.length > 0 ? (
                  <DataTable
                    columns={columns}
                    data={filteredRows}
                    showExcelExport={true}
                    showColumnFilters={true}
                  />
                ) : (
                  <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                    No records found for the selected criteria.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-16 text-center">
              <h3 className="text-[15px] font-semibold text-[#152b4b] dark:text-slate-200">
                Set filters and click Show
              </h3>
              <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
                Results will appear here with search, column filters, sorting
                and Excel export.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
