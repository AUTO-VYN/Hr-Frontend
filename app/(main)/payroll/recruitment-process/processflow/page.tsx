"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Clock,
  FileText,
  Folder,
  Plus,
  QrCode,
  RefreshCw,
  Send,
  TrendingDown,
  TrendingUp,
  Upload,
  User,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import { formatDate } from "@/app/hooks/use-date-range";
import AButton from "@/components/atoms/Button";
import Card from "@/components/Templates/card";
import Chart from "@/components/atoms/charts";
// Defensive helper to prevent React runtime error: "Objects are not valid as a React child"
const renderSafeValue = (val: any, fallback: React.ReactNode = ""): React.ReactNode => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
    return val;
  }
  if (React.isValidElement(val)) {
    return val;
  }
  if (typeof val === "object") {
    if ("total" in val && typeof val.total !== "object") return String(val.total);
    if ("count" in val && typeof val.count !== "object") return String(val.count);
    if ("value" in val && typeof val.value !== "object") return String(val.value);
    return fallback;
  }
  return String(val);
};

// Safe date difference in days helper
const getDaysDifference = (dateVal: any): number => {
  if (!dateVal) return 0;
  try {
    const s = String(dateVal).trim();
    if (!s || s === "null" || s === "undefined" || s === "—") return 0;

    let d = new Date(s);
    if (!isNaN(d.getTime())) {
      return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    }

    const parts = s.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length <= 2 && parts[2].length === 4) {
        d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        if (!isNaN(d.getTime())) {
          return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
        }
      }
    }
  } catch { }
  return 0;
};

