"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BookOpen,
  CheckCircle2,
  Eye,
  FileImage,
  FileText,
  Paperclip,
  Plus,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Bell,
  X,
  Download,
} from "lucide-react";
import Swal from "sweetalert2";
import axios from "axios";
import DocumentFileUpload from "@/components/atoms/Documentupload";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";
import ServiceTablePagination from "@/components/Templates/reacttable";
import FileViewer from "@/components/atoms/FileviewerBank";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";

type PolicyRow = Record<string, any>;

export default function Page() {
  const user = useCurrentUser();
  const API_URL = process.env.NEXT_PUBLIC_URL;

  const getCurrentDate = (monthsBack = 0) => {
    const today = new Date();
    if (monthsBack > 0) today.setMonth(today.getMonth() - monthsBack);
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  };

  const [dates, setDates] = useState({
    DATE_FROM: getCurrentDate(1),
    DATE_TO: getCurrentDate(),
  });
  const [displayedFiles, setDisplayedFiles] = useState<PolicyRow[]>([]);
  const [tabledata, setTabledata] = useState<PolicyRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [docReference, setDocReference] = useState("");
  const [uploadedBy, setUploadedBy] = useState("");
  const [policyName, setPolicyName] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [category, setCategory] = useState("Code of conduct");
  const [version, setVersion] = useState("v1.0");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showSideAlert = (
    message: string,
    type: "success" | "error" | "warn" | "info" = "info",
  ) => {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: type === "warn" ? "warning" : type,
      title: message,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
    });
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewName(null);
  };

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handlePreview = () => {
    if (!selectedFile) {
      showSideAlert("Please choose a PDF or image first.", "warn");
      return;
    }
    setPreviewUrl((current) => current || URL.createObjectURL(selectedFile));
    setPreviewName(selectedFile.name);
    setPreviewOpen(true);
  };

 
