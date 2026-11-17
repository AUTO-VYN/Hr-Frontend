"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Search, FileSpreadsheet, X } from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";

import AButton from "@/components/atoms/Button";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

// --------------------------------------------------
// API
// --------------------------------------------------

const MONTHWISE_REPORT_API = "/Emp_Exit/finddepart";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type ReportRow = {
  [key: string]: any;
};

type TableColumn = {
  Header: string;
  accessor: string;
  minWidth: number;
  width: number;
  Cell?: ({ value }: any) => React.ReactNode;
};

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

const MONTHS = [
  { key: "JANUARY", label: "January" },
  { key: "FEBRUARY", label: "February" },
  { key: "MARCH", label: "March" },
  { key: "APRIL", label: "April" },
  { key: "MAY", label: "May" },
  { key: "JUNE", label: "June" },
  { key: "JULY", label: "July" },
  { key: "AUGUST", label: "August" },
  { key: "SEPTEMBER", label: "September" },
  { key: "OCTOBER", label: "October" },
  { key: "NOVEMBER", label: "November" },
  { key: "DECEMBER", label: "December" },
];

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

  // Existing API response structure:
  // response.data.data.DIVISION

  if (Array.isArray(response?.data?.DIVISION)) {
    return response.data.DIVISION;
  }

  if (Array.isArray(response?.DIVISION)) {
    return response.DIVISION;
  }

  const possibleKeys = [
    "DIVISION",
    "Result",
    "result",
    "data",
    "Data",
    "records",
    "Records",
    "rows",
    "Rows",
    "Table",
    "recordset",
  ];

  for (const key of possibleKeys) {
    if (Array.isArray(response?.[key])) {
      return response[key];
    }
  }

  for (const key of possibleKeys) {
    const nested = response?.[key];

    if (nested && typeof nested === "object") {
      const result = getResponseArray(nested);

      if (result.length) return result;
    }
  }

  return [];
};

const getApiError = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.message ||
  "Unable to fetch Employee Monthwise Report.";

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

// --------------------------------------------------
// MONTH VALUE MAPPING
// --------------------------------------------------

const getMonthValue = (item: any, month: string): string => {
  const shortMonth = month.slice(0, 3);

  const value = getText(
    item?.[month],
    item?.[month.toLowerCase()],
    item?.[month.charAt(0) + month.slice(1).toLowerCase()],
    item?.[shortMonth],
    item?.[shortMonth.toLowerCase()],
    item?.[`${month}_COUNT`],
    item?.[`${month}_Count`],
    item?.[`${shortMonth}_COUNT`],
    item?.[`${shortMonth}_Count`],
  );

  return value || "0";
};

// --------------------------------------------------
// NORMALIZE API DATA
// --------------------------------------------------

const normalizeRows = (data: any[]): ReportRow[] => {
  return data.map((item, index) => {
    const department = getText(
      item.DEPARTMENT,
      item.Department,
      item.DepartmentName,
      item.DEPARTMENT_NAME,
      item.Dept_Name,
      item.DeptName,
      item.department,
      item.NAME,
      item.Name,
    );

    const row: ReportRow = {
      ...item,
      _rowId: index + 1,
      DEPARTMENT: department || "—",
    };

    MONTHS.forEach(({ key }) => {
      row[key] = getMonthValue(item, key);
    });

    return row;
  });
};

const escapeCSV = (value: any) =>
  `"${String(value ?? "").replace(/"/g, '""')}"`;

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

