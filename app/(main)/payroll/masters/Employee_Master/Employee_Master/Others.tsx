"use client"
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import ATextArea from "@/components/atoms/textArea";
import { useFormData } from "./Context/FormDataContext";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/app/hooks/use-current-user";

export default function page({ masterData, isMandatory }) {


  const { formData, setFormData } = useFormData();
  const user = useCurrentUser()


  function filterDataByMiscType(Masters: any, miscType: any) {
    return Masters.filter(item => item.Misc_Type === miscType);
  }
  // const Designation = ["select", "Designation1", "Designation2"];
  // const country = ["select", "Indian", "Abroad"];
  const Status = ["Status1", "Status2"];
  // const Biometric = ["Biometric1", "Biometric2"];
  // const Employee_Level = ["beginner", "  Experience"];
  const [Masters, setMasters] = useState(masterData?.CLUSTERS || []);
  const [cityNewoption, setcityNewoption] = useState(masterData.CITY || []);
  const CATEGORY: any = filterDataByMiscType(Masters, 625);
  const CLUSTER: any = filterDataByMiscType(Masters, 626);
  const CHANNEL: any = filterDataByMiscType(Masters, 627);
  const COSTCENTRE: any = filterDataByMiscType(Masters, 628);


  const formatDate = (date: any) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      console.error(`Invalid date value provided: ${date}`);
      return '';
    }
    return d.toISOString().split('T')[0];
  };


  const country = ([
    { value: "INDIAN", label: "Indian" },
    { value: "ABROAD", label: "Abroad" }
  ])


  const Designation = ([
    { value: "1", label: "Designation1" },
    { value: "2", label: "Designation2" }
  ])
  const Biometric = ([
    { value: "1", label: "Biometric1" },
    { value: "2", label: "Biometric2" }
  ])

  const Employee_Level = ([
    { value: "1", label: "Beginner" },
    { value: "2", label: "Experience" }
  ])

  useEffect(() => {

    const dateneww = formData?.EmpMst?.CREATED_ON
    const currentDate1 = dateneww?.split("T")[0]; // Get current date in YYYY-MM-DD format
    setFormData((prevData) => ({
      ...prevData,
      EmpMst: { ...prevData.EmpMst, CREATED_ON: currentDate1 },
    }));
  }, []);

  const handleInputChange = (name: any, value: any) => {
    setFormData((prevData) => ({
      ...prevData,
      EmpMst: {
        ...prevData.EmpMst,
        [name]: value,
      },
    }));
  };






  return (
    <div className="">
      <div className="flex flex-col md:flex-row">

        <div className="w-full xl:w-8/12  md:mr-3 md:mb-0 ">

          <div className="rounded-t bg-[#193A69] dark:bg-black px-3 py-2 border dark:border-[#D0D5DD]">  {/* ye pri div replesh karna h */}
            <h1 className="text-white dark:text-[#37a9dd] uppercase font-semibold text-sm">
              Employee Other Details
            </h1>
          </div>

          <div className="mb-3 bg-slate-100  gap-3 p-4 mt-2 bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow">

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 xl:col-span-4">
                <Eselect
                  option={CATEGORY}
                  title="Category:"
                  name="CATEGORY"
                  handleInputChange={handleInputChange}
                  initialValue={formData.EmpMst.CATEGORY?.toString()}
                  redlabel={isMandatory("CATEGORY") ? "*" : ""}
                />
              </div> <div className="col-span-12 xl:col-span-4">
                <Eselect
                  option={COSTCENTRE}
                  title="Cost center:"
                  name="COSTCENTRE"
                  handleInputChange={handleInputChange}
                  initialValue={formData.EmpMst.COSTCENTRE?.toString()}
                  redlabel={isMandatory("COSTCENTRE") ? "*" : ""}
                />
              </div>
              <div className="col-span-12 xl:col-span-4">
                <Einput
                  type="text"
                  title="Prev. Company:"
                  name="PREVIOUSCOMPANYNAME"
                  value={formData.EmpMst.PREVIOUSCOMPANYNAME}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("PREVIOUSCOMPANYNAME") ? "*" : ""}
                />
              </div>
              <div className="col-span-12 xl:col-span-4">
                <Einput
                  type="text"
                  title="High. Quali.:"
                  name="BASICQUALIFICATION"
                  value={formData.EmpMst.BASICQUALIFICATION}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("BASICQUALIFICATION") ? "*" : ""}
                />
              </div>
              <div className="col-span-12 xl:col-span-4">
                <Einput
                  type="text"
                  title="Prev. Exp.:"
                  name="EXP_IN_YEAR"
                  handleInputChange={handleInputChange}
                  value={formData.EmpMst.EXP_IN_YEAR}
                  redlabel={isMandatory("EXP_IN_YEAR") ? "*" : ""}
                />
              </div>
              <div className="col-span-12 xl:col-span-4">
                <Eselect
                  option={country}
                  title="Nationality:"
                  name="CNATIONALITY"
                  handleInputChange={handleInputChange}
                  initialValue={formData.EmpMst.CNATIONALITY}
                  redlabel={isMandatory("CNATIONALITY") ? "*" : ""}
                />
              </div>
              <div className="col-span-12 xl:col-span-4">
                {/* <Einput
                  type="text"
                  title="Company City:"
                  name="PRECOMPCITY"
                  className="form-control"
                  value={formData.EmpMst.PRECOMPCITY}
                  handleInputChange={handleInputChange}
                /> */}
                <Eselect className="col-span-12 xl:col-span-4"
                  option={cityNewoption}
                  title="Company City"
                  name="PRECOMPCITY"
                  initialValue={
                    formData.EmpMst.PRECOMPCITY
                      ? formData.EmpMst.PRECOMPCITY.toString()
                      : null
                  }
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("PRECOMPCITY") ? "*" : ""}
                />
              </div>
              <div className="col-span-12 xl:col-span-4">
                <Eselect
                  option={Designation}
                  title="Prev. Designation:"
                  name="PREDESIGNATION"
                  handleInputChange={handleInputChange}
                  initialValue={formData.EmpMst.PREDESIGNATION}
                  redlabel={isMandatory("PREDESIGNATION") ? "*" : ""}
                />
              </div>
              <div className="col-span-12 xl:col-span-4">
                <Einput
                  title="Branch:"
                  handleInputChange={handleInputChange}
                  value={formData.EmpMst.Acnt_Loc}
                  name="Acnt_Loc"
                  type={"number"}
                  redlabel={isMandatory("Acnt_Loc") ? "*" : ""}
                />
              </div>
              {/* <div className="col-span-12 xl:col-span-4">
                <Eselect
                  option={Status}
                  title="Employee Status:"
                  name="EMPLOYEE_STATUS"
                  handleInputChange={handleInputChange}
                  initialValue={formData.EmpMst.EMPLOYEE_STATUS}
                />
              </div> */}
              <div className="col-span-12 xl:col-span-4">
                <Einput
                  title="Username:"
                  name="USR_NAME"
                  value={formData.EmpMst.USR_NAME}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("USR_NAME") ? "*" : ""}
                />
              </div>
              <div className="col-span-12 xl:col-span-4">
                <Einput
                  title="Application ID:"
                  name="APPLICATION_ID"
                  type="text"
                  value={formData.EmpMst.APPLICATION_ID}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("APPLICATION_ID") ? "*" : ""}
                />
              </div>
              <div className="col-span-12 xl:col-span-4">
                <Eselect
                  option={Biometric}
                  title="Biometric ID:"
                  name="BIOMETRIC_ID"
                  handleInputChange={handleInputChange}
                  initialValue={formData.EmpMst.BIOMETRIC_ID}
                  redlabel={isMandatory("BIOMETRIC_ID") ? "*" : ""}
                />
              </div>
              <div className="col-span-12 xl:col-span-4">
                <Eselect
                  option={Employee_Level}
                  title="Employee Level:"
                  name="LEVEL"
                  initialValue={formData?.EmpMst?.LEVEL}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("LEVEL") ? "*" : ""}
                />
              </div>
              <div className="col-span-12 xl:col-span-4">
                <Einput
                  title="Extension No:"
                  name="EXT_NO"
                  type="text"
                  value={formData.EmpMst.EXT_NO}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("EXT_NO") ? "*" : ""}
                />
              </div>
              <div className="col-span-12 xl:col-span-4">
                <Einput
                  type="date"
                  title="Proposed Retirement Date:"
                  name="PROPOSEDRETIRE_DATE"
                  value={formatDate(formData.EmpMst.PROPOSEDRETIRE_DATE)}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("PROPOSEDRETIRE_DATE") ? "*" : ""}
                />
              </div>
              <div className="col-span-12 xl:col-span-4">
                <Einput
                  type="text"
                  title="Old Empcode"
                  name="AX_EMP_CODE"
                  value={formData.EmpMst.AX_EMP_CODE}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("AX_EMP_CODE") ? "*" : ""}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="w-full xl:w-4/12 ">

          <div className="rounded-t bg-[#193A69] dark:bg-black px-3 py-2 border dark:border-[#D0D5DD]">  {/* ye pri div replesh karna h */}
            <h1 className="text-white dark:text-[#37a9dd] uppercase font-semibold text-sm">
              Alter Logs
            </h1>
          </div>
          <div className="container  front mr-2 gap-3 p-4 mt-2 bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow">
            <div className="grid grid-cols-12 gap-4 bg-slate-100 ">
              <div className="col-span-12 xl:col-span-6">
                <Einput
                  type="text"
                  title="Created By:"
                  name="CREATED_BY"
                  className="form-control"
                  value={formData.EmpMst.CREATED_BY}
                  handleInputChange={handleInputChange}
                  disabled
                />
              </div>
              <div className="col-span-12 xl:col-span-6">
                <Einput
                  type="date"
                  title="Created On:"
                  name="CREATED_ON"
                  handleInputChange={handleInputChange}
                  value={formData.EmpMst.CREATED_ON}
                  disabled
                />
              </div>
              <div className="col-span-12 xl:col-span-6">
                <Einput
                  type="text"
                  title="Last Modified By:"
                  value={formData.EmpMst.LASTMODI_BY}
                  name="LASTMODI_BY"
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("LASTMODI_BY") ? "*" : ""}
                  disabled
                />
              </div>
              <div className="col-span-12 xl:col-span-6">
                <Einput
                  type="date"
                  title="Last Modified On:"
                  value={formatDate(formData.EmpMst.LASTMODI_ON)}
                  name="LASTMODI_ON"
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("LASTMODI_ON") ? "*" : ""}
                  disabled
                />
              </div>
              {/* <div className="col-span-12 md:col-span-12 mt-1">
                <Einput
                  type="TEXT"
                  title="Machine Name:"
                  name="MACHINE_NAME"
                  handleInputChange={handleInputChange}
                  value={formData.EmpMst.MACHINE_NAME}

                />
              </div> */}
              <div className="col-span-12 mt-1">
                <ATextArea
                  title="Roles and Responsibilities:"
                  name="ROLE"
                  value={formData.EmpMst.ROLE}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("ROLE") ? "*" : ""}
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

