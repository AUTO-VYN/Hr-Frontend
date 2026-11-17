"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

import {
  Search,
  RotateCcw,
  Download,
  Filter,
  X,
  ArrowLeft,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";

import AButton from "@/components/atoms/Button";
import Eselect from "@/components/atoms/Eselect";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

const EMPLOYEE_API = "/employee/EmployeeMasterDetailedView";

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const getText = (...values: any[]): string => {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      const text = String(value).trim();

      if (text.toLowerCase() !== "null" && text.toLowerCase() !== "undefined") {
        return text;
      }
    }
  }

  return "";
};

const formatDate = (dateString: any) => {
  if (!dateString) return "";

  const raw = String(dateString).trim();

  if (
    raw.toLowerCase() === "null" ||
    raw.toLowerCase() === "undefined" ||
    raw === "Invalid Date"
  ) {
    return "";
  }

  const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  const date = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3]),
      )
    : new Date(raw);

  if (Number.isNaN(date.getTime())) return raw;

  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", {
    month: "short",
  });
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
};

const titleCase = (value: string) => {
  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const showAlert = (
  message: string,
  icon: "success" | "error" | "warning" | "info" = "info",
) => {
  Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  }).fire({
    icon,
    title: message,
  });
};

// --------------------------------------------------
// DATE FIELDS
// --------------------------------------------------

const DATE_FIELDS = [
  "JOININGDATE",
  "DATEOFBIRTH",
  "Interview_NEWDate",
  "Prob_period",
  "PASSEXPIRYNEWDATE",
  "DRIVINGLIC_NEWISSUEDATE",
  "DOMDATE",
  "LASTWOR_NEWDATE",
  "Effective_date",
];

// --------------------------------------------------
// AMOUNT FIELDS
// --------------------------------------------------

const AMOUNT_FIELDS = [
  "BASICSALARY",
  "HRA",
  "Conveyance",
  "Medical",
  "OTHER",
  "Uniform",
  "Washing",
  "Gross_Salary",
  "ANNUAL_GROSS",
];

// --------------------------------------------------
// EMPLOYEE FIELD MAPPING
// --------------------------------------------------

const mapEmployeeRow = (item: any) => {
  const lastWorkingDate = getText(
    item.LASTWOR_NEWDATE,
    item.LastWorkingDate,
    item.LASTWOR_DATE,
    item.LAST_WORKING_DATE,
    item.Last_Working_Date,
    item.lastworkingdate,
  );

  return {
    ...item,

    EmpCode: getText(item.EMPCODE, item.EmpCode, item.Emp_Code),

    EmployeeName: getText(
      item.EMPLOYEENAME,
      item.EmployeeName,
      item.EMP_NAME,
      item.Emp_Name,
    ),

    Gender: getText(item.GENDER, item.Gender),

    EmployeeType: getText(item.EmployeeType, item.EMP_TYPE, item.Emp_Type),

    Department: getText(item.Department, item.DEPARTMENT),

    Section: getText(item.SECTION, item.Section),

    Designation: getText(
      item.EMPLOYEEDESIGNATION,
      item.Designation,
      item.DESIGNATION,
    ),

    Location: getText(item.Location, item.LOCATION, item.Branch),

    Region: getText(item.region1, item.Region, item.REGION),

    LastWorkingDate: lastWorkingDate,
  };
};

// --------------------------------------------------
// EMPLOYEE STATUS FILTER
// --------------------------------------------------

// Left employee = Last working date is available
const isEmployeeLeft = (emp: any) => {
  const lastWorkingDate = getText(
    emp.LASTWOR_NEWDATE,
    emp.LastWorkingDate,
    emp.LASTWOR_DATE,
    emp.LAST_WORKING_DATE,
    emp.Last_Working_Date,
    emp.lastworkingdate,
  );

  return lastWorkingDate !== "";
};

// Active employee = Last working date is not available
const isEmployeeActive = (emp: any) => {
  return !isEmployeeLeft(emp);
};