const handleOpenDocument = (row: PolicyRow) => {
  const fileName = String(
    row?.File_Name ||
      row?.OriginalName ||
      row?.DOC_NAME ||
      row?.name ||
      ""
  ).trim();

  const folderPath = String(
    row?.SMBPath ||
      row?.DOC_PATH ||
      row?.path ||
      ""
  )
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/, "");

  if (!folderPath || !fileName) {
    showSideAlert("Document path or filename is missing.", "warn");
    return;
  }

  const fullPath = folderPath.toLowerCase().endsWith(
    `/${fileName}`.toLowerCase()
  )
    ? folderPath
    : `${folderPath}/${fileName}`;

  const url = new URL("https://erp.autovyn.com/backend/fetch");
  url.searchParams.set("filePath", fullPath);

  setPreviewName(fileName);
  setPreviewUrl(url.toString());
  setPreviewOpen(true);
};

  const ShowData = useCallback(async () => {
    if (!user?.Comp_Code || !API_URL) return;

    try {
      setIsLoading(true);
      const response = await axios.get(
        `${API_URL}/Payrollpolicies/PayrollPolicies`,
        {
          headers: {
            compcode: user.Comp_Code,
            name: user?.name || "",
          },
        },
      );

      const result = response?.data?.Result;
      setTabledata(Array.isArray(result) ? result : []);
    } catch (error: any) {
      console.error("Load policies error:", error);
      showSideAlert(
        error?.response?.data?.Message || "Unable to load policies.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [API_URL, user?.Comp_Code, user?.name]);

  useEffect(() => {
    if (user?.Comp_Code) void ShowData();
  }, [user?.Comp_Code, ShowData]);

  const handlePublish = async () => {
    if (!policyName.trim()) {
      showSideAlert("Please enter document name.", "warn");
      return;
    }
    if (!selectedFile) {
      showSideAlert("Please choose a PDF or image.", "warn");
      return;
    }
    if (!user?.Comp_Code || !API_URL) {
      showSideAlert(
        "Company information or API URL is not available.",
        "error",
      );
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append("compcode", user?.EMPCODE || "");
      formData.append("userName", user?.name || "");
      formData.append("Doc_Name", policyName.trim());
      formData.append("Doc_Image", selectedFile);

      // The existing upload endpoint documents Doc_Name and Doc_Image.
      // Category/version are kept in the UI but require backend support to persist.
      const response = await axios.post(
        `${API_URL}/PayrollPolicies/uploadPayrollPolicies`,
        formData,
        {
          headers: {
            compCode: user.Comp_Code,
            name: user?.name || "",
          },
        },
      );

      if (response?.data?.Status === true) {
        showSideAlert(
          response?.data?.Message || "Policy published successfully.",
          "success",
        );
        setPolicyName("");
        setCategory("Code of conduct");
        setVersion("v1.0");
        clearSelectedFile();
        setCurrentPage(1);
        await ShowData();
      } else {
        showSideAlert(
          response?.data?.Message || "Unable to publish policy.",
          "error",
        );
      }
    } catch (error: any) {
      console.error("Publish policy error:", error);
      showSideAlert(
        error?.response?.data?.Message || "Unable to publish policy.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (row: PolicyRow) => {
    const tranId = row?.tran_id ?? row?.TRAN_ID ?? row?.Utd ?? row?.SRNO;
    if (!tranId) {
      showSideAlert("Policy transaction ID is not available.", "warn");
      return;
    }

    const confirmation = await Swal.fire({
      title: "Delete policy?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });
    if (!confirmation.isConfirmed) return;

    try {
      setIsLoading(true);
      const response = await axios.post(
        `${API_URL}/Payrollpolicies/removePolicy`,
        {
          Loc_code: user?.branch,
          userName: user?.name || "",
          tran_id: tranId,
        },
        {
          headers: {
            compcode: user?.Comp_Code || "",
            name: user?.name || "",
          },
        },
      );

      if (response?.data?.Status === true) {
        showSideAlert(
          response?.data?.Message || "Policy deleted successfully.",
          "success",
        );
        await ShowData();
      } else {
        showSideAlert(
          response?.data?.Message || "Unable to delete policy.",
          "error",
        );
      }
    } catch (error: any) {
      console.error("Delete policy error:", error);
      showSideAlert(
        error?.response?.data?.Message || "Unable to delete policy.",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotify = (row: PolicyRow) => {
    // No notification endpoint was included in the supplied API code.
    showSideAlert(
      `No acknowledgement notification API is configured for ${row?.name || "this policy"}.`,
      "info",
    );
  };

  const mapDocumentData = (data: PolicyRow[]) =>
    (data || []).map((item, index) => {
      const acknowledged =
        Number(
          item.AcknowledgedCount ?? item.Acknowledged ?? item.ReadCount ?? 0,
        ) || 0;
      const employeeCount =
        Number(
          item.EmployeeCount ?? item.TotalEmployees ?? item.TotalEmployee ?? 0,
        ) || 0;
      const name =
        item.Doc_Name ??
        item.OriginalName ??
        item.File_Name ??
        item.DOC_NAME ??
        item.name ??
        "Untitled policy";

      return {
        ...item,
        srNo: item.Utd ?? item.SRNO ?? item.tran_id ?? index + 1,
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
          item.userName ??
          "",
        uploadedAt:
          item.Upload_Date ??
          item.CreatedNewDate ??
          item.CreatedAt ??
          item.createdAt ??
          "",
        name,
        SMBPath: item.SMBPath ?? item.DOC_PATH ?? "",
        File_Name: item.File_Name ?? item.OriginalName ?? item.DOC_NAME ?? name,
        TRAN_ID: item.TRAN_ID ?? item.Utd ?? item.tran_id,
        Utd: item.Utd ?? item.tran_id,
        tran_id: item.tran_id ?? item.TRAN_ID ?? item.Utd,
        Category:
          item.Category ??
          item.CATEGORY ??
          item.DocTypeName ??
          item.DocType ??
          "General",
        Version: item.Version ?? item.VERSION ?? "v1.0",
        Acknowledged: acknowledged,
        EmployeeCount: employeeCount,
        AcknowledgementPercent:
          employeeCount > 0
            ? Math.min(100, Math.round((acknowledged / employeeCount) * 100))
            : 0,
      };
    });

  useEffect(() => {
    let rows = [...(tabledata || [])];

    if (docReference.trim()) {
      const search = docReference.trim().toLowerCase();
      rows = rows.filter((item) =>
        String(
          item.DocTypeName ??
            item.DocType ??
            item.DocumentType ??
            item.Doc_Type ??
            "",
        )
          .toLowerCase()
          .includes(search),
      );
    }

    if (uploadedBy.trim()) {
      const search = uploadedBy.trim().toLowerCase();
      rows = rows.filter((item) =>
        String(item.UploadedByName ?? item.UploadedBy ?? item.uploadedBy ?? "")
          .toLowerCase()
          .includes(search),
      );
    }

    if (searchInput.trim()) {
      const search = searchInput.trim().toLowerCase();
      rows = rows.filter((item) =>
        [
          item.Utd,
          item.tran_id,
          item.Doc_Name,
          item.DocTypeName,
          item.DocType,
          item.DocumentType,
          item.RefId,
          item.Keywords,
          item.UploadedByName,
          item.UploadedBy,
          item.Upload_Date,
          item.CreatedNewDate,
          item.CreatedAt,
          item.OriginalName,
          item.File_Name,
          item.DOC_NAME,
          item.SMBPath,
          item.path,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(search),
        ),
      );
    }

    const mappedRows = mapDocumentData(rows);
    setTotalCount(mappedRows.length);
    const size = pageSize === -1 ? Math.max(mappedRows.length, 1) : pageSize;
    const start = (currentPage - 1) * size;
    setDisplayedFiles(
      pageSize === -1 ? mappedRows : mappedRows.slice(start, start + size),
    );
  }, [tabledata, searchInput, docReference, uploadedBy, currentPage, pageSize]);

  const publishedPolicies = tabledata.length;
  const totalEmployees = tabledata.reduce(
    (max, item) =>
      Math.max(
        max,
        Number(
          item.EmployeeCount ?? item.TotalEmployees ?? item.TotalEmployee ?? 0,
        ) || 0,
      ),
    0,
  );
  const totalAcknowledged = tabledata.reduce(
    (sum, item) =>
      sum +
      Number(
        item.AcknowledgedCount ?? item.Acknowledged ?? item.ReadCount ?? 0,
      ),
    0,
  );
  const averageAcknowledgement =
    publishedPolicies > 0 && totalEmployees > 0
      ? Math.round(
          (totalAcknowledged / (publishedPolicies * totalEmployees)) * 100,
        )
      : 0;
  const fullyAcknowledged = tabledata.filter((item) => {
    const acknowledged = Number(
      item.AcknowledgedCount ?? item.Acknowledged ?? item.ReadCount ?? 0,
    );
    const employees = Number(
      item.EmployeeCount ?? item.TotalEmployees ?? item.TotalEmployee ?? 0,
    );
    return employees > 0 && acknowledged >= employees;
  }).length;

  const totalPages = useMemo(() => {
    const size = pageSize === -1 ? Math.max(totalCount, 1) : pageSize;
    return Math.max(1, Math.ceil(totalCount / Math.max(size, 1)));
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

  const handleExport = () => {
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
        ACKNOWLEDGED: `${file.Acknowledged ?? 0} / ${file.EmployeeCount ?? 0}`,
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
            .map(
              (header) =>
                `"${String(row[header as keyof typeof row] ?? "").replace(/"/g, '""')}"`,
            )
            .join(","),
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
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
  };

  const columns = useMemo(
    () => [
      {
        Header: "SR NO.",
        accessor: "srNo",
        Cell: ({ value }: any) => (
          <span className="text-[12px] text-slate-500 dark:text-slate-400">
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
          const employees = item.EmployeeCount ?? 0;
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
            <div className="flex min-w-[170px] items-center gap-3">
              <div className="h-[5px] w-[110px] overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
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
        Header: "DOCUMENT",
        accessor: "Document",
        Cell: ({ row }: any) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                title="View document"
                onClick={() => handleOpenDocument(item)}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-indigo-950/40"
              >
                <Eye size={15} />
              </button>
              <button
                type="button"
                title="Send acknowledgement"
                onClick={() => handleNotify(item)}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-indigo-950/40"
              >
                <Bell size={15} />
              </button>
              <button
                type="button"
                title="Delete"
                onClick={() => handleDelete(item)}
                className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-rose-950/40"
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        },
      },
    ],
    [category],
  );

  const isImagePreview = /\.(png|jpe?g|webp)$/i.test(previewName || "");

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F8FAFC] px-[10px] py-[12px] text-slate-800 dark:bg-[#070D18] dark:text-slate-100 sm:px-[16px] sm:py-[14px] lg:px-[16px]">
      <div className="mb-[16px] flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="m-0 text-[20px] font-[700] tracking-[-0.02em] text-slate-900 dark:text-white sm:text-[22px]">
            HR policies
          </h1>
          <p className="mt-[3px] text-[12px] text-slate-500 dark:text-slate-400">
            Publish a policy once; every employee sees it and acknowledges it.
            Acknowledgement rates are tracked per document.
          </p>
        </div>
        <AButton
          type="button"
          onClick={handleExport}
          className="inline-flex h-[38px] w-full items-center justify-center gap-2 rounded-[9px] border border-slate-200 bg-white px-[14px] text-[12px] font-[600] text-slate-700 shadow-sm hover:bg-slate-50 sm:w-auto dark:border-slate-700 dark:bg-[#0F172A] dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <Download size={15} /> Export policies
        </AButton>
      </div>

      <div className="mb-[15px] grid grid-cols-1 gap-[14px] md:grid-cols-3">
        <div className="rounded-[12px] border border-slate-200 bg-white px-[16px] py-[15px] shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-[#0D1524]">
          <div className="flex items-center gap-2">
            <div className="flex h-[25px] w-[25px] items-center justify-center rounded-[7px] bg-indigo-50 text-indigo-500 dark:bg-indigo-950/40">
              <BookOpen size={15} />
            </div>
            <span className="text-[11px] font-[600] uppercase tracking-[0.03em] text-indigo-500">
              Published policies
            </span>
          </div>
          <div className="mt-[10px] flex items-baseline gap-2">
            <span className="text-[23px] font-[700] leading-none text-slate-900 dark:text-white">
              {publishedPolicies}
            </span>
            <span className="text-[11px] text-slate-500">
              live for employees
            </span>
          </div>
        </div>
        <div className="rounded-[12px] border border-slate-200 bg-white px-[16px] py-[15px] shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-[#0D1524]">
          <div className="flex items-center gap-2">
            <div className="flex h-[25px] w-[25px] items-center justify-center rounded-[7px] bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40">
              <CheckCircle2 size={15} />
            </div>
            <span className="text-[11px] font-[600] uppercase tracking-[0.03em] text-emerald-600">
              Average acknowledgement
            </span>
          </div>
          <div className="mt-[10px] flex items-baseline gap-2">
            <span className="text-[23px] font-[700] leading-none text-slate-900 dark:text-white">
              {averageAcknowledgement}%
            </span>
            <span className="text-[11px] text-slate-500">
              of {totalEmployees} employees
            </span>
          </div>
        </div>
        <div className="rounded-[12px] border border-slate-200 bg-white px-[16px] py-[15px] shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-[#0D1524]">
          <div className="flex items-center gap-2">
            <div className="flex h-[25px] w-[25px] items-center justify-center rounded-[7px] bg-teal-50 text-teal-500 dark:bg-teal-950/40">
              <ShieldCheck size={15} />
            </div>
            <span className="text-[11px] font-[600] uppercase tracking-[0.03em] text-teal-600">
              Fully acknowledged
            </span>
          </div>
          <div className="mt-[10px] flex items-baseline gap-2">
            <span className="text-[23px] font-[700] leading-none text-slate-900 dark:text-white">
              {fullyAcknowledged} / {publishedPolicies}
            </span>
            <span className="text-[11px] text-slate-500">
              no pending readers
            </span>
          </div>
        </div>
      </div>

      <div className="mb-[15px] rounded-[12px] border border-slate-200 bg-white px-[18px] py-[17px] shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-[#0D1524] sm:px-[19px]">
        <div className="mb-[14px] flex flex-wrap items-center gap-2">
          <div className="flex h-[27px] w-[27px] items-center justify-center rounded-[7px] bg-indigo-50 text-indigo-500 dark:bg-indigo-950/40">
            <Plus size={16} />
          </div>
          <h2 className="m-0 text-[14px] font-[700] text-slate-800 dark:text-white">
            Publish a policy
          </h2>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Employees are notified the moment it goes live.
          </span>
        </div>
        <div className="grid grid-cols-1 items-end gap-[12px] md:grid-cols-2 xl:grid-cols-[minmax(280px,2.2fr)_190px_130px_minmax(280px,1.7fr)_78px_105px]">
          <div className="min-w-0">
            <Einput
              title="DOCUMENT NAME "
              redlabel="*"
              name="POLICY_NAME"
              placeholder="e.g. Leave policy 2026"
              value={policyName}
              handleInputChange={(_name: string, value: string) =>
                setPolicyName(value || "")
              }
              className="h-[34px]"
            />
          </div>

          <div className="min-w-0">
            <Eselect
              title="CATEGORY"
              name="Category"
              option={[
                { label: "Code of conduct", value: "Code of conduct" },
                { label: "Leave", value: "Leave" },
                { label: "Travel", value: "Travel" },
                { label: "Compliance", value: "Compliance" },
                { label: "IT", value: "IT" },
                { label: "Payroll", value: "Payroll" },
              ]}
              initialValue={category}
              handleInputChange={(_name: string, value: string) => {
                setCategory(value || "");
              }}
              className="h-[34px]"
              placeholder="Select category"
            />
          </div>
          <div className="min-w-0">
            <Einput
              title="VERSION"
              name="VERSION"
              placeholder="v1.0"
              value={version}
              handleInputChange={(_name: string, value: string) =>
                setVersion(value || "")
              }
              className="h-[34px]"
            />
          </div>
          <div className="min-w-0">
            <DocumentFileUpload
              file={selectedFile}
              onChange={(file) => {
                if (!file) {
                  clearSelectedFile();
                  return;
                }

                if (!/\.(pdf|png|jpe?g|webp)$/i.test(file.name)) {
                  showSideAlert("Please select a PDF or image file.", "warn");
                  return;
                }

                setSelectedFile(file);
                setPreviewName(file.name);

                if (previewUrl?.startsWith("blob:")) {
                  URL.revokeObjectURL(previewUrl);
                }

                setPreviewUrl(URL.createObjectURL(file));
              }}
            />
          </div>
          <AButton
            type="button"
            onClick={handlePreview}
            disabled={!selectedFile}
            className="h-[34px] w-full rounded-[8px] border border-slate-200 bg-white px-[12px] text-[11px] font-[600] text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-[#111827] dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Preview
          </AButton>
          <AButton
            type="button"
            onClick={handlePublish}
            disabled={isLoading || !policyName.trim() || !selectedFile}
            className="inline-flex h-[34px] w-full items-center justify-center gap-2 rounded-[8px] bg-[#64748B] px-[13px] text-[11px] font-[650] text-white shadow-sm transition hover:bg-[#475569] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UploadCloud size={14} /> Publish
          </AButton>
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-[#0D1524]">
        <div className="flex min-h-[57px] flex-col gap-3 border-b border-slate-200 px-[18px] py-[10px] sm:flex-row sm:items-center sm:px-[20px] dark:border-slate-800">
          <div className="flex items-center gap-3">
            <h2 className="m-0 text-[14px] font-[700] text-slate-800 dark:text-white">
              Published policies
            </h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {publishedPolicies} documents
            </span>
          </div>
          <div className="hidden flex-1 sm:block" />
          <AButton
            type="button"
            onClick={ShowData}
            className="h-[30px] rounded-[7px] border border-slate-200 bg-white px-3 text-[11px] text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#111827] dark:text-slate-300"
          >
            Refresh
          </AButton>
        </div>
        <div className="w-full overflow-hidden">
          <ServiceTablePagination
            title=""
            columns={columns}
            data={displayedFiles}
            height={520}
            serverMode={true}
            serverPagination={serverPagination}
            showPageSizeInFooter={true}
            showTopSearch={true}
            searchValue={searchInput}
            onSearchChange={(value: string) => {
              setSearchInput(value);
              setCurrentPage(1);
            }}
            searchPlaceholder="Search policies..."
            onServerPageChange={(page: number) => setCurrentPage(page)}
            onServerPageSizeChange={(size: number) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
{previewOpen && previewUrl && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3">
    <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b p-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">
            {previewName}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Preview of the selected policy document.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setPreviewOpen(false);
            setPreviewUrl(null);
            setPreviewName(null);
          }}
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
        >
          <X size={20} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-3">
        <FileViewer
          fileLink={previewUrl}
          celldata=""
          Title={previewName || "Document Preview"}
        />
      </div>
    </div>
  </div>
)}
      </div>

      {(isLoading || isClicked) && (
        <HashloaderComponent isLoading={isLoading || isClicked} />
      )}
    </div>
  );
}
