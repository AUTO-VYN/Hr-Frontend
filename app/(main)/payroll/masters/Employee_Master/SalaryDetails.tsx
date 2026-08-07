"use client";
import Acheckbox from "@/components/atoms/Checkbox";
import Ainput from "@/components/atoms/Input";
import SelectSearch from "@/components/atoms/Select";
import SmallTitle from "@/components/atoms/smallTitle";
import { useFormData } from "./Context/FormDataContext";
import { Button } from "@/components/ui/button";
import Eselect from "@/components/atoms/Eselect";
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
import { LuRefreshCcwDot } from "react-icons/lu";
import { AiOutlineCloseCircle, AiOutlineQuestionCircle } from "react-icons/ai";
import LottieAnimation from "@/components/atoms/LottieAnimation";
import { useSecureStorage } from "@/app/hooks/comp-key-data";
import { useToast } from "@/app/hooks/useToast";

const SalaryDetails = ({ disapleForSalary, isActiveTab, isMandatory, masterData }) => {
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
    // { value: "1", label: "10" },
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

  const convertValuesToString = (array) => {
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
  // add new
  const [salaryType, setSalaryType] = useState("");
  const [IsVerifyAccountApi, setIsVerifyAccountApi] = useState(false);
  const [ViewAccountData, SetViewAccountData] = useState(false); // controls showing icon
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
  const [ViewIFSCData, setViewIFSCData] = useState(false); // controls showing icon
  const [showIFSCTooltip, setshowIFSCTooltip] = useState(false);
  const [IFSCData, setIFSCData] = useState(null);
  const [IFSCButtonVariant, setIFSCButtonVariant] = useState<"save" | "update">(
    "save"
  );
  const [IFSCButtonLabel, setIFSCButtonLabel] = useState<"Verify" | "Verified">(
    "Verify"
  );
  const [isBankLocked, setIsBankLocked] = useState(false);
  const [confirmAccountDisabled, setConfirmAccountDisabled] = useState(false);


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
    PF_Date: null, //
    PFNO: null, //
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
    "Other",        // DA
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
    v !== null && v !== undefined && v.toString().trim() !== "" && Number(v) !== 0;

  const handleInputChange = (name: string, value: any) => {

    if (name === "Daily_Wages") {
      if (hasMeaningfulValue(value) &&
        BREAKUP_AMOUNT_FIELDS.some((f) => hasMeaningfulValue(formData1?.[f]))) {
        showSideAlert(
          "Please clear the salary breakup fields before entering Daily Wages.",
          "warning"
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
          "warning"
        );
        return;
      }
    }
    // PF / ESI logic
    if (name === "PFNO") {
      const selectedLabel = PFYN.find((opt) => opt.value === value)?.label;

      // Enable fields if YES, disable and clear if NO
      const disablePFFields = selectedLabel !== "YES";
      SetPfdisabled(disablePFFields);

      if (disablePFFields) {
        // Clear PF% and PF Effective date if PF is NO
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
          // Clear fields if ESIC is NO
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

      console.log(ratios, "ratios");
      // Auto-calculate based on ratios when Basic is updated
      if (name === "Gross_Salary" && ratios) {
        const basicValue = Number(value || 0);
        updatedData.Basic = (basicValue * ratios.Basic) / 100;
        updatedData.Uniform = (basicValue * ratios.Uniform) / 100;
        updatedData.HRA = (basicValue * ratios.HRA) / 100;
        updatedData.Conveyance = (basicValue * ratios.Conveyance) / 100;
        updatedData.Medical = (basicValue * ratios.Medical) / 100;
        updatedData.Other = (basicValue * ratios.DA) / 100; // DA
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

      // if (monthlyGross > 833333) {
      //   alert(
      //     "Monthly gross salary cannot exceed ₹8,33,333 (₹1 crore annually). Please enter valid values."
      //   );
      //   return prevData; // reject the update
      // }

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

    // Update EmpMst part
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
  const [isClicked, setIsClicked] = useState(false); // for spinner
  const [notifyMessage, setNotifyMessage] = useState(""); // track result
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
        }
      );

      console.log(response.data, "Breakup Ratio Response");

      const ratioData = response.data.Result[0]; // assuming response returns array
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
        }
      );

      const { status, message } = response.data;

      // Reset first
      setsalarystatus(null);

      if (status === 2) {
        // ✅ Approved
        setsalarystatus(2);
        setSalaryMessage(message);
      }
      else if (status === 0) {
        // ❌ Rejected
        setsalarystatus(0);
        setSalaryMessage(message);
      }
      else if (status === 3) {
        // ⏳ Pending at Level
        setsalarystatus(3);
        setSalaryMessage(message);
      }
      else {
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
        }
      );
      console.log(response, "sendOTP");
      const a = response.data.Message;
      console.log(a, "aaaa");
      if (response.status == 201) {
        await handleUnLockBankDetails()
        Swal.fire({
          icon: "warning",
          title: "Warning!",
          text: `${response.data.Message}`,
        });
      } else {
        setIsDialogOpen1(true);
        setOtp(response.data.Otp);
        console.log(response, "Data saved successfully.");
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
      await handleUnLockBankDetails()
      setIsDialogOpen1(false);
      setFormData1((prevData) => ({
        ...prevData,
        OTP: "",
      }));
    }
  };

  const handleUnLockBankDetails = async () => {

    const emp = formData?.EmpMst;

    // ----- VALIDATION FIRST (Do NOT lock UI before this) -----
    const requiredFields = [
      { key: "EMPCODE", label: "Employee Code" }
    ];

    for (const field of requiredFields) {
      if (!emp?.[field.key]) {
        toast({
          title: `Please Enter ${field.label}`,
          variant: "destructive",
        });
        return;
      }
    }

    // ----- API CALL -----
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
        }
      );

      if (result.data.success) {
        // ----- LOCK THE UI ONLY AFTER VALIDATION -----
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
    console.log(formData?.EmpMst.EMPCODE, "formData.EmpMst.EMPCODE");
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
        }
      );

      console.log(response, "response");

      if (response?.data?.Result?.length > 0) {
        const empData = response.data.Result[0];
        if (empData?.Effective_date || empData?.Gross_Salary) {
          setIsSalarySaved(true);
        } else {
          setIsSalarySaved(false);
        }
        // --- Calculate CTC ---
        const annualGross = Number(empData?.ANNUAL_CTC || 0);
        const BONUS_AMOUNT = Number(empData?.BONUS_AMOUNT || 0);
        const LWF = Number(empData?.LWF || 0);
        const PFSALARY_LIMIT = Number(empData?.PFSALARY_LIMIT || 0);
        const Gratuity = Number(empData?.Gratuity || 0);
        const ctc = annualGross + BONUS_AMOUNT + LWF + PFSALARY_LIMIT + Gratuity;

        const updatedData = {
          ...empData,
          CTC: ctc,
        };

        setFormData1(updatedData);

        // --- PF Logic ---
        const pfValue = empData?.PFNO?.toString(); // "1" or "0"
        const pfLabel = PFYN.find((opt) => opt.value === pfValue)?.label;
        const pfDisabled = pfLabel !== "YES";
        SetPfdisabled(pfDisabled);

        // --- ESIC Logic ---
        const esicValue = empData?.ESINO?.toString(); // "1" or "0"
        const esicLabel = yesno.find((opt) => opt.value === esicValue)?.label;
        const esicDisabled = esicLabel !== "YES";
        SetPfdisabled1(esicDisabled);

        // --- Update formData.EmpMst with disabled/cleared fields if needed ---
        setFormData((prev) => ({
          ...prev,
          EmpMst: {
            ...prev.EmpMst,
            // PF fields
            pfper: pfDisabled ? "" : empData?.pfper,
            PF_Date: pfDisabled ? "" : empData?.PF_Date,
            // ESIC fields
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
    console.log(isDailyWages, "isDailyWages")
    if (!isDailyWages) {
      if (formData1?.Salary_Type == null) {
        showSideAlert("Please Select Salary Type", "warning");
        console.log("Please Select Salary Type");
        return;
      }
      if (formData1?.Effective_date == null) {
        showSideAlert("Please Select Effective Date", "warning");
        console.log("Please Select Effective Date");
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

      // User entered Gross CTC
      const grossCTC = Number(formData1?.Gross_Salary || 0);

      // Validation 1: Gross CTC must match calculated monthly gross
      if (grossCTC !== calculatedGross) {
        showSideAlert(
          `Gross CTC (${grossCTC}) must match total monthly components (${calculatedGross}).`,
          "warning"
        );
        return;
      }

      const selectedDate = new Date(formData1.Effective_date);
      const joinDateStr = formData.EmpMst?.CURRENTJOINDATE;

      // convert join date string to Date object if available
      const joinDate = joinDateStr ? new Date(joinDateStr) : null;

      // clear time parts to compare only by date
      selectedDate.setHours(0, 0, 0, 0);
      if (joinDate) joinDate.setHours(0, 0, 0, 0);

      console.log(selectedDate, "selectedDate");
      console.log(joinDate, "joinDate");

      // ✅ validation: effective date cannot be before current join date
      if (joinDate && selectedDate < joinDate) {
        showSideAlert(
          `Effective date cannot be before employee's join date (${joinDate.toLocaleDateString("en-GB")}).`,
          "warning"
        );
        console.log("Effective date is before join date.");
        return;
      }
    } else if (
      SALARY_COMPONENT_FIELDS.filter(
        (f) => f !== "Salary_Type" && f !== "Effective_date"
      ).some((f) => hasMeaningfulValue(formData1?.[f]))
    ) {
      showSideAlert(
        "Please clear salary breakup fields when Daily Wages is entered.",
        "warning"
      );
      return;
    }
    // console.log(formData1.PFSALARY_LIMIT , "formData1.PFSALARY_LIMIT")
    const pfLimit = formData1.PFSALARY_LIMIT;

    // Blank allow hai
    if (pfLimit !== null && pfLimit !== undefined && pfLimit !== "" && Number(pfLimit) !== 0) {
      const pfValue = Number(pfLimit);
      if (Number.isNaN(pfValue)) {
        showSideAlert("Please enter a valid PF Salary Limit.", "warning");
        return;
      }

      if (pfValue < 15000) {
        showSideAlert(
          "PF Salary Limit must be 15000 or greater, or leave it blank.",
          "warning"
        );
        return;
      }
    }

    setmessageShowFlage(true);
    // setIsLoading(true);
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
        }
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
      console.log("Error Response", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_URL}/employee/masters`,
      {},
      {
        headers: {
          compcode: user?.Comp_Code,
          name: user?.name,
        },
      }
    );
    // console.log(data, "masterDataaa");
    setEmpShift(response.data.data.EMP_SHIFT);
    setBankoption(response.data.data.BANK);
    setPFPERCoption(response.data.data.PFPERC);
    setGRADEoption(response.data.data.GradeMstData);
  };

  const handleChangeSalaryDetails = async () => {
    console.log(formData1, 'komalall')
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
        }
      );

      // ✅ FIX: Process the data to ensure MODIFIED_USER is set
      const processedData = result.data.Result.map(item => {
        // If MODIFIED_USER is null/undefined but Mod_User exists, try to get username
        if (!item.MODIFIED_USER && item.Mod_User) {
          // You can either:
          // 1. Use the Mod_User as is (if it's already a username)
          // 2. Or fetch usernames in batch (more complex)
          // 3. Or show Mod_User as fallback
          return {
            ...item,
            MODIFIED_USER: item.Mod_User || 'System' // Fallback value
          };
        }
        return item;
      });

      const sortedData = processedData.sort(
        (a, b) => new Date(a.Effective_date) - new Date(b.Effective_date)
      );
      setSalaryData(sortedData);
    } catch (error) {
      console.error("Error occurred while making the request:", error);
    }
  };

  const UpdateBankdetails = async () => {
    if (!formData?.EmpMst.EMPCODE) {
      toast({
        title: "Please Enter EmpCode",
        variant: "destructive",
      });
      return;
    }

    if (!formData?.EmpMst.PAYMENTMODE) {
      toast({
        title: "Please Enter Payment Mode",
        variant: "destructive",
      });
      return;
    }
    const skipBankValidation = ["Cash", "Salary Hold"].includes(
      formData?.EmpMst?.PAYMENTMODE
    );

    if (!skipBankValidation) {
      if (!formData?.EmpMst.BANKNAME) {
        toast({
          title: "Please Enter Bank Name",
          variant: "destructive",
        });
        return;
      }
      if (!formData?.EmpMst.ACCOUNT_TYPE) {
        toast({
          title: "Please Enter Account Type",
          variant: "destructive",
        });
        return;
      }
      if (!formData?.EmpMst.BANKACCOUNTNO) {
        toast({
          title: "Please Enter Bank Account Number",
          variant: "destructive",
        });
        return;
      }
      if (!formData?.EmpMst.BRANCH) {
        toast({
          title: "Please Enter Branch",
          variant: "destructive",
        });
        return;
      }
      if (!formData?.EmpMst.ifsc_code) {
        toast({
          title: "Please Enter IFSC Code",
          variant: "destructive",
        });
        return;
      }
      if (!formData?.EmpMst.Emp_Ac_Name) {
        toast({
          title: "Please Enter Employee Account Name",
          variant: "destructive",
        });
        return;
      }
      const accNo = formData?.EmpMst.BANKACCOUNTNO?.toString() || "";

      const cnfAccNo = formData?.EmpMst.Cnf_BANKACCOUNTNO?.toString() || "";
      if (accNo.length < 10 || cnfAccNo.length < 10) {
        toast({
          title: "Account numbers must be at least 10 digits long.",
          variant: "destructive",
        });
        return;
      }
      if (accNo != cnfAccNo) {
        toast({
          title: "Account No and Confirm Account No do not match.",
          variant: "destructive",
        });
        return;
      }
    }


    // setIsClicked(true); // show spinner
    console.log(user, "useruseruseruseruser");
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
        }
      );

      toast({ title: result.data.Message, variant: "default" });
      const reupdate = result.data?.Reupdate;

      if (reupdate) {
        setIsReupdate(true); // will show refresh + wait
        setIsClicked(true); // trigger polling spinner
        pollNotifyApprover(formData?.EmpMst?.EMPCODE);
      } else {
        // first time update – no polling, just update done
        setIsReupdate(false);
        setIsClicked(false); // back to update button
      }
    } catch (error) {
      console.error("Error occurred while making the request:", error);
      toast({
        title: error?.response?.data?.Message || "Request failed",
        variant: "destructive",
      });
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
      clearInterval(pollingRef.current); // clear previous if any
    }
    pollingRef.current = setInterval(async () => {
      try {
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/EmpMaster/NotifyApprover`,
          { empcode },
          {
            headers: { compcode: user?.Comp_Code },
          }
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
    }, 30000); // every 30 seconds
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
          }
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

    checkAndStartPolling(); // check on page enter

    return () => {
      // this runs when you leave the page
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

  // ✅ When COMP_KEYDATA.Gratuity flag is ON, auto-calculate:
  //    Gratuity = 4.81% of Basic
  //    Bonus    = 8.33% of Basic
  useEffect(() => {
    if (!GratuityCompKeyData) return;

    const basicVal = Number(formData1?.Basic || 0);
    const calculatedGratuity = +(basicVal * 0.0481).toFixed(2);
    const calculatedBonus = +(basicVal * 0.0833).toFixed(2);

    const gratuityChanged = Number(formData1?.Gratuity || 0) !== calculatedGratuity;
    const bonusChanged = Number(formData1?.BONUS_AMOUNT || 0) !== calculatedBonus;

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

    // ✅ ACCOUNT MATCH VALIDATION
    if (option === 13) {
      if (!accNo) {
        toast({ title: "Please Enter Account No.", variant: "destructive" });
        return;
      }

      if (!cnfAccNo) {
        toast({ title: "Please Enter Confirm Account No.", variant: "destructive" });
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

    // ✅ COMMON VALIDATION
    if (!formData?.EmpMst?.ifsc_code) {
      toast({ title: "Please Enter IFSC Code", variant: "destructive" });
      return;
    }

    if (!formData?.EmpMst?.BANKACCOUNTNO) {
      toast({ title: "Please Fill Bank Account No.", variant: "destructive" });
      return;
    }

    // ✅ BUTTON PERMISSION CHECK
    if (option === 13 && compdata?.Banking_AccountNo_Verify !== 1) {
      showSideAlert("Verify Button Is Not Enabled, Please Contact Autovyn Team!.", "error");
      return;
    }

    if (option === 12 && compdata?.Banking_IFSC_Verfy !== 1) {
      showSideAlert("Verify Button Is Not Enabled, Please Contact Autovyn Team!.", "error");
      return;
    }

    // ✅ LOADER SET
    option === 13 ? setIsVerifyAccountApi(true) : setIsVerifyIFSCApi(true);

    // 🔁 API FUNCTIONS
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
        }
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
        }
      );
    };

    let result;

    try {
      //  STEP 1: TRY PRIMARY API
      try {
        result = await callPrimaryApi();
        console.log("Primary API Success", result);
        // Check account status code
        const accountStatusCode = result?.data?.data?.result?.account_status;
        setAccountStatusCode(accountStatusCode);
        console.log(accountStatusCode, 'accountStatusCode')
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
        console.log("Primary API Failed → Switching to Secondary", primaryError);
        setBankMode("secondary")
        //  STEP 2: FALLBACK
        result = await callSecondaryApi();
      }

      console.log("Final Result", result);

      // ✅ COMMON RESPONSE HANDLING
      if (result?.status === 200) {
        const data = result?.data;
        // ===============================
        //  ACCOUNT VERIFY (option 13)
        // ===============================
        if (option === 13) {
          const isSuccess =
            data?.data?.status === "success" ||
            data?.data?.account_exists === true ||
            data?.result?.account_status == "VALID"
          if (isSuccess) {
            const accountDataResult = await ShowAccountVerifyData(formData?.EmpMst);
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

        // ===============================
        // IFSC VERIFY (option 12)
        // ===============================
        if (option === 12) {
          const ifscDetails =
            data?.data?.result?.ifsc_details || data?.data?.result || data?.data || data || {};
          console.log(ifscDetails, "ifscDetails")
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
      console.log("Both APIs Failed", error);

      showSideAlert(error?.response?.data?.error ||
        error?.response?.data?.error?.detail?.message ||
        "Both verification APIs failed.",
        "error"
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
        }
      );
      console.log(result?.data, 'result?.data')
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

    if (!ifsc || !accNo) return; // no data to verify

    try {
      const result = await ShowAccountVerifyData({
        ifsc_code: ifsc,
        BANKACCOUNTNO: accNo,
      });

      console.log(result, "resultresultresultresultresultresult");
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

    if (!ifsc) return; // no data to verify

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
        }
      );
      console.log(result?.data, "result?.data");
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
        console.log(ifscResult, 'ifscResultifscResultifscResultifscResult')
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

    const skipBankValidation = ["Cash", "Salary Hold"].includes(emp?.PAYMENTMODE);

    // Common fields always required
    const requiredFields = [
      { key: "EMPCODE", label: "Employee Code" },
      { key: "PAYMENTMODE", label: "Payment Mode" },
    ];

    // ----- VALIDATION FIRST (Do NOT lock UI before this) -----
    if (!skipBankValidation) {
      requiredFields.push(
        { key: "BANKACCOUNTNO", label: "Bank Account Number" },
        { key: "ifsc_code", label: "IFSC Code" },
        { key: "BRANCH", label: "Branch Name" },
        { key: "Emp_Ac_Name", label: "Employee Account Name" },
        { key: "ACCOUNT_TYPE", label: "Account Type" },
        { key: "PAYMENTMODE", label: "Payment Mode" }
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
        }
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
        }
      );

      if (result.data.locked) {
        // Employee is locked
        setIsBankLocked(true);
        SetViewAccountData(true);
        setViewIFSCData(true);
        setConfirmAccountDisabled(true);
        setAccountButtonVariant("update");
        setIFSCButtonVariant("update");
        console.log("Employee bank details are locked.");
      } else {
        // Employee is not locked
        setIsBankLocked(false);
        SetViewAccountData(false);
        setViewIFSCData(false);
        console.log("Employee bank details are not locked.");
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
    hasMeaningfulValue(formData1?.[f])
  );



  useEffect(() => {
    isDalyWages()
  }, [])
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
        }
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



  return (
    <div className="grid grid-cols-12 gap-x-1">
      <div className={`col-span-12 ${user?.role1.includes("1.1.15") ? "xl:col-span-8" : "xl:col-span-12"}`}>

        <div className="col-span-12 md:col-span-12 rounded-t bg-[#193A69] dark:bg-black px-3 py-2 border dark:border-[#D0D5DD]">{/* ye pri div replesh karna h */}
          <h1 className="text-white dark:text-[#37a9dd] uppercase font-semibold text-sm">
            Salary Detail Form
          </h1>
        </div>




        <div className="grid grid-cols-12  gap-3 p-4 mt-2 bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow">{/* ye pr changes h */}

          <div className="col-span-6 xl:col-span-3">
            <SelectSearch
              title="PF (Yes/No)"
              name="PFNO"
              options={PFYN}
              selectedValue={formData?.EmpMst?.PFNO?.toString()}
              handleInputChange={handleInputChange}
              className="h-[30px]"
              ShortName={true}
              disabled={disapleForSalary}
              redlabel={isMandatory("PFNO") ? "*" : ""}
            />
          </div>

          <div className="col-span-6 xl:col-span-3 ">
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
              className="h-[30px]"
              ShortName={true}
              redlabel={isMandatory("pfper") ? "*" : ""}
            />
          </div>

          <div className="col-span-6 xl:col-span-3">
            <Ainput
              type="date"
              title="PF Effective from"
              name="PF_Date"
              value={formData?.EmpMst?.PF_Date}
              handleInputChange={handleInputChange}
              disabled={Pfdisabled || disapleForSalary}
              className="!h-[30px]"
              ShortName={true}
              redlabel={isMandatory("PF_Date") ? "*" : ""}
            />
          </div>

          <div className="col-span-6 xl:col-span-3">
            <Ainput
              type="text"
              title="PF NO:"
              name="pfnumber"
              value={formData?.EmpMst?.pfnumber}
              handleInputChange={handleInputChange}
              className="h-[30px]"
              ShortName={true}
              disabled={disapleForSalary}
              redlabel={isMandatory("pfnumber") ? "*" : ""}
            />
          </div>

          <div className="col-span-6 xl:col-span-3">
            <SelectSearch
              title="ESIC (Yes/No)"
              options={yesno}
              name={"ESINO"}
              selectedValue={formData?.EmpMst?.ESINO?.toString()}
              handleInputChange={handleInputChange}
              className="h-[30px]"
              ShortName={true}
              disabled={disapleForSalary}
              redlabel={isMandatory("ESINO") ? "*" : ""}
            />
          </div>

          <div className="col-span-6 xl:col-span-3">
            <Ainput
              type="text"
              title="ESIC NO"
              name="esinumber"
              value={formData?.EmpMst?.esinumber?.toString()}
              handleInputChange={handleInputChange}
              disabled={Pfdisabled1 || disapleForSalary}
              className="h-[30px]"
              ShortName={true}
              redlabel={isMandatory("esinumber") ? "*" : ""}
            />
          </div>

          <div className="col-span-6 xl:col-span-3">
            <Ainput
              type="date"
              title="ESIC Effective From"
              name="ESI_Date"
              value={formData?.EmpMst?.ESI_Date}
              handleInputChange={handleInputChange}
              disabled={Pfdisabled1 || disapleForSalary}
              className="h-[30px]"
              ShortName={true}
              redlabel={isMandatory("ESI_Date") ? "*" : ""}
            />
          </div>

          <div className="col-span-6 xl:col-span-3">
            <Ainput
              type="text"
              title="UAN NO"
              name="UAN_No"
              value={formData?.EmpMst?.UAN_No}
              handleInputChange={handleInputChange}
              className="h-[30px]"
              ShortName={true}
              disabled={disapleForSalary}
              redlabel={isMandatory("UAN_No") ? "*" : ""}
            />
          </div>

          <div className="col-span-6 xl:col-span-3">
            <SelectSearch
              title="LWF"
              name="LWFNO"
              options={LWFYESNO}
              selectedValue={formData?.EmpMst?.LWFNO?.toString()}
              handleInputChange={handleInputChange}
              className="h-[30px]"
              ShortName={true}
              disabled={disapleForSalary}
              redlabel={isMandatory("LWFNO") ? "*" : ""}
            />
          </div>
          <div className="col-span-6 xl:col-span-3">
            <SelectSearch
              title="Weekly Off:"
              options={WEEKLYOFF}
              name="WEEKLYOFF"
              selectedValue={formData?.EmpMst?.WEEKLYOFF?.toString()}
              handleInputChange={handleInputChange}
              className="h-[30px]"
              redlabel={isMandatory("WEEKLYOFF") ? "*" : ""}
            />
          </div>
          <div className="col-span-6 xl:col-span-3">
            <SelectSearch
              title="Bonus"
              name="BONUS"
              selectedValue={formData?.EmpMst?.BONUS?.toString()}
              options={BONUS}
              handleInputChange={handleInputChange}
              className="h-[30px]"
              redlabel={isMandatory("BONUS") ? "*" : ""}
            />
          </div>
          <div className="col-span-6 xl:col-span-3">
            <SelectSearch
              title="Professional Tax"
              name="pro_tax"
              options={ProTax}
              selectedValue={formData?.EmpMst?.pro_tax?.toString()}
              handleInputChange={handleInputChange}
              className="h-[30px]"
              disabled={disapleForSalary}
              redlabel={isMandatory("pro_tax") ? "*" : ""}
            />
          </div>

          <div className="col-span-6 xl:col-span-3">
            <SelectSearch
              selectedValue={formData?.EmpMst?.EMP_SHIFT}
              options={EmpShift}
              title="EMP. Shift"
              name="EMP_SHIFT"
              handleInputChange={handleInputChange}
              className="h-[30px]"
              redlabel={isMandatory("EMP_SHIFT") ? "*" : ""}
            />
          </div>
          <div className="col-span-6 xl:col-span-3">
            <Ainput
              type="number"
              title="LIN NO"
              name="LIN_NO"
              value={formData?.EmpMst?.LIN_NO}
              handleInputChange={handleInputChange}
              className="h-[30px]"
              ShortName={true}
              disabled={disapleForSalary}
              redlabel={isMandatory("LIN_NO") ? "*" : ""}
            />
          </div>
          <div className="col-span-6 xl:col-span-3">
            <SelectSearch
              selectedValue={formData?.EmpMst?.GRADE}
              options={GRADEoption}
              title="Grade"
              name="GRADE"
              handleInputChange={handleInputChange}
              className="h-[30px]"
              redlabel={isMandatory("GRADE") ? "*" : ""}
              ShortName
            />
          </div>

          {formData.EmpMst?.EmpType == 3 &&
            <div className="col-span-6 xl:col-span-3">
              <Ainput
                type="number"
                title="Contract number"
                name="CONTRACT_NUMBER"
                value={formData?.EmpMst?.CONTRACT_NUMBER}
                handleInputChange={handleInputChange}
                className="h-[30px]"
                ShortName={true}
                redlabel={isMandatory("CONTRACT_NUMBER") ? "*" : ""}
              />
            </div>}
          {user?.Comp_Code?.trim()?.toUpperCase() === "DDMM-25" && (
            <div className="col-span-6 xl:col-span-3">
              <SelectSearch
                selectedValue={formData?.EmpMst?.DD_CLUB}
                options={DDCLUBOPTION}
                title="DD CLUB"
                name="DD_CLUB"
                handleInputChange={handleInputChange}
                className="h-[30px]"
                redlabel={isMandatory("DD_CLUB") ? "*" : ""}
                ShortName
              />
            </div>
          )}
        </div>

        <div className="mb-2">
          <div className="bg-slate-100 gap-3 p-4 mt-2 bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow"> {/* ye pr changes h */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-12 xl:col-span-4">
                <SelectSearch
                  title="Salary View at Region:"
                  name="Sal_Region"
                  options={SalRegionoption}
                  selectedValue={formData?.EmpMst?.Sal_Region?.toString()}
                  handleInputChange={handleInputChange}
                  className="h-[30px]"
                  redlabel={isMandatory("Sal_Region") ? "*" : ""}
                />
              </div>
              <div className="col-span-12 xl:col-span-4">
                <SelectSearch
                  title="Employee Punch Type:"
                  name="Punch_Type"
                  options={PunchType}
                  selectedValue={formData?.EmpMst?.Punch_Type?.toString()}
                  handleInputChange={handleInputChange}
                  className="h-[30px]"
                  redlabel={isMandatory("Punch_Type") ? "*" : ""}
                />
              </div>
            </div>
          </div>
        </div>


        <div className="mt-3 mb-3">
          <div className="p">
            <div className="flex items-center justify-between rounded-t bg-[#193A69] dark:bg-black px-3 py-1 border dark:border-[#D0D5DD]">
              {/* Left side - Title */}
              <h1 className="text-white dark:text-[#37a9dd] uppercase font-semibold text-sm">
                Bank Details
              </h1>

              {/* Right side - Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant="update"
                  type="submit"
                  className="text-sm px-5"
                  onClick={handleLockBankDetails}
                  disabled={isBankLocked}
                >
                  Lock
                </Button>
                <Button
                  variant="update"
                  type="submit"
                  className="text-sm px-5"
                  onClick={SendOtp1}
                  disabled={!isBankLocked}
                >
                  UnLock
                </Button>
                {isClicked && isReupdate ? (
                  <Button
                    disabled
                    variant="outline"
                    className="text-sm px-5 text-gray-400 border-gray-300 cursor-not-allowed"
                  >
                    Waiting for Approval...
                  </Button>
                ) : (
                  <Button
                    variant="update"
                    type="submit"
                    className="text-sm px-5"
                    onClick={UpdateBankdetails}
                  >
                    Update
                  </Button>
                )}
              </div>
            </div>


            <div className="grid grid-cols-12  gap-3 p-4 mt-2 bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow">
              <div className="col-span-6 xl:col-span-3 ">
                <SelectSearch
                  title="Bank Name:"
                  name="BANKNAME"
                  options={Bankoption}
                  selectedValue={formData?.EmpMst?.BANKNAME}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("BANKNAME") ? "*" : ""}
                  disabled={isBankLocked}
                />
              </div>

              {BankMode == "primary" ? (
                <>
                  {/* ================= Account No ================= */}
                  <div className="col-span-6 xl:col-span-2 relative">
                    <Ainput
                      title="Account No."
                      type="password"
                      name="BANKACCOUNTNO"
                      value={formData?.EmpMst.BANKACCOUNTNO?.toString()}
                      handleInputChange={handleInputChange}
                      onCopy={(e) => e.preventDefault()}
                      onPaste={(e) => e.preventDefault()}
                      onCut={(e) => e.preventDefault()}
                      className="pr-8"
                      disabled={ViewAccountData || isBankLocked}
                      redlabel={isMandatory("BANKACCOUNTNO") ? "*" : ""}
                    />

                    {AccountData && (
                      <>
                        <AiOutlineQuestionCircle
                          size={18}
                          className="absolute right-3 top-[69%] -translate-y-1/2 text-gray-500 cursor-pointer"
                          onClick={() => setshowAccountTooltip((prev) => !prev)}
                        />

                        {showAccountTooltip && (
                          <div className="absolute top-15 right-0 w-80 bg-white border rounded shadow p-2 z-50 text-xs dark:bg-input">
                            <div className="flex items-center justify-between">
                              <div>
                                <p>
                                  <strong>Account No:</strong> {AccountData.account_number}
                                </p>
                                <p>
                                  <strong>Name:</strong> {AccountData.name_at_bank}
                                </p>
                              </div>
                              <div className="flex items-center pl-2">
                                {accountStatusCode === "VALID" ? (
                                  <LottieAnimation width="80px" height="70px" />
                                ) : (
                                  <AiOutlineCloseCircle
                                    size={20}
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

                  {/* ================= Confirm Account ================= */}
                  <div className="col-span-6 xl:col-span-3">
                    <Ainput
                      title="Confirm Account No."
                      type="text"
                      name="Cnf_BANKACCOUNTNO"
                      value={formData?.EmpMst.Cnf_BANKACCOUNTNO}
                      disabled={(confirmAccountDisabled || ViewAccountData) && isBankLocked}
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
                            "info"
                          );
                        }
                      }}
                      redlabel={isMandatory("Cnf_BANKACCOUNTNO") ? "*" : ""}
                    />
                  </div>

                  {/* ================= Verify Button ================= */}
                  <div className="col-span-6 xl:col-span-1 mt-6">
                    <Button
                      variant={accountButtonVariant}
                      className="px-4 text-xs w-full"
                      onClick={() => VerifyAccountNo(13)}
                      disabled={(IsVerifyAccountApi || ViewAccountData) && isBankLocked}
                      loading={IsVerifyAccountApi}
                    >
                      {accountButtonLabel}
                    </Button>
                  </div>

                  {/* ================= IFSC ================= */}
                  <div className="col-span-6 xl:col-span-2 relative">
                    <Ainput
                      type="text"
                      ShortName
                      title="IFSC Code:"
                      name="ifsc_code"
                      value={formData?.EmpMst?.ifsc_code}
                      handleInputChange={handleInputChange}
                      disabled={ViewIFSCData || isBankLocked}
                      redlabel={isMandatory("ifsc_code") ? "*" : ""}
                    />

                    {IFSCData && (
                      <>
                        <AiOutlineQuestionCircle
                          size={18}
                          className="absolute right-3 top-[68%] -translate-y-1/2 text-gray-500 cursor-pointer"
                          onClick={() => setshowIFSCTooltip((prev) => !prev)}
                        />

                        {showIFSCTooltip && (
                          <div className="absolute top-15 left-0 w-[600px] bg-white border rounded shadow p-2 z-50 text-xs dark:bg-input">
                            <div className="flex items-center justify-between">
                              <div>
                                <p><strong>Address:</strong> {IFSCData.address}</p>
                                <p><strong>Bank:</strong> {IFSCData.bank}</p>
                                <p><strong>Branch:</strong> {IFSCData.branch}</p>
                                <p><strong>City:</strong> {IFSCData.city}</p>
                                <p><strong>State:</strong> {IFSCData.state}</p>
                                <p><strong>IFSC:</strong> {IFSCData.ifsc}</p>
                                <p><strong>MICR:</strong> {IFSCData.micr}</p>
                              </div>

                              <div className="flex items-center pl-2">
                                {accountStatusCode === "VALID" ? (
                                  <LottieAnimation width="80px" height="70px" />
                                ) : (
                                  <AiOutlineCloseCircle
                                    size={20}
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

                  {/* ================= IFSC Verify Button ================= */}
                  <div className="col-span-6 xl:col-span-1 mt-6">
                    <Button
                      variant={IFSCButtonVariant}
                      className="px-4 text-xs w-full"
                      onClick={() => VerifyAccountNo(12)}
                      disabled={(IsVerifyIFSCApi || ViewIFSCData) && isBankLocked}
                      loading={IsVerifyIFSCApi}
                    >
                      {IFSCButtonLabel}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="col-span-6 xl:col-span-2 relative">
                    <Ainput
                      title="Account No."
                      type="password"
                      name="BANKACCOUNTNO"
                      value={formData?.EmpMst.BANKACCOUNTNO?.toString()}
                      handleInputChange={handleInputChange}
                      onCopy={(e) => e.preventDefault()}
                      onPaste={(e) => e.preventDefault()}
                      onCut={(e) => e.preventDefault()}
                      className="pr-8" // adds space for the icon
                      disabled={ViewAccountData || isBankLocked}
                      redlabel={isMandatory("BANKACCOUNTNO") ? "*" : ""}
                    />

                    {/* ✅ Question mark icon inside input on the right */}
                    {AccountData && (
                      <>
                        <AiOutlineQuestionCircle
                          size={18}
                          className="absolute right-3 top-[69%]  -translate-y-1/2 text-gray-500 cursor-pointer"
                          onClick={() => setshowAccountTooltip((prev) => !prev)}
                        />

                        {showAccountTooltip && (
                          <div className="absolute top-15 right-0 w-80 bg-white border rounded shadow p-2 z-50 text-xs dark:bg-input">
                            <div className="flex items-center justify-between">
                              <div>
                                {/* <p>
                                <strong>IFSC:</strong> {AccountData.Ifsc}
                              </p> */}
                                <p>
                                  <strong>Account No:</strong>{" "}
                                  {AccountData.account_number}
                                </p>
                                <p>
                                  <strong>Name:</strong>{" "}
                                  {AccountData.name_at_bank}
                                </p>
                              </div>
                              <div className="flex items-center pl-2">
                                {accountStatusCode === "VALID" ? (
                                  <LottieAnimation width="80px" height="70px" />
                                ) : (
                                  <AiOutlineCloseCircle
                                    size={20}
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


                  <div className="col-span-6 xl:col-span-3">
                    <Ainput
                      title="Confirm Account No."
                      type="text"
                      name="Cnf_BANKACCOUNTNO"
                      value={formData?.EmpMst.Cnf_BANKACCOUNTNO}
                      disabled={(confirmAccountDisabled || ViewAccountData) && isBankLocked}
                      handleInputChange={handleInputChange}
                      onCopy={(e) => e.preventDefault()}
                      onPaste={(e) => e.preventDefault()}
                      onCut={(e) => e.preventDefault()} // optional
                      onKeyDown={(e) => {
                        if (e.key === "Tab") {
                          if (
                            formData?.EmpMst.BANKACCOUNTNO &&
                            formData?.EmpMst.Cnf_BANKACCOUNTNO &&
                            formData?.EmpMst.BANKACCOUNTNO !==
                            formData?.EmpMst.Cnf_BANKACCOUNTNO
                          ) {
                            e.preventDefault();
                            showSideAlert(
                              "Account No is Not Matched with Confirm Account No.",
                              "info"
                            );
                          }
                        }
                      }}
                      redlabel={isMandatory("Cnf_BANKACCOUNTNO") ? "*" : ""}
                    />
                  </div>
                  <div className="col-span-6 xl:col-span-1 mt-6">
                    <Button
                      variant={accountButtonVariant}
                      className="px-4 text-xs w-full"
                      onClick={() => VerifyAccountNo(13)}
                      disabled={(IsVerifyAccountApi || ViewAccountData) && isBankLocked}
                      loading={IsVerifyAccountApi}
                    >
                      {accountButtonLabel}
                    </Button>
                  </div>
                  <div className="col-span-6 xl:col-span-2 relative">
                    <Ainput
                      type="text"
                      ShortName={true}
                      title="IFSC Code:"
                      name="ifsc_code"
                      value={formData?.EmpMst?.ifsc_code}
                      handleInputChange={handleInputChange}
                      disabled={ViewIFSCData || isBankLocked}
                      redlabel={isMandatory("ifsc_code") ? "*" : ""}
                    />
                    {IFSCData && (
                      <>
                        <AiOutlineQuestionCircle
                          size={18}
                          className="absolute right-3 top-[68%] -translate-y-1/2 text-gray-500 cursor-pointer"
                          onClick={() => setshowIFSCTooltip((prev) => !prev)}
                        />

                        {showIFSCTooltip && (
                          <div className="absolute top-15 left-0 w-[600px] bg-white border rounded shadow p-2 z-50 text-xs dark:bg-input">
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
                                  <strong>Contact:</strong> {IFSCData.CONTACT}
                                </p>
                                <p>
                                  <strong>District:</strong> {IFSCData.DISTRICT}
                                </p>
                                <p>
                                  <strong>IFSC:</strong> {IFSCData.ifsc}
                                </p>
                                <p>
                                  <strong>MICR:</strong> {IFSCData.micr}
                                </p>
                                <p>
                                  <strong>NEFT:</strong> {IFSCData.NEFT}
                                </p>
                                <p>
                                  <strong>RTGS:</strong> {IFSCData.RTGS}
                                </p>
                                <p>
                                  <strong>UPI:</strong> {IFSCData.UPI}
                                </p>
                              </div>

                              {/* Green tick icon centered vertically */}
                              <div className="flex items-center pl-2">
                                {accountStatusCode === "VALID" ? (
                                  <LottieAnimation width="80px" height="70px" />
                                ) : (
                                  <AiOutlineCloseCircle
                                    size={20}
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

                  {/* ================= IFSC Verify Button ================= */}
                  <div className="col-span-6 xl:col-span-1 mt-6">
                    <Button
                      variant={IFSCButtonVariant}
                      className="px-4 text-xs w-full"
                      onClick={() => VerifyAccountNo(12)}
                      disabled={(IsVerifyIFSCApi || ViewIFSCData) && isBankLocked}
                      loading={IsVerifyIFSCApi}
                    >
                      {IFSCButtonLabel}
                    </Button>
                  </div>
                </>
              )}
              <div className="col-span-6 xl:col-span-3">
                <Ainput
                  type="text"
                  title="Branch Name:"
                  name="BRANCH"
                  value={formData?.EmpMst?.BRANCH}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("BRANCH") ? "*" : ""}
                  disabled={isBankLocked}
                />
              </div>
              <div className="col-span-6 xl:col-span-3">
                <Ainput
                  type="text"
                  title="Account Holder Name:"
                  name="Emp_Ac_Name"
                  value={formData?.EmpMst?.Emp_Ac_Name}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("Emp_Ac_Name") ? "*" : ""}
                  disabled={isBankLocked}
                />
              </div>
              <div className="col-span-6 xl:col-span-3">
                <SelectSearch
                  title="Account Type:"
                  name="ACCOUNT_TYPE"
                  options={ACCOUNT_TYPE}
                  selectedValue={formData?.EmpMst?.ACCOUNT_TYPE}
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("ACCOUNT_TYPE") ? "*" : ""}
                  disabled={isBankLocked}
                />
              </div>

              <div className="col-span-6 xl:col-span-3">
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

              {/* <div className="col-span-6 xl:col-span-3">
                  <label
                    htmlFor="account_verified"
                    onClick={(e) => {
                      if (!falg) {
                        handleInputChange(
                          "account_verified",
                          formData1?.account_verified === 1 ? 0 : 1
                        );
                      } else {
                        e.preventDefault(); // Disabled hone par click action prevent kare
                      }
                    }}
                    className={`hover:shadow-md cursor-pointer text-center flex justify-between px-2 bg-[#dbeafe] ${
                      formData1?.account_verified === 1
                        ? "text-[#1e40af] dark:bg-[#dbeafe]"
                        : "text-[#7c7f85] dark:hover:bg-[#d8d9a278] dark:text-white dark:bg-[#5493e7a0]"
                    } h-8 mt-6 felx items-center rounded shadow-sm shadow-dark font-medium`}
                  >
                    <Checkbox
                      checked={formData1?.account_verified === 1}
                      className="mr-2"
                      name="account_verified"
                      disabled={falg}
                    />
                    A/c Document Verified
                  </label>
                </div> */}

              <div className="col-span-6 xl:col-span-3">
                <label
                  htmlFor="Sal_Hold"
                  onClick={(e) => {
                    handleInputChange(
                      "Sal_Hold",
                      formData1?.Sal_Hold === 1 ? 0 : 1
                    );
                  }}
                  className={`hover:shadow-md cursor-pointer text-center flex justify-between px-2 bg-[#dbeafe] ${formData1?.Sal_Hold === 1
                    ? "text-[#1e40af] dark:bg-[#dbeafe]"
                    : "text-[#7c7f85] dark:hover:bg-[#d8d9a278] dark:text-white dark:bg-[#5493e7a0]"
                    } h-8 mt-6 felx items-center rounded shadow-sm shadow-dark font-medium`}
                >
                  <Checkbox
                    checked={formData?.EmpMst?.Sal_Hold === 1}
                    className="mr-2"
                    name="Sal_Hold"
                  />
                  Tick if Salary on Hold
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>


      {user?.role1.includes("1.1.15") && (
        <div className="col-span-12 xl:col-span-4"> {/* ye pr changes h */}

          <div className="ml-2 col-span-12 md:col-span-12 rounded-t bg-[#193A69] dark:bg-black px-3 py-2 border dark:border-[#D0D5DD]">{/* ye pri div replesh karna h */}
            <h1 className="text-white dark:text-[#37a9dd] uppercase font-semibold text-sm">
              Salary Breakup
            </h1>
          </div>

          <div className="grid grid-cols-12 gap-3 p-4 m-2  bg-white h-[680px] dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow">{/* ye pr changes h */}
            <div className="col-span-6">
              <Ainput
                type="date"
                title="Effective from (date)"
                name="Effective_date"
                handleInputChange={handleInputChange}
                disabled={falg1 || isDailyWagesActive}
                value={formData1?.Effective_date}
                className="h-[30px]"
              />
            </div>

            <div className="col-span-6">
              <Ainput
                type="text"
                title="Monthly Gross:"
                name="Gross_Salary"
                handleInputChange={handleInputChange}
                disabled={falg1 || isDailyWagesActive}
                value={formData1?.Gross_Salary?.toString()}
                className="text-right !h-[30px]"
              />
            </div>
            {/* <div className="col-span-6">
            <Ainput
              type="date"
              title="Recipt Date"
              name="Rec_date"
              handleInputChange={handleInputChange}
              disabled={falg1}
              value={formData1?.Basic?.toString()}
            />
          </div> */}
            <div className="col-span-6">
              <Ainput
                type="text"
                title="EMP Basic:"
                name="Basic"
                handleInputChange={handleInputChange}
                disabled={falg1 || isDailyWagesActive}
                value={formData1?.Basic?.toString()}
                className="text-right !h-[30px]"
              />
            </div>
            <div className="col-span-6">
              <Ainput
                type="text"
                title="HRA:"
                name="HRA"
                id="HRA"
                ShortName={true}
                handleInputChange={handleInputChange}
                disabled={falg1 || isDailyWagesActive}
                value={formData1?.HRA?.toString()}
                className="text-right !h-[30px]"
              />
            </div>
            <div className="col-span-6">
              <Ainput
                type="text"
                title="Conveyance:"
                name="Conveyance"
                handleInputChange={handleInputChange}
                disabled={falg1 || isDailyWagesActive}
                value={formData1?.Conveyance?.toString()}
                className="text-right !h-[30px]"
              />
            </div>
            <div className="col-span-6">
              <Ainput
                type="text"
                title="Medical:"
                name="Medical"
                handleInputChange={handleInputChange}
                disabled={falg1 || isDailyWagesActive}
                value={formData1?.Medical?.toString()}
                className="text-right !h-[30px]"
              />
            </div>
            <div className="col-span-6">
              <Ainput
                type="text"
                title="DA:"
                name="Other"
                ShortName={true}
                handleInputChange={handleInputChange}
                disabled={falg1 || isDailyWagesActive}
                value={formData1?.Other?.toString()}
                className="text-right !h-[30px]"
              />
            </div>
            <div className="col-span-6">
              <Ainput
                type="text"
                title="Washing:"
                name="Washing"
                handleInputChange={handleInputChange}
                disabled={falg1 || isDailyWagesActive}
                value={formData1?.Washing?.toString()}
                className="text-right !h-[30px]"
              />
            </div>
            <div className="col-span-6">
              <Ainput
                type="text"
                title="Uniform Amt:"
                name="Uniform"
                handleInputChange={handleInputChange}
                disabled={falg1 || isDailyWagesActive}
                value={formData1?.Uniform?.toString()}
                className="text-right !h-[30px]"
              />
            </div>
            <div className="col-span-6">
              <Ainput
                type="text"
                title="Annual Gross:"
                name="ANNUAL_CTC"
                handleInputChange={handleInputChange}
                disabled={falg1 || isDailyWagesActive}
                value={formData1?.ANNUAL_CTC?.toString()}
                className="text-right !h-[30px]"
              />
            </div>
            <div className="col-span-6">
              <Ainput
                type="text"
                title="EMP Salary:"
                name="Gross_Salary"
                handleInputChange={handleInputChange}
                disabled={falg1 || isDailyWagesActive}
                value={formData1?.Gross_Salary?.toString()}
                className="text-right !h-[30px]"
              />
            </div>

            <div className="col-span-6">
              <Ainput
                type="text"
                title="LWF:"
                name="LWF"
                ShortName={true}
                handleInputChange={handleInputChange}
                disabled={falg1 || isDailyWagesActive}
                value={formData1?.LWF?.toString()}
                className="text-right !h-[30px]"
              />
            </div>
            <div className="col-span-6">
              <Ainput
                type="text"
                title="PF Salary Limit:"
                name="PFSALARY_LIMIT"
                ShortName={true}
                handleInputChange={handleInputChange}
                disabled={falg1 || isDailyWagesActive}
                value={formData1?.PFSALARY_LIMIT?.toString()}
                className="text-right !h-[30px]"
              />
            </div>
            <div className="col-span-6">
              <Ainput
                type="text"
                title="Bonus:"
                name="BONUS_AMOUNT"
                handleInputChange={handleInputChange}
                disabled={falg1 || isDailyWagesActive || GratuityCompKeyData}
                value={formData1?.BONUS_AMOUNT?.toString()}
                className="text-right !h-[30px]"
              />
            </div>

            {GratuityCompKeyData && (
              <div className="col-span-6">
                <Ainput
                  type="text"
                  title="Gratuity:"
                  name="Gratuity"
                  handleInputChange={handleInputChange}
                  disabled={true}
                  value={formData1?.Gratuity?.toString()}
                  className="text-right !h-[30px]"
                />
              </div>
            )}

            <div className="col-span-6">
              <Ainput
                type="text"
                title="CTC:"
                name="CTC"
                ShortName={true}
                handleInputChange={handleInputChange}
                disabled={falg1 || isDailyWagesActive}
                value={formData1?.CTC?.toString()}
                className="text-right !h-[30px]"
              />
            </div>
            {DalyWagescompKeyData && (
              <div className="col-span-12 mt-2 border-body-color  rounded  p-1">
                <div className="text-exit font-bold text-lg mb-1">
                  Daily Wages (Alternative Salary Mode)
                </div>



                <Ainput
                  title="Daily Wages"
                  name="Daily_Wages"
                  value={formData1.Daily_Wages}
                  handleInputChange={handleInputChange}
                  disabled={falg1 || isSalaryBreakupActive}
                />
              </div>)}

            {/* <div className="col-span-6 mt-5 gap-y-2">
          y <Button
              className="mr-1 mt-1"
              variant={"save"}
              onClick={saveData}
            >
              Save
            </Button>

            <Button
              variant={"outline"}
              type="submit"
              size={"sm"}
              onClick={SendOtp1}
            >
              Send OTP To Open
            </Button>
          </div> */}

            {/* Buttons */}
            <div className="col-span-12 mt-5  pt-4">
              <div className="flex items-center justify-between">

                {user?.role1.includes("1.1.13") && (
                  <Button
                    className="h-[34px] px-4"
                    variant="save"
                    onClick={handleChangeSalaryDetails}
                  >
                    {isSalarySaved
                      ? "Change Salary Details"
                      : "Save Salary Details"}
                  </Button>
                )}

                <Button
                  variant="save"
                  onClick={() => OutServiceView(formData.EmpMst.EMPCODE)}
                  disabled={disapleForSalary}
                >
                  See History
                </Button>

              </div>

              {/* Approval Status */}
              <div className="mt-3 flex text-left justify-center">
                <p
                  className={`text-[18px] font-semibold ${salarystatus == 2 ? "text-save" : "text-exit"
                    }`}
                >
                  {salaryMessage}
                </p>
              </div>
            </div>


          </div>

        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-full dark:bg-primaryop bg-off  max-w-screen-md xs:h-auto  overflow-y-scroll">
          <DialogHeader>
            <DialogTitle className="mt-2 ml-3 flex ">
              {" "}
              <DialogTitle>Please Fill the OTP</DialogTitle>
            </DialogTitle>
            <hr className="bg-body-color mx-2" />
            <DialogDescription>
              <div className="grid grid-cols-12  gap-2 p-4">
                <div className="flex col-span-12 justify-between">
                  <div className="col-span-12 text-exit">{Error}</div>
                  <div className="col-span-12 text-lg text-exit">
                    {Math.floor(timeRemaining / 60)}:
                    {("0" + (timeRemaining % 60)).slice(-2)}
                  </div>
                </div>

                <div className="lg:col-span-6 md:col-span-6 col-span-12">
                  <Ainput
                    title="OTP"
                    type="text"
                    name="OTP"
                    value={formData1?.OTP}
                    handleInputChange={handleInputChange}
                  />{" "}
                </div>
                <div className="lg:col-span-6 md:col-span-6 col-span-12">
                  <Button
                    className="lg:mt-6 md:mt-6 mt-2"
                    variant={"update"}
                    onClick={disebal}
                  >
                    submit
                  </Button>
                  {/* <Button className="lg:mt-6 md:mt-6 mt-2 ml-4" variant={"save"}>resend otp</Button> */}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={isDialogOpen1} onOpenChange={setIsDialogOpen1}>
        <DialogContent className="w-full dark:bg-primaryop bg-off  max-w-screen-md xs:h-auto  overflow-y-scroll">
          <DialogHeader>
            <DialogTitle className="mt-2 ml-3 flex ">
              {" "}
              <DialogTitle>Please Fill the OTP</DialogTitle>
            </DialogTitle>
            <hr className="bg-body-color mx-2" />
            <DialogDescription>
              <div className="grid grid-cols-12  gap-2 p-4">
                <div className="flex col-span-12 justify-between">
                  <div className="col-span-12 text-exit">{Error}</div>
                  <div className="col-span-12 text-lg text-exit">
                    {Math.floor(timeRemaining / 60)}:
                    {("0" + (timeRemaining % 60)).slice(-2)}
                  </div>
                </div>

                <div className="lg:col-span-6 md:col-span-6 col-span-12">
                  <Ainput
                    title="OTP"
                    type="text"
                    name="OTP"
                    value={formData1?.OTP}
                    handleInputChange={handleInputChange}
                  />{" "}
                </div>
                <div className="lg:col-span-6 md:col-span-6 col-span-12">
                  <Button
                    className="lg:mt-6 md:mt-6 mt-2"
                    variant={"update"}
                    onClick={disebal1}
                  >
                    submit
                  </Button>
                  {/* <Button className="lg:mt-6 md:mt-6 mt-2 ml-4" variant={"save"}>resend otp</Button> */}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* for fill salary details  */}

      <Dialog open={isDialogOpen2} onOpenChange={setIsDialogOpen2}>
        <DialogContent
          className="w-[95vw] max-w-6xl max-h-[90vh] overflow-y-auto dark:bg-primaryop bg-off"
        >
          <DialogHeader>
            <DialogTitle className="mt-2 ml-3 flex ">
              {" "}
              <DialogTitle>Update Salary Details </DialogTitle>
            </DialogTitle>
            <hr className="bg-body-color mx-2" />
            <DialogDescription>
              <div className="grid grid-cols-12  gap-2 p-4">
                <div className="flex col-span-12 justify-between">
                  <div className="col-span-12 text-exit">{Error}</div>
                </div>
                <div className="col-span-12 ">
                  <div className="grid grid-cols-12 gap-x-2 p-2 m-2  rounded-b shadow dark:bg-primary dark:bg-opacity-10">
                    <div className="col-span-6">
                      <SelectSearch
                        title="Salary Type"
                        name="Salary_Type"
                        options={SLTY}
                        selectedValue={formData1?.Salary_Type}
                        handleInputChange={handleInputChange}
                        className="text-right"
                        disabled={isDailyWagesActive}
                      />
                    </div>


                    {(salaryType === "1" || formData1?.Salary_Type === "1") && ( // INCREMENT
                      <div className="col-span-6">
                        <Ainput
                          type="text"
                          title="Proposed salary "
                          name="Proposed_Salary"
                          handleInputChange={handleInputChange}
                          value={formData1?.Proposed_Salary}
                          className="text-right"

                        />
                      </div>
                    )}

                    <div className="col-span-6">
                      <Ainput
                        type="date"
                        title="Effective from (date)"
                        name="Effective_date"
                        handleInputChange={handleInputChange}
                        // disabled={falg1}
                        value={formData1?.Effective_date}
                        disabled={isDailyWagesActive}
                      />
                    </div>
                    <div className="col-span-6">
                      <Ainput
                        type="number"
                        title="Monthly Gross:"
                        name="Gross_Salary"
                        handleInputChange={handleInputChange}
                        // disabled={falg1}
                        value={formData1?.Gross_Salary?.toString()}
                        className="text-right"
                        disabled={isDailyWagesActive}
                      />
                    </div>
                    <div className="col-span-6">
                      <Ainput
                        type="number"
                        title="EMP Basic:"
                        name="Basic"
                        handleInputChange={handleInputChange}
                        // disabled={falg1}
                        value={formData1?.Basic?.toString()}
                        className="text-right"
                        disabled={isDailyWagesActive}
                      />
                    </div>
                    <div className="col-span-6">
                      <Ainput
                        type="number"
                        title="HRA:"
                        name="HRA"
                        id="HRA"
                        ShortName={true}
                        handleInputChange={handleInputChange}
                        // disabled={falg1}
                        value={formData1?.HRA?.toString()}
                        className="text-right"
                        disabled={isDailyWagesActive}
                      />
                    </div>
                    <div className="col-span-6">
                      <Ainput
                        type="number"
                        title="Conveyance:"
                        name="Conveyance"
                        handleInputChange={handleInputChange}
                        // disabled={falg1}
                        value={formData1?.Conveyance?.toString()}
                        className="text-right"
                        disabled={isDailyWagesActive}
                      />
                    </div>
                    <div className="col-span-6">
                      <Ainput
                        type="number"
                        title="Medical:"
                        name="Medical"
                        handleInputChange={handleInputChange}
                        // disabled={falg1}
                        value={formData1?.Medical?.toString()}
                        className="text-right"
                        disabled={isDailyWagesActive}
                      />
                    </div>
                    <div className="col-span-6">
                      <Ainput
                        type="number"
                        title="DA:"
                        name="Other"
                        ShortName={true}
                        handleInputChange={handleInputChange}
                        // disabled={falg1}
                        value={formData1?.Other?.toString()}
                        className="text-right"
                        disabled={isDailyWagesActive}
                      />
                    </div>
                    <div className="col-span-6">
                      <Ainput
                        type="number"
                        title="Washing:"
                        name="Washing"
                        handleInputChange={handleInputChange}
                        // disabled={falg1}
                        value={formData1?.Washing?.toString()}
                        className="text-right"
                        disabled={isDailyWagesActive}
                      />
                    </div>
                    <div className="col-span-6">
                      <Ainput
                        type="number"
                        title="Uniform Amt:"
                        name="Uniform"
                        handleInputChange={handleInputChange}
                        // disabled={falg1}
                        value={formData1?.Uniform?.toString()}
                        className="text-right"
                        disabled={isDailyWagesActive}
                      />
                    </div>

                    <div className="col-span-6">
                      <Ainput
                        type="number"
                        title="Annual Gross:"
                        name="ANNUAL_CTC"
                        handleInputChange={handleInputChange}
                        // disabled={falg1}
                        value={formData1?.ANNUAL_CTC?.toString()}
                        className="text-right"
                        disabled={isDailyWagesActive}
                      />
                    </div>
                    <div className="col-span-6">
                      <Ainput
                        type="number"
                        title="EMP Salary:"
                        name="Gross_Salary"
                        handleInputChange={handleInputChange}
                        // disabled={falg1}
                        value={formData1?.Gross_Salary?.toString()}
                        className="text-right"
                        disabled={isDailyWagesActive}
                      />
                    </div>

                    {/* <div className="col-span-6">
                      <Ainput
                        type="text"
                        title="LWF:"
                        name="LWF"
                        handleInputChange={handleInputChange}
                        // disabled={falg1}
                        value={formData1?.LWF?.toString()}
                        className="text-right"

                      />
                    </div> */}
                    <div className="col-span-6">
                      <Ainput
                        type="number"
                        title="PF Salary Limit:"
                        name="PFSALARY_LIMIT"
                        ShortName={true}
                        handleInputChange={handleInputChange}
                        // disabled={falg1}
                        value={formData1?.PFSALARY_LIMIT?.toString()}
                        className="text-right"
                        disabled={isDailyWagesActive}
                      />
                    </div>
                    <div className="col-span-6">
                      <Ainput
                        type="number"
                        title="Bonus:"
                        name="BONUS_AMOUNT"
                        handleInputChange={handleInputChange}
                        // disabled={falg1}
                        value={formData1?.BONUS_AMOUNT?.toString()}
                        className="text-right"
                        disabled={isDailyWagesActive || GratuityCompKeyData}
                      />
                    </div>

                    {GratuityCompKeyData && (
                      <div className="col-span-6">
                        <Ainput
                          type="number"
                          title="Gratuity:"
                          name="Gratuity"
                          handleInputChange={handleInputChange}
                          value={formData1?.Gratuity?.toString()}
                          className="text-right"
                          disabled={true}
                        />
                      </div>
                    )}

                    <div className="col-span-6">
                      <Ainput
                        type="number"
                        title="CTC:"
                        name="CTC"
                        ShortName={true}
                        handleInputChange={handleInputChange}
                        // disabled={falg1}
                        value={formData1?.CTC?.toString()}
                        className="text-right"
                        disabled={isDailyWagesActive}
                      />
                    </div>
                    {DalyWagescompKeyData && (
                      <div className="col-span-12 mt-3 border-t pt-3">
                        <div className="text-exit font-bold text-lg mb-2">
                          Daily Wages (Alternative Salary Mode)
                        </div>

                        <div className="col-span-6">
                          <Ainput
                            type="number"
                            title="Daily Wages"
                            name="Daily_Wages"
                            handleInputChange={handleInputChange}
                            value={formData1?.Daily_Wages?.toString()}
                            disabled={isSalaryBreakupActive}
                            className="text-right"
                          />
                        </div>
                      </div>)}
                    <div className="col-span-6 mt-5 gap-y-2">
                      <Button
                        className="mr-1 mt-1"
                        variant={"save"}
                        onClick={saveData}
                      // disabled={falg1}
                      >
                        save salary Details
                      </Button>
                    </div>

                    {/* <div className="col-span-6 mt-5 gap-y-2">
                      <Button variant={"save"} onClick={() => OutServiceView(formData.EmpMst.EMPCODE)}>
                        See History
                      </Button>

                    </div> */}
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>


      {/* see history */}
      <Dialog open={isDialogOpen3} onOpenChange={setIsDialogOpen3}>
        {/* <DialogContent className="w-[4000px] max-w-screen-lg px-8 h-[750px]"> */}
        <DialogContent className="w-full max-w-screen-lg h-[650px] overflow-y-auto dark:bg-primaryop bg-off">
          <DialogHeader className="rounded-t h-[60px] bg-header dark:bg-black px-6 py-2 border dark:border-borderColor-dark">
            <DialogTitle className="text-lg font-semibold tracking-wide mt-2 text-white">
              EMPLOYEE SALARY REVIEW
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="w-full max-w-screen-lg h-[500px] gap-0 dark:bg-input overflow-y-auto">
            <div className="container">
              <div className="rounded">
                <div
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 dark:bg-primary dark:bg-opacity-10 pb-2 rounded p-2"
                  id="pdfContent"
                >
                  <div className="md:col-span-12">
                    <div className="shadow rounded uppercase whitespace-nowrap text-ellipsis">
                      <div className="bg-white dark:bg-primary dark:bg-opacity-10 col-span-12 h-9 flex items-center justify-between rounded px-3 font-medium shadow mt-1">
                        {SalaryData.length > 0 && (
                          <p className="font-bold text-gray-500 dark:text-white whitespace-nowrap text-ellipsis">
                            {SalaryData[0].EMPLOYEEDESIGNATION} -{" "}
                            {SalaryData[0].DEPARTMENT}{" "}
                            {SalaryData[0].EMPLOYEENAME}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 px-3 mt-2">
                  {SalaryData.map((item, index) => (
                    <div
                      key={index}
                      //         className="relative bg-gradient-to-r from-purple-500 via-pink-500 to-red-500
                      //  text-black dark:text-white p-4 rounded-md shadow-md transition-transform
                      //  duration-300 hover:shadow-xl bg-white dark:bg-primary dark:bg-opacity-10
                      //  hover:translate-y-[-3px]"
                      //       >

                      className="relative bg-gradient-to-r from-purple-500 via-pink-500 to-red-500
                 text-black dark:text-white p-4 rounded shadow transition-transform
                 duration-300 hover:shadow bg-white dark:bg-primary dark:bg-opacity-10
                 hover:translate-y-[-3px]"
                    >

                      <div className="relative">
                        <FaEllipsisH
                          className="absolute top-2 right-2 text-black dark:text-white"
                          size={30}
                        />
                      </div>

                      <h3 className="text-lg font-extrabold mb-3 uppercase whitespace-nowrap text-ellipsis">
                        {item.STATUS === "PENDING" ? (
                          <span className="text-yellow-500 font-bold">
                            PENDING
                          </span>
                        ) : index < SalaryData.length - 1 ? (
                          <>
                            {new Date(item.Effective_date).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            -{" "}
                            {new Date(
                              SalaryData[index + 1].Effective_date
                            ).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "long",
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
                            - Ongoing
                          </>
                        )}
                      </h3>


                      <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                        <p className="text-sm">
                          <span className="font-semibold">Emp Code:</span>{" "}
                          {item.Emp_Code}
                        </p>

                        {item.Daily_Wages ? (
                          <>
                            <p
                              className={`text-sm p-1 border ${item.STATUS === "PENDING"
                                ? "border-yellow "
                                : "border-green "
                                }`}
                            >
                              <span className="font-semibold">Daily Wages:</span>{" "}
                              {item.Daily_Wages}
                            </p>
                          </>
                        ) : (
                          <>
                            <p
                              className={`text-sm p-1 border ${item.STATUS === "PENDING"
                                ? "border-yellow "
                                : "border-green "
                                }`}
                            >
                              <span className="font-semibold">Gross Salary:</span>{" "}
                              {item.Gross_Salary}
                            </p>

                            <p className="text-sm">
                              <span className="font-semibold">Basic:</span>{" "}
                              {item.Basic}
                            </p>
                            <p className="text-sm">
                              <span className="font-semibold">HRA:</span>{" "}
                              {item.HRA}
                            </p>

                            <p className="text-sm">
                              <span className="font-semibold">Conveyance:</span>{" "}
                              {item.Conveyance}
                            </p>
                            <p className="text-sm">
                              <span className="font-semibold">Washing Allowance:</span>{" "}
                              {item.Washing}
                            </p>
                            <p className="text-sm">
                              <span className="font-semibold">Medical:</span>{" "}
                              {item.Medical}
                            </p>
                            <p className="text-sm">
                              <span className="font-semibold">Other:</span>{" "}
                              {item.Other}
                            </p>
                          </>
                        )}

                        <p className="text-sm">
                          <span className="font-semibold">Modified User:</span>{" "}
                          {item.MODIFIED_USER}
                        </p>
                        <p className="text-sm">
                          <span className="font-semibold">Modified Date:</span>{" "}
                          {item.MOD_DATE
                            ? item.MOD_DATE.split("-").reverse().join("-")
                            : ""}
                        </p>

                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center font-bold text-lg text-black dark:text-white">
                  TOTAL ROWS: {SalaryData.length}
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>


      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
};
export default SalaryDetails;
