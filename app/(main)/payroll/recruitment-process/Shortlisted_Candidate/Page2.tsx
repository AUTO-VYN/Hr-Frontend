"use client";

import React, { useEffect, useState } from "react";
import { useFormData } from "./Context/FormDataContext";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import SectionCard from "./SectionCard";
import { Users, MapPin } from "lucide-react";

type Props = {
  cityoption: any[];
  STATEoption: any[];
  flag?: string | null;
};

const bloodGroup = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "AB", label: "AB" },
  { value: "O", label: "O" },
  { value: "O+", label: "O+" },
];

const relCode = [
  { value: "1", label: "HINDU" },
  { value: "2", label: "MUSLIMS" },
  { value: "3", label: "SIKH" },
  { value: "4", label: "CHRISTIAN" },
  { value: "5", label: "JAIN" },
  { value: "6", label: "BUDDHA" },
  { value: "7", label: "PERSIANS" },
];

const Page2: React.FC<Props> = ({ cityoption, STATEoption, flag }) => {
  const { formData, setFormData } = useFormData();
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [flageData, setflageDataData] = useState<boolean>(false);

  useEffect(() => {
    if (flag === "true") {
      setflageDataData(false);
    } else {
      setflageDataData(true);
    }
  }, [flag]);

  const validateEmail = (value: string) => {
    const regex = /^[^\s@'"`;,]+@[^\s@'"`;,]+\.[^\s@'"`;,]+$/;
    return regex.test(value);
  };

  const handleInputValidation = (name: string, value: string) => {
    handleInputChange(name, value);
    let isValid = true;
    if (!value?.trim()) {
      isValid = false;
    } else if (name === "ALTERNET_MAIL") {
      isValid = validateEmail(value);
    }
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: value?.trim() ? !isValid : false,
    }));
  };

  const handleInputChange = (name: string, value: any) => {
    if ((name === "Father_Mob" || name === "Mother_Mob" || name === "MOBILENO") && value) {
      value = String(value).replace(/\D/g, "").slice(0, 10);
    }
    setFormData((prevFormData: any) => ({
      ...prevFormData,
      [name]: value,
    }));
  };

  const handelCheckBox = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target;
    if (checked) {
      const { PERMANENTADDRESS1, PCITY, PPINCODE, PSTATE } = formData;
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        CURRENTADDRESS1: PERMANENTADDRESS1,
        CCITY: PCITY,
        CPINCODE: PPINCODE,
        CSTATE: PSTATE,
      }));
    } else {
      setFormData((prevFormData: any) => ({
        ...prevFormData,
        CURRENTADDRESS1: "",
        CCITY: "",
        CPINCODE: "",
        CSTATE: "",
      }));
    }
  };

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
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
      {/* PERSONAL & FAMILY DETAILS CARD */}
      <SectionCard
        title="Personal & Family Details"
        icon={<Users size={18} />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Einput
              type="text"
              maxLength={100}
              title="Father's Name"
              name="FATHERNAME"
              value={formData?.FATHERNAME}
              handleInputChange={handleInputChange}
              disabled={flageData}
              className="uppercase"
            />
          </div>

          <div>
            <Einput
              type="text"
              title="Father's Mob No."
              name="Father_Mob"
              maxLength={10}
              value={formData?.Father_Mob}
              handleInputChange={handleInputChange}
              disabled={flageData}
            />
          </div>

          <div>
            <Einput
              type="text"
              title="Spouse's Name"
              name="SPOUSENAME"
              maxLength={100}
              value={formData?.SPOUSENAME}
              handleInputChange={handleInputChange}
              disabled={flageData}
              className="uppercase"
            />
          </div>

          <div>
            <Einput
              type="text"
              maxLength={100}
              title="Mother's Name"
              name="MOTHERNAME"
              value={formData?.MOTHERNAME}
              disabled={flageData}
              handleInputChange={handleInputChange}
              className="uppercase"
            />
          </div>

          <div>
            <Einput
              type="text"
              maxLength={10}
              title="Mother's Mob No."
              name="Mother_Mob"
              value={formData?.Mother_Mob}
              disabled={flageData}
              handleInputChange={handleInputChange}
            />
          </div>

          <div>
            <Eselect
              title="Religion"
              option={relCode}
              handleInputChange={handleInputChange}
              name="RELIGION1 || RELIGION"
              disabled={flageData}
              initialValue={
                formData?.RELIGION1?.trim() || formData?.RELIGION?.trim() || ""
              }
            />
          </div>

          <div>
            <Einput
              type="email"
              title="Personal Email"
              name="ALTERNET_MAIL"
              maxLength={40}
              value={formData?.ALTERNET_MAIL}
              handleInputChange={handleInputValidation}
              errorMessage={
                errors.ALTERNET_MAIL ? "Invalid Email Address" : ""
              }
              disabled={flageData}
            />
          </div>

          <div>
            <Einput
              type="date"
              title="Date of Birth (DOB)"
              name="DOB"
              value={formatDate(formData?.DOB)}
              handleInputChange={handleInputChange}
              disabled={flageData}
            />
          </div>

          <div>
            <Einput
              type="date"
              title="Date of Anniversary"
              name="DOM"
              value={formatDate(formData?.DOM)}
              handleInputChange={handleInputChange}
              disabled={flageData}
            />
          </div>

          <div>
            <Eselect
              title="Blood Group"
              name="BLOODGROUP"
              option={bloodGroup}
              initialValue={formData?.BLOODGROUP}
              handleInputChange={handleInputChange}
              disabled={flageData}
            />
          </div>

          <div>
            <Einput
              type="number"
              title="Height (In Feet)"
              name="EMPHEIGHT"
              maxLength={2}
              value={formData?.EMPHEIGHT}
              handleInputChange={handleInputChange}
              disabled={flageData}
            />
          </div>

          <div>
            <Einput
              type="number"
              title="Weight (In Kg)"
              name="EMPWEIGHT"
              maxLength={3}
              value={formData?.EMPWEIGHT}
              handleInputChange={handleInputChange}
              disabled={flageData}
            />
          </div>
        </div>
      </SectionCard>

      {/* ADDRESS INFORMATION CARD */}
      <SectionCard
        title="Address Information"
        icon={<MapPin size={18} />}
      >
        <div className="space-y-4">
          {/* Permanent Address Group */}
          <div className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            Permanent Address
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <Einput
                type="text"
                title="Permanent Address"
                name="PERMANENTADDRESS1"
                maxLength={250}
                value={formData?.PERMANENTADDRESS1}
                handleInputChange={handleInputChange}
                disabled={flageData}
              />
            </div>
            <div>
              <Eselect
                option={cityoption}
                title="Permanent City"
                name="PCITY"
                initialValue={formData?.PCITY ? formData?.PCITY.toString() : null}
                handleInputChange={handleInputChange}
                disabled={flageData}
              />
            </div>
            <div>
              <Einput
                type="text"
                title="Pincode"
                name="PPINCODE"
                maxLength={6}
                value={formData?.PPINCODE}
                handleInputChange={handleInputChange}
                disabled={flageData}
              />
            </div>
            <div className="sm:col-span-2">
              <Eselect
                option={STATEoption}
                title="State"
                name="PSTATE"
                initialValue={
                  formData?.PSTATE ? formData?.PSTATE.toString() : null
                }
                handleInputChange={handleInputChange}
                disabled={flageData}
              />
            </div>
            <div className="sm:col-span-2 flex items-end pb-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400 cursor-pointer">
                <input
                  type="checkbox"
                  name="Copy to Current Address"
                  onChange={handelCheckBox}
                  disabled={flageData}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Copy to Current Address</span>
              </label>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-3">
              Current / Present Address
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <Einput
                  type="text"
                  title="Current Address"
                  name="CURRENTADDRESS1"
                  maxLength={250}
                  value={formData?.CURRENTADDRESS1?.trim() || ""}
                  handleInputChange={handleInputChange}
                  disabled={flageData}
                />
              </div>
              <div>
                <Eselect
                  option={cityoption}
                  title="Current City"
                  name="CCITY"
                  initialValue={
                    formData?.CCITY ? formData?.CCITY.toString() : null
                  }
                  handleInputChange={handleInputChange}
                  disabled={flageData}
                />
              </div>
              <div>
                <Einput
                  type="text"
                  title="Pincode"
                  maxLength={6}
                  name="CPINCODE"
                  value={formData?.CPINCODE}
                  disabled={flageData}
                  handleInputChange={handleInputChange}
                />
              </div>
              <div>
                <Eselect
                  title="State"
                  name="CSTATE"
                  initialValue={
                    formData?.CSTATE ? formData?.CSTATE.toString() : null
                  }
                  option={STATEoption}
                  handleInputChange={handleInputChange}
                  disabled={flageData}
                />
              </div>
              <div>
                <Einput
                  type="text"
                  title="Mobile Number"
                  name="MOBILENO"
                  maxLength={10}
                  value={formData?.MOBILENO}
                  handleInputChange={handleInputChange}
                  disabled={flageData}
                />
              </div>
              <div className="sm:col-span-2">
                <Einput
                  type="text"
                  title="Landline Number"
                  name="MOBILE_NO"
                  maxLength={15}
                  value={formData?.MOBILE_NO}
                  handleInputChange={handleInputChange}
                  disabled={flageData}
                />
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

export default Page2;
