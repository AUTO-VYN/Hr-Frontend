"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import Swal from "sweetalert2";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  Car,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileCheck,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  HeartHandshake,
  HelpCircle,
  // IdCard,
  Image as ImageIcon,
  Info,
  Languages,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Minus,
  Paperclip,
  Phone,
  Plus,
  Printer,
  Sparkles,
  Trash2,
  Upload,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import Button from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import HashloaderComponent from "@/components/Templates/hashloader";
import SelectSearch from "@/components/atoms/Select";
import LanguageTable from "@/components/atoms/LanguageTable";
import DynamicTable from "@/components/atoms/DynamicTable";
import CertificatesUpload, { UploadItem } from "@/components/atoms/CertificateUpload";

// Helper Alert Toast
const showSideAlert = (message: string, type: "success" | "error" | "warning" | "info") => {
  Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3200,
    timerProgressBar: true,
    customClass: {
      popup: "shadow-2xl rounded-2xl border border-slate-100 dark:border-slate-800",
    },
  }).fire({
    icon: type,
    title: message,
  });
};

const HighestQualification = [
  { value: "10th", label: "10th Pass" },
  { value: "12th", label: "12th Pass" },
  { value: "Diploma", label: "Diploma" },
  { value: "ITI", label: "ITI" },
  { value: "Graduation", label: "Graduation" },
  { value: "Post Graduation", label: "Post Graduation" },
  { value: "MBA", label: "MBA" },
  { value: "B.E./B.Tech.", label: "B.E./B.Tech." },
  { value: "PhD", label: "PhD / Doctorate" },
  { value: "Other", label: "Other" },
];

const GenderOptions = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

const ReligionOptions = [
  { value: "1", label: "HINDU" },
  { value: "2", label: "MUSLIM" },
  { value: "3", label: "SIKH" },
  { value: "4", label: "CHRISTIAN" },
  { value: "5", label: "JAIN" },
  { value: "6", label: "BUDDHIST" },
  { value: "7", label: "OTHER" },
];

const CategoryOptions = [
  { value: "1", label: "GEN." },
  { value: "2", label: "OBC" },
  { value: "3", label: "SC" },
  { value: "4", label: "ST" },
];

const EmergencyRelationOptions = [
  { value: "Father", label: "Father" },
  { value: "Mother", label: "Mother" },
  { value: "Husband", label: "Husband" },
  { value: "Wife", label: "Wife" },
  { value: "Brother", label: "Brother" },
  { value: "Sister", label: "Sister" },
  { value: "Guardian", label: "Guardian" },
];

const eduColumnsShow = [
  "Degree / Certification",
  "Board / University",
  "School / College",
  "Year of passing",
  "Percentage",
];

const eduColumns = [
  "Emp_Degree",
  "Emp_Board",
  "Emp_College",
  "Emp_Passing_year",
  "Emp_Percentage",
];

const eduConstraints = {
  Emp_Degree: { type: "TEXT", max: 50, disabled: true },
  Emp_Board: { type: "TEXT", max: 50 },
  Emp_College: { type: "TEXT", max: 50 },
  Emp_Passing_year: { type: "NUMBER", max: 4 },
  Emp_Percentage: { type: "NUMBER", max: 5 },
};

const familyColumnsShow = [
  "Relation",
  "Member Name",
  "Qualification",
  "Profession",
  "Department",
];

const familyColumns = [
  "Relation",
  "Nominee_Name",
  "Member_Name",
  "Percentage",
  "Is_Minor",
];

const familyConstraints = {
  Relation: { type: "TEXT", max: 50, disabled: true },
  Nominee_Name: { type: "TEXT", max: 50 },
  Member_Name: { type: "TEXT", max: 50 },
  Percentage: { type: "TEXT", max: 50 },
  Is_Minor: { type: "TEXT", max: 50 },
};

const docUploadItems: UploadItem[] = [
  { name: "ppimg", title: "Profile image", subtitle: "Click to attach", icon: <ImageIcon className="h-4 w-4" />, accept: "image/*" },
  { name: "adhar", title: "Aadhar card", subtitle: "Click to attach", icon: <FileCheck className="h-4 w-4" /> },
  { name: "pancard", title: "PAN card", subtitle: "Click to attach", icon: <FileCheck className="h-4 w-4" /> },
  { name: "salslip", title: "Salary slip", subtitle: "Click to attach", icon: <FileSpreadsheet className="h-4 w-4" /> },
  { name: "cv", title: "Updated CV", subtitle: "Click to attach", icon: <FileText className="h-4 w-4" /> },
  { name: "explett", title: "Experience letter", subtitle: "Click to attach", icon: <FileText className="h-4 w-4" /> },
];

const initialDefaultData = {
  ppimg: null as any,
  cv: null as any,
  adhar: null as any,
  pancard: null as any,
  salslip: null as any,
  explett: null as any,
  NAME: "",
  MOB_NO: "",
  WHATSAPP_NO: "",
  EMAIL: "",
  AADHAR_NO: "",
  FATHERS_NAME: "",
  MOTHERS_NAME: "",
  GENDER: "",
  ADDRESS: "",
  DOB: "",
  CITY: "",
  STATE: "",
  relCode: "",
  DESIGNATION: "",
  SUITABLE_DESIGNATION: "",
  LOC_CODE: "",
  HIGH_QUAL: "",
  PASSING_PER: "",
  EXP_IN_YEAR: "",
  SOURCE_OF_REG: "",
  SUB_SOURCE: "",
  Emgy_No: "",
  Emgy_Mob_No: "",
  CURRENT_CTC: "",
  EXPECTED_CTC: "",
  CATEGORY: "",
  CASTE: "",
  DRIVE: "0",
  SKILLS: "",
  tranId: "",
  Comp_code: "",
  COMP_KNOWN: "",
  CHANNEL: "",
  CLUSTER: "",
};

const initialLanguages = [
  { Emp_Language: "HINDI", Emp_Language_Understand: "Y", Emp_Language_Speak: "Y", Emp_Language_Read: "Y", Emp_Language_Write: "Y", UTD: 1 },
  { Emp_Language: "ENGLISH", Emp_Language_Understand: "Y", Emp_Language_Speak: "Y", Emp_Language_Read: "Y", Emp_Language_Write: "Y", UTD: 1 },
  { Emp_Language: "LOCAL/REGIONAL", Emp_Language_Understand: "Y", Emp_Language_Speak: "Y", Emp_Language_Read: "Y", Emp_Language_Write: "Y", UTD: 1 },
  { Emp_Language: "COMPUTER", Emp_Language_Understand: "Y", Emp_Language_Speak: "Y", Emp_Language_Read: "Y", Emp_Language_Write: "Y", UTD: 1 },
];

const initialEducation = [
  { Emp_Degree: "10th Std.", Emp_Board: "", Emp_College: "", Emp_Passing_year: "", Emp_Percentage: "", UTD: 1 },
  { Emp_Degree: "12th Std.", Emp_Board: "", Emp_College: "", Emp_Passing_year: "", Emp_Percentage: "", UTD: 1 },
  { Emp_Degree: "Graduation", Emp_Board: "", Emp_College: "", Emp_Passing_year: "", Emp_Percentage: "", UTD: 1 },
  { Emp_Degree: "P. Gradu.", Emp_Board: "", Emp_College: "", Emp_Passing_year: "", Emp_Percentage: "", UTD: 1 },
  { Emp_Degree: "Diploma", Emp_Board: "", Emp_College: "", Emp_Passing_year: "", Emp_Percentage: "", UTD: 1 },
  { Emp_Degree: "ITI", Emp_Board: "", Emp_College: "", Emp_Passing_year: "", Emp_Percentage: "", UTD: 1 },
  { Emp_Degree: "MBA", Emp_Board: "", Emp_College: "", Emp_Passing_year: "", Emp_Percentage: "", UTD: 1 },
];

const initialExperience = [
  {
    Emp_Company: "",
    Emp_Designation: "",
    Emp_Responsibility: "",
    Emp_From_Date: "",
    Emp_To_Date: "",
    Emp_Settlement_Done: "",
    Emp_Drawn_Salary: "",
    Emp_Leaving_Reason: "",
    UTD: 1,
  },
];

