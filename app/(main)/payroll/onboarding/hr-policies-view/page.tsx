"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Eye,
  FileImage,
  FileText,
  Bell,
  Download,
  RotateCcw,
  Trash2,
} from "lucide-react";

import Swal from "sweetalert2";
import axios from "axios";
import FileViewer from "@/components/atoms/FileviewerBank";
import HashloaderComponent from "@/components/Templates/hashloader";
import ServiceTablePagination from "@/components/Templates/reacttable";
import AButton from "@/components/atoms/Button";

import { useCurrentUser } from "@/app/hooks/use-current-user";

type PolicyRow = {
  Utd?: number | string;
  UTD?: number | string;
  SRNO?: number | string;
  srno?: number | string;
  SR_NO?: number | string;
  TRAN_ID?: number | string;
  tran_id?: number | string;
  Tran_Id?: number | string;
  TRANID?: number | string;

  RefId?: string | number;
  Doc_Type?: string | number;
  DocType?: string;
  DocTypeName?: string;
  DocumentType?: string;
  Keywords?: string;

  UploadedByName?: string;
  UploadedBy?: string;
  uploadedBy?: string;
  createdBy?: string;

  CreatedNewDate?: string;
  CreatedAt?: string;
  createdAt?: string;

  OriginalName?: string;
  DOC_NAME?: string;
  Doc_Name?: string;
  doc_name?: string;
  DOCUMENT_NAME?: string;
  FILE_NAME?: string;
  FileName?: string;
  filename?: string;
  name?: string;

  SMBPath?: string;
  DOC_PATH?: string;
  path?: string;

  Category?: string;
  CATEGORY?: string;
  Version?: string;
  VERSION?: string;

  AcknowledgedCount?: number;
  Acknowledged?: number;
  ReadCount?: number;
  EmployeeCount?: number;
  TotalEmployees?: number;
  TotalEmployee?: number;

  [key: string]: any;
};

export default function Page() {
  const user = useCurrentUser();

  // =========================================================
  // STATES
  // =========================================================

  const [tabledata, setTabledata] = useState<PolicyRow[]>([]);
  const [displayedFiles, setDisplayedFiles] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewFileName, setPreviewFileName] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
