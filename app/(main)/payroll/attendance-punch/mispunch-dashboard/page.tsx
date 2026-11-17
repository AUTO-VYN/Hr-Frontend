"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  AlertTriangle,
  Brain,
  AlertCircle,
  CheckCircle2,
  FileDown,
  RotateCcw,
  CheckCheck,
  Building2,
  MapPin,
  Layers,
  PieChart as PieIcon,
  Filter,
} from "lucide-react";
import { LuRefreshCcwDot } from "react-icons/lu";
import Swal from "sweetalert2";

// Mandatory Atoms & Template Components specified by user
import Button from "@/components/atoms/Button";
import Chart from "@/components/atoms/chart";
import Eselect from "@/components/atoms/Eselect";
import Einput from "@/components/atoms/Einput";
import CardView from "@/components/Templates/card";
import ReactTable from "@/components/Templates/reacttable";
import { useCurrentUser } from "@/app/hooks/use-current-user";

// ============================================================================
// Constants & Options
// ============================================================================
const monthsArray = [
  { label: "Apr", value: 4 },
  { label: "May", value: 5 },
  { label: "Jun", value: 6 },
  { label: "Jul", value: 7 },
  { label: "Aug", value: 8 },
  { label: "Sep", value: 9 },
  { label: "Oct", value: 10 },
  { label: "Nov", value: 11 },
  { label: "Dec", value: 12 },
  { label: "Jan", value: 1 },
  { label: "Feb", value: 2 },
  { label: "Mar", value: 3 },
];

