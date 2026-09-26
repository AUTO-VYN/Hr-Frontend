"use client";
import {
  SlidersHorizontal,
  IndianRupee,
  Landmark,
  Wallet,
  Save,
  Lock,
  LockOpen,
  RotateCw,
  ScanLine,
  History,
  ArrowLeft,
  HelpCircle,
  X,
  CheckCircle,
  Plus,
  Upload,
  BadgeCheck,
  GitFork,
  Check,
  Wand2,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Eselect from "@/components/atoms/Eselect";
import SelectSearch from "@/components/atoms/Select";
import { useFormData } from "../Employee_Master/Context/FormDataContext";
import { Button } from "@/components/ui/button";
import { FaEllipsisH } from "react-icons/fa";
import { Checkbox } from "antd";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import HashloaderComponent from "@/components/Templates/hashloader";
import { AiOutlineCloseCircle, AiOutlineQuestionCircle } from "react-icons/ai";
import LottieAnimation from "@/components/atoms/LottieAnimation";
import { useSecureStorage } from "@/app/hooks/comp-key-data";
import { useToast } from "@/app/hooks/useToast";
import Einput from "@/components/atoms/Einput";

const SalaryDetails = ({
  disapleForSalary = false,
  isActiveTab = true,
  isMandatory: isMandatoryProp,
  masterData = {},
}: any) => {
  const router = useRouter();
  const [profileSrc, setProfileSrc] = useState<string | null>(null);
  const [profileSrc1, setProfileSrc1] = useState<File | null>(null);
  const [selectedEmpSrNo, setSelectedEmpSrNo] = useState<string>("");
  const [isNewEmployee, setIsNewEmployee] = useState<boolean>(false);
  const [empcodeOptions, setEmpcodeOptions] = useState<any[]>([]);
  const [EMPLOYEEDESIGNATIONoption, setEMPLOYEEDESIGNATIONoption] = useState<any[]>([]);
  const [CHANEELOPTION, setCHANEELOPTION] = useState<any[]>([]);
  const [CLUSTEROPTION, setCLUSTEROPTION] = useState<any[]>([]);
  const [locationnoption, setlocationnoption] = useState<any[]>([]);
  const [SECTIONoption, setSECTIONoption] = useState<any[]>([]);
  const [divisionoption, setdivisionoption] = useState<any[]>([]);

  const MrOptions = [
    { value: "mr.", label: "Mr." },
    { value: "mrs.", label: "Mrs." },
    { value: "miss.", label: "Miss." },
    { value: "dr.", label: "Dr." },
    { value: "prof.", label: "Prof." },
  ];
  const GenderOptions = [
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
    { value: "Other", label: "Other" },
  ];
  const Type = [
    { value: "1", label: "Regular" },
    { value: "2", label: "Retainer" },
    { value: "3", label: "Apprentice" },
  ];

  const isMandatory = (field: string) => {
    if (typeof isMandatoryProp === "function") {
      return isMandatoryProp(field);
    }
    return false;
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

  const SLTY = [
    { value: "0", label: "NEW JOINING" },
    { value: "1", label: "INCREMENT" },
  ];

  const PFYN = [
    { value: "1", label: "YES" },
    { value: "0", label: "NO" },
  ];
  const yesno = [
    { value: "1", label: "YES" },
    { value: "0", label: "NO" },
  ];
  const pfper = [
    { value: "12", label: "12" },
    { value: "24", label: "24" },
    { value: "25", label: "25" },
  ];
  const LWFYESNO = [
    { value: "1", label: "YES" },
    { value: "0", label: "NO" },
  ];
  const WEEKLYOFF = [
    { value: "0", label: "Sunday" },
    { value: "1", label: "Monday" },
    { value: "2", label: "Tuesday" },
    { value: "3", label: "Wednesday" },
    { value: "4", label: "Thursday" },
    { value: "5", label: "Friday" },
    { value: "6", label: "Saturday" },
    { value: "7", label: "No Woff" },
  ];
  const BONUS = [
    { value: "1", label: "YES" },
    { value: "0", label: "NO" },
  ];
  const DDCLUBOPTION = [
    { value: "0", label: "0" },
    { value: "50", label: "50" },
    { value: "100", label: "100" },
  ];
  const ProTax = [
    { value: "1", label: "YES" },
    { value: "0", label: "NO" },
  ];
  const ACCOUNT_TYPE = [
    { value: "Employee A/C", label: "Employee A/C" },
    { value: "Salary A/C", label: "Salary A/C" },
    { value: "Saving A/C", label: "Saving A/C" },
    { value: "Current A/C", label: "Current A/C" },
  ];

  const PmtMode = [
    { value: "Bank Transfer", label: "Bank Transfer" },
    { value: "Cheque", label: "Cheque" },
    { value: "Cash", label: "Cash" },
    { value: "NEFT", label: "NEFT" },
    { value: "Other", label: "Other" },
    { value: "Salary Hold", label: "Salary Hold" },
  ];

  const convertValuesToString = (array: any) => {
    if (!array || !Array.isArray(array)) return [];
    return array.map((obj) => {
      return {
        label: obj.label,
        value: String(obj.value),
      };
    });
  };

  const user = useCurrentUser();
  const { compdata } = useSecureStorage();

  const [SalRegionoption, setSalRegionoption] = useState([]);
  useEffect(() => {
    if (masterData?.Sal_Region?.length) {
      setSalRegionoption(convertValuesToString(masterData.Sal_Region));
    }
  }, [masterData?.Sal_Region]);

  useEffect(() => {
    if (masterData?.EmpPunchType?.length) {
      setPunchType(convertValuesToString(masterData.EmpPunchType));
    }
  }, [masterData?.EmpPunchType]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDialogOpen1, setIsDialogOpen1] = useState(false);
  const [isDialogOpen2, setIsDialogOpen2] = useState(false);
  const [isDialogOpen3, setIsDialogOpen3] = useState(false);
  const [falg, setFalg] = useState(true);
  const [falg1, setFalg1] = useState(true);
  const [data, setData] = useState([]);
  const [EmpShift, setEmpShift] = useState([]);
  const [SalaryData, setSalaryData] = useState([]);
  const [Bankoption, setBankoption] = useState([]);
  const { formData, setFormData } = useFormData();
  const [salaryMessage, setSalaryMessage] = useState("");
  const [salarystatus, setsalarystatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [PFPERCoption, setPFPERCoption] = useState([]);
  const [GRADEoption, setGRADEoption] = useState([]);
  const [PunchType, setPunchType] = useState([]);
  const [isSalarySaved, setIsSalarySaved] = useState(false);
  const [salaryType, setSalaryType] = useState("");
  const [IsVerifyAccountApi, setIsVerifyAccountApi] = useState(false);
  const [ViewAccountData, SetViewAccountData] = useState(false);
  const [showAccountTooltip, setshowAccountTooltip] = useState(false);
  const [AccountData, setAccountData] = useState(null);
  const [accountStatusCode, setAccountStatusCode] = useState(null);
  const [accountButtonVariant, setAccountButtonVariant] = useState<
    "save" | "update"
  >("save");
  const [accountButtonLabel, setAccountButtonLabel] = useState<
    "Verify" | "Verified"
  >("Verify");

  const [IsVerifyIFSCApi, setIsVerifyIFSCApi] = useState(false);
  const [ViewIFSCData, setViewIFSCData] = useState(false);
  const [showIFSCTooltip, setshowIFSCTooltip] = useState(false);
  const [IFSCData, setIFSCData] = useState(null);
  const [IFSCButtonVariant, setIFSCButtonVariant] = useState<"save" | "update">(
    "save",
  );
  const [IFSCButtonLabel, setIFSCButtonLabel] = useState<"Verify" | "Verified">(
    "Verify",
  );
  const [isBankLocked, setIsBankLocked] = useState(false);
  const [confirmAccountDisabled, setConfirmAccountDisabled] = useState(false);
  const [isEmpCodeGenerated, setIsEmpCodeGenerated] = useState(false);

  const initialBankDetailsRef = useRef<{
    BANKNAME?: string;
    ACCOUNT_TYPE?: string;
    BANKACCOUNTNO?: string;
    BRANCH?: string;
    PAYMENTMODE?: string;
    ifsc_code?: string;
    Emp_Ac_Name?: string;
    Sal_Hold?: string;
  } | null>(null);

  const fetchEmpList = async () => {
    if (!user?.Comp_Code) return;
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/findallemp`,
        { branch: user?.branch },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );
      if (result.data?.data) {
        setEmpcodeOptions(result.data.data);
      }
    } catch (err) {
      console.error("Error fetching employee list:", err);
    }
  };

  useEffect(() => {
    fetchEmpList();
  }, [user?.Comp_Code, user?.name, user?.branch]);

  const handleEmpChange = async (name: string, value: string | number) => {
    try {
      if (!value || value.toString().trim() === "" || value.toString().trim() === "null") {
        setSelectedEmpSrNo("");
        return;
      }
      setSelectedEmpSrNo(String(value));
      setIsNewEmployee(false);
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

      const { ApprMst, EmpMst } = response.data?.data || {};
      const { approver1_A, approver2_A, approver3_A } = ApprMst || {};

      setFormData({
        ...response.data?.data,
        EmpMst: {
          ...EmpMst,
          Reporting_1: approver1_A,
          Reporting_2: approver2_A,
          Reporting_3: approver3_A,
          Cnf_BANKACCOUNTNO: EmpMst?.BANKACCOUNTNO,
          [name]: value,
        },
      });

      initialBankDetailsRef.current = {
        BANKNAME: EmpMst?.BANKNAME,
        ACCOUNT_TYPE: EmpMst?.ACCOUNT_TYPE,
        BANKACCOUNTNO: EmpMst?.BANKACCOUNTNO,
        BRANCH: EmpMst?.BRANCH,
        PAYMENTMODE: EmpMst?.PAYMENTMODE,
        ifsc_code: EmpMst?.ifsc_code,
        Emp_Ac_Name: EmpMst?.Emp_Ac_Name,
        Sal_Hold: EmpMst?.Sal_Hold,
      };

      if (response.data?.data?.EmpMst?.profile) {
        setProfileSrc(response.data.data.EmpMst.profile);
      } else if (response.data?.data?.EmpMst?.photo) {
        setProfileSrc(`data:image/jpeg;base64,${response.data.data.EmpMst.photo}`);
      } else {
        setProfileSrc(null);
      }
      setProfileSrc1(null);
      setIsEmpCodeGenerated(true);
    } catch (error) {
      console.error("Error loading employee data:", error);
    }
  };

  const Generatecode = async () => {
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/generateCode`,
        { branch: user?.branch },
        {
          headers: {
            compcode: user?.Comp_Code,
          },
        },
      );

      if (result.status === 201) {
        await Swal.fire({
          icon: "error",
          title: result.data.message,
          text: "",
        });
        return;
      }

      const code = result?.data?.code;
      setSelectedEmpSrNo("");
      setIsNewEmployee(true);
      setFormData((prev: any) => ({
        ...prev,
        SrNo: "",
        EmpMst: {
          ...prev?.EmpMst,
          EMPCODE: code,
          SrNo: "",
        },
      }));
      setIsEmpCodeGenerated(true);
    } catch (error) {
      console.error("Error generating code:", error);
    }
  };

  const handleFileChange = (event: any) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        setProfileSrc(e.target.result);
      };
      reader.readAsDataURL(file);
      setProfileSrc1(file);
    }
  };

  const handleReset = () => {
    initialBankDetailsRef.current = null;
    setSelectedEmpSrNo("");
    setIsNewEmployee(false);
    setFormData((prev: any) => ({
      ...prev,
      SrNo: "",
      EmpMst: {
        ...prev?.EmpMst,
        EMPCODE: "",
        EMPFIRSTNAME: "",
        EMPLASTNAME: "",
        PAY_CODE: "",
        TITLE: "",
        GENDER: "",
        EmpType: "",
        EMPLOYEEDESIGNATION: "",
        Sal_Region: "",
        CHANNEL: "",
        CLUSTER: "",
        LOCATION: "",
        SECTION: "",
        DIVISION: "",
        photo: null,
      },
    }));
    setProfileSrc(null);
    setProfileSrc1(null);
    setIsEmpCodeGenerated(false);
  };

  const handleLocationChange = async (name: string, value: string | number) => {
    handleInputChange(name, value);
  };

  const hasBankDetailsChanged = () => {
    if (!initialBankDetailsRef.current || !formData?.EmpMst?.EMPCODE)
      return false;
    const init = initialBankDetailsRef.current;
    const current = formData.EmpMst;

    const norm = (v: any) =>
      v === null || v === undefined ? "" : String(v).trim();

    return (
      norm(init.BANKNAME) !== norm(current.BANKNAME) ||
      norm(init.ACCOUNT_TYPE) !== norm(current.ACCOUNT_TYPE) ||
      norm(init.BANKACCOUNTNO) !== norm(current.BANKACCOUNTNO) ||
      norm(init.BRANCH) !== norm(current.BRANCH) ||
      norm(init.PAYMENTMODE) !== norm(current.PAYMENTMODE) ||
      norm(init.ifsc_code) !== norm(current.ifsc_code) ||
      norm(init.Emp_Ac_Name) !== norm(current.Emp_Ac_Name) ||
      norm(init.Sal_Hold) !== norm(current.Sal_Hold)
    );
  };

  const updateBankDetailsFromDialog = async (): Promise<boolean> => {
    if (!formData?.EmpMst?.EMPCODE) {
      showSideAlert("Please enter Employee Code", "warning");
      return false;
    }

    const skipBankValidation = ["Cash", "Salary Hold"].includes(
      formData?.EmpMst?.PAYMENTMODE,
    );

    if (!skipBankValidation) {
      const missingFields: string[] = [];
      if (!formData?.EmpMst?.BANKNAME) missingFields.push("Bank Name");
      if (!formData?.EmpMst?.BANKACCOUNTNO) missingFields.push("Account No");
      if (!formData?.EmpMst?.Cnf_BANKACCOUNTNO)
        missingFields.push("Confirm Account No");
      if (!formData?.EmpMst?.ifsc_code) missingFields.push("IFSC Code");
      if (!formData?.EmpMst?.BRANCH) missingFields.push("Branch Name");
      if (!formData?.EmpMst?.Emp_Ac_Name)
        missingFields.push("Account Holder Name");
      if (!formData?.EmpMst?.ACCOUNT_TYPE) missingFields.push("Account Type");
      if (!formData?.EmpMst?.PAYMENTMODE) missingFields.push("Payment Mode");

      if (missingFields.length > 0) {
        showSideAlert(
          `Please enter ${missingFields.join(", ")}`,
          "warning",
        );
        return false;
      }

      const accNo = formData?.EmpMst?.BANKACCOUNTNO?.toString() || "";
      const cnfAccNo = formData?.EmpMst?.Cnf_BANKACCOUNTNO?.toString() || "";

      if (accNo.length < 10 || cnfAccNo.length < 10) {
        showSideAlert(
          "Account numbers must be at least 10 digits long.",
          "warning",
        );
        return false;
      }

      if (accNo !== cnfAccNo) {
        showSideAlert(
          "Account No and Confirm Account No do not match.",
          "warning",
        );
        return false;
      }
    } else {
      if (!formData?.EmpMst?.PAYMENTMODE) {
        showSideAlert("Please enter Payment Mode", "warning");
        return false;
      }
    }

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmpMaster/UpdateBankdetails`,
        {
          EmpCode: formData?.EmpMst?.EMPCODE,
          LOGINEMPCODE: user?.EMPCODE,
          Loc_code: user?.branch,
          Sal_Hold: formData?.EmpMst?.Sal_Hold,
          BANKNAME: formData?.EmpMst?.BANKNAME,
          ACCOUNT_TYPE: formData?.EmpMst?.ACCOUNT_TYPE,
          BANKACCOUNTNO: formData?.EmpMst?.BANKACCOUNTNO,
          BRANCH: formData?.EmpMst?.BRANCH,
          PAYMENTMODE: formData?.EmpMst?.PAYMENTMODE,
          ifsc_code: formData?.EmpMst?.ifsc_code,
          Emp_Ac_Name: formData?.EmpMst?.Emp_Ac_Name,
          EmpMasterOtp: compdata?.EmpMasterOtp,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      initialBankDetailsRef.current = {
        BANKNAME: formData?.EmpMst?.BANKNAME,
        ACCOUNT_TYPE: formData?.EmpMst?.ACCOUNT_TYPE,
        BANKACCOUNTNO: formData?.EmpMst?.BANKACCOUNTNO,
        BRANCH: formData?.EmpMst?.BRANCH,
        PAYMENTMODE: formData?.EmpMst?.PAYMENTMODE,
        ifsc_code: formData?.EmpMst?.ifsc_code,
        Emp_Ac_Name: formData?.EmpMst?.Emp_Ac_Name,
        Sal_Hold: formData?.EmpMst?.Sal_Hold,
      };

      showSideAlert(
        result.data?.Message || "Bank details updated successfully",
        "success",
      );
      return true;
    } catch (error: any) {
      console.error("Error updating bank details from dialog:", error);
      showSideAlert(
        error?.response?.data?.Message || "Failed to update bank details",
        "error",
      );
      return false;
    }
  };

  const handleUpdateEmployee = async () => {
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

    if (hasBankDetailsChanged()) {
      const result = await Swal.fire({
        icon: "warning",
        title: "Bank Details Not Updated!",
        html: `
          <div style="font-size: 15px; color: #374151; line-height: 1.6; margin-top: 8px;">
            You have <span style="color: #dc2626; font-weight: 700;">changed the Bank Details</span>, but the <b>Update</b> button was not clicked yet.
            <br /><br />
            <b>Do you want to update the Bank Details now?</b>
          </div>
        `,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "Yes, Update Bank Details",
        denyButtonText: "Continue Without Updating",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#163761",
        denyButtonColor: "#b45309",
        cancelButtonColor: "#5a6772",
        reverseButtons: true,
        didOpen: (popup) => {
          const actions = popup.querySelector(".swal2-actions") as HTMLElement;
          const confirmBtn = popup.querySelector(
            ".swal2-confirm",
          ) as HTMLElement;
          const denyBtn = popup.querySelector(".swal2-deny") as HTMLElement;
          const cancelBtn = popup.querySelector(
            ".swal2-cancel",
          ) as HTMLElement;

          if (actions) {
            actions.style.display = "flex";
            actions.style.flexWrap = "wrap";
            actions.style.justifyContent = "center";
            actions.style.gap = "10px";
            actions.style.maxWidth = "420px";
            actions.style.margin = "1.5rem auto 0.5rem";
          }
          if (cancelBtn) {
            cancelBtn.style.order = "1";
            cancelBtn.style.backgroundColor = "#5a6772";
            cancelBtn.style.color = "#ffffff";
            cancelBtn.style.borderRadius = "6px";
            cancelBtn.style.padding = "9px 18px";
            cancelBtn.style.fontWeight = "600";
            cancelBtn.style.fontSize = "13px";
            cancelBtn.style.margin = "0";
            cancelBtn.style.boxShadow = "none";
          }
          if (denyBtn) {
            denyBtn.style.order = "2";
            denyBtn.style.backgroundColor = "#b45309";
            denyBtn.style.color = "#ffffff";
            denyBtn.style.borderRadius = "6px";
            denyBtn.style.padding = "9px 16px";
            denyBtn.style.fontWeight = "600";
            denyBtn.style.fontSize = "13px";
            denyBtn.style.margin = "0";
            denyBtn.style.boxShadow = "none";
          }
          if (confirmBtn) {
            confirmBtn.style.order = "3";
            confirmBtn.style.backgroundColor = "#163761";
            confirmBtn.style.color = "#ffffff";
            confirmBtn.style.borderRadius = "6px";
            confirmBtn.style.padding = "9px 22px";
            confirmBtn.style.fontWeight = "600";
            confirmBtn.style.fontSize = "13px";
            confirmBtn.style.margin = "4px 0 0 0";
            confirmBtn.style.boxShadow = "none";
          }
        },
      });

      if (result.isConfirmed) {
        const ok = await updateBankDetailsFromDialog();
        if (!ok) return;
      } else if (result.isDenied) {
        // Continue without updating bank details
      } else {
        // Canceled or dismissed
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

    const empCode = formData?.EmpMst?.EMPCODE;
    if (!empCode || empCode.toString().trim() === "") {
      Swal.fire({
        icon: "warning",
        title: "Please enter or select an Employee Code",
      });
      return;
    }

    if (!formData?.EmpMst?.EMPFIRSTNAME || formData?.EmpMst?.EMPFIRSTNAME.toString().trim() === "") {
      Swal.fire({
        icon: "warning",
        title: "First Name is required",
      });
      return;
    }

    setIsLoading(true);
    try {
      const formDataToSend = new FormData();
      if (Object.keys(formData).length > 0) {
        formDataToSend.append("formData", JSON.stringify(formData));
      }
      if (profileSrc1) {
        const fileName = uuidv4();
        const fileType = profileSrc1.type?.split("/")[1] || "jpeg";
        formDataToSend.append(
          "profile",
          profileSrc1,
          `${fileName}.${fileType}`,
        );
      }
      formDataToSend.append("User", user?.EMPCODE || user?.name || "");
      formDataToSend.append("LASTMODI_BY", user?.name || "");

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/update/${empCode}`,
        formDataToSend,
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
            user_id: user?.id,
          },
        },
      );

      if (response.status === 200) {
        initialBankDetailsRef.current = null;
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Employee updated successfully.",
        });
        fetchEmpList();
      }
    } catch (error: any) {
      console.error("Error updating employee:", error);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: error?.response?.data?.Message || error?.message || "Failed to update employee.",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

    const pfNo = formData?.EmpMst?.PFNO;
    const pfPer = formData?.EmpMst?.pfper;

    // If PF = Yes (assuming "1" = Yes)
    if (pfNo === "1" || pfNo === 1) {
      if (!pfPer || pfPer === "" || pfPer === null) {
        showSideAlert("Please select PF % when PF is Yes.", "warning");
        return;
      }
    }

    const empCode = formData?.EmpMst?.EMPCODE;
    if (!empCode || empCode.toString().trim() === "") {
      Swal.fire({
        icon: "warning",
        title: "Please generate or enter an Employee Code",
      });
      return;
    }

    if (!formData?.EmpMst?.EMPFIRSTNAME || formData?.EmpMst?.EMPFIRSTNAME.toString().trim() === "") {
      Swal.fire({
        icon: "warning",
        title: "First Name is required",
      });
      return;
    }

    setIsLoading(true);
    try {
      const formDataToSend = new FormData();
      if (Object.keys(formData).length > 0) {
        formDataToSend.append("formData", JSON.stringify(formData));
      }
      if (profileSrc1) {
        const fileName = uuidv4();
        const fileType = profileSrc1.type?.split("/")[1] || "jpeg";
        formDataToSend.append(
          "profile",
          profileSrc1,
          `${fileName}.${fileType}`,
        );
      }
      formDataToSend.append("User", user?.EMPCODE || user?.name || "");
      formDataToSend.append("LASTMODI_BY", user?.name || "");

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

      if (response.status === 200) {
        const assignedCode = response.data?.finalEmpCode || empCode;
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: `Data submitted successfully and Assigned code: '${assignedCode}'`,
        });
        fetchEmpList();
      }
    } catch (error: any) {
      console.error("Error saving employee:", error);
      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: error?.response?.data?.Message || error?.message || "Failed to save employee.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isEditMode = Boolean(!isNewEmployee && (selectedEmpSrNo || formData?.EmpMst?.SrNo));

  const isEmpCodeReadOnly = Boolean(
    isEmpCodeGenerated ||
    formData?.EmpMst?.EMPCODE ||
    formData?.EmpMst?.UTD ||
    formData?.EmpMst?.SrNo
  );

  function getCurrentDate(monthsBack = 0) {
    const today = new Date();
    today.setMonth(today.getMonth() - monthsBack);
    const year = today.getFullYear();
    let month = today.getMonth() + 1;
    let day = today.getDate();
    if (month < 10) {
      month = "0" + month;
    }
    if (day < 10) {
      day = "0" + day;
    }
    return `${year}-${month}-${day}`;
  }

  useEffect(() => {
    setFalg(true);
    setFalg1(true);
  }, [formData.EmpMst.EMPCODE]);

  const [formData1, setFormData1] = useState({
    Salary_Type: null,
    Proposed_Salary: null,
    Daily_Wages: null,
    PF_Date: null,
    PFNO: null,
    UAN_No: null,
    pfnumber: null,
    PF: null,
    pfper: null,
    ESI_Date: null,
    esinumber: null,
    ESINO: null,
    LWFNO: null,
    WEEKLYOFF: null,
    BONUS: null,
    pro_tax: null,
    EMP_SHIFT: null,
    account_verified: null,
    Sal_Hold: null,
    Sal_Region: null,
    Punch_Type: null,
    ANNUAL_CTC: null,
    LWF: null,
    PFSALARY_LIMIT: null,
    BONUS_AMOUNT: null,
    Gratuity: null,
    Effective_date: null,
    Basic: null,
    HRA: null,
    Conveyance: null,
    Medical: null,
    Other: null,
    DA: null,
    Washing: null,
    EMP_SALARY: null,
    SALARYLWF: null,
    CTC: null,
    Uniform: null,
    OTP: null,
    Gross_Salary: null,
  });

  const [ratios, setRatios] = useState({
    Basic: 0,
    Uniform: 0,
    HRA: 0,
    Conveyance: 0,
    Medical: 0,
    DA: 0,
    Washing: 0,
  });

  const BREAKUP_AMOUNT_FIELDS = [
    "Gross_Salary",
    "Basic",
    "HRA",
    "Conveyance",
    "Medical",
    "Other",
    "Washing",
    "Uniform",
    "ANNUAL_CTC",
    "LWF",
    "PFSALARY_LIMIT",
    "BONUS_AMOUNT",
    "Gratuity",
    "CTC",
  ];

  const META_FIELDS = ["Salary_Type", "Effective_date"];

  const SALARY_COMPONENT_FIELDS = [...META_FIELDS, ...BREAKUP_AMOUNT_FIELDS];

  const hasMeaningfulValue = (v) =>
    v !== null &&
    v !== undefined &&
    v.toString().trim() !== "" &&
    Number(v) !== 0;

  const handleInputChange = (name: string, value: any) => {
    if (name === "Daily_Wages") {
      if (
        hasMeaningfulValue(value) &&
        BREAKUP_AMOUNT_FIELDS.some((f) => hasMeaningfulValue(formData1?.[f]))
      ) {
        showSideAlert(
          "Please clear the salary breakup fields before entering Daily Wages.",
          "warning",
        );
        return;
      }
      setFormData1((prev) => ({ ...prev, Daily_Wages: value }));
      setFormData((prev) => ({
        ...prev,
        EmpMst: { ...prev.EmpMst, Daily_Wages: value },
      }));
      return;
    }

    if (SALARY_COMPONENT_FIELDS.includes(name) && hasMeaningfulValue(value)) {
      if (hasMeaningfulValue(formData1?.Daily_Wages)) {
        showSideAlert(
          "Please clear Daily Wages before entering the salary breakup fields.",
          "warning",
        );
        return;
      }
    }
    if (name === "PFNO") {
      const selectedLabel = PFYN.find((opt) => opt.value === value)?.label;

      const disablePFFields = selectedLabel !== "YES";
      SetPfdisabled(disablePFFields);

      if (disablePFFields) {
        setFormData((prev) => ({
          ...prev,
          EmpMst: {
            ...prev.EmpMst,
            pfper: "",
            PF_Date: "",
          },
        }));
      }
    }

    if (name === "ESINO") {
      const selectedLabel = yesno.find((opt) => opt.value === value)?.label;
      const disableESICFields = selectedLabel !== "YES";
      SetPfdisabled1(disableESICFields);

      setFormData((prev) => ({
        ...prev,
        EmpMst: {
          ...prev.EmpMst,
          ESINO: value,
          ...(disableESICFields && { esinumber: "", ESI_Date: "" }),
        },
      }));
    }

    if (name === "Salary_Type") {
      setSalaryType(value);
    }

    setFormData1((prevData) => {
      let updatedData = {
        ...prevData,
        [name]: value,
      };

      if (name === "Gross_Salary" && ratios) {
        const basicValue = Number(value || 0);
        updatedData.Basic = (basicValue * ratios.Basic) / 100;
        updatedData.Uniform = (basicValue * ratios.Uniform) / 100;
        updatedData.HRA = (basicValue * ratios.HRA) / 100;
        updatedData.Conveyance = (basicValue * ratios.Conveyance) / 100;
        updatedData.Medical = (basicValue * ratios.Medical) / 100;
        updatedData.Other = (basicValue * ratios.DA) / 100;
        updatedData.Washing = (basicValue * ratios.Washing) / 100;
      }

      const {
        Basic,
        HRA,
        Conveyance,
        Medical,
        Other,
        Washing,
        Uniform,
        BONUS_AMOUNT,
        LWF,
        PFSALARY_LIMIT,
        Gratuity,
        Gross_Salary,
      } = updatedData;

      const monthlyGross =
        Number(Basic || 0) +
        Number(HRA || 0) +
        Number(Conveyance || 0) +
        Number(Medical || 0) +
        Number(Other || 0) +
        Number(Washing || 0) +
        Number(Uniform || 0);

      const annualGross = Gross_Salary * 12;
      const ctc =
        annualGross +
        Number(BONUS_AMOUNT || 0) +
        Number(LWF || 0) +
        Number(PFSALARY_LIMIT || 0) +
        Number(Gratuity || 0);

      updatedData.ANNUAL_CTC = annualGross;
      updatedData.CTC = ctc;

      return updatedData;
    });

    setFormData((prevData) => ({
      ...prevData,
      EmpMst: {
        ...prevData.EmpMst,
        [name]: value,
      },
    }));
  };

  const { toast } = useToast();
  const [otp, setOtp] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [Error, setError] = useState("");
  const [timerId, setTimerId] = useState(null);
  const [isClicked, setIsClicked] = useState(false);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [isReupdate, setIsReupdate] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef(null);
  const [Pfdisabled, SetPfdisabled] = useState(true);
  const [Pfdisabled1, SetPfdisabled1] = useState(true);
  const [messageShowFlage, setmessageShowFlage] = useState(false);
  const [GratuityCompKeyData, setGratuityCompKeyData] = useState(false);

  const FetchBreakupRatio = async () => {
    if (!formData?.EmpMst?.EMPCODE) return;

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/ViewBreakUpRatio`,
        {
          EmpCode: formData?.EmpMst.EMPCODE,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      const ratioData = response.data.Result[0];
      setRatios({
        Basic: ratioData.Basic || 0,
        Uniform: ratioData.Uniform || 0,
        HRA: ratioData.HRA || 0,
        Conveyance: ratioData.Conveyance || 0,
        Medical: ratioData.Medical || 0,
        DA: ratioData.DA || 0,
        Washing: ratioData.Washing || 0,
      });
    } catch (error) {
      console.error("Error fetching breakup ratio:", error);
    }
  };

  useEffect(() => {
    FetchBreakupRatio();
  }, []);

  const handleSplitSalary = (grossVal?: number) => {
    const gross = grossVal !== undefined ? grossVal : Number(formData1?.Gross_Salary || 0);
    if (!gross || !ratios) return;
    setFormData1((prev: any) => ({
      ...prev,
      Gross_Salary: gross,
      Basic: (gross * (ratios.Basic || 0)) / 100,
      Uniform: (gross * (ratios.Uniform || 0)) / 100,
      HRA: (gross * (ratios.HRA || 0)) / 100,
      Conveyance: (gross * (ratios.Conveyance || 0)) / 100,
      Medical: (gross * (ratios.Medical || 0)) / 100,
      Other: (gross * (ratios.DA || 0)) / 100,
      Washing: (gross * (ratios.Washing || 0)) / 100,
    }));
  };

  const handleSaveSalaryBreakup = async () => {
    if (formData1?.Salary_Type == null) {
      setFormData1((prev: any) => ({
        ...prev,
        Salary_Type: isSalarySaved ? "1" : "0",
      }));
      formData1.Salary_Type = isSalarySaved ? "1" : "0";
    }
    await saveData();
  };

  const salaryBreakupItems = [
    { label: "Basic", name: "Basic", ratioKey: "Basic" },
    { label: "HRA", name: "HRA", ratioKey: "HRA" },
    { label: "DA", name: "Other", ratioKey: "DA" },
    { label: "Conveyance", name: "Conveyance", ratioKey: "Conveyance" },
    { label: "Medical", name: "Medical", ratioKey: "Medical" },
    { label: "Washing", name: "Washing", ratioKey: "Washing" },
    { label: "Uniform", name: "Uniform", ratioKey: "Uniform" },
  ];

  const FetchMessageData = async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/getSalaryApprMessage`,
        {
          EmpCode: formData?.EmpMst.EMPCODE,
          usercode: user?.EMPCODE,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      const { status, message } = response.data;

      setsalarystatus(null);

      if (status === 2) {
        setsalarystatus(2);
        setSalaryMessage(message);
      } else if (status === 0) {
        setsalarystatus(0);
        setSalaryMessage(message);
      } else if (status === 3) {
        setsalarystatus(3);
        setSalaryMessage(message);
      } else {
        setSalaryMessage(message || "");
      }
    } catch (error) {
      console.error("Error Response:", error);
    }
  };

  useEffect(() => {
    FetchMessageData();
  }, [formData?.EmpMst.EMPCODE || messageShowFlage]);

  const SendOtp1 = async () => {
    if (!formData.EmpMst?.EMPCODE) {
      showSideAlert("Please select Employee Code", "info");
      return;
    }

    setTimeRemaining(60);
    setError("");

    if (timerId) {
      clearInterval(timerId);
    }
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/sendOtpforUnlockBankDeatails`,
        {
          Loc_code: user?.branch,
          EMPCODE: formData.EmpMst?.EMPCODE,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );
      const a = response.data.Message;
      if (response.status == 201) {
        await handleUnLockBankDetails();
        Swal.fire({
          icon: "warning",
          title: "Warning!",
          text: `${response.data.Message}`,
        });
      } else {
        setIsDialogOpen1(true);
        setOtp(response.data.Otp);
        const timerId = setInterval(() => {
          setTimeRemaining((prev) => {
            if (prev <= 1) {
              clearInterval(timerId);
              setOtp(null);
              setError("OTP has expired. Please request a new OTP.");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        setTimerId(timerId);
      }
    } catch (error) {
      console.log("Error saving data:", error.response?.data || error.message);
    }
  };

  const disebal = () => {
    if (formData1?.OTP != otp) {
      setFalg(true);
      showSideAlert("Wrong OTP Typed", "info");
      return;
    } else {
      setFalg(false);
      setIsDialogOpen(false);
      setFormData1((prevData) => ({
        ...prevData,
        OTP: "",
      }));
    }
  };

  const disebal1 = async () => {
    if (formData1?.OTP != otp) {
      showSideAlert("Wrong OTP Typed", "info");
      return;
    } else {
      await handleUnLockBankDetails();
      setIsDialogOpen1(false);
      setFormData1((prevData) => ({
        ...prevData,
        OTP: "",
      }));
    }
  };

  const handleUnLockBankDetails = async () => {
    const emp = formData?.EmpMst;

    const requiredFields = [{ key: "EMPCODE", label: "Employee Code" }];

    for (const field of requiredFields) {
      if (!emp?.[field.key]) {
        toast({
          title: `Please Enter ${field.label}`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const body = {
        Formdata: {
          EMPCODE: emp.EMPCODE,
          CreatedBy: user?.name,
        },
      };

      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/UnLockEmployeeBankDetails`,
        body,
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      if (result.data.success) {
        setIsBankLocked(false);
        SetViewAccountData(false);
        setViewIFSCData(false);
        setAccountButtonVariant("save");
        setIFSCButtonVariant("save");
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Bank details Un-locked successfully.",
        });
      }
    } catch (error) {
      console.error("Error while Un-locking bank details:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to Un-lock bank details.",
      });
    }
  };

  useEffect(() => {
    ViewData();
  }, [formData?.EmpMst.EMPCODE]);
  const ViewData = async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmpMaster/ViewEmpMaster`,
        {
          Empcode: formData?.EmpMst.EMPCODE,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      if (response?.data?.Result?.length > 0) {
        const empData = response.data.Result[0];
        if (empData?.Effective_date || empData?.Gross_Salary) {
          setIsSalarySaved(true);
        } else {
          setIsSalarySaved(false);
        }
        const annualGross = Number(empData?.ANNUAL_CTC || 0);
        const BONUS_AMOUNT = Number(empData?.BONUS_AMOUNT || 0);
        const LWF = Number(empData?.LWF || 0);
        const PFSALARY_LIMIT = Number(empData?.PFSALARY_LIMIT || 0);
        const Gratuity = Number(empData?.Gratuity || 0);
        const ctc =
          annualGross + BONUS_AMOUNT + LWF + PFSALARY_LIMIT + Gratuity;

        const updatedData = {
          ...empData,
          CTC: ctc,
        };

        setFormData1(updatedData);

        const pfValue = empData?.PFNO?.toString();
        const pfLabel = PFYN.find((opt) => opt.value === pfValue)?.label;
        const pfDisabled = pfLabel !== "YES";
        SetPfdisabled(pfDisabled);

        const esicValue = empData?.ESINO?.toString();
        const esicLabel = yesno.find((opt) => opt.value === esicValue)?.label;
        const esicDisabled = esicLabel !== "YES";
        SetPfdisabled1(esicDisabled);

        setFormData((prev) => ({
          ...prev,
          EmpMst: {
            ...prev.EmpMst,
            pfper: pfDisabled ? "" : empData?.pfper,
            PF_Date: pfDisabled ? "" : empData?.PF_Date,
            esinumber: esicDisabled ? "" : empData?.esinumber,
            ESI_Date: esicDisabled ? "" : empData?.ESI_Date,
          },
        }));
      }
    } catch (error) {
      console.error("Error Response:", error);
    }
  };

  const saveData = async () => {
    const isDailyWages = hasMeaningfulValue(formData1?.Daily_Wages);
    if (!isDailyWages) {
      if (formData1?.Salary_Type == null) {
        showSideAlert("Please Select Salary Type", "warning");
        return;
      }
      if (formData1?.Effective_date == null) {
        showSideAlert("Please Select Effective Date", "warning");
        return;
      }

      const calculatedGross =
        Number(formData1.Basic || 0) +
        Number(formData1.HRA || 0) +
        Number(formData1.Conveyance || 0) +
        Number(formData1.Medical || 0) +
        Number(formData1.Other || 0) +
        Number(formData1.Washing || 0) +
        Number(formData1.Uniform || 0);

      const grossCTC = Number(formData1?.Gross_Salary || 0);

      if (grossCTC !== calculatedGross) {
        showSideAlert(
          `Gross CTC (${grossCTC}) must match total monthly components (${calculatedGross}).`,
          "warning",
        );
        return;
      }

      const selectedDate = new Date(formData1.Effective_date);
      const joinDateStr = formData.EmpMst?.CURRENTJOINDATE;

      const joinDate = joinDateStr ? new Date(joinDateStr) : null;

      selectedDate.setHours(0, 0, 0, 0);
      if (joinDate) joinDate.setHours(0, 0, 0, 0);

      if (joinDate && selectedDate < joinDate) {
        showSideAlert(
          `Effective date cannot be before employee's join date (${joinDate.toLocaleDateString("en-GB")}).`,
          "warning",
        );
        return;
      }
    } else if (
      SALARY_COMPONENT_FIELDS.filter(
        (f) => f !== "Salary_Type" && f !== "Effective_date",
      ).some((f) => hasMeaningfulValue(formData1?.[f]))
    ) {
      showSideAlert(
        "Please clear salary breakup fields when Daily Wages is entered.",
        "warning",
      );
      return;
    }
    const pfLimit = formData1.PFSALARY_LIMIT;

    if (
      pfLimit !== null &&
      pfLimit !== undefined &&
      pfLimit !== "" &&
      Number(pfLimit) !== 0
    ) {
      const pfValue = Number(pfLimit);
      if (Number.isNaN(pfValue)) {
        showSideAlert("Please enter a valid PF Salary Limit.", "warning");
        return;
      }

      if (pfValue < 15000) {
        showSideAlert(
          "PF Salary Limit must be 15000 or greater, or leave it blank.",
          "warning",
        );
        return;
      }
    }

    setmessageShowFlage(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmpMaster/saveApprovelSalaryData`,
        {
          formData1,
          Empcode: formData?.EmpMst.EMPCODE,
          Rec_date: getCurrentDate(),
          Created_by: user?.EMPCODE,
          Entr_user: user?.id,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );
      setIsDialogOpen2(false);
      Swal.fire({
        icon: "success",
        title: "Success!",
        text: "Salary Data Save successfully.",
      });
      ViewData();
      setFalg(true);
      setFalg1(true);
    } catch (error) {
      toast({
        title: `${error.response.data.Message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchData = async () => {
    if (!user?.Comp_Code) return;
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/masters`,
        {},
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );
      if (response?.data?.data) {
        const masters = response.data.data;
        if (masters.EMP_SHIFT) setEmpShift(masters.EMP_SHIFT);
        if (masters.BANK) setBankoption(masters.BANK);
        if (masters.PFPERC) setPFPERCoption(masters.PFPERC);
        if (masters.GradeMstData) setGRADEoption(masters.GradeMstData);
        if (masters.Sal_Region) setSalRegionoption(convertValuesToString(masters.Sal_Region));
        if (masters.EMPLOYEEDESIGNATION) setEMPLOYEEDESIGNATIONoption(convertValuesToString(masters.EMPLOYEEDESIGNATION));
        if (masters.CHANNEL1) setCHANEELOPTION(convertValuesToString(masters.CHANNEL1));
        if (masters.CLUSTER1) setCLUSTEROPTION(convertValuesToString(masters.CLUSTER1));
        if (masters.LOCATION) setlocationnoption(convertValuesToString(masters.LOCATION));
        if (masters.SECTION) setSECTIONoption(convertValuesToString(masters.SECTION));
        if (masters.DIVISION) setdivisionoption(convertValuesToString(masters.DIVISION));
      }
    } catch (error) {
      console.error("Error fetching masters:", error);
    }
  };

  useEffect(() => {
    if (user?.Comp_Code) {
      fetchData();
    }
  }, [user?.Comp_Code, user?.name]);

  const handleChangeSalaryDetails = async () => {
    setIsDialogOpen2(true);
  };

  const OutServiceView = async (Emp_Code) => {
    setIsDialogOpen3(true);
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmpMaster/SalaryStrReport`,
        {
          EmpCode: Emp_Code,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      const processedData = result.data.Result.map((item) => {
        if (!item.MODIFIED_USER && item.Mod_User) {
          return {
            ...item,
            MODIFIED_USER: item.Mod_User || "System",
          };
        }
        return item;
      });

      const sortedData = processedData.sort(
        (a, b) => new Date(a.Effective_date) - new Date(b.Effective_date),
      );
      setSalaryData(sortedData);
    } catch (error) {
      console.error("Error occurred while making the request:", error);
    }
  };

  const UpdateBankdetails = async () => {
    if (!formData?.EmpMst?.EMPCODE) {
      showSideAlert("Please enter Employee Code", "warning");
      return;
    }

    const skipBankValidation = ["Cash", "Salary Hold"].includes(
      formData?.EmpMst?.PAYMENTMODE,
    );

    if (!skipBankValidation) {
      const missingFields: string[] = [];
      if (!formData?.EmpMst?.BANKNAME) missingFields.push("Bank Name");
      if (!formData?.EmpMst?.BANKACCOUNTNO) missingFields.push("Account No");
      if (!formData?.EmpMst?.Cnf_BANKACCOUNTNO)
        missingFields.push("Confirm Account No");
      if (!formData?.EmpMst?.ifsc_code) missingFields.push("IFSC Code");
      if (!formData?.EmpMst?.BRANCH) missingFields.push("Branch Name");
      if (!formData?.EmpMst?.Emp_Ac_Name)
        missingFields.push("Account Holder Name");
      if (!formData?.EmpMst?.ACCOUNT_TYPE) missingFields.push("Account Type");
      if (!formData?.EmpMst?.PAYMENTMODE) missingFields.push("Payment Mode");

      if (missingFields.length > 0) {
        showSideAlert(
          `Please enter ${missingFields.join(", ")}`,
          "warning",
        );
        return;
      }

      const accNo = formData?.EmpMst?.BANKACCOUNTNO?.toString() || "";
      const cnfAccNo = formData?.EmpMst?.Cnf_BANKACCOUNTNO?.toString() || "";

      if (accNo.length < 10 || cnfAccNo.length < 10) {
        showSideAlert(
          "Account numbers must be at least 10 digits long.",
          "warning",
        );
        return;
      }

      if (accNo !== cnfAccNo) {
        showSideAlert(
          "Account No and Confirm Account No do not match.",
          "warning",
        );
        return;
      }
    } else {
      if (!formData?.EmpMst?.PAYMENTMODE) {
        showSideAlert("Please enter Payment Mode", "warning");
        return;
      }
    }

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmpMaster/UpdateBankdetails`,
        {
          EmpCode: formData?.EmpMst?.EMPCODE,
          LOGINEMPCODE: user?.EMPCODE,
          Loc_code: user?.branch,
          Sal_Hold: formData?.EmpMst?.Sal_Hold,
          BANKNAME: formData?.EmpMst?.BANKNAME,
          ACCOUNT_TYPE: formData?.EmpMst?.ACCOUNT_TYPE,
          BANKACCOUNTNO: formData?.EmpMst?.BANKACCOUNTNO,
          BRANCH: formData?.EmpMst?.BRANCH,
          PAYMENTMODE: formData?.EmpMst?.PAYMENTMODE,
          ifsc_code: formData?.EmpMst?.ifsc_code,
          Emp_Ac_Name: formData?.EmpMst?.Emp_Ac_Name,
          EmpMasterOtp: compdata?.EmpMasterOtp,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      initialBankDetailsRef.current = {
        BANKNAME: formData?.EmpMst?.BANKNAME,
        ACCOUNT_TYPE: formData?.EmpMst?.ACCOUNT_TYPE,
        BANKACCOUNTNO: formData?.EmpMst?.BANKACCOUNTNO,
        BRANCH: formData?.EmpMst?.BRANCH,
        PAYMENTMODE: formData?.EmpMst?.PAYMENTMODE,
        ifsc_code: formData?.EmpMst?.ifsc_code,
        Emp_Ac_Name: formData?.EmpMst?.Emp_Ac_Name,
        Sal_Hold: formData?.EmpMst?.Sal_Hold,
      };

      showSideAlert(result.data.Message, "success");
      const reupdate = result.data?.Reupdate;

      if (reupdate) {
        setIsReupdate(true);
        setIsClicked(true);
        pollNotifyApprover(formData?.EmpMst?.EMPCODE);
      } else {
        setIsReupdate(false);
        setIsClicked(false);
      }
    } catch (error: any) {
      console.error("Error occurred while making the request:", error);
      showSideAlert(
        error?.response?.data?.Message || "Failed to update bank details",
        "error",
      );
      setIsClicked(false);
    }
  };

  useEffect(() => {
    if (formData?.EmpMst?.BANKACCOUNTNO == null) {
      setFalg(false);
    }
  }, [formData?.EmpMst?.BANKACCOUNTNO]);

  const pollNotifyApprover = (empcode) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    pollingRef.current = setInterval(async () => {
      try {
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/EmpMaster/NotifyApprover`,
          { empcode },
          {
            headers: { compcode: user?.Comp_Code },
          },
        );

        const msg = res?.data?.Message;
        toast({
          title: msg,
          variant: "default",
        });
        setNotifyMessage(msg);

        if (
          msg === "Request Approved successfully" ||
          msg === "Request Rejected successfully"
        ) {
          clearInterval(pollingRef.current);
          setIsClicked(false);
        }
      } catch (error) {
        console.error("Polling error:", error);
        clearInterval(pollingRef.current);
      }
    }, 30000);
  };

  useEffect(() => {
    let isMounted = true;

    const checkAndStartPolling = async () => {
      try {
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/EmpMaster/CheckApprovalStatus`,
          {
            empcode: formData?.EmpMst?.EMPCODE,
          },
          {
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
            },
          },
        );

        const reupdate = result.data?.Reupdate;

        if (isMounted && reupdate) {
          setIsReupdate(true);
          setIsClicked(true);
          pollNotifyApprover(formData?.EmpMst?.EMPCODE);
        } else {
          setIsReupdate(false);
          setIsClicked(false);
        }
      } catch (error) {
        console.error("Silent approval check error:", error);
        setIsClicked(false);
      }
    };

    checkAndStartPolling();

    return () => {
      isMounted = false;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const {
      Basic,
      HRA,
      Conveyance,
      Medical,
      Other,
      Washing,
      Uniform,
      BONUS_AMOUNT,
      LWF,
      PFSALARY_LIMIT,
      Gratuity,
      Gross_Salary,
    } = formData1 || {};

    const monthlyGross =
      Number(Basic || 0) +
      Number(HRA || 0) +
      Number(Conveyance || 0) +
      Number(Medical || 0) +
      Number(Other || 0) +
      Number(Washing || 0) +
      Number(Uniform || 0);

    const annualGross = Gross_Salary * 12;

    const ctc =
      annualGross +
      Number(BONUS_AMOUNT || 0) +
      Number(LWF || 0) +
      Number(PFSALARY_LIMIT || 0) +
      Number(Gratuity || 0);

    setFormData1((prev) => ({
      ...prev,
      ANNUAL_CTC: annualGross || 0,
      CTC: ctc || 0,
    }));
  }, [
    formData1?.Basic,
    formData1?.HRA,
    formData1?.Conveyance,
    formData1?.Medical,
    formData1?.Other,
    formData1?.Washing,
    formData1?.Uniform,
    formData1?.BONUS_AMOUNT,
    formData1?.LWF,
    formData1?.PFSALARY_LIMIT,
    formData1?.Gratuity,
    formData1?.Gross_Salary,
  ]);

  useEffect(() => {
    if (!GratuityCompKeyData) return;

    const basicVal = Number(formData1?.Basic || 0);
    const calculatedGratuity = +(basicVal * 0.0481).toFixed(2);
    const calculatedBonus = +(basicVal * 0.0833).toFixed(2);

    const gratuityChanged =
      Number(formData1?.Gratuity || 0) !== calculatedGratuity;
    const bonusChanged =
      Number(formData1?.BONUS_AMOUNT || 0) !== calculatedBonus;

    if (gratuityChanged || bonusChanged) {
      setFormData1((prev) => ({
        ...prev,
        ...(gratuityChanged && { Gratuity: calculatedGratuity }),
        ...(bonusChanged && { BONUS_AMOUNT: calculatedBonus }),
      }));
      setFormData((prev) => ({
        ...prev,
        EmpMst: {
          ...prev.EmpMst,
          ...(gratuityChanged && { Gratuity: calculatedGratuity }),
          ...(bonusChanged && { BONUS_AMOUNT: calculatedBonus }),
        },
      }));
    }
  }, [formData1?.Basic, GratuityCompKeyData]);

  const [BankMode, setBankMode] = useState("primary");
  const VerifyAccountNo = async (option) => {
    const accNo = formData?.EmpMst?.BANKACCOUNTNO?.toString() || "";
    const cnfAccNo = formData?.EmpMst?.Cnf_BANKACCOUNTNO?.toString() || "";

    if (option === 13) {
      if (!accNo) {
        showSideAlert("Please enter account no", "warning");
        return;
      }

      if (!cnfAccNo) {
        showSideAlert("Please enter confirm account no", "warning");
        return;
      }

      if (accNo !== cnfAccNo) {
        showSideAlert(
          "Account No and Confirm Account No do not match.",
          "warning",
        );
        return;
      }

      if (!formData?.EmpMst?.ifsc_code) {
        showSideAlert("Please enter ifsc code", "warning");
        return;
      }
    }

    if (option === 12) {
      if (!formData?.EmpMst?.ifsc_code) {
        showSideAlert("Please enter ifsc code", "warning");
        return;
      }

      if (!formData?.EmpMst?.BANKACCOUNTNO) {
        showSideAlert("Please enter account no", "warning");
        return;
      }
    }

    if (option === 13 && compdata?.Banking_AccountNo_Verify !== 1) {
      showSideAlert(
        "Verify Button Is Not Enabled, Please Contact Autovyn Team!.",
        "error",
      );
      return;
    }

    if (option === 12 && compdata?.Banking_IFSC_Verfy !== 1) {
      showSideAlert(
        "Verify Button Is Not Enabled, Please Contact Autovyn Team!.",
        "error",
      );
      return;
    }

    option === 13 ? setIsVerifyAccountApi(true) : setIsVerifyIFSCApi(true);

    const callPrimaryApi = async () => {
      return await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/panandadharapi/ValidateIdtoAi`,
        {
          api_name: "bank_verification",
          payload: {
            account_number: formData?.EmpMst?.BANKACCOUNTNO,
            ifsc_code: formData?.EmpMst?.ifsc_code,
          },
          refresh: false,
        },
        {
          headers: { compcode: user?.Comp_Code },
        },
      );
    };

    const callSecondaryApi = async () => {
      return await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/panandadharapi/validate`,
        {
          option: option,
          Ifsc: formData?.EmpMst?.ifsc_code,
          account_number: formData?.EmpMst?.BANKACCOUNTNO,
        },
        {
          headers: { compcode: user?.Comp_Code },
        },
      );
    };

    let result;

    try {
      try {
        result = await callPrimaryApi();
        const accountStatusCode = result?.data?.data?.result?.account_status;
        setAccountStatusCode(accountStatusCode);
        if (accountStatusCode == "INVALID") {
          toast({
            title: "INVALID",
            description: `${result?.data?.data?.result?.account_status_code}`,
            variant: "destructive",
          });
          return;
        }

        if (
          result?.status !== 200 ||
          result?.data?.data?.status !== "success"
        ) {
          throw new Error("Primary API returned invalid response");
        }
      } catch (primaryError) {
        setBankMode("secondary");
        result = await callSecondaryApi();
      }

      if (result?.status === 200) {
        const data = result?.data;
        if (option === 13) {
          const isSuccess =
            data?.data?.status === "success" ||
            data?.data?.account_exists === true ||
            data?.result?.account_status == "VALID";
          if (isSuccess) {
            const accountDataResult = await ShowAccountVerifyData(
              formData?.EmpMst,
            );
            if (accountDataResult?.exists) {
              setAccountData(accountDataResult.data);
              setFormData((prev) => ({
                ...prev,
                EmpMst: {
                  ...prev.EmpMst,
                  Emp_Ac_Name: accountDataResult.data?.name_at_bank || "",
                },
              }));
            }
            setAccountStatusCode("VALID");
          } else {
            toast({
              title: data?.data?.message || "Verification Failed",
              variant: "destructive",
            });
          }
        }

        if (option === 12) {
          const ifscDetails =
            data?.data?.result?.ifsc_details ||
            data?.data?.result ||
            data?.data ||
            data ||
            {};
          setIFSCData(ifscDetails);

          setFormData((prev) => ({
            ...prev,
            EmpMst: {
              ...prev.EmpMst,
              BRANCH: ifscDetails?.branch || ifscDetails?.BRANCH || "",
            },
          }));
        }
      }
    } catch (error) {
      showSideAlert(
        error?.response?.data?.error ||
        error?.response?.data?.error?.detail?.message ||
        "Both verification APIs failed.",
        "error",
      );
    } finally {
      setIsVerifyAccountApi(false);
      setIsVerifyIFSCApi(false);
    }
  };

  const ShowAccountVerifyData = async (rowData) => {
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/panandadharapi/ShowAccountVerifyData`,
        {
          Ifsc: rowData?.ifsc_code,
          account_number: rowData?.BANKACCOUNTNO,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
          },
        },
      );
      if (result?.data?.Status === "true" && result?.data?.Result?.[0]) {
        return { exists: true, data: result.data.Result[0] };
      }
      return { exists: false };
    } catch (error) {
      console.error("ShowAccountVerifyData error:", error);
      return { exists: false };
    }
  };

  const fetchVerificationData = async () => {
    const ifsc = formData?.EmpMst?.ifsc_code;
    const accNo = formData?.EmpMst?.BANKACCOUNTNO;

    if (!ifsc || !accNo) return;

    try {
      const result = await ShowAccountVerifyData({
        ifsc_code: ifsc,
        BANKACCOUNTNO: accNo,
      });

      if (result.exists && result.data) {
        setAccountData(result.data);
        setIFSCData(result.data);
      }
    } catch (error) {
      console.error("Error checking existing verification:", error);
    }
  };

  const ShowIFSCVerifyData = async () => {
    const ifsc = formData?.EmpMst?.ifsc_code;

    if (!ifsc) return;

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/panAndAdharApi/ShowIFSCVerifyData`,
        {
          Ifsc: ifsc,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
          },
        },
      );
      if (result?.data?.Status === "true" && result?.data?.Result?.[0]) {
        return { exists: true, data: result.data.Result[0] };
      }
      return { exists: false };
    } catch (error) {
      console.error("ShowIFSCVerifyData error:", error);
      return { exists: false };
    }
  };

  useEffect(() => {
    if (!isActiveTab) return;

    const verifyAll = async () => {
      try {
        await fetchVerificationData();
        const ifscResult = await ShowIFSCVerifyData();
        if (ifscResult.exists && ifscResult.data) {
          setIFSCData(ifscResult.data);
        }
      } catch (error) {
        console.error("Error verifying account or IFSC:", error);
      }
    };

    verifyAll();
  }, [isActiveTab]);

  const handleLockBankDetails = async () => {
    const emp = formData?.EmpMst;

    const skipBankValidation = ["Cash", "Salary Hold"].includes(
      emp?.PAYMENTMODE,
    );

    const requiredFields = [
      { key: "EMPCODE", label: "Employee Code" },
      { key: "PAYMENTMODE", label: "Payment Mode" },
    ];

    if (!skipBankValidation) {
      requiredFields.push(
        { key: "BANKACCOUNTNO", label: "Bank Account Number" },
        { key: "ifsc_code", label: "IFSC Code" },
        { key: "BRANCH", label: "Branch Name" },
        { key: "Emp_Ac_Name", label: "Employee Account Name" },
        { key: "ACCOUNT_TYPE", label: "Account Type" },
        { key: "PAYMENTMODE", label: "Payment Mode" },
      );
    }

    for (const field of requiredFields) {
      if (!emp?.[field.key]) {
        toast({
          title: `Please Enter ${field.label}`,
          variant: "destructive",
        });
        return;
      }
    }
    if (!skipBankValidation) {
      const accNo = emp.BANKACCOUNTNO?.toString() || "";
      const cnfAccNo = emp.Cnf_BANKACCOUNTNO?.toString() || "";

      if (accNo.length < 10 || cnfAccNo.length < 10) {
        toast({
          title: "Account numbers must be at least 10 digits long.",
          variant: "destructive",
        });
        return;
      }

      if (accNo !== cnfAccNo) {
        toast({
          title: "Account No and Confirm Account No do not match.",
          variant: "destructive",
        });
        return;
      }
    }
    try {
      const body = {
        Formdata: {
          EMPCODE: emp.EMPCODE,
          CreatedBy: user?.name,
        },
      };

      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/LockEmployeeBankDetails`,
        body,
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      if (result.data.success) {
        setIsBankLocked(true);
        SetViewAccountData(true);
        setViewIFSCData(true);
        setAccountButtonVariant("update");
        setIFSCButtonVariant("update");

        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Bank details locked successfully.",
        });
      }
    } catch (error) {
      console.error("Error while locking bank details:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to lock bank details.",
      });
    }
  };

  const checkBankLockStatus = async () => {
    const empCode = formData?.EmpMst?.EMPCODE;
    if (!empCode) return;

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/CheckBankLockStatus`,
        { EmpCode: empCode },
        {
          headers: {
            compcode: user?.Comp_Code,
          },
        },
      );

      if (result.data.locked) {
        setIsBankLocked(true);
        SetViewAccountData(true);
        setViewIFSCData(true);
        setConfirmAccountDisabled(true);
        setAccountButtonVariant("update");
        setIFSCButtonVariant("update");
      } else {
        setIsBankLocked(false);
        SetViewAccountData(false);
        setViewIFSCData(false);
      }
    } catch (error) {
      console.error("Error checking bank lock status:", error);
    }
  };

  useEffect(() => {
    if (isActiveTab && formData?.EmpMst?.EMPCODE) {
      checkBankLockStatus();
    }
  }, [isActiveTab, formData?.EmpMst?.EMPCODE]);

  const isDailyWagesActive = hasMeaningfulValue(formData1?.Daily_Wages);
  const isSalaryBreakupActive = BREAKUP_AMOUNT_FIELDS.some((f) =>
    hasMeaningfulValue(formData1?.[f]),
  );

  useEffect(() => {
    isDalyWages();
  }, []);
  const [DalyWagescompKeyData, setDalyWagescompKeyData] = useState(false);
  const isDalyWages = async () => {
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/isDailyWages`,
        {},
        {
          headers: {
            compcode: user.Comp_Code,
            name: user.name,
          },
        },
      );

      if (res.data.success) {
        setDalyWagescompKeyData(res.data.data?.is_Daily_Wages == 1);
        setGratuityCompKeyData(res.data.data?.Gratuity == 1);
      } else {
        setDalyWagescompKeyData(false);
        setGratuityCompKeyData(false);
      }
    } catch (err) {
      setDalyWagescompKeyData(false);
      setGratuityCompKeyData(false);
    }
  };

  // ---------- UI helper classes ----------
  const cardClass =
    "rounded-2xl border border-[#E6E8EF] dark:border-[#2A2F3A] bg-white dark:bg-black shadow-sm overflow-hidden w-full";
  const cardHeaderClass =
    "flex items-center justify-between gap-2 px-1 py-3.5 border-b border-[#E6E8EF] dark:border-[#2A2F3A] bg-[#F8FAFC] dark:bg-[#0B0F19]";
  const cardTitleWrapClass = "flex items-center gap-5 h-7";
  const cardTitleClass =
    "text-[12px] tracking-wide font-semibold uppercase text-[#0F172A] dark:text-white";
  const cardBodyClass = "p-5";
  const fieldGridClass =
    "grid grid-cols-1 md:grid-cols-2 gap-x-4 fluid-gap-md gap-y-4";
  const pillBtnClass =
    "h-9 px-4 rounded-full text-sm font-semibold border border-[#D0D5DD] dark:border-[#2A2F3A] bg-white dark:bg-black text-slate-900 dark:text-white hover:bg-[#F2F4F7] dark:hover:bg-white/5 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5";
  const pillBtnPrimaryClass =
    "h-9 px-4 rounded-full text-s font-semibold bg-[#4F46E5] text-white hover:bg-[#433df0] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5";

  return (
    <div className="min-h-full w-full flex flex-col pb-24">
      {/* Top Action Bar */}
      <div className="sticky top-0 z-30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 bg-white dark:bg-black px-3 sm:px-6 py-2.5 sm:py-3 border-b border-[#E6E8EF] dark:border-[#2A2F3A] mb-4">
        {/* Top/Left: Brand + Back + Mobile Utility buttons */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-[#4F46E5] text-white items-center justify-center font-bold text-xs sm:text-sm select-none shadow-sm shrink-0">
              HS
            </div>

            <Button
              variant="outline"
              size="md"
              onClick={() => router.back()}
              className="h-9 sm:h-10 px-3 rounded-xl gap-1.5 sm:gap-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-black text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs text-xs sm:text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>

          {/* Mobile only: History & Help in the top row */}
          <div className="flex sm:hidden items-center gap-1.5">
            <Button
              variant="outline"
              onClick={() => {
                if (formData?.EmpMst?.EMPCODE) {
                  OutServiceView(formData.EmpMst.EMPCODE);
                } else {
                  showSideAlert("Please select or enter an employee first.", "warning");
                }
              }}
              size="md"
              className="h-9 px-2.5 rounded-xl gap-1.5 border-slate-200 dark:border-slate-700 bg-white dark:bg-black text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs text-xs"
            >
              <History className="h-3.5 w-3.5" />
              History
            </Button>

            <Button
              variant="outline"
              onClick={() => { }}
              size="md"
              className="h-9 px-2.5 rounded-xl gap-1.5 border-slate-200 dark:border-slate-700 bg-white dark:bg-black text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs text-xs"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Help
            </Button>
          </div>
        </div>

        {/* Right / Bottom Actions: Desktop has all 4 actions, Mobile has Discard & Save */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {/* Desktop only: History & Help */}
          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (formData?.EmpMst?.EMPCODE) {
                  OutServiceView(formData.EmpMst.EMPCODE);
                } else {
                  showSideAlert("Please select or enter an employee first.", "warning");
                }
              }}
              size="md"
              className="h-10 rounded-xl gap-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-black text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs"
            >
              <History className="h-4 w-4" />
              History
            </Button>

            <Button
              variant="outline"
              onClick={() => { }}
              size="md"
              className="h-10 rounded-xl gap-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-black text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs"
            >
              <HelpCircle className="h-4 w-4" />
              Help
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={handleReset}
            size="md"
            className="h-9 sm:h-10 flex-1 sm:flex-initial rounded-xl gap-1.5 sm:gap-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-black text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs text-xs sm:text-sm justify-center"
          >
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Discard
          </Button>

          <Button
            onClick={isEditMode ? handleUpdateEmployee : handleSaveEmployee}
            size="md"
            disabled={isLoading}
            className="h-9 sm:h-10 flex-[1.4] sm:flex-initial rounded-xl gap-1.5 sm:gap-2 bg-[#4F46E5] hover:bg-[#433df0] text-white font-medium shadow-xs text-xs sm:text-sm justify-center"
          >
            <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {isEditMode ? "Update employee" : "Save employee"}
          </Button>
        </div>
      </div>

      {/* Mini Header Card (Record completion bar omitted) */}
      <div className="bg-white dark:bg-black border border-[#E6E8EF] dark:border-[#2A2F3A] rounded-2xl p-4 sm:p-5 mb-4 shadow-sm">
        <div className="grid grid-cols-12 gap-4 sm:gap-6 items-center">
          {/* Left Inputs Grid */}
          <div className="col-span-12 xl:col-span-10 min-w-0">
            <div className="grid items-end min-w-0 gap-x-3 sm:gap-x-4 gap-y-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(13rem,1.1fr)_minmax(8rem,0.7fr)_auto_minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(10rem,1fr)]">
              {/* Employee code select */}
              <div className="min-w-0">
                <Eselect
                  title="Employee Code"
                  redlabel="*"
                  name="SrNo"
                  handleInputChange={(name: string, value: any) => {
                    handleEmpChange(name, value);
                  }}
                  option={empcodeOptions}
                  initialValue={selectedEmpSrNo || formData?.EmpMst?.SrNo?.toString() || ""}
                />
              </div>

              {/* Empcode */}
              <div className="min-w-0">
                <Einput
                  type="text"
                  name="EMPCODE"
                  title="Empcode"
                  value={formData?.EmpMst?.EMPCODE}
                  handleInputChange={(name: string, val: any) => {
                    setFormData((prev: any) => ({
                      ...prev,
                      EmpMst: {
                        ...prev?.EmpMst,
                        [name]: val,
                      },
                    }));
                  }}
                  readOnly={isEmpCodeReadOnly}
                />
              </div>

              {/* Generate new code button */}
              <div className="min-w-0 flex items-end">
                <Button
                  variant="outline"
                  onClick={Generatecode}
                  className="w-full sm:w-auto h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-black text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap shadow-xs"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  <span>Generate new code</span>
                </Button>
              </div>

              {/* First Name */}
              <div className="min-w-0">
                <Einput
                  type="text"
                  name="EMPFIRSTNAME"
                  title="First Name"
                  redlabel="*"
                  value={formData?.EmpMst?.EMPFIRSTNAME}
                  handleInputChange={(name: string, val: any) => {
                    setFormData((prev: any) => ({
                      ...prev,
                      EmpMst: {
                        ...prev?.EmpMst,
                        [name]: typeof val === "string" ? val.toUpperCase() : val,
                      },
                    }));
                  }}
                  className="uppercase"
                />
              </div>

              {/* Last Name */}
              <div className="min-w-0">
                <Einput
                  type="text"
                  name="EMPLASTNAME"
                  title="Last Name"
                  value={formData?.EmpMst?.EMPLASTNAME}
                  handleInputChange={(name: string, val: any) => {
                    setFormData((prev: any) => ({
                      ...prev,
                      EmpMst: {
                        ...prev?.EmpMst,
                        [name]: typeof val === "string" ? val.toUpperCase() : val,
                      },
                    }));
                  }}
                  className="uppercase"
                />
              </div>

              {/* Emp. Punch Code */}
              <div className="min-w-0">
                <Einput
                  type="text"
                  title="Emp. Punch Code"
                  name="PAY_CODE"
                  id="PAY_CODE"
                  value={formData?.EmpMst?.PAY_CODE}
                  handleInputChange={(name: string, val: any) => {
                    setFormData((prev: any) => ({
                      ...prev,
                      EmpMst: {
                        ...prev?.EmpMst,
                        [name]: val,
                      },
                    }));
                  }}
                />
              </div>
            </div>
          </div>

          {/* Right: Upload image */}
          <div className="col-span-12 xl:col-span-2 xl:col-start-11">
            <div className="flex xl:justify-end">
              <div className="w-[140px] sm:w-[160px] xl:w-[120px]">
                <label className="flex w-full items-center justify-center rounded-2xl cursor-pointer overflow-hidden border border-dashed border-[#D0D5DD] dark:border-[#2A2F3A] bg-white dark:bg-black h-[128px] sm:h-[136px] xl:h-[144px] hover:border-indigo-400 transition-colors">
                  {!profileSrc && !formData?.EmpMst?.photo ? (
                    <div className="text-center px-4">
                      <Upload className="h-5 w-5 mx-auto text-[#667085] dark:text-[#A0A7B4]" />
                      <div className="mt-2 text-xs font-semibold text-[#344054] dark:text-white">
                        Upload image
                      </div>
                      <div className="text-[10px] text-[#667085] dark:text-[#A0A7B4] mt-0.5">
                        JPG or PNG • max 2 MB
                      </div>
                    </div>
                  ) : (
                    <Image
                      width={600}
                      height={600}
                      src={
                        profileSrc ||
                        `data:image/jpeg;base64,${formData?.EmpMst?.photo}`
                      }
                      alt="Employee photo"
                      className="w-full h-full object-cover pointer-events-none"
                      unoptimized
                    />
                  )}

                  <input
                    type="file"
                    className="hidden"
                    name="profile"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== BASIC INFO CARD ===================== */}
    

      <div className="grid grid-cols-12 gap-4 fluid-gap-md pb-6">
        {/* ===================== LEFT COLUMN - SALARY DETAIL FORM & BANK DETAILS ===================== */}
        <div className="col-span-12 xl:col-span-8 flex flex-col gap-4">
          <div className={cardClass}>
            <div className={cardHeaderClass}>
              <div className={cardTitleWrapClass}>
                <SlidersHorizontal
                  className="h-7 w-5 text-[#4F46E5]"
                  strokeWidth={3}
                />
                <span className={cardTitleClass}>Salary Detail Form</span>
              </div>
            </div>

            <div className={cardBodyClass}>
              <div className={fieldGridClass}>
                <SelectSearch
                  title="PF (Yes/No)"
                  name="PFNO"
                  options={PFYN}
                  selectedValue={formData?.EmpMst?.PFNO?.toString()}
                  handleInputChange={handleInputChange}
                  ShortName={true}
                  disabled={disapleForSalary}
                  redlabel={isMandatory("PFNO") ? "*" : ""}
                />

                <SelectSearch
                  title="PF%"
                  name="pfper"
                  options={PFPERCoption}
                  selectedValue={
                    formData?.EmpMst?.pfper
                      ? formData?.EmpMst?.pfper?.toString()
                      : ""
                  }
                  handleInputChange={handleInputChange}
                  disabled={Pfdisabled || disapleForSalary}
                  ShortName={true}
                  redlabel={isMandatory("pfper") ? "*" : ""}
                />

                <Einput
                  type="date"
                  title="PF Effective from"
                  name="PF_Date"
                  value={formData?.EmpMst?.PF_Date}
                  handleInputChange={handleInputChange}
                  disabled={Pfdisabled || disapleForSalary}
                  ShortName={true}
                  redlabel={isMandatory("PF_Date") ? "*" : ""}
                />

                <Einput
                  type="text"
                  title="PF NO:"
                  name="pfnumber"
                  value={formData?.EmpMst?.pfnumber}
                  handleInputChange={handleInputChange}
                  ShortName={true}
                  disabled={disapleForSalary}
                  redlabel={isMandatory("pfnumber") ? "*" : ""}
                />

                <SelectSearch
                  title="ESIC (Yes/No)"
                  options={yesno}
                  name={"ESINO"}
                  selectedValue={formData?.EmpMst?.ESINO?.toString()}
                  handleInputChange={handleInputChange}
                  ShortName={true}
                  disabled={disapleForSalary}
                  redlabel={isMandatory("ESINO") ? "*" : ""}
                />

                <Einput
                  type="text"
                  title="ESIC NO"
                  name="esinumber"
                  value={formData?.EmpMst?.esinumber?.toString()}
                  handleInputChange={handleInputChange}
                  disabled={Pfdisabled1 || disapleForSalary}
                  ShortName={true}
                  redlabel={isMandatory("esinumber") ? "*" : ""}
                />

                <Einput
                  type="date"
                  title="ESIC Effective From"
                  name="ESI_Date"
                  value={formData?.EmpMst?.ESI_Date}
                  handleInputChange={handleInputChange}
                  disabled={Pfdisabled1 || disapleForSalary}
                  ShortName={true}
                  redlabel={isMandatory("ESI_Date") ? "*" : ""}
                />

                <Einput
                  type="text"
                  title="UAN NO"
                  name="UAN_No"
                  value={formData?.EmpMst?.UAN_No}
                  handleInputChange={handleInputChange}
                  ShortName={true}
                  disabled={disapleForSalary}
                  redlabel={isMandatory("UAN_No") ? "*" : ""}
                />

                <SelectSearch
                  title="LWF"
                  name="LWFNO"
                  options={LWFYESNO}
                  selectedValue={formData?.EmpMst?.LWFNO?.toString()}
                  handleInputChange={handleInputChange}
                  ShortName={true}
                  disabled={disapleForSalary}
                  redlabel={isMandatory("LWFNO") ? "*" : ""}
                />

                <SelectSearch
                  title="Weekly Off:"
                  options={WEEKLYOFF}
                  name="WEEKLYOFF"
                  selectedValue={formData?.EmpMst?.WEEKLYOFF?.toString()}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("WEEKLYOFF") ? "*" : ""}
                />

                <SelectSearch
                  title="Bonus"
                  name="BONUS"
                  selectedValue={formData?.EmpMst?.BONUS?.toString()}
                  options={BONUS}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("BONUS") ? "*" : ""}
                />

                <SelectSearch
                  title="Professional Tax"
                  name="pro_tax"
                  options={ProTax}
                  selectedValue={formData?.EmpMst?.pro_tax?.toString()}
                  handleInputChange={handleInputChange}
                  disabled={disapleForSalary}
                  redlabel={isMandatory("pro_tax") ? "*" : ""}
                />

                <SelectSearch
                  selectedValue={formData?.EmpMst?.EMP_SHIFT}
                  options={EmpShift}
                  title="EMP. Shift"
                  name="EMP_SHIFT"
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("EMP_SHIFT") ? "*" : ""}
                />

                <Einput
                  type="number"
                  title="LIN NO"
                  name="LIN_NO"
                  value={formData?.EmpMst?.LIN_NO}
                  handleInputChange={handleInputChange}
                  ShortName={true}
                  disabled={disapleForSalary}
                  redlabel={isMandatory("LIN_NO") ? "*" : ""}
                />

                <SelectSearch
                  selectedValue={formData?.EmpMst?.GRADE}
                  options={GRADEoption}
                  title="Grade"
                  name="GRADE"
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("GRADE") ? "*" : ""}
                  ShortName
                />

                <SelectSearch
                  title="Salary View at Region:"
                  name="Sal_Region"
                  options={SalRegionoption}
                  selectedValue={formData?.EmpMst?.Sal_Region?.toString()}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("Sal_Region") ? "*" : ""}
                />

                <div className="md:col-span-2">
                  <SelectSearch
                    title="Employee Punch Type:"
                    name="Punch_Type"
                    options={PunchType}
                    selectedValue={formData?.EmpMst?.Punch_Type?.toString()}
                    handleInputChange={handleInputChange}
                    redlabel={isMandatory("Punch_Type") ? "*" : ""}
                  />
                </div>

                {formData.EmpMst?.EmpType == 3 && (
                  <Einput
                    type="number"
                    title="Contract number"
                    name="CONTRACT_NUMBER"
                    value={formData?.EmpMst?.CONTRACT_NUMBER}
                    handleInputChange={handleInputChange}
                    ShortName={true}
                    redlabel={isMandatory("CONTRACT_NUMBER") ? "*" : ""}
                  />
                )}

                {user?.Comp_Code?.trim()?.toUpperCase() === "DDMM-25" && (
                  <SelectSearch
                    selectedValue={formData?.EmpMst?.DD_CLUB}
                    options={DDCLUBOPTION}
                    title="DD CLUB"
                    name="DD_CLUB"
                    handleInputChange={handleInputChange}
                    redlabel={isMandatory("DD_CLUB") ? "*" : ""}
                    ShortName
                  />
                )}
              </div>
            </div>
          </div>

          {/* ===================== BANK DETAILS ===================== */}
          <div className={cardClass}>
            <div className={cardHeaderClass}>
              <div className={cardTitleWrapClass}>
                <Landmark className="h-4 w-4 text-[#4F46E5]" strokeWidth={2} />
                <span className={cardTitleClass}>Bank Details</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={pillBtnClass}
                  onClick={handleLockBankDetails}
                  disabled={isBankLocked}
                >
                  <Lock className="h-3.5 w-3.5" />
                  Lock
                </button>
                <button
                  type="button"
                  className={pillBtnClass}
                  onClick={SendOtp1}
                  disabled={!isBankLocked}
                >
                  <LockOpen className="h-3.5 w-3.5" />
                  Unlock
                </button>

                {isClicked && isReupdate ? (
                  <button
                    type="button"
                    disabled
                    className={`${pillBtnClass} text-gray-400 cursor-not-allowed`}
                  >
                    Waiting for Approval...
                  </button>
                ) : (
                  <button
                    type="button"
                    className={pillBtnClass}
                    onClick={UpdateBankdetails}
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    Update
                  </button>
                )}
              </div>
            </div>

            <div className={cardBodyClass}>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-3">
                {/* Row 1 */}
                <SelectSearch
                  title="Bank Name:"
                  name="BANKNAME"
                  options={Bankoption}
                  selectedValue={formData?.EmpMst?.BANKNAME}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("BANKNAME") ? "*" : ""}
                  disabled={isBankLocked}
                />

                <Einput
                  title="Account No."
                  type="password"
                  name="BANKACCOUNTNO"
                  value={formData?.EmpMst.BANKACCOUNTNO?.toString()}
                  handleInputChange={handleInputChange}
                  onCopy={(e) => e.preventDefault()}
                  onPaste={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                  disabled={ViewAccountData || isBankLocked}
                  redlabel={isMandatory("BANKACCOUNTNO") ? "*" : ""}
                />

                <div className="flex items-end gap-2">
                  {/* Confirm Account No. */}
                  <div className="flex-[2]">
                    <Einput
                      title="Confirm Account No."
                      type="text"
                      name="Cnf_BANKACCOUNTNO"
                      value={formData?.EmpMst.Cnf_BANKACCOUNTNO}
                      disabled={
                        (confirmAccountDisabled || ViewAccountData) &&
                        isBankLocked
                      }
                      handleInputChange={handleInputChange}
                      onCopy={(e) => e.preventDefault()}
                      onPaste={(e) => e.preventDefault()}
                      onCut={(e) => e.preventDefault()}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Tab" &&
                          formData?.EmpMst.BANKACCOUNTNO &&
                          formData?.EmpMst.Cnf_BANKACCOUNTNO &&
                          formData?.EmpMst.BANKACCOUNTNO !==
                          formData?.EmpMst.Cnf_BANKACCOUNTNO
                        ) {
                          e.preventDefault();

                          showSideAlert(
                            "Account No is Not Matched with Confirm Account No.",
                            "info",
                          );
                        }
                      }}
                      redlabel={isMandatory("Cnf_BANKACCOUNTNO") ? "*" : ""}
                    />
                  </div>

                  {/* Verify Button */}
                  <div className="flex-[1]">
                    <button
                      type="button"
                      onClick={() => VerifyAccountNo(13)}
                      disabled={
                        IsVerifyAccountApi || ViewAccountData || isBankLocked
                      }
                      className={`h-[24px] w-full px-2 rounded-xl text-xs font-semibold
                    flex items-center justify-center gap-1.5 transition
                    ${accountButtonVariant === "update"
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-[#4F46E5] text-white hover:bg-[#433df0]"
                        }
                 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {IsVerifyAccountApi ? (
                        <span className="animate-spin">⏳</span>
                      ) : (
                        <ScanLine className="h-3.5 w-3.5" />
                      )}

                      {accountButtonLabel}
                    </button>
                  </div>
                </div>

                {/* ✅ IFSC + Verify - Side by side (width kam) */}
                <div className="flex items-end gap-2 relative">
                  <div className="flex-[2]">
                    {" "}
                    {/* ✅ IFSC input ko 2/3 width */}
                    <Einput
                      type="text"
                      ShortName
                      title="IFSC Code:"
                      name="ifsc_code"
                      value={formData?.EmpMst?.ifsc_code}
                      handleInputChange={handleInputChange}
                      disabled={ViewIFSCData || isBankLocked}
                      redlabel={isMandatory("ifsc_code") ? "*" : ""}
                    />
                  </div>

                  <div className="flex-[1]">
                    {" "}
                    {/* ✅ Verify button ko 1/3 width */}
                    <button
                      type="button"
                      onClick={() => VerifyAccountNo(12)}
                      disabled={
                        (IsVerifyIFSCApi || ViewIFSCData) && isBankLocked
                      }
                      className={`h-[24px] w-full px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition 
                ${IFSCButtonVariant === "update"
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-[#4F46E5] text-white hover:bg-[#433df0]"
                        }
                disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {IsVerifyIFSCApi ? (
                        <span className="animate-spin">⏳</span>
                      ) : (
                        <ScanLine className="h-3.5 w-3.5" />
                      )}
                      {IFSCButtonLabel}
                    </button>
                  </div>

                  {IFSCData && (
                    <>
                      <AiOutlineQuestionCircle
                        size={18}
                        className="absolute right-28 top-[45%] -translate-y-1/2 text-gray-500 cursor-pointer z-10"
                        onClick={() => setshowIFSCTooltip((prev) => !prev)}
                      />

                      {showIFSCTooltip && (
                        <div className="absolute top-full mt-2 right-0 w-[420px] bg-white border rounded shadow p-2 z-50 text-xs dark:bg-input">
                          <div className="flex items-center justify-between">
                            <div>
                              <p>
                                <strong>Address:</strong> {IFSCData.address}
                              </p>
                              <p>
                                <strong>Bank:</strong> {IFSCData.bank}
                              </p>
                              <p>
                                <strong>Branch:</strong> {IFSCData.branch}
                              </p>
                              <p>
                                <strong>City:</strong> {IFSCData.city}
                              </p>
                              <p>
                                <strong>State:</strong> {IFSCData.state}
                              </p>
                              <p>
                                <strong>IFSC:</strong> {IFSCData.ifsc}
                              </p>
                              <p>
                                <strong>MICR:</strong> {IFSCData.micr}
                              </p>
                            </div>
                            <div className="flex items-center pl-2">
                              {accountStatusCode === "VALID" ? (
                                <LottieAnimation width="60px" height="50px" />
                              ) : (
                                <AiOutlineCloseCircle
                                  size={18}
                                  className="text-exit"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Row 2 - Branch Name etc. */}
                <Einput
                  type="text"
                  title="Branch Name:"
                  name="BRANCH"
                  value={formData?.EmpMst?.BRANCH}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("BRANCH") ? "*" : ""}
                  disabled={isBankLocked}
                />

                <Einput
                  type="text"
                  title="Account Holder Name:"
                  name="Emp_Ac_Name"
                  value={formData?.EmpMst?.Emp_Ac_Name}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("Emp_Ac_Name") ? "*" : ""}
                  disabled={isBankLocked}
                />

                <SelectSearch
                  title="Account Type:"
                  name="ACCOUNT_TYPE"
                  options={ACCOUNT_TYPE}
                  selectedValue={formData?.EmpMst?.ACCOUNT_TYPE}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("ACCOUNT_TYPE") ? "*" : ""}
                  disabled={isBankLocked}
                />

                <SelectSearch
                  title="Payment Mode:"
                  name="PAYMENTMODE"
                  handleInputChange={handleInputChange}
                  selectedValue={formData?.EmpMst?.PAYMENTMODE}
                  options={PmtMode}
                  redlabel={isMandatory("PAYMENTMODE") ? "*" : ""}
                  disabled={isBankLocked}
                />
              </div>

              {/* Sal_Hold Checkbox */}
              <label
                htmlFor="Sal_Hold"
                onClick={() => {
                  handleInputChange(
                    "Sal_Hold",
                    formData1?.Sal_Hold === 1 ? 0 : 1,
                  );
                }}
                className="mt-4 flex items-center gap-2 rounded-xl border border-[#E6E8EF] dark:border-[#2A2F3A] bg-[#F8FAFC] dark:bg-[#0B0F19] px-3 py-2 cursor-pointer w-fit"
              >
                <Checkbox
                  checked={formData?.EmpMst?.Sal_Hold === 1}
                  name="Sal_Hold"
                />
                <span className="text-[12px] font-semibold text-[#344054] dark:text-white">
                  Tick if Salary on Hold
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* ===================== RIGHT COLUMN - SALARY BREAKUP ===================== */}
        {user?.role1.includes("1.1.15") && (
          <div className="col-span-12 xl:col-span-4">
            {(() => {
              const monthlyGross = Number(formData1?.Gross_Salary || 0);
              const allocated =
                Number(formData1?.Basic || 0) +
                Number(formData1?.HRA || 0) +
                Number(formData1?.Other || 0) +
                Number(formData1?.Conveyance || 0) +
                Number(formData1?.Medical || 0) +
                Number(formData1?.Washing || 0) +
                Number(formData1?.Uniform || 0);
              const isBalanced =
                monthlyGross > 0 && Math.abs(monthlyGross - allocated) < 1;

              const pfLimit = Number(formData1?.PFSALARY_LIMIT || 0);
              const isPfYes =
                formData?.EmpMst?.PFNO === "1" || formData?.EmpMst?.PFNO === 1;
              const pfPerc = Number(formData?.EmpMst?.pfper || 12);
              const employerPf = isPfYes
                ? Math.round(
                    (pfLimit > 0
                      ? pfLimit
                      : Number(formData1?.Basic || 0)) *
                      (pfPerc / 100),
                  )
                : 0;

              const isEsicYes =
                formData?.EmpMst?.ESINO === "1" || formData?.EmpMst?.ESINO === 1;
              const employerEsic =
                isEsicYes && monthlyGross <= 21000
                  ? Math.round(monthlyGross * 0.0325)
                  : 0;

              const annualGross = monthlyGross * 12;
              const totalCtc = formData1?.CTC
                ? Number(formData1.CTC)
                : annualGross +
                  Number(formData1?.BONUS_AMOUNT || 0) +
                  Number(formData1?.LWF || 0) +
                  (pfLimit > 0 ? pfLimit : employerPf * 12) +
                  Number(formData1?.Gratuity || 0);

              return (
                <div className="w-full rounded-2xl border border-[#E6E8EF] dark:border-[#2A2F3A] bg-white dark:bg-black shadow-sm p-4 sm:p-5 flex flex-col gap-4">
                  {/* Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4F46E5] text-white shadow-sm font-bold text-lg select-none">
                      ₹
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[17px] font-bold text-slate-800 dark:text-slate-100 leading-tight">
                        Salary breakup
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                        Monthly amounts · annual figures calculatve
                      </p>
                    </div>
                  </div>

                  {/* Effective from & Monthly Gross */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                        EFFECTIVE FROM
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          name="Effective_date"
                          value={formData1?.Effective_date || ""}
                          onChange={(e) =>
                            handleInputChange("Effective_date", e.target.value)
                          }
                          disabled={isDailyWagesActive}
                          className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                        MONTHLY GROSS
                      </label>
                      <div className="relative flex items-center h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 focus-within:ring-2 focus-within:ring-[#4F46E5]/20 focus-within:border-[#4F46E5]">
                        <span className="text-slate-400 dark:text-slate-500 font-bold text-base mr-2 select-none">
                          ₹
                        </span>
                        <input
                          type="number"
                          name="Gross_Salary"
                          value={formData1?.Gross_Salary ?? ""}
                          onChange={(e) =>
                            handleInputChange("Gross_Salary", e.target.value)
                          }
                          placeholder="0"
                          disabled={isDailyWagesActive}
                          className="w-full bg-transparent font-bold text-slate-800 dark:text-slate-100 text-base focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSplitSalary()}
                          disabled={isDailyWagesActive || !formData1?.Gross_Salary}
                          className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-[#4F46E5] dark:text-indigo-400 text-xs font-bold shrink-0 transition-colors disabled:opacity-50"
                        >
                          <Wand2 className="h-3.5 w-3.5" />
                          <span>Split</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Allocation progress & badge */}
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600 dark:text-slate-400">
                        ₹{allocated.toLocaleString("en-IN")} of ₹
                        {monthlyGross.toLocaleString("en-IN")} allocated
                      </span>
                      {isBalanced ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                          <Check className="h-3 w-3" strokeWidth={3} /> Balanced
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                          Unbalanced (
                          {allocated > monthlyGross ? "+" : "-"}₹
                          {Math.abs(monthlyGross - allocated).toLocaleString(
                            "en-IN",
                          )}
                          )
                        </span>
                      )}
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isBalanced
                            ? "bg-emerald-500"
                            : allocated > monthlyGross
                              ? "bg-rose-500"
                              : "bg-amber-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            monthlyGross > 0
                              ? (allocated / monthlyGross) * 100
                              : 0,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Breakdown Components Table */}
                  <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/70 overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                    {salaryBreakupItems.map((item) => {
                      const val = Number(formData1?.[item.name] || 0);
                      const pct =
                        monthlyGross > 0
                          ? Math.round((val / monthlyGross) * 100)
                          : ratios[item.ratioKey] || 0;
                      return (
                        <div
                          key={item.name}
                          className="flex items-center justify-between px-4 py-2 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {item.label}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 w-10 text-right">
                              {pct}%
                            </span>
                            <div className="flex items-center px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 w-32 focus-within:ring-2 focus-within:ring-[#4F46E5]/20 focus-within:border-[#4F46E5]">
                              <span className="text-slate-400 text-xs font-bold mr-1 select-none">
                                ₹
                              </span>
                              <input
                                type="number"
                                name={item.name}
                                value={formData1?.[item.name] ?? ""}
                                onChange={(e) =>
                                  handleInputChange(item.name, e.target.value)
                                }
                                disabled={isDailyWagesActive}
                                className="w-full bg-transparent text-right font-bold text-slate-800 dark:text-slate-100 text-sm focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 4 Bottom Inputs Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        EMP SALARY
                      </label>
                      <input
                        type="number"
                        name="Gross_Salary"
                        value={formData1?.Gross_Salary ?? ""}
                        onChange={(e) =>
                          handleInputChange("Gross_Salary", e.target.value)
                        }
                        disabled={isDailyWagesActive}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        PF SALARY LIMIT
                      </label>
                      <input
                        type="number"
                        name="PFSALARY_LIMIT"
                        value={formData1?.PFSALARY_LIMIT ?? ""}
                        onChange={(e) =>
                          handleInputChange("PFSALARY_LIMIT", e.target.value)
                        }
                        disabled={isDailyWagesActive}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        LWF
                      </label>
                      <input
                        type="number"
                        name="LWF"
                        value={formData1?.LWF ?? ""}
                        onChange={(e) =>
                          handleInputChange("LWF", e.target.value)
                        }
                        disabled={isDailyWagesActive}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        BONUS
                      </label>
                      <input
                        type="number"
                        name="BONUS_AMOUNT"
                        value={formData1?.BONUS_AMOUNT ?? ""}
                        onChange={(e) =>
                          handleInputChange("BONUS_AMOUNT", e.target.value)
                        }
                        disabled={isDailyWagesActive || GratuityCompKeyData}
                        className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                      />
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="rounded-2xl bg-[#F8FAFC] dark:bg-[#0B0F19] border border-slate-200/80 dark:border-slate-800 p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        Monthly gross
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        ₹{monthlyGross.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        Employer PF
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {employerPf > 0
                          ? `₹${employerPf.toLocaleString("en-IN")}`
                          : "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        Employer ESIC
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {employerEsic > 0
                          ? `₹${employerEsic.toLocaleString("en-IN")}`
                          : "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        Bonus
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        ₹{Number(formData1?.BONUS_AMOUNT || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="border-t border-slate-200/80 dark:border-slate-800 pt-2.5 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Annual gross
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          ₹{annualGross.toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                          Annual CTC
                        </span>
                        <span className="font-extrabold text-xl text-[#4F46E5] dark:text-indigo-400">
                          ₹{totalCtc.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Daily Wages alternative mode if enabled */}
                  {DalyWagescompKeyData && (
                    <div className="rounded-xl border border-[#E6E8EF] dark:border-[#2A2F3A] bg-[#F8FAFC] dark:bg-[#0B0F19] p-3.5">
                      <div className="text-exit font-bold text-sm mb-2">
                        Daily Wages (Alternative Salary Mode)
                      </div>
                      <Einput
                        title="Daily Wages"
                        name="Daily_Wages"
                        value={formData1.Daily_Wages}
                        handleInputChange={handleInputChange}
                        disabled={falg1 || isSalaryBreakupActive}
                      />
                    </div>
                  )}

                  {/* Approval Status */}
                  {salaryMessage && (
                    <div className="flex text-left justify-center">
                      <p
                        className={`text-[14px] font-semibold ${
                          salarystatus == 2 ? "text-save" : "text-exit"
                        }`}
                      >
                        {salaryMessage}
                      </p>
                    </div>
                  )}

                  {/* Bottom Action Buttons */}
                  <div className="flex items-center gap-3 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-black text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 shadow-xs shrink-0"
                      onClick={() => OutServiceView(formData?.EmpMst?.EMPCODE)}
                      disabled={disapleForSalary || !formData?.EmpMst?.EMPCODE}
                    >
                      <History className="h-4 w-4" />
                      <span>History</span>
                    </Button>

                    <Button
                      type="button"
                      onClick={handleSaveSalaryBreakup}
                      className="h-11 px-5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold flex-1 flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                      <span>Save salary details</span>
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}


        {/* ===================== DIALOGS ===================== */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-full dark:bg-primaryop bg-off max-w-screen-md xs:h-auto overflow-y-scroll">
            <DialogHeader>
              <DialogTitle className="mt-2 ml-3 flex">
                <DialogTitle>Please Fill the OTP</DialogTitle>
              </DialogTitle>
              <hr className="bg-body-color mx-2" />
              <DialogDescription>
                <div className="grid grid-cols-12 gap-2 p-4">
                  <div className="flex col-span-12 justify-between">
                    <div className="col-span-12 text-exit">{Error}</div>
                    <div className="col-span-12 text-lg text-exit">
                      {Math.floor(timeRemaining / 60)}:
                      {("0" + (timeRemaining % 60)).slice(-2)}
                    </div>
                  </div>

                  <div className="lg:col-span-6 md:col-span-6 col-span-12">
                    <Einput
                      title="OTP"
                      type="text"
                      name="OTP"
                      value={formData1?.OTP}
                      handleInputChange={handleInputChange}
                    />
                  </div>
                  <div className="lg:col-span-6 md:col-span-6 col-span-12">
                    <Button
                      className="lg:mt-6 md:mt-6 mt-2"
                      variant={"update"}
                      onClick={disebal}
                    >
                      submit
                    </Button>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        <Dialog open={isDialogOpen1} onOpenChange={setIsDialogOpen1}>
          <DialogContent className="w-full dark:bg-primaryop bg-off max-w-screen-md xs:h-auto overflow-y-scroll">
            <DialogHeader>
              <DialogTitle className="mt-2 ml-3 flex">
                <DialogTitle>Please Fill the OTP</DialogTitle>
              </DialogTitle>
              <hr className="bg-body-color mx-2" />
              <DialogDescription>
                <div className="grid grid-cols-12 gap-2 p-4">
                  <div className="flex col-span-12 justify-between">
                    <div className="col-span-12 text-exit">{Error}</div>
                    <div className="col-span-12 text-lg text-exit">
                      {Math.floor(timeRemaining / 60)}:
                      {("0" + (timeRemaining % 60)).slice(-2)}
                    </div>
                  </div>

                  <div className="lg:col-span-6 md:col-span-6 col-span-12">
                    <Einput
                      title="OTP"
                      type="text"
                      name="OTP"
                      value={formData1?.OTP}
                      handleInputChange={handleInputChange}
                    />
                  </div>
                  <div className="lg:col-span-6 md:col-span-6 col-span-12">
                    <Button
                      className="lg:mt-6 md:mt-6 mt-2"
                      variant={"update"}
                      onClick={disebal1}
                    >
                      submit
                    </Button>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        {/* Update Salary Details Dialog */}
        <Dialog open={isDialogOpen2} onOpenChange={setIsDialogOpen2}>
          <DialogContent
            className="
      w-[95vw] max-w-[760px]
      max-h-[90vh] overflow-y-auto
      p-0 overflow-hidden
      bg-white dark:bg-[#0B1220]
      border border-slate-200 dark:border-slate-800
      rounded-2xl
    "
          >
            <DialogHeader className="p-0">
              {/* ===== HEADER (like screenshot) ===== */}
              <div className="flex items-start justify-between gap-4 px-6 py-4 bg-gradient-to-b from-[#0E2A57] to-[#132A55] text-white">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid h-10 w-10 place-items-center rounded-xl bg-[#2e4069] ring-1 ring-white/10">
                    <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                      <IndianRupee className="h-8 w-8" />
                    </span>
                  </div>

                  <div className="min-w-0">
                    <DialogTitle className="text-[14px] font-semibold tracking-[0.12em] uppercase text-white">
                      Update Salary Details
                    </DialogTitle>

                    <div className="mt-1 text-[12px] text-white/70 truncate">
                      {(formData?.EmpMst?.EMPFIRSTNAME || "").toString()}{" "}
                      {(formData?.EmpMst?.EMPLASTNAME || "").toString()}
                      {formData?.EmpMst?.EMPCODE
                        ? ` · Emp code ${formData.EmpMst.EMPCODE}`
                        : ""}
                      {formData?.EmpMst?.DIVISION
                        ? ` · ${formData.EmpMst.DIVISION}`
                        : ""}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDialogOpen2(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/15 ring-1 ring-white/10"
                  aria-label="Close"
                >
                  <span className="text-lg leading-none">×</span>
                </button>
              </div>

              <DialogDescription className="p-0">
                <div className="px-6 py-5">
                  {Error ? (
                    <div className="mb-4 text-sm font-medium text-red-600">
                      {Error}
                    </div>
                  ) : null}

                  {/* ===== BASIS ===== */}
                  <div className="pt-1">
                    <div className="text-[11px] font-semibold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                      BASIS
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <SelectSearch
                        title="Salary Type"
                        name="Salary_Type"
                        options={SLTY}
                        selectedValue={formData1?.Salary_Type}
                        handleInputChange={handleInputChange}
                        className="text-right"
                        disabled={isDailyWagesActive}
                      />

                      <Einput
                        type="date"
                        title="Effective From"
                        ShortName={true}
                        name="Effective_date"
                        handleInputChange={handleInputChange}
                        value={formData1?.Effective_date}
                        disabled={isDailyWagesActive}
                      />

                      {(salaryType === "1" || formData1?.Salary_Type === "1") && (
                        <Einput
                          type="text"
                          title="Proposed salary"
                          name="Proposed_Salary"
                          handleInputChange={handleInputChange}
                          value={formData1?.Proposed_Salary}
                          className="text-right"
                        />
                      )}
                    </div>
                  </div>

                  <div className="my-5 h-px bg-slate-200 dark:bg-slate-800" />

                  {/* ===== EARNINGS — MONTHLY ===== */}
                  <div>
                    <div className="text-[11px] font-semibold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                      EARNINGS — MONTHLY
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <Einput
                        type="number"
                        title="Emp Basic"
                        name="Basic"
                        handleInputChange={handleInputChange}
                        value={formData1?.Basic?.toString()}
                        className="text-right"
                        disabled={isDailyWagesActive}
                      />

                      <Einput
                        type="number"
                        title="HRA"
                        name="HRA"
                        ShortName={true}
                        handleInputChange={handleInputChange}
                        value={formData1?.HRA?.toString()}
                        className="text-right"
                        disabled={isDailyWagesActive}
                      />

                      <Einput
                        type="number"
                        title="Conveyance"
                        name="Conveyance"
                        handleInputChange={handleInputChange}
                        value={formData1?.Conveyance?.toString()}
                        className="text-right"
                        disabled={isDailyWagesActive}
                      />

                      <Einput
                        type="number"
                        title="Medical"
                        name="Medical"
                        handleInputChange={handleInputChange}
                        value={formData1?.Medical?.toString()}
                        className="text-right"
                        disabled={isDailyWagesActive}
                      />

                      <Einput
                        type="number"
                        title="DA"
                        name="Other"
                        ShortName={true}
                        handleInputChange={handleInputChange}
                        value={formData1?.Other?.toString()}
                        className="text-right"
                        disabled={isDailyWagesActive}
                      />

                      <Einput
                        type="number"
                        title="Washing"
                        name="Washing"
                        handleInputChange={handleInputChange}
                        value={formData1?.Washing?.toString()}
                        className="text-right"
                        disabled={isDailyWagesActive}
                      />

                      <Einput
                        type="number"
                        title="Uniform Amt"
                        name="Uniform"
                        handleInputChange={handleInputChange}
                        value={formData1?.Uniform?.toString()}
                        className="text-right"
                        disabled={isDailyWagesActive}
                      />

                      <Einput
                        type="number"
                        title="Monthly Gross"
                        name="Gross_Salary"
                        handleInputChange={handleInputChange}
                        value={formData1?.Gross_Salary?.toString()}
                        className="text-right"
                        disabled={isDailyWagesActive}
                      />
                    </div>
                  </div>

                  <div className="my-5 h-px bg-slate-200 dark:bg-slate-800" />

                  {/* ===== STATUTORY ===== */}
                  <div>
                    <div className="text-[11px] font-semibold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                      STATUTORY
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Einput
                        type="number"
                        title="PF Salary Limit"
                        name="PFSALARY_LIMIT"
                        ShortName={true}
                        handleInputChange={handleInputChange}
                        value={formData1?.PFSALARY_LIMIT?.toString()}
                        className="text-right"
                        disabled={isDailyWagesActive}
                      />

                      <Einput
                        type="number"
                        title="Bonus (annual)"
                        name="BONUS_AMOUNT"
                        handleInputChange={handleInputChange}
                        value={formData1?.BONUS_AMOUNT?.toString()}
                        className="text-right"
                        disabled={isDailyWagesActive || GratuityCompKeyData}
                      />

                      {GratuityCompKeyData && (
                        <Einput
                          type="number"
                          title="Gratuity"
                          name="Gratuity"
                          handleInputChange={handleInputChange}
                          value={formData1?.Gratuity?.toString()}
                          className="text-right"
                          disabled={true}
                        />
                      )}

                      {DalyWagescompKeyData && (
                        <Einput
                          type="number"
                          title="Daily Wages"
                          name="Daily_Wages"
                          handleInputChange={handleInputChange}
                          value={formData1?.Daily_Wages?.toString()}
                          className="text-right"
                          disabled={isSalaryBreakupActive}
                        />
                      )}
                    </div>
                  </div>

                  {/* ===== SUMMARY STRIP (like screenshot) ===== */}
                  <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#F3F6FF] dark:bg-[#0F1A2D] p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-[11px] font-semibold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                          MONTHLY GROSS
                        </div>
                        <div className="mt-1 text-[18px] font-bold text-slate-900 dark:text-slate-100">
                          ₹{Number(formData1?.Gross_Salary || 0).toLocaleString("en-IN")}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                          ANNUAL GROSS
                        </div>
                        <div className="mt-1 text-[18px] font-bold text-slate-900 dark:text-slate-100">
                          ₹{Number(formData1?.ANNUAL_CTC || 0).toLocaleString("en-IN")}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                          TOTAL CTC
                        </div>
                        <div className="mt-1 text-[18px] font-bold text-indigo-700 dark:text-indigo-300">
                          ₹{Number(formData1?.CTC || 0).toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* FOOTER (note + actions) */}
                  <div className="mt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Annual gross + bonus = CTC. Values auto-calculate as you type.
                    </div>

                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsDialogOpen2(false)}
                        className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50
                           dark:border-slate-800 dark:bg-[#0B1220] dark:text-slate-200 dark:hover:bg-[#0F1A2D]"
                      >
                        Cancel
                      </button>

                      <Button
                        className="h-10 rounded-xl px-5 bg-[#4F46E5] text-white font-large hover:bg-[#433df0] dark:bg-[#4F46E5] dark:hover:bg-[#433df0]"
                        variant={"save"}
                        onClick={saveData}
                      >
                        Save Salary Details
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
        {/* See History Dialog */}
        <Dialog open={isDialogOpen3} onOpenChange={setIsDialogOpen3}>
          <DialogContent className="w-full max-w-5xl max-h-[88vh] overflow-y-auto rounded-2xl p-0 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] shadow-2xl">
            <div className="sticky top-0 z-10 bg-slate-900 text-white px-7 py-5 rounded-t-2xl flex items-center justify-between border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold tracking-wide uppercase">
                  EMPLOYEE SALARY REVIEW
                </h2>
                {SalaryData.length > 0 && (
                  <p className="text-sm text-slate-300 font-medium mt-1">
                    {SalaryData[0].EMPLOYEEDESIGNATION} · {SalaryData[0].DEPARTMENT} ·{" "}
                    {SalaryData[0].EMPLOYEENAME} ({SalaryData[0].Emp_Code})
                  </p>
                )}
              </div>
            </div>

            <div className="p-7 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {SalaryData.map((item, index) => (
                  <div
                    key={index}
                    className="bg-slate-50/90 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                      <span className="text-sm sm:text-[15px] font-bold text-[#4338CA] dark:text-indigo-400 uppercase tracking-wide">
                        {item.STATUS === "PENDING" ? (
                          <span className="text-amber-500 font-bold">PENDING</span>
                        ) : index < SalaryData.length - 1 ? (
                          <>
                            {new Date(item.Effective_date).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            —{" "}
                            {new Date(
                              SalaryData[index + 1].Effective_date
                            ).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </>
                        ) : (
                          <>
                            {new Date(item.Effective_date).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            — Ongoing
                          </>
                        )}
                      </span>
                      <span className="px-3.5 py-1.5 rounded-full text-sm font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 shadow-2xs">
                        {item.Daily_Wages
                          ? `Daily Wages: ₹${Number(item.Daily_Wages).toLocaleString("en-IN")}`
                          : `Gross: ₹${item.Gross_Salary ? Number(item.Gross_Salary).toLocaleString("en-IN") : "0"}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      {item.Daily_Wages ? (
                        <>
                          <div className="col-span-2 text-slate-600 dark:text-slate-400 font-medium text-sm">
                            Daily Wages: <strong className="text-slate-900 dark:text-slate-100 font-bold font-mono text-base ml-1">₹{Number(item.Daily_Wages).toLocaleString("en-IN")}</strong>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-slate-600 dark:text-slate-400 font-medium text-sm">
                            Basic: <strong className="text-slate-900 dark:text-slate-100 font-bold font-mono text-base ml-1">₹{item.Basic ? Number(item.Basic).toLocaleString("en-IN") : "0"}</strong>
                          </div>
                          <div className="text-slate-600 dark:text-slate-400 font-medium text-sm">
                            HRA: <strong className="text-slate-900 dark:text-slate-100 font-bold font-mono text-base ml-1">₹{item.HRA ? Number(item.HRA).toLocaleString("en-IN") : "0"}</strong>
                          </div>
                          <div className="text-slate-600 dark:text-slate-400 font-medium text-sm">
                            Conveyance: <strong className="text-slate-900 dark:text-slate-100 font-bold font-mono text-base ml-1">₹{item.Conveyance ? Number(item.Conveyance).toLocaleString("en-IN") : "0"}</strong>
                          </div>
                          <div className="text-slate-600 dark:text-slate-400 font-medium text-sm">
                            Medical: <strong className="text-slate-900 dark:text-slate-100 font-bold font-mono text-base ml-1">₹{item.Medical ? Number(item.Medical).toLocaleString("en-IN") : "0"}</strong>
                          </div>
                          <div className="text-slate-600 dark:text-slate-400 font-medium text-sm">
                            Washing: <strong className="text-slate-900 dark:text-slate-100 font-bold font-mono text-base ml-1">₹{item.Washing ? Number(item.Washing).toLocaleString("en-IN") : "0"}</strong>
                          </div>
                          <div className="text-slate-600 dark:text-slate-400 font-medium text-sm">
                            Other: <strong className="text-slate-900 dark:text-slate-100 font-bold font-mono text-base ml-1">₹{item.Other ? Number(item.Other).toLocaleString("en-IN") : "0"}</strong>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium flex flex-wrap justify-between items-center">
                      <span>User: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{item.MODIFIED_USER || "—"}</strong></span>
                      <span>Date: <strong className="text-slate-700 dark:text-slate-200 font-semibold font-mono">{item.MOD_DATE ? item.MOD_DATE.split("-").reverse().join("-") : "—"}</strong></span>
                    </div>
                  </div>
                ))}
              </div>

              {SalaryData.length === 0 && (
                <div className="text-center py-12 text-base text-slate-400 font-medium">
                  No past salary revision records found.
                </div>
              )}

              {SalaryData.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 text-center font-bold text-sm text-slate-600 dark:text-slate-300">
                  Total Records: {SalaryData.length}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <HashloaderComponent isLoading={isLoading} />
      </div>
    </div>
  );
};
export default SalaryDetails;