// --------------------------------------------------
// PREFERRED COLUMNS
// --------------------------------------------------

const PREFERRED_COLUMNS = [
  {
    Header: "EMP CODE",
    accessor: "EmpCode",
    minWidth: 130,
    width: 130,
  },
  {
    Header: "EMPLOYEE NAME",
    accessor: "EmployeeName",
    minWidth: 270,
    width: 270,
  },
  {
    Header: "GENDER",
    accessor: "Gender",
    minWidth: 110,
    width: 110,
  },
  {
    Header: "EMPLOYEE TYPE",
    accessor: "EmployeeType",
    minWidth: 170,
    width: 170,
  },
  {
    Header: "DEPARTMENT",
    accessor: "Department",
    minWidth: 165,
    width: 165,
  },
  {
    Header: "SECTION",
    accessor: "Section",
    minWidth: 120,
    width: 120,
  },
  {
    Header: "DESIGNATION",
    accessor: "Designation",
    minWidth: 180,
    width: 180,
  },
  {
    Header: "LOCATION",
    accessor: "Location",
    minWidth: 135,
    width: 135,
  },
  {
    Header: "REGION",
    accessor: "Region",
    minWidth: 130,
    width: 130,
  },
];

// --------------------------------------------------
// ALIAS KEYS
// --------------------------------------------------

const ALIAS_KEYS = [
  "EmpCode",
  "EMPCODE",
  "Emp_Code",
  "EmployeeName",
  "EMPLOYEENAME",
  "EMP_NAME",
  "Emp_Name",
  "Gender",
  "GENDER",
  "EmployeeType",
  "EMP_TYPE",
  "Emp_Type",
  "Department",
  "DEPARTMENT",
  "Section",
  "SECTION",
  "Designation",
  "EMPLOYEEDESIGNATION",
  "DESIGNATION",
  "Location",
  "LOCATION",
  "Branch",
  "Region",
  "region1",
  "REGION",
];

// --------------------------------------------------
// HIDDEN FIELDS
// --------------------------------------------------

const HIDDEN_KEYS = ["LastWorkingDate", "__v", "__typename"];

// --------------------------------------------------
// DYNAMIC CELL FORMATTING
// --------------------------------------------------

const renderDynamicCell = (value: any, accessor: string) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (DATE_FIELDS.includes(accessor)) {
    return formatDate(value);
  }

  if (AMOUNT_FIELDS.includes(accessor)) {
    const amount = Number(value);

    return Number.isFinite(amount) ? amount.toFixed(2) : value;
  }

  return String(value).toUpperCase();
};

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

