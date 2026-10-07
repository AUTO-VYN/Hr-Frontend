"use client";

import React, { useEffect, useMemo, useState } from "react";

import { Download } from "lucide-react";

import Swal from "sweetalert2";
import axios from "axios";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";

import HashloaderComponent from "@/components/Templates/hashloader";
import ServiceTablePagination from "@/components/Templates/reacttable";
import FileViewer from "@/components/atoms/FileviewerBank";

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
  // FILTER STATES
  // =========================================================

  const [docReference, setDocReference] = useState("");

  const [uploadedBy, setUploadedBy] = useState("");

  // =========================================================
  // DATE CHANGE
  // =========================================================

  const handleDateChange = (
    name: string,
    value: string | null
  ) => {
    setDates((prevData) => ({
      ...prevData,
      [name]: value || "",
    }));
  };

  // =========================================================
  // SIDE ALERT
  // =========================================================

  const showSideAlert = (
    message: string,
    type: "success" | "error" | "warn" | "info" = "info"
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
  // TABLE COLUMNS
  // =========================================================

  const columns = useMemo(
    () => [
      {
        Header: "SR NO",
        accessor: "srNo",

        Cell: ({ value }: any) => (
          <span className="whitespace-nowrap text-[13px] text-slate-600 dark:text-slate-300 sm:text-[14px]">
            {value ?? "—"}
          </span>
        ),
      },

      {
        Header: "DOC REFERENCE",
        accessor: "refType",

        Cell: ({ value }: any) => (
          <span className="whitespace-nowrap text-[13px] text-slate-600 dark:text-slate-300 sm:text-[14px]">
            {value || "—"}
          </span>
        ),
      },

      {
        Header: "REFERENCE ID",
        accessor: "refNo",

        Cell: ({ value }: any) => (
          <span className="whitespace-nowrap text-[13px] text-slate-600 dark:text-slate-300 sm:text-[14px]">
            {value || "—"}
          </span>
        ),
      },

      {
        Header: "KEYWORD",
        accessor: "Keywords",

        Cell: ({ value }: any) => (
          <span className="max-w-[180px] truncate text-[13px] text-slate-600 dark:text-slate-300 sm:max-w-[250px] sm:text-[14px]">
            {value || "—"}
          </span>
        ),
      },

      {
        Header: "EMPLOYEE",
        accessor: "RefId",

        Cell: ({ value }: any) => (
          <span className="whitespace-nowrap text-[13px] text-slate-600 dark:text-slate-300 sm:text-[14px]">
            {value || "—"}
          </span>
        ),
      },

      {
        Header: "UPLOADED BY",
        accessor: "uploadedBy",

        Cell: ({ value }: any) => (
          <span className="max-w-[150px] truncate text-[13px] text-slate-600 dark:text-slate-300 sm:max-w-[220px] sm:text-[14px]">
            {value || "—"}
          </span>
        ),
      },

      {
        Header: "CREATED AT",
        accessor: "uploadedAt",

        Cell: ({ value }: any) => {
          if (!value) {
            return "";
          }

          const dateObj = new Date(value);

          if (isNaN(dateObj.getTime())) {
            return "";
          }

          const day = dateObj.getDate();

          const month = dateObj.toLocaleString("default", {
            month: "long",
          });

          const year = dateObj.getFullYear();

          return (
            <span className="whitespace-nowrap text-[13px] text-slate-600 dark:text-slate-300 sm:text-[14px]">
              {`${day} ${month} ${year}`}
            </span>
          );
        },
      },

      {
        Header: "FILE",
        accessor: "name",

        Cell: ({ row }: any) => {
          const SMBPath = row.original?.SMBPath;

          return SMBPath ? (
            <div className="flex min-w-[70px] items-center justify-center">
              <FileViewer
                fileLink={`https://erp.autovyn.com/backend/fetch?filePath=${SMBPath}`}
              />
            </div>
          ) : null;
        },
      },
    ],
    []
  );

  // =========================================================
  // TOTAL PAGES
  // =========================================================

  const totalPages = useMemo(() => {
    const size = pageSize === -1 ? 1000000 : pageSize;

    return Math.max(
      1,
      Math.ceil((totalCount || 0) / (size || 1))
    );
  }, [totalCount, pageSize]);

  // =========================================================
  // SERVER PAGINATION OBJECT
  // =========================================================

  const serverPagination = useMemo(
    () => ({
      currentPage,
      pageSize,
      totalPages,
      totalRecords: totalCount,
    }),
    [currentPage, pageSize, totalPages, totalCount]
  );

  // =========================================================
  // MAP OLD API RESPONSE
  // =========================================================

  const mapDocumentData = (data: any[]) => {
    return (data || []).map((item: any, index: number) => ({
      srNo: item.Utd ?? index + 1,

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
        "",

      uploadedAt:
        item.CreatedNewDate ??
        item.CreatedAt ??
        item.createdAt ??
        "",

      name:
        item.OriginalName ??
        item.DOC_NAME ??
        item.name ??
        "",

      SMBPath:
        item.SMBPath ??
        item.DOC_PATH ??
        "",

      Utd: item.Utd,

      TRAN_ID:
        item.TRAN_ID ??
        item.Utd,

      SRNO:
        item.SRNO ??
        item.Utd,

      Doc_Type:
        item.Doc_Type ??
        item.DocType ??
        "",
    }));
  };

  // =========================================================
  // FILTER + PAGINATION
  // =========================================================

  useEffect(() => {
    let rows = [...(tabledata || [])];

    // =======================================================
    // DOC REFERENCE FILTER
    // =======================================================

    if (docReference.trim()) {
      const search = docReference
        .trim()
        .toLowerCase();

      rows = rows.filter((item: any) => {
        const value =
          item.DocTypeName ??
          item.DocType ??
          item.DocumentType ??
          item.Doc_Type ??
          "";

        return String(value)
          .toLowerCase()
          .includes(search);
      });
    }

    // =======================================================
    // UPLOADED BY FILTER
    // =======================================================

    if (uploadedBy.trim()) {
      const search = uploadedBy
        .trim()
        .toLowerCase();

      rows = rows.filter((item: any) => {
        const value =
          item.UploadedByName ??
          item.UploadedBy ??
          item.uploadedBy ??
          "";

        return String(value)
          .toLowerCase()
          .includes(search);
      });
    }

    // =======================================================
    // SERVICE TABLE SEARCH
    // =======================================================

    if (searchInput.trim()) {
      const search = searchInput
        .trim()
        .toLowerCase();

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
        ];

        return values.some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(search)
        );
      });
    }

    // =======================================================
    // MAP DATA
    // =======================================================

    const mappedRows = mapDocumentData(rows);

    setTotalCount(mappedRows.length);

    // =======================================================
    // PAGINATION
    // =======================================================

    const size =
      pageSize === -1
        ? mappedRows.length || 1
        : pageSize;

    const start =
      (currentPage - 1) * size;

    const end = start + size;

    const paginatedRows =
      pageSize === -1
        ? mappedRows
        : mappedRows.slice(start, end);

    setDisplayedFiles(paginatedRows);
  }, [
    tabledata,
    searchInput,
    docReference,
    uploadedBy,
    currentPage,
    pageSize,
  ]);

  // =========================================================
  // OLD WORKING DOCUMENT VIEW API
  // =========================================================

  const OutServiceView = async () => {
    setIsClicked(true);
    setIsLoading(true);

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/DocManage/DocmentView`,
        {
          EmpCode: user?.EMPCODE,
          DateFrom: dates.DATE_FROM,
          DateTo: dates.DATE_TO,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      console.log(
        result.data,
        "result.data?.Result"
      );

      const resultData =
        result.data?.Result;

      if (Array.isArray(resultData)) {
        setTabledata(resultData);

        setCurrentPage(1);

        if (resultData.length === 0) {
          showSideAlert(
            "No documents found.",
            "warn"
          );
        }
      } else {
        setTabledata([]);

        setDisplayedFiles([]);

        setTotalCount(0);

        showSideAlert(
          "No documents found.",
          "warn"
        );
      }
    } catch (error: any) {
      console.error(
        "Error occurred while making the get request:",
        error
      );

      setTabledata([]);

      setDisplayedFiles([]);

      setTotalCount(0);

      showSideAlert(
        error?.response?.data?.message ||
          "Unable to load documents.",
        "error"
      );
    } finally {
      setIsClicked(false);
      setIsLoading(false);
    }
  };

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
    setDocReference("");

    setUploadedBy("");

    setSearchInput("");

    setCurrentPage(1);
  };

  // =========================================================
  // EXPORT
  // =========================================================

  const handleExport = () => {
    try {
      const rows = displayedFiles.map(
        (file, index) => ({
          "SR NO":
            (currentPage - 1) *
              (pageSize === -1
                ? displayedFiles.length
                : pageSize) +
            index +
            1,

          "DOC REFERENCE":
            file.refType || "",

          "REFERENCE ID":
            file.refNo || "",

          KEYWORD:
            file.Keywords || "",

          EMPLOYEE:
            file.RefId || "",

          "UPLOADED BY":
            file.uploadedBy || "",

          "CREATED AT":
            file.uploadedAt || "",

          FILE:
            file.name || "",
        })
      );

      if (!rows.length) {
        showSideAlert(
          "No documents available to export.",
          "warn"
        );

        return;
      }

      const headers = Object.keys(
        rows[0]
      );

      const csv = [
        headers.join(","),

        ...rows.map((row) =>
          headers
            .map((header) => {
              const value =
                row[
                  header as keyof typeof row
                ];

              return `"${String(
                value ?? ""
              ).replace(/"/g, '""')}"`
            })
            .join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;",
      });

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        "Document_View.csv";

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(
        "Export error:",
        error
      );

      showSideAlert(
        "Export failed.",
        "error"
      );
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div
      className="
        min-h-screen
        bg-white dark:bg-gray-900 text-slate-800 dark:text-slate-100
        w-full
        overflow-x-hidden
        bg-[var(--bg)]
        px-[8px]
        py-[10px]
        text-[var(--fg)]
        sm:px-[12px]
        sm:py-[12px]
        lg:px-[16px]
      "
    >
      {/* =========================================================
          PAGE HEADER
      ========================================================= */}

      <div
        className="
          mb-[18px]
          flex
          flex-col
          gap-4
          sm:flex-row
          sm:items-start
          sm:justify-between
        "
      >
        <div className="min-w-0">
          <h1
            className="
              m-0
              text-[19px]
              font-[650]
              leading-[1.2]
              tracking-[-0.02em]
              text-[var(--fg)]
              sm:text-[21px]
            "
          >
            Document view
          </h1>

          <p
            className="
              mb-0
              mt-[5px]
              max-w-[700px]
              text-[12px]
              leading-[1.5]
              text-[var(--muted)]
              sm:text-[12.5px]
            "
          >
            Every file uploaded against an employee
            or reference, searchable by keyword.
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
            sm:items-center
          "
        >
          {/* RESET */}

          <AButton
            type="button"
            onClick={handleReset}
            className="
              h-[42px]
              w-full
              rounded-[11px]
              border
              border-[#D9E1EC]
              bg-[var(--card)]
              px-[16px]
              text-[13px]
              font-[550]
              text-[#334155]
              transition-colors
              hover:bg-[var(--hover)]
              sm:w-auto
              dark:text-white
              dark:border-[#334155]
            "
          >
            Reset filters
          </AButton>

          {/* EXPORT */}

          <AButton
            type="button"
            onClick={handleExport}
            className="
              inline-flex
              h-[42px]
              w-full
              items-center
              justify-center
              gap-2
              rounded-[11px]
              bg-[#4F46E5]
              px-[18px]
              text-[13px]
              font-[650]
              text-white
              transition-colors
              hover:bg-[#4338CA]
              sm:w-auto
            "
          >
            <Download size={16} />
            <span className="whitespace-nowrap">
              Export to Excel
            </span>
          </AButton>
        </div>
      </div>

      {/* =========================================================
          FILTER CARD
      ========================================================= */}

      <div
        className="
          mb-[18px]
          w-full
          rounded-[14px]
          border
          border-[var(--border)]
          bg-[var(--card)]
          px-[14px]
          pb-[19px]
          pt-[18px]
          shadow-[var(--shadow)]
          sm:px-[18px]
          lg:px-[22px]
        "
      >
        <div
          className="
            grid
            grid-cols-1
            items-end
            gap-[14px]
            sm:grid-cols-2
            lg:grid-cols-4
            xl:grid-cols-[210px_210px_minmax(220px,1.2fr)_minmax(220px,1.2fr)_96px]
          "
        >
          {/* DATE FROM */}

          <div className="min-w-0">
            <Einput
              title="DATE FROM"
              name="DATE_FROM"
              type="date"
              value={dates.DATE_FROM}
              handleInputChange={
                handleDateChange
              }
            />
          </div>

          {/* DATE TO */}

          <div className="min-w-0">
            <Einput
              title="DATE TO"
              name="DATE_TO"
              type="date"
              value={dates.DATE_TO}
              handleInputChange={
                handleDateChange
              }
            />
          </div>

          {/* DOC REFERENCE */}

          <div className="min-w-0">
            <Einput
              title="DOC REFERENCE"
              name="DOC_REFERENCE"
              placeholder="ALL"
              value={docReference}
              handleInputChange={(
                name,
                value
              ) => {
                setDocReference(
                  value || ""
                );

                setCurrentPage(1);
              }}
            />
          </div>

          {/* UPLOADED BY */}

          <div className="min-w-0">
            <Einput
              title="UPLOADED BY"
              type="text"
              name="UPLOADED_BY"
              value={uploadedBy}
              handleInputChange={(
                name,
                value
              ) => {
                setUploadedBy(
                  value || ""
                );

                setCurrentPage(1);
              }}
            />
          </div>

          {/* SHOW */}

          <div
            className="
              flex
              w-full
              sm:col-span-2
              lg:col-span-2
              xl:col-span-1
            "
          >
            <AButton
              type="button"
              onClick={OutServiceView}
              disabled={isClicked}
              className="
                w-full
                xl:w-auto
                text-lg
              "
            >
              Show
            </AButton>
          </div>
        </div>
      </div>

      {/* =========================================================
          DOCUMENT TABLE CARD
      ========================================================= */}

      <div
        className="
          w-full
          overflow-hidden
          rounded-[14px]
          border
          border-[var(--border)]
          bg-[var(--card)]
          shadow-[var(--shadow)]
        "
      >
        {/* TABLE HEADER */}

        <div
          className="
            flex
            min-h-[68px]
            flex-col
            gap-3
            border-b
            border-[var(--border)]
            px-[14px]
            py-[14px]
            sm:flex-row
            sm:items-center
            sm:px-[18px]
            lg:px-[22px]
          "
        >
          <div
            className="
              flex
              min-w-0
              items-center
              gap-3
            "
          >
            <h2
              className="
                m-0
                whitespace-nowrap
                text-[14px]
                font-[650]
                text-[var(--fg)]
                sm:text-[15px]
              "
            >
              Uploaded documents
            </h2>

            <span
              className="
                whitespace-nowrap
                text-[11px]
                text-[var(--muted)]
                sm:text-[12px]
              "
            >
              {totalCount > 0
                ? `${totalCount} records`
                : ""}
            </span>
          </div>

          <div className="hidden flex-1 sm:block" />

          {/* ROW COUNT */}

          <div
            className="
              flex
              w-full
              items-center
              justify-between
              gap-2
              sm:w-auto
              sm:justify-end
            "
          >
            <span
              className="
                text-[12px]
                text-[#64748B]
              "
            >
              Rows
            </span>

            <select
              className="
                h-[38px]
                min-w-[80px]
                rounded-[10px]
                border
                border-[#D9E1EC]
                bg-[var(--card)]
                px-[12px]
                text-[12px]
                text-[var(--fg)]
                outline-none
              "
              value={
                pageSize === -1
                  ? "100"
                  : String(pageSize)
              }
              onChange={(e) => {
                const size =
                  Number(
                    e.target.value
                  );

                setPageSize(size);

                setCurrentPage(1);
              }}
            >
              <option value="20">
                20
              </option>

              <option value="50">
                50
              </option>

              <option value="100">
                100
              </option>
            </select>
          </div>
        </div>

        {/* =======================================================
            SERVICE TABLE
        ======================================================= */}

        <div
  className="
    w-full
    overflow-hidden
    border
    border-slate-200/90
    bg-white
    shadow-2xs
    dark:border-slate-800
    dark:bg-[#0B1220]
  "
>
  {/* TABLE / SEARCH AREA */}
  <div className="w-full">
    <ServiceTablePagination
      title=""
      columns={columns}
      data={displayedFiles}
      height={580}
      serverMode={true}
      serverPagination={serverPagination}
      showPageSizeInFooter={true}
      showTopSearch={true}
      searchValue={searchInput}
      onSearchChange={(val) => {
        setSearchInput(val);
        setCurrentPage(1);
      }}
      searchPlaceholder="Search by file, keyword or reference..."
      onServerPageChange={(page, showLoader = true) => {
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

      {/* =========================================================
          LOADER
      ========================================================= */}

      {(isLoading || isClicked) && (
        <HashloaderComponent
          isLoading={isClicked}
        />
      )}
    </div>
  );
}