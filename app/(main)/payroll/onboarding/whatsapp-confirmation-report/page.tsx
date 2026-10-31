"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  FileSpreadsheet,
  FileText,
  FileX,
  SlidersHorizontal,
} from "lucide-react";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useDateRange } from "@/app/hooks/use-date-range";

export default function WhatsappConfirmationReportPage() {
  const user = useCurrentUser();
  const { DATE_FROM, DATE_TO } = useDateRange();

  // ── Helper: Date formatting ───────────────────────────────────────────────
  const getDefaultDate = (monthsBack = 0) => {
    const today = new Date();
    today.setMonth(today.getMonth() - monthsBack);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return "—";
    try {
      const cleanDate = String(dateString).replace("Z", "");
      const date = new Date(cleanDate);
      if (isNaN(date.getTime())) return String(dateString);

      const day = String(date.getDate()).padStart(2, "0");
      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");

      return `${day} ${month} ${year}, ${hours}:${minutes}`;
    } catch {
      return String(dateString);
    }
  };

  const showSideAlert = (
    message: string,
    type: "success" | "warning" | "error" | "info" = "info",
  ) => {
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
    Toast.fire({
      icon: type,
      title: message,
    });
  };

  // ── Filter States ──────────────────────────────────────────────────────────
  const [dates, setDates] = useState({
    DATE_FROM: DATE_FROM || getDefaultDate(1),
    DATE_TO: DATE_TO || getDefaultDate(0),
    Template: "ALL",
    EmpCode: "ALL",
  });

  const [existingTemplateOptions, setExistingTemplateOptions] = useState<
    { value: string; label: string }[]
  >([{ value: "ALL", label: "ALL" }]);

  const [empCodeOptions, setEmpCodeOptions] = useState<
    { value: string; label: string }[]
  >([{ value: "ALL", label: "ALL" }]);

  // ── Table Data & UI States ────────────────────────────────────────────────
  const [tableData, setTableData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);

  // ── 1. Fetch Masters (Templates & Employees) ───────────────────────────────
  const fetchTemplates = useCallback(async () => {
    if (!user?.Comp_Code) return;
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/template/FindTemplate`,
        {},
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      if (response.data?.data?.Template) {
        const seen = new Set<string>();
        const cleanList: { value: string; label: string }[] = [];

        response.data.data.Template.forEach((item: any) => {
          const rawLabel =
            item.label ||
            item.Label ||
            item.TEMPLATE_NAME ||
            item.TEMPLATENAME ||
            item.Template_Name ||
            item.Template ||
            item.value ||
            "";
          const label = String(rawLabel).trim();
          const lower = label.toLowerCase();
          if (label && !seen.has(lower) && lower !== "all") {
            seen.add(lower);
            cleanList.push({ value: label, label });
          }
        });

        setExistingTemplateOptions([
          { value: "ALL", label: "ALL" },
          ...cleanList,
        ]);
      }
    } catch (err) {
      console.error("Error fetching template options:", err);
    }
  }, [user?.Comp_Code, user?.name]);

  const fetchEmployees = useCallback(async () => {
    if (!user?.Comp_Code) return;
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/all`,
        { branch: user?.branch },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      const empList = response.data?.data || [];
      if (Array.isArray(empList)) {
        const seenEmp = new Set<string>();
        const cleanEmps: { value: string; label: string }[] = [];
        empList.forEach((emp: any) => {
          const val = String(
            emp.value || emp.Emp_Code || emp.EMPCODE || emp.id || "",
          ).trim();
          const lbl = String(
            emp.label || emp.EMPNAME || emp.Empname || emp.value || "",
          ).trim();
          if (
            val &&
            !seenEmp.has(val.toLowerCase()) &&
            val.toLowerCase() !== "all"
          ) {
            seenEmp.add(val.toLowerCase());
            cleanEmps.push({ value: val, label: lbl || val });
          }
        });
        setEmpCodeOptions([{ value: "ALL", label: "ALL" }, ...cleanEmps]);
      }
    } catch (err) {
      console.error("Error fetching employee options:", err);
    }
  }, [user?.Comp_Code, user?.branch, user?.name]);

  useEffect(() => {
    fetchTemplates();
    fetchEmployees();
  }, [fetchTemplates, fetchEmployees]);

  // ── 2. Fetch Confirmation Report Data ──────────────────────────────────────
  const fetchReportData = useCallback(async () => {
    if (!user?.Comp_Code) return;

    if (!dates?.DATE_FROM) {
      showSideAlert("Please select Date From.", "warning");
      return;
    }
    if (!dates?.DATE_TO) {
      showSideAlert("Please select Date To.", "warning");
      return;
    }

    try {
      setIsLoading(true);
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/template/getLetterConfirmationReport`,
        {
          dateFrom: dates?.DATE_FROM,
          dateTo: dates?.DATE_TO,
          empcode:
            dates?.EmpCode === "ALL"
              ? ""
              : String(dates?.EmpCode || "")
                  .split(",")[0]
                  ?.trim(),
          template:
            dates?.Template === "ALL"
              ? ""
              : String(dates?.Template || "")
                  .split(",")[0]
                  ?.trim(),
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      const records = result?.data?.Result || result?.data?.data || [];
      if (Array.isArray(records)) {
        const enrichedRecords = records.map((rec: any, idx: number) => {
          const rawStatus = rec.STATUS;
          let statusStr = "Pending";
          if (
            rawStatus === 1 ||
            rawStatus === "1" ||
            String(rawStatus).toLowerCase() === "delivered" ||
            String(rawStatus).toLowerCase() === "accepted"
          ) {
            statusStr = "Delivered";
          } else if (
            rawStatus === 3 ||
            rawStatus === "3" ||
            String(rawStatus).toLowerCase() === "read"
          ) {
            statusStr = "Read";
          } else if (
            rawStatus === 2 ||
            rawStatus === "2" ||
            String(rawStatus).toLowerCase() === "failed" ||
            String(rawStatus).toLowerCase() === "rejected"
          ) {
            statusStr = "Failed";
          } else if (
            rawStatus === 0 ||
            rawStatus === "0" ||
            String(rawStatus).toLowerCase() === "pending"
          ) {
            statusStr = "Pending";
          } else if (rawStatus) {
            statusStr = String(rawStatus);
          }

          return {
            ...rec,
            STATUS_TEXT: statusStr,
            row_id:
              rec.id ||
              `${rec.EMPCODE || "emp"}_${rec.Letter_Name || "let"}_${rec.Created_At || "date"}_${idx}`,
          };
        });
        setTableData(enrichedRecords);
      } else {
        setTableData([]);
      }
      setSelectedRows([]);
    } catch (error) {
      console.error("Error fetching confirmation report:", error);
      showSideAlert("Failed to fetch report data", "error");
      setTableData([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.Comp_Code, user?.name, dates]);

  useEffect(() => {
    if (user?.Comp_Code) {
      fetchReportData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.Comp_Code]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDateChange = (name: string, value: any) => {
    setDates((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleResetFilters = () => {
    setDates({
      DATE_FROM: getDefaultDate(1),
      DATE_TO: getDefaultDate(0),
      Template: "ALL",
      EmpCode: "ALL",
    });
  };

  // ── Column Definitions for ReactTable ──────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        Header: "SR NO",
        accessor: (_row: any, i: number) => i + 1,
        id: "srNo",
        width: 70,
        disableFilter: true,
        Cell: ({ value }: any) => (
          <span className="font-normal text-slate-600 dark:text-slate-400 text-[12.5px]">
            {value}
          </span>
        ),
      },
      {
        Header: "EMPCODE",
        accessor: "EMPCODE",
        width: 130,
        disableFilter: false,
        Cell: ({ value, row }: any) => {
          const val =
            value || row.original?.Emp_Code || row.original?.empcode || "—";
          return (
            <span className="font-normal text-slate-700 dark:text-slate-300 text-[12.5px]">
              {val}
            </span>
          );
        },
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: "Empname",
        width: 190,
        filterPlaceholder: "All employee name",
        Cell: ({ value, row }: any) => {
          const val =
            value ||
            row.original?.EMPNAME ||
            row.original?.Employee_Name ||
            "—";
          return (
            <span className="font-normal text-slate-900 dark:text-slate-100 text-[12.5px]">
              {val}
            </span>
          );
        },
      },
      {
        Header: "LETTER NAME",
        accessor: "Letter_Name",
        width: 190,
        filterPlaceholder: "All letter name",
        Cell: ({ value, row }: any) => {
          const val =
            value || row.original?.Template || row.original?.template || "—";
          return (
            <span className="font-normal text-slate-700 dark:text-slate-300 text-[12.5px]">
              {val}
            </span>
          );
        },
      },
      {
        Header: "SENT ON",
        accessor: "Created_At",
        width: 160,
        disableFilter: false,
        Cell: ({ value }: any) => (
          <span className="font-normal text-slate-600 dark:text-slate-400 text-[12px] whitespace-nowrap">
            {formatDate(value)}
          </span>
        ),
      },
      {
        Header: "PDF LINK",
        accessor: "path",
        width: 130,
        disableFilter: false,
        Cell: ({ value, row }: any) => {
          const filePath =
            value || row.original?.Path || row.original?.file_path;
          const publicUrl = filePath
            ? filePath.startsWith("http")
              ? filePath
              : `https://erp.autovyn.com/backend/fetch?filePath=${encodeURIComponent(filePath)}`
            : null;

          if (!publicUrl) {
            return (
              <span className="inline-flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-normal text-[12px]">
                <FileX className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                <span>No resume</span>
              </span>
            );
          }

          return (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#4F46E5] hover:text-[#4338CA] dark:text-[#8B84FF] dark:hover:text-[#A5B4FC] font-semibold text-[12px] transition-colors"
            >
              <FileText className="w-4 h-4 shrink-0 text-[#4F46E5] dark:text-[#8B84FF]" />
              <span>View PDF</span>
            </a>
          );
        },
      },
      {
        Header: "STATUS",
        accessor: "STATUS_TEXT",
        width: 140,
        filterPlaceholder: "All status",
        filterOptions: [
          { value: "", label: "All status" },
          { value: "Delivered", label: "Delivered" },
          { value: "Read", label: "Read" },
          { value: "Failed", label: "Failed" },
          { value: "Pending", label: "Pending" },
        ],
        Cell: ({ value, row }: any) => {
          const raw =
            value ?? row.original?.STATUS_TEXT ?? row.original?.STATUS;

          let label = "Pending";
          let tint = "#F59E0B";

          if (
            raw === 1 ||
            raw === "1" ||
            String(raw).toLowerCase() === "delivered" ||
            String(raw).toLowerCase() === "accepted"
          ) {
            label = "Delivered";
            tint = "#0EA5E9";
          } else if (
            raw === 3 ||
            raw === "3" ||
            String(raw).toLowerCase() === "read"
          ) {
            label = "Read";
            tint = "#10B981";
          } else if (
            raw === 2 ||
            raw === "2" ||
            String(raw).toLowerCase() === "failed" ||
            String(raw).toLowerCase() === "rejected"
          ) {
            label = "Failed";
            tint = "#E11D48";
          } else if (
            raw === 0 ||
            raw === "0" ||
            String(raw).toLowerCase() === "pending"
          ) {
            label = "Pending";
            tint = "#F59E0B";
          } else {
            label = String(raw || "Pending");
            tint = "#F59E0B";
          }

          return (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                fontWeight: 600,
                color: tint,
                backgroundColor: `${tint}14`,
                border: `1px solid ${tint}55`,
                padding: "4px 8px",
                borderRadius: "8px",
                whiteSpace: "nowrap",
                maxWidth: "100%",
                lineHeight: "1.2",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: tint,
                  flex: "0 0 auto",
                }}
              />
              {label}
            </span>
          );
        },
      },
    ],
    [],
  );

  // ── Export to Excel Handler ───────────────────────────────────────────────
  const handleExportToExcel = () => {
    if (!tableData.length) {
      showSideAlert("No data available to export.", "warning");
      return;
    }

    try {
      const exportHeaders = [
        "SR NO",
        "EMPCODE",
        "EMPLOYEE NAME",
        "LETTER NAME",
        "SENT ON",
        "PDF LINK",
        "STATUS",
      ];

      const rows = tableData.map((item, index) => {
        const rawStatus = item.STATUS;
        let statusStr = "Pending";
        if (
          rawStatus === 1 ||
          rawStatus === "1" ||
          String(rawStatus).toLowerCase() === "delivered"
        )
          statusStr = "Delivered";
        else if (
          rawStatus === 2 ||
          rawStatus === "2" ||
          String(rawStatus).toLowerCase() === "failed"
        )
          statusStr = "Failed";
        else if (
          rawStatus === 3 ||
          rawStatus === "3" ||
          String(rawStatus).toLowerCase() === "read"
        )
          statusStr = "Read";

        return [
          index + 1,
          item.EMPCODE || item.Emp_Code || "—",
          item.Empname || item.EMPNAME || "—",
          item.Letter_Name || item.Template || "—",
          formatDate(item.Created_At),
          item.path
            ? `https://erp.autovyn.com/backend/fetch?filePath=${item.path}`
            : "No resume",
          statusStr,
        ];
      });

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [
          exportHeaders.join(","),
          ...rows.map((e) => e.map((val) => `"${val}"`).join(",")),
        ].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `Letter_WhatsApp_Confirmation_${dates.DATE_FROM}_to_${dates.DATE_TO}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export error:", err);
      showSideAlert("Failed to export Excel file", "error");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-[#070D18] px-3 sm:px-5 lg:px-7 py-4 text-slate-900 dark:text-slate-100">
      <div className="max-w-[1600px] mx-auto space-y-4">
        {/* ── 1. PAGE HEADER ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Letter WhatsApp confirmation
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 font-normal mt-1">
              Delivery and read status for every letter pushed to an employee
              over WhatsApp.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0">
            {/* Reset filters button */}
            <AButton
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              icon={
                <SlidersHorizontal className="w-4 h-4 shrink-0 text-slate-600 dark:text-slate-300" />
              }
              className="!h-10 !px-3 sm:!px-4 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs whitespace-nowrap flex-1 sm:flex-none justify-center text-xs sm:text-sm"
            >
              <span>Reset filters</span>
            </AButton>

            {/* Export to Excel button */}
            <AButton
              type="button"
              variant="primary"
              size="sm"
              onClick={handleExportToExcel}
              icon={<FileSpreadsheet className="w-4 h-4 shrink-0 text-white" />}
              className="!h-10 !px-3 sm:!px-4 !bg-[#4338CA] hover:!bg-[#3730A3] text-white font-semibold shadow-sm whitespace-nowrap flex-1 sm:flex-none justify-center text-xs sm:text-sm"
            >
              <span>Export to Excel</span>
            </AButton>
          </div>
        </div>

        {/* ── 2. FILTER BAR CARD ─────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[175px_175px_minmax(180px,1fr)_minmax(200px,1.4fr)_auto] gap-3.5 items-end">
            {/* DATE FROM */}
            <div className="min-w-0">
              <Einput
                title="DATE FROM"
                name="DATE_FROM"
                type="date"
                className="h-[32px]"
                ShortName={true}
                value={dates.DATE_FROM}
                handleInputChange={handleDateChange}
              />
            </div>

            {/* DATE TO */}
            <div className="min-w-0">
              <Einput
                title="DATE TO"
                name="DATE_TO"
                type="date"
                className="h-[32px]"
                ShortName={true}
                value={dates.DATE_TO}
                handleInputChange={handleDateChange}
              />
            </div>

            {/* TEMPLATE NAME */}
            <div className="min-w-0">
              <Eselect
                title="TEMPLATE NAME"
                name="Template"
                ShortName={true}
                className="h-[32px]"
                placeholder="ALL"
                option={existingTemplateOptions}
                initialValue={dates.Template}
                handleInputChange={(name, val) => {
                  let selectedVal = "ALL";
                  if (Array.isArray(val)) {
                    selectedVal = val[0]
                      ? String(val[0].value || val[0])
                      : "ALL";
                  } else if (val && typeof val === "object") {
                    selectedVal = String(val.value || val.label || "ALL");
                  } else if (val) {
                    selectedVal = String(val);
                  }
                  if (selectedVal.includes(",")) {
                    selectedVal = selectedVal.split(",")[0].trim();
                  }
                  setDates((prev) => ({
                    ...prev,
                    Template: selectedVal || "ALL",
                  }));
                }}
              />
            </div>

            {/* EMPLOYEE CODE */}
            <div className="min-w-0">
              <Eselect
                title="EMPLOYEE CODE"
                name="EmpCode"
                ShortName={true}
                className="h-[32px]"
                placeholder="ALL"
                option={empCodeOptions}
                initialValue={dates.EmpCode}
                handleInputChange={(name, val) => {
                  let selectedVal = "ALL";
                  if (Array.isArray(val)) {
                    selectedVal = val[0]
                      ? String(val[0].value || val[0])
                      : "ALL";
                  } else if (val && typeof val === "object") {
                    selectedVal = String(val.value || val.label || "ALL");
                  } else if (val) {
                    selectedVal = String(val);
                  }
                  if (selectedVal.includes(",")) {
                    selectedVal = selectedVal.split(",")[0].trim();
                  }
                  setDates((prev) => ({
                    ...prev,
                    EmpCode: selectedVal || "ALL",
                  }));
                }}
              />
            </div>

            {/* SHOW BUTTON */}
            <div className="flex items-end min-w-0 min-[420px]:col-span-2 lg:col-span-4 xl:col-span-1">
              <AButton
                type="button"
                variant="primary"
                size="lg"
                loading={isLoading}
                onClick={fetchReportData}
                className="!h-10 sm:!h-12 w-full xl:w-auto !bg-[#4F46E5] hover:!bg-[#4338CA] text-white font-semibold !rounded-xl !px-5 sm:!px-7 text-base sm:text-lg shadow-sm"
              >
                Show
              </AButton>
            </div>
          </div>
        </div>

        {/* ── 3. DATA TABLE CARD WITH REACTTABLE ─────────────────────────── */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden whatsapp-report-card">
          <DataTable
            title="Letters sent"
            columns={columns}
            data={tableData}
            check={true}
            selectValue="row_id"
            showColumnFilters={true}
            showTopSearch={true}
            showExcelExport={false}
            showPageSizeInFooter={true}
            setSelectedRows={setSelectedRows}
            selectedRows={selectedRows}
            columnFiltersResetTrigger={true}
            footerTextMode="showing"
          />
        </div>

        {/* Scoped Table Styles to match target design */}
        <style jsx global>{`
          .whatsapp-report-card .font-bold.text-base.uppercase {
            text-transform: capitalize !important;
            font-size: 14px !important;
            font-weight: 600 !important;
            letter-spacing: normal !important;
            color: #0f172a !important;
          }
          .dark .whatsapp-report-card .font-bold.text-base.uppercase {
            color: #f8fafc !important;
          }
          .whatsapp-report-card table th {
            font-size: 10.5px !important;
            font-weight: 700 !important;
            letter-spacing: 0.05em !important;
            padding-top: 10px !important;
            padding-bottom: 10px !important;
          }
          .whatsapp-report-card table td {
            padding-top: 10px !important;
            padding-bottom: 10px !important;
            padding-left: 14px !important;
            padding-right: 14px !important;
          }
        `}</style>
      </div>

      {/* Global Loader */}
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