export default function Page() {
  const user = useCurrentUser();
  const router = useRouter();

  // --------------------------------------------------
  // STATES
  // --------------------------------------------------

  const [tabledata, setTabledata] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [employeeStatus, setEmployeeStatus] = useState("ACTIVE");

  const [searchText, setSearchText] = useState("");

  const [showColumnFilters, setShowColumnFilters] = useState(false);

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    {},
  );

  // --------------------------------------------------
  // STATUS DROPDOWN OPTIONS
  // --------------------------------------------------

  const statusOptions = [
    {
      label: "View Active Employees",
      value: "ACTIVE",
    },
    {
      label: "View Left Employees",
      value: "LEFT",
    },
  ];

  // --------------------------------------------------
  // STATUS DROPDOWN CHANGE
  // --------------------------------------------------

  const handleStatusChange = (name: string, value: string) => {
    setEmployeeStatus(value);

    // Status change par previous filters clear honge
    setColumnFilters({});
    setSearchText("");
    setShowColumnFilters(false);
  };

  // --------------------------------------------------
  // FETCH EMPLOYEE DETAILS API
  // --------------------------------------------------

  const ShowData = useCallback(async () => {
    if (!user?.Comp_Code || !user?.branch) {
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        Loc_code: user.branch,
      };

      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${EMPLOYEE_API}`,
        payload,
        {
          headers: {
            compcode: user.Comp_Code,
            name: user.name,
          },
        },
      );

      console.log("Employee Details Response:", result.data.Result);

      const responseData = result?.data?.Result;

      if (!Array.isArray(responseData)) {
        throw new Error(
          result?.data?.message ||
            result?.data?.Message ||
            "Invalid employee details response.",
        );
      }

      const cleanedData = responseData.map((item: any) => {
        const trimmedRow: any = {};

        Object.keys(item || {}).forEach((key) => {
          const value = item[key];

          trimmedRow[key] = typeof value === "string" ? value.trim() : value;
        });

        return mapEmployeeRow(trimmedRow);
      });

      setTabledata(cleanedData);

      if (!cleanedData.length) {
        showAlert("No employee records found.", "info");
      }
    } catch (error: any) {
      console.error(
        "Employee Details API Error:",
        error?.response?.data || error,
      );

      setTabledata([]);

      Swal.fire({
        icon: "error",
        title: "Unable to load employees",
        text:
          error?.response?.data?.message ||
          error?.response?.data?.Message ||
          error?.message ||
          "Something went wrong while fetching employee details.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.Comp_Code, user?.branch, user?.name]);

  // --------------------------------------------------
  // INITIAL API CALL
  // --------------------------------------------------

  useEffect(() => {
    if (user?.Comp_Code && user?.branch) {
      ShowData();
    }
  }, [user?.Comp_Code, user?.branch, ShowData]);

  // --------------------------------------------------
  // ACTIVE / LEFT EMPLOYEE FILTER
  // --------------------------------------------------

  const statusFilteredData = useMemo(() => {
    if (employeeStatus === "LEFT") {
      return tabledata.filter(isEmployeeLeft);
    }

    return tabledata.filter(isEmployeeActive);
  }, [tabledata, employeeStatus]);

  // --------------------------------------------------
  // DYNAMIC COLUMNS
  // --------------------------------------------------

  const columns = useMemo(() => {
    const preferred = PREFERRED_COLUMNS.map((column: any) => ({
      ...column,

      Cell: ({ value }: any) => (
        <span
          className={
            column.accessor === "EmpCode"
              ? "font-semibold text-slate-900 dark:text-slate-100"
              : "text-slate-700 dark:text-slate-200"
          }
        >
          {value || "—"}
        </span>
      ),
    }));

    if (!tabledata.length) {
      return preferred;
    }

    const allKeys = Array.from(
      new Set(tabledata.flatMap((row) => Object.keys(row))),
    );

    const dynamicColumns = allKeys
      .filter((key) => {
        return (
          !ALIAS_KEYS.includes(key) &&
          !HIDDEN_KEYS.includes(key) &&
          !key.startsWith("__")
        );
      })
      .map((key) => ({
        Header: titleCase(key).toUpperCase(),
        accessor: key,
        minWidth: 150,
        width: 150,

        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-200">
            {renderDynamicCell(value, key)}
          </span>
        ),
      }));

    return [...preferred, ...dynamicColumns];
  }, [tabledata]);

  // --------------------------------------------------
  // FILTERABLE COLUMNS
  // --------------------------------------------------

  const filterableColumns = useMemo(() => {
    return columns;
  }, [columns]);

  // --------------------------------------------------
  // COLUMN FILTER OPTIONS
  // --------------------------------------------------

  const columnFilterOptions = useMemo(() => {
    const options: Record<string, string[]> = {};

    filterableColumns.forEach((column: any) => {
      const values = statusFilteredData
        .map((row) => String(row[column.accessor] ?? "").trim())
        .filter(Boolean);

      options[column.accessor] = Array.from(new Set(values)).sort((a, b) =>
        a.localeCompare(b),
      );
    });

    return options;
  }, [statusFilteredData, filterableColumns]);

  // --------------------------------------------------
  // GLOBAL SEARCH + COLUMN FILTERS
  // --------------------------------------------------

  const filteredData = useMemo(() => {
    return statusFilteredData.filter((row) => {
      const searchMatch =
        !searchText.trim() ||
        columns.some((column: any) => {
          const value = row[column.accessor];

          return String(value ?? "")
            .toLowerCase()
            .includes(searchText.trim().toLowerCase());
        });

      if (!searchMatch) {
        return false;
      }

      return Object.entries(columnFilters).every(
        ([accessor, selectedValue]) => {
          if (!selectedValue) {
            return true;
          }

          return String(row[accessor] ?? "").trim() === selectedValue;
        },
      );
    });
  }, [statusFilteredData, searchText, columnFilters, columns]);

  // --------------------------------------------------
  // RESET FILTERS
  // --------------------------------------------------

  const resetTableFilters = () => {
    setSearchText("");
    setColumnFilters({});
    setShowColumnFilters(false);
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-[#f7f9fc] px-3 py-3 text-[#172b45] dark:bg-[#101827] dark:text-slate-100 sm:px-5">
      {/* HEADER */}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[23px] font-bold leading-tight text-[#172b45] dark:text-white">
            Employee Details View
          </h1>
        </div>
      </div>

      {/* EMPLOYEE STATUS CARD */}

      <div className="mb-4 rounded-2xl border border-[#dce5f0] bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[355px_1fr]">
          <div>
            <Eselect
              title="Showing"
              name="employeeStatus"
              initialValue={employeeStatus}
              option={statusOptions}
              handleInputChange={handleStatusChange}
              className="h-[44px] w-full"
            />
          </div>
        </div>
      </div>

      {/* TABLE CARD */}

      <div className="overflow-hidden rounded-2xl border border-[#dce5f0] bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        {/* TABLE TOOLBAR */}

        <div className="flex flex-col gap-3 border-b border-[#dce5f0] bg-white px-5 py-3 dark:border-slate-700 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
          {/* TOTAL ROWS */}

          <div className="text-[15px] font-medium text-[#64748b] dark:text-slate-300">
            {filteredData.length} of {statusFilteredData.length} rows
          </div>
        </div>

        {/* COLUMN FILTER PANEL */}

        {showColumnFilters && (
          <div className="border-b border-[#dce5f0] bg-[#f8fafc] px-5 py-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#172b45] dark:text-white">
                Filter columns
              </h3>

              <button
                type="button"
                onClick={() => setShowColumnFilters(false)}
                className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <X size={17} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {filterableColumns.map((column: any) => (
                <div key={column.accessor}>
                  <label className="mb-1.5 block text-xs font-semibold text-[#64748b] dark:text-slate-300">
                    {column.Header}
                  </label>

                  <select
                    value={columnFilters[column.accessor] || ""}
                    onChange={(e) =>
                      setColumnFilters((prev) => ({
                        ...prev,
                        [column.accessor]: e.target.value,
                      }))
                    }
                    className="h-[40px] w-full rounded-lg border border-[#dce5f0] bg-white px-3 text-sm text-[#172b45] outline-none transition focus:border-[#8b9cf7] dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  >
                    <option value="">All</option>

                    {(columnFilterOptions[column.accessor] || []).map(
                      (value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setColumnFilters({})}
                className="h-[36px] rounded-lg border border-[#dce5f0] bg-white px-4 text-xs font-semibold text-[#172b45] transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Clear column filters
              </button>
            </div>
          </div>
        )}

        {/* TABLE */}

        <div className="w-full overflow-x-auto bg-white dark:bg-slate-900">
          <div className="min-w-full">
            <DataTable
              columns={columns}
              data={filteredData}
              showExcelExport={true}
              showColumnFilters={true}
              showTopSearch={true}
              resetFilters={true}
              showPageSizeInFooter={true}
              onRowDoubleClick={(row: any) => console.log("Employee Row:", row)}
            />
          </div>
        </div>
      </div>

      {/* LOADER */}

      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