export default function EmployeeMonthwiseReportPage() {
  const user = useCurrentUser();

  // --------------------------------------------------
  // STATES
  // --------------------------------------------------

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [search, setSearch] = useState("");
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});

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
  // FETCH MONTHWISE REPORT
  // --------------------------------------------------

  const fetchMonthwiseReport = useCallback(async () => {
    if (!user?.Comp_Code) {
      showSideAlert(
        "Company information missing. Please login again.",
        "error",
      );
      return;
    }

    setLoading(true);
    setHasSearched(false);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${MONTHWISE_REPORT_API}`,
        {},
        {
          headers: apiHeaders,
        },
      );

      const responseData = response.data;

      console.log("Employee Monthwise Report Response:", responseData);

      if (
        responseData?.Status === false ||
        responseData?.status === false ||
        responseData?.success === false
      ) {
        throw new Error(
          responseData?.message ||
            responseData?.Message ||
            "Unable to fetch Employee Monthwise Report.",
        );
      }

      // Existing API returns:
      // response.data.data.DIVISION

      const reportData = getResponseArray(responseData);

      console.log("Employee Monthwise Report DIVISION:", reportData);

      const mappedRows = normalizeRows(reportData);

      setRows(mappedRows);
      setSearch("");
      setFilters({});
      setHasSearched(true);

      if (!mappedRows.length) {
        showSideAlert("No Employee Monthwise Report records found.", "info");
      }
    } catch (error: any) {
      console.error("Employee Monthwise Report Error:", error);

      setRows([]);
      setHasSearched(true);

      Swal.fire({
        icon: "error",
        title: "Unable to load report",
        text: getApiError(error),
      });
    } finally {
      setLoading(false);
    }
  }, [user?.Comp_Code, apiHeaders]);

  // --------------------------------------------------
  // INITIAL API CALL
  // --------------------------------------------------

  useEffect(() => {
    if (user?.Comp_Code) {
      fetchMonthwiseReport();
    }
  }, [user?.Comp_Code, fetchMonthwiseReport]);

  // --------------------------------------------------
  // TABLE HEADERS
  // --------------------------------------------------

  const tableHeaders = useMemo(
    () => ["DEPARTMENT", ...MONTHS.map((month) => month.key)],
    [],
  );

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
    const departmentColumn: TableColumn = {
      Header: "DEPARTMENT",
      accessor: "DEPARTMENT",
      minWidth: 190,
      width: 220,
      Cell: ({ value }: any) => (
        <span className="font-medium text-[#152b4b] dark:text-slate-100">
          {value || "—"}
        </span>
      ),
    };

    const monthColumns: TableColumn[] = MONTHS.map((month) => ({
      Header: month.label.toUpperCase(),
      accessor: month.key,
      minWidth: 145,
      width: 170,
      Cell: ({ value }: any) => (
        <span className="tabular-nums text-[#152b4b] dark:text-slate-200">
          {value ?? "0"}
        </span>
      ),
    }));

    return [departmentColumn, ...monthColumns];
  }, []);

  // --------------------------------------------------
  // EXPORT TO EXCEL / CSV
  // --------------------------------------------------

  const exportToExcel = () => {
    if (!filteredRows.length) {
      showSideAlert("No records available to export.", "warning");
      return;
    }

    const headers = ["DEPARTMENT", ...MONTHS.map((month) => month.key)];

    const csvHeaders = [
      "DEPARTMENT",
      ...MONTHS.map((month) => month.label.toUpperCase()),
    ];

    const csvContent = [
      csvHeaders.map(escapeCSV).join(","),
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
    link.download = "Employee_Monthwise_Report.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);

    showSideAlert("Report exported successfully.", "success");
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="min-h-screen min-w-0 bg-[#f5f8fc] p-3 dark:bg-[#0b1220] sm:p-4 lg:p-5">
      <HashloaderComponent isLoading={loading} />

      <div className="mx-auto max-w-[1800px] space-y-4">
        {/* PAGE HEADER */}

        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[20px] font-bold leading-tight text-[#152b4b] dark:text-slate-100 sm:text-[23px]">
            Employee Monthwise Report
          </h1>
        </div>

        {/* REPORT CARD */}

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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
            <div className="w-full min-w-0 max-w-full overflow-hidden">
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
          ) : (
            <div className="flex min-h-[290px] flex-col items-center justify-center px-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#dce5f1] bg-[#f8fafc] dark:border-slate-700 dark:bg-slate-800">
                <FileSpreadsheet
                  size={23}
                  className="text-[#64748b] dark:text-slate-400"
                />
              </div>

              <h3 className="mt-3 text-[14px] font-semibold text-[#152b4b] dark:text-slate-100">
                Employee Monthwise Report
              </h3>

              <p className="mt-1 max-w-[400px] text-[12px] leading-5 text-[#64748b] dark:text-slate-400">
                The monthwise report will appear here after the report data is
                loaded.
              </p>

              <AButton
                type="button"
                onClick={fetchMonthwiseReport}
                disabled={loading}
                className="mt-4 inline-flex h-[38px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 text-[13px] font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                <Search size={15} />
                Load Report
              </AButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
