"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { Filter, FileSpreadsheet } from "lucide-react";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import useExcelDownload from "@/app/hooks/excel-download";
import HashloaderComponent from "@/components/Templates/hashloader";
import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import ServiceTablePagination from "@/components/Templates/reacttable";

const cardClass =
  "bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)]";

export default function EmployeeAttritionRatioPage() {
  const user = useCurrentUser();
  const { handleExcelDownload, isLoading: isExcelLoading } = useExcelDownload();

  const [isLoading, setIsLoading] = useState(false);
  const [tabledata, setTabledata] = useState<any[]>([]);
  const [resetFilterTrigger, setResetFilterTrigger] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  function getCurrentDate(monthsBack = 0) {
    const today = new Date();
    today.setMonth(today.getMonth() - monthsBack);
    const year = today.getFullYear();
    let month: any = today.getMonth() + 1;
    let day: any = today.getDate();
    if (month < 10) month = "0" + month;
    if (day < 10) day = "0" + day;
    return `${year}-${month}-${day}`;
  }

  const today = new Date();
  const oneYearBack = new Date();
  oneYearBack.setFullYear(today.getFullYear() - 1);

  const defaultDates = useMemo(
    () => ({
      DATE_FROM: oneYearBack.toISOString().split("T")[0],
      DATE_TO: getCurrentDate(),
    }),
    []
  );

  const [dates, setDates] = useState(defaultDates);

  const handleDateChange = (name: string, value: any) => {
    setDates((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const fetchData = useCallback(async () => {
    if (!user?.Comp_Code) return;
    setIsLoading(true);
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/attritionratio`,
        {
          multi_loc: user?.branch,
          DATEFROM: dates.DATE_FROM,
          DATETO: dates.DATE_TO,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
            token: user?.email,
          },
        }
      );
      setTabledata(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      console.error("Error fetching attrition ratio data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.Comp_Code, user?.branch, user?.name, user?.email, dates.DATE_FROM, dates.DATE_TO]);

  useEffect(() => {
    if (user?.Comp_Code) {
      fetchData();
    }
  }, [user?.Comp_Code, fetchData]);

  const handleResetFilters = () => {
    setDates(defaultDates);
    setResetFilterTrigger((prev) => prev + 1);
  };

  // Enrich tabledata with computed Trend based on Attrition Rate % movement
  const enrichedData = useMemo(() => {
    if (!tabledata || !Array.isArray(tabledata)) return [];

    return tabledata.map((row: any, index: number) => {
      const currentRate = parseFloat(row.AttritionRate ?? row.attrition_rate ?? 0);
      let trend: "Stable" | "Improving" | "Worsening" = "Stable";

      if (index > 0) {
        const prevRate = parseFloat(
          tabledata[index - 1].AttritionRate ?? tabledata[index - 1].attrition_rate ?? 0
        );
        const diff = currentRate - prevRate;
        if (diff > 0.05) {
          trend = "Worsening";
        } else if (diff < -0.07) {
          trend = "Improving";
        } else {
          trend = "Stable";
        }
      } else {
        trend = "Stable";
      }

      return {
        ...row,
        trend,
      };
    });
  }, [tabledata]);

  // Columns definition matching HTML prototype
  const columns = useMemo(
    () => [
      {
        Header: "MONTH",
        accessor: "MonthName",
        filterPlaceholder: "All month",
        filterClassName:
          "!h-[32px] !rounded-[7px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3] !text-[11.5px] !px-2 font-normal",
        Cell: ({ row }: any) => (
          <span className="font-[550] text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] truncate">
            {row.original.MonthName || "—"}
          </span>
        ),
      },
      {
        Header: "OPENING BALANCE",
        accessor: "OpeningBalance",
        disableFilter: true,
        Cell: ({ row }: any) => (
          <span className="tabular-nums font-normal text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px]">
            {row.original.OpeningBalance ?? "—"}
          </span>
        ),
      },
      {
        Header: "EMPLOYEES JOINED",
        accessor: "EmployeesJoined",
        disableFilter: true,
        Cell: ({ row }: any) => (
          <span className="tabular-nums font-normal text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px]">
            {row.original.EmployeesJoined ?? "—"}
          </span>
        ),
      },
      {
        Header: "EMPLOYEES LEFT",
        accessor: "EmployeesLeft",
        disableFilter: true,
        Cell: ({ row }: any) => (
          <span className="tabular-nums font-normal text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px]">
            {row.original.EmployeesLeft ?? "—"}
          </span>
        ),
      },
      {
        Header: "CLOSING BALANCE",
        accessor: "ClosingBalance",
        disableFilter: true,
        Cell: ({ row }: any) => (
          <span className="tabular-nums font-normal text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px]">
            {row.original.ClosingBalance ?? "—"}
          </span>
        ),
      },
      {
        Header: "ATTRITION RATE %",
        accessor: "AttritionRate",
        disableFilter: true,
        Cell: ({ row }: any) => {
          const val = row.original.AttritionRate;
          return (
            <span className="tabular-nums font-[500] text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px]">
              {val !== undefined && val !== null ? Number(val).toFixed(2) : "0.00"}
            </span>
          );
        },
      },
      {
        Header: "TREND",
        accessor: "trend",
        filterPlaceholder: "All trend",
        filterClassName:
          "!h-[32px] !rounded-[7px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3] !text-[11.5px] !px-2 font-normal",
        Cell: ({ row }: any) => {
          const trend = row.original.trend || "Stable";
          if (trend === "Improving") {
            return (
              <span className="inline-flex items-center gap-[6px] text-[11px] font-[600] text-[#10B981] bg-[#10B981]/[0.08] border border-[#10B981]/30 px-[8px] py-[3.5px] rounded-[8px] whitespace-nowrap">
                <span className="w-[6px] h-[6px] rounded-full bg-[#10B981] shrink-0" />
                Improving
              </span>
            );
          }
          if (trend === "Worsening") {
            return (
              <span className="inline-flex items-center gap-[6px] text-[11px] font-[600] text-[#E11D48] bg-[#E11D48]/[0.08] border border-[#E11D48]/30 px-[8px] py-[3.5px] rounded-[8px] whitespace-nowrap">
                <span className="w-[6px] h-[6px] rounded-full bg-[#E11D48] shrink-0" />
                Worsening
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-[6px] text-[11px] font-[600] text-[#0EA5E9] bg-[#0EA5E9]/[0.08] border border-[#0EA5E9]/30 px-[8px] py-[3.5px] rounded-[8px] whitespace-nowrap">
              <span className="w-[6px] h-[6px] rounded-full bg-[#0EA5E9] shrink-0" />
              Stable
            </span>
          );
        },
      },
    ],
    []
  );

  const handleExportExcel = () => {
    handleExcelDownload(columns, enrichedData);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] font-['Inter',system-ui,sans-serif] p-4 sm:p-6 lg:p-[22px_24px_80px_24px] space-y-[14px]">
      <HashloaderComponent isLoading={isLoading} />

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & ACTION BUTTONS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-[18px]">
        <div>
          <h1 className="text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3] m-0">
            Employee attrition ratio
          </h1>
          <p className="mt-[5px] mb-0 text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
            Opening and closing headcount with joiners, leavers and the attrition rate per month.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <AButton
            type="button"
            variant="outline"
            onClick={handleResetFilters}
            className="!h-auto !py-[8px] !px-[13px] !rounded-[10px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] !text-[#1E293B] dark:!text-[#E7ECF3] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] !text-[12.5px] !font-[550] transition-colors"
          >
            <Filter className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8] mr-1.5" />
            Reset filters
          </AButton>

          <AButton
            type="button"
            variant="primary"
            onClick={handleExportExcel}
            loading={isExcelLoading}
            className="!h-auto !py-[8px] !px-[14px] !rounded-[10px] !border-transparent !bg-[#4F46E5] hover:!bg-[#4338CA] text-white !text-[12.5px] !font-[600] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-white mr-1.5" />
            Export to Excel
          </AButton>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. DATE FILTER CARD */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className={`${cardClass} p-[14px_18px_16px_18px] mb-[14px]`}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-[170px]">
            <Einput
              title="Date from"
              type="date"
              name="DATE_FROM"
              value={dates.DATE_FROM}
              handleInputChange={handleDateChange}
              className="!h-[36px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3] !text-[12.5px] px-[10px] py-[8px]"
              labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !uppercase !tracking-[0.03em] mb-[5px]"
            />
          </div>

          <div className="w-full sm:w-[170px]">
            <Einput
              title="Date to"
              type="date"
              name="DATE_TO"
              value={dates.DATE_TO}
              handleInputChange={handleDateChange}
              className="!h-[36px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3] !text-[12.5px] px-[10px] py-[8px]"
              labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !uppercase !tracking-[0.03em] mb-[5px]"
            />
          </div>

          <AButton
            type="button"
            variant="primary"
            onClick={fetchData}
            loading={isLoading}
            className="!h-[36px] px-[20px] py-[9px] !rounded-[9px] !border-transparent !bg-[#4F46E5] hover:!bg-[#4338CA] text-white !text-[12.5px] !font-[600] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] whitespace-nowrap transition-all"
          >
            Show
          </AButton>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. TABLE CARD */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className={`${cardClass} overflow-hidden`}>
        {/* Table Card Header Bar */}
        <div className="flex items-center justify-between gap-3 px-[18px] py-[13px] border-b border-[#E2E8F0] dark:border-[#1F2937]">
          <div className="flex items-center gap-[10px]">
            <h2 className="text-[14px] font-[600] text-[#1E293B] dark:text-[#E7ECF3] m-0">
              Month-wise movement
            </h2>
            <span className="text-[11.5px] font-normal text-[#64748B] dark:text-[#94A3B8] tabular-nums">
              {enrichedData.length} of {tabledata.length} rows
            </span>
          </div>

          <div className="flex items-center gap-2 text-[12px] text-[#64748B] dark:text-[#94A3B8] font-normal whitespace-nowrap">
            <span>Rows</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="appearance-none border border-[#E2E8F0] dark:border-[#1F2937] rounded-[9px] bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] text-[12px] pl-[9px] pr-[22px] py-[5px] outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* ServiceTablePagination */}
        <ServiceTablePagination
          columns={columns}
          data={enrichedData}
          initialPageSize={pageSize}
          height="580px"
          showTopSearch={false}
          showExcelExport={false}
          showColumnFilters={true}
          columnFiltersResetTrigger={resetFilterTrigger}
          footerTextMode="pageItems"
          containerClassName="!border-0 !rounded-none shadow-none [&_table]:w-full [&_table]:border-collapse [&_th]:!bg-[#F8FAFC] dark:[&_th]:!bg-[#0E1524] [&_th]:!border-b [&_th]:!border-[#E2E8F0] dark:[&_th]:!border-[#1F2937] [&_th]:!py-[9px] [&_th]:!px-[10px] [&_th]:!text-[10.5px] [&_th]:!font-[700] [&_th]:!tracking-[0.05em] [&_th]:!uppercase [&_th]:!text-[#64748B] dark:[&_th]:!text-[#94A3B8] [&_td]:!py-[10px] [&_td]:!px-[10px] [&_td]:!border-b [&_td]:!border-[#E2E8F0] dark:[&_td]:!border-[#1F2937] [&_tbody_tr]:hover:!bg-[#F8FAFC] dark:[&_tbody_tr]:hover:!bg-[#0E1524] [&>div:last-child]:!bg-[#F8FAFC] dark:[&>div:last-child]:!bg-[#0E1524] [&>div:last-child]:!border-t [&>div:last-child]:!border-[#E2E8F0] dark:[&>div:last-child]:!border-[#1F2937] [&>div:last-child]:!py-[12px] [&>div:last-child]:!px-[18px]"
          headerClassName="!text-[10.5px] !font-[700] !tracking-[0.05em] !uppercase !text-[#64748B] dark:!text-[#94A3B8] !bg-[#F8FAFC] dark:!bg-[#0E1524] !py-[9px] !px-[10px] !border-b !border-[#E2E8F0] dark:!border-[#1F2937]"
        />
      </div>
    </div>
  );
}
