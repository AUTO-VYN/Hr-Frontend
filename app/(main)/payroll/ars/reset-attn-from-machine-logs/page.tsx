"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import HashloaderComponent from "@/components/Templates/hashloader";
import {
  Search,
  Check,
  RotateCcw,
  AlertTriangle,
  Fingerprint,
  Eraser,
  ShieldCheck,
  Calculator,
  User,
  Calendar,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Helpers for formatting and dates                                   */
/* ------------------------------------------------------------------ */
function formatYYYYMMDD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

interface LocationItem {
  label: string;
  value: string;
  cleanName: string;
}

interface EmployeeItem {
  raw: any;
  value: string;
  code: string;
  name: string;
  branchTag: string;
  label: string;
}

export default function ResetAttnFromMachineLogsPage() {
  const user: any = useCurrentUser();
  const compcode = user?.Comp_Code;

  // Loading indicator
  const [isLoading, setIsLoading] = useState(false);

  // Locations & Employees data
  const [locationsList, setLocationsList] = useState<LocationItem[]>([]);
  const [employeesList, setEmployeesList] = useState<EmployeeItem[]>([]);

  // Selected arrays
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  // Search filters
  const [locSearch, setLocSearch] = useState("");
  const [empSearch, setEmpSearch] = useState("");

  // Dates
  const today = new Date();
  const pastMonth = new Date();
  pastMonth.setMonth(today.getMonth() - 1);

  const [dateFrom, setDateFrom] = useState<string>(formatYYYYMMDD(pastMonth));
  const [dateTo, setDateTo] = useState<string>(formatYYYYMMDD(today));

  // Date input refs for native picker trigger
  const dateFromRef = useRef<HTMLInputElement>(null);
  const dateToRef = useRef<HTMLInputElement>(null);

  /* ------------------------------------------------------------------ */
  /*  API 1: Fetch Master Locations                                      */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!compcode) return;
    const fetchMasterLocations = async () => {
      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/employee/masters`,
          {},
          { headers: { compcode } }
        );
        const locs: LocationItem[] = (response?.data?.data?.LOCATION || []).map((item: any) => {
          const rawVal = String(item.value);
          const rawLabel = String(item.label || item.value).trim();
          // Strip existing leading number prefix if present
          const stripped = rawLabel.replace(/^\d+\s*-\s*/, "").trim();
          // Ensure display has "1 - BRANCH - 1" format matching design screenshot
          const formattedLabel = `${rawVal} - ${stripped}`;
          return {
            value: rawVal,
            label: formattedLabel,
            cleanName: stripped,
          };
        });
        setLocationsList(locs);
      } catch (err) {
        console.error("Error fetching master locations:", err);
      }
    };
    fetchMasterLocations();
  }, [compcode]);

  /* ------------------------------------------------------------------ */
  /*  API 2: Fetch Employees when Locations change                       */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!compcode) return;
    if (selectedLocations.length === 0) {
      setEmployeesList([]);
      setSelectedEmployees([]);
      return;
    }

    const fetchEmployeesByLocation = async () => {
      setIsLoading(true);
      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/ars/findEmployeesByLocation`,
          { branch: selectedLocations },
          { headers: { compcode, name: user?.name } }
        );
        if (response.data?.success && Array.isArray(response.data?.Employees)) {
          const emps: EmployeeItem[] = response.data.Employees.map((e: any) => {
            const code = String(e.value || e.id || e.Emp_Code || e.EMP_CODE || "").trim();
            const fullName = String(e.label || e.name || e.EmpName || e.EMP_NAME || code).trim();
            // Remove code from name if label was formatted as "Name - Code"
            const cleanName = fullName.replace(new RegExp(`\\s*[·-]\\s*${code}$`, "i"), "").trim();
            // Determine branch tag
            const branchTag = e.branchName || e.Branch || e.branch || "";
            return {
              raw: e,
              value: code,
              code,
              name: cleanName,
              branchTag,
              label: `${cleanName} · ${code}`,
            };
          });
          setEmployeesList(emps);
          // Retain only selected employees that belong to the newly chosen branches
          setSelectedEmployees((prev) =>
            prev.filter((id) => emps.some((emp) => emp.value === id))
          );
        } else {
          setEmployeesList([]);
          setSelectedEmployees([]);
        }
      } catch (err) {
        console.error("Error fetching employees by location:", err);
        setEmployeesList([]);
        setSelectedEmployees([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployeesByLocation();
  }, [selectedLocations, compcode, user?.name]);

  /* ------------------------------------------------------------------ */
  /*  Location Selection & Filter                                        */
  /* ------------------------------------------------------------------ */
  const visibleLocations = useMemo(() => {
    const q = locSearch.trim().toLowerCase();
    if (!q) return locationsList;
    return locationsList.filter(
      (l) => l.label.toLowerCase().includes(q) || l.value.toLowerCase().includes(q)
    );
  }, [locationsList, locSearch]);

  const allLocSelected =
    visibleLocations.length > 0 &&
    visibleLocations.every((l) => selectedLocations.includes(l.value));

  const toggleAllLocations = () => {
    if (allLocSelected) {
      const visVals = new Set(visibleLocations.map((l) => l.value));
      setSelectedLocations((prev) => prev.filter((v) => !visVals.has(v)));
    } else {
      const set = new Set(selectedLocations);
      visibleLocations.forEach((l) => set.add(l.value));
      setSelectedLocations(Array.from(set));
    }
  };

  const toggleLocation = (val: string) => {
    setSelectedLocations((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  /* ------------------------------------------------------------------ */
  /*  Employee Selection & Filter                                        */
  /* ------------------------------------------------------------------ */
  const visibleEmployees = useMemo(() => {
    const q = empSearch.trim().toLowerCase();
    if (!q) return employeesList;
    return employeesList.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q) ||
        e.label.toLowerCase().includes(q)
    );
  }, [employeesList, empSearch]);

  const allEmpSelected =
    visibleEmployees.length > 0 &&
    visibleEmployees.every((e) => selectedEmployees.includes(e.value));

  const toggleAllEmployees = () => {
    if (allEmpSelected) {
      const visVals = new Set(visibleEmployees.map((e) => e.value));
      setSelectedEmployees((prev) => prev.filter((v) => !visVals.has(v)));
    } else {
      const set = new Set(selectedEmployees);
      visibleEmployees.forEach((e) => set.add(e.value));
      setSelectedEmployees(Array.from(set));
    }
  };

  const toggleEmployee = (val: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  /* ------------------------------------------------------------------ */
  /*  Date Preset Handlers                                               */
  /* ------------------------------------------------------------------ */
  const handlePresetThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setDateFrom(formatYYYYMMDD(firstDay));
    setDateTo(formatYYYYMMDD(lastDay));
  };

  const handlePresetLastMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    setDateFrom(formatYYYYMMDD(firstDay));
    setDateTo(formatYYYYMMDD(lastDay));
  };

  const handlePresetLast7Days = () => {
    const now = new Date();
    const past7 = new Date();
    past7.setDate(now.getDate() - 7);
    setDateFrom(formatYYYYMMDD(past7));
    setDateTo(formatYYYYMMDD(now));
  };

  const handleClearSelection = () => {
    setSelectedLocations([]);
    setSelectedEmployees([]);
    setLocSearch("");
    setEmpSearch("");
  };

  /* ------------------------------------------------------------------ */
  /*  EXECUTION: update() sequence matching exact backend logic         */
  /* ------------------------------------------------------------------ */
  const handleResetAttendance = async () => {
    if (selectedLocations.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Branch Selected",
        text: "Please select at least one branch to continue.",
      });
      return;
    }

    const targetEmpCodes =
      selectedEmployees.length > 0
        ? selectedEmployees
        : employeesList.map((e) => e.value);

    if (!targetEmpCodes || targetEmpCodes.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Employees Found",
        text: "No employees found in the selected branch(es) to reset.",
      });
      return;
    }

    if (!dateFrom || !dateTo) {
      Swal.fire({
        icon: "warning",
        title: "Missing Dates",
        text: "Please select both Date From and Date To.",
      });
      return;
    }

    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    const diffTime = toDate.getTime() - fromDate.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);

    if (diffDays < 0) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Date Range",
        text: "Date To cannot be earlier than Date From.",
      });
      return;
    }

    if (diffDays > 32) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Date Range",
        text: "The date difference cannot be more than 31 days.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const monthNum = toDate.getMonth() + 1;
      const yearNum = toDate.getFullYear();

      /* STEP 1: Verify dates against employee attendance range */
      const dateRangeRes = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/getOnlyFormattedDates`,
        {
          empcode: targetEmpCodes,
          month: monthNum,
          year: yearNum,
        },
        { headers: { compcode } }
      );

      const dateList: string[] = dateRangeRes?.data?.Dates || [];

      const formatToDDMMYYYY = (d: Date) => {
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      };

      const formattedFrom = formatToDDMMYYYY(fromDate);
      const formattedTo = formatToDDMMYYYY(toDate);

      if (!dateList.includes(formattedFrom) || !dateList.includes(formattedTo)) {
        setIsLoading(false);
        Swal.fire({
          icon: "warning",
          title: "Invalid Date Selection",
          text: "Selected dates must be within the employee's attendance range.",
        });
        return;
      }

      /* STEP 2: Attendance / Salary Lock Check */
      const checkDate = toDate.toISOString().split("T")[0];
      const lockStatusRes = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/attandancelockedOrNot`,
        {
          checkDate,
          selectedLocations: selectedLocations || [],
          regionCode: 1,
        },
        { headers: { compcode } }
      );

      const lockResult = lockStatusRes?.data;
      if (!lockResult?.Status) {
        setIsLoading(false);
        Swal.fire({
          icon: "error",
          title: "Attendance Locked",
          text: lockResult?.Message || "Salary is locked for this date.",
        });
        return;
      }

      /* STEP 3: Execute Raw Punch Re-Import */
      const updateRes = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/updateRawPunchImport `,
        {
          Emp_Id: targetEmpCodes,
          DATE_FROM: fromDate.toISOString().split("T")[0],
          DATE_TO: toDate.toISOString().split("T")[0],
        },
        { headers: { compcode } }
      );

      setIsLoading(false);
      const updateResult = updateRes?.data;
      if (updateResult?.Status) {
        Swal.fire({
          icon: "success",
          title: "Update Successful",
          text: updateResult.Message || "Raw punches successfully imported and updated.",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Update Failed",
          text: updateResult?.Message || "Could not update raw punch records.",
        });
      }
    } catch (error: any) {
      setIsLoading(false);
      console.error("Error in update:", error);
      const errorMsg =
        error?.response?.data?.Message || error?.message || "Error occurred while processing.";
      Swal.fire({
        icon: "error",
        title: "Error Occurred",
        text: String(errorMsg),
      });
    }
  };

  /* Helper to find branch label for employee */
  const getEmployeeBranchLabel = (emp: EmployeeItem) => {
    if (emp.branchTag) return emp.branchTag.toUpperCase();
    const locId = emp.raw?.branch || emp.raw?.branch_id;
    if (locId) {
      const match = locationsList.find((l) => l.value === String(locId));
      if (match) return match.cleanName.toUpperCase();
    }
    if (selectedLocations.length === 1) {
      const match = locationsList.find((l) => l.value === selectedLocations[0]);
      if (match) return match.cleanName.toUpperCase();
    }
    return "BRANCH - 1";
  };

  /* ------------------------------------------------------------------ */
  /*  Render View - EXACT TO SCREENSHOT                                  */
  /* ------------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] px-7 py-6 md:px-8 md:py-7 font-sans">
      {/* Header section */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-[#0F172A] dark:text-[#F1F5F9]">
          Reset attendance from machine logs
        </h1>
        <p className="text-[13px] text-[#64748B] dark:text-[#94A3B8] mt-1 font-normal leading-relaxed">
          Rebuild punches straight from the biometric machine for the branches and dates you choose. Manual corrections in that window are discarded.
        </p>
      </div>

      {/* Main Grid: Left Column + Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_370px] gap-5 items-start">
        {/* Left Column */}
        <div className="flex flex-col gap-5">
          {/* Top Row: Locations and Employees Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Locations */}
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-4 flex flex-col">
              {/* Header: Locations · X of Y selected */}
              <div className="flex items-center gap-2 mb-3">
                <label className="flex items-center gap-2 cursor-pointer select-none" onClick={toggleAllLocations}>
                  <span
                    className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${
                      allLocSelected
                        ? "bg-[#4F46E5] border-[#4F46E5] text-white"
                        : "bg-white dark:bg-[#0E1524] border-[#CBD5E1] dark:border-[#374151] text-transparent"
                    }`}
                  >
                    {allLocSelected && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span className="text-[13.5px] font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
                    Locations
                  </span>
                </label>
                <span className="text-[12px] text-[#94A3B8] dark:text-[#64748B] font-normal ml-1">
                  {selectedLocations.length === 0
                    ? "None selected"
                    : `${selectedLocations.length} of ${locationsList.length} selected`}
                </span>
              </div>

              {/* Search input with clean focus ring */}
              <div className="relative flex items-center mb-3">
                <Search size={14} className="absolute left-3 text-[#94A3B8] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search branches"
                  value={locSearch}
                  onChange={(e) => setLocSearch(e.target.value)}
                  className="w-full bg-white dark:bg-[#0E1524] border border-[#E2E8F0] dark:border-[#1F2937] rounded-lg pl-8 pr-3 py-1.5 text-[12.5px] text-[#0F172A] dark:text-[#E7ECF3] outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/30 transition-all placeholder:text-[#94A3B8]"
                />
              </div>

              {/* Two column checklist with selected row pill highlight */}
              <div
                className="h-[290px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#CBD5E1 transparent" }}
              >
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                  {visibleLocations.map((loc) => {
                    const isChecked = selectedLocations.includes(loc.value);
                    return (
                      <div
                        key={loc.value}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer select-none transition-colors ${
                          isChecked
                            ? "bg-[#EEF2FF] dark:bg-indigo-950/40 text-[#4F46E5] dark:text-indigo-400 font-medium"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-[#334155] dark:text-[#CBD5E1]"
                        }`}
                        onClick={() => toggleLocation(loc.value)}
                      >
                        <span
                          className={`w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${
                            isChecked
                              ? "bg-[#4F46E5] border-[#4F46E5] text-white"
                              : "bg-white dark:bg-[#0E1524] border-[#CBD5E1] dark:border-[#374151] text-transparent"
                          }`}
                        >
                          {isChecked && <Check size={10} strokeWidth={3} />}
                        </span>
                        <span className="text-[12.5px] truncate" title={loc.label}>
                          {loc.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {visibleLocations.length === 0 && (
                  <div className="py-12 text-center text-[12px] text-[#94A3B8]">
                    {locationsList.length === 0 ? "Loading locations..." : "No branches match your search."}
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Employees */}
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-4 flex flex-col">
              {/* Header: Employees · Whole branch / X of Y selected */}
              <div className="flex items-center gap-2 mb-3">
                <label
                  className="flex items-center gap-2 cursor-pointer select-none"
                  onClick={employeesList.length > 0 ? toggleAllEmployees : undefined}
                >
                  <span
                    className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${
                      allEmpSelected && employeesList.length > 0
                        ? "bg-[#4F46E5] border-[#4F46E5] text-white"
                        : "bg-white dark:bg-[#0E1524] border-[#CBD5E1] dark:border-[#374151] text-transparent"
                    }`}
                  >
                    {allEmpSelected && employeesList.length > 0 && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span className="text-[13.5px] font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
                    Employees
                  </span>
                </label>
                <span className="text-[12px] text-[#94A3B8] dark:text-[#64748B] font-normal ml-1">
                  {selectedLocations.length === 0
                    ? "Pick a branch first"
                    : selectedEmployees.length === 0
                    ? "Whole branch"
                    : `${selectedEmployees.length} of ${employeesList.length} selected`}
                </span>
              </div>

              {/* Search input with purple focus border matching screenshot */}
              <div className="relative flex items-center mb-3">
                <Search size={14} className="absolute left-3 text-[#94A3B8] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search code or name"
                  value={empSearch}
                  disabled={selectedLocations.length === 0}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  className="w-full bg-white dark:bg-[#0E1524] border border-[#E2E8F0] dark:border-[#1F2937] rounded-lg pl-8 pr-3 py-1.5 text-[12.5px] text-[#0F172A] dark:text-[#E7ECF3] outline-none focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/30 transition-all placeholder:text-[#94A3B8] disabled:opacity-60"
                />
              </div>

              {/* Employees list: SINGLE-COLUMN VERTICAL LIST with right-aligned branch tag */}
              <div
                className="h-[290px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent"
                style={{ scrollbarWidth: "thin", scrollbarColor: "#CBD5E1 transparent" }}
              >
                {selectedLocations.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <div className="w-11 h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1524] flex items-center justify-center text-[#94A3B8] dark:text-[#64748B] mb-2.5 shadow-2xs">
                      <User size={18} />
                    </div>
                    <div className="text-[13.5px] font-semibold text-[#0F172A] dark:text-[#F1F5F9] mb-1">
                      Select branches first
                    </div>
                    <div className="text-[11.5px] text-[#94A3B8] dark:text-[#64748B] leading-relaxed max-w-[270px]">
                      Employees load once you pick at least one branch. Leave this list empty to reset the whole branch.
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {visibleEmployees.map((emp) => {
                      const isChecked = selectedEmployees.includes(emp.value);
                      const branchTag = getEmployeeBranchLabel(emp);
                      return (
                        <div
                          key={emp.value}
                          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer select-none transition-colors ${
                            isChecked
                              ? "bg-[#EEF2FF] dark:bg-indigo-950/40 text-[#4F46E5] dark:text-indigo-400 font-medium"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-[#334155] dark:text-[#CBD5E1]"
                          }`}
                          onClick={() => toggleEmployee(emp.value)}
                        >
                          <span
                            className={`w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors ${
                              isChecked
                                ? "bg-[#4F46E5] border-[#4F46E5] text-white"
                                : "bg-white dark:bg-[#0E1524] border-[#CBD5E1] dark:border-[#374151] text-transparent"
                            }`}
                          >
                            {isChecked && <Check size={10} strokeWidth={3} />}
                          </span>
                          <span className="text-[13px] font-medium truncate">
                            {emp.name} · {emp.code}
                          </span>
                          <span className="ml-auto text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase shrink-0">
                            {branchTag}
                          </span>
                        </div>
                      );
                    })}
                    {visibleEmployees.length === 0 && (
                      <div className="py-12 text-center text-[12px] text-[#94A3B8]">
                        {employeesList.length === 0
                          ? "No employees found for this branch."
                          : "No employees match your search."}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Card: Date Range & Actions */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex items-end gap-3 flex-wrap">
              {/* DATE FROM */}
              <div className="flex flex-col gap-1.5 w-44">
                <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] tracking-wider uppercase">
                  DATE FROM
                </span>
                <div
                  className="relative flex items-center justify-between h-[42px] px-3.5 border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl bg-white dark:bg-[#0E1524] cursor-pointer hover:border-slate-400 transition-colors"
                  onClick={() => dateFromRef.current?.showPicker?.()}
                >
                  <span className="text-[13px] text-[#1E293B] dark:text-[#E7ECF3] select-none font-normal">
                    {formatDisplayDate(dateFrom)}
                  </span>
                  <Calendar size={14} className="text-[#64748B] shrink-0" />
                  <input
                    ref={dateFromRef}
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="absolute inset-0 opacity-0 pointer-events-none"
                  />
                </div>
              </div>

              {/* DATE TO */}
              <div className="flex flex-col gap-1.5 w-44">
                <span className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] tracking-wider uppercase">
                  DATE TO
                </span>
                <div
                  className="relative flex items-center justify-between h-[42px] px-3.5 border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl bg-white dark:bg-[#0E1524] cursor-pointer hover:border-slate-400 transition-colors"
                  onClick={() => dateToRef.current?.showPicker?.()}
                >
                  <span className="text-[13px] text-[#1E293B] dark:text-[#E7ECF3] select-none font-normal">
                    {formatDisplayDate(dateTo)}
                  </span>
                  <Calendar size={14} className="text-[#64748B] shrink-0" />
                  <input
                    ref={dateToRef}
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="absolute inset-0 opacity-0 pointer-events-none"
                  />
                </div>
              </div>

              {/* Presets buttons inline */}
              <div className="flex items-center gap-2 mb-0.5 ml-1">
                <button
                  type="button"
                  onClick={handlePresetThisMonth}
                  className="h-[42px] px-4 border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#0E1524] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] text-[#475569] dark:text-[#94A3B8] text-[12.5px] font-medium rounded-xl cursor-pointer transition-colors whitespace-nowrap"
                >
                  This month
                </button>
                <button
                  type="button"
                  onClick={handlePresetLastMonth}
                  className="h-[42px] px-4 border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#0E1524] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] text-[#475569] dark:text-[#94A3B8] text-[12.5px] font-medium rounded-xl cursor-pointer transition-colors whitespace-nowrap"
                >
                  Last month
                </button>
                <button
                  type="button"
                  onClick={handlePresetLast7Days}
                  className="h-[42px] px-4 border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#0E1524] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] text-[#475569] dark:text-[#94A3B8] text-[12.5px] font-medium rounded-xl cursor-pointer transition-colors whitespace-nowrap"
                >
                  Last 7 days
                </button>
              </div>
            </div>

            <div className="h-px bg-[#F1F5F9] dark:bg-[#1F2937] my-4" />

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                {selectedLocations.length === 0 ? (
                  <span className="text-[12.5px] text-[#EF4444] font-normal">
                    Select at least one branch to continue
                  </span>
                ) : (
                  <span className="text-[12px] text-[#059669] dark:text-[#10B981] font-medium">
                    Ready to reset: {selectedLocations.length} branch(es) ·{" "}
                    {selectedEmployees.length > 0
                      ? `${selectedEmployees.length} employee(s)`
                      : "all branch employees"}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="h-[40px] px-5 border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#0E1524] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] text-[#334155] dark:text-[#CBD5E1] text-[13px] font-semibold rounded-xl cursor-pointer transition-colors"
                >
                  Clear selection
                </button>

                <button
                  type="button"
                  onClick={handleResetAttendance}
                  disabled={selectedLocations.length === 0 || isLoading}
                  className="h-[40px] px-5 flex items-center gap-2 bg-[#475569] hover:bg-[#334155] text-white text-[13px] font-semibold rounded-xl cursor-pointer transition-colors disabled:opacity-55 disabled:cursor-not-allowed shadow-xs"
                >
                  <RotateCcw size={14} className={isLoading ? "animate-spin" : ""} />
                  <span>Reset attendance</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Card 1: What a reset does */}
          <div className="bg-white dark:bg-[#111827] border-[1.5px] border-[#FDE68A] dark:border-[#92400E] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#D97706] tracking-wider mb-3.5 uppercase">
              <AlertTriangle size={15} className="text-[#D97706]" />
              <span>WHAT A RESET DOES</span>
            </div>

            <div className="flex flex-col gap-3.5">
              {/* Point 1 */}
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#F5F3FF] dark:bg-purple-950/50 text-[#8B5CF6] dark:text-[#A78BFA] flex items-center justify-center shrink-0 mt-0.5">
                  <Fingerprint size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
                    Punches rebuilt from the machine
                  </div>
                  <div className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-0.5 leading-snug font-normal">
                    In and out times come straight from the biometric device logs.
                  </div>
                </div>
              </div>

              {/* Point 2 */}
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#FFF1F2] dark:bg-rose-950/50 text-[#F43F5E] dark:text-[#FB7185] flex items-center justify-center shrink-0 mt-0.5">
                  <Eraser size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
                    Manual entries discarded
                  </div>
                  <div className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-0.5 leading-snug font-normal">
                    Mispunch corrections and bulk punches in the window are removed.
                  </div>
                </div>
              </div>

              {/* Point 3 */}
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#ECFDF5] dark:bg-emerald-950/50 text-[#10B981] dark:text-[#34D399] flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
                    Leave and comp off untouched
                  </div>
                  <div className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-0.5 leading-snug font-normal">
                    Approved leave and comp-off balances are not recalculated here.
                  </div>
                </div>
              </div>

              {/* Point 4 */}
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#FFFBEB] dark:bg-amber-950/50 text-[#F59E0B] dark:text-[#FBBF24] flex items-center justify-center shrink-0 mt-0.5">
                  <Calculator size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
                    Run attendance calculation after
                  </div>
                  <div className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-0.5 leading-snug font-normal">
                    Statuses and paid days only update once calculation is re-run.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Recent Resets */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            <div className="text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] tracking-wider mb-3 uppercase">
              RECENT RESETS
            </div>

            <div className="flex flex-col gap-2.5">
              {/* Item 1 */}
              <div className="border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-[#0F172A] dark:text-[#F1F5F9] truncate">
                    Branch - 1, Branch - 2 · 01–15...
                  </span>
                  <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#D1FAE5] dark:bg-emerald-950/80 text-[#059669] dark:text-[#34D399] whitespace-nowrap">
                    Completed
                  </span>
                </div>
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1 font-normal">
                  3,412 punches rebuilt · by Anand K.
                </div>
              </div>

              {/* Item 2 */}
              <div className="border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-[#0F172A] dark:text-[#F1F5F9] truncate">
                    Branch - 34 · 20–28 Jun 2026
                  </span>
                  <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF3C7] dark:bg-amber-950/80 text-[#D97706] dark:text-[#FBBF24] whitespace-nowrap">
                    Partial
                  </span>
                </div>
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1 font-normal">
                  Machine offline for 2 days · partial
                </div>
              </div>

              {/* Item 3 */}
              <div className="border border-[#E2E8F0] dark:border-[#1F2937] rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-semibold text-[#0F172A] dark:text-[#F1F5F9] truncate">
                    All branches · 01–31 May 2026
                  </span>
                  <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#F1F5F9] dark:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
                    Cancelled
                  </span>
                </div>
                <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1 font-normal">
                  Cancelled before commit
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
