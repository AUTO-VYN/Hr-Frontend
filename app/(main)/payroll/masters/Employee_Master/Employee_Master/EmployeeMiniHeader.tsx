"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import Eselect from "@/components/atoms/Eselect";
import Einput from "@/components/atoms/Einput";
import { RotateCw, Camera } from "lucide-react";

type Props = {
  canSearchEmployee: boolean;
  empcodeOptions: any[];
  SaveDisable: boolean;

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
};

export default function EmployeeMiniHeader({
  canSearchEmployee,
  empcodeOptions,
  SaveDisable,
  formData,
  handleEmpChange,
  handleInputChange,
  Generatecode,
  recordCompletion,
}: Props) {
  return (
    <div className="bg-white dark:bg-black border-b border-[#E6E8EF] dark:border-[#2A2F3A]">
      <div className="px-4 md:px-6 py-4">
        <div
          className="
            grid items-end gap-x-6 gap-y-4
            grid-cols-1 md:grid-cols-2
            xl:grid-cols-[3.5rem_minmax(18rem,22rem)_minmax(12rem,1fr)_minmax(12rem,1fr)_minmax(14rem,1fr)_minmax(22rem,1.2fr)]
          "
        >
          {/* Icon */}
          <div className="hidden xl:flex">
            <div className="h-12 w-12 rounded-xl border border-[#E6E8EF] dark:border-[#2A2F3A] bg-[#F9FAFB] dark:bg-[#0B1220] flex items-center justify-center">
              <Camera className="h-5 w-5 text-[#667085] dark:text-[#A0A7B4]" />
            </div>
          </div>

          {/* Employee code search + generate */}
          <div className="min-w-0 mb-2.5">
            {canSearchEmployee ? (
              <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                <Eselect
                  title="Employee code"
                  redlabel="*"
                  name="SrNo"
                  handleInputChange={handleEmpChange}
                  option={empcodeOptions}
                  disabled={SaveDisable}
                  initialValue=""
                />
                <Button
                  variant="outline"
                  onClick={Generatecode}
                  disabled={SaveDisable}
                  className="h-11 w-11 -mb-2 rounded-xl"
                  title="Generate new code"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div />
            )}
          </div>

          {/* First name */}
          <div className="min-w-0">
            <Einput
              type="text"
              name="EMPFIRSTNAME"
              title="First name"
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

          {/* Record completion (ALWAYS right side on xl) */}
          <div className="min-w-0 xl:pl-6 xl:border-l border-[#E6E8EF] dark:border-[#2A2F3A]">
            <div className="flex items-start gap-4 justify-between xl:justify-end">
              <div className="shrink-0">
                <div className="text-xs font-semibold tracking-wider text-[#667085] dark:text-[#A0A7B4]">
                  RECORD COMPLETION
                </div>
                <div className="text-3xl font-bold text-[#101828] dark:text-white leading-none mt-1">
                  {recordCompletion.percent}%
                </div>
              </div>

              <div className="flex-1 xl:max-w-[360px]">
                <div className="h-2.5 w-full bg-[#EEF2F6] dark:bg-[#1B2230] rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-[#4F46E5] rounded-full transition-all"
                    style={{ width: `${recordCompletion.percent}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-[#667085] dark:text-[#A0A7B4]">
                  {recordCompletion.filled} of {recordCompletion.total} required
                  fields complete • {recordCompletion.left} required fields left
                </div>
              </div>
            </div>
          </div>

          <input type="hidden" value={formData?.EmpMst?.EMPCODE ?? ""} readOnly />
        </div>
      </div>
    </div>
  );
}