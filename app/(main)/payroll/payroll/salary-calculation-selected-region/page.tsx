
"use client";

import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useCurrentUser } from "@/app/hooks/use-current-user";

import {
  Search,
  Calculator,
  CalendarCheck,
  CheckCircle2,
  Receipt,
  Lock,
  Check,
  AlertTriangle,
} from "lucide-react";

import AButton from "@/components/atoms/Button";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";

type Option = {
  value: string;
  label: string;
};

type RegionItem = {
  id: string;
  name: string;
  empCount?: number;
  statusType?: "ready" | "warning";
  statusText?: string;
  estimateText?: string;
  originalData?: any;
};

const MONTHS: Option[] = [
  { value: "1", label: "Jan" },
  { value: "2", label: "Feb" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Apr" },
  { value: "5", label: "May" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Aug" },
  { value: "9", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

const YEAR_OPTIONS: Option[] = Array.from(
  { length: 10 },
  (_, index) => {
    const value = String(new Date().getFullYear() - index);

    return {
      value,
      label: value,
    };
  }
);

const getText = (...values: any[]): string => {
  for (const value of values) {
    if (
      value !== null &&
      value !== undefined &&
      String(value).trim()
    ) {
      return String(value);
    }
  }

  return "";
};

const escapeHtml = (value: any): string => {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const getApiError = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.message ||
  "Something went wrong. Please try again.";

function ChecklistItem({
  title,
  description,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
      >
        <Icon size={15} className={iconColor} />
      </div>

      <div className="min-w-0">
        <p className="m-0 text-[12px] font-semibold text-[#152b4b] dark:text-slate-100">
          {title}
        </p>

        <p className="mt-0.5 text-[11px] leading-[17px] text-[#64748b] dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function SalaryCalculationByRegionPage() {
  const user = useCurrentUser();

  const [loading, setLoading] = useState(false);

  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const [search, setSearch] = useState("");

  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [regions, setRegions] = useState<RegionItem[]>([]);

  const [warning, setWarning] = useState("");
  const [lockedLocations, setLockedLocations] = useState<any[]>([]);

  const apiHeaders = useMemo(
    () => ({
      compcode: user?.Comp_Code,
      name: user?.name,
    }),
    [user?.Comp_Code, user?.name]
  );

  // --------------------------------------------------
  // SWEET ALERT TOAST
  // --------------------------------------------------

  const showSideAlert = useCallback(
    (message: string, type: "success" | "error" | "warning" | "info") => {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: type,
        title: message,
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true,
      });
    },
    []
  );

  // --------------------------------------------------
  // INPUT HANDLER
  // --------------------------------------------------

  const handleInputChange = (name: string, value: any) => {
    if (name === "month") {
      setMonth(String(value ?? ""));
      setWarning("");
      setLockedLocations([]);
    }

    if (name === "year") {
      setYear(String(value ?? ""));
      setWarning("");
      setLockedLocations([]);
    }

    if (name === "search") {
      setSearch(String(value ?? ""));
    }
  };

  // --------------------------------------------------
  // FETCH REGION API
  // GET /ars/getRegion
  // --------------------------------------------------

  const fetchRegions = useCallback(async () => {
    if (!user?.Comp_Code || !user?.EMPCODE) return;

    try {
      setLoading(true);

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/ars/getRegion`,
        {
          headers: apiHeaders,
        }
      );

      const regionData = Array.isArray(response?.data?.Region_Data)
        ? response.data.Region_Data
        : [];

      const formattedRegions: RegionItem[] = regionData
        .map((loc: any) => {
          const regionId = getText(
            loc?.value,
            loc?.id,
            loc?.Region_Code,
            loc?.Region_ID,
            loc?.UTD
          );

          const regionName = getText(
            loc?.label,
            loc?.name,
            loc?.Region_Name,
            loc?.region_name,
            loc?.Region
          );

          if (!regionId || !regionName) return null;

          const employeeCount = Number(
            loc?.empCount ??
              loc?.EmpCount ??
              loc?.TotalEmployees ??
              loc?.total_emp ??
              0
          );

          const statusText = getText(
            loc?.statusText,
            loc?.StatusText,
            loc?.status,
            loc?.Status
          );

          const normalizedStatus = statusText.toLowerCase();

          return {
            id: regionId,
            name: regionName,
            empCount: Number.isFinite(employeeCount)
              ? employeeCount
              : undefined,
            statusType:
              normalizedStatus.includes("warning") ||
              normalizedStatus.includes("blocked")
                ? "warning"
                : normalizedStatus
                  ? "ready"
                  : undefined,
            statusText: statusText || undefined,
            originalData: loc,
          };
        })
        .filter(Boolean) as RegionItem[];

      setRegions(formattedRegions);
      setSelectedRegions([]);
    } catch (error) {
      console.error("Fetch Region API Error:", error);

      showSideAlert(
        getApiError(error) || "Error fetching regions",
        "error"
      );

      setRegions([]);
    } finally {
      setLoading(false);
    }
  }, [
    user?.Comp_Code,
    user?.EMPCODE,
    apiHeaders,
    showSideAlert,
  ]);

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  // --------------------------------------------------
  // ALREADY PROCESSED SALARY API
  // --------------------------------------------------

  const fetchAlreadyProcessedData = useCallback(async () => {
    if (!user?.Comp_Code || !user?.branch) return;

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/SalaryLock/AlredyProcess_Slry_cal`,
        {
          locations: user.branch,
        },
        {
          headers: apiHeaders,
        }
      );

      const data = response.data;

      if (data?.Status && data?.modelVisible) {
        const rows = Array.isArray(data?.result)
          ? data.result
          : [];

        const tableRows = rows
          .map(
            (row: any) => `
              <tr>
                <td style="padding:9px;border-bottom:1px solid #e2e8f0">
                  ${escapeHtml(getText(row.Emp_Code) || "—")}
                </td>
                <td style="padding:9px;border-bottom:1px solid #e2e8f0">
                  ${escapeHtml(getText(row.Rerun) || "—")}
                </td>
                <td style="padding:9px;border-bottom:1px solid #e2e8f0">
                  ${escapeHtml(getText(row.loc_name) || "—")}
                </td>
                <td style="padding:9px;border-bottom:1px solid #e2e8f0">
                  ${escapeHtml(getText(row.Created_by) || "—")}
                </td>
                <td style="padding:9px;border-bottom:1px solid #e2e8f0">
                  ${
                    row.Created_At
                      ? escapeHtml(
                          new Date(row.Created_At).toLocaleString("en-IN")
                        )
                      : "—"
                  }
                </td>
              </tr>
            `
          )
          .join("");

        await Swal.fire({
          icon: "info",
          title: "Salary calculation already in progress",
          width: "1100px",
          html: `
            <div style="text-align:left">
              <div style="display:flex;flex-wrap:wrap;gap:20px;margin-bottom:16px;font-size:13px">
                <p>
                  <b>Total Pending Employees:</b>
                  ${escapeHtml(data?.total_emp || 0)}
                </p>

                <p>
                  <b>Estimated Waiting Time:</b>
                  ${escapeHtml(data?.estimated_time || "0 minutes")}
                </p>
              </div>

              <div style="max-height:350px;overflow:auto">
                <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:left">
                  <thead>
                    <tr style="background:#f1f5f9">
                      <th style="padding:9px">Emp Code</th>
                      <th style="padding:9px">Month</th>
                      <th style="padding:9px">Location</th>
                      <th style="padding:9px">Imported By</th>
                      <th style="padding:9px">Imported On</th>
                    </tr>
                  </thead>

                  <tbody>
                    ${
                      tableRows ||
                      "<tr><td colspan='5' style='padding:12px'>No records found</td></tr>"
                    }
                  </tbody>
                </table>
              </div>
            </div>
          `,
          confirmButtonText: "OK",
        });
      }
    } catch (error) {
      console.error("Already Process API error:", error);
    }
  }, [apiHeaders, user?.Comp_Code, user?.branch]);

  useEffect(() => {
    fetchAlreadyProcessedData();
  }, [fetchAlreadyProcessedData]);

  // --------------------------------------------------
  // FILTER REGIONS
  // --------------------------------------------------

  const filteredRegions = useMemo(() => {
    const q = search.trim().toLowerCase();

    return regions.filter((reg) =>
      reg.name.toLowerCase().includes(q)
    );
  }, [regions, search]);

  const totalSelectedEmpCount = useMemo(() => {
    return regions
      .filter((reg) => selectedRegions.includes(reg.id))
      .reduce((acc, curr) => acc + (curr.empCount || 0), 0);
  }, [regions, selectedRegions]);

  // --------------------------------------------------
  // SELECT ALL REGIONS
  // --------------------------------------------------

  const toggleSelectAll = () => {
    const filteredIds = filteredRegions.map((reg) => reg.id);

    const allSelected =
      filteredIds.length > 0 &&
      filteredIds.every((id) => selectedRegions.includes(id));

    if (allSelected) {
      setSelectedRegions((prev) =>
        prev.filter((id) => !filteredIds.includes(id))
      );
    } else {
      setSelectedRegions((prev) => [
        ...new Set([...prev, ...filteredIds]),
      ]);
    }

    setWarning("");
    setLockedLocations([]);
  };

  // --------------------------------------------------
  // INDIVIDUAL REGION SELECTION
  // --------------------------------------------------

  const toggleSelectRegion = (id: string) => {
    setSelectedRegions((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );

    setWarning("");
    setLockedLocations([]);
  };

  // --------------------------------------------------
  // RUN SALARY CALCULATION
  // POST /SalaryLock/emp_slryrun_byRegion
  // --------------------------------------------------

  const handleRunSalaryCalculation = async () => {
    if (!month) {
      Swal.fire({
        icon: "warning",
        title: "Month required",
        text: "Please select a month.",
      });
      return;
    }

    if (!year) {
      Swal.fire({
        icon: "warning",
        title: "Year required",
        text: "Please select a year.",
      });
      return;
    }

    if (selectedRegions.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No region selected",
        text: "Select at least one region to run salary calculation.",
      });
      return;
    }

    if (!user?.Comp_Code || !user?.id) {
      Swal.fire({
        icon: "error",
        title: "User information missing",
        text: "Company or user information is not available. Please login again.",
      });
      return;
    }

    try {
      setLoading(true);
      setWarning("");
      setLockedLocations([]);

      const payload = {
        MONTH: month,
        YEAR: year,
        region: selectedRegions,
        user_code: user.id,
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/SalaryLock/emp_slryrun_byRegion`,
        payload,
        {
          headers: apiHeaders,
        }
      );

      const data = response?.data;

      if (data?.lockedLocations) {
        setLockedLocations(
          Array.isArray(data.lockedLocations)
            ? data.lockedLocations
            : [data.lockedLocations]
        );
      }

      if (data?.warning) {
        setWarning(String(data.warning));
      }

      if (data?.message || data?.Message) {
        showSideAlert(
          getText(data?.message, data?.Message),
          data?.warning ? "warning" : "success"
        );
      } else {
        showSideAlert(
          "Salary calculation request processed successfully.",
          data?.warning ? "warning" : "success"
        );
      }

      setSelectedRegions([]);
      setMonth("");
      setYear("");

      // Show locked location information if returned by API
      if (
        data?.lockedLocations &&
        (Array.isArray(data.lockedLocations)
          ? data.lockedLocations.length > 0
          : true)
      ) {
        const lockedText = Array.isArray(data.lockedLocations)
          ? data.lockedLocations
              .map((item: any) =>
                typeof item === "object"
                  ? getText(
                      item?.loc_name,
                      item?.Region_Name,
                      item?.label,
                      item?.name,
                      item?.value
                    )
                  : String(item)
              )
              .filter(Boolean)
              .join(", ")
          : typeof data.lockedLocations === "object"
            ? getText(
                data.lockedLocations?.loc_name,
                data.lockedLocations?.Region_Name,
                data.lockedLocations?.label,
                data.lockedLocations?.name
              )
            : String(data.lockedLocations);

        if (lockedText) {
          await Swal.fire({
            icon: "warning",
            title: "Locked Locations",
            text: lockedText,
            confirmButtonText: "OK",
          });
        }
      }

      // Show API warning if returned
      if (data?.warning) {
        await Swal.fire({
          icon: "warning",
          title: "Calculation Warning",
          text: String(data.warning),
          confirmButtonText: "OK",
        });
      }
    } catch (error) {
      console.error("Salary Calculation API Error:", error);

      Swal.fire({
        icon: "error",
        title: "Execution Error",
        text: getApiError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-w-0 bg-[#f5f8fc] p-3 transition-colors dark:bg-[#0b1220] sm:p-4 lg:p-6">
      <HashloaderComponent isLoading={loading} />

      <div className="mx-auto min-w-0 max-w-[1800px] space-y-4">
        {/* PAGE HEADER */}
        <div className="min-w-0">
          <h1 className="text-[20px] font-bold leading-tight text-[#152b4b] dark:text-slate-100 sm:text-[23px]">
            Salary calculation by region
          </h1>

          <p className="mt-1 text-[12px] text-[#64748b] dark:text-slate-400 sm:text-[13px]">
            Run every branch mapped to a region in one pass. Regions with a blocked branch are flagged before the run.
          </p>
        </div>

        {/* MAIN GRID */}
        <div className="grid min-w-0 grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* LEFT SECTION */}
          <div className="min-w-0 space-y-4">
            {/* FILTER PANEL */}
            <div className="min-w-0 rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-colors dark:border-slate-800 dark:bg-slate-900 sm:p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
                {/* MONTH SELECT */}
                <div className="min-w-0">
                  <Eselect
                    title="MONTH"
                    redlabel="*"
                    name="month"
                    option={MONTHS}
                    initialValue={month}
                    handleInputChange={handleInputChange}
                    className="h-[41px] w-full"
                  />
                </div>

                {/* YEAR SELECT */}
                <div className="min-w-0">
                  <Eselect
                    title="YEAR"
                    name="year"
                    option={YEAR_OPTIONS}
                    initialValue={year}
                    handleInputChange={handleInputChange}
                    className="h-[41px] w-full"
                  />
                </div>
              </div>
            </div>

            {/* REGION LIST CONTAINER */}
            <div className="min-w-0 overflow-hidden rounded-xl border border-[#dce5f1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-colors dark:border-slate-800 dark:bg-slate-900">
              {/* LIST HEADER */}
              <div className="flex flex-col gap-3 border-b border-[#e8edf5] px-4 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={
                      filteredRegions.length > 0 &&
                      filteredRegions.every((reg) =>
                        selectedRegions.includes(reg.id)
                      )
                    }
                    onChange={toggleSelectAll}
                    disabled={filteredRegions.length === 0}
                    className="h-4 w-4 rounded border-[#dce5f1] text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800"
                  />

                  <span className="text-[13px] font-semibold text-[#152b4b] dark:text-slate-100">
                    Regions
                  </span>

                  <span className="text-[12px] text-[#64748b] dark:text-slate-400">
                    {selectedRegions.length} of {regions.length} selected
                  </span>
                </div>

                <div className="relative w-full sm:w-[220px]">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    placeholder="Search regions"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-[34px] w-full rounded-lg border border-[#dce5f1] bg-white pl-8 pr-3 text-[12px] text-[#152b4b] outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* REGION ROWS */}
              <div className="divide-y divide-[#e8edf5] dark:divide-slate-800">
                {filteredRegions.length > 0 ? (
                  filteredRegions.map((reg) => {
                    const isChecked = selectedRegions.includes(reg.id);

                    return (
                      <div
                        key={reg.id}
                        onClick={() => toggleSelectRegion(reg.id)}
                        className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                          isChecked
                            ? "bg-indigo-50/40 dark:bg-slate-800/40"
                            : ""
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectRegion(reg.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 shrink-0 rounded border-[#dce5f1] text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                          />

                          <span className="truncate text-[12px] font-semibold text-[#152b4b] dark:text-slate-100">
                            {reg.name}
                          </span>
                        </div>

                        <div className="flex shrink-0 items-center gap-4">
                          {reg.empCount !== undefined && (
                            <span className="text-[11px] text-[#64748b] dark:text-slate-400">
                              {reg.empCount} emp
                            </span>
                          )}

                          {reg.statusText && (
                            reg.statusType === "ready" ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                                <Check size={13} />
                                {reg.statusText}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                                <AlertTriangle
                                  size={13}
                                  className="shrink-0"
                                />
                                {reg.statusText}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex min-h-[150px] flex-col items-center justify-center px-4 py-8 text-center">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                      <Search size={18} className="text-slate-400" />
                    </div>

                    <p className="text-[13px] font-semibold text-[#152b4b] dark:text-slate-200">
                      {search.trim()
                        ? "No matching regions found"
                        : "No regions available"}
                    </p>

                    <p className="mt-1 text-[11px] text-[#64748b] dark:text-slate-400">
                      {search.trim()
                        ? "Try searching with a different region name."
                        : "Region data will appear here once it is loaded."}
                    </p>
                  </div>
                )}
              </div>

              {/* LIST FOOTER / ACTION */}
              <div className="flex flex-col gap-3 border-t border-[#e8edf5] p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[12px] font-medium text-[#152b4b] dark:text-slate-200">
                    {selectedRegions.length} region
                    {selectedRegions.length !== 1 ? "s" : ""} ·{" "}
                    {totalSelectedEmpCount} employees
                  </p>
                </div>

                <AButton
                  type="button"
                  onClick={handleRunSalaryCalculation}
                  disabled={loading || selectedRegions.length === 0}
                  className="inline-flex h-[40px] items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 text-[12px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Calculator size={16} />
                  Run salary calculation
                </AButton>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="min-w-0 space-y-4">
            {/* PRE-RUN CHECKLIST */}
            <div className="rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-colors dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-[#52627c] dark:text-slate-300">
                Pre-run checklist
              </h2>

              <div className="space-y-4">
                <ChecklistItem
                  title="Attendance calculated"
                  description="Paid days must exist for the month before salary runs."
                  icon={CalendarCheck}
                  iconBg="bg-indigo-50 dark:bg-indigo-500/15"
                  iconColor="text-indigo-600 dark:text-indigo-400"
                />

                <ChecklistItem
                  title="Deviations approved"
                  description="Only approved paid-day deviations are picked up."
                  icon={CheckCircle2}
                  iconBg="bg-sky-50 dark:bg-sky-500/15"
                  iconColor="text-sky-600 dark:text-sky-400"
                />

                <ChecklistItem
                  title="Deductions loaded"
                  description="Advances, EMIs and recoveries for the month are applied."
                  icon={Receipt}
                  iconBg="bg-purple-50 dark:bg-purple-500/15"
                  iconColor="text-purple-600 dark:text-purple-400"
                />

                <ChecklistItem
                  title="Attendance locked"
                  description="Recommended, so punches cannot move after the run."
                  icon={Lock}
                  iconBg="bg-amber-50 dark:bg-amber-500/10"
                  iconColor="text-amber-600 dark:text-amber-400"
                />
              </div>
            </div>

            {/* LAST RUNS */}
            <div className="rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-colors dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#52627c] dark:text-slate-300">
                Last runs
              </h2>

              <div className="flex min-h-[100px] flex-col items-center justify-center rounded-lg border border-dashed border-[#dce5f1] px-3 py-5 text-center dark:border-slate-700">
                <CalendarCheck
                  size={20}
                  className="mb-2 text-slate-400"
                />

                <p className="text-[12px] font-semibold text-[#152b4b] dark:text-slate-200">
                  No previous runs
                </p>

                <p className="mt-1 text-[11px] text-[#64748b] dark:text-slate-400">
                  Salary calculation history will appear here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
