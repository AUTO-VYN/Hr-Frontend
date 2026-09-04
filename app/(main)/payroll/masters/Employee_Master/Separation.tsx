"use client";

import AButton from "@/components/atoms/Buttton";
import Einput from "@/components/atoms/Einput";
import SelectSearch from "@/components/atoms/Select";
import SmallTitle from "@/components/atoms/smallTitle";
import ATextArea from "@/components/atoms/textArea";
import React, { useState } from "react";
import { useFormData } from "./Context/FormDataContext";
import { Button } from "@/components/ui/button";
import Eselect from "@/components/atoms/Eselect";
import { ClipboardList, MessageSquareText, FileText } from "lucide-react";
import CertificatesUpload from "@/components/atoms/CertificateUpload";

const yesno = [
  { value: "1", label: "YES" },
  { value: "2", label: "NO" },
];

function Separation({ masterData }) {
  console.log(masterData, "masterData");
  const { formData, setFormData } = useFormData();

  const [Notice_Period_opt, setNotice_Period_opt] = useState(
    masterData.Notice_Period || [],
  );
  const [Sepration_Mode_opt, setSepration_Mode_opt] = useState(
    masterData.Sepration_Mode || [],
  );
  const [Exit_Interview_opt, setExit_Interview_opt] = useState(
    masterData.Exit_Interview || [],
  );
  const [Resigned_Status_opt, setResigned_Status_opt] = useState(
    masterData.Resigned_Status || [],
  );
  const [Sepration_Cat_opt, setSepration_Cat_opt] = useState(
    masterData.Sepration_Cat || [],
  );

  const handleSelectChange = (name: any, selectedOption: any) => {
    const value = selectedOption;
    setFormData((prevData) => ({
      ...prevData,
      EmpMst: {
        ...prevData.EmpMst,
        [name]: value,
      },
    }));
    console.log(formData, "bnext");
  };

  const handleInputChange = (name, value) => {
    setFormData((prevData) => ({
      ...prevData,
      EmpMst: {
        ...prevData.EmpMst,
        [name]: value,
      },
    }));

    console.log(formData, "bnext");
  };

  // UI helpers (only styling)
  const cardClass =
    "rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden " +
    "dark:border-slate-800 dark:bg-[#0B1220]";

  const headerClass =
    "flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 " +
    "dark:border-slate-800";

  const titleWrapClass = "flex items-center gap-2.5";
  const titleClass =
    "text-sm font-semibold tracking-wider uppercase text-slate-900 dark:text-slate-100";

  const iconClass = "h-4 w-4 text-violet-600 dark:text-violet-400";

  // try to improve inputs dark mode without touching their logic
  const fieldDarkClass =
    "dark:bg-[#0F1A2D] dark:text-slate-100 dark:border-slate-700 dark:placeholder:text-slate-500";

  const asFileOrNull = (v: any): File | string | null => {
    if (typeof window === "undefined") return null;
    if (v instanceof File) return v;
    if (typeof v === "string" && v) return v; // string link support
    return null;
  };

  return (
    // ✅ FINAL scroll fix (no functionality change):
    // Give this section a real viewport-based height so overflow-y-auto can scroll FULLY.
    // (Header/actions are outside this component, so we subtract a safe offset.)
    <div
      className="overflow-y-auto overflow-x-hidden pb-40 min-h-0"
      style={{ height: "calc(100dvh - 140px)" }}
    >
      <div className="grid grid-cols-12 gap-6 min-h-0">
        <div className="col-span-12 min-h-0">
          <div className="grid grid-cols-12 gap-6 min-h-0">
            {/* LEFT */}
            <div className="col-span-12 xl:col-span-6 w-full min-h-0">
              <div className={cardClass}>
                <div className={headerClass}>
                  <div className={titleWrapClass}>
                    <ClipboardList className={iconClass} />
                    <h1 className={titleClass}>Resignation details</h1>
                  </div>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 sm:col-span-6">
                      <Einput
                        type="date"
                        title="Resignation submission date"
                        name="RESIGNATION_SUBMISSION_DATE"
                        value={formData.EmpMst.RESIGNATION_SUBMISSION_DATE}
                        handleInputChange={handleInputChange}
                        className={fieldDarkClass}
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <Eselect
                        title="Notice period"
                        name="NOTICEPERIOD"
                        option={Notice_Period_opt}
                        handleInputChange={handleInputChange}
                        initialValue={formData.EmpMst.NOTICEPERIOD}
                        className={fieldDarkClass}
                      />
                    </div>

                    <div className="col-span-12">
                      <ATextArea
                        title="Reason for resignation"
                        name="REASON_FOR_RESIGNATION"
                        handleInputChange={handleInputChange}
                        value={formData.EmpMst.REASON_FOR_RESIGNATION}
                        className={fieldDarkClass}
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <Einput
                        value={formData.EmpMst.NOTICEPERIOD}
                        type="text"
                        title="Shortfall in notice period"
                        name="NOTICEPERIOD"
                        handleInputChange={handleInputChange}
                        className={fieldDarkClass}
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <Einput
                        title="Tentative leaving date"
                        name="TEN_LEAVE_DATE"
                        type="date"
                        handleInputChange={handleInputChange}
                        value={formData.EmpMst.TEN_LEAVE_DATE}
                        className={fieldDarkClass}
                      />
                    </div>

                    <div className="col-span-12">
                      <ATextArea
                        handleInputChange={handleInputChange}
                        title="Remarks"
                        name="SEPERATIONREMARKS"
                        value={formData.EmpMst.SEPERATIONREMARKS}
                        max="500"
                        className={fieldDarkClass}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="col-span-12 xl:col-span-6 w-full min-h-0">
              <div className={cardClass}>
                <div className={headerClass}>
                  <div className={titleWrapClass}>
                    <MessageSquareText className={iconClass} />
                    <h1 className={titleClass}>Exit interview</h1>
                  </div>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 sm:col-span-6">
                      <Eselect
                        title="Separation mode"
                        name="SEPARATION_MODE"
                        option={Sepration_Mode_opt}
                        handleInputChange={handleInputChange}
                        initialValue={formData.EmpMst.SEPARATION_MODE}
                        className={fieldDarkClass}
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <Eselect
                        title="Exit interview done"
                        name="ExitInterview_Done"
                        handleInputChange={handleInputChange}
                        option={Exit_Interview_opt}
                        initialValue={formData.EmpMst.ExitInterview_Done}
                        className={fieldDarkClass}
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <Eselect
                        title="Resigned status"
                        name="RESIGNED_STATUS"
                        option={Resigned_Status_opt}
                        handleInputChange={handleInputChange}
                        initialValue={formData.EmpMst.RESIGNED_STATUS}
                        className={fieldDarkClass}
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <Eselect
                        title="Category"
                        name="SEPRATION_CATE"
                        handleInputChange={handleInputChange}
                        option={Sepration_Cat_opt}
                        initialValue={formData.EmpMst.SEPRATION_CATE}
                        className={fieldDarkClass}
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <Einput
                        type="date"
                        title="Last working date"
                        name="LASTWOR_DATE"
                        value={formData.EmpMst.LASTWOR_DATE?.slice(0, 10) || ""}
                        handleInputChange={handleInputChange}
                        className={fieldDarkClass}
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <Einput
                        title="Date of exit interview"
                        name="DATE_OF_EXIT_INTERVIEW"
                        type="date"
                        handleInputChange={handleInputChange}
                        value={formData.EmpMst.DATE_OF_EXIT_INTERVIEW}
                        className={fieldDarkClass}
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-6">
                      <Einput
                        title="Date of settlement"
                        name="DATE_OF_SETTLEMENT"
                        type="date"
                        handleInputChange={handleInputChange}
                        value={formData.EmpMst.DATE_OF_SETTLEMENT}
                        className={fieldDarkClass}
                      />
                    </div>

                    <div className="col-span-12">
                      <ATextArea
                        title="Exit interview remarks"
                        name="INTERVIEWREMAKS"
                        handleInputChange={handleInputChange}
                        value={formData.EmpMst.INTERVIEWREMAKS}
                        max="500"
                        className={fieldDarkClass}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DOCUMENTS */}
            <div className="col-span-12">
              <div className={cardClass}>
                <div className={headerClass}>
                  <div className={titleWrapClass}>
                    <FileText className={iconClass} />
                    <h1 className={titleClass}>Separation documents</h1>
                  </div>
                </div>

                <div className="p-5">
                  <CertificatesUpload
                    showHeader={false}
                    label="Upload separation documents"
                    accept="application/pdf,image/jpeg,image/jpg,image/png"
                    items={[
                      {
                        name: "Separation1",
                        title: "Resignation letter",
                        subtitle: "Signed copy · PDF",
                        icon: <FileText size={18} />,
                      },
                      {
                        name: "Separation2",
                        title: "Relieving letter",
                        subtitle: "Issued by HR · PDF",
                        icon: <FileText size={18} />,
                      },
                      {
                        name: "Separation3",
                        title: "Handover checklist",
                        subtitle: "Optional · PDF",
                        icon: <FileText size={18} />,
                      },
                      {
                        name: "Separation4",
                        title: "Full & final statement",
                        subtitle: "Accounts · PDF",
                        icon: <FileText size={18} />,
                      },
                    ]}
                    value={{
                      Separation1: asFileOrNull(formData?.EmpMst?.Separation1),
                      Separation2: asFileOrNull(formData?.EmpMst?.Separation2),
                      Separation3: asFileOrNull(formData?.EmpMst?.Separation3),
                      Separation4: asFileOrNull(formData?.EmpMst?.Separation4),
                    }}
                    onChange={(next) => {
                      setFormData((prev) => ({
                        ...prev,
                        EmpMst: {
                          ...prev.EmpMst,
                          ...next,
                        },
                      }));
                    }}
                  />
                </div>
              </div>
            </div>
            {/* /DOCUMENTS */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Separation;