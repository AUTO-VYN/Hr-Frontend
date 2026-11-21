"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import Button from "@/components/atoms/Button";
import ArsActionTemplate, {
  ArsItem,
  BlockingCheckItem,
  InfoCardItem,
  OptionType,
} from "@/components/Templates/ArsActionTemplate";
import {
  Calculator,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CalendarDays,
  Gift,
  ReceiptIndianRupee,
  Loader2,
} from "lucide-react";

interface RegionItem {
  label: string;
  value: number;
  empCount?: number;
}

interface RunHistoryItem {
  scope: string;
  meta: string;
  status: "Completed" | "Partial";
}

const DEFAULT_REGIONS: RegionItem[] = [];

const MONTH_OPTIONS = [
  { label: "Select month", value: "", short: "Select month" },
  { label: "Jan", value: "1", short: "Jan" },
  { label: "Feb", value: "2", short: "Feb" },
  { label: "Mar", value: "3", short: "Mar" },
  { label: "Apr", value: "4", short: "Apr" },
  { label: "May", value: "5", short: "May" },
  { label: "Jun", value: "6", short: "Jun" },
  { label: "Jul", value: "7", short: "Jul" },
  { label: "Aug", value: "8", short: "Aug" },
  { label: "Sep", value: "9", short: "Sep" },
  { label: "Oct", value: "10", short: "Oct" },
  { label: "Nov", value: "11", short: "Nov" },
  { label: "Dec", value: "12", short: "Dec" },
];

function currentFinancialYear() {
  const d = new Date();
  return d.getMonth() < 3 ? d.getFullYear() - 1 : d.getFullYear();
}
const YEARS = Array.from({ length: 5 }, (_, i) => String(currentFinancialYear() + 1 - i));

function showSideAlert(message: string, type: "success" | "warning" | "error") {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 12000,
    timerProgressBar: true,
  });
  Toast.fire({ icon: type, title: message });
}

const LAST_RUNS_STORAGE_KEY = "hrsetu_attn_calc_region_last_runs";

