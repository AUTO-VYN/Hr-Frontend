"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  FileText,
  CalendarClock,
  CheckCircle2,
  UserCheck,
  UserX,
  FolderArchive,
  RotateCcw,
  FileSpreadsheet,
  ChevronsUpDown,
  ChevronDown,
  FilterX,
} from "lucide-react";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useDateRange } from "@/app/hooks/use-date-range";
import useExcelDownload from "@/app/hooks/excel-download";
import ServiceTablePagination from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";
import Card from "@/components/Templates/card";
import Einput from "@/components/atoms/Einput"
import { Button } from "antd";

// Separate Filter Input to prevent input focus loss during typing
const ColumnFilterInput = React.memo(
  ({
    columnKey,
    placeholder,
    resetTrigger,
    onFilterChange,
  }: {
    columnKey: string;
    placeholder: string;
    resetTrigger: number;
    onFilterChange: (key: string, val: string) => void;
  }) => {
    const [val, setVal] = useState("");

    useEffect(() => {
      setVal("");
    }, [resetTrigger]);

    const handleInputChange = (_name: string, value: any) => {
      const next = value ?? "";
      setVal(next);
      onFilterChange(columnKey, next);
    };

    return (
      <div
        className="w-full mt-1.5 [&_label]:hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Einput
          title=""
          type="text"
          name={columnKey}
          value={val}
          placeholder={placeholder}
          handleInputChange={handleInputChange}
          className="h-8 px-2.5 text-xs sm:text-[13px] font-normal"
        />
      </div>
    );
  }
);
ColumnFilterInput.displayName = "ColumnFilterInput";

