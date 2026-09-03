"use client";
import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useFormData } from "./Context/FormDataContext";
import EmpTabs from "./EmpTabs";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { v4 as uuidv4 } from "uuid";
import Swal from "sweetalert2";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import HashloaderComponent from "@/components/Templates/hashloader";
// import { useSearchParams, useRouter } from "next/navigation";
import { useSearchParams, useRouter } from "next/navigation";
import DigiLockerVerification from "@/components/Digilocker/DigiLockerVerification";
import TutorialHelpButton from "@/components/atoms/TutorialHelpButton1";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  FileText,
  RotateCw,
  X,
  Plus,
  Moon,
  HelpCircle,
  Search,
  BadgeCheck,
  Check,
} from "lucide-react";
import { useSecureStorage } from "@/app/hooks/comp-key-data";
import EmployeeIdentitySection from "./BasicInfo";
import EmployeeMiniHeader from "./EmployeeMiniHeader";
const intialdata = {
  Comp_Code: null,
  SrNo: null,
  Created_by: "admin",
  EmpMst: {
    EMPCODE: null,
    MSPIN: null,
    TITLE: null,
    EMPFIRSTNAME: null,
    EMPLASTNAME: null,
    PERMANENTADDRESS1: null,
    PERMANENTADDRESS2: null,
    MOBILE_NO: null,
    CONTRACT_NUMBER: null,
    landline_no: null,
    Father_Mob: null,
    Mother_Mob: null,
    Spouse_Mob: null,
    CNATIONALITY: null,
    PCITY: null,
    PPINCODE: null,
    PSTATE: null,
    CURRENTADDRESS1: null,
    CURRENTADDRESS2: null,
    CCITY: null,
    CPINCODE: null,
    CSTATE: null,
    LANDLINENO: null,
    MOBILENO: null,
    EMERGENCYNAME: null,
    EMERGENCYNO: null,
    PANNO: null,
    PASSPORTNO: null,
    PASSEXPIRYDATE: null,
    driving_licence: null,
    columndoc_type: null,
    BLOODGROUP: null,
    DOB: null,
    GENDER: null,
    MARITALSTATUS: null,
    DOM: null,
    SKILLS: null,
    BASICQUALIFICATION: null,
    PROFESSIONALQUALIFICATION: null,
    FATHERNAME: null,
    FATHEROCCUPATION: null,
    FATHERCONTACTNO: null,
    MOTHERNAME: null,
    MOTHERCONTACTNO: null,
    SPOUSENAME: null,
    SPOUSECONTACTNO: null,
    SPOUSEGENDER: null,
    SIBLINGNAME: null,
    SIBLINGCONTACTNO: null,
    PREVIOUSCOMPANYNAME: null,
    PRECOMPCITY: null,
    PRECOMPCONTACTNO: null,
    PREJOININGDATE: null,
    PREENDDATE: null,
    PREDESIGNATION: null,
    EMPREFERENCENAME: null,
    REFERENCEDESIGNATION: null,
    ISMEDICALATTENTION: null,
    ISSERIOUSILLNESS: null,
    ISALLERGIES: null,
    CORPORATEMAILID: null,
    Created_by: null,
    CURRENTJOINDATE: null,
    PAYMENTMODE: null,
    BANKNAME: null,
    BANKACCOUNTNO: null,
    EMPLOYEETYPE: null,
    ORGANISATIONNAME: null,
    SBU_FUNCTION: null,
    DIVISION: null,
    REGION: null,
    UNIT: null,
    SECTION: null,
    LEVEL: null,
    uidno: null,
    pfper: null,
    esiper: null,
    PFNO: null,
    ESINO: null,
    Ledger_Code: null,
    Acnt_Loc: null,
    UAN_No: null,
    EmpType: null,
    IsMSPN: null,
    MSPN_DTL: null,
    ESI_DEDUCTION: null,
    PF_DEDUCTION: null,
    pro_tax: null,
    TCS_Rate: null,
    Rec_Date: null,
    ifsc_code: null,
    pre_Exp: null,
    Interview_Date: null,
    Sal_Region: null,
    LWFNO: null,
    Emp_Ac_Name: null,
    PF_Date: null,
    ESI_Date: null,
    PASSPORT_EXPDATE: null,
    Punch_Type: null,
    PAY_CODE: null,
    Sal_Hold: null,
    InBudget: false,
    Induction_Done: false,
    ExitInterview_Done: false,
    LOCATION: null,
    ROLE: null,
    EMPLOYEEDESIGNATION: null,
    GRADE: null,
    SUPERVISORID: null,
    SUPERVISOR: null,
    ISTIMEVALIDATION: null,
    ISPAYROLL: null,
    PAYCYCLEDURATION: null,
    PROBATIONPERIOD: null,
    PROBATIONLEAVES: null,
    NOTICEPERIOD: null,
    RELCODE: null,
    Exp_Date: null,
    Export_Type: 1,
    Loc_Code: null,
    ServerId: 1,
    DRIVINGLIC_ISSUEDATE: null,
    DRIVINGLIC_ISSUEPALACE: null,
    ACCOUNT_TYPE: null,
    PFTRUST_NO: null,
    EMPHEIGHT: null,
    EMPWEIGHT: null,
    P_NATIONALITY: null,
    UID_NO: null,
    ALTERNET_MAIL: null,
    EMPDEPENDENT: null,
    CHILDREN_DETAIL: null,
    LANGUAGE_DETAIL: null,
    NOMINEE_DETAIL: null,
    EMP_SHIFT: null,
    PF: null,
    PFSALARY_LIMIT: null,
    LWF: null,
    ESI_AMOUNT: null,
    BONUS_AMOUNT: null,
    GRATUITY: null,
    MONTHLY_CTC: null,
    ANNUAL_CTC: null,
    COMP_NAME: null,
    JOINING_TYPE: null,
    BRANCH: null,
    EMP_STATUS: null,
    USR_NAME: null,
    APPLICATION_ID: null,
    APPROVED_AUTHO: null,
    BIOMETRIC_ID: null,
    PROPOSEDRETIRE_DATE: null,
    LASTWOR_DATE: null,
    RELEVE_STATUS: null,
    ADUSER_NAME: null,
    EXT_NO: null,
    AUTOMAILER: null,
    WEEKLYOFF: null,
    RESIGN_APPR: null,
    AX_EMP_CODE: null,
    AX_BAL: null,
    Prob_period: null,
    empcode2: null,
    empcode3: null,
    empcode4: null,
    ADHARNO: null,
    pfnumber: null,
    esinumber: null,
    ein: null,
    mobile_limit: null,
    IEMI: null,
    IsRW: null,
    Reporting_1: null,
    Reporting_2: null,
    Reporting_3: null,
    App_Mispunch: null,
    App_Leave: null,
    App_Attendance: null,
    FCM_TockenId: null,
    Android_ID: null,
    multi_loc: null,
    Token: null,
    Is_Profile_Filled: null,
    mPunch: null,
    mApprove: null,
    mMispunch: null,
    mLeave: null,
    mCalender: null,
    mDeviceLog: null,
    mAttendanceLog: null,
    mLocationLog: null,
    mToDoList: null,
    mSuggestions: null,
    mUpdateIMEI: null,
    mTrackingReport: null,
    mLiveLocation: null,
    mAssetScan: null,
    mGeoFenceSetting: null,
    adhar: null,
    pan: null,
    salary: null,
    other: null,
    BONUS: null,
    MOBILE_RIGHTS: null,
    CDIST: null,
    PDIST: null,
    DD_CLUB: null,
    RESIGNED_STATUS: null,
    SEPRATION_CATE: null,
  },
  EmpEdu: [],
  EmpLang: [],
  EmpItSkill: [],
  EmpExperience: [],
  AssetIssue: [],
  EmpFamily: [],
  ImgSourseArray: [],
  ImgSourseArray1: [],
  imageSrc: null,
  imageSrc1: null,
};

function showSideAlert(message, type) {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: {
      container: "side-alert-container",
      popup: `side-alert-${type}`,
      title: "side-alert-title",
      icon: "side-alert-icon",
    },
  });

  Toast.fire({
    icon: type,
    title: message,
  });
}

// Example usage:

