"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import axios from "axios";
import Swal from "sweetalert2";
import {
  UserPlus,
  Pencil,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Check,
  Wand2,
  Info,
  Building2,
  FileSpreadsheet,
  ArrowRight,
  Search,
  ExternalLink,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import HashloaderComponent from "@/components/Templates/hashloader";
import DataTable from "@/components/Templates/reacttable";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import Button from "@/components/atoms/Button";
import AButton from "@/components/atoms/Button";
import { useRouter } from "next/navigation";


export default function EmployeeMasterBasicInfoPage() {
  const user = useCurrentUser();

  // Active Tab: 1 = Add Employee, 2 = Update Employee (Table View)
  const [activeTab, setActiveTab] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [showValidationErrors, setShowValidationErrors] = useState<boolean>(false);
  const router = useRouter();


  // Form State
  const [formData, setFormData] = useState({
    EMPCODE: "",
    EMPFIRSTNAME: "",
    EMPLASTNAME: "",
    EMPLOYEEDESIGNATION: "",
    LOCATION: "",
    EMAILID: "",
    MOBILE_NO: "",
    MSPIN: "",
    REPORTING_1: "",
    REPORTING_2: "",
    REPORTING_3: "",
  });

  // Master Dropdown Options
  const [designationOptions, setDesignationOptions] = useState<{ label: string; value: string }[]>([]);
  const [locationOptions, setLocationOptions] = useState<{ label: string; value: string }[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<{ label: string; value: string }[]>([]);

  // Table Data State
  const [tableData, setTableData] = useState<any[]>([]);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("ALL");
  const [tablePage, setTablePage] = useState<number>(1);
  const [tablePageSize, setTablePageSize] = useState<number>(10);

  // Reset page to 1 when filters change
  useEffect(() => {
    setTablePage(1);
  }, [searchFilter, selectedBranchFilter]);

  // Fetch Master Dropdown Options
const fetchMasters = async () => {
  if (!user?.Comp_Code) return;

  try {
    const [mastersRes, empListRes] = await Promise.all([
      // -----------------------------------------
      // DESIGNATION + LOCATION MASTERS
      // -----------------------------------------
      axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/masters`,
        {},
        {
          headers: {
            compcode: user.Comp_Code,
            name: user.name,
          },
        }
      ),

      // -----------------------------------------
      // EMPLOYEE LIST FOR REPORTING DROPDOWNS
      // -----------------------------------------
      axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/findallemp`,
        {
          branch: user?.branch,
        },
        {
          headers: {
            compcode: user.Comp_Code,
            name: user.name,
          },
        }
      ),
    ]);

    // =====================================================
    // DESIGNATION + LOCATION
    // =====================================================
    if (mastersRes?.data?.data) {
      const masters = mastersRes.data.data;

      // Designation
      if (Array.isArray(masters.EMPLOYEEDESIGNATION)) {
        setDesignationOptions(
          masters.EMPLOYEEDESIGNATION.map((item: any) => ({
            label: String(item.label || item.value || ""),
            value: String(item.value || ""),
          }))
        );
      } else {
        setDesignationOptions([]);
      }

      // Location
      if (Array.isArray(masters.LOCATION)) {
        setLocationOptions(
          masters.LOCATION.map((item: any) => ({
            label: String(item.label || item.value || ""),
            value: String(item.value || ""),
          }))
        );
      } else {
        setLocationOptions([]);
      }
    }

    // =====================================================
    // EMPLOYEE REPORTING OPTIONS
    // =====================================================

    /*
      API is already returning:

      {
        success: true,
        data: [
          {
            label: "MA4609 RAJENDRA BAPU PACHARNE",
            value: "MA4609"
          },
          ...
        ]
      }

      So DON'T recreate the label using
      EMPCODE / EMPFIRSTNAME / EMPLASTNAME.
    */

    const rawEmployees = empListRes?.data?.data;

    console.log("Employee API response:", empListRes?.data);
    console.log("Employee branch:", user?.branch);
    console.log("Raw employees:", rawEmployees);

    if (Array.isArray(rawEmployees)) {
      const options = rawEmployees
        .map((item: any) => ({
          label: String(item?.label || "").trim(),
          value: String(item?.value || "").trim(),
        }))
        .filter(
          (item: { label: string; value: string }) =>
            item.value !== ""
        );

      console.log("Reporting dropdown options:", options);

      setEmployeeOptions(options);
    } else {
      console.error(
        "Invalid employee API response:",
        empListRes?.data
      );

      setEmployeeOptions([]);
    }
  } catch (err: any) {
    console.error("Error fetching employee masters:", err);

    console.error(
      "Employee API error response:",
      err?.response?.data
    );

    setEmployeeOptions([]);
  }
};
  // Fetch Employee Table Data
  const fetchTableData = async () => {
    if (!user?.Comp_Code) return;
    setIsLoading(true);
    try {
      const payload = {
        multi_loc12: user?.branch,
        Created_by: user?.name,
      };
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/SmEmplData`,
        payload,
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );
      const rows =
        response?.data?.data ||
        response?.data?.Result ||
        (Array.isArray(response?.data) ? response.data : []);

      if (Array.isArray(rows)) {
        // Sort descending by SRNO or UTD so newly added records are at the top
        const sorted = [...rows].sort((a, b) => {
          const numA = Number(a.SRNO || a.UTD || 0);
          const numB = Number(b.SRNO || b.UTD || 0);
          return numB - numA;
        });
        setTableData(sorted);
      }
    } catch (err) {
      console.error("Error fetching SmEmplData:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate Employee Code
  const handleGenerateCode = async () => {
    if (!user?.Comp_Code) return;
    setIsGeneratingCode(true);
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/generateCode`,
        { branch: user?.branch },
        { headers: { compcode: user?.Comp_Code } }
      );

      if (result.status === 201) {
        Swal.fire({
          icon: "error",
          title: result.data.message || "Failed to generate code",
        });
        return;
      }

      const generatedCode = result?.data?.code || "";
      setFormData((prev) => ({
        ...prev,
        EMPCODE: generatedCode,
      }));
    } catch (err: any) {
      console.error("Generate code error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.response?.data?.message || "Failed to generate code",
      });
    } finally {
      setIsGeneratingCode(false);
    }
  };

  // Initial Load
  useEffect(() => {
    if (!user?.Comp_Code) return;
    fetchMasters();
    fetchTableData();
    if (!formData.EMPCODE && !isEditMode) {
      handleGenerateCode();
    }
  }, [user?.Comp_Code, user?.name, user?.branch]);

  // Tab switch handler
  const handleTabChange = (tab: number) => {
    setActiveTab(tab);
    setShowValidationErrors(false);
    if (tab === 2) {
      fetchTableData();
    }
  };

  // Form input handler
  const handleInputChange = (name: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Reset form
  const handleResetForm = () => {
    setShowValidationErrors(false);
    setFormData({
      EMPCODE: "",
      EMPFIRSTNAME: "",
      EMPLASTNAME: "",
      EMPLOYEEDESIGNATION: "",
      LOCATION: "",
      EMAILID: "",
      MOBILE_NO: "",
      MSPIN: "",
      REPORTING_1: "",
      REPORTING_2: "",
      REPORTING_3: "",
    });
    setIsEditMode(false);
    handleGenerateCode();
  };

  // Edit Employee from table
  const handleEditEmployee = (row: any) => {
    setShowValidationErrors(false);
    setFormData({
      EMPCODE: row.EMPCODE || "",
      EMPFIRSTNAME: row.EMPFIRSTNAME || "",
      EMPLASTNAME: row.EMPLASTNAME || "",
      EMPLOYEEDESIGNATION: row.EMPLOYEEDESIGNATION ? String(row.EMPLOYEEDESIGNATION) : "",
      LOCATION: row.LOCATION ? String(row.LOCATION) : "",
      EMAILID: row.EMAILID || "",
      MOBILE_NO: row.MOBILE_NO || "",
      MSPIN: row.MSPIN || "",
      REPORTING_1: row.REPORTING_1 ? String(row.REPORTING_1) : "",
      REPORTING_2: row.REPORTING_2 ? String(row.REPORTING_2) : "",
      REPORTING_3: row.REPORTING_3 ? String(row.REPORTING_3) : "",
    });
    setIsEditMode(true);
    setActiveTab(1);
  };

  // Calculate missing required fields
  const requiredFields = useMemo(() => {
    const missing: string[] = [];
    if (!formData.EMPFIRSTNAME?.trim()) missing.push("first");
    if (!formData.EMPLASTNAME?.trim()) missing.push("last");
    if (!formData.LOCATION) missing.push("location");
    if (!formData.MOBILE_NO?.trim()) missing.push("mobile");
    if (!formData.EMPCODE?.trim()) missing.push("code");
    return missing;
  }, [formData]);

  // Total filled counter (out of 8 key fields)
  const filledCount = useMemo(() => {
    const keys = [
      "EMPCODE",
      "EMPFIRSTNAME",
      "EMPLASTNAME",
      "EMPLOYEEDESIGNATION",
      "LOCATION",
      "EMAILID",
      "MOBILE_NO",
      "MSPIN",
    ];
    return keys.filter((k) => (formData as any)[k] && String((formData as any)[k]).trim() !== "").length;
  }, [formData]);

  // Save / Update Employee Handler
  const handleSaveEmployee = async () => {
    const isMulti =
      user?.branchName === "MultiLocation" ||
      (user?.branch ? String(user.branch).includes(",") : false);

    if (isMulti) {
      Swal.fire({
        icon: "warning",
        title: "Warning",
        text: "You are in multilocation. Please switch to single branch.",
        confirmButtonText: "OK",
        confirmButtonColor: "#4338CA",
      });
      return;
    }

    if (requiredFields.length > 0) {
      setShowValidationErrors(true);
      Swal.fire({
        icon: "warning",
        title: "Required Fields Missing",
        text: `Please fill required fields: ${requiredFields.join(", ")}`,
      });
      return;
    }

    setIsLoading(true);
    try {
      const defaultEmpMst = {
        EMPCODE: null,
        MSPIN: null,
        TITLE: "Mr.",
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
        Created_by: user?.name || "admin",
        CREATED_BY: user?.name || "admin",
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
        Effective_date: null,
        HRA: null,
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
        Android_ID: "",
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
        MOBILE_RIGHTS: 1,
        CDIST: null,
        PDIST: null,
        DD_CLUB: null,
        RESIGNED_STATUS: null,
        SEPRATION_CATE: null,
        Inserted_By: "Form",
      };

      const fullEmpMst = {
        ...defaultEmpMst,
        EMPCODE: formData.EMPCODE?.trim(),
        EMPFIRSTNAME: formData.EMPFIRSTNAME?.trim(),
        EMPLASTNAME: formData.EMPLASTNAME?.trim(),
        EMPLOYEEDESIGNATION: formData.EMPLOYEEDESIGNATION || null,
        LOCATION: formData.LOCATION || user?.branch || null,
        BRANCH: formData.LOCATION || user?.branch || null,
        Loc_Code: formData.LOCATION || user?.branch || 1,
        Export_Type: 1,
        ServerId: 1,
        TITLE: "Mr.",
        EMAILID: formData.EMAILID || null,
        CORPORATEMAILID: formData.EMAILID || null,
        MOBILE_NO: formData.MOBILE_NO || null,
        MOBILENO: formData.MOBILE_NO || null,
        MSPIN: formData.MSPIN || null,
        Reporting_1: formData.REPORTING_1 || null,
        Reporting_2: formData.REPORTING_2 || null,
        Reporting_3: formData.REPORTING_3 || null,
        Created_by: user?.name || "admin",
        CREATED_BY: user?.name || "admin",
        Inserted_By: "Form",
        MOBILE_RIGHTS: 1,
        Android_ID: "",
      };

      const fullPayload = {
        Comp_Code: user?.Comp_Code,
        Created_by: user?.name || "admin",
        SrNo: null,
        EmpMst: fullEmpMst,
        EmpEdu: [],
        EmpLang: [],
        EmpItSkill: [],
        EmpExperience: [],
        AssetIssue: [],
        EmpFamily: [],
      };

      const formDataToSend = new FormData();
      formDataToSend.append("formData", JSON.stringify(fullPayload));

      if (isEditMode) {
        formDataToSend.append("User", user?.EMPCODE || "");
        formDataToSend.append("LASTMODI_BY", user?.name || "");

        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/employee/update/${formData.EMPCODE}`,
          formDataToSend,
          {
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
              user_id: user?.id,
            },
          }
        );

        if (response?.status === 200) {
          Swal.fire({
            icon: "success",
            title: "Success!",
            text: "Employee basic info updated successfully.",
          });
          await fetchTableData();
          handleResetForm();
        }
      } else {
        const bodyData = {
          Comp_Code: user?.Comp_Code,
          Created_by: user?.name || "admin",
          SrNo: null,
          EmpMst: fullEmpMst,
          ...fullEmpMst,
          formData: fullPayload,
        };

        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/employee/savemini`,
          bodyData,
          {
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
              user_id: user?.id,
            },
          }
        );

        if (response?.status === 200 || response?.status === 201) {
          const assignedCode = response?.data?.finalEmpCode || response?.data?.code || formData.EMPCODE;
          Swal.fire({
            icon: "success",
            title: "Success!",
            text: `Employee created successfully with code: '${assignedCode}'`,
          });
          await fetchTableData();
          handleResetForm();
        }
      }
    } catch (err: any) {
      console.error("Save employee error:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.response?.data?.message || "Failed to save employee information",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to map designation and location labels
  const getDesignationName = (code: any) => {
    if (!code) return "Not set";
    const found = designationOptions.find((d) => d.value === String(code));
    return found ? found.label : String(code);
  };

  const getLocationName = (code: any) => {
    if (!code) return "—";
    const found = locationOptions.find((l) => l.value === String(code));
    return found ? found.label : `Branch - ${code}`;
  };

  // Filtered Table Data for Branch & Search
  const filteredTableData = useMemo(() => {
    const list = tableData.filter((item) => {
      // Branch filter
      if (selectedBranchFilter !== "ALL") {
        if (String(item.LOCATION) !== String(selectedBranchFilter)) {
          return false;
        }
      }
      // Search text filter
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase().trim();
        const fullName = `${item.EMPFIRSTNAME || ""} ${item.EMPLASTNAME || ""}`.toLowerCase();
        const empCode = String(item.EMPCODE || "").toLowerCase();
        const mobile = String(item.MOBILE_NO || "").toLowerCase();
        const desig = getDesignationName(item.EMPLOYEEDESIGNATION).toLowerCase();
        const loc = getLocationName(item.LOCATION).toLowerCase();

        return (
          fullName.includes(q) ||
          empCode.includes(q) ||
          mobile.includes(q) ||
          desig.includes(q) ||
          loc.includes(q)
        );
      }
      return true;
    });

    return list.sort((a, b) => {
      const numA = Number(a.SRNO || a.UTD || 0);
      const numB = Number(b.SRNO || b.UTD || 0);
      return numB - numA;
    });
  }, [tableData, selectedBranchFilter, searchFilter, designationOptions, locationOptions]);

  const totalTableRecords = filteredTableData.length;
  const totalTablePages = Math.max(
    1,
    Math.ceil(totalTableRecords / (tablePageSize === -1 ? totalTableRecords || 1 : tablePageSize))
  );

  const paginatedTableData = useMemo(() => {
    if (tablePageSize === -1) return filteredTableData;
    const start = (tablePage - 1) * tablePageSize;
    return filteredTableData.slice(start, start + tablePageSize);
  }, [filteredTableData, tablePage, tablePageSize]);

  // Branch filter options
  const branchFilterOptions = useMemo(() => {
    const options = [{ label: "All branch", value: "ALL" }];
    locationOptions.forEach((loc) => {
      options.push({ label: loc.label, value: loc.value });
    });
    return options;
  }, [locationOptions]);

  // Table Columns configured for ReactTable
  const columns = useMemo(
    () => [
      {
        Header: "SR. NO.",
        accessor: "SRNO",
        Cell: ({ value, row }: any) => {
          const serialNo = (tablePage - 1) * (tablePageSize === -1 ? 0 : tablePageSize) + row.index + 1;
          return (
            <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8] tabular-nums font-normal">
              {value || serialNo}
            </span>
          );
        },
      },
      {
        Header: "EMPCODE",
        accessor: "EMPCODE",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] tabular-nums font-normal">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "FIRST NAME",
        accessor: "EMPFIRSTNAME",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "LAST NAME",
        accessor: "EMPLASTNAME",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] font-normal">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "MOBILE NO",
        accessor: "MOBILE_NO",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8] tabular-nums font-normal">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "DESIGNATION",
        accessor: "EMPLOYEEDESIGNATION",
        Cell: ({ value }: any) => {
          const desig = getDesignationName(value);
          return (
            <span
              className={`text-[12.5px] font-normal ${desig === "Not set"
                ? "text-[#64748B] dark:text-[#94A3B8]"
                : "text-[#1E293B] dark:text-[#E7ECF3]"
                }`}
            >
              {desig}
            </span>
          );
        },
      },
      {
        Header: "BRANCH",
        accessor: "LOCATION",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8] font-normal">
            {getLocationName(value)}
          </span>
        ),
      },
      {
        Header: "ACTION",
        id: "actions",
        Cell: ({ row }: any) => (
          <button
            type="button"
            onClick={() => handleEditEmployee(row.original)}
            className="flex items-center gap-[6px] border border-[#E2E8F0] dark:border-[#1F2937] bg-transparent text-[#4F46E5] dark:text-[#8B84FF] text-[11.5px] font-[600] px-[11px] py-[5px] rounded-[8px] cursor-pointer whitespace-nowrap hover:bg-[#EEF2FF] dark:hover:bg-[#1E1B4B] transition-colors"
            title="Edit employee"
          >
            <Pencil className="h-3 w-3" />
            <span>Edit</span>
          </button>
        ),
      },
    ],
    [designationOptions, locationOptions, tablePage, tablePageSize]
  );

  // Recently added employees (top 4 from table)
  const recentlyAdded = useMemo(() => {
    return tableData.slice(0, 4);
  }, [tableData]);

  // Avatar color generator
  const getAvatarColors = (index: number) => {
    const palettes = [
      "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
      "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
      "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300",
    ];
    return palettes[index % palettes.length];
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] p-3 sm:p-6 lg:p-7 space-y-4 sm:space-y-5 overflow-x-hidden">
      {/* Top Header & Tab Pills */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-3.5 sm:gap-4">
        <div>
          <h1 className="text-[19px] sm:text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
            Employee master · basic info
          </h1>
          <p className="text-[12px] sm:text-[12.5px] text-[#64748B] dark:text-[#94A3B8] mt-1 break-words">
            Create a record with the minimum required fields, then complete it later in{" "}
            <Link
              href="/payroll/masters/Employee_Master"
              className="text-[#4F46E5] dark:text-[#8B84FF] font-medium hover:underline inline-flex items-center gap-1"
            >
              full Employee Master
              <ExternalLink className="h-3 w-3" />
            </Link>
            .
          </p>
        </div>

        {/* Tab Buttons & Back Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 w-full xl:w-auto shrink-0">
          <AButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard")}
            icon={<ArrowLeft className="h-4 w-4" />}
            className="h-[34px] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[10px] bg-white dark:bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] font-[550] px-3 py-2 cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#182235] whitespace-nowrap shadow-2xs transition-colors shrink-0"
          >
            Back
          </AButton>

          <div className="grid grid-cols-2 sm:flex gap-[3px] bg-[#F8FAFC] dark:bg-[#0E1524] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[10px] p-[3px] w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => handleTabChange(1)}
              className={`flex items-center justify-center gap-1 sm:gap-[7px] border-none rounded-[8px] text-[11px] sm:text-[12.5px] font-[600] px-1.5 sm:px-[14px] py-[7px] sm:py-[8px] cursor-pointer whitespace-nowrap transition-all shrink-0 min-w-0 ${activeTab === 1
                ? "bg-[#4F46E5] text-white shadow-xs"
                : "bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#E7ECF3]"
                }`}
            >
              <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">{isEditMode ? "Edit employee" : "Add employee"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange(2)}
              className={`flex items-center justify-center gap-1 sm:gap-[7px] border-none rounded-[8px] text-[11px] sm:text-[12.5px] font-[600] px-1.5 sm:px-[14px] py-[7px] sm:py-[8px] cursor-pointer whitespace-nowrap transition-all shrink-0 min-w-0 ${activeTab === 2
                ? "bg-[#4F46E5] text-white shadow-xs"
                : "bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#E7ECF3]"
                }`}
            >
              <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">Update employee</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ADD / EDIT EMPLOYEE FORM                                            */}
      {/* ========================================================================= */}
      {activeTab === 1 && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start animate-in fade-in-50 duration-200">
          {/* Main Form Card */}
          <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] overflow-hidden">
            {/* Header & Filled Counter */}
            <div className="flex items-center gap-[10px] px-3 sm:px-[18px] py-[13px] border-b border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0E1524]">
              <span className="grid place-items-center text-[#4F46E5] dark:text-[#8B84FF]">
                <UserPlus className="h-4 w-4" />
              </span>
              <h2 className="m-0 flex-1 text-[13px] font-[600] tracking-[0.04em] uppercase text-[#1E293B] dark:text-[#E7ECF3]">
                {isEditMode ? `Edit employee (${formData.EMPCODE})` : "Add employee"}
              </h2>
              <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] tabular-nums whitespace-nowrap">
                {filledCount}/8 filled
              </span>
            </div>

            {/* Form Fields Grid: 3 columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3.5 p-3 sm:p-[18px]">
              {/* Emp. Code: spans 2 columns */}
              <div className="md:col-span-2">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 min-w-0">
                    <Einput
                      title="Emp. code"
                      redlabel="*"
                      ShortName
                      name="EMPCODE"
                      type="text"
                      placeholder="AU19796361"
                      value={formData.EMPCODE}
                      readOnly={Boolean(formData.EMPCODE || isEditMode)}
                      handleInputChange={handleInputChange}
                      className={`!h-[37px] !rounded-[9px] !text-[13px] ${showValidationErrors && !formData.EMPCODE?.trim()
                        ? "!border-red-400 dark:!border-red-500/80"
                        : "border-[#E2E8F0] dark:border-[#1F2937]"
                      } ${formData.EMPCODE
                        ? "!bg-[#F8FAFC] dark:!bg-[#0E1524]/60 text-[#1E293B] dark:text-[#E7ECF3] cursor-not-allowed select-all"
                        : "bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3]"
                      }`}
                      labelClassName="!text-[11.5px] !font-[550] !text-[#64748B] dark:!text-[#94A3B8]"
                    />
                  </div>
                  {!isEditMode && (
                    <Button
                      type="button"
                      variant="subtle"
                      size="sm"
                      onClick={handleGenerateCode}
                      disabled={isGeneratingCode}
                      loading={isGeneratingCode}
                      icon={!isGeneratingCode ? <Wand2 className="h-3.5 w-3.5 text-[#4F46E5] dark:text-[#8B84FF]" /> : undefined}
                      className="shrink-0 flex items-center gap-1.5 border border-[#E2E8F0] dark:border-[#1F2937] bg-[#EEF2FF] hover:brightness-95 dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF] text-[12px] font-[600] px-3.5 h-[37px] rounded-[9px] cursor-pointer whitespace-nowrap transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-none mb-0"
                    >
                      Generate
                    </Button>
                  )}
                </div>
              </div>

              {/* First Name: spans 1 column */}
              <div>
                <Einput
                  title="First name"
                  redlabel="*"
                  ShortName
                  name="EMPFIRSTNAME"
                  type="text"
                  placeholder="First name"
                  value={formData.EMPFIRSTNAME}
                  handleInputChange={handleInputChange}
                  className={`!h-[37px] !rounded-[9px] !text-[13px] uppercase bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] ${showValidationErrors && !formData.EMPFIRSTNAME?.trim()
                    ? "!border-red-400 dark:!border-red-500/80"
                    : "border-[#E2E8F0] dark:border-[#1F2937]"
                  }`}
                  labelClassName="!text-[11.5px] !font-[550] !text-[#64748B] dark:!text-[#94A3B8]"
                />
              </div>

              {/* Last Name */}
              <div>
                <Einput
                  title="Last name"
                  redlabel="*"
                  ShortName
                  name="EMPLASTNAME"
                  type="text"
                  placeholder="Last name"
                  value={formData.EMPLASTNAME}
                  handleInputChange={handleInputChange}
                  className={`!h-[37px] !rounded-[9px] !text-[13px] uppercase bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] ${showValidationErrors && !formData.EMPLASTNAME?.trim()
                    ? "!border-red-400 dark:border-red-500/80"
                    : "border-[#E2E8F0] dark:border-[#1F2937]"
                  }`}
                  labelClassName="!text-[11.5px] !font-[550] !text-[#64748B] dark:!text-[#94A3B8]"
                />
              </div>

              {/* Designation */}
              <div>
                <Eselect
                  title="Designation"
                  name="EMPLOYEEDESIGNATION"
                  option={designationOptions}
                  initialValue={formData.EMPLOYEEDESIGNATION}
                  handleInputChange={handleInputChange}
                  ShortName
                  placeholder="Select"
                  className="!h-[37px] !rounded-[9px] !text-[13px] border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3]"
                  labelClassName="!text-[11.5px] !font-[550] !text-[#64748B] dark:!text-[#94A3B8]"
                />
              </div>

              {/* Location */}
              <div>
                <Eselect
                  title="Location"
                  redlabel="*"
                  name="LOCATION"
                  option={locationOptions}
                  initialValue={formData.LOCATION}
                  handleInputChange={handleInputChange}
                  ShortName
                  placeholder="Select"
                  className={`!h-[37px] !rounded-[9px] !text-[13px] bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] ${showValidationErrors && !formData.LOCATION
                    ? "!border-red-400 dark:!border-red-500/80"
                    : "border-[#E2E8F0] dark:border-[#1F2937]"
                  }`}
                  labelClassName="!text-[11.5px] !font-[550] !text-[#64748B] dark:!text-[#94A3B8]"
                />
              </div>

              {/* Email */}
              <div>
                <Einput
                  title="Email"
                  ShortName
                  name="EMAILID"
                  type="email"
                  placeholder="name@autovyn.com"
                  value={formData.EMAILID}
                  handleInputChange={handleInputChange}
                  className="!h-[37px] !rounded-[9px] !text-[13px] border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3]"
                  labelClassName="!text-[11.5px] !font-[550] !text-[#64748B] dark:!text-[#94A3B8]"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <Einput
                  title="Mobile number"
                  redlabel="*"
                  ShortName
                  name="MOBILE_NO"
                  type="tel"
                  placeholder="+91"
                  maxLength={10}
                  value={formData.MOBILE_NO}
                  handleInputChange={handleInputChange}
                  className={`!h-[37px] !rounded-[9px] !text-[13px] bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] ${showValidationErrors && !formData.MOBILE_NO?.trim()
                    ? "!border-red-400 dark:!border-red-500/80"
                    : "border-[#E2E8F0] dark:border-[#1F2937]"
                  }`}
                  labelClassName="!text-[11.5px] !font-[550] !text-[#64748B] dark:!text-[#94A3B8]"
                />
              </div>

              {/* MSPIN */}
              <div>
                <Einput
                  title="MSPIN"
                  ShortName
                  name="MSPIN"
                  type="text"
                  placeholder="MSPIN"
                  value={formData.MSPIN}
                  handleInputChange={handleInputChange}
                  className="!h-[37px] !rounded-[9px] !text-[13px] border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3]"
                  labelClassName="!text-[11.5px] !font-[550] !text-[#64748B] dark:!text-[#94A3B8]"
                />
              </div>

              {/* Reporting 1 */}
              <div>
                <Eselect
                  title="Reporting 1"
                  name="REPORTING_1"
                  option={employeeOptions}
                  initialValue={formData.REPORTING_1}
                  handleInputChange={handleInputChange}
                  ShortName
                  placeholder="Select"
                  className="!h-[37px] !rounded-[9px] !text-[13px] border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3]"
                  labelClassName="!text-[11.5px] !font-[550] !text-[#64748B] dark:!text-[#94A3B8]"
                />
              </div>

              {/* Reporting 2 */}
              <div>
                <Eselect
                  title="Reporting 2"
                  name="REPORTING_2"
                  option={employeeOptions}
                  initialValue={formData.REPORTING_2}
                  handleInputChange={handleInputChange}
                  ShortName
                  placeholder="Select"
                  className="!h-[37px] !rounded-[9px] !text-[13px] border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3]"
                  labelClassName="!text-[11.5px] !font-[550] !text-[#64748B] dark:!text-[#94A3B8]"
                />
              </div>

              {/* Reporting 3 */}
              <div>
                <Eselect
                  title="Reporting 3"
                  name="REPORTING_3"
                  option={employeeOptions}
                  initialValue={formData.REPORTING_3}
                  handleInputChange={handleInputChange}
                  ShortName
                  placeholder="Select"
                  className="!h-[37px] !rounded-[9px] !text-[13px] border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3]"
                  labelClassName="!text-[11.5px] !font-[550] !text-[#64748B] dark:!text-[#94A3B8]"
                />
              </div>
            </div>

            {/* Form Footer */}
            <div className="flex flex-wrap items-center gap-2.5 px-3 sm:px-[18px] py-[14px] border-t border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0E1524]">
              <div className="flex-1 min-w-[200px]">
                {requiredFields.length === 0 ? (
                  <span className="text-[12px] font-normal text-[#10B981]">
                    All required fields filled — ready to save.
                  </span>
                ) : showValidationErrors ? (
                  <span className="text-[12px] font-normal text-[#EF4444]">
                    {requiredFields.length} required field(s) left: {requiredFields.join(", ")}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetForm}
                  className="border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#182235] hover:text-[#1E293B] dark:hover:text-[#E7ECF3] text-[12.5px] font-[550] px-[13px] py-[8px] h-[35px] rounded-[10px] cursor-pointer whitespace-nowrap transition-colors"
                >
                  Reset
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSaveEmployee}
                  icon={<Check className="h-4 w-4" />}
                  className="flex items-center gap-[7px] border border-transparent bg-[#4F46E5] hover:brightness-105 text-white text-[12.5px] font-[600] px-[16px] py-[8px] h-[35px] rounded-[10px] cursor-pointer whitespace-nowrap shadow-xs transition-all"
                >
                  {isEditMode ? "Update employee" : "Save employee"}
                </Button>
              </div>
            </div>
          </div>

          {/* Right Sidebar Cards */}
          <div className="flex flex-col gap-[14px]">
            {/* Card 1: What happens next */}
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] p-[16px_18px]">
              <div className="flex items-center gap-2 mb-[11px]">
                <Info className="h-4 w-4 text-[#4F46E5] dark:text-[#8B84FF] shrink-0" />
                <h3 className="m-0 text-[13px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                  What happens next
                </h3>
              </div>
              <div className="flex flex-col gap-[10px]">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10.5px] font-[700] bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF] mt-[1px]">
                    1
                  </span>
                  <span className="flex-1 min-w-0 text-[12px] leading-[1.5] text-[#64748B] dark:text-[#94A3B8]">
                    Record is created with basic info and appears in Employee View immediately.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10.5px] font-[700] bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF] mt-[1px]">
                    2
                  </span>
                  <span className="flex-1 min-w-0 text-[12px] leading-[1.5] text-[#64748B] dark:text-[#94A3B8]">
                    HR completes salary, statutory and document sections in full Employee Master.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10.5px] font-[700] bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF] mt-[1px]">
                    3
                  </span>
                  <span className="flex-1 min-w-0 text-[12px] leading-[1.5] text-[#64748B] dark:text-[#94A3B8]">
                    Employee gets mobile app access once the punch code is assigned.
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Recently added */}
            <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] p-[16px_18px]">
              <h3 className="m-0 mb-[11px] text-[13px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                Recently added
              </h3>
              <div className="flex flex-col">
                {recentlyAdded.length > 0 ? (
                  recentlyAdded.map((emp, idx) => {
                    const initials = `${emp.EMPFIRSTNAME?.[0] || ""}${emp.EMPLASTNAME?.[0] || ""}`.toUpperCase() || "EM";
                    return (
                      <div
                        key={emp.EMPCODE || idx}
                        onClick={() => handleEditEmployee(emp)}
                        className="flex items-center gap-2.5 py-2 border-b border-[#E2E8F0] dark:border-[#1F2937] last:border-b-0 min-w-0 cursor-pointer hover:bg-[#F1F5F9]/60 dark:hover:bg-[#182235]/60 px-1 rounded transition-colors"
                      >
                        <span className="w-[26px] h-[26px] rounded-full shrink-0 flex items-center justify-center text-[10.5px] font-[600] bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF]">
                          {initials}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-[550] text-[#1E293B] dark:text-[#E7ECF3] truncate">
                            {emp.EMPFIRSTNAME} {emp.EMPLASTNAME}
                          </div>
                          <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                            {emp.EMPCODE}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8] py-2 text-center">
                    No records yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: UPDATE EMPLOYEE (REACTTABLE VIEW)                                   */}
      {/* ========================================================================= */}
      {activeTab === 2 && (
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in-50 duration-200">
          {/* Top Search & Filter Bar */}
          <div className="flex items-center gap-3 p-3 sm:p-[14px_18px] border-b border-[#E2E8F0] dark:border-[#1F2937] flex-wrap">
            <div className="flex items-center gap-[9px] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[10px] bg-[#F8FAFC] dark:bg-[#0E1524] px-[11px] py-[7px] w-full sm:w-[300px]">
              <Search className="h-4 w-4 text-[#64748B] dark:text-[#94A3B8] shrink-0" />
              <input
                type="text"
                placeholder="Search name, code, mobile or designation"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="flex-1 min-w-0 border-none outline-none bg-transparent text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] placeholder:text-[#64748B]/70"
              />
            </div>

            <div className="flex-1"></div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchFilter("");
                setSelectedBranchFilter("ALL");
              }}
              className="border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#182235] hover:text-[#1E293B] dark:hover:text-[#E7ECF3] text-[12.5px] font-[550] px-[13px] py-[8px] h-[34px] rounded-[10px] cursor-pointer whitespace-nowrap transition-colors"
            >
              Reset filters
            </Button>
          </div>

          {/* Table Container */}
          <div className="p-3">
            <DataTable
              columns={columns}
              data={paginatedTableData}
              onRowDoubleClick={handleEditEmployee}
              showTopSearch={false}
              showExcelExport={true}
              showPageSizeInFooter={true}
              serverMode={true}
              serverPagination={{
                currentPage: tablePage,
                pageSize: tablePageSize,
                totalPages: totalTablePages,
                totalRecords: totalTableRecords,
              }}
              onServerPageChange={(newPage) => setTablePage(newPage)}
              onServerPageSizeChange={(newSize) => {
                setTablePageSize(newSize);
                setTablePage(1);
              }}
              searchPlaceholder="Search records..."
              height="580px"
            />
          </div>
        </div>
      )}

      {/* Loading overlay */}
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
