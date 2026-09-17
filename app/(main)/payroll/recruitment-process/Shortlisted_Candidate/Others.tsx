"use client";

import React, { useState, useEffect } from "react";
import { useFormData } from "./Context/FormDataContext";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import SectionCard from "./SectionCard";
import { FileSpreadsheet, History } from "lucide-react";

type Props = {
  branch?: any[];
  cityoption?: any[];
  flag?: string | null;
};

export default function Others({ branch, cityoption, flag }: Props) {
  const Designation = [
    { value: "1", label: "Designation 1" },
    { value: "2", label: "Designation 2" },
  ];
  const country = [
    { value: "1", label: "Indian" },
    { value: "2", label: "Abroad" },
  ];
  const Status = [
    { value: "1", label: "Status 1" },
    { value: "2", label: "Status 2" },
  ];
  const Biometric = [
    { value: "1", label: "Biometric 1" },
    { value: "2", label: "Biometric 2" },
  ];
  const Employee_Level = [
    { value: "1", label: "Beginner" },
    { value: "2", label: "Experienced" },
  ];

  const { formData, setFormData } = useFormData();

  const handleInputChange = (name: string, value: any) => {
    setFormData((prevData: any) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const [flageData, setflageDataData] = useState<boolean>(false);

  useEffect(() => {
    if (flag === "true") {
      setflageDataData(false);
    } else {
      setflageDataData(true);
    }
  }, [flag]);

  const formatDate = (dateString: any) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString).slice(0, 10);
    const year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    return `${year}-${month < 10 ? `0${month}` : month}-${day < 10 ? `0${day}` : day}`;
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full">
      {/* 1. CANDIDATE ADDITIONAL INFORMATION */}
      <div className="xl:col-span-8">
        <SectionCard
          title="Candidate Additional Information"
          icon={<FileSpreadsheet size={18} />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Einput
                type="text"
                title="Prev. Company"
                name="PREVIOUSCOMPANYNAME"
                maxLength={100}
                value={formData?.PREVIOUSCOMPANYNAME}
                handleInputChange={handleInputChange}
                disabled={flageData}
              />
            </div>

            <div>
              <Einput
                type="text"
                title="Highest Qualification"
                name="BASICQUALIFICATION"
                maxLength={50}
                value={formData?.BASICQUALIFICATION}
                handleInputChange={handleInputChange}
                disabled={flageData}
              />
            </div>

            <div>
              <Einput
                type="text"
                title="Prev. Experience"
                name="pre_Exp"
                maxLength={100}
                value={formData?.pre_Exp}
                handleInputChange={handleInputChange}
                disabled={flageData}
              />
            </div>

            <div>
              <Eselect
                option={country}
                title="Nationality"
                name="CNATIONALITY"
                handleInputChange={handleInputChange}
                initialValue={formData?.CNATIONALITY}
                disabled={flageData}
              />
            </div>

            <div>
              <Eselect
                title="Company City"
                name="PRECOMPCITY"
                initialValue={formData?.PRECOMPCITY}
                option={cityoption}
                handleInputChange={handleInputChange}
                disabled={flageData}
              />
            </div>

            <div>
              <Eselect
                option={Designation}
                title="Prev. Designation"
                name="PREDESIGNATION"
                handleInputChange={handleInputChange}
                initialValue={formData?.PREDESIGNATION}
                disabled={flageData}
              />
            </div>

            <div>
              <Eselect
                title="Branch"
                handleInputChange={handleInputChange}
                initialValue={formData?.Acnt_Loc}
                disabled={flageData}
                name="Acnt_Loc"
                option={branch}
              />
            </div>

            <div>
              <Eselect
                option={Status}
                title="Employee Status"
                name="EMP_STATUS"
                initialValue={formData?.EMP_STATUS}
                handleInputChange={handleInputChange}
                disabled={flageData}
              />
            </div>

            <div>
              <Einput
                type="text"
                title="Username"
                name="USR_NAME"
                maxLength={50}
                value={formData?.USR_NAME}
                disabled={flageData}
                handleInputChange={handleInputChange}
              />
            </div>

            <div>
              <Einput
                title="Application ID"
                name="APPLICATION_ID"
                maxLength={25}
                type="text"
                value={formData?.APPLICATION_ID}
                disabled={flageData}
                handleInputChange={handleInputChange}
                ShortName
              />
            </div>

            <div>
              <Eselect
                option={Biometric}
                title="Biometric ID"
                name="BIOMETRIC_ID"
                disabled={flageData}
                handleInputChange={handleInputChange}
                initialValue={formData?.BIOMETRIC_ID}
                ShortName
              />
            </div>

            <div>
              <Eselect
                option={Employee_Level}
                title="Employee Level"
                name="LEVEL"
                initialValue={formData?.LEVEL}
                disabled={flageData}
                handleInputChange={handleInputChange}
              />
            </div>

            <div>
              <Einput
                title="Extension No"
                name="EXT_NO"
                type="text"
                maxLength={20}
                value={formData?.EXT_NO}
                disabled={flageData}
                handleInputChange={handleInputChange}
              />
            </div>

            <div>
              <Einput
                type="date"
                title="Proposed Retirement Date"
                name="PROPOSEDRETIRE_DATE"
                value={formatDate(formData?.PROPOSEDRETIRE_DATE)}
                disabled={flageData}
                handleInputChange={handleInputChange}
              />
            </div>
          </div>
        </SectionCard>
      </div>

      {/* 2. AUDIT TRAIL & RESPONSIBILITIES */}
      <div className="xl:col-span-4">
        <SectionCard
          title="Audit Trail & Roles"
          icon={<History size={18} />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Einput
                type="text"
                title="Created By"
                name="CREATED_BY"
                maxLength={20}
                value={formData?.CREATED_BY}
                disabled={true}
                readOnly={true}
                handleInputChange={handleInputChange}
              />
            </div>

            <div>
              <Einput
                type="date"
                title="Created On"
                name="CREATED_ON"
                value={formatDate(formData?.CREATED_ON)}
                disabled={true}
                readOnly={true}
                handleInputChange={handleInputChange}
              />
            </div>

            <div>
              <Einput
                type="text"
                title="Last Modified By"
                maxLength={20}
                value={formData?.LASTMODI_BY}
                name="LASTMODI_BY"
                handleInputChange={handleInputChange}
                disabled={true}
                readOnly={true}
              />
            </div>

            <div>
              <Einput
                type="date"
                title="Last Modified On"
                value={formatDate(formData?.LASTMODI_ON)}
                name="LASTMODI_ON"
                handleInputChange={handleInputChange}
                disabled={true}
                readOnly={true}
              />
            </div>

            <div className="sm:col-span-2">
              <Einput
                type="text"
                title="Machine Name"
                name="MACHINE_NAME"
                maxLength={100}
                value={formData?.MACHINE_NAME}
                handleInputChange={handleInputChange}
                disabled={flageData}
              />
            </div>

            <div className="sm:col-span-2">
              <div className="w-full space-y-1">
                <label className="text-[12px] font-medium leading-none text-slate-600 dark:text-slate-300">
                  Roles and Responsibility
                </label>
                <textarea
                  name="ROLE"
                  maxLength={150}
                  value={formData?.ROLE || ""}
                  onChange={(e) => handleInputChange("ROLE", e.target.value)}
                  disabled={flageData}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-[13px] text-slate-900 shadow-sm outline-none focus-visible:border-indigo-400 focus-visible:ring-4 focus-visible:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-[#0F1A2D] dark:text-slate-100 dark:focus-visible:border-indigo-400 dark:focus-visible:ring-indigo-500/20 dark:disabled:bg-[#0B1220]"
                />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
