"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import EmployeeProfileDialog from "./EmployeeProfileDialog";

const formatDate = (dateString: any) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

type CardViewProps = {
  data: any[];
  onCardDoubleClick: (employee: any) => void;
  empView: "ALL" | "ACTIVE" | "LEFT" | string;
  totalCount: number;
  setEmpView: (newView: "ALL" | "ACTIVE" | "LEFT" | string) => void;
  globalSearch: string;
  setGlobalSearch: (value: string) => void;
  isLoading: boolean;
};

const CardView = ({
  data,
  onCardDoubleClick,
  empView,
  totalCount,
  setEmpView,
  globalSearch,
  setGlobalSearch,
  isLoading,
}: CardViewProps) => {
  console.log(totalCount, "totalCount");

  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getAvatarColors = (name: any) => {
    if (!name || name === "N/A") {
      return { bg: "#E8F0FE", text: "#1A56DB" };
    }
    const palettes = [
      { bg: "#E8F0FE", text: "#1A56DB" },
      { bg: "#ECFDF5", text: "#059669" },
      { bg: "#FEF3C7", text: "#D97706" },
      { bg: "#FEE2E2", text: "#DC2626" },
      { bg: "#E0E7FF", text: "#4F46E5" },
      { bg: "#F3E8FF", text: "#7C3AED" },
      { bg: "#FCE7F3", text: "#DB2777" },
      { bg: "#CCFBF1", text: "#0D9488" },
      { bg: "#FFEDD5", text: "#EA580C" },
      { bg: "#E4E4E7", text: "#52525B" },
      { bg: "#DBEAFE", text: "#2563EB" },
      { bg: "#D1FAE5", text: "#15803D" },
    ];
    const hash = String(name)
      .split("")
      .reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    return palettes[hash % palettes.length];
  };

  const getInitials = (name: any) => {
    if (!name || name === "N/A") return "??";
    const parts = String(name).trim().split(/\s+/);
    if (parts.length >= 2)
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
      {/* Filter Buttons and Active Filter Info */}
      <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 mb-4">
        {/* Active Filter Badge */}
        <div
          className={[
            "flex items-center gap-2 text-white px-4 py-2 rounded-lg shadow-md",
            empView === "ALL"
              ? "bg-[#4338CA]"
              : empView === "ACTIVE"
              ? "bg-gradient-to-r from-[#1f3b73] to-[#2a5298]"
              : "bg-gradient-to-r from-[#B91C1C] to-[#EF4444]",
          ].join(" ")}
        >
          <span className="text-sm opacity-90">Showing:</span>
          <span className="font-bold text-lg">
            {empView === "ALL" ? "All" : empView === "ACTIVE" ? "Active" : "Left"}
          </span>
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm font-bold min-w-[28px] text-center">
            {data?.length || 0}
          </span>
          <span className="text-sm opacity-90"> Employee</span>
        </div>

        {/* Search Input */}
        <div className="ml-auto w-full sm:w-64 mt-2 sm:mt-0">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or code..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-[#D0D5DD] dark:border-gray-600 rounded-lg bg-white dark:bg-black text-[#1A1A1A] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1A56DB]"
            />
            <svg
              className="absolute left-3 top-3 w-4 h-4 text-gray-400"
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
        </div>
      </div>

      {/* Employee Cards Grid */}
      {data?.length === 0 ? (
        <div className="text-center py-12 text-[#757575] dark:text-gray-400">
          No employees found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {data.map((employee, index) => {
            const colors = getAvatarColors(employee?.EMPLOYEENAME);
            const initials = getInitials(employee?.EMPLOYEENAME);

            return (
              <div
                key={index}
                className="bg-white dark:bg-black rounded-lg border border-[#E5E7EB] dark:border-gray-700 p-4 hover:shadow-lg transition-shadow duration-200 cursor-pointer"
                onDoubleClick={() => onCardDoubleClick(employee)}
              >
                {/* Top Section */}
                <div className="flex justify-between items-start mb-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${
                      !employee?.LASTWOR_NEWDATE
                        ? "bg-[#D1FAE5] text-[#065F46]"
                        : "bg-[#FEE2E2] text-[#DC2626]"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        !employee?.LASTWOR_NEWDATE
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                    />
                    {!employee?.LASTWOR_NEWDATE ? "Active" : "Left"}
                  </span>

                  {/* Avatar */}
                  <div className="w-20 h-20 rounded-full overflow-hidden">
                    {employee?.photoUrl ? (
                      <img
                        src={employee.photoUrl}
                        alt={employee?.EMPLOYEENAME}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-xl font-bold"
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.text,
                        }}
                      >
                        {initials}
                      </div>
                    )}
                  </div>

                  {/* Employee Type */}
                  <span
                    className={`px-2.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ${
                      employee?.EmployeeType?.toUpperCase() === "REGULAR"
                        ? "bg-[#D1FAE5] text-[#065F46] dark:bg-[#064E3B] dark:text-[#6EE7B7]"
                        : employee?.EmployeeType?.toUpperCase() === "APPRENTICE"
                        ? "bg-[#FEF3C7] text-[#92400E] dark:bg-[#78350F] dark:text-[#FCD34D]"
                        : "bg-[#E5E7EB] text-[#374151] dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {employee?.EmployeeType || "Regular"}
                  </span>
                </div>

                {/* Name & Designation */}
                <div className="text-center mb-3">
                  <h3 className="font-bold text-[#1A1A1A] dark:text-white text-base truncate">
                    {employee?.EMPLOYEENAME || "N/A"}
                  </h3>
                  <p className="text-sm text-[#6B7280] dark:text-gray-300 mt-1 truncate">
                    {employee?.EMPLOYEEDESIGNATION || "N/A"}
                  </p>
                </div>

                {/* Details */}
                <div className="space-y-1.5 mb-3">
                  <p className="text-sm text-[#6B7280] dark:text-gray-400 truncate flex items-center gap-1.5">
                    <span className="text-[#9CA3AF]">📍</span>
                    {employee?.Location || "N/A"}
                  </p>
                  <p className="text-sm text-[#6B7280] dark:text-gray-400 truncate flex items-center gap-1.5">
                    <span className="text-[#9CA3AF]">🏢</span>
                    {employee?.Department || "Account"}
                  </p>
                  <p className="text-sm text-[#6B7280] dark:text-gray-400 flex items-center gap-1.5">
                    <span className="text-[#9CA3AF]">📅</span>
                    Joined {formatDate(employee?.JOININGDATE)}
                  </p>
                </div>

                <div className="border-t border-[#E5E7EB] dark:border-gray-700 mb-3"></div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewProfile(employee);
                  }}
                  className="text-[#2563EB] border-[#2563EB] hover:bg-[#EFF6FF] dark:hover:bg-[#172554] w-full"
                >
                  <span className="mr-1">👤</span> View profile
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <EmployeeProfileDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        employee={selectedEmployee}
      />
    </div>
  );
};

export default CardView;