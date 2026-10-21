"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { FilterX, FileSpreadsheet } from "lucide-react";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import HashloaderComponent from "@/components/Templates/hashloader";
import AButton from "@/components/atoms/Button";
import ServiceTablePagination from "@/components/Templates/reacttable";
import useExcelDownload from "@/app/hooks/excel-download";

export default function EmployeeVacantPositionPage() {
  const user = useCurrentUser();
  const { handleExcelDownload, isLoading: isExcelLoading } = useExcelDownload();

  const [tableData, setTableData] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedOption, setSelectedOption] = useState<"branch" | "department">("branch");
  const [loading, setLoading] = useState<boolean>(false);
  const [pageSize, setPageSize] = useState<number>(20);
  const [resetTrigger, setResetTrigger] = useState<number>(0);

  // Status calculation logic based on Budgeted vs Actual position
  const enrichDataWithStatus = (list: any[]): any[] => {
    if (!Array.isArray(list)) return [];
    return list.map((item) => {
      let status = item.Position || item.position || item.Status || item.status;
      if (!status) {
        const actual = Number(item.Actual_Position || 0);
        const budgeted = Number(item.Budgeted_Position || 0);
        if (actual === 0 && budgeted > 0) {
          status = "Vacant";
        } else if (actual > budgeted) {
          status = "Overstaffed";
        } else if (actual < budgeted) {
          status = "Understaffed";
        } else {
          status = "On budget";
        }
      }
      return {
        ...item,
        Position_Status: status,
      };
    });
  };

  // Currency formatter (Indian numbering format with commas)
  const formatCurrency = (value: any) => {
    if (value === null || value === undefined || value === "") return "0";
    const num =
      typeof value === "number"
        ? value
        : parseFloat(String(value).replace(/,/g, ""));
    if (isNaN(num) || num === 0) return "0";
    return num.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });
  };

  // Position count formatter
  const formatCount = (value: any) => {
    if (value === null || value === undefined || value === "") return "0";
    const num = Number(value);
    return isNaN(num) ? "0" : num.toLocaleString("en-IN");
  };

  // Table Columns with exact styling from HTML prototype
  const columns = useMemo(
    () => [
      {
        Header: "Description",
        accessor: "Description",
        filterPlaceholder: "All description",
        Cell: ({ value }: any) => (
          <span className="font-[600] text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] block truncate">
            {value ?? "—"}
          </span>
        ),
      },
      {
        Header: "Budgeted position",
        accessor: "Budgeted_Position",
        disableFilter: true,
        Cell: ({ value }: any) => (
          <span className="font-[400] text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums block">
            {formatCount(value)}
          </span>
        ),
      },
      {
        Header: "Budgeted salary",
        accessor: "Budgeted_Salary",
        disableFilter: true,
        Cell: ({ value }: any) => (
          <span className="font-[400] text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums block">
            {formatCurrency(value)}
          </span>
        ),
      },
      {
        Header: "Actual position",
        accessor: "Actual_Position",
        disableFilter: true,
        Cell: ({ value }: any) => (
          <span className="font-[400] text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums block">
            {formatCount(value)}
          </span>
        ),
      },
      {
        Header: "Actual salary",
        accessor: "Actual_Salary",
        disableFilter: true,
        Cell: ({ value }: any) => (
          <span className="font-[400] text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums block">
            {formatCurrency(value)}
          </span>
        ),
      },
      {
        Header: "Short position",
        accessor: "Short_Position",
        disableFilter: true,
        Cell: ({ value }: any) => (
          <span className="font-[400] text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums block">
            {formatCount(value)}
          </span>
        ),
      },
      {
        Header: "Excess position",
        accessor: "Excess_Position",
        disableFilter: true,
        Cell: ({ value }: any) => (
          <span className="font-[400] text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums block">
            {formatCount(value)}
          </span>
        ),
      },
      {
        Header: "Short salary",
        accessor: "Short_Salary",
        disableFilter: true,
        Cell: ({ value }: any) => (
          <span className="font-[400] text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums block">
            {formatCurrency(value)}
          </span>
        ),
      },
      {
        Header: "Excess salary",
        accessor: "Excess_Salary",
        disableFilter: true,
        Cell: ({ value }: any) => (
          <span className="font-[400] text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums block">
            {formatCurrency(value)}
          </span>
        ),
      },
      {
        Header: "Position",
        accessor: "Position_Status",
        filterPlaceholder: "All position",
        filterOptions: [
          { value: "Overstaffed", label: "Overstaffed" },
          { value: "Vacant", label: "Vacant" },
          { value: "Understaffed", label: "Understaffed" },
          { value: "On budget", label: "On budget" },
        ],
        Cell: ({ value }: any) => {
          const status = String(value || "");
          let tint = "#10B981";
          let label = status || "On budget";

          if (status === "Overstaffed") tint = "#E11D48";
          else if (status === "Understaffed") tint = "#F59E0B";
          else if (status === "Vacant") tint = "#7C3AED";
          else if (status === "On budget") tint = "#10B981";

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
    []
  );

  // Fetch API data
  const fetchData = async () => {
    if (!user?.Comp_Code) return;
    setLoading(true);
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/Vacant_postion`,
        {},
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
            token: user?.email,
          },
        }
      );
      const rawBranches = result.data?.branches || [];
      const rawDepartments = result.data?.Department || [];

      const enrichedBranches = enrichDataWithStatus(rawBranches);
      const enrichedDepartments = enrichDataWithStatus(rawDepartments);

      setBranches(enrichedBranches);
      setDepartments(enrichedDepartments);
      setTableData(
        selectedOption === "branch" ? enrichedBranches : enrichedDepartments
      );
    } catch (err) {
      console.error("Error fetching vacant position data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.Comp_Code, user?.name]);

  // Option change (Branch Wise / Department Wise)
  const handleOptionChange = (option: "branch" | "department") => {
    setSelectedOption(option);
    if (option === "branch") {
      setTableData(branches);
    } else {
      setTableData(departments);
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setResetTrigger((prev) => prev + 1);
  };

  // Export to Excel
  const handleExportToExcel = () => {
    handleExcelDownload(columns, tableData);
  };

  const onRowDoubleClick = (row: any) => {
    console.log("Row clicked:", row);
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] p-[22px_24px_90px_24px] font-['Inter',system-ui,sans-serif]">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & ACTIONS (Matching HTML prototype exactly) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-[20px] mb-[18px]">
        <div>
          <h1 className="m-0 text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
            Employee vacant positions
          </h1>
          <p className="mt-[5px] mb-0 text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
            Budgeted against actual headcount and salary, {selectedOption === "branch" ? "branch by branch" : "department by department"} — short and excess in one view.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-[8px]">
          {/* Segmented Pill Switcher (Branch Wise / Department Wise) */}
          <div className="inline-flex items-center gap-[3px] rounded-[10px] border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0E1524] p-[3px] shrink-0">
            <button
              type="button"
              onClick={() => handleOptionChange("branch")}
              className={`px-[12px] py-[6px] rounded-[8px] text-[12px] font-[600] transition-colors cursor-pointer border-0 ${
                selectedOption === "branch"
                  ? "bg-[#4F46E5] text-white shadow-xs"
                  : "bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#E7ECF3]"
              }`}
            >
              Branch Wise
            </button>
            <button
              type="button"
              onClick={() => handleOptionChange("department")}
              className={`px-[12px] py-[6px] rounded-[8px] text-[12px] font-[600] transition-colors cursor-pointer border-0 ${
                selectedOption === "department"
                  ? "bg-[#4F46E5] text-white shadow-xs"
                  : "bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#E7ECF3]"
              }`}
            >
              Department Wise
            </button>
          </div>

          {/* Reset Filters Button */}
          <AButton
            variant="outline"
            icon={<FilterX className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8]" />}
            onClick={handleResetFilters}
            className="!h-auto !py-[8px] !px-[13px] !text-[12.5px] !font-[550] !rounded-[10px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] !text-[#1E293B] dark:!text-[#E7ECF3] hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235]"
          >
            Reset filters
          </AButton>

          {/* Export to Excel Button */}
          <AButton
            variant="primary"
            icon={<FileSpreadsheet className="w-4 h-4 text-white" />}
            onClick={handleExportToExcel}
            loading={isExcelLoading}
            loadingText="Exporting..."
            className="!h-auto !py-[8px] !px-[14px] !text-[12.5px] !font-[600] !rounded-[10px] !border-transparent !bg-[#4F46E5] hover:!bg-[#4338CA] !text-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)]"
          >
            Export to Excel
          </AButton>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. TABLE CARD CONTAINER (Matching HTML prototype exactly) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] overflow-hidden">
        {/* Table Top Bar */}
        <div className="flex items-center gap-[10px] px-[18px] py-[13px] border-b border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827]">
          <h2 className="m-0 text-[14px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
            Budget vs actual
          </h2>
          <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
            {tableData.length} of {tableData.length} rows
          </span>
          <div className="flex-1" />
          <label className="flex items-center gap-[8px] text-[12px] text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
            Rows
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="appearance-none border border-[#E2E8F0] dark:border-[#1F2937] rounded-[9px] bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] text-[12px] font-medium py-[6px] pl-[9px] pr-[22px] outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </label>
        </div>

        {/* ReactTable with Scoped Styles Matching HTML Prototype */}
        <div className="vacant-table-container [&_th]:!py-[9px] [&_th]:!px-[10px] [&_th]:!text-[10.5px] [&_th]:!font-[700] [&_th]:!tracking-[0.05em] [&_th]:!text-[#64748B] dark:[&_th]:!text-[#94A3B8] [&_th]:!bg-[#F8FAFC] dark:[&_th]:!bg-[#0E1524] [&_th]:!border-b [&_th]:!border-[#E2E8F0] dark:[&_th]:!border-[#1F2937] [&_td]:!py-[10px] [&_td]:!px-[10px] [&_td]:!text-[12.5px] [&_td]:!border-b [&_td]:!border-[#E2E8F0] dark:[&_td]:!border-[#1F2937] [&_tbody_tr:hover]:!bg-[#F8FAFC] dark:[&_tbody_tr:hover]:!bg-[#0E1524] [&_tbody_tr]:transition-colors [&_.border-t]:!border-[#E2E8F0] dark:[&_.border-t]:!border-[#1F2937] [&_.border-t]:!bg-[#F8FAFC] dark:[&_.border-t]:!bg-[#0E1524] [&_.border-t]:!px-[18px] [&_.border-t]:!py-[12px] [&_.border-t]:!text-[12px] [&_.border-t]:!text-[#64748B] dark:[&_.border-t]:!text-[#94A3B8] [&_.border-t_button]:!text-[12px] [&_.border-t_button]:!font-[600] [&_.border-t_button]:!py-[6px] [&_.border-t_button]:!px-[12px] [&_.border-t_button]:!rounded-[8px] [&_.border-t_button]:!border-[#E2E8F0] dark:[&_.border-t_button]:!border-[#1F2937] [&_.border-t_button]:!bg-white dark:[&_.border-t_button]:!bg-[#111827] [&_.border-t_button]:!text-[#1E293B] dark:[&_.border-t_button]:!text-[#E7ECF3]">
          <ServiceTablePagination
            key={`${selectedOption}-${pageSize}-${resetTrigger}`}
            columns={columns}
            data={tableData}
            initialPageSize={pageSize}
            showExcelExport={false}
            showTopSearch={false}
            columnFiltersResetTrigger={resetTrigger}
            footerTextMode="pageItems"
            onRowDoubleClick={onRowDoubleClick}
            containerClassName="border-0 shadow-none rounded-none bg-transparent"
          />
        </div>
      </div>

      <HashloaderComponent isLoading={loading} />
    </div>
  );
}