export default function MisPunchDashboardPage() {
  const router = useRouter();
  const user = useCurrentUser();
  const currentDate = new Date();

  const [isClicked, setIsClicked] = useState(false);
  const [totalDC, setTotalDC] = useState(0);
  const [data1, setdata1] = useState<any>({});
  const [data2, setdata2] = useState<any>({});
  const [data3, setdata3] = useState<any>({});
  const [GraphData1, setGraphData1] = useState<any[]>([]);
  const [GraphData2, setGraphData2] = useState<any[]>([]);
  const [GraphData3, setGraphData3] = useState<any[]>([]);
  const [GraphData4, setGraphData4] = useState<any[]>([]);

  // Filter state (Financial year + Month From / To)
  const [dashbord, setDashboard] = useState({
    branch: user?.branch,
    monthFrom: 4,
    monthTo: 3,
    year: currentDate.getFullYear(),
  });

  // Calculate current financial year
  const getCurrentFinancialYear = () => {
    const curDate = new Date();
    const curYear = curDate.getFullYear();
    const financialYearStartMonth = 3; // April (0-indexed 3)
    if (curDate.getMonth() < financialYearStartMonth) {
      return curYear - 1;
    }
    return curYear;
  };

  const yearoptions = useMemo(() => {
    const curYear = getCurrentFinancialYear();
    const financialYears: { value: string; label: string }[] = [];
    for (let i = -1; i < 5; i++) {
      const startYear = curYear - i;
      const endYear = startYear + 1;
      financialYears.push({
        value: `${startYear}`,
        label: `${startYear}-${endYear}`,
      });
    }
    return financialYears;
  }, []);

  const handleInputchange = (name: string, value: any) => {
    setDashboard((prev) => ({
      ...prev,
      [name]: value,
      branch: user?.branch,
    }));
  };

  const selectedYearLabel = useMemo(() => {
    const found = yearoptions.find((y) => y.value === String(dashbord.year));
    return found ? found.label : `${dashbord.year}-${Number(dashbord.year) + 1}`;
  }, [dashbord.year, yearoptions]);

  const selectedFromMonthLabel = useMemo(() => {
    const found = monthsArray.find((m) => m.value === Number(dashbord.monthFrom));
    return found ? found.label : "Apr";
  }, [dashbord.monthFrom]);

  const selectedToMonthLabel = useMemo(() => {
    const found = monthsArray.find((m) => m.value === Number(dashbord.monthTo));
    return found ? found.label : "Mar";
  }, [dashbord.monthTo]);

  // Fetch Dashboard API Data
  const handleDashboard = async () => {
    const compCode =
      (user as any)?.Comp_Code ||
      (user as any)?.company_code ||
      (user as any)?.comp_code ||
      (user as any)?.compCode ||
      (user as any)?.DB;

    if (!compCode) {
      console.warn("User session or Comp_Code not ready yet.");
      return;
    }

    setIsClicked(true);
    setdata1({});
    setdata2({});
    setdata3({});
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/dashboards/MissPunchDashboard`,
        {
          monthFrom: dashbord.monthFrom,
          monthTo: dashbord.monthTo,
          year: dashbord.year,
          branch: user?.branch || (user as any)?.Branch || dashbord.branch || "",
          compcode: String(compCode),
          Comp_Code: String(compCode),
        },
        {
          headers: {
            compcode: String(compCode),
            Comp_Code: String(compCode),
            name: user?.name || "",
            empcode: (user as any)?.empcode || (user as any)?.EMPCODE || "",
          },
        }
      );

      const resultList = response?.data?.Result || [];
      const total = Array.isArray(resultList)
        ? resultList.reduce(
            (acc: number, item: any) => acc + (Number(item.chart_data) || 0),
            0
          )
        : 0;

      setTotalDC(total);
      setdata1(resultList[0] || {});
      setdata2(resultList[1] || {});
      setdata3(resultList[2] || {});
      setGraphData1(response?.data?.location || []);
      setGraphData2(response?.data?.Region || []);
      setGraphData3(response?.data?.Section || []);
      setGraphData4(response?.data?.Division || []);
    } catch (err: any) {
      console.error("Error fetching mispunch dashboard:", err);
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data?.Message ||
        err?.message ||
        "Failed to load Mis-Punch Dashboard data.";
      Swal.fire({
        title: "Error!",
        text: errMsg,
        icon: "error",
      });
    } finally {
      setIsClicked(false);
    }
  };

  useEffect(() => {
    const compCode =
      (user as any)?.Comp_Code ||
      (user as any)?.company_code ||
      (user as any)?.comp_code ||
      (user as any)?.compCode ||
      (user as any)?.DB;

    if (compCode) {
      handleDashboard();
    }
  }, [
    user?.Comp_Code,
    (user as any)?.company_code,
    (user as any)?.comp_code,
    (user as any)?.DB,
    user?.branch,
    dashbord.year,
    dashbord.monthFrom,
    dashbord.monthTo,
  ]);

  // Helper to format category names nicely (e.g. "SERVICE" -> "Service", "SPARE PART" -> "Spare Part")
  const formatCategoryName = (name: string) => {
    if (!name) return "";
    const trimmed = name.trim();
    if (trimmed.toUpperCase() === "HR") return "HR";
    if (trimmed.toUpperCase() === "IT") return "IT";
    if (trimmed.toUpperCase() === "PDI") return "PDI";
    if (trimmed.toUpperCase() === "MIS") return "MIS";
    if (trimmed.toUpperCase() === "RMPL") return "RMPL";
    if (trimmed.toUpperCase() === "STPL") return "STPL";
    if (trimmed.toUpperCase() === "SSD") return "SSD";
    if (trimmed.toUpperCase() === "CC - SALES") return "CC - Sales";
    return trimmed
      .toLowerCase()
      .split(" ")
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
      .join(" ");
  };

  // State to toggle between Top 5 and All records for each of the 4 charts
  const [chartViewMode, setChartViewMode] = useState<{
    location: "top5" | "all";
    region: "top5" | "all";
    section: "top5" | "all";
    division: "top5" | "all";
  }>({
    location: "top5",
    region: "top5",
    section: "top5",
    division: "top5",
  });

  // Helper to parse chart datasets with Top 5 / All combination support
  const parseChartData = (dataList: any[], mode: "top5" | "all" = "top5") => {
    if (!Array.isArray(dataList)) {
      return { categories: [], values: [], totalRecords: 0, allCount: 0, displayedCount: 0 };
    }

    // Sort descending by mis-punch count so highest are at the top
    const sorted = [...dataList].sort((a, b) => {
      const valA = Number(a.chart_data ?? a.count ?? a.value ?? 0);
      const valB = Number(b.chart_data ?? b.count ?? b.value ?? 0);
      return valB - valA;
    });

    const totalRecords = sorted.reduce(
      (acc, item) => acc + Number(item.chart_data ?? item.count ?? item.value ?? 0),
      0
    );

    const displayList = mode === "top5" ? sorted.slice(0, 5) : sorted;

    const categories: string[] = [];
    const values: number[] = [];

    displayList.forEach((item) => {
      const label =
        item.name ||
        item.loc_code ||
        item.Region ||
        item.Section ||
        item.Division ||
        item.label ||
        "Item";
      const val = Number(item.chart_data ?? item.count ?? item.value ?? 0);
      categories.push(formatCategoryName(String(label)));
      values.push(val);
    });

    return {
      categories,
      values,
      totalRecords,
      allCount: sorted.length,
      displayedCount: displayList.length,
    };
  };

  const locationChart = useMemo(
    () => parseChartData(GraphData1, chartViewMode.location),
    [GraphData1, chartViewMode.location]
  );
  const regionChart = useMemo(
    () => parseChartData(GraphData2, chartViewMode.region),
    [GraphData2, chartViewMode.region]
  );
  const sectionChart = useMemo(
    () => parseChartData(GraphData3, chartViewMode.section),
    [GraphData3, chartViewMode.section]
  );
  const divisionChart = useMemo(
    () => parseChartData(GraphData4, chartViewMode.division),
    [GraphData4, chartViewMode.division]
  );

  // Export CSV Handler
  const handleExport = (title: string, data: any[]) => {
    if (!data || data.length === 0) {
      Swal.fire({
        title: "No Data",
        text: `No records available to export for ${title}.`,
        icon: "info",
      });
      return;
    }
    const headers = ["Category", "Mis-Punches"];
    const rows = data.map((item) => {
      const label =
        item.name ||
        item.loc_code ||
        item.Region ||
        item.Section ||
        item.Division ||
        item.label ||
        "Item";
      const val = item.chart_data ?? item.count ?? item.value ?? 0;
      return `"${label}",${val}`;
    });
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${title.toLowerCase().replace(/\s+/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-black p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ==================================================================== */}
      {/* 1. TOP HEADER SECTION */}
      {/* ==================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Mis-punch analysis
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            {totalDC.toLocaleString()} mis-punches raised in FY {selectedYearLabel} ·{" "}
            {selectedFromMonthLabel} to {selectedToMonthLabel}
          </p>
        </div>

        {/* Right CTA Button */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="md"
            icon={<CheckCheck className="w-4 h-4 text-white" />}
            onClick={() =>
              router.push("/payroll/attendance-punch/mispunch-approval-grid")
            }
            className="rounded-xl text-xs font-semibold shadow-sm"
          >
            Open approver grid
          </Button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. FILTER BAR (Screenshot 3 Style) */}
      {/* ==================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-end">
          {/* Financial Year */}
          <div className="sm:col-span-4 lg:col-span-4">
            <Eselect
              title="Financial Year"
              name="year"
              option={yearoptions}
              initialValue={dashbord.year?.toString()}
              handleInputChange={handleInputchange}
              className="w-full"
            />
          </div>

          {/* Month From */}
          <div className="sm:col-span-3 lg:col-span-3">
            <Eselect
              title="Month From"
              name="monthFrom"
              option={monthsArray}
              initialValue={dashbord.monthFrom}
              handleInputChange={handleInputchange}
              className="w-full"
            />
          </div>

          {/* Month To */}
          <div className="sm:col-span-3 lg:col-span-3">
            <Eselect
              title="Month To"
              name="monthTo"
              option={monthsArray}
              initialValue={dashbord.monthTo}
              handleInputChange={handleInputchange}
              className="w-full"
            />
          </div>

          {/* Refresh Action Button */}
          <div className="sm:col-span-2 lg:col-span-2 flex items-center justify-start pb-0.5">
            <Button
              variant="primary"
              size="md"
              onClick={handleDashboard}
              disabled={isClicked}
              className="rounded-xl h-[38px] px-4 w-full sm:w-auto shadow-sm"
              title="Reload dashboard data"
            >
              <LuRefreshCcwDot
                className={`w-4 h-4 text-white ${isClicked ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. FOUR METRIC SUMMARY CARDS (Screenshot 1 Style) */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: TOTAL MIS-PUNCH */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Mis-Punch
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-3">
              {totalDC.toLocaleString()}
            </div>
          </div>
          <div className="text-xs font-semibold text-rose-500 flex items-center gap-1.5 mt-2">
            <span>+{data1?.chart_data ? Math.round(Number(data1.chart_data)) : 0}</span>
            <span className="text-slate-400 font-normal">in peak location</span>
          </div>
        </div>

        {/* Card 2: PRIMARY MIS-PUNCH OCCURRENCE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                {data1?.loc_code ? `${data1.loc_code}` : "Primary Occurrence"}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {Number(data1?.chart_data || 0).toLocaleString()}
              </span>
              <span className="text-xs font-bold text-amber-500">
                {totalDC > 0
                  ? `${Math.round(((data1?.chart_data || 0) / totalDC) * 100)}%`
                  : "0%"}
              </span>
            </div>
          </div>
          <div className="text-xs font-medium text-slate-400 mt-2 truncate">
            Most common occurrence
          </div>
        </div>

        {/* Card 3: SECONDARY MIS-PUNCH OCCURRENCE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                {data2?.loc_code ? `${data2.loc_code}` : "Secondary Occurrence"}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {Number(data2?.chart_data || 0).toLocaleString()}
              </span>
              <span className="text-xs font-bold text-rose-500">
                {totalDC > 0
                  ? `${Math.round(((data2?.chart_data || 0) / totalDC) * 100)}%`
                  : "0%"}
              </span>
            </div>
          </div>
          <div className="text-xs font-medium text-slate-400 mt-2 truncate">
            Second highest location
          </div>
        </div>

        {/* Card 4: TERTIARY MIS-PUNCH OCCURRENCE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                {data3?.loc_code ? `${data3.loc_code}` : "Tertiary Occurrence"}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {Number(data3?.chart_data || 0).toLocaleString()}
              </span>
              <span className="text-xs font-bold text-emerald-500">
                {totalDC > 0
                  ? `${Math.round(((data3?.chart_data || 0) / totalDC) * 100)}%`
                  : "0%"}
              </span>
            </div>
          </div>
          <div className="text-xs font-medium text-slate-400 mt-2 truncate">
            Within policy follow-up
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. FOUR HORIZONTAL BAR CHARTS (2x2 Grid - Screenshot 1 Style) */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Location Wise */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 mb-3 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Mis-punch location wise
              </h3>
              <span className="text-xs font-normal text-slate-400">
                {locationChart.totalRecords.toLocaleString()} records
              </span>
            </div>
            <div className="flex items-center gap-2">
              {locationChart.allCount > 5 && (
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() =>
                      setChartViewMode((p) => ({ ...p, location: "top5" }))
                    }
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                      chartViewMode.location === "top5"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Top 5
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setChartViewMode((p) => ({ ...p, location: "all" }))
                    }
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                      chartViewMode.location === "all"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    All ({locationChart.allCount})
                  </button>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                icon={<FileDown className="w-3.5 h-3.5" />}
                onClick={() => handleExport("Mis-punch Location Wise", GraphData1)}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Export
              </Button>
            </div>
          </div>

          <div
            className={`w-full ${
              chartViewMode.location === "all"
                ? "max-h-[350px] overflow-y-auto custom-scrollbar pr-1"
                : "min-h-[220px]"
            }`}
          >
            <Chart
              type="bar"
              categories={locationChart.categories}
              data={locationChart.values}
              colors={["#00a884"]}
              height={
                chartViewMode.location === "all"
                  ? Math.max(220, locationChart.displayedCount * 36)
                  : 220
              }
              showLegend={false}
              showDataLabels={true}
              showGridLines={false}
              loading={isClicked}
              emptyText="No location records found"
              options={{
                plotOptions: {
                  bar: {
                    borderRadius: 6,
                    pointWidth: 16,
                    color: "#00a884",
                    dataLabels: {
                      enabled: true,
                      align: "left",
                      x: 8,
                      inside: false,
                      crop: false,
                      overflow: "allow",
                      formatter: function () {
                        return Number(this.y).toLocaleString();
                      },
                      style: {
                        fontWeight: "700",
                        fontSize: "12px",
                        color: "#0f172a",
                        textOutline: "none",
                      },
                    },
                  },
                },
                xAxis: {
                  categories: locationChart.categories,
                  labels: {
                    align: "right",
                    reserveSpace: true,
                    style: {
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#475569",
                    },
                  },
                  lineWidth: 0,
                  tickWidth: 0,
                },
                yAxis: {
                  visible: false,
                  gridLineWidth: 0,
                  maxPadding: 0.25,
                },
              }}
            />
          </div>

          {locationChart.allCount > 5 && (
            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                {chartViewMode.location === "top5"
                  ? `Showing top 5 of ${locationChart.allCount} locations`
                  : `Showing all ${locationChart.allCount} locations (scrollable)`}
              </span>
              <button
                type="button"
                onClick={() =>
                  setChartViewMode((p) => ({
                    ...p,
                    location: p.location === "top5" ? "all" : "top5",
                  }))
                }
                className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
              >
                {chartViewMode.location === "top5"
                  ? `View all (${locationChart.allCount}) →`
                  : "← Collapse to Top 5"}
              </button>
            </div>
          )}
        </div>

        {/* Chart 2: Region Wise */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 mb-3 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Mis-punch region wise
              </h3>
              <span className="text-xs font-normal text-slate-400">
                {regionChart.totalRecords.toLocaleString()} records
              </span>
            </div>
            <div className="flex items-center gap-2">
              {regionChart.allCount > 5 && (
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() =>
                      setChartViewMode((p) => ({ ...p, region: "top5" }))
                    }
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                      chartViewMode.region === "top5"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Top 5
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setChartViewMode((p) => ({ ...p, region: "all" }))
                    }
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                      chartViewMode.region === "all"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    All ({regionChart.allCount})
                  </button>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                icon={<FileDown className="w-3.5 h-3.5" />}
                onClick={() => handleExport("Mis-punch Region Wise", GraphData2)}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Export
              </Button>
            </div>
          </div>

          <div
            className={`w-full ${
              chartViewMode.region === "all"
                ? "max-h-[350px] overflow-y-auto custom-scrollbar pr-1"
                : "min-h-[220px]"
            }`}
          >
            <Chart
              type="bar"
              categories={regionChart.categories}
              data={regionChart.values}
              colors={["#e11d48"]}
              height={
                chartViewMode.region === "all"
                  ? Math.max(220, regionChart.displayedCount * 36)
                  : 220
              }
              showLegend={false}
              showDataLabels={true}
              showGridLines={false}
              loading={isClicked}
              emptyText="No region records found"
              options={{
                plotOptions: {
                  bar: {
                    borderRadius: 6,
                    pointWidth: 16,
                    color: "#e11d48",
                    dataLabels: {
                      enabled: true,
                      align: "left",
                      x: 8,
                      inside: false,
                      crop: false,
                      overflow: "allow",
                      formatter: function () {
                        return Number(this.y).toLocaleString();
                      },
                      style: {
                        fontWeight: "700",
                        fontSize: "12px",
                        color: "#0f172a",
                        textOutline: "none",
                      },
                    },
                  },
                },
                xAxis: {
                  categories: regionChart.categories,
                  labels: {
                    align: "right",
                    reserveSpace: true,
                    style: {
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#475569",
                    },
                  },
                  lineWidth: 0,
                  tickWidth: 0,
                },
                yAxis: {
                  visible: false,
                  gridLineWidth: 0,
                  maxPadding: 0.25,
                },
              }}
            />
          </div>

          {regionChart.allCount > 5 && (
            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                {chartViewMode.region === "top5"
                  ? `Showing top 5 of ${regionChart.allCount} regions`
                  : `Showing all ${regionChart.allCount} regions (scrollable)`}
              </span>
              <button
                type="button"
                onClick={() =>
                  setChartViewMode((p) => ({
                    ...p,
                    region: p.region === "top5" ? "all" : "top5",
                  }))
                }
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                {chartViewMode.region === "top5"
                  ? `View all (${regionChart.allCount}) →`
                  : "← Collapse to Top 5"}
              </button>
            </div>
          )}
        </div>

        {/* Chart 3: Section Wise */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 mb-3 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Mis-punch section wise
              </h3>
              <span className="text-xs font-normal text-slate-400">
                {sectionChart.totalRecords.toLocaleString()} records
              </span>
            </div>
            <div className="flex items-center gap-2">
              {sectionChart.allCount > 5 && (
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() =>
                      setChartViewMode((p) => ({ ...p, section: "top5" }))
                    }
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                      chartViewMode.section === "top5"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Top 5
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setChartViewMode((p) => ({ ...p, section: "all" }))
                    }
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                      chartViewMode.section === "all"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    All ({sectionChart.allCount})
                  </button>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                icon={<FileDown className="w-3.5 h-3.5" />}
                onClick={() => handleExport("Mis-punch Section Wise", GraphData3)}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Export
              </Button>
            </div>
          </div>

          <div
            className={`w-full ${
              chartViewMode.section === "all"
                ? "max-h-[350px] overflow-y-auto custom-scrollbar pr-1"
                : "min-h-[220px]"
            }`}
          >
            <Chart
              type="bar"
              categories={sectionChart.categories}
              data={sectionChart.values}
              colors={["#f59e0b"]}
              height={
                chartViewMode.section === "all"
                  ? Math.max(220, sectionChart.displayedCount * 36)
                  : 220
              }
              showLegend={false}
              showDataLabels={true}
              showGridLines={false}
              loading={isClicked}
              emptyText="No section records found"
              options={{
                plotOptions: {
                  bar: {
                    borderRadius: 6,
                    pointWidth: 16,
                    color: "#f59e0b",
                    dataLabels: {
                      enabled: true,
                      align: "left",
                      x: 8,
                      inside: false,
                      crop: false,
                      overflow: "allow",
                      formatter: function () {
                        return Number(this.y).toLocaleString();
                      },
                      style: {
                        fontWeight: "700",
                        fontSize: "12px",
                        color: "#0f172a",
                        textOutline: "none",
                      },
                    },
                  },
                },
                xAxis: {
                  categories: sectionChart.categories,
                  labels: {
                    align: "right",
                    reserveSpace: true,
                    style: {
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#475569",
                    },
                  },
                  lineWidth: 0,
                  tickWidth: 0,
                },
                yAxis: {
                  visible: false,
                  gridLineWidth: 0,
                  maxPadding: 0.25,
                },
              }}
            />
          </div>

          {sectionChart.allCount > 5 && (
            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                {chartViewMode.section === "top5"
                  ? `Showing top 5 of ${sectionChart.allCount} sections`
                  : `Showing all ${sectionChart.allCount} sections (scrollable)`}
              </span>
              <button
                type="button"
                onClick={() =>
                  setChartViewMode((p) => ({
                    ...p,
                    section: p.section === "top5" ? "all" : "top5",
                  }))
                }
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                {chartViewMode.section === "top5"
                  ? `View all (${sectionChart.allCount}) →`
                  : "← Collapse to Top 5"}
              </button>
            </div>
          )}
        </div>

        {/* Chart 4: Division Wise */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800 mb-3 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Mis-punch division wise
              </h3>
              <span className="text-xs font-normal text-slate-400">
                {divisionChart.totalRecords.toLocaleString()} records
              </span>
            </div>
            <div className="flex items-center gap-2">
              {divisionChart.allCount > 5 && (
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() =>
                      setChartViewMode((p) => ({ ...p, division: "top5" }))
                    }
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                      chartViewMode.division === "top5"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Top 5
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setChartViewMode((p) => ({ ...p, division: "all" }))
                    }
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${
                      chartViewMode.division === "all"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    All ({divisionChart.allCount})
                  </button>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                icon={<FileDown className="w-3.5 h-3.5" />}
                onClick={() => handleExport("Mis-punch Division Wise", GraphData4)}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Export
              </Button>
            </div>
          </div>

          <div
            className={`w-full ${
              chartViewMode.division === "all"
                ? "max-h-[350px] overflow-y-auto custom-scrollbar pr-1"
                : "min-h-[220px]"
            }`}
          >
            <Chart
              type="bar"
              categories={divisionChart.categories}
              data={divisionChart.values}
              colors={["#8b5cf6"]}
              height={
                chartViewMode.division === "all"
                  ? Math.max(220, divisionChart.displayedCount * 36)
                  : 220
              }
              showLegend={false}
              showDataLabels={true}
              showGridLines={false}
              loading={isClicked}
              emptyText="No division records found"
              options={{
                plotOptions: {
                  bar: {
                    borderRadius: 6,
                    pointWidth: 16,
                    color: "#8b5cf6",
                    dataLabels: {
                      enabled: true,
                      align: "left",
                      x: 8,
                      inside: false,
                      crop: false,
                      overflow: "allow",
                      formatter: function () {
                        return Number(this.y).toLocaleString();
                      },
                      style: {
                        fontWeight: "700",
                        fontSize: "12px",
                        color: "#0f172a",
                        textOutline: "none",
                      },
                    },
                  },
                },
                xAxis: {
                  categories: divisionChart.categories,
                  labels: {
                    align: "right",
                    reserveSpace: true,
                    style: {
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#475569",
                    },
                  },
                  lineWidth: 0,
                  tickWidth: 0,
                },
                yAxis: {
                  visible: false,
                  gridLineWidth: 0,
                  maxPadding: 0.25,
                },
              }}
            />
          </div>

          {divisionChart.allCount > 5 && (
            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                {chartViewMode.division === "top5"
                  ? `Showing top 5 of ${divisionChart.allCount} divisions`
                  : `Showing all ${divisionChart.allCount} divisions (scrollable)`}
              </span>
              <button
                type="button"
                onClick={() =>
                  setChartViewMode((p) => ({
                    ...p,
                    division: p.division === "top5" ? "all" : "top5",
                  }))
                }
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
              >
                {chartViewMode.division === "top5"
                  ? `View all (${divisionChart.allCount}) →`
                  : "← Collapse to Top 5"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
