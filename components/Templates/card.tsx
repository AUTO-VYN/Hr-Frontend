"use client";

import React, { useState } from "react";
import { ArrowRight } from "lucide-react";
import EmployeeProfileDialog from "./EmployeeProfileDialog";

const formatDate = (dateString: any) => {
  if (!dateString || dateString === "null" || dateString === "—") return "";
  try {
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
      const day = d.getDate().toString().padStart(2, "0");
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    }
  } catch {}
  return String(dateString);
};

type CardViewProps = {
  data: any[];
  onCardDoubleClick: (employee: any) => void;
  empView?: "ALL" | "ACTIVE" | "LEFT" | string;
  totalCount?: number;
  setEmpView?: (newView: "ALL" | "ACTIVE" | "LEFT" | string) => void;
  globalSearch?: string;
  setGlobalSearch?: (value: string) => void;
  isLoading?: boolean;
};

const CardView = ({
  data = [],
  onCardDoubleClick,
  empView = "ACTIVE",
  totalCount,
  globalSearch,
  setGlobalSearch,
  isLoading = false,
}: CardViewProps) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getAvatarColors = (name: any) => {
    if (!name || name === "N/A") {
      return { bg: "#EEF2FF", text: "#4338CA" };
    }
    const palettes = [
      { bg: "#EEF2FF", text: "#4F46E5" }, // Indigo / Blue
      { bg: "#ECFDF5", text: "#059669" }, // Emerald / Green
      { bg: "#FEF3C7", text: "#D97706" }, // Amber / Yellow
      { bg: "#FEE2E2", text: "#DC2626" }, // Rose / Red
      { bg: "#F3E8FF", text: "#7C3AED" }, // Purple
      { bg: "#E0F2FE", text: "#0284C7" }, // Sky
      { bg: "#FCE7F3", text: "#DB2777" }, // Pink
      { bg: "#EDE9FE", text: "#6366F1" }, // Violet
      { bg: "#CCFBF1", text: "#0D9488" }, // Teal
      { bg: "#FFEDD5", text: "#EA580C" }, // Orange
    ];
    const hash = String(name)
      .split("")
      .reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    return palettes[hash % palettes.length];
  };

  const getInitials = (name: any) => {
    if (!name || name === "N/A" || name === "—") return "??";
    const parts = String(name).trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return String(name).substring(0, 2).toUpperCase();
  };

  const handleViewProfile = (employee: any) => {
    setSelectedEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedEmployee(null);
  };

  return (
    <div>
      {/* Top Bar: Showing Badge + Search Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        {/* Active Filter Badge */}
        <div
          className={[
            "inline-flex items-center gap-2 text-white px-4 py-2 rounded-xl shadow-2xs text-sm font-medium w-fit",
            empView === "ALL"
              ? "bg-[#4338CA]"
              : empView === "ACTIVE"
              ? "bg-gradient-to-r from-[#1f3b73] to-[#2a5298]"
              : "bg-gradient-to-r from-[#B91C1C] to-[#EF4444]",
          ].join(" ")}
        >
          <span className="opacity-90">Showing:</span>
          <span className="font-bold text-base">
            {empView === "ALL" ? "All" : empView === "ACTIVE" ? "Active" : "Left"}
          </span>
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold min-w-[24px] text-center">
            {totalCount !== undefined ? totalCount : data?.length || 0}
          </span>
          <span className="opacity-90">Employee</span>
        </div>

        {/* Search Input */}
        {setGlobalSearch !== undefined && (
          <div className="relative w-full sm:w-72 sm:ml-auto">
            <input
              type="text"
              placeholder="Search by name or code..."
              value={globalSearch || ""}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full h-10 px-4 pl-10 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#0B1220] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4338CA] text-sm shadow-2xs"
            />
            <svg
              className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        )}
      </div>

      {!data || data.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-12 text-center text-slate-400 dark:border-slate-800 dark:bg-[#0B1220] font-medium text-sm">
          No employees found
        </div>
      ) : (
        /* Employee Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {data.map((employee, index) => {
            const name =
              employee?.EMPLOYEENAME ||
              employee?.Employee_Name ||
              employee?.name ||
              "N/A";
            const empCode =
              employee?.EMPCODE ||
              employee?.EmpCode ||
              employee?.empcode ||
              employee?.UTD ||
              "—";
            const designation =
              employee?.EMPLOYEEDESIGNATION ||
              employee?.designation ||
              employee?.Designation ||
              "";
            const department =
              employee?.Department ||
              employee?.department ||
              employee?.SECTION ||
              "";
            const location =
              employee?.Location ||
              employee?.location ||
              employee?.region1 ||
              "";
            const joinedDate = formatDate(
              employee?.JOININGDATE || employee?.Joining_Date
            );

            const isLeft =
              Boolean(employee?.LASTWOR_NEWDATE) &&
              employee?.LASTWOR_NEWDATE !== "null" &&
              employee?.LASTWOR_NEWDATE !== "—";
            const isActive = !isLeft;

            const colors = getAvatarColors(name);
            const initials = getInitials(name);
            const isSelected = selectedCardId === (empCode || index);

            return (
              <div
                key={empCode || index}
                onClick={() => setSelectedCardId(empCode || index)}
                onDoubleClick={() => onCardDoubleClick?.(employee)}
                className={[
                  "group relative rounded-2xl border bg-white p-5 shadow-2xs transition-all cursor-pointer flex flex-col justify-between",
                  "dark:bg-[#0B1220]",
                  isSelected
                    ? "border-[#6366F1] ring-1 ring-[#6366F1]/50 shadow-sm"
                    : "border-slate-200/90 hover:border-indigo-300 dark:border-slate-800 dark:hover:border-slate-700 hover:shadow-sm",
                ].join(" ")}
              >
                <div>
                  {/* Top Row: Avatar + Name/Code + Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar Circle with Initials */}
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 select-none shadow-2xs"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {initials}
                      </div>

                      {/* Name & EmpCode */}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-[15px] leading-snug truncate">
                          {name}
                        </h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5 tracking-wide truncate">
                          {empCode}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={[
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 select-none",
                        isActive
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100/90 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40"
                          : "bg-red-50 text-red-600 border border-red-100/90 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/40",
                      ].join(" ")}
                    >
                      {isActive ? "Active" : "Left"}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-100 dark:border-slate-800/80 my-4" />

                  {/* Details List */}
                  <div className="space-y-2 text-sm">
                    {/* Designation */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 dark:text-slate-500 font-normal shrink-0">
                        Designation
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-right">
                        {designation ? (
                          designation
                        ) : (
                          <span className="text-slate-400 font-normal select-none">
                            —
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Department */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 dark:text-slate-500 font-normal shrink-0">
                        Department
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-right">
                        {department ? (
                          department
                        ) : (
                          <span className="text-slate-400 font-normal select-none">
                            —
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Location */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 dark:text-slate-500 font-normal shrink-0">
                        Location
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-right">
                        {location ? (
                          location
                        ) : (
                          <span className="text-slate-400 font-normal select-none">
                            —
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Joined */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 dark:text-slate-500 font-normal shrink-0">
                        Joined
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-right">
                        {joinedDate ? (
                          joinedDate
                        ) : (
                          <span className="text-slate-400 font-normal select-none">
                            —
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Button: Open Record */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewProfile(employee);
                  }}
                  className="mt-5 w-full h-10 rounded-xl border border-indigo-100 dark:border-indigo-950/60 bg-white dark:bg-slate-900/40 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/50 text-[#4338CA] dark:text-indigo-400 font-semibold text-sm inline-flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer group-hover:border-indigo-200 dark:group-hover:border-indigo-900"
                >
                  <span>Open record</span>
                  <ArrowRight className="h-4 w-4 text-[#4338CA] dark:text-indigo-400 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Profile Dialog */}
      {isDialogOpen && (
        <EmployeeProfileDialog
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
          employee={selectedEmployee}
        />
      )}
    </div>
  );
};

export default CardView;