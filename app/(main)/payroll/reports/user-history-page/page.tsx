
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import DataTable from "@/components/Templates/reacttable";
import { useDateRange } from "@/app/hooks/use-date-range";

// --------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------

const EMPLOYEE_API = "/employee/all";
const ACTIVITY_HISTORY_API = "/hrmsreport/getHistoryOfUser";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type SelectOption = {
  value: string;
  label: string;
};

type HistoryFilters = {
  DATE_FROM: string;
  DATE_TO: string;
  EMPCODE: string;
  HISTORY_TYPE: string;
};

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const getCurrentDate = (monthsBack = 0) => {
  const date = new Date();

  date.setMonth(date.getMonth() - monthsBack);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDate = (value: any) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day} ${date.toLocaleString("en-GB", {
    month: "short",
  })} ${year}`;
};

const getErrorMessage = (error: any, fallback: string) => {
  return (
    error?.response?.data?.Message ||
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------

const UserActivityHistoryPage = () => {
  const router = useRouter();
  const user = useCurrentUser();
  const globalDateRange = useDateRange();

  // --------------------------------------------------
  // FILTER STATES
  // --------------------------------------------------

  const [filters, setFilters] = useState<HistoryFilters>({
    DATE_FROM: globalDateRange?.from || getCurrentDate(),
    DATE_TO: globalDateRange?.to || getCurrentDate(),
    EMPCODE: "",
    HISTORY_TYPE: "MOBILE",
  });

  // --------------------------------------------------
  // MASTER STATES
  // --------------------------------------------------

  const [employees, setEmployees] = useState<SelectOption[]>([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);

  // --------------------------------------------------
  // TABLE STATES
  // --------------------------------------------------

  const [tabledata, setTabledata] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // --------------------------------------------------
  // HEADERS
  // --------------------------------------------------

  const requestHeaders = useMemo(
    () => ({
      compcode: user?.Comp_Code || "",
      name: user?.name || "",
    }),
    [user?.Comp_Code, user?.name],
  );

  // --------------------------------------------------
  // HISTORY TYPE OPTIONS
  // --------------------------------------------------

  const historyTypeOptions: SelectOption[] = [
    {
      value: "MOBILE",
      label: "Mobile history",
    },
    {
      value: "CLOUD",
      label: "Cloud history",
    },
  ];

  // --------------------------------------------------
  // ALERT
  // --------------------------------------------------

  const showAlert = useCallback(
    (
      message: string,
      type: "success" | "error" | "warning" | "info",
    ) => {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: type,
        title: message,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        customClass: {
          container: "side-alert-container",
          popup: `side-alert-${type}`,
          title: "side-alert-title",
          icon: "side-alert-icon",
        },
      });
    },
    [],
  );

  // --------------------------------------------------
  // FILTER CHANGE HANDLER
  // --------------------------------------------------

  const handleInputChange = (name: string, value: any) => {
    const selectedValue =
      typeof value === "string"
        ? value
        : value?.target?.value ?? "";

    setFilters((prev) => ({
      ...prev,
      [name]: selectedValue,
    }));
  };

  // --------------------------------------------------
  // EMPLOYEE MASTER API
  // POST /employee/all
  // --------------------------------------------------

  const fetchEmployees = useCallback(async () => {
    if (!user?.Comp_Code) return;

    try {
      setEmployeeLoading(true);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${EMPLOYEE_API}`,
        {
          branch: user?.branch,
        },
        {
          headers: requestHeaders,
        },
      );

      const rows =
        response.data?.data ||
        response.data?.Data ||
        response.data?.Employee_Data ||
        [];

      const formattedEmployees: SelectOption[] = (
        Array.isArray(rows) ? rows : []
      ).map((item: any) => {
        const code =
          item.value ??
          item.Value ??
          item.EMPCODE ??
          item.Emp_Code ??
          item.EmpCode ??
          item.Empcode ??
          item.UTD ??
          "";

        const name =
          item.label ??
          item.NAME ??
          item.Emp_Name ??
          item.Employee_Name ??
          item.EmpName ??
          item.Emp_Name1 ??
          item.name ??
          "";

        return {
          value: String(code),
          label:
            item.label ||
            `${code} · ${name}`.trim(),
        };
      }).filter((item: SelectOption) => item.value);

      setEmployees(formattedEmployees);
    } catch (error) {
      console.error("Employee fetch error:", error);

      showAlert(
        getErrorMessage(error, "Unable to load employees."),
        "error",
      );
    } finally {
      setEmployeeLoading(false);
    }
  }, [
    user?.Comp_Code,
    user?.branch,
    requestHeaders,
    showAlert,
  ]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // --------------------------------------------------
  // FORMAT TABLE DATE
  // --------------------------------------------------

  const formatTableDate = (value: any) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day} ${date.toLocaleString("en-GB", {
      month: "short",
    })} ${year}`;
  };

  // --------------------------------------------------
  // DYNAMIC TABLE COLUMNS
  // --------------------------------------------------

  const columns = useMemo(() => {
    if (
      tabledata.length === 0 ||
      !tabledata[0] ||
      Array.isArray(tabledata[0])
    ) {
      return [];
    }

    return Object.keys(tabledata[0]).map((key) => ({
      Header: key.replace(/_/g, " ").toUpperCase(),
      accessor: key,

      Cell: ({ value }: any) => {
        if (value === null || value === undefined) {
          return "";
        }

        // Date columns
        if (
          key.toUpperCase() === "ACTION_DATE" ||
          key.toUpperCase() === "DATE" ||
          key.toUpperCase().includes("DATE")
        ) {
          return formatTableDate(value);
        }

        // Time columns
        if (
          key.toUpperCase() === "TIME" ||
          key.toUpperCase().includes("_TIME")
        ) {
          return String(value);
        }

        if (typeof value === "object") {
          return JSON.stringify(value);
        }

        return String(value);
      },
    }));
  }, [tabledata]);

  // --------------------------------------------------
  // SHOW ACTIVITY HISTORY
  // POST /hrmsreport/getHistoryOfUser
  // --------------------------------------------------

  const ShowData = async () => {
    if (!user?.Comp_Code) {
      showAlert(
        "User information missing. Please login again.",
        "error",
      );
      return;
    }

    if (!filters.DATE_FROM) {
      showAlert("Please select date from.", "warning");
      return;
    }

    if (!filters.DATE_TO) {
      showAlert("Please select date to.", "warning");
      return;
    }

    if (filters.DATE_FROM > filters.DATE_TO) {
      showAlert(
        "Date from cannot be greater than date to.",
        "warning",
      );
      return;
    }

    try {
      setIsLoading(true);
      setHasSearched(true);
      setTabledata([]);

      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${ACTIVITY_HISTORY_API}`,
        {
          EMPCODE: filters.EMPCODE,
          DATE_FROM: filters.DATE_FROM,
          DATE_TO: filters.DATE_TO,
          HISTORY_TYPE: filters.HISTORY_TYPE,
        },
        {
          headers: requestHeaders,
        },
      );

      const rawData = result?.data?.result || [];

      // API can return nested array
      const data = Array.isArray(rawData?.[0])
        ? rawData[0]
        : rawData;

      if (!Array.isArray(data)) {
        setTabledata([]);
        showAlert("Invalid history response received.", "warning");
        return;
      }

      setTabledata(data);

      if (data.length === 0) {
        showAlert("No history found.", "info");
      }
    } catch (error) {
      console.error("History fetch error:", error);

      showAlert(
        getErrorMessage(
          error,
          "Error while fetching user activity history.",
        ),
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // --------------------------------------------------
  // CLEAR FILTERS
  // --------------------------------------------------

  const ClearFilter = () => {
    setFilters({
      DATE_FROM: globalDateRange?.from || getCurrentDate(),
      DATE_TO: globalDateRange?.to || getCurrentDate(),
      EMPCODE: "",
      HISTORY_TYPE: "MOBILE",
    });

    setTabledata([]);
    setHasSearched(false);
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-3 py-3 text-[#172b4d] transition-colors dark:bg-slate-950 dark:text-slate-100 sm:px-5 sm:py-4">
      <div className="mx-auto w-full max-w-[1600px]">

        {/* PAGE HEADER */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-[22px] font-bold text-[#172b4d] dark:text-slate-100 sm:text-[24px]">
            User Activity History Report
          </h1>
        </div>

        {/* FILTER CARD */}
        <div className="mb-4 rounded-2xl border border-[#dce5f0] bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">

            {/* HISTORY TYPE */}
            <div className="dark:[&_label]:text-slate-300 dark:[&_select]:border-slate-600 dark:[&_select]:bg-slate-800 dark:[&_select]:text-slate-100 dark:[&_input]:border-slate-600 dark:[&_input]:bg-slate-800 dark:[&_input]:text-slate-100">
              <Eselect
                name="HISTORY_TYPE"
                title="History type"
                option={historyTypeOptions}
                initialValue={filters.HISTORY_TYPE}
                handleInputChange={handleInputChange}
                className="h-[40px] w-full"
              />
            </div>

            {/* EMPLOYEE */}
            <div className="dark:[&_label]:text-slate-300 dark:[&_select]:border-slate-600 dark:[&_select]:bg-slate-800 dark:[&_select]:text-slate-100 dark:[&_input]:border-slate-600 dark:[&_input]:bg-slate-800 dark:[&_input]:text-slate-100">
              <Eselect
                name="EMPCODE"
                title="Employee"
                option={employees}
                initialValue={filters.EMPCODE}
                handleInputChange={handleInputChange}
                className="h-[40px] w-full"
              />

              {employeeLoading && (
                <p className="mt-1 text-xs text-slate-400">
                  Loading employees...
                </p>
              )}
            </div>

            {/* DATE FROM */}
            <div className="dark:[&_label]:text-slate-300 dark:[&_input]:border-slate-600 dark:[&_input]:bg-slate-800 dark:[&_input]:text-slate-100">
              <Einput
                name="DATE_FROM"
                type="date"
                title="Date from"
                value={filters.DATE_FROM}
                handleInputChange={handleInputChange}
                className="h-[40px] w-full"
              />
            </div>

            {/* DATE TO */}
            <div className="dark:[&_label]:text-slate-300 dark:[&_input]:border-slate-600 dark:[&_input]:bg-slate-800 dark:[&_input]:text-slate-100">
              <Einput
                name="DATE_TO"
                type="date"
                title="Date to"
                value={filters.DATE_TO}
                handleInputChange={handleInputChange}
                className="h-[40px] w-full"
              />
            </div>

            {/* SHOW BUTTON */}
            <AButton
              type="button"
              onClick={ShowData}
              disabled={isLoading || employeeLoading}
              className="inline-flex h-[40px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 xl:w-auto"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Loading...
                </>
              ) : (
                "Show"
              )}
            </AButton>
          </div>
        </div>

        {/* DATA TABLE */}
       <div className="mt-4">
  {isLoading ? (
    <div className="flex min-h-[180px] items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      Loading activity history...
    </div>
  ) : (
    <DataTable
      columns={columns}
      data={tabledata}
      showExcelExport={true}
      showTopSearch={true}
      resetFilters={true}
      showPageSizeInFooter={true}
      showColumnFilters={true}
    />
  )}

  {!isLoading && !hasSearched && tabledata.length === 0 && (
    <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">
      Select filters and click Show to view user activity history.
    </p>
  )}

  {!isLoading && hasSearched && tabledata.length === 0 && (
    <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">
      No activity history found.
    </p>
  )}
</div>
      </div>
    </div>
  );
};

export default UserActivityHistoryPage;
