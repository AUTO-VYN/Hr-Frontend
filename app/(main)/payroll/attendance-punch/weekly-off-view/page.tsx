"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Layers,
  FileSpreadsheet,
  Calendar,
  FilterX,
  EyeOff,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useDateRange } from "@/app/hooks/use-date-range";
import useExcelDownload from "@/app/hooks/excel-download";

// Mandatory components requested
import Button from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import { StatCard } from "@/components/Templates/card";
import ReactTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const getDayName = (value: any) => {
  if (value == null || value === "") return "—";
  const num = Number(value);
  if (!isNaN(num) && num >= 0 && num <= 6) return dayNames[num];
  return String(value);
};

const formatDMY = (dateStr: any) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

function formatDateToYMD(dateStr: any) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return String(dateStr);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function WeeklyOffViewPage() {
  const user = useCurrentUser();
  const globalDateRange = useDateRange();
  const { handleExcelDownload, isLoading: isExcelLoading } = useExcelDownload();

  function getCurrentDate(monthsBack = 0) {
    const today = new Date();
    today.setMonth(today.getMonth() - monthsBack);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const todayOneMonthBackDate = getCurrentDate(1);
  const currentDate = getCurrentDate();

  const [fromData, setFromData] = useState({
    DATE_FROM: globalDateRange?.DATE_FROM || (globalDateRange as any)?.from || todayOneMonthBackDate,
    DATE_TO: globalDateRange?.DATE_TO || (globalDateRange as any)?.to || currentDate,
    Status: "0",
    Branch: "",
  });

  const [allData, setAllData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const statusOptions = useMemo(
    () => [
      { value: "ALL", label: "All records" },
      { value: "0", label: "Pending" },
      { value: "1", label: "Approved" },
      { value: "2", label: "Rejected" },
    ],
    []
  );

  const branchOptions = useMemo(() => {
    const opts = [{ value: "", label: "All branches" }];
    if (user?.branch) {
      opts.push({ value: String(user.branch), label: String(user.branch) });
    }
    return opts;
  }, [user?.branch]);

  // Statistics calculation for StatCards
  const stats = useMemo(() => {
    const pending = allData.filter(
      (item) => item.Fin_Appr === 0 || String(item.Fin_Appr) === "0"
    ).length;
    const approved = allData.filter(
      (item) => item.Fin_Appr === 1 || String(item.Fin_Appr) === "1"
    ).length;
    const rejected = allData.filter(
      (item) => item.Fin_Appr === 2 || String(item.Fin_Appr) === "2"
    ).length;
    const all = allData.length;

    return { pending, approved, rejected, all };
  }, [allData]);

  // Apply filters
  const applyFilter = useCallback(
    (data: any[], status: string, branch: string) => {
      let filtered = [...data];

      if (status !== "ALL" && status !== "") {
        filtered = filtered.filter(
          (item) => String(item.Fin_Appr) === String(status)
        );
      }

      if (branch && branch !== "" && branch !== "ALL") {
        filtered = filtered.filter(
          (item) =>
            String(item.loc_code || item.location || item.Branch || "") ===
            String(branch)
        );
      }

      setFilteredData(filtered);
    },
    []
  );

  // Fetch Table Data
  const Tabledata = useCallback(async () => {
    if (!user?.EMPCODE && !user?.Comp_Code) return;
    setIsLoading(true);

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/mobile/WOApproverView`,
        {
          Appr_Code: user?.EMPCODE,
          loc_code: fromData.Branch || user?.branch || "",
          Fin_Appr: fromData.Status === "ALL" ? "" : fromData.Status,
          DateFrom: formatDateToYMD(fromData.DATE_FROM),
          DateTo: formatDateToYMD(fromData.DATE_TO),
          isSelf: 1,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      if (result.data?.Status === false) {
        Swal.fire({
          icon: "warning",
          title: "Invalid Request",
          text: result.data.Message || "Something went wrong",
          confirmButtonColor: "#4F46E5",
        });
        setAllData([]);
        setFilteredData([]);
      } else {
        const rawList = Array.isArray(result.data?.Result)
          ? result.data.Result
          : [];

        const mappedList = rawList.map((row: any, i: number) => ({
          ...row,
          srno: i + 1,
          status:
            row.Fin_Appr === 1 || String(row.Fin_Appr) === "1"
              ? 2
              : row.Fin_Appr === 2 || String(row.Fin_Appr) === "2"
              ? 3
              : 1,
        }));

        setAllData(mappedList);
        applyFilter(mappedList, fromData.Status, fromData.Branch);
      }
    } catch (error) {
      console.error("Error occurred while fetching WO data:", error);
      setAllData([]);
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    user?.EMPCODE,
    user?.Comp_Code,
    user?.name,
    user?.branch,
    fromData.Branch,
    fromData.Status,
    fromData.DATE_FROM,
    fromData.DATE_TO,
    applyFilter,
  ]);

  // Filter change handlers
  const handleInputChange = (name: string, value: any) => {
    setFromData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "Status" || name === "Branch") {
        applyFilter(
          allData,
          name === "Status" ? value : prev.Status,
          name === "Branch" ? value : prev.Branch
        );
      }
      return updated;
    });
  };

  const handleStatusFilter = (statusVal: string) => {
    handleInputChange("Status", statusVal);
  };

  const handleResetFilters = () => {
    const resetObj = {
      DATE_FROM: globalDateRange?.DATE_FROM || (globalDateRange as any)?.from || todayOneMonthBackDate,
      DATE_TO: globalDateRange?.DATE_TO || (globalDateRange as any)?.to || currentDate,
      Status: "ALL",
      Branch: "",
    };
    setFromData(resetObj);
    applyFilter(allData, "ALL", "");
  };

  // Initial load
  useEffect(() => {
    Tabledata();
  }, [user?.EMPCODE, user?.Comp_Code]);

  // Columns matching old code + design pill
  const columns = useMemo(
    () => [
      {
        Header: "STATUS",
        accessor: "Fin_Appr",
        Cell: ({ value, row }: any) => {
          let label = "Pending";
          let tint = "#F59E0B";

          const val = row?.original?.Fin_Appr ?? value;
          if (val === 1 || val === "1") {
            label = "Approved";
            tint = "#10B981";
          } else if (val === 2 || val === "2") {
            label = "Rejected";
            tint = "#E11D48";
          } else {
            label = "Pending";
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
                padding: "3px 8px",
                borderRadius: "8px",
                whiteSpace: "nowrap",
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
      {
        Header: "EMPLOYEE NAME",
        accessor: "Employee_Name",
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "DESIGNATION",
        accessor: "EMPLOYEEDESIGNATION",
        Cell: ({ value }: any) => value || "—",
      },
      {
        Header: "APPLICABLE DATE",
        accessor: "Change_Date",
        Cell: ({ value }: any) => formatDMY(value),
      },
      {
        Header: "CURRENT WO",
        accessor: "Prev_WO",
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {getDayName(value)}
          </span>
        ),
      },
      {
        Header: "NEW WO",
        accessor: "New_WO",
        Cell: ({ value }: any) => (
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {getDayName(value)}
          </span>
        ),
      },
    ],
    []
  );

  const handleExportExcel = () => {
    const downloadColumns = columns.filter(
      (col: any) => col.showInExcel !== false
    );
    handleExcelDownload(downloadColumns, filteredData);
  };

  return (
    <div
      className="w-full min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] p-[22px_24px_32px_24px]"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* 1. Page Header & Excel Export */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="m-0 text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
            Weekly off change requests
          </h1>
          <p className="mt-1 mb-0 text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
            Read-only view of every weekly off change, showing the day being swapped and from when it applies.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isExcelLoading || filteredData.length === 0}
            icon={<FileSpreadsheet className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8]" />}
            className="!rounded-[10px] !h-[36px] !px-[14px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] !text-[#1E293B] dark:!text-[#E7ECF3] !text-[12.5px] !font-[550] whitespace-nowrap cursor-pointer transition-all"
          >
            {isExcelLoading ? "Exporting..." : "Export to Excel"}
          </Button>
        </div>
      </div>

      {/* 2. 4 StatCards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-3.5">
        <StatCard
          title="PENDING"
          count={stats.pending}
          icon={<Clock className="w-3.5 h-3.5 text-[#F59E0B]" />}
          isActive={fromData.Status === "0"}
          onClick={() => handleStatusFilter("0")}
          className="!h-auto !min-h-0 !rounded-[12px] !p-[14px_16px] !bg-white dark:!bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] cursor-pointer text-left transition-all select-none"
          activeClassName="!border-[#4F46E5] dark:!border-[#8B84FF] ring-2 ring-[#4F46E5]/30"
          inactiveClassName="!border-[#E2E8F0] dark:!border-[#1F2937] hover:!border-[#4F46E5]/60"
          iconClassName="!w-6 !h-6 !rounded-[7px] !bg-[#F59E0B1F] !border-none flex items-center justify-center shrink-0"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          countClassName="!text-[23px] !font-[650] !tracking-[-0.02em] !mt-2 tabular-nums !text-[#1E293B] dark:!text-white"
        />

        <StatCard
          title="APPROVED"
          count={stats.approved}
          icon={<CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />}
          isActive={fromData.Status === "1"}
          onClick={() => handleStatusFilter("1")}
          className="!h-auto !min-h-0 !rounded-[12px] !p-[14px_16px] !bg-white dark:!bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] cursor-pointer text-left transition-all select-none"
          activeClassName="!border-[#4F46E5] dark:!border-[#8B84FF] ring-2 ring-[#4F46E5]/30"
          inactiveClassName="!border-[#E2E8F0] dark:!border-[#1F2937] hover:!border-[#4F46E5]/60"
          iconClassName="!w-6 !h-6 !rounded-[7px] !bg-[#10B9811F] !border-none flex items-center justify-center shrink-0"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          countClassName="!text-[23px] !font-[650] !tracking-[-0.02em] !mt-2 tabular-nums !text-[#1E293B] dark:!text-white"
        />

        <StatCard
          title="REJECTED"
          count={stats.rejected}
          icon={<XCircle className="w-3.5 h-3.5 text-[#E11D48]" />}
          isActive={fromData.Status === "2"}
          onClick={() => handleStatusFilter("2")}
          className="!h-auto !min-h-0 !rounded-[12px] !p-[14px_16px] !bg-white dark:!bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] cursor-pointer text-left transition-all select-none"
          activeClassName="!border-[#4F46E5] dark:!border-[#8B84FF] ring-2 ring-[#4F46E5]/30"
          inactiveClassName="!border-[#E2E8F0] dark:!border-[#1F2937] hover:!border-[#4F46E5]/60"
          iconClassName="!w-6 !h-6 !rounded-[7px] !bg-[#E11D481F] !border-none flex items-center justify-center shrink-0"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          countClassName="!text-[23px] !font-[650] !tracking-[-0.02em] !mt-2 tabular-nums !text-[#1E293B] dark:!text-white"
        />

        <StatCard
          title="ALL RECORDS"
          count={stats.all}
          icon={<Layers className="w-3.5 h-3.5 text-[#4F46E5]" />}
          isActive={fromData.Status === "ALL"}
          onClick={() => handleStatusFilter("ALL")}
          className="!h-auto !min-h-0 !rounded-[12px] !p-[14px_16px] !bg-white dark:!bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] cursor-pointer text-left transition-all select-none"
          activeClassName="!border-[#4F46E5] dark:!border-[#8B84FF] ring-2 ring-[#4F46E5]/30"
          inactiveClassName="!border-[#E2E8F0] dark:!border-[#1F2937] hover:!border-[#4F46E5]/60"
          iconClassName="!w-6 !h-6 !rounded-[7px] !bg-[#4F46E51F] !border-none flex items-center justify-center shrink-0"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          countClassName="!text-[23px] !font-[650] !tracking-[-0.02em] !mt-2 tabular-nums !text-[#1E293B] dark:!text-white"
        />
      </div>

      {/* 3. Filter Card Section */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] p-[14px_18px_16px_18px] mb-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[175px_175px_minmax(0,1fr)_minmax(0,1fr)_auto_auto] gap-3 items-end">
          <div className="w-full">
            <Einput
              title="DATE FROM"
              type="date"
              name="DATE_FROM"
              value={fromData.DATE_FROM}
              handleInputChange={handleInputChange}
              ShortName={true}
              className="!h-[38px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !text-[12.5px] !bg-white dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3]"
              labelClassName="!text-[11px] !font-[650] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase mb-1.5 block"
            />
          </div>

          <div className="w-full">
            <Einput
              title="DATE TO"
              type="date"
              name="DATE_TO"
              value={fromData.DATE_TO}
              handleInputChange={handleInputChange}
              ShortName={true}
              className="!h-[38px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !text-[12.5px] !bg-white dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3]"
              labelClassName="!text-[11px] !font-[650] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase mb-1.5 block"
            />
          </div>

          <div className="w-full min-w-0">
            <Eselect
              title="STATUS"
              name="Status"
              option={statusOptions}
              initialValue={fromData.Status}
              handleInputChange={handleInputChange}
              ShortName={true}
              className="!h-[38px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !text-[12.5px] !bg-white dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3]"
              labelClassName="!text-[11px] !font-[650] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase mb-1.5 block"
            />
          </div>

          <div className="w-full min-w-0">
            <Eselect
              title="BRANCH"
              name="Branch"
              option={branchOptions}
              initialValue={fromData.Branch}
              handleInputChange={handleInputChange}
              ShortName={true}
              className="!h-[38px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !text-[12.5px] !bg-white dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3]"
              labelClassName="!text-[11px] !font-[650] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase mb-1.5 block"
            />
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={Tabledata}
            disabled={isLoading}
            className="!h-[38px] !px-5 !rounded-[9px] !bg-[#4F46E5] hover:!bg-[#4338CA] !text-white !font-[600] !text-[13px] whitespace-nowrap cursor-pointer transition-all w-full sm:w-auto"
          >
            Show
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="!h-[38px] !px-4 !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] !text-[#1E293B] dark:!text-[#E7ECF3] !font-[600] !text-[13px] whitespace-nowrap cursor-pointer transition-all w-full sm:w-auto"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* 4. Table Section Container */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] overflow-hidden">
        {/* Table Header Bar */}
        <div className="flex items-center justify-between p-[12px_18px] border-b border-[#E2E8F0] dark:border-[#1F2937]">
          <div className="flex items-center gap-2">
            <h2 className="text-[13.5px] font-[650] text-[#1E293B] dark:text-[#E7ECF3]">
              Change requests
            </h2>
            <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
              {filteredData.length} of {allData.length} rows
            </span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-[#64748B] dark:text-[#94A3B8]">
            <span>Rows</span>
            <span className="flex h-7 min-w-10 items-center justify-center rounded-lg border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0E1524] px-2 font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
              25
            </span>
          </div>
        </div>

        {/* Empty State when no data */}
        {filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3.5">
              <Calendar className="w-6 h-6 stroke-[1.8]" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              No weekly off changes
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1.5 leading-relaxed">
              Raise one from Add Weekly Off Change — it appears here once submitted.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <FilterX className="w-3.5 h-3.5" />
              Reset filters
            </button>
          </div>
        ) : (
          <ReactTable
            columns={columns}
            data={filteredData}
            check={false}
            selectValue="srno"
            height={430}
            showExcelExport={false}
            footerTextMode="pageItems"
            initialPageSize={25}
            showPageSizeInFooter={true}
            containerClassName="!border-none !shadow-none !rounded-none !bg-transparent"
            headerClassName="!bg-[#F8FAFC] dark:!bg-[#0E1524] !border-b !border-[#E2E8F0] dark:!border-[#1F2937] !text-[10.5px] !font-[700] !tracking-[0.05em] !uppercase !text-[#64748B] dark:!text-[#94A3B8] !px-[11px] !py-[10px]"
          />
        )}
      </div>

      {/* Loader Component */}
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
