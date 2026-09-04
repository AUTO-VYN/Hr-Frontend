"use client";

import React from "react";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
// import { Button } from "@/components/ui/button";
import { Building2, BadgeCheck, GitFork } from "lucide-react";

// import CustomSelectSearch from "@/components/atoms/Select";

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

  handleEmpChange: (name: string, value: any) => void;
  handleInputChange: (name: string, value: any) => void;
  handleLocationChange: (name: string, value: any) => void;
  Generatecode: () => void;

  profileSrc: any;
  handleFileChange: (e: any) => void;
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
  handleEmpChange,
  handleInputChange,
  handleLocationChange,
  Generatecode,
}: Props) {
  return (
    <div className="grid grid-cols-12 gap-6">
      {/* IDENTIFICATION CARD */}
      <div className="col-span-12 xl:col-span-6">
        {/* ✅ overflow-hidden hataya -> overflow-visible taaki dropdown card ke bahar nikle aur card ke andar ghuse nahi */}
        <div className="bg-white dark:bg-black border border-[#E6E8EF] dark:border-[#2A2F3A] rounded-2xl overflow-visible">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 md:px-6 py-3 border-b border-[#E6E8EF] dark:border-[#2A2F3A] bg-[#F8FAFC] dark:bg-[#0B0F19]">
            <BadgeCheck className="h-4 w-4 text-[#4F46E5]" />
            <p className="text-sm font-semibold tracking-wide text-[#0F172A] dark:text-white">
              IDENTIFICATION
            </p>
          </div>

          {/* Body */}
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-12 gap-4">
              {/* Employee code select (role based) */}

              {/* EMPCODE + Generate */}
              <div className="col-span-12 md:col-span-6">
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12 md:col-span-12">
                    <Einput
                      type="text"
                      name="EMPCODE"
                      title="Empcode"
                      value={formData?.EmpMst?.EMPCODE || ""}
                      handleInputChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="col-span-12 md:col-span-6">
                <Eselect
                  title="Title"
                  option={MrOptions}
                  name="TITLE"
                  initialValue={formData?.EmpMst?.TITLE?.toString()?.toLowerCase()}
                  handleInputChange={handleInputChange}
                />
              </div>

              {/* Gender */}
              <div className="col-span-12 md:col-span-6">
                <Eselect
                  title="Gender"
                  option={GenderOptions}
                  name="GENDER"
                  initialValue={formData?.EmpMst?.GENDER?.toString()}
                  handleInputChange={handleInputChange}
                />
              </div>

              {/* Employee type */}
              <div className="col-span-12 md:col-span-6">
                <Eselect
                  title="Employee type"
                  option={Type}
                  name="EmpType"
                  initialValue={formData?.EmpMst?.EmpType?.toString()?.toLowerCase()}
                  handleInputChange={handleInputChange}
                />
              </div>

              {/* Employee designation */}
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
        {/* ✅ same change yahan bhi */}
        <div className="bg-white dark:bg-black border border-[#E6E8EF] dark:border-[#2A2F3A] rounded-2xl overflow-visible">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 md:px-6 py-3 border-b border-[#E6E8EF] dark:border-[#2A2F3A] bg-[#F8FAFC] dark:bg-[#0B0F19]">
            <GitFork className="h-4 w-4 text-[#4F46E5]" />
            <p className="text-sm font-semibold tracking-wide text-[#0F172A] dark:text-white">
              ORGANISATION PLACEMENT
            </p>
          </div>

          {/* Body */}
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-12 gap-4">
              {/* Region */}
              <div className="col-span-12 md:col-span-6">
                <Eselect
                  option={SalRegionoption}
                  title="Region"
                  name="Sal_Region"
                  initialValue={
                    formData?.EmpMst?.Sal_Region
                      ? formData?.EmpMst?.Sal_Region?.toString()
                      : null
                  }
                  handleInputChange={handleInputChange}
                />
              </div>

              {/* Channel */}
              <div className="col-span-12 md:col-span-6">
                <Eselect
                  option={CHANEELOPTION}
                  title="Channel"
                  name="CHANNEL"
                  handleInputChange={handleInputChange}
                  initialValue={formData?.EmpMst?.CHANNEL?.toString()}
                />
              </div>

              {/* Cluster */}
              <div className="col-span-12 md:col-span-6">
                <Eselect
                  option={CLUSTEROPTION}
                  title="Cluster"
                  name="CLUSTER"
                  handleInputChange={handleInputChange}
                  initialValue={formData?.EmpMst?.CLUSTER?.toString()}
                />
              </div>

              {/* Location */}
              <div className="col-span-12 md:col-span-6">
                <Eselect
                  option={locationnoption}
                  title="Location"
                  name="LOCATION"
                  initialValue={formData?.EmpMst?.LOCATION?.toString()}
                  handleInputChange={handleLocationChange}
                />
              </div>

              {/* Section */}
              <div className="col-span-12 md:col-span-6">
                <Eselect
                  option={SECTIONoption}
                  name="SECTION"
                  title="Section"
                  initialValue={formData?.EmpMst?.SECTION?.toString()}
                  handleInputChange={handleInputChange}
                />
              </div>

              {/* Department */}
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
  );
}
