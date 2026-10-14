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
    if (!dateString || dateString === "null" || dateString === "—") return "";
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

      const normalized = rawData.map((row: any) => ({
        ...row,
        status_label: getStatusInfo(row).label,
        app_date_formatted: formatDate(row.APPLICATION_DATE1),
        shortlist_date_formatted: formatDate(row.shortlist_date),
        rejection_date_formatted: formatDate(row.REJECTION_DATE),
      }));

      // Sort by TRAN_ID descending
      const sorted = [...normalized].sort(
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
  }, [tableData, getStatusInfo]);  // Filter Data by Active Card
  const cardFilteredData = useMemo(() => {
    let base = tableData;
    if (activeCardFilter === "IN_INTERVIEW") {
      return base.filter((item) => {
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
      return base.filter((item) => {
        const info = getStatusInfo(item);
        const s = String(item?.INT_STATUS ?? "");
        return info.label === "Entry in resume bank" || s === "1";
      });
    } else if (activeCardFilter === "SELECTED") {
      return base.filter((item) => {
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
      return base.filter((item) => {
        const info = getStatusInfo(item);
        const s = String(item?.INT_STATUS ?? "");
        return info.label === "Shortlisted" || s === "2";
      });
    } else if (activeCardFilter === "REJECTED") {
      return base.filter((item) => {
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
    return base;
  }, [tableData, activeCardFilter, getStatusInfo]);

  // Filter Data by Active Card + Column Filters (for counter display & Excel export)
  const filteredData = useMemo(() => {
    const activeEntries = Object.entries(columnFilters).filter(
      ([_, v]) => v && String(v).trim() !== ""
    );
    if (activeEntries.length === 0) return cardFilteredData;

    return cardFilteredData.filter((item) => {
      return activeEntries.every(([key, filterVal]) => {
        const query = String(filterVal).toLowerCase().trim();
        const rawVal = item[key];
        if (rawVal === undefined || rawVal === null) return false;
        return String(rawVal).toLowerCase().includes(query);
      });
    });
  }, [cardFilteredData, columnFilters]);

  // Export to Excel
  const handleExportExcel = useCallback(() => {
    if (!filteredData || filteredData.length === 0) return;

    const exportColumns = [
      { Header: "SR", accessor: "TRAN_ID" },
      { Header: "Status", accessor: "status_label" },
      { Header: "Application Date", accessor: "app_date_formatted" },
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
      { Header: "Shortlist Date", accessor: "shortlist_date_formatted" },
      { Header: "Rejected By", accessor: "REJECTED_BY" },
      { Header: "Rejection Date", accessor: "rejection_date_formatted" },
    ];

    handleExcelDownload(exportColumns, filteredData);
  }, [filteredData, user?.Comp_Code, handleExcelDownload]);

  // Table Columns Definition with Dropdown Filters
  const columns = useMemo(() => {
    return [
      {
        Header: "SR",
        accessor: "TRAN_ID",
        filterPlaceholder: "All SR",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {value ?? "—"}
          </span>
        ),
      },
      {
        Header: "STATUS",
        accessor: "status_label",
        filterPlaceholder: "All status",
        filterOptions: [
          { value: "", label: "All status" },
          { value: "Entry in resume bank", label: "Entry in resume bank" },
          { value: "Shortlisted", label: "Shortlisted" },
          { value: "Interview in processing", label: "Interview in processing" },
          { value: "All Interview Done", label: "All Interview Done" },
          { value: "Finally selected by HR", label: "Finally selected by HR" },
          { value: "Finally rejected by HR", label: "Finally rejected by HR" },
          { value: "Employee master Created", label: "Employee master Created" },
          { value: "Removed From employee Master", label: "Removed From employee Master" },
        ],
        filterClassName: "min-w-[190px]",
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
        Header: "APPLICATION DATE",
        accessor: "app_date_formatted",
        filterPlaceholder: "All date",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "NAME",
        accessor: "NAME",
        filterPlaceholder: "All name",
        Cell: ({ value }: any) => (
          <span className="font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "EMAIL",
        accessor: "EMAIL",
        filterPlaceholder: "All email",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-300 font-normal">
            {value && String(value).trim() ? String(value).trim() : "—"}
          </span>
        ),
      },
      {
        Header: "MOBILE NO",
        accessor: "MOB_NO",
        filterPlaceholder: "All mobile",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {value && String(value).trim() ? String(value).trim() : "—"}
          </span>
        ),
      },
      {
        Header: "SOURCE OF ENQUIRY",
        accessor: "SOURCE_OF_REG_Label",
        filterPlaceholder: "All source of enquiry",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "ADDRESS",
        accessor: "ADDRESS",
        filterPlaceholder: "All address",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-300">
            {value && String(value).trim() ? String(value).trim() : "—"}
          </span>
        ),
      },
      {
        Header: "CLUSTER",
        accessor: "CLUSTERLabel",
        filterPlaceholder: "All cluster",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "CHANNEL",
        accessor: "CHANNELLabel",
        filterPlaceholder: "All channel",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "DESIGNATION",
        accessor: "DESIGNATION",
        filterPlaceholder: "All designation",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {value || "—"}
          </span>
        ),
      },
      ...(user?.Comp_Code === "MLAPL-25"
        ? [
          {
            Header: "SUITABLE DESIGNATION",
            accessor: "SUITABLE_DESIGNATION",
            filterPlaceholder: "All suitable",
            Cell: ({ value }: any) => (
              <span className="text-slate-700 dark:text-slate-300">
                {value || "—"}
              </span>
            ),
          },
        ]
        : []),
      {
        Header: "LOCATION",
        accessor: "LOC_CODE1",
        filterPlaceholder: "All location",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "HIGHEST QUALIFICATION",
        accessor: "HIGH_QUAL",
        filterPlaceholder: "All qualification",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300">
            {value && String(value).trim() ? String(value).trim() : "—"}
          </span>
        ),
      },
      {
        Header: "PASSING %",
        accessor: "PASSING_PER",
        filterPlaceholder: "All percent",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300">
            {value !== null && value !== undefined && value !== ""
              ? `${value}%`
              : "—"}
          </span>
        ),
      },
      {
        Header: "EXP (YRS)",
        accessor: "EXP_IN_YEAR",
        filterPlaceholder: "All exp",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300">
            {value !== null && value !== undefined && value !== ""
              ? `${value} yr${Number(value) > 1 ? "s" : ""}`
              : "—"}
          </span>
        ),
      },
      {
        Header: "SKILLS",
        accessor: "SKILLS",
        filterPlaceholder: "All skills",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-300 text-xs">
            {value && String(value).trim() ? String(value).trim() : "—"}
          </span>
        ),
      },
      {
        Header: "CURRENT CTC",
        accessor: "CURRENT_CTC",
        filterPlaceholder: "All current ctc",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {value !== null && value !== undefined && value !== ""
              ? value
              : "—"}
          </span>
        ),
      },
      {
        Header: "EXPECTED CTC",
        accessor: "EXPECTED_CTC",
        filterPlaceholder: "All expected ctc",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {value !== null && value !== undefined && value !== ""
              ? value
              : "—"}
          </span>
        ),
      },
      {
        Header: "INTERVIEWER 1ST",
        accessor: "employeename1",
        filterPlaceholder: "All interviewer 1",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "REMARK 1",
        accessor: "INTR1REMARK",
        filterPlaceholder: "All remark 1",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-300 text-xs">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "RATING 1",
        accessor: "INTR1RATING",
        filterPlaceholder: "All rating 1",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            {value !== null && value !== undefined ? value : "—"}
          </span>
        ),
      },
      {
        Header: "INTERVIEWER 2ND",
        accessor: "employeename2",
        filterPlaceholder: "All interviewer 2",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "REMARK 2",
        accessor: "INTR2REMARK",
        filterPlaceholder: "All remark 2",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-300 text-xs">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "RATING 2",
        accessor: "INTR2RATING",
        filterPlaceholder: "All rating 2",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            {value !== null && value !== undefined ? value : "—"}
          </span>
        ),
      },
      {
        Header: "INTERVIEWER 3RD",
        accessor: "employeename3",
        filterPlaceholder: "All interviewer 3",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "REMARK 3",
        accessor: "INTR3REMARK",
        filterPlaceholder: "All remark 3",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-300 text-xs">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "RATING 3",
        accessor: "INTR3RATING",
        filterPlaceholder: "All rating 3",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            {value !== null && value !== undefined ? value : "—"}
          </span>
        ),
      },
      {
        Header: "INTERVIEWER 4TH",
        accessor: "employeename4",
        filterPlaceholder: "All interviewer 4",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "REMARK 4",
        accessor: "INTR4REMARK",
        filterPlaceholder: "All remark 4",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-300 text-xs">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "RATING 4",
        accessor: "INTR4RATING",
        filterPlaceholder: "All rating 4",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            {value !== null && value !== undefined ? value : "—"}
          </span>
        ),
      },
      {
        Header: "SHORTLIST BY",
        accessor: "shortlist_by",
        filterPlaceholder: "All shortlist by",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "SHORTLIST DATE",
        accessor: "shortlist_date_formatted",
        filterPlaceholder: "All date",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "REJECTED BY",
        accessor: "REJECTED_BY",
        filterPlaceholder: "All rejected by",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "REJECTION DATE",
        accessor: "rejection_date_formatted",
        filterPlaceholder: "All date",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
    ];
  }, [getStatusInfo, user?.Comp_Code]);

  const cardCommonProps = {
    className:
      "!h-auto !min-h-0 !rounded-[12px] !p-[14px_16px] !shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)]",
    inactiveClassName:
      "!bg-white dark:!bg-[#111827] !border-[#E2E8F0] dark:!border-[#1F2937] hover:!border-slate-300 dark:hover:!border-slate-700",
    titleClassName:
      "!text-[11px] !font-semibold !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase",
    countClassName:
      "!text-[23px] !font-[650] !tracking-[-0.02em] !mt-[9px] !text-[#1E293B] dark:!text-[#E7ECF3] tabular-nums",
  };

  return (
    <div className="w-full space-y-5 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER SECTION */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
            Recruitment detailed report
          </h1>
          <p className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8] mt-[5px]">
            Every application in the period, with the stage it reached — the
            report HR sends up the chain.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-[7px] border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] font-[550] px-[13px] py-2 rounded-[10px] cursor-pointer whitespace-nowrap hover:bg-[#F1F5F9] dark:hover:bg-[#182235] transition-colors"
          >
            <FilterX className="w-4 h-4 text-[#64748B]" />
            <span>Reset filters</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExcelLoading || filteredData.length === 0}
            className="flex items-center gap-[7px] border border-transparent bg-[#4F46E5] hover:bg-[#4338CA] text-white text-[12.5px] font-semibold px-3.5 py-2 rounded-[10px] cursor-pointer whitespace-nowrap shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet className="w-4 h-4 text-white" />
            <span>{isExcelLoading ? "Exporting..." : "Export to Excel"}</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. 6 METRIC CARDS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-[14px]">
        {/* 1. Applications */}
        <Card
          title="APPLICATIONS"
          count={cardCounts.applications}
          icon={<FileText className="w-3.5 h-3.5 text-[#4F46E5] dark:text-[#8B84FF]" />}
          variant="indigo"
          isActive={activeCardFilter === "ALL"}
          onClick={() => setActiveCardFilter("ALL")}
          {...cardCommonProps}
          iconClassName="!w-6 !h-6 !rounded-[7px] !border-none !bg-[#4F46E5]/10 dark:!bg-[#4F46E5]/25 flex items-center justify-center shrink-0"
          activeClassName="!bg-white dark:!bg-[#111827] !border-[#4F46E5] ring-2 ring-[#4F46E5]/25 !shadow-sm"
        />

        {/* 2. In Interview */}
        <Card
          title="IN INTERVIEW"
          count={cardCounts.in_interview}
          icon={<CalendarClock className="w-3.5 h-3.5 text-[#F59E0B]" />}
          variant="amber"
          isActive={activeCardFilter === "IN_INTERVIEW"}
          onClick={() =>
            setActiveCardFilter((prev) =>
              prev === "IN_INTERVIEW" ? "ALL" : "IN_INTERVIEW"
            )
          }
          {...cardCommonProps}
          iconClassName="!w-6 !h-6 !rounded-[7px] !border-none !bg-[#F59E0B]/10 dark:!bg-[#F59E0B]/25 flex items-center justify-center shrink-0"
          activeClassName="!bg-white dark:!bg-[#111827] !border-[#F59E0B] ring-2 ring-[#F59E0B]/25 !shadow-sm"
        />

        {/* 3. Entry In Resume Bank (Next to In Interview) */}
        <Card
          title="RESUME BANK"
          count={cardCounts.resume_bank}
          icon={<FolderArchive className="w-3.5 h-3.5 text-[#0EA5E9]" />}
          variant="sky"
          isActive={activeCardFilter === "RESUME_BANK"}
          onClick={() =>
            setActiveCardFilter((prev) =>
              prev === "RESUME_BANK" ? "ALL" : "RESUME_BANK"
            )
          }
          {...cardCommonProps}
          iconClassName="!w-6 !h-6 !rounded-[7px] !border-none !bg-[#0EA5E9]/10 dark:!bg-[#0EA5E9]/25 flex items-center justify-center shrink-0"
          activeClassName="!bg-white dark:!bg-[#111827] !border-[#0EA5E9] ring-2 ring-[#0EA5E9]/25 !shadow-sm"
        />

        {/* 4. Selected */}
        <Card
          title="SELECTED"
          count={cardCounts.selected}
          icon={<CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />}
          variant="emerald"
          isActive={activeCardFilter === "SELECTED"}
          onClick={() =>
            setActiveCardFilter((prev) =>
              prev === "SELECTED" ? "ALL" : "SELECTED"
            )
          }
          {...cardCommonProps}
          iconClassName="!w-6 !h-6 !rounded-[7px] !border-none !bg-[#10B981]/10 dark:!bg-[#10B981]/25 flex items-center justify-center shrink-0"
          activeClassName="!bg-white dark:!bg-[#111827] !border-[#10B981] ring-2 ring-[#10B981]/25 !shadow-sm"
        />

        {/* 5. Shortlisted */}
        <Card
          title="SHORTLISTED"
          count={cardCounts.shortlisted}
          icon={<UserCheck className="w-3.5 h-3.5 text-[#7C3AED]" />}
          variant="purple"
          isActive={activeCardFilter === "SHORTLISTED"}
          onClick={() =>
            setActiveCardFilter((prev) =>
              prev === "SHORTLISTED" ? "ALL" : "SHORTLISTED"
            )
          }
          {...cardCommonProps}
          iconClassName="!w-6 !h-6 !rounded-[7px] !border-none !bg-[#7C3AED]/10 dark:!bg-[#7C3AED]/25 flex items-center justify-center shrink-0"
          activeClassName="!bg-white dark:!bg-[#111827] !border-[#7C3AED] ring-2 ring-[#7C3AED]/25 !shadow-sm"
        />

        {/* 6. Rejected */}
        <Card
          title="REJECTED"
          count={cardCounts.rejected}
          icon={<UserX className="w-3.5 h-3.5 text-[#E11D48]" />}
          variant="rose"
          isActive={activeCardFilter === "REJECTED"}
          onClick={() =>
            setActiveCardFilter((prev) =>
              prev === "REJECTED" ? "ALL" : "REJECTED"
            )
          }
          {...cardCommonProps}
          iconClassName="!w-6 !h-6 !rounded-[7px] !border-none !bg-[#E11D48]/10 dark:!bg-[#E11D48]/25 flex items-center justify-center shrink-0"
          activeClassName="!bg-white dark:!bg-[#111827] !border-[#E11D48] ring-2 ring-[#E11D48]/25 !shadow-sm"
        />
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. FILTERS CARD */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-[12px] border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] p-[14px_18px_16px_18px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] mb-[14px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[170px_170px_minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 items-end">
          {/* DATE FROM */}
          <div className="w-full min-w-0 [&_label]:!text-[11px] [&_label]:!font-semibold [&_label]:!text-[#64748B] dark:[&_label]:!text-[#94A3B8] [&_label]:!tracking-[0.03em] [&_label]:!uppercase [&_label]:!mb-[5px]">
            <Einput
              title="Date from"
              type="date"
              name="DATE_FROM"
              ShortName={true}
              value={dateRange.DATE_FROM}
              handleInputChange={(_name, val) => dateRange.setDateFrom(val || "")}
              className="!h-[38px] !w-full !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3] !text-[12.5px] !px-2.5 !shadow-none focus-visible:!border-[#4F46E5] focus-visible:!ring-0 cursor-pointer"
            />
          </div>

          {/* DATE TO */}
          <div className="w-full min-w-0 [&_label]:!text-[11px] [&_label]:!font-semibold [&_label]:!text-[#64748B] dark:[&_label]:!text-[#94A3B8] [&_label]:!tracking-[0.03em] [&_label]:!uppercase [&_label]:!mb-[5px]">
            <Einput
              title="Date to"
              type="date"
              name="DATE_TO"
              ShortName={true}
              value={dateRange.DATE_TO}
              handleInputChange={(_name, val) => dateRange.setDateTo(val || "")}
              className="!h-[38px] !w-full !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3] !text-[12.5px] !px-2.5 !shadow-none focus-visible:!border-[#4F46E5] focus-visible:!ring-0 cursor-pointer"
            />
          </div>

          {/* CHANNEL */}
          <div className="w-full min-w-0">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.03em] text-[#64748B] dark:text-[#94A3B8] mb-[5px]">
              Channel
            </label>
            <div className="relative">
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full h-[38px] appearance-none border border-[#E2E8F0] dark:border-[#1F2937] rounded-[9px] bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] pl-2.5 pr-7 outline-none cursor-pointer focus:border-[#4F46E5] focus:ring-0"
              >
                {channelOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#64748B] pointer-events-none absolute right-2.5 top-3" />
            </div>
          </div>

          {/* CLUSTER */}
          <div className="w-full min-w-0">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.03em] text-[#64748B] dark:text-[#94A3B8] mb-[5px]">
              Cluster
            </label>
            <div className="relative">
              <select
                value={cluster}
                onChange={(e) => setCluster(e.target.value)}
                className="w-full h-[38px] appearance-none border border-[#E2E8F0] dark:border-[#1F2937] rounded-[9px] bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] pl-2.5 pr-7 outline-none cursor-pointer focus:border-[#4F46E5] focus:ring-0"
              >
                {clusterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-[#64748B] pointer-events-none absolute right-2.5 top-3" />
            </div>
          </div>

          {/* SHOW BUTTON */}
          <div className="flex justify-end w-full sm:w-auto">
            <Button
              type="primary"
              onClick={fetchData}
              disabled={isLoading}
              className="w-full sm:w-auto !h-[38px] !px-5 !rounded-[9px] !bg-[#4F46E5] hover:!bg-[#4338CA] active:scale-[0.98] !text-white !font-semibold !text-[12.5px] !border-none shadow-none transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
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

        {/* The ReactTable component with dropdown column filters */}
        <ServiceTablePagination
          key={`${pageSize}_${activeCardFilter}`}
          columns={columns}
          data={cardFilteredData}
          initialPageSize={pageSize}
          showColumnFilters={true}
          columnFilters={columnFilters}
          onColumnFilterChange={handleColumnFilter}
          columnFiltersResetTrigger={resetTrigger}
          showExcelExport={false}
          showTopSearch={false}
          containerClassName="border-0 shadow-none rounded-none bg-transparent"
        />
      </div>

      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
