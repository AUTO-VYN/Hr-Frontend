"use client";

import React, { useCallback, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

import {
  Search,
  RotateCcw,
  FileSpreadsheet,
  X,
  ArrowLeft,
  SlidersHorizontal,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useDateRange } from "@/app/hooks/use-date-range";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

// --------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------

const BIOMETRIC_EXPORT_API = "/hrmsreport/getBioMatricDataExport";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type BiometricRow = {
  EmpCode?: string;
  Pay_Code: string;
  Machine_Punch: string;
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
      return String(value);
    }
  }

  return "";
};

const getApiError = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.message ||
  "Unable to fetch biometric machine data.";

const getCurrentDate = () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getResponseArray = (response: any): any[] => {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.result)) return response.result;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.Data)) return response.Data;
  if (Array.isArray(response?.Result)) return response.Result;
  if (Array.isArray(response?.Table)) return response.Table;

  return [];
};

// --------------------------------------------------
// DATE FORMAT
// --------------------------------------------------

const formatDateTime = (value: any) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

// --------------------------------------------------
// ALERT
// --------------------------------------------------

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
// MAIN PAGE
// --------------------------------------------------

export default function BiometricMachineDataExportPage() {
  const user = useCurrentUser();
  const router = useRouter();

  const globalDateRange = useDateRange();

  // --------------------------------------------------
  // FILTER STATES
  // --------------------------------------------------

  const [dateFrom, setDateFrom] = useState(
    globalDateRange?.from || getCurrentDate(),
  );

  const [dateTo, setDateTo] = useState(globalDateRange?.to || getCurrentDate());

  // 1 = Employee Code
  // 2 = Machine Pay Code

  const [searchBy, setSearchBy] = useState("2");

  const [machineNo, setMachineNo] = useState("");

  // --------------------------------------------------
  // REPORT STATES
  // --------------------------------------------------

  const [rows, setRows] = useState<BiometricRow[]>([]);

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
    }),
    [user?.Comp_Code],
  );

  // --------------------------------------------------
  // SEARCH OPTIONS
  // --------------------------------------------------

  const searchOptions = [
    {
      value: "2",
      label: "Machine no.",
    },
    {
      value: "1",
      label: "Pay code",
    },
  ];

  // --------------------------------------------------
  // TABLE HEADERS
  // --------------------------------------------------

  const reportHeaders = useMemo(() => {
    return searchBy === "1"
      ? ["EMPCODE", "PAY_CODE", "MACHINE_PUNCH"]
      : ["PAY_CODE", "MACHINE_PUNCH"];
  }, [searchBy]);

  // --------------------------------------------------
  // COLUMN LABELS
  // --------------------------------------------------

  const columnLabels: Record<string, string> = {
    EMPCODE: "EMPLOYEE CODE",
    PAY_CODE: "PAY CODE",
    MACHINE_PUNCH: "MACHINE PUNCH",
  };

  // --------------------------------------------------
  // DATE RANGE VALIDATION
  // --------------------------------------------------

  const isValidDateRange = (from: string, to: string) => {
    const fromDate = new Date(`${from}T00:00:00`);
    const toDate = new Date(`${to}T00:00:00`);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return false;
    }

    const diffTime = toDate.getTime() - fromDate.getTime();

    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    return diffDays >= 0 && diffDays <= 30;
  };

  // --------------------------------------------------
  // EMPLOYEE / MACHINE NUMBER VALIDATION
  // --------------------------------------------------

  const isValidEmpCode = (value: string) => {
    if (!value.trim()) return false;

    if (value.length > 100) return false;

    return /^[a-zA-Z0-9, ]+$/.test(value);
  };

  // --------------------------------------------------
  // FETCH BIOMETRIC DATA
  // --------------------------------------------------

  const fetchBiometricData = useCallback(async () => {
    // Company validation

    if (!user?.Comp_Code) {
      showSideAlert(
        "Company information missing. Please login again.",
        "warning",
      );
      return;
    }

    // Branch validation

    if (!user?.branch) {
      showSideAlert("Branch information missing.", "warning");
      return;
    }

    // Search By validation

    if (!searchBy) {
      showSideAlert("Please select Search By.", "info");
      return;
    }

    // Input validation

    if (!machineNo.trim()) {
      showSideAlert(
        `Please enter ${searchBy === "2" ? "machine number" : "Emp code"}.`,
        "info",
      );
      return;
    }

    if (!isValidEmpCode(machineNo)) {
      showSideAlert(
        "Input must contain only letters, numbers, commas and spaces (maximum 100 characters).",
        "info",
      );
      return;
    }

    // Date validation

    if (!dateFrom || !dateTo) {
      showSideAlert("Please select both dates.", "warning");
      return;
    }

    if (dateFrom > dateTo) {
      showSideAlert("Date from cannot be greater than date to.", "warning");
      return;
    }

    if (!isValidDateRange(dateFrom, dateTo)) {
      showSideAlert("Date range should not be more than 30 days.", "info");
      return;
    }

    setLoading(true);
    setRows([]);
    setHasSearched(false);

    try {
      // ------------------------------------------
      // API PAYLOAD
      // ------------------------------------------

      const payload = {
        Loc_code: user?.branch,
        DateFrom: dateFrom,
        DateTo: dateTo,
        EMPCODE: machineNo.trim(),
        SearchBy: Number(searchBy),
      };

      console.log("Biometric Machine API Payload:", payload);

      // ------------------------------------------
      // API REQUEST
      // ------------------------------------------

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${BIOMETRIC_EXPORT_API}`,
        payload,
        {
          headers: apiHeaders,
        },
      );

      console.log("Biometric Machine API Response:", response.data);

      const responseData = response.data;

      if (
        responseData?.Status === false ||
        responseData?.status === false ||
        responseData?.success === false
      ) {
        throw new Error(
          responseData?.message ||
            responseData?.Message ||
            "Unable to fetch biometric machine data.",
        );
      }

      // ------------------------------------------
      // RESPONSE DATA
      // ------------------------------------------

      const result = getResponseArray(responseData);

      // ------------------------------------------
      // MAP API RESPONSE
      // ------------------------------------------

      const mappedRows: BiometricRow[] = result.map((item: any) => ({
        ...item,

        EMPCODE: getText(item.EmpCode, item.EMPCODE, item.Emp_Code),

        PAY_CODE: getText(item.Pay_Code, item.PAY_CODE, item.PayCode),

        MACHINE_PUNCH: getText(
          item.Machine_Punch,
          item.MACHINE_PUNCH,
          item.MachinePunch,
          item.Punch_Date,
          item.MachineDateTime,
          item.ATT_DATE,
        ),
      }));

      // ------------------------------------------
      // UPDATE TABLE DATA
      // ------------------------------------------

      setRows(mappedRows);

      setFilters(
        Object.fromEntries(reportHeaders.map((header) => [header, ""])),
      );

      setSearch("");
      setHasSearched(true);

      // ------------------------------------------
      // SUCCESS MESSAGE
      // ------------------------------------------

      if (!mappedRows.length) {
        showSideAlert("No biometric machine records found.", "info");
      } else {
        showSideAlert(
          `${mappedRows.length} records fetched successfully.`,
          "success",
        );
      }
    } catch (error: any) {
      console.error("Biometric Machine Export Error:", error);

      setRows([]);
      setHasSearched(true);

      Swal.fire({
        icon: "error",
        title: "Export failed",
        text: getApiError(error),
      });
    } finally {
      setLoading(false);
    }
  }, [
    user?.Comp_Code,
    user?.branch,
    dateFrom,
    dateTo,
    machineNo,
    searchBy,
    apiHeaders,
    reportHeaders,
  ]);

  // --------------------------------------------------
  // DATE CHANGE
  // --------------------------------------------------

  const handleDateChange = (name: string, value: string) => {
    if (name === "dateFrom") {
      setDateFrom(value);
    }

    if (name === "dateTo") {
      setDateTo(value);
    }
  };

  // --------------------------------------------------
  // FILTER HANDLING
  // --------------------------------------------------

  const handleFilterChange = (name: string, value: string) => {
    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // --------------------------------------------------
  // RESET FILTERS
  // --------------------------------------------------

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

  const columns = useMemo((): TableColumn[] => {
    return reportHeaders.map((header) => ({
      Header: columnLabels[header] || header,

      accessor: header,

      minWidth: 180,

      width: header === "MACHINE_PUNCH" ? 350 : 220,

      Cell: ({ value }: any) => {
        if (value === null || value === undefined || value === "") {
          return <span className="text-slate-400">—</span>;
        }

        if (header === "PAY_CODE" || header === "EMPCODE") {
          return (
            <span className="font-mono text-[12px] font-bold text-[#152b4b] dark:text-slate-200">
              {String(value).toUpperCase()}
            </span>
          );
        }

        if (header === "MACHINE_PUNCH") {
          return (
            <span className="whitespace-nowrap text-[13px] text-[#152b4b] dark:text-slate-300">
              {formatDateTime(value)}
            </span>
          );
        }

        return (
          <span className="text-[12px] text-[#152b4b] dark:text-slate-300">
            {String(value)}
          </span>
        );
      },
    }));
  }, [reportHeaders]);

  // --------------------------------------------------
  // BACK BUTTON
  // --------------------------------------------------

  const handleBack = () => {
    router.back();
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
            <h1 className="text-[20px] font-bold leading-tight text-[#152b4b] dark:text-slate-100 sm:text-[23px]">
              Biometric Machine Data Export
            </h1>
          </div>
        </div>

        {/* FILTER CARD */}

        <div className="rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(200px,1fr)_minmax(200px,1fr)_minmax(190px,1fr)_minmax(190px,1fr)_auto]">
            {/* DATE FROM */}

            <div className="min-w-0">
              <Einput
                name="dateFrom"
                type="date"
                title="Date from"
                value={dateFrom}
                handleInputChange={handleDateChange}
                className="h-[40px] w-full"
              />
            </div>

            {/* DATE TO */}

            <div className="min-w-0">
              <Einput
                name="dateTo"
                type="date"
                title="Date to"
                value={dateTo}
                handleInputChange={handleDateChange}
                className="h-[40px] w-full"
              />
            </div>

            {/* SEARCH BY */}

            <div className="min-w-0">
              <Eselect
                name="searchBy"
                title="Search by"
                option={[
                  { value: "1", label: "BY EMPCODE" },
                  { value: "2", label: "MACHINE PAY CODE" },
                ]}
                initialValue={searchBy}
                handleInputChange={(name: string, value: any) => {
                  setSearchBy(String(value));
                  setMachineNo("");
                  setRows([]);
                  setHasSearched(false);
                  setSearch("");
                }}
                className="h-[40px] w-full"
              />
            </div>

            {/* MACHINE NUMBER / PAY CODE */}

            <div className="min-w-0">
              <Einput
                name="machineNo"
                type="text"
                title={
                  searchBy === "2"
                    ? "Machine no. (e.g. 100,101,173)"
                    : "Emp code (e.g. 100001,100002)"
                }
                value={machineNo}
                handleInputChange={(name: string, value: string) => {
                  if (value.length <= 100 && /^[a-zA-Z0-9, ]*$/.test(value)) {
                    setMachineNo(value);
                  }
                }}
                placeholder={
                  searchBy === "2" ? "100,101,173" : "Enter pay codes"
                }
                className="h-[40px] w-full"
              />
            </div>

            {/* SHOW BUTTON */}

            <div className="flex items-end">
              <AButton
                type="button"
                onClick={fetchBiometricData}
                disabled={loading}
                className="inline-flex h-[40px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-7 text-[13px] font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
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

              <div className="relative min-w-0 flex-1 sm:w-[285px] sm:flex-none">
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {reportHeaders.map((header) => (
                  <div key={header} className="min-w-0">
                    <label className="mb-1 block text-[11px] font-medium text-[#64748b] dark:text-slate-400">
                      {columnLabels[header] || header}
                    </label>

                    <Einput
                      name={header}
                      type="text"
                      value={filters[header] || ""}
                      handleInputChange={(name: string, value: string) =>
                        handleFilterChange(header, value)
                      }
                      placeholder={`Search ${(columnLabels[header] || header).toLowerCase()}`}
                      className="h-[37px] w-full"
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
                      No biometric machine data available for the selected
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
                Biometric Machine Data Export
              </h3>

              <p className="mt-1 max-w-[400px] text-[12px] leading-5 text-[#64748b] dark:text-slate-400">
                Select date range, search criteria and machine numbers, then
                click Show to view the biometric data.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
