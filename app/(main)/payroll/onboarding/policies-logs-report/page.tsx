"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Download, FileText, SlidersHorizontal } from "lucide-react";

import Swal from "sweetalert2";
import axios from "axios";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";
import ServiceTablePagination from "@/components/Templates/reacttable";
import FileViewer from "@/components/atoms/FileviewerBank";

import { useCurrentUser } from "@/app/hooks/use-current-user";

type PolicyLogRow = {
  srNo: string | number;
  employeeName: string;
  empCode: string;
  documentName: string;
  action: string;
  rawAction: unknown;
  date: unknown;
  filePath: string;
  fileName: string;
  original: any;
};

export default function Page() {
  const user = useCurrentUser();

  // =========================================================
  // DATE HELPERS
  // =========================================================

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const getDateMonthsBack = (months: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return formatDateForInput(date);
  };

  // =========================================================
  // STATES
  // =========================================================

  const [dates, setDates] = useState({
    DATE_FROM: getDateMonthsBack(1),
    DATE_TO: formatDateForInput(new Date()),
  });

  const [employeeCode, setEmployeeCode] = useState("");
  const [policy, setPolicy] = useState("");

  const [tableData, setTableData] = useState<PolicyLogRow[]>([]);
  const [displayedData, setDisplayedData] = useState<PolicyLogRow[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);
  const [policyOptions, setPolicyOptions] = useState<any[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Table filters
  const [employeeNameFilter, setEmployeeNameFilter] = useState("");
  const [documentNameFilter, setDocumentNameFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  // =========================================================
  // ALERT
  // =========================================================

  const showSideAlert = (
    message: string,
    type: "success" | "error" | "warning" | "info" = "info",
  ) => {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: type,
      title: message,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
    });
  };

  // =========================================================
  // DATE CHANGE
  // =========================================================

  const handleDateChange = (name: string, value: string | null) => {
    setDates((previous) => ({
      ...previous,
      [name]: value || "",
    }));
  };

  // =========================================================
  // DROPDOWN API
  // Existing API: /Payrollpolicies/dropdown
  // =========================================================

  const fetchDropdowns = useCallback(async () => {
    if (!user?.Comp_Code || !user?.branch) {
      return;
    }

    setOptionsLoading(true);

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/Payrollpolicies/dropdown`,
        {
          loc_code: user.branch,
          Login_Empcode: user?.EMPCODE,
        },
        {
          headers: {
            compcode: user.Comp_Code,
            name: user?.name,
          },
        },
      );

      console.log("Policy Dropdown API Response:", result.data);

      const response = result.data?.data ?? result.data;

      const employees = Array.isArray(response?.Employees)
        ? response.Employees
        : [];

      const policies = Array.isArray(response?.Policies)
        ? response.Policies
        : [];

      setEmployeeOptions(employees);
      setPolicyOptions(policies);
    } catch (error: any) {
      console.error("Policy Dropdown API Error:", error);

      setEmployeeOptions([]);
      setPolicyOptions([]);

      showSideAlert(
        error?.response?.data?.message ||
          "Unable to load employee and policy dropdowns.",
        "error",
      );
    } finally {
      setOptionsLoading(false);
    }
  }, [user?.Comp_Code, user?.branch, user?.EMPCODE, user?.name]);

  useEffect(() => {
    fetchDropdowns();
  }, [fetchDropdowns]);

  // =========================================================
  // NORMALIZE API RESPONSE
  // =========================================================

  const normalizePolicyRow = (item: any, index: number): PolicyLogRow => {
    const statusRaw =
      item.POLICY_VIEW_FLAG ??
      item.Action ??
      item.action ??
      item.Status ??
      item.status ??
      item.ACK_STATUS ??
      item.AcknowledgementStatus ??
      "";

    const statusText = String(statusRaw).toLowerCase();

    let action = "Viewed";

    if (statusText.includes("download") || Number(statusRaw) === 2) {
      action = "Downloaded";
    } else if (
      statusText.includes("acknowledged") ||
      statusText.includes("acknowledgement") ||
      statusText.includes("ack")
    ) {
      action = "Acknowledged";
    } else if (
      statusText.includes("pending") ||
      statusText.includes("not viewed") ||
      Number(statusRaw) === 0 ||
      statusText === ""
    ) {
      action = "Pending";
    } else if (statusText.includes("view")) {
      action = "Viewed";
    }

    const documentName = String(
      item.DOC_NAME ??
        item.DocumentName ??
        item.DocName ??
        item.PolicyName ??
        item.FileName ??
        item.documentName ??
        "",
    );

    const existingPath = String(
      item.path ??
        item.SMBPath ??
        item.FilePath ??
        item.DOC_PATH ??
        item.filePath ??
        "",
    );

    let filePath = existingPath;

    if (existingPath && documentName) {
      const normalizedPath = existingPath.replace(/\/+$/, "");

      const alreadyContainsFileName =
        normalizedPath.split(/[\\/]/).pop()?.toLowerCase() ===
        documentName.toLowerCase();

      if (!alreadyContainsFileName) {
        filePath = `${normalizedPath}/${documentName}`;
      } else {
        filePath = normalizedPath;
      }
    }

    return {
      srNo: item.SRNO ?? item.SrNo ?? item.Utd ?? item.id ?? index + 1,

      employeeName:
        item.Empname ??
        item.EmployeeName ??
        item.EMPFIRSTNAME ??
        item.EmpName ??
        item.employeeName ??
        item.Name ??
        "",

      empCode:
        item.EmpCode ?? item.EMPCODE ?? item.EmployeeCode ?? item.empCode ?? "",

      documentName,
      action,
      rawAction: statusRaw,

      date:
        item.Created_At ??
        item.Date ??
        item.CreatedAt ??
        item.CreatedDate ??
        item.ActionDate ??
        item.AcknowledgedAt ??
        item.ViewedAt ??
        item.date ??
        "",

      filePath,

      fileName: item.OriginalName ?? documentName ?? "",

      original: item,
    };
  };

  // =========================================================
  // DATE FORMAT
  // =========================================================

  const formatDisplayDate = (value: any) => {
    if (!value) return "—";

    const stringValue = String(value);
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(stringValue);

    const date = dateOnly
      ? new Date(`${stringValue}T00:00:00`)
      : new Date(value);

    if (isNaN(date.getTime())) {
      return stringValue;
    }

    const day = String(date.getDate()).padStart(2, "0");

    const month = date.toLocaleString("en-IN", {
      month: "short",
    });

    const year = date.getFullYear();

    if (dateOnly) {
      return `${day} ${month} ${year}`;
    }

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  };

  // =========================================================
  // FETCH POLICY LOGS
  // Existing API and payload preserved
  // =========================================================

  const getMaxDateTo = (dateFrom: string) => {
    if (!dateFrom) return "";

    const date = new Date(`${dateFrom}T00:00:00`);
    date.setDate(date.getDate() + 31);

    return formatDateForInput(date);
  };
  const fetchPolicyLogs = async () => {
    if (!user?.Comp_Code) {
      showSideAlert("Company code is not available.", "warning");
      return;
    }

    if (!user?.branch) {
      showSideAlert("Branch code is not available.", "warning");
      return;
    }

    if (!dates.DATE_FROM) {
      showSideAlert("Please select Date From.", "warning");
      return;
    }

    if (!dates.DATE_TO) {
      showSideAlert("Please select Date To.", "warning");
      return;
    }

    const fromDate = new Date(`${dates.DATE_FROM}T00:00:00`);
    const toDate = new Date(`${dates.DATE_TO}T00:00:00`);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      showSideAlert("Please select valid dates.", "warning");
      return;
    }

    if (fromDate > toDate) {
      showSideAlert("Date From cannot be greater than Date To.", "warning");
      return;
    }

    const dayDiff = Math.round(
      (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (dayDiff > 31) {
      showSideAlert("Date range must not exceed 31 days.", "warning");
      return;
    }

    if (!employeeCode.trim() && !policy.trim()) {
      showSideAlert("Please select Employee Code or Policy.", "warning");
      return;
    }

    setIsClicked(true);
    setIsLoading(true);

    try {
      const Data = {
        loc_code: user.branch,
        dateFrom: dates.DATE_FROM,
        dateTo: dates.DATE_TO,
        empcode: employeeCode.trim(),
        policies: policy.trim(),
      };

      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/Payrollpolicies/getpolicyLogsbyEmpcode`,
        {
          Data,
        },
        {
          headers: {
            compcode: user.Comp_Code,
            name: user.name,
          },
        },
      );

      console.log("Policy Logs API Response:", result.data);

      const responseData =
        result.data?.Result ??
        result.data?.result ??
        result.data?.Data?.Result ??
        result.data?.data?.Result ??
        result.data?.data?.result ??
        result.data?.data ??
        [];

      if (!Array.isArray(responseData)) {
        setTableData([]);
        setDisplayedData([]);
        setTotalCount(0);
        setCurrentPage(1);

        showSideAlert(
          result.data?.message || "No policy logs found.",
          "warning",
        );

        return;
      }

      const mapped: PolicyLogRow[] = responseData.map(
        (item: any, index: number) => normalizePolicyRow(item, index),
      );

      setTableData(mapped);
      setCurrentPage(1);

      if (mapped.length === 0) {
        showSideAlert("No policy logs found.", "warning");
      } else {
        showSideAlert(`${mapped.length} policy log(s) loaded.`, "success");
      }
    } catch (error: any) {
      console.error("Policy Logs Error:", error);

      setTableData([]);
      setDisplayedData([]);
      setTotalCount(0);
      setCurrentPage(1);

      showSideAlert(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Unable to load policy logs.",
        "error",
      );
    } finally {
      setIsClicked(false);
      setIsLoading(false);
    }
  };

  // =========================================================
  // FILTER + PAGINATION
  // =========================================================

  useEffect(() => {
    let rows = [...tableData];

    if (employeeNameFilter.trim()) {
      const search = employeeNameFilter.trim().toLowerCase();

      rows = rows.filter((item) =>
        String(item.employeeName ?? "")
          .toLowerCase()
          .includes(search),
      );
    }

    if (documentNameFilter.trim()) {
      const search = documentNameFilter.trim().toLowerCase();

      rows = rows.filter((item) =>
        String(item.documentName ?? "")
          .toLowerCase()
          .includes(search),
      );
    }

    if (actionFilter.trim()) {
      const search = actionFilter.trim().toLowerCase();

      rows = rows.filter((item) =>
        String(item.action ?? "")
          .toLowerCase()
          .includes(search),
      );
    }

    if (searchInput.trim()) {
      const search = searchInput.trim().toLowerCase();

      rows = rows.filter((item) => {
        const values = [
          item.srNo,
          item.employeeName,
          item.empCode,
          item.documentName,
          item.action,
          item.date,
        ];

        return values.some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(search),
        );
      });
    }

    setTotalCount(rows.length);

    const size = pageSize === -1 ? rows.length || 1 : pageSize;
    const start = (currentPage - 1) * size;

    const finalRows = pageSize === -1 ? rows : rows.slice(start, start + size);

    setDisplayedData(finalRows);
  }, [
    tableData,
    employeeNameFilter,
    documentNameFilter,
    actionFilter,
    searchInput,
    currentPage,
    pageSize,
  ]);

  // =========================================================
  // RESET
  // =========================================================

  const handleReset = () => {
    setDates({
      DATE_FROM: getDateMonthsBack(1),
      DATE_TO: formatDateForInput(new Date()),
    });

    setEmployeeCode("");
    setPolicy("");

    setEmployeeNameFilter("");
    setDocumentNameFilter("");
    setActionFilter("");
    setSearchInput("");

    setTableData([]);
    setDisplayedData([]);
    setTotalCount(0);
    setCurrentPage(1);
  };

  // =========================================================
  // EXPORT CSV
  // =========================================================

  const handleExport = () => {
    try {
      if (!tableData.length) {
        showSideAlert("No policy logs available to export.", "warning");
        return;
      }

      const rows = tableData.map((item, index) => ({
        "SR NO": index + 1,
        "EMPLOYEE NAME": item.employeeName || "",
        "EMP CODE": item.empCode || "",
        "DOCUMENT NAME": item.documentName || "",
        ACTION: item.action || "",
        DATE: formatDisplayDate(item.date),
      }));

      const headers = Object.keys(rows[0]);

      const csv = [
        headers.join(","),
        ...rows.map((row) =>
          headers
            .map((header) => {
              const value = row[header as keyof typeof row];

              return `"${String(value ?? "").replace(/"/g, '""')}"`;
            })
            .join(","),
        ),
      ].join("\r\n");

      const blob = new Blob(["\uFEFF", csv], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "Policies_Logs_Report.csv";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      showSideAlert("Policy logs exported successfully.", "success");
    } catch (error) {
      console.error("Export Error:", error);
      showSideAlert("Export failed.", "error");
    }
  };

  // =========================================================
  // TABLE COLUMNS
  // =========================================================

  const columns = useMemo(
    () => [
      {
        Header: "SR NO",
        accessor: "srNo",
        Cell: ({ value }: any) => (
          <span className="whitespace-nowrap text-[13px] font-[500] text-[#102A43] dark:text-slate-200 sm:text-[14px]">
            {value ?? "—"}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: "employeeName",
        Cell: ({ value }: any) => (
          <span
            className="block max-w-[180px] truncate whitespace-nowrap text-[13px] font-[500] text-[#102A43] dark:text-slate-200 sm:max-w-[220px] sm:text-[14px]"
            title={value || ""}
          >
            {value || "—"}
          </span>
        ),
      },
     
      {
        Header: "DOCUMENT NAME",
        accessor: "documentName",
        Cell: ({ value }: any) => (
          <span
            className="block max-w-[210px] truncate whitespace-nowrap text-[13px] text-[#102A43] dark:text-slate-300 sm:max-w-[300px] sm:text-[14px]"
            title={value || ""}
          >
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "ACTION",
        accessor: "action",
        Cell: ({ value }: any) => {
          const action = String(value || "").toLowerCase();

          if (
            action.includes("acknowledged") ||
            action.includes("acknowledgement")
          ) {
            return (
              <span className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-[9px] border border-[#8DE3C6] bg-[#F0FBF7] px-[10px] py-[5px] text-[12px] font-[600] text-[#08A579] dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                <span className="h-[7px] w-[7px] rounded-full bg-[#10B981]" />
                Acknowledged
              </span>
            );
          }

          if (action.includes("pending")) {
            return (
              <span className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-[9px] border border-[#FFD18A] bg-[#FFF9EF] px-[10px] py-[5px] text-[12px] font-[600] text-[#E99500] dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                <span className="h-[7px] w-[7px] rounded-full bg-[#F59E0B]" />
                Pending
              </span>
            );
          }

          if (action.includes("download")) {
            return (
              <span className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-[9px] border border-[#C4B5FD] bg-[#F5F3FF] px-[10px] py-[5px] text-[12px] font-[600] text-[#6D28D9] dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-400">
                <span className="h-[7px] w-[7px] rounded-full bg-[#8B5CF6]" />
                Downloaded
              </span>
            );
          }

          return (
            <span className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-[9px] border border-[#8DD8FF] bg-[#EFF9FF] px-[10px] py-[5px] text-[12px] font-[600] text-[#008DCE] dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-400">
              <span className="h-[7px] w-[7px] rounded-full bg-[#0EA5E9]" />
              Viewed
            </span>
          );
        },
      },
      {
        Header: "DATE",
        accessor: "date",
        Cell: ({ value }: any) => (
          <span className="whitespace-nowrap text-[13px] text-[#102A43] dark:text-slate-300 sm:text-[14px]">
            {formatDisplayDate(value)}
          </span>
        ),
      },
      {
        Header: "VIEW / DOWNLOAD",
        accessor: "fileName",
        Cell: ({ row }: any) => {
          const filePath = row.original?.filePath;

          if (!filePath) {
            return (
              <span className="inline-flex items-center gap-2 whitespace-nowrap text-[13px] font-[500] text-slate-500 dark:text-slate-400">
                <FileText size={16} />
                No document
              </span>
            );
          }

          const fileLink = `https://erp.autovyn.com/backend/fetch?filePath=${encodeURIComponent(
            filePath,
          )}`;

          return (
            <div className="flex min-w-[110px] items-center gap-2">
              <FileViewer fileLink={fileLink} />
            </div>
          );
        },
      },
    ],
    [],
  );

  // =========================================================
  // PAGINATION
  // =========================================================

  const totalPages = useMemo(() => {
    const size = pageSize === -1 ? 1000000 : pageSize;

    return Math.max(1, Math.ceil((totalCount || 0) / (size || 1)));
  }, [totalCount, pageSize]);

  const serverPagination = useMemo(
    () => ({
      currentPage,
      pageSize,
      totalPages,
      totalRecords: totalCount,
    }),
    [currentPage, pageSize, totalPages, totalCount],
  );

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F8FAFC] px-[8px] py-[12px] text-[#102A43] dark:bg-[#070D18] dark:text-slate-100 sm:px-[12px] sm:py-[14px] lg:px-[18px] lg:py-[18px]">
      {/* HEADER */}

      <div className="mb-[18px] flex flex-col gap-[16px] sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 text-[23px] font-[700] leading-[1.15] tracking-[-0.025em] text-[#102A43] dark:text-white sm:text-[26px]">
            Policies logs report
          </h1>

          <p className="mb-0 mt-[6px] text-[13px] leading-[1.5] text-[#58708D] dark:text-slate-400 sm:text-[14px]">
            Who opened and acknowledged which policy — the audit trail for
            compliance.
          </p>
        </div>

        <div className="flex w-full flex-col gap-[8px] sm:w-auto sm:flex-row sm:items-center">
          <AButton
            type="button"
            onClick={handleReset}
            className="inline-flex h-[42px] w-full items-center justify-center gap-[8px] rounded-[11px] border border-[#DCE5EF] bg-white px-[16px] text-[13px] font-[600] text-[#243B53] shadow-none transition-all hover:bg-[#F8FAFC] sm:w-auto dark:border-slate-700 dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <SlidersHorizontal size={16} />
            <span>Reset filters</span>
          </AButton>

          <AButton
            type="button"
            onClick={handleExport}
            className="inline-flex h-[42px] w-full items-center justify-center gap-[8px] rounded-[11px] bg-[#4F46E5] px-[17px] text-[13px] font-[650] text-white shadow-none transition-all hover:bg-[#4338CA] sm:w-auto"
          >
            <Download size={16} />
            <span>Export to Excel</span>
          </AButton>
        </div>
      </div>

      {/* FILTER CARD */}

      <div className="mb-[18px] w-full rounded-[15px] border border-[#DCE5EF] bg-white px-[14px] pb-[19px] pt-[17px] shadow-[0_4px_14px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-[#0D1524] dark:shadow-none sm:px-[18px] lg:px-[22px]">
        <div className="grid grid-cols-1 items-end gap-[14px] sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[210px_210px_minmax(220px,1fr)_minmax(220px,1fr)_95px]">
          <div className="min-w-0">
            <Einput
              className="h-[34px]"
              title="DATE FROM"
              name="DATE_FROM"
              type="date"
              value={dates.DATE_FROM}
              handleInputChange={(name: string, value: string | null) => {
                const dateFrom = value || "";

                setDates((previous) => {
                  let dateTo = previous.DATE_TO;

                  if (dateFrom) {
                    const maxDateTo = getMaxDateTo(dateFrom);

                    if (!dateTo || dateTo < dateFrom) {
                      dateTo = dateFrom;
                    } else if (dateTo > maxDateTo) {
                      dateTo = maxDateTo;
                    }
                  }

                  return {
                    ...previous,
                    [name]: dateFrom,
                    DATE_TO: dateTo,
                  };
                });
              }}
            />
          </div>

          <div className="min-w-0">
            <Einput
              className="h-[34px]"
              title="DATE TO"
              name="DATE_TO"
              type="date"
              value={dates.DATE_TO}
              handleInputChange={(name: string, value: string | null) => {
                const dateTo = value || "";

                if (dates.DATE_FROM && dateTo) {
                  const minDateTo = dates.DATE_FROM;
                  const maxDateTo = getMaxDateTo(dates.DATE_FROM);

                  if (dateTo < minDateTo) {
                    showSideAlert(
                      "Date To cannot be earlier than Date From.",
                      "warning",
                    );
                    return;
                  }

                  if (dateTo > maxDateTo) {
                    showSideAlert(
                      "Date range cannot exceed 31 days.",
                      "warning",
                    );
                    return;
                  }
                }

                handleDateChange(name, dateTo);
              }}
            />
          </div>

          <div className="min-w-0">
            <Eselect
              className="h-[34px]"
              title="EMPLOYEE CODE"
              name="EmpCode"
              placeholder={
                optionsLoading ? "Loading employees..." : "Employee Code"
              }
              initialValue={employeeCode}
              option={employeeOptions}
              handleInputChange={(_name: string, value: string) => {
                setEmployeeCode(value || "");
              }}
            />
          </div>

          <div className="min-w-0">
            <Eselect
              className="h-[34px]"
              title="POLICY"
              name="HrPolicies"
              placeholder={
                optionsLoading ? "Loading policies..." : "Policy Name"
              }
              initialValue={policy}
              option={policyOptions}
              handleInputChange={(_name: string, value: string) => {
                setPolicy(value || "");
              }}
            />
          </div>

          <div className="flex w-full sm:col-span-2 lg:col-span-2 xl:col-span-1">
            <AButton
              type="button"
              onClick={fetchPolicyLogs}
              disabled={isClicked || isLoading}
              className="h-[34px] rounded-xl bg-[#4F46E5] px-[18px] py-[10px] text-xl font-[650] text-white transition-all hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Show
            </AButton>
          </div>
        </div>
      </div>

      {/* TABLE CARD */}

      <div className="w-full overflow-hidden rounded-[15px] border border-[#DCE5EF] bg-white shadow-[0_5px_18px_rgba(15,23,42,0.045)] dark:border-slate-800 dark:bg-[#0D1524] dark:shadow-none">
        <div className="flex min-h-[69px] flex-col gap-[12px] border-b border-[#DCE5EF] px-[14px] py-[13px] sm:flex-row sm:items-center sm:justify-between sm:px-[22px] dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-[10px]">
            <h2 className="m-0 whitespace-nowrap text-[15px] font-[650] text-[#102A43] dark:text-white sm:text-[16px]">
              Acknowledgement log
            </h2>

            <span className="whitespace-nowrap text-[12px] font-[500] text-[#58708D] dark:text-slate-400">
              {totalCount} of {totalCount} rows
            </span>
          </div>

          <div className="flex items-center justify-between gap-[10px] sm:justify-end">
            <span className="text-[12px] font-[500] text-[#58708D] dark:text-slate-400">
              Rows
            </span>

            <select
              value={String(pageSize === -1 ? 100 : pageSize)}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-[36px] min-w-[60px] rounded-[10px] border border-[#DCE5EF] bg-white px-[11px] text-[12px] font-[500] text-[#334E68] outline-none transition-all focus:border-[#6366F1] dark:border-slate-700 dark:bg-[#111827] dark:text-slate-200"
            >
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        <div className="w-full overflow-hidden bg-white dark:bg-[#0B1220]">
          <ServiceTablePagination
            title=""
            columns={columns}
            data={displayedData}
            height={430}
            serverMode={true}
            serverPagination={serverPagination}
            showPageSizeInFooter={false}
            showTopSearch={false}
            searchValue={searchInput}
            onSearchChange={(value: string) => {
              setSearchInput(value);
              setCurrentPage(1);
            }}
            searchPlaceholder="Search policy logs..."
            onServerPageChange={(page: number) => {
              setCurrentPage(page);
            }}
            onServerPageSizeChange={(size: number) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <HashloaderComponent isLoading={isLoading || isClicked} />
    </div>
  );
}
