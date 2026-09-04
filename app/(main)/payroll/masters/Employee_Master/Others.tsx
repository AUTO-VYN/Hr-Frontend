"use client";

import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import ATextArea from "@/components/atoms/textArea";
import { useFormData } from "./Context/FormDataContext";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import { ListChecks, History } from "lucide-react";

export default function page({ masterData, isMandatory }: any) {
  const { formData, setFormData } = useFormData();
  const user = useCurrentUser();

  function filterDataByMiscType(Masters: any, miscType: any) {
    return Masters.filter((item: any) => item.Misc_Type === miscType);
  }

  const Status = ["Status1", "Status2"];

  const [Masters, setMasters] = useState(masterData?.CLUSTERS || []);
  const [cityNewoption, setcityNewoption] = useState(masterData?.CITY || []);

  const CATEGORY: any = filterDataByMiscType(Masters, 625);
  const CLUSTER: any = filterDataByMiscType(Masters, 626);
  const CHANNEL: any = filterDataByMiscType(Masters, 627);
  const COSTCENTRE: any = filterDataByMiscType(Masters, 628);

  const formatDate = (date: any) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      console.error(`Invalid date value provided: ${date}`);
      return "";
    }
    return d.toISOString().split("T")[0];
  };

  const country = [
    { value: "INDIAN", label: "Indian" },
    { value: "ABROAD", label: "Abroad" },
  ];

  const Designation = [
    { value: "1", label: "Designation1" },
    { value: "2", label: "Designation2" },
  ];

  const Biometric = [
    { value: "1", label: "Biometric1" },
    { value: "2", label: "Biometric2" },
  ];

  const Employee_Level = [
    { value: "1", label: "Beginner" },
    { value: "2", label: "Experience" },
  ];

  useEffect(() => {
    const dateneww = formData?.EmpMst?.CREATED_ON;
    const currentDate1 = dateneww?.split("T")[0];
    setFormData((prevData: any) => ({
      ...prevData,
      EmpMst: { ...prevData.EmpMst, CREATED_ON: currentDate1 },
    }));
  }, []);

  const handleInputChange = (name: any, value: any) => {
    setFormData((prevData: any) => ({
      ...prevData,
      EmpMst: {
        ...prevData.EmpMst,
        [name]: value,
      },
    }));
  };

  // ✅ only UI: darkmode classes (no logic change)
  const cardClass =
    "rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden " +
    "dark:border-[#1F2A37] dark:bg-[#0B1220] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)]";

  const cardHeaderClass =
    "flex items-center gap-2 px-4 py-3 border-b border-[#E5E7EB] " +
    "dark:border-[#1F2A37]";

  const cardTitleClass =
    "text-[13px] font-semibold tracking-wide uppercase text-slate-900 dark:text-slate-100";

  // ✅ FIX: dark class typo removed + consistent dark bg/border/text
  const fieldDarkClass =
    "text-[14px] dark:bg-[#0F1A2D] dark:text-slate-100 dark:border-[#243244] dark:placeholder:text-slate-500";

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT: EMPLOYEE OTHER DETAILS */}
        <div className="xl:col-span-7">
          <div className={cardClass}>
            <div className={cardHeaderClass}>
              <ListChecks className="h-6 w-6 text-[#6f36f5]" />
              <h1 className={cardTitleClass}>Employee Other Details</h1>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <div>
                  <Eselect
                    option={CATEGORY}
                    title="Category"
                    name="CATEGORY"
                    handleInputChange={handleInputChange}
                    initialValue={formData.EmpMst.CATEGORY?.toString()}
                    redlabel={isMandatory("CATEGORY") ? "*" : ""}
                    className={fieldDarkClass}
                  />
                </div>

                <div>
                  <Eselect
                    option={COSTCENTRE}
                    title="Cost center"
                    name="COSTCENTRE"
                    handleInputChange={handleInputChange}
                    initialValue={formData.EmpMst.COSTCENTRE?.toString()}
                    redlabel={isMandatory("COSTCENTRE") ? "*" : ""}
                    className={fieldDarkClass}
                  />
                </div>

                <div>
                  <Einput
                    type="text"
                    title="Prev. company"
                    name="PREVIOUSCOMPANYNAME"
                    value={formData.EmpMst.PREVIOUSCOMPANYNAME}
                    handleInputChange={handleInputChange}
                    redlabel={isMandatory("PREVIOUSCOMPANYNAME") ? "*" : ""}
                    className={fieldDarkClass}
                  />
                </div>

                <div>
                  <Einput
                    type="text"
                    title="High. quali."
                    name="BASICQUALIFICATION"
                    value={formData.EmpMst.BASICQUALIFICATION}
                    handleInputChange={handleInputChange}
                    redlabel={isMandatory("BASICQUALIFICATION") ? "*" : ""}
                    className={fieldDarkClass}
                  />
                </div>

                <div>
                  <Einput
                    type="text"
                    title="Prev. exp. (years)"
                    name="EXP_IN_YEAR"
                    handleInputChange={handleInputChange}
                    value={formData.EmpMst.EXP_IN_YEAR}
                    redlabel={isMandatory("EXP_IN_YEAR") ? "*" : ""}
                    className={fieldDarkClass}
                  />
                </div>

                <div>
                  <Eselect
                    option={country}
                    title="Nationality"
                    name="CNATIONALITY"
                    handleInputChange={handleInputChange}
                    initialValue={formData.EmpMst.CNATIONALITY}
                    redlabel={isMandatory("CNATIONALITY") ? "*" : ""}
                    className={fieldDarkClass}
                  />
                </div>

                <div>
                  <Eselect
                    option={cityNewoption}
                    title="Company city"
                    name="PRECOMPCITY"
                    initialValue={
                      formData.EmpMst.PRECOMPCITY
                        ? formData.EmpMst.PRECOMPCITY.toString()
                        : null
                    }
                    handleInputChange={handleInputChange}
                    redlabel={isMandatory("PRECOMPCITY") ? "*" : ""}
                    className={fieldDarkClass}
                  />
                </div>

                <div>
                  <Eselect
                    option={Designation}
                    title="Prev. designation"
                    name="PREDESIGNATION"
                    handleInputChange={handleInputChange}
                    initialValue={formData.EmpMst.PREDESIGNATION}
                    redlabel={isMandatory("PREDESIGNATION") ? "*" : ""}
                    className={fieldDarkClass}
                  />
                </div>

                <div>
                  <Einput
                    title="Branch"
                    handleInputChange={handleInputChange}
                    value={formData.EmpMst.Acnt_Loc}
                    name="Acnt_Loc"
                    type={"number"}
                    redlabel={isMandatory("Acnt_Loc") ? "*" : ""}
                    className={fieldDarkClass}
                  />
                </div>

                <div>
                  <Einput
                    title="Username"
                    name="USR_NAME"
                    value={formData.EmpMst.USR_NAME}
                    handleInputChange={handleInputChange}
                    redlabel={isMandatory("USR_NAME") ? "*" : ""}
                    className={fieldDarkClass}
                  />
                </div>

                <div>
                  <Einput
                    title="Application id"
                    name="APPLICATION_ID"
                    type="text"
                    value={formData.EmpMst.APPLICATION_ID}
                    handleInputChange={handleInputChange}
                    redlabel={isMandatory("APPLICATION_ID") ? "*" : ""}
                    className={fieldDarkClass}
                  />
                </div>

                <div>
                  <Eselect
                    option={Biometric}
                    title="Biometric id"
                    name="BIOMETRIC_ID"
                    handleInputChange={handleInputChange}
                    initialValue={formData.EmpMst.BIOMETRIC_ID}
                    redlabel={isMandatory("BIOMETRIC_ID") ? "*" : ""}
                    className={fieldDarkClass}
                  />
                </div>

                <div>
                  <Eselect
                    option={Employee_Level}
                    title="Employee level"
                    name="LEVEL"
                    initialValue={formData?.EmpMst?.LEVEL}
                    handleInputChange={handleInputChange}
                    redlabel={isMandatory("LEVEL") ? "*" : ""}
                    className={fieldDarkClass}
                  />
                </div>

                <div>
                  <Einput
                    title="Extension no."
                    name="EXT_NO"
                    type="text"
                    value={formData.EmpMst.EXT_NO}
                    handleInputChange={handleInputChange}
                    redlabel={isMandatory("EXT_NO") ? "*" : ""}
                    className={fieldDarkClass}
                  />
                </div>

                <div>
                  <Einput
                    type="date"
                    title="Proposed retirement date"
                    name="PROPOSEDRETIRE_DATE"
                    value={formatDate(formData.EmpMst.PROPOSEDRETIRE_DATE)}
                    handleInputChange={handleInputChange}
                    redlabel={isMandatory("PROPOSEDRETIRE_DATE") ? "*" : ""}
                    className={fieldDarkClass}
                  />
                </div>

                <div>
                  <Einput
                    type="text"
                    title="Old empcode"
                    name="AX_EMP_CODE"
                    value={formData.EmpMst.AX_EMP_CODE}
                    handleInputChange={handleInputChange}
                    redlabel={isMandatory("AX_EMP_CODE") ? "*" : ""}
                    className={fieldDarkClass}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: ALTER LOGS */}
        <div className="xl:col-span-5">
          <div className={cardClass}>
            <div className={cardHeaderClass}>
              <History className="h-6 w-6 text-[#6f36f5]" />
              <h1 className={cardTitleClass}>Alter Logs</h1>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Einput
                    type="text"
                    title="Created by"
                    name="CREATED_BY"
                    className={`form-control ${fieldDarkClass}`}
                    value={formData.EmpMst.CREATED_BY}
                    handleInputChange={handleInputChange}
                    disabled
                  />
                </div>

                <div>
                  <Einput
                    type="date"
                    title="Created on"
                    name="CREATED_ON"
                    handleInputChange={handleInputChange}
                    value={formData.EmpMst.CREATED_ON}
                    disabled
                    className={fieldDarkClass}
                  />
                </div>

                <div>
                  <Einput
                    type="text"
                    title="Last modified by"
                    value={formData.EmpMst.LASTMODI_BY}
                    name="LASTMODI_BY"
                    handleInputChange={handleInputChange}
                    redlabel={isMandatory("LASTMODI_BY") ? "*" : ""}
                    disabled
                    className={fieldDarkClass}
                  />
                </div>

                <div>
                  <Einput
                    type="date"
                    title="Last modified on"
                    value={formatDate(formData.EmpMst.LASTMODI_ON)}
                    name="LASTMODI_ON"
                    handleInputChange={handleInputChange}
                    redlabel={isMandatory("LASTMODI_ON") ? "*" : ""}
                    disabled
                    className={fieldDarkClass}
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="role-title-big">
                    <ATextArea
                      title="Roles and responsibilities"
                      name="ROLE"
                      value={formData.EmpMst.ROLE}
                      handleInputChange={handleInputChange}
                      redlabel={isMandatory("ROLE") ? "*" : ""}
                      className={fieldDarkClass}
                    />
                  </div>

                  <style jsx global>{`
                    .role-title-big label {
                      font-size: 14px !important;
                      font-weight: 400 !important;
                    }
                  `}</style>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}