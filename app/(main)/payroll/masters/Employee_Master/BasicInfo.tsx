"use client";

import React from "react";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import { Button } from "@/components/ui/button";
import { Building2, BadgeCheck, GitFork, User, MapPin, Briefcase, Building, Globe } from "lucide-react";

import CustomSelectSearch from "@/components/atoms/Select";

type Props = {
  user: any;
  formData: any;
  SaveDisable: boolean;
  IsGenerate: boolean;
  empcode: any[];
  MrOptions: any[];
  GenderOptions: any[];
  Type: any[];
  SalRegionoption: any[];
  CHANEELOPTION: any[];
  CLUSTEROPTION: any[];
  locationnoption: any[];
  SECTIONoption: any[];
  divisionoption: any[];
  EMPLOYEEDESIGNATIONoption: any[];
  mandatorySet?: Set<string>;
  handleEmpChange: (name: string, value: any) => void;
  handleInputChange: (name: string, value: any) => void;
  handleLocationChange: (name: string, value: any) => void;
  Generatecode: () => void;
  profileSrc: any;
  handleFileChange: (e: any) => void;
};

// ============ FALLBACK REQUIRED FIELDS (if mandatorySet is empty) ============
const FALLBACK_REQUIRED_FIELDS = [
  "EMPCODE",
  "EMPFIRSTNAME",
  "EMPLASTNAME",
  "TITLE",
  "GENDER",
  "EmpType",
  "EMPLOYEEDESIGNATION",
  "LOCATION",
  "DIVISION",
  "Sal_Region",
  "SECTION",
  "CHANNEL",
  "CLUSTER",
];

// ============ HELPER FUNCTIONS ============

const getTotalFieldCount = (formData: any) => {
  const empMst = formData?.EmpMst || {};
  return Object.keys(empMst).length;
};

const getFilledFieldCount = (formData: any) => {
  const empMst = formData?.EmpMst || {};

  // ✅ Keys that are ALWAYS present with default values - NEVER count these
  const ALWAYS_PRESENT_KEYS = [
    "Export_Type",        // default: 1
    "ServerId",           // default: 1
    "InBudget",           // default: false
    "Induction_Done",     // default: false
    "ExitInterview_Done", // default: false
    "Created_by",         // default: "admin"
  ];

  return Object.keys(empMst).filter((key) => {
    // Skip always-present keys
    if (ALWAYS_PRESENT_KEYS.includes(key)) return false;

    const val = empMst[key];

    // ✅ Skip empty/default values
    if (val === null || val === undefined) return false;
    if (val === "") return false;
    if (val === false) return false;
    if (typeof val === "number" && val === 0) return false;
    if (typeof val === "number" && val === 1) return false;
    if (typeof val === "string" && val.trim() === "") return false;

    return true;
  }).length;
};

const getCompletionPercentage = (formData: any) => {
  const total = getTotalFieldCount(formData);
  if (total === 0) return 0;
  const filled = getFilledFieldCount(formData);
  return Math.min(100, Math.round((filled / total) * 100));
};

const getRequiredFieldsLeft = (mandatorySet: Set<string> | undefined, formData: any) => {
  const fieldsToCheck = mandatorySet && mandatorySet.size > 0
    ? Array.from(mandatorySet)
    : FALLBACK_REQUIRED_FIELDS;

  let count = 0;
  fieldsToCheck.forEach((key) => {
    const val = formData?.EmpMst?.[key];
    if (val === null || val === undefined || val?.toString().trim() === "") {
      count++;
    }
  });
  return count;
};

const getInitials = (firstName: string, lastName: string) => {
  if (!firstName && !lastName) return "";
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
};