function EmployeeMasterContent() {
  const router = useRouter();
  const user = useCurrentUser();
  const { compdata } = useSecureStorage();
  const { formData, setFormData } = useFormData();
  const [empcode, setEmpcode] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [UpdateDisable, setUpdateDisable] = useState(true);
  const [SaveDisable, setSaveDisable] = useState(false);
  const [adharSrc, setadharSrc] = useState(null);
  const [panSrc, setpanSrc] = useState(null);
  const [salarySrc, setsalarySrc] = useState(null);
  const [otherSrc, setOtherSrc] = useState(null);
  const [cityoption, setCityoption] = useState([]);
  const [divisionoption, setDivisionoption] = useState([]);
  const [empDataRefresh, setEmpDataRefresh] = useState(false);
  const [EMPLOYEEDESIGNATIONoption, setEMPLOYEEDESIGNATIONoption] = useState(
    [],
  );
  const [Empshiftoption, setEmpshiftoption] = useState([]);
  const [locationnoption, setlocationnoption] = useState([]);
  const [SECTIONoption, setSECTIONoption] = useState([]);
  const [STATEoption, setSTATEoption] = useState([]);
  const [MasterData, setMasterData] = useState([]);
  const [SalRegionoption, setSalRegionoption] = useState([]);
  const [isDigiOpen, setIsDigiOpen] = useState(false);
  const [documentData, setDocumentData] = useState<any>(null);
  const [MandatoryFieldsOption, setMandatoryFieldsOption] = useState([]);
  const searchParams = useSearchParams();
  const Empcode = searchParams.get("UTD");

  useEffect(() => {
    const fetchData = async () => {
      const data = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/masters`,
        {},
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/findallemp`,
        {
          branch: user?.branch,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      const convertValuesToString = (array) => {
        return array.map((obj) => {
          return {
            label: obj.label,
            value: String(obj.value),
          };
        });
      };
      const masters = data.data.data;
      console.log(masters, "data");
      console.log(result.data?.data, "result.data?.data");

      setMasterData(masters);
      setCityoption(convertValuesToString(masters.CITY));
      setDivisionoption(convertValuesToString(masters.DIVISION));
      setEMPLOYEEDESIGNATIONoption(
        convertValuesToString(masters.EMPLOYEEDESIGNATION),
      );
      setEmpshiftoption(convertValuesToString(masters.EMP_SHIFT));
      setlocationnoption(convertValuesToString(masters.LOCATION));
      setSECTIONoption(convertValuesToString(masters.SECTION));
      setSTATEoption(convertValuesToString(masters.STATE));
      setSalRegionoption(convertValuesToString(masters.Sal_Region));
      setEmpcode(result.data?.data);
      setChannelOption(convertValuesToString(masters.CHANNEL1));
      setClusterOption(convertValuesToString(masters.CLUSTER1));
    };
    fetchData();
  }, [empDataRefresh]);

  useEffect(() => {
    const fetchDataforMandatory = async () => {
      const data = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/GetMandtoryFieldsName`,
        { misc_code: 1 },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );
      const convertValuesToString = (array) => {
        return array.map((obj) => {
          return {
            label: obj.label,
            value: String(obj.value),
          };
        });
      };
      const masters = data.data.Result;
      console.log(masters, "data");
      setMandatoryFieldsOption(convertValuesToString(masters));
    };
    fetchDataforMandatory();
  }, [empDataRefresh]);

  //start add code

  const mandatorySet = useMemo(() => {
    return new Set(MandatoryFieldsOption.map((f) => f.value?.toString()));
  }, [MandatoryFieldsOption]);

  const isMandatory = (fieldName) => {
    if (!fieldName) return false;
    return mandatorySet.has(fieldName.toString());
  };

  /////////////////////////////////////////////////////
  const recordCompletion = useMemo(() => {
    const keys = Array.from(mandatorySet || []);
    const total = keys.length;

    if (!total) {
      return { percent: 0, filled: 0, total: 0, left: 0 };
    }

    const filled = keys.filter((k) => {
      const v = formData?.EmpMst?.[k];
      return v !== null && v !== undefined && String(v).trim() !== "";
    }).length;

    const left = Math.max(total - filled, 0);
    const percent = Math.min(100, Math.round((filled / total) * 100));

    return { percent, filled, total, left };
  }, [mandatorySet, formData]);
  // end add code

  ///////////////////////////////////////////
  // ===== Left sidebar sections (screenshot style) =====
  const SECTIONS = useMemo(
    () => [
      {
        key: "identity",
        label: "Basic Info",
        desc: "Employee master header fields and photo upload.",
        total: 20,
      },
      {
        key: "info",
        label: "Employee Identity",
        desc: "Joining dates, contact details and statutory identity. Required to save the record.",
        total: 30,
      },
      {
        key: "personal",
        label: "Personal Info",
        desc: "Personal and family details.",
        total: 25,
      },
      {
        key: "salary",
        label: "Salary Details",
        desc: "Payroll and salary configuration.",
        total: 41,
      },
      {
        key: "education",
        label: "Education/Skills",
        desc: "Education, language, skills and experience.",
        total: 30,
      },
      {
        key: "work",
        label: "Work Details",
        desc: "Work profile, department, reporting etc.",
        total: 9,
      },
      {
        key: "mobile",
        label: "Mobile App Access",
        desc: "Mobile app access and rights.",
        total: 24,
      },
      {
        key: "asset",
        label: "Asset Issue",
        desc: "Assets issued to employee.",
        total: 8,
      },
      {
        key: "doc",
        label: "Doc Upload",
        desc: "Upload documents (Aadhar, PAN, etc.)",
        total: 8,
      },
      {
        key: "others",
        label: "Others",
        desc: "Category, previous experience and system audit trail.",
        total: 17,
      },
      {
        key: "separation",
        label: "Separation",
        desc: "Resignation/separation details.",
        total: 19,
      },
    ],
    [],
  );

  // ✅ EmpTabs tab mapping: "info" section will open EmpTabs tab 1 (Basic Info Page1)
  const TAB_MAP: Record<string, number> = {
    info: 1,
    personal: 2,
    salary: 3,
    education: 4,
    separation: 5,
    others: 6,
    mobile: 7,
    asset: 8,
    doc: 9,
    work: 10,
  };

  const REVERSE_TAB_MAP: Record<number, string> = Object.fromEntries(
    Object.entries(TAB_MAP).map(([k, v]) => [v, k]),
  ) as Record<number, string>;

  // active section controlled by sidebar
  const [activeSection, setActiveSection] = useState<string>("identity");

  const activeIndex = useMemo(
    () => SECTIONS.findIndex((s) => s.key === activeSection),
    [SECTIONS, activeSection],
  );

  const activeMeta = useMemo(
    () => SECTIONS.find((s) => s.key === activeSection) || SECTIONS[0],
    [SECTIONS, activeSection],
  );

  const goPrevSection = () => {
    if (activeIndex > 0) setActiveSection(SECTIONS[activeIndex - 1].key);
  };

  const goNextSection = () => {
    if (activeIndex < SECTIONS.length - 1)
      setActiveSection(SECTIONS[activeIndex + 1].key);
  };

  // NOTE: abhi filled counts dummy (0). Later aap chaho to per-section real progress nikal denge.
  const getSectionProgress = (key: string) => {
    const sec = SECTIONS.find((s) => s.key === key);
    return { filled: 0, total: sec?.total ?? 0 };
  };

  const handleEmpChange = async (name: string, value: string | number) => {
    try {
      if (
        value?.toString().trim() == null &&
        !value &&
        value.toString().trim() == "null"
      ) {
        return;
      }
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/${value}`,
        {},
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      console.log(response.data.data, "response.data.data");
      const { ApprMst, EmpMst, docPaths } = response.data.data;
      const { approver1_A, approver2_A, approver3_A } = ApprMst || {};

      // ✅ Start mapping from docPaths[1] onwards
      const docFieldNames = [
        "adhar", // should be docPaths[1]
        "pan", // docPaths[2]
        "salary", // docPaths[3]
        "other1", // docPaths[4]
        "other2", // docPaths[5]
        "other3", // docPaths[6]
        "other4", // docPaths[7]
      ];

      const mappedDocPaths: Record<string, string | null> = {};

      for (let i = 0; i < docFieldNames.length; i++) {
        const url = docPaths?.[i + 1] || null; // Offset by +1
        mappedDocPaths[docFieldNames[i]] = url;
      }

      console.log("Mapped Doc Fields:", mappedDocPaths);
      console.log("EmpMstEmpMst", EmpMst);

      setFormData({
        ...response.data.data,
        EmpMst: {
          ...EmpMst,
          ...mappedDocPaths,
          Reporting_1: approver1_A,
          Reporting_2: approver2_A,
          Reporting_3: approver3_A,
          Cnf_BANKACCOUNTNO: EmpMst?.BANKACCOUNTNO,
          [name]: value,
        },
      });

      setProfileSrc(response.data.data.EmpMst.profile);
      setUpdateDisable(false);
      setSaveDisable(true);
      setIsGenerate(true);
    } catch (error) {
      console.log("Error loading employee data:", error);
    }
  };

  useEffect(() => {
    if (!formData?.EmpMst?.profile && formData?.EmpMst?.photo) {
      setFormData((prev) => ({
        ...prev,
        EmpMst: {
          ...prev.EmpMst,
          photo: prev.EmpMst.photo,
        },
      }));
      console.log(formData?.EmpMst?.photo, "mmm");
    }
  }, []);

  const GenderOptions = [
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
    { value: "Other", label: "Other" },
  ];
  const MrOptions = [
    { value: "mr.", label: "Mr." },
    { value: "mrs.", label: "Mrs." },
    { value: "miss.", label: "Miss." },
    { value: "dr.", label: "Dr." },
    { value: "prof.", label: "Prof." },
  ];
  const Type = [
    { value: "1", label: "Regular" },
    { value: "2", label: "Casual" },
    { value: "3", label: "Apprentice" },
  ];

  const [Collectedata, setCollectedData] = useState({
    CollectData: "",
  });

  // image upload

  const [profileSrc, setProfileSrc] = useState(null);
  const [profileSrc1, setProfileSrc1] = useState(null);

  const [CHANEELOPTION, setChannelOption] = useState([]);
  const [CLUSTEROPTION, setClusterOption] = useState([]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();

      reader.onload = (e) => {
        setProfileSrc(e.target.result);
      };

      reader.readAsDataURL(file);
      setProfileSrc1(file ? file : formData.EmpMst.profile);
      // setFormData((prevData) => ({
      //   ...prevData,
      //   profile: file,
      // }));
    } else {
      setProfileSrc(null);
      setFormData((prevData) => ({
        ...prevData,
        profile: "",
      }));
    }
  };

  const handleInputChange = (name: string, value: string | number) => {
    setFormData((prevData) => {
      let updated = {
        ...prevData,
        EmpMst: {
          ...prevData.EmpMst,
          [name]: value,
        },
      };

      // 🔥 If Employee Type = Apprentice => Force PFNO = "0"
      if (name === "EmpType" && value == "3") {
        updated.EmpMst.PFNO = "0"; // NO
        updated.EmpMst.pfper = "";
        updated.EmpMst.PF_Date = "";
        updated.EmpMst.pfnumber = "";
        updated.EmpMst.esinumber = "";
        updated.EmpMst.ESI_Date = "";
        updated.EmpMst.UAN_No = "";
        updated.EmpMst.LIN_NO = "";
        updated.EmpMst.BONUS = "";
        updated.EmpMst.ESINO = "0"; // Clear PF%
        updated.EmpMst.LWFNO = "0"; // Clear PF Date
        updated.EmpMst.pro_tax = "0"; // Clear PF Number
      }

      return updated;
    });
  };

  const handleLocationChange = async (name: string, value: string | number) => {
    handleInputChange(name, value); // update location in formData

    if (name === "LOCATION" && value && !Empcode && !SaveDisable) {
      await Generatecodeforlocation(value);
    }
  };

  const Generatecodeforlocation = async (location) => {
    try {
      if (!location) {
        await Swal.fire({
          icon: "warning",
          title: "Please select a location before generating the code.",
        });
        return;
      }

      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/generateCode`,
        { branch: location },
        { headers: { compcode: user?.Comp_Code } },
      );
      if (result.status === 201) {
        await Swal.fire({
          icon: "error",
          title: result.data.message,
        });
        return;
      }

      const code = result?.data?.code;

      setFormData((prev) => ({
        ...prev,
        EmpMst: {
          ...prev.EmpMst,
          EMPCODE: code,
        },
      }));

      setIsGenerate(true);
    } catch (error) {
      console.log("Error generating code:", error);

      await Swal.fire({
        icon: "error",
        title: error?.response?.data?.message || "Failed to generate code",
      });
    }
  };

  const handleUpdate = async () => {
    if (dobStr && domStr) {
      const dobDate = new Date(dobStr);
      const domDate = new Date(domStr);

      if (isNaN(dobDate.getTime()) || isNaN(domDate.getTime())) {
        showSideAlert(
          "Invalid date format. Please enter valid dates.",
          "error",
        );
        return;
      }

      // Convert both to YYYY-MM-DD string for safe string comparison
      const dobFormatted = `${dobDate.getFullYear()}-${String(
        dobDate.getMonth() + 1,
      ).padStart(2, "0")}-${String(dobDate.getDate()).padStart(2, "0")}`;
      const domFormatted = `${domDate.getFullYear()}-${String(
        domDate.getMonth() + 1,
      ).padStart(2, "0")}-${String(domDate.getDate()).padStart(2, "0")}`;

      console.log("dobFormatted", dobFormatted);
      console.log("domFormatted", domFormatted);

      if (domFormatted < dobFormatted) {
        showSideAlert(
          "Date of Anniversary cannot be before Date of Birth",
          "warning",
        );
        return;
      }
    }

    if (interviewDateStr && preJoiningDateStr) {
      const interviewDate = new Date(interviewDateStr);
      const preJoiningDate = new Date(preJoiningDateStr);

      if (isNaN(interviewDate) || isNaN(preJoiningDate)) {
        showSideAlert(
          "Invalid date format. Please enter valid dates.",
          "error",
        );
        return;
      }

      if (preJoiningDate < interviewDate) {
        showSideAlert(
          "Joining date cannot be before interview date",
          "warning",
        );
        return;
      }
    }

    if (preJoiningDateStr && resignationDateStr) {
      const preJoiningDate = new Date(preJoiningDateStr);
      const resignationDate = new Date(resignationDateStr);

      if (isNaN(preJoiningDate.getTime()) || isNaN(resignationDate.getTime())) {
        showSideAlert(
          "Invalid date format. Please enter valid dates.",
          "error",
        );
        return;
      }

      if (preJoiningDate >= resignationDate) {
        showSideAlert(
          "Joining date must be after the resignation submission date.",
          "warning",
        );
        return;
      }
    }

    const mobileNo = formData?.EmpMst?.MOBILE_NO;

    if (mobileNo) {
      const mobileTrimmed = mobileNo.toString().trim();

      // Regex: Starts with 6-9 and followed by 9 digits
      const isValidMobile = /^[6-9][0-9]{9}$/.test(mobileTrimmed);

      if (!isValidMobile) {
        showSideAlert(
          "Invalid Mobile number. It should be 10 digits starting with 6, 7, 8, or 9.",
          "warning",
        );
        return;
      }
    }
    const CONTRACTNUMBER = formData?.EmpMst?.CONTRACT_NUMBER;

    if (CONTRACTNUMBER) {
      const mobileTrimmed = CONTRACTNUMBER.toString().trim();

      // Regex: Starts with 6-9 and followed by 9 digits
      const isValidMobile = /^[6-9][0-9]{9}$/.test(mobileTrimmed);

      if (!isValidMobile) {
        showSideAlert(
          "Invalid Contract Mobile number. It should be 10 digits starting with 6, 7, 8, or 9.",
          "warning",
        );
        return;
      }
    }

    const panNo = formData?.EmpMst?.PANNO;

    if (panNo) {
      const panTrimmed = panNo.toString().trim().toUpperCase();

      // PAN format: 5 letters + 4 digits + 1 letter
      const isValidPAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panTrimmed);

      if (!isValidPAN) {
        showSideAlert(
          "Invalid PAN Card No. Format should be ABCDE1234F",
          "warning",
        );
        return;
      }
    }

    const adharNo = formData?.EmpMst?.UID_NO;

    // Allow if null, undefined or empty string
    if (adharNo) {
      const adharTrimmed = adharNo.toString().trim();

      // Check if it’s exactly 12 digits
      const isValidAadhar = /^\d{12}$/.test(adharTrimmed);

      if (!isValidAadhar) {
        showSideAlert("Aadhar number must be exactly 12 digits", "warning");
        return;
      }
    }

    const passportNo = formData?.EmpMst?.PASSPORTNO;

    if (passportNo) {
      const passportTrimmed = passportNo.toString().trim().toUpperCase();

      // Indian passport format: 1 letter + 7 digits
      const isValidPassport = /^[A-PR-WY][0-9]{7}$/.test(passportTrimmed);

      if (!isValidPassport) {
        showSideAlert(
          "Invalid Passport number. Format should be A1234567",
          "warning",
        );
        return;
      }
    }

    // const licenseNo = formData?.EmpMst?.DRIVINGLIC_ISSUEPALACE;

    // if (licenseNo) {
    //   const licenseTrimmed = licenseNo.toString().trim().toUpperCase();

    //   // Allow 7 or 8 digits at the end
    //   const isValidLicense =
    //     /^[A-Z]{2}[0-9]{2}[-\s]?[0-9]{4}[-\s]?[0-9]{7}$/.test(licenseTrimmed);

    //   if (!isValidLicense) {
    //     showSideAlert(
    //       "Invalid Driving License number. Format should be like DL-1420110012345 or DL14 20110012345",
    //       "warning"
    //     );
    //     return;
    //   }
    // }

    if (formData.EmpMst.Father_Mob && formData.EmpMst.Father_Mob.length < 10) {
      showSideAlert(
        "Father's Mobile Number must be at least 10 digits.",
        "error",
      );
      return; // stop save
    }

    if (email && !emailRegex.test(email)) {
      showSideAlert("Please enter a valid Email Address.", "error");
      return; // stop the save
    }

    if (
      formData.EmpMst.MOTHERCONTACTNO &&
      formData.EmpMst.MOTHERCONTACTNO.length < 10
    ) {
      showSideAlert(
        "Mother's Mobile Number must be at least 10 digits.",
        "error",
      );
      return; // stop save
    }
    // if (!preJoiningDateStr || preJoiningDateStr.trim() === "") {
    //   showSideAlert("Please Select Joining date", "warning");
    //   return;
    // }

    if (formData.EmpMst.PPINCODE && formData.EmpMst.PPINCODE.length < 6) {
      showSideAlert("Pincode Number must be at least 6 digits.", "error");
      return; // stop save
    }

    const lastWorDate = formData?.EmpMst?.LASTWOR_DATE;
    if (compdata?.EMP_LASTWOR_DATE_VALD == 1) {
      if (lastWorDate && lastWorDate.toString().trim() !== "") {
        const separationMandatoryFields = [
          {
            key: "RESIGNATION_SUBMISSION_DATE",
            label: "Resignation Submission Date",
          },
          { key: "NOTICEPERIOD", label: "Notice Period" },
          { key: "REASON_FOR_RESIGNATION", label: "Reason for Resignation" },
          { key: "SEPARATION_MODE", label: "Separation Mode" },
          { key: "DATE_OF_EXIT_INTERVIEW", label: "Date of Exit Interview" },
          { key: "RESIGNED_STATUS", label: "Resigned Status" },
          { key: "SEPRATION_CATE", label: "Category" },
        ];

        for (const field of separationMandatoryFields) {
          const value = formData?.EmpMst?.[field.key];
          if (
            value === null ||
            value === undefined ||
            value.toString().trim() === ""
          ) {
            showSideAlert(
              `${field.label} is required when Last Working Date is entered.`,
              "warning",
            );
            return;
          }
        }
      }
    }

    // add code
    for (const field of MandatoryFieldsOption) {
      if (!validateMandatoryField(field.value, field.label)) {
        return;
      }
    }

    const pfNo = formData?.EmpMst?.PFNO;
    const pfPer = formData?.EmpMst?.pfper;

    // If PF = Yes (assuming "1" = Yes)
    if (pfNo === "1" || pfNo === 1) {
      if (!pfPer || pfPer === "" || pfPer === null) {
        showSideAlert("Please select PF % when PF is Yes.", "warning");
        return;
      }
    }

    setIsDialogOpen(true);
    setIsLoading(true);
    try {
      const formDataToSend = new FormData();
      console.log(formData, "formDataupdate");
      if (Object.keys(formData).length > 0) {
        formDataToSend.append("formData", JSON.stringify(formData));
      }
      if (profileSrc1) {
        const fileName = uuidv4();
        const fileType = profileSrc1.type.split("/")[1]; // Extract the file extension
        formDataToSend.append(
          "profile",
          profileSrc1,
          `${fileName}.${fileType}`,
        );
      }

      if (formData.EmpMst.adhar instanceof Blob) {
        const fileName = uuidv4();
        formDataToSend.append(
          "adhar",
          formData.EmpMst.adhar,
          `${fileName}.${formData.EmpMst.adhar.type?.split("/")[1]}`,
        );
      }
      if (formData.EmpMst.pan instanceof Blob) {
        const fileName = uuidv4();
        formDataToSend.append(
          `pan`,
          formData.EmpMst.pan,
          `${fileName}.${formData.EmpMst.pan.type?.split("/")[1]}`,
        );
      }
      if (formData.EmpMst.salary instanceof Blob) {
        const fileName = uuidv4();
        formDataToSend.append(
          `salary`,
          formData.EmpMst.salary,
          `${fileName}.${formData.EmpMst.salary.type?.split("/")[1]}`,
        );
      }
      if (formData.EmpMst.other1 instanceof Blob) {
        const fileName = uuidv4();
        formDataToSend.append(
          `other1`,
          formData.EmpMst.other1,
          `${fileName}.${formData.EmpMst.other1.type?.split("/")[1]}`,
        );
      }

      if (formData.EmpMst.other2 instanceof Blob) {
        const fileName = uuidv4();
        formDataToSend.append(
          `other2`,
          formData.EmpMst.other2,
          `${fileName}.${formData.EmpMst.other2.type?.split("/")[1]}`,
        );
      }

      if (formData.EmpMst.other3 instanceof Blob) {
        const fileName = uuidv4();
        formDataToSend.append(
          `other3`,
          formData.EmpMst.other3,
          `${fileName}.${formData.EmpMst.other3.type?.split("/")[1]}`,
        );
      }

      if (formData.EmpMst.other4 instanceof Blob) {
        const fileName = uuidv4();
        formDataToSend.append(
          `other4`,
          formData.EmpMst.other4,
          `${fileName}.${formData.EmpMst.other4.type?.split("/")[1]}`,
        );
      }
      console.log(formData.EmpMst.otherpdf, "formData.EmpMst.otherpdf");
      if (formData.EmpMst.otherpdf instanceof Blob) {
        const fileName = uuidv4();
        formDataToSend.append(
          `otherpdf`,
          formData.EmpMst.otherpdf,
          `${fileName}.${formData.EmpMst.otherpdf.type?.split("/")[1]}`,
        );
      }

      if (formData.EmpMst.Separation1 instanceof Blob) {
        const fileName = uuidv4();
        formDataToSend.append(
          `Separation1`,
          formData.EmpMst.Separation1,
          `${fileName}.${formData.EmpMst.Separation1.type?.split("/")[1]}`,
        );
      }
      if (formData.EmpMst.Separation2 instanceof Blob) {
        const fileName = uuidv4();
        formDataToSend.append(
          `Separation2`,
          formData.EmpMst.Separation2,
          `${fileName}.${formData.EmpMst.Separation2.type?.split("/")[1]}`,
        );
      }
      // const isEmptyObject = (obj: any) =>
      //   obj && typeof obj === "object" && Object.keys(obj).length === 0;

      // Check for any empty object in the arrays
      // const arrayFields = [
      //   "EmpEdu",
      //   "EmpLang",
      //   "EmpItSkill",
      //   "EmpExperience",
      //   "EmpFamily",
      // ];

      // for (const field of arrayFields) {
      //   if (Array.isArray(formData[field])) {
      //     const hasEmpty = formData[field].some((item) => isEmptyObject(item));
      //     if (hasEmpty) {
      //       showSideAlert(
      //         `Cannot update. Empty object found in "${field}" section.`,
      //         "error"
      //       );
      //       return;
      //     }
      //   }
      // }
      console.log(formData, "aaaaaaaaaaaaaaaaaaaaaaa");
      formDataToSend.append(`User`, user?.EMPCODE);
      formDataToSend.append(`LASTMODI_BY`, user?.name);

      console.log(formDataToSend, "update");

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/update/${formData.EmpMst.EMPCODE}`,
        formDataToSend,
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
            user_id: user?.id,
          },
        },
      );

      // Assuming you want to handle the response here
      if (response.status == 200) {
        showSideAlert("DATA UPDATED SUCCESSFULLY", "success");
        setFormData({
          Created_by: user?.name,
          SrNo: "",
          EmpMst: {
            EMPCODE: " ",
            MSPIN: " ",
            TITLE: " ",
            EMPFIRSTNAME: " ",
            EMPLASTNAME: " ",
            PERMANENTADDRESS1: " ",
            PERMANENTADDRESS2: " ",
            MOBILE_NO: " ",
            CONTRACT_NUMBER: " ",
            landline_no: " ",
            Father_Mob: " ",
            Mother_Mob: " ",
            Spouse_Mob: " ",
            CNATIONALITY: " ",
            PCITY: null,
            PPINCODE: " ",
            PSTATE: null,
            CURRENTADDRESS1: " ",
            CURRENTADDRESS2: " ",
            CCITY: null,
            CPINCODE: " ",
            CSTATE: null,
            LANDLINENO: " ",
            MOBILENO: " ",
            EMERGENCYNAME: " ",
            EMERGENCYNO: " ",
            PANNO: " ",
            PASSPORTNO: " ",
            PASSEXPIRYDATE: " ",
            driving_licence: " ",
            columndoc_type: " ",
            BLOODGROUP: " ",
            DOB: " ",
            GENDER: " ",
            MARITALSTATUS: " ",
            DOM: " ",
            SKILLS: " ",
            BASICQUALIFICATION: " ",
            PROFESSIONALQUALIFICATION: " ",
            FATHERNAME: " ",
            FATHEROCCUPATION: null,
            FATHERCONTACTNO: " ",
            MOTHERNAME: " ",
            MOTHERCONTACTNO: " ",
            SPOUSENAME: " ",
            SPOUSECONTACTNO: " ",
            SPOUSEGENDER: " ",
            SIBLINGNAME: " ",
            SIBLINGCONTACTNO: " ",
            PREVIOUSCOMPANYNAME: " ",
            PRECOMPCITY: null,
            PRECOMPCONTACTNO: " ",
            PREJOININGDATE: " ",
            PREENDDATE: " ",
            PREDESIGNATION: " ",
            EMPREFERENCENAME: " ",
            REFERENCEDESIGNATION: " ",
            ISMEDICALATTENTION: " ",
            ISSERIOUSILLNESS: " ",
            ISALLERGIES: " ",
            CORPORATEMAILID: " ",
            Created_by: " ",
            CURRENTJOINDATE: " ",
            PAYMENTMODE: " ",
            BANKNAME: " ",
            BANKACCOUNTNO: " ",
            EMPLOYEETYPE: " ",
            ORGANISATIONNAME: " ",
            SBU_FUNCTION: " ",
            DIVISION: " ",
            REGION: null,
            UNIT: " ",
            SECTION: " ",
            LEVEL: " ",
            uidno: " ",
            pfper: null,
            esiper: null,
            PFNO: " ",
            ESINO: " ",
            Ledger_Code: null,
            Acnt_Loc: null,
            UAN_No: " ",
            EmpType: null,
            IsMSPN: null,
            MSPN_DTL: " ",
            ESI_DEDUCTION: null,
            PF_DEDUCTION: null,
            pro_tax: null,
            TCS_Rate: null,
            Rec_Date: " ",
            ifsc_code: " ",
            pre_Exp: " ",
            Interview_Date: " ",
            Sal_Region: null,
            LWFNO: null,
            Emp_Ac_Name: " ",
            PF_Date: " ",
            ESI_Date: " ",
            PASSPORT_EXPDATE: " ",
            Punch_Type: null,
            PAY_CODE: " ",
            Sal_Hold: null,
            InBudget: false,
            Induction_Done: false,
            ExitInterview_Done: false,
            LOCATION: " ",
            ROLE: " ",
            EMPLOYEEDESIGNATION: " ",
            GRADE: " ",
            SUPERVISORID: null,
            SUPERVISOR: " ",
            ISTIMEVALIDATION: " ",
            ISPAYROLL: " ",
            PAYCYCLEDURATION: " ",
            PROBATIONPERIOD: " ",
            PROBATIONLEAVES: " ",
            NOTICEPERIOD: " ",
            RELCODE: null,
            Exp_Date: " ",
            Export_Type: 1,
            Loc_Code: null,
            ServerId: 1,
            DRIVINGLIC_ISSUEDATE: " ",
            DRIVINGLIC_ISSUEPALACE: " ",
            ACCOUNT_TYPE: " ",
            PFTRUST_NO: " ",
            EMPHEIGHT: null,
            EMPWEIGHT: null,
            P_NATIONALITY: " ",
            UID_NO: " ",
            ALTERNET_MAIL: " ",
            EMPDEPENDENT: null,
            CHILDREN_DETAIL: " ",
            LANGUAGE_DETAIL: " ",
            NOMINEE_DETAIL: null,
            EMP_SHIFT: " ",
            PF: null,
            PFSALARY_LIMIT: null,
            LWF: null,
            ESI_AMOUNT: null,
            BONUS_AMOUNT: null,
            GRATUITY: null,
            MONTHLY_CTC: null,
            ANNUAL_CTC: null,
            COMP_NAME: " ",
            JOINING_TYPE: " ",
            BRANCH: " ",
            EMP_STATUS: " ",
            USR_NAME: " ",
            APPLICATION_ID: " ",
            APPROVED_AUTHO: " ",
            BIOMETRIC_ID: " ",
            PROPOSEDRETIRE_DATE: " ",
            LASTWOR_DATE: " ",
            RELEVE_STATUS: " ",
            ADUSER_NAME: " ",
            EXT_NO: " ",
            AUTOMAILER: " ",
            WEEKLYOFF: " ",
            RESIGN_APPR: " ",
            AX_EMP_CODE: " ",
            AX_BAL: null,
            Prob_period: " ",
            empcode2: " ",
            empcode3: " ",
            empcode4: " ",
            ADHARNO: " ",
            pfnumber: " ",
            esinumber: " ",
            ein: " ",
            mobile_limit: " ",
            IEMI: " ",
            IsRW: null,
            Reporting_1: " ",
            Reporting_2: " ",
            Reporting_3: " ",
            App_Mispunch: " ",
            App_Leave: " ",
            App_Attendance: " ",
            FCM_TockenId: " ",
            Android_ID: " ",
            multi_loc: " ",
            Token: " ",
            Is_Profile_Filled: null,
            mPunch: " ",
            mApprove: " ",
            mMispunch: " ",
            mLeave: " ",
            mCalender: " ",
            mDeviceLog: " ",
            mAttendanceLog: " ",
            mLocationLog: " ",
            mToDoList: " ",
            mSuggestions: " ",
            mUpdateIMEI: " ",
            mTrackingReport: " ",
            mLiveLocation: " ",
            mAssetScan: " ",
            mGeoFenceSetting: " ",
            profile: null,
            adhar: null,
            pan: null,
            salary: null,
            other1: null,
            other2: null,
            other3: null,
            other4: null,
            otherpdf: null,
            BONUS: null,
            MOBILE_RIGHTS: null,
            Marital_Status: null,
            Confirmation_Date: null,
            CDIST: null,
            PDIST: null,
            DD_CLUB: null,
            RESIGNED_STATUS: null,
            SEPRATION_CATE: null,
          },
          EmpEdu: [],
          EmpLang: [],
          EmpItSkill: [],
          EmpExperience: [],
          AssetIssue: [],
          EmpFamily: [],
        });
        setProfileSrc(null);
        router.push("/autovyn/payroll/Master/Employee_Master_View");
        router.refresh();
      } else {
        showSideAlert("Error UPDATING DATA", "warning");
      }
    } catch (error) {
      showSideAlert(`${error?.response?.data?.errors}`, "error");
    } finally {
      setIsLoading(false);
      setIsDialogOpen(false);
    }
  };

  const rawEmail =
    formData.EmpMst?.ALTERNET_MAIL || formData.EmpMst?.CORPORATEMAILID;
  const email = rawEmail?.trim(); // Trim spaces
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const interviewDateStr = formData?.EmpMst?.Interview_Date;
  const preJoiningDateStr = formData?.EmpMst?.CURRENTJOINDATE;
  const resignationDateStr = formData?.EmpMst?.RESIGNATION_SUBMISSION_DATE;

  const dobStr = formData?.EmpMst?.DOB;
  const domStr = formData?.EmpMst?.DOM;

  const validateMandatoryField = (fieldName, label) => {
    const key = fieldName.toString();
    const value = formData?.EmpMst?.[key];
    console.log(value, "value", key, "key");
    if (mandatorySet.has(key) && (!value || value.toString().trim() === "")) {
      showSideAlert(`${label} is mandatory`, "warning");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (dobStr && domStr) {
      const dobDate = new Date(dobStr);
      const domDate = new Date(domStr);

      if (isNaN(dobDate.getTime()) || isNaN(domDate.getTime())) {
        showSideAlert(
          "Invalid date format. Please enter valid dates.",
          "error",
        );
        return;
      }

      // Convert both to YYYY-MM-DD string for safe string comparison
      const dobFormatted = `${dobDate.getFullYear()}-${String(
        dobDate.getMonth() + 1,
      ).padStart(2, "0")}-${String(dobDate.getDate()).padStart(2, "0")}`;
      const domFormatted = `${domDate.getFullYear()}-${String(
        domDate.getMonth() + 1,
      ).padStart(2, "0")}-${String(domDate.getDate()).padStart(2, "0")}`;

      console.log("dobFormatted", dobFormatted);
      console.log("domFormatted", domFormatted);

      if (domFormatted < dobFormatted) {
        showSideAlert(
          "Date of Anniversary cannot be before Date of Birth",
          "warning",
        );
        return;
      }
    }

    if (interviewDateStr && preJoiningDateStr) {
      const interviewDate = new Date(interviewDateStr);
      const preJoiningDate = new Date(preJoiningDateStr);

      if (isNaN(interviewDate) || isNaN(preJoiningDate)) {
        showSideAlert(
          "Invalid date format. Please enter valid dates.",
          "error",
        );
        return;
      }

      if (preJoiningDate < interviewDate) {
        showSideAlert(
          "Joining date cannot be before interview date",
          "warning",
        );
        return;
      }
    }

    if (preJoiningDateStr && resignationDateStr) {
      const preJoiningDate = new Date(preJoiningDateStr);
      const resignationDate = new Date(resignationDateStr);

      if (isNaN(preJoiningDate.getTime()) || isNaN(resignationDate.getTime())) {
        showSideAlert(
          "Invalid date format. Please enter valid dates.",
          "error",
        );
        return;
      }

      if (preJoiningDate >= resignationDate) {
        showSideAlert(
          "Joining date must be after the resignation submission date.",
          "warning",
        );
        return;
      }
    }

    const mobileNo = formData?.EmpMst?.MOBILE_NO;

    if (mobileNo) {
      const mobileTrimmed = mobileNo.toString().trim();

      // Regex: Starts with 6-9 and followed by 9 digits
      const isValidMobile = /^[6-9][0-9]{9}$/.test(mobileTrimmed);

      if (!isValidMobile) {
        showSideAlert(
          "Invalid Mobile number. It should be 10 digits starting with 6, 7, 8, or 9.",
          "warning",
        );
        return;
      }
    }
    const CONTRACTNUMBER = formData?.EmpMst?.CONTRACT_NUMBER;

    if (CONTRACTNUMBER) {
      const mobileTrimmed = CONTRACTNUMBER.toString().trim();

      // Regex: Starts with 6-9 and followed by 9 digits
      const isValidMobile = /^[6-9][0-9]{9}$/.test(mobileTrimmed);

      if (!isValidMobile) {
        showSideAlert(
          "Invalid Contract Mobile number. It should be 10 digits starting with 6, 7, 8, or 9.",
          "warning",
        );
        return;
      }
    }

    const panNo = formData?.EmpMst?.PANNO;

    if (panNo) {
      const panTrimmed = panNo.toString().trim().toUpperCase();

      // PAN format: 5 letters + 4 digits + 1 letter
      const isValidPAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panTrimmed);

      if (!isValidPAN) {
        showSideAlert(
          "Invalid PAN Card No. Format should be ABCDE1234F",
          "warning",
        );
        return;
      }
    }

    const adharNo = formData?.EmpMst?.UID_NO;

    // Allow if null, undefined or empty string
    if (adharNo) {
      const adharTrimmed = adharNo.toString().trim();

      // Check if it’s exactly 12 digits
      const isValidAadhar = /^\d{12}$/.test(adharTrimmed);

      if (!isValidAadhar) {
        showSideAlert("Aadhar number must be exactly 12 digits", "warning");
        return;
      }
    }

    const passportNo = formData?.EmpMst?.PASSPORTNO;

    if (passportNo) {
      const passportTrimmed = passportNo.toString().trim().toUpperCase();

      // Indian passport format: 1 letter + 7 digits
      const isValidPassport = /^[A-PR-WY][0-9]{7}$/.test(passportTrimmed);

      if (!isValidPassport) {
        showSideAlert(
          "Invalid Passport number. Format should be A1234567",
          "warning",
        );
        return;
      }
    }

    if (!formData?.EmpMst.EMPCODE) {
      showSideAlert("Please Enter a EmpCode", "warning");
      return;
    }

    if (!formData?.EmpMst.EMPFIRSTNAME) {
      showSideAlert("Please Enter a First Name", "warning");
      return;
    }

    if (!formData?.EmpMst.LOCATION) {
      showSideAlert("Please Select a LOCATION", "warning");
      return;
    }

    if (formData.EmpMst.Father_Mob && formData.EmpMst.Father_Mob.length < 10) {
      showSideAlert(
        "Father's Mobile Number must be at least 10 digits.",
        "error",
      );
      return; // stop save
    }

    if (email && !emailRegex.test(email)) {
      showSideAlert("Please enter a valid Email Address.", "error");
      return; // stop the save
    }

    if (
      formData.EmpMst.MOTHERCONTACTNO &&
      formData.EmpMst.MOTHERCONTACTNO.length < 10
    ) {
      showSideAlert(
        "Mother's Mobile Number must be at least 10 digits.",
        "error",
      );
      return; // stop save
    }

    if (formData.EmpMst.PPINCODE && formData.EmpMst.PPINCODE.length < 6) {
      showSideAlert("Pincode Number must be at least 6 digits.", "error");
      return; // stop save
    }

    const accNo = formData?.EmpMst.BANKACCOUNTNO?.toString() || "";
    const cnfAccNo = formData?.EmpMst.Cnf_BANKACCOUNTNO?.toString() || "";

    if (cnfAccNo || accNo) {
      if (accNo.length < 10 || cnfAccNo.length < 10) {
        showSideAlert(
          "Account numbers and Confirm Account No must be at least 10 digits long.",
          "warning",
        );
        return;
      }
      if (accNo != cnfAccNo) {
        showSideAlert(
          "Account No and Confirm Account No do not match",
          "warning",
        );
        return;
      }
    }

    if (formData?.EmpMst?.IsiphoneUser == "1") {
      if (
        !formData?.EmpMst?.userNameIphone ||
        !formData?.EmpMst?.userPassIphone
      ) {
        showSideAlert(
          "Please enter valid iPhone username and password",
          "warning",
        );
        return;
      }
    }
    for (const field of MandatoryFieldsOption) {
      if (!validateMandatoryField(field.value, field.label)) {
        return;
      }
    }
    const pfNo = formData?.EmpMst?.PFNO;
    const pfPer = formData?.EmpMst?.pfper;

    // If PF = Yes (assuming "1" = Yes)
    if (pfNo === "1" || pfNo === 1) {
      if (!pfPer || pfPer === "" || pfPer === null) {
        showSideAlert("Please select PF % when PF is Yes.", "warning");
        return;
      }
    }

    const lastWorDate = formData?.EmpMst?.LASTWOR_DATE;
    if (compdata?.EMP_LASTWOR_DATE_VALD == 1) {
      if (lastWorDate && lastWorDate.toString().trim() !== "") {
        const separationMandatoryFields = [
          {
            key: "RESIGNATION_SUBMISSION_DATE",
            label: "Resignation Submission Date",
          },
          { key: "NOTICEPERIOD", label: "Notice Period" },
          { key: "REASON_FOR_RESIGNATION", label: "Reason for Resignation" },
          { key: "SEPARATION_MODE", label: "Separation Mode" },
          { key: "DATE_OF_EXIT_INTERVIEW", label: "Date of Exit Interview" },
          { key: "RESIGNED_STATUS", label: "Resigned Status" },
          { key: "SEPRATION_CATE", label: "Category" },
        ];

        for (const field of separationMandatoryFields) {
          const value = formData?.EmpMst?.[field.key];
          if (
            value === null ||
            value === undefined ||
            value.toString().trim() === ""
          ) {
            showSideAlert(
              `${field.label} is required when Last Working Date is entered.`,
              "warning",
            );
            return;
          }
        }
      }
    }

    setIsDialogOpen(true);
    setIsLoading(true);
    try {
      console.log(formData, "formData");
      const formDataToSend = new FormData();
      if (Object.keys(formData).length > 0) {
        formDataToSend.append("formData", JSON.stringify(formData));
      }
      if (profileSrc1 instanceof Blob) {
        const fileName = uuidv4();
        const fileType = profileSrc1.type.split("/")[1]; // Extract the file extension
        formDataToSend.append(
          "profile",
          profileSrc1,
          `${fileName}.${fileType}`,
        );
      }
      console.log(formData.EmpMst.adhar, "formData.EmpMst.adhar");

      if (formData.EmpMst.adhar instanceof Blob) {
        const fileName = uuidv4();
        formDataToSend.append(
          `adhar`,
          formData.EmpMst.adhar,
          `${fileName}.${formData.EmpMst.adhar.type?.split("/")[1]}`,
        );
      }
      if (formData.EmpMst.pan instanceof Blob) {
        const fileName = uuidv4();
        formDataToSend.append(
          `pan`,
          formData.EmpMst.pan,
          `${fileName}.${formData.EmpMst.pan.type?.split("/")[1]}`,
        );
      }
      if (formData.EmpMst.salary instanceof Blob) {
        const fileName = uuidv4();
        formDataToSend.append(
          `salary`,
          formData.EmpMst.salary,
          `${fileName}.${formData.EmpMst.salary.type?.split("/")[1]}`,
        );
      }
      if (formData.EmpMst.other1 instanceof Blob) {
        const fileName = uuidv4();
        formDataToSend.append(
          `other1`,
          formData.EmpMst.other1,
          `${fileName}.${formData.EmpMst.other1.type?.split("/")[1]}`,
        );
      }

      if (formData.EmpMst.other2 instanceof Blob) {
        const fileName = uuidv4();
        formDataToSend.append(
          `other2`,
          formData.EmpMst.other2,
          `${fileName}.${formData.EmpMst.other2.type?.split("/")[1]}`,
        );
      }

      if (formData.EmpMst.other3 instanceof Blob) {
        const fileName = uuidv4();
        formDataToSend.append(
          `other3`,
          formData.EmpMst.other3,
          `${fileName}.${formData.EmpMst.other3.type?.split("/")[1]}`,
        );
      }

      if (formData.EmpMst.other4 instanceof Blob) {
        const fileName = uuidv4();
        formDataToSend.append(
          `other4`,
          formData.EmpMst.other4,
          `${fileName}.${formData.EmpMst.other4.type?.split("/")[1]}`,
        );
      }

      if (formData.EmpMst.otherpdf instanceof Blob) {
        const fileName = uuidv4();
        formDataToSend.append(
          `otherpdf`,
          formData.EmpMst.otherpdf,
          `${fileName}.${formData.EmpMst.otherpdf.type?.split("/")[1]}`,
        );
      }

      if (formData.EmpMst.Separation1 instanceof Blob) {
        const fileName = uuidv4();
        formDataToSend.append(
          `Separation1`,
          formData.EmpMst.Separation1,
          `${fileName}.${formData.EmpMst.Separation1.type?.split("/")[1]}`,
        );
      }
      if (formData.EmpMst.Separation2 instanceof Blob) {
        const fileName = uuidv4();
        formDataToSend.append(
          `Separation2`,
          formData.EmpMst.Separation2,
          `${fileName}.${formData.EmpMst.Separation2.type?.split("/")[1]}`,
        );
      }

      console.log(formData, "formDataToSend");

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee`,
        formDataToSend,
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
            user_id: user?.id,
          },
        },
      );
      console.log(response.data, "response.data");

      const a = response.data.finalEmpCode;
      if (response.status == 200) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: `Data Submit successfully and Assigned code: '${a}'`,
        });
        // const response = await axios.post(
        //   `${process.env.NEXT_PUBLIC_URL}/employee/all`,
        //   {},
        //   {
        //     headers: {
        //       compcode: user?.Comp_Code,
        //       name: user?.name,
        //     },
        //   }
        // );

        // console.log(response, "response Api employee/all");
        setEmpDataRefresh(true);
        // setEmpcode(response.data?.data);
        setFormData({
          Created_by: user?.name,
          SrNo: null,
          EmpMst: {
            EMPCODE: null,
            MSPIN: null,
            TITLE: null,
            EMPFIRSTNAME: null,
            EMPLASTNAME: null,
            PERMANENTADDRESS1: null,
            PERMANENTADDRESS2: null,
            MOBILE_NO: null,
            CONTRACT_NUMBER: null,
            landline_no: null,
            Father_Mob: null,
            Mother_Mob: null,
            Spouse_Mob: null,
            CNATIONALITY: null,
            PCITY: null,
            PPINCODE: null,
            PSTATE: null,
            CURRENTADDRESS1: null,
            CURRENTADDRESS2: null,
            CCITY: null,
            CPINCODE: null,
            CSTATE: null,
            LANDLINENO: null,
            MOBILENO: null,
            EMERGENCYNAME: null,
            EMERGENCYNO: null,
            PANNO: null,
            PASSPORTNO: null,
            PASSEXPIRYDATE: null,
            driving_licence: null,
            columndoc_type: null,
            BLOODGROUP: null,
            DOB: null,
            GENDER: null,
            MARITALSTATUS: null,
            DOM: null,
            SKILLS: null,
            BASICQUALIFICATION: null,
            PROFESSIONALQUALIFICATION: null,
            FATHERNAME: null,
            FATHEROCCUPATION: null,
            FATHERCONTACTNO: null,
            MOTHERNAME: null,
            MOTHERCONTACTNO: null,
            SPOUSENAME: null,
            SPOUSECONTACTNO: null,
            SPOUSEGENDER: null,
            SIBLINGNAME: null,
            SIBLINGCONTACTNO: null,
            PREVIOUSCOMPANYNAME: null,
            PRECOMPCITY: null,
            PRECOMPCONTACTNO: null,
            PREJOININGDATE: null,
            PREENDDATE: null,
            PREDESIGNATION: null,
            EMPREFERENCENAME: null,
            REFERENCEDESIGNATION: null,
            ISMEDICALATTENTION: null,
            ISSERIOUSILLNESS: null,
            ISALLERGIES: null,
            CORPORATEMAILID: null,
            Created_by: null,
            CURRENTJOINDATE: null,
            PAYMENTMODE: null,
            BANKNAME: null,
            BANKACCOUNTNO: null,
            EMPLOYEETYPE: null,
            ORGANISATIONNAME: null,
            SBU_FUNCTION: null,
            DIVISION: null,
            REGION: null,
            UNIT: null,
            SECTION: null,
            LEVEL: null,
            uidno: null,
            pfper: null,
            esiper: null,
            PFNO: null,
            ESINO: null,
            Ledger_Code: null,
            Acnt_Loc: null,
            UAN_No: null,
            EmpType: null,
            IsMSPN: null,
            MSPN_DTL: null,
            ESI_DEDUCTION: null,
            PF_DEDUCTION: null,
            pro_tax: null,
            TCS_Rate: null,
            Rec_Date: null,
            ifsc_code: null,
            pre_Exp: null,
            Interview_Date: null,
            Sal_Region: null,
            LWFNO: null,
            Emp_Ac_Name: null,
            PF_Date: null,
            ESI_Date: null,
            PASSPORT_EXPDATE: null,
            Punch_Type: null,
            PAY_CODE: null,
            Sal_Hold: null,
            InBudget: false,
            Induction_Done: false,
            ExitInterview_Done: false,
            LOCATION: null,
            ROLE: null,
            EMPLOYEEDESIGNATION: null,
            GRADE: null,
            SUPERVISORID: null,
            SUPERVISOR: null,
            ISTIMEVALIDATION: null,
            ISPAYROLL: null,
            PAYCYCLEDURATION: null,
            PROBATIONPERIOD: null,
            PROBATIONLEAVES: null,
            NOTICEPERIOD: null,
            RELCODE: null,
            Exp_Date: null,
            Export_Type: 1,
            Loc_Code: null,
            ServerId: 1,
            DRIVINGLIC_ISSUEDATE: null,
            DRIVINGLIC_ISSUEPALACE: null,
            ACCOUNT_TYPE: null,
            PFTRUST_NO: null,
            EMPHEIGHT: null,
            EMPWEIGHT: null,
            P_NATIONALITY: null,
            UID_NO: null,
            ALTERNET_MAIL: null,
            EMPDEPENDENT: null,
            CHILDREN_DETAIL: null,
            LANGUAGE_DETAIL: null,
            NOMINEE_DETAIL: null,
            EMP_SHIFT: null,
            PF: null,
            PFSALARY_LIMIT: null,
            LWF: null,
            ESI_AMOUNT: null,
            BONUS_AMOUNT: null,
            GRATUITY: null,
            MONTHLY_CTC: null,
            ANNUAL_CTC: null,
            COMP_NAME: null,
            JOINING_TYPE: null,
            BRANCH: null,
            EMP_STATUS: null,
            USR_NAME: null,
            APPLICATION_ID: null,
            APPROVED_AUTHO: null,
            BIOMETRIC_ID: null,
            PROPOSEDRETIRE_DATE: null,
            LASTWOR_DATE: null,
            RELEVE_STATUS: null,
            ADUSER_NAME: null,
            EXT_NO: null,
            AUTOMAILER: null,
            WEEKLYOFF: null,
            RESIGN_APPR: null,
            AX_EMP_CODE: null,
            AX_BAL: null,
            Prob_period: null,
            empcode2: null,
            empcode3: null,
            empcode4: null,
            ADHARNO: null,
            pfnumber: null,
            esinumber: null,
            ein: null,
            mobile_limit: null,
            IEMI: null,
            IsRW: null,
            Reporting_1: null,
            Reporting_2: null,
            Reporting_3: null,
            App_Mispunch: null,
            App_Leave: null,
            App_Attendance: null,
            FCM_TockenId: null,
            Android_ID: null,
            multi_loc: null,
            Token: null,
            Is_Profile_Filled: null,
            mPunch: null,
            mApprove: null,
            mMispunch: null,
            mLeave: null,
            mCalender: null,
            mDeviceLog: null,
            mAttendanceLog: null,
            mLocationLog: null,
            mToDoList: null,
            mSuggestions: null,
            mUpdateIMEI: null,
            mTrackingReport: null,
            mLiveLocation: null,
            mAssetScan: null,
            mGeoFenceSetting: null,
            profile: null,
            adhar: null,
            pan: null,
            salary: null,
            other1: null,
            other2: null,
            other3: null,
            other4: null,
            otherpdf: null,
            BONUS: null,
            LIN_NO: null,
            DRIVINGLIC_EXPDATE: null,
            Dlv_Type: null,
            MOBILE_RIGHTS: null,
            Marital_Status: null,
            Confirmation_Date: null,
            CDIST: null,
            PDIST: null,
            DD_CLUB: null,
            RESIGNED_STATUS: null,
            SEPRATION_CATE: null,
          },
          EmpEdu: [],
          EmpLang: [],
          EmpItSkill: [],
          EmpExperience: [],
          AssetIssue: [],
          EmpFamily: [],
        });
        setIsLoading(false);
        setIsDialogOpen(false);
        setProfileSrc(null);
      } else if (response.status == 201) {
        setIsLoading(false);
        setIsDialogOpen(false);
        setProfileSrc(null);
        showSideAlert(a, "warning");
      } else {
        setIsLoading(false);
        setIsDialogOpen(false);
        showSideAlert("Error CREATING EMPLOYEE", "warning");
        setFormData({
          Created_by: user?.name,
          SrNo: null,
          EmpMst: {
            EMPCODE: null,
            MSPIN: null,
            TITLE: null,
            EMPFIRSTNAME: null,
            EMPLASTNAME: null,
            PERMANENTADDRESS1: null,
            PERMANENTADDRESS2: null,
            MOBILE_NO: null,
            CONTRACT_NUMBER: null,
            landline_no: null,
            Father_Mob: null,
            Mother_Mob: null,
            Spouse_Mob: null,
            CNATIONALITY: null,
            PCITY: null,
            PPINCODE: null,
            PSTATE: null,
            CURRENTADDRESS1: null,
            CURRENTADDRESS2: null,
            CCITY: null,
            CPINCODE: null,
            CSTATE: null,
            LANDLINENO: null,
            MOBILENO: null,
            EMERGENCYNAME: null,
            EMERGENCYNO: null,
            PANNO: null,
            PASSPORTNO: null,
            PASSEXPIRYDATE: null,
            driving_licence: null,
            columndoc_type: null,
            BLOODGROUP: null,
            DOB: null,
            GENDER: null,
            MARITALSTATUS: null,
            DOM: null,
            SKILLS: null,
            BASICQUALIFICATION: null,
            PROFESSIONALQUALIFICATION: null,
            FATHERNAME: null,
            FATHEROCCUPATION: null,
            FATHERCONTACTNO: null,
            MOTHERNAME: null,
            MOTHERCONTACTNO: null,
            SPOUSENAME: null,
            SPOUSECONTACTNO: null,
            SPOUSEGENDER: null,
            SIBLINGNAME: null,
            SIBLINGCONTACTNO: null,
            PREVIOUSCOMPANYNAME: null,
            PRECOMPCITY: null,
            PRECOMPCONTACTNO: null,
            PREJOININGDATE: null,
            PREENDDATE: null,
            PREDESIGNATION: null,
            EMPREFERENCENAME: null,
            REFERENCEDESIGNATION: null,
            ISMEDICALATTENTION: null,
            ISSERIOUSILLNESS: null,
            ISALLERGIES: null,
            CORPORATEMAILID: null,
            Created_by: null,
            CURRENTJOINDATE: null,
            PAYMENTMODE: null,
            BANKNAME: null,
            BANKACCOUNTNO: null,
            EMPLOYEETYPE: null,
            ORGANISATIONNAME: null,
            SBU_FUNCTION: null,
            DIVISION: null,
            REGION: null,
            UNIT: null,
            SECTION: null,
            LEVEL: null,
            uidno: null,
            pfper: null,
            esiper: null,
            PFNO: null,
            ESINO: null,
            Ledger_Code: null,
            Acnt_Loc: null,
            UAN_No: null,
            EmpType: null,
            IsMSPN: null,
            MSPN_DTL: null,
            ESI_DEDUCTION: null,
            PF_DEDUCTION: null,
            pro_tax: null,
            TCS_Rate: null,
            Rec_Date: null,
            ifsc_code: null,
            pre_Exp: null,
            Interview_Date: null,
            Sal_Region: null,
            LWFNO: null,
            Emp_Ac_Name: null,
            PF_Date: null,
            ESI_Date: null,
            PASSPORT_EXPDATE: null,
            Punch_Type: null,
            PAY_CODE: null,
            Sal_Hold: null,
            InBudget: false,
            Induction_Done: false,
            ExitInterview_Done: false,
            LOCATION: null,
            ROLE: null,
            EMPLOYEEDESIGNATION: null,
            GRADE: null,
            SUPERVISORID: null,
            SUPERVISOR: null,
            ISTIMEVALIDATION: null,
            ISPAYROLL: null,
            PAYCYCLEDURATION: null,
            PROBATIONPERIOD: null,
            PROBATIONLEAVES: null,
            NOTICEPERIOD: null,
            RELCODE: null,
            Exp_Date: null,
            Export_Type: 1,
            Loc_Code: null,
            ServerId: 1,
            DRIVINGLIC_ISSUEDATE: null,
            DRIVINGLIC_ISSUEPALACE: null,
            ACCOUNT_TYPE: null,
            PFTRUST_NO: null,
            EMPHEIGHT: null,
            EMPWEIGHT: null,
            P_NATIONALITY: null,
            UID_NO: null,
            ALTERNET_MAIL: null,
            EMPDEPENDENT: null,
            CHILDREN_DETAIL: null,
            LANGUAGE_DETAIL: null,
            NOMINEE_DETAIL: null,
            EMP_SHIFT: null,
            PF: null,
            PFSALARY_LIMIT: null,
            LWF: null,
            ESI_AMOUNT: null,
            BONUS_AMOUNT: null,
            GRATUITY: null,
            MONTHLY_CTC: null,
            ANNUAL_CTC: null,
            COMP_NAME: null,
            JOINING_TYPE: null,
            BRANCH: null,
            EMP_STATUS: null,
            USR_NAME: null,
            APPLICATION_ID: null,
            APPROVED_AUTHO: null,
            BIOMETRIC_ID: null,
            PROPOSEDRETIRE_DATE: null,
            LASTWOR_DATE: null,
            RELEVE_STATUS: null,
            ADUSER_NAME: null,
            EXT_NO: null,
            AUTOMAILER: null,
            WEEKLYOFF: null,
            RESIGN_APPR: null,
            AX_EMP_CODE: null,
            AX_BAL: null,
            Prob_period: null,
            empcode2: null,
            empcode3: null,
            empcode4: null,
            ADHARNO: null,
            pfnumber: null,
            esinumber: null,
            ein: null,
            mobile_limit: null,
            IEMI: null,
            IsRW: null,
            Reporting_1: null,
            Reporting_2: null,
            Reporting_3: null,
            App_Mispunch: null,
            App_Leave: null,
            App_Attendance: null,
            FCM_TockenId: null,
            Android_ID: null,
            multi_loc: null,
            Token: null,
            Is_Profile_Filled: null,
            mPunch: null,
            mApprove: null,
            mMispunch: null,
            mLeave: null,
            mCalender: null,
            mDeviceLog: null,
            mAttendanceLog: null,
            mLocationLog: null,
            mToDoList: null,
            mSuggestions: null,
            mUpdateIMEI: null,
            mTrackingReport: null,
            mLiveLocation: null,
            mAssetScan: null,
            mGeoFenceSetting: null,
            profile: null,
            adhar: null,
            pan: null,
            salary: null,
            other1: null,
            other2: null,
            other3: null,
            other4: null,
            otherpdf: null,
            BONUS: null,
            LIN_NO: null,
            DRIVINGLIC_EXPDATE: null,
            Dlv_Type: null,
            MOBILE_RIGHTS: null,
            Marital_Status: null,
            Confirmation_Date: null,
            CDIST: null,
            PDIST: null,
            DD_CLUB: null,
            RESIGNED_STATUS: null,
            SEPRATION_CATE: null,
          },
          EmpEdu: [],
          EmpLang: [],
          EmpItSkill: [],
          EmpExperience: [],
          AssetIssue: [],
          EmpFamily: [],
        });
      }
    } catch (error) {
      showSideAlert(`${error?.response?.data?.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (Empcode) {
      setEmpcode([{ value: Empcode, label: `Empcode: ${Empcode}` }]); // Adjust the object structure if necessary
    }
    handleEmpChange("EMPCODE", Empcode);
  }, [Empcode]);

  const handleReset = async () => {
    window.location.reload();
  };

  const [IsGenerate, setIsGenerate] = useState(false);
  const Generatecode = async () => {
    setFormData({
      Created_by: user?.name,
      SrNo: null,
      EmpMst: {
        EMPCODE: null,
        MSPIN: null,
        TITLE: null,
        EMPFIRSTNAME: null,
        EMPLASTNAME: null,
        PERMANENTADDRESS1: null,
        PERMANENTADDRESS2: null,
        MOBILE_NO: null,
        CONTRACT_NUMBER: null,
        landline_no: null,
        Father_Mob: null,
        Mother_Mob: null,
        Spouse_Mob: null,
        CNATIONALITY: null,
        PCITY: null,
        PPINCODE: null,
        PSTATE: null,
        CURRENTADDRESS1: null,
        CURRENTADDRESS2: null,
        CCITY: null,
        CPINCODE: null,
        CSTATE: null,
        LANDLINENO: null,
        MOBILENO: null,
        EMERGENCYNAME: null,
        EMERGENCYNO: null,
        PANNO: null,
        PASSPORTNO: null,
        PASSEXPIRYDATE: null,
        driving_licence: null,
        columndoc_type: null,
        BLOODGROUP: null,
        DOB: null,
        GENDER: null,
        MARITALSTATUS: null,
        DOM: null,
        SKILLS: null,
        BASICQUALIFICATION: null,
        PROFESSIONALQUALIFICATION: null,
        FATHERNAME: null,
        FATHEROCCUPATION: null,
        FATHERCONTACTNO: null,
        MOTHERNAME: null,
        MOTHERCONTACTNO: null,
        SPOUSENAME: null,
        SPOUSECONTACTNO: null,
        SPOUSEGENDER: null,
        SIBLINGNAME: null,
        SIBLINGCONTACTNO: null,
        PREVIOUSCOMPANYNAME: null,
        PRECOMPCITY: null,
        PRECOMPCONTACTNO: null,
        PREJOININGDATE: null,
        PREENDDATE: null,
        PREDESIGNATION: null,
        EMPREFERENCENAME: null,
        REFERENCEDESIGNATION: null,
        ISMEDICALATTENTION: null,
        ISSERIOUSILLNESS: null,
        ISALLERGIES: null,
        CORPORATEMAILID: null,
        Created_by: null,
        CURRENTJOINDATE: null,
        PAYMENTMODE: null,
        BANKNAME: null,
        BANKACCOUNTNO: null,
        EMPLOYEETYPE: null,
        ORGANISATIONNAME: null,
        SBU_FUNCTION: null,
        DIVISION: null,
        REGION: null,
        UNIT: null,
        SECTION: null,
        LEVEL: null,
        uidno: null,
        pfper: null,
        esiper: null,
        PFNO: null,
        ESINO: null,
        Ledger_Code: null,
        Acnt_Loc: null,
        UAN_No: null,
        EmpType: null,
        IsMSPN: null,
        MSPN_DTL: null,
        ESI_DEDUCTION: null,
        PF_DEDUCTION: null,
        pro_tax: null,
        TCS_Rate: null,
        Rec_Date: null,
        ifsc_code: null,
        pre_Exp: null,
        Interview_Date: null,
        Sal_Region: null,
        LWFNO: null,
        Emp_Ac_Name: null,
        PF_Date: null,
        ESI_Date: null,
        PASSPORT_EXPDATE: null,
        Punch_Type: null,
        PAY_CODE: null,
        Sal_Hold: null,
        InBudget: false,
        Induction_Done: false,
        ExitInterview_Done: false,
        LOCATION: null,
        ROLE: null,
        EMPLOYEEDESIGNATION: null,
        GRADE: null,
        SUPERVISORID: null,
        SUPERVISOR: null,
        ISTIMEVALIDATION: null,
        ISPAYROLL: null,
        PAYCYCLEDURATION: null,
        PROBATIONPERIOD: null,
        PROBATIONLEAVES: null,
        NOTICEPERIOD: null,
        RELCODE: null,
        Exp_Date: null,
        Export_Type: 1,
        Loc_Code: null,
        ServerId: 1,
        DRIVINGLIC_ISSUEDATE: null,
        DRIVINGLIC_ISSUEPALACE: null,
        ACCOUNT_TYPE: null,
        PFTRUST_NO: null,
        EMPHEIGHT: null,
        EMPWEIGHT: null,
        P_NATIONALITY: null,
        UID_NO: null,
        ALTERNET_MAIL: null,
        EMPDEPENDENT: null,
        CHILDREN_DETAIL: null,
        LANGUAGE_DETAIL: null,
        NOMINEE_DETAIL: null,
        EMP_SHIFT: null,
        PF: null,
        PFSALARY_LIMIT: null,
        LWF: null,
        ESI_AMOUNT: null,
        BONUS_AMOUNT: null,
        GRATUITY: null,
        MONTHLY_CTC: null,
        ANNUAL_CTC: null,
        COMP_NAME: null,
        JOINING_TYPE: null,
        BRANCH: null,
        EMP_STATUS: null,
        USR_NAME: null,
        APPLICATION_ID: null,
        APPROVED_AUTHO: null,
        BIOMETRIC_ID: null,
        PROPOSEDRETIRE_DATE: null,
        LASTWOR_DATE: null,
        RELEVE_STATUS: null,
        ADUSER_NAME: null,
        EXT_NO: null,
        AUTOMAILER: null,
        WEEKLYOFF: null,
        RESIGN_APPR: null,
        AX_EMP_CODE: null,
        AX_BAL: null,
        Prob_period: null,
        empcode2: null,
        empcode3: null,
        empcode4: null,
        ADHARNO: null,
        pfnumber: null,
        esinumber: null,
        ein: null,
        mobile_limit: null,
        IEMI: null,
        IsRW: null,
        Reporting_1: null,
        Reporting_2: null,
        Reporting_3: null,
        App_Mispunch: null,
        App_Leave: null,
        App_Attendance: null,
        FCM_TockenId: null,
        Android_ID: null,
        multi_loc: null,
        Token: null,
        Is_Profile_Filled: null,
        mPunch: null,
        mApprove: null,
        mMispunch: null,
        mLeave: null,
        mCalender: null,
        mDeviceLog: null,
        mAttendanceLog: null,
        mLocationLog: null,
        mToDoList: null,
        mSuggestions: null,
        mUpdateIMEI: null,
        mTrackingReport: null,
        mLiveLocation: null,
        mAssetScan: null,
        mGeoFenceSetting: null,
        profile: null,
        adhar: null,
        pan: null,
        salary: null,
        other1: null,
        other2: null,
        other3: null,
        other4: null,
        BONUS: null,
        LIN_NO: null,
        DRIVINGLIC_EXPDATE: null,
        Dlv_Type: null,
        MOBILE_RIGHTS: null,
        Marital_Status: null,
        Confirmation_Date: null,
        CDIST: null,
        PDIST: null,
        DD_CLUB: null,
        RESIGNED_STATUS: null,
        SEPRATION_CATE: null,
      },
      EmpEdu: [],
      EmpLang: [],
      EmpItSkill: [],
      EmpExperience: [],
      AssetIssue: [],
      EmpFamily: [],
    });
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/generateCode`,
        {
          branch: user?.branch,
        },
        {
          headers: { compcode: user?.Comp_Code },
        },
      );

      console.log(result, "ViewData");
      if (result.status === 201) {
        await Swal.fire({
          icon: "error",
          title: result.data.message,
          text: "",
        });
        router.back();
        return;
      }

      const code = result?.data?.code;

      setFormData((prev) => ({
        ...prev,
        EmpMst: {
          ...prev.EmpMst,
          EMPCODE: code,
        },
      }));
      setIsGenerate(true);
    } catch (error) {
      console.log("Error", error);
      // showSideAlert(`${error?.response?.data?.message}`, "error");

      // Swal.fire({
      //   icon: "error",
      //   title: `${error?.response?.data?.message}`,
      //   text: " ...",
      // });
    }
  };

  const handleBack = () => {
    history.back();
  };

  useEffect(() => {
    const isEditMode = formData?.EmpMst?.UTD || Empcode;

    if (!isEditMode) {
      Generatecode(); // Only runs when adding a new employee
    } else {
      console.log("Edit mode detected. Skipping code generation.");
    }
  }, []);

  const handleAddEmp = () => {
    const url = new URL(window.location.href);

    // Remove the 'UTD' parameter
    url.searchParams.delete("UTD");

    // Replace the URL in the browser without reloading
    window.history.replaceState({}, document.title, url.pathname + url.search);

    // Reload the page
    window.location.reload();
  };

  const handleAadharVerified = () => {
    handleInputChange("AADHAR_CARD_VER", true);
  };

  const [showLogModal, setShowLogModal] = useState(false);
  const [policyLogs, setPolicyLogs] = useState<any[]>([]);
  const fetchEmployeeLogs = async () => {
    const salaryChangeView = user?.role1.includes("1.1.17");
    if (UpdateDisable) {
      Swal.fire({
        icon: "warning",
        title: "No Policy Selected",
        text: "Please select a policy to view logs",
      });
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/getEmployeeHistory`,
        {
          SRNO: formData.EmpMst?.SRNO,
          IsSalaryView: salaryChangeView,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      if (response.data.success) {
        setPolicyLogs(response.data.data || []);
        setShowLogModal(true);
      } else {
        console.log(response.data.message || "Failed to load history");
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.response?.data?.message || "Unable to load history",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col bg-[#F6F7FB] dark:bg-black -mt-4">
      {/* ===== ONE MAIN HEADER (Back + Breadcrumb + Actions) ===== */}
      <header className=" shrink-0 border-b border-[#E6E8EF] dark:border-[#2A2F3A] ">
        <div className="  w-full h-14  flex items-center justify-between gap-3">
          {/* Left: Brand (optional) + Back + Breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            {/* Optional small brand like screenshot (HS) */}
            <div className="hidden sm:flex h-10 w-10 rounded-xl bg-[#4F46E5] text-white items-center justify-center font-semibold">
              HS
            </div>

            <Button
              variant="outline"
              size="md"
              shape="pill"
              onClick={handleBack}
              className="h-10  rounded-xl "
            >
              <ArrowLeft className="h-6 w-6 mr-2" />
              Back
            </Button>

            {/* Breadcrumb */}
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {user?.role1.includes("1.1.2") && SaveDisable && (
              <Button
                variant="outline"
                onClick={handleAddEmp}
                size="md"
                shape="pill"
                className="h-10 rounded-xl gap-2"
              >
                <Plus className="h-4 w-4" />
                New record
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => {}}
              size="md"
              className="h-10  rounded-xl gap-2"
              title="Help"
            >
              <HelpCircle className="h-4 w-4" />
              Help
            </Button>

            <Button
              variant="outline"
              onClick={handleReset}
              size="md"
              shape="pill"
              className="h-10 rounded-xl gap-2"
            >
              <X className="h-4 w-4" />
              Discard
            </Button>

            {user?.role1.includes("1.1.2") && !SaveDisable && (
              <Button
                variant="primary"
                size="md"
                shape="pill"
                className=""
                onClick={handleSave}
                className="h-10 rounded-xl gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Save employee
              </Button>
            )}

            {user?.role1.includes("1.1.3") && SaveDisable && (
              <Button
                variant="primary"
                onClick={handleUpdate}
                size="md"
                disabled={UpdateDisable}
                className="h-10 rounded-xl"
              >
                Update employee
              </Button>
            )}
          </div>
        </div>
      </header>

      <div
        className={`${
          isLoading ? "blur-[2px] pointer-events-none select-none" : ""
        }`}
      >
        {/* ===== TOP FORM CARD (no extra header inside) ===== */}
        {/* ===== TOP MINI HEADER (DEFAULT) ===== */}
        <EmployeeMiniHeader
          canSearchEmployee={user?.role1.includes("1.1.1")}
          empcodeOptions={empcode}
          SaveDisable={SaveDisable}
          formData={formData}
          handleEmpChange={handleEmpChange}
          handleInputChange={handleInputChange}
          Generatecode={Generatecode}
          recordCompletion={recordCompletion}
          profileSrc={profileSrc} // ✅ add
          handleFileChange={handleFileChange}
        />

        {/* ===== LOWER LAYOUT: SECTIONS + CONTENT ===== */}
        <div className="py-3">
          <div className="grid grid-cols-12 gap-4">
            {/* Sidebar */}
            <aside className="col-span-12 xl:col-span-2 min-w-0">
              <div className="w-full dark:bg-black dark:border-[#2A2F3A] rounded-2xl">
                <div className="text-s font-semibold tracking-wider text-[#667085] dark:text-[#A0A7B4]">
                  SECTIONS
                </div>

                <div className="mt-3 space-y-2">
                  {SECTIONS.map((sec, idx) => {
                    const active = sec.key === activeSection;
                    const prog = getSectionProgress(sec.key);

                    return (
                      <button
                        key={sec.key}
                        type="button"
                        onClick={() => setActiveSection(sec.key)}
                        className={`w-full flex items-center gap-4 rounded-xl border px-3 py-1.5 text-left transition
          ${
            active
              ? "bg-[#E0E7FF] border-[#1E40AF] dark:bg-[#0B1220] dark:border-[#1E40AF]"
              : "bg-transparent border-transparent hover:bg-[#F2F4F7] hover:border-[#D0D5DD] dark:hover:bg-[#0B1220] dark:hover:border-[#2A2F3A]"
          }`}
                      >
                        <div
                          className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold border
            ${
              active
                ? "border-[#1E40AF] text-[#1E40AF] bg-white dark:bg-black"
                : "border-[#D0D5DD] dark:border-[#2A2F3A] text-[#475467] dark:text-[#A0A7B4]"
            }`}
                        >
                          {idx + 1}
                        </div>

                        <div className="flex-1">
                          <div
                            className={`font-semibold ${
                              active
                                ? "text-[#1E40AF]"
                                : "text-[#475467] dark:text-[#A0A7B4]"
                            }`}
                          >
                            {sec.label}
                          </div>
                        </div>

                        <div
                          className={`text-[11px] px-2 py-0.5 rounded-full font-semibold
            ${
              active
                ? "bg-[#FEE4E2] text-[#B42318]"
                : "bg-[#EAECF0] text-[#475467] dark:bg-[#111827] dark:text-[#A0A7B4]"
            }`}
                        >
                          {prog.filled}/{prog.total}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* Content */}
            <main className="col-span-12 xl:col-span-10 min-w-0">
              <div className=" dark:bg-black  rounded-xl">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <h2 className="text-3xl font-bold text-[#101828] dark:text-white">
                      {activeMeta.label}
                    </h2>
                    <p className="text-sm text-[#667085] dark:text-[#A0A7B4] mt-1">
                      {activeMeta.desc}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 p-4 ">
                    <Button
                      variant="outline"
                      onClick={goPrevSection}
                      size="md"
                      shape="pill"
                      disabled={activeIndex <= 0}
                      className="h-8 px-3 rounded-lg gap-2 dark:bg-black dark:border-[#2A2F3A] dark:text-white hover:bg-[#F2F4F7] dark:hover:bg-[#4F46E5]"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    <Button
                      variant="outlineBrand"
                      onClick={goNextSection}
                      size="md"
                      shape="pill"
                      disabled={activeIndex >= SECTIONS.length - 1}
                      className="h-8 px-3 rounded-lg gap-2 dark:bg-black dark:border-[#2A2F3A] dark:text-white hover:bg-[#F2F4F7] dark:hover:bg-[#4F46E5]"
                    >
                      Save & next
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 w-[100%]">
                  {activeSection === "identity" ? (
                    // ✅ Basic Info click => EmployeeIdentitySection
                    <EmployeeIdentitySection
                      user={user}
                      formData={formData}
                      SaveDisable={SaveDisable}
                      IsGenerate={IsGenerate}
                      empcode={empcode}
                      MrOptions={MrOptions}
                      GenderOptions={GenderOptions}
                      Type={Type}
                      SalRegionoption={SalRegionoption}
                      CHANEELOPTION={CHANEELOPTION}
                      CLUSTEROPTION={CLUSTEROPTION}
                      locationnoption={locationnoption}
                      SECTIONoption={SECTIONoption}
                      divisionoption={divisionoption}
                      EMPLOYEEDESIGNATIONoption={EMPLOYEEDESIGNATIONoption}
                      handleEmpChange={handleEmpChange}
                      handleInputChange={handleInputChange}
                      handleLocationChange={handleLocationChange}
                      Generatecode={Generatecode}
                      profileSrc={profileSrc}
                      handleFileChange={handleFileChange}
                    />
                  ) : (
                    // ✅ Employee Identity click => EmpTabs Page1 (Basic Info)
                    <EmpTabs
                      isMandatory={isMandatory}
                      masterData={MasterData}
                      formData={formData}
                      onOpenDialog={() => setIsDigiOpen(true)}
                      documentData={documentData}
                      setDocumentData={setDocumentData}
                      onAadharVerified={(docType: string) => {
                        setFormData((prev) => ({
                          ...prev,
                          EmpMst: {
                            ...prev.EmpMst,
                            ...(docType === "aadhaar" && {
                              AADHAR_CARD_VER: true,
                            }),
                            ...(docType === "pan" && {
                              PAN_CARD_VER: true,
                              PAN_NAME_MATCH_VER: true,
                            }),
                            ...(docType === "driving_license" && {
                              DRIVING_VER: true,
                            }),
                          },
                        }));
                      }}
                      activeTab={TAB_MAP[activeSection] ?? 1}
                      onTabChange={(tabNo: number) => {
                        const secKey = REVERSE_TAB_MAP[tabNo] ?? "info";
                        setActiveSection(secKey);
                      }}
                      hideTabList={true}
                    />
                  )}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* DigiLocker + loaders + Logs modal (same as your existing code) */}
      <DigiLockerVerification
        isOpen={isDigiOpen}
        mobileNumber={formData.EmpMst?.MOBILENO}
        adhar={formData?.EmpMst?.UID_NO}
        pan={formData?.EmpMst?.PANNO}
        DrivingLicense={formData?.EmpMst?.DRIVINGLIC_ISSUEPALACE}
        Name={formData.EmpMst?.EMPFIRSTNAME}
        onVerificationComplete={({ type, data }) => {
          setDocumentData((prev: any) => ({ ...prev, [type]: data }));
          setIsDigiOpen(false);
        }}
        onAadharVerified={(docType: string, photo?: string) => {
          setFormData((prev) => ({
            ...prev,
            EmpMst: {
              ...prev.EmpMst,
              ...(docType === "aadhaar" && {
                AADHAR_CARD_VER: true,
                photo: prev.EmpMst?.photo == null ? photo : prev.EmpMst.photo,
              }),
              ...(docType === "pan" && {
                PAN_CARD_VER: true,
                PAN_NAME_MATCH_VER: true,
              }),
              ...(docType === "driving_license" && { DRIVING_VER: true }),
            },
          }));
        }}
        onClose={() => setIsDigiOpen(false)}
      />

      <HashloaderComponent isLoading={isLoading} />

      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          {/* ... (same code as your current logs modal) ... */}
          <div className="bg-white dark:bg-dark rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl border border-primary/20 flex flex-col">
            <div className="bg-gradient-to-r from-header to-header/80 dark:from-dark dark:to-dark/60 px-6 py-5 flex justify-between items-center border-b border-borderColor dark:border-borderColor-dark">
              <div>
                <h2 className="text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-6 h-6" />
                  Employee Change History
                </h2>
                <p className="text-white/70 text-sm mt-1">
                  View all modifications made to this Employee Creation
                </p>
              </div>
              <button
                onClick={() => setShowLogModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-auto flex-1 p-6">
              {policyLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg">
                    No history available for this Employee Creation
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {policyLogs.map((log, index) => (
                    <div
                      key={index}
                      className="border-2 border-borderColor dark:border-borderColor-dark rounded-xl p-5 hover:border-primary/50 transition-all duration-300 hover:shadow-md dark:hover:shadow-primary/10"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-primary/10 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-black dark:text-white text-lg">
                              {log.updated_at
                                ? log.updated_at
                                : "Date Not Available"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {Object.entries(log.changes || {}).length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b-2 text-base border-borderColor dark:border-borderColor-dark">
                                <th className="text-left text-base px-3 py-2 font-bold text-header dark:text-white">
                                  Field
                                </th>
                                <th className="text-left text-base px-3 py-2 font-bold text-header dark:text-white">
                                  Previous Value
                                </th>
                                <th className="text-left px-3 text-base py-2 font-bold text-header dark:text-white">
                                  New Value
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(log.changes).map(
                                ([field, values]: any, rowIndex) => (
                                  <tr
                                    key={rowIndex}
                                    className="border-b border-borderColor/30 dark:border-borderColor-dark/30 hover:bg-primary/5 transition-colors"
                                  >
                                    <td className="px-3 py-3">
                                      <span className="font-semibold text-black text-lg dark:text-white bg-gray-100 dark:bg-dark/50 px-2 py-1 rounded inline-block">
                                        {field}
                                      </span>
                                    </td>
                                    <td className="px-3 py-3">
                                      <span
                                        className="text-exit font-bold text-lg bg-exit/10 px-2 py-1 rounded block max-w-xs truncate"
                                        title={String(values.old)}
                                      >
                                        {values.old}
                                      </span>
                                    </td>
                                    <td className="px-3 py-3">
                                      <span
                                        className="text-green font-bold text-lg bg-green/10 px-2 py-1 rounded block max-w-xs truncate"
                                        title={String(values.new)}
                                      >
                                        {values.new}
                                      </span>
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                          No changes recorded
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-borderColor dark:border-borderColor-dark bg-off dark:bg-dark/30 flex justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total revisions:{" "}
                <span className="font-bold text-primary">
                  {policyLogs.length}
                </span>
              </p>
              <Button variant="outline" onClick={() => setShowLogModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EmployeeMasterContent />
    </Suspense>
  );
}
