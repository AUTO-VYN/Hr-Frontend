"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Layers,
  FileSpreadsheet,
} from "lucide-react";

import Einput from "@/components/atoms/Einput";
import AButton from "@/components/atoms/Button";
import Eselect from "@/components/atoms/Eselect";
import { StatCard } from "@/components/Templates/card";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useDateRange } from "@/app/hooks/use-date-range";
import useExcelDownload from "@/app/hooks/excel-download";

const formatDMY = (dateStr: any) => {
  if (!dateStr || dateStr === "null" || dateStr === "—") return "";
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

export default function AllShiftViewPage() {
  const user = useCurrentUser();
  const dateRange = useDateRange();
  const { handleExcelDownload, isLoading: isExporting } = useExcelDownload();

  const getCurrentDate = (monthsBack = 0) => {
    const today = new Date();
    today.setMonth(today.getMonth() - monthsBack);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayOneMonthBackDate = useMemo(() => getCurrentDate(1), []);
  const currentDate = useMemo(() => getCurrentDate(0), []);

  const [fromData, setFromData] = useState({
    DATE_FROM: dateRange?.DATE_FROM || todayOneMonthBackDate,
    DATE_TO: dateRange?.DATE_TO || currentDate,
    Status: "0",
  });

  const [allData, setAllData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (name: string, value: any) => {
    setFromData((prev) => ({
      ...prev,
      [name]: value ?? "",
    }));
  };

  const handleReset = () => {
    setFromData({
      DATE_FROM: dateRange?.DATE_FROM || todayOneMonthBackDate,
      DATE_TO: dateRange?.DATE_TO || currentDate,
      Status: "0",
    });
  };

  const doubleclicked = (row: any) => {
    console.log("Double clicked row:", row);
  };

  // ── Fetch Table Data ────────────────────────────────────────────────────────
  const Tabledata = useCallback(async () => {
    if (!user?.EMPCODE || !user?.Comp_Code) return;

    setIsLoading(true);
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/ShiftApproverView`,
        {
          Appr_Code: user?.EMPCODE,
          loc_code: user?.branch,
          Fin_Appr: fromData?.Status === "ALL" ? "" : fromData?.Status,
          DateFrom: formatDateToYMD(fromData.DATE_FROM),
          DateTo: formatDateToYMD(fromData.DATE_TO),
          isSelf: 1,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      if (result.data.Status === false) {
        Swal.fire({
          icon: "warning",
          title: "Invalid Request",
          text: result.data.Message,
        });
        setAllData([]);
        setFilteredData([]);
      } else {
        const records = Array.isArray(result.data.Result)
          ? result.data.Result.map((item: any) => ({
              ...item,
              statusText:
                item.Fin_Appr === 1 || item.Fin_Appr === "1"
                  ? "Approved"
                  : item.Fin_Appr === 0 || item.Fin_Appr === "0"
                    ? "Rejected"
                    : "Pending",
            }))
          : [];
        setAllData(records);

        const filtered = records.filter((item: any) => {
          if (fromData.Status === "0") {
            return item.Fin_Appr === null || item.Fin_Appr === "null";
          }
          if (fromData.Status === "1") {
            return item.Fin_Appr === 1 || item.Fin_Appr === "1";
          }
          if (fromData.Status === "2") {
            return item.Fin_Appr === 0 || item.Fin_Appr === "0";
          }
          return true;
        });
        setFilteredData(filtered);
      }
    } catch (error) {
      console.error("Error occurred while fetching shift data:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to fetch shift change requests.",
      });
      setAllData([]);
      setFilteredData([]);
    } finally {
      setIsLoading(false);
    }
  }, [
    user?.EMPCODE,
    user?.Comp_Code,
    user?.branch,
    user?.name,
    fromData.DATE_FROM,
    fromData.DATE_TO,
    fromData.Status,
  ]);

  // Sync filter when Status or allData changes
  useEffect(() => {
    if (allData.length > 0) {
      const filtered = allData.filter((item: any) => {
        if (fromData.Status === "0") {
          return item.Fin_Appr === null || item.Fin_Appr === "null";
        }
        if (fromData.Status === "1") {
          return item.Fin_Appr === 1 || item.Fin_Appr === "1";
        }
        if (fromData.Status === "2") {
          return item.Fin_Appr === 0 || item.Fin_Appr === "0";
        }
        return true;
      });
      setFilteredData(filtered);
    } else {
      setFilteredData([]);
    }
  }, [fromData.Status, allData]);

  // Initial load
  useEffect(() => {
    if (user?.EMPCODE && user?.Comp_Code) {
      Tabledata();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.EMPCODE, user?.Comp_Code]);

  // ── Metric Counts ──────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    allData.forEach((item: any) => {
      if (item.Fin_Appr === null || item.Fin_Appr === "null") {
        pending++;
      } else if (item.Fin_Appr === 1 || item.Fin_Appr === "1") {
        approved++;
      } else if (item.Fin_Appr === 0 || item.Fin_Appr === "0") {
        rejected++;
      }
    });

    return {
      pending,
      approved,
      rejected,
      all: allData.length,
    };
  }, [allData]);

  const handleCardClick = (statusKey: string) => {
    setFromData((prev) => ({
      ...prev,
      Status: statusKey,
    }));
  };

  // ── Table Columns ──────────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        Header: "STATUS",
        accessor: "statusText",
        filterPlaceholder: "All status",
        filterOptions: [
          { value: "", label: "All status" },
          { value: "Pending", label: "Pending" },
          { value: "Approved", label: "Approved" },
          { value: "Rejected", label: "Rejected" },
        ],
        Cell: ({ value, row }: any) => {
          const val = value || row.original?.statusText;
          if (val === "Approved" || val === 1 || val === "1") {
            return (
              <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[12px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 shadow-2xs">
                Approved
              </span>
            );
          }
          if (val === "Rejected" || val === 0 || val === "0") {
            return (
              <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[12px] font-semibold bg-red-100 text-red-800 border border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-700 shadow-2xs">
                Rejected
              </span>
            );
          }
          return (
            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[12px] font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-950/60 dark:text-yellow-300 dark:border-yellow-700 shadow-2xs">
              Pending
            </span>
          );
        },
      },
      {
        Header: "Employee Name",
        accessor: "NewEmpName",
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "Designation",
        accessor: "EMPLOYEEDESIGNATION",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-400">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "Current Shift",
        accessor: "Current_SHIFT",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "Date From",
        accessor: "ATN_DATE_FROM",
        Cell: ({ value }: any) => (
          <span className="whitespace-nowrap text-slate-700 dark:text-slate-300">
            {formatDMY(value) || "—"}
          </span>
        ),
      },
      {
        Header: "Date To",
        accessor: "ATN_DATE_TO",
        Cell: ({ value }: any) => (
          <span className="whitespace-nowrap text-slate-700 dark:text-slate-300">
            {formatDMY(value) || "—"}
          </span>
        ),
      },
      {
        Header: "New Shift",
        accessor: "Req_SHIFT",
        Cell: ({ value }: any) => (
          <span className="font-medium text-[#4F46E5] dark:text-indigo-400">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "Reason",
        accessor: "Reason",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-400 max-w-[260px] truncate block" title={value}>
            {value || "—"}
          </span>
        ),
      },
    ],
    [],
  );

  const statusOptions = [
    { value: "0", label: "Pending" },
    { value: "1", label: "Approved" },
    { value: "2", label: "Rejected" },
    { value: "ALL", label: "All records" },
  ];

  const branchDisplay = useMemo(() => {
    if (!user?.branch) return "";
    const b = String(user.branch).trim();
    return b.toUpperCase().startsWith("BRANCH") ? b : `BRANCH - ${b}`;
  }, [user?.branch]);

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[#F8FAFC] dark:bg-[#070D18] px-3 sm:px-5 lg:px-7 py-4 sm:py-5 text-slate-900 dark:text-slate-100">
      <div className="mx-auto w-full max-w-[1600px] min-w-0 space-y-4">
        {/* ── 1. HEADER ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Shift change request view
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Read-only view of every shift change raised, with the current and requested shift side by side.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <AButton
              type="button"
              variant="outline"
              onClick={() => handleExcelDownload(columns, filteredData)}
              loading={isExporting}
              icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
              className="!h-9 !px-3.5 !rounded-lg !border-slate-200 !text-slate-700 !text-sm !font-semibold hover:!bg-slate-50 dark:!border-slate-700 dark:!text-slate-200 dark:!bg-[#111827]"
            >
              Export to Excel
            </AButton>
          </div>
        </div>

        {/* ── 2. STAT CARDS ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: PENDING */}
          <div className="[&>div]:!min-h-[110px] [&>div]:!rounded-2xl [&>div]:!border-slate-200 [&>div]:!bg-white [&>div]:!shadow-[0_1px_3px_rgba(15,23,42,0.04)] [&>div]:transition-all [&>div]:duration-200 [&>div]:hover:!shadow-md dark:[&>div]:!border-slate-800 dark:[&>div]:!bg-[#111827]">
            <StatCard
              title="PENDING"
              count={counts.pending}
              variant="amber"
              icon={<Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
              isActive={fromData.Status === "0"}
              activeClassName="!border-[#4F46E5] !ring-2 !ring-[#4F46E5]/20 !bg-white dark:!bg-[#111827] shadow-sm"
              onClick={() => handleCardClick("0")}
            />
          </div>

          {/* Card 2: APPROVED */}
          <div className="[&>div]:!min-h-[110px] [&>div]:!rounded-2xl [&>div]:!border-slate-200 [&>div]:!bg-white [&>div]:!shadow-[0_1px_3px_rgba(15,23,42,0.04)] [&>div]:transition-all [&>div]:duration-200 [&>div]:hover:!shadow-md dark:[&>div]:!border-slate-800 dark:[&>div]:!bg-[#111827]">
            <StatCard
              title="APPROVED"
              count={counts.approved}
              variant="emerald"
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
              isActive={fromData.Status === "1"}
              activeClassName="!border-[#4F46E5] !ring-2 !ring-[#4F46E5]/20 !bg-white dark:!bg-[#111827] shadow-sm"
              onClick={() => handleCardClick("1")}
            />
          </div>

          {/* Card 3: REJECTED */}
          <div className="[&>div]:!min-h-[110px] [&>div]:!rounded-2xl [&>div]:!border-slate-200 [&>div]:!bg-white [&>div]:!shadow-[0_1px_3px_rgba(15,23,42,0.04)] [&>div]:transition-all [&>div]:duration-200 [&>div]:hover:!shadow-md dark:[&>div]:!border-slate-800 dark:[&>div]:!bg-[#111827]">
            <StatCard
              title="REJECTED"
              count={counts.rejected}
              variant="rose"
              icon={<XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
              isActive={fromData.Status === "2"}
              activeClassName="!border-[#4F46E5] !ring-2 !ring-[#4F46E5]/20 !bg-white dark:!bg-[#111827] shadow-sm"
              onClick={() => handleCardClick("2")}
            />
          </div>

          {/* Card 4: ALL RECORDS */}
          <div className="[&>div]:!min-h-[110px] [&>div]:!rounded-2xl [&>div]:!border-slate-200 [&>div]:!bg-white [&>div]:!shadow-[0_1px_3px_rgba(15,23,42,0.04)] [&>div]:transition-all [&>div]:duration-200 [&>div]:hover:!shadow-md dark:[&>div]:!border-slate-800 dark:[&>div]:!bg-[#111827]">
            <StatCard
              title="ALL RECORDS"
              count={counts.all}
              variant="indigo"
              icon={<Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
              isActive={fromData.Status === "ALL"}
              activeClassName="!border-[#4F46E5] !ring-2 !ring-[#4F46E5]/20 !bg-white dark:!bg-[#111827] shadow-sm"
              onClick={() => handleCardClick("ALL")}
            />
          </div>
        </div>

        {/* ── 3. FILTER BAR ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] p-3 sm:p-4 shadow-sm">
          <div className="grid grid-cols-1 min-[540px]:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-3">
              <Einput
                title="DATE FROM"
                type="date"
                name="DATE_FROM"
                value={fromData.DATE_FROM}
                handleInputChange={handleInputChange}
                className="!h-[36px] !rounded-lg !border-slate-200 dark:!border-slate-700 !bg-white dark:!bg-[#0E1524] text-[13px]"
                labelClassName="!text-[11px] !font-bold !text-slate-500 !uppercase !tracking-wider"
              />
            </div>

            <div className="lg:col-span-3">
              <Einput
                title="DATE TO"
                type="date"
                name="DATE_TO"
                value={fromData.DATE_TO}
                handleInputChange={handleInputChange}
                className="!h-[36px] !rounded-lg !border-slate-200 dark:!border-slate-700 !bg-white dark:!bg-[#0E1524] text-[13px]"
                labelClassName="!text-[11px] !font-bold !text-slate-500 !uppercase !tracking-wider"
              />
            </div>

            <div className="lg:col-span-2">
              <Eselect
                title="STATUS"
                name="Status"
                option={statusOptions}
                initialValue={fromData.Status}
                handleInputChange={handleInputChange}
                className="!h-[36px] !rounded-lg !border-slate-200 dark:!border-slate-700 !bg-white dark:!bg-[#0E1524] text-[13px]"
                labelClassName="!text-[11px] !font-bold !text-slate-500 !uppercase !tracking-wider"
              />
            </div>

            <div className="lg:col-span-2">
              <Einput
                title="BRANCH"
                type="text"
                name="branch"
                value={branchDisplay}
                readOnly
                handleInputChange={() => {}}
                className="!h-[36px] !rounded-lg !border-slate-200 dark:!border-slate-700 !bg-slate-50 dark:!bg-[#0E1524] text-[13px] text-slate-700 dark:text-slate-300 cursor-default"
                labelClassName="!text-[11px] !font-bold !text-slate-500 !uppercase !tracking-wider"
              />
            </div>

            <div className="min-[540px]:col-span-2 lg:col-span-2 flex items-center gap-2 pb-[1px]">
              <AButton
                type="button"
                variant="primary"
                onClick={Tabledata}
                loading={isLoading}
                className="!h-[36px] flex-1 !bg-[#4F46E5] hover:!bg-[#4338CA] !text-white !rounded-lg !font-semibold !text-[13px] shadow-sm whitespace-nowrap"
              >
                Show
              </AButton>
              <AButton
                type="button"
                variant="outline"
                onClick={handleReset}
                className="!h-[36px] !px-3.5 !rounded-lg !border-slate-200 hover:!bg-slate-50 text-slate-700 dark:!border-slate-700 dark:text-slate-300 dark:hover:!bg-slate-800 !font-semibold !text-[13px] whitespace-nowrap"
              >
                Reset
              </AButton>
            </div>
          </div>
        </div>

        {/* ── 4. DATA TABLE ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
          <DataTable
            title={`Shift change requests ${filteredData.length} of ${allData.length} rows`}
            columns={columns}
            data={filteredData}
            check={false}
            selectedRows={selectedRows}
            setSelectedRows={setSelectedRows}
            onRowDoubleClick={doubleclicked}
            showExcelExport={false}
            showTopSearch={false}
            showColumnFilters={true}
            initialPageSize={25}
            footerTextMode="pageItems"
            containerClassName="border-0 shadow-none rounded-none"
          />
        </div>
      </div>

      {/* Global Loading Spinner */}
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
