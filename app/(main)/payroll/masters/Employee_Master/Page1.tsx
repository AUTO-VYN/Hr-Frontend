import SmallTitle from "@/components/atoms/smallTitle";
import Einput from "@/components/atoms/Einput";
import { useFormData } from "./Context/FormDataContext";
import Eselect from "@/components/atoms/Eselect";
import { Checkbox } from "antd";
import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import Swal from "sweetalert2";
import { AiOutlineQuestionCircle } from "react-icons/ai";
import { ScanLine,CalendarCheck2,CalendarClock, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import HashloaderComponent from "@/components/Templates/hashloader";
import FileViewer from "@/components/atoms/FileviewerBank";
import { useSecureStorage } from "@/app/hooks/comp-key-data";
import SelectSearch from "@/components/atoms/Select";
import { useToast } from "@/app/hooks/useToast";

// ✅ FIX 1: VerifyRow ko BAHAR define karo - component ke andar nahi
const VerifyRow = ({
  children,
  onVerify,
  disabled,
}: {
  children: React.ReactNode;
  onVerify: () => void;
  disabled?: boolean;
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_110px] gap-3 items-end">
      <div className="relative">{children}</div>
      <Button
        variant="primary"
        size="sm"
        onClick={onVerify}
         className="rounded-xl shadow-md h-10 flex items-center justify-center gap-2"
       
        disabled={disabled}
      >
         <ScanLine className="h-4 w-4" />
         <span>Verify</span>
      </Button>
    </div>
  );
};

