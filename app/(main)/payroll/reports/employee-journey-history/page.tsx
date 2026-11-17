"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import {
  Search,
  RotateCcw,
  FileSpreadsheet,
  SlidersHorizontal,
  X,
  ArrowLeft,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

// --------------------------------------------------
// API
// --------------------------------------------------

const EMPLOYEE_API = "/employee/all";
const EMPLOYEE_JOURNEY_API = "/employee/EmployeeJourneyHistory";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type SelectOption = {
  value: string;
  label: string;
};

type JourneyRow = {
  [key: string]: any;
};

type TableColumn = {
  Header: string;
  accessor: string;
  minWidth: number;
  width: number;
  Cell: ({ value }: any) => React.ReactNode;
};

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const getText = (...values: any[]): string => {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
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
  "Unable to fetch employee journey history.";

const showSideAlert = (message: string, type: any = "info") => {
  Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
  }).fire({
    icon: type,
    title: message,
  });
};

const formatDate = (value: any): string => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

export default function EmployeeJourneyHistoryPage() {
  const user = useCurrentUser();
  const router = useRouter();

  // --------------------------------------------------
  // STATES
  // --------------------------------------------------

  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([]);
  const [employee, setEmployee] = useState("");

  const [section, setSection] = useState("DEPARTMENT");

  const [rows, setRows] = useState<JourneyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [search, setSearch] = useState("");
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});

  // --------------------------------------------------
  // OPTIONS
  // --------------------------------------------------

  const sectionOptions: SelectOption[] = useMemo(
    () => [
      { value: "DEPARTMENT", label: "Department" },
      { value: "DESIGNATION", label: "Designation" },
      { value: "LOCATION", label: "Location" },
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
          const code = getText(
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
            item.EMPFIRSTNAME,
            item.label,
          );

          if (!code) return null;

          return {
            value: code,
            label: `${code} · ${name || code}`,
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
  // FETCH EMPLOYEE JOURNEY HISTORY
  // --------------------------------------------------

  const fetchJourneyHistory = useCallback(async () => {
    if (!user?.Comp_Code) {
      Swal.fire({
        icon: "warning",
        title: "Company information missing",
        text: "Please login again.",
      });
      return;
    }

    if (!employee) {
      showSideAlert("Please select Employee.", "error");
      return;
    }

    if (!section) {
      showSideAlert("Please select Section.", "error");
      return;
    }

    setLoading(true);
    setRows([]);
    setHasSearched(false);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${EMPLOYEE_JOURNEY_API}`,
        {
          Emp_Code: employee,
          Section: section,
        },
        {
          headers: apiHeaders,
        },
      );

      const responseData = response.data;

      console.log("Employee Journey History Response:", responseData);

      if (
        responseData?.Status === false ||
        responseData?.status === false ||
        responseData?.success === false
      ) {
        throw new Error(
          responseData?.message ||
            responseData?.Message ||
            "Unable to fetch employee journey history.",
        );
      }

      // Existing API response format:
      // response.data.Result

      const journeyData = getResponseArray(responseData?.Result);

      const mappedRows: JourneyRow[] = journeyData.map(
        (item: any, index: number) => {
          const empCode = getText(
            item.EMPCODE,
            item.EmpCode,
            item.EMP_CODE,
            item.EmployeeCode,
            item.Employee_Code,
          );

          const employeeName = getText(
            item.emp_name,
            item.EMP_NAME,
            item.Emp_Name,
            item.EmployeeName,
            item.EmpName,
            item.EMPFIRSTNAME,
            item.FullName,
            item.Employee_Name,
          );

          const location = getText(
            item.Location,
            item.LOCATION,
            item.LocationName,
            item.LOCATION_NAME,
            item.BranchName,
            item.Branch_Name,
          );

          const department = getText(
            item.Department,
            item.DEPARTMENT,
            item.DepartmentName,
            item.DEPARTMENT_NAME,
            item.Dept_Name,
          );

          const designation = getText(
            item.EMPLOYEEDESIGNATION,
            item.DESIGNATION,
            item.Designation,
            item.DesignationName,
            item.DESIGNATION_NAME,
          );

          const lastUpdate = getText(
            item.UpdatedDate,
            item.UPDATEDDATE,
            item.LAST_UPDATE,
            item.Last_Update,
            item.LASTUPDATE,
            item.LastUpdate,
            item.EFFECTIVE_DATE,
            item.EffectiveDate,
            item.DATE,
            item.Created_On,
            item.CreatedDate,
            item.TRAN_DATE,
          );

          return {
            ...item,
            _rowId: index + 1,
            EMPCODE: empCode,
            EMPLOYEE_NAME: employeeName,
            LOCATION: location,
            DEPARTMENT: department,
            DESIGNATION: designation,
            LAST_UPDATE: lastUpdate,
          };
        },
      );

      setRows(mappedRows);
      setHasSearched(true);
      setSearch("");
      setFilters({});

      if (!mappedRows.length) {
        showSideAlert("No employee journey history found", "info");
      }
    } catch (error: any) {
      console.error("Employee Journey History Error:", error);

      setRows([]);
      setHasSearched(true);

      Swal.fire({
        icon: "error",
        title: "Unable to load journey history",
        text: getApiError(error),
      });
    } finally {
      setLoading(false);
    }
  }, [user?.Comp_Code, employee, section, apiHeaders]);

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
    setFilters({});
  };

  // --------------------------------------------------
  // TABLE HEADERS
  // --------------------------------------------------

  const tableHeaders = useMemo(
    () => [
      "EMPCODE",
      "EMPLOYEE_NAME",
      "LOCATION",
      "DEPARTMENT",
      "DESIGNATION",
      "LAST_UPDATE",
    ],
    [],
  );

  // --------------------------------------------------
  // FILTERED ROWS
  // --------------------------------------------------

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        tableHeaders.some((header) =>
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
  }, [rows, search, filters, tableHeaders]);

  // --------------------------------------------------
  // TABLE COLUMNS
  // --------------------------------------------------

  const columns = useMemo((): TableColumn[] => {
    return [
      {
        Header: "EMP CODE",
        accessor: "EMPCODE",
        minWidth: 130,
        width: 160,
        Cell: ({ value }: any) => (
          <span className="font-mono text-[12px] font-bold text-[#152b4b] dark:text-slate-200">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: "EMPLOYEE_NAME",
        minWidth: 220,
        width: 280,
        Cell: ({ value }: any) => (
          <span className="font-medium text-[#152b4b] dark:text-slate-100">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "LOCATION",
        accessor: "LOCATION",
        minWidth: 150,
        width: 190,
        Cell: ({ value }: any) => (
          <span className="text-[#334155] dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "DEPARTMENT",
        accessor: "DEPARTMENT",
        minWidth: 160,
        width: 210,
        Cell: ({ value }: any) => (
          <span className="text-[#334155] dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "DESIGNATION",
        accessor: "DESIGNATION",
        minWidth: 160,
        width: 210,
        Cell: ({ value }: any) => (
          <span className="text-[#334155] dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "LAST UPDATE",
        accessor: "LAST_UPDATE",
        minWidth: 150,
        width: 180,
        Cell: ({ value }: any) => (
          <span className="whitespace-nowrap text-[#334155] dark:text-slate-300">
            {formatDate(value) || "—"}
          </span>
        ),
      },
    ];
  }, []);

  // --------------------------------------------------
  // EXPORT CSV
  // --------------------------------------------------

  const exportToExcel = () => {
    if (!filteredRows.length) {
      showSideAlert("No records available to export", "warning");
      return;
    }

    const headers = [
      "EMPCODE",
      "EMPLOYEE_NAME",
      "LOCATION",
      "DEPARTMENT",
      "DESIGNATION",
      "LAST_UPDATE",
    ];

    const escapeCSV = (value: any) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csvContent = [
      [
        "EMP CODE",
        "EMPLOYEE NAME",
        "LOCATION",
        "DEPARTMENT",
        "DESIGNATION",
        "LAST UPDATE",
      ]
        .map(escapeCSV)
        .join(","),
      ...filteredRows.map((row) =>
        headers
          .map((header) => {
            const value =
              header === "LAST_UPDATE" ? formatDate(row[header]) : row[header];

            return escapeCSV(value);
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `Employee_Journey_History_${employee}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="min-h-screen min-w-0 bg-[#f5f8fc] p-3 dark:bg-[#0b1220] sm:p-4 lg:p-5">
      <HashloaderComponent isLoading={loading || employeeLoading} />

      <div className="mx-auto max-w-[1800px] space-y-4">
        {/* PAGE HEADER */}

        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[20px] font-bold leading-tight text-[#152b4b] dark:text-slate-100 sm:text-[23px]">
            Employee Journey History
          </h1>
        </div>

        {/* FILTER CARD */}

        <div className="rounded-2xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1.15fr_0.85fr_auto]">
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
                className="h-[40px] w-full"
              />
            </div>

            {/* SECTION */}

            <div className="min-w-0">
              <Eselect
                title="Section"
                name="section"
                option={sectionOptions}
                initialValue={section}
                handleInputChange={(name: string, value: any) =>
                  setSection(String(value || "DEPARTMENT"))
                }
                className="h-[40px] w-full"
              />
            </div>

            {/* SHOW */}

            <div className="flex items-end">
              <AButton
                type="button"
                onClick={fetchJourneyHistory}
                disabled={loading || employeeLoading || !employee}
                className="inline-flex h-[40px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 text-[13px] font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
              >
                <Search size={15} />
                Show
              </AButton>
            </div>
          </div>
        </div>

        {/* TABLE CARD */}

        <div className="min-w-0 overflow-hidden rounded-2xl border border-[#dce5f1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900">
          {/* TOOLBAR */}

          <div className="flex min-w-0 flex-col gap-3 border-b border-[#e8edf5] p-3.5 dark:border-slate-700 lg:flex-row lg:items-center lg:justify-between">
            <p className="shrink-0 text-[13px] font-medium text-[#64748b] dark:text-slate-400">
              <span className="font-semibold text-[#152b4b] dark:text-slate-100">
                {filteredRows.length}
              </span>{" "}
              of {rows.length} rows
            </p>
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tableHeaders.map((header) => (
                  <div key={header} className="min-w-0">
                    <label className="mb-1 block text-[11px] font-medium text-[#64748b] dark:text-slate-400">
                      {header.replaceAll("_", " ")}
                    </label>

                    <input
                      type="text"
                      value={filters[header] || ""}
                      onChange={(event) =>
                        handleFilterChange(header, event.target.value)
                      }
                      placeholder={`Search ${header
                        .replaceAll("_", " ")
                        .toLowerCase()}`}
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
              <div className="min-w-[900px]">
                {filteredRows.length > 0 ? (
                  <DataTable
                    columns={columns}
                    data={filteredRows}
                    showTopSearch={true}
                    showExcelExport={true}
                    showColumnFilters={true}
                    resetfilters={true}
                    showPageSizeInFooter={true}
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
                      Try changing your search or column filters.
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
                Employee Journey History
              </h3>

              <p className="mt-1 max-w-[400px] text-[12px] leading-5 text-[#64748b] dark:text-slate-400">
                Select an employee and section, then click Show to view employee
                journey history.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
