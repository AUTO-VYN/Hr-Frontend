"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

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
  RotateCcw,
} from "lucide-react";

import Swal from "sweetalert2";
import axios from "axios";

import HashloaderComponent from "@/components/Templates/hashloader";
import ServiceTablePagination from "@/components/Templates/reacttable";
import AButton from "@/components/atoms/Button";

import { useCurrentUser } from "@/app/hooks/use-current-user";

export default function Page() {
  const user = useCurrentUser();

  // =========================================================
  // CURRENT DATE
  // =========================================================

  const getCurrentDate = (monthsBack = 0) => {
    const today = new Date();

    if (monthsBack > 0) {
      today.setMonth(today.getMonth() - monthsBack);
    }

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // =========================================================
  // STATES
  // =========================================================

  const [dates, setDates] = useState({
    DATE_FROM: getCurrentDate(1),
    DATE_TO: getCurrentDate(),
  });

  const [displayedFiles, setDisplayedFiles] = useState<any[]>([]);
  const [tabledata, setTabledata] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const [searchInput, setSearchInput] = useState("");

  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // =========================================================
  // TABLE FILTERS
  // =========================================================

  const [documentNameFilter, setDocumentNameFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [versionFilter, setVersionFilter] = useState("");

  // =========================================================
  // OTHER FILTERS
  // =========================================================

  const [docReference, setDocReference] = useState("");
  const [uploadedBy, setUploadedBy] = useState("");

  // =========================================================
  // POLICY STATES
  // =========================================================

  const [policyName, setPolicyName] = useState("");
  const [category, setCategory] = useState("Code of conduct");
  const [version, setVersion] = useState("v1.0");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // =========================================================
  // SIDE ALERT
  // =========================================================

  const showSideAlert = (
    message: string,
    type: "success" | "error" | "warn" | "info" = "info",
  ) => {
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
  };

  // =========================================================
  // DATE CHANGE
  // =========================================================

  const handleDateChange = (name: string, value: string | null) => {
    setDates((prevData) => ({
      ...prevData,
      [name]: value || "",
    }));
  };

  // =========================================================
  // FILE SELECT
  // =========================================================

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      showSideAlert("Please select a PDF or image file.", "warn");

      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  // =========================================================
  // REMOVE SELECTED FILE
  // =========================================================

  const handleRemoveFile = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // =========================================================
  // PREVIEW SELECTED FILE
  // =========================================================

  const handlePreview = () => {
    if (!selectedFile) {
      showSideAlert("Please choose a PDF or image first.", "warn");

      return;
    }

    const url = URL.createObjectURL(selectedFile);

    window.open(url, "_blank", "noopener,noreferrer");

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 10000);
  };

  // =========================================================
  // PUBLISH POLICY
  // =========================================================

  const handlePublish = () => {
    if (!policyName.trim()) {
      showSideAlert("Please enter document name.", "warn");

      return;
    }

    if (!selectedFile) {
      showSideAlert("Please choose a PDF or image.", "warn");

      return;
    }

    /*
      Connect your publish API here.
    */

    showSideAlert(
      "Policy form is ready. Connect your publish API here.",
      "info",
    );
  };

  // =========================================================
  // TABLE DATA MAPPING
  // =========================================================

  const mapDocumentData = (data: any[]) => {
    return (data || []).map((item: any, index: number) => {
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

      return {
        srNo: item.Utd ?? item.SRNO ?? index + 1,

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
          item.UploadedByName ?? item.UploadedBy ?? item.uploadedBy ?? "",

        uploadedAt:
          item.CreatedNewDate ?? item.CreatedAt ?? item.createdAt ?? "",

        name:
          item.OriginalName ?? item.DOC_NAME ?? item.name ?? "Untitled policy",

        SMBPath: item.SMBPath ?? item.DOC_PATH ?? "",

        Utd: item.Utd,

        TRAN_ID: item.TRAN_ID ?? item.Utd,

        SRNO: item.SRNO ?? item.Utd,

        Doc_Type: item.Doc_Type ?? item.DocType ?? "",

        Category:
          item.Category ??
          item.CATEGORY ??
          item.DocTypeName ??
          item.DocType ??
          "General",

        Version: item.Version ?? item.VERSION ?? "v1.0",

        Acknowledged: acknowledgement,

        EmployeeCount: employeeCount,

        AcknowledgementPercent:
          employeeCount > 0
            ? Math.min(100, Math.round((acknowledgement / employeeCount) * 100))
            : 0,
      };
    });
  };

  // =========================================================
  // FILTER + PAGINATION
  // =========================================================

  useEffect(() => {
    let rows = [...(tabledata || [])];

    // -------------------------------------------------------
    // DOCUMENT NAME
    // -------------------------------------------------------

    if (documentNameFilter.trim()) {
      const search = documentNameFilter.trim().toLowerCase();

      rows = rows.filter((item: any) => {
        const value = item.OriginalName ?? item.DOC_NAME ?? item.name ?? "";

        return String(value).toLowerCase().includes(search);
      });
    }

    // -------------------------------------------------------
    // CATEGORY
    // -------------------------------------------------------

    if (categoryFilter.trim()) {
      const search = categoryFilter.trim().toLowerCase();

      rows = rows.filter((item: any) => {
        const value =
          item.Category ??
          item.CATEGORY ??
          item.DocTypeName ??
          item.DocType ??
          "";

        return String(value).toLowerCase().includes(search);
      });
    }

    // -------------------------------------------------------
    // VERSION
    // -------------------------------------------------------

    if (versionFilter.trim()) {
      const search = versionFilter.trim().toLowerCase();

      rows = rows.filter((item: any) => {
        const value = item.Version ?? item.VERSION ?? "";

        return String(value).toLowerCase().includes(search);
      });
    }

    // -------------------------------------------------------
    // DOCUMENT REFERENCE
    // -------------------------------------------------------

    if (docReference.trim()) {
      const search = docReference.trim().toLowerCase();

      rows = rows.filter((item: any) => {
        const value =
          item.DocTypeName ??
          item.DocType ??
          item.DocumentType ??
          item.Doc_Type ??
          "";

        return String(value).toLowerCase().includes(search);
      });
    }

    // -------------------------------------------------------
    // UPLOADED BY
    // -------------------------------------------------------

    if (uploadedBy.trim()) {
      const search = uploadedBy.trim().toLowerCase();

      rows = rows.filter((item: any) => {
        const value =
          item.UploadedByName ?? item.UploadedBy ?? item.uploadedBy ?? "";

        return String(value).toLowerCase().includes(search);
      });
    }

    // -------------------------------------------------------
    // GLOBAL SEARCH
    // -------------------------------------------------------

    if (searchInput.trim()) {
      const search = searchInput.trim().toLowerCase();

      rows = rows.filter((item: any) => {
        const values = [
          item.Utd,
          item.DocTypeName,
          item.DocType,
          item.DocumentType,
          item.RefId,
          item.Keywords,
          item.UploadedByName,
          item.UploadedBy,
          item.CreatedNewDate,
          item.CreatedAt,
          item.OriginalName,
          item.DOC_NAME,
          item.SMBPath,
          item.Category,
          item.Version,
        ];

        return values.some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(search),
        );
      });
    }

    // -------------------------------------------------------
    // MAP
    // -------------------------------------------------------

    const mappedRows = mapDocumentData(rows);

    setTotalCount(mappedRows.length);

    // -------------------------------------------------------
    // PAGINATION
    // -------------------------------------------------------

    const size = pageSize === -1 ? mappedRows.length || 1 : pageSize;

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
  ]);

  // =========================================================
  // AUTO LOAD
  // =========================================================

  useEffect(() => {
    if (!user?.Comp_Code) {
      return;
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.Comp_Code]);

  // =========================================================
  // RESET FILTERS
  // =========================================================

  const handleReset = () => {
    setDocumentNameFilter("");
    setCategoryFilter("");
    setVersionFilter("");

    setDocReference("");
    setUploadedBy("");
    setSearchInput("");

    setCurrentPage(1);

    setDates({
      DATE_FROM: getCurrentDate(1),
      DATE_TO: getCurrentDate(),
    });
  };

  // =========================================================
  // DELETE ROW
  // =========================================================

  const handleDelete = async (row: any) => {
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

    if (!result.isConfirmed) {
      return;
    }

    showSideAlert("Delete API is not connected yet.", "info");
  };

  // =========================================================
  // NOTIFY
  // =========================================================

  const handleNotify = (row: any) => {
    showSideAlert(
      `Acknowledgement notification for ${row?.name || "policy"} is ready.`,
      "info",
    );
  };

  // =========================================================
  // OPEN DOCUMENT
  // =========================================================

  const handleOpenDocument = (row: any) => {
    if (!row?.SMBPath) {
      showSideAlert("Document path is not available.", "warn");

      return;
    }

    const url = `https://erp.autovyn.com/backend/fetch?filePath=${encodeURIComponent(
      row.SMBPath,
    )}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

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
          const extension = String(value || "")
            .split(".")
            .pop()
            ?.toLowerCase();

          const isImage = ["jpg", "jpeg", "png", "webp"].includes(
            extension || "",
          );

          return (
            <div className="flex min-w-[220px] max-w-[330px] items-center gap-3">
              <div
                className={`flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[8px] ${
                  isImage
                    ? "bg-sky-50 text-sky-500 dark:bg-sky-950/40"
                    : "bg-rose-50 text-rose-500 dark:bg-rose-950/40"
                }`}
              >
                {isImage ? <FileImage size={16} /> : <FileText size={16} />}
              </div>

              <button
                type="button"
                onClick={() => handleOpenDocument(row.original)}
                className="min-w-0 max-w-[270px] truncate text-left text-[12.5px] font-[600] text-slate-800 transition hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
                title={value || "Untitled policy"}
              >
                {value || "Untitled policy"}
              </button>
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
        Header: "UPLOADED",
        accessor: "uploadedAt",

        Cell: ({ value }: any) => {
          if (!value) {
            return <span className="text-[12px] text-slate-400">—</span>;
          }

          const dateObj = new Date(value);

          if (isNaN(dateObj.getTime())) {
            return <span className="text-[12px] text-slate-400">—</span>;
          }

          return (
            <span className="whitespace-nowrap text-[12px] text-slate-500 dark:text-slate-400">
              {dateObj.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}{" "}
              {dateObj.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          );
        },
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
                  style={{
                    width: `${percent}%`,
                  }}
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
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px] border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-indigo-950/40"
              >
                <Eye size={15} />
              </button>

              <button
                type="button"
                title="Send acknowledgement"
                onClick={() => handleNotify(item)}
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[7px] border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-indigo-950/40"
              >
                <Bell size={15} />
              </button>

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
    [],
  );

  // =========================================================
  // STATISTICS
  // =========================================================

  const publishedPolicies = tabledata.length;

  const totalEmployees = 486;

  const totalAcknowledged = tabledata.reduce(
    (sum: number, item: any) =>
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

  const fullyAcknowledged = tabledata.filter((item: any) => {
    const acknowledged = Number(
      item.AcknowledgedCount ?? item.Acknowledged ?? item.ReadCount ?? 0,
    );

    return acknowledged >= totalEmployees;
  }).length;

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
  // EXPORT
  // =========================================================

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

      const blob = new Blob([csv], {
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
  };

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
      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

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

      {/* =====================================================
          PUBLISHED POLICIES
      ===================================================== */}

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
        {/* ===================================================
            SERVICE TABLE
        =================================================== */}

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
              onSearchChange={(val) => {
                setSearchInput(val);
                setCurrentPage(1);
              }}
              searchPlaceholder="Search policies..."
              onServerPageChange={(page) => {
                setCurrentPage(page);
              }}
              onServerPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          LOADER
      ===================================================== */}

      {(isLoading || isClicked) && (
        <HashloaderComponent isLoading={isClicked} />
      )}
    </div>
  );
}
