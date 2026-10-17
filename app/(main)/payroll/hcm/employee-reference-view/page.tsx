"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, FilterX, ChevronDown } from "lucide-react";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import useExcelDownload from "@/app/hooks/excel-download";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import ServiceTablePagination from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

const cardClass =
  "bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)]";

export default function EmployeeReferenceView() {
  const user = useCurrentUser();
  const router = useRouter();
  const { handleExcelDownload, isLoading: isExcelLoading } = useExcelDownload();

  const [tabledata, setTabledata] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState("ALL");
  const [selectedState, setSelectedState] = useState("ALL");
  const [resetTrigger, setResetTrigger] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  function getCurrentDate(monthsBack = 0) {
    const today = new Date();
    today.setMonth(today.getMonth() - monthsBack);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const [dates, setDates] = useState({
    DATE_FROM: getCurrentDate(1),
    DATE_TO: getCurrentDate(0),
  });

  const handleDateChange = (name: string, value: any) => {
    setDates((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const ShowData = async () => {
    setIsLoading(true);
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmployeeReferenceDetails/ViewData`,
        {
          Loc_code: user?.branch,
          DateFrom: dates?.DATE_FROM,
          DateTo: dates?.DATE_TO,
        },
        {
          headers: { compcode: user?.Comp_Code, name: user?.name },
        }
      );
      setTabledata(result?.data?.data || []);
    } catch (error) {
      console.error("Error fetching reference data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    ShowData();
  }, [user?.Comp_Code, user?.branch]);

  const onRowDoubleClick = (row: any) => {
    const utd = row?.UTD ?? row?.original?.UTD;
    if (utd) {
      router.push(`/payroll/hcm/employee-reference-check?UTD=${utd}`);
    }
  };

  // Position filter options
  const positionOptions = useMemo(() => {
    const unique = Array.from(
      new Set(
        tabledata
          .map((item: any) => item?.PositionAppliedFor)
          .filter(Boolean)
      )
    ).sort();
    return [
      { value: "ALL", label: "ALL" },
      ...unique.map((pos) => ({ value: String(pos), label: String(pos) })),
    ];
  }, [tabledata]);

  // State filter options
  const stateOptions = useMemo(() => {
    const unique = Array.from(
      new Set(
        tabledata
          .map((item: any) => item?.StateName)
          .filter(Boolean)
      )
    ).sort();
    return [
      { value: "ALL", label: "ALL" },
      ...unique.map((st) => ({ value: String(st), label: String(st) })),
    ];
  }, [tabledata]);

  // Filtered dataset based on top dropdowns
  const filteredData = useMemo(() => {
    return tabledata.filter((item: any) => {
      if (selectedPosition && selectedPosition !== "ALL") {
        if (
          String(item?.PositionAppliedFor || "").trim().toLowerCase() !==
          String(selectedPosition).trim().toLowerCase()
        ) {
          return false;
        }
      }
      if (selectedState && selectedState !== "ALL") {
        if (
          String(item?.StateName || "").trim().toLowerCase() !==
          String(selectedState).trim().toLowerCase()
        ) {
          return false;
        }
      }
      return true;
    });
  }, [tabledata, selectedPosition, selectedState]);

  // Reset top and column filters
  const handleResetFilters = () => {
    setSelectedPosition("ALL");
    setSelectedState("ALL");
    setResetTrigger((prev) => prev + 1);
  };

  // Export to Excel handler
  const handleExportExcel = () => {
    const exportCols = [
      { Header: "CANDIDATE NAME", accessor: "CandidateName" },
      { Header: "POSITION APPLIED FOR", accessor: "PositionAppliedFor" },
      { Header: "CITY", accessor: "CityName" },
      { Header: "STATE", accessor: "StateName" },
      { Header: "MOBILE NO", accessor: "MobileNo" },
      { Header: "DATE OF REQUEST", accessor: "NewDate_Of_Request" },
    ];
    handleExcelDownload(exportCols, filteredData);
  };

  // Columns for react-table exactly matching design
  const columns = useMemo(
    () => [
      {
        Header: "CANDIDATE NAME",
        accessor: "CandidateName",
        filterPlaceholder: "All candidate name",
        Cell: ({ value, row }: any) => {
          const val = value || row.original?.CandidateName;
          return (
            <span className="font-[600] text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] block truncate">
              {val || "—"}
            </span>
          );
        },
      },
      {
        Header: "POSITION APPLIED FOR",
        accessor: "PositionAppliedFor",
        filterPlaceholder: "All position applied for",
        Cell: ({ value, row }: any) => {
          const val = value || row.original?.PositionAppliedFor;
          return (
            <span className="font-normal text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] block truncate">
              {val || "—"}
            </span>
          );
        },
      },
      {
        Header: "CITY",
        accessor: "CityName",
        filterPlaceholder: "All city",
        Cell: ({ value, row }: any) => {
          const val = value || row.original?.CityName;
          return (
            <span className="font-normal text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] block truncate">
              {val || "—"}
            </span>
          );
        },
      },
      {
        Header: "STATE",
        accessor: "StateName",
        filterPlaceholder: "All state",
        Cell: ({ value, row }: any) => {
          const val = value || row.original?.StateName;
          return (
            <span className="font-normal text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] block truncate">
              {val || "—"}
            </span>
          );
        },
      },
      {
        Header: "MOBILE NO",
        accessor: "MobileNo",
        disableFilter: true,
        Cell: ({ value, row }: any) => {
          const val = value || row.original?.MobileNo;
          return (
            <span className="font-normal text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] font-mono tabular-nums whitespace-nowrap">
              {val || "—"}
            </span>
          );
        },
      },
      {
        Header: "DATE OF REQUEST",
        accessor: "NewDate_Of_Request",
        disableFilter: true,
        Cell: ({ value, row }: any) => {
          const val = value || row.original?.NewDate_Of_Request;
          return (
            <span className="font-normal text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] tabular-nums whitespace-nowrap">
              {formatDate(val)}
            </span>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] font-['Inter',system-ui,sans-serif] p-4 sm:p-6 lg:p-[22px_24px_90px_24px] space-y-[14px]">
      <HashloaderComponent isLoading={isLoading} />

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & ACTION BUTTONS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-[18px]">
        <div>
          <h1 className="text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3] m-0">
            Reference view data
          </h1>
          <p className="mt-[5px] mb-0 text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
            Every background check raised, with the stage it reached and the final report.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <AButton
            type="button"
            variant="outline"
            onClick={handleResetFilters}
            icon={<FilterX className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8]" />}
            className="!h-[36px] px-[13px] !rounded-[10px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] !text-[#1E293B] dark:!text-[#E7ECF3] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] text-[12.5px] font-[550] shadow-none"
          >
            Reset filters
          </AButton>

          <AButton
            type="button"
            variant="primary"
            onClick={handleExportExcel}
            disabled={isExcelLoading || filteredData.length === 0}
            icon={<FileSpreadsheet className="w-4 h-4 text-white dark:text-[#0A0F1C]" />}
            className="!h-[36px] px-[14px] !rounded-[10px] !bg-[#4F46E5] hover:!bg-[#4338CA] dark:!bg-[#8B84FF] dark:hover:!bg-[#7A73FF] text-white dark:text-[#0A0F1C] text-[12.5px] font-[600] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] cursor-pointer active:scale-[0.98]"
          >
            {isExcelLoading ? "Exporting..." : "Export to Excel"}
          </AButton>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. FILTER CARD (exact 170px 170px 1fr 1fr auto layout) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className={`${cardClass} p-[14px_18px_16px_18px]`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[170px_170px_minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 items-end">
          <div className="w-full">
            <Einput
              title="DATE FROM"
              ShortName={true}
              type="date"
              name="DATE_FROM"
              value={dates.DATE_FROM}
              handleInputChange={handleDateChange}
              labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase !leading-tight"
              className="!h-[38px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3] !text-[12.5px] !px-2.5 !py-2 focus-visible:!border-[#4F46E5] dark:focus-visible:!border-[#8B84FF] focus-visible:!ring-0 !shadow-none"
            />
          </div>

          <div className="w-full">
            <Einput
              title="DATE TO"
              ShortName={true}
              type="date"
              name="DATE_TO"
              value={dates.DATE_TO}
              handleInputChange={handleDateChange}
              labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase !leading-tight"
              className="!h-[38px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3] !text-[12.5px] !px-2.5 !py-2 focus-visible:!border-[#4F46E5] dark:focus-visible:!border-[#8B84FF] focus-visible:!ring-0 !shadow-none"
            />
          </div>

          <div className="w-full min-w-0">
            <Eselect
              title="POSITION"
              ShortName={true}
              name="POSITION"
              initialValue={selectedPosition}
              option={positionOptions}
              handleInputChange={(_name, val) => setSelectedPosition(val || "ALL")}
              placeholder="ALL"
              className="!h-[38px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3] !text-[12.5px] !shadow-none focus-within:!border-[#4F46E5] dark:focus-within:!border-[#8B84FF] focus-within:!ring-0"
            />
          </div>

          <div className="w-full min-w-0">
            <Eselect
              title="STATE"
              ShortName={true}
              name="STATE"
              initialValue={selectedState}
              option={stateOptions}
              handleInputChange={(_name, val) => setSelectedState(val || "ALL")}
              placeholder="ALL"
              className="!h-[38px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3] !text-[12.5px] !shadow-none focus-within:!border-[#4F46E5] dark:focus-within:!border-[#8B84FF] focus-within:!ring-0"
            />
          </div>

          <div className="w-full sm:w-auto flex items-end">
            <AButton
              type="button"
              variant="primary"
              onClick={ShowData}
              className="w-full sm:w-auto !h-[38px] px-5 !rounded-[9px] !bg-[#4F46E5] hover:!bg-[#4338CA] dark:!bg-[#8B84FF] dark:hover:!bg-[#7A73FF] text-white dark:text-[#0A0F1C] font-[600] text-[12.5px] cursor-pointer shadow-none active:scale-[0.98]"
            >
              Show
            </AButton>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. TABLE CARD WITH "Reference checks" & PAGE SIZE SELECTOR */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className={`${cardClass} overflow-hidden`}>
        {/* Card Header Bar */}
        <div className="flex items-center justify-between px-[18px] py-[13px] border-b border-[#E2E8F0] dark:border-[#1F2937]">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[14px] font-[600] text-[#1E293B] dark:text-[#E7ECF3] m-0">
              Reference checks
            </h2>
            <span className="text-[11.5px] font-normal text-[#64748B] dark:text-[#94A3B8] font-mono tabular-nums">
              {filteredData.length} of {tabledata.length} rows
            </span>
          </div>

          <div className="flex items-center gap-2 text-[12px] text-[#64748B] dark:text-[#94A3B8] font-medium">
            <span>Rows</span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="appearance-none h-[28px] pl-[9px] pr-[22px] rounded-[9px] border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] text-[12px] font-medium shadow-none cursor-pointer outline-none focus:border-[#4F46E5] dark:focus:border-[#8B84FF]"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <ChevronDown className="w-3 h-3 text-[#64748B] dark:text-[#94A3B8] pointer-events-none absolute right-2 top-2" />
            </div>
          </div>
        </div>

        {/* The ReactTable component with dropdown column filters */}
        <ServiceTablePagination
          key={`${pageSize}-${resetTrigger}`}
          columns={columns}
          data={filteredData}
          initialPageSize={pageSize}
          showColumnFilters={true}
          columnFiltersResetTrigger={resetTrigger}
          showExcelExport={false}
          showTopSearch={false}
          footerTextMode="pageItems"
          onRowDoubleClick={onRowDoubleClick}
          headerClassName="!text-[10.5px] !font-[700] !tracking-[0.05em] !uppercase !text-[#64748B] dark:!text-[#94A3B8] !bg-[#F8FAFC] dark:!bg-[#0E1524] !py-2.5 !px-3 !border-b !border-[#E2E8F0] dark:!border-[#1F2937]"
          containerClassName="!border-0 !rounded-none shadow-none"
        />
      </div>
    </div>
  );
}