const [previewError, setPreviewError] = useState(false);
const [previewBlobUrl, setPreviewBlobUrl] = useState("");

  // =========================================================
  // FILTERS
  // =========================================================

  const [documentNameFilter, setDocumentNameFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [versionFilter, setVersionFilter] = useState("");
  const [docReference, setDocReference] = useState("");
  const [uploadedBy, setUploadedBy] = useState("");

  // =========================================================
  // API CONFIGURATION
  // =========================================================

  const API_URL = process.env.NEXT_PUBLIC_URL;

  const getApiHeaders = useCallback(
    () => ({
      compcode: user?.Comp_Code,
      name: user?.name,
    }),
    [user?.Comp_Code, user?.name],
  );

  // =========================================================
  // ALERT
  // =========================================================

  const showSideAlert = useCallback(
    (message: string, type: "success" | "error" | "warn" | "info" = "info") => {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon:
          type === "warn"
            ? "warning"
            : type === "error"
              ? "error"
              : type === "success"
                ? "success"
                : "info",
        title: message,
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
      });
    },
    [],
  );

  // =========================================================
  // HELPER: FIRST NON-EMPTY VALUE
  // =========================================================

  const getFirstValue = useCallback((...values: any[]) => {
    return values.find(
      (value) =>
        value !== null && value !== undefined && String(value).trim() !== "",
    );
  }, []);

  // =========================================================
  // DOCUMENT NAME
  // =========================================================

  const getDocumentName = useCallback(
    (row: PolicyRow) => {
      const value = getFirstValue(
        row?.File_Name, // Actual API field
        row?.file_name,
        row?.FILE_NAME,
        row?.OriginalName,
        row?.ORIGINAL_NAME,
        row?.originalName,
        row?.DOC_NAME,
        row?.Doc_Name,
        row?.doc_name,
        row?.DOCUMENT_NAME,
        row?.FileName,
        row?.filename,
        row?.fileName,
        row?.DocumentName,
        row?.documentName,
        row?.NAME,
        row?.Name,
        row?.name,
      );

      if (value == null) return "";

      const name = String(value).trim();

      if (!name || name.toLowerCase() === "untitled policy") {
        return "";
      }

      return name;
    },
    [getFirstValue],
  );

  // =========================================================
  // DOCUMENT PATH
  // Supports complete path or folder path + filename
  // =========================================================
  const getDocumentPath = useCallback(
    (row: PolicyRow) => {
      const rawPath = String(
        getFirstValue(
          row?.SMBPath,
          row?.smbpath,
          row?.DOC_PATH,
          row?.doc_path,
          row?.path,
          row?.FilePath,
          row?.filePath,
          row?.FILE_PATH,
          row?.file_path,
        ) ?? "",
      )
        .trim()
        .replace(/\\/g, "/")
        .replace(/\/+$/, "");

      const fileName = getDocumentName(row).replace(/\\/g, "/").trim();

      if (!rawPath) {
        console.error("Document folder path is missing:", row);
        return "";
      }

      if (!fileName) {
        console.error("Document filename is missing:", row);
        return "";
      }

      // Avoid adding the filename twice.
      const lastSegment = rawPath.split("/").pop() || "";

      if (lastSegment.toLowerCase() === fileName.toLowerCase()) {
        return rawPath;
      }

      return `${rawPath}/${fileName}`;
    },
    [getDocumentName, getFirstValue],
  );

  // =========================================================
  // DOCUMENT URL
  // =========================================================

  const getDocumentUrl = useCallback(
    (row: PolicyRow) => {
      const filePath = getDocumentPath(row);

      if (!filePath) return "";

      const url = new URL("https://erp.autovyn.com/backend/fetch");
      url.searchParams.set("filePath", filePath);

      return url.toString();
    },
    [getDocumentPath],
  );

  // =========================================================
  // FETCH PUBLISHED POLICIES
  // GET /Payrollpolicies/PayrollPolicies
  // =========================================================

  const ShowData = useCallback(async () => {
    if (!user?.Comp_Code) return;

    if (!API_URL) {
      console.error("NEXT_PUBLIC_URL is not configured.");
      showSideAlert("API URL is not configured.", "error");
      return;
    }

    setIsLoading(true);

    try {
      const result = await axios.get(
        `${API_URL}/Payrollpolicies/PayrollPolicies`,
        {
          headers: getApiHeaders(),
        },
      );

      console.log("HR POLICIES API RESPONSE:", result.data);

      const responseData = result?.data;

      const policies: PolicyRow[] = Array.isArray(responseData?.Result)
        ? responseData.Result
        : Array.isArray(responseData?.data?.Result)
          ? responseData.data.Result
          : Array.isArray(responseData?.result?.Result)
            ? responseData.result.Result
            : Array.isArray(responseData?.data)
              ? responseData.data
              : Array.isArray(responseData?.result)
                ? responseData.result
                : Array.isArray(responseData)
                  ? responseData
                  : [];

      setTabledata(policies);
      setCurrentPage(1);
    } catch (error: any) {
      console.error(
        "Error fetching HR policies:",
        error?.response?.data ?? error,
      );

      setTabledata([]);

      showSideAlert(
        error?.response?.data?.message || "Unable to load published policies.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [API_URL, getApiHeaders, showSideAlert, user?.Comp_Code]);

  // =========================================================
  // AUTO LOAD
  // =========================================================

  useEffect(() => {
    if (user?.Comp_Code) {
      void ShowData();
    }
  }, [user?.Comp_Code, ShowData]);

  // =========================================================
  // INSERT POLICY VIEW / DOWNLOAD LOG
  // POST /Payrollpolicies/insertPolicyLog
  // =========================================================

  const insertPolicyLog = useCallback(
    async (row: PolicyRow, viewFlag: "1" | "2") => {
      if (!API_URL) {
        throw new Error("NEXT_PUBLIC_URL is not configured.");
      }

      if (!row) {
        throw new Error("Policy row data is missing.");
      }

      // Keep transaction ID and serial number separate.
      // Do not use SRNO as tran_id unless the backend confirms
      // that both fields represent the same identifier.
      const tranId = getFirstValue(
        row?.TRAN_ID,
        row?.tran_id,
        row?.Tran_Id,
        row?.TRANID,
        row?.TranId,
        row?.Utd,
        row?.UTD,
      );

      const srNo = getFirstValue(
        row?.SRNO,
        row?.srno,
        row?.SR_NO,
        row?.SrNo,
        row?.Srno,
      );

      const empCode = getFirstValue(
        user?.EMPCODE,
        user?.EmpCode,
        user?.emp_code,
        user?.EMP_CODE,
      );

      const locCode = getFirstValue(
        user?.branch,
        user?.Loc_Code,
        user?.LOC_CODE,
        user?.loc_code,
      );

      const docName = getDocumentName(row);

      const payload = {
        tran_id: tranId,
        srno: srNo,
        emp_code: empCode,
        doc_name: docName,
        loc_code: locCode,
        view_flag: viewFlag,
      };

      console.log("Policy log payload:", payload);
      console.log("Original policy row:", row);

      const missingFields: string[] = [];

      if (
        tranId === null ||
        tranId === undefined ||
        String(tranId).trim() === ""
      ) {
        missingFields.push("tran_id");
      }

      if (srNo === null || srNo === undefined || String(srNo).trim() === "") {
        missingFields.push("srno");
      }

      if (
        empCode === null ||
        empCode === undefined ||
        String(empCode).trim() === ""
      ) {
        missingFields.push("emp_code");
      }

      if (
        locCode === null ||
        locCode === undefined ||
        String(locCode).trim() === ""
      ) {
        missingFields.push("loc_code");
      }

      if (!docName || docName === "Untitled policy") {
        missingFields.push("doc_name");
      }

      if (viewFlag !== "1" && viewFlag !== "2") {
        missingFields.push("view_flag");
      }

      if (missingFields.length > 0) {
        console.error("Missing policy log fields:", missingFields);

        throw new Error(
          `Policy log fields missing: ${missingFields.join(", ")}. Check the original PayrollPolicies API response.`,
        );
      }

      const response = await axios.post(
        `${API_URL}/Payrollpolicies/insertPolicyLog`,
        payload,
        {
          headers: getApiHeaders(),
        },
      );

      console.log("Policy log API response:", response.data);

      if (response.data?.Status === false || response.data?.success === false) {
        throw new Error(
          response.data?.Message ||
            response.data?.message ||
            "Failed to insert policy log.",
        );
      }

      return response.data;
    },
    [
      API_URL,
      getApiHeaders,
      getDocumentName,
      getFirstValue,
      user?.EMPCODE,
      user?.EmpCode,
      user?.emp_code,
      user?.EMP_CODE,
      user?.branch,
      user?.Loc_Code,
      user?.LOC_CODE,
      user?.loc_code,
    ],
  );

  // =========================================================
  // TABLE DATA MAPPING
  // =========================================================

  const mapDocumentData = useCallback(
    (data: PolicyRow[]) => {
      return (data || []).map((item, index) => {
        const acknowledgement =
          Number(
            item.AcknowledgedCount ?? item.Acknowledged ?? item.ReadCount ?? 0,
          ) || 0;

        const employeeCount =
          Number(
            item.EmployeeCount ??
              item.TotalEmployees ??
              item.TotalEmployee ??
              486,
          ) || 486;

        const name = getDocumentName(item) || "Untitled policy";

        const category =
          item.Category ??
          item.CATEGORY ??
          item.DocTypeName ??
          item.DocType ??
          "General";

        const tranId = getFirstValue(
          item.TRAN_ID,
          item.tran_id,
          item.Tran_Id,
          item.TRANID,
          item.TranId,
          item.Utd,
          item.UTD,
        );

        const srNo = getFirstValue(
          item.SRNO,
          item.srno,
          item.SR_NO,
          item.SrNo,
          item.Srno,
        );

        return {
          ...item,

          srNo: srNo ?? index + 1,

          refType:
            item.DocTypeName ??
            item.DocType ??
            item.DocumentType ??
            item.Doc_Type ??
            "",

          refNo: item.RefId ?? "",
          Keywords: item.Keywords ?? "",
          RefId: item.RefId ?? "",

          uploadedBy:
            item.UploadedByName ??
            item.UploadedBy ??
            item.uploadedBy ??
            item.createdBy ??
            "",

          uploadedAt:
            item.CreatedNewDate ?? item.CreatedAt ?? item.createdAt ?? "",

          name,

          SMBPath:
            item.SMBPath ??
            item.smbpath ??
            item.DOC_PATH ??
            item.doc_path ??
            item.path ??
            "",

          Utd: item.Utd ?? item.UTD,
          TRAN_ID: tranId,
          SRNO: srNo,

          Doc_Type: item.Doc_Type ?? item.DocType ?? "",

          Category: category,
          Version: item.Version ?? item.VERSION ?? "v1.0",

          Acknowledged: acknowledgement,
          EmployeeCount: employeeCount,

          AcknowledgementPercent:
            employeeCount > 0
              ? Math.min(
                  100,
                  Math.round((acknowledgement / employeeCount) * 100),
                )
              : 0,
        };
      });
    },
    [getDocumentName, getFirstValue],
  );

  // =========================================================
  // FILTER + PAGINATION
  // =========================================================

  useEffect(() => {
    let rows = [...(tabledata || [])];

    if (documentNameFilter.trim()) {
      const search = documentNameFilter.trim().toLowerCase();

      rows = rows.filter((item) =>
        getDocumentName(item).toLowerCase().includes(search),
      );
    }

    if (categoryFilter.trim()) {
      const search = categoryFilter.trim().toLowerCase();

      rows = rows.filter((item) => {
        const value =
          item.Category ??
          item.CATEGORY ??
          item.DocTypeName ??
          item.DocType ??
          "";

        return String(value).toLowerCase().includes(search);
      });
    }

    if (versionFilter.trim()) {
      const search = versionFilter.trim().toLowerCase();

      rows = rows.filter((item) => {
        const value = item.Version ?? item.VERSION ?? "";

        return String(value).toLowerCase().includes(search);
      });
    }

    if (docReference.trim()) {
      const search = docReference.trim().toLowerCase();

      rows = rows.filter((item) => {
        const value =
          item.DocTypeName ??
          item.DocType ??
          item.DocumentType ??
          item.Doc_Type ??
          item.RefId ??
          "";

        return String(value).toLowerCase().includes(search);
      });
    }

    if (uploadedBy.trim()) {
      const search = uploadedBy.trim().toLowerCase();

      rows = rows.filter((item) => {
        const value =
          item.UploadedByName ??
          item.UploadedBy ??
          item.uploadedBy ??
          item.createdBy ??
          "";

        return String(value).toLowerCase().includes(search);
      });
    }

    if (searchInput.trim()) {
      const search = searchInput.trim().toLowerCase();

      rows = rows.filter((item) => {
        const values = [
          item.Utd,
          item.UTD,
          item.TRAN_ID,
          item.tran_id,
          item.SRNO,
          item.srno,
          item.DocTypeName,
          item.DocType,
          item.DocumentType,
          item.Doc_Type,
          item.RefId,
          item.Keywords,
          item.UploadedByName,
          item.UploadedBy,
          item.uploadedBy,
          item.createdBy,
          item.CreatedNewDate,
          item.CreatedAt,
          getDocumentName(item),
          item.SMBPath,
          item.DOC_PATH,
          item.Category,
          item.CATEGORY,
          item.Version,
          item.VERSION,
        ];

        return values.some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(search),
        );
      });
    }

    const mappedRows = mapDocumentData(rows);

    setTotalCount(mappedRows.length);

    const size = pageSize === -1 ? Math.max(mappedRows.length, 1) : pageSize;

    const start = (currentPage - 1) * size;
    const end = start + size;

    const paginatedRows =
      pageSize === -1 ? mappedRows : mappedRows.slice(start, end);

    setDisplayedFiles(paginatedRows);
  }, [
    tabledata,
    searchInput,
    docReference,
    uploadedBy,
    documentNameFilter,
    categoryFilter,
    versionFilter,
    currentPage,
    pageSize,
    getDocumentName,
    mapDocumentData,
  ]);

  // =========================================================
  // RESET FILTERS
  // =========================================================

  const handleReset = useCallback(() => {
    setDocumentNameFilter("");
    setCategoryFilter("");
    setVersionFilter("");
    setDocReference("");
    setUploadedBy("");
    setSearchInput("");
    setCurrentPage(1);
  }, []);

  // =========================================================
  // DELETE ROW
  // No delete endpoint was provided.
  // =========================================================

  const handleDelete = useCallback(
    async (row: any) => {
      const result = await Swal.fire({
        title: "Delete policy?",
        text: row?.name
          ? `"${row.name}" will be removed from this view.`
          : "This policy will be removed from this view.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#e11d48",
      });

      if (!result.isConfirmed) return;

      showSideAlert("Delete API is not connected yet.", "info");
    },
    [showSideAlert],
  );

  // =========================================================
  // NOTIFY
  // No notification endpoint was provided.
  // =========================================================

  const handleNotify = useCallback(
    (row: any) => {
      showSideAlert(
        `Acknowledgement notification for ${row?.name || "policy"} is ready.`,
        "info",
      );
    },
    [showSideAlert],
  );

  // =========================================================
  // OPEN DOCUMENT
  // Log view and open document in a new tab.
  // =========================================================


const handleOpenDocument = async (row: PolicyRow) => {
  const url = getDocumentUrl(row);
  const fileName = getDocumentName(row);

  if (!url || !fileName) {
    showSideAlert("Document path or filename is missing.", "error");
    return;
  }

  setPreviewError("");
  setPreviewLoading(false);
  setPreviewFileName(fileName);
  setPreviewUrl(url);
  setIsPreviewOpen(true);

  try {
    await insertPolicyLog(row, "1");
  } catch (error: any) {
    console.error(
      "Policy view log error:",
      error?.response?.data ?? error,
    );
  }
};

  // =========================================================
  // DOWNLOAD DOCUMENT
  // Log download, fetch blob, then download.
  // =========================================================

  const handleViewFileDownload = useCallback(
    async (row: PolicyRow) => {
      const url = getDocumentUrl(row);

      if (!url) {
        showSideAlert("Document path is not available.", "warn");
        return;
      }

      const fileName = getDocumentName(row) || "policy";

      setIsLoading(true);

      try {
        await insertPolicyLog(row, "2");

        const response = await axios.get(url, {
          responseType: "blob",
        });

        const blobUrl = window.URL.createObjectURL(new Blob([response.data]));

        const link = document.createElement("a");

        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();

        window.setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 1000);

        showSideAlert("Document downloaded successfully.", "success");
      } catch (error: any) {
        console.error("Policy download error:", error?.response?.data ?? error);

        showSideAlert(
          error?.response?.data?.message ||
            error?.message ||
            "Unable to download document.",
          "error",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [getDocumentName, getDocumentUrl, insertPolicyLog, showSideAlert],
  );

  // =========================================================
  // TABLE COLUMNS
  // =========================================================

  const columns = useMemo(
    () => [
      {
        Header: "SR NO.",
        accessor: "srNo",

        Cell: ({ value }: any) => (
          <span className="whitespace-nowrap text-[12px] font-[500] text-slate-500 dark:text-slate-400">
            {value ?? "—"}
          </span>
        ),
      },


     {
         Header: "DOCUMENT NAME",
         accessor: "name",
         Cell: ({ row, value }: any) => {
           const extension = String(row.original?.File_Name || value || "")
             .split(".")
             .pop()
             ?.toLowerCase();
           const isImage = ["jpg", "jpeg", "png", "webp"].includes(
             extension || "",
           );
           return (
             <div className="flex min-w-[220px] items-center gap-3">
               <div
                 className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] ${isImage ? "bg-sky-50 text-sky-500 dark:bg-sky-950/40" : "bg-rose-50 text-rose-500 dark:bg-rose-950/40"}`}
               >
                 {isImage ? <FileImage size={16} /> : <FileText size={16} />}
               </div>
               <div className="min-w-0">
                 <button
                   type="button"
                   onClick={() => handleOpenDocument(row.original)}
                   className="max-w-[300px] truncate text-left text-[12.5px] font-[600] text-slate-800 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
                 >
                   {value || "Untitled policy"}
                 </button>
               </div>
             </div>
           );
         },
       },

 
      {
        Header: "CATEGORY",
        accessor: "Category",

        Cell: ({ value }: any) => (
          <span className="whitespace-nowrap text-[12px] text-slate-700 dark:text-slate-300">
            {value || "General"}
          </span>
        ),
      },

      {
        Header: "VERSION",
        accessor: "Version",

        Cell: ({ value }: any) => (
          <span className="whitespace-nowrap text-[12px] text-slate-500 dark:text-slate-400">
            {value || "v1.0"}
          </span>
        ),
      },


      {
        Header: "ACKNOWLEDGED",
        accessor: "AcknowledgementPercent",

        Cell: ({ row }: any) => {
          const item = row.original;

          const percent = item.AcknowledgementPercent ?? 0;
          const acknowledged = item.Acknowledged ?? 0;
          const employees = item.EmployeeCount ?? 486;

          let barClass = "bg-emerald-500";
          let textClass = "text-emerald-600 dark:text-emerald-400";

          if (percent < 60) {
            barClass = "bg-rose-500";
            textClass = "text-rose-600 dark:text-rose-400";
          } else if (percent < 85) {
            barClass = "bg-orange-500";
            textClass = "text-orange-600 dark:text-orange-400";
          }

          return (
            <div className="flex min-w-[175px] items-center gap-3">
              <div className="h-[5px] w-[90px] overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 sm:w-[110px]">
                <div
                  className={`h-full rounded-full ${barClass}`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              <span
                className={`whitespace-nowrap text-[11px] font-[600] ${textClass}`}
              >
                {acknowledged} / {employees}
              </span>
            </div>
          );
        },
      },

      
  {
    Header: "View Document",
    accessor: "File_Name",
    Cell: ({ row }: any) => {
      const policy = row.original;

      return (
        <FileViewer
          fileLink={getDocumentUrl(policy)}
          celldata="View Document"
          Title={getDocumentName(policy)}
        />
      );
    },
  },

      {
        Header: "Delete",
        accessor: "Delete",

        Cell: ({ row }: any) => {
          const item = row.original;

          return (
            <div className="flex items-center gap-1.5">
              {/* <button
                type="button"
                title="View document"
                onClick={() => handleOpenDocument(item)}
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px] border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-indigo-950/40"
              >
                <Eye size={15} />
              </button> */}

              {/* <button
                type="button"
                title="Download document"
                onClick={() => handleViewFileDownload(item)}
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px] border border-slate-200 bg-white text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-emerald-950/40"
              >
                <Download size={15} />
              </button> */}

              {/* <button
                type="button"
                title="Send acknowledgement"
                onClick={() => handleNotify(item)}
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px] border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-indigo-950/40"
              >
                <Bell size={15} />
              </button> */}

              <button
                type="button"
                title="Delete"
                onClick={() => handleDelete(item)}
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px] border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-rose-950/40"
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        },
      },
    ],
    [handleDelete, handleNotify, handleOpenDocument, handleViewFileDownload],
  );

  // =========================================================
  // STATISTICS
  // =========================================================

  const publishedPolicies = tabledata.length;
  const totalEmployees = 486;

  const totalAcknowledged = tabledata.reduce(
    (sum: number, item: PolicyRow) =>
      sum +
      Number(
        item.AcknowledgedCount ?? item.Acknowledged ?? item.ReadCount ?? 0,
      ),
    0,
  );

  const averageAcknowledgement =
    publishedPolicies > 0
      ? Math.round(
          (totalAcknowledged / (publishedPolicies * totalEmployees)) * 100,
        )
      : 0;

  const fullyAcknowledged = tabledata.filter((item: PolicyRow) => {
    const acknowledged = Number(
      item.AcknowledgedCount ?? item.Acknowledged ?? item.ReadCount ?? 0,
    );

    return acknowledged >= totalEmployees;
  }).length;

  // Keep the statistics available if they're needed elsewhere.
  void averageAcknowledgement;
  void fullyAcknowledged;

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
  // EXPORT CSV
  // =========================================================

  const handleExport = useCallback(() => {
    try {
      const rows = displayedFiles.map((file, index) => ({
        "SR NO":
          (currentPage - 1) *
            (pageSize === -1 ? displayedFiles.length : pageSize) +
          index +
          1,

        "DOCUMENT NAME": file.name || "",
        CATEGORY: file.Category || "",
        VERSION: file.Version || "",
        UPLOADED: file.uploadedAt || "",

        ACKNOWLEDGED: `${file.Acknowledged ?? 0} / ${
          file.EmployeeCount ?? totalEmployees
        }`,
      }));

      if (!rows.length) {
        showSideAlert("No documents available to export.", "warn");
        return;
      }

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
      ].join("\n");

      const blob = new Blob(["\uFEFF", csv], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "HR_Policies.csv";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      showSideAlert("Export failed.", "error");
    }
  }, [currentPage, displayedFiles, pageSize, showSideAlert]);

  // =========================================================
  // UI
  // =========================================================

  return (
    <div
      className="
        min-h-screen
        w-full
        overflow-x-hidden
        bg-[#F8FAFC]
        px-[8px]
        py-[10px]
        text-slate-800
        dark:bg-[#070D18]
        dark:text-slate-100
        sm:px-[14px]
        sm:py-[14px]
        lg:px-[16px]
      "
    >
      {/* PAGE HEADER */}

      <div
        className="
          mb-[15px]
          flex
          flex-col
          gap-3
          sm:flex-row
          sm:items-start
          sm:justify-between
        "
      >
        <div className="min-w-0">
          <h1
            className="
              m-0
              text-[20px]
              font-[700]
              tracking-[-0.02em]
              text-slate-900
              dark:text-white
              sm:text-[22px]
            "
          >
            HR Policies View
          </h1>

          <p
            className="
              mt-[3px]
              max-w-[850px]
              text-[12px]
              leading-[18px]
              text-slate-500
              dark:text-slate-400
            "
          >
            The read-only library employees see — open or download any published
            policy.
          </p>
        </div>

        <div
          className="
            flex
            w-full
            flex-col
            gap-2
            sm:w-auto
            sm:flex-row
          "
        >
          <AButton
            type="button"
            onClick={handleReset}
            className="
              inline-flex
              h-[38px]
              w-full
              items-center
              justify-center
              gap-2
              rounded-[9px]
              border
              border-slate-200
              bg-white
              px-[14px]
              text-[12px]
              font-[600]
              text-slate-700
              shadow-sm
              transition
              hover:bg-slate-50
              dark:border-slate-700
              dark:bg-[#0F172A]
              dark:text-slate-200
              dark:hover:bg-slate-800
              sm:w-auto
            "
          >
            <RotateCcw size={14} />
            Reset filters
          </AButton>

          <AButton
            type="button"
            onClick={handleExport}
            className="
              inline-flex
              h-[38px]
              w-full
              items-center
              justify-center
              gap-2
              rounded-[9px]
              bg-indigo-600
              px-[14px]
              text-[12px]
              font-[600]
              text-white
              shadow-sm
              transition
              hover:bg-indigo-700
              sm:w-auto
            "
          >
            <Download size={15} />
            Export to Excel
          </AButton>
        </div>
      </div>

      {/* PUBLISHED POLICIES */}

      <div
        className="
          w-full
          overflow-hidden
          rounded-[12px]
          border
          border-slate-200
          bg-white
          shadow-[0_1px_3px_rgba(15,23,42,0.04)]
          dark:border-slate-800
          dark:bg-[#0D1524]
        "
      >
        {/* TABLE HEADER */}

        <div
          className="
            flex
            min-h-[58px]
            flex-col
            gap-3
            border-b
            border-slate-200
            px-[14px]
            py-[10px]
            sm:flex-row
            sm:items-center
            sm:px-[18px]
            dark:border-slate-800
          "
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2
                className="
                  m-0
                  text-[14px]
                  font-[700]
                  text-slate-800
                  dark:text-white
                "
              >
                Published policies
              </h2>

              <span
                className="
                  text-[11px]
                  text-slate-500
                  dark:text-slate-400
                "
              >
                {totalCount} of {tabledata.length} rows
              </span>
            </div>
          </div>

          <div className="hidden flex-1 sm:block" />
        </div>

        {/* SERVICE TABLE */}

        <div
          className="
            w-full
            min-w-0
            overflow-x-auto
            overflow-y-hidden
          "
        >
          <div className="min-w-[980px]">
            <ServiceTablePagination
              title=""
              columns={columns}
              data={displayedFiles}
              height={520}
              serverMode={true}
              serverPagination={serverPagination}
              showPageSizeInFooter={true}
              showTopSearch={false}
              searchValue={searchInput}
              onSearchChange={(val: string) => {
                setSearchInput(val);
                setCurrentPage(1);
              }}
              searchPlaceholder="Search policies..."
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
 
      </div>

      {/* LOADER */}

      {isLoading && <HashloaderComponent isLoading={isLoading} />}
    </div>
  );
}