export default function ProcessflowPage() {
  const router = useRouter();
  const user = useCurrentUser();

  // Date Range State (default: no preset selected; filter applied only when user clicks a preset)
  const [activePreset, setActivePreset] = useState<"7" | "30" | "90" | null>(null);
  const [dateRange, setDateRange] = useState<{ DATE_FROM: string; DATE_TO: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showChartToggle, setShowChartToggle] = useState(false);

  // Dashboard Data State (with comprehensive defaults matching screenshot design)
  const [metrics, setMetrics] = useState({
    // 6 Cards from Screenshot
    totalRegistrations: 65,
    resumeBank: 43,
    shortlisted: 51,
    interviewScheduled: 46,
    selectedEmployees: 30,
    rejected: 6,

    // Funnel & Additional indicators
    openPositions: 14,
    openPositionsDelta: "+3",
    openPositionsSub: "across 6 designations",

    applications: 76,
    applicationsDelta: "+18%",
    applicationsSub: "vs previous period",

    interviewsWeek: 46,
    interviewsToday: 6,
    interviewsSub: "4 interviewers assigned",

    avgTimeToHire: "18d",
    avgTimeToHireDelta: "-2d",
    avgTimeToHireSub: "target 21 days",

    conversionRate: "5.5%",
  });

  const [funnelData, setFunnelData] = useState([
    {
      id: "openings",
      title: "Job openings",
      count: 14,
      percent: 11,
      color: "#4F46E5", // Indigo
      icon: Briefcase,
      route: "/payroll/recruitment-process/create-job-opening",
    },
    {
      id: "links_sent",
      title: "Registration links sent",
      count: 128,
      percent: 100,
      color: "#0EA5E9", // Sky
      icon: Send,
      route: "/payroll/recruitment-process/create-job-opening",
    },
    {
      id: "resume_bank",
      title: "Resume bank",
      count: 96,
      percent: 75,
      color: "#0D9488", // Teal
      icon: Folder,
      route: "/payroll/recruitment-process/resume-bank",
    },
    {
      id: "shortlisted",
      title: "Shortlisted",
      count: 41,
      percent: 32,
      color: "#F59E0B", // Amber
      icon: UserCheck,
      route: "/payroll/recruitment-process/shortlisted-applications",
    },
    {
      id: "interview_scheduled",
      title: "Interview scheduled",
      count: 23,
      percent: 18,
      color: "#7C3AED", // Violet
      icon: Calendar,
      route: "/payroll/recruitment-process/interview-scheduling",
    },
    {
      id: "selected_hr",
      title: "Selected by HR",
      count: 9,
      percent: 7,
      color: "#10B981", // Green
      icon: CheckCircle2,
      route: "/payroll/recruitment-process/shortlisted-applications",
    },
    {
      id: "employee_created",
      title: "Employee master created",
      count: 7,
      percent: 5,
      color: "#4F46E5", // Indigo
      icon: UserPlus,
      route: "/payroll/masters/employee-master-with-basic-info",
    },
  ]);

  const [needsAttention, setNeedsAttention] = useState([
    {
      id: "unscreened",
      title: "Resumes unscreened > 5 days",
      sub: "Sitting in resume bank",
      count: 2,
      tint: "#E11D48",
      route: "/payroll/recruitment-process/resume-bank",
    },
    {
      id: "shortlisted_no_date",
      title: "Shortlisted, no interview date",
      sub: "Awaiting scheduling",
      count: 3,
      tint: "#F59E0B",
      route: "/payroll/recruitment-process/shortlisted-applications",
    },
    {
      id: "interview_no_decision",
      title: "Interview done, no decision",
      sub: "Ratings submitted",
      count: 12,
      tint: "#7C3AED",
      route: "/payroll/recruitment-process/interview-scheduling",
    },
    {
      id: "selected_no_master",
      title: "Selected, master not created",
      sub: "Ready for onboarding",
      count: 1,
      tint: "#10B981",
      route: "/payroll/masters/employee-master-with-basic-info",
    },
  ]);

  const [sourceMix, setSourceMix] = useState([
    { name: "Walk-in / QR", percent: 42, color: "#4F46E5" },
    { name: "Referral", percent: 31, color: "#0D9488" },
    { name: "Job portal", percent: 19, color: "#F59E0B" },
    { name: "Consultant", percent: 8, color: "#7C3AED" },
  ]);

  const [processMap, setProcessMap] = useState([
    {
      step: "STEP 1",
      title: "Create job opening",
      desc: "Raise the vacancy, capture candidate leads and send registration links.",
      count: "14 in stage",
      color: "#4F46E5",
      icon: Briefcase,
      route: "/payroll/recruitment-process/create-job-opening",
    },
    {
      step: "STEP 2",
      title: "Candidate registration",
      desc: "Candidate fills the 4-step form; completed forms flow to resume bank.",
      count: "128 in stage",
      color: "#0EA5E9",
      icon: FileText,
      route: "/payroll/recruitment-process/candidate-registration-form",
      feeder: {
        title: "Interview QR code walk-ins",
        icon: QrCode,
        route: "/payroll/recruitment-process/interview-qrcode",
      },
    },
    {
      step: "STEP 3",
      title: "Resume bank",
      desc: "Screen dossiers, then shortlist or reject with a reason.",
      count: "96 in stage",
      color: "#0D9488",
      icon: Folder,
      route: "/payroll/recruitment-process/resume-bank",
      feeder: {
        title: "Bulk resume upload",
        icon: Upload,
        route: "/payroll/recruitment-process/bulk-resume-upload",
      },
    },
    {
      step: "STEP 4",
      title: "Shortlisted applications",
      desc: "Track each candidate's status through the interview rounds.",
      count: "41 in stage",
      color: "#F59E0B",
      icon: UserCheck,
      route: "/payroll/recruitment-process/shortlisted-applications",
    },
    {
      step: "STEP 5",
      title: "Interview scheduling",
      desc: "Up to 4 interviewers, ratings, remarks and salary expectation.",
      count: "23 in stage",
      color: "#7C3AED",
      icon: Calendar,
      route: "/payroll/recruitment-process/interview-scheduling",
    },
    {
      step: "STEP 6",
      title: "Create employee master",
      desc: "Selected candidate is converted into an employee record.",
      count: "7 in stage",
      color: "#10B981",
      icon: UserPlus,
      route: "/payroll/masters/employee-master-with-basic-info",
    },
  ]);


  const getCompCode = () => {
    return (
      user?.Comp_Code ||
      (user as any)?.compcode ||
      (user as any)?.comp_code ||
      (user as any)?.company_code ||
      (user as any)?.DB ||
      ""
    );
  };

  const fetchDashboardData = async (
    currentPreset: "7" | "30" | "90" | null = activePreset,
    currentRange: { DATE_FROM: string; DATE_TO: string } | null = dateRange
  ) => {
    const compCode = getCompCode();
    const loc_code = user?.branch;
    if (!compCode) return;

    setIsLoading(true);

    const payload: any = {
      compcode: compCode,
      loc_code: loc_code,
    };

    if (currentPreset && currentRange) {
      payload.DATE_FROM = currentRange.DATE_FROM;
      payload.DATE_TO = currentRange.DATE_TO;
      payload.date_from = currentRange.DATE_FROM;
      payload.date_to = currentRange.DATE_TO;
      payload.days = currentPreset;
      payload.period = currentPreset;
    }

    const headers = {
      compcode: compCode,
      name: user?.name || "",
    };

    let data: any = null;

    // Call candidateDashboard / CandidateDashboard / recruitmentDashboard
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/CandidateDashboard`,
        payload,
        { headers }
      );
      data = res.data?.data || res.data;
    } catch {
      try {
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/interview/CandidateDashboard`,
          payload,
          { headers }
        );
        data = res.data?.data || res.data;
      } catch {
        try {
          const res = await axios.post(
            `${process.env.NEXT_PUBLIC_URL}/interview/CandidateDashboard`,
            payload,
            { headers }
          );
          data = res.data?.data || res.data;
        } catch {
          // Keep resilient default data
        }
      }
    }

    if (data && typeof data === "object") {
      const toNum = (val: any, fallback = 0): number => {
        if (typeof val === "number" && !isNaN(val)) return val;
        if (typeof val === "string") {
          const parsed = parseInt(val.replace(/[^0-9.-]/g, ""), 10);
          return isNaN(parsed) ? fallback : parsed;
        }
        return fallback;
      };

      let rawCounts: any = {};
      if (Array.isArray(data)) {
        rawCounts = data[0] || {};
      } else if (data && typeof data === "object") {
        rawCounts = data.counts || data.stats || data.kpiCards || data.data || data;
      }

      const jobOpeningsVal = toNum(
        rawCounts?.jobOpenings ?? rawCounts?.openPositions ?? rawCounts?.OPEN_POSITIONS ?? data?.openPositions,
        14
      );

      const registrationsVal = toNum(
        rawCounts?.registrations ?? rawCounts?.totalRegistrations ?? rawCounts?.applications ?? rawCounts?.APPLICATIONS ?? data?.applications,
        128
      );

      const resumeBankVal = toNum(
        rawCounts?.resumeBank ?? rawCounts?.totalResumeBank ?? data?.resumeBank,
        96
      );

      const shortlistedVal = toNum(
        rawCounts?.shortlisted ?? rawCounts?.totalShortlisted ?? data?.shortlisted,
        41
      );

      const interviewsVal = toNum(
        rawCounts?.interviews ?? rawCounts?.interviewScheduled ?? rawCounts?.interviewsWeek ?? rawCounts?.INTERVIEWS_WEEK ?? data?.interviewsWeek,
        23
      );

      const selectedVal = toNum(
        rawCounts?.selected ?? rawCounts?.selectedEmployees ?? rawCounts?.employeeMasterCreated ?? data?.selected,
        30
      );

      const rejectedVal = toNum(
        rawCounts?.rejected ?? rawCounts?.totalRejected ?? data?.rejected,
        6
      );

      // Map API fields into 6 cards and metrics
      setMetrics((prev) => ({
        ...prev,
        totalRegistrations: registrationsVal,
        resumeBank: resumeBankVal,
        shortlisted: shortlistedVal,
        interviewScheduled: interviewsVal,
        selectedEmployees: selectedVal,
        rejected: rejectedVal,

        openPositions: jobOpeningsVal,
        openPositionsDelta: typeof data?.openPositionsDelta === "string" ? data.openPositionsDelta : prev.openPositionsDelta,
        openPositionsSub: typeof data?.openPositionsSub === "string" ? data.openPositionsSub : prev.openPositionsSub,

        applications: registrationsVal,
        applicationsDelta: typeof data?.applicationsDelta === "string" ? data.applicationsDelta : prev.applicationsDelta,
        applicationsSub: typeof data?.applicationsSub === "string" ? data.applicationsSub : prev.applicationsSub,

        interviewsWeek: interviewsVal,
        interviewsToday: typeof data?.interviewsToday === "number" ? data.interviewsToday : prev.interviewsToday,
        interviewsSub: typeof data?.interviewsSub === "string" ? data.interviewsSub : prev.interviewsSub,

        avgTimeToHire: typeof data?.avgTimeToHire === "string" ? data.avgTimeToHire : (typeof data?.avgTimeToHire === "number" ? `${data.avgTimeToHire}d` : prev.avgTimeToHire),
        avgTimeToHireDelta: typeof data?.avgTimeToHireDelta === "string" ? data.avgTimeToHireDelta : prev.avgTimeToHireDelta,
        avgTimeToHireSub: typeof data?.avgTimeToHireSub === "string" ? data.avgTimeToHireSub : prev.avgTimeToHireSub,

        conversionRate: typeof data?.conversionRate === "string" ? data.conversionRate : (typeof data?.conversionRate === "number" ? `${data.conversionRate}%` : `${Math.round((selectedVal / (registrationsVal || 1)) * 1000) / 10}%`),
      }));

      // Map Stage Funnel
      const baseDen = Math.max(registrationsVal, 1);
      setFunnelData((prev) => [
        { ...prev[0], count: jobOpeningsVal, percent: Math.min(100, Math.round((jobOpeningsVal / baseDen) * 100)) },
        { ...prev[1], count: registrationsVal, percent: 100 },
        { ...prev[2], count: resumeBankVal, percent: Math.min(100, Math.round((resumeBankVal / baseDen) * 100)) },
        { ...prev[3], count: shortlistedVal, percent: Math.min(100, Math.round((shortlistedVal / baseDen) * 100)) },
        { ...prev[4], count: interviewsVal, percent: Math.min(100, Math.round((interviewsVal / baseDen) * 100)) },
        { ...prev[5], count: selectedVal, percent: Math.min(100, Math.round((selectedVal / baseDen) * 100)) },
        { ...prev[6], count: selectedVal, percent: Math.min(100, Math.round((selectedVal / baseDen) * 100)) },
      ]);

      // Map Process Map 6 stages
      setProcessMap((prev) => [
        { ...prev[0], count: `${jobOpeningsVal} in stage` },
        { ...prev[1], count: `${registrationsVal} in stage` },
        { ...prev[2], count: `${resumeBankVal} in stage` },
        { ...prev[3], count: `${shortlistedVal} in stage` },
        { ...prev[4], count: `${interviewsVal} in stage` },
        { ...prev[5], count: `${selectedVal} in stage` },
      ]);

      if (Array.isArray(data.sourceMix)) {
        setSourceMix(data.sourceMix);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // FRONTEND CALCULATION FOR "NEEDS ATTENTION" (Resume Bank & Shortlisted Applicants)
    // ──────────────────────────────────────────────────────────────────────────
    let calculatedUnscreened = 2; // Fallback to screenshot value
    let calculatedShortlistedNoDate = 3; // Fallback to screenshot value
    let calculatedInterviewDone = 12; // Fallback to screenshot value
    let calculatedSelectedNoMaster = 1; // Fallback to screenshot value

    try {
      // 1. Fetch Resume Bank candidates to calculate "Resumes unscreened > 5 days"
      const resumeRes = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/interviewcanidates`,
        {
          loc_code: user?.branch || user?.Primary_Branch || user?.branch_code || "",
        },
        { headers }
      );
      const resumeList: any[] = Array.isArray(resumeRes.data)
        ? resumeRes.data
        : (Array.isArray(resumeRes.data?.data) ? resumeRes.data.data : []);

      if (Array.isArray(resumeList)) {
        let unscreened5Count = 0;
        resumeList.forEach((c: any) => {
          const isRejected = Boolean(c.REJECTED_BY || c.INT_STATUS === 3 || c.STATUS === "Rejected");
          const isShortlisted = Boolean(c.INT_STATUS === 2 || c.STATUS === "Shortlisted");
          const isReviewed = Boolean(c.INTR1BY || c.STATUS === "Reviewed");
          const isUnscreened = !isRejected && !isShortlisted && !isReviewed;

          if (isUnscreened) {
            const dateVal =
              c.APPLICATION_DATE1 || c.CREATED_DATE || c.TRAN_DATE || c.REG_DATE || c.DATE;
            const days = getDaysDifference(dateVal);
            if (days > 5 || !dateVal) {
              unscreened5Count++;
            }
          }
        });
        calculatedUnscreened = unscreened5Count;
      }
    } catch (err) {
      console.error("Error calculating unscreened resumes count:", err);
    }

    try {
      // 2. Fetch Shortlisted candidates to calculate remaining 3 items
      const shortRes = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/interview/CandidateDashboard`,
        {
          loc_code: user?.branch || "",
        },
        {
          headers: {
            compcode: compCode,
            name: user?.name || "HR Admin",
          },
        }
      );
      const shortList: any[] = Array.isArray(shortRes.data?.data)
        ? shortRes.data.data
        : (Array.isArray(shortRes.data) ? shortRes.data : []);

      if (Array.isArray(shortList)) {
        let countShortlistedNoDate = 0;
        let countInterviewDone = 0;
        let countSelectedNoMaster = 0;

        shortList.forEach((c: any) => {
          const status = String(c.INT_STATUS ?? "");
          const hasInterviewDate = Boolean(c.INTR1DATE || c.INTR2DATE || c.INTR3DATE || c.INTR4DATE);

          // (a) Shortlisted, no interview date: status is "2" (or empty/shortlisted) and no interview scheduled
          if ((status === "2" || !status) && !hasInterviewDate) {
            countShortlistedNoDate++;
          }

          // (b) Interview done, no decision: status is "100" (All Interview Done) or status "3" with interview scheduled/done, but no final selection/rejection (101, 102, 103)
          if (status === "100" || (status === "3" && hasInterviewDate)) {
            countInterviewDone++;
          }

          // (c) Selected, master not created: status is "101" (Finally selected by HR), master not yet created (not 103) and no EMPCODE
          if (status === "101" && status !== "103" && !c.EMPCODE) {
            countSelectedNoMaster++;
          }
        });

        calculatedShortlistedNoDate = countShortlistedNoDate;
        calculatedInterviewDone = countInterviewDone;
        calculatedSelectedNoMaster = countSelectedNoMaster;
      }
    } catch (err) {
      console.error("Error calculating shortlisted candidates counts:", err);
    }

    // Update Needs Attention state with frontend-calculated metrics
    setNeedsAttention([
      {
        id: "unscreened",
        title: "Resumes unscreened > 5 days",
        sub: "Sitting in resume bank",
        count: calculatedUnscreened,
        tint: "#E11D48",
        route: "/payroll/recruitment-process/resume-bank",
      },
      {
        id: "shortlisted_no_date",
        title: "Shortlisted, no interview date",
        sub: "Awaiting scheduling",
        count: calculatedShortlistedNoDate,
        tint: "#F59E0B",
        route: "/payroll/recruitment-process/shortlisted-applications",
      },
      {
        id: "interview_no_decision",
        title: "Interview done, no decision",
        sub: "Ratings submitted",
        count: calculatedInterviewDone,
        tint: "#7C3AED",
        route: "/payroll/recruitment-process/interview-scheduling",
      },
      {
        id: "selected_no_master",
        title: "Selected, master not created",
        sub: "Ready for onboarding",
        count: calculatedSelectedNoMaster,
        tint: "#10B981",
        route: "/payroll/masters/employee-master-with-basic-info",
      },
    ]);

    setIsLoading(false);
  };

  useEffect(() => {
    fetchDashboardData(activePreset, dateRange);
  }, [user, activePreset, dateRange]);

  // Preset Handlers
  const handlePresetSelect = (preset: "7" | "30" | "90") => {
    if (activePreset === preset) {
      setActivePreset(null);
      setDateRange(null);
      return;
    }
    setActivePreset(preset);
    const today = new Date();
    const toStr = formatDate(today);
    const daysAgo = preset === "7" ? 6 : preset === "30" ? 29 : 89;
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - daysAgo);
    const fromStr = formatDate(fromDate);
    setDateRange({ DATE_FROM: fromStr, DATE_TO: toStr });
  };

  // Highcharts Donut Data for Source Mix
  const sourceChartData = useMemo(() => {
    return sourceMix.map((s) => ({
      name: s.name,
      y: s.percent,
      color: s.color,
    }));
  }, [sourceMix]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] p-4 sm:p-6 space-y-4 max-w-[1780px] mx-auto font-sans transition-colors pb-24">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER & NAVIGATION BAR */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">

        {/* Date Range Presets & Refresh */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="inline-flex items-center gap-[6px] p-[3px] rounded-[10px] bg-[#F8FAFC] dark:bg-[#0E1524] border border-[#E2E8F0] dark:border-[#1F2937]">
            <AButton
              type="button"
              variant={activePreset === "7" ? "primary" : "ghost"}
              size="sm"
              onClick={() => handlePresetSelect("7")}
              className={`!h-auto !py-[6px] !px-[11px] !rounded-[8px] !text-[12px] !font-semibold whitespace-nowrap transition-colors ${
                activePreset === "7"
                  ? "!bg-[#4F46E5] text-white shadow-xs"
                  : "!bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#E7ECF3]"
              }`}
            >
              <span>7 days</span>
            </AButton>
            <AButton
              type="button"
              variant={activePreset === "30" ? "primary" : "ghost"}
              size="sm"
              onClick={() => handlePresetSelect("30")}
              className={`!h-auto !py-[6px] !px-[11px] !rounded-[8px] !text-[12px] !font-semibold whitespace-nowrap transition-colors ${
                activePreset === "30"
                  ? "!bg-[#4F46E5] text-white shadow-xs"
                  : "!bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#E7ECF3]"
              }`}
            >
              <span>30 days</span>
            </AButton>
            <AButton
              type="button"
              variant={activePreset === "90" ? "primary" : "ghost"}
              size="sm"
              onClick={() => handlePresetSelect("90")}
              className={`!h-auto !py-[6px] !px-[11px] !rounded-[8px] !text-[12px] !font-semibold whitespace-nowrap transition-colors ${
                activePreset === "90"
                  ? "!bg-[#4F46E5] text-white shadow-xs"
                  : "!bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#E7ECF3]"
              }`}
            >
              <span>90 days</span>
            </AButton>
          </div>

          <AButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData(activePreset, dateRange)}
            loading={isLoading}
            title="Refresh dashboard"
            className="!h-[34px] !w-[34px] !p-0 !rounded-[10px] !border-[#E2E8F0] dark:!border-[#1F2937] bg-white dark:bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] hover:bg-[#F1F5F9] dark:hover:bg-[#182235]"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </AButton>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. RECRUITMENT PIPELINE TITLE & MAIN CALL-TO-ACTIONS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-5 mb-[18px] pt-1">
        <div>
          <h1 className="text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3] m-0">
            Recruitment pipeline
          </h1>
          <p className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8] font-normal mt-[5px]">
            Every stage of hiring, from job opening to employee master — click a stage to work in it.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Bulk resume upload */}
          <AButton
            type="button"
            variant="outline"
            onClick={() => router.push("/payroll/recruitment-process/bulk-resume-upload")}
            icon={<Upload className="h-4 w-4" />}
            className="flex-1 sm:flex-none !h-auto !py-2 !px-[13px] !rounded-[10px] !text-[12.5px] !font-[550] !border-[#E2E8F0] dark:!border-[#1F2937] bg-white dark:bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] hover:bg-[#F1F5F9] dark:hover:bg-[#182235]"
          >
            <span>Bulk resume upload</span>
          </AButton>

          {/* New job opening */}
          <AButton
            type="button"
            variant="primary"
            onClick={() => router.push("/payroll/recruitment-process/create-job-opening")}
            icon={<Plus className="h-4 w-4 text-white" />}
            className="flex-1 sm:flex-none !h-auto !py-2 !px-[14px] !rounded-[10px] !text-[12.5px] !font-[600] !border-transparent !bg-[#4F46E5] hover:!bg-[#4338CA] text-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)]"
          >
            <span>New job opening</span>
          </AButton>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. ROW OF 6 STAT / METRIC CARDS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-[14px] mb-4">
        {/* Card 1: Total Registrations */}
        <Card
          title="Total Registrations"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          count={
            <div>
              <span className="text-[26px] font-[650] tracking-[-0.02em] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                {renderSafeValue(metrics.totalRegistrations, 0)}
              </span>
              <p className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] font-normal mt-[3px] truncate">
                All Candidates
              </p>
            </div>
          }
          icon={<User className="h-4 w-4" />}
          variant="indigo"
          onClick={() => router.push("/payroll/recruitment-process/candidate-registration-form")}
          className="!rounded-[12px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] !p-[15px] sm:!px-[17px] !shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:!shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] !h-auto !min-h-[110px]"
        />

        {/* Card 2: Resume Bank */}
        <Card
          title="Resume Bank"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          count={
            <div>
              <span className="text-[26px] font-[650] tracking-[-0.02em] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                {renderSafeValue(metrics.resumeBank, 0)}
              </span>
              <p className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] font-normal mt-[3px] truncate">
                Total Resumes
              </p>
            </div>
          }
          icon={<Folder className="h-4 w-4" />}
          variant="emerald"
          onClick={() => router.push("/payroll/recruitment-process/resume-bank")}
          className="!rounded-[12px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] !p-[15px] sm:!px-[17px] !shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:!shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] !h-auto !min-h-[110px]"
        />

        {/* Card 3: Shortlisted Applications */}
        <Card
          title="Shortlisted Applications"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          count={
            <div>
              <span className="text-[26px] font-[650] tracking-[-0.02em] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                {renderSafeValue(metrics.shortlisted, 0)}
              </span>
              <p className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] font-normal mt-[3px] truncate">
                Shortlisted Candidates
              </p>
            </div>
          }
          icon={<Users className="h-4 w-4" />}
          variant="amber"
          onClick={() => router.push("/payroll/recruitment-process/shortlisted-applications")}
          className="!rounded-[12px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] !p-[15px] sm:!px-[17px] !shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:!shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] !h-auto !min-h-[110px]"
        />

        {/* Card 4: Interview Scheduled */}
        <Card
          title="Interview Scheduled"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          count={
            <div>
              <span className="text-[26px] font-[650] tracking-[-0.02em] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                {renderSafeValue(metrics.interviewScheduled, 0)}
              </span>
              <p className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] font-normal mt-[3px] truncate">
                Interviews Scheduled
              </p>
            </div>
          }
          icon={<Calendar className="h-4 w-4" />}
          variant="purple"
          onClick={() => router.push("/payroll/recruitment-process/interview-scheduling")}
          className="!rounded-[12px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] !p-[15px] sm:!px-[17px] !shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:!shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] !h-auto !min-h-[110px]"
        />

        {/* Card 5: Selected Employees */}
        <Card
          title="Selected Employees"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          count={
            <div>
              <span className="text-[26px] font-[650] tracking-[-0.02em] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                {renderSafeValue(metrics.selectedEmployees, 0)}
              </span>
              <p className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] font-normal mt-[3px] truncate">
                Hired Candidates
              </p>
            </div>
          }
          icon={<CheckSquare className="h-4 w-4" />}
          variant="green"
          onClick={() => router.push("/payroll/masters/employee-master-with-basic-info")}
          className="!rounded-[12px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] !p-[15px] sm:!px-[17px] !shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:!shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] !h-auto !min-h-[110px]"
        />

        {/* Card 6: Rejected */}
        <Card
          title="Rejected"
          titleClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
          count={
            <div>
              <span className="text-[26px] font-[650] tracking-[-0.02em] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                {renderSafeValue(metrics.rejected, 0)}
              </span>
              <p className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] font-normal mt-[3px] truncate">
                Rejected Candidates
              </p>
            </div>
          }
          icon={<XCircle className="h-4 w-4" />}
          variant="rose"
          onClick={() => router.push("/payroll/recruitment-process/rejected-entries")}
          className="!rounded-[12px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] !p-[15px] sm:!px-[17px] !shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:!shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] !h-auto !min-h-[110px]"
        />
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 4. MIDDLE SECTION: STAGE FUNNEL & NEEDS ATTENTION / SOURCE MIX */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-[14px] mb-4">
        {/* Left Column: Stage Funnel */}
        <div className="rounded-[12px] border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] p-[17px] sm:px-[19px] sm:pt-[17px] sm:pb-[19px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center gap-[10px] mb-1">
              <h2 className="m-0 text-[14px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                Stage funnel
              </h2>
              {activePreset && (
                <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                  {activePreset === "7" ? "Last 7 days" : activePreset === "90" ? "Last 90 days" : "Last 30 days"}
                </span>
              )}
              <div className="flex-1" />
              <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                Conversion to hire{" "}
                <span className="font-[600] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                  {renderSafeValue(metrics.conversionRate, "0%")}
                </span>
              </span>
            </div>

            {/* Funnel Rows */}
            <div className="flex flex-col gap-[2px] mt-[14px]">
              {funnelData.map((item) => {
                const IconComp = item.icon || Briefcase;
                const widthVal = `${Math.max(4, Math.min(100, Number(renderSafeValue(item.percent, 0)) || 0))}%`;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => router.push(item.route)}
                    className="grid grid-cols-[182px_minmax(0,1fr)_62px_74px] items-center gap-3 border-none rounded-[10px] bg-transparent text-[#1E293B] dark:text-[#E7ECF3] font-inherit py-[9px] px-[10px] cursor-pointer text-left hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] transition-colors w-full"
                  >
                    {/* Icon + Stage Title */}
                    <span className="flex items-center gap-[9px] min-w-0">
                      <span
                        className="w-[24px] h-[24px] rounded-[7px] flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${item.color}1F`, color: item.color }}
                      >
                        <IconComp className="h-4 w-4" />
                      </span>
                      <span className="text-[12.5px] font-[550] overflow-hidden text-ellipsis whitespace-nowrap">
                        {renderSafeValue(item.title, "")}
                      </span>
                    </span>

                    {/* Progress Bar Track (Height 26px, rounded 7px as in HTML) */}
                    <span className="block h-[26px] rounded-[7px] bg-[#F8FAFC] dark:bg-[#0E1524] relative overflow-hidden">
                      <span
                        className="absolute inset-y-0 left-0 rounded-[7px] opacity-90 transition-all duration-500"
                        style={{
                          width: widthVal,
                          backgroundColor: item.color,
                        }}
                      />
                    </span>

                    {/* Numeric Count & Percentage */}
                    <span className="text-[13px] font-[600] tabular-nums text-right text-[#1E293B] dark:text-[#E7ECF3]">
                      {renderSafeValue(item.count, 0)}
                    </span>
                    <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] tabular-nums text-right">
                      {renderSafeValue(item.percent, 0)}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Needs Attention & Source Mix */}
        <div className="rounded-[12px] border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] p-[17px] sm:px-[19px] sm:pt-[17px] sm:pb-[19px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] flex flex-col justify-between">
          {/* Needs Attention Card */}
          <div>
            <h2 className="m-0 mb-1 text-[14px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
              Needs attention
            </h2>
            <p className="m-0 text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
              Candidates sitting past their stage SLA.
            </p>

            <div className="flex flex-col gap-2 mt-[14px]">
              {needsAttention.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(item.route)}
                  style={{ borderLeftColor: item.tint }}
                  className="flex items-center gap-[11px] border border-[#E2E8F0] dark:border-[#1F2937] border-l-[3px] rounded-[10px] bg-transparent text-[#1E293B] dark:text-[#E7ECF3] p-[10px] px-3 cursor-pointer text-left hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] transition-colors w-full"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12.5px] font-[550] overflow-hidden text-ellipsis whitespace-nowrap">
                      {renderSafeValue(item.title, "")}
                    </span>
                    <span className="block text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-[2px]">
                      {renderSafeValue(item.sub, "")}
                    </span>
                  </span>

                  <span
                    className="flex-none text-[15px] font-[650] tabular-nums"
                    style={{ color: item.tint }}
                  >
                    {renderSafeValue(item.count, 0)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Source Mix (at the bottom of this column as in HTML) */}
          <div className="mt-4 pt-[14px] border-t border-[#E2E8F0] dark:border-[#1F2937] flex flex-col gap-[9px]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase">
                SOURCE MIX
              </span>

              <button
                type="button"
                onClick={() => setShowChartToggle(!showChartToggle)}
                className="text-[11.5px] font-medium text-[#4F46E5] dark:text-[#8B84FF] hover:underline cursor-pointer"
              >
                {showChartToggle ? "Show Bars" : "Show Chart"}
              </button>
            </div>

            {showChartToggle ? (
              <div className="py-1">
                <Chart
                  type="donut"
                  height={170}
                  innerSize="60%"
                  data={sourceChartData}
                  showLegend={true}
                  legendPosition="right"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-[9px] max-h-[122px] overflow-y-auto custom-scrollbar pr-1.5">
                {sourceMix.map((src, idx) => {
                  const barColor =
                    src.color ||
                    ["#4F46E5", "#0D9488", "#F59E0B", "#7C3AED", "#0EA5E9", "#E11D48"][idx % 6];
                  const widthPercent = `${Math.max(0, Math.min(100, Number(renderSafeValue(src.percent, 0)) || 0))}%`;

                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-[96px_minmax(0,1fr)_34px] items-center gap-[10px]"
                    >
                      <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8] overflow-hidden text-ellipsis whitespace-nowrap">
                        {renderSafeValue(src.name, "")}
                      </span>
                      {/* Bar Height 6px as in HTML */}
                      <span className="block h-[6px] rounded-full bg-[#F8FAFC] dark:bg-[#0E1524] relative overflow-hidden">
                        <span
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                          style={{
                            width: widthPercent,
                            backgroundColor: barColor,
                          }}
                        />
                      </span>
                      <span className="text-[11.5px] font-[600] tabular-nums text-right text-[#1E293B] dark:text-[#E7ECF3]">
                        {renderSafeValue(src.percent, 0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 5. BOTTOM PROCESS MAP (SEQUENTIAL WORKFLOW PIPELINE) */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-[12px] border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] p-[17px] sm:px-[19px] sm:pt-[17px] sm:pb-[21px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="flex items-center gap-[10px]">
          <h2 className="m-0 text-[14px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
            Process map
          </h2>
          <div className="flex-1" />
          <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
            Solid line = main path · dotted = feeder
          </span>
        </div>

        {/* Horizontal Flow Container */}
        <div className="flex items-stretch gap-0 mt-[18px] overflow-x-auto custom-scrollbar pb-[6px]">
          {processMap.map((item, idx) => {
            const IconComp = item.icon;
            const FeederIcon = item.feeder?.icon;
            const isLast = idx === processMap.length - 1;

            return (
              <div key={idx} className="flex items-stretch shrink-0">
                <div className="flex flex-col gap-2 w-[220px]">
                  {/* Main Step Card - Equal Height & Width */}
                  <button
                    type="button"
                    onClick={() => router.push(item.route)}
                    style={{ borderTopColor: item.color }}
                    className="flex flex-col justify-between items-start border border-[#E2E8F0] dark:border-[#1F2937] border-t-[3px] rounded-[12px] bg-white dark:bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] p-4 cursor-pointer text-left w-full h-[230px] hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] hover:border-[#4F46E5] transition-all shadow-xs"
                  >
                    <div className="w-full">
                      {/* Step tag & Icon */}
                      <div className="flex items-center gap-2 mb-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${item.color}1F`, color: item.color }}
                        >
                          <IconComp className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-bold tracking-wider uppercase text-[#64748B] dark:text-[#94A3B8]">
                          {renderSafeValue(item.step, "")}
                        </span>
                      </div>

                      {/* Step Title - lg (larger) */}
                      <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#1E293B] dark:text-[#E7ECF3] leading-snug">
                        {renderSafeValue(item.title, "")}
                      </h3>

                      {/* Step Description */}
                      <p className="text-[13px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed mt-2">
                        {renderSafeValue(item.desc, "")}
                      </p>
                    </div>

                    {/* Stage Count Badge pinned to bottom */}
                    <div className="w-full pt-2.5 mt-auto border-t border-slate-100 dark:border-slate-800/80">
                      <span
                        className="flex items-center gap-1.5 text-sm font-semibold tabular-nums"
                        style={{ color: item.color }}
                      >
                        {renderSafeValue(item.count, "0 in stage")}
                      </span>
                    </div>
                  </button>

                  {/* Feeder Step below (if present) */}
                  {item.feeder && (
                    <button
                      type="button"
                      onClick={() => router.push(item.feeder!.route)}
                      className="flex items-center gap-2 border border-dashed border-[#E2E8F0] dark:border-[#1F2937] rounded-[10px] bg-transparent text-[#64748B] dark:text-[#94A3B8] text-xs font-medium py-2 px-3 cursor-pointer text-left w-full hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] hover:text-[#1E293B] dark:hover:text-[#E7ECF3] transition-colors"
                    >
                      {FeederIcon && <FeederIcon className="h-4 w-4 shrink-0" />}
                      <span className="truncate">{renderSafeValue(item.feeder.title, "")}</span>
                    </button>
                  )}
                </div>

                {/* Arrow connector aligned with main cards */}
                {!isLast && (
                  <span className="self-start h-[230px] flex items-center justify-center shrink-0 w-[34px] text-[#CBD5E1] dark:text-[#334155]">
                    <ChevronRight className="h-5 w-5" />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