export default function EmployeeIdentitySection({
  user,
  formData,
  SaveDisable,
  IsGenerate,
  empcode,
  MrOptions,
  GenderOptions,
  Type,
  SalRegionoption,
  CHANEELOPTION,
  CLUSTEROPTION,
  locationnoption,
  SECTIONoption,
  divisionoption,
  EMPLOYEEDESIGNATIONoption,
  mandatorySet,
  handleEmpChange,
  handleInputChange,
  handleLocationChange,
  Generatecode,
  profileSrc,
  handleFileChange,
}: Props) {
  // ============ COMPUTED VALUES ============
  const empFirstName = formData?.EmpMst?.EMPFIRSTNAME || "";
  const empLastName = formData?.EmpMst?.EMPLASTNAME || "";
  const empName = `${empFirstName} ${empLastName}`.trim();

  // Dynamic calculations
  const totalFields = getTotalFieldCount(formData);
  const filledTotal = getFilledFieldCount(formData);
  const completenessPercent = getCompletionPercentage(formData);
  const requiredLeft = getRequiredFieldsLeft(mandatorySet, formData);
  const isReady = requiredLeft === 0;
  const initials = getInitials(empFirstName, empLastName);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-12 gap-6">
        {/* IDENTIFICATION CARD */}
        <div className="col-span-12 xl:col-span-6">
          <div className="bg-white dark:bg-black border border-[#E6E8EF] dark:border-[#2A2F3A] rounded-2xl overflow-visible">
            <div className="flex items-center gap-2 px-4 md:px-6 py-3 border-b border-[#E6E8EF] dark:border-[#2A2F3A] bg-[#F8FAFC] dark:bg-[#0B0F19]">
              <BadgeCheck className="h-4 w-4 text-[#4F46E5]" />
              <p className="text-sm font-bold tracking-wide text-[#0F172A] dark:text-white">IDENTIFICATION</p>
            </div>

            <div className="p-4 md:p-6">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-6">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 md:col-span-6">
                      <Einput
                        type="text"
                        name="EMPCODE"
                        title="Empcode"
                        value={formData?.EmpMst?.EMPCODE || ""}
                        handleInputChange={handleInputChange}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-6">
                  <Eselect
                    title="Title"
                    option={MrOptions}
                    name="TITLE"
                    initialValue={formData?.EmpMst?.TITLE?.toString()?.toLowerCase()}
                    handleInputChange={handleInputChange}
                  />
                </div>

                <div className="col-span-12 md:col-span-6">
                  <Eselect
                    title="Gender"
                    option={GenderOptions}
                    name="GENDER"
                    initialValue={formData?.EmpMst?.GENDER?.toString()}
                    handleInputChange={handleInputChange}
                  />
                </div>

                <div className="col-span-12 md:col-span-6">
                  <Eselect
                    title="Employee type"
                    option={Type}
                    name="EmpType"
                    initialValue={formData?.EmpMst?.EmpType?.toString()?.toLowerCase()}
                    handleInputChange={handleInputChange}
                  />
                </div>

                <div className="col-span-12 md:col-span-12">
                  <Eselect
                    option={EMPLOYEEDESIGNATIONoption}
                    title="Employee designation"
                    name="EMPLOYEEDESIGNATION"
                    initialValue={formData?.EmpMst?.EMPLOYEEDESIGNATION?.toString()}
                    handleInputChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ORGANISATION PLACEMENT CARD */}
        <div className="col-span-12 xl:col-span-6">
          <div className="bg-white dark:bg-black border border-[#E6E8EF] dark:border-[#2A2F3A] rounded-2xl overflow-visible">
            <div className="flex items-center gap-2 px-4 md:px-6 py-3 border-b border-[#E6E8EF] dark:border-[#2A2F3A] bg-[#F8FAFC] dark:bg-[#0B0F19]">
              <GitFork className="h-4 w-4 text-[#4F46E5]" />
              <p className="text-sm font-bold tracking-wide text-[#0F172A] dark:text-white">ORGANISATION PLACEMENT</p>
            </div>

            <div className="p-4 md:p-6">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-6">
                  <Eselect
                    option={SalRegionoption}
                    title="Region"
                    name="Sal_Region"
                    initialValue={formData?.EmpMst?.Sal_Region ? formData?.EmpMst?.Sal_Region?.toString() : null}
                    handleInputChange={handleInputChange}
                  />
                </div>

                <div className="col-span-12 md:col-span-6">
                  <Eselect
                    option={CHANEELOPTION}
                    title="Channel"
                    name="CHANNEL"
                    handleInputChange={handleInputChange}
                    initialValue={formData?.EmpMst?.CHANNEL?.toString()}
                  />
                </div>

                <div className="col-span-12 md:col-span-6">
                  <Eselect
                    option={CLUSTEROPTION}
                    title="Cluster"
                    name="CLUSTER"
                    handleInputChange={handleInputChange}
                    initialValue={formData?.EmpMst?.CLUSTER?.toString()}
                  />
                </div>

                <div className="col-span-12 md:col-span-6">
                  <Eselect
                    option={locationnoption}
                    title="Location"
                    name="LOCATION"
                    initialValue={formData?.EmpMst?.LOCATION?.toString()}
                    handleInputChange={handleLocationChange}
                  />
                </div>

                <div className="col-span-12 md:col-span-6">
                  <Eselect
                    option={SECTIONoption}
                    name="SECTION"
                    title="Section"
                    initialValue={formData?.EmpMst?.SECTION?.toString()}
                    handleInputChange={handleInputChange}
                  />
                </div>

                <div className="col-span-12 md:col-span-6">
                  <Eselect
                    option={divisionoption}
                    title="Department"
                    name="DIVISION"
                    initialValue={formData?.EmpMst?.DIVISION?.toString()}
                    handleInputChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== EMPLOYEE AT A GLANCE CARD ===================== */}
      <div className="col-span-12">
        <div className="bg-white dark:bg-black border border-[#E6E8EF] dark:border-[#2A2F3A] rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 md:px-6 py-3 border-b border-[#E6E8EF] dark:border-[#2A2F3A] bg-[#F8FAFC] dark:bg-[#0B0F19]">
            <Building2 className="h-4 w-4 text-[#4F46E5]" />
            <p className="text-sm font-bold tracking-wide text-[#0F172A] dark:text-white">EMPLOYEE AT A GLANCE</p>
          </div>

          <div className="p-4 md:p-6">
            <div className="grid grid-cols-12 gap-4">
              {/* Left - Identity Strip */}
              <div className="col-span-12 md:col-span-7">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                    {profileSrc ? (
                      <img src={profileSrc} alt="Profile" className="h-full w-full object-cover rounded-xl" />
                    ) : initials ? (
                      <span className="text-xl font-bold text-indigo-600 dark:text-indigo-300">{initials}</span>
                    ) : (
                      <User className="h-8 w-8 text-indigo-400" />
                    )}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-[#0F172A] dark:text-white">
                      {empName || "New employee record"}
                    </h3>
                    <p className="text-sm text-[#667085] dark:text-[#A0A7B4] mt-0.5">
                      {formData?.EmpMst?.EMPCODE
                        ? `Emp Code: ${formData.EmpMst.EMPCODE}`
                        : "Code not generated yet"}
                    </p>

                    <div className="mt-3">
                      {isReady ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700">
                          <BadgeCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-xs font-semibold text-green-700 dark:text-green-300">Ready to save</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700">
                          <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                            {requiredLeft} required fields left
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right - Completeness Ring */}
              <div className="col-span-12 md:col-span-5 flex items-center justify-center">
                <div className="flex items-center gap-4">
                  <div className="relative h-24 w-24">
                    <div
                      className="h-full w-full rounded-full"
                      style={{
                        background: `conic-gradient(#4F46E5 ${completenessPercent * 3.6}deg, #E6E8EF 0deg)`,
                      }}
                    />
                    <div className="absolute inset-2 bg-white dark:bg-black rounded-full flex items-center justify-center">
                      <span className="text-xl font-bold text-[#0F172A] dark:text-white">{completenessPercent}%</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-[#0F172A] dark:text-white">Profile completeness</p>
                    <p className="text-xs text-[#667085] dark:text-[#A0A7B4] mt-0.5">
                      {filledTotal} of {totalFields} fields completed
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Four Fact Tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
              <div className="rounded-xl border border-[#E6E8EF] dark:border-[#2A2F3A] p-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-[#667085] dark:text-[#A0A7B4]" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#667085] dark:text-[#A0A7B4]">DESIGNATION</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#0F172A] dark:text-white truncate">
                  {formData?.EmpMst?.EMPLOYEEDESIGNATION || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-[#E6E8EF] dark:border-[#2A2F3A] p-3">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-[#667085] dark:text-[#A0A7B4]" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#667085] dark:text-[#A0A7B4]">DEPARTMENT</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#0F172A] dark:text-white truncate">
                  {formData?.EmpMst?.DIVISION || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-[#E6E8EF] dark:border-[#2A2F3A] p-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#667085] dark:text-[#A0A7B4]" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#667085] dark:text-[#A0A7B4]">LOCATION</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#0F172A] dark:text-white truncate">
                  {formData?.EmpMst?.LOCATION || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-[#E6E8EF] dark:border-[#2A2F3A] p-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-[#667085] dark:text-[#A0A7B4]" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#667085] dark:text-[#A0A7B4]">REGION</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#0F172A] dark:text-white truncate">
                  {formData?.EmpMst?.Sal_Region || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}