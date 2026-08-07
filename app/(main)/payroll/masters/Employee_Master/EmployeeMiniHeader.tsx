"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Eselect from "@/components/atoms/Eselect";
import Einput from "@/components/atoms/Einput";
import { RotateCw, Upload } from "lucide-react";

type Props = {
  canSearchEmployee: boolean;
  empcodeOptions: any[];

  SaveDisable: boolean;
  IsGenerate?: boolean;

  formData: any;
  handleEmpChange: (name: string, value: any) => void;
  handleInputChange: (name: string, value: any) => void;

  Generatecode: () => void;

  recordCompletion: {
    percent: number;
    filled: number;
    total: number;
    left: number;
  };

  profileSrc: any;
  handleFileChange: (e: any) => void;
};

export default function EmployeeMiniHeader({
  canSearchEmployee,
  empcodeOptions,
  SaveDisable,
  IsGenerate,
  formData,
  handleEmpChange,
  handleInputChange,
  Generatecode,
  recordCompletion,
  profileSrc,
  handleFileChange,
}: Props) {
  const imgSrc =
  profileSrc ||
  (formData?.EmpMst?.photo
    ? `data:image/jpeg;base64,${formData.EmpMst.photo}`
    : null);

  return (
    <div className="bg-white dark:bg-black border-b border-[#E6E8EF] dark:border-[#2A2F3A]">
      <div className="px-6 py-3  ">
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* LEFT: inputs + record completion */}
          <div className="col-span-12 xl:col-span-10 min-w-0">
            {/* TOP ROW (spacing tuned like screenshot) */}
            <div
              className="
                grid items-start min-w-0
                gap-x-4 gap-y-3
                grid-cols-1 md:grid-cols-2
                xl:grid-cols-[minmax(18rem,1.25fr)_minmax(10rem,.75fr)_2.75rem_minmax(12rem,1fr)_minmax(12rem,1fr)_minmax(14rem,1fr)]
              "
            >
              {/* Employee code */}
              <div className="min-w-0 ]">
                {canSearchEmployee ? (
                  <Eselect
                    title="Employee code"
                    redlabel="*"
                    name="SrNo"
                    handleInputChange={handleEmpChange}
                    option={empcodeOptions}
                    disabled={SaveDisable}
                    initialValue=""
                  />
                ) : (
                  <div />
                )}
              </div>

              {/* Empcode */}
              <div className="min-w-0">
                <Einput
                  type="text"
                  name="EMPCODE"
                  title="Empcode"
                  value={formData?.EmpMst?.EMPCODE}
                  handleInputChange={handleInputChange}
                  disabled={IsGenerate}
                />
              </div>

              {/* Generate icon */}
              <div className="min-w-0 flex items-end">
                <Button
                  variant="outline"
                  onClick={Generatecode}
                  disabled={SaveDisable}
                  className="h-11 w-11 rounded-xl mt-5"
                  title="Generate new code"
                >
                  
                  <RotateCw className="h-4 w-4  " />
                </Button>
              </div>

              {/* First name */}
              <div className="min-w-0">
                <Einput
                  type="text"
                  name="EMPFIRSTNAME"
                  title="First name"
                  redlabel="*"
                  value={formData?.EmpMst?.EMPFIRSTNAME}
                  handleInputChange={handleInputChange}
                  className="uppercase"
                />
              </div>

              {/* Last name */}
              <div className="min-w-0">
                <Einput
                  type="text"
                  name="EMPLASTNAME"
                  title="Last name"
                  value={formData?.EmpMst?.EMPLASTNAME}
                  handleInputChange={handleInputChange}
                  className="uppercase"
                />
              </div>

              {/* Emp. punch code */}
              <div className="min-w-0">
                <Einput
                  type="text"
                  title="Emp. punch code"
                  name="PAY_CODE"
                  id="PAY_CODE"
                  value={formData?.EmpMst?.PAY_CODE}
                  handleInputChange={handleInputChange}
                />
              </div>
            </div>

            {/* RECORD COMPLETION (spacing tuned like screenshot) */}
            <div className="mt-6 pt-3 border-t border-[#E6E8EF] dark:border-[#2A2F3A]">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="shrink-0">
                  <div className="text-[10px] font-semibold tracking-wider text-[#667085] dark:text-[#A0A7B4]">
                    RECORD COMPLETION
                  </div>
                  <div className="text-2xl font-bold text-[#101828] dark:text-white leading-none mt-1">
                    {recordCompletion.percent}%
                  </div>
                </div>

                <div className="flex-1 min-w-[260px] max-w-[640px]">
                  <div className="h-2 w-full bg-[#EEF2F6] dark:bg-[#1B2230] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#4F46E5] rounded-full transition-all"
                      style={{ width: `${recordCompletion.percent}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[11px] text-[#667085] dark:text-[#A0A7B4]">
                    {recordCompletion.filled} of {recordCompletion.total} steps
                    complete • {recordCompletion.left} required fields left
                  </div>
                </div>
              </div>
            </div>

            <input
              type="hidden"
              value={formData?.EmpMst?.EMPCODE ?? ""}
              readOnly
            />
          </div>

          {/* RIGHT: photo upload (height smaller + proportions like screenshot) */}
            <div className="col-span-12 xl:col-span-2 xl:col-start-11 ">
            <div className="flex xl:justify-end " >
              {/* screenshot-like width */}
              <div className="w-[140px] sm:w-[160px] xl:w-[120px]">
                <label
                  className="
                    flex w-full items-center justify-center
                    rounded-2xl cursor-pointer overflow-hidden
                    border border-dashed border-[#D0D5DD] dark:border-[#2A2F3A]
                    bg-white dark:bg-black
                    h-[128px] sm:h-[136px] xl:h-[144px]
                  "
                >
                  {!imgSrc ? (
                    <div className="text-center px-6">
                      <Upload className="h-5 w-5 mx-auto text-[#667085] dark:text-[#A0A7B4]" />
                      <div className="mt-2 font-semibold text-[#344054] dark:text-white">
                        Upload image
                      </div>
                      <div className="text-xs text-[#667085] dark:text-[#A0A7B4] mt-1">
                        JPG or PNG • max 2 MB
                      </div>
                    </div>
                  ) : (
                      <Image
                        width={600}
                        height={600}
                        src={imgSrc}
                        alt="Employee photo"
                        className="w-full h-full object-cover pointer-events-none"
                        unoptimized
                        key={imgSrc}
                      />
                  )}

                  <input
                    type="file"
                    className="hidden"
                    name="profile"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleFileChange}
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