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
import FileViewer from "@/components/atoms/FileviewerBank";
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
    if (!dateString) return "-";
    try {
      const cleanDate = String(dateString).replace("Z", "");
      const date = new Date(cleanDate);
      if (isNaN(date.getTime())) return String(dateString);

      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return String(dateString);
    }
  };

  const showSideAlert = (message: string, type: "success" | "warning" | "error" | "info" = "info") => {
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
        }
      );

      if (response.data?.data?.Template) {
        const cleanList = response.data.data.Template.map((item: any) => {
          const label = (item.label || "").trim();
          return label ? { value: label, label } : null;
        }).filter(Boolean);

        setExistingTemplateOptions([{ value: "ALL", label: "ALL" }, ...cleanList]);
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
        }
      );

      const empList = response.data?.data || [];
      if (Array.isArray(empList)) {
        const cleanEmps = empList.map((emp: any) => ({
          value: String(emp.value || emp.Emp_Code || emp.EMPCODE || emp.id || ""),
          label: String(emp.label || emp.EMPNAME || emp.Empname || emp.value || ""),
        }));
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
          empcode: dates?.EmpCode === "ALL" ? "" : dates?.EmpCode,
          template: dates?.Template === "ALL" ? "" : dates?.Template?.trim(),
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      const records = result?.data?.Result || result?.data?.data || [];
      if (Array.isArray(records)) {
        const enrichedRecords = records.map((rec: any, idx: number) => ({
          ...rec,
          row_id: rec.id || `${rec.EMPCODE || "emp"}_${rec.Letter_Name || "let"}_${rec.Created_At || "date"}_${idx}`,
        }));
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
        width: 80,
        filterPlaceholder: "All sr no",
        Cell: ({ value }: any) => (
          <span className="font-normal text-slate-700 dark:text-slate-300 text-[14px]">
            {value}
          </span>
        ),
      },
      {
        Header: "EMPCODE",
        accessor: "EMPCODE",
        width: 140,
        filterPlaceholder: "All empcode",
        Cell: ({ value, row }: any) => {
          const val = value || row.original?.Emp_Code || row.original?.empcode || "—";
          return (
            <span className="font-medium text-slate-800 dark:text-slate-200 text-[14px]">
              {val}
            </span>
          );
        },
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: "Empname",
        width: 200,
        filterPlaceholder: "All employee name",
        Cell: ({ value, row }: any) => {
          const val = value || row.original?.EMPNAME || row.original?.Employee_Name || "—";
          return (
            <span className="font-medium text-slate-900 dark:text-slate-100 text-[14px]">
              {val}
            </span>
          );
        },
      },
      {
        Header: "LETTER NAME",
        accessor: "Letter_Name",
        width: 200,
        filterPlaceholder: "All letter name",
        Cell: ({ value, row }: any) => {
          const val = value || row.original?.Template || row.original?.template || "—";
          return (
            <span className="font-normal text-slate-800 dark:text-slate-200 text-[14px]">
              {val}
            </span>
          );
        },
      },
      {
        Header: "SENT ON",
        accessor: "Created_At",
        width: 160,
        filterPlaceholder: "All sent on",
        Cell: ({ value }: any) => (
          <span className="font-normal text-slate-700 dark:text-slate-300 text-[14px] whitespace-nowrap">
            {formatDate(value)}
          </span>
        ),
      },
      {
        Header: "PDF LINK",
        accessor: "path",
        width: 140,
        filterPlaceholder: "All pdf link",
        filterOptions: [
          { value: "", label: "All pdf link" },
          { value: "pdf", label: "View PDF" },
        ],
        Cell: ({ value, row }: any) => {
          const filePath = value || row.original?.Path || row.original?.file_path;
          const publicUrl = filePath
            ? filePath.startsWith("http")
              ? filePath
              : `https://erp.autovyn.com/backend/fetch?filePath=${encodeURIComponent(filePath)}`
            : null;

          if (!publicUrl) {
            return (
              <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium text-[14px]">
                <FileX className="w-4 h-4 text-slate-500 dark:text-slate-400 " />
                <span>No resume</span>
              </span>
            );
          }

          return (
            <div className="flex items-center gap-1.5">
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[#5B43F7] hover:text-[#4338CA] dark:text-[#818CF8] dark:hover:text-[#A5B4FC] font-semibold text-[14px] transition-colors"
              >
                <FileText className="w-6 h-6 text-[#5B43F7] dark:text-[#818CF8] " />
                <span>View PDF</span>
              </a>
            </div>
          );
        },
      },
      {
        Header: "STATUS",
        accessor: "STATUS",
        width: 140,
        filterPlaceholder: "All status",
        filterOptions: [
          { value: "", label: "All status" },
          { value: "0", label: "Pending" },
          { value: "1", label: "Delivered" },
          { value: "3", label: "Read" },
          { value: "2", label: "Failed" },
        ],
        Cell: ({ value, row }: any) => {
          const raw = value ?? row.original?.STATUS;

          // Pending -> Yellow
          if (raw === 0 || raw === "0" || String(raw).toLowerCase() === "pending") {
            return (
              <span className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-[13px] font-medium bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-950/60 dark:text-yellow-400 dark:border-yellow-800/40">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                Pending
              </span>
            );
          }

          // Delivered / Accepted -> Sky blue
          if (raw === 1 || raw === "1" || String(raw).toLowerCase() === "delivered" || String(raw).toLowerCase() === "accepted") {
            return (
              <span className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-[13px] font-medium bg-sky-50 text-sky-700 border border-sky-200/80 dark:bg-sky-950/50 dark:text-sky-400 dark:border-sky-800/40">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                Delivered
              </span>
            );
          }

          // Read -> Emerald Green
          if (raw === 3 || raw === "3" || String(raw).toLowerCase() === "read") {
            return (
              <span className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-[13px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/40">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Read
              </span>
            );
          }

          // Failed / Rejected -> Red
          if (raw === 2 || raw === "2" || String(raw).toLowerCase() === "failed" || String(raw).toLowerCase() === "rejected") {
            return (
              <span className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-[13px] font-medium bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800/40">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Failed
              </span>
            );
          }

          // Default Fallback
          return (
            <span className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-[13px] font-medium bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-950/60 dark:text-yellow-400 dark:border-yellow-800/40">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              {String(raw || "Pending")}
            </span>
          );
        },
      },
    ],
    []
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
        if (rawStatus === 1 || rawStatus === "1" || String(rawStatus).toLowerCase() === "delivered") statusStr = "Delivered";
        else if (rawStatus === 2 || rawStatus === "2" || String(rawStatus).toLowerCase() === "failed") statusStr = "Failed";
        else if (rawStatus === 3 || rawStatus === "3" || String(rawStatus).toLowerCase() === "read") statusStr = "Read";

        return [
          index + 1,
          item.EMPCODE || item.Emp_Code || "—",
          item.Empname || item.EMPNAME || "—",
          item.Letter_Name || item.Template || "—",
          formatDate(item.Created_At),
          item.path ? `https://erp.autovyn.com/backend/fetch?filePath=${item.path}` : "No resume",
          statusStr,
        ];
      });

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [exportHeaders.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join(
          "\n"
        );

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `Letter_WhatsApp_Confirmation_${dates.DATE_FROM}_to_${dates.DATE_TO}.csv`
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Letter WhatsApp confirmation
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-normal mt-1">
              Delivery and read status for every letter pushed to an employee over WhatsApp.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Reset filters button */}
            <AButton
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              icon={<SlidersHorizontal className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
              className="!h-10 !px-4 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs"
            >
              Reset filters
            </AButton>

            {/* Export to Excel button */}
            <AButton
              type="button"
              variant="primary"
              size="sm"
              onClick={handleExportToExcel}
              icon={<FileSpreadsheet className="w-4 h-4 text-white" />}
              className="!h-10 !px-4 !bg-[#4338CA] hover:!bg-[#3730A3] text-white font-semibold shadow-sm"
            >
              Export to Excel
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
                placeholder="ALL"
                option={existingTemplateOptions}
                initialValue={dates.Template}
                handleInputChange={(name, val) => {
                  setDates((prev) => ({
                    ...prev,
                    Template: val ? String(val.value || val) : "ALL",
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
                placeholder="ALL"
                option={empCodeOptions}
                initialValue={dates.EmpCode}
                handleInputChange={(name, val) => {
                  setDates((prev) => ({
                    ...prev,
                    EmpCode: val ? String(val.value || val) : "ALL",
                  }));
                }}
              />
            </div>

            {/* SHOW BUTTON */}
            <div className="flex items-end">
              <AButton
                type="button"
                variant="primary"
                size="lg"
                loading={isLoading}
                onClick={fetchReportData}
                className="!bg-[#4F46E5] hover:!bg-[#4338CA] text-white font-semibold !rounded-lg !h-10 !px-6 !text-lg shadow-sm"
              >
                Show
              </AButton>
            </div>
          </div>
        </div>

        {/* ── 3. DATA TABLE CARD WITH REACTTABLE ─────────────────────────── */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
          <DataTable
            title="Letters sent"
            columns={columns}
            data={tableData}
            check={true}
            selectValue="row_id"
            showColumnFilters={true}
            showTopSearch={false}
            showExcelExport={false}
            showPageSizeInFooter={true}
            setSelectedRows={setSelectedRows}
            selectedRows={selectedRows}
            initialPageSize={20}
            footerTextMode="showing"
          />
        </div>
      </div>

      {/* Global Loader */}
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
