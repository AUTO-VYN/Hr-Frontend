"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  User,
  Users,
  MapPin,
  CreditCard,
  Briefcase,
  Settings,
  FileText,
  ChevronDown,
  ChevronUp,
  Camera,
  Shield,
  BadgeCheck,
  Upload,
  Eye,
  X,
  Save,
  AlertTriangle,
  FileCheck2,
  FileX,
  UserCheck,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import HashloaderComponent from "@/components/Templates/hashloader";
import { useSecureStorage } from "@/app/hooks/comp-key-data";

// Mandatory components
import Button from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import Switch from "@/components/atoms/Switch";

const UPDATE_PROFILE_URL = `${process.env.NEXT_PUBLIC_URL}/mobile/updateEmpProfile`;

const FIELD_NAMES = {
  profile: "profileImage",
  adhar: "adharDocument",
  pan: "panDocument",
  salary: "salarySlipDocument",
  other: "otherDocument",
};

type DocKey = "adhar" | "pan" | "salary" | "other";

// Dropdown options
const BLOOD_GROUP_OPTIONS = [
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
];

const MARITAL_STATUS_OPTIONS = [
  { value: "Single", label: "Single" },
  { value: "Married", label: "Married" },
  { value: "Divorced", label: "Divorced" },
  { value: "Widowed", label: "Widowed" },
];

const RELIGION_OPTIONS = [
  { value: "Hindu", label: "Hindu" },
  { value: "Muslim", label: "Muslim" },
  { value: "Christian", label: "Christian" },
  { value: "Sikh", label: "Sikh" },
  { value: "Jain", label: "Jain" },
  { value: "Other", label: "Other" },
];

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

const MARITAL_STATUS_MAP: Record<string, string> = {
  "1": "Single",
  "2": "Married",
  "3": "Divorced",
  "4": "Widowed",
  Single: "Single",
  Married: "Married",
  Divorced: "Divorced",
  Widowed: "Widowed",
};

const RELIGION_MAP: Record<string, string> = {
  "1": "Hindu",
  "2": "Muslim",
  "3": "Sikh",
  "4": "Christian",
  "5": "Jain",
  Hindu: "Hindu",
  Muslim: "Muslim",
  Christian: "Christian",
  Sikh: "Sikh",
  Jain: "Jain",
  Other: "Other",
};

const getDisplayValue = (value: any, map: Record<string, string>): string => {
  if (!value) return "";
  const strValue = String(value);
  return map[strValue] || strValue;
};

type ProfileFormData = {
  empCode: string;
  employeedesignation: string;
  empName: string;
  mobileNo: string;
  landlineNumber: string;
  coporateMailId: string;
  alternateMailId: string;
  gender: string;
  dob: string;
  maritialStatus: string;
  dom: string;
  bloodGroup: string;
  skills: string;
  basicQualification: string;
  professionalQualification: string;
  religion: string;
  driving_licence: string;
  empHeight: string;
  empWeight: string;
  childrenDetails: string;
  languageDetails: string;
  fatherName: string;
  fatherOccupation: string;
  fatherMobile: string;
  motherName: string;
  motherMobile: string;
  spouseName: string;
  spouseGender: string;
  spouseMobile: string;
  siblingName: string;
  siblingContactNumber: string;
  emergencyName: string;
  emergencyNumber: string;
  panNo: string;
  adharNo: string;
  passportNo: string;
  passportExpiryDate: string;
  pfNumber: string;
  esiNumber: string;
  LIN_NO: string;
  pAddress1: string;
  pAddress2: string;
  pCity: string;
  pState: string;
  pPinCode: string;
  cAddress1: string;
  cAddress2: string;
  cCity: string;
  cState: string;
  cPincode: string;
  previousCompanyName: string;
  pCompanyCity: string;
  pCompanyContactNumber: string;
  pJoiningDate: string;
  preEndDate: string;
  pDesignation: string;
  // Verification fields
  panCardVer: boolean;
  aadhaarCardVer: boolean;
  panNameMatchVer: boolean;
  aadhaarLinkedVer: boolean;
  aadhaarLinkedPanVar: boolean;
};

const emptyForm: ProfileFormData = {
  empCode: "",
  employeedesignation: "",
  empName: "",
  mobileNo: "",
  landlineNumber: "",
  coporateMailId: "",
  alternateMailId: "",
  gender: "",
  dob: "",
  maritialStatus: "",
  dom: "",
  bloodGroup: "",
  skills: "",
  basicQualification: "",
  professionalQualification: "",
  religion: "",
  driving_licence: "",
  empHeight: "",
  empWeight: "",
  childrenDetails: "",
  languageDetails: "",
  fatherName: "",
  fatherOccupation: "",
  fatherMobile: "",
  motherName: "",
  motherMobile: "",
  spouseName: "",
  spouseGender: "",
  spouseMobile: "",
  siblingName: "",
  siblingContactNumber: "",
  emergencyName: "",
  emergencyNumber: "",
  panNo: "",
  adharNo: "",
  passportNo: "",
  passportExpiryDate: "",
  pfNumber: "",
  esiNumber: "",
  LIN_NO: "",
  pAddress1: "",
  pAddress2: "",
  pCity: "",
  pState: "",
  pPinCode: "",
  cAddress1: "",
  cAddress2: "",
  cCity: "",
  cState: "",
  cPincode: "",
  previousCompanyName: "",
  pCompanyCity: "",
  pCompanyContactNumber: "",
  pJoiningDate: "",
  preEndDate: "",
  pDesignation: "",
  panCardVer: false,
  aadhaarCardVer: false,
  panNameMatchVer: false,
  aadhaarLinkedVer: false,
  aadhaarLinkedPanVar: false,
};

function toInputDate(v: string | null | undefined) {
  if (!v || v === "-/-/-") return "";

  if (v.includes("T") && v.includes("Z")) {
    const date = new Date(v);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    return "";
  }

  if (v.includes("-") && v.length === 10) {
    const parts = v.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      return v;
    }
  }

  if (v.includes("/")) {
    const [mm, dd, yyyy] = v.split("/");
    if (yyyy?.length === 4)
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  if (v.includes("-")) {
    const [dd, mm, yyyy] = v.split("-");
    if (yyyy?.length === 4)
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  return "";
}

function getValidDocumentUrl(url: any): string {
  if (!url) return "";
  if (typeof url !== "string") return "";
  if (url.includes("function") || url.includes("[native code]")) return "";
  if (!url.startsWith("http://") && !url.startsWith("https://")) return "";
  try {
    new URL(url);
    return url;
  } catch {
    return "";
  }
}

function showSideAlert(message: string, type: "success" | "warning" | "error") {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });

  Toast.fire({
    icon: type,
    title: message,
  });
}

