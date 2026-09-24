"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Eselect from "@/components/atoms/Eselect";
import Einput from "@/components/atoms/Einput";
import { Eye, RotateCw, Upload } from "lucide-react";
import Swal from "sweetalert2";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";



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

  const [IsGenerate, setIsGenerate] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // wrapper for selecting employee from dropdown
  const handleEmpSelectChange = (name: string, value: any) => {
    handleEmpChange(name, value);
    if (value) {
      setIsGenerate(true);
    }
  };

  // wrapper
  const handleGenerateCode = async () => {
    await Generatecode();      // aapka existing function
    setIsGenerate(true);       // ✅ generate ke baad field readonly
  };

  const isEmpCodeReadOnly = Boolean(
    IsGenerate ||
    formData?.EmpMst?.EMPCODE ||
    formData?.EmpMst?.UTD ||
    formData?.EmpMst?.SrNo
  );

  return (
    <div className="bg-white dark:bg-black border-b border-[#E6E8EF] dark:border-[#2A2F3A]">
      <div className="px-3 sm:px-6 py-3">
        <div className="grid grid-cols-12 gap-4 sm:gap-6 items-start">
          {/* LEFT: inputs + record completion */}
          <div className="col-span-12 xl:col-span-10 min-w-0">
            {/* TOP ROW (spacing tuned like screenshot) */}
            <div
              className="
                grid items-end min-w-0
                gap-x-3 sm:gap-x-4 gap-y-3
                grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
                xl:grid-cols-[minmax(13rem,1.1fr)_minmax(8rem,0.7fr)_auto_minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(10rem,1fr)]
              "
            >
              {/* Employee code */}
              <div className="min-w-0">
                {canSearchEmployee ? (
                  <Eselect
                    title="Find Employee"
                    redlabel=""
                    name="SrNo"
                    handleInputChange={handleEmpSelectChange}
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
                  readOnly={isEmpCodeReadOnly} // ✅ readonly when employee chosen or generated
                />
              </div>

              {/* Generate Button */}
              <div className="min-w-0 flex items-end">
                <Button
                  variant="outline"
                  onClick={handleGenerateCode}
                  disabled={SaveDisable}
                  className="w-full sm:w-auto h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-black text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap shadow-xs"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  <span>Generate new code</span>
                </Button>
              </div>

              {/* First name */}
              <div className="min-w-0">
                <Einput
                  type="text"
                  name="EMPFIRSTNAME"
                  title="First name"
                  redlabel=""
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
              <div className="relative w-[140px] sm:w-[160px] xl:w-[120px]">
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

                {/* Preview Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (imgSrc) {
                      setIsPreviewOpen(true);
                    } else {
                      Swal.fire({
                        toast: true,
                        position: "top-end",
                        icon: "info",
                        title: "No image uploaded to preview",
                        showConfirmButton: false,
                        timer: 2500,
                      });
                    }
                  }}
                  title={imgSrc ? "Preview image" : "No image to preview"}
                  className={`absolute top-2 right-2 z-10 p-1.5 rounded-full transition-all flex items-center justify-center cursor-pointer shadow-sm ${
                    imgSrc
                      ? "bg-black/60 hover:bg-black text-white hover:scale-105"
                      : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-400"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[96vw] w-[96vw] h-[92vh] max-h-[94vh] flex flex-col p-4 sm:p-5 bg-white dark:bg-[#0B1220] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
          <DialogHeader className="pb-2.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <DialogTitle className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 dark:text-indigo-400" />
              Employee Photo Preview
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2.5 flex-1 w-full flex items-center justify-center bg-slate-100/70 dark:bg-slate-950/80 rounded-xl overflow-hidden p-2 border border-slate-200/80 dark:border-slate-800/80">
            {imgSrc ? (
              <Image
                src={imgSrc}
                alt="Employee photo preview"
                width={2400}
                height={2400}
                className="w-full h-full max-h-[82vh] object-contain rounded-lg shadow-sm"
                unoptimized
              />
            ) : (
              <div className="py-16 text-center text-sm text-slate-400">
                No image available to preview
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}