export default function RecruitmentDetailedReportPage() {
  const user = useCurrentUser() as any;
  const { handleExcelDownload, isLoading: isExcelLoading } = useExcelDownload();

  // Date Range Hook
  const dateRange = useDateRange({ preset: "last_30_days" });

  // Filter States
  const [channel, setChannel] = useState<string>("ALL");
  const [cluster, setCluster] = useState<string>("ALL");
  const [channelOptions, setChannelOptions] = useState<
    { label: string; value: string }[]
  >([{ label: "ALL", value: "ALL" }]);
  const [clusterOptions, setClusterOptions] = useState<
    { label: string; value: string }[]
  >([{ label: "ALL", value: "ALL" }]);

  // Data & Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [counts, setCounts] = useState({
    applications: 0,
    in_interview: 0,
    selected: 0,
    rejected: 0,
  });

  // Table Controls
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [resetTrigger, setResetTrigger] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Active Card Filter: "ALL" | "IN_INTERVIEW" | "RESUME_BANK" | "SELECTED" | "SHORTLISTED" | "REJECTED"
  const [activeCardFilter, setActiveCardFilter] = useState<
    "ALL" | "IN_INTERVIEW" | "RESUME_BANK" | "SELECTED" | "SHORTLISTED" | "REJECTED"
  >("ALL");

  // Helper: Format Date string to DD-MM-YYYY
  const formatDate = (dateString: any) => {
    if (!dateString || dateString === "null" || dateString === "—") return "—";
    try {
      const d = new Date(dateString);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
      }
    } catch { }
    return String(dateString);
  };

  // Helper: Format Status Label and Color Badge
  const getStatusInfo = useCallback((row: any) => {
    const s = String(row?.INT_STATUS ?? "");
    const conclusion = String(row?.conclusion || "").toLowerCase();
    const isRejected =
      Boolean(row?.REJECTED_BY) ||
      Boolean(row?.REJECTION_DATE) ||
      s === "4" ||
      s === "102" ||
      conclusion.includes("reject");
    const isSelected =
      !isRejected &&
      (s === "3" ||
        s === "101" ||
        s === "103" ||
        conclusion.includes("select") ||
        (row?.EMPCODE && String(row.EMPCODE).trim() !== ""));

    if (s === "1") {
      return {
        label: "Entry in resume bank",
        dotColor: "bg-[#0284c7] dark:bg-sky-400",
        badgeStyle:
          "bg-[#f0f9ff] text-[#0284c7] border-[#7dd3fc] dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60",
      };
    }
    if (s === "2") {
      return {
        label: "Shortlisted",
        dotColor: "bg-[#4f46e5] dark:bg-indigo-400",
        badgeStyle:
          "bg-[#eef2ff] text-[#4f46e5] border-[#a5b4fc] dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60",
      };
    }
    if (s === "3") {
      return {
        label: "Interview in processing",
        dotColor: "bg-[#d97706] dark:bg-amber-400",
        badgeStyle:
          "bg-[#fffbeb] text-[#d97706] border-[#fcd34d] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
      };
    }
    if (s === "100") {
      return {
        label: "All Interview Done",
        dotColor: "bg-[#7c3aed] dark:bg-purple-400",
        badgeStyle:
          "bg-[#faf5ff] text-[#7c3aed] border-[#d8b4fe] dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60",
      };
    }
    if (s === "101") {
      return {
        label: "Finally selected by HR",
        dotColor: "bg-[#059669] dark:bg-emerald-400",
        badgeStyle:
          "bg-[#f0fdf4] text-[#059669] border-[#86efac] dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
      };
    }
    if (s === "102") {
      return {
        label: "Finally rejected by HR",
        dotColor: "bg-[#e11d48] dark:bg-rose-400",
        badgeStyle:
          "bg-[#fff1f2] text-[#e11d48] border-[#fca5a5] dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
      };
    }
    if (s === "103") {
      return {
        label: "Employee master Created",
        dotColor: "bg-[#059669] dark:bg-emerald-400",
        badgeStyle:
          "bg-[#f0fdf4] text-[#059669] border-[#86efac] dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
      };
    }
    if (s === "104") {
      return {
        label: "Removed From employee Master",
        dotColor: "bg-slate-500",
        badgeStyle:
          "bg-slate-50 text-slate-600 border-slate-300 dark:bg-slate-900/50 dark:text-slate-300 dark:border-slate-700",
      };
    }
    if (isRejected) {
      return {
        label: "Finally rejected by HR",
        dotColor: "bg-[#e11d48] dark:bg-rose-400",
        badgeStyle:
          "bg-[#fff1f2] text-[#e11d48] border-[#fca5a5] dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
      };
    }
    if (isSelected) {
      return {
        label: "Finally selected by HR",
        dotColor: "bg-[#059669] dark:bg-emerald-400",
        badgeStyle:
          "bg-[#f0fdf4] text-[#059669] border-[#86efac] dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
      };
    }
    return {
      label: "Entry in resume bank",
      dotColor: "bg-[#0284c7] dark:bg-sky-400",
      badgeStyle:
        "bg-[#f0f9ff] text-[#0284c7] border-[#7dd3fc] dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60",
    };
  }, []);

  // Fetch Master Data (Channels & Clusters)
  useEffect(() => {
    const fetchMasters = async () => {
      const compcode =
        user?.Comp_Code || user?.compcode || user?.COMP_CODE || user?.DB;
      if (!compcode) return;

      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/employee/masters`,
          {},
          {
            headers: {
              compcode: String(compcode),
              name: user?.name || "",
            },
          }
        );

        const convert = (arr: any[]) => {
          if (!arr || !Array.isArray(arr)) return [];
          return arr.map((item) => ({
            label: item.label || item.labelname || item.value,
            value: String(item.value || item.label),
          }));
        };

        const masters = response.data?.data || {};
        const chOpts = convert(masters.CHANNEL1 || []);
        const clOpts = convert(masters.CLUSTER1 || []);

        setChannelOptions([{ label: "ALL", value: "ALL" }, ...chOpts]);
        setClusterOptions([{ label: "ALL", value: "ALL" }, ...clOpts]);
      } catch (err) {
        console.error("Error fetching master data:", err);
      }
    };

    fetchMasters();
  }, [user]);

  // Fetch Detailed Report Data
  const fetchData = useCallback(async () => {
    const compcode =
      user?.Comp_Code || user?.compcode || user?.COMP_CODE || user?.DB;
    if (!compcode) return;

    const branchVal =
      user?.branch ?? user?.Primary_Branch ?? user?.branch_code ?? 1;
    const branchNum = Number(branchVal) || 1;

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/detailedreport`,
        {
          loc_code: branchNum,
          DATE_FROM: dateRange.DATE_FROM,
          DATE_TO: dateRange.DATE_TO,
          Channel: channel,
          Cluster: cluster,
        },
        {
          headers: {
            compcode: String(compcode),
            name: user?.name || "",
          },
        }
      );

      const rawData = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];

      // Sort by TRAN_ID descending
      const   sorted = [...rawData].sort(
        (a, b) => Number(b.TRAN_ID || 0) - Number(a.TRAN_ID || 0)
      );
      setTableData(sorted);

      // Counts
      if (response.data?.counts) {
        setCounts({
          applications: Number(response.data.counts.applications || 0),
          in_interview: Number(
            response.data.counts.in_interview ||
            response.data.counts.inInterview ||
            0
          ),
          selected: Number(response.data.counts.selected || 0),
          rejected: Number(response.data.counts.rejected || 0),
        });
      } else {
        // Compute from data if not returned directly
        let inInt = 0;
        let sel = 0;
        let rej = 0;
        sorted.forEach((r) => {
          const s = String(r.INT_STATUS || "");
          const c = String(r.conclusion || "").toLowerCase();
          if (
            r.REJECTED_BY ||
            r.REJECTION_DATE ||
            s === "4" ||
            s === "102" ||
            c.includes("reject")
          ) {
            rej++;
          } else if (
            s === "3" ||
            s === "101" ||
            s === "103" ||
            c.includes("select")
          ) {
            sel++;
          } else if (s === "2" || r.INTR1DATE || r.INTR1BY) {
            inInt++;
          }
        });
        setCounts({
          applications: sorted.length,
          in_interview: inInt,
          selected: sel,
          rejected: rej,
        });
      }
    } catch (err: any) {
      console.error("Error fetching detailed report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, dateRange.DATE_FROM, dateRange.DATE_TO, channel, cluster]);

  // Initial Data Load
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Handle Column Filter Change
  const handleColumnFilter = useCallback((key: string, val: string) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (!val || val.trim() === "") {
        delete next[key];
      } else {
        next[key] = val.trim().toLowerCase();
      }
      return next;
    });
  }, []);

  // Reset Filters
  const handleResetFilters = useCallback(() => {
    dateRange.reset();
    setChannel("ALL");
    setCluster("ALL");
    setActiveCardFilter("ALL");
    setColumnFilters({});
    setResetTrigger((prev) => prev + 1);
  }, [dateRange]);

  // Dynamic Card Counts computed directly from tableData to guarantee 100% match with rows
  const cardCounts = useMemo(() => {
    let applications = tableData.length;
    let in_interview = 0;
    let resume_bank = 0;
    let selected = 0;
    let shortlisted = 0;
    let rejected = 0;

    tableData.forEach((item) => {
      const info = getStatusInfo(item);
      const s = String(item?.INT_STATUS ?? "");
      const lbl = info.label;

      if (
        lbl === "Finally rejected by HR" ||
        lbl === "Removed From employee Master" ||
        s === "102" ||
        s === "104" ||
        s === "4" ||
        Boolean(item?.REJECTED_BY) ||
        Boolean(item?.REJECTION_DATE)
      ) {
        rejected++;
      } else if (
        lbl === "Employee master Created" ||
        lbl === "Finally selected by HR" ||
        s === "103" ||
        s === "101"
      ) {
        selected++;
      } else if (
        lbl === "Interview in processing" ||
        lbl === "All Interview Done" ||
        s === "3" ||
        s === "100"
      ) {
        in_interview++;
      } else if (lbl === "Shortlisted" || s === "2") {
        shortlisted++;
      } else if (lbl === "Entry in resume bank" || s === "1") {
        resume_bank++;
      }
    });

    return {
      applications,
      in_interview,
      resume_bank,
      selected,
      shortlisted,
      rejected,
    };
  }, [tableData, getStatusInfo]);

  // Filter Data
  const filteredData = useMemo(() => {
    // 1. Filter by Active Card
    let base = tableData;
    if (activeCardFilter === "IN_INTERVIEW") {
      base = base.filter((item) => {
        const info = getStatusInfo(item);
        const s = String(item?.INT_STATUS ?? "");
        return (
          info.label === "Interview in processing" ||
          info.label === "All Interview Done" ||
          s === "3" ||
          s === "100"
        );
      });
    } else if (activeCardFilter === "RESUME_BANK") {
      base = base.filter((item) => {
        const info = getStatusInfo(item);
        const s = String(item?.INT_STATUS ?? "");
        return info.label === "Entry in resume bank" || s === "1";
      });
    } else if (activeCardFilter === "SELECTED") {
      base = base.filter((item) => {
        const info = getStatusInfo(item);
        const s = String(item?.INT_STATUS ?? "");
        return (
          info.label === "Employee master Created" ||
          info.label === "Finally selected by HR" ||
          s === "101" ||
          s === "103"
        );
      });
    } else if (activeCardFilter === "SHORTLISTED") {
      base = base.filter((item) => {
        const info = getStatusInfo(item);
        const s = String(item?.INT_STATUS ?? "");
        return info.label === "Shortlisted" || s === "2";
      });
    } else if (activeCardFilter === "REJECTED") {
      base = base.filter((item) => {
        const info = getStatusInfo(item);
        const s = String(item?.INT_STATUS ?? "");
        return (
          info.label === "Finally rejected by HR" ||
          info.label === "Removed From employee Master" ||
          s === "102" ||
          s === "104" ||
          s === "4" ||
          Boolean(item?.REJECTED_BY) ||
          Boolean(item?.REJECTION_DATE)
        );
      });
    }

    // 2. Column Filters
    const filterKeys = Object.keys(columnFilters);
    if (filterKeys.length === 0) return base;

    return base.filter((item) => {
      return filterKeys.every((key) => {
        const query = columnFilters[key];
        if (!query) return true;

        if (key === "INT_STATUS") {
          const info = getStatusInfo(item);
          return (
            info.label.toLowerCase().includes(query) ||
            String(item.INT_STATUS || "").toLowerCase().includes(query)
          );
        }

        if (
          key === "APPLICATION_DATE1" ||
          key === "shortlist_date" ||
          key === "REJECTION_DATE"
        ) {
          const formatted = formatDate(item[key]);
          return (
            formatted.toLowerCase().includes(query) ||
            String(item[key] || "").toLowerCase().includes(query)
          );
        }

        const val = item[key];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(query);
      });
    });
  }, [tableData, activeCardFilter, columnFilters, getStatusInfo]);

  // Export to Excel
  const handleExportExcel = useCallback(() => {
    if (!filteredData || filteredData.length === 0) return;

    const exportColumns = [
      { Header: "SR", accessor: "TRAN_ID" },
      {
        Header: "Status",
        accessor: "INT_STATUS",
        Cell: ({ row }: any) => getStatusInfo(row?.original)?.label || "",
      },
      {
        Header: "Application Date",
        accessor: "APPLICATION_DATE1",
        Cell: ({ value }: any) => formatDate(value),
      },
      { Header: "Name", accessor: "NAME" },
      { Header: "Email", accessor: "EMAIL" },
      { Header: "Mobile No", accessor: "MOB_NO" },
      { Header: "Source of Enquiry", accessor: "SOURCE_OF_REG_Label" },
      { Header: "Address", accessor: "ADDRESS" },
      { Header: "Cluster", accessor: "CLUSTERLabel" },
      { Header: "Channel", accessor: "CHANNELLabel" },
      { Header: "Designation", accessor: "DESIGNATION" },
      ...(user?.Comp_Code === "MLAPL-25"
        ? [{ Header: "Suitable Designation", accessor: "SUITABLE_DESIGNATION" }]
        : []),
      { Header: "Location", accessor: "LOC_CODE1" },
      { Header: "Highest Qualification", accessor: "HIGH_QUAL" },
      { Header: "Passing Percentage", accessor: "PASSING_PER" },
      { Header: "Years of Experience", accessor: "EXP_IN_YEAR" },
      { Header: "Skills", accessor: "SKILLS" },
      { Header: "Current CTC", accessor: "CURRENT_CTC" },
      { Header: "Expected CTC", accessor: "EXPECTED_CTC" },
      { Header: "Interviewer 1st", accessor: "employeename1" },
      { Header: "Remark 1", accessor: "INTR1REMARK" },
      { Header: "INTR 1 Rating", accessor: "INTR1RATING" },
      { Header: "Interviewer 2nd", accessor: "employeename2" },
      { Header: "Remark 2", accessor: "INTR2REMARK" },
      { Header: "INTR 2 Rating", accessor: "INTR2RATING" },
      { Header: "Interviewer 3rd", accessor: "employeename3" },
      { Header: "Remark 3", accessor: "INTR3REMARK" },
      { Header: "INTR 3 Rating", accessor: "INTR3RATING" },
      { Header: "Interviewer 4th", accessor: "employeename4" },
      { Header: "Remark 4", accessor: "INTR4REMARK" },
      { Header: "INTR 4 Rating", accessor: "INTR4RATING" },
      { Header: "Shortlist By", accessor: "shortlist_by" },
      {
        Header: "Shortlist Date",
        accessor: "shortlist_date",
        Cell: ({ value }: any) => formatDate(value),
      },
      { Header: "Rejected By", accessor: "REJECTED_BY" },
      {
        Header: "Rejection Date",
        accessor: "REJECTION_DATE",
        Cell: ({ value }: any) => formatDate(value),
      },
    ];

    handleExcelDownload(exportColumns, filteredData);
  }, [filteredData, user?.Comp_Code, getStatusInfo, handleExcelDownload]);

  // Table Columns Definition
  const columns = useMemo(() => {
    return [
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[90px]">
            <span>SR</span>
            <ColumnFilterInput
              columnKey="TRAN_ID"
              placeholder="All SR"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "TRAN_ID",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {value ?? "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[220px]">
            <span>STATUS</span>
            <ColumnFilterInput
              columnKey="INT_STATUS"
              placeholder="All status"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "INT_STATUS",
        Cell: ({ row }: any) => {
          const info = getStatusInfo(row.original);
          return (
            <span
              className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-sm sm:text-base font-semibold border ${info.badgeStyle} whitespace-nowrap`}
            >
              <span className={`w-2 h-2 rounded-full ${info.dotColor} shrink-0`} />
              <span>{info.label}</span>
            </span>
          );
        },
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[150px]">
            <span>APPLICATION DATE</span>
            <ColumnFilterInput
              columnKey="APPLICATION_DATE1"
              placeholder="All date"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "APPLICATION_DATE1",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
            {formatDate(value)}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[160px]">
            <span>NAME</span>
            <ColumnFilterInput
              columnKey="NAME"
              placeholder="All name"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "NAME",
        Cell: ({ value }: any) => (
          <span className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[190px]">
            <span>EMAIL</span>
            <ColumnFilterInput
              columnKey="EMAIL"
              placeholder="All email"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "EMAIL",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-300 font-normal">
            {value && String(value).trim() ? String(value).trim() : "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[140px]">
            <span>MOBILE NO</span>
            <ColumnFilterInput
              columnKey="MOB_NO"
              placeholder="All mobile"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "MOB_NO",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {value && String(value).trim() ? String(value).trim() : "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[180px]">
            <span>SOURCE OF ENQUIRY</span>
            <ColumnFilterInput
              columnKey="SOURCE_OF_REG_Label"
              placeholder="All source of enquiry"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "SOURCE_OF_REG_Label",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[160px]">
            <span>ADDRESS</span>
            <ColumnFilterInput
              columnKey="ADDRESS"
              placeholder="All address"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "ADDRESS",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-300">
            {value && String(value).trim() ? String(value).trim() : "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[130px]">
            <span>CLUSTER</span>
            <ColumnFilterInput
              columnKey="CLUSTERLabel"
              placeholder="All cluster"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "CLUSTERLabel",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[130px]">
            <span>CHANNEL</span>
            <ColumnFilterInput
              columnKey="CHANNELLabel"
              placeholder="All channel"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "CHANNELLabel",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[170px]">
            <span>DESIGNATION</span>
            <ColumnFilterInput
              columnKey="DESIGNATION"
              placeholder="All designation"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "DESIGNATION",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {value || "—"}
          </span>
        ),
      },
      ...(user?.Comp_Code === "MLAPL-25"
        ? [
          {
            Header: () => (
              <div className="flex flex-col gap-1 w-full py-1 min-w-[170px]">
                <span>SUITABLE DESIGNATION</span>
                <ColumnFilterInput
                  columnKey="SUITABLE_DESIGNATION"
                  placeholder="All suitable"
                  resetTrigger={resetTrigger}
                  onFilterChange={handleColumnFilter}
                />
              </div>
            ),
            accessor: "SUITABLE_DESIGNATION",
            Cell: ({ value }: any) => (
              <span className="text-slate-700 dark:text-slate-300">
                {value || "—"}
              </span>
            ),
          },
        ]
        : []),
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[140px]">
            <span>LOCATION</span>
            <ColumnFilterInput
              columnKey="LOC_CODE1"
              placeholder="All location"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "LOC_CODE1",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[170px]">
            <span>HIGHEST QUALIFICATION</span>
            <ColumnFilterInput
              columnKey="HIGH_QUAL"
              placeholder="All qualification"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "HIGH_QUAL",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300">
            {value && String(value).trim() ? String(value).trim() : "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[120px]">
            <span>PASSING %</span>
            <ColumnFilterInput
              columnKey="PASSING_PER"
              placeholder="All percent"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "PASSING_PER",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300">
            {value !== null && value !== undefined && value !== ""
              ? `${value}%`
              : "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[110px]">
            <span>EXP (YRS)</span>
            <ColumnFilterInput
              columnKey="EXP_IN_YEAR"
              placeholder="All exp"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "EXP_IN_YEAR",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300">
            {value !== null && value !== undefined && value !== ""
              ? `${value} yr${Number(value) > 1 ? "s" : ""}`
              : "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[160px]">
            <span>SKILLS</span>
            <ColumnFilterInput
              columnKey="SKILLS"
              placeholder="All skills"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "SKILLS",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-300 text-xs">
            {value && String(value).trim() ? String(value).trim() : "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[130px]">
            <span>CURRENT CTC</span>
            <ColumnFilterInput
              columnKey="CURRENT_CTC"
              placeholder="All current ctc"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "CURRENT_CTC",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {value !== null && value !== undefined && value !== ""
              ? value
              : "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[130px]">
            <span>EXPECTED CTC</span>
            <ColumnFilterInput
              columnKey="EXPECTED_CTC"
              placeholder="All expected ctc"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "EXPECTED_CTC",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {value !== null && value !== undefined && value !== ""
              ? value
              : "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[160px]">
            <span>INTERVIEWER 1ST</span>
            <ColumnFilterInput
              columnKey="employeename1"
              placeholder="All interviewer 1"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "employeename1",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[150px]">
            <span>REMARK 1</span>
            <ColumnFilterInput
              columnKey="INTR1REMARK"
              placeholder="All remark 1"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "INTR1REMARK",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-300 text-xs">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[110px]">
            <span>RATING 1</span>
            <ColumnFilterInput
              columnKey="INTR1RATING"
              placeholder="All rating 1"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "INTR1RATING",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            {value !== null && value !== undefined ? value : "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[160px]">
            <span>INTERVIEWER 2ND</span>
            <ColumnFilterInput
              columnKey="employeename2"
              placeholder="All interviewer 2"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "employeename2",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[150px]">
            <span>REMARK 2</span>
            <ColumnFilterInput
              columnKey="INTR2REMARK"
              placeholder="All remark 2"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "INTR2REMARK",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-300 text-xs">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[110px]">
            <span>RATING 2</span>
            <ColumnFilterInput
              columnKey="INTR2RATING"
              placeholder="All rating 2"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "INTR2RATING",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            {value !== null && value !== undefined ? value : "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[160px]">
            <span>INTERVIEWER 3RD</span>
            <ColumnFilterInput
              columnKey="employeename3"
              placeholder="All interviewer 3"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "employeename3",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[150px]">
            <span>REMARK 3</span>
            <ColumnFilterInput
              columnKey="INTR3REMARK"
              placeholder="All remark 3"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "INTR3REMARK",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-300 text-xs">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[110px]">
            <span>RATING 3</span>
            <ColumnFilterInput
              columnKey="INTR3RATING"
              placeholder="All rating 3"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "INTR3RATING",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            {value !== null && value !== undefined ? value : "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[160px]">
            <span>INTERVIEWER 4TH</span>
            <ColumnFilterInput
              columnKey="employeename4"
              placeholder="All interviewer 4"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "employeename4",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[150px]">
            <span>REMARK 4</span>
            <ColumnFilterInput
              columnKey="INTR4REMARK"
              placeholder="All remark 4"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "INTR4REMARK",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-300 text-xs">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[110px]">
            <span>RATING 4</span>
            <ColumnFilterInput
              columnKey="INTR4RATING"
              placeholder="All rating 4"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "INTR4RATING",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            {value !== null && value !== undefined ? value : "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[150px]">
            <span>SHORTLIST BY</span>
            <ColumnFilterInput
              columnKey="shortlist_by"
              placeholder="All shortlist by"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "shortlist_by",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[140px]">
            <span>SHORTLIST DATE</span>
            <ColumnFilterInput
              columnKey="shortlist_date"
              placeholder="All date"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "shortlist_date",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 whitespace-nowrap">
            {formatDate(value)}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[150px]">
            <span>REJECTED BY</span>
            <ColumnFilterInput
              columnKey="REJECTED_BY"
              placeholder="All rejected by"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "REJECTED_BY",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: () => (
          <div className="flex flex-col gap-1 w-full py-1 min-w-[140px]">
            <span>REJECTION DATE</span>
            <ColumnFilterInput
              columnKey="REJECTION_DATE"
              placeholder="All date"
              resetTrigger={resetTrigger}
              onFilterChange={handleColumnFilter}
            />
          </div>
        ),
        accessor: "REJECTION_DATE",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 whitespace-nowrap">
            {formatDate(value)}
          </span>
        ),
      },
    ];
  }, [resetTrigger, handleColumnFilter, getStatusInfo, user?.Comp_Code]);

  return (
    <div className="w-full space-y-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER SECTION */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Recruitment detailed report
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Every application in the period, with the stage it reached — the
            report HR sends up the chain.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetFilters}
            className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <FilterX className="w-4 h-4 text-slate-500" />
            <span>Reset filters</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExcelLoading || filteredData.length === 0}
            className="h-10 px-4 rounded-xl bg-[#4338CA] hover:bg-[#3730a3] text-white text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-4 h-4 text-white" />
            <span>{isExcelLoading ? "Exporting..." : "Export to Excel"}</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. 6 METRIC CARDS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
        {/* 1. Applications */}
        <Card
          title="APPLICATIONS"
          count={cardCounts.applications}
          icon={<FileText className="w-4.5 h-4.5" />}
          variant="indigo"
          isActive={activeCardFilter === "ALL"}
          onClick={() => setActiveCardFilter("ALL")}
        />

        {/* 2. In Interview */}
        <Card
          title="IN INTERVIEW"
          count={cardCounts.in_interview}
          icon={<CalendarClock className="w-4.5 h-4.5" />}
          variant="amber"
          isActive={activeCardFilter === "IN_INTERVIEW"}
          onClick={() =>
            setActiveCardFilter((prev) =>
              prev === "IN_INTERVIEW" ? "ALL" : "IN_INTERVIEW"
            )
          }
        />

        {/* 3. Entry In Resume Bank (Next to In Interview) */}
        <Card
          title="RESUME BANK"
          count={cardCounts.resume_bank}
          icon={<FolderArchive className="w-4.5 h-4.5" />}
          variant="sky"
          isActive={activeCardFilter === "RESUME_BANK"}
          onClick={() =>
            setActiveCardFilter((prev) =>
              prev === "RESUME_BANK" ? "ALL" : "RESUME_BANK"
            )
          }
        />

        {/* 4. Selected */}
        <Card
          title="SELECTED"
          count={cardCounts.selected}
          icon={<CheckCircle2 className="w-4.5 h-4.5" />}
          variant="emerald"
          isActive={activeCardFilter === "SELECTED"}
          onClick={() =>
            setActiveCardFilter((prev) =>
              prev === "SELECTED" ? "ALL" : "SELECTED"
            )
          }
        />

        {/* 5. Shortlisted */}
        <Card
          title="SHORTLISTED"
          count={cardCounts.shortlisted}
          icon={<UserCheck className="w-4.5 h-4.5" />}
          variant="purple"
          isActive={activeCardFilter === "SHORTLISTED"}
          onClick={() =>
            setActiveCardFilter((prev) =>
              prev === "SHORTLISTED" ? "ALL" : "SHORTLISTED"
            )
          }
        />

        {/* 6. Rejected */}
        <Card
          title="REJECTED"
          count={cardCounts.rejected}
          icon={<UserX className="w-4.5 h-4.5" />}
          variant="rose"
          isActive={activeCardFilter === "REJECTED"}
          onClick={() =>
            setActiveCardFilter((prev) =>
              prev === "REJECTED" ? "ALL" : "REJECTED"
            )
          }
        />
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. FILTERS CARD */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0B1220] p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
          {/* DATE FROM */}
          <div className="lg:col-span-3 sm:col-span-1">
            <Einput
              title="DATE FROM"
              type="date"
              name="DATE_FROM"
              value={dateRange.DATE_FROM}
              handleInputChange={(_name, val) => dateRange.setDateFrom(val || "")}
            />
          </div>

          {/* DATE TO */}
          <div className="lg:col-span-3 sm:col-span-1">
            <Einput
              title="DATE TO"
              type="date"
              name="DATE_TO"
              value={dateRange.DATE_TO}
              handleInputChange={(_name, val) => dateRange.setDateTo(val || "")}
            />
          </div>

          {/* CHANNEL */}
          <div className="lg:col-span-3 sm:col-span-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              CHANNEL
            </label>
            <div className="relative">
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full h-10 px-3 pr-8 appearance-none border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
              >
                {channelOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3 top-3" />
            </div>
          </div>

          {/* CLUSTER */}
          <div className="lg:col-span-2 sm:col-span-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              CLUSTER
            </label>
            <div className="relative">
              <select
                value={cluster}
                onChange={(e) => setCluster(e.target.value)}
                className="w-full h-10 px-3 pr-8 appearance-none border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
              >
                {clusterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-3 top-3" />
            </div>
          </div>

          {/* SHOW BUTTON */}
          <div className="lg:col-span-1 sm:col-span-2 flex justify-end">
            <Button
              type="primary"
              onClick={fetchData}
              disabled={isLoading}
              className="w-full h-10 px-6 rounded-xl bg-[#4338CA] hover:bg-[#3730a3] active:scale-[0.98] text-white font-semibold text-sm shadow-xs transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
            >
              Show
            </Button>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 4. TABLE CARD CONTAINER */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0B1220] shadow-xs overflow-hidden">
        {/* Table Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Applications
            </h3>
            <span className="text-xs sm:text-sm font-medium text-slate-400 dark:text-slate-500">
              {filteredData.length} of {tableData.length} rows
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              <span>Rows</span>
              <div className="relative">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-8 pl-3 pr-7 border border-slate-200 dark:border-slate-700/80 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-1.5 focus:ring-indigo-500 cursor-pointer appearance-none shadow-2xs"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2 top-2.5" />
              </div>
            </div>
          </div>
        </div>

        {/* The ReactTable component */}
        <ServiceTablePagination
          key={`${pageSize}_${activeCardFilter}`}
          columns={columns}
          data={filteredData}
          initialPageSize={pageSize}
          showExcelExport={false}
          showTopSearch={false}
          headerClassName="[&>div]:!items-start [&>div]:pt-1"
        />
      </div>

      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
