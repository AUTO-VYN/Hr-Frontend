"use client";

import Acheckbox from "@/components/atoms/Checkbox";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import SmallTitle from "@/components/atoms/smallTitle";
import { useFormData } from "./Context/FormDataContext";
import { useEffect, useState } from "react";
import TableComponent from "@/components/atoms/DynamicTable";
import SelectSearch from "@/components/atoms/Select";
import YNDynamicTable from "@/components/atoms/YNDynamicTable";

const bloodGroup = [
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
];

const RELIGION = [
  { value: "1", label: "HINDU" },
  { value: "2", label: "MUSLIMS" },
  { value: "3", label: "SIKH" },
  { value: "4", label: "CHRISTIAN" },
  { value: "5", label: "JAIN" },
  { value: "6", label: "BUDDHA" },
  { value: "7", label: "PERSIANS" },
];
interface Dropdownoption {
  Cityoption: Array<{ value: string; label: string }>;
  Stateoption: Array<{ value: string; label: string }>;
}

interface RowData3 {
  Emp_Family_name: string;
  Emp_Family_Address: string;
  Emp_Family_Relation: string;
  Emp_Family_Profession: string;
  Emp_Family_Gender: string;
}
const Page2 = ({ masterData, isMandatory }) => {
  const { formData, setFormData } = useFormData();
  const [isChecked, setIsChecked] = useState(false);
  const [Stateoption, setStateoption] = useState(masterData.STATE || []);
  const [Marital_Option, setMarital_Option] = useState(masterData.Marital_Status || []);
  const [DistrictOption, setDistrictOption] = useState(masterData.District || []);
  const [cityNewoption, setcityNewoption] = useState(masterData.CITY || []);
  const handleSelectChange = (name, selectedOption) => {
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



  const [errors, setErrors] = useState({});
  const validateEmail = (value: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value);
  };


  const handleInputChange = (name, value) => {

    if (name === "PPINCODE") {
      if (!/^\d{0,6}$/.test(value)) return;
    }
    let isValid = true;

    if (name == "ALTERNET_MAIL") {
      isValid = validateEmail(value);
    }



    setFormData((prevData) => {
      let updatedData = {
        ...prevData,
        EmpMst: {
          ...prevData.EmpMst,
          [name]: value,
        },
      };

      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]: value && typeof value == "string" ? value.trim() ? !isValid : true : true,
      }));

      // If checkbox is checked, copy permanent address details to current address
      if (name === "CopytoCurrentAddress" && value) {
        updatedData = {
          ...updatedData,
          EmpMst: {
            ...updatedData.EmpMst,
            CURRENTADDRESS1: prevData.EmpMst.PERMANENTADDRESS1,
            CPINCODE: prevData.EmpMst.PPINCODE,
            CSTATE: prevData.EmpMst.PSTATE,
            CDIST: prevData.EmpMst.PDIST
          },
        };
      }

      return updatedData;
    });
  };

  //Table

  const [EmpFamily, setEmpFamily] = useState<RowData3[]>([]);
  const [currentRow2, setCurrentRow2] = useState<RowData3>({
    Emp_Family_name: "",
    Emp_Family_Address: "",
    Emp_Family_Relation: "",
    Emp_Family_Profession: "",
    Emp_Family_Gender: "",
  });

  const [tableData, setTableData] = useState(formData.EmpFamily || [{}]);
  useEffect(() => {
    setFormData((prevData: any) => ({
      ...prevData,
      EmpFamily: tableData,
    }));
  }, [tableData]);
  const columnsShow = [
    "Nominee For",
    "Member Name",
    "Relation",
    "Profession",
    "Is Minor",
  ];
  const columns = [
    "Emp_Family_name",
    "Emp_Family_Address",
    "Emp_Family_Relation",
    "Emp_Family_Profession",
    "Emp_Family_Gender",
  ];
  const constraints = {
    Emp_Family_name: { type: "TEXT", required: true },
    Emp_Family_Address: { type: "TEXT", required: true },
    Emp_Family_Relation: { type: "TEXT" },
    Emp_Family_Profession: { type: "TEXT" },
    Emp_Family_Gender: { type: "TEXT" },
  };



  const handleCheckboxChange = () => {
    setIsChecked((prevChecked) => {
      const newCheckedState = !prevChecked;

      setFormData((prevData) => ({
        ...prevData,
        EmpMst: {
          ...prevData.EmpMst,
          CURRENTADDRESS1: newCheckedState
            ? prevData.EmpMst.PERMANENTADDRESS1
            : "",
          CPINCODE: newCheckedState ? prevData.EmpMst.PPINCODE : "",
          CSTATE: newCheckedState ? prevData.EmpMst.PSTATE : "",
          CCITY: newCheckedState ? prevData.EmpMst.PCITY : "",
          CDIST: newCheckedState ? prevData.EmpMst.PDIST : "",
        },
      }));

      return newCheckedState;
    });
  };

  return (
    <div className="w-full ">
      <div className="w-full rounded-md">
        <div className="grid grid-cols-12 gap-3"> {/* ye pr changes h */}

          <div className="col-span-12 xl:col-span-6 ">{/* ye pr changes h */}

            <div className="rounded-t bg-[#193A69] dark:bg-black px-3 py-2 border dark:border-[#D0D5DD]">{/* ye pri div replesh karna h */}
              <h1 className="text-white dark:text-[#37a9dd] uppercase font-semibold text-sm">
                Family Detail
              </h1>
            </div>

            <div className="grid grid-cols-12 gap-3 p-4 mt-2 bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow">{/* ye pr changes h */}
              <div className="col-span-6 sm:col-span-4">
                <Einput
                  type="text"
                  title="Father's Name"
                  name="FATHERNAME"
                  value={
    formData.EmpMst.FATHERNAME ||
    formData?.EmpMst?.fatherNameAadhaar
  }
                  handleInputChange={handleInputChange}
                  className="uppercase"
                  redlabel={isMandatory("FATHERNAME") ? "*" : ""}
                />
              </div>
              <div className="col-span-6 sm:col-span-4">
                <Einput
                  type="text"
                  title="Father's Mob No."
                  name="Father_Mob"
                  value={formData.EmpMst.Father_Mob}
                  handleInputChange={handleInputChange}
                  maxLength={10}
                  onInput={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (value.length <= 10) {
                      e.target.value = value;
                      handleInputChange("Father_Mob", value);
                    }
                  }}
                  redlabel={isMandatory("Father_Mob") ? "*" : ""}
                />
              </div>
              <div className="col-span-6 sm:col-span-4">
                <Einput
                  type="text"
                  title="Spouse's Name"
                  name="SPOUSENAME"
                  value={formData.EmpMst.SPOUSENAME}
                  handleInputChange={handleInputChange}
                  className="uppercase"
                  redlabel={isMandatory("SPOUSENAME") ? "*" : ""}
                />
              </div>
              <div className="col-span-6 sm:col-span-4">
                <Einput
                  type="text"
                  title="Mother's Name"
                  name="MOTHERNAME"
                  value={formData.EmpMst.MOTHERNAME}
                  handleInputChange={handleInputChange}
                  className="uppercase"
                  redlabel={isMandatory("MOTHERNAME") ? "*" : ""}
                />
              </div>
              <div className="col-span-6 sm:col-span-4">
                <Einput
                  type="text"
                  title="Mother's Mob No."
                  name="MOTHERCONTACTNO"
                  value={formData.EmpMst.MOTHERCONTACTNO}
                  handleInputChange={handleInputChange}
                  pattern="\d{10}"
                  maxLength={10}
                  onInput={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (value.length <= 10) {
                      e.target.value = value;
                      handleInputChange("MOTHERCONTACTNO", value);
                    }
                  }}
                  redlabel={isMandatory("MOTHERCONTACTNO") ? "*" : ""}
                />
              </div>
              <div className="col-span-6 sm:col-span-4">
                <Einput
                  type="text"
                  title="Spouse's Mob No."
                  name="SPOUSECONTACTNO"
                  value={formData.EmpMst.SPOUSECONTACTNO}
                  handleInputChange={handleInputChange}
                  pattern="\d{10}"
                  maxLength={10}
                  onInput={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (value.length <= 10) {
                      e.target.value = value;
                      handleInputChange("SPOUSECONTACTNO", value);
                    }
                  }}
                  redlabel={isMandatory("SPOUSECONTACTNO") ? "*" : ""}
                />
              </div>
              <div className="col-span-6 sm:col-span-4">
                {/* <Einput
                    type="text"
                    title="Religion"
                    name="RELCODE"
                    value={formData.EmpMst.RELIGION}
                    handleInputChange={handleInputChange}
                  /> */}

                <SelectSearch
                  options={RELIGION}
                  title="Religion"
                  name="RELCODE"
                  className="!h-[30px]"
                  selectedValue={formData.EmpMst.RELCODE?.toString()}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("RELCODE") ? "*" : ""}
                />
              </div>
              <div className="col-span-6 sm:col-span-4">
                <Einput
                  type="taxt"
                  title="Email Address"
                  name="ALTERNET_MAIL"
                  value={formData.EmpMst.ALTERNET_MAIL}
                  handleInputChange={handleInputChange}
                  errorMessage={errors.ALTERNET_MAIL ? "Invalid Email Address" : ""}
                  redlabel={isMandatory("ALTERNET_MAIL") ? "*" : ""}
                />
              </div>
              {/* <div className="col-span-3 sm:col-span-2">
                <Einput
                  type="date"
                  ShortName={true}
                  title="Date of Birth (DOB)"
                  name="DOB"
                  value={
                    formData.EmpMst.DOB
                      ? formData.EmpMst.DOB.slice(0, 10)
                      : ""
                  }
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("DOB") ? "*" : ""}
                />
              </div> */}
              <div className="col-span-6 sm:col-span-4">
                <Einput
                  type="date"
                  title="Date of Anniversary"
                  name="DOM"
                  value={
                    formData.EmpMst.DOM
                      ? formData.EmpMst.DOM.slice(0, 10)
                      : ""
                  }
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("DOM") ? "*" : ""}
                />
              </div>
              <div className="col-span-6 sm:col-span-4">
                <Eselect
                  title="Marital Status"
                  name="Marital_Status"
                  option={Marital_Option}
                  initialValue={formData.EmpMst.Marital_Status?.toString()}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("Marital_Status") ? "*" : ""}
                />
              </div>
              <div className="col-span-6 sm:col-span-4">
                <Eselect
                  title="Blood Group"
                  name="BLOODGROUP"
                  option={bloodGroup}
                  initialValue={formData.EmpMst.BLOODGROUP}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("BLOODGROUP") ? "*" : ""}
                />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <Einput
                  type="number"
                  title="Height (In Feet)"
                  name="EMPHEIGHT"
                  value={formData.EmpMst.EMPHEIGHT}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("EMPHEIGHT") ? "*" : ""}
                />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <Einput
                  type="number"
                  title="Weight (In Kg)"
                  name="EMPWEIGHT"
                  value={formData.EmpMst.EMPWEIGHT}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("EMPWEIGHT") ? "*" : ""}
                />
              </div>

            </div>
          </div>


          <div className="col-span-12 xl:col-span-6">{/* ye pr changes h */}

            <div className="rounded-t bg-[#193A69] dark:bg-black px-3 py-2 border dark:border-[#D0D5DD]">{/* ye pri div replesh karna h */}
              <h1 className="text-white dark:text-[#37a9dd] uppercase font-semibold text-sm">
                Address information
              </h1>
            </div>

            <div className="grid grid-cols-12 gap-3 p-4 mt-2 bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow"> {/* ye pr changes h */}
              <div className="col-span-12 sm:col-span-6">
                <Einput
                  type="text"
                  title="Permanent Address"
                  name="PERMANENTADDRESS1"
                  value={formData.EmpMst.PERMANENTADDRESS1 || formData?.EmpMst?.full_addressAadhaar}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("PERMANENTADDRESS1") ? "*" : ""}
                />
              </div>
              <div className="col-span-6 sm:col-span-3">
                <SelectSearch
                  options={cityNewoption}
                  title="Permanent City"
                  name="PCITY"
                  className="!h-[30px]"
                  selectedValue={
                    formData.EmpMst.PCITY
                      ? formData.EmpMst.PCITY.toString()
                      : null
                  }
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("PCITY") ? "*" : ""}
                />
              </div>
              <div className="col-span-6 sm:col-span-3">
                <Einput
                  type="number"
                  title="Pincode"
                  name="PPINCODE"
                  value={formData.EmpMst.PPINCODE}
                  handleInputChange={handleInputChange}
                  maxLength={6}
                  pattern="\d{6}"
                  redlabel={isMandatory("PPINCODE") ? "*" : ""}
                />
              </div>
              <div className="col-span-12 sm:col-span-3">
                <div className="">
                  <Eselect
                    option={Stateoption}
                    title="State"
                    name="PSTATE"
                    initialValue={
                      formData.EmpMst.PSTATE
                        ? formData.EmpMst.PSTATE.toString()
                        : null
                    }
                    handleInputChange={handleInputChange}
                    redlabel={isMandatory("PSTATE") ? "*" : ""}
                  />
                </div>
              </div>
              <div className="col-span-12 sm:col-span-3">
                <div className="">
                  <Eselect
                    option={DistrictOption}
                    title="District"
                    name="PDIST"
                    initialValue={
                      formData.EmpMst.PDIST
                        ? formData.EmpMst.PDIST.toString()
                        : null
                    }
                    handleInputChange={handleInputChange}
                    redlabel={isMandatory("PDIST") ? "*" : ""}
                  />
                </div>
              </div>
              <div className="col-span-6 sm:col-span-3"></div>
              <div className="col-span-6 sm:col-span-3 flex justify-satrt items-center">
                <Acheckbox
                  name={"CopytoCurrentAddress"}
                  handleInputChange={handleCheckboxChange}
                  label={"Copy to Current Address"}
                  value={isChecked}
                />
              </div>

              <div className="col-span-12 sm:col-span-6">
                <div className=" ">
                  <Einput
                    type="text"
                    title="Current Address"
                    name="CURRENTADDRESS1"
                    value={formData.EmpMst.CURRENTADDRESS1}
                    handleInputChange={handleInputChange}

                  />
                </div>
              </div>
              <div className="col-span-6 sm:col-span-3">
                <div className=" ">
                  <SelectSearch
                    options={cityNewoption}
                    title="Current City"
                    name="CCITY"
                    className="!h-[30px]"
                    selectedValue={
                      formData.EmpMst.CCITY
                        ? formData.EmpMst.CCITY.toString()
                        : null
                    }
                    handleInputChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="col-span-6 sm:col-span-3">
                <div className=" ">
                  <Einput
                    type="number"
                    title="Pincode"
                    name="CPINCODE"
                    value={formData.EmpMst.CPINCODE}
                    handleInputChange={handleInputChange}
                    maxLength={6}
                  />
                </div>
              </div>
              <div className="col-span-12 sm:col-span-3">
                <div className=" ">
                  <Eselect
                    title="State"
                    name="CSTATE"
                    initialValue={
                      formData.EmpMst.CSTATE
                        ? formData.EmpMst.CSTATE.toString()
                        : null
                    }
                    option={Stateoption}
                    handleInputChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="col-span-12 sm:col-span-3">
                <div className=" ">
                  <Eselect
                    title="District"
                    name="CDIST"
                    initialValue={
                      formData.EmpMst.CDIST
                        ? formData.EmpMst.CDIST.toString()
                        : null
                    }
                    option={DistrictOption}
                    handleInputChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

          </div>


          <div className="rounded-lg mb-3 col-span-12  shadow "> {/* ye pr changes h */}

            <div className="rounded-t bg-[#193A69] dark:bg-black mb-0 px-2 py-2 border dark:border-[#D0D5DD]"> {/* ye pri div replesh karna h */}
              <div className="flex flex-col sm:flex-row items-center justify-between">
                <h1 className=" font-semibold text-sm">
                  <div className="flex  text-white dark:text-[#37a9dd] uppercase">
                    Nominee Details
                  </div>
                </h1>
              </div>
            </div>



            <div className="overflow-x-auto w-full gap-3 p-4 mt-2 bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow"> {/* ye pri div replesh karna h */}
              <YNDynamicTable
                columns={columns}
                tableData={tableData}
                setTableData={setTableData}
                constraints={constraints}
                columnsShow={columnsShow}
              />
            </div>

          </div>


        </div>
      </div>
    </div>
  );
};

export default Page2;
