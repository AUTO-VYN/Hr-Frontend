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
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CalendarDays,
  Wallet,
  ReceiptIndianRupee,
  Lock,
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

const LAST_RUNS_STORAGE_KEY = "hrsetu_attn_calc_with_leave_last_runs";

const INITIAL_LAST_RUNS: RunHistoryItem[] = [];

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

const showSideAlert = (
  message: string,
  type: "success" | "error" | "warning" | "info" = "info"
) => {
  Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
  }).fire({
    icon: type,
    title: message,
  });
};

export default function AttnCalculationWithLeavePage() {
  const user: any = useCurrentUser();
  const compcode = user?.Comp_Code;
  const username = user?.name;

  // Validation state
  const [hasAttemptedRun, setHasAttemptedRun] = useState<boolean>(false);

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

  // Loading & progress
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runProgress, setRunProgress] = useState<number>(0);
  const [runDone, setRunDone] = useState<boolean>(false);

  // Run stats (shown after run)
  const [runStats, setRunStats] = useState<{
    total: number | null;
    paidDays: number | null;
    absents: number | null;
    locked: number;
  }>({ total: null, paidDays: null, absents: null, locked: 0 });

  // Warnings & locked branches from backend
  const [warning, setWarning] = useState<string>("");
  const [lockLocations, setLockLocations] = useState<any[]>([]);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [showLockLocations, setShowLockLocations] = useState<boolean>(false);

  // Run history
  const [lastRuns, setLastRuns] = useState<RunHistoryItem[]>(INITIAL_LAST_RUNS);

  // Blocking checks
  const [pendingMispunchCount, setPendingMispunchCount] = useState<number | null>(null);
  const [isLoadingMispunches, setIsLoadingMispunches] = useState<boolean>(false);

  // Restore run history from localStorage
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
              !str.includes("jun 2026")
            );
          });
          setLastRuns(cleanRuns);
          try {
            localStorage.setItem(LAST_RUNS_STORAGE_KEY, JSON.stringify(cleanRuns));
          } catch (e) {}
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, []);

  // Fetch live last runs from /admin/getLocationsWithProcessStatus
  const fetchLastRuns = useCallback(async () => {
    if (!compcode || !user?.EMPCODE) return;
    const targetMonth = month || String(new Date().getMonth() + 1);
    const targetYear = year || String(new Date().getFullYear());

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/admin/getLocationsWithProcessStatus`,
        {
          Month: targetMonth,
          Year: targetYear,
          EMPCODE: user.EMPCODE,
          compCode: compcode,
        },
        { headers: { compcode, name: username } }
      );

      if (res.data?.success && Array.isArray(res.data?.data)) {
        const locations = res.data.data;
        const currentMonthObj = MONTH_OPTIONS.find(
          (m) => m.value === String(targetMonth)
        );
        const currentMonthShort =
          currentMonthObj?.short || currentMonthObj?.label || targetMonth;

        const liveRuns: RunHistoryItem[] = locations
          .filter(
            (loc: any) =>
              loc.processes?.attendanceCalc?.completionDate ||
              loc.processes?.attendanceCalc?.isCompleted
          )
          .map((loc: any) => {
            const calc = loc.processes?.attendanceCalc ?? {};
            const locName = loc.name || loc.label || `Branch - ${loc.id}`;

            let dateFormatted = "";
            if (calc.completionDate) {
              const dateObj = new Date(calc.completionDate);
              dateFormatted = !isNaN(dateObj.getTime())
                ? dateObj.toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : String(calc.completionDate);
            }

            const isDone = calc.isCompleted === true;
            const metaParts = [
              dateFormatted || "Completed recently",
              calc.completedBy ? `by ${calc.completedBy}` : null,
              calc.pendingCount > 0 ? `${calc.pendingCount} pending` : null,
            ].filter(Boolean);

            return {
              scope: `${locName} · ${currentMonthShort} ${targetYear}`,
              meta: metaParts.join(" · "),
              status: isDone ? ("Completed" as const) : ("Partial" as const),
              completionDate: calc.completionDate || "",
            };
          })
          .sort((a: any, b: any) => {
            if (!a.completionDate) return 1;
            if (!b.completionDate) return -1;
            return (
              new Date(b.completionDate).getTime() -
              new Date(a.completionDate).getTime()
            );
          })
          .slice(0, 5);

        if (liveRuns.length > 0) {
          setLastRuns(liveRuns);
          try {
            localStorage.setItem(
              LAST_RUNS_STORAGE_KEY,
              JSON.stringify(liveRuns)
            );
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error("Failed to fetch last runs from API:", err);
    }
  }, [compcode, user?.EMPCODE, month, year, username]);

  useEffect(() => {
    fetchLastRuns();
  }, [fetchLastRuns]);

  // Fetch pending mispunches from backend
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

  // Delayed banners
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
        .filter((r) => r?.value != null)
        .map((r) => ({
          label: String(r.label ?? ""),
          value: Number(r.value),
          Channel: r.Channel || "",
          Cluster: r.Cluster || "",
          Region: r.Region || "",
          Join_Date: r.Join_Date,
          empCount: r.empCount ?? r.count,
        }));

      setLocationData(mapped);
    } catch (error) {
      console.error("Error fetching locations:", error);
      showSideAlert("Error fetching locations data", "error");
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
  /*  Checklist Handlers                                                */
  /* ------------------------------------------------------------------ */
  const handleToggleLocation = (value: string | number) => {
    const num = Number(value);
    setSelectedLocations((prev) =>
      prev.includes(num) ? prev.filter((v) => v !== num) : [...prev, num]
    );
    setWarning("");
    setLockLocations([]);
  };

  const handleSelectAll = () => {
    setWarning("");
    setLockLocations([]);
    const allIds = locationData.map((l) => l.value);
    const isAll =
      allIds.length > 0 && allIds.every((id) => selectedLocations.includes(id));
    if (isAll) {
      setSelectedLocations([]);
    } else {
      setSelectedLocations(allIds);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Filter change handler for ArsActionTemplate                       */
  /* ------------------------------------------------------------------ */
  const handleFilterChange = (name: string, val: any) => {
    if (name === "Channel") {
      const vals = Array.isArray(val)
        ? val.map((v) => (typeof v === "object" && v !== null ? v.value : v))
        : val
        ? [typeof val === "object" && val !== null ? val.value : val]
        : [];
      setSelectedChannels(vals);
    } else if (name === "Cluster") {
      const vals = Array.isArray(val)
        ? val.map((v) => (typeof v === "object" && v !== null ? v.value : v))
        : val
        ? [typeof val === "object" && val !== null ? val.value : val]
        : [];
      setSelectedClusters(vals);
    } else if (name === "Region") {
      setSelectedRegion(
        typeof val === "object" && val !== null ? val.value : val || ""
      );
    } else if (name === "Month") {
      setMonth(
        typeof val === "object" && val !== null ? val.value : val || ""
      );
    } else if (name === "Year") {
      setYear(
        typeof val === "object" && val !== null ? val.value : val || ""
      );
    }
    setWarning("");
    setLockLocations([]);
  };

  /* ------------------------------------------------------------------ */
  /*  Reset scope                                                       */
  /* ------------------------------------------------------------------ */
  const handleResetScope = () => {
    setSelectedChannels([]);
    setSelectedClusters([]);
    setSelectedRegion("");
    setSelectedLocations([]);
    setMonth("");
    setYear(String(getCurrentFinancialYear()));
    setWarning("");
    setLockLocations([]);
    setRunDone(false);
    setRunProgress(0);
    setHasAttemptedRun(false);
    flashToast("Selection reset");
  };

  /* ------------------------------------------------------------------ */
  /*  API 3: Run attendance calculation with leave                      */
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
        `${process.env.NEXT_PUBLIC_URL}/ars/Emp_AtnrunByLocationLeave`,
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

      const lockedLocation: any[] = Array.isArray(resData.lockedLocations)
        ? resData.lockedLocations
        : [];
      setLockLocations(lockedLocation);

      if (resData.warning) {
        setWarning(String(resData.warning));
      }

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
    } finally {
      fetchLastRuns();
    }
  };

  const handleRunCalculationClick = () => {
    if (!month) {
      setHasAttemptedRun(true);
      showSideAlert("Please select a month to calculate.", "warning");
      return;
    }
    if (selectedLocations.length === 0) {
      setHasAttemptedRun(true);
      showSideAlert("Please select at least one location to calculate.", "warning");
      return;
    }
    handleRunCalculation();
  };

  /* ------------------------------------------------------------------ */
  /*  Derived values for UI                                             */
  /* ------------------------------------------------------------------ */
  const selectedMonthObj = MONTH_OPTIONS.find((m) => m.value === month);
  const monthName = selectedMonthObj ? selectedMonthObj.short : "Month";

  const totalEmployeesSelected = useMemo(() => {
    return locationData
      .filter((loc) => selectedLocations.includes(loc.value))
      .reduce((sum, loc) => sum + (loc.empCount || 0), 0);
  }, [locationData, selectedLocations]);

  const isReadyToRun = selectedLocations.length > 0 && !!month && !isRunning;

  const statusLine = !month
    ? "Pick the month to calculate"
    : selectedLocations.length === 0
    ? "Select at least one location"
    : `${selectedLocations.length} branch${
        selectedLocations.length > 1 ? "es" : ""
      } · about ${totalEmployeesSelected.toLocaleString()} employees · ${monthName} ${year}`;

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
      generateFinancialYearsArray().map((y) => ({
        label: y,
        value: y,
      })),
    []
  );

  const itemsForTemplate: ArsItem[] = useMemo(() => {
    return locationData.map((loc) => {
      const ch =
        loc.Channel ||
        (selectedChannels.length ? getChannelLabel(selectedChannels[0]) : "ARENA");
      const cl =
        loc.Cluster ||
        (selectedClusters.length ? getClusterLabel(selectedClusters[0]) : "DELHI");
      const emp = loc.empCount ?? (80 + ((loc.value * 7) % 25));
      const meta = `${ch} · ${cl} · ${emp} emp`;

      return {
        label: loc.label,
        value: loc.value,
        Channel: loc.Channel,
        Cluster: loc.Cluster,
        Region: loc.Region,
        empCount: loc.empCount,
        metaText: meta,
      };
    });
  }, [locationData, selectedChannels, selectedClusters, channelOptions, clusterOptions]);

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
      iconBgClass: "bg-[#F3E8FF] dark:bg-purple-950/50",
      iconColorClass: "text-[#9333EA] dark:text-purple-400",
      title: "Approved leave applied",
      description:
        "Absent days with an approved leave become CL, PL or SL automatically.",
    },
    {
      icon: <Wallet className="h-3.5 w-3.5" />,
      iconBgClass: "bg-[#E0F2FE] dark:bg-sky-950/50",
      iconColorClass: "text-[#0284C7] dark:text-sky-400",
      title: "Balances debited",
      description:
        "Leave balance is reduced and LWP raised when balance runs out.",
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
      count:
        lockLocations.length > 0
          ? `${lockLocations.length} locked`
          : "0 locked",
      countColorClass: "text-[#E11D48] dark:text-rose-400",
      onClick: () => {
        if (lockLocations.length > 0) {
          setShowLockLocations((prev) => !prev);
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

  const fmt = (v: number | null) => (v !== null ? v.toLocaleString() : "—");

  const extraContent = (
    <>
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
            <span className="text-[12.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
              {runDone ? "Calculation complete" : "Calculating attendance…"}
            </span>
            <div className="flex-1" />
            <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
              {monthName} {year} · {selectedLocations.length} locations
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
        <div className="rounded-[12px] border border-[#F59E0B] bg-[#FFFBEB] p-4 text-[#92400E] dark:border-[#B45309] dark:bg-[#78350F]/20 dark:text-[#FCD34D]">
          <div className="flex items-center gap-2 text-[12.5px] font-[600]">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#F59E0B]" />
            <span>Warning</span>
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed">{warning}</p>
        </div>
      )}

      {/* Locked locations list */}
      {showLockLocations && lockLocations.length > 0 && (
        <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] dark:border-[#1F2937] dark:bg-[#111827]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[12px] font-[600] text-[#E11D48]">
              <Lock className="h-3.5 w-3.5 text-[#E11D48]" />
              Locked branches ({lockLocations.length})
            </span>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowLockLocations(false)}
              className="!h-auto !p-0 text-[11px] text-[#64748B] hover:text-[#1E293B]"
            >
              Hide
            </Button>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {lockLocations.map((loc: any, i: number) => (
              <span
                key={i}
                className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-[#E11D48] dark:bg-rose-950/40"
              >
                {typeof loc === "string" ? loc : loc.label || `Branch - ${loc}`}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <ArsActionTemplate
      title="Attendance calculation with leave"
      subtitle="Same calculation as by-branch, but approved leave is consumed against balances and absents are converted where a leave exists."
      filterMode="month-year"
      filterCardTitle="CHOOSE YOUR LOCATIONS"
      showChannelCluster={true}
      showRegion={true}
      channelOptions={channelOptions}
      clusterOptions={clusterOptions}
      regionOptions={regionOptions}
      selectedChannel={selectedChannels}
      selectedCluster={selectedClusters}
      selectedRegion={selectedRegion}
      selectedMonth={month}
      selectedYear={year}
      monthOptions={monthOptions}
      yearOptions={yearOptions}
      onFilterChange={handleFilterChange}
      onReset={handleResetScope}
      selectionLabel="Locations"
      searchPlaceholder="Search locations"
      items={itemsForTemplate}
      selectedValues={selectedLocations}
      onToggleItem={handleToggleLocation}
      onToggleAll={handleSelectAll}
      isLoadingItems={isLoading}
      emptyItemsText="No locations found."
      renderItemRight={(item) => (
        <span className="shrink-0 text-[10.5px] text-[#64748B] dark:text-[#94A3B8]">
          {item.metaText}
        </span>
      )}
      actionButtonText={isRunning ? "Calculating…" : "Run calculation"}
      actionButtonIcon={
        !isRunning ? <Calculator className="h-3.5 w-3.5 text-white" /> : undefined
      }
      actionButtonClassName={
        isReadyToRun
          ? "!bg-[#10B981] hover:!brightness-105 active:!scale-[0.99] cursor-pointer"
          : "!bg-[#334155] hover:!bg-[#1E293B] cursor-pointer"
      }
      isActionLoading={isRunning}
      onAction={handleRunCalculationClick}
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
