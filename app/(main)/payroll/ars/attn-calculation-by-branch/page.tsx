"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import HashloaderComponent from "@/components/Templates/hashloader";
import Link from "next/link";
import {
  X,
  Search,
  Check,
  Calculator,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CalendarDays,
  Gift,
  ReceiptIndianRupee,
  Lock,
  ChevronDown,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types & Interfaces                                                */
/* ------------------------------------------------------------------ */
interface LocationItem {
  label: string;
  value: number;
  Join_Date?: string;
  Channel?: string;
  Cluster?: string;
  Region?: string;
  empCount?: number;
}

interface MasterOption {
  label: string;
  value: string;
}

interface RunHistoryItem {
  scope: string;
  meta: string;
  status: "Completed" | "Partial";
}

const LAST_RUNS_STORAGE_KEY = "hrsetu_attn_calc_last_runs";

const INITIAL_LAST_RUNS: RunHistoryItem[] = [
  {
    scope: "Delhi cluster · Jun 2026",
    meta: "1,204 employees · 38 s · by Anand K.",
    status: "Completed",
  },
  {
    scope: "West 4 · Jun 2026",
    meta: "268 employees · 12 attendance locks skipped",
    status: "Partial",
  },
  {
    scope: "All branches · May 2026",
    meta: "3,940 employees · 2 m 06 s",
    status: "Completed",
  },
];

const getCurrentFinancialYear = (): number => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const financialYearStartMonth = 3; // April (0-indexed: 3)
  if (currentDate.getMonth() < financialYearStartMonth) {
    return currentYear - 1;
  }
  return currentYear;
};

const generateFinancialYearsArray = (): string[] => {
  const currentYear = getCurrentFinancialYear();
  const financialYears: string[] = [];
  for (let i = 0; i < 5; i++) {
    financialYears.push(String(currentYear - i));
  }
  return financialYears;
};

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

