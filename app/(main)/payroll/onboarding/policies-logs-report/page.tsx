"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Download,
  FileText,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";

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
  // DATE
  // =========================================================

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(
      2,
      "0"
    );
    const day = String(date.getDate()).padStart(
      2,
      "0"
    );

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

  const [employeeCode, setEmployeeCode] =
    useState("");

  const [policy, setPolicy] = useState("");

  const [tableData, setTableData] = useState<any[]>(
    []
  );

  const [displayedData, setDisplayedData] =
    useState<any[]>([]);

  const [isLoading, setIsLoading] =
    useState(false);

  const [isClicked, setIsClicked] =
    useState(false);

  const [searchInput, setSearchInput] =
    useState("");

  const [currentPage, setCurrentPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(20);

  const [totalCount, setTotalCount] =
    useState(0);

  // =========================================================
  // TABLE FILTERS
  // =========================================================

  const [employeeNameFilter, setEmployeeNameFilter] =
    useState("");

  const [documentNameFilter, setDocumentNameFilter] =
    useState("");

  const [actionFilter, setActionFilter] =
    useState("");

  // =========================================================
  // SIDE ALERT
  // =========================================================

  const showSideAlert = (
    message: string,
    type:
      | "success"
      | "error"
      | "warn"
      | "info" = "info"
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

  const handleDateChange = (
    name: string,
    value: string | null
  ) => {
    setDates((previous) => ({
      ...previous,
      [name]: value || "",
    }));
  };

  // =========================================================
  // NORMALIZE RESPONSE
  // =========================================================

  const normalizePolicyRow = (
    item: any,
    index: number
  ) => {
    const statusRaw =
      item.Action ??
      item.action ??
      item.Status ??
      item.status ??
      item.ACK_STATUS ??
      item.AcknowledgementStatus ??
      "";

    const normalizedStatus =
      String(statusRaw).toLowerCase();

    let action = "Viewed";

    if (
      normalizedStatus.includes("ack")
    ) {
      action = "Acknowledged";
    } else if (
      normalizedStatus.includes("pending")
    ) {
      action = "Pending";
    } else if (
      normalizedStatus.includes("view")
    ) {
      action = "Viewed";
    }

    return {
      srNo:
        item.SRNO ??
        item.SrNo ??
        item.Utd ??
        item.id ??
        index + 1,

      employeeName:
        item.EmployeeName ??
        item.EMPFIRSTNAME ??
        item.EmpName ??
        item.employeeName ??
        item.Name ??
        "",

      empCode:
        item.EmpCode ??
        item.EMPCODE ??
        item.EmployeeCode ??
        item.empCode ??
        "",

      documentName:
        item.DocumentName ??
        item.DOC_NAME ??
        item.DocName ??
        item.PolicyName ??
        item.FileName ??
        item.documentName ??
        "",

      action,

      rawAction: statusRaw,

      date:
        item.Date ??
        item.CreatedAt ??
        item.CreatedDate ??
        item.ActionDate ??
        item.AcknowledgedAt ??
        item.ViewedAt ??
        item.date ??
        "",

      filePath:
        item.SMBPath ??
        item.FilePath ??
        item.DOC_PATH ??
        item.filePath ??
        "",

      fileName:
        item.OriginalName ??
        item.DOC_NAME ??
        item.FileName ??
        item.documentName ??
        "",

      original: item,
    };
  };

  // =========================================================
  // DATE FORMAT
  // =========================================================

  const formatDisplayDate = (
    value: any
  ) => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return String(value);
    }

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    const month = date.toLocaleString(
      "en-IN",
      {
        month: "short",
      }
    );

    const year = date.getFullYear();

    const hours = String(
      date.getHours()
    ).padStart(2, "0");

    const minutes = String(
      date.getMinutes()
    ).padStart(2, "0");

    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  };

  // =========================================================
  // FETCH POLICY LOGS
  // =========================================================

  const fetchPolicyLogs = async () => {
    if (!user?.Comp_Code) {
      return;
    }

    setIsClicked(true);
    setIsLoading(true);

    try {
      /*
       * Replace only this endpoint/body if your existing
       * Policy Logs API has a different name.
       */

      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/DocManage/PolicyLogs`,
        {
          DateFrom: dates.DATE_FROM,
          DateTo: dates.DATE_TO,
          EmpCode:
            employeeCode.trim() || "ALL",
          Policy:
            policy.trim() || "ALL",
        },
        {
          headers: {
            compcode: user.Comp_Code,
            name: user?.name,
          },
        }
      );

      const responseData =
        result.data?.Result ??
        result.data?.result ??
        result.data?.Data ??
        result.data?.data ??
        result.data;

      if (Array.isArray(responseData)) {
        const mapped = responseData.map(
          normalizePolicyRow
        );

        setTableData(mapped);
        setCurrentPage(1);

        if (!mapped.length) {
          showSideAlert(
            "No policy logs found.",
            "warn"
          );
        }
      } else {
        setTableData([]);
        setDisplayedData([]);
        setTotalCount(0);

        showSideAlert(
          "No policy logs found.",
          "warn"
        );
      }
    } catch (error: any) {
      console.error(
        "Policy Logs Error:",
        error
      );

      setTableData([]);
      setDisplayedData([]);
      setTotalCount(0);

      showSideAlert(
        error?.response?.data?.message ||
          "Unable to load policy logs.",
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

    // Uncomment if you want automatic loading.
    // fetchPolicyLogs();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.Comp_Code]);

  // =========================================================
  // FILTER + PAGINATION
  // =========================================================

  useEffect(() => {
    let rows = [...tableData];

    // -------------------------------------------------------
    // EMPLOYEE NAME
    // -------------------------------------------------------

    if (
      employeeNameFilter.trim()
    ) {
      const search =
        employeeNameFilter
          .trim()
          .toLowerCase();

      rows = rows.filter((item) =>
        String(
          item.employeeName ?? ""
        )
          .toLowerCase()
          .includes(search)
      );
    }

    // -------------------------------------------------------
    // DOCUMENT NAME
    // -------------------------------------------------------

    if (
      documentNameFilter.trim()
    ) {
      const search =
        documentNameFilter
          .trim()
          .toLowerCase();

      rows = rows.filter((item) =>
        String(
          item.documentName ?? ""
        )
          .toLowerCase()
          .includes(search)
      );
    }

    // -------------------------------------------------------
    // ACTION
    // -------------------------------------------------------

    if (actionFilter.trim()) {
      const search =
        actionFilter
          .trim()
          .toLowerCase();

      rows = rows.filter((item) =>
        String(item.action ?? "")
          .toLowerCase()
          .includes(search)
      );
    }

    // -------------------------------------------------------
    // GLOBAL SEARCH
    // -------------------------------------------------------

    if (searchInput.trim()) {
      const search =
        searchInput
          .trim()
          .toLowerCase();

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
            .includes(search)
        );
      });
    }

    setTotalCount(rows.length);

    // -------------------------------------------------------
    // PAGINATION
    // -------------------------------------------------------

    const size =
      pageSize === -1
        ? rows.length || 1
        : pageSize;

    const start =
      (currentPage - 1) * size;

    const end = start + size;

    const finalRows =
      pageSize === -1
        ? rows
        : rows.slice(start, end);

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
      DATE_TO: formatDateForInput(
        new Date()
      ),
    });

    setEmployeeCode("");
    setPolicy("");

    setEmployeeNameFilter("");
    setDocumentNameFilter("");
    setActionFilter("");

    setSearchInput("");

    setCurrentPage(1);
  };

  // =========================================================
  // EXPORT
  // =========================================================

  const handleExport = () => {
    try {
      if (!tableData.length) {
        showSideAlert(
          "No policy logs available to export.",
          "warn"
        );

        return;
      }

      const rows = tableData.map(
        (item, index) => ({
          "SR NO": index + 1,

          "EMPLOYEE NAME":
            item.employeeName || "",

          "EMP CODE":
            item.empCode || "",

          "DOCUMENT NAME":
            item.documentName || "",

          ACTION:
            item.action || "",

          DATE:
            formatDisplayDate(
              item.date
            ),
        })
      );

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
              ).replace(
                /"/g,
                '""'
              )}"`;
            })
            .join(",")
        ),
      ].join("\n");

      const blob = new Blob(
        [csv],
        {
          type: "text/csv;charset=utf-8;",
        }
      );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;
      link.download =
        "Policies_Logs_Report.csv";

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      showSideAlert(
        "Policy logs exported successfully.",
        "success"
      );
    } catch (error) {
      console.error(
        "Export Error:",
        error
      );

      showSideAlert(
        "Export failed.",
        "error"
      );
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

        Cell: ({
          value,
        }: any) => (
          <span
            className="
              whitespace-nowrap
              text-[13px]
              font-[500]
              text-[#102A43]
              dark:text-slate-200
              sm:text-[14px]
            "
          >
            {value ?? "—"}
          </span>
        ),
      },

      {
        Header: "EMPLOYEE NAME",
        accessor: "employeeName",

        Cell: ({
          value,
        }: any) => (
          <span
            className="
              block
              max-w-[180px]
              truncate
              whitespace-nowrap
              text-[13px]
              font-[500]
              text-[#102A43]
              dark:text-slate-200
              sm:max-w-[220px]
              sm:text-[14px]
            "
          >
            {value || "—"}
          </span>
        ),
      },

      {
        Header: "EMP CODE",
        accessor: "empCode",

        Cell: ({
          value,
        }: any) => (
          <span
            className="
              whitespace-nowrap
              text-[13px]
              text-[#102A43]
              dark:text-slate-300
              sm:text-[14px]
            "
          >
            {value || "—"}
          </span>
        ),
      },

      {
        Header: "DOCUMENT NAME",
        accessor: "documentName",

        Cell: ({
          value,
        }: any) => (
          <span
            className="
              block
              max-w-[210px]
              truncate
              whitespace-nowrap
              text-[13px]
              text-[#102A43]
              dark:text-slate-300
              sm:max-w-[300px]
              sm:text-[14px]
            "
            title={value || ""}
          >
            {value || "—"}
          </span>
        ),
      },

      {
        Header: "ACTION",
        accessor: "action",

        Cell: ({
          value,
        }: any) => {
          const action =
            String(
              value || ""
            ).toLowerCase();

          if (
            action.includes(
              "acknowledged"
            )
          ) {
            return (
              <span
                className="
                  inline-flex
                  items-center
                  gap-[7px]
                  whitespace-nowrap
                  rounded-[9px]
                  border
                  border-[#8DE3C6]
                  bg-[#F0FBF7]
                  px-[10px]
                  py-[5px]
                  text-[12px]
                  font-[600]
                  text-[#08A579]
                  dark:border-emerald-800
                  dark:bg-emerald-950/40
                  dark:text-emerald-400
                "
              >
                <span
                  className="
                    h-[7px]
                    w-[7px]
                    rounded-full
                    bg-[#10B981]
                  "
                />

                Acknowledged
              </span>
            );
          }

          if (
            action.includes(
              "pending"
            )
          ) {
            return (
              <span
                className="
                  inline-flex
                  items-center
                  gap-[7px]
                  whitespace-nowrap
                  rounded-[9px]
                  border
                  border-[#FFD18A]
                  bg-[#FFF9EF]
                  px-[10px]
                  py-[5px]
                  text-[12px]
                  font-[600]
                  text-[#E99500]
                  dark:border-amber-800
                  dark:bg-amber-950/40
                  dark:text-amber-400
                "
              >
                <span
                  className="
                    h-[7px]
                    w-[7px]
                    rounded-full
                    bg-[#F59E0B]
                  "
                />

                Pending
              </span>
            );
          }

          return (
            <span
              className="
                inline-flex
                items-center
                gap-[7px]
                whitespace-nowrap
                rounded-[9px]
                border
                border-[#8DD8FF]
                bg-[#EFF9FF]
                px-[10px]
                py-[5px]
                text-[12px]
                font-[600]
                text-[#008DCE]
                dark:border-sky-800
                dark:bg-sky-950/40
                dark:text-sky-400
              "
            >
              <span
                className="
                  h-[7px]
                  w-[7px]
                  rounded-full
                  bg-[#0EA5E9]
                "
              />

              Viewed
            </span>
          );
        },
      },

      {
        Header: "DATE",
        accessor: "date",

        Cell: ({
          value,
        }: any) => (
          <span
            className="
              whitespace-nowrap
              text-[13px]
              text-[#102A43]
              dark:text-slate-300
              sm:text-[14px]
            "
          >
            {formatDisplayDate(
              value
            )}
          </span>
        ),
      },

      {
        Header: "VIEW / DOWNLOAD",
        accessor: "fileName",

        Cell: ({
          row,
        }: any) => {
          const filePath =
            row.original?.filePath;

          if (!filePath) {
            return (
              <span
                className="
                  inline-flex
                  items-center
                  gap-2
                  whitespace-nowrap
                  text-[13px]
                  font-[500]
                  text-slate-500
                  dark:text-slate-400
                "
              >
                <FileText
                  size={16}
                />

                No resume
              </span>
            );
          }

          return (
            <div
              className="
                flex
                min-w-[110px]
                items-center
                gap-2
              "
            >
              <FileViewer
                fileLink={`https://erp.autovyn.com/backend/fetch?filePath=${encodeURIComponent(
                  filePath
                )}`}
              />
            </div>
          );
        },
      },
    ],
    []
  );

  // =========================================================
  // PAGINATION
  // =========================================================

  const totalPages = useMemo(() => {
    const size =
      pageSize === -1
        ? 1000000
        : pageSize;

    return Math.max(
      1,
      Math.ceil(
        (totalCount || 0) /
          (size || 1)
      )
    );
  }, [
    totalCount,
    pageSize,
  ]);

  const serverPagination =
    useMemo(
      () => ({
        currentPage,
        pageSize,
        totalPages,
        totalRecords:
          totalCount,
      }),
      [
        currentPage,
        pageSize,
        totalPages,
        totalCount,
      ]
    );

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
        py-[12px]
        text-[#102A43]
        dark:bg-[#070D18]
        dark:text-slate-100
        sm:px-[12px]
        sm:py-[14px]
        lg:px-[18px]
        lg:py-[18px]
      "
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        className="
          mb-[18px]
          flex
          flex-col
          gap-[16px]
          sm:flex-row
          sm:items-start
          sm:justify-between
        "
      >
        <div className="min-w-0">
          <h1
            className="
              m-0
              text-[23px]
              font-[700]
              leading-[1.15]
              tracking-[-0.025em]
              text-[#102A43]
              dark:text-white
              sm:text-[26px]
            "
          >
            Policies logs report
          </h1>

          <p
            className="
              mb-0
              mt-[6px]
              text-[13px]
              leading-[1.5]
              text-[#58708D]
              dark:text-slate-400
              sm:text-[14px]
            "
          >
            Who opened and acknowledged
            which policy — the audit trail
            for compliance.
          </p>
        </div>

        <div
          className="
            flex
            w-full
            flex-col
            gap-[8px]
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
              inline-flex
              h-[42px]
              w-full
              items-center
              justify-center
              gap-[8px]
              rounded-[11px]
              border
              border-[#DCE5EF]
              bg-white
              px-[16px]
              text-[13px]
              font-[600]
              text-[#243B53]
              shadow-none
              transition-all
              hover:bg-[#F8FAFC]
              sm:w-auto
              dark:border-slate-700
              dark:bg-[#111827]
              dark:text-slate-200
              dark:hover:bg-slate-800
            "
          >
            <SlidersHorizontal
              size={16}
            />

            <span>
              Reset filters
            </span>
          </AButton>

          {/* EXPORT */}

          <AButton
            type="button"
            onClick={
              handleExport
            }
            className="
              inline-flex
              h-[42px]
              w-full
              items-center
              justify-center
              gap-[8px]
              rounded-[11px]
              bg-[#4F46E5]
              px-[17px]
              text-[13px]
              font-[650]
              text-white
              shadow-none
              transition-all
              hover:bg-[#4338CA]
              sm:w-auto
            "
          >
            <Download
              size={16}
            />

            <span>
              Export to Excel
            </span>
          </AButton>
        </div>
      </div>

      {/* =====================================================
          FILTER CARD
      ===================================================== */}

      <div
        className="
          mb-[18px]
          w-full
          rounded-[15px]
          border
          border-[#DCE5EF]
          bg-white
          px-[14px]
          pb-[19px]
          pt-[17px]
          shadow-[0_4px_14px_rgba(15,23,42,0.04)]
          dark:border-slate-800
          dark:bg-[#0D1524]
          dark:shadow-none
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
            xl:grid-cols-[210px_210px_minmax(220px,1fr)_minmax(220px,1fr)_95px]
          "
        >
          {/* DATE FROM */}

          <div className="min-w-0">
            <Einput
              title="DATE FROM"
              name="DATE_FROM"
              type="date"
              value={
                dates.DATE_FROM
              }
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
              value={
                dates.DATE_TO
              }
              handleInputChange={
                handleDateChange
              }
            />
          </div>

          {/* EMPLOYEE CODE */}

          <div className="min-w-0">
            <Einput
              title="EMPLOYEE CODE"
              name="EMPLOYEE_CODE"
              placeholder="ALL"
              value={
                employeeCode
              }
              handleInputChange={(
                name,
                value
              ) => {
                setEmployeeCode(
                  value || ""
                );
              }}
            />
          </div>

          {/* POLICY */}

          <div className="min-w-0">
            <Einput
              title="POLICY"
              name="POLICY"
              placeholder="ALL"
              value={policy}
              handleInputChange={(
                name,
                value
              ) => {
                setPolicy(
                  value || ""
                );
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
              onClick={
                fetchPolicyLogs
              }
              disabled={
                isClicked
              }
              className="
               
                rounded-xl
                bg-[#4F46E5]
                px-[18px]
                text-lg
                py-[10px]
                font-[650]
                text-white
                transition-all
                hover:bg-[#4338CA]
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              Show
            </AButton>
          </div>
        </div>
      </div>

      {/* =====================================================
          TABLE CARD
      ===================================================== */}

      <div
        className="
          w-full
          overflow-hidden
          rounded-[15px]
          border
          border-[#DCE5EF]
          bg-white
          shadow-[0_5px_18px_rgba(15,23,42,0.045)]
          dark:border-slate-800
          dark:bg-[#0D1524]
          dark:shadow-none
        "
      >
        {/* TABLE HEADER */}

        <div
          className="
            flex
            min-h-[69px]
            flex-col
            gap-[12px]
            border-b
            border-[#DCE5EF]
            px-[14px]
            py-[13px]
            sm:flex-row
            sm:items-center
            sm:justify-between
            sm:px-[22px]
            dark:border-slate-800
          "
        >
          <div
            className="
              flex
              min-w-0
              items-center
              gap-[10px]
            "
          >
            <h2
              className="
                m-0
                whitespace-nowrap
                text-[15px]
                font-[650]
                text-[#102A43]
                dark:text-white
                sm:text-[16px]
              "
            >
              Acknowledgement log
            </h2>

            <span
              className="
                whitespace-nowrap
                text-[12px]
                font-[500]
                text-[#58708D]
                dark:text-slate-400
              "
            >
              {totalCount} of{" "}
              {totalCount} rows
            </span>
          </div>

          {/* ROWS */}

          <div
            className="
              flex
              items-center
              justify-between
              gap-[10px]
              sm:justify-end
            "
          >
            <span
              className="
                text-[12px]
                font-[500]
                text-[#58708D]
                dark:text-slate-400
              "
            >
              Rows
            </span>

            <select
              value={String(
                pageSize === -1
                  ? 100
                  : pageSize
              )}
              onChange={(e) => {
                setPageSize(
                  Number(
                    e.target.value
                  )
                );

                setCurrentPage(1);
              }}
              className="
                h-[36px]
                min-w-[60px]
                rounded-[10px]
                border
                border-[#DCE5EF]
                bg-white
                px-[11px]
                text-[12px]
                font-[500]
                text-[#334E68]
                outline-none
                transition-all
                focus:border-[#6366F1]
                dark:border-slate-700
                dark:bg-[#111827]
                dark:text-slate-200
              "
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

      

        {/* ===================================================
            TABLE
        =================================================== */}

        <div
          className="
            w-full
            overflow-hidden
            bg-white
            dark:bg-[#0B1220]
          "
        >
          
          <ServiceTablePagination
            title=""
            columns={columns}
            data={displayedData}
            height={430}
            serverMode={true}
            serverPagination={
              serverPagination
            }
            showPageSizeInFooter={
              false
            }
            showTopSearch={false}
            searchValue={
              searchInput
            }
            onSearchChange={(
              value
            ) => {
              setSearchInput(
                value
              );

              setCurrentPage(1);
            }}
            searchPlaceholder="Search policy logs..."
            onServerPageChange={(
              page
            ) => {
              setCurrentPage(
                page
              );
            }}
            onServerPageSizeChange={(
              size
            ) => {
              setPageSize(
                size
              );

              setCurrentPage(
                1
              );
            }}
          />
          
        </div>

    

     
      </div>

      {/* =====================================================
          LOADER
      ===================================================== */}

      {(isLoading ||
        isClicked) && (
        <HashloaderComponent
          isLoading={
            isClicked
          }
        />
      )}
    </div>
  );
}