const Page1 = ({
  onOpenDialog,
  documentData,
  setDocumentData,
  onAadharVerified,
  isMandatory,
}) => {
  const { compdata } = useSecureStorage();
  const isDisabled = true;
  const [panInfo, setPanInfo] = useState(null);
  const [showPanTooltip, setShowPanTooltip] = useState(false);
  const [aadhaarInfo, setAadhaarInfo] = useState(null);
  const { toast } = useToast();
  const [showAadhaarTooltip, setShowAadhaarTooltip] = useState(false);
  const [showDrivingLicenseTooltip, setShowDrivingLicenseTooltip] =
    useState(false);
  const { formData, setFormData } = useFormData();
  const [errors, setErrors] = useState({});

  const [varifiyDis, setVarifiyDis] = useState(false);

  // ✅ dynamic viewport-fit height for the two-card row
const wrapRef = useRef<HTMLDivElement>(null);
const [rowHeight, setRowHeight] = useState<number | null>(null);

useEffect(() => {
  const el = wrapRef.current;
  if (!el) return;

  const compute = () => {
    const top = el.getBoundingClientRect().top;
    const bottomGap = 16;
    const h = window.innerHeight - top - bottomGap;
    setRowHeight(Math.max(h, 340));
  };

  compute();
  window.addEventListener("resize", compute);
  const ro = new ResizeObserver(compute);
  ro.observe(document.body);

  return () => {
    window.removeEventListener("resize", compute);
    ro.disconnect();
  };
}, []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDialogOpen2, setIsDialogOpen2] = useState(false);
  const [MobileData, setMobileData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [disabledOtp, setdisabledOtp] = useState(true);
  const [reference_id, setreference_id] = useState(null);
  const [varifiyDis1, setVarifiyDis1] = useState(false);
  const [EmailData, setEmailData] = useState([]);
  const [aadhaarMode, setAadhaarMode] = useState("primary");
  const [Source, setSource] = useState([]);

  // ✅ FIX 2: Debounce ref for API calls
  const mobileDebounceRef = useRef<any>(null);
  const emailDebounceRef = useRef<any>(null);

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

  const user = useCurrentUser();
  const yesno01 = [
    { value: "1", label: "YES" },
    { value: "0", label: "NO" },
  ];

  const DlvTypeOption = [
    { value: "1", label: "2-Wheeler" },
    { value: "2", label: "4-Wheeler" },
    { value: "3", label: "Heavy Vehicle" },
  ];

  const validateEmail = (value: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value);
  };

  const validatePAN = (value: string) => {
    const regex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return regex.test(value);
  };

  const validatePassport = (value: string) => {
    const regex = /^[A-Z][0-9]{7}$/;
    return regex.test(value);
  };

  // ✅ FIX 3: useCallback se handleInputChange stable reference
 const handleInputChange = useCallback((name: string, value: FieldValue) => {
  let isValid = true;

  const toStr = (v: FieldValue) => (v ?? "").toString();

  // ✅ Probation period (days) -> only digits
  if (name === "PROBATIONPERIOD") {
    const str = toStr(value);
    value = str.replace(/\D/g, "");
  }

  // ✅ Emergency mobile -> only digits, max 10
  if (name === "EMERGENCYNO") {
    const str = toStr(value).replace(/\D/g, "");
    if (str.length > 10) return;
    value = str;
  }

  // ✅ Skills -> only letters/spaces
  if (name === "SKILLS") {
    const str = toStr(value);
    value = str.replace(/[^a-zA-Z\s]/g, "");
  }

  // ✅ Mobile number (personal) -> digits only, max 10
  if (name === "MOBILE_NO") {
    const str = toStr(value);
    if (!/^\d{0,10}$/.test(str)) return;
    value = str.replace(/\D/g, "");
  }

  // ✅ Official mobile -> digits only, max 10 + debounced existing check
  if (name === "MOBILENO") {
    const str = toStr(value).replace(/\D/g, "");
    if (str.length > 10) return;
    value = str;

    if (str.length === 10) {
      if (mobileDebounceRef.current) clearTimeout(mobileDebounceRef.current);
      mobileDebounceRef.current = setTimeout(() => {
        MobileNumberpreviousDeatils(str);
      }, 300);
    }
  }

  // ✅ Official email -> validate + debounced existing check
  if (name === "CORPORATEMAILID") {
    const str = toStr(value);
    isValid = validateEmail(str);

    const trimmedEmail = str.trim();
    if (validateEmail(trimmedEmail)) {
      if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);
      emailDebounceRef.current = setTimeout(() => {
        EmailpreviousDeatils(trimmedEmail);
      }, 500);
    }
    value = str;
  }

  // ✅ PAN -> uppercase + reset flags when <10
  if (name === "PANNO") {
    let str = toStr(value).toUpperCase();
    if (str.length > 10) return;

    isValid = validatePAN(str);
    value = str;

    if (str.length < 10) {
      setVarifiyDis(false);
      setFormData((prev) => ({
        ...prev,
        EmpMst: {
          ...prev.EmpMst,
          PANNO: str,
          PAN_CARD_VER: false,
          PAN_NAME_MATCH_VER: false,
          AADHAAR_LINKED_VER: false,
        },
      }));

      setErrors((prevErrors) => ({
        ...prevErrors,
        PANNO: str.trim() ? !isValid : true,
      }));
      return;
    }
  }

  // ✅ Aadhaar -> digits only + reset flags when <12
  if (name === "UID_NO") {
    let str = toStr(value).replace(/\D/g, "");
    if (str.length > 12) return;

    value = str;

    if (str.length < 12) {
      setVarifiyDis1(false);
      setFormData((prev) => ({
        ...prev,
        EmpMst: {
          ...prev.EmpMst,
          UID_NO: str,
          photo: null,
          full_addressAadhaar: "",
          AADHAR_CARD_VER: false,
        },
      }));

      setErrors((prevErrors) => ({
        ...prevErrors,
        UID_NO: str.trim() ? false : true,
      }));
      return;
    }
  }

  // ✅ Passport -> uppercase + max 8 + validate format
  if (name === "PASSPORTNO") {
    let str = toStr(value).toUpperCase();
    if (str.length > 8) return;
    isValid = validatePassport(str);
    value = str;
  }

  // ✅ finally update state
  setFormData((prevData) => ({
    ...prevData,
    EmpMst: {
      ...prevData.EmpMst,
      [name]: value,
    },
  }));

  // ✅ set errors only for string inputs
  if (typeof value === "string") {
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: value.trim() ? !isValid : true,
    }));
  } else {
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: false,
    }));
  }
}, []);

  const verifiyPan = async () => {
    const panNo = formData?.EmpMst?.PANNO;

    if (compdata?.Digilocker_Linked == "1") {
      if (!formData.EmpMst?.MOBILENO) {
        toast({
          title: `Please Enter Official Mobile Number first`,
          variant: "destructive",
        });
        return;
      }
      if (!formData?.EmpMst?.PANNO) {
        toast({
          title: `Please Enter Pan Number first`,
          variant: "destructive",
        });
        return;
      }

      if (panNo) {
        const panTrimmed = panNo.toString().trim().toUpperCase();
        const isValidPAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panTrimmed);

        if (!isValidPAN) {
          toast({
            title: `Invalid PAN Card No. Format should be ABCDE1234F`,
            variant: "destructive",
          });
          return;
        }
      }

      try {
        setIsLoading(true);
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/panAndAdharApi/FetchData`,
          {
            panNo: formData.EmpMst?.PANNO,
            Empcode: formData.EmpMst?.EMPCODE,
          },
          { headers: { compcode: user?.Comp_Code, name: user?.name } }
        );
        setIsLoading(false);

        const res1 = result?.data?.data;

        if (result.status === 202) {
          toast({
            title:
              result?.data?.message ||
              "Please Create Employee, Then Do Verification",
            variant: "destructive",
          });
          return;
        }
        if (res1) {
          setDocumentData((prev: any) => ({ ...prev, pan: res1 }));
          onAadharVerified?.("pan");
        } else {
          onOpenDialog();
        }
      } catch (error) {
        console.error("Error", error);
        setIsLoading(false);
      }
      return;
    }

    if (compdata?.Digilocker_Linked == "2") {
      if (panNo) {
        const panTrimmed = panNo.toString().trim().toUpperCase();
        const isValidPAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panTrimmed);
        if (!isValidPAN) {
          showSideAlert(
            "Invalid PAN Card No. Format should be ABCDE1234F",
            "warning"
          );
          return;
        }
      }

      if (!formData.EmpMst?.PANNO) {
        showSideAlert("Please Enter Pan No", "warning");
        return;
      }
      if (!formData.EmpMst?.EMPFIRSTNAME) {
        showSideAlert("Please Enter First Name", "warning");
        return;
      }
      if (!formData.EmpMst?.DOB) {
        showSideAlert("Please Enter Date Of Birth(DOB)", "warning");
        return;
      }

      try {
        setIsLoading(true);
        const fullName = `${formData.EmpMst?.EMPFIRSTNAME || ""} ${
          formData.EmpMst?.EMPLASTNAME || ""
        }`.trim();

        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/panAndAdharApi/ValidateIdtoAi`,
          {
            api_name: "pan_nsdl",
            payload: {
              pan_number: formData.EmpMst?.PANNO,
              name: fullName,
              dob: formData.EmpMst?.DOB,
            },
            refresh: false,
          },
          { headers: { compcode: user?.Comp_Code, name: user?.name } }
        );
        setIsLoading(false);

        const res = result?.data?.data;
        setPanInfo(res);

        if (res?.status == "success") {
          setFormData((prev) => ({
            ...prev,
            EmpMst: {
              ...prev.EmpMst,
              PAN_CARD_VER: true,
              PAN_NAME_MATCH_VER: Boolean(res?.name_match),
              AADHAAR_LINKED_VER: Boolean(res?.aadhaar_seeding),
            },
          }));
          showSideAlert("PAN Card Verified successfully", "success");
        } else {
          setFormData((prev) => ({
            ...prev,
            EmpMst: {
              ...prev.EmpMst,
              PAN_CARD_VER: false,
              PAN_NAME_MATCH_VER: false,
              AADHAAR_LINKED_VER: false,
            },
          }));
          showSideAlert("Invalid PAN Card Number", "warning");
        }
      } catch (error) {
        console.log("Error", error);
        setIsLoading(false);
        if (error?.response?.data?.error?.detail) {
          showSideAlert(
            `${error?.response?.data?.error?.detail?.details}`,
            "error"
          );
        }
      }
      return;
    }

    if (panNo) {
      const panTrimmed = panNo.toString().trim().toUpperCase();
      const isValidPAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panTrimmed);
      if (!isValidPAN) {
        showSideAlert(
          "Invalid PAN Card No. Format should be ABCDE1234F",
          "warning"
        );
        return;
      }
    }

    try {
      setIsLoading(true);
      const fullName = `${formData.EmpMst?.EMPFIRSTNAME || ""} ${
        formData.EmpMst?.EMPLASTNAME || ""
      }`.trim();

      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/panAndAdharApi/validate`,
        {
          value: formData.EmpMst?.PANNO,
          name_as_per_pan: fullName,
          date_of_birth: formData.EmpMst?.DOB,
          option: "10",
        },
        { headers: { compcode: user?.Comp_Code, name: user?.name } }
      );
      setIsLoading(false);

      const res = result?.data?.data;
      setPanInfo(res);

      if (res?.status == "valid") {
        setFormData((prev) => ({
          ...prev,
          EmpMst: {
            ...prev.EmpMst,
            PAN_CARD_VER: true,
            PAN_NAME_MATCH_VER: res.name_as_per_pan_match,
            AADHAAR_LINKED_VER: res.aadhaar_seeding_status === "y",
          },
        }));
        showSideAlert("PAN Card Verified successfully", "success");
      } else {
        setFormData((prev) => ({
          ...prev,
          EmpMst: {
            ...prev.EmpMst,
            PAN_CARD_VER: false,
            PAN_NAME_MATCH_VER: false,
            AADHAAR_LINKED_VER: false,
          },
        }));
        showSideAlert("Invalid PAN Card Number", "warning");
      }
    } catch (error) {
      console.error("Error", error);
      setIsLoading(false);
    }
  };

  const verifiyAadhaar = async () => {
    if (!formData.EmpMst?.UID_NO) {
      toast({
        title: `Please enter Aadhaar number first`,
        variant: "destructive",
      });
      return;
    }

    if (!/^\d{12}$/.test(formData.EmpMst?.UID_NO)) {
      toast({
        title: `Aadhaar number must be exactly 12 digits`,
        variant: "destructive",
      });
      return;
    }

    if (!formData.EmpMst?.MOBILENO) {
      toast({
        title: `Please enter Official Mobile Number first`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/panAndAdharApi/validate`,
        { value: formData.EmpMst?.UID_NO, option: "8" },
        { headers: { compcode: user?.Comp_Code, name: user?.name } }
      );

      const res = result?.data?.data;

      if (res && (res.photo || res.full_address)) {
        setAadhaarMode("primary");
        setAadhaarInfo(res);
        setFormData((prev) => ({
          ...prev,
          EmpMst: {
            ...prev.EmpMst,
            photo: res.photo,
            full_addressAadhaar: res.full_address,
            PERMANENTADDRESS1: res.full_address,
            AADHAR_CARD_VER: "true",
          },
        }));
        setIsLoading(false);
        return;
      } else if (res.reference_id) {
        setAadhaarMode("primary");
        showSideAlert(res?.message || "OTP sent successfully", "success");
        setreference_id(res.reference_id?.toString());
        setdisabledOtp(false);
        setVarifiyDis1(true);
        setIsLoading(false);
        return;
      } else {
        throw new Error(res?.message || "Primary Aadhaar Failed");
      }
    } catch (error) {
      setAadhaarMode("digilocker");
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
                `${user?.Comp_Code}__${formData.EmpMst?.UID_NO}`
              )}`,
              consent_purpose: "true",
              consent: "true",
            },
            mobile: formData.EmpMst?.MOBILENO,
            aadhaar_number: formData.EmpMst?.UID_NO,
          },
          { headers: { compcode: user?.Comp_Code, name: user?.name } }
        );

        const digilockerUrl = digiRes?.data?.data?.url;

        if (digilockerUrl) {
          setDocumentData((prev) => ({ ...prev, digilockerUrl }));
          setShowAadhaarTooltip(true);
        } else if (digiRes?.data) {
          setDocumentData((prev) => ({ ...prev, aadhaar: digiRes?.data }));
          setFormData((prev) => ({
            ...prev,
            EmpMst: {
              ...prev.EmpMst,
              photo: digiRes?.data?.aadhaar_photo_base64,
              full_addressAadhaar: digiRes?.data?.full_address,
              PERMANENTADDRESS1: digiRes?.data?.full_address,
            },
          }));
          setShowAadhaarTooltip(true);
        } else {
          toast({
            title: "Digilocker verification failed",
            variant: "destructive",
          });
        }
      } catch (digiError) {
        console.error("Digilocker Error", digiError);
        toast({
          title: "Both verification methods failed",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const SendWhatsappData = async (mobile: string) => {
    try {
      setIsLoading(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/panAndAdharApi/sendWhatsappData`,
        {
          Url: documentData.digilockerUrl,
          MobileNo: formData.EmpMst?.MOBILENO,
        },
        { headers: { compcode: user?.Comp_Code } }
      );

      toast({ title: `${response?.data?.Message}`, variant: "default" });
    } catch (error) {
      console.log("Error fetching customer details:", error);
      setIsLoading(false);
      setIsDialogOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const verifiyDl = async () => {
    if (!formData.EmpMst?.MOBILENO) {
      toast({
        title: `Please enter Official Mobile Number first`,
        variant: "destructive",
      });
      return;
    }
    try {
      setIsLoading(true);
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/panAndAdharApi/FetchData`,
        {
          DrivingLicense: formData.EmpMst?.DRIVINGLIC_ISSUEPALACE,
          Empcode: formData.EmpMst?.EMPCODE,
        },
        { headers: { compcode: user?.Comp_Code, name: user?.name } }
      );
      setIsLoading(false);

      const res1 = result?.data?.data;

      if (result.status === 202) {
        toast({
          title:
            result?.data?.message ||
            "Please Create Employee, Then Do Verification",
          variant: "destructive",
        });
        return;
      }

      if (res1) {
        setDocumentData((prev: any) => ({ ...prev, driving_license: res1 }));
        onAadharVerified?.("driving_license");
      } else {
        onOpenDialog();
      }
    } catch (error) {
      console.error("Error", error);
      setIsLoading(false);
    }
    return;
  };

  const OTPVerififyed = async () => {
    try {
      setIsLoading(true);
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/panAndAdharApi/validate`,
        {
          value: formData.EmpMst?.UID_NO,
          ref_id: reference_id,
          otp: formData.EmpMst?.OTP_With_Aadhaar,
          option: "9",
        },
        { headers: { compcode: user?.Comp_Code, name: user?.name } }
      );

      const res = result?.data?.data;
      const photo = res?.photo;
      const full_address = res?.full_address;
      const AADHAR_CARD_VER = res?.AADHAR_CARD_VER;

      setAadhaarInfo(res);

      if (photo || full_address) {
        setFormData((prev) => ({
          ...prev,
          EmpMst: {
            ...prev.EmpMst,
            photo:
              formData.EmpMst.profile == null ? photo : prev.EmpMst.photo,
            full_addressAadhaar: full_address,
            PERMANENTADDRESS1: full_address,
            AADHAR_CARD_VER: AADHAR_CARD_VER,
          },
        }));
        setIsLoading(false);
      }

      if (res?.status?.toLowerCase() === "valid") {
        setFormData((prev) => ({
          ...prev,
          EmpMst: { ...prev.EmpMst, AADHAR_CARD_VER: true },
        }));
        setdisabledOtp(true);
        setVarifiyDis1(false);
        showSideAlert("OTP Verififyed  successfully", "success");
        setIsLoading(false);
      } else if (
        res.status &&
        typeof res.status === "string" &&
        res.status.toLowerCase() != "valid"
      ) {
        setFormData((prev) => ({
          ...prev,
          EmpMst: { ...prev.EmpMst, AADHAR_CARD_VER: false },
        }));
        showSideAlert("Invalid OTP NUMBER", "warning");
        setIsLoading(false);
      } else if (
        res.message &&
        typeof res.message === "string" &&
        res.message.toLowerCase() == "invalid otp"
      ) {
        setFormData((prev) => ({
          ...prev,
          EmpMst: { ...prev.EmpMst, AADHAR_CARD_VER: false },
        }));
        showSideAlert("Invalid OTP NUMBER", "warning");
        setIsLoading(false);
      } else {
        setFormData((prev) => ({
          ...prev,
          EmpMst: { ...prev.EmpMst, AADHAR_CARD_VER: false },
        }));
        showSideAlert(`${res.message}`, "warning");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error", error);
      setIsLoading(false);
    }
  };

  const LikedWithPan = async () => {
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/panAndAdharApi/validate`,
        {
          value1: formData.EmpMst?.PANNO,
          value2: formData.EmpMst?.UID_NO,
          option: "11",
        },
        { headers: { compcode: user?.Comp_Code, name: user?.name } }
      );

      const res = result?.data?.data;

      setFormData((prev) => ({
        ...prev,
        EmpMst: {
          ...prev.EmpMst,
          AADHAR_CARD_VER: true,
          AADHAAR_LINKED_VER: res?.aadhaar_seeding_status == "y",
        },
      }));
    } catch (error) {
      console.error("Error", error);
    }
  };

  useEffect(() => {
    if (formData.EmpMst?.OTP_With_Aadhaar?.length === 6) {
      OTPVerififyed();
      LikedWithPan();
    }
  }, [formData.EmpMst?.OTP_With_Aadhaar]);

  const MobileNumberpreviousDeatils = async (mobile: string) => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/ExistingEmpDetailsByNo`,
        { MOBILENO: mobile, Loc_code: user?.branch },
        { headers: { compcode: user?.Comp_Code } }
      );

      if (response?.data?.message == "Customer Data fetched successfully") {
        setMobileData(response.data.result);
        setIsDialogOpen(true);
      } else {
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error("Error fetching customer details:", error);
      setIsDialogOpen(false);
    }
  };

  const EmailpreviousDeatils = async (email) => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/ExistingEmpDetailsByEmail`,
        { Email: email, Loc_code: user?.branch },
        { headers: { compcode: user?.Comp_Code, name: user?.name } }
      );

      if (response?.data?.message == "Customer Data fetched successfully") {
        setEmailData(response.data.result);
        setIsDialogOpen2(true);
      } else {
        setIsDialogOpen2(false);
      }
    } catch (error) {
      console.error("Error fetching customer details:", error);
      setIsDialogOpen2(false);
    }
  };

  const existingAdharData = async () => {
    const result = await axios.post(
      `${process.env.NEXT_PUBLIC_URL}/panAndAdharApi/validate`,
      { value: formData.EmpMst?.UID_NO, option: "8" },
      { headers: { compcode: user?.Comp_Code, name: user?.name } }
    );

    const res = result?.data?.data;
    setAadhaarInfo(res);
  };

  const existingPanData = async () => {
    try {
      if (compdata?.Digilocker_Linked == "2") {
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/panAndAdharApi/ValidateIdtoAi`,
          {
            api_name: "pan_nsdl",
            payload: {
              pan_number: formData.EmpMst?.PANNO,
              name: formData.EmpMst?.EMPFIRSTNAME,
              dob: formData.EmpMst?.DOB,
            },
            refresh: false,
          },
          { headers: { compcode: user?.Comp_Code, name: user?.name } }
        );
        setIsLoading(false);
        const res = result?.data?.data;
        setPanInfo(res);
      } else {
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/panAndAdharApi/validate`,
          {
            value: formData.EmpMst?.PANNO,
            name_as_per_pan: formData.EmpMst?.EMPFIRSTNAME,
            date_of_birth: formData.EmpMst?.DOB,
            option: "10",
          },
          { headers: { compcode: user?.Comp_Code, name: user?.name } }
        );
        const res = result?.data?.data;
        setPanInfo(res);
      }
    } catch (error) {
      console.log(error, "error");
      if (error?.response?.data?.error?.detail) {
        showSideAlert(
          `${error?.response?.data?.error?.detail?.details}`,
          "error"
        );
      }
    }
  };

  useEffect(() => {
    if (
      formData.EmpMst?.UID_NO?.length == 12 &&
      formData.EmpMst?.AADHAAR_CARD_VER == "true" &&
      aadhaarInfo == true
    ) {
      existingAdharData();
    }
  }, [aadhaarInfo]);

  useEffect(() => {
    if (
      formData.EmpMst?.PANNO?.length == 10 &&
      formData.EmpMst?.PAN_CARD_VER &&
      showPanTooltip == true
    ) {
      existingPanData();
    }
  }, [showPanTooltip]);

  useEffect(() => {
    Dropdown();
  }, []);

  const Dropdown = async () => {
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/quotation/dropdown`,
        { loc_code: user?.branch },
        { headers: { compcode: user?.Comp_Code, name: user?.name } }
      );
      setSource(result.data.data.source);
    } catch (error) {
      console.error("Error", error);
    }
  };

  // --- UI helper classes ---
