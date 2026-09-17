"use client";

import React, { useEffect, useState } from "react";
import { useFormData } from "./Context/FormDataContext";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import SectionCard from "./SectionCard";
import { Calendar, ShieldCheck, CheckSquare } from "lucide-react";

type Props = {
  flag?: string | null;
};

const Page1: React.FC<Props> = ({ flag }) => {
  const [flageData, setflageDataData] = useState<boolean>(false);

  useEffect(() => {
    if (flag === "true") {
      setflageDataData(false);
    } else {
      setflageDataData(true);
    }
  }, [flag]);

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const { formData, setFormData } = useFormData();

  const yesno = [
    { value: "0", label: "YES" },
    { value: "1", label: "NO" },
  ];
  const boolean = [
    { value: "0", label: "YES" },
    { value: "1", label: "NO" },
  ];

  const formatDate = (dateString: any) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString).slice(0, 10);
    const year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    return `${year}-${month < 10 ? `0${month}` : month}-${day < 10 ? `0${day}` : day}`;
  };

  const handleInputChange = (name: string, value: any) => {
    if (name === "UID_NO" && value) {
      value = String(value).slice(0, 12);
    }
    if (name === "PANNO" && value) {
      value = String(value).toUpperCase();
    }
    if (name === "PASSPORTNO" && value) {
      value = String(value).toUpperCase();
    }
    if (name === "MOBILE_NO" && value) {
      value = String(value).replace(/\D/g, "").slice(0, 10);
    }
    setFormData((prevData: any) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const validateEmail = (value: string) => {
    const regex = /^[^\s@'"`;,]+@[^\s@'"`;,]+\.[^\s@'"`;,]+$/;
    return regex.test(value);
  };
  const validatePanCard = (value: string) => {
    const regex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return regex.test(value.toUpperCase());
  };
  const validateAadhar = (value: any) => {
    const regex = /^[0-9]{12}$/;
    return regex.test(String(value));
  };
  const validatePassportNumber = (value: string) => {
    const regex = /^[A-Z]{1,2}[0-9]{6,7}$/;
    return regex.test(value.toUpperCase());
  };

  const handleInputValidation = (name: string, value: string) => {
    handleInputChange(name, value);
    let isValid = true;
    if (!value?.trim()) {
      isValid = false;
    } else if (name === "CORPORATEMAILID") {
      isValid = validateEmail(value);
    } else if (name === "PANNO") {
      isValid = validatePanCard(value);
    } else if (name === "UID_NO") {
      isValid = validateAadhar(value);
    } else if (name === "PASSPORTNO") {
      isValid = validatePassportNumber(value);
    }
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: value?.trim() ? !isValid : false,
    }));
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
      {/* BASIC JOINING DETAILS CARD */}
      <SectionCard
        title="Basic Joining Details"
        icon={<Calendar size={18} />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Einput
              type="date"
              value={formatDate(formData?.Interview_Date)}
              title="Date of Interview"
              name="Interview_Date"
              handleInputChange={handleInputChange}
              disabled={flageData}
            />
          </div>

          <div>
            <Eselect
              title="Emp. Status"
              option={yesno}
              name="EMP_STATUS"
              initialValue={formData?.EMP_STATUS?.toString()}
              handleInputChange={handleInputChange}
              disabled={flageData}
            />
          </div>

          <div>
            <Einput
              type="date"
              title="Date of Joining"
              name="CURRENTJOINDATE"
              value={formatDate(formData?.CURRENTJOINDATE)}
              handleInputChange={handleInputChange}
              disabled={flageData}
            />
          </div>

          <div>
            <Eselect
              title="Induction Status"
              name="Induction_Done"
              option={boolean}
              initialValue={formData?.Induction_Done?.toString()}
              handleInputChange={handleInputChange}
              disabled={flageData}
            />
          </div>

          <div>
            <Einput
              type="number"
              title="Prob. Period (Days)"
              name="PROBATIONPERIOD"
              value={formData?.PROBATIONPERIOD}
              handleInputChange={handleInputChange}
              disabled={flageData}
              maxLength={3}
            />
          </div>

          <div>
            <Einput
              type="date"
              title="Probation End Date"
              name="Prob_period"
              value={formatDate(formData?.Prob_period)}
              handleInputChange={handleInputChange}
              disabled={flageData}
            />
          </div>

          <div>
            <Einput
              value={formData?.CORPORATEMAILID}
              type="email"
              title="Official Email"
              name="CORPORATEMAILID"
              maxLength={70}
              handleInputChange={handleInputValidation}
              errorMessage={
                errors.CORPORATEMAILID ? "Invalid Email Address" : ""
              }
              disabled={flageData}
            />
          </div>

          <div>
            <Einput
              type="text"
              title="Mobile Number"
              name="MOBILE_NO"
              maxLength={10}
              value={formData?.MOBILE_NO}
              handleInputChange={handleInputChange}
              disabled={flageData}
            />
          </div>

          <div>
            <Einput
              type="text"
              title="Skills"
              maxLength={100}
              value={formData?.SKILLS}
              name="SKILLS"
              handleInputChange={handleInputChange}
              disabled={flageData}
            />
          </div>

          <div>
            <Einput
              type="text"
              title="Emp. Punch Code"
              name="PAY_CODE"
              maxLength={30}
              value={formData?.PAY_CODE}
              handleInputChange={handleInputChange}
              disabled={flageData}
            />
          </div>
        </div>
      </SectionCard>

      {/* CANDIDATE STATUTORY IDENTITY CARD */}
      <SectionCard
        title="Candidate Statutory Identity"
        icon={<ShieldCheck size={18} />}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Einput
              type="text"
              title="PAN Card No."
              name="PANNO"
              maxLength={10}
              value={formData?.PANNO}
              handleInputChange={handleInputValidation}
              errorMessage={errors.PANNO ? "Invalid PAN Card Number" : ""}
              disabled={flageData}
              className="uppercase"
            />
          </div>

          <div className="flex items-end pb-1.5">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                name="PAN_VERIFICATION"
                checked={Boolean(formData?.PAN_VERIFICATION)}
                onChange={(e) =>
                  handleInputChange("PAN_VERIFICATION", e.target.checked)
                }
                disabled={flageData}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>PAN Card Verified</span>
            </label>
          </div>

          <div>
            <Einput
              type="text"
              title="Aadhaar Card No."
              name="UID_NO"
              maxLength={12}
              value={formData?.UID_NO}
              handleInputChange={handleInputChange}
              disabled={flageData}
            />
          </div>

          <div className="flex items-end pb-1.5">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                name="AADHAR_VERIFICATION"
                checked={Boolean(formData?.AADHAR_VERIFICATION)}
                onChange={(e) =>
                  handleInputChange("AADHAR_VERIFICATION", e.target.checked)
                }
                disabled={flageData}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Aadhaar Verified</span>
            </label>
          </div>

          <div>
            <Einput
              type="text"
              maxLength={15}
              title="Passport No."
              name="PASSPORTNO"
              value={formData?.PASSPORTNO?.trim()}
              handleInputChange={handleInputValidation}
              errorMessage={errors.PASSPORTNO ? "Invalid Passport No." : ""}
              disabled={flageData}
              className="uppercase"
            />
          </div>

          <div className="flex items-end pb-1.5">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                name="PASSPORT_VERIFICATION"
                checked={Boolean(formData?.PASSPORT_VERIFICATION)}
                onChange={(e) =>
                  handleInputChange("PASSPORT_VERIFICATION", e.target.checked)
                }
                disabled={flageData}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Passport Verified</span>
            </label>
          </div>

          <div>
            <Einput
              type="date"
              title="Passport Expiry Date"
              name="PASSEXPIRYDATE"
              value={formatDate(formData?.PASSEXPIRYDATE)}
              handleInputChange={handleInputChange}
              disabled={flageData}
            />
          </div>

          <div>
            <Einput
              type="text"
              title="Driving Lic. No."
              name="DRIVINGLIC_ISSUEPALACE"
              maxLength={16}
              value={formData?.DRIVINGLIC_ISSUEPALACE}
              handleInputChange={handleInputChange}
              disabled={flageData}
            />
          </div>

          <div>
            <Einput
              type="date"
              title="Driving Lic. Issue Date"
              name="DRIVINGLIC_ISSUEDATE"
              value={formatDate(formData?.DRIVINGLIC_ISSUEDATE)}
              handleInputChange={handleInputChange}
              disabled={flageData}
            />
          </div>

          <div className="flex items-end pb-1.5">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                name="DRIVING_VERIFICATION"
                checked={Boolean(formData?.DRIVING_VERIFICATION)}
                onChange={(e) =>
                  handleInputChange("DRIVING_VERIFICATION", e.target.checked)
                }
                disabled={flageData}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Driving Lic. Verified</span>
            </label>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

export default Page1;
