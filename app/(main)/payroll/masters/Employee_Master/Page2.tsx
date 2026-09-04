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
  const [Marital_Option, setMarital_Option] = useState(
    masterData.Marital_Status || [],
  );
  const [DistrictOption, setDistrictOption] = useState(
    masterData.District || [],
  );
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
        [name]:
          value && typeof value == "string"
            ? value.trim()
              ? !isValid
              : true
            : true,
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
            CDIST: prevData.EmpMst.PDIST,
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
    <div className="w-full fluid-p-xs max-w-full overflow-x-hidden">
      {/* Title */}

      <div className="grid grid-cols-12 fluid-gap-sm  max-w-full">
        {/* ===== Family Detail ===== */}
        <section className="col-span-12 xl:col-span-6 min-w-0">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow)] overflow-hidden">
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)] shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M16 11c1.657 0 3-1.567 3-3.5S17.657 4 16 4s-3 1.567-3 3.5S14.343 11 16 11ZM8 11c1.657 0 3-1.567 3-3.5S9.657 4 8 4 5 5.567 5 7.5 6.343 11 8 11Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M3.5 20c.6-3.3 3-5 6-5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M20.5 20c-.6-3.3-3-5-6-5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="min-w-0">
                <div className="text-lg font-semibold tracking-wider text-[var(--muted)]">
                  FAMILY DETAIL
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 fluid-gap-sm p-4 max-w-full">
              <div className="col-span-12 md:col-span-6 min-w-0">
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

              <div className="col-span-12 md:col-span-6 min-w-0">
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

              <div className="col-span-12 md:col-span-6 min-w-0">
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

              <div className="col-span-12 md:col-span-6 min-w-0">
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

              <div className="col-span-12 md:col-span-6 min-w-0">
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

              <div className="col-span-12 md:col-span-6 min-w-0">
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

              <div className="col-span-12 md:col-span-6 min-w-0">
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

              <div className="col-span-12 md:col-span-6 min-w-0">
                <Einput
                  type="taxt"
                  title="Email Address"
                  name="ALTERNET_MAIL"
                  value={formData.EmpMst.ALTERNET_MAIL}
                  handleInputChange={handleInputChange}
                  errorMessage={
                    errors.ALTERNET_MAIL ? "Invalid Email Address" : ""
                  }
                  redlabel={isMandatory("ALTERNET_MAIL") ? "*" : ""}
                />
              </div>

              <div className="col-span-12 md:col-span-6 min-w-0">
                <Einput
                  type="date"
                  ShortName={true} // ✅ title ko as-it-is show karega
                  title="Date of Anniversary" // ✅ 'of' small
                  name="DOM"
                  value={
                    formData.EmpMst.DOM ? formData.EmpMst.DOM.slice(0, 10) : ""
                  }
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("DOM") ? "*" : ""}
                />
              </div>

              <div className="col-span-12 md:col-span-6 min-w-0">
                <Eselect
                  title="Marital Status"
                  name="Marital_Status"
                  option={Marital_Option}
                  initialValue={formData.EmpMst.Marital_Status?.toString()}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("Marital_Status") ? "*" : ""}
                />
              </div>

              <div className="col-span-12 md:col-span-6 min-w-0">
                <Eselect
                  title="Blood Group"
                  name="BLOODGROUP"
                  option={bloodGroup}
                  initialValue={formData.EmpMst.BLOODGROUP}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("BLOODGROUP") ? "*" : ""}
                />
              </div>

              <div className="col-span-12 md:col-span-6 min-w-0">
                <Einput
                  type="number"
                  title="Height (In Feet)"
                  name="EMPHEIGHT"
                  value={formData.EmpMst.EMPHEIGHT}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("EMPHEIGHT") ? "*" : ""}
                />
              </div>

              <div className="col-span-12 min-w-0">
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
        </section>

        {/* ===== Address Information ===== */}
        <section className="col-span-12 xl:col-span-6 min-w-0">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow)] overflow-hidden">
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)] shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 11.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                </svg>
              </div>

              <div className="min-w-0">
                <div className="text-lg font-semibold tracking-wider text-[var(--muted)]">
                  ADDRESS INFORMATION
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 fluid-gap-sm p-4 max-w-full">
              <div className="col-span-12 min-w-0">
                <Einput
                  type="text"
                  title="Permanent Address"
                  name="PERMANENTADDRESS1"
                  value={
                    formData.EmpMst.PERMANENTADDRESS1 ||
                    formData?.EmpMst?.full_addressAadhaar
                  }
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("PERMANENTADDRESS1") ? "*" : ""}
                />
              </div>

              <div className="col-span-12 md:col-span-6 min-w-0">
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

              <div className="col-span-12 md:col-span-6 min-w-0">
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

              <div className="col-span-12 md:col-span-6 min-w-0">
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

              <div className="col-span-12 md:col-span-6 min-w-0">
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

              <div className="col-span-12 min-w-0 ">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--sub)] px-2 py-2">
                  <Acheckbox
                    name={"CopytoCurrentAddress"}
                    handleInputChange={handleCheckboxChange}
                    label={"Copy to Current Address"}
                    value={isChecked}
                    disabled={undefined}
                    ShortName={undefined}
                  />
                </div>
              </div>

              <div className="col-span-12 min-w-0">
                <Einput
                  type="text"
                  title="Address"
                  name="CURRENTADDRESS1"
                  value={formData.EmpMst.CURRENTADDRESS1}
                  handleInputChange={handleInputChange}
                />
              </div>

              <div className="col-span-12 md:col-span-6 min-w-0">
                <SelectSearch
                  options={cityNewoption}
                  title="City"
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

              <div className="col-span-12 md:col-span-6 min-w-0">
                <Einput
                  type="number"
                  title="Pincode"
                  name="CPINCODE"
                  value={formData.EmpMst.CPINCODE}
                  handleInputChange={handleInputChange}
                  maxLength={6}
                />
              </div>

              <div className="col-span-12 md:col-span-6 min-w-0">
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

              <div className="col-span-12 md:col-span-6 min-w-0">
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
        </section>

        {/* ===== Nominee Details ===== */}
        <section className="col-span-12 min-w-0">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow)] overflow-hidden">
            <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)] shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 21s-7-4.4-7-10V6l7-3 7 3v5c0 5.6-7 10-7 10Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className="min-w-0">
                <div className="text-xs font-semibold tracking-wider text-[var(--muted)]">
                  NOMINEE DETAILS
                </div>
                <div className="fluid-text-sm text-[var(--muted)] truncate">
                  Add nominee members
                </div>
              </div>
            </div>

            {/* IMPORTANT: no overflow-x-auto, no light-scroll */}
            <div className="p-4 max-w-full">
              <div className="max-w-full min-w-0 yn-table-wrap">
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
        </section>
      </div>
    </div>
  );
};

export default Page2;
