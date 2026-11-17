
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { X } from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

// --------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------

const DOCUMENT_APPROVAL_API = "/hrmsreport/DocApprovalReport";
const MASTER_DATA_API = "/employee/MstData";

const FILE_BASE_URL =
  process.env.Next_Public_File ||
  process.env.NEXT_PUBLIC_FILE_URL;
 

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type SelectOption = {
  value: string;
  label: string;
  sort_order?: number;
};

type DocumentRow = {
  id: number;
  SRNO: number;
  EMPCODE: string;
  EMPNAME: string;
  DESIGNATION: string;
  BRANCH: string;
  DOCUMENTTYPE: string;
  DOCUMENTNAME: string;
  DOCUMENT: string;
  UPLOADEDON: any;
  UPLOADEDBY: string;
  STATUS: string;
  [key: string]: any;
};

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const getText = (...values: any[]): string => {
  for (const value of values) {
    if (
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    ) {
      return String(value).trim();
    }
  }

  return "";
};

const getApiError = (error: any) =>
  error?.response?.data?.Message ||
  error?.response?.data?.message ||
  error?.message ||
  "Unable to fetch document approval report.";

const showSideAlert = (
  message: string,
  type: "success" | "error" | "warning" | "info" = "info",
) => {
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

const getDefaultDates = () => {
  const today = new Date();
  const oneMonthAgo = new Date();

  oneMonthAgo.setMonth(today.getMonth() - 1);

  const format = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  return {
    from: format(oneMonthAgo),
    to: format(today),
  };
};

const formatDate = (value: any) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day} ${date.toLocaleString("en-US", {
    month: "short",
  })} ${year}`;
};

const formatDocType = (type: any) => {
  if (!type) return "—";

  const map: Record<string, string> = {
    adhar: "Aadhaar Card",
    aadhaar: "Aadhaar Card",
    pan: "PAN Card",
    salaryslip: "Salary Slip",
    profileimage: "Profile Image",
    faceimage: "Face Embedding Image",
    otherdocument: "Other Document",
    others: "Other Document",
  };

  return map[String(type).toLowerCase()] || String(type).toUpperCase();
};

const getFileUrl = (docPath: any): string => {
  if (!docPath) return "";

  const raw = String(docPath).trim();

  if (!raw || ["null", "undefined"].includes(raw.toLowerCase())) {
    return "";
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  const cleanPath = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  const fileBaseUrl = String(FILE_BASE_URL).replace(/\/+$/, "");

  return `${fileBaseUrl}/fetch?filePath=${encodeURIComponent(cleanPath)}`;
};

// --------------------------------------------------
// NORMALIZE DOCUMENT RESPONSE
// --------------------------------------------------

const normalizeDocumentRow = (
  item: any,
  index: number,
): DocumentRow => {
  const finalStatus = getText(
    item.Overall_Status,
    item.FINAL_STATUS,
    item.Final_Status,
  );

  const finApproval =
    item.Fin_Appr ?? item.FIN_APPR ?? item.Fin_Appr_Status;

  let status = finalStatus;

  if (!status) {
    if (finApproval == 1) {
      status = "APPROVED";
    } else if (finApproval == 0) {
      status = "REJECTED";
    } else {
      status = "PENDING";
    }
  }

  return {
    ...item,

    id: index,

    SRNO: Number(
      item.SRNO ??
        item.SrNo ??
        item.SR_NO ??
        item.sr_no ??
        index + 1,
    ),

    EMPCODE: getText(
      item.EMPCODE,
      item.Emp_Code,
      item.EmpCode,
      item.EMP_CODE,
      item.EmployeeCode,
    ),

    EMPNAME: getText(
      item.EMPNAME,
      item.Emp_Name,
      item.EmpName,
      item.EMP_NAME,
      item.EmployeeName,
      item.FULL_NAME,
    ),

    DESIGNATION: getText(
      item.DESIGNATION,
      item.Designation,
      item.Design_Name,
      item.DESIGN_NAME,
    ),

    BRANCH: getText(
      item.BRANCH,
      item.Branch,
      item.Location_Name,
      item.LOCATION,
      item.Loc_Name,
      item.Branch_Name,
    ),

    DOCUMENTTYPE: getText(
      item.DOCUMENTTYPE,
      item.DocumentType,
      item.DOC_TYPE,
      item.Doc_Type,
      item.Document_Type,
    ),

    DOCUMENTNAME: getText(
      item.DOCUMENTNAME,
      item.DocumentName,
      item.DOC_NAME,
      item.Doc_Name,
      item.FileName,
      item.FILE_NAME,
    ),

    DOCUMENT: getText(
      item.DOCUMENT,
      item.Document,
      item.DOC_PATH,
      item.Doc_Path,
      item.FILE_PATH,
      item.FilePath,
      item.IMAGE_PATH,
    ),

    UPLOADEDON:
      item.UPLOADEDON ??
      item.UploadedOn ??
      item.CREATED_AT ??
      item.UPLOAD_DATE ??
      item.Upload_Date ??
      item.Created_Date ??
      null,

    UPLOADEDBY: getText(
      item.UPLOADEDBY,
      item.UploadedBy,
      item.UPLOAD_BY,
      item.Upload_By,
      item.Created_By_Name,
      item.Created_By,
    ),

    STATUS: status,
  };
};

// --------------------------------------------------
// NORMALIZE BRANCH OPTIONS
// --------------------------------------------------

const normalizeBranchOptions = (list: any[]): SelectOption[] => {
  if (!Array.isArray(list)) return [];

  const formatted = list
    .map((item: any) => {
      const value = getText(
        item.value,
        item.Value,
        item.Code,
        item.code,
        item.Loc_Code,
        item.Branch_Code,
        item.Br_Code,
      );

      const label = getText(
        item.label,
        item.Label,
        item.Name,
        item.name,
        item.Branch_Name,
        item.Loc_Name,
      );

      if (!value) return null;

      // Remove ALL BRANCH from individual branch options.
      if (
        label.toLowerCase().includes("all branch") ||
        value.includes(",")
      ) {
        return null;
      }

      return {
        value,
        label: label || `Branch - ${value}`,
        sort_order: Number(item.sort_order ?? item.Sort_Order ?? 0),
      };
    })
    .filter(Boolean) as SelectOption[];

  return Array.from(
    new Map(formatted.map((item) => [item.value, item])).values(),
  ).sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }

    return a.label.localeCompare(b.label);
  });
};

// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

export default function DocumentApprovalTrackingPage() {
  const user = useCurrentUser();

  const defaultDates = useMemo(() => getDefaultDates(), []);

  // --------------------------------------------------
  // FILTER STATES
  // --------------------------------------------------

  const [dateFrom, setDateFrom] = useState(defaultDates.from);
  const [dateTo, setDateTo] = useState(defaultDates.to);

  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([]);
  const [branch, setBranch] = useState("");

  const statusOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: "All Status" },
      { value: "2", label: "Pending" },
      { value: "1", label: "Approved" },
      { value: "0", label: "Rejected" },
    ],
    [],
  );

  const [status, setStatus] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  // --------------------------------------------------
  // TABLE STATES
  // --------------------------------------------------

  const [rows, setRows] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [masterLoading, setMasterLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [search, setSearch] = useState("");
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});

  // --------------------------------------------------
  // API HEADERS
  // --------------------------------------------------

  const apiHeaders = useMemo(
    () => ({
      accept: "application/json",
      compcode: user?.Comp_Code,
      name: user?.name,
      loc_code: user?.branch,
      "Content-Type": "application/json",
    }),
    [user?.Comp_Code, user?.name, user?.branch],
  );

  // --------------------------------------------------
  // FETCH BRANCHES USING MstData
  // --------------------------------------------------

  useEffect(() => {
    if (!user?.Comp_Code) return;

    let cancelled = false;

    const fetchBranches = async () => {
      setMasterLoading(true);

      try {
        // user.branch:
        // Single branch  -> "1"
        // Multiple       -> "1,2,3,4,5,6,7"

        const branchPayload = String(user?.branch ?? "")
          .split(",")
          .map((item: string) => item.trim())
          .filter(Boolean)
          .join(",");

        if (!branchPayload) {
          setBranchOptions([]);
          setBranch("");
          return;
        }

        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}${MASTER_DATA_API}`,
          {
            branch: branchPayload,
          },
          {
            headers: apiHeaders,
          },
        );

        if (cancelled) return;

        console.log("MstData API Response:", response?.data);

        const responseData = response?.data;

        // API response contains Locations array.
        const locations = Array.isArray(responseData?.Locations)
          ? responseData.Locations
          : Array.isArray(responseData?.data?.Locations)
            ? responseData.data.Locations
            : [];

        const formattedBranches = normalizeBranchOptions(locations);

        console.log("Formatted Branch Options:", formattedBranches);

        setBranchOptions(formattedBranches);

        setBranch((previous) => {
          // Keep existing selected branch if still available.
          if (
            previous &&
            formattedBranches.some((item) => item.value === previous)
          ) {
            return previous;
          }

          // Single branch user: select matching branch automatically.
          if (
            !branchPayload.includes(",") &&
            formattedBranches.some(
              (item) => item.value === branchPayload,
            )
          ) {
            return branchPayload;
          }

          // Multi branch user: do not force one branch.
          return "";
        });
      } catch (error) {
        console.error("Error fetching MstData branches:", error);

        if (!cancelled) {
          setBranchOptions([]);
          setBranch("");
        }
      } finally {
        if (!cancelled) {
          setMasterLoading(false);
        }
      }
    };

    fetchBranches();

    return () => {
      cancelled = true;
    };
  }, [user?.Comp_Code, user?.branch, apiHeaders]);

  // --------------------------------------------------
  // FETCH DOCUMENT APPROVAL REPORT
  // --------------------------------------------------

  const fetchReport = useCallback(async () => {
    if (!user?.Comp_Code) {
      showSideAlert(
        "Company information missing. Please login again.",
        "warning",
      );
      return;
    }

    if (!dateFrom || !dateTo) {
      showSideAlert("Please select Date From and Date To", "warning");
      return;
    }

    if (new Date(dateFrom) > new Date(dateTo)) {
      showSideAlert("Date From cannot be greater than Date To", "warning");
      return;
    }

    setLoading(true);
    setRows([]);
    setHasSearched(false);
    setFilters({});
    setSearch("");

    try {
      const params = {
        DateFrom: dateFrom,
        DateTo: dateTo,
        branch: branch,
        status: status,
        empcode: employeeSearch.trim(),
      };

      console.log("Document Approval Tracking Params:", params);

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}${DOCUMENT_APPROVAL_API}`,
        {
          params,
          headers: {
            compcode: user?.Comp_Code,
          },
        },
      );

      const responseData = response?.data;

      console.log("Document Approval Tracking Response:", responseData);

      if (responseData?.Status || responseData?.status) {
        const result = responseData?.Result || responseData?.result || [];

        const mappedRows = Array.isArray(result)
          ? result.map((item: any, index: number) =>
              normalizeDocumentRow(item, index),
            )
          : [];

        setRows(mappedRows);
        setHasSearched(true);

        if (!mappedRows.length) {
          Swal.fire({
            icon: "info",
            title: "No records found",
            text: "No document records found for the selected filters.",
          });
        }
      } else {
        setRows([]);
        setHasSearched(true);

        const message = responseData?.Message || responseData?.message;

        if (message) {
          showSideAlert(message, "info");
        } else {
          Swal.fire({
            icon: "info",
            title: "No records found",
            text: "No document records found for the selected filters.",
          });
        }
      }
    } catch (error: any) {
      console.error("Document Approval Tracking Error:", error);

      setRows([]);
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
    dateFrom,
    dateTo,
    branch,
    status,
    employeeSearch,
  ]);

  // --------------------------------------------------
  // OPEN DOCUMENT
  // --------------------------------------------------

  const handleOpenDocument = useCallback((documentPath: string) => {
    const url = getFileUrl(documentPath);

    if (!url) {
      showSideAlert("Document path is not available", "warning");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  // --------------------------------------------------
  // TABLE COLUMNS
  // --------------------------------------------------

  const columns = useMemo(
    () => [
      {
        Header: "SR NO",
        accessor: "SRNO",
        width: 75,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-[#152b4b] dark:text-slate-100">
            {value ?? "—"}
          </span>
        ),
      },
      {
        Header: "EMP CODE",
        accessor: "EMPCODE",
        width: 120,
        Cell: ({ value }: any) => (
          <span className="font-mono text-[12px] font-bold text-[#152b4b] dark:text-slate-100">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: "EMPNAME",
        width: 220,
      },
      {
        Header: "DESIGNATION",
        accessor: "DESIGNATION",
        width: 170,
      },
      {
        Header: "BRANCH",
        accessor: "BRANCH",
        width: 130,
      },
      {
        Header: "DOCUMENT TYPE",
        accessor: "DOCUMENTTYPE",
        width: 150,
        Cell: ({ value }: any) => (
          <span className="inline-flex whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {formatDocType(value)}
          </span>
        ),
      },
      {
        Header: "DOCUMENT NAME",
        accessor: "DOCUMENTNAME",
        width: 230,
      },
      {
        Header: "DOCUMENT",
        accessor: "DOCUMENT",
        width: 100,
        Cell: ({ row, value }: any) => {
          const documentPath = value || row?.original?.DOCUMENT;

          return (
            <button
              type="button"
              onClick={() => handleOpenDocument(documentPath)}
              disabled={!documentPath}
              className="font-semibold text-indigo-600 decoration-indigo-300 underline-offset-2 transition hover:text-indigo-800 disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline dark:text-indigo-400"
            >
              Open
            </button>
          );
        },
      },
      {
        Header: "UPLOADED ON",
        accessor: "UPLOADEDON",
        width: 140,
        Cell: ({ value }: any) => (
          <span className="whitespace-nowrap">{formatDate(value)}</span>
        ),
      },
      {
        Header: "UPLOADED BY",
        accessor: "UPLOADEDBY",
        width: 170,
      },
      {
        Header: "STATUS",
        accessor: "STATUS",
        width: 120,
        Cell: ({ value }: any) => {
          const currentStatus = String(value || "").toLowerCase();

          const isApproved =
            currentStatus.includes("approv") || currentStatus === "1";

          const isRejected =
            currentStatus.includes("reject") || currentStatus === "0";

          const className = isApproved
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : isRejected
              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";

          return (
            <span
              className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}
            >
              {value || "Pending"}
            </span>
          );
        },
      },
    ],
    [handleOpenDocument],
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

    setFilters(
      Object.fromEntries(
        columns.map((column: any) => [column.accessor, ""]),
      ),
    );
  };

  // --------------------------------------------------
  // FILTERED ROWS
  // --------------------------------------------------

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        Object.values(row).some((value) =>
          String(value ?? "").toLowerCase().includes(query),
        );

      const matchesColumns = Object.entries(filters).every(
        ([key, value]) => {
          if (!value.trim()) return true;

          return String(row[key] ?? "")
            .toLowerCase()
            .includes(value.trim().toLowerCase());
        },
      );

      return matchesSearch && matchesColumns;
    });
  }, [rows, search, filters]);

  // --------------------------------------------------
  // EXCEL EXPORT
  // --------------------------------------------------

  const exportToExcel = () => {
    if (!filteredRows.length) {
      showSideAlert("There are no records available to export", "info");
      return;
    }

    const exportColumns = columns.filter(
      (column: any) => column.accessor !== "DOCUMENT",
    );

    const headers = exportColumns.map((column: any) => column.Header);
    const accessors = exportColumns.map(
      (column: any) => column.accessor,
    );

    const escapeCSV = (value: any) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...filteredRows.map((row) =>
        accessors
          .map((accessor: string) =>
            escapeCSV(
              accessor === "UPLOADEDON"
                ? formatDate(row[accessor])
                : accessor === "DOCUMENTTYPE"
                  ? formatDocType(row[accessor])
                  : row[accessor],
            ),
          )
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `Document_Approval_Tracking_${dateFrom}_to_${dateTo}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  };

  const columnFilters = columns.map((column: any) => [
    column.accessor,
    column.Header,
  ]);

  // --------------------------------------------------
  // RESET ALL
  // --------------------------------------------------

  const resetAll = () => {
    setDateFrom(defaultDates.from);
    setDateTo(defaultDates.to);
    setBranch("");
    setStatus("");
    setEmployeeSearch("");
    setSearch("");
    setFilters({});
    setRows([]);
    setHasSearched(false);
    setShowColumnFilters(false);
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="min-h-screen min-w-0 bg-[#f5f8fc] p-3 transition-colors dark:bg-[#0b1220] sm:p-4 lg:p-5">
      <HashloaderComponent isLoading={loading || masterLoading} />

      <div className="mx-auto max-w-[1800px] space-y-4">
        {/* PAGE HEADER */}

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[20px] font-bold leading-tight text-[#152b4b] dark:text-slate-100 sm:text-[23px]">
              Document Approval Tracking Report
            </h1>
          </div>
        </div>

        {/* FILTER CARD */}

        <div className="rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {/* DATE FROM */}

            <div className="min-w-0">
              <Einput
                title="Date from"
                name="dateFrom"
                type="date"
                value={dateFrom}
                handleInputChange={(name: string, value: string) =>
                  setDateFrom(value)
                }
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
                handleInputChange={(name: string, value: string) =>
                  setDateTo(value)
                }
                className="h-[40px] w-full"
              />
            </div>

            {/* BRANCH */}

            <div className="min-w-0">
              <Eselect
                title="Branch"
                name="branch"
                option={branchOptions}
                initialValue={branch}
                handleInputChange={(name: string, value: any) =>
                  setBranch(String(value || ""))
                }
                className="h-[40px] w-full"
              />
            </div>

            {/* STATUS */}

            <div className="min-w-0">
              <Eselect
                title="Status"
                name="status"
                option={statusOptions}
                initialValue={status}
                handleInputChange={(name: string, value: any) =>
                  setStatus(String(value || ""))
                }
                className="h-[40px] w-full"
              />
            </div>

            {/* EMPLOYEE SEARCH */}

            <div className="min-w-0">
              <Einput
                title="Emp code / name"
                name="employeeSearch"
                type="text"
                value={employeeSearch}
                handleInputChange={(name: string, value: string) =>
                  setEmployeeSearch(value)
                }
                className="h-[40px] w-full"
                placeholder="Optional"
              />
            </div>

            {/* SHOW BUTTON */}

            <div className="min-w-0">
              <AButton
                type="button"
                onClick={fetchReport}
                disabled={loading || masterLoading}
                className="inline-flex h-[40px] w-full items-center justify-center gap-2 rounded-lg bg-[#4f46e5] px-5 text-[13px] font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Show
              </AButton>
            </div>
          </div>
        </div>

        {/* REPORT TABLE CARD */}

        <div className="min-w-0 overflow-hidden rounded-xl border border-[#dce5f1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900">
          {/* TOOLBAR */}

          <div className="flex min-w-0 flex-col gap-3 border-b border-[#e8edf5] p-3.5 dark:border-slate-700 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex shrink-0 items-center gap-3">
              <p className="text-[13px] font-medium text-[#64748b] dark:text-slate-400">
                {hasSearched ? (
                  <>
                    <span className="font-semibold text-[#152b4b] dark:text-slate-100">
                      {filteredRows.length}
                    </span>{" "}
                    of {rows.length} rows
                  </>
                ) : (
                  "Not loaded yet"
                )}
              </p>
            </div>
          </div>

          {/* COLUMN FILTER PANEL */}

          {showColumnFilters && hasSearched && (
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
                {columnFilters.map(([key, label]: any) => (
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
                      placeholder={`Search ${String(label).toLowerCase()}`}
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
                    showExcelExport={true}
                    showTopSearch={true}
                    resetFilters={true}
                    showPageSizeInFooter={true}
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
              <div className="mb-3 text-4xl">📄</div>

              <h3 className="text-[15px] font-semibold text-[#152b4b] dark:text-slate-200">
                Set filters and click Show
              </h3>

              <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
                Document approval tracking records will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
