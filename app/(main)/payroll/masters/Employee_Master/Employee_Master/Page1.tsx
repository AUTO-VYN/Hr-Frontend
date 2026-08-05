import SmallTitle from "@/components/atoms/smallTitle";
import Einput from "@/components/atoms/Einput";
import { useFormData } from "./Context/FormDataContext";
import Eselect from "@/components/atoms/Eselect";
import { Checkbox } from "antd";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import axios from "axios";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import Swal from "sweetalert2";
import { AiOutlineQuestionCircle } from "react-icons/ai";
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

const Page1 = ({
  onOpenDialog,
  documentData,
  setDocumentData,
  onAadharVerified,
  isMandatory,
}) => {
  const { compdata } = useSecureStorage();
  const isDisabled = true; // toggle this to enable/disable
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

  const handleInputChange = (name: string, value: string) => {
    let isValid = true;

    if (name == "MOBILE_NO") {
      if (!/^\d{0,10}$/.test(value)) return;
      value = value.replace(/\D/g, "");
    }

    if (name === "MOBILENO") {
      value = value.replace(/\D/g, "");
      if (value.length > 10) return;

      if (value.length === 10) {
        MobileNumberpreviousDeatils(value);
      }
    }

    if (name == "CORPORATEMAILID") {
      isValid = validateEmail(value);
      const trimmedEmail = value.trim();
      if (validateEmail(trimmedEmail)) {
        EmailpreviousDeatils(trimmedEmail);
      }
    }

    if (name == "PANNO") {
      value = value.toUpperCase();
      if (value.length > 10) return;

      isValid = validatePAN(value);

      if (value.length < 10) {
        setVarifiyDis(false);
        setFormData((prev) => ({
          ...prev,
          EmpMst: {
            ...prev.EmpMst,
            PAN_CARD_VER: false,
            PAN_NAME_MATCH_VER: false,
            AADHAAR_LINKED_VER: false,
          },
        }));
      }
    }

    if (name == "UID_NO") {
      if (!/^\d{0,12}$/.test(value)) return;
      value = value.replace(/\D/g, "");

      if (value.length < 12) {
        setVarifiyDis1(false);
        setFormData((prev) => ({
          ...prev,
          EmpMst: {
            ...prev.EmpMst,
            photo: null,
            full_addressAadhaar: "",
            AADHAR_CARD_VER: false,
          },
        }));
      }
    }

    if (name == "PASSPORTNO") {
      value = value.toUpperCase();
      if (value.length > 8) return;
      isValid = validatePassport(value);
    }

    setFormData((prevData) => ({
      ...prevData,
      EmpMst: {
        ...prevData.EmpMst,
        [name]: value,
      },
    }));

    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]:
        value && typeof value === "string" ? (value.trim() ? !isValid : true) : true,
    }));
  };

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
      toast({ title: `Please enter Aadhaar number first`, variant: "destructive" });
      return;
    }

    if (!/^\d{12}$/.test(formData.EmpMst?.UID_NO)) {
      toast({ title: `Aadhaar number must be exactly 12 digits`, variant: "destructive" });
      return;
    }

    if (!formData.EmpMst?.MOBILENO) {
      toast({ title: `Please enter Official Mobile Number first`, variant: "destructive" });
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
              redirect_url: `${process.env.NEXT_PUBLIC_URL}/panAndAdharApi/digilocker/callback/${btoa(
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
          toast({ title: "Digilocker verification failed", variant: "destructive" });
        }
      } catch (digiError) {
        console.error("Digilocker Error", digiError);
        toast({ title: "Both verification methods failed", variant: "destructive" });
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
      toast({ title: `Please enter Official Mobile Number first`, variant: "destructive" });
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
            photo: formData.EmpMst.profile == null ? photo : prev.EmpMst.photo,
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
        showSideAlert(`${error?.response?.data?.error?.detail?.details}`, "error");
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

  // --- UI helper classes (UI ONLY) ---
  // ✅ CHANGE: Cards ko fixed height + internal scroll support (dono cards ka scroll alag-alag)
  const cardClass =
    "rounded-xl border border-slate-200 dark:border-[#2a2f3a] bg-white dark:bg-black shadow-sm flex flex-col min-h-0 h-[calc(100vh-240px)] overflow-hidden";

  const cardHeaderClass =
    "flex items-center gap-2 px-5 py-4 border-b border-slate-200 dark:border-[#2a2f3a] bg-slate-50/70 dark:bg-[#0b1220]/40 rounded-t-xl shrink-0";

  const cardTitleClass =
    "text-[13px] tracking-wide font-semibold uppercase text-slate-900 dark:text-white";

  // ✅ CHANGE: card body now becomes scroll area (separate for each card)
  const cardBodyBaseClass = "p-5 flex-1 min-h-0";

  // ✅ Subtle light scrollbar (Tailwind only; no jsx/css file)
  const subtleScrollbar =
    "overflow-y-auto overflow-x-hidden pr-2 " +
    "[scrollbar-width:thin] [scrollbar-color:rgb(203_213_225)_transparent] " +
    "[&::-webkit-scrollbar]:w-[6px] " +
    "[&::-webkit-scrollbar-track]:bg-transparent " +
    "[&::-webkit-scrollbar-thumb]:bg-slate-200 " +
    "[&::-webkit-scrollbar-thumb]:rounded-full " +
    "hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 " +
    "dark:[scrollbar-color:rgb(100_116_139)_transparent] " +
    "dark:[&::-webkit-scrollbar-thumb]:bg-slate-700/60 " +
    "dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600";

  const cardBodyBasicClass = `${cardBodyBaseClass} ${subtleScrollbar}`;
  const cardBodyIdentityClass = `${cardBodyBaseClass} ${subtleScrollbar}`;

  const fieldGridClass = "grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5";
  const toggleTileClass = (checked: any) =>
    `w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition
     ${
       checked
         ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-200 dark:border-indigo-900"
         : "border-slate-200 bg-white text-slate-700 dark:bg-black dark:text-slate-200 dark:border-[#2a2f3a]"
     }
     ${isDisabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5"}`;

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* ===================== BASIC JOINING DETAILS ===================== */}
        <div className={cardClass}>
          <div className={cardHeaderClass}>
            <div className="h-8 w-8 rounded-lg bg-indigo-600/10 text-indigo-700 dark:text-indigo-200 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-900">
              <span className="text-[14px] font-bold">⏱</span>
            </div>
            <div>
              <div className={cardTitleClass}>Basic Joining Details</div>
            </div>
          </div>

          {/* ✅ SCROLL (Basic Joining Details) */}
          <div className={cardBodyBasicClass}>
            <div className={fieldGridClass}>
              <Einput
                type="date"
                value={formData.EmpMst?.Interview_Date}
                title="Date of interview"
                name="Interview_Date"
                handleInputChange={handleInputChange}
                redlabel={isMandatory("Interview_Date") ? "*" : ""}
              />

              <Eselect
                title="Emp. status"
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
                value={formData.EmpMst.DOB ? formData.EmpMst.DOB.slice(0, 10) : ""}
                handleInputChange={handleInputChange}
                redlabel={isMandatory("DOB") ? "*" : ""}
              />

              <Einput
                type="date"
                title="Apprentice date from"
                name="Apprentice_Date_From"
                value={formData.EmpMst?.Apprentice_Date_From}
                handleInputChange={handleInputChange}
                className="h-7"
              />

              <Einput
                type="date"
                title="Apprentice date to"
                name="Apprentice_Date_To"
                value={formData.EmpMst?.Apprentice_Date_To}
                handleInputChange={handleInputChange}
                className="h-7"
              />

              <Einput
                type="text"
                title="Prob. period (days)"
                name="PROBATIONPERIOD"
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
                className="!h-[30px]"
                redlabel={isMandatory("Source_Code") ? "*" : ""}
              />

              <Einput
                type="date"
                title="Probation period"
                name="Prob_period"
                id="Prob_period"
                value={
                  formData.EmpMst?.Prob_period
                    ? formData.EmpMst?.Prob_period.slice(0, 10)
                    : ""
                }
                handleInputChange={handleInputChange}
                className="h-7"
                redlabel={isMandatory("Prob_period") ? "*" : ""}
              />

              <Einput
                type="date"
                title="Confirmation date"
                name="Confirmation_Date"
                id="Confirmation_Date"
                value={
                  formData.EmpMst?.Confirmation_Date
                    ? formData.EmpMst?.Confirmation_Date.slice(0, 10)
                    : ""
                }
                handleInputChange={handleInputChange}
                className="h-7"
                disabled
                redlabel={isMandatory("Confirmation_Date") ? "*" : ""}
              />

              <div className="md:col-span-2">
                <Einput
                  value={formData.EmpMst?.CORPORATEMAILID}
                  type="text"
                  title="Official email"
                  name="CORPORATEMAILID"
                  handleInputChange={handleInputChange}
                  errorMessage={errors.CORPORATEMAILID ? "Invalid Email Address" : ""}
                  redlabel={isMandatory("CORPORATEMAILID") ? "*" : ""}
                />
              </div>

              <Einput
                type="text"
                title="Official mobile number"
                name="MOBILENO"
                value={formData.EmpMst?.MOBILENO}
                handleInputChange={handleInputChange}
                maxLength={10}
                redlabel={isMandatory("MOBILENO") ? "*" : ""}
              />

              <Einput
                type="text"
                title="Mobile number"
                name="MOBILE_NO"
                value={formData.EmpMst?.MOBILE_NO}
                handleInputChange={handleInputChange}
                maxLength={10}
                redlabel={isMandatory("MOBILE_NO") ? "*" : ""}
              />

              <Einput
                type="text"
                title="Emergency mob. no."
                name="EMERGENCYNO"
                value={formData.EmpMst?.EMERGENCYNO}
                handleInputChange={handleInputChange}
                redlabel={isMandatory("EMERGENCYNO") ? "*" : ""}
              />

              <Einput
                type="text"
                title="Skills"
                name="SKILLS"
                value={formData.EmpMst?.SKILLS}
                handleInputChange={handleInputChange}
                redlabel={isMandatory("SKILLS") ? "*" : ""}
              />
            </div>

            <div className="mt-5">
              <label
                htmlFor="Induction_Done"
                onClick={() =>
                  handleInputChange(
                    "Induction_Done",
                    formData.EmpMst?.Induction_Done ? false : true
                  )
                }
                className={toggleTileClass(!!formData.EmpMst?.Induction_Done)}
              >
                <Checkbox
                  checked={!!formData.EmpMst?.Induction_Done}
                  name="Induction_Done"
                  onChange={() =>
                    handleInputChange(
                      "Induction_Done",
                      formData.EmpMst?.Induction_Done ? false : true
                    )
                  }
                />
                <span>Induction status</span>
              </label>
            </div>
          </div>
        </div>

        {/* ===================== EMPLOYEE IDENTITY ===================== */}
        <div className={cardClass}>
          <div className={cardHeaderClass}>
            <div className="h-8 w-8 rounded-lg bg-indigo-600/10 text-indigo-700 dark:text-indigo-200 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-900">
              <span className="text-[14px] font-bold">🛡</span>
            </div>
            <div className={cardTitleClass}>Employee Identity</div>
          </div>

          {/* ✅ SCROLL (Employee Identity) */}
          <div className={cardBodyIdentityClass}>
            <div className="space-y-6">
              {/* ----------------- PAN (3 modes) ----------------- */}
              {compdata?.Digilocker_Linked === "1" && (
                <>
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-12 md:col-span-9 relative">
                      <Einput
                        type="text"
                        title="PAN card no."
                        name="PANNO"
                        value={formData.EmpMst?.PANNO}
                        handleInputChange={handleInputChange}
                        disabled={varifiyDis}
                        redlabel={isMandatory("PANNO") ? "*" : ""}
                        ShortName
                      />

                      {formData.EmpMst?.PAN_CARD_VER && (
                        <AiOutlineQuestionCircle
                          size={18}
                          className="absolute right-3 top-9 text-slate-500 cursor-pointer"
                          onClick={() => setShowPanTooltip(!showPanTooltip)}
                        />
                      )}

                      {showPanTooltip && documentData?.pan && (
                        <div className="absolute top-14 left-0 w-80 bg-white dark:bg-input border border-slate-200 dark:border-[#2a2f3a] rounded-lg shadow p-3 z-50 text-xs">
                          <p>
                            <strong>Name:</strong> {documentData.pan.person_name}
                          </p>
                          <p>
                            <strong>DOB:</strong> {documentData.pan.person_dob}
                          </p>
                          <p>
                            <strong>PAN:</strong> {documentData.pan.certificate_number}
                          </p>
                          <p>
                            <strong>Status:</strong> {documentData.pan.certificate_status}
                          </p>
                          <p>
                            <strong>Certificate Type:</strong> {documentData.pan.certificate_type}
                          </p>
                          <p>
                            <strong>PAN Verified Date:</strong> {documentData.pan.pan_verified_on}
                          </p>
                          <p>
                            <strong>Category:</strong> {documentData.pan.category}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="col-span-12 md:col-span-3">
                      <Button
                        variant="primary"
                        size="default"
                        shape="pill"
                        onClick={verifiyPan}
                        className="w-full h-8 text-[13px] rounded-lg"
                        disabled={varifiyDis}
                      >
                        Verify
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label
                      htmlFor="PAN_CARD_VER"
                      className={toggleTileClass(!!formData.EmpMst?.PAN_CARD_VER)}
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
                      className={toggleTileClass(!!formData.EmpMst?.AADHAAR_LINKED_VER)}
                      onClick={() => {
                        if (!isDisabled) {
                          handleInputChange(
                            "AADHAAR_LINKED_VER",
                            formData.EmpMst?.AADHAAR_LINKED_VER ? false : true
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
                              formData.EmpMst?.AADHAAR_LINKED_VER ? false : true
                            );
                          }
                        }}
                        disabled={isDisabled}
                      />
                      <span>Linked with Aadhaar</span>
                    </label>

                    <label
                      htmlFor="PAN_NAME_MATCH_VER"
                      className={toggleTileClass(!!formData.EmpMst?.PAN_NAME_MATCH_VER)}
                      onClick={() => {
                        if (!isDisabled) {
                          handleInputChange(
                            "PAN_NAME_MATCH_VER",
                            formData.EmpMst?.PAN_NAME_MATCH_VER ? false : true
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
                              formData.EmpMst?.PAN_NAME_MATCH_VER ? false : true
                            );
                          }
                        }}
                        disabled={isDisabled}
                      />
                      <span>Linked with EmpName</span>
                    </label>
                  </div>
                </>
              )}

              {compdata?.Digilocker_Linked == "2" && (
                <>
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-12 md:col-span-9 relative">
                      <Einput
                        type="text"
                        title="PAN card no."
                        name="PANNO"
                        value={formData.EmpMst?.PANNO}
                        handleInputChange={handleInputChange}
                        disabled={varifiyDis}
                        redlabel={isMandatory("PANNO") ? "*" : ""}
                      />

                      <AiOutlineQuestionCircle
                        size={18}
                        className="absolute right-3 top-9 text-slate-500 cursor-pointer"
                        onClick={() => setShowPanTooltip(!showPanTooltip)}
                      />

                      {showPanTooltip && panInfo && (
                        <div className="absolute top-14 left-0 w-80 bg-white dark:bg-input border border-slate-200 dark:border-[#2a2f3a] rounded-lg shadow p-3 z-50 text-xs">
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
                            <strong>Name Match:</strong> {panInfo.name_match ? "Yes" : "No"}
                          </p>
                          <p>
                            <strong>DOB Match:</strong> {panInfo.dob_match ? "Yes" : "No"}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="col-span-12 md:col-span-3">
                      <Button
                         variant="primary"
                         size="default"
                         shape="pill"
                        onClick={verifiyPan}
                        className="w-full h-8 text-[13px] rounded-lg"
                        disabled={varifiyDis}
                      >
                        Verify
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label
                      htmlFor="PAN_CARD_VER"
                      className={toggleTileClass(!!formData.EmpMst?.PAN_CARD_VER)}
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
                      className={toggleTileClass(!!formData.EmpMst?.AADHAAR_LINKED_VER)}
                      onClick={() => {
                        if (!isDisabled) {
                          handleInputChange(
                            "AADHAAR_LINKED_VER",
                            formData.EmpMst?.AADHAAR_LINKED_VER ? false : true
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
                              formData.EmpMst?.AADHAAR_LINKED_VER ? false : true
                            );
                          }
                        }}
                        disabled={isDisabled}
                      />
                      <span>Linked with Aadhaar</span>
                    </label>

                    <label
                      htmlFor="PAN_NAME_MATCH_VER"
                      className={toggleTileClass(!!formData.EmpMst?.PAN_NAME_MATCH_VER)}
                      onClick={() => {
                        if (!isDisabled) {
                          handleInputChange(
                            "PAN_NAME_MATCH_VER",
                            formData.EmpMst?.PAN_NAME_MATCH_VER ? false : true
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
                              formData.EmpMst?.PAN_NAME_MATCH_VER ? false : true
                            );
                          }
                        }}
                        disabled={isDisabled}
                      />
                      <span>Linked with EmpName</span>
                    </label>
                  </div>
                </>
              )}

              {compdata?.Digilocker_Linked !== "1" &&
                compdata?.Digilocker_Linked !== "2" && (
                  <>
                    <div className="grid grid-cols-12 gap-4 items-end">
                      <div className="col-span-12 md:col-span-9 relative">
                        <Einput
                          type="text"
                          title="PAN card no."
                          name="PANNO"
                          value={formData.EmpMst?.PANNO}
                          handleInputChange={handleInputChange}
                          disabled={varifiyDis}
                          redlabel={isMandatory("PANNO") ? "*" : ""}
                        />

                        <AiOutlineQuestionCircle
                          size={18}
                          className="absolute right-3 top-9 text-slate-500 cursor-pointer"
                          onClick={() => setShowPanTooltip(!showPanTooltip)}
                        />

                        {showPanTooltip && panInfo && (
                          <div className="absolute top-14 left-0 w-80 bg-white dark:bg-input border border-slate-200 dark:border-[#2a2f3a] rounded-lg shadow p-3 z-50 text-xs">
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
                      </div>

                      <div className="col-span-12 md:col-span-3">
                        <Button
                           variant="primary"
                           size="default"
                          shape="pill"
                          onClick={verifiyPan}
                          className="w-full h-8 text-[13px] rounded-lg"
                          disabled={varifiyDis}
                        >
                          Verify
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <label
                        htmlFor="PAN_CARD_VER"
                        className={toggleTileClass(!!formData.EmpMst?.PAN_CARD_VER)}
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
                        className={toggleTileClass(!!formData.EmpMst?.AADHAAR_LINKED_VER)}
                        onClick={() => {
                          if (!isDisabled) {
                            handleInputChange(
                              "AADHAAR_LINKED_VER",
                              formData.EmpMst?.AADHAAR_LINKED_VER ? false : true
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
                                formData.EmpMst?.AADHAAR_LINKED_VER ? false : true
                              );
                            }
                          }}
                          disabled={isDisabled}
                        />
                        <span>Linked with Aadhaar</span>
                      </label>

                      <label
                        htmlFor="PAN_NAME_MATCH_VER"
                        className={toggleTileClass(!!formData.EmpMst?.PAN_NAME_MATCH_VER)}
                        onClick={() => {
                          if (!isDisabled) {
                            handleInputChange(
                              "PAN_NAME_MATCH_VER",
                              formData.EmpMst?.PAN_NAME_MATCH_VER ? false : true
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
                                formData.EmpMst?.PAN_NAME_MATCH_VER ? false : true
                              );
                            }
                          }}
                          disabled={isDisabled}
                        />
                        <span>Linked with EmpName</span>
                      </label>
                    </div>
                  </>
                )}

             {/* {compdata?.Digilocker_Linked == "2" && (
                <>
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-12 md:col-span-9 relative">
                      <Einput
                        type="text"
                        title="PAN card no."
                        name="PANNO"
                        value={formData.EmpMst?.PANNO}
                        handleInputChange={handleInputChange}
                        disabled={varifiyDis}
                        redlabel={isMandatory("PANNO") ? "*" : ""}
                      />

                      <AiOutlineQuestionCircle
                        size={18}
                        className="absolute right-3 top-9 text-slate-500 cursor-pointer"
                        onClick={() => setShowPanTooltip(!showPanTooltip)}
                      />

                      {showPanTooltip && panInfo && (
                        <div className="absolute top-14 left-0 w-80 bg-white dark:bg-input border border-slate-200 dark:border-[#2a2f3a] rounded-lg shadow p-3 z-50 text-xs">
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
                    </div>

                    <div className="col-span-12 md:col-span-3">
                      <Button
                        variant="primary"
                        size="default"
                        shape="pill"
                        onClick={verifiyPan}
                        className="w-full h-8 text-[13px] rounded-lg"
                        disabled={varifiyDis}
                      >
                        Verify
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label
                      htmlFor="PAN_CARD_VER"
                      className={toggleTileClass(!!formData.EmpMst?.PAN_CARD_VER)}
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
                      className={toggleTileClass(!!formData.EmpMst?.AADHAAR_LINKED_VER)}
                      onClick={() => {
                        if (!isDisabled) {
                          handleInputChange(
                            "AADHAAR_LINKED_VER",
                            formData.EmpMst?.AADHAAR_LINKED_VER ? false : true
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
                              formData.EmpMst?.AADHAAR_LINKED_VER ? false : true
                            );
                          }
                        }}
                        disabled={isDisabled}
                      />
                      <span>Linked with Aadhaar</span>
                    </label>

                    <label
                      htmlFor="PAN_NAME_MATCH_VER"
                      className={toggleTileClass(!!formData.EmpMst?.PAN_NAME_MATCH_VER)}
                      onClick={() => {
                        if (!isDisabled) {
                          handleInputChange(
                            "PAN_NAME_MATCH_VER",
                            formData.EmpMst?.PAN_NAME_MATCH_VER ? false : true
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
                              formData.EmpMst?.PAN_NAME_MATCH_VER ? false : true
                            );
                          }
                        }}
                        disabled={isDisabled}
                      />
                      <span>Linked with EmpName</span>
                    </label>
                  </div>
                </>
              )}

              {compdata?.Digilocker_Linked !== "1" &&
                compdata?.Digilocker_Linked !== "2" && (
                  <>
                    <div className="grid grid-cols-12 gap-4 items-end">
                      <div className="col-span-12 md:col-span-9 relative">
                        <Einput
                          type="text"
                          title="PAN card no."
                          name="PANNO"
                          value={formData.EmpMst?.PANNO}
                          handleInputChange={handleInputChange}
                          disabled={varifiyDis}
                          redlabel={isMandatory("PANNO") ? "*" : ""}
                        />

                        <AiOutlineQuestionCircle
                          size={18}
                          className="absolute right-3 top-9 text-slate-500 cursor-pointer"
                          onClick={() => setShowPanTooltip(!showPanTooltip)}
                        />

                        {showPanTooltip && panInfo && (
                          <div className="absolute top-14 left-0 w-80 bg-white dark:bg-input border border-slate-200 dark:border-[#2a2f3a] rounded-lg shadow p-3 z-50 text-xs">
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
                      </div>

                      <div className="col-span-12 md:col-span-3">
                        <Button
                          variant="primary"
                          size="default"
                          shape="pill"
                          onClick={verifiyPan}
                          className="w-full h-8 text-[13px] rounded-lg"
                          disabled={varifiyDis}
                        >
                          Verify
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <label
                        htmlFor="PAN_CARD_VER"
                        className={toggleTileClass(!!formData.EmpMst?.PAN_CARD_VER)}
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
                        className={toggleTileClass(!!formData.EmpMst?.AADHAAR_LINKED_VER)}
                        onClick={() => {
                          if (!isDisabled) {
                            handleInputChange(
                              "AADHAAR_LINKED_VER",
                              formData.EmpMst?.AADHAAR_LINKED_VER ? false : true
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
                                formData.EmpMst?.AADHAAR_LINKED_VER ? false : true
                              );
                            }
                          }}
                          disabled={isDisabled}
                        />
                        <span>Linked with Aadhaar</span>
                      </label>

                      <label
                        htmlFor="PAN_NAME_MATCH_VER"
                        className={toggleTileClass(!!formData.EmpMst?.PAN_NAME_MATCH_VER)}
                        onClick={() => {
                          if (!isDisabled) {
                            handleInputChange(
                              "PAN_NAME_MATCH_VER",
                              formData.EmpMst?.PAN_NAME_MATCH_VER ? false : true
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
                                formData.EmpMst?.PAN_NAME_MATCH_VER ? false : true
                              );
                            }
                          }}
                          disabled={isDisabled}
                        />
                        <span>Linked with EmpName</span>
                      </label>
                    </div>
                  </>
                )} */}

              {/* ----------------- Aadhaar blocks (UI redesign only) ----------------- */}
              {aadhaarMode === "digilocker1" && (
                <>
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-12 md:col-span-9 relative">
                      <Einput
                        type="text"
                        title="Aadhaar card no."
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
                          className="absolute right-3 top-9 text-slate-500 cursor-pointer"
                          onClick={() =>
                            setShowAadhaarTooltip(!showAadhaarTooltip)
                          }
                        />
                      )}

                      {showAadhaarTooltip && documentData?.aadhaar && (
                        <div className="absolute top-14 left-0 w-80 p-3 bg-white border border-slate-200 dark:border-[#2a2f3a] shadow-lg text-xs rounded-lg z-50 dark:bg-input">
                          <p>
                            <strong>Care Of:</strong>{" "}
                            {documentData.aadhaar.aadhaar_co}
                          </p>
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
                            <strong>Address:</strong>
                            {documentData.aadhaar.aadhaar_vtc},
                            {documentData.aadhaar.aadhaar_dist},
                            {documentData.aadhaar.aadhaar_state} -{" "}
                            {documentData.aadhaar.aadhaar_pc}
                          </p>
                          <p>
                            <strong>Landmark:</strong>{" "}
                            {documentData.aadhaar.aadhaar_lm}
                          </p>
                          {documentData.aadhaar.aadhaar_photo_base64 && (
                            <img
                              src={`data:image/jpeg;base64,${documentData.aadhaar.aadhaar_photo_base64}`}
                              alt="Aadhaar"
                              className="w-24 h-auto mt-2 border rounded"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="col-span-12 md:col-span-3">
                      <Button
                         variant="primary"
                         size="default"
                        shape="pill"
                        onClick={verifiyAadhaar}
                        className="w-full h-8 text-[13px] rounded-lg"
                        disabled={varifiyDis1}
                      >
                        Verify
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label
                      htmlFor="AADHAR_CARD_VER"
                      className={toggleTileClass(!!formData.EmpMst?.AADHAR_CARD_VER)}
                      onClick={() => {
                        if (!isDisabled) {
                          handleInputChange(
                            "AADHAR_CARD_VER",
                            formData.EmpMst?.AADHAR_CARD_VER ? false : true
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
                              formData.EmpMst?.AADHAR_CARD_VER ? false : true
                            );
                          }
                        }}
                        disabled={isDisabled}
                      />
                      <span>Aadhaar verified</span>
                    </label>
                  </div>
                </>
              )}

              {aadhaarMode === "digilocker" && (
                <>
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-12 md:col-span-9 relative">
                      <Einput
                        type="text"
                        title="Aadhaar card no."
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
                          className="absolute right-3 top-9 text-slate-500 cursor-pointer"
                          onClick={() =>
                            setShowAadhaarTooltip(!showAadhaarTooltip)
                          }
                        />
                      )}

                      {showAadhaarTooltip && documentData && (
                        <div className="absolute top-14 left-0 w-96 max-w-[90vw] p-3 bg-white border border-slate-200 dark:border-[#2a2f3a] shadow-lg text-xs rounded-lg z-50 dark:bg-input">
                          {documentData?.digilockerUrl ? (
                            <>
                              <p className="font-semibold mb-2">
                                DigiLocker Verification Link
                              </p>

                              <div className="bg-slate-50 dark:bg-muted p-2 rounded break-all text-[11px] mb-3 border border-slate-200 dark:border-[#2a2f3a]">
                                {documentData.digilockerUrl}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  className="px-3 py-1.5 text-xs border rounded-lg hover:bg-slate-50 dark:hover:bg-white/5"
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      documentData.digilockerUrl
                                    );
                                  }}
                                >
                                  Copy
                                </button>

                                <button
                                  className="px-3 py-1.5 text-xs border rounded-lg hover:bg-slate-50 dark:hover:bg-white/5"
                                  onClick={() => {
                                    window.open(
                                      documentData.digilockerUrl,
                                      "_blank",
                                      "width=500,height=700"
                                    );
                                  }}
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
                                  <strong>Care Of:</strong>{" "}
                                  {documentData.aadhaar.aadhaar_co}
                                </p>
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
                                <p>
                                  <strong>Landmark:</strong>{" "}
                                  {documentData.aadhaar.aadhaar_lm}
                                </p>

                                {documentData.aadhaar.aadhaar_photo_base64 && (
                                  <img
                                    src={`data:image/jpeg;base64,${documentData.aadhaar.aadhaar_photo_base64}`}
                                    alt="Aadhaar"
                                    className="w-24 h-auto mt-2 border rounded"
                                  />
                                )}
                              </>
                            )
                          )}
                        </div>
                      )}
                    </div>

                    <div className="col-span-12 md:col-span-3">
                      <Button
                        variant="primary"
                        size="default"
                        shape="pill"
                        onClick={verifiyAadhaar}
                        className="w-full h-8 text-[13px] rounded-lg"
                        disabled={varifiyDis1}
                      >
                        Verify
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label
                      htmlFor="AADHAR_CARD_VER"
                      className={toggleTileClass(!!formData.EmpMst?.AADHAR_CARD_VER)}
                      onClick={() => {
                        if (!isDisabled) {
                          handleInputChange(
                            "AADHAR_CARD_VER",
                            formData.EmpMst?.AADHAR_CARD_VER ? false : true
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
                              formData.EmpMst?.AADHAR_CARD_VER ? false : true
                            );
                          }
                        }}
                        disabled={isDisabled}
                      />
                      <span>Aadhaar verified</span>
                    </label>
                  </div>
                </>
              )}

              {aadhaarMode === "primary" && (
                <>
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-12 md:col-span-9 relative">
                      <Einput
                        type="text"
                        title="Aadhaar card no."
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
                          className="absolute right-3 top-9 text-slate-500 cursor-pointer"
                          onClick={async () => {
                            if (!aadhaarInfo) {
                              await existingAdharData();
                            }
                            setShowAadhaarTooltip(!showAadhaarTooltip);
                          }}
                        />
                      )}

                      {showAadhaarTooltip && aadhaarInfo && (
                        <div className="absolute top-14 left-0 w-80 p-3 bg-white border border-slate-200 dark:border-[#2a2f3a] shadow-lg text-xs rounded-lg z-50 dark:bg-input">
                          <p>
                            <strong>Name:</strong> {aadhaarInfo.name}
                          </p>
                          <p>
                            <strong>DOB:</strong> {aadhaarInfo.date_of_birth}
                          </p>
                          <p>
                            <strong>Gender:</strong> {aadhaarInfo.gender}
                          </p>
                          <p>
                            <strong>Care Of:</strong> {aadhaarInfo.care_of}
                          </p>
                          <p>
                            <strong>Address:</strong> {aadhaarInfo.full_address}
                          </p>
                          {aadhaarInfo.photo && (
                            <div className="mt-2">
                              <p className="font-semibold">Photo:</p>
                              <img
                                src={`data:image/jpeg;base64,${aadhaarInfo.photo}`}
                                alt="Aadhaar"
                                className="w-24 h-auto mt-1 border rounded"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="col-span-12 md:col-span-3">
                      <Button
                        variant="primary"
                        size="default"
                        shape="pill"
                        onClick={verifiyAadhaar}
                        className="w-full h-8 text-[13px] rounded-lg"
                        disabled={varifiyDis1}
                      >
                        Verify
                      </Button>
                    </div>

                    <div className="col-span-12 md:col-span-6">
                      <Einput
                        type="number"
                        ShortName={true}
                        title="OTP with Aadhaar"
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
                    </div>

                    <div className="col-span-12 md:col-span-6">
                      <label
                        htmlFor="AADHAR_CARD_VER"
                        className={toggleTileClass(!!formData.EmpMst?.AADHAR_CARD_VER)}
                        onClick={() => {
                          if (!isDisabled) {
                            handleInputChange(
                              "AADHAR_CARD_VER",
                              formData.EmpMst?.AADHAR_CARD_VER ? false : true
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
                                formData.EmpMst?.AADHAR_CARD_VER ? false : true
                              );
                            }
                          }}
                          disabled={isDisabled}
                        />
                        <span>Aadhaar verified</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* Linked with PAN card (kept as-is field, UI tile) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label
                  htmlFor="AADHAAR_LINKED_VER"
                  className={toggleTileClass(!!formData.EmpMst?.AADHAAR_LINKED_VER)}
                  onClick={() => {
                    if (!isDisabled) {
                      handleInputChange(
                        "AADHAAR_LINKED_VER",
                        formData.EmpMst?.AADHAAR_LINKED_PAN_VAR ? false : true
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
                          formData.EmpMst?.AADHAAR_LINKED_PAN_VAR ? false : true
                        );
                      }
                    }}
                    disabled={isDisabled}
                  />
                  <span>Linked with Pan Card</span>
                </label>
              </div>

              {/* Passport */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Einput
                  type="text"
                  title="Passport no."
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
                <label
                  htmlFor="PASSPORT_VER"
                  className={toggleTileClass(!!formData.EmpMst?.PASSPORT_VER)}
                  onClick={() =>
                    handleInputChange(
                      "PASSPORT_VER",
                      formData.EmpMst?.PASSPORT_VER ? false : true
                    )
                  }
                >
                  <Checkbox
                    checked={!!formData.EmpMst?.PASSPORT_VER}
                    name="PASSPORT_VER"
                    onChange={() =>
                      handleInputChange(
                        "PASSPORT_VER",
                        formData.EmpMst?.PASSPORT_VER ? false : true
                      )
                    }
                  />
                  <span>Passport doc. verified</span>
                </label>
              </div>

              {/* Driving License */}
              {compdata?.Digilocker_Linked === "1" ? (
                <>
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div
                      className={`col-span-12 relative ${
                        documentData?.driving_license?.uploaded?.[0]?.SMBPath
                          ? "md:col-span-7"
                          : "md:col-span-9"
                      }`}
                    >
                      <Einput
                        type="text"
                        title="Driving lic. no."
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
                          className="absolute right-3 top-9 text-slate-500 cursor-pointer"
                          onClick={() =>
                            setShowDrivingLicenseTooltip(
                              !showDrivingLicenseTooltip
                            )
                          }
                        />
                      )}

                      {showDrivingLicenseTooltip &&
                        documentData?.driving_license && (
                          <div className="absolute top-14 left-0 w-80 p-3 bg-white border border-slate-200 dark:border-[#2a2f3a] shadow-lg text-xs rounded-lg z-50 dark:bg-input">
                            <p>
                              <strong>Name:</strong>{" "}
                              {documentData.driving_license.person_name}
                            </p>
                            <p>
                              <strong>DOB:</strong>{" "}
                              {documentData.driving_license.person_dob}
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
                              <strong>Certificate Type:</strong>{" "}
                              {documentData.driving_license.certificate_type}
                            </p>
                            <p>
                              <strong>Issue Date:</strong>{" "}
                              {documentData.driving_license.issue_date}
                            </p>
                            <p>
                              <strong>Issued At:</strong>{" "}
                              {documentData.driving_license.issued_at}
                            </p>
                            <p>
                              <strong>Expiry Date:</strong>{" "}
                              {documentData.driving_license.expiry_date}
                            </p>
                          </div>
                        )}
                    </div>

                    {documentData?.driving_license?.uploaded[0]?.SMBPath && (
                      <div className="col-span-12 md:col-span-2">
                        <div className="h-10 flex items-end">
                          <FileViewer
                            fileLink={`https://erp.autovyn.com/backend/fetch?filePath=${documentData?.driving_license?.uploaded[0]?.SMBPath}`}
                          />
                        </div>
                      </div>
                    )}

                    <div className="col-span-12 md:col-span-3">
                      <Button
                         variant="primary"
                         size="default"
                         shape="pill"
                        onClick={verifiyDl}
                        className="w-full h-8 text-[13px] rounded-lg"
                        disabled={varifiyDis1}
                      >
                        Verify
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label
                      htmlFor="DRIVING_VER"
                      className={toggleTileClass(!!formData.EmpMst?.DRIVING_VER)}
                      onClick={() => {
                        if (!isDisabled) {
                          handleInputChange(
                            "DRIVING_VER",
                            formData.EmpMst?.DRIVING_VER ? false : true
                          );
                        }
                      }}
                    >
                      <Checkbox
                        checked={!!formData.EmpMst?.DRIVING_VER}
                        name="DRIVING_VER"
                        onChange={() => {
                          if (!isDisabled) {
                            handleInputChange(
                              "DRIVING_VER",
                              formData.EmpMst?.DRIVING_VER ? false : true
                            );
                          }
                        }}
                        disabled={isDisabled}
                      />
                      <span>Driving lic. verified</span>
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Einput
                      type="text"
                      title="Driving lic. no."
                      name="DRIVINGLIC_ISSUEPALACE"
                      id="DRIVINGLIC_ISSUEPALACE"
                      value={formData.EmpMst?.DRIVINGLIC_ISSUEPALACE}
                      handleInputChange={handleInputChange}
                      redlabel={isMandatory("DRIVINGLIC_ISSUEPALACE") ? "*" : ""}
                    />

                    <label
                      htmlFor="DRIVING_VER"
                      className={toggleTileClass(!!formData.EmpMst?.DRIVING_VER)}
                      onClick={() =>
                        handleInputChange(
                          "DRIVING_VER",
                          formData.EmpMst?.DRIVING_VER ? false : true
                        )
                      }
                    >
                      <Checkbox
                        checked={!!formData.EmpMst?.DRIVING_VER}
                        name="DRIVING_VER"
                        onChange={() =>
                          handleInputChange(
                            "DRIVING_VER",
                            formData.EmpMst?.DRIVING_VER ? false : true
                          )
                        }
                      />
                      <span>Driving lic. verified</span>
                    </label>
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative force-dropup">
                  <Eselect
                    option={DlvTypeOption}
                    title="Driving lic. type"
                    name="Dlv_Type"
                    initialValue={
                      formData.EmpMst.Dlv_Type
                        ? formData.EmpMst.Dlv_Type.toString()
                        : null
                    }
                    handleInputChange={handleInputChange}
                    redlabel={isMandatory("Dlv_Type") ? "*" : ""}
                  />
                </div>

                <Einput
                  type="date"
                  title="Driving lic. issue date"
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
            </div>
          </div>
        </div>
      </div>

      {/* ===================== dialogs (UNCHANGED) ===================== */}
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
                          <tr key={index} className="hover:bg-grey cursor-pointer">
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
                  This Employee Data Already Exists in Enquiry Databases with
                  Above Details, Kindly Check Before Proceeding.
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
                          <tr key={index} className="hover:bg-grey cursor-pointer">
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
                  This Employee Data Already Exists in Enquiry Databases with
                  Above Details, Kindly Check Before Proceeding.
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