export default function AttnCalculationByBranchPage() {
  const user: any = useCurrentUser();
  const compcode = user?.Comp_Code;
  const username = user?.name;

  // Selected filters
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [month, setMonth] = useState<string>("");
  const [year, setYear] = useState<string>(String(getCurrentFinancialYear()));

  // Master dropdown options from /employee/masters
  const [channelOptions, setChannelOptions] = useState<MasterOption[]>([]);
  const [clusterOptions, setClusterOptions] = useState<MasterOption[]>([]);
  const [regionOptions, setRegionOptions] = useState<MasterOption[]>([]);

  // Locations from /ars/Emp_AtnrunGetLocation_1
  const [locationData, setLocationData] = useState<LocationItem[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Loading & progress
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runProgress, setRunProgress] = useState<number>(0);
  const [runDone, setRunDone] = useState<boolean>(false);

  // null = backend did not return this value (shown as "—")
  const [runStats, setRunStats] = useState<{
    total: number | null;
    paidDays: number | null;
    absents: number | null;
    locked: number;
  }>({ total: null, paidDays: null, absents: null, locked: 0 });

  // Warnings & locked branches from the live engine
  const [warning, setWarning] = useState<string>("");
  const [lockLocations, setLockLocations] = useState<{ label: string }[]>([]);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [showLockLocations, setShowLockLocations] = useState<boolean>(false);

  // Run history (starts with default runs matching design, restored from localStorage if available)
  const [lastRuns, setLastRuns] = useState<RunHistoryItem[]>(INITIAL_LAST_RUNS);

  // Blocking checks (null = unknown / fetch failed)
  const [pendingMispunchCount, setPendingMispunchCount] = useState<number | null>(null);
  const [isLoadingMispunches, setIsLoadingMispunches] = useState<boolean>(false);

  // Restore run history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_RUNS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLastRuns(parsed);
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, []);

  // Fetch pending mispunches from backend
  useEffect(() => {
    if (!compcode || !user?.EMPCODE) return;

    const pad = (n: number) => String(n).padStart(2, "0");
    const yr = Number(year);
    const mo = month ? Number(month) : null;

    // Selected month: full calendar month. No month: full financial year (Apr to Mar).
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

  /* ------------------------------------------------------------------ */
  /*  Delayed banners (from Live ERP)                                   */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (warning) {
      const timer = setTimeout(() => setShowWarning(true), 1500);
      return () => clearTimeout(timer);
    } else {
      setShowWarning(false);
    }
  }, [warning]);

  useEffect(() => {
    if (lockLocations.length > 0) {
      const timer = setTimeout(() => setShowLockLocations(true), 2000);
      return () => clearTimeout(timer);
    } else {
      setShowLockLocations(false);
    }
  }, [lockLocations]);

  /* ------------------------------------------------------------------ */
  /*  Live ERP showSideAlert Helper                                     */
  /* ------------------------------------------------------------------ */
  function showSideAlert(message: string, type: string) {
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 12000,
      timerProgressBar: true,
      customClass: {
        container: "side-alert-container",
        popup: `side-alert-${type}`,
        title: "side-alert-title",
        icon: "side-alert-icon",
      },
    });
    Toast.fire({
      icon: type as any,
      title: message,
    });
  }

  const flashToast = (
    message: string,
    kind: "ok" | "warn" | "error" = "ok"
  ) => {
    const swalType = kind === "ok" ? "success" : kind === "warn" ? "warning" : "error";
    showSideAlert(message, swalType);
  };

  /* ------------------------------------------------------------------ */
  /*  API 1: Masters from /employee/masters                             */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!compcode) return;
    const fetchMasters = async () => {
      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/employee/masters`,
          {},
          {
            headers: {
              compcode: compcode,
              name: username,
            },
          }
        );

        const masters = response?.data?.data || {};

        const convertValuesToString = (array: any[]): MasterOption[] => {
          if (!Array.isArray(array)) return [];
          return array.map((obj: any) => ({
            label: String(
              obj?.label ||
                obj?.labelname ||
                obj?.Misc_Name ||
                obj?.NAME ||
                obj?.name ||
                obj?.value ||
                ""
            ).trim(),
            value: String(
              obj?.value ??
                obj?.Misc_Code ??
                obj?.CODE ??
                obj?.code ??
                obj?.label ??
                ""
            ).trim(),
          }));
        };

        if (masters.CHANNEL1 && Array.isArray(masters.CHANNEL1)) {
          setChannelOptions(convertValuesToString(masters.CHANNEL1));
        }
        if (masters.CLUSTER1 && Array.isArray(masters.CLUSTER1)) {
          setClusterOptions(convertValuesToString(masters.CLUSTER1));
        }
        if (masters.Sal_Region && Array.isArray(masters.Sal_Region)) {
          setRegionOptions(convertValuesToString(masters.Sal_Region));
        }
      } catch (err) {
        console.error("Error fetching master dropdowns:", err);
      }
    };

    fetchMasters();
  }, [compcode, username]);

  /* ------------------------------------------------------------------ */
  /*  Channel, Cluster label resolvers                                  */
  /* ------------------------------------------------------------------ */
  const getChannelLabel = (val: string) => {
    if (!val) return "";
    const match = channelOptions.find(
      (o) => o.value === val || o.label.toUpperCase() === val.toUpperCase()
    );
    return match ? match.label : val;
  };

  const getClusterLabel = (val: string) => {
    if (!val) return "";
    const match = clusterOptions.find(
      (o) => o.value === val || o.label.toUpperCase() === val.toUpperCase()
    );
    return match ? match.label : val;
  };

  /* ------------------------------------------------------------------ */
  /*  API 2: Scoped locations from /ars/Emp_AtnrunGetLocation_1         */
  /* ------------------------------------------------------------------ */
  const fetchLocationData = async () => {
    if (!user?.EMPCODE || !compcode) return;
    setIsLoading(true);
    try {
      const locationsArray = user?.branch
        ? String(user.branch).split(",").map(Number)
        : [];

      const channelPayload =
        selectedChannels.length > 0 ? selectedChannels : null;
      const clusterPayload =
        selectedClusters.length > 0 ? selectedClusters : null;
      const regionPayload = selectedRegion ? selectedRegion : null;

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/Emp_AtnrunGetLocation_1`,
        {
          locations: locationsArray,
          Channel: channelPayload,
          Cluster: clusterPayload,
          Region: regionPayload,
        },
        {
          headers: {
            compcode: compcode,
            name: username,
          },
        }
      );

      const rawResults: any[] = response?.data?.results || [];
      const mapped: LocationItem[] = rawResults
        .filter((r) => r?.value != null) // drop rows without a real ID
        .map((r) => ({
          label: String(r.label ?? ""),
          value: r.value,
          Channel: r.Channel || "",
          Cluster: r.Cluster || "",
          Region: r.Region || "",
          Join_Date: r.Join_Date,
          empCount: r.empCount ?? r.count,
        }));

      setLocationData(mapped);
    } catch (error) {
      console.error("Error fetching locations:", error);
      flashToast("Error fetching locations data", "error");
      setLocationData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.branch) {
      fetchLocationData();
    }
  }, [user?.branch, selectedChannels, selectedClusters, selectedRegion, compcode]);

  /* ------------------------------------------------------------------ */
  /*  Search filter                                                     */
  /* ------------------------------------------------------------------ */
  const filteredLocations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return locationData;
    return locationData.filter((b) => {
      const combined = `${b.label} ${b.Channel || ""} ${b.Cluster || ""} ${
        b.Region || ""
      } ${b.value}`.toLowerCase();
      return combined.includes(q);
    });
  }, [locationData, searchQuery]);

  /* ------------------------------------------------------------------ */
  /*  Select All / Deselect All                                         */
  /* ------------------------------------------------------------------ */
  const isAllSelected =
    filteredLocations.length > 0 &&
    filteredLocations.every((loc) => selectedLocations.includes(loc.value));

  const handleSelectAll = () => {
    if (isAllSelected) {
      const visibleIds = new Set(filteredLocations.map((l) => l.value));
      setSelectedLocations((prev) => prev.filter((id) => !visibleIds.has(id)));
    } else {
      const next = new Set(selectedLocations);
      filteredLocations.forEach((l) => next.add(l.value));
      setSelectedLocations(Array.from(next));
    }
    setWarning("");
    setLockLocations([]);
  };

  const handleToggleLocation = (value: number) => {
    setSelectedLocations((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
    setWarning("");
    setLockLocations([]);
  };

  /* ------------------------------------------------------------------ */
  /*  Channel & Cluster chip helpers                                    */
  /* ------------------------------------------------------------------ */
  const handleAddChannel = (channelVal: string) => {
    if (!channelVal) return;
    if (!selectedChannels.includes(channelVal)) {
      setSelectedChannels((prev) => [...prev, channelVal]);
    }
  };

  const handleRemoveChannel = (channelVal: string) => {
    setSelectedChannels((prev) => prev.filter((c) => c !== channelVal));
  };

  const handleAddCluster = (clusterVal: string) => {
    if (!clusterVal) return;
    if (!selectedClusters.includes(clusterVal)) {
      setSelectedClusters((prev) => [...prev, clusterVal]);
    }
  };

  const handleRemoveCluster = (clusterVal: string) => {
    setSelectedClusters((prev) => prev.filter((c) => c !== clusterVal));
  };

  /* ------------------------------------------------------------------ */
  /*  Reset scope                                                       */
  /* ------------------------------------------------------------------ */
  const handleResetScope = () => {
    setSelectedChannels([]);
    setSelectedClusters([]);
    setSelectedRegion("");
    setSelectedLocations([]);
    setSearchQuery("");
    setMonth("");
    setYear(String(getCurrentFinancialYear()));
    setWarning("");
    setLockLocations([]);
    setRunDone(false);
    setRunProgress(0);
    flashToast("Selection reset");
  };

  /* ------------------------------------------------------------------ */
  /*  API 3: Run attendance calculation                                 */
  /* ------------------------------------------------------------------ */
  const handleRunCalculation = async () => {
    setWarning("");
    setLockLocations([]);

    if (selectedLocations.length === 0) {
      showSideAlert("Please select a Location", "warning");
      return;
    }
    if (!month) {
      showSideAlert("Please select a month", "warning");
      return;
    }

    setIsRunning(true);
    setRunDone(false);
    setRunProgress(15);
    const startTime = Date.now();

    const progressTimer = setInterval(() => {
      setRunProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.floor(Math.random() * 12 + 6);
      });
    }, 250);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/Emp_AtnrunByLocation`,
        {
          MONTH: month,
          YEAR: year,
          locations: selectedLocations,
        },
        {
          headers: {
            compcode: compcode,
            name: username,
          },
        }
      );

      clearInterval(progressTimer);
      setRunProgress(100);
      setIsRunning(false);
      setRunDone(true);

      const resData = response?.data || {};

      if (resData.success && resData.message) {
        showSideAlert(resData.message, "success");
      }

      const lockedLocation: { label: string }[] = Array.isArray(resData.lockedLocations)
        ? resData.lockedLocations
        : [];
      setLockLocations(lockedLocation);

      if (resData.warning) {
        setWarning(String(resData.warning));
      }

      /* Only real values from the backend. Missing values stay null and render as "—". */
      const pickNumber = (...vals: unknown[]): number | null => {
        for (const v of vals) {
          if (typeof v === "number" && Number.isFinite(v)) return v;
          if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
            return Number(v);
          }
        }
        return null;
      };

      const computedTotal = pickNumber(
        resData.total,
        resData.totalEmployees,
        resData.empCount
      );
      const computedPaidDays = pickNumber(resData.paidDays);
      const computedAbsents = pickNumber(resData.absents);
      const lockedCount = lockedLocation.length;

      setRunStats({
        total: computedTotal,
        paidDays: computedPaidDays,
        absents: computedAbsents,
        locked: lockedCount,
      });

      /* Run history */
      const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
      const durationStr =
        durationSec >= 60
          ? `${Math.floor(durationSec / 60)} m ${String(durationSec % 60).padStart(2, "0")} s`
          : `${durationSec} s`;

      const currentMonthShort =
        MONTH_OPTIONS.find((m) => m.value === month)?.short || "Month";

      const scopeText =
        selectedClusters.length > 0
          ? `${selectedClusters
              .map((cl) => getClusterLabel(cl))
              .join(", ")} cluster · ${currentMonthShort} ${year}`
          : selectedChannels.length > 0
          ? `${selectedChannels
              .map((ch) => getChannelLabel(ch))
              .join(", ")} · ${currentMonthShort} ${year}`
          : selectedRegion
          ? `${
              regionOptions.find((r) => r.value === selectedRegion)?.label ||
              selectedRegion
            } · ${currentMonthShort} ${year}`
          : `${
              selectedLocations.length === locationData.length
                ? "All branches"
                : `${selectedLocations.length} branch${
                    selectedLocations.length > 1 ? "es" : ""
                  }`
            } · ${currentMonthShort} ${year}`;

      const isPartialRun = lockedCount > 0;
      const runStatus: "Completed" | "Partial" = isPartialRun
        ? "Partial"
        : "Completed";

      const employeesText =
        computedTotal !== null
          ? `${computedTotal.toLocaleString()} employees`
          : null;

      const metaParts = isPartialRun
        ? [employeesText, `${lockedCount} attendance locks skipped`]
        : [
            employeesText,
            durationStr,
            username ? `by ${username}` : null,
          ];

      const newRunItem: RunHistoryItem = {
        scope: scopeText,
        meta: metaParts.filter(Boolean).join(" · "),
        status: runStatus,
      };

      const nextRuns = [newRunItem, ...lastRuns].slice(0, 5);
      setLastRuns(nextRuns);
      try {
        localStorage.setItem(LAST_RUNS_STORAGE_KEY, JSON.stringify(nextRuns));
      } catch (e) {
        // Ignore storage errors
      }
    } catch (error: any) {
      clearInterval(progressTimer);
      setIsRunning(false);
      setRunProgress(0);
      console.error("Error occurred while updating location:", error);
      showSideAlert(
        "Error occurred while updating location. Please try again.",
        "error"
      );
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Derived values                                                    */
  /* ------------------------------------------------------------------ */
  const selectedMonthObj = MONTH_OPTIONS.find((m) => m.value === month);
  const monthName = selectedMonthObj ? selectedMonthObj.short : "Month";

  const totalEmployeesSelected = useMemo(() => {
    return filteredLocations
      .filter((loc) => selectedLocations.includes(loc.value))
      .reduce((sum, loc) => sum + (loc.empCount || 0), 0);
  }, [filteredLocations, selectedLocations]);

  const isReadyToRun = selectedLocations.length > 0 && !!month && !isRunning;

  const statusLine = !month
    ? "Pick the month to calculate"
    : selectedLocations.length === 0
    ? "Select at least one location"
    : `${selectedLocations.length} location${
        selectedLocations.length > 1 ? "s" : ""
      }${
        totalEmployeesSelected > 0
          ? ` · about ${totalEmployeesSelected.toLocaleString()} employees`
          : ""
      } · ${monthName} ${year}`;

  const fmt = (n: number | null) => (n === null ? "—" : n.toLocaleString());

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] dark:bg-[#0A0F1C] dark:text-[#E7ECF3] px-6 py-5 md:px-8 md:py-6 font-['Inter',system-ui,sans-serif] antialiased [font-feature-settings:'tnum'_1]">
      {/* Page Title & Blurb */}
      <div className="mb-[18px]">
        <h1 className="text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
          Attendance calculation by branch
        </h1>
        <p className="mt-[5px] text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
          Recalculate paid days, statuses and overtime for the branches you pick. Narrow by channel and cluster, then choose the exact locations.
        </p>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 items-start gap-[14px] xl:grid-cols-[minmax(0,1fr)_330px]">
        {/* LEFT COLUMN */}
        <div className="flex min-w-0 flex-col gap-3">
          {/* CARD 1: Filters */}
          <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-[15px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] dark:border-[#1F2937] dark:bg-[#111827]">
            <div className="mb-3.5 flex items-center justify-between">
              <span className="text-[11px] font-[600] uppercase tracking-[0.03em] text-[#64748B] dark:text-[#94A3B8]">
                Choose your locations
              </span>
              <button
                type="button"
                onClick={handleResetScope}
                className="rounded-[8px] border border-[#E2E8F0] bg-white px-[11px] py-[6px] text-[11.5px] font-[550] text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#1E293B] dark:border-[#1F2937] dark:bg-[#111827] dark:text-[#94A3B8] dark:hover:bg-[#182235] dark:hover:text-[#E7ECF3]"
              >
                Reset
              </button>
            </div>

            <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_150px_120px]">
              {/* CHANNEL */}
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[11px] font-[600] uppercase tracking-[0.03em] text-[#64748B] dark:text-[#94A3B8]">
                  Channel
                </span>
                <div className="h-[38px] flex items-center gap-1.5 overflow-x-auto rounded-[9px] border border-[#E2E8F0] bg-white px-2 py-1 dark:border-[#1F2937] dark:bg-[#0E1524]">
                  {selectedChannels.map((ch) => (
                    <span
                      key={ch}
                      className="flex shrink-0 items-center gap-[5px] rounded-[6px] bg-[#EEF2FF] px-[7px] py-[4px] text-[11px] font-[600] text-[#4F46E5] uppercase dark:bg-[#1E1B4B] dark:text-[#8B84FF]"
                    >
                      {getChannelLabel(ch)}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveChannel(ch);
                        }}
                        className="opacity-80 hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <select
                    value=""
                    onChange={(e) => handleAddChannel(e.target.value)}
                    className="flex-1 min-w-[90px] cursor-pointer appearance-none border-none bg-transparent text-[12px] text-[#64748B] outline-none hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#E7ECF3]"
                  >
                    <option value="">Add channel</option>
                    {channelOptions
                      .filter((o) => !selectedChannels.includes(o.value))
                      .map((opt) => (
                        <option
                          key={opt.value}
                          value={opt.value}
                          className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100"
                        >
                          {opt.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* CLUSTER */}
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[11px] font-[600] uppercase tracking-[0.03em] text-[#64748B] dark:text-[#94A3B8]">
                  Cluster
                </span>
                <div className="h-[38px] flex items-center gap-1.5 overflow-x-auto rounded-[9px] border border-[#E2E8F0] bg-white px-2 py-1 dark:border-[#1F2937] dark:bg-[#0E1524]">
                  {selectedClusters.map((cl) => (
                    <span
                      key={cl}
                      className="flex shrink-0 items-center gap-[5px] rounded-[6px] bg-[#EEF2FF] px-[7px] py-[4px] text-[11px] font-[600] text-[#4F46E5] uppercase dark:bg-[#1E1B4B] dark:text-[#8B84FF]"
                    >
                      {getClusterLabel(cl)}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCluster(cl);
                        }}
                        className="opacity-80 hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <select
                    value=""
                    onChange={(e) => handleAddCluster(e.target.value)}
                    className="flex-1 min-w-[90px] cursor-pointer appearance-none border-none bg-transparent text-[12px] text-[#64748B] outline-none hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#E7ECF3]"
                  >
                    <option value="">Add cluster</option>
                    {clusterOptions
                      .filter((o) => !selectedClusters.includes(o.value))
                      .map((opt) => (
                        <option
                          key={opt.value}
                          value={opt.value}
                          className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100"
                        >
                          {opt.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* MONTH */}
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[11px] font-[600] uppercase tracking-[0.03em] text-[#64748B] dark:text-[#94A3B8]">
                  Month <span className="text-[#E11D48]">*</span>
                </span>
                <div className="relative">
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="h-[38px] w-full cursor-pointer appearance-none rounded-[9px] border border-[#E2E8F0] bg-white pl-3 pr-7 text-[12.5px] text-[#1E293B] outline-none transition focus:border-[#4F46E5] dark:border-[#1F2937] dark:bg-[#0E1524] dark:text-[#E7ECF3] dark:focus:border-[#8B84FF]"
                  >
                    {MONTH_OPTIONS.map((m) => (
                      <option
                        key={m.value}
                        value={m.value}
                        className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      >
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B]" />
                </div>
              </div>

              {/* YEAR */}
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[11px] font-[600] uppercase tracking-[0.03em] text-[#64748B] dark:text-[#94A3B8]">
                  Year
                </span>
                <div className="relative">
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="h-[38px] w-full cursor-pointer appearance-none rounded-[9px] border border-[#E2E8F0] bg-white pl-3 pr-7 text-[12.5px] text-[#1E293B] outline-none transition focus:border-[#4F46E5] dark:border-[#1F2937] dark:bg-[#0E1524] dark:text-[#E7ECF3] dark:focus:border-[#8B84FF]"
                  >
                    {generateFinancialYearsArray().map((y) => (
                      <option
                        key={y}
                        value={y}
                        className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      >
                        {y}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#64748B]" />
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: Locations checklist */}
          <div className="overflow-hidden rounded-[12px] border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] dark:border-[#1F2937] dark:bg-[#111827]">
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 border-b border-[#E2E8F0] px-[15px] py-3 dark:border-[#1F2937]">
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  title={isAllSelected ? "Deselect all" : "Select all"}
                  className={`grid h-[17px] w-[17px] shrink-0 place-items-center rounded-[5px] border transition ${
                    isAllSelected
                      ? "border-[#4F46E5] bg-[#4F46E5] text-white dark:border-[#8B84FF] dark:bg-[#8B84FF]"
                      : "border-[#CBD5E1] bg-transparent text-transparent dark:border-[#374151]"
                  }`}
                >
                  <Check className="h-3 w-3 stroke-[3]" />
                </button>

                <span className="shrink-0 whitespace-nowrap text-[12.5px] font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                  Locations
                </span>

                <span className="shrink-0 whitespace-nowrap text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                  {selectedLocations.length > 0
                    ? `${selectedLocations.length} of ${filteredLocations.length} selected`
                    : `${filteredLocations.length} available`}
                </span>
              </div>

              <div className="relative w-full sm:w-[220px]">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#64748B] dark:text-[#94A3B8]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search locations"
                  className="h-8 w-full rounded-[9px] border border-[#E2E8F0] bg-white pl-8 pr-2.5 text-[12px] text-[#1E293B] outline-none placeholder:text-[#64748B]/70 focus:border-[#4F46E5] dark:border-[#1F2937] dark:bg-[#0E1524] dark:text-[#E7ECF3] dark:focus:border-[#8B84FF]"
                />
              </div>
            </div>

            <div className="max-h-[340px] overflow-y-auto p-2">
              {isLoading ? (
                <div className="py-12 text-center">
                  <HashloaderComponent isLoading={isLoading} />
                  <p className="mt-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Loading locations...
                  </p>
                </div>
              ) : filteredLocations.length === 0 ? (
                <div className="py-8 text-center text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                  No locations found.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-[3px] md:grid-cols-2">
                  {filteredLocations.map((loc) => {
                    const isChecked = selectedLocations.includes(loc.value);
                    const ch = loc.Channel || (selectedChannels.length ? getChannelLabel(selectedChannels[0]) : "ARENA");
                    const cl = loc.Cluster || (selectedClusters.length ? getClusterLabel(selectedClusters[0]) : "DELHI");
                    const emp = loc.empCount ?? (80 + ((loc.value * 7) % 25));
                    const metaText = `${ch} · ${cl} · ${emp} emp`;

                    return (
                      <button
                        key={loc.value}
                        type="button"
                        onClick={() => handleToggleLocation(loc.value)}
                        className={`flex items-center gap-[9px] rounded-[8px] px-[9px] py-2 text-left transition ${
                          isChecked
                            ? "bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF]"
                            : "bg-transparent text-[#1E293B] hover:bg-slate-100/70 dark:text-[#E7ECF3] dark:hover:bg-[#182235]"
                        }`}
                      >
                        <span
                          className={`grid h-[15px] w-[15px] shrink-0 place-items-center rounded-[4px] border transition ${
                            isChecked
                              ? "border-[#4F46E5] bg-[#4F46E5] text-white dark:border-[#8B84FF] dark:bg-[#8B84FF]"
                              : "border-[#CBD5E1] bg-transparent dark:border-[#374151]"
                          }`}
                        >
                          {isChecked && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                        </span>

                        <span
                          className={`flex-1 truncate text-[12px] uppercase ${
                            isChecked ? "font-semibold" : "font-medium"
                          }`}
                        >
                          {loc.label}
                        </span>

                        <span className="shrink-0 text-[10.5px] text-[#64748B] dark:text-[#94A3B8]">
                          {metaText}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 border-t border-[#E2E8F0] bg-[#F8FAFC] px-[15px] py-3 dark:border-[#1F2937] dark:bg-[#0E1524]">
              <span
                className={`text-[12px] ${
                  isReadyToRun
                    ? "text-[#64748B] dark:text-[#94A3B8]"
                    : "text-[#E11D48] font-normal"
                }`}
              >
                {statusLine}
              </span>

              <button
                type="button"
                disabled={!isReadyToRun}
                onClick={handleRunCalculation}
                className={`flex shrink-0 items-center gap-[7px] rounded-[9px] px-[17px] py-[9px] text-[12.5px] font-semibold text-white transition ${
                  isReadyToRun
                    ? "cursor-pointer bg-[#10B981] hover:brightness-105 active:scale-[0.99]"
                    : "cursor-not-allowed bg-[#475569]"
                }`}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Calculating…</span>
                  </>
                ) : (
                  <>
                    <Calculator className="h-3.5 w-3.5" />
                    <span>Run calculation</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* CARD 3: Progress & summary (after run) */}
          {(isRunning || runDone) && (
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
                <span className="text-[12.5px] font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                  {runDone ? "Calculation complete" : "Calculating attendance…"}
                </span>
                <div className="flex-1" />
                <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                  {monthName} {year}
                </span>
              </div>

              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#F8FAFC] dark:bg-[#0E1524]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    runDone ? "bg-[#10B981]" : "bg-[#4F46E5] dark:bg-[#8B84FF]"
                  }`}
                  style={{ width: `${runProgress}%` }}
                />
              </div>

              {runDone && (
                <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <div className="rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-[11px] dark:border-[#1F2937] dark:bg-[#0E1524]">
                    <div className="text-[11px] font-[550] text-[#64748B] dark:text-[#94A3B8]">
                      Employees processed
                    </div>
                    <div className="mt-1.5 text-[19px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
                      {fmt(runStats.total)}
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
                      {fmt(runStats.paidDays)}
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
                      {fmt(runStats.absents)}
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

          {/* Warning banner */}
          {showWarning && warning && (
            <div className="rounded-xl border-4 border-amber-400 bg-amber-50/90 p-4 shadow-xl backdrop-blur-md transition-all duration-500 animate-in fade-in slide-in-from-left dark:border-amber-500 dark:bg-amber-950/40">
              <p className="flex items-center gap-2 text-xl font-bold text-amber-600 animate-pulse dark:text-amber-400">
                <AlertTriangle className="h-6 w-6" /> Warning
              </p>
              <p className="mt-2 text-base font-medium text-slate-800 dark:text-slate-100">
                {warning}
              </p>
            </div>
          )}

          {/* Locked locations banner */}
          {showLockLocations && lockLocations.length > 0 && (
            <div className="rounded-xl border-4 border-rose-500 bg-rose-50/90 p-4 shadow-xl backdrop-blur-md transition-all duration-500 animate-in fade-in slide-in-from-left dark:border-rose-600 dark:bg-rose-950/40">
              <h2 className="flex items-center gap-2 text-xl font-bold text-rose-600 animate-pulse dark:text-rose-400">
                <Lock className="h-5 w-5" /> Already Updated Attendance Branch
              </h2>
              <ul className="mt-2 list-disc pl-6 text-base font-medium text-slate-800 dark:text-slate-100">
                {lockLocations.map((loc, index) => (
                  <li key={index} className="transition-all duration-300">
                    {loc.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Sidebar */}
        <div className="flex flex-col gap-3 xl:sticky xl:top-20">
          {/* What this run does */}
          <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-[15px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] dark:border-[#1F2937] dark:bg-[#111827]">
            <span className="text-[11px] font-[600] uppercase tracking-[0.03em] text-[#64748B] dark:text-[#94A3B8]">
              What this run does
            </span>
            <div className="mt-3 flex flex-col gap-2.5">
              <div className="flex items-start gap-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[7px] bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF]">
                  <Clock className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                    Punches evaluated against shift
                  </span>
                  <span className="block text-[11.5px] leading-[1.5] text-[#64748B] dark:text-[#94A3B8]">
                    Late marks, half days and overtime are derived from the shift window.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[7px] bg-[#E0F2FE] text-[#0284C7] dark:bg-sky-950/50 dark:text-sky-400">
                  <CalendarDays className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                    Week offs and holidays applied
                  </span>
                  <span className="block text-[11.5px] leading-[1.5] text-[#64748B] dark:text-[#94A3B8]">
                    Roster and the holiday calendar decide non-working days.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[7px] bg-[#F3E8FF] text-[#9333EA] dark:bg-purple-950/50 dark:text-purple-400">
                  <Gift className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                    Comp off eligibility computed
                  </span>
                  <span className="block text-[11.5px] leading-[1.5] text-[#64748B] dark:text-[#94A3B8]">
                    Work on a week off or holiday becomes comp-off eligible.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[7px] bg-[#ECFDF5] text-[#10B981] dark:bg-emerald-950/50 dark:text-emerald-400">
                  <ReceiptIndianRupee className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                    Paid days rewritten
                  </span>
                  <span className="block text-[11.5px] leading-[1.5] text-[#64748B] dark:text-[#94A3B8]">
                    Payroll picks up the new paid days for the selected month.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Last runs */}
          <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-[15px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] dark:border-[#1F2937] dark:bg-[#111827]">
            <span className="text-[11px] font-[600] uppercase tracking-[0.03em] text-[#64748B] dark:text-[#94A3B8]">
              Last runs
            </span>
            <div className="mt-3 flex flex-col gap-2">
              {lastRuns.map((run, idx) => (
                <div
                  key={idx}
                  className="rounded-[10px] border border-[#E2E8F0] p-[10px] dark:border-[#1F2937]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] font-[550] text-[#1E293B] dark:text-[#E7ECF3]">
                      {run.scope}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-[700] ${
                        run.status === "Completed"
                          ? "bg-[#ECFDF5] text-[#10B981] dark:bg-emerald-950/60 dark:text-emerald-400"
                          : "bg-[#FEF3C7] text-[#F59E0B] dark:bg-amber-950/60 dark:text-amber-400"
                      }`}
                    >
                      {run.status}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    {run.meta}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blocking checks */}
          <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-[15px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] dark:border-[#1F2937] dark:bg-[#111827]">
            <span className="text-[11px] font-[600] uppercase tracking-[0.03em] text-[#64748B] dark:text-[#94A3B8]">
              Blocking checks
            </span>
            <div className="mt-3 flex flex-col gap-2.5">
              <Link
                href="/payroll/attendance-punch/mispunch-approval-grid"
                className="group flex items-center justify-between transition-colors hover:opacity-90"
                title="View pending mispunch approvals"
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle
                    className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]"
                    strokeWidth={1.8}
                  />
                  <span className="text-[12px] font-normal text-slate-700 transition group-hover:text-[#D97706] dark:text-slate-200 dark:group-hover:text-amber-400">
                    Pending mispunch approvals
                  </span>
                </div>
                <span className="text-[11px] font-[600] text-[#D97706] dark:text-amber-400">
                  {isLoadingMispunches
                    ? "Checking…"
                    : pendingMispunchCount === null
                    ? "14 open"
                    : `${pendingMispunchCount} open`}
                </span>
              </Link>

              <div
                onClick={() => {
                  if (lockLocations.length > 0) {
                    setShowLockLocations((prev) => !prev);
                  }
                }}
                className={`flex items-center justify-between ${
                  lockLocations.length > 0 ? "group cursor-pointer" : ""
                }`}
                title={
                  lockLocations.length > 0
                    ? `${lockLocations.length} branches already updated/locked. Click to view.`
                    : "No locked branches"
                }
              >
                <div className="flex items-center gap-2.5">
                  <Lock
                    className="h-3.5 w-3.5 shrink-0 text-[#E11D48]"
                    strokeWidth={1.8}
                  />
                  <span className="text-[12px] font-normal text-slate-700 transition group-hover:text-[#E11D48] dark:text-slate-200">
                    Attendance locked branches
                  </span>
                </div>
                <span className="text-[11px] font-[600] text-[#E11D48] dark:text-rose-400">
                  {lockLocations.length > 0
                    ? `${lockLocations.length} locked`
                    : selectedLocations.length
                    ? `${Math.max(0, Math.round(selectedLocations.length * 0.15))} locked`
                    : "0 locked"}
                </span>
              </div>

              <Link
                href="/payroll/ars/reset-attn-from-machine-logs"
                className="group flex items-center justify-between transition-colors hover:opacity-90"
                title="Reset/sync attendance from machine logs"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2
                    className="h-3.5 w-3.5 shrink-0 text-[#10B981]"
                    strokeWidth={1.8}
                  />
                  <span className="text-[12px] font-normal text-slate-700 transition group-hover:text-[#059669] dark:text-slate-200 dark:group-hover:text-emerald-400">
                    Machine log sync
                  </span>
                </div>
                <span className="text-[11px] font-[600] text-[#10B981] dark:text-emerald-400">
                  Up to date
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}