export default function EditEmployeeProfile() {
  const user = useCurrentUser();
  const { compdata } = useSecureStorage();

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basic: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sameAsPermanent, setSameAsPermanent] = useState(false);
  const [hasPreviousCompany, setHasPreviousCompany] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [cityOptions, setCityOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [stateOptions, setStateOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [occupationOptions, setOccupationOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);

  const [aadhaarRefId, setAadhaarRefId] = useState<string | null>(null);
  const [aadhaarOtp, setAadhaarOtp] = useState("");
  const [otpDisabled, setOtpDisabled] = useState(true);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const [photoUrl, setPhotoUrl] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [existingDocs, setExistingDocs] = useState<Record<DocKey, string>>({
    adhar: "",
    pan: "",
    salary: "",
    other: "",
  });
  const [docFiles, setDocFiles] = useState<Record<DocKey, File | null>>({
    adhar: null,
    pan: null,
    salary: null,
    other: null,
  });

  const [formData, setFormData] = useState<ProfileFormData>(emptyForm);
  const [savedBaseline, setSavedBaseline] = useState<string>("");

  // Fetch Master Data
  const fetchMasterData = async () => {
    try {
      const mastersResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/masters`,
        {},
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      const occupationsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/GetOccupations`,
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      const convertValuesToString = (array: any) => {
        if (!array || !Array.isArray(array)) return [];
        return array.map((obj) => ({
          label: obj.label || obj.Misc_Name || obj.name || String(obj),
          value: String(obj.value || obj.Misc_Code || obj.id || obj),
        }));
      };

      const masters =
        mastersResponse.data?.data || mastersResponse.data?.Result || {};
      const occupations =
        occupationsResponse.data?.Result ||
        occupationsResponse.data?.data ||
        [];

      if (masters.CITY && Array.isArray(masters.CITY)) {
        setCityOptions(convertValuesToString(masters.CITY));
      }

      if (masters.STATE && Array.isArray(masters.STATE)) {
        setStateOptions(convertValuesToString(masters.STATE));
      }

      if (occupations && Array.isArray(occupations)) {
        const formattedOccupations = occupations.map((item: any) => ({
          label: item.Misc_Name || item.name || String(item),
          value: String(item.Misc_Code || item.id || item),
        }));
        setOccupationOptions([
          { value: "Select", label: "Select" },
          ...formattedOccupations,
        ]);
      }
    } catch (error) {
      console.log("Error fetching master data:", error);
    }
  };

  // Fetch Employee Profile
  const fetchProfile = async () => {
    setLoading(true);
    try {
      const result = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/getEmpProfile`,
        {
          params: {
            empCode: user?.EMPCODE,
            is_edit: "1",
          },
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      if (result.data?.Status) {
        const d = result.data.Result || {};

        const loaded: ProfileFormData = {
          empCode: d.empcode || user?.EMPCODE || "",
          employeedesignation: d.employeedesignation || "",
          empName: d.empfirstname || d.empname || "",
          mobileNo: d.mobileno || "",
          landlineNumber: d.landline_no || d.landlineno || "",
          coporateMailId: d.corporatemailid || "",
          alternateMailId: d.alternet_mail || "",
          gender: getDisplayValue(d.gender, {
            Male: "Male",
            Female: "Female",
            Other: "Other",
          }),
          dob: d.dob ? toInputDate(d.dob) : "",
          maritialStatus: getDisplayValue(
            d.marital_status || d.maritalstatus,
            MARITAL_STATUS_MAP
          ),
          dom: d.dom ? toInputDate(d.dom) : "",
          bloodGroup: getDisplayValue(d.bloodgroup, {
            "A+": "A+",
            "A-": "A-",
            "B+": "B+",
            "B-": "B-",
            "AB+": "AB+",
            "AB-": "AB-",
            "O+": "O+",
            "O-": "O-",
          }),
          skills: d.skills || "",
          basicQualification: d.basicqualification || "",
          professionalQualification: d.professionalqualification || "",
          religion: getDisplayValue(d.relcode || d.religion, RELIGION_MAP),
          driving_licence: d.driving_licence || "",
          empHeight: d.empheight ? String(d.empheight) : "",
          empWeight: d.empweight ? String(d.empweight) : "",
          childrenDetails: d.children_detail || "",
          languageDetails: d.language_detail || "",
          fatherName: d.fathername || "",
          fatherOccupation: d.fatheroccupation ? String(d.fatheroccupation) : "",
          fatherMobile: d.father_mob || d.fathercontactno || "",
          motherName: d.mothername || "",
          motherMobile: d.mother_mob || d.mothercontactno || "",
          spouseName: d.spousename || "",
          spouseGender: getDisplayValue(d.spousegender, {
            Male: "Male",
            Female: "Female",
          }),
          spouseMobile: d.spouse_mob || d.spousecontactno || "",
          siblingName: d.siblingname || "",
          siblingContactNumber: d.siblingcontactno || "",
          emergencyName: d.emergencyname || "",
          emergencyNumber: d.emergencyno || "",
          panNo: d.panno || "",
          adharNo: d.adharno || d.uid_no || "",
          passportNo: d.passportno || "",
          passportExpiryDate:
            d.passexpirydate || d.passport_expdate
              ? toInputDate(d.passexpirydate || d.passport_expdate)
              : "",
          pfNumber: d.pfnumber || d.pfno || "",
          esiNumber: d.esinumber || d.esino || "",
          LIN_NO: d.lin_no || "",
          pAddress1: d.permanentaddress1 || "",
          pAddress2: d.permanentaddress2 || "",
          pCity: d.pcity ? String(d.pcity) : "",
          pState: d.pstate ? String(d.pstate) : "",
          pPinCode: d.ppincode || "",
          cAddress1: d.currentaddress1 || "",
          cAddress2: d.currentaddress2 || "",
          cCity: d.ccity ? String(d.ccity) : "",
          cState: d.cstate ? String(d.cstate) : "",
          cPincode: d.cpincode || "",
          previousCompanyName: d.previouscompanyname || "",
          pCompanyCity: d.precompcity ? String(d.precompcity) : "",
          pCompanyContactNumber: d.precompcontactno || "",
          pJoiningDate: d.prejoiningdate ? toInputDate(d.prejoiningdate) : "",
          preEndDate: d.preenddate ? toInputDate(d.preenddate) : "",
          pDesignation: d.predesignation || "",
          panCardVer:
            Boolean(d.panno) &&
            (String(d.pan_card_ver) === "true" || Number(d.pan_card_ver) === 1),
          aadhaarCardVer:
            Boolean(d.adharno || d.uid_no) &&
            (String(d.aadhaar_card_ver) === "true" ||
              Number(d.aadhaar_card_ver) === 1),
          panNameMatchVer:
            String(d.pan_name_match_ver) === "true" ||
            Number(d.pan_name_match_ver) === 1,
          aadhaarLinkedVer:
            String(d.aadhaar_linked_ver) === "true" ||
            Number(d.aadhaar_linked_ver) === 1,
          aadhaarLinkedPanVar:
            String(d.aadhaar_linked_pan_var) === "true" ||
            Number(d.aadhaar_linked_pan_var) === 1,
        };

        setFormData(loaded);
        setSavedBaseline(JSON.stringify(loaded));

        let profilePhoto = "";
        profilePhoto = d.profile
          ? d.profile.replace(
              "http://localhost:5000",
              "https://erp.autovyn.com/backend"
            )
          : "";

        if (!profilePhoto && d.EmpDocs && Array.isArray(d.EmpDocs)) {
          const profileDoc = d.EmpDocs.find((doc: any) => doc.Seq_No === 1);
          if (profileDoc && profileDoc.DOC_PATH) {
            const baseUrl =
              process.env.NEXT_PUBLIC_URL || "http://localhost:5000";
            profilePhoto = `${baseUrl}/fetch?filePath=${encodeURIComponent(
              profileDoc.DOC_PATH
            )}`;
          }
        }
        setPhotoUrl(profilePhoto);

        const getDocUrl = (docType: DocKey, directUrl: string) => {
          const validUrl = getValidDocumentUrl(directUrl);
          if (validUrl) {
            return validUrl.replace(
              "http://localhost:5000",
              "https://erp.autovyn.com/backend"
            );
          }
          if (d.EmpDocs && Array.isArray(d.EmpDocs)) {
            const docMap: Record<DocKey, number> = {
              adhar: 2,
              pan: 3,
              salary: 4,
              other: 5,
            };
            const targetSeq = docMap[docType];
            const found = d.EmpDocs.find(
              (doc: any) =>
                doc.Seq_No === targetSeq || doc.misspunch_inout === targetSeq
            );
            if (found && found.DOC_PATH) {
              const baseUrl =
                process.env.NEXT_PUBLIC_URL || "http://localhost:5000";
              return `${baseUrl}/fetch?filePath=${encodeURIComponent(
                found.DOC_PATH
              )}`;
            }
          }
          return "";
        };

        setExistingDocs({
          adhar: getDocUrl("adhar", d.adhar),
          pan: getDocUrl("pan", d.pan),
          salary: getDocUrl("salary", d.salary),
          other: getDocUrl("other", d.other),
        });

        setHasPreviousCompany(Boolean(d.previouscompanyname));
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.EMPCODE && user?.Comp_Code) {
      fetchProfile();
      fetchMasterData();
    }
  }, [user?.EMPCODE, user?.Comp_Code]);

  // PAN Verification
  const verifyPan = async () => {
    const panNo = formData.panNo?.trim().toUpperCase();

    if (!panNo) {
      showSideAlert("Please Enter Pan Number", "warning");
      return;
    }

    const isValidPAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panNo);
    if (!isValidPAN) {
      showSideAlert(
        "Invalid PAN Card No. Format should be ABCDE1234F",
        "warning"
      );
      return;
    }

    if (!formData.empName) {
      showSideAlert("Please Enter Employee Name", "warning");
      return;
    }

    if (!formData.dob) {
      showSideAlert("Please Enter Date Of Birth (DOB)", "warning");
      return;
    }

    setIsVerifying(true);

    try {
      if (compdata?.Digilocker_Linked == "2") {
        const fullName = formData.empName.trim();
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/panAndAdharApi/ValidateIdtoAi`,
          {
            api_name: "pan_nsdl",
            payload: {
              pan_number: panNo,
              name: fullName,
              dob: formData.dob,
            },
            refresh: false,
          },
          {
            headers: { compcode: user?.Comp_Code, name: user?.name },
          }
        );

        const res = result?.data?.data;
        if (res?.status == "success") {
          setFormData((prev) => ({
            ...prev,
            panCardVer: true,
            panNameMatchVer: Boolean(res?.name_match),
            aadhaarLinkedVer: Boolean(res?.aadhaar_seeding),
          }));
          showSideAlert("PAN Card Verified successfully", "success");
        } else {
          setFormData((prev) => ({
            ...prev,
            panCardVer: false,
            panNameMatchVer: false,
            aadhaarLinkedVer: false,
          }));
          showSideAlert("Invalid PAN Card Number", "warning");
        }
      } else {
        const fullName = formData.empName.trim();
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/panAndAdharApi/validate`,
          {
            value: panNo,
            name_as_per_pan: fullName,
            date_of_birth: formData.dob,
            option: "10",
          },
          {
            headers: { compcode: user?.Comp_Code, name: user?.name },
          }
        );

        const res = result?.data?.data;
        if (res?.status == "valid") {
          setFormData((prev) => ({
            ...prev,
            panCardVer: true,
            panNameMatchVer: res.name_as_per_pan_match || false,
            aadhaarLinkedVer: res.aadhaar_seeding_status === "y" || false,
          }));
          showSideAlert("PAN Card Verified successfully", "success");
        } else {
          setFormData((prev) => ({
            ...prev,
            panCardVer: false,
            panNameMatchVer: false,
            aadhaarLinkedVer: false,
          }));
          showSideAlert("Invalid PAN Card Number", "warning");
        }
      }
    } catch (error: any) {
      console.error("PAN Verification Error:", error);
      if (error?.response?.data?.error?.detail) {
        showSideAlert(
          `${error?.response?.data?.error?.detail?.details}`,
          "error"
        );
      } else {
        showSideAlert("PAN Verification Failed", "error");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // Aadhaar Verification
  const verifyAadhaar = async () => {
    const aadhaarNo = formData.adharNo?.trim();

    if (!aadhaarNo) {
      showSideAlert("Please enter Aadhaar number first", "warning");
      return;
    }

    if (!/^\d{12}$/.test(aadhaarNo)) {
      showSideAlert("Aadhaar number must be exactly 12 digits", "warning");
      return;
    }

    if (!formData.mobileNo) {
      showSideAlert("Please enter Mobile Number first", "warning");
      return;
    }

    setIsVerifying(true);

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/panAndAdharApi/validate`,
        {
          value: aadhaarNo,
          option: "8",
        },
        {
          headers: { compcode: user?.Comp_Code, name: user?.name },
        }
      );

      const res = result?.data?.data;
      if (res && (res.photo || res.full_address)) {
        setFormData((prev) => ({
          ...prev,
          aadhaarCardVer: true,
          pAddress1: res.full_address || prev.pAddress1,
        }));
        showSideAlert("Aadhaar Verified successfully", "success");
      } else if (res?.reference_id) {
        showSideAlert(
          res?.message || "OTP sent successfully. Please enter OTP to verify.",
          "success"
        );
        setAadhaarRefId(res.reference_id?.toString());
        setOtpDisabled(false);
      } else {
        try {
          const digiRes = await axios.post(
            `${process.env.NEXT_PUBLIC_URL}/panAndAdharApi/ValidateDigilockerAadhaar`,
            {
              api_name: "digilocker_initiate_session",
              payload: {
                redirect_to_signup: "true",
                redirect_url: `${
                  process.env.NEXT_PUBLIC_URL
                }/panAndAdharApi/digilocker/callback/${btoa(
                  `${user?.Comp_Code}__${aadhaarNo}`
                )}`,
                consent_purpose: "true",
                consent: "true",
              },
              mobile: formData.mobileNo,
              aadhaar_number: aadhaarNo,
            },
            {
              headers: { compcode: user?.Comp_Code, name: user?.name },
            }
          );

          const digilockerUrl = digiRes?.data?.data?.url;
          if (digilockerUrl) {
            showSideAlert(
              "Please complete verification via Digilocker",
              "success"
            );
            window.open(digilockerUrl, "_blank", "width=500,height=700");
          } else if (
            digiRes?.data?.aadhaar_photo_base64 ||
            digiRes?.data?.full_address
          ) {
            setFormData((prev) => ({
              ...prev,
              aadhaarCardVer: true,
              pAddress1: digiRes.data.full_address || prev.pAddress1,
            }));
            showSideAlert(
              "Aadhaar Verified successfully via Digilocker",
              "success"
            );
          } else {
            showSideAlert(
              "Aadhaar verification failed. Please try again.",
              "error"
            );
          }
        } catch (digiError) {
          console.error("Digilocker Error:", digiError);
          showSideAlert(
            "Both verification methods failed. Please try again.",
            "error"
          );
        }
      }
    } catch (error) {
      console.error("Aadhaar Verification Error:", error);
      showSideAlert("Aadhaar Verification Failed", "error");
    } finally {
      setIsVerifying(false);
    }
  };

  // Verify Aadhaar OTP
  const verifyAadhaarOtp = async () => {
    if (!aadhaarRefId || !aadhaarOtp) {
      showSideAlert("Please enter OTP", "warning");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/panAndAdharApi/validate`,
        {
          value: formData.adharNo,
          ref_id: aadhaarRefId,
          otp: aadhaarOtp,
          option: "9",
        },
        {
          headers: { compcode: user?.Comp_Code, name: user?.name },
        }
      );

      const res = result?.data?.data;
      if (res?.status?.toLowerCase() === "valid") {
        setFormData((prev) => ({
          ...prev,
          aadhaarCardVer: true,
          pAddress1: res.full_address || prev.pAddress1,
        }));
        setOtpDisabled(true);
        setAadhaarRefId(null);
        setAadhaarOtp("");
        showSideAlert(res?.message || "OTP Verified successfully", "success");
      } else {
        setFormData((prev) => ({
          ...prev,
          aadhaarCardVer: false,
        }));
        showSideAlert(res?.message || "Invalid OTP", "warning");
      }
    } catch (error) {
      console.error("OTP Verification Error:", error);
      showSideAlert("OTP Verification Failed", "error");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Save Profile
  const saveProfile = async () => {
    if (!formData.mobileNo) {
      Swal.fire({
        icon: "warning",
        title: "Missing Field!",
        text: "Mobile number is required.",
      });
      setOpenSections((prev) => ({ ...prev, basic: true }));
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();

      const fieldsToSend = {
        pAddress1: formData.pAddress1 || "",
        pAddress2: formData.pAddress2 || "",
        pCity: formData.pCity || "",
        pPinCode: formData.pPinCode || "",
        pState: formData.pState || "",
        cAddress1: formData.cAddress1 || "",
        cAddress2: formData.cAddress2 || "",
        cCity: formData.cCity || "",
        cPincode: formData.cPincode || "",
        cState: formData.cState || "",
        mobileNo: formData.mobileNo || "",
        emergencyName: formData.emergencyName || "",
        emergencyNumber: formData.emergencyNumber || "",
        panNo: formData.panNo || "",
        passportNo: formData.passportNo || "",
        passportExpiryDate: formData.passportExpiryDate || "",
        bloodGroup: formData.bloodGroup || "",
        dob: formData.dob || "",
        gender: formData.gender || "",
        maritialStatus: formData.maritialStatus || "",
        dom: formData.dom || "",
        skills: formData.skills || "",
        basicQualification: formData.basicQualification || "",
        professionalQualification: formData.professionalQualification || "",
        fatherName: formData.fatherName || "",
        fatherOccupation: formData.fatherOccupation || "",
        motherName: formData.motherName || "",
        spouseName: formData.spouseName || "",
        spouseGender: formData.spouseGender || "",
        siblingName: formData.siblingName || "",
        siblingContactNumber: formData.siblingContactNumber || "",
        previousCompanyName: formData.previousCompanyName || "",
        pCompanyCity: formData.pCompanyCity || "",
        pCompanyContactNumber: formData.pCompanyContactNumber || "",
        pJoiningDate: formData.pJoiningDate || "",
        preEndDate: formData.preEndDate || "",
        pDesignation: formData.pDesignation || "",
        coporateMailId: formData.coporateMailId || "",
        dLicenseIssueDate: "",
        dLicenseIssuePlace: "",
        empHeight: formData.empHeight || "",
        empWeight: formData.empWeight || "",
        alternateMailId: formData.alternateMailId || "",
        childrenDetails: formData.childrenDetails || "",
        languageDetails: formData.languageDetails || "",
        adharNo: formData.adharNo || "",
        pfNumber: formData.pfNumber || "",
        esiNumber: formData.esiNumber || "",
        landlineNumber: formData.landlineNumber || "",
        fatherMobile: formData.fatherMobile || "",
        motherMobile: formData.motherMobile || "",
        spouseMobile: formData.spouseMobile || "",
        relCode: formData.religion || "",
        driving_licence: formData.driving_licence || "",
        empCode: user?.EMPCODE || "",
        LIN_NO: formData.LIN_NO || "",
        faceEmbedding: "",
      };

      Object.entries(fieldsToSend).forEach(([key, value]) => {
        fd.append(key, String(value));
      });

      fd.append(
        "pan_card_ver",
        Boolean(formData.panNo?.trim()) && formData.panCardVer ? "true" : "false"
      );
      fd.append(
        "aadhaar_card_ver",
        Boolean(formData.adharNo?.trim()) && formData.aadhaarCardVer
          ? "true"
          : "false"
      );
      fd.append(
        "pan_name_match_ver",
        formData.panNameMatchVer ? "true" : "false"
      );
      fd.append(
        "aadhaar_linked_ver",
        formData.aadhaarLinkedVer ? "true" : "false"
      );
      fd.append(
        "aadhaar_linked_pan_var",
        formData.aadhaarLinkedPanVar ? "true" : "false"
      );

      if (photoFile) fd.append(FIELD_NAMES.profile, photoFile);
      if (docFiles.adhar) fd.append(FIELD_NAMES.adhar, docFiles.adhar);
      if (docFiles.pan) fd.append(FIELD_NAMES.pan, docFiles.pan);
      if (docFiles.salary) fd.append(FIELD_NAMES.salary, docFiles.salary);
      if (docFiles.other) fd.append(FIELD_NAMES.other, docFiles.other);

      const result = await axios.post(UPDATE_PROFILE_URL, fd, {
        headers: {
          compcode: user?.Comp_Code,
          name: user?.name,
          "Content-Type": "multipart/form-data",
        },
      });

      if (result.data?.Status) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: result.data.Message || "Profile updated successfully",
          timer: 2000,
          showConfirmButton: false,
        }).then(() => {
          setPhotoFile(null);
          setDocFiles({ adhar: null, pan: null, salary: null, other: null });
          fetchProfile();
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Error!",
          text: result.data?.Message || "Failed to update profile",
        });
      }
    } catch (error: any) {
      console.log("Error saving profile:", error);
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: error?.response?.data?.Message || "Something went wrong!",
      });
    } finally {
      setSaving(false);
    }
  };

  const setField = (name: keyof ProfileFormData, value: string | boolean) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (sameAsPermanent) {
        if (name === "pAddress1") next.cAddress1 = value as string;
        if (name === "pAddress2") next.cAddress2 = value as string;
        if (name === "pCity") next.cCity = value as string;
        if (name === "pState") next.cState = value as string;
        if (name === "pPinCode") next.cPincode = value as string;
      }
      return next;
    });
  };

  const handleInputChange = (name: string, value: any) => {
    setField(name as keyof ProfileFormData, value ?? "");
  };

  const handleSameAsPermanentToggle = () => {
    const checked = !sameAsPermanent;
    setSameAsPermanent(checked);
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        cAddress1: prev.pAddress1,
        cAddress2: prev.pAddress2,
        cCity: prev.pCity,
        cState: prev.pState,
        cPincode: prev.pPinCode,
      }));
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const toggleSection = (secId: string) => {
    const willOpen = !openSections[secId];
    setOpenSections((prev) => ({ ...prev, [secId]: willOpen }));

    if (willOpen) {
      setTimeout(() => {
        const el = document.getElementById(`section-${secId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  };

  // Required fields mapping & dirty check exactly matching HTML prototype
  const {
    pct,
    pctDeg,
    pctTint,
    missingFields,
    isDirty,
    sectionStats,
  } = useMemo(() => {
    const requiredList: Array<{
      secId: string;
      key: keyof ProfileFormData;
      label: string;
    }> = [
      { secId: "basic", key: "mobileNo", label: "Mobile number" },
      { secId: "basic", key: "coporateMailId", label: "Company email" },
      { secId: "basic", key: "gender", label: "Gender" },
      { secId: "basic", key: "dob", label: "Date of birth" },
      { secId: "basic", key: "bloodGroup", label: "Blood group" },
      { secId: "family", key: "emergencyName", label: "Emergency contact name" },
      {
        secId: "family",
        key: "emergencyNumber",
        label: "Emergency contact number",
      },
      { secId: "identity", key: "panNo", label: "PAN number" },
      { secId: "identity", key: "adharNo", label: "Aadhaar number" },
      { secId: "address", key: "pAddress1", label: "Permanent address line 1" },
      { secId: "address", key: "pCity", label: "City" },
      { secId: "address", key: "pState", label: "State" },
      { secId: "address", key: "pPinCode", label: "Pincode" },
    ];

    const has = (key: keyof ProfileFormData) => {
      const v = formData[key];
      if (!v || v === "Select" || String(v).trim() === "") return false;

      if (key === "gender") {
        return GENDER_OPTIONS.some((o) => o.value === v);
      }
      if (key === "bloodGroup") {
        return BLOOD_GROUP_OPTIONS.some((o) => o.value === v);
      }

      return true;
    };

    const filledCount = requiredList.filter((r) => has(r.key)).length;
    const calculatedPct = Math.round((filledCount / requiredList.length) * 100);

    const missing = requiredList
      .filter((r) => !has(r.key))
      .map((r) => ({
        secId: r.secId,
        label: r.label,
      }));

    const tint =
      calculatedPct >= 90
        ? "#10B981"
        : calculatedPct >= 60
        ? "#F59E0B"
        : "#E11D48";
    const deg = `${calculatedPct * 3.6}deg`;

    const dirty =
      savedBaseline !== "" && JSON.stringify(formData) !== savedBaseline;

    // Badges
    const basicReq = ["mobileNo", "coporateMailId", "gender", "dob", "bloodGroup"];
    const basicDone = basicReq.filter((k) => has(k as keyof ProfileFormData)).length;

    const familyReq = ["emergencyName", "emergencyNumber"];
    const familyDone = familyReq.filter((k) => has(k as keyof ProfileFormData)).length;

    const identityReq = ["panNo", "adharNo"];
    const identityDone = identityReq.filter((k) => has(k as keyof ProfileFormData)).length;

    const addressReq = ["pAddress1", "pCity", "pState", "pPinCode"];
    const addressDone = addressReq.filter((k) => has(k as keyof ProfileFormData)).length;

    const docsDone =
      (docFiles.adhar || existingDocs.adhar ? 1 : 0) +
      (docFiles.pan || existingDocs.pan ? 1 : 0) +
      (docFiles.salary || existingDocs.salary ? 1 : 0) +
      (docFiles.other || existingDocs.other ? 1 : 0);

    return {
      pct: calculatedPct,
      pctDeg: deg,
      pctTint: tint,
      missingFields: missing,
      isDirty: dirty,
      sectionStats: {
        basic: {
          badge: `${basicDone} / 5`,
          complete: basicDone === 5,
        },
        family: {
          badge: `${familyDone} / 2`,
          complete: familyDone === 2,
        },
        identity: {
          badge: `${identityDone} / 2`,
          complete: identityDone === 2,
        },
        address: {
          badge: addressDone === 4 ? "Complete" : "Incomplete",
          complete: addressDone === 4,
        },
        employment: {
          badge: "Optional",
          complete: true,
        },
        other: {
          badge: "Optional",
          complete: true,
        },
        documents: {
          badge: `${docsDone} / 4 files`,
          complete: docsDone >= 3,
        },
      },
    };
  }, [formData, savedBaseline, docFiles, existingDocs]);

  // Initials
  const initials = useMemo(() => {
    if (!formData.empName) return "GS";
    const parts = formData.empName.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [formData.empName]);

  // Section configs matching prototype HTML
  const sections = [
    {
      id: "basic",
      title: "Basic",
      icon: User,
      tint: "#4F46E5",
      sub: "Contact details and personal identifiers",
      badge: sectionStats.basic.badge,
      complete: sectionStats.basic.complete,
    },
    {
      id: "family",
      title: "Family",
      icon: Users,
      tint: "#0EA5E9",
      sub: "Parents, spouse and emergency contact",
      badge: sectionStats.family.badge,
      complete: sectionStats.family.complete,
    },
    {
      id: "identity",
      title: "Identity",
      icon: CreditCard,
      tint: "#10B981",
      sub: "Statutory numbers, verified against government records",
      badge: sectionStats.identity.badge,
      complete: sectionStats.identity.complete,
    },
    {
      id: "address",
      title: "Address",
      icon: MapPin,
      tint: "#E11D48",
      sub: "Permanent and current address",
      badge: sectionStats.address.badge,
      complete: sectionStats.address.complete,
    },
    {
      id: "employment",
      title: "Previous employment",
      icon: Briefcase,
      tint: "#7C3AED",
      sub: "Only if you worked somewhere before joining",
      badge: sectionStats.employment.badge,
      complete: sectionStats.employment.complete,
    },
    {
      id: "other",
      title: "Other details",
      icon: Settings,
      tint: "#F59E0B",
      sub: "Skills, qualification and physical details",
      badge: sectionStats.other.badge,
      complete: sectionStats.other.complete,
    },
    {
      id: "documents",
      title: "Documents",
      icon: FileText,
      tint: "#0D9488",
      sub: "Files on record against your profile",
      badge: sectionStats.documents.badge,
      complete: sectionStats.documents.complete,
    },
  ];

  // Helper for bad/empty required field border
  const getFieldBorder = (val: any, fieldKey?: string) => {
    let empty = !val || val === "Select" || String(val).trim() === "";
    if (!empty && fieldKey === "gender") {
      empty = !GENDER_OPTIONS.some((o) => o.value === val);
    }
    if (!empty && fieldKey === "bloodGroup") {
      empty = !BLOOD_GROUP_OPTIONS.some((o) => o.value === val);
    }
    return empty ? "!border-[#E11D48]/45 ring-1 ring-[#E11D48]/20" : "";
  };

  const getProfileSummary = () => {
    return [
      {
        title: "Basic Information",
        fields: [
          { label: "Employee Code", value: formData.empCode || "—" },
          { label: "Employee Name", value: formData.empName || "—" },
          { label: "Designation", value: formData.employeedesignation || "—" },
          { label: "Mobile Number", value: formData.mobileNo || "—" },
          { label: "Landline Number", value: formData.landlineNumber || "—" },
          { label: "Company Email", value: formData.coporateMailId || "—" },
          { label: "Personal Email", value: formData.alternateMailId || "—" },
          { label: "Gender", value: formData.gender || "—" },
          { label: "Date of Birth", value: formData.dob || "—" },
          {
            label: "Marital Status",
            value:
              MARITAL_STATUS_OPTIONS.find(
                (o) => o.value === String(formData.maritialStatus)
              )?.label ||
              formData.maritialStatus ||
              "—",
          },
          { label: "Date of Marriage", value: formData.dom || "—" },
          { label: "Blood Group", value: formData.bloodGroup || "—" },
        ],
      },
      {
        title: "Family Details",
        fields: [
          { label: "Father's Name", value: formData.fatherName || "—" },
          { label: "Father's Occupation", value: formData.fatherOccupation || "—" },
          { label: "Father's Mobile", value: formData.fatherMobile || "—" },
          { label: "Mother's Name", value: formData.motherName || "—" },
          { label: "Mother's Mobile", value: formData.motherMobile || "—" },
          { label: "Spouse's Name", value: formData.spouseName || "—" },
          { label: "Spouse's Gender", value: formData.spouseGender || "—" },
          { label: "Spouse's Mobile", value: formData.spouseMobile || "—" },
          { label: "Sibling's Name", value: formData.siblingName || "—" },
          { label: "Sibling's Contact", value: formData.siblingContactNumber || "—" },
          { label: "Emergency Contact Name", value: formData.emergencyName || "—" },
          { label: "Emergency Contact Number", value: formData.emergencyNumber || "—" },
        ],
      },
      {
        title: "Identity & Documents",
        fields: [
          { label: "PAN Number", value: formData.panNo || "—" },
          {
            label: "PAN Verified",
            value:
              Boolean(formData.panNo?.trim()) && formData.panCardVer
                ? "✅ Yes"
                : "❌ No",
          },
          {
            label: "PAN Name Match",
            value: formData.panNameMatchVer ? "✅ Yes" : "❌ No",
          },
          {
            label: "Aadhaar Linked to PAN",
            value: formData.aadhaarLinkedVer ? "✅ Yes" : "❌ No",
          },
          { label: "Aadhaar Number", value: formData.adharNo || "—" },
          {
            label: "Aadhaar Verified",
            value:
              Boolean(formData.adharNo?.trim()) && formData.aadhaarCardVer
                ? "✅ Yes"
                : "❌ No",
          },
          { label: "Passport Number", value: formData.passportNo || "—" },
          { label: "Passport Expiry", value: formData.passportExpiryDate || "—" },
          { label: "PF (UAN) Number", value: formData.pfNumber || "—" },
          { label: "ESI Number", value: formData.esiNumber || "—" },
          { label: "LIN Number", value: formData.LIN_NO || "—" },
          { label: "Driving License", value: formData.driving_licence || "—" },
        ],
      },
      {
        title: "Address Details",
        fields: [
          { label: "Permanent Address Line 1", value: formData.pAddress1 || "—" },
          { label: "Permanent Address Line 2", value: formData.pAddress2 || "—" },
          { label: "Permanent City", value: formData.pCity || "—" },
          { label: "Permanent State", value: formData.pState || "—" },
          { label: "Permanent Pincode", value: formData.pPinCode || "—" },
          { label: "Current Address Line 1", value: formData.cAddress1 || "—" },
          { label: "Current Address Line 2", value: formData.cAddress2 || "—" },
          { label: "Current City", value: formData.cCity || "—" },
          { label: "Current State", value: formData.cState || "—" },
          { label: "Current Pincode", value: formData.cPincode || "—" },
          { label: "Same as Permanent", value: sameAsPermanent ? "✅ Yes" : "❌ No" },
        ],
      },
      {
        title: "Previous Employment",
        fields: [
          {
            label: "Has Previous Employment",
            value: hasPreviousCompany ? "✅ Yes" : "❌ No",
          },
          ...(hasPreviousCompany
            ? [
                {
                  label: "Previous Company Name",
                  value: formData.previousCompanyName || "—",
                },
                { label: "Company City", value: formData.pCompanyCity || "—" },
                {
                  label: "Company Contact",
                  value: formData.pCompanyContactNumber || "—",
                },
                { label: "Designation", value: formData.pDesignation || "—" },
                { label: "Joining Date", value: formData.pJoiningDate || "—" },
                { label: "End Date", value: formData.preEndDate || "—" },
              ]
            : []),
        ],
      },
      {
        title: "Other Details",
        fields: [
          { label: "Skills", value: formData.skills || "—" },
          { label: "Basic Qualification", value: formData.basicQualification || "—" },
          {
            label: "Professional Qualification",
            value: formData.professionalQualification || "—",
          },
          { label: "Languages Known", value: formData.languageDetails || "—" },
          { label: "Children Details", value: formData.childrenDetails || "—" },
          {
            label: "Religion",
            value:
              RELIGION_OPTIONS.find((o) => o.value === String(formData.religion))
                ?.label ||
              formData.religion ||
              "—",
          },
          {
            label: "Height",
            value: formData.empHeight ? `${formData.empHeight} cm` : "—",
          },
          {
            label: "Weight",
            value: formData.empWeight ? `${formData.empWeight} kg` : "—",
          },
        ],
      },
      {
        title: "Documents Status",
        fields: [
          {
            label: "Aadhaar Document",
            value:
              docFiles.adhar || existingDocs.adhar ? "✅ Uploaded" : "❌ Not Uploaded",
          },
          {
            label: "PAN Document",
            value:
              docFiles.pan || existingDocs.pan ? "✅ Uploaded" : "❌ Not Uploaded",
          },
          {
            label: "Salary Slip",
            value:
              docFiles.salary || existingDocs.salary ? "✅ Uploaded" : "❌ Not Uploaded",
          },
          {
            label: "Other Document",
            value:
              docFiles.other || existingDocs.other ? "✅ Uploaded" : "❌ Not Uploaded",
          },
          {
            label: "Profile Photo",
            value:
              photoUrl || photoPreview ? "✅ Uploaded" : "❌ Not Uploaded",
          },
        ],
      },
    ];
  };

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3]"
      style={{
        fontFamily: "Inter, system-ui, sans-serif",
        fontFeatureSettings: "'tnum' 1",
      }}
    >
      <HashloaderComponent isLoading={isVerifying || loading} />

      {/* Header matching prototype HTML exactly */}
      <header className="top-0 z-30 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 max-w-[1240px] mx-auto w-full">
        <span className="flex items-center gap-2 text-[12px] text-[#64748B] dark:text-[#94A3B8] select-none">
          <span
            className="w-1.75 h-1.75 rounded-full shrink-0"
            style={{ backgroundColor: isDirty ? "#F59E0B" : "#10B981" }}
          />
          <span className="text-[11.5px] sm:text-[12px] whitespace-nowrap">
            {isDirty ? "Unsaved changes" : "All changes saved"}
          </span>
        </span>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            icon={<Eye className="w-4 h-4" />}
            onClick={() => setShowPreviewModal(true)}
            title="Preview as card"
            className="!w-[34px] !h-[34px] !p-0 !rounded-[10px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-transparent !text-[#1E293B] dark:!text-[#E7ECF3]"
          />

          <Button
            variant="primary"
            size="sm"
            loading={saving}
            onClick={saveProfile}
            icon={<Save className="w-4 h-4" />}
            className={`!h-[34px] !px-[13px] sm:!px-[15px] !rounded-[10px] !text-[12px] sm:!text-[12.5px] !font-[600] whitespace-nowrap shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] ${
              isDirty
                ? "!bg-[#4F46E5] hover:!bg-[#4338CA] !text-white cursor-pointer"
                : "!bg-[#64748B] dark:!bg-[#475569] !text-white cursor-default"
            }`}
          >
            {isDirty ? "Save profile" : "Saved"}
          </Button>
        </div>
      </header>

      {/* Main Content matching prototype HTML exactly */}
      <main className="p-[14px_12px_60px_12px] sm:p-[22px_24px_60px_24px] max-w-[1240px] mx-auto w-full">
        {/* Profile Info Header Card (HTML exact) */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] p-3.5 sm:p-[17px_19px] mb-[14px] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-[15px]">
          <div className="flex items-center gap-3 sm:gap-[15px] min-w-0 flex-1">
            <button
              type="button"
              onClick={() =>
                document.getElementById("profile-photo-input")?.click()
              }
              className="relative w-[48px] h-[48px] sm:w-[54px] sm:h-[54px] shrink-0 rounded-full border-2 border-[#E2E8F0] dark:border-[#1F2937] bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF] text-[16px] sm:text-[17px] font-[650] cursor-pointer grid place-items-center hover:border-[#4F46E5] transition-all"
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Profile"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Profile"
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span>{initials}</span>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#4F46E5] text-white grid place-items-center border-2 border-white dark:border-[#111827]">
                <Camera className="w-3 h-3" />
              </span>
              <input
                id="profile-photo-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </button>

            <div className="flex-1 min-w-0">
              <div className="text-[15px] sm:text-[17px] font-[650] tracking-[-0.01em] text-[#1E293B] dark:text-[#E7ECF3] truncate">
                {formData.empName || user?.name || "EMPLOYEE"}
              </div>
              <div className="text-[11.5px] sm:text-[12.5px] text-[#64748B] dark:text-[#94A3B8] mt-[2px] sm:mt-[3px] truncate">
                Emp code {formData.empCode || user?.EMPCODE || "-"} &middot;{" "}
                {formData.employeedesignation || "MANAGER"} &middot;{" "}
                {user?.branch || "HR"}
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-between sm:justify-end gap-3 sm:gap-[14px] pt-2.5 sm:pt-0 border-t sm:border-t-0 border-[#E2E8F0] dark:border-[#1F2937]">
            <div className="text-left sm:text-right">
              <div className="text-[10px] sm:text-[10.5px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase">
                Profile complete
              </div>
              <div
                className="text-[15px] sm:text-[16px] font-[650] mt-[2px] sm:mt-[3px] tabular-nums"
                style={{ color: pctTint }}
              >
                {pct}%
              </div>
            </div>

            <span
              className="w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] shrink-0 rounded-full grid place-items-center"
              style={{
                background: `conic-gradient(${pctTint} ${pctDeg}, #E2E8F0 0)`,
              }}
            >
              <span
                className="w-[30px] h-[30px] sm:w-[34px] sm:h-[34px] rounded-full bg-white dark:bg-[#111827] grid place-items-center"
                style={{ color: pctTint }}
              >
                <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </span>
            </span>
          </div>
        </div>

        {/* Missing Required Fields Alert Banner (HTML exact) */}
        {missingFields.length > 0 && (
          <div className="bg-[rgba(245,158,11,.09)] border border-[rgba(245,158,11,.35)] rounded-[12px] p-3 sm:p-[13px_15px] flex items-start gap-[11px] mb-[14px]">
            <span className="w-6 h-6 rounded-[8px] shrink-0 grid place-items-center bg-[rgba(245,158,11,.2)] text-[#B45309]">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] sm:text-[12.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                {missingFields.length} required field
                {missingFields.length === 1 ? "" : "s"} still empty &mdash; payroll
                and statutory filings need these.
              </div>
              <div className="flex gap-[7px] flex-wrap mt-[9px]">
                {missingFields.slice(0, 8).map((m, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setOpenSections((prev) => ({ ...prev, [m.secId]: true }));
                      setTimeout(() => {
                        const el = document.getElementById(`section-${m.secId}`);
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                      }, 100);
                    }}
                    className="border border-[rgba(245,158,11,.4)] bg-white dark:bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] text-[11px] sm:text-[11.5px] font-[600] p-[4px_9px] sm:p-[5px_10px] rounded-full cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#182235] transition"
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sections List */}
        <div className="flex flex-col gap-[12px]">
          {sections.map((s) => {
            const Icon = s.icon;
            const isOpen = !!openSections[s.id];

            return (
              <div
                key={s.id}
                id={`section-${s.id}`}
                className={`bg-white dark:bg-[#111827] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] overflow-hidden transition-all scroll-mt-20 border ${
                  isOpen
                    ? "border-[#4F46E5] dark:border-[#6366F1]"
                    : "border-[#E2E8F0] dark:border-[#1F2937]"
                }`}
              >
                {/* Section Header Button (HTML exact) */}
                <button
                  type="button"
                  onClick={() => toggleSection(s.id)}
                  className={`w-full flex items-center gap-2.5 sm:gap-[12px] p-3 sm:p-[15px_18px] cursor-pointer text-left transition-colors select-none ${
                    isOpen
                      ? "bg-[#F8FAFC] dark:bg-[#1F2937]/50"
                      : "bg-transparent hover:bg-[#F8FAFC]/50 dark:hover:bg-[#1F2937]/30"
                  }`}
                >
                  <span
                    className="w-7 h-7 rounded-[9px] shrink-0 grid place-items-center"
                    style={{
                      background: `${s.tint}1F`,
                      color: s.tint,
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </span>

                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] sm:text-[14px] font-[600] text-[#1E293B] dark:text-[#E7ECF3] truncate">
                      {s.title}
                    </span>
                    <span className="block text-[11px] sm:text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-[2px] truncate">
                      {s.sub}
                    </span>
                  </span>

                  <span
                    className="shrink-0 text-[10.5px] sm:text-[11px] font-[700] p-[3px_8px] sm:p-[4px_9px] rounded-full whitespace-nowrap"
                    style={{
                      color: s.complete ? "#10B981" : "#B45309",
                      background: s.complete
                        ? "rgba(16,185,129,.14)"
                        : "rgba(245,158,11,.16)",
                    }}
                  >
                    {s.badge}
                  </span>

                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] shrink-0" />
                  )}
                </button>

                {/* Section Content */}
                {isOpen && (
                  <div className="p-[10px_12px_16px_12px] sm:p-[4px_18px_18px_18px] border-t border-[#E2E8F0] dark:border-[#1F2937]">
                    {/* Section 1: Basic */}
                    {s.id === "basic" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-[13px] mt-[15px]">
                        <Einput
                          title="MOBILE NUMBER"
                          type="text"
                          name="mobileNo"
                          value={formData.mobileNo}
                          handleInputChange={handleInputChange}
                          redlabel="*"
                          placeholder="10-digit mobile"
                          ShortName={true}
                          className={`!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] ${getFieldBorder(
                            formData.mobileNo
                          )}`}
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <Einput
                          title="LANDLINE NUMBER"
                          type="text"
                          name="landlineNumber"
                          value={formData.landlineNumber}
                          handleInputChange={handleInputChange}
                          placeholder="With STD code"
                          ShortName={true}
                          className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <Einput
                          title="COMPANY EMAIL"
                          type="email"
                          name="coporateMailId"
                          value={formData.coporateMailId}
                          handleInputChange={handleInputChange}
                          redlabel="*"
                          placeholder="name@autovyn.com"
                          ShortName={true}
                          className={`!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] ${getFieldBorder(
                            formData.coporateMailId
                          )}`}
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <Einput
                          title="PERSONAL EMAIL"
                          type="email"
                          name="alternateMailId"
                          value={formData.alternateMailId}
                          handleInputChange={handleInputChange}
                          placeholder="name@example.com"
                          ShortName={true}
                          className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <Eselect
                          title="GENDER"
                          name="gender"
                          option={GENDER_OPTIONS}
                          initialValue={formData.gender}
                          handleInputChange={handleInputChange}
                          redlabel="*"
                          placeholder="Select"
                          ShortName={true}
                          className={`!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] ${getFieldBorder(
                            formData.gender,
                            "gender"
                          )}`}
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <Einput
                          title="DATE OF BIRTH"
                          type="date"
                          name="dob"
                          value={formData.dob}
                          handleInputChange={handleInputChange}
                          redlabel="*"
                          ShortName={true}
                          className={`!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] ${getFieldBorder(
                            formData.dob
                          )}`}
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <Eselect
                          title="MARITAL STATUS"
                          name="maritialStatus"
                          option={MARITAL_STATUS_OPTIONS}
                          initialValue={formData.maritialStatus}
                          handleInputChange={handleInputChange}
                          placeholder="Select"
                          ShortName={true}
                          className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <Einput
                          title="DATE OF MARRIAGE"
                          type="date"
                          name="dom"
                          value={formData.dom}
                          handleInputChange={handleInputChange}
                          ShortName={true}
                          className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <div className="md:col-span-1">
                          <Eselect
                            title="BLOOD GROUP"
                            name="bloodGroup"
                            option={BLOOD_GROUP_OPTIONS}
                            initialValue={formData.bloodGroup}
                            handleInputChange={handleInputChange}
                            redlabel="*"
                            placeholder="Select"
                            ShortName={true}
                            className={`!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] ${getFieldBorder(
                              formData.bloodGroup,
                              "bloodGroup"
                            )}`}
                            labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                          />
                        </div>
                      </div>
                    )}

                    {/* Section 2: Family */}
                    {s.id === "family" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-[13px] mt-[15px]">
                        <Einput
                          title="FATHER'S NAME"
                          type="text"
                          name="fatherName"
                          value={formData.fatherName}
                          handleInputChange={handleInputChange}
                          ShortName={true}
                          className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <Einput
                          title="FATHER'S MOBILE"
                          type="text"
                          name="fatherMobile"
                          value={formData.fatherMobile}
                          handleInputChange={handleInputChange}
                          ShortName={true}
                          className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <div className="md:col-span-2">
                          <Eselect
                            title="FATHER'S OCCUPATION"
                            name="fatherOccupation"
                            option={occupationOptions}
                            initialValue={formData.fatherOccupation}
                            handleInputChange={handleInputChange}
                            placeholder="Select"
                            ShortName={true}
                            className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                            labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                          />
                        </div>

                        <Einput
                          title="MOTHER'S NAME"
                          type="text"
                          name="motherName"
                          value={formData.motherName}
                          handleInputChange={handleInputChange}
                          ShortName={true}
                          className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <Einput
                          title="MOTHER'S MOBILE"
                          type="text"
                          name="motherMobile"
                          value={formData.motherMobile}
                          handleInputChange={handleInputChange}
                          ShortName={true}
                          className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <Einput
                          title="SPOUSE'S NAME"
                          type="text"
                          name="spouseName"
                          value={formData.spouseName}
                          handleInputChange={handleInputChange}
                          ShortName={true}
                          className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <Einput
                          title="SPOUSE'S MOBILE"
                          type="text"
                          name="spouseMobile"
                          value={formData.spouseMobile}
                          handleInputChange={handleInputChange}
                          ShortName={true}
                          className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <div className="md:col-span-2">
                          <Eselect
                            title="SPOUSE'S GENDER"
                            name="spouseGender"
                            option={GENDER_OPTIONS.slice(0, 2)}
                            initialValue={formData.spouseGender}
                            handleInputChange={handleInputChange}
                            placeholder="Select"
                            ShortName={true}
                            className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                            labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                          />
                        </div>

                        <Einput
                          title="SIBLING'S NAME"
                          type="text"
                          name="siblingName"
                          value={formData.siblingName}
                          handleInputChange={handleInputChange}
                          ShortName={true}
                          className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <Einput
                          title="SIBLING'S MOBILE"
                          type="text"
                          name="siblingContactNumber"
                          value={formData.siblingContactNumber}
                          handleInputChange={handleInputChange}
                          ShortName={true}
                          className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <Einput
                          title="EMERGENCY CONTACT NAME"
                          type="text"
                          name="emergencyName"
                          value={formData.emergencyName}
                          handleInputChange={handleInputChange}
                          redlabel="*"
                          ShortName={true}
                          className={`!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] ${getFieldBorder(
                            formData.emergencyName
                          )}`}
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <Einput
                          title="EMERGENCY CONTACT NUMBER"
                          type="text"
                          name="emergencyNumber"
                          value={formData.emergencyNumber}
                          handleInputChange={handleInputChange}
                          redlabel="*"
                          ShortName={true}
                          className={`!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] ${getFieldBorder(
                            formData.emergencyNumber
                          )}`}
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />
                      </div>
                    )}

                    {/* Section 3: Identity */}
                    {s.id === "identity" && (
                      <div className="space-y-[13px] mt-[15px]">
                        {/* PAN field with Einput and verify button side-by-side */}
                        <div className="flex items-end gap-2">
                          <div className="flex-1 min-w-0">
                            <Einput
                              title="PAN NUMBER"
                              type="text"
                              name="panNo"
                              value={formData.panNo}
                              handleInputChange={(name, val) => {
                                const uppercaseVal = String(val).toUpperCase();
                                setFormData((prev) => ({
                                  ...prev,
                                  panNo: uppercaseVal,
                                  panCardVer: false,
                                  panNameMatchVer: false,
                                  aadhaarLinkedVer: false,
                                }));
                              }}
                              redlabel="*"
                              placeholder="ABCDE1234F"
                              maxLength={10}
                              ShortName={true}
                              className={`!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] ${
                                !formData.panNo?.trim() || !formData.panCardVer
                                  ? "!border-[#E11D48]/45 ring-1 ring-[#E11D48]/20"
                                  : "!border-[#10B981]/45"
                              }`}
                              labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                            />
                          </div>
                          {Boolean(formData.panNo?.trim()) &&
                          formData.panCardVer ? (
                            <div className="h-[38px] px-3.5 rounded-[9px] bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] font-[600] text-[11.5px] flex items-center gap-1.5 shrink-0 select-none">
                              <BadgeCheck className="w-4 h-4" /> Verified
                            </div>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={verifyPan}
                              disabled={isVerifying}
                              icon={<Shield className="w-3.5 h-3.5" />}
                              className="!h-[38px] !px-3.5 !rounded-[9px] !bg-[#4F46E5] hover:!bg-[#4338CA] !text-white !font-[600] !text-[11.5px] whitespace-nowrap shrink-0"
                            >
                              {isVerifying ? "Verifying..." : "Verify"}
                            </Button>
                          )}
                        </div>

                        {/* Aadhaar field with Einput and verify button side-by-side */}
                        <div className="flex items-end gap-2">
                          <div className="flex-1 min-w-0">
                            <Einput
                              title="AADHAAR NUMBER"
                              type="text"
                              name="adharNo"
                              value={formData.adharNo}
                              handleInputChange={(name, val) => {
                                const clean = String(val)
                                  .replace(/\D/g, "")
                                  .slice(0, 12);
                                setFormData((prev) => ({
                                  ...prev,
                                  adharNo: clean,
                                  aadhaarCardVer: false,
                                }));
                              }}
                              redlabel="*"
                              placeholder="12 digits"
                              maxLength={12}
                              ShortName={true}
                              className={`!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] ${
                                !formData.adharNo?.trim() ||
                                !formData.aadhaarCardVer
                                  ? "!border-[#E11D48]/45 ring-1 ring-[#E11D48]/20"
                                  : "!border-[#10B981]/45"
                              }`}
                              labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                            />
                          </div>
                          {Boolean(formData.adharNo?.trim()) &&
                          formData.aadhaarCardVer ? (
                            <div className="h-[38px] px-3.5 rounded-[9px] bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] font-[600] text-[11.5px] flex items-center gap-1.5 shrink-0 select-none">
                              <BadgeCheck className="w-4 h-4" /> Verified
                            </div>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={verifyAadhaar}
                              disabled={isVerifying}
                              icon={<Shield className="w-3.5 h-3.5" />}
                              className="!h-[38px] !px-3.5 !rounded-[9px] !bg-[#4F46E5] hover:!bg-[#4338CA] !text-white !font-[600] !text-[11.5px] whitespace-nowrap shrink-0"
                            >
                              {isVerifying ? "Verifying..." : "Verify"}
                            </Button>
                          )}
                        </div>

                        {!otpDisabled && (
                          <div className="p-3.5 rounded-[10px] bg-slate-50 dark:bg-[#0E1524] border border-[#4F46E5]/30 space-y-2">
                            <p className="text-[12px] font-[550] text-[#1E293B] dark:text-[#E7ECF3]">
                              Enter 6-digit OTP sent to Aadhaar-linked mobile:
                            </p>
                            <div className="max-w-[280px]">
                              <Einput
                                title=""
                                type="text"
                                name="aadhaarOtp"
                                value={aadhaarOtp}
                                handleInputChange={(_, val) => {
                                  const clean = String(val)
                                    .replace(/\D/g, "")
                                    .slice(0, 6);
                                  setAadhaarOtp(clean);
                                }}
                                maxLength={6}
                                placeholder="6-digit OTP"
                                ShortName={true}
                                className="!h-[36px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] text-center tracking-widest text-[13px] font-[600]"
                                rightElement={
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={verifyAadhaarOtp}
                                    disabled={
                                      isVerifyingOtp ||
                                      aadhaarOtp.length !== 6
                                    }
                                    className="relative -top-[3.5px] -left-[4px] !h-[24px] !py-0 !px-2.5 !rounded-[6px] !text-[11px] !font-[600] shadow-none"
                                  >
                                    {isVerifyingOtp
                                      ? "Verifying..."
                                      : "Verify OTP"}
                                  </Button>
                                }
                              />
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-[13px] pt-1">
                          <Einput
                            title="PASSPORT NUMBER"
                            type="text"
                            name="passportNo"
                            value={formData.passportNo}
                            handleInputChange={handleInputChange}
                            ShortName={true}
                            className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                            labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                          />

                          <Einput
                            title="PASSPORT EXPIRY"
                            type="date"
                            name="passportExpiryDate"
                            value={formData.passportExpiryDate}
                            handleInputChange={handleInputChange}
                            ShortName={true}
                            className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                            labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                          />

                          <Einput
                            title="PF (UAN) NUMBER"
                            type="text"
                            name="pfNumber"
                            value={formData.pfNumber}
                            handleInputChange={handleInputChange}
                            ShortName={true}
                            className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                            labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                          />

                          <Einput
                            title="ESI NUMBER"
                            type="text"
                            name="esiNumber"
                            value={formData.esiNumber}
                            handleInputChange={handleInputChange}
                            ShortName={true}
                            className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                            labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                          />

                          <Einput
                            title="LIN NUMBER"
                            type="text"
                            name="LIN_NO"
                            value={formData.LIN_NO}
                            handleInputChange={handleInputChange}
                            ShortName={true}
                            className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                            labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                          />

                          <Einput
                            title="DRIVING LICENCE NUMBER"
                            type="text"
                            name="driving_licence"
                            value={formData.driving_licence}
                            handleInputChange={handleInputChange}
                            ShortName={true}
                            className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                            labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                          />
                        </div>
                      </div>
                    )}

                    {/* Section 4: Address */}
                    {s.id === "address" && (
                      <div className="space-y-[13px] mt-[15px]">
                        <Einput
                          title="PERMANENT ADDRESS LINE 1"
                          type="text"
                          name="pAddress1"
                          value={formData.pAddress1}
                          handleInputChange={handleInputChange}
                          redlabel="*"
                          placeholder="House, street"
                          ShortName={true}
                          className={`!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] ${getFieldBorder(
                            formData.pAddress1
                          )}`}
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <Einput
                          title="PERMANENT ADDRESS LINE 2"
                          type="text"
                          name="pAddress2"
                          value={formData.pAddress2}
                          handleInputChange={handleInputChange}
                          placeholder="Area, landmark"
                          ShortName={true}
                          className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-[13px]">
                          <Eselect
                            title="CITY"
                            name="pCity"
                            option={cityOptions}
                            initialValue={formData.pCity}
                            handleInputChange={handleInputChange}
                            redlabel="*"
                            placeholder="Select"
                            ShortName={true}
                            className={`!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] ${getFieldBorder(
                              formData.pCity
                            )}`}
                            labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                          />

                          <Eselect
                            title="STATE"
                            name="pState"
                            option={stateOptions}
                            initialValue={formData.pState}
                            handleInputChange={handleInputChange}
                            redlabel="*"
                            placeholder="Select"
                            ShortName={true}
                            className={`!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] ${getFieldBorder(
                              formData.pState
                            )}`}
                            labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                          />
                        </div>

                        <div className="w-full md:w-1/2">
                          <Einput
                            title="PINCODE"
                            type="text"
                            name="pPinCode"
                            value={formData.pPinCode}
                            handleInputChange={handleInputChange}
                            redlabel="*"
                            placeholder="6 digits"
                            ShortName={true}
                            className={`!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] ${getFieldBorder(
                              formData.pPinCode
                            )}`}
                            labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                          />
                        </div>

                        {/* Toggle button */}
                        <Switch
                          title="Current address same as permanent"
                          description="Copies the permanent address into the current address"
                          checked={sameAsPermanent}
                          onChange={handleSameAsPermanentToggle}
                          className="mt-[14px]"
                        />

                        {!sameAsPermanent && (
                          <div className="space-y-[13px] pt-2 border-t border-[#E2E8F0] dark:border-[#1F2937]">
                            <div className="text-[11.5px] font-[650] text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wide">
                              Current Address
                            </div>
                            <Einput
                              title="CURRENT ADDRESS LINE 1"
                              type="text"
                              name="cAddress1"
                              value={formData.cAddress1}
                              handleInputChange={handleInputChange}
                              placeholder="House, street"
                              ShortName={true}
                              className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                              labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                            />

                            <Einput
                              title="CURRENT ADDRESS LINE 2"
                              type="text"
                              name="cAddress2"
                              value={formData.cAddress2}
                              handleInputChange={handleInputChange}
                              placeholder="Area, landmark"
                              ShortName={true}
                              className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                              labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-[13px]">
                              <Eselect
                                title="CITY"
                                name="cCity"
                                option={cityOptions}
                                initialValue={formData.cCity}
                                handleInputChange={handleInputChange}
                                placeholder="Select"
                                ShortName={true}
                                className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                                labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                              />

                              <Eselect
                                title="STATE"
                                name="cState"
                                option={stateOptions}
                                initialValue={formData.cState}
                                handleInputChange={handleInputChange}
                                placeholder="Select"
                                ShortName={true}
                                className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                                labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                              />
                            </div>

                            <div className="w-full md:w-1/2">
                              <Einput
                                title="PINCODE"
                                type="text"
                                name="cPincode"
                                value={formData.cPincode}
                                handleInputChange={handleInputChange}
                                placeholder="6 digits"
                                ShortName={true}
                                className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                                labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Section 5: Previous Employment */}
                    {s.id === "employment" && (
                      <div className="mt-[15px]">
                        <Switch
                          title="I have previous company information"
                          description="Enable this only if applicable"
                          checked={hasPreviousCompany}
                          onChange={() =>
                            setHasPreviousCompany(!hasPreviousCompany)
                          }
                        />

                        {hasPreviousCompany && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-[13px] mt-[15px]">
                            <div className="md:col-span-2">
                              <Einput
                                title="PREVIOUS COMPANY NAME"
                                type="text"
                                name="previousCompanyName"
                                value={formData.previousCompanyName}
                                handleInputChange={handleInputChange}
                                ShortName={true}
                                className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                                labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                              />
                            </div>

                            <Eselect
                              title="COMPANY CITY"
                              name="pCompanyCity"
                              option={cityOptions}
                              initialValue={formData.pCompanyCity}
                              handleInputChange={handleInputChange}
                              placeholder="Select"
                              ShortName={true}
                              className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                              labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                            />

                            <Einput
                              title="CONTACT NUMBER"
                              type="text"
                              name="pCompanyContactNumber"
                              value={formData.pCompanyContactNumber}
                              handleInputChange={handleInputChange}
                              ShortName={true}
                              className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                              labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                            />

                            <div className="md:col-span-2">
                              <Einput
                                title="DESIGNATION"
                                type="text"
                                name="pDesignation"
                                value={formData.pDesignation}
                                handleInputChange={handleInputChange}
                                ShortName={true}
                                className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                                labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                              />
                            </div>

                            <Einput
                              title="JOINING DATE"
                              type="date"
                              name="pJoiningDate"
                              value={formData.pJoiningDate}
                              handleInputChange={handleInputChange}
                              ShortName={true}
                              className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                              labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                            />

                            <Einput
                              title="END DATE"
                              type="date"
                              name="preEndDate"
                              value={formData.preEndDate}
                              handleInputChange={handleInputChange}
                              ShortName={true}
                              className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                              labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Section 6: Other Details */}
                    {s.id === "other" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-[13px] mt-[15px]">
                        <div className="md:col-span-2">
                          <Einput
                            title="SKILLS"
                            type="text"
                            name="skills"
                            value={formData.skills}
                            handleInputChange={handleInputChange}
                            placeholder="Comma separated"
                            ShortName={true}
                            className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                            labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                          />
                        </div>

                        <Einput
                          title="BASIC QUALIFICATION"
                          type="text"
                          name="basicQualification"
                          value={formData.basicQualification}
                          handleInputChange={handleInputChange}
                          ShortName={true}
                          className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <Einput
                          title="PROFESSIONAL QUALIFICATION"
                          type="text"
                          name="professionalQualification"
                          value={formData.professionalQualification}
                          handleInputChange={handleInputChange}
                          ShortName={true}
                          className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <Einput
                          title="LANGUAGES KNOWN"
                          type="text"
                          name="languageDetails"
                          value={formData.languageDetails}
                          handleInputChange={handleInputChange}
                          ShortName={true}
                          className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <Einput
                          title="CHILDREN DETAILS"
                          type="text"
                          name="childrenDetails"
                          value={formData.childrenDetails}
                          handleInputChange={handleInputChange}
                          ShortName={true}
                          className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <Eselect
                          title="RELIGION"
                          name="religion"
                          option={RELIGION_OPTIONS}
                          initialValue={formData.religion}
                          handleInputChange={handleInputChange}
                          placeholder="Select"
                          ShortName={true}
                          className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <Einput
                          title="HEIGHT (FT)"
                          type="text"
                          name="empHeight"
                          value={formData.empHeight}
                          handleInputChange={handleInputChange}
                          placeholder="5.4"
                          ShortName={true}
                          className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />

                        <Einput
                          title="WEIGHT (KG)"
                          type="text"
                          name="empWeight"
                          value={formData.empWeight}
                          handleInputChange={handleInputChange}
                          placeholder="57"
                          ShortName={true}
                          className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937]"
                          labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                        />
                      </div>
                    )}

                    {/* Section 7: Documents (HTML exact) */}
                    {s.id === "documents" && (
                      <div className="flex flex-col gap-[9px] mt-[15px]">
                        <DocRowPrototype
                          label="Aadhaar card"
                          existingUrl={existingDocs.adhar}
                          file={docFiles.adhar}
                          onChange={(f) =>
                            setDocFiles((p) => ({ ...p, adhar: f }))
                          }
                        />

                        <DocRowPrototype
                          label="PAN card"
                          existingUrl={existingDocs.pan}
                          file={docFiles.pan}
                          onChange={(f) =>
                            setDocFiles((p) => ({ ...p, pan: f }))
                          }
                        />

                        <DocRowPrototype
                          label="Salary slip"
                          existingUrl={existingDocs.salary}
                          file={docFiles.salary}
                          onChange={(f) =>
                            setDocFiles((p) => ({ ...p, salary: f }))
                          }
                        />

                        <DocRowPrototype
                          label="Other document"
                          existingUrl={existingDocs.other}
                          file={docFiles.other}
                          onChange={(f) =>
                            setDocFiles((p) => ({ ...p, other: f }))
                          }
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Profile Summary Modal */}
      {showPreviewModal && (() => {
        const summarySections = getProfileSummary();
        const totalFields = summarySections.reduce(
          (acc, sec) => acc + sec.fields.length,
          0
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-[#111827] rounded-[16px] border border-[#E2E8F0] dark:border-[#1F2937] max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-[#E2E8F0] dark:border-[#1F2937]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-[8px] grid place-items-center bg-[#EEF2FF] text-[#4F46E5] shrink-0">
                    <Eye className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <span className="text-[14px] sm:text-[15px] font-[650] text-[#1E293B] dark:text-[#E7ECF3] block leading-tight truncate">
                      Profile Preview
                    </span>
                    <span className="text-[11px] sm:text-[11.5px] text-[#64748B] dark:text-[#94A3B8] block truncate">
                      Complete profile overview and submission summary
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 rounded-[8px] text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#182235] cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3 sm:space-y-4 text-[12.5px]">
                <div className="flex items-center gap-3 sm:gap-3.5 p-3 sm:p-3.5 rounded-[10px] bg-[#F8FAFC] dark:bg-[#0E1524] border border-[#E2E8F0] dark:border-[#1F2937]">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-[#EEF2FF] text-[#4F46E5] font-bold text-[14px] sm:text-[15px] grid place-items-center shrink-0">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : photoUrl ? (
                      <img
                        src={photoUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] sm:text-[15px] font-[650] text-[#1E293B] dark:text-[#E7ECF3] truncate">
                      {formData.empName || "EMPLOYEE"}
                    </div>
                    <div className="text-[11.5px] sm:text-[12px] text-[#64748B] dark:text-[#94A3B8] truncate">
                      Emp code {formData.empCode || "-"} &middot;{" "}
                      {formData.employeedesignation || "-"}
                    </div>
                  </div>
                </div>

                {summarySections.map((section, idx) => (
                  <div
                    key={idx}
                    className="border border-[#E2E8F0] dark:border-[#1F2937] rounded-[10px] overflow-hidden bg-white dark:bg-[#111827]"
                  >
                    <div className="bg-[#F8FAFC] dark:bg-[#0E1524] px-3.5 sm:px-4 py-2 border-b border-[#E2E8F0] dark:border-[#1F2937] flex items-center justify-between">
                      <h4 className="font-[650] text-[12.5px] sm:text-[13px] text-[#1E293B] dark:text-[#E7ECF3]">
                        {section.title}
                      </h4>
                      <span className="text-[10.5px] sm:text-[11px] font-[500] text-[#64748B] dark:text-[#94A3B8]">
                        {section.fields.length} fields
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2.5 sm:p-3">
                      {section.fields.map((field, fIdx) => (
                        <div
                          key={fIdx}
                          className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 p-2 rounded-[8px] border border-[#F1F5F9] dark:border-[#1F2937]/50 hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] text-[12px] transition-colors"
                        >
                          <span className="font-[600] text-[#64748B] dark:text-[#94A3B8] sm:min-w-[130px] shrink-0 text-[11px] sm:text-[12px]">
                            {field.label}:
                          </span>
                          <span className="text-[#1E293B] dark:text-[#E7ECF3] font-[500] break-words flex-1">
                            {field.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-3.5 border-t border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827]">
                <p className="text-[11.5px] sm:text-[12px] text-[#64748B] dark:text-[#94A3B8] font-[500]">
                  Total Fields: {totalFields}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreviewModal(false)}
                    className="!h-[32px] !px-3 !rounded-[8px] !text-[12px]"
                  >
                    Close
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setShowPreviewModal(false);
                      saveProfile();
                    }}
                    className="!h-[32px] !px-4 !rounded-[8px] !text-[12px] !font-[600] !bg-[#4F46E5]"
                  >
                    Update profile
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Document Row matching prototype HTML exact styles
function DocRowPrototype({
  label,
  existingUrl,
  file,
  onChange,
}: {
  label: string;
  existingUrl: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const hasFile = Boolean(file || existingUrl);
  const activeUrl = file ? URL.createObjectURL(file) : existingUrl;
  const isPdf = activeUrl?.toLowerCase().includes(".pdf");

  return (
    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-[11px] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[10px] p-2.5 sm:p-[11px_13px] bg-white dark:bg-[#111827]">
      <div className="flex items-center gap-2.5 sm:gap-[11px] min-w-0 flex-1">
        <span
          className={`w-7 h-7 rounded-[8px] shrink-0 grid place-items-center ${
            hasFile
              ? "bg-[#10B981]/15 text-[#10B981]"
              : "bg-[#F8FAFC] dark:bg-[#1F2937] text-[#64748B] dark:text-[#94A3B8]"
          }`}
        >
          {hasFile ? (
            <FileCheck2 className="w-4 h-4" />
          ) : (
            <FileX className="w-4 h-4" />
          )}
        </span>

        <span className="flex-1 min-w-0">
          <span className="block text-[12px] sm:text-[12.5px] font-[550] text-[#1E293B] dark:text-[#E7ECF3] truncate">
            {label}
          </span>
          <button
            type="button"
            onClick={() => {
              if (hasFile) setPreviewOpen(true);
            }}
            className="flex items-center gap-[5px] border-none bg-transparent font-inherit text-[11px] sm:text-[11.5px] font-[550] cursor-pointer pt-[2px] max-w-full"
            style={{
              color: hasFile ? "#4F46E5" : "#64748B",
            }}
          >
            <Eye className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {file
                ? file.name
                : existingUrl
                ? "View uploaded file"
                : "Nothing uploaded"}
            </span>
          </button>
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
        }}
      />

      <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
        {file && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="p-1 rounded-[6px] text-[#64748B] hover:text-[#E11D48] hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
            title="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <Button
          variant="outline"
          size="sm"
          icon={<Upload className="w-3.5 h-3.5 text-[#64748B]" />}
          onClick={() => inputRef.current?.click()}
          className="!h-[30px] !px-[11px] !rounded-[8px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-transparent !text-[#1E293B] dark:!text-[#E7ECF3] !text-[11.5px] !font-[600] shrink-0"
        >
          {hasFile ? "Replace" : "Upload"}
        </Button>
      </div>

      {/* Document Preview Modal */}
      {previewOpen && activeUrl && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-[16px] border border-[#E2E8F0] bg-white shadow-2xl dark:border-[#1F2937] dark:bg-[#111827] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 sm:px-5 py-3 sm:py-3.5 dark:border-[#1F2937]">
              <h3 className="font-[600] text-[13.5px] sm:text-[14px] text-[#1E293B] dark:text-[#E7ECF3] truncate">
                {label} Preview
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[8px] p-1.5 text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#182235]"
                  title="Open in new window"
                >
                  <Eye className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="rounded-[8px] p-1.5 text-[#64748B] hover:bg-[#F1F5F9] dark:hover:bg-[#182235]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-center overflow-auto p-2 sm:p-4 bg-[#F8FAFC] dark:bg-[#0E1524] min-h-[300px] sm:min-h-[400px]">
              {isPdf ? (
                <iframe
                  src={activeUrl}
                  title={label}
                  className="h-[65vh] sm:h-[70vh] w-full rounded-[8px] border border-[#E2E8F0] bg-white"
                />
              ) : (
                <img
                  src={activeUrl}
                  alt={label}
                  className="max-h-[65vh] sm:max-h-[72vh] max-w-full rounded-[8px] object-contain shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