const initialNominees = [
  { Relation: "Father", Nominee_Name: "", Member_Name: "", Percentage: "", Is_Minor: "", UTD: 1 },
  { Relation: "Mother", Nominee_Name: "", Member_Name: "", Percentage: "", Is_Minor: "", UTD: 1 },
  { Relation: "Brother", Nominee_Name: "", Member_Name: "", Percentage: "", Is_Minor: "", UTD: 1 },
  { Relation: "Sister", Nominee_Name: "", Member_Name: "", Percentage: "", Is_Minor: "", UTD: 1 },
  { Relation: "Wife", Nominee_Name: "", Member_Name: "", Percentage: "", Is_Minor: "", UTD: 1 },
  { Relation: "Husband", Nominee_Name: "", Member_Name: "", Percentage: "", Is_Minor: "", UTD: 1 },
  { Relation: "Son", Nominee_Name: "", Member_Name: "", Percentage: "", Is_Minor: "", UTD: 1 },
  { Relation: "Daughter", Nominee_Name: "", Member_Name: "", Percentage: "", Is_Minor: "", UTD: 1 },
];

export default function CandidateRegistrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useCurrentUser();

  // Wizard Step State (1: Basic, 2: Language & Edu, 3: Exp & Family, 4: Preview)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPrefilledFromQR, setIsPrefilledFromQR] = useState<boolean>(false);

  // Form Data State
  const [formData, setFormData] = useState(initialDefaultData);
  const [tableDataLang, setTableDataLang] = useState<any[]>(initialLanguages);
  const [tableDataEdu, setTableDataEdu] = useState<any[]>(initialEducation);
  const [tableDataExp, setTableDataExp] = useState<any[]>(initialExperience);
  const [tableDataFamily, setTableDataFamily] = useState<any[]>(initialNominees);

  // Dropdown Lists from API
  const [stateOptions, setStateOptions] = useState<any[]>([]);
  const [desgOptions, setDesgOptions] = useState<any[]>([]);
  const [branchOptions, setBranchOptions] = useState<any[]>([]);
  const [sourceOptions, setSourceOptions] = useState<any[]>([]);
  const [channelOptions, setChannelOptions] = useState<any[]>([]);
  const [clusterOptions, setClusterOptions] = useState<any[]>([]);
  const [mandatoryFields, setMandatoryFields] = useState<any[]>([]);
  const [filledFields, setFilledFields] = useState<{ [key: string]: boolean }>({});

  // File Upload Previews & References
  const fileRefs = {
    ppimg: useRef<HTMLInputElement | null>(null),
    adhar: useRef<HTMLInputElement | null>(null),
    pancard: useRef<HTMLInputElement | null>(null),
    salslip: useRef<HTMLInputElement | null>(null),
    cv: useRef<HTMLInputElement | null>(null),
    explett: useRef<HTMLInputElement | null>(null),
  };

  const [fileNames, setFileNames] = useState<{ [key: string]: string }>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // ============================================================================
  // Company Code Helper (Decodes base64 v1 param or URL params or user session)
  // ============================================================================
  const getCompCode = (): string => {
    const v1 = searchParams.get("v1");
    if (v1) {
      try {
        const decoded = JSON.parse(atob(v1));
        if (decoded?.Comp_code) return String(decoded.Comp_code);
        if (decoded?.comp_code) return String(decoded.comp_code);
      } catch (e) {
        console.warn("Failed to decode v1 parameter", e);
      }
    }

    const urlComp =
      searchParams.get("compcode") ||
      searchParams.get("comp_code") ||
      searchParams.get("Comp_code");
    if (urlComp) return String(urlComp);

    return (
      user?.Comp_Code ||
      (user as any)?.compcode ||
      (user as any)?.comp_code ||
      (user as any)?.company_code ||
      (user as any)?.DB ||
      ""
    );
  };

  // ============================================================================
  // Initial Data Fetching (Dropdowns, Candidate Data by Tran_id)
  // ============================================================================
  useEffect(() => {
    const compCode = getCompCode();
    if (!compCode) return;

    const fetchDropdowns = async () => {
      try {
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/interview/candreg`,
          null,
          {
            headers: {
              compcode: compCode,
              name: user?.name || "Candidate",
            },
          }
        );
        if (res.data) {
          if (res.data.states) setStateOptions(res.data.states);
          if (res.data.desg) setDesgOptions(res.data.desg);
          if (res.data.location) setBranchOptions(res.data.location);
          if (res.data.sources) setSourceOptions(res.data.sources);
          if (res.data.CHANNEL) setChannelOptions(res.data.CHANNEL);
          if (res.data.CLUSTER) setClusterOptions(res.data.CLUSTER);
        }
      } catch (err) {
        console.error("Error fetching dropdowns:", err);
      }
    };

    const fetchMandatory = async () => {
      try {
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/employee/GetMandtoryFieldsName`,
          { misc_code: 2 },
          {
            headers: {
              compcode: compCode,
              name: user?.name || "Candidate",
            },
          }
        );
        if (res.data?.Result && Array.isArray(res.data.Result)) {
          setMandatoryFields(
            res.data.Result.map((item: any) => ({
              label: item.label,
              value: String(item.value),
            }))
          );
        }
      } catch (err) {
        console.error("Error fetching mandatory fields:", err);
      }
    };

    fetchDropdowns();
    fetchMandatory();
  }, [user, searchParams]);

  // Decode URL parameters or existing candidate record
  useEffect(() => {
    const compCode = getCompCode();

    // Check v1 param or standard search params
    const v1 = searchParams.get("v1");
    let decodedParams: any = {};
    if (v1) {
      try {
        decodedParams = JSON.parse(atob(v1));
      } catch (e) {
        decodedParams = {};
      }
    }

    const tranIdParam =
      searchParams.get("tran_id") ||
      searchParams.get("tranId") ||
      decodedParams["tran_id"] ||
      "";
    const nameParam = searchParams.get("name") || decodedParams["name"] || "";
    const mobileParam = searchParams.get("mobile") || decodedParams["mobile"] || "";
    const emailParam = searchParams.get("email") || decodedParams["email"] || "";
    const designationParam =
      searchParams.get("designation") || decodedParams["designation"] || "";
    const locCodeParam =
      searchParams.get("loc_code") ||
      searchParams.get("Loc_code") ||
      decodedParams["Loc_code"] ||
      "";

    if (locCodeParam || designationParam) {
      setIsPrefilledFromQR(true);
    }

    // Set initial populated fields from query parameters
    setFormData((prev) => ({
      ...prev,
      tranId: tranIdParam || prev.tranId,
      NAME: nameParam || prev.NAME,
      MOB_NO: mobileParam || prev.MOB_NO,
      WHATSAPP_NO: mobileParam || prev.WHATSAPP_NO || prev.MOB_NO,
      EMAIL: emailParam || prev.EMAIL,
      DESIGNATION: designationParam || prev.DESIGNATION,
      LOC_CODE: locCodeParam ? String(locCodeParam) : prev.LOC_CODE,
      Comp_code: compCode,
    }));

    // If candidate has tranId, fetch full record from getonedata
    if (tranIdParam && compCode) {
      const fetchCandidateData = async () => {
        setIsLoading(true);
        try {
          const res = await axios.post(
            `${process.env.NEXT_PUBLIC_URL}/interview/getonedata`,
            { TRAN_ID: tranIdParam },
            {
              headers: {
                compcode: compCode,
                name: user?.name || "Candidate",
              },
            }
          );
          const data = res.data;
          if (data) {
            setFormData((prev) => ({
              ...prev,
              NAME: data.NAME || prev.NAME,
              MOB_NO: data.MOB_NO || prev.MOB_NO,
              WHATSAPP_NO: data.WHATSAPP_NO || data.MOB_NO || prev.WHATSAPP_NO,
              EMAIL: data.EMAIL ? data.EMAIL.trim() : prev.EMAIL,
              AADHAR_NO: data.AADHAR_NO || "",
              FATHERS_NAME: data.FATHERS_NAME || "",
              MOTHERS_NAME: data.MOTHERS_NAME || "",
              GENDER: data.GENDER ? data.GENDER.trim() : "",
              ADDRESS: data.ADDRESS || "",
              CITY: data.CITY || "",
              STATE: data.STATE || "",
              relCode: data.RELIGION ? data.RELIGION.trim() : "",
              DOB: data.DOB || "",
              HIGH_QUAL: data.HIGH_QUAL ? data.HIGH_QUAL.trim() : "",
              PASSING_PER: data.PASSING_PER || "",
              EXP_IN_YEAR: data.EXP_IN_YEAR || "",
              CURRENT_CTC: data.CURRENT_CTC || "",
              EXPECTED_CTC: data.EXPECTED_CTC || "",
              SOURCE_OF_REG: data.SOURCE_OF_REG || "",
              SUB_SOURCE: data.SUB_SOURCE || "",
              SKILLS: data.SKILLS || "",
              CATEGORY: data.CATEGORY || "",
              CASTE: data.CASTE ? data.CASTE.trim() : "",
              DRIVE: data.DRIVE !== undefined && data.DRIVE !== null ? String(data.DRIVE) : "0",
              CHANNEL: data.CHANNEL || "",
              CLUSTER: data.CLUSTER || "",
              Emgy_No: data.Emgy_No || "",
              Emgy_Mob_No: data.Emgy_Mob_No || "",
              DESIGNATION: data.DESIGNATION || prev.DESIGNATION,
              SUITABLE_DESIGNATION: data.SUITABLE_DESIGNATION || "",
              LOC_CODE: data.LOC_CODE ? String(data.LOC_CODE) : prev.LOC_CODE,
              tranId: tranIdParam,
            }));

            if (data.EmpLang && data.EmpLang.length > 0) {
              setTableDataLang(
                data.EmpLang.map((item: any) => ({
                  Emp_Language: item.Emp_Language || "",
                  Emp_Language_Understand: item.Emp_Language_Understand || "Y",
                  Emp_Language_Speak: item.Emp_Language_Speak || "Y",
                  Emp_Language_Read: item.Emp_Language_Read || "Y",
                  Emp_Language_Write: item.Emp_Language_Write || "Y",
                  UTD: item.UTD || 1,
                }))
              );
            }

            if (data.EmpEdu && data.EmpEdu.length > 0) {
              setTableDataEdu(
                data.EmpEdu.map((item: any) => ({
                  Emp_Degree: item.Emp_Degree || "",
                  Emp_Board: item.Emp_Board || "",
                  Emp_College: item.Emp_College || "",
                  Emp_Passing_year: item.Emp_Passing_year || "",
                  Emp_Percentage: item.Emp_Percentage || "",
                  UTD: item.UTD || 1,
                }))
              );
            }

            if (data.EmpExperience && data.EmpExperience.length > 0) {
              setTableDataExp(
                data.EmpExperience.map((item: any) => ({
                  Emp_Company: item.Emp_Company || "",
                  Emp_Designation: item.Emp_Designation || "",
                  Emp_Responsibility: item.Emp_Responsibility || "",
                  Emp_From_Date: item.Emp_From_Date || "",
                  Emp_To_Date: item.Emp_To_Date || "",
                  Emp_Settlement_Done: item.Emp_Settlement_Done || "Y",
                  Emp_Drawn_Salary: item.Emp_Drawn_Salary || "",
                  Emp_Leaving_Reason: item.Emp_Leaving_Reason || "",
                  UTD: item.UTD || 1,
                }))
              );
            }

            if (data.EmpNominee && data.EmpNominee.length > 0) {
              setTableDataFamily(
                data.EmpNominee.map((item: any) => ({
                  Relation: item.Relation || "",
                  Nominee_Name: item.Nominee_Name || "",
                  Member_Name: item.Member_Name || "",
                  Percentage: item.Member_Percentage || item.Percentage || "",
                  Is_Minor: item.Is_Minor || "N",
                  UTD: item.UTD || 1,
                }))
              );
            }

            const filledMap: { [key: string]: boolean } = {};
            Object.keys(data).forEach((key) => {
              if (data[key] && data[key].toString().trim() !== "") {
                filledMap[key] = true;
              }
            });
            setFilledFields(filledMap);
          }
        } catch (err) {
          console.error("Error fetching candidate record:", err);
        } finally {
          setIsLoading(false);
        }
      };

      fetchCandidateData();
    }
  }, [searchParams]);

  // ============================================================================
  // Field Change & Form Calculation Handlers
  // ============================================================================
  const handleInputChange = (name: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Form Completion Calculation
  const mandatoryKeys = useMemo(() => {
    const list = [
      { key: "NAME", label: "Candidate Name" },
      { key: "MOB_NO", label: "Mobile Number" },
      { key: "EMAIL", label: "Email Address" },
      { key: "GENDER", label: "Gender" },
      { key: "DOB", label: "Date of Birth" },
      { key: "AADHAR_NO", label: "Aadhar Number" },
      { key: "CITY", label: "City" },
      { key: "STATE", label: "State" },
      { key: "DESIGNATION", label: "Designation" },
      { key: "LOC_CODE", label: "Branch Location" },
      { key: "HIGH_QUAL", label: "Highest Qualification" },
      { key: "EXP_IN_YEAR", label: "Experience" },
    ];
    return list;
  }, []);

  const completionStats = useMemo(() => {
    let filledCount = 0;
    mandatoryKeys.forEach((item) => {
      const val = (formData as any)[item.key];
      if (val && String(val).trim() !== "") {
        filledCount++;
      }
    });
    const percent = Math.round((filledCount / mandatoryKeys.length) * 100);
    const remaining = mandatoryKeys.length - filledCount;
    return { percent, remaining, total: mandatoryKeys.length, filledCount };
  }, [formData, mandatoryKeys]);

  // Section-wise filled counters
  const identityCount = useMemo(() => {
    let count = 0;
    if (formData.NAME) count++;
    if (formData.FATHERS_NAME) count++;
    if (formData.MOTHERS_NAME) count++;
    if (formData.GENDER) count++;
    if (formData.DOB) count++;
    if (formData.AADHAR_NO) count++;
    if (formData.relCode) count++;
    if (formData.CASTE) count++;
    return count;
  }, [formData]);

  const contactCount = useMemo(() => {
    let count = 0;
    if (formData.MOB_NO) count++;
    if (formData.WHATSAPP_NO) count++;
    if (formData.EMAIL) count++;
    if (formData.Emgy_No) count++;
    if (formData.Emgy_Mob_No) count++;
    return count;
  }, [formData]);

  const locationCount = useMemo(() => {
    let count = 0;
    if (formData.ADDRESS) count++;
    if (formData.CITY) count++;
    if (formData.STATE) count++;
    if (formData.CLUSTER) count++;
    if (formData.CHANNEL) count++;
    if (formData.CATEGORY) count++;
    return count;
  }, [formData]);

  const applyingCount = useMemo(() => {
    let count = 0;
    if (formData.DESIGNATION) count++;
    if (formData.LOC_CODE) count++;
    if (formData.SKILLS) count++;
    if (formData.SOURCE_OF_REG) count++;
    if (formData.SUB_SOURCE) count++;
    return count;
  }, [formData]);

  const qualCtcCount = useMemo(() => {
    let count = 0;
    if (formData.HIGH_QUAL) count++;
    if (formData.PASSING_PER) count++;
    if (formData.EXP_IN_YEAR) count++;
    if (formData.CURRENT_CTC) count++;
    if (formData.EXPECTED_CTC) count++;
    return count;
  }, [formData]);

  const documentCount = useMemo(() => {
    let count = 0;
    if (formData.ppimg) count++;
    if (formData.adhar) count++;
    if (formData.pancard) count++;
    if (formData.salslip) count++;
    if (formData.cv) count++;
    if (formData.explett) count++;
    return count;
  }, [formData]);

  const missingRequiredFields = useMemo(() => {
    const missing: string[] = [];
    if (!formData.NAME?.trim()) missing.push("Candidate name");
    if (!formData.GENDER) missing.push("Gender");
    if (!formData.DOB) missing.push("Date of birth");
    if (!formData.AADHAR_NO?.trim()) missing.push("Aadhar number");
    if (!formData.MOB_NO?.trim()) missing.push("Mobile number");
    if (!formData.EMAIL?.trim()) missing.push("Email");
    return missing;
  }, [formData]);

  const filledLangCount = useMemo(() => {
    return tableDataLang.filter(
      (l) =>
        l.Emp_Language_Understand === "Y" ||
        l.Emp_Language_Speak === "Y" ||
        l.Emp_Language_Read === "Y" ||
        l.Emp_Language_Write === "Y"
    ).length;
  }, [tableDataLang]);

  const filledDegreeCount = useMemo(() => {
    return tableDataEdu.filter(
      (e) => e.Emp_Board?.trim() || e.Emp_College?.trim() || e.Emp_Passing_year?.trim() || e.Emp_Percentage?.trim()
    ).length;
  }, [tableDataEdu]);

  const getDriveLabel = (drive: string) => {
    if (drive === "2") return "2-Wheel Drive";
    if (drive === "4") return "4-Wheel Drive";
    if (drive === "1") return "Both";
    if (drive === "0") return "None";
    return "Not set";
  };

  const docUploadValues = useMemo(() => ({
    ppimg: formData.ppimg || null,
    adhar: formData.adhar || null,
    pancard: formData.pancard || null,
    salslip: formData.salslip || null,
    cv: formData.cv || null,
    explett: formData.explett || null,
  }), [formData.ppimg, formData.adhar, formData.pancard, formData.salslip, formData.cv, formData.explett]);

  const handleDocUploadChange = (next: Record<string, File | null>) => {
    setFormData((prev) => ({
      ...prev,
      ppimg: next.ppimg ?? null,
      adhar: next.adhar ?? null,
      pancard: next.pancard ?? null,
      salslip: next.salslip ?? null,
      cv: next.cv ?? null,
      explett: next.explett ?? null,
    }));

    if (next.ppimg && next.ppimg instanceof File) {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(next.ppimg);
    } else if (!next.ppimg) {
      setImagePreview(null);
    }
  };

  // File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File validation
    const maxSize = fieldName === "cv" ? 3 * 1024 * 1024 : 1.5 * 1024 * 1024;
    if (file.size > maxSize) {
      showSideAlert(
        fieldName === "cv" ? "CV must be smaller than 3MB." : "File must be smaller than 1.5MB.",
        "warning"
      );
      e.target.value = "";
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [fieldName]: file,
    }));

    setFileNames((prev) => ({
      ...prev,
      [fieldName]: file.name,
    }));

    if (fieldName === "ppimg") {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }

    showSideAlert(`${file.name} uploaded successfully`, "success");
  };

  // ============================================================================
  // Step 1 Validation
  // ============================================================================
  const validateStep1 = (): boolean => {
    if (!formData.NAME || formData.NAME.trim() === "") {
      showSideAlert("Candidate Name is required", "warning");
      return false;
    }

    if (!formData.MOB_NO || !/^[6-9][0-9]{9}$/.test(formData.MOB_NO.trim())) {
      showSideAlert("Please enter a valid 10-digit mobile number starting with 6-9", "warning");
      return false;
    }

    if (!formData.EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.EMAIL.trim())) {
      showSideAlert("Please enter a valid email address", "warning");
      return false;
    }

    if (!formData.GENDER) {
      showSideAlert("Please select gender", "warning");
      return false;
    }

    if (!formData.DOB) {
      showSideAlert("Please enter date of birth", "warning");
      return false;
    } else {
      const birthDate = new Date(formData.DOB);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      if (age < 18) {
        showSideAlert("Candidate must be at least 18 years old", "warning");
        return false;
      }
    }

    if (formData.AADHAR_NO && formData.AADHAR_NO.trim().length !== 12) {
      showSideAlert("Aadhar Number must be exactly 12 digits", "warning");
      return false;
    }

    if (!formData.CITY || formData.CITY.trim() === "") {
      showSideAlert("City is required", "warning");
      return false;
    }

    if (!formData.STATE) {
      showSideAlert("State is required", "warning");
      return false;
    }

    if (!formData.DESIGNATION) {
      showSideAlert("Designation Applying for is required", "warning");
      return false;
    }

    if (!formData.LOC_CODE) {
      showSideAlert("Branch Location is required", "warning");
      return false;
    }

    if (!formData.HIGH_QUAL) {
      showSideAlert("Highest Qualification is required", "warning");
      return false;
    }

    if (formData.Emgy_Mob_No && !/^[6-9][0-9]{9}$/.test(formData.Emgy_Mob_No.trim())) {
      showSideAlert("Invalid emergency mobile number", "warning");
      return false;
    }

    if (formData.Emgy_Mob_No && formData.Emgy_Mob_No === formData.MOB_NO) {
      showSideAlert("Emergency mobile number cannot be the same as primary mobile", "warning");
      return false;
    }

    return true;
  };

  // ============================================================================
  // Save & Submit Candidate Data
  // ============================================================================
  const handleSubmitData = async (isFinal: boolean = true) => {
    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }

    const compCode = getCompCode();
    if (!compCode) {
      showSideAlert("Company code missing. Please reload or check link.", "error");
      return;
    }

    setIsLoading(true);
    try {
      const form = new FormData();
      if (formData.ppimg) form.append("ppimg", formData.ppimg);
      if (formData.cv) form.append("cv", formData.cv);
      if (formData.adhar) form.append("adhar", formData.adhar);
      if (formData.pancard) form.append("pancard", formData.pancard);
      if (formData.salslip) form.append("salslip", formData.salslip);
      if (formData.explett) form.append("explett", formData.explett);

      form.append("NAME", formData.NAME || "");
      form.append("MOB_NO", formData.MOB_NO || "");
      form.append("WHATSAPP_NO", formData.WHATSAPP_NO || formData.MOB_NO || "");
      form.append("EMAIL", formData.EMAIL || "");
      form.append("AADHAR_NO", formData.AADHAR_NO || "");
      form.append("FATHERS_NAME", formData.FATHERS_NAME || "");
      form.append("MOTHERS_NAME", formData.MOTHERS_NAME || "");
      form.append("GENDER", formData.GENDER || "");
      form.append("ADDRESS", formData.ADDRESS || "");
      form.append("CITY", formData.CITY || "");
      form.append("STATE", formData.STATE || "");
      form.append("RELIGION", formData.relCode || "");
      form.append("DOB", formData.DOB || "");
      form.append("DESIGNATION", formData.DESIGNATION || "");
      form.append("SUITABLE_DESIGNATION", formData.SUITABLE_DESIGNATION || "");
      form.append("LOC_CODE", formData.LOC_CODE || "");
      form.append("SOURCE_OF_REG", formData.SOURCE_OF_REG || "");
      form.append("SUB_SOURCE", formData.SUB_SOURCE || "");
      form.append("Emgy_No", formData.Emgy_No || "");
      form.append("Emgy_Mob_No", formData.Emgy_Mob_No || "");
      form.append("SKILLS", formData.SKILLS || "");
      form.append("HIGH_QUAL", formData.HIGH_QUAL || "");
      form.append("PASSING_PER", formData.PASSING_PER || "");
      form.append("EXP_IN_YEAR", formData.EXP_IN_YEAR || "");
      form.append("CURRENT_CTC", formData.CURRENT_CTC || "");
      form.append("EXPECTED_CTC", formData.EXPECTED_CTC || "");
      form.append("DRIVE", formData.DRIVE || "0");
      form.append("CASTE", formData.CASTE || "");
      form.append("CATEGORY", formData.CATEGORY || "");
      form.append("CHANNEL", formData.CHANNEL || "");
      form.append("CLUSTER", formData.CLUSTER || "");

      form.append("EmpLang", JSON.stringify(tableDataLang));
      form.append("EmpEdu", JSON.stringify(tableDataEdu));
      form.append("EmpExperience", JSON.stringify(tableDataExp));
      form.append("EmpNominee", JSON.stringify(tableDataFamily));

      if (formData.tranId) {
        form.append("TRAN_ID", formData.tranId);
        await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/interview/updatenewcandidate`,
          form,
          {
            headers: {
              compcode: compCode,
              name: user?.name || "Candidate",
            },
          }
        );
      } else {
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/interview/insertnewcandidate`,
          form,
          {
            headers: {
              compcode: compCode,
              name: user?.name || "Candidate",
            },
          }
        );
        if (res.data?.TRAN_ID) {
          setFormData((prev) => ({ ...prev, tranId: res.data.TRAN_ID }));
        }
      }

      if (isFinal) {
        if (typeof window !== "undefined") {
          try {
            const tranId = formData.tranId || (formData as any).TRAN_ID || "";
            const newRecord = {
              TRAN_ID: tranId,
              NAME: formData.NAME || "",
              MOB_NO: formData.MOB_NO || "",
              EMAIL: formData.EMAIL || "",
              DESIGNATION: formData.DESIGNATION || "",
              LOC_CODE: formData.LOC_CODE || "",
              locationname: branchOptions.find((b: any) => String(b.value ?? b.loc_code ?? b.LOC_CODE) === String(formData.LOC_CODE))?.label || "",
              FORM_STATUS: "Form filled",
              IS_FILLED: 1,
              STATUS: "Form filled",
            };
            const saved = localStorage.getItem("filled_candidate_records");
            const arr = saved ? JSON.parse(saved) : [];
            const filtered = arr.filter((x: any) => String(x.TRAN_ID) !== String(tranId));
            filtered.unshift(newRecord);
            localStorage.setItem("filled_candidate_records", JSON.stringify(filtered));
          } catch { }
        }

        Swal.fire({
          icon: "success",
          title: "Registration Complete!",
          text: "Your registration details have been submitted to the resume bank successfully.",
          confirmButtonColor: "#4F46E5",
        }).then(() => {
          router.push("/payroll/recruitment-process/create-job-opening");
        });
      } else {
        showSideAlert("Draft progress saved successfully", "success");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to save registration data";
      Swal.fire({
        icon: "error",
        title: "Submission Error",
        text: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Stepper Handlers
  const handleNextStep = async () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
      handleSubmitData(false);
    }
    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      handleSubmitData(true);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };




  // Experience Table Handlers
  const handleAddExperience = () => {
    setTableDataExp((prev) => [
      ...prev,
      {
        Emp_Company: "",
        Emp_Designation: "",
        Emp_Responsibility: "",
        Emp_From_Date: "",
        Emp_To_Date: "",
        Emp_Settlement_Done: "",
        Emp_Drawn_Salary: "",
        Emp_Leaving_Reason: "",
        UTD: 1,
      },
    ]);
  };

  const handleExpChange = (index: number, key: string, value: string) => {
    setTableDataExp((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  const handleDeleteExp = (index: number) => {
    setTableDataExp((prev) => prev.filter((_, idx) => idx !== index));
  };



  const stepLabels = [
    { id: 1, title: "Basic information", sub: "Identity, contact, documents" },
    { id: 2, title: "Language & education", sub: "Proficiency and degrees" },
    { id: 3, title: "Experience & family", sub: "Employers and dependants" },
    { id: 4, title: "Preview & confirm", sub: "Review before submitting" },
  ];

  const currentStepTitle = stepLabels.find((s) => s.id === currentStep)?.title || "";

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#070b14] text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1780px] mx-auto transition-colors">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. TOP HEADER */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Candidate registration
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium mt-1">
            New candidate — fill the four steps, then submit to the resume bank.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="lg"
            type="button"
            onClick={() => window.print()}
            className="h-12 px-5 font-bold cursor-pointer"
          >
            <Printer className="h-5 w-5 mr-2 text-slate-600 dark:text-slate-400" />
            Print
          </Button>

          <Button
            variant="primary"
            size="lg"
            type="button"
            onClick={() => handleSubmitData(false)}
            className="h-12 px-6 font-bold cursor-pointer shadow-md shadow-indigo-600/20"
          >
            <Bookmark className="h-5 w-5 mr-2" />
            Save draft
          </Button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. MAIN 2-COLUMN LAYOUT */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── LEFT SIDEBAR (STEPPER & DOCUMENTS CHECKLIST) ─────────────────────── */}
        <div className="lg:col-span-3 space-y-6 lg:sticky lg:top-6">
          {/* Stepper Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
            {/* Completion Badge */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="h-14 w-14 rounded-full border-2 border-indigo-600 flex items-center justify-center font-bold text-base text-indigo-600 dark:text-indigo-400 shrink-0 bg-indigo-50 dark:bg-indigo-950/40">
                {completionStats.percent}%
              </div>
              <div>
                <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Form completion
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                  {completionStats.remaining > 0
                    ? `${completionStats.remaining} required fields left`
                    : "All required fields completed!"}
                </p>
              </div>
            </div>

            {/* Steps List */}
            <nav className="space-y-2.5">
              {stepLabels.map((step) => {
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      if (step.id < currentStep || validateStep1()) {
                        setCurrentStep(step.id);
                      }
                    }}
                    className={`w-full flex items-start gap-3.5 p-3.5 rounded-xl transition text-left cursor-pointer ${isActive
                      ? "bg-indigo-50/90 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 shadow-xs"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent"
                      }`}
                  >
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition ${isActive
                        ? "bg-indigo-600 text-white shadow-xs"
                        : isCompleted
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        }`}
                    >
                      {isCompleted ? <Check className="h-4.5 w-4.5 stroke-[2.5]" /> : step.id}
                    </div>

                    <div className="min-w-0">
                      <div
                        className={`text-base ${isActive
                          ? "text-indigo-950 dark:text-indigo-200 font-semibold"
                          : "text-slate-800 dark:text-slate-200 font-medium"
                          }`}
                      >
                        {step.title}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 font-normal truncate mt-0.5">
                        {step.sub}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Documents Checklist Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Documents
            </h4>

            <ul className="space-y-3 text-base font-normal text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-3">
                <span className={`text-base font-semibold ${formData.ppimg ? "text-emerald-600" : "text-slate-400"}`}>
                  {formData.ppimg ? "✓" : "—"}
                </span>
                <span className={formData.ppimg ? "text-slate-900 dark:text-slate-100 font-medium" : ""}>
                  Profile image
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className={`text-base font-semibold ${formData.adhar ? "text-emerald-600" : "text-slate-400"}`}>
                  {formData.adhar ? "✓" : "—"}
                </span>
                <span className={formData.adhar ? "text-slate-900 dark:text-slate-100 font-medium" : ""}>
                  Aadhar card
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className={`text-base font-semibold ${formData.pancard ? "text-emerald-600" : "text-slate-400"}`}>
                  {formData.pancard ? "✓" : "—"}
                </span>
                <span className={formData.pancard ? "text-slate-900 dark:text-slate-100 font-medium" : ""}>
                  PAN card
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className={`text-base font-semibold ${formData.salslip ? "text-emerald-600" : "text-slate-400"}`}>
                  {formData.salslip ? "✓" : "—"}
                </span>
                <span className={formData.salslip ? "text-slate-900 dark:text-slate-100 font-medium" : ""}>
                  Salary slip
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className={`text-base font-semibold ${formData.cv ? "text-emerald-600" : "text-slate-400"}`}>
                  {formData.cv ? "✓" : "—"}
                </span>
                <span className={formData.cv ? "text-slate-900 dark:text-slate-100 font-medium" : ""}>
                  Updated CV
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className={`text-base font-semibold ${formData.explett ? "text-emerald-600" : "text-slate-400"}`}>
                  {formData.explett ? "✓" : "—"}
                </span>
                <span className={formData.explett ? "text-slate-900 dark:text-slate-100 font-medium" : ""}>
                  Experience letter
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* ── RIGHT MAIN STEP CONTENT ─────────────────────────────────────────── */}
        <div className="lg:col-span-9 space-y-5">
          {/* ===================================================================== */}
          {/* STEP 1: BASIC INFORMATION                                              */}
          {/* ===================================================================== */}
          {currentStep === 1 && (
            <div className="space-y-4.5 animate-in fade-in-50 duration-200">
              {/* Card 1: Identity */}
              <div className="rounded-xl border border-slate-200 bg-white p-4.5 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm sm:text-[14.5px] font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                      Identity
                    </h3>
                  </div>
                  <span className="text-[11.5px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                    {identityCount} / 8
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-5">
                  {/* Candidate Name */}
                  <div>
                    <Einput
                      title="Candidate Name"
                      type="text"
                      name="NAME"
                      placeholder="Full name as per Aadhar"
                      value={formData.NAME}
                      handleInputChange={handleInputChange}
                      redlabel="*"
                    />
                  </div>

                  {/* Father's Name */}
                  <div>
                    <Einput
                      title="Father's Name"
                      type="text"
                      name="FATHERS_NAME"
                      placeholder="Father's full name"
                      value={formData.FATHERS_NAME}
                      handleInputChange={handleInputChange}
                    />
                  </div>

                  {/* Mother's Name */}
                  <div>
                    <Einput
                      title="Mother's Name"
                      type="text"
                      name="MOTHERS_NAME"
                      placeholder="Mother's full name"
                      value={formData.MOTHERS_NAME}
                      handleInputChange={handleInputChange}
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Gender <span className="text-rose-500">*</span>
                    </label>
                    <SelectSearch
                      selectedValue={formData.GENDER}
                      options={GenderOptions}
                      name="GENDER"
                      handleInputChange={(name: any, val: any) => handleInputChange("GENDER", val)}
                      placeholder="Select"
                      className="!h-10 !text-[13px]"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <Einput
                      title="Date of Birth"
                      type="date"
                      name="DOB"
                      value={formData.DOB}
                      handleInputChange={handleInputChange}
                      redlabel="*"
                    />
                  </div>

                  {/* Aadhar Number */}
                  <div>
                    <Einput
                      title="Aadhar Number"
                      type="tel"
                      name="AADHAR_NO"
                      maxLength={12}
                      placeholder="12 digits"
                      value={formData.AADHAR_NO}
                      handleInputChange={(name, val) => {
                        const clean = String(val ?? "").replace(/\D/g, "").slice(0, 12);
                        handleInputChange(name, clean);
                      }}
                      redlabel="*"
                    />
                  </div>

                  {/* Religion */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Religion
                    </label>
                    <SelectSearch
                      selectedValue={formData.relCode}
                      options={ReligionOptions}
                      name="relCode"
                      handleInputChange={(name: any, val: any) => handleInputChange("relCode", val)}
                      placeholder="Select"
                      className="!h-10 !text-[13px]"
                    />
                  </div>

                  {/* Caste */}
                  <div>
                    <Einput
                      title="Caste"
                      type="text"
                      name="CASTE"
                      placeholder="Caste / Sub-caste"
                      value={formData.CASTE}
                      handleInputChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Contact */}
              <div className="rounded-xl border border-slate-200 bg-white p-4.5 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Phone className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm sm:text-[14.5px] font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                      Contact
                    </h3>
                  </div>
                  <span className="text-[11.5px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                    {contactCount} / 5
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-5">
                  {/* Mobile Number */}
                  <div>
                    <Einput
                      title="Mobile Number"
                      type="tel"
                      name="MOB_NO"
                      maxLength={10}
                      placeholder="10-digit mobile"
                      value={formData.MOB_NO}
                      handleInputChange={(name, val) => {
                        const clean = String(val ?? "").replace(/\D/g, "").slice(0, 10);
                        handleInputChange("MOB_NO", clean);
                        if (!formData.WHATSAPP_NO || formData.WHATSAPP_NO === formData.MOB_NO) {
                          handleInputChange("WHATSAPP_NO", clean);
                        }
                      }}
                      redlabel="*"
                    />
                  </div>

                  {/* WhatsApp Number */}
                  <div>
                    <Einput
                      title="WhatsApp Number"
                      type="tel"
                      name="WHATSAPP_NO"
                      maxLength={10}
                      placeholder="Same as mobile if blank"
                      value={formData.WHATSAPP_NO}
                      handleInputChange={(name, val) => {
                        const clean = String(val ?? "").replace(/\D/g, "").slice(0, 10);
                        handleInputChange("WHATSAPP_NO", clean);
                      }}
                      ShortName={true}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <Einput
                      title="Email"
                      type="email"
                      name="EMAIL"
                      placeholder="name@example.com"
                      value={formData.EMAIL}
                      handleInputChange={handleInputChange}
                      redlabel="*"
                    />
                  </div>

                  {/* Emergency Contact Relation */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Emergency Contact
                    </label>
                    <SelectSearch
                      selectedValue={formData.Emgy_No}
                      options={EmergencyRelationOptions}
                      name="Emgy_No"
                      handleInputChange={(name: any, val: any) => handleInputChange("Emgy_No", val)}
                      placeholder="Select"
                      className="!h-10 !text-[13px]"
                    />
                  </div>

                  {/* Emergency Number */}
                  <div>
                    <Einput
                      title="Emergency Number"
                      type="tel"
                      name="Emgy_Mob_No"
                      maxLength={10}
                      placeholder="10-digit emergency"
                      value={formData.Emgy_Mob_No}
                      handleInputChange={(name, val) => {
                        const clean = String(val ?? "").replace(/\D/g, "").slice(0, 10);
                        handleInputChange("Emgy_Mob_No", clean);
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Location */}
              <div className="rounded-xl border border-slate-200 bg-white p-4.5 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm sm:text-[14.5px] font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                      Location
                    </h3>
                  </div>
                  <span className="text-[11.5px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                    {locationCount} / 6
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-5">
                  {/* Address - Span 2 */}
                  <div className="sm:col-span-2 md:col-span-2 lg:col-span-3 xl:col-span-2">
                    <Einput
                      title="Address"
                      type="text"
                      name="ADDRESS"
                      placeholder="House, street, area"
                      value={formData.ADDRESS}
                      handleInputChange={handleInputChange}
                    />
                  </div>

                  {/* City */}
                  <div>
                    <Einput
                      title="City"
                      type="text"
                      name="CITY"
                      placeholder="City name"
                      value={formData.CITY}
                      handleInputChange={handleInputChange}
                      redlabel="*"
                    />
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      State <span className="text-rose-500">*</span>
                    </label>
                    <SelectSearch
                      selectedValue={formData.STATE}
                      options={stateOptions}
                      name="STATE"
                      handleInputChange={(name: any, val: any) => handleInputChange("STATE", val)}
                      placeholder="Select"
                      className="!h-10 !text-[13px]"
                    />
                  </div>

                  {/* Cluster */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Cluster
                    </label>
                    <SelectSearch
                      selectedValue={formData.CLUSTER}
                      options={clusterOptions}
                      name="CLUSTER"
                      handleInputChange={(name: any, val: any) => handleInputChange("CLUSTER", val)}
                      placeholder="Select"
                      className="!h-10 !text-[13px]"
                    />
                  </div>

                  {/* Channel */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Channel
                    </label>
                    <SelectSearch
                      selectedValue={formData.CHANNEL}
                      options={channelOptions}
                      name="CHANNEL"
                      handleInputChange={(name: any, val: any) => handleInputChange("CHANNEL", val)}
                      placeholder="Select"
                      className="!h-10 !text-[13px]"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Category
                    </label>
                    <SelectSearch
                      selectedValue={formData.CATEGORY}
                      options={CategoryOptions}
                      name="CATEGORY"
                      handleInputChange={(name: any, val: any) => handleInputChange("CATEGORY", val)}
                      placeholder="Select"
                      className="!h-10 !text-[13px]"
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: Applying for */}
              <div className="rounded-xl border border-slate-200 bg-white p-4.5 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm sm:text-[14.5px] font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                      Applying for
                    </h3>
                  </div>
                  <span className="text-[11.5px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                    {applyingCount} / 5
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-5">
                  {/* Designation Applying for */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Designation <span className="text-rose-500">*</span>
                    </label>
                    <SelectSearch
                      selectedValue={formData.DESIGNATION}
                      options={desgOptions}
                      name="DESIGNATION"
                      handleInputChange={(name: any, val: any) => handleInputChange("DESIGNATION", val)}
                      placeholder="Designation applying for"
                      className="!h-10 !text-[13px]"
                    />
                  </div>

                  {/* Branch Location */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Branch <span className="text-rose-500">*</span>
                    </label>
                    <SelectSearch
                      selectedValue={formData.LOC_CODE}
                      options={branchOptions}
                      name="LOC_CODE"
                      handleInputChange={(name: any, val: any) => handleInputChange("LOC_CODE", val)}
                      placeholder="Branch applying for"
                      className="!h-10 !text-[13px]"
                    />
                  </div>

                  {/* Key Skills - Span 2 */}
                  <div className="sm:col-span-2 md:col-span-2 lg:col-span-3 xl:col-span-2">
                    <Einput
                      title="Key Skills"
                      type="text"
                      name="SKILLS"
                      placeholder="Comma separated"
                      value={formData.SKILLS}
                      handleInputChange={handleInputChange}
                    />
                  </div>

                  {/* Source */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Source
                    </label>
                    <SelectSearch
                      selectedValue={formData.SOURCE_OF_REG}
                      options={sourceOptions}
                      name="SOURCE_OF_REG"
                      handleInputChange={(name: any, val: any) => handleInputChange("SOURCE_OF_REG", val)}
                      placeholder="Select"
                      className="!h-10 !text-[13px]"
                    />
                  </div>

                  {/* Sub Source */}
                  <div>
                    <Einput
                      title="Sub Source"
                      type="text"
                      name="SUB_SOURCE"
                      placeholder="Referral / Portal name"
                      value={formData.SUB_SOURCE}
                      handleInputChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              {/* Card 5: Qualification & CTC */}
              <div className="rounded-xl border border-slate-200 bg-white p-4.5 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm sm:text-[14.5px] font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                      Qualification & CTC
                    </h3>
                  </div>
                  <span className="text-[11.5px] font-medium text-slate-400 dark:text-slate-500 tabular-nums">
                    {qualCtcCount} / 5
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-x-4 gap-y-5">
                  {/* Highest Qualification */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                      Highest Qualification <span className="text-rose-500">*</span>
                    </label>
                    <SelectSearch
                      selectedValue={formData.HIGH_QUAL}
                      options={HighestQualification}
                      name="HIGH_QUAL"
                      handleInputChange={(name: any, val: any) => handleInputChange("HIGH_QUAL", val)}
                      placeholder="Select"
                      className="!h-10 !text-[13px]"
                    />
                  </div>

                  {/* Qualification % */}
                  <div>
                    <Einput
                      title="Qualification %"
                      type="number"
                      name="PASSING_PER"
                      placeholder="e.g. 72"
                      value={formData.PASSING_PER}
                      handleInputChange={handleInputChange}
                      ShortName={true}
                    />
                  </div>

                  {/* Experience (Years) */}
                  <div>
                    <Einput
                      title="Experience (Years)"
                      type="number"
                      name="EXP_IN_YEAR"
                      placeholder="0 for fresher"
                      value={formData.EXP_IN_YEAR}
                      handleInputChange={handleInputChange}
                      ShortName={true}
                      redlabel="*"
                    />
                  </div>

                  {/* Current CTC */}
                  <div>
                    <Einput
                      title="Current CTC"
                      type="number"
                      name="CURRENT_CTC"
                      placeholder="Annual, in ₹"
                      value={formData.CURRENT_CTC}
                      handleInputChange={handleInputChange}
                      ShortName={true}
                    />
                  </div>

                  {/* Expected CTC */}
                  <div>
                    <Einput
                      title="Expected CTC"
                      type="number"
                      name="EXPECTED_CTC"
                      placeholder="Annual, in ₹"
                      value={formData.EXPECTED_CTC}
                      handleInputChange={handleInputChange}
                      ShortName={true}
                    />
                  </div>
                </div>
              </div>

              {/* Card 6: Side-by-Side Driving Skills & Documents Upload */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 items-start">
                {/* Driving Skills Subcard */}
                <div className="xl:col-span-4 rounded-xl border border-slate-200 bg-white p-4.5 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3.5">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Car className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm sm:text-[14.5px] font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
                      Driving skills
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {[
                      { val: "2", label: "2-Wheel Drive" },
                      { val: "4", label: "4-Wheel Drive" },
                      { val: "1", label: "Both" },
                      { val: "0", label: "None" },
                    ].map((item) => {
                      const isChecked = formData.DRIVE === item.val;
                      return (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => handleInputChange("DRIVE", item.val)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left cursor-pointer transition text-[12.5px] ${isChecked
                            ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 dark:bg-indigo-950/50 dark:text-indigo-200 dark:border-indigo-700 font-semibold"
                            : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-medium"
                            }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition shrink-0 ${isChecked
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-slate-300 dark:border-slate-600 bg-transparent"
                              }`}
                          >
                            {isChecked ? <Check className="h-2.5 w-2.5 stroke-[3]" /> : <Minus className="h-2.5 w-2.5 text-transparent" />}
                          </span>
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Documents Upload Subcard */}
                <div className="xl:col-span-8">
                  <CertificatesUpload
                    headerTitle="Documents upload"
                    headerIcon={<Paperclip className="h-4 w-4" />}
                    items={docUploadItems}
                    value={docUploadValues}
                    onChange={handleDocUploadChange}
                    compact={true}
                    gridClassName="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* STEP 2: LANGUAGE & EDUCATION                                           */}
          {/* ===================================================================== */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* Card 1: Language Proficiency */}
              <LanguageTable
                tableData={tableDataLang}
                setTableData={setTableDataLang}
              />

              {/* Card 2: Education Details */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                      Education details
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-medium">
                      Leave a row blank if not applicable
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <DynamicTable
                    columns={eduColumns}
                    columnsShow={eduColumnsShow}
                    tableData={tableDataEdu}
                    setTableData={setTableDataEdu}
                    constraints={eduConstraints}
                    AddBtn={true}
                    AddBtnText="Add qualification"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* STEP 3: EXPERIENCE & FAMILY                                            */}
          {/* ===================================================================== */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* Card 1: Work experience */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                      Work experience
                    </h3>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddExperience}
                    className="font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50/60 dark:text-indigo-400 dark:border-indigo-900 cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add employer
                  </Button>
                </div>

                {tableDataExp.length === 0 ? (
                  <div className="py-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <Briefcase className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-base font-bold text-slate-600 dark:text-slate-400">
                      No previous experience added
                    </p>
                    <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-1">
                      Click &quot;+ Add employer&quot; to add your previous employment history
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {tableDataExp.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl p-5 sm:p-6 border border-slate-200 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-900/50 flex flex-col gap-5 relative shadow-2xs"
                      >
                        {/* Row 1: Company, Designation, Responsibilities, Trash */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                          <div className="md:col-span-4 lg:col-span-3">
                            <Einput
                              title="Company"
                              type="text"
                              name="Emp_Company"
                              placeholder="Employer name"
                              value={item.Emp_Company}
                              handleInputChange={(name, val) => handleExpChange(idx, name, val)}
                            />
                          </div>

                          <div className="md:col-span-4 lg:col-span-3">
                            <Einput
                              title="Designation"
                              type="text"
                              name="Emp_Designation"
                              placeholder="Role held"
                              value={item.Emp_Designation}
                              handleInputChange={(name, val) => handleExpChange(idx, name, val)}
                            />
                          </div>

                          <div className="md:col-span-4 lg:col-span-5">
                            <Einput
                              title="Responsibilities"
                              type="text"
                              name="Emp_Responsibility"
                              placeholder="Key duties"
                              value={item.Emp_Responsibility}
                              handleInputChange={(name, val) => handleExpChange(idx, name, val)}
                            />
                          </div>

                          <div className="md:col-span-12 lg:col-span-1 flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteExp(idx)}
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                              title="Delete employer"
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>

                        {/* Row 2: From, To, Settlement Done, Salary */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <Einput
                              title="From"
                              type="date"
                              name="Emp_From_Date"
                              value={item.Emp_From_Date}
                              handleInputChange={(name, val) => handleExpChange(idx, name, val)}
                            />
                          </div>

                          <div>
                            <Einput
                              title="To"
                              type="date"
                              name="Emp_To_Date"
                              value={item.Emp_To_Date}
                              handleInputChange={(name, val) => handleExpChange(idx, name, val)}
                            />
                          </div>

                          <div>
                            <Einput
                              title="Settlement Done"
                              type="text"
                              name="Emp_Settlement_Done"
                              placeholder="Yes / No"
                              value={item.Emp_Settlement_Done}
                              handleInputChange={(name, val) => handleExpChange(idx, name, val)}
                            />
                          </div>

                          <div>
                            <Einput
                              title="Salary"
                              type="number"
                              name="Emp_Drawn_Salary"
                              placeholder="Monthly, in ₹"
                              value={item.Emp_Drawn_Salary}
                              handleInputChange={(name, val) => handleExpChange(idx, name, val)}
                            />
                          </div>
                        </div>

                        {/* Row 3: Reason of Leaving */}
                        <div>
                          <Einput
                            title="Reason of Leaving"
                            type="text"
                            name="Emp_Leaving_Reason"
                            placeholder="Reason for leaving this job"
                            value={item.Emp_Leaving_Reason}
                            handleInputChange={(name, val) => handleExpChange(idx, name, val)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card 2: Family details */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                      Family details
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-medium">
                      Fill only the relations that apply
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <DynamicTable
                    columns={familyColumns}
                    columnsShow={familyColumnsShow}
                    tableData={tableDataFamily}
                    setTableData={setTableDataFamily}
                    constraints={familyConstraints}
                    AddBtn={true}
                    AddBtnText="Add family member"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* STEP 4: PREVIEW & CONFIRM                                              */}
          {/* ===================================================================== */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* Warning alert if required fields are missing */}
              {missingRequiredFields.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/60 dark:bg-amber-950/20 flex items-start gap-4 shadow-2xs">
                  <div className="h-7 w-7 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle className="h-4.5 w-4.5" />
                  </div>
                  <div className="space-y-2.5 flex-1">
                    <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200">
                      <span className="font-bold">{missingRequiredFields.length} required fields still empty</span> — the form can be saved as a draft but not submitted.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {missingRequiredFields.map((field, idx) => (
                        <span
                          key={idx}
                          className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Main Candidate Summary Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-7">
                {/* Profile Header Row */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl font-black shadow-xs shrink-0 overflow-hidden border border-indigo-100 dark:border-indigo-900">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Candidate" className="h-full w-full object-cover" />
                      ) : formData.NAME?.trim() ? (
                        formData.NAME.trim().charAt(0).toUpperCase()
                      ) : (
                        "?"
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                        {formData.NAME || "Unnamed candidate"}
                      </h2>
                      <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        {formData.DESIGNATION || "Designation not set"} ·{" "}
                        {branchOptions.find((b) => String(b.value) === String(formData.LOC_CODE))?.label || "Branch not set"}
                      </p>
                    </div>
                  </div>

                  {/* Top Stats Metric */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6 md:gap-8 justify-start md:justify-end w-full md:w-auto">
                    <div className="text-left sm:text-right">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Experience
                      </span>
                      <span className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
                        {formData.EXP_IN_YEAR ? `${formData.EXP_IN_YEAR} Yrs` : "—"}
                      </span>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Current CTC
                      </span>
                      <span className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
                        {formData.CURRENT_CTC ? `₹${formData.CURRENT_CTC}` : "—"}
                      </span>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Expected
                      </span>
                      <span className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-200">
                        {formData.EXPECTED_CTC ? `₹${formData.EXPECTED_CTC}` : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                  {/* Column 1: Identity */}
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">
                        Identity
                      </span>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => setCurrentStep(1)}
                        className="text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer p-0 h-auto"
                      >
                        Edit
                      </Button>
                    </div>
                    <div className="space-y-2.5 text-sm sm:text-base">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Father&apos;s name</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                          {formData.FATHERS_NAME || "Not provided"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Mother&apos;s name</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                          {formData.MOTHERS_NAME || "Not provided"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Gender</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                          {formData.GENDER || "Not provided"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Date of birth</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                          {formData.DOB || "Not provided"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Aadhar</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right font-mono">
                          {formData.AADHAR_NO || "Not provided"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Contact */}
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">
                        Contact
                      </span>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => setCurrentStep(1)}
                        className="text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer p-0 h-auto"
                      >
                        Edit
                      </Button>
                    </div>
                    <div className="space-y-2.5 text-sm sm:text-base">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Mobile</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right font-mono">
                          {formData.MOB_NO || "Not provided"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">WhatsApp</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right font-mono">
                          {formData.WHATSAPP_NO || "Not provided"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Email</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right truncate max-w-[180px]" title={formData.EMAIL}>
                          {formData.EMAIL || "Not provided"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">City</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                          {formData.CITY || "Not provided"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">State</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                          {stateOptions.find((s) => String(s.value) === String(formData.STATE))?.label || formData.STATE || "Not provided"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Qualification */}
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">
                        Qualification
                      </span>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => setCurrentStep(2)}
                        className="text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer p-0 h-auto"
                      >
                        Edit
                      </Button>
                    </div>
                    <div className="space-y-2.5 text-sm sm:text-base">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Highest</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                          {formData.HIGH_QUAL || "Not provided"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Percentage</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                          {formData.PASSING_PER ? `${formData.PASSING_PER}%` : "Not provided"}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Languages</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                          {filledLangCount} filled
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Degrees filled</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                          {filledDegreeCount} of {tableDataEdu.length}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Driving</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                          {getDriveLabel(formData.DRIVE)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Experience & Family */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    <div className="space-y-3.5 col-span-1">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">
                          Experience & family
                        </span>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          onClick={() => setCurrentStep(3)}
                          className="text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer p-0 h-auto"
                        >
                          Edit
                        </Button>
                      </div>
                      <div className="space-y-2.5 text-sm sm:text-base">
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500">Employers</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                            {tableDataExp.filter((e) => e.Emp_Company?.trim()).length} added
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500">Family members</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                            {tableDataFamily.filter((f) => f.Nominee_Name?.trim()).length} added
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500">Source</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                            {sourceOptions.find((s) => String(s.value) === String(formData.SOURCE_OF_REG))?.label || formData.SOURCE_OF_REG || "Not provided"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500">Key skills</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-right truncate max-w-[180px]" title={formData.SKILLS}>
                            {formData.SKILLS || "Not provided"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500">Documents</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">
                            {documentCount} of 6 attached
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────────────────────────────── */}
          {/* 3. BOTTOM NAVIGATION BAR */}
          {/* ────────────────────────────────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="text-sm sm:text-base font-bold text-slate-500 dark:text-slate-400">
              Step {currentStep} of 4 · <span className="text-slate-800 dark:text-slate-200">{currentStepTitle}</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handlePrevStep}
                disabled={currentStep === 1}
                className="h-12 px-7 font-bold cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5 mr-1.5" />
                Previous
              </Button>

              <Button
                type="button"
                variant={currentStep === 4 ? "secondary" : "primary"}
                size="lg"
                onClick={handleNextStep}
                className={`h-12 px-8 font-bold tracking-wide cursor-pointer transition-all ${currentStep === 4
                  ? "bg-[#059669] hover:bg-[#047857] text-white shadow-emerald-600/20"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
                  }`}
              >
                {currentStep === 4 && <CheckCircle2 className="h-5 w-5 mr-2" />}
                <span>{currentStep === 4 ? "Submit to resume bank" : "Save & next"}</span>
                {currentStep !== 4 && <ChevronRight className="h-5 w-5 ml-1.5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Global Loading Overlay */}
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}