const pageWrap = "w-full max-w-none bg-slate-50 dark:bg-black p-6";
  const cardClass =
    "rounded-2xl -mx-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-black shadow-sm overflow-hidden flex flex-col min-h-0";

  const cardHeaderClass =
    "flex items-center gap-2 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/20";

  const cardTitleClass =
    "text-[13px] tracking-wide font-semibold uppercase text-slate-900 dark:text-white";

  const cardBodyClass = "p-3 overflow-y-auto min-h-0";

  const fieldGridClass = "grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6";

  const toggleTileClass = (checked: boolean, disabled = false) =>
  `w-full h-9 flex items-center gap-3 px-3 rounded-xl border shadow-sm text-[12px] font-medium transition
  ${
    checked
      ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-200 dark:border-indigo-900"
      : "border-slate-200 bg-white text-slate-700 dark:bg-black dark:text-slate-200 dark:border-slate-800"
  }
  ${
    disabled
      ? "opacity-60 cursor-not-allowed"
      : "cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5"
  }`;

  const TileCheckbox = ({
  checked,
  disabled,
  label,
  onToggle,
  className = "",
}: {
  checked: boolean;
  disabled?: boolean;
  label: React.ReactNode;
  onToggle: (next: boolean) => void;
  className?: string;
}) => {
  return (
    <div
      className={`${toggleTileClass(checked, !!disabled)} ${className}`}
      onClick={() => {
        if (!disabled) onToggle(!checked);
      }}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onClick={(e) => e.stopPropagation()}          // ✅ stops double toggle
        onChange={(e) => onToggle(e.target.checked)}  // ✅ single source of truth
      />
      <span className="text-[13px] font-semibold text-slate-900 min-w-0 flex-1 truncate">
        {label}
      </span>
    </div>
  );
};

   const DrivingVerifiedTile = (
  <TileCheckbox
    checked={!!formData.EmpMst?.DRIVING_VER}
    disabled={false} // keep read-only like old logic when isDisabled=true
    label="Driving lic. verified"
    onToggle={(next) => handleInputChange("DRIVING_VER", next)}
  />
);

  return (
    <div className={pageWrap}>
         <div
          ref={wrapRef}
          className="grid -mx-7 -mt-6 w-[calc(100%+3rem)] px-6 grid-cols-1 lg:grid-cols-2 gap-6 min-h-0"
          style={{ height: rowHeight ? `${rowHeight}px` : undefined }}
        >
        {/* ===================== BASIC JOINING DETAILS ===================== */}
        <div className={cardClass}>
          <div className={cardHeaderClass}>
            <CalendarClock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" strokeWidth={2} />
            <div className={cardTitleClass}>Basic Joining Details</div>
          </div>

          <div
            className={`${cardBodyClass} flex-1 min-h-0 overflow-y-auto light-scroll pr-2`}
          >
            <div className={fieldGridClass}>
              <Einput
                type="date"
                value={formData.EmpMst?.Interview_Date}
                title="Date of interview"
                ShortName={true}
                name="Interview_Date"
                handleInputChange={handleInputChange}
                redlabel={isMandatory("Interview_Date") ? "*" : ""}
              />

              <Eselect
                title="Emp. status"
                ShortName={true}
                option={yesno01}
                name={"EMP_STATUS"}
                initialValue={formData.EmpMst?.EMP_STATUS?.toString()}
                handleInputChange={handleInputChange}
                redlabel={isMandatory("EMP_STATUS") ? "*" : ""}
              />

              <Einput
                value={
                  formData.EmpMst?.CURRENTJOINDATE
                    ? formData.EmpMst?.CURRENTJOINDATE.slice(0, 10)
                    : null
                }
                type="date"
                title="Date of joining"
                name="CURRENTJOINDATE"
                required
                handleInputChange={handleInputChange}
                redlabel={isMandatory("CURRENTJOINDATE") ? "*" : ""}
              />

              <Einput
                type="date"
                ShortName={true}
                title="Date of birth (DOB)"
                name="DOB"
                value={
                  formData.EmpMst.DOB
                    ? formData.EmpMst.DOB.slice(0, 10)
                    : ""
                }
                handleInputChange={handleInputChange}
                redlabel={isMandatory("DOB") ? "*" : ""}
              />

              <Einput
                type="date"
                title="Apprentice date from"
                ShortName={true}
                name="Apprentice_Date_From"
                value={formData.EmpMst?.Apprentice_Date_From}
                handleInputChange={handleInputChange}
              />

              <Einput
                type="date"
                title="Apprentice date to"
                ShortName={true}
                name="Apprentice_Date_To"
                value={formData.EmpMst?.Apprentice_Date_To}
                handleInputChange={handleInputChange}
              />

              <Einput
                type="text"
                title="Prob. period (days)"
                ShortName={true}
                name="PROBATIONPERIOD"
                placeholder="e.g.90"
                id="PROBATIONPERIOD"
                value={formData.EmpMst?.PROBATIONPERIOD}
                handleInputChange={handleInputChange}
                redlabel={isMandatory("PROBATIONPERIOD") ? "*" : ""}
              />

              <SelectSearch
                selectedValue={formData?.EmpMst?.Source_Code}
                h={"9"}
                title={"Source"}
                name={"Source_Code"}
                options={Source}
                handleInputChange={handleInputChange}
                className="!h-9"
                redlabel={isMandatory("Source_Code") ? "*" : ""}
              />

              <Einput
                type="date"
                title="Probation period"
                ShortName={true}
                name="Prob_period"
                id="Prob_period"
                value={
                  formData.EmpMst?.Prob_period
                    ? formData.EmpMst?.Prob_period.slice(0, 10)
                    : ""
                }
                handleInputChange={handleInputChange}
                redlabel={isMandatory("Prob_period") ? "*" : ""}
              />

              <Einput
                type="date"
                title="Confirmation date"
                name="Confirmation_Date"
                ShortName={true}
                id="Confirmation_Date"
                value={
                  formData.EmpMst?.Confirmation_Date
                    ? formData.EmpMst?.Confirmation_Date.slice(0, 10)
                    : ""
                }
                handleInputChange={handleInputChange}
                disabled
                redlabel={isMandatory("Confirmation_Date") ? "*" : ""}
              />

              <div className="md:col-span-2">
                <Einput
                  value={formData.EmpMst?.CORPORATEMAILID}
                  type="text"
                  title="Official email"
                  ShortName={true}
                  placeholder = "name@autovyn.com"
                  name="CORPORATEMAILID"
                  handleInputChange={handleInputChange}
                  errorMessage={
                    errors.CORPORATEMAILID ? "Invalid Email Address" : ""
                  }
                  redlabel={isMandatory("CORPORATEMAILID") ? "*" : ""}
                />
              </div>

              <Einput
                type="text"
                title="Official mobile number"
                ShortName={true}
                placeholder = "+91"
                name="MOBILENO"
                value={formData.EmpMst?.MOBILENO}
                handleInputChange={handleInputChange}
                maxLength={10}
                redlabel={isMandatory("MOBILENO") ? "*" : ""}
              />

              <Einput
                type="text"
                title="Mobile number"
                ShortName={true}
                placeholder = "+91"
                name="MOBILE_NO"
                value={formData.EmpMst?.MOBILE_NO}
                handleInputChange={handleInputChange}
                maxLength={10}
                redlabel={isMandatory("MOBILE_NO") ? "*" : ""}
              />

              <Einput
                type="text"
                title="Emergency mob. no."
                ShortName={true}
                placeholder = "+91"
                name="EMERGENCYNO"
                value={formData.EmpMst?.EMERGENCYNO}
                handleInputChange={handleInputChange}
                redlabel={isMandatory("EMERGENCYNO") ? "*" : ""}
              />

              <Einput
                type="text"
                title="Skills"
                ShortName={true}
                name="SKILLS"
                placeholder = "Comma seperated"
                value={formData.EmpMst?.SKILLS}
                handleInputChange={handleInputChange}
                redlabel={isMandatory("SKILLS") ? "*" : ""}
              />
            </div>


            <div className="mt-6">
              <TileCheckbox
                checked={!!formData.EmpMst?.Induction_Done}
                disabled={false}
                label="Induction status"
                onToggle={(next) => handleInputChange("Induction_Done", next)}
              />
            </div>

          </div>
        </div>

        {/* ===================== EMPLOYEE IDENTITY ===================== */}
        <div className={cardClass}>
          <div className={cardHeaderClass}>
            <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" strokeWidth={2} />
            <div className={cardTitleClass}>Employee Identity</div>
          </div>


          <div
            className={`${cardBodyClass} max-h-[calc(100vh-300px)] overflow-y-auto light-scroll pr-2`}
          >
            <div className="space-y-7">
              {/* ----------------- PAN (3 modes) ----------------- */}
              {compdata?.Digilocker_Linked === "1" && (
                <>
                  <VerifyRow onVerify={verifiyPan} disabled={varifiyDis}>
                    <Einput
                      type="text"
                      title="PAN card no."
                      name="PANNO"
                      placeholder = "ABCDE1234F"
                      value={formData.EmpMst?.PANNO}
                      handleInputChange={handleInputChange}
                      disabled={varifiyDis}
                      redlabel={isMandatory("PANNO") ? "*" : ""}
                      ShortName={true}
                    />

                    {formData.EmpMst?.PAN_CARD_VER && (
                      <AiOutlineQuestionCircle
                        size={18}
                        className="absolute right-2 top-7 text-gray-500 cursor-pointer"
                        onClick={() => setShowPanTooltip(!showPanTooltip)}
                      />
                    )}

                    {showPanTooltip && documentData?.pan && (
                      <div className="absolute top-full left-0 w-80 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl shadow p-3 mt-2 z-50 text-xs">
                        <p>
                          <strong>Name:</strong>{" "}
                          {documentData.pan.person_name}
                        </p>
                        <p>
                          <strong>DOB:</strong> {documentData.pan.person_dob}
                        </p>
                        <p>
                          <strong>PAN:</strong>{" "}
                          {documentData.pan.certificate_number}
                        </p>
                        <p>
                          <strong>Status:</strong>{" "}
                          {documentData.pan.certificate_status}
                        </p>
                        <p>
                          <strong>Certificate Type:</strong>{" "}
                          {documentData.pan.certificate_type}
                        </p>
                        <p>
                          <strong>PAN Verified Date:</strong>{" "}
                          {documentData.pan.pan_verified_on}
                        </p>
                        <p>
                          <strong>Category:</strong>{" "}
                          {documentData.pan.category}
                        </p>
                      </div>
                    )}
                  </VerifyRow>

                  <div className="grid gap-3  [grid-template-columns:110px_1fr_1fr]">
                    <label
                      htmlFor="PAN_CARD_VER"
                      className={toggleTileClass(
                        !!formData.EmpMst?.PAN_CARD_VER
                      )}
                    >
                      <Checkbox
                        checked={!!formData.EmpMst?.PAN_CARD_VER}
                        name="PAN_CARD_VER"
                        onChange={() => {
                          if (!isDisabled) {
                            handleInputChange(
                              "PAN_CARD_VER",
                              formData.EmpMst?.PAN_CARD_VER ? false : true
                            );
                          }
                        }}
                        disabled={isDisabled}
                      />
                      <span>Verified</span>
                    </label>

                    <label
                      htmlFor="AADHAAR_LINKED_VER"
                      className={toggleTileClass(
                        !!formData.EmpMst?.AADHAAR_LINKED_VER
                      )}
                      onClick={() => {
                        if (!isDisabled) {
                          handleInputChange(
                            "AADHAAR_LINKED_VER",
                            formData.EmpMst?.AADHAAR_LINKED_VER
                              ? false
                              : true
                          );
                        }
                      }}
                    >
                      <Checkbox
                        checked={!!formData.EmpMst?.AADHAAR_LINKED_VER}
                        name="AADHAAR_LINKED_VER"
                        onChange={() => {
                          if (!isDisabled) {
                            handleInputChange(
                              "AADHAAR_LINKED_VER",
                              formData.EmpMst?.AADHAAR_LINKED_VER
                                ? false
                                : true
                            );
                          }
                        }}
                        disabled={isDisabled}
                      />
                      <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200 font-bold">
                        Linked with Aadhaar
                      </span>
                    </label>

                    <label
                      htmlFor="PAN_NAME_MATCH_VER"
                      className={toggleTileClass(
                        !!formData.EmpMst?.PAN_NAME_MATCH_VER
                      )}
                      onClick={() => {
                        if (!isDisabled) {
                          handleInputChange(
                            "PAN_NAME_MATCH_VER",
                            formData.EmpMst?.PAN_NAME_MATCH_VER
                              ? false
                              : true
                          );
                        }
                      }}
                    >
                      <Checkbox
                        checked={!!formData.EmpMst?.PAN_NAME_MATCH_VER}
                        name="PAN_NAME_MATCH_VER"
                        onChange={() => {
                          if (!isDisabled) {
                            handleInputChange(
                              "PAN_NAME_MATCH_VER",
                              formData.EmpMst?.PAN_NAME_MATCH_VER
                                ? false
                                : true
                            );
                          }
                        }}
                        disabled={isDisabled}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        Linked with EmpName
                      </span>
                    </label>
                  </div>
                </>
              )}

              {compdata?.Digilocker_Linked == "2" && (
                <>
                  <VerifyRow onVerify={verifiyPan} disabled={varifiyDis}>
                    <Einput
                      type="text"
                      title="PAN card no."
                      ShortName={true}
                      placeholder = "ABCDE1234F"
                      name="PANNO"
                      value={formData.EmpMst?.PANNO}
                      handleInputChange={handleInputChange}
                      disabled={varifiyDis}
                    />

                    <AiOutlineQuestionCircle
                      size={18}
                      className="absolute right-2 top-7 text-gray-500 cursor-pointer"
                      onClick={() => setShowPanTooltip(!showPanTooltip)}
                    />

                    {showPanTooltip && panInfo && (
                      <div className="absolute top-full mt-2 left-0 w-80 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl shadow p-3 z-50 text-xs">
                        <p>
                          <strong>PAN:</strong> {panInfo.pan}
                        </p>
                        <p>
                          <strong>Status:</strong> {panInfo.status}
                        </p>
                        <p>
                          <strong>Aadhaar Seeding Description:</strong>{" "}
                          {panInfo.aadhaar_seeding_description}
                        </p>
                        <p>
                          <strong>Name Match:</strong>{" "}
                          {panInfo.name_match ? "Yes" : "No"}
                        </p>
                        <p>
                          <strong>DOB Match:</strong>{" "}
                          {panInfo.dob_match ? "Yes" : "No"}
                        </p>
                      </div>
                    )}
                  </VerifyRow>

                  <div className="grid gap-3 [grid-template-columns:auto_1fr_1fr]">
                    <label
                      htmlFor="PAN_CARD_VER"
                      className={toggleTileClass(
                        !!formData.EmpMst?.PAN_CARD_VER
                      )}
                    >
                      <Checkbox
                        checked={!!formData.EmpMst?.PAN_CARD_VER}
                        name="PAN_CARD_VER"
                        onChange={() => {
                          if (!isDisabled)
                            handleInputChange(
                              "PAN_CARD_VER",
                              formData.EmpMst?.PAN_CARD_VER ? false : true
                            );
                        }}
                        disabled={isDisabled}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        Verified
                      </span>
                    </label>

                    <label
                      htmlFor="AADHAAR_LINKED_VER"
                      className={toggleTileClass(
                        !!formData.EmpMst?.AADHAAR_LINKED_VER
                      )}
                      onClick={() => {
                        if (!isDisabled)
                          handleInputChange(
                            "AADHAAR_LINKED_VER",
                            formData.EmpMst?.AADHAAR_LINKED_VER
                              ? false
                              : true
                          );
                      }}
                    >
                      <Checkbox
                        checked={!!formData.EmpMst?.AADHAAR_LINKED_VER}
                        name="AADHAAR_LINKED_VER"
                        onChange={() => {
                          if (!isDisabled)
                            handleInputChange(
                              "AADHAAR_LINKED_VER",
                              formData.EmpMst?.AADHAAR_LINKED_VER
                                ? false
                                : true
                            );
                        }}
                        disabled={isDisabled}
                      />
                      <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200 font-bold">
                        Linked with Aadhaar
                      </span>
                    </label>

                    <label
                      htmlFor="PAN_NAME_MATCH_VER"
                      className={toggleTileClass(
                        !!formData.EmpMst?.PAN_NAME_MATCH_VER
                      )}
                      onClick={() => {
                        if (!isDisabled)
                          handleInputChange(
                            "PAN_NAME_MATCH_VER",
                            formData.EmpMst?.PAN_NAME_MATCH_VER
                              ? false
                              : true
                          );
                      }}
                    >
                      <Checkbox
                        checked={!!formData.EmpMst?.PAN_NAME_MATCH_VER}
                        name="PAN_NAME_MATCH_VER"
                        onChange={() => {
                          if (!isDisabled)
                            handleInputChange(
                              "PAN_NAME_MATCH_VER",
                              formData.EmpMst?.PAN_NAME_MATCH_VER
                                ? false
                                : true
                            );
                        }}
                        disabled={isDisabled}
                      />
                      <span className="min-w-0 flex-1 truncate">
                        Linked with EmpName
                      </span>
                    </label>
                  </div>
                </>
              )}

              {compdata?.Digilocker_Linked !== "1" &&
                compdata?.Digilocker_Linked !== "2" && (
                  <>
                    <VerifyRow onVerify={verifiyPan} disabled={varifiyDis}>
                      <Einput
                        type="text"
                        title="PAN card no."
                        name="PANNO"
                        placeholder = "ABCDE1234F"
                        ShortName={true}
                        value={formData.EmpMst?.PANNO}
                        handleInputChange={handleInputChange}
                        disabled={varifiyDis}
                        redlabel={isMandatory("PANNO") ? "*" : ""}
                      />

                      <AiOutlineQuestionCircle
                        size={18}
                        className="absolute right-2 top-7 text-gray-500 cursor-pointer"
                        onClick={() => setShowPanTooltip(!showPanTooltip)}
                      />

                      {showPanTooltip && panInfo && (
                        <div className="absolute top-full mt-2 left-0 w-80 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl shadow p-3 z-50 text-xs">
                          <p>
                            <strong>PAN:</strong> {panInfo.pan}
                          </p>
                          <p>
                            <strong>Status:</strong> {panInfo.status}
                          </p>
                          <p>
                            <strong>Aadhaar Seeding:</strong>{" "}
                            {panInfo.aadhaar_seeding_status}
                          </p>
                          <p>
                            <strong>Name Match:</strong>{" "}
                            {panInfo.name_as_per_pan_match ? "Yes" : "No"}
                          </p>
                          <p>
                            <strong>DOB Match:</strong>{" "}
                            {panInfo.date_of_birth_match ? "Yes" : "No"}
                          </p>
                          <p>
                            <strong>Category:</strong> {panInfo.category}
                          </p>
                        </div>
                      )}
                    </VerifyRow>

                    <div className="grid gap-3 [grid-template-columns:auto_1fr_1fr]">
                      <label
                        htmlFor="PAN_CARD_VER"
                        className={toggleTileClass(
                          !!formData.EmpMst?.PAN_CARD_VER
                        )}
                      >
                        <Checkbox
                          checked={!!formData.EmpMst?.PAN_CARD_VER}
                          name="PAN_CARD_VER"
                          onChange={() => {
                            if (!isDisabled)
                              handleInputChange(
                                "PAN_CARD_VER",
                                formData.EmpMst?.PAN_CARD_VER ? false : true
                              );
                          }}
                          disabled={isDisabled}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          Verified
                        </span>
                      </label>

                      <label
                        htmlFor="AADHAAR_LINKED_VER"
                        className={toggleTileClass(
                          !!formData.EmpMst?.AADHAAR_LINKED_VER
                        )}
                        onClick={() => {
                          if (!isDisabled)
                            handleInputChange(
                              "AADHAAR_LINKED_VER",
                              formData.EmpMst?.AADHAAR_LINKED_VER
                                ? false
                                : true
                            );
                        }}
                      >
                        <Checkbox
                          checked={!!formData.EmpMst?.AADHAAR_LINKED_VER}
                          name="AADHAAR_LINKED_VER"
                          onChange={() => {
                            if (!isDisabled)
                              handleInputChange(
                                "AADHAAR_LINKED_VER",
                                formData.EmpMst?.AADHAAR_LINKED_VER
                                  ? false
                                  : true
                              );
                          }}
                          disabled={isDisabled}
                        />
                        <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200 font-bold">
                          Linked with Aadhaar
                        </span>
                      </label>

                      <label
                        htmlFor="PAN_NAME_MATCH_VER"
                        className={toggleTileClass(
                          !!formData.EmpMst?.PAN_NAME_MATCH_VER
                        )}
                        onClick={() => {
                          if (!isDisabled)
                            handleInputChange(
                              "PAN_NAME_MATCH_VER",
                              formData.EmpMst?.PAN_NAME_MATCH_VER
                                ? false
                                : true
                            );
                        }}
                      >
                        <Checkbox
                          checked={!!formData.EmpMst?.PAN_NAME_MATCH_VER}
                          name="PAN_NAME_MATCH_VER"
                          onChange={() => {
                            if (!isDisabled)
                              handleInputChange(
                                "PAN_NAME_MATCH_VER",
                                formData.EmpMst?.PAN_NAME_MATCH_VER
                                  ? false
                                  : true
                              );
                          }}
                          disabled={isDisabled}
                        />
                        <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200 font-bold">
                          Linked with EmpName
                        </span>
                      </label>
                    </div>
                  </>
                )}

              {/* ----------------- Aadhaar blocks ----------------- */}
              {(aadhaarMode === "digilocker1" ||
                aadhaarMode === "digilocker" ||
                aadhaarMode === "primary") && (
                <>
                  <VerifyRow
                    onVerify={verifiyAadhaar}
                    disabled={varifiyDis1}
                  >
                    <Einput
                      type="text"
                      title="Aadhar card no."
                      ShortName={true}
                      placeholder = "12 digits"
                      name="UID_NO"
                      id="UID_NO"
                      value={formData.EmpMst?.UID_NO}
                      handleInputChange={handleInputChange}
                      disabled={varifiyDis1}
                      redlabel={isMandatory("UID_NO") ? "*" : ""}
                    />

                    {formData.EmpMst?.AADHAR_CARD_VER && (
                      <AiOutlineQuestionCircle
                        size={18}
                        className="absolute right-2 top-7 text-gray-500 cursor-pointer"
                        onClick={() =>
                          setShowAadhaarTooltip(!showAadhaarTooltip)
                        }
                      />
                    )}

                    {aadhaarMode === "primary" &&
                      showAadhaarTooltip &&
                      aadhaarInfo && (
                        <div className="absolute top-full mt-2 left-0 w-80 p-3 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 shadow-lg text-xs rounded-xl z-50">
                          <p>
                            <strong>Name:</strong> {aadhaarInfo.name}
                          </p>
                          <p>
                            <strong>DOB:</strong>{" "}
                            {aadhaarInfo.date_of_birth}
                          </p>
                          <p>
                            <strong>Gender:</strong> {aadhaarInfo.gender}
                          </p>
                          <p>
                            <strong>Care Of:</strong> {aadhaarInfo.care_of}
                          </p>
                          <p>
                            <strong>Address:</strong>{" "}
                            {aadhaarInfo.full_address}
                          </p>
                          {aadhaarInfo.photo && (
                            <img
                              src={`data:image/jpeg;base64,${aadhaarInfo.photo}`}
                              alt="Aadhaar"
                              className="w-24 h-auto mt-2 border rounded"
                            />
                          )}
                        </div>
                      )}

                    {aadhaarMode !== "primary" &&
                      showAadhaarTooltip &&
                      documentData && (
                        <div className="absolute top-14 left-0 w-96 max-w-[90vw] p-3 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 shadow-lg text-xs rounded-xl z-50">
                          {documentData?.digilockerUrl ? (
                            <>
                              <p className="font-semibold mb-2">
                                DigiLocker Verification Link
                              </p>
                              <div className="bg-slate-50 dark:bg-slate-900/30 p-2 rounded break-all text-[11px] mb-3 border border-slate-200 dark:border-slate-800">
                                {documentData.digilockerUrl}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  className="px-3 py-1.5 text-xs border rounded-lg hover:bg-slate-50 dark:hover:bg-white/5"
                                  onClick={() =>
                                    navigator.clipboard.writeText(
                                      documentData.digilockerUrl
                                    )
                                  }
                                >
                                  Copy
                                </button>
                                <button
                                  className="px-3 py-1.5 text-xs border rounded-lg hover:bg-slate-50 dark:hover:bg-white/5"
                                  onClick={() =>
                                    window.open(
                                      documentData.digilockerUrl,
                                      "_blank",
                                      "width=500,height=700"
                                    )
                                  }
                                >
                                  Open
                                </button>
                                <button
                                  className="px-3 py-1.5 text-xs border rounded-lg hover:bg-slate-50 dark:hover:bg-white/5"
                                  onClick={SendWhatsappData}
                                >
                                  Send Whatsapp
                                </button>
                              </div>
                            </>
                          ) : (
                            documentData?.aadhaar && (
                              <>
                                <p>
                                  <strong>Name:</strong>{" "}
                                  {documentData.aadhaar.aadhaar_name}
                                </p>
                                <p>
                                  <strong>DOB:</strong>{" "}
                                  {documentData.aadhaar.aadhaar_dob}
                                </p>
                                <p>
                                  <strong>Gender:</strong>{" "}
                                  {documentData.aadhaar.aadhaar_gender}
                                </p>
                                <p>
                                  <strong>Address:</strong>{" "}
                                  {documentData.aadhaar.aadhaar_vtc},{" "}
                                  {documentData.aadhaar.aadhaar_dist},{" "}
                                  {documentData.aadhaar.aadhaar_state} -{" "}
                                  {documentData.aadhaar.aadhaar_pc}
                                </p>
                              </>
                            )
                          )}
                        </div>
                      )}
                  </VerifyRow>

                  {aadhaarMode === "primary" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-end">
                      <Einput
                        type="number"
                        ShortName={true}
                        title="OTP with Aadhaar"
                        placeholder = "6 digits"
                        name="OTP_With_Aadhaar"
                        id="OTP_With_Aadhaar"
                        value={
                          formData.EmpMst?.OTP_With_Aadhaar
                            ? formData.EmpMst?.OTP_With_Aadhaar
                            : null
                        }
                        handleInputChange={handleInputChange}
                        disabled={disabledOtp}
                      />

                      <label
                        htmlFor="AADHAR_CARD_VER"
                        className={toggleTileClass(
                          !!formData.EmpMst?.AADHAR_CARD_VER
                        )}
                        onClick={() => {
                          if (!isDisabled) {
                            handleInputChange(
                              "AADHAR_CARD_VER",
                              formData.EmpMst?.AADHAR_CARD_VER
                                ? false
                                : true
                            );
                          }
                        }}
                      >
                        <Checkbox
                          checked={!!formData.EmpMst?.AADHAR_CARD_VER}
                          name="AADHAR_CARD_VER"
                          onChange={() => {
                            if (!isDisabled) {
                              handleInputChange(
                                "AADHAR_CARD_VER",
                                formData.EmpMst?.AADHAR_CARD_VER
                                  ? false
                                  : true
                              );
                            }
                          }}
                          disabled={isDisabled}
                        />
                        <span className="min-w-0 flex-1  truncate">
                          Aadhaar verified
                        </span>
                      </label>
                    </div>
                  )}
                </>
              )}

              {/* Passport */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <Einput
                  type="text"
                  title="Passport no."
                  ShortName={true}
                  placeholder="A1234567"
                  name="PASSPORTNO"
                  id="PASSPORTNO"
                  value={formData.EmpMst?.PASSPORTNO}
                  handleInputChange={handleInputChange}
                  errorMessage={
                    errors.PASSPORTNO
                      ? "Invalid Passport Number (Format: A1234567)"
                      : ""
                  }
                  redlabel={isMandatory("PASSPORTNO") ? "*" : ""}
                />

                <Einput
                  type="date"
                  title="Passport expiry date"
                  ShortName={true}
                  name="PASSEXPIRYDATE"
                  id="PASSEXPIRYDATE"
                  value={
                    formData.EmpMst?.PASSEXPIRYDATE
                      ? formData.EmpMst?.PASSEXPIRYDATE.slice(0, 10)
                      : null
                  }
                  handleInputChange={handleInputChange}
                  redlabel={isMandatory("PASSEXPIRYDATE") ? "*" : ""}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TileCheckbox
                  checked={!!formData.EmpMst?.PASSPORT_VER}
                  disabled={false}
                  label="Passport doc. verified"
                  onToggle={(next) => handleInputChange("PASSPORT_VER", next)}
                />
              </div>

              {/* Driving License */}
             
              {compdata?.Digilocker_Linked === "1" ? (
                <>
                  {/* Row-1: DL No + DL Type + (FileViewer) + Verify */}
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_84px_110px] gap-3 items-end">
                    <div className="relative">
                      <Einput
                        type="text"
                        title="Driving lic. no."
                        placeholder="AB0120230012345"
                        ShortName={true}
                        name="DRIVINGLIC_ISSUEPALACE"
                        id="DRIVINGLIC_ISSUEPALACE"
                        value={formData.EmpMst?.DRIVINGLIC_ISSUEPALACE}
                        handleInputChange={handleInputChange}
                        className="pr-8"
                        redlabel={isMandatory("DRIVINGLIC_ISSUEPALACE") ? "*" : ""}
                      />

                      {formData.EmpMst?.DRIVING_VER && (
                        <AiOutlineQuestionCircle
                          size={18}
                          className="absolute right-2 top-7 text-gray-500 cursor-pointer"
                          onClick={() =>
                            setShowDrivingLicenseTooltip(!showDrivingLicenseTooltip)
                          }
                        />
                      )}

                      {showDrivingLicenseTooltip && documentData?.driving_license && (
                        <div className="absolute top-full mt-2 left-0 w-80 p-3 bg-white dark:bg-black border border-slate-200 dark:border-slate-800 shadow-lg text-xs rounded-xl z-50">
                          <p>
                            <strong>Name:</strong> {documentData.driving_license.person_name}
                          </p>
                          <p>
                            <strong>DOB:</strong> {documentData.driving_license.person_dob}
                          </p>
                          <p>
                            <strong>Gender:</strong>{" "}
                            {documentData.driving_license.person_gender}
                          </p>
                          <p>
                            <strong>Certificate Number:</strong>{" "}
                            {documentData.driving_license.certificate_number}
                          </p>
                          <p>
                            <strong>Certificate Status:</strong>{" "}
                            {documentData.driving_license.certificate_status}
                          </p>
                          <p>
                            <strong>Issue Date:</strong> {documentData.driving_license.issue_date}
                          </p>
                          <p>
                            <strong>Expiry Date:</strong>{" "}
                            {documentData.driving_license.expiry_date}
                          </p>
                        </div>
                      )}
                    </div>

                    <Eselect
                      option={DlvTypeOption}
                      title="Driving lic. type"
                      ShortName={true}
                      name="Dlv_Type"
                      initialValue={
                        formData.EmpMst?.Dlv_Type ? formData.EmpMst?.Dlv_Type.toString() : null
                      }
                      handleInputChange={handleInputChange}
                      redlabel={isMandatory("Dlv_Type") ? "*" : ""}
                    />

                    <div className="h-9 flex items-center justify-center">
                      {documentData?.driving_license?.uploaded?.[0]?.SMBPath ? (
                        <FileViewer
                          fileLink={`https://erp.autovyn.com/backend/fetch?filePath=${documentData?.driving_license?.uploaded?.[0]?.SMBPath}`}
                        />
                      ) : null}
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={verifiyDl}
                      disabled={varifiyDis1}
                      className="rounded-xl shadow-md h-10 flex items-center justify-center gap-2"
                    >
                      <ScanLine className="h-4 w-4" />
                      <span>Verify</span>
                    </Button>
                  </div>

                  {/* Row-2: Issue Date + Expiry Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <Einput
                      type="date"
                      title="Driving lic. issue date"
                      ShortName={true}
                      name="DRIVINGLIC_ISSUEDATE"
                      id="DRIVINGLIC_ISSUEDATE"
                      value={
                        formData.EmpMst?.DRIVINGLIC_ISSUEDATE
                          ? formData.EmpMst?.DRIVINGLIC_ISSUEDATE.slice(0, 10)
                          : null
                      }
                      handleInputChange={handleInputChange}
                      redlabel={isMandatory("DRIVINGLIC_ISSUEDATE") ? "*" : ""}
                    />

                    <Einput
                      type="date"
                      title="Driving lic. expiry date"
                      ShortName={true}
                      name="DRIVINGLIC_EXPDATE"
                      id="DRIVINGLIC_EXPDATE"
                      value={
                        formData.EmpMst?.DRIVINGLIC_EXPDATE
                          ? formData.EmpMst?.DRIVINGLIC_EXPDATE.slice(0, 10)
                          : null
                      }
                      handleInputChange={handleInputChange}
                      redlabel={isMandatory("DRIVINGLIC_EXPDATE") ? "*" : ""}
                    />
                  </div>

                  {/* Row-3: Verified tile LAST */}
                  <div className="mt-3">{DrivingVerifiedTile}</div>
                </>
              ) : (
                <>
                  {/* Row-1: DL No + DL Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <Einput
                      type="text"
                      title="Driving lic. no."
                      placeholder="AB0120230012345"
                      ShortName={true}
                      name="DRIVINGLIC_ISSUEPALACE"
                      id="DRIVINGLIC_ISSUEPALACE"
                      value={formData.EmpMst?.DRIVINGLIC_ISSUEPALACE}
                      handleInputChange={handleInputChange}
                      redlabel={isMandatory("DRIVINGLIC_ISSUEPALACE") ? "*" : ""}
                    />

                    <Eselect
                      option={DlvTypeOption}
                      title="Driving lic. type"
                      ShortName={true}
                      name="Dlv_Type"
                      initialValue={
                        formData.EmpMst?.Dlv_Type ? formData.EmpMst?.Dlv_Type.toString() : null
                      }
                      handleInputChange={handleInputChange}
                      redlabel={isMandatory("Dlv_Type") ? "*" : ""}
                    />
                  </div>

                  {/* Row-2: Issue Date + Expiry Date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <Einput
                      type="date"
                      title="Driving lic. issue date"
                      ShortName={true}
                      name="DRIVINGLIC_ISSUEDATE"
                      id="DRIVINGLIC_ISSUEDATE"
                      value={
                        formData.EmpMst?.DRIVINGLIC_ISSUEDATE
                          ? formData.EmpMst?.DRIVINGLIC_ISSUEDATE.slice(0, 10)
                          : null
                      }
                      handleInputChange={handleInputChange}
                      redlabel={isMandatory("DRIVINGLIC_ISSUEDATE") ? "*" : ""}
                    />

                    <Einput
                      type="date"
                      title="Driving lic. expiry date"
                      ShortName={true}
                      name="DRIVINGLIC_EXPDATE"
                      id="DRIVINGLIC_EXPDATE"
                      value={
                        formData.EmpMst?.DRIVINGLIC_EXPDATE
                          ? formData.EmpMst?.DRIVINGLIC_EXPDATE.slice(0, 10)
                          : null
                      }
                      handleInputChange={handleInputChange}
                      redlabel={isMandatory("DRIVINGLIC_EXPDATE") ? "*" : ""}
                    />
                  </div>

                  {/* Row-3: Verified tile LAST */}
                  <div className="mt-3">{DrivingVerifiedTile}</div>
                </>
              )}
              
            </div>
          </div>
        </div>
      </div>

      {/* ===================== dialogs ===================== */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-8/12 items-start ">
          <DialogHeader>
            <DialogTitle className="capitalize p-1 font-serif text-yellow flex">
              Employee previous details{" "}
            </DialogTitle>
            <hr className="bg-body-color" />
            <DialogDescription>
              <div className="grid grid-cols-1 gap-4 p-4">
                <div className="overflow-y-scroll h-96 no-visible-scrollbar">
                  <table className="table-auto w-full uppercase text-xs font-bold shadow rounded-lg p-2">
                    <thead className="sticky top-0 z-10 border-b border-body-color h-6 bg-white dark:bg-primary dark:bg-opacity-10 text-black dark:text-white">
                      <tr className="border-b border-body-color">
                        <th className="border text-xs text-left px-2 py-3 text-ellipsis whitespace-nowrap">
                          Employee Code
                        </th>
                        <th className="border text-xs text-left px-2 py-3 text-ellipsis whitespace-nowrap">
                          Full Name
                        </th>
                        <th className="border text-xs text-left px-2 py-3 text-ellipsis whitespace-nowrap">
                          Mobile Number
                        </th>
                        <th className="border text-xs text-left px-2 py-3 text-ellipsis whitespace-nowrap">
                          Designation
                        </th>
                        <th className="border text-xs text-left px-2 py-3 text-ellipsis whitespace-nowrap">
                          Branch
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white bg-opacity-60 dark:bg-input rounded-lg text-black dark:text-white">
                      {MobileData &&
                        MobileData.map((Rate, index) => (
                          <tr
                            key={index}
                            className="hover:bg-grey cursor-pointer"
                          >
                            <td className="border text-left px-2 border-body-color py-2 text-ellipsis whitespace-nowrap">
                              {Rate.EMPCODE}
                            </td>
                            <td className="border text-left px-2 border-body-color py-2 text-ellipsis whitespace-nowrap">
                              {Rate.FULLNAME}
                            </td>
                            <td className="border text-left px-2 border-body-color py-2 text-ellipsis whitespace-nowrap">
                              {Rate.MOBILENO}
                            </td>
                            <td className="border text-left px-2 border-body-color py-2 text-ellipsis whitespace-nowrap">
                              {Rate.EMPLOYEEDESIGNATION}
                            </td>
                            <td className="border text-left px-2 border-body-color py-2 text-ellipsis whitespace-nowrap">
                              {Rate.branch_name}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-2 text-sm font-medium text-exit dark:text-exit text-center">
                  This Employee Data Already Exists in Enquiry Databases
                  with Above Details, Kindly Check Before Proceeding.
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={isDialogOpen2} onOpenChange={setIsDialogOpen2}>
        <DialogContent className="w-8/12 items-start ">
          <DialogHeader>
            <DialogTitle className="capitalize p-1 font-serif text-yellow flex">
              Employee previous details{" "}
            </DialogTitle>
            <hr className="bg-body-color" />
            <DialogDescription>
              <div className="grid grid-cols-1 gap-4 p-4">
                <div className="overflow-y-scroll h-96 no-visible-scrollbar">
                  <table className="table-auto w-full uppercase text-xs font-bold shadow rounded-lg p-2">
                    <thead className="sticky top-0 z-10 border-b border-body-color h-6 bg-white dark:bg-primary dark:bg-opacity-10 text-black dark:text-white">
                      <tr className="border-b border-body-color">
                        <th className="border text-xs text-left px-2 py-3 text-ellipsis whitespace-nowrap">
                          Employee Code
                        </th>
                        <th className="border text-xs text-left px-2 py-3 text-ellipsis whitespace-nowrap">
                          Full Name
                        </th>
                        <th className="border text-xs text-left px-2 py-3 text-ellipsis whitespace-nowrap">
                          Email
                        </th>
                        <th className="border text-xs text-left px-2 py-3 text-ellipsis whitespace-nowrap">
                          Designation
                        </th>
                        <th className="border text-xs text-left px-2 py-3 text-ellipsis whitespace-nowrap">
                          Branch
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white bg-opacity-60 dark:bg-input rounded-lg text-black dark:text-white">
                      {EmailData &&
                        EmailData.map((Rate, index) => (
                          <tr
                            key={index}
                            className="hover:bg-grey cursor-pointer"
                          >
                            <td className="border text-left px-2 border-body-color py-2 text-ellipsis whitespace-nowrap">
                              {Rate.EMPCODE}
                            </td>
                            <td className="border text-left px-2 border-body-color py-2 text-ellipsis whitespace-nowrap">
                              {Rate.FULLNAME}
                            </td>
                            <td className="border text-left px-2 border-body-color py-2 text-ellipsis whitespace-nowrap">
                              {Rate.CORPORATEMAILID}
                            </td>
                            <td className="border text-left px-2 border-body-color py-2 text-ellipsis whitespace-nowrap">
                              {Rate.EMPLOYEEDESIGNATION}
                            </td>
                            <td className="border text-left px-2 border-body-color py-2 text-ellipsis whitespace-nowrap">
                              {Rate.branch_name}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-2 text-sm font-medium text-exit dark:text-exit text-center">
                  This Employee Data Already Exists in Enquiry Databases
                  with Above Details, Kindly Check Before Proceeding.
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
};

export default Page1;