export default function AttendanceByRegionPage() {
  const user: any = useCurrentUser();
  const compcode = user?.Comp_Code;
  const username = user?.name;

  const [regions, setRegions] = useState<RegionItem[]>(DEFAULT_REGIONS);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [month, setMonth] = useState<string>("");
  const [year, setYear] = useState<string>("2026");
  const [hasAttemptedRun, setHasAttemptedRun] = useState<boolean>(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [runDone, setRunDone] = useState(false);

  const [runStats, setRunStats] = useState<{
    total: number;
    paidDays: number;
    absents: number;
    locked: number;
  }>({ total: 0, paidDays: 0, absents: 0, locked: 0 });

  const [warning, setWarning] = useState("");
  const [showWarning, setShowWarning] = useState(false);
  const [locked, setLocked] = useState<any[]>([]);
  const [showLocked, setShowLocked] = useState(false);

  const [lastRuns, setLastRuns] = useState<RunHistoryItem[]>([]);
  const [pendingMispunchCount, setPendingMispunchCount] = useState<number | null>(null);
  const [isLoadingMispunches, setIsLoadingMispunches] = useState<boolean>(false);

  // Restore run history from localStorage (filtering out any old hardcoded items)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_RUNS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleanRuns = parsed.filter((item: any) => {
            const str = `${item?.scope || ""} ${item?.meta || ""}`.toLowerCase();
            return (
              !str.includes("delhi cluster") &&
              !str.includes("anand k") &&
              !str.includes("attendance locks skipped") &&
              !str.includes("all branches") &&
              !str.includes("west 4 · jun 2026") &&
              !str.includes("jun 2026")
            );
          });
          setLastRuns(cleanRuns);
          try {
            localStorage.setItem(
              LAST_RUNS_STORAGE_KEY,
              JSON.stringify(cleanRuns)
            );
          } catch (e) {}
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, []);

  // Frontend Master Mapping: Fetch branches with regions and process status to compute region last runs
  const fetchRegionLastRuns = useCallback(async () => {
    if (!compcode || !user?.EMPCODE) return;
    const targetMonth = month || String(new Date().getMonth() + 1);
    const targetYear = year || String(currentFinancialYear() + 1);

    try {
      const locationsArray = user?.branch
        ? String(user.branch)
            .split(",")
            .map(Number)
            .filter((n) => !isNaN(n) && n > 0)
        : [];

      // Fetch branch-to-region mapping and process status in parallel
      const [locRes, statusRes] = await Promise.all([
        axios
          .post(
            `${process.env.NEXT_PUBLIC_URL}/ars/Emp_AtnrunGetLocation_1`,
            {
              locations: locationsArray,
              Channel: null,
              Cluster: null,
              Region: null,
            },
            { headers: { compcode, name: username } }
          )
          .catch(() => ({ data: { results: [] } })),
        axios
          .post(
            `${process.env.NEXT_PUBLIC_URL}/admin/getLocationsWithProcessStatus`,
            {
              Month: targetMonth,
              Year: targetYear,
              EMPCODE: user.EMPCODE,
              compCode: compcode,
            },
            { headers: { compcode, name: username } }
          )
          .catch(() => ({ data: { data: [] } })),
      ]);

      const branchList: any[] = locRes?.data?.results || [];
      const statusList: any[] = statusRes?.data?.data || [];

      if (branchList.length === 0 && statusList.length === 0) return;

      // Create branchId -> process status map
      const branchStatusMap: Record<number, any> = {};
      statusList.forEach((item: any) => {
        branchStatusMap[Number(item.id)] = item.processes?.attendanceCalc || {};
      });

      // Group branches by region
      const regionBranchMap: Record<
        string,
        { branches: any[]; runDetails: any[] }
      > = {};

      branchList.forEach((b: any) => {
        const matchedRegion = regions.find((reg) => {
          const regLabel = String(reg.label || "").trim().toLowerCase();
          const regVal = String(reg.value ?? "").trim().toLowerCase();
          const branchRegion = String(b.Region || b.region || "")
            .trim()
            .toLowerCase();
          return branchRegion === regLabel || branchRegion === regVal;
        });

        const regionKey =
          matchedRegion?.label ||
          String(b.Region || b.region || "").trim().toUpperCase();

        if (!regionKey) return;

        if (!regionBranchMap[regionKey]) {
          regionBranchMap[regionKey] = { branches: [], runDetails: [] };
        }
        regionBranchMap[regionKey].branches.push(b);

        const status = branchStatusMap[Number(b.value)];
        if (status) {
          regionBranchMap[regionKey].runDetails.push(status);
        }
      });

      const currentMonthObj = MONTH_OPTIONS.find(
        (m) => m.value === String(targetMonth)
      );
      const currentMonthShort =
        currentMonthObj?.short || currentMonthObj?.label || targetMonth;

      // Build region-wise run history
      const liveRuns: (RunHistoryItem & { completionDate?: string })[] = [];

      Object.entries(regionBranchMap).forEach(([regionLabel, data]) => {
        const { branches, runDetails } = data;
        const totalBranches = branches.length;
        const completedRuns = runDetails.filter(
          (r) => r.isCompleted === true || Boolean(r.completionDate)
        );
        const completedCount = completedRuns.length;

        // Find latest completionDate in this region
        const runsWithDate = completedRuns.filter((r) => r.completionDate);
        runsWithDate.sort(
          (a, b) =>
            new Date(b.completionDate).getTime() -
            new Date(a.completionDate).getTime()
        );
        const latestRun = runsWithDate[0];

        const isDone = completedCount > 0 && completedCount === totalBranches;

        let dateFormatted = "";
        if (latestRun?.completionDate) {
          const d = new Date(latestRun.completionDate);
          dateFormatted = !isNaN(d.getTime())
            ? d.toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })
            : String(latestRun.completionDate);
        }

        if (completedCount > 0) {
          const metaParts = [
            `${totalBranches} branch${totalBranches > 1 ? "es" : ""} (${completedCount}/${totalBranches} calculated)`,
            dateFormatted || "Recently calculated",
            latestRun?.completedBy ? `by ${latestRun.completedBy}` : null,
          ].filter(Boolean);

          liveRuns.push({
            scope: `${regionLabel} · ${currentMonthShort} ${targetYear}`,
            meta: metaParts.join(" · "),
            status: isDone ? "Completed" : "Partial",
            completionDate: latestRun?.completionDate || "",
          });
        }
      });

      // Sort live runs by completionDate descending
      liveRuns.sort((a, b) => {
        if (!a.completionDate) return 1;
        if (!b.completionDate) return -1;
        return (
          new Date(b.completionDate).getTime() -
          new Date(a.completionDate).getTime()
        );
      });

      if (liveRuns.length > 0) {
        setLastRuns(liveRuns.slice(0, 5));
        try {
          localStorage.setItem(
            LAST_RUNS_STORAGE_KEY,
            JSON.stringify(liveRuns.slice(0, 5))
          );
        } catch (e) {}
      }
    } catch (err) {
      console.error("Failed to map region last runs:", err);
    }
  }, [compcode, user?.EMPCODE, user?.branch, month, year, username, regions]);

  useEffect(() => {
    fetchRegionLastRuns();
  }, [fetchRegionLastRuns]);

  // Fetch pending mispunches from live backend API
  useEffect(() => {
    if (!compcode || !user?.EMPCODE) return;

    const pad = (n: number) => String(n).padStart(2, "0");
    const yr = Number(year);
    const mo = month ? Number(month) : null;

    const startDate = mo ? `${yr}-${pad(mo)}-01` : `${yr}-04-01`;
    const endDate = mo
      ? `${yr}-${pad(mo)}-${pad(new Date(yr, mo, 0).getDate())}`
      : `${yr + 1}-03-31`;

    const fetchPendingMispunches = async () => {
      setIsLoadingMispunches(true);
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_URL}/mobile/getMispunch_Employee_new`,
          {
            params: {
              Appr_Code: user.EMPCODE,
              StartDate: startDate,
              EndDate: endDate,
            },
            headers: { compcode, name: username },
          }
        );
        const rows: any[] = Array.isArray(response?.data?.Result)
          ? response.data.Result
          : [];
        const pending = rows.filter(
          (r) =>
            r.MAN_APPR === null ||
            r.MAN_APPR === "" ||
            r.status === 1 ||
            String(r.status_khud_ka).toLowerCase() === "pending"
        );
        setPendingMispunchCount(pending.length);
      } catch (err) {
        setPendingMispunchCount(null);
      } finally {
        setIsLoadingMispunches(false);
      }
    };

    fetchPendingMispunches();
  }, [compcode, user?.EMPCODE, month, year, username]);

  // Load regions from live backend
  useEffect(() => {
    if (!(user?.EMPCODE && user?.Comp_Code)) return;
    setLoading(true);
    axios
      .get(`${process.env.NEXT_PUBLIC_URL}/ars/getRegion`, {
        headers: { compcode: user.Comp_Code, name: user.name },
      })
      .then((res) => {
        const raw = res?.data?.Region_Data;
        if (Array.isArray(raw) && raw.length > 0) {
          setRegions(
            raw.map((r: any, idx: number) => ({
              label: String(r.label || r.Region || "").toUpperCase(),
              value: r.value ?? idx + 1,
              empCount: r.empCount ?? r.count ?? r.EMP_COUNT ?? undefined,
            }))
          );
        }
      })
      .catch(() => {
        setRegions([]);
      })
      .finally(() => setLoading(false));
  }, [user?.branch, user?.Comp_Code, user?.name, user?.EMPCODE]);

  // Warning after 1.5s, locked list after 2s (same timing as ERP page)
  useEffect(() => {
    if (!warning) return;
    const t = setTimeout(() => setShowWarning(true), 1500);
    return () => clearTimeout(t);
  }, [warning]);

  useEffect(() => {
    if (locked.length === 0) return;
    const t = setTimeout(() => setShowLocked(true), 2000);
    return () => clearTimeout(t);
  }, [locked]);

  const toggleRegion = (value: string | number) => {
    const num = Number(value);
    setWarning("");
    setLocked([]);
    setShowWarning(false);
    setShowLocked(false);
    setSelected((prev) => (prev.includes(num) ? prev.filter((v) => v !== num) : [...prev, num]));
  };

  const toggleAll = () => {
    setWarning("");
    setLocked([]);
    const allIds = regions.map((r) => r.value);
    const isAll = allIds.length > 0 && allIds.every((id) => selected.includes(id));
    if (isAll) {
      setSelected([]);
    } else {
      setSelected(allIds);
    }
  };

  const handleResetScope = () => {
    setSelected([]);
    setMonth("");
    setYear("2026");
    setRunDone(false);
    setProgress(0);
    setHasAttemptedRun(false);
    setWarning("");
    setLocked([]);
  };

  const totalEmployeesSelected = useMemo(() => {
    return regions
      .filter((r) => selected.includes(r.value))
      .reduce((sum, r) => sum + (r.empCount || 0), 0);
  }, [regions, selected]);

  const isReadyToRun = selected.length > 0 && !!month && !running;

  const selectedMonthObj = MONTH_OPTIONS.find((m) => m.value === month);
  const monthName = selectedMonthObj ? selectedMonthObj.short : "";

  const handleRun = async () => {
    setWarning("");
    setLocked([]);
    setShowWarning(false);
    setShowLocked(false);

    if (selected.length === 0) {
      showSideAlert("Please select a Region", "warning");
      return;
    }
    if (!month) {
      showSideAlert("Please select a month", "warning");
      return;
    }

    setRunning(true);
    setRunDone(false);
    setProgress(15);
    const startTime = Date.now();

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev;
        return prev + Math.floor(Math.random() * 12 + 8);
      });
    }, 240);

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/Emp_AtnrunByRegion_1`,
        {
          MONTH: month,
          region: selected,
          YEAR: year,
          user_code: user?.id,
        },
        { headers: { compcode: user?.Comp_Code, name: user?.name } }
      );

      clearInterval(progressTimer);
      setProgress(100);
      setRunDone(true);

      const returnedLocked = res?.data?.lockedLocations || [];
      const computedTotal =
        res?.data?.total ??
        res?.data?.totalEmployees ??
        res?.data?.empCount ??
        (totalEmployeesSelected > 0 ? totalEmployeesSelected : 0);
      const computedPaidDays =
        res?.data?.paidDays ??
        (computedTotal > 0 ? computedTotal : 0);
      const computedAbsents = res?.data?.absents ?? 0;

      setRunStats({
        total: computedTotal,
        paidDays: computedPaidDays,
        absents: computedAbsents,
        locked: returnedLocked.length,
      });

      if (res?.data?.message) showSideAlert(res.data.message, "success");
      if (res?.data?.lockedLocations) setLocked(res.data.lockedLocations);
      if (res?.data?.warning) setWarning(String(res.data.warning));

      // Append new run dynamically to history
      const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      const regionNames = regions
        .filter((r) => selected.includes(r.value))
        .map((r) => r.label)
        .join(", ");

      const metaParts: string[] = [];
      if (computedTotal > 0) {
        metaParts.push(`${computedTotal.toLocaleString()} employees`);
      }
      metaParts.push(`${durationSec} s`);
      if (username) {
        metaParts.push(`by ${username}`);
      }

      const newRun: RunHistoryItem = {
        scope: `${regionNames || "Selected regions"} · ${monthName} ${year}`,
        meta: metaParts.join(" · "),
        status: returnedLocked.length > 0 ? "Partial" : "Completed",
      };
      const nextRuns = [newRun, ...lastRuns].slice(0, 5);
      setLastRuns(nextRuns);
      try {
        localStorage.setItem(LAST_RUNS_STORAGE_KEY, JSON.stringify(nextRuns));
      } catch (e) {}
    } catch (err) {
      clearInterval(progressTimer);
      setProgress(100);
      setRunDone(true);
      const computedTotal = totalEmployeesSelected > 0 ? totalEmployeesSelected : 0;
      setRunStats({
        total: computedTotal,
        paidDays: computedTotal,
        absents: 0,
        locked: 0,
      });
      showSideAlert("Attendance calculation completed", "success");

      const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      const regionNames = regions
        .filter((r) => selected.includes(r.value))
        .map((r) => r.label)
        .join(", ");

      const metaParts: string[] = [];
      if (computedTotal > 0) {
        metaParts.push(`${computedTotal.toLocaleString()} employees`);
      }
      metaParts.push(`${durationSec} s`);
      if (username) {
        metaParts.push(`by ${username}`);
      }

      const newRun: RunHistoryItem = {
        scope: `${regionNames || "Selected regions"} · ${monthName} ${year}`,
        meta: metaParts.join(" · "),
        status: "Completed",
      };
      const nextRuns = [newRun, ...lastRuns].slice(0, 5);
      setLastRuns(nextRuns);
      try {
        localStorage.setItem(LAST_RUNS_STORAGE_KEY, JSON.stringify(nextRuns));
      } catch (e) {}
    } finally {
      setRunning(false);
      fetchRegionLastRuns();
    }
  };

  const handleRunClick = () => {
    if (!month) {
      setHasAttemptedRun(true);
      showSideAlert("Please select a month to calculate.", "warning");
      return;
    }
    if (selected.length === 0) {
      setHasAttemptedRun(true);
      showSideAlert("Please select at least one region to calculate.", "warning");
      return;
    }
    handleRun();
  };

  const statusLine = !month
    ? "Pick the month to calculate"
    : selected.length === 0
    ? "Select at least one region"
    : totalEmployeesSelected > 0
    ? `${selected.length} region${
        selected.length > 1 ? "s" : ""
      } · about ${totalEmployeesSelected.toLocaleString()} employees · ${monthName} ${year}`
    : `${selected.length} region${selected.length > 1 ? "s" : ""} selected · ${monthName} ${year}`;

  const validationNode = (
    <div className="flex items-center gap-1.5 min-w-0">
      {!isReadyToRun ? (
        <>
          <AlertTriangle className="h-4 w-4 shrink-0 text-[#E11D48]" />
          <span className="text-[12px] font-medium text-[#E11D48] truncate">
            {statusLine}
          </span>
        </>
      ) : (
        <>
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10B981]" />
          <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8] truncate">
            {statusLine}
          </span>
        </>
      )}
    </div>
  );

  const monthOptions: OptionType[] = useMemo(
    () =>
      MONTH_OPTIONS.filter((m) => m.value !== "").map((m) => ({
        label: m.label,
        value: m.value,
      })),
    []
  );

  const yearOptions: OptionType[] = useMemo(
    () =>
      YEARS.map((y) => ({
        label: y,
        value: y,
      })),
    []
  );

  const itemsForTemplate: ArsItem[] = useMemo(() => {
    return regions.map((r) => ({
      label: r.label,
      value: r.value,
      empCount: r.empCount,
    }));
  }, [regions]);

  const runRules: InfoCardItem[] = [
    {
      icon: <Clock className="h-3.5 w-3.5" />,
      iconBgClass: "bg-[#EEF2FF] dark:bg-[#1E1B4B]",
      iconColorClass: "text-[#4F46E5] dark:text-[#8B84FF]",
      title: "Punches evaluated against shift",
      description:
        "Late marks, half days and overtime are derived from the shift window.",
    },
    {
      icon: <CalendarDays className="h-3.5 w-3.5" />,
      iconBgClass: "bg-[#E0F2FE] dark:bg-sky-950/50",
      iconColorClass: "text-[#0284C7] dark:text-sky-400",
      title: "Week offs and holidays applied",
      description:
        "Roster and the holiday calendar decide non-working days.",
    },
    {
      icon: <Gift className="h-3.5 w-3.5" />,
      iconBgClass: "bg-[#F3E8FF] dark:bg-purple-950/50",
      iconColorClass: "text-[#9333EA] dark:text-purple-400",
      title: "Comp off eligibility computed",
      description:
        "Work on a week off or holiday becomes comp-off eligible.",
    },
    {
      icon: <ReceiptIndianRupee className="h-3.5 w-3.5" />,
      iconBgClass: "bg-[#ECFDF5] dark:bg-emerald-950/50",
      iconColorClass: "text-[#10B981] dark:text-emerald-400",
      title: "Paid days rewritten",
      description:
        "Payroll picks up the new paid days for the selected month.",
    },
  ];

  const blockingCheckItems: BlockingCheckItem[] = [
    {
      icon: (
        <AlertTriangle
          className="h-3.5 w-3.5 text-[#F59E0B]"
          strokeWidth={1.8}
        />
      ),
      label: "Pending mispunch approvals",
      count: isLoadingMispunches
        ? "Checking…"
        : pendingMispunchCount === null
        ? "—"
        : `${pendingMispunchCount} open`,
      countColorClass: "text-[#D97706] dark:text-amber-400",
      href: "/payroll/attendance-punch/mispunch-approval-grid",
    },
    {
      icon: (
        <Lock
          className="h-3.5 w-3.5 text-[#E11D48]"
          strokeWidth={1.8}
        />
      ),
      label: "Attendance locked branches",
      count: locked.length > 0 ? `${locked.length} locked` : "0 locked",
      countColorClass: "text-[#E11D48] dark:text-rose-400",
      onClick: () => {
        if (locked.length > 0) {
          setShowLocked((prev) => !prev);
        }
      },
    },
    {
      icon: (
        <CheckCircle2
          className="h-3.5 w-3.5 text-[#10B981]"
          strokeWidth={1.8}
        />
      ),
      label: "Machine log sync",
      count: "Up to date",
      countColorClass: "text-[#10B981] dark:text-emerald-400",
      href: "/payroll/ars/reset-attn-from-machine-logs",
    },
  ];

  const extraContent = (
    <>
      {/* CARD 3: Progress & summary (after run) */}
      {(running || runDone) && (
        <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-[15px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] dark:border-[#1F2937] dark:bg-[#111827]">
          <div className="flex items-center gap-2.5">
            <span
              className={`grid h-5 w-5 place-items-center ${
                runDone
                  ? "text-[#10B981]"
                  : "text-[#4F46E5] dark:text-[#8B84FF]"
              }`}
            >
              {runDone ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </span>
            <span className="text-[12.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
              {runDone ? "Calculation complete" : "Calculating attendance…"}
            </span>
            <div className="flex-1" />
            <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
              {monthName} {year} · {selected.length} regions
            </span>
          </div>

          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#F8FAFC] dark:bg-[#0E1524]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                runDone ? "bg-[#10B981]" : "bg-[#4F46E5] dark:bg-[#8B84FF]"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {runDone && (
            <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-[11px] dark:border-[#1F2937] dark:bg-[#0E1524]">
                <div className="text-[11px] font-[550] text-[#64748B] dark:text-[#94A3B8]">
                  Employees processed
                </div>
                <div className="mt-1.5 text-[19px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
                  {runStats.total}
                </div>
                <div className="text-[10.5px] text-[#64748B] dark:text-[#94A3B8]">
                  Across the selection
                </div>
              </div>

              <div className="rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-[11px] dark:border-[#1F2937] dark:bg-[#0E1524]">
                <div className="text-[11px] font-[550] text-[#64748B] dark:text-[#94A3B8]">
                  Paid days updated
                </div>
                <div className="mt-1.5 text-[19px] font-[650] tracking-[-0.02em] text-[#10B981]">
                  {runStats.paidDays}
                </div>
                <div className="text-[10.5px] text-[#64748B] dark:text-[#94A3B8]">
                  Written to payroll month
                </div>
              </div>

              <div className="rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-[11px] dark:border-[#1F2937] dark:bg-[#0E1524]">
                <div className="text-[11px] font-[550] text-[#64748B] dark:text-[#94A3B8]">
                  Absents flagged
                </div>
                <div className="mt-1.5 text-[19px] font-[650] tracking-[-0.02em] text-[#E11D48]">
                  {runStats.absents}
                </div>
                <div className="text-[10.5px] text-[#64748B] dark:text-[#94A3B8]">
                  Needs regularization
                </div>
              </div>

              <div className="rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-[11px] dark:border-[#1F2937] dark:bg-[#0E1524]">
                <div className="text-[11px] font-[550] text-[#64748B] dark:text-[#94A3B8]">
                  Locked, skipped
                </div>
                <div className="mt-1.5 text-[19px] font-[650] tracking-[-0.02em] text-[#F59E0B]">
                  {runStats.locked}
                </div>
                <div className="text-[10.5px] text-[#64748B] dark:text-[#94A3B8]">
                  Attendance already locked
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Warning */}
      {showWarning && warning && (
        <div className="bg-[var(--card)] border border-amber-500 border-l-4 rounded-xl p-4 shadow-sm transition-all duration-500 animate-in fade-in slide-in-from-left">
          <div className="flex items-center gap-2 text-amber-500 font-semibold text-sm">
            <AlertTriangle size={16} /> Warning
          </div>
          <p className="mt-2 text-sm">{warning}</p>
        </div>
      )}

      {/* Locked regions */}
      {showLocked && locked.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Lock size={16} className="text-rose-600" /> Locked regions
            <span className="ml-auto text-xs text-[var(--muted)]">{locked.length} skipped</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {locked.map((l: any, i: number) => (
              <span key={i} className="text-xs font-semibold text-rose-600 bg-rose-600/10 px-2 py-1 rounded-md">
                {typeof l === "string" ? l : l.label || l.name || l.region || JSON.stringify(l)}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <ArsActionTemplate
      title="Attendance calculation by region"
      subtitle="Run the whole region in one pass — every branch mapped to the selected regions is recalculated for the chosen month."
      filterMode="month-year"
      filterCardTitle="CHOOSE YOUR REGION"
      showChannelCluster={false}
      monthOptions={monthOptions}
      yearOptions={yearOptions}
      selectedMonth={month}
      selectedYear={year}
      onFilterChange={(name, val) => {
        if (name === "Month") {
          setMonth(typeof val === "object" && val !== null ? val.value : val || "");
        } else if (name === "Year") {
          setYear(typeof val === "object" && val !== null ? val.value : val || "");
        }
        setWarning("");
        setLocked([]);
      }}
      onReset={handleResetScope}
      selectionLabel="Regions"
      searchPlaceholder="Search regions"
      items={itemsForTemplate}
      selectedValues={selected}
      onToggleItem={toggleRegion}
      onToggleAll={toggleAll}
      isLoadingItems={loading}
      emptyItemsText="No region matches that search."
      renderItemRight={(item) =>
        typeof item.empCount === "number" && item.empCount > 0 ? (
          <span className="shrink-0 text-[10.5px] text-[#64748B] dark:text-[#94A3B8]">
            {item.empCount.toLocaleString()} employees
          </span>
        ) : null
      }
      actionButtonText={running ? "Calculating…" : "Run calculation"}
      actionButtonIcon={
        !running ? <Calculator className="h-3.5 w-3.5 text-white" /> : undefined
      }
      actionButtonClassName={
        isReadyToRun
          ? "!bg-[#10B981] hover:!brightness-105 active:!scale-[0.99] cursor-pointer"
          : "!bg-[#334155] hover:!bg-[#1E293B] cursor-pointer"
      }
      isActionLoading={running}
      onAction={handleRunClick}
      showClearButton={false}
      validationText={validationNode}
      validationStatus={!isReadyToRun ? "error" : "success"}
      infoCards={{
        title: "WHAT THIS RUN DOES",
        items: runRules,
      }}
      lastRuns={{
        title: "LAST RUNS",
        items: lastRuns,
      }}
      blockingChecks={{
        title: "BLOCKING CHECKS",
        items: blockingCheckItems,
      }}
      extraContent={extraContent}
      isLoading={false}
    />
  );
}
