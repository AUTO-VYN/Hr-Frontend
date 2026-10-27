"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import { StatCard } from "@/components/Templates/card";
import Chart, { BarChart } from "@/components/atoms/charts";
import ServiceTablePagination from "@/components/Templates/reacttable";

// Retain component references for template compatibility
void StatCard;
void Chart;
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  UserPlus,
  UserMinus,
  Target,
  Wallet,
  Activity,
  Check,
  Search,
  BarChart3,
  List,
} from "lucide-react";

export default function ManpowerBudgetDashboard() {
  const user = useCurrentUser();

  // Tab State: 'dept' = Department wise, 'desig' = Designation wise
  const [dim, setDim] = useState<"dept" | "desig">("dept");

  // View Mode: 'progress' (bars view from HTML) vs 'chart' (Highcharts BarChart)
  const [viewMode, setViewMode] = useState<"progress" | "chart">("progress");

  // API Raw Data States - All initialized to empty / zero (NO DUMMY DATA)
  const [empexp, setempexp] = useState<any[]>([]);
  const [EmpDept, setEmpDept] = useState<any[]>([]);
  const [desgBudg, setdesgBudg] = useState<any[]>([]);
  const [desgBudg1, setdesgBudg1] = useState<any[]>([]);
  const [deptSal, setdeptSal] = useState<any[]>([]);
  const [deptSalExc, setdeptSalExc] = useState<any[]>([]);
  const [desgSal, setdesgSal] = useState<any[]>([]);
  const [desgSalExc, setdesgSalExc] = useState<any[]>([]);
  const [newJoin, setnewJoin] = useState<any>(0);
  const [newJoinData, setnewJoinData] = useState<any[]>([]);
  const [leavingData, setleavingData] = useState<any[]>([]);
  const [leaveEmp, setleaveEmp] = useState<any>(0);
  const [ttlEmp, setttlEmp] = useState<any>(0);
  const [grossEmp, setgrossEmp] = useState<any>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dialog States for Card Clicks
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState<boolean>(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState<boolean>(false);
  const [dialogSearch, setDialogSearch] = useState<string>("");

  // Fetch Live Data
  const fetchData = useCallback(async () => {
    if (!user?.Comp_Code) return;
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/budget/finOpenings`,
        {
          flag: 1
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      const d = response.data;
      if (d) {
        if (Array.isArray(d.data)) {
          setempexp(
            d.data.map((item: any) => ({
              name: item.DEPARTMENT || item.name || "—",
              y: Number(item.Openings ?? item.y ?? 0),
              ...item,
            }))
          );
        }
        if (Array.isArray(d.data2)) {
          setEmpDept(
            d.data2.map((item: any) => ({
              name: item.DEPARTMENT || item.name || "—",
              y: Number(item.Openings ?? item.y ?? 0),
              ...item,
            }))
          );
        }
        if (Array.isArray(d.data1)) {
          setdesgBudg(
            d.data1.map((item: any) => ({
              name: item.EMPLOYEEDESIGNATION || item.name || "—",
              y: Number(item.Openings ?? item.y ?? 0),
              ...item,
            }))
          );
        }
        if (Array.isArray(d.data6)) {
          setdesgBudg1(
            d.data6.map((item: any) => ({
              name: item.EMPLOYEEDESIGNATION || item.name || "—",
              y: Number(item.Openings ?? item.y ?? 0),
              ...item,
            }))
          );
        }
        if (Array.isArray(d.data7)) {
          setdeptSal(
            d.data7.map((item: any) => ({
              name: item.SalaryDivision || item.name || "—",
              y: Number(item.Salary_Budget_Difference ?? item.y ?? 0),
              ...item,
            }))
          );
        }
        if (Array.isArray(d.data8)) {
          setdeptSalExc(
            d.data8.map((item: any) => ({
              name: item.SalaryDivision || item.name || "—",
              y: Number(item.Salary_Budget_Difference ?? item.y ?? 0),
              ...item,
            }))
          );
        }
        if (Array.isArray(d.data9)) {
          setdesgSal(
            d.data9.map((item: any) => ({
              name: item.EMPLOYEEDESIGNATION || item.name || "—",
              y: Number(item.Salary_Budget_Difference ?? item.y ?? 0),
              ...item,
            }))
          );
        }
        if (Array.isArray(d.data10)) {
          setdesgSalExc(
            d.data10.map((item: any) => ({
              name: item.EMPLOYEEDESIGNATION || item.name || "—",
              y: Number(item.Salary_Budget_Difference ?? item.y ?? 0),
              ...item,
            }))
          );
        }

        if (d.data12) setnewJoinData(Array.isArray(d.data12) ? d.data12 : []);
        if (d.data13) setleavingData(Array.isArray(d.data13) ? d.data13 : []);
        if (d.data3 !== undefined) setnewJoin(Number(d.data3 || 0));
        if (d.data4 !== undefined) setleaveEmp(Number(d.data4 || 0));
        if (d.data5 !== undefined) setttlEmp(Number(d.data5 || 0));
        if (d.data11 !== undefined) setgrossEmp(Number(d.data11 || 0));
      }
    } catch (error) {
      console.error("Error fetching manpower budget data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.Comp_Code, user?.name]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Active dataset calculation purely from API
  const activeDataset = useMemo(() => {
    if (dim === "dept") {
      const source = EmpDept.length > 0 ? EmpDept : empexp;
      if (source && source.length > 0) {
        return source.map((item, idx) => {
          const openings = Number(item.Openings ?? item.openings ?? item.y ?? 0);
          const budget = Number(item.Budget ?? item.budget ?? openings);
          const filled = item.Budget
            ? Math.max(0, budget - openings)
            : Number(item.Filled ?? item.filled ?? 0);
          const salaryBudget = deptSal[idx]?.y ? Number(deptSal[idx].y) : 0;
          const salaryActual = deptSalExc[idx]?.y
            ? salaryBudget + Number(deptSalExc[idx].y)
            : salaryBudget;
          return {
            name: item.name || item.DEPARTMENT || "—",
            budget,
            filled,
            salaryBudget,
            salaryActual,
          };
        });
      }
      return [];
    } else {
      if (desgBudg && desgBudg.length > 0) {
        return desgBudg.map((item, idx) => {
          const openings = Number(item.Openings ?? item.openings ?? item.y ?? 0);
          const budget = Number(item.Budget ?? item.budget ?? openings);
          const filled = item.Budget
            ? Math.max(0, budget - openings)
            : Number(item.Filled ?? item.filled ?? 0);
          const salaryBudget = desgSal[idx]?.y ? Number(desgSal[idx].y) : 0;
          const salaryActual = desgSalExc[idx]?.y
            ? salaryBudget + Number(desgSalExc[idx].y)
            : salaryBudget;
          return {
            name: item.name || item.EMPLOYEEDESIGNATION || "—",
            budget,
            filled,
            salaryBudget,
            salaryActual,
          };
        });
      }
      return [];
    }
  }, [dim, EmpDept, empexp, desgBudg, deptSal, deptSalExc, desgSal, desgSalExc]);

  // Aggregate stats calculated purely from API data
  const stats = useMemo(() => {
    const data = activeDataset;
    const computedBudget = data.reduce((a, d) => a + d.budget, 0);
    const computedFilled = data.reduce((a, d) => a + d.filled, 0);
    const salBudget = data.reduce((a, d) => a + d.salaryBudget, 0);
    const salActual = data.reduce((a, d) => a + d.salaryActual, 0);
    const open = data.reduce((a, d) => a + Math.max(0, d.budget - d.filled), 0);
    const excessTotal = data.reduce((a, d) => a + Math.max(0, d.filled - d.budget), 0);
    const maxBudget = data.length > 0 ? Math.max(...data.map((d) => d.budget), 1) : 1;
    const excess = data.filter((d) => d.filled > d.budget);
    const maxExcess = excess.length
      ? Math.max(...excess.map((d) => d.filled - d.budget), 1)
      : 1;
    const usedPct = salBudget > 0 ? Math.round((salActual / salBudget) * 100) : 0;
    const salaryTint =
      usedPct > 100 ? "#E11D48" : usedPct > 92 ? "#F59E0B" : "#10B981";

    return {
      budgeted: ttlEmp || computedBudget,
      filled: grossEmp || computedFilled,
      salBudget,
      salActual,
      open,
      excessTotal,
      maxBudget,
      excess,
      maxExcess,
      usedPct,
      salaryTint,
    };
  }, [activeDataset, ttlEmp, grossEmp]);

  // Dimension name
  const dimension = dim === "dept" ? "department" : "designation";

  // Open Bars model
  const openBars = useMemo(() => {
    return activeDataset.map((d) => {
      const gap = Math.max(0, d.budget - d.filled);
      const filledWidth = `${Math.round((Math.min(d.filled, d.budget) / stats.maxBudget) * 100)}%`;
      const gapWidth = `${Math.round((gap / stats.maxBudget) * 100)}%`;
      return {
        label: d.name,
        filledWidth,
        gapWidth,
        ratio: `${d.filled} / ${d.budget}`,
        open: gap,
        openFg: gap ? "#F59E0B" : "#10B981",
        filled: d.filled,
        budget: d.budget,
      };
    });
  }, [activeDataset, stats.maxBudget]);

  // Excess Bars model purely from API
  const excessBars = useMemo(() => {
    if (dim === "desig" && desgBudg1.length > 0) {
      const maxEx = Math.max(...desgBudg1.map((item) => Number(item.y || 0)), 1);
      return desgBudg1.map((item, idx) => {
        const excessVal = Number(item.y || 0);
        const costVal = desgSalExc[idx]?.y ? Number(desgSalExc[idx].y) : 0;
        return {
          label: item.name,
          excess: excessVal,
          width: `${Math.round((excessVal / maxEx) * 100)}%`,
          cost: `₹${costVal} L`,
        };
      });
    }

    if (dim === "dept" && deptSalExc.length > 0) {
      const maxEx = Math.max(...deptSalExc.map((item) => Math.abs(Number(item.y || 0))), 1);
      return deptSalExc.map((item) => {
        const excessVal = Math.abs(Number(item.y || 0));
        return {
          label: item.name,
          excess: excessVal,
          width: `${Math.round((excessVal / maxEx) * 100)}%`,
          cost: `₹${excessVal} L`,
        };
      });
    }

    return stats.excess.map((d) => {
      const diff = d.filled - d.budget;
      const width = `${Math.round((diff / stats.maxExcess) * 100)}%`;
      const costVal = Math.max(0, d.salaryActual - d.salaryBudget);
      return {
        label: d.name,
        excess: diff,
        width,
        cost: `₹${costVal} L`,
      };
    });
  }, [dim, desgBudg1, desgSalExc, deptSalExc, stats.excess, stats.maxExcess]);

  // Chart data for Highcharts View
  const chartCategories = useMemo(() => activeDataset.map((d) => d.name), [activeDataset]);
  const chartSeriesData = useMemo(() => {
    return [
      {
        name: "Filled Headcount",
        data: activeDataset.map((d) => d.filled),
        color: "#4F46E5",
      },
      {
        name: "Shortfall (Openings)",
        data: activeDataset.map((d) => Math.max(0, d.budget - d.filled)),
        color: "#F59E0B",
      },
    ];
  }, [activeDataset]);

  // ReactTable column definitions for dialog modals
  const joinTableColumns = useMemo(
    () => [
      {
        Header: "EMPLOYEE CODE",
        accessor: "EMPCODE",
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: (row: any) => row.name || row.EMPNAME || "—",
        id: "EMPNAME",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "JOINING DATE",
        accessor: "Date",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-400">
            {value || "—"}
          </span>
        ),
      },
    ],
    []
  );

  const leaveTableColumns = useMemo(
    () => [
      {
        Header: "EMPLOYEE CODE",
        accessor: "EMPCODE",
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: (row: any) => row.name || row.EMPNAME || "—",
        id: "EMPNAME",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "LEAVING DATE",
        accessor: "Date",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-400">
            {value || "—"}
          </span>
        ),
      },
    ],
    []
  );

  // Filtered Dialog Lists
  const filteredJoinList = useMemo(() => {
    if (!dialogSearch.trim()) return newJoinData;
    const q = dialogSearch.toLowerCase();
    return (newJoinData || []).filter(
      (emp: any) =>
        String(emp?.EMPCODE || "").toLowerCase().includes(q) ||
        String(emp?.name || emp?.EMPNAME || "").toLowerCase().includes(q) ||
        String(emp?.Date || "").toLowerCase().includes(q)
    );
  }, [newJoinData, dialogSearch]);

  const filteredLeaveList = useMemo(() => {
    if (!dialogSearch.trim()) return leavingData;
    const q = dialogSearch.toLowerCase();
    return (leavingData || []).filter(
      (emp: any) =>
        String(emp?.EMPCODE || "").toLowerCase().includes(q) ||
        String(emp?.name || emp?.EMPNAME || "").toLowerCase().includes(q) ||
        String(emp?.Date || "").toLowerCase().includes(q)
    );
  }, [leavingData, dialogSearch]);

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] font-['Inter',system-ui,sans-serif] [font-feature-settings:'tnum'_1] p-4 sm:p-6 lg:p-7 space-y-4">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & TABS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-[18px]">
        <div>
          <h1 className="m-0 text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
            Manpower budget dashboard
          </h1>
          <p className="m-0 mt-[5px] text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
            Budgeted headcount against actual, and where the gaps are. Click a bar to open that unit&apos;s vacant positions.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-[3px] bg-[#F8FAFC] dark:bg-[#0E1524] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[10px] p-[3px] self-start sm:self-auto shrink-0">
          <AButton
            type="button"
            variant="ghost"
            onClick={() => setDim("dept")}
            className={`border-none font-inherit text-[12px] font-[600] px-[13px] py-[7px] !h-auto rounded-[8px] cursor-pointer whitespace-nowrap transition-colors ${
              dim === "dept"
                ? "!bg-[#4F46E5] !text-white shadow-xs"
                : "!bg-transparent !text-[#64748B] dark:!text-[#94A3B8] hover:!text-[#1E293B] dark:hover:!text-[#E7ECF3]"
            }`}
          >
            Department wise
          </AButton>

          <AButton
            type="button"
            variant="ghost"
            onClick={() => setDim("desig")}
            className={`border-none font-inherit text-[12px] font-[600] px-[13px] py-[7px] !h-auto rounded-[8px] cursor-pointer whitespace-nowrap transition-colors ${
              dim === "desig"
                ? "!bg-[#4F46E5] !text-white shadow-xs"
                : "!bg-transparent !text-[#64748B] dark:!text-[#94A3B8] hover:!text-[#1E293B] dark:hover:!text-[#E7ECF3]"
            }`}
          >
            Designation wise
          </AButton>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. TOP KPI METRIC CARDS (4 CARDS) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[14px] mb-[16px]">
        {/* KPI 1: Available Employees */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] p-[15px_17px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,.4),0_10px_26px_-14px_rgba(0,0,0,.6)]">
          <div className="flex items-center gap-[9px]">
            <span className="w-[28px] h-[28px] rounded-[8px] grid place-items-center bg-[#4F46E5]/10 text-[#4F46E5] dark:text-[#8B84FF] shrink-0">
              <Users className="w-4 h-4 stroke-[1.75]" />
            </span>
            <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase truncate">
              Available employees
            </span>
          </div>
          <div className="flex items-baseline gap-[9px] mt-[11px]">
            <span className="text-[26px] font-[650] tracking-[-0.02em] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
              {Number(stats.filled || 0).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-[3px]">
            on roll today
          </div>
        </div>

        {/* KPI 2: New joining this month (Clickable Dialog) */}
        <div
          onClick={() => {
            setDialogSearch("");
            setIsJoinDialogOpen(true);
          }}
          className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] p-[15px_17px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,.4),0_10px_26px_-14px_rgba(0,0,0,.6)] cursor-pointer hover:border-[#10B981]/50 transition-colors group"
          title="Click to view new joiners"
        >
          <div className="flex items-center gap-[9px]">
            <span className="w-[28px] h-[28px] rounded-[8px] grid place-items-center bg-[#10B981]/10 text-[#10B981] shrink-0 group-hover:scale-105 transition-transform">
              <UserPlus className="w-4 h-4 stroke-[1.75]" />
            </span>
            <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase truncate">
              New joining this month
            </span>
          </div>
          <div className="flex items-baseline gap-[9px] mt-[11px]">
            <span className="text-[26px] font-[650] tracking-[-0.02em] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
              {Number(newJoin || newJoinData?.length || 0).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-[3px]">
            {newJoinData?.length ? `${newJoinData.length} recorded this month` : "this month"}
          </div>
        </div>

        {/* KPI 3: Employees left this month (Clickable Dialog) */}
        <div
          onClick={() => {
            setDialogSearch("");
            setIsLeaveDialogOpen(true);
          }}
          className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] p-[15px_17px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,.4),0_10px_26px_-14px_rgba(0,0,0,.6)] cursor-pointer hover:border-[#E11D48]/50 transition-colors group"
          title="Click to view employees leaving"
        >
          <div className="flex items-center gap-[9px]">
            <span className="w-[28px] h-[28px] rounded-[8px] grid place-items-center bg-[#E11D48]/10 text-[#E11D48] shrink-0 group-hover:scale-105 transition-transform">
              <UserMinus className="w-4 h-4 stroke-[1.75]" />
            </span>
            <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase truncate">
              Employees left this month
            </span>
          </div>
          <div className="flex items-baseline gap-[9px] mt-[11px]">
            <span className="text-[26px] font-[650] tracking-[-0.02em] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
              {Number(leaveEmp || leavingData?.length || 0).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-[3px]">
            {leavingData?.length ? `${leavingData.length} recorded this month` : "this month"}
          </div>
        </div>

        {/* KPI 4: Budgeted headcount */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] p-[15px_17px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,.4),0_10px_26px_-14px_rgba(0,0,0,.6)]">
          <div className="flex items-center gap-[9px]">
            <span className="w-[28px] h-[28px] rounded-[8px] grid place-items-center bg-[#F59E0B]/10 text-[#F59E0B] shrink-0">
              <Target className="w-4 h-4 stroke-[1.75]" />
            </span>
            <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase truncate">
              Budgeted headcount
            </span>
          </div>
          <div className="flex items-baseline gap-[9px] mt-[11px]">
            <span className="text-[26px] font-[650] tracking-[-0.02em] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
              {Number(stats.budgeted || 0).toLocaleString("en-IN")}
            </span>
            {stats.open > 0 && (
              <span className="text-[11.5px] font-[600] text-[#F59E0B]">
                {stats.open} open
              </span>
            )}
          </div>
          <div className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-[3px]">
            {stats.excessTotal > 0 ? `${stats.excessTotal} over budget` : "on approved budget"}
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. MAIN DASHBOARD CONTENT (LEFT: 1fr | RIGHT: 380px) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-[14px] items-start">
        {/* ── LEFT COLUMN (OPEN POSITIONS & EXCESS) ────────────────────────── */}
        <div className="flex flex-col gap-[14px]">
          {/* Section 1: Open positions */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] p-[17px_19px_20px_19px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,.4),0_10px_26px_-14px_rgba(0,0,0,.6)]">
            <div className="flex items-center gap-[10px] mb-[4px]">
              <h2 className="m-0 text-[14px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                Open positions by {dimension}
              </h2>
              {/* Optional Chart view toggle */}
              <button
                type="button"
                onClick={() => setViewMode((v) => (v === "progress" ? "chart" : "progress"))}
                className="w-6 h-6 rounded-md border border-[#E2E8F0] dark:border-[#1F2937] grid place-items-center text-[#64748B] hover:text-[#4F46E5] transition-colors ml-1"
                title={viewMode === "progress" ? "View Highcharts chart" : "View bar list"}
              >
                {viewMode === "progress" ? (
                  <BarChart3 className="w-3.5 h-3.5" />
                ) : (
                  <List className="w-3.5 h-3.5" />
                )}
              </button>
              <div className="flex-1" />
              <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                Budgeted vs filled · shortfall in amber
              </span>
            </div>

            {viewMode === "progress" ? (
              openBars.length > 0 ? (
                <div className="flex flex-col gap-[3px] mt-[16px] max-h-[210px] overflow-y-auto pr-1">
                  {openBars.map((b, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[158px_minmax(0,1fr)_96px_74px] items-center gap-[12px] rounded-[10px] bg-transparent hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] p-[8px_10px] cursor-pointer text-left transition-colors"
                    >
                      {/* Unit label */}
                      <span className="text-[12.5px] font-[550] overflow-hidden text-ellipsis whitespace-nowrap text-[#1E293B] dark:text-[#E7ECF3]">
                        {b.label}
                      </span>

                      {/* Progress Bar with 22px height, filled segment + striped gap */}
                      <span className="block h-[22px] rounded-[6px] bg-[#F8FAFC] dark:bg-[#0E1524] relative overflow-hidden">
                        {/* Filled part */}
                        <span
                          style={{ width: b.filledWidth }}
                          className="absolute inset-[0_auto_0_0] bg-[#4F46E5] rounded-[6px_0_0_6px] transition-all duration-300"
                        />
                        {/* Shortfall gap part (diagonal amber stripes) */}
                        <span
                          style={{
                            left: b.filledWidth,
                            width: b.gapWidth,
                            background:
                              "repeating-linear-gradient(45deg,rgba(245,158,11,.75) 0 6px,rgba(245,158,11,.35) 6px 12px)",
                          }}
                          className="absolute top-0 bottom-0 transition-all duration-300"
                        />
                      </span>

                      {/* Ratio filled / budgeted */}
                      <span className="text-[12px] tabular-nums text-right text-[#64748B] dark:text-[#94A3B8]">
                        {b.ratio}
                      </span>

                      {/* Shortfall number */}
                      <span
                        style={{ color: b.openFg }}
                        className="text-[12.5px] font-[650] tabular-nums text-right"
                      >
                        {b.open}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
                  No position openings data available
                </div>
              )
            ) : (
              <div className="mt-4 pt-2">
                <BarChart
                  categories={chartCategories}
                  series={chartSeriesData}
                  height={320}
                  stacked="normal"
                  showLegend={true}
                  legendPosition="top"
                />
              </div>
            )}
          </div>

          {/* Section 2: Excess employees */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] p-[17px_19px_20px_19px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,.4),0_10px_26px_-14px_rgba(0,0,0,.6)]">
            <div className="flex items-center gap-[10px] mb-[4px]">
              <h2 className="m-0 text-[14px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                Excess employees by {dimension}
              </h2>
              <div className="flex-1" />
              <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                Headcount over the approved budget
              </span>
            </div>

            {excessBars.length > 0 ? (
              <div className="flex flex-col gap-[3px] mt-[16px] max-h-[210px] overflow-y-auto pr-1">
                {excessBars.map((b, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[158px_minmax(0,1fr)_96px_74px] items-center gap-[12px] rounded-[10px] bg-transparent hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] p-[8px_10px] cursor-pointer text-left transition-colors"
                  >
                    <span className="text-[12.5px] font-[550] overflow-hidden text-ellipsis whitespace-nowrap text-[#1E293B] dark:text-[#E7ECF3]">
                      {b.label}
                    </span>
                    <span className="block h-[22px] rounded-[6px] bg-[#F8FAFC] dark:bg-[#0E1524] relative overflow-hidden">
                      <span
                        style={{ width: b.width }}
                        className="absolute inset-[0_auto_0_0] bg-[#E11D48] rounded-[6px] transition-all duration-300"
                      />
                    </span>
                    <span className="text-[12px] tabular-nums text-right text-[#64748B] dark:text-[#94A3B8]">
                      {b.cost}
                    </span>
                    <span className="text-[12.5px] font-[650] tabular-nums text-right text-[#E11D48]">
                      +{b.excess}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty state */
              <div className="p-[34px_10px] text-center">
                <span className="inline-grid place-items-center w-[40px] h-[40px] rounded-[11px] bg-[#10B981]/15 text-[#10B981]">
                  <Check className="w-5 h-5 stroke-[2]" />
                </span>
                <div className="text-[13px] font-[550] mt-[12px] text-[#1E293B] dark:text-[#E7ECF3]">
                  Nobody over budget
                </div>
                <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8] mt-[4px]">
                  Every unit is at or below its approved headcount.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN (SALARY BUDGET & THIS MONTH) ───────────────────── */}
        <div className="flex flex-col gap-[12px]">
          {/* Card 1: Salary budget */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] p-[16px_18px_18px_18px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,.4),0_10px_26px_-14px_rgba(0,0,0,.6)]">
            <div className="flex items-center gap-[9px] mb-[13px]">
              <span className="w-[26px] h-[26px] rounded-[8px] grid place-items-center bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF] shrink-0">
                <Wallet className="w-4 h-4 stroke-[1.75]" />
              </span>
              <h2 className="m-0 text-[14px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                Salary budget
              </h2>
            </div>

            <div className="flex items-baseline gap-[8px]">
              <span className="text-[24px] font-[650] tracking-[-0.02em] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                {stats.usedPct}%
              </span>
              <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                of approved budget used
              </span>
            </div>

            {/* 8px rounded progress bar */}
            <div className="h-[8px] rounded-full bg-[#F8FAFC] dark:bg-[#0E1524] relative overflow-hidden mt-[12px]">
              <span
                style={{
                  width: `${Math.min(100, stats.usedPct)}%`,
                  background: stats.salaryTint,
                }}
                className="absolute inset-[0_auto_0_0] rounded-full transition-all duration-300"
              />
            </div>

            {/* Breakdown table list */}
            <div className="flex flex-col gap-[7px] mt-[14px] pt-[13px] border-t border-[#E2E8F0] dark:border-[#1F2937]">
              <div className="flex gap-[10px] items-baseline text-[12.5px]">
                <span className="flex-1 min-w-0 text-[#64748B] dark:text-[#94A3B8]">
                  Approved budget
                </span>
                <span className="shrink-0 font-[600] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                  ₹{stats.salBudget.toLocaleString("en-IN")} L
                </span>
              </div>

              <div className="flex gap-[10px] items-baseline text-[12.5px]">
                <span className="flex-1 min-w-0 text-[#64748B] dark:text-[#94A3B8]">
                  Actual salary cost
                </span>
                <span className="shrink-0 font-[600] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                  ₹{stats.salActual.toLocaleString("en-IN")} L
                </span>
              </div>

              <div className="flex gap-[10px] items-baseline text-[12.5px]">
                <span className="flex-1 min-w-0 text-[#64748B] dark:text-[#94A3B8]">
                  {stats.salActual > stats.salBudget ? "Over budget by" : "Head-room left"}
                </span>
                <span
                  style={{
                    color: stats.salActual > stats.salBudget ? "#E11D48" : "#10B981",
                  }}
                  className="shrink-0 font-[600] tabular-nums"
                >
                  ₹{Math.abs(stats.salBudget - stats.salActual).toLocaleString("en-IN")} L
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: This month activities (All values connected to live API) */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] p-[16px_18px_18px_18px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,.4),0_10px_26px_-14px_rgba(0,0,0,.6)]">
            <div className="flex items-center gap-[9px] mb-[13px]">
              <span className="w-[26px] h-[26px] rounded-[8px] grid place-items-center bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF] shrink-0">
                <Activity className="w-4 h-4 stroke-[1.75]" />
              </span>
              <h2 className="m-0 text-[14px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                This month
              </h2>
            </div>

            <div className="flex flex-col gap-[9px]">
              {/* Item 1: New joinings */}
              <div className="flex items-center gap-[11px] border border-[#E2E8F0] dark:border-[#1F2937] border-l-[3px] border-l-[#4F46E5] rounded-[10px] p-[10px_12px] bg-white dark:bg-[#111827]">
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] font-[550] text-[#1E293B] dark:text-[#E7ECF3]">
                    New joinings
                  </span>
                  <span className="block text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-[2px]">
                    {newJoinData?.length ? `${newJoinData.length} joined this month` : "recorded this month"}
                  </span>
                </span>
                <span className="shrink-0 text-[16px] font-[650] tabular-nums text-[#4F46E5] dark:text-[#8B84FF]">
                  {Number(newJoin || newJoinData?.length || 0).toLocaleString("en-IN")}
                </span>
              </div>

              {/* Item 2: Open positions */}
              <div className="flex items-center gap-[11px] border border-[#E2E8F0] dark:border-[#1F2937] border-l-[3px] border-l-[#10B981] rounded-[10px] p-[10px_12px] bg-white dark:bg-[#111827]">
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] font-[550] text-[#1E293B] dark:text-[#E7ECF3]">
                    Open positions
                  </span>
                  <span className="block text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-[2px]">
                    across {activeDataset.length} {dimension}s
                  </span>
                </span>
                <span className="shrink-0 text-[16px] font-[650] tabular-nums text-[#10B981]">
                  {Number(stats.open || 0).toLocaleString("en-IN")}
                </span>
              </div>

              {/* Item 3: Employees left */}
              <div className="flex items-center gap-[11px] border border-[#E2E8F0] dark:border-[#1F2937] border-l-[3px] border-l-[#E11D48] rounded-[10px] p-[10px_12px] bg-white dark:bg-[#111827]">
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] font-[550] text-[#1E293B] dark:text-[#E7ECF3]">
                    Employees left
                  </span>
                  <span className="block text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-[2px]">
                    {leavingData?.length ? `${leavingData.length} left this month` : "recorded this month"}
                  </span>
                </span>
                <span className="shrink-0 text-[16px] font-[650] tabular-nums text-[#E11D48]">
                  {Number(leaveEmp || leavingData?.length || 0).toLocaleString("en-IN")}
                </span>
              </div>

              {/* Item 4: Excess headcount */}
              <div className="flex items-center gap-[11px] border border-[#E2E8F0] dark:border-[#1F2937] border-l-[3px] border-l-[#F59E0B] rounded-[10px] p-[10px_12px] bg-white dark:bg-[#111827]">
                <span className="flex-1 min-w-0">
                  <span className="block text-[12.5px] font-[550] text-[#1E293B] dark:text-[#E7ECF3]">
                    Excess headcount
                  </span>
                  <span className="block text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-[2px]">
                    over approved budget
                  </span>
                </span>
                <span className="shrink-0 text-[16px] font-[650] tabular-nums text-[#F59E0B]">
                  {Number(stats.excessTotal || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 4. MODALS / DIALOGS (NEW JOINING & LEAVING EMPLOYEES) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* Modal 1: New Joining This Month */}
      <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
        <DialogContent
          style={{ boxShadow: "none", filter: "none" }}
          className="max-w-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] p-6 !shadow-none !drop-shadow-none"
        >
          <DialogHeader>
            <DialogTitle className="text-[16px] font-[650] text-[#1E293B] dark:text-[#E7ECF3] flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#10B981]/10 text-[#10B981] grid place-items-center">
                <UserPlus className="w-4 h-4 stroke-[1.75]" />
              </span>
              <span>New Joining This Month ({newJoinData?.length || 0})</span>
            </DialogTitle>
          </DialogHeader>

          {/* Search filter input */}
          <div className="relative mb-3 mt-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              value={dialogSearch}
              onChange={(e) => setDialogSearch(e.target.value)}
              placeholder="Search code, name, date..."
              className="w-full pl-9 pr-3 py-2 text-[12.5px] rounded-[8px] border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          {/* ReactTable Component */}
          <div className="mt-1">
            <ServiceTablePagination
              columns={joinTableColumns}
              data={filteredJoinList || []}
              check={false}
              height={320}
              initialPageSize={10}
              showExcelExport={false}
              showTopSearch={false}
              containerClassName="border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl overflow-hidden shadow-none"
            />
          </div>

          <div className="flex justify-end pt-3">
            <AButton
              variant="outline"
              size="sm"
              onClick={() => setIsJoinDialogOpen(false)}
              className="text-[12px] font-[550] rounded-[8px]"
            >
              Close
            </AButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Employees Left This Month */}
      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent
          style={{ boxShadow: "none", filter: "none" }}
          className="max-w-3xl bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] p-6 !shadow-none !drop-shadow-none"
        >
          <DialogHeader>
            <DialogTitle className="text-[16px] font-[650] text-[#1E293B] dark:text-[#E7ECF3] flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#E11D48]/10 text-[#E11D48] grid place-items-center">
                <UserMinus className="w-4 h-4 stroke-[1.75]" />
              </span>
              <span>Employees Left This Month ({leavingData?.length || 0})</span>
            </DialogTitle>
          </DialogHeader>

          {/* Search filter input */}
          <div className="relative mb-3 mt-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              value={dialogSearch}
              onChange={(e) => setDialogSearch(e.target.value)}
              placeholder="Search code, name, date..."
              className="w-full pl-9 pr-3 py-2 text-[12.5px] rounded-[8px] border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          {/* ReactTable Component */}
          <div className="mt-1">
            <ServiceTablePagination
              columns={leaveTableColumns}
              data={filteredLeaveList || []}
              check={false}
              height={320}
              initialPageSize={10}
              showExcelExport={false}
              showTopSearch={false}
              containerClassName="border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl overflow-hidden shadow-none"
            />
          </div>

          <div className="flex justify-end pt-3">
            <AButton
              variant="outline"
              size="sm"
              onClick={() => setIsLeaveDialogOpen(false)}
              className="text-[12px] font-[550] rounded-[8px]"
            >
              Close
            </AButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
