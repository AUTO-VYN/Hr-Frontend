"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import Eselect from "@/components/atoms/Eselect";
import Einput from "@/components/atoms/Einput";
import { Upload } from "lucide-react";

type Props = {
  formData: any;
  handleInputChange: (name: string, value: any) => void;
  imageSrc1: any;
  handleFileChange: (e: any) => void;
  flageData: boolean;
  options: {
    MrOption: any[];
    GenderOption: any[];
    Type: any[];
    locationnoption: any[];
    EMPLOYEEDESIGNATIONoption: any[];
    divisionoption: any[];
    SECTIONoption: any[];
    SalRegionoption: any[];
    Source: any[];
  };
};

export default function CandidateMiniHeader({
  formData,
  handleInputChange,
  imageSrc1,
  handleFileChange,
  flageData,
  options,
}: Props) {
  const imgSrc =
    imageSrc1 ||
    (formData?.images?.[0]?.path
      ? `https://erp.autovyn.com/backend/fetch?filePath=${formData.images[0].path}`
      : formData?.images?.[0]?.File_Name
        ? `https://erp.autovyn.com/backend/fetch?filePath=${formData.images[0].File_Name}`
        : null);

  // Calculate completion percentage based on core candidate fields
  const recordCompletion = useMemo(() => {
    const requiredKeys = [
      "TRAN_ID",
      "TITLE",
      "EMPFIRSTNAME",
      "EMPLASTNAME",
      "GENDER",
      "EMPLOYEEDESIGNATION",
      "LOCATION",
      "Sal_Region",
      "DIVISION",
      "SECTION",
    ];
    const total = requiredKeys.length;
    const filled = requiredKeys.filter((k) => {
      const v = formData?.[k];
      return v !== null && v !== undefined && String(v).trim() !== "";
    }).length;
    const left = Math.max(total - filled, 0);
    const percent = Math.min(100, Math.round((filled / total) * 100));
    return { percent, filled, total, left };
  }, [formData]);

  return (
    <div className="bg-white dark:bg-black border-b border-[#E6E8EF] dark:border-[#2A2F3A]">
      <div className="px-3 sm:px-6 py-4">
        <div className="grid grid-cols-12 gap-4 sm:gap-6 items-start">
          {/* LEFT: inputs + record completion */}
          <div className="col-span-12 xl:col-span-10 min-w-0">
            {/* GRID OF TOP FIELDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {/* Candidate ID */}
              <div>
                <Einput
                  type="text"
                  name="TRAN_ID"
                  title="Candidate ID"
                  value={formData?.TRAN_ID}
                  handleInputChange={handleInputChange}
                  disabled={true}
                  readOnly={true}
                />
              </div>

              {/* Title */}
              <div>
                <Eselect
                  title="Title"
                  redlabel="*"
                  option={options.MrOption}
                  name="TITLE"
                  initialValue={formData?.TITLE}
                  handleInputChange={handleInputChange}
                  disabled={flageData}
                />
              </div>

              {/* First Name */}
              <div>
                <Einput
                  type="text"
                  name="EMPFIRSTNAME"
                  title="First Name"
                  redlabel="*"
                  value={formData?.EMPFIRSTNAME}
                  handleInputChange={handleInputChange}
                  disabled={flageData}
                  className="uppercase"
                />
              </div>

              {/* Last Name */}
              <div>
                <Einput
                  type="text"
                  name="EMPLASTNAME"
                  title="Last Name"
                  value={formData?.EMPLASTNAME}
                  handleInputChange={handleInputChange}
                  disabled={flageData}
                  className="uppercase"
                />
              </div>

              {/* Gender */}
              <div>
                <Eselect
                  title="Gender"
                  option={options.GenderOption}
                  name="GENDER"
                  initialValue={formData?.GENDER?.trim() || ""}
                  handleInputChange={handleInputChange}
                  disabled={flageData}
                />
              </div>

              {/* Employee Type */}
              <div>
                <Eselect
                  title="Candidate Type"
                  option={options.Type}
                  name="EMPLOYEETYPE"
                  initialValue={formData?.EMPLOYEETYPE}
                  handleInputChange={handleInputChange}
                  disabled={flageData}
                />
              </div>

              {/* Designation */}
              <div>
                <Eselect
                  title="Designation"
                  redlabel="*"
                  name="EMPLOYEEDESIGNATION"
                  option={options.EMPLOYEEDESIGNATIONoption}
                  initialValue={formData?.EMPLOYEEDESIGNATION?.toString()}
                  handleInputChange={handleInputChange}
                  disabled={flageData}
                />
              </div>

              {/* Location */}
              <div>
                <Eselect
                  title="Location"
                  redlabel="*"
                  name="LOCATION"
                  option={options.locationnoption}
                  initialValue={formData?.LOCATION}
                  handleInputChange={handleInputChange}
                  disabled={flageData}
                />
              </div>

              {/* Department */}
              <div>
                <Eselect
                  option={options.divisionoption}
                  title="Department"
                  name="DIVISION"
                  initialValue={formData?.DIVISION}
                  handleInputChange={handleInputChange}
                  disabled={flageData}
                />
              </div>

              {/* Section */}
              <div>
                <Eselect
                  option={options.SECTIONoption}
                  name="SECTION"
                  title="Section"
                  initialValue={formData?.SECTION}
                  handleInputChange={handleInputChange}
                  disabled={flageData}
                />
              </div>

              {/* Region */}
              <div>
                <Eselect
                  option={options.SalRegionoption}
                  title="Region"
                  redlabel="*"
                  name="Sal_Region"
                  initialValue={formData?.Sal_Region?.toString()}
                  handleInputChange={handleInputChange}
                  disabled={flageData}
                />
              </div>

              {/* Source */}
              <div>
                <Eselect
                  option={options.Source}
                  title="Source"
                  name="SOURCE_OF_REG"
                  initialValue={formData?.SOURCE_OF_REG?.toString()}
                  handleInputChange={handleInputChange}
                  disabled={flageData}
                />
              </div>
            </div>

            {/* RECORD COMPLETION */}
            <div className="mt-4 pt-3 border-t border-[#E6E8EF] dark:border-[#2A2F3A]">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="shrink-0">
                  <div className="text-[10px] font-semibold tracking-wider text-[#667085] dark:text-[#A0A7B4]">
                    RECORD COMPLETION
                  </div>
                  <div className="text-2xl font-bold text-[#101828] dark:text-white leading-none mt-1">
                    {recordCompletion.percent}%
                  </div>
                </div>

                <div className="flex-1 min-w-[240px] max-w-[600px]">
                  <div className="h-2 w-full bg-[#EEF2F6] dark:bg-[#1B2230] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#4F46E5] rounded-full transition-all duration-300"
                      style={{ width: `${recordCompletion.percent}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[11px] text-[#667085] dark:text-[#A0A7B4]">
                    {recordCompletion.filled} of {recordCompletion.total} steps complete •{" "}
                    {recordCompletion.left} required fields left
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Photo upload card (matching Employee_Master style) */}
          <div className="col-span-12 xl:col-span-2 xl:col-start-11">
            <div className="flex xl:justify-end">
              <div className="relative w-[140px] sm:w-[150px] xl:w-[130px]">
                <label
                  className="
                    flex w-full items-center justify-center
                    rounded-2xl cursor-pointer overflow-hidden
                    border border-dashed border-[#D0D5DD] dark:border-[#2A2F3A]
                    bg-[#F8FAFC] dark:bg-[#0B0F19] hover:bg-slate-50 dark:hover:bg-slate-900
                    h-[135px] sm:h-[145px] transition shadow-xs
                  "
                >
                  {!imgSrc ? (
                    <div className="text-center px-3">
                      <Upload className="h-5 w-5 mx-auto text-[#667085] dark:text-[#A0A7B4]" />
                      <div className="mt-2 font-semibold text-xs text-[#344054] dark:text-white">
                        Upload Photo
                      </div>
                      <div className="text-[10px] text-[#667085] dark:text-[#A0A7B4] mt-0.5">
                        JPG or PNG
                      </div>
                    </div>
                  ) : (
                    <Image
                      width={400}
                      height={400}
                      src={imgSrc}
                      alt="Candidate Photo"
                      className="w-full h-full object-cover pointer-events-none"
                      unoptimized
                      key={imgSrc}
                    />
                  )}
                  <input
                    type="file"
                    className="hidden"
                    name="images"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleFileChange}
                    disabled={flageData}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
