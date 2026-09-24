"use client";

import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import ATextArea from "@/components/atoms/textArea";
import { useFormData } from "./Context/FormDataContext";
import { useEffect, useState, useMemo } from "react";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import { ListChecks, History } from "lucide-react";
import axios from "axios";

export default function page({ masterData, isMandatory }: any) {
  const { formData, setFormData } = useFormData();
  const user = useCurrentUser();

  const [localMasterData, setLocalMasterData] = useState<any>(null);
  const [fetchedCategory, setFetchedCategory] = useState<any[]>([]);
  const [fetchedCostCentre, setFetchedCostCentre] = useState<any[]>([]);

  // Flatten all array items from an object or array
  function extractAllItems(data: any): any[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    let items: any[] = [];
    if (typeof data === "object") {
      for (const key of Object.keys(data)) {
        if (Array.isArray(data[key])) {
          items.push(...data[key]);
        }
      }
    }
    return items;
  }

  // Filter items by misc_type (case-insensitive & handles string/number)
  function findMiscOptions(items: any[], miscType: number | string) {
    if (!Array.isArray(items)) return [];
    return items
      .filter((item: any) => {
        const type =
          item?.Misc_Type ??
          item?.misc_type ??
          item?.MISC_TYPE ??
          item?.MiscType ??
          item?.misctype;
        return String(type) === String(miscType);
      })
      .map((item: any) => ({
        label: String(
          item?.label ||
            item?.labelname ||
            item?.Misc_Name ||
            item?.misc_name ||
            item?.MISC_NAME ||
            item?.NAME ||
            item?.name ||
            item?.value ||
            item?.Misc_Code ||
            ""
        ).trim(),
        value: String(
          item?.value ??
            item?.Misc_Code ??
            item?.misc_code ??
            item?.MISC_CODE ??
            item?.CODE ??
            item?.code ??
            item?.label ??
            ""
        ).trim(),
      }))
      .filter((opt: any) => opt.label !== "");
  }

  // Find options by type or by key name in masterData
  function getOptionsForField(data: any, fieldKeys: string[], miscType: number) {
    if (!data) return [];
    const all = extractAllItems(data);
    const byType = findMiscOptions(all, miscType);
    if (byType.length > 0) return byType;

    if (typeof data === "object") {
      for (const key of fieldKeys) {
        if (Array.isArray(data[key]) && data[key].length > 0) {
          const mapped = data[key]
            .map((item: any) => ({
              label: String(
                item?.label ||
                  item?.labelname ||
                  item?.Misc_Name ||
                  item?.misc_name ||
                  item?.MISC_NAME ||
                  item?.NAME ||
                  item?.name ||
                  item?.value ||
                  item?.Misc_Code ||
                  ""
              ).trim(),
              value: String(
                item?.value ??
                  item?.Misc_Code ??
                  item?.misc_code ??
                  item?.MISC_CODE ??
                  item?.CODE ??
                  item?.code ??
                  item?.label ??
                  ""
              ).trim(),
            }))
            .filter((o: any) => o.label !== "");
          if (mapped.length > 0) return mapped;
        }
      }
    }
    return [];
  }

  // Fallback 1: If masterData prop is empty, fetch /employee/masters
  useEffect(() => {
    if (!user?.Comp_Code) return;
    if (
      masterData &&
      (Array.isArray(masterData)
        ? masterData.length > 0
        : Object.keys(masterData).length > 0)
    ) {
      return;
    }

    axios
      .post(
        `${process.env.NEXT_PUBLIC_URL}/employee/masters`,
        {},
        {
          headers: {
            compcode: String(user.Comp_Code),
            name: user.name || "",
          },
        }
      )
      .then((res) => {
        if (res?.data?.data) {
          setLocalMasterData(res.data.data);
        }
      })
      .catch((err) => {
        console.error("Employee masters fallback error in Others:", err);
      });
  }, [user?.Comp_Code, user?.name, masterData]);

  // Fallback 2: Fetch misc_type 625 & 628 via /master/findmaster
  useEffect(() => {
    if (!user?.Comp_Code) return;

    const headers = {
      compcode: String(user.Comp_Code),
      name: user.name || "",
    };

    axios
      .post(
        `${process.env.NEXT_PUBLIC_URL}/master/findmaster`,
        { Misc_Type: 625 },
        { headers }
      )
      .then((res) => {
        const list =
          res?.data?.MiscMst ||
          res?.data?.data?.MiscMst ||
          res?.data?.data ||
          res?.data?.Result ||
          [];
        if (Array.isArray(list) && list.length > 0) {
          setFetchedCategory(
            list
              .map((item: any) => ({
                label: String(
                  item?.label ||
                    item?.Misc_Name ||
                    item?.NAME ||
                    item?.value ||
                    item?.Misc_Code ||
                    ""
                ).trim(),
                value: String(
                  item?.value ?? item?.Misc_Code ?? item?.CODE ?? item?.label ?? ""
                ).trim(),
              }))
              .filter((o: any) => o.label !== "")
          );
        }
      })
      .catch(() => {});

    axios
      .post(
        `${process.env.NEXT_PUBLIC_URL}/master/findmaster`,
        { Misc_Type: 628 },
        { headers }
      )
      .then((res) => {
        const list =
          res?.data?.MiscMst ||
          res?.data?.data?.MiscMst ||
          res?.data?.data ||
          res?.data?.Result ||
          [];
        if (Array.isArray(list) && list.length > 0) {
          setFetchedCostCentre(
            list
              .map((item: any) => ({
                label: String(
                  item?.label ||
                    item?.Misc_Name ||
                    item?.NAME ||
                    item?.value ||
                    item?.Misc_Code ||
                    ""
                ).trim(),
                value: String(
                  item?.value ?? item?.Misc_Code ?? item?.CODE ?? item?.label ?? ""
                ).trim(),
              }))
              .filter((o: any) => o.label !== "")
          );
        }
      })
      .catch(() => {});
  }, [user?.Comp_Code, user?.name]);

  const activeMasterData = useMemo(() => {
    if (
      masterData &&
      (Array.isArray(masterData)
        ? masterData.length > 0
        : Object.keys(masterData).length > 0)
    ) {
      return masterData;
    }
    return localMasterData;
  }, [masterData, localMasterData]);

  const CATEGORY = useMemo(() => {
    const fromMaster = getOptionsForField(
      activeMasterData,
      ["CATEGORY", "Category", "category", "CATEGORIES", "CLUSTERS", "clusters"],
      625
    );
    if (fromMaster.length > 0) return fromMaster;
    return fetchedCategory;
  }, [activeMasterData, fetchedCategory]);

  const COSTCENTRE = useMemo(() => {
    const fromMaster = getOptionsForField(
      activeMasterData,
      [
        "COSTCENTRE",
        "CostCentre",
        "Costcentre",
        "costcentre",
        "COST_CENTRE",
        "Cost_Centre",
        "COSTCENTER",
        "CostCenter",
        "CLUSTERS",
        "clusters",
      ],
      628
    );
    if (fromMaster.length > 0) return fromMaster;
    return fetchedCostCentre;
  }, [activeMasterData, fetchedCostCentre]);

  const cityNewoption = useMemo(() => {
    const raw = activeMasterData?.CITY || [];
    return raw
      .map((item: any) => ({
        label: String(
          item?.label ||
            item?.CITY_NAME ||
            item?.City_Name ||
            item?.value ||
            item?.CITY_CODE ||
            item?.City_Code ||
            ""
        ).trim(),
        value: String(
          item?.value ?? item?.CITY_CODE ?? item?.City_Code ?? item?.label ?? ""
        ).trim(),
      }))
      .filter((o: any) => o.label !== "");
  }, [activeMasterData]);

  const Status = ["Status1", "Status2"];

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
                    initialValue={formData?.EmpMst?.CATEGORY?.toString()}
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
                    initialValue={formData?.EmpMst?.COSTCENTRE?.toString()}
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