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
  Info,
  Building2,
  FileSpreadsheet,
  ArrowRight,
  Search,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import HashloaderComponent from "@/components/Templates/hashloader";
import DataTable from "@/components/Templates/reacttable";
import SelectSearch from "@/components/atoms/Select";
import Button from "@/components/atoms/Button";

export default function EmployeeMasterBasicInfoPage() {
  const user = useCurrentUser();

  // Active Tab: 1 = Add Employee, 2 = Update Employee (Table View)
  const [activeTab, setActiveTab] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

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
    REPORTING1: "",
    REPORTING2: "",
    REPORTING3: "",
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
        axios.post(
          `${process.env.NEXT_PUBLIC_URL}/employee/masters`,
          {},
          { headers: { compcode: user.Comp_Code, name: user.name } }
        ),
        axios.post(
          `${process.env.NEXT_PUBLIC_URL}/employee/findallemp`,
          { branch: user.branch },
          { headers: { compcode: user.Comp_Code, name: user.name } }
        ),
      ]);

      if (mastersRes?.data?.data) {
        const m = mastersRes.data.data;
        if (Array.isArray(m.EMPLOYEEDESIGNATION)) {
          setDesignationOptions(
            m.EMPLOYEEDESIGNATION.map((item: any) => ({
              label: String(item.label || item.value),
              value: String(item.value),
            }))
          );
        }
        if (Array.isArray(m.LOCATION)) {
          setLocationOptions(
            m.LOCATION.map((item: any) => ({
              label: String(item.label || item.value),
              value: String(item.value),
            }))
          );
        }
      }

      if (empListRes?.data?.data && Array.isArray(empListRes.data.data)) {
        setEmployeeOptions(
          empListRes.data.data.map((item: any) => ({
            label: `${item.EMPCODE || ""} - ${item.EMPFIRSTNAME || ""} ${item.EMPLASTNAME || ""}`.trim(),
            value: String(item.EMPCODE || item.value || ""),
          }))
        );
      }
    } catch (err) {
      console.error("Error fetching employee masters:", err);
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
    setFormData({
      EMPCODE: "",
      EMPFIRSTNAME: "",
      EMPLASTNAME: "",
      EMPLOYEEDESIGNATION: "",
      LOCATION: "",
      EMAILID: "",
      MOBILE_NO: "",
      MSPIN: "",
      REPORTING1: "",
      REPORTING2: "",
      REPORTING3: "",
    });
    setIsEditMode(false);
    handleGenerateCode();
  };

  // Edit Employee from table
  const handleEditEmployee = (row: any) => {
    setFormData({
      EMPCODE: row.EMPCODE || "",
      EMPFIRSTNAME: row.EMPFIRSTNAME || "",
      EMPLASTNAME: row.EMPLASTNAME || "",
      EMPLOYEEDESIGNATION: row.EMPLOYEEDESIGNATION ? String(row.EMPLOYEEDESIGNATION) : "",
      LOCATION: row.LOCATION ? String(row.LOCATION) : "",
      EMAILID: row.EMAILID || "",
      MOBILE_NO: row.MOBILE_NO || "",
      MSPIN: row.MSPIN || "",
      REPORTING1: row.REPORTING1 ? String(row.REPORTING1) : "",
      REPORTING2: row.REPORTING2 ? String(row.REPORTING2) : "",
      REPORTING3: row.REPORTING3 ? String(row.REPORTING3) : "",
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
    if (requiredFields.length > 0) {
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
        Reporting_1: formData.REPORTING1 || null,
        Reporting_2: formData.REPORTING2 || null,
        Reporting_3: formData.REPORTING3 || null,
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
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {value || serialNo}
            </span>
          );
        },
      },
      {
        Header: "EMPCODE",
        accessor: "EMPCODE",
        Cell: ({ value }: any) => (
          <span className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "FIRST NAME",
        accessor: "EMPFIRSTNAME",
        Cell: ({ value }: any) => (
          <span className="font-bold text-slate-900 dark:text-white">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "LAST NAME",
        accessor: "EMPLASTNAME",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "MOBILE NO",
        accessor: "MOBILE_NO",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-600 dark:text-slate-400">
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
              className={`font-medium ${desig === "Not set"
                ? "text-slate-400 dark:text-slate-500"
                : "text-slate-800 dark:text-slate-200"
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
          <span className="font-medium text-slate-700 dark:text-slate-300">
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
            className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-black text-slate-700 dark:text-slate-300 hover:text-[#4F46E5] hover:border-indigo-300 dark:hover:text-indigo-400 flex items-center gap-1.5 font-semibold text-xs transition-colors shadow-2xs"
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
    <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-[#060911] text-slate-900 dark:text-white p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header & Tab Pills */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Employee master · basic info
          </h1>
          <p className="text-sm sm:text-[15px] text-slate-500 dark:text-slate-400 mt-1">
            Create a record with the minimum required fields, then complete it later in{" "}
            <Link
              href="/payroll/masters/Employee_Master"
              className="text-[#4F46E5] dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1"
            >
              full Employee Master
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            .
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="inline-flex items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-slate-800 shadow-xs">
          <button
            type="button"
            onClick={() => handleTabChange(1)}
            className={`h-11 px-5 rounded-xl text-sm sm:text-[15px] font-bold flex items-center gap-2.5 transition-all ${activeTab === 1
              ? "bg-[#4F46E5] text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
          >
            <UserPlus className="h-4.5 w-4.5" />
            <span>{isEditMode ? "Edit employee" : "+ Add employee"}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange(2)}
            className={`h-11 px-5 rounded-xl text-sm sm:text-[15px] font-bold flex items-center gap-2.5 transition-all ${activeTab === 2
              ? "bg-[#4F46E5] text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
          >
            <Pencil className="h-4.5 w-4.5" />
            <span>Update employee</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ADD / EDIT EMPLOYEE FORM                                            */}
      {/* ========================================================================= */}
      {activeTab === 1 && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start animate-in fade-in-50 duration-200">
          {/* Main Form Card (Col 8.5) */}
          <div className="xl:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black p-6 sm:p-7 shadow-xs space-y-6">
            {/* Header & Filled Counter */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-[#4F46E5] dark:text-indigo-400 flex items-center justify-center font-bold shadow-2xs">
                  <UserPlus className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-slate-900 dark:text-white">
                    {isEditMode ? `Edit Employee (${formData.EMPCODE})` : "+ Add Employee"}
                  </h2>
                </div>
              </div>

              <div className="text-sm sm:text-[15px] font-semibold text-slate-500 dark:text-slate-400">
                {filledCount}/8 filled
              </div>
            </div>

            {/* Row 1: Emp. code & First name */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
              {/* Emp. Code */}
              <div className="md:col-span-6 space-y-2">
                <label className="block text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Emp. code <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="text"
                    placeholder="AU19796361"
                    value={formData.EMPCODE}
                    readOnly={Boolean(formData.EMPCODE || isEditMode)}
                    onChange={(e) => handleInputChange("EMPCODE", e.target.value)}
                    className={`flex-1 h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 ${
                      formData.EMPCODE
                        ? "bg-slate-50/80 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 font-medium cursor-not-allowed select-all"
                        : "bg-white dark:bg-black text-slate-900 dark:text-white"
                    } placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-[#4F46E5]`}
                  />
                  {!isEditMode && (
                    <Button
                      type="button"
                      onClick={handleGenerateCode}
                      disabled={isGeneratingCode}
                      className="h-12 w-40 px-4.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-[#EEF2FF] hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-[#4F46E5] dark:text-indigo-400 font-bold text-lg flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isGeneratingCode ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[#4F46E5] dark:text-indigo-400" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-[#4F46E5] dark:text-indigo-400" />
                      )}
                      <span>Generate</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* First Name */}
              <div className="md:col-span-6 space-y-2">
                <label className="block text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  First name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="First name"
                  value={formData.EMPFIRSTNAME}
                  onChange={(e) => handleInputChange("EMPFIRSTNAME", e.target.value)}
                  className={`w-full h-12 px-4 rounded-xl border bg-white dark:bg-black text-slate-900 dark:text-white placeholder:text-slate-400 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#4F46E5] uppercase ${!formData.EMPFIRSTNAME && requiredFields.includes("first")
                    ? "border-rose-300 dark:border-rose-800/80"
                    : "border-slate-300 dark:border-slate-700"
                    }`}
                />
              </div>
            </div>

            {/* Row 2: Last name, Designation, Location */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Last Name */}
              <div className="space-y-2">
                <label className="block text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Last name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Last name"
                  value={formData.EMPLASTNAME}
                  onChange={(e) => handleInputChange("EMPLASTNAME", e.target.value)}
                  className={`w-full h-12 px-4 rounded-xl border bg-white dark:bg-black text-slate-900 dark:text-white placeholder:text-slate-400 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#4F46E5] uppercase ${!formData.EMPLASTNAME && requiredFields.includes("last")
                    ? "border-rose-300 dark:border-rose-800/80"
                    : "border-slate-300 dark:border-slate-700"
                    }`}
                />
              </div>

              {/* Designation */}
              <div>
                <SelectSearch
                  title="Designation"
                  name="EMPLOYEEDESIGNATION"
                  options={designationOptions}
                  selectedValue={formData.EMPLOYEEDESIGNATION}
                  handleInputChange={handleInputChange}
                  labelClass="text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2"
                  className="h-12 text-base font-medium rounded-xl border-slate-300 dark:border-slate-700"
                  placeholder="Select"
                />
              </div>

              {/* Location */}
              <div>
                <SelectSearch
                  title="Location"
                  redlabel="*"
                  name="LOCATION"
                  options={locationOptions}
                  selectedValue={formData.LOCATION}
                  handleInputChange={handleInputChange}
                  labelClass="text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2"
                  className={`h-12 text-base font-medium rounded-xl ${!formData.LOCATION && requiredFields.includes("location")
                    ? "border-rose-300 dark:border-rose-800"
                    : "border-slate-300 dark:border-slate-700"
                    }`}
                  placeholder="Select"
                />
              </div>
            </div>

            {/* Row 3: Email, Mobile number, MSPIN */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Email */}
              <div className="space-y-2">
                <label className="block text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="name@autovyn.com"
                  value={formData.EMAILID}
                  onChange={(e) => handleInputChange("EMAILID", e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white placeholder:text-slate-400 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>

              {/* Mobile Number */}
              <div className="space-y-2">
                <label className="block text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Mobile number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="+91"
                  maxLength={10}
                  value={formData.MOBILE_NO}
                  onChange={(e) => handleInputChange("MOBILE_NO", e.target.value)}
                  className={`w-full h-12 px-4 rounded-xl border bg-white dark:bg-black text-slate-900 dark:text-white placeholder:text-slate-400 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#4F46E5] ${!formData.MOBILE_NO && requiredFields.includes("mobile")
                    ? "border-rose-300 dark:border-rose-800/80"
                    : "border-slate-300 dark:border-slate-700"
                    }`}
                />
              </div>

              {/* MSPIN */}
              <div className="space-y-2">
                <label className="block text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  MSPIN
                </label>
                <input
                  type="text"
                  placeholder="MSPIN"
                  value={formData.MSPIN}
                  onChange={(e) => handleInputChange("MSPIN", e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white placeholder:text-slate-400 text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>
            </div>

            {/* Row 4: Reporting 1, Reporting 2, Reporting 3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <SelectSearch
                  title="Reporting 1"
                  name="REPORTING1"
                  options={employeeOptions}
                  selectedValue={formData.REPORTING1}
                  handleInputChange={handleInputChange}
                  labelClass="text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2"
                  className="h-12 text-base font-medium rounded-xl border-slate-300 dark:border-slate-700"
                  placeholder="Select"
                />
              </div>

              <div>
                <SelectSearch
                  title="Reporting 2"
                  name="REPORTING2"
                  options={employeeOptions}
                  selectedValue={formData.REPORTING2}
                  handleInputChange={handleInputChange}
                  labelClass="text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2"
                  className="h-12 text-base font-medium rounded-xl border-slate-300 dark:border-slate-700"
                  placeholder="Select"
                />
              </div>

              <div>
                <SelectSearch
                  title="Reporting 3"
                  name="REPORTING3"
                  options={employeeOptions}
                  selectedValue={formData.REPORTING3}
                  handleInputChange={handleInputChange}
                  labelClass="text-[14px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2"
                  className="h-12 text-base font-medium rounded-xl border-slate-300 dark:border-slate-700"
                  placeholder="Select"
                />
              </div>
            </div>

            {/* Form Footer */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <div>
                {requiredFields.length > 0 ? (
                  <p className="text-sm font-semibold text-rose-500 dark:text-rose-400">
                    {requiredFields.length} required field(s) left: {requiredFields.join(", ")}
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    All required fields filled
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="h-12 px-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-black text-slate-700 dark:text-slate-200 text-[15px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
                >
                  <RotateCcw className="h-4 w-4 inline mr-1.5" />
                  Reset
                </button>

                <button
                  type="button"
                  onClick={handleSaveEmployee}
                  className="h-12 px-7 rounded-xl bg-[#4F46E5] hover:bg-[#433df0] text-white text-[15px] font-semibold flex items-center gap-2 shadow-sm transition-colors"
                >
                  <CheckCircle2 className="h-4.5 w-4.5" />
                  <span>{isEditMode ? "Update employee" : "Save employee"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar Cards (Col 3.5) */}
          <div className="xl:col-span-4 space-y-6">
            {/* Card 1: What happens next */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-base">
                <Info className="h-5 w-5 text-indigo-500 shrink-0" />
                <span>What happens next</span>
              </div>

              <div className="space-y-4 pt-1">
                {/* Step 1 */}
                <div className="flex items-start gap-3.5">
                  <div className="h-7 w-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-indigo-100 dark:border-indigo-900">
                    1
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    Record is created with basic info and appears in Employee View immediately.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3.5">
                  <div className="h-7 w-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-indigo-100 dark:border-indigo-900">
                    2
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    HR completes salary, statutory and document sections in full Employee Master.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3.5">
                  <div className="h-7 w-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-indigo-100 dark:border-indigo-900">
                    3
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    Employee gets mobile app access once the punch code is assigned.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Recently added */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black p-6 shadow-xs space-y-4">
              <div className="text-slate-900 dark:text-white font-bold text-base">
                Recently added
              </div>

              {recentlyAdded.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {recentlyAdded.map((emp, idx) => {
                    const initials = `${emp.EMPFIRSTNAME?.[0] || ""}${emp.EMPLASTNAME?.[0] || ""}`.toUpperCase() || "EM";
                    return (
                      <div
                        key={emp.EMPCODE || idx}
                        onClick={() => handleEditEmployee(emp)}
                        className="py-3.5 first:pt-0 last:pb-0 flex items-center gap-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 p-2 rounded-xl transition-colors"
                      >
                        <div
                          className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 select-none ${getAvatarColors(
                            idx
                          )}`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                            {emp.EMPFIRSTNAME} {emp.EMPLASTNAME}
                          </h4>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">
                            {emp.EMPCODE}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500 py-3 text-center">
                  No records yet
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: UPDATE EMPLOYEE (REACTTABLE VIEW)                                   */}
      {/* ========================================================================= */}
      {activeTab === 2 && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          {/* Top Search & Filter Bar */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-black shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[280px] max-w-lg">
                <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search name, code, mobile or designation..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4F46E5] transition-all"
                />
              </div>

              {/* Branch Filter Dropdown */}
              {/* <div className="min-w-[180px]">
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-black text-slate-700 dark:text-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F46E5] cursor-pointer transition-all"
                >
                  {branchFilterOptions.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </div> */}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSearchFilter("");
                  setSelectedBranchFilter("ALL");
                }}
                className="h-11 px-4.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-black text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                <span>Reset filters</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="w-full">
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
