"use client";

import React, { useState, useEffect, useMemo, useRef, ChangeEvent } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useSearchParams } from "next/navigation";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import {
  UserRound,
  Paperclip,
  Building2,
  Home,
  Building,
  ShieldCheck,
  UploadCloud,
  CreditCard,
  FileText,
  FileCheck,
  Banknote,
  RotateCcw,
  Save,
  Check,
  Eye,
  Trash2,
  ExternalLink,
  X,
  Send,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Atoms as requested by user
import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import ATextArea from "@/components/atoms/textArea";
import CertificatesUpload, { UploadItem, UploadValue } from "@/components/atoms/CertificateUpload";
import DocumentFileUpload from "@/components/atoms/Documentupload";
import HashloaderComponent from "@/components/Templates/hashloader";

type VerificationStatus = "Verified clear" | "In progress" | "Discrepancy";

type AttachmentItem = {
  imagePath: string;
  description: string;
  file?: File | null;
  misspunch_inout?: string | number | null;
};

const cardClass =
  "min-w-0 rounded-[12px] border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] transition-colors dark:border-[#1F2937] dark:bg-[#111827] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)]";

const inputClass =
  "!h-[38px] w-full min-w-0 !rounded-[9px] !border border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] px-2.5 py-2 !text-[12.5px] !text-[#1E293B] dark:!text-[#E7ECF3] outline-none transition placeholder:text-[#64748B]/70 dark:placeholder:text-[#94A3B8]/70 focus-visible:!border-[#4F46E5] dark:focus-visible:!border-[#8B84FF] focus-visible:!ring-0 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-800/50 !shadow-none";

const DOCUMENT_DEFINITIONS = [
  { id: "aadhar", title: "Aadhar card", icon: CreditCard },
  { id: "pan", title: "PAN card", icon: CreditCard },
  { id: "address", title: "Address proof", icon: Home },
  { id: "exp", title: "Experience letter", icon: FileCheck },
  { id: "salary", title: "Salary slip", icon: Banknote },
  { id: "police", title: "Police clearance", icon: ShieldCheck },
];

const yesNoOptions = [
  { value: "0", label: "Yes" },
  { value: "1", label: "No" },
];

export default function EmployeeReferenceCheckPage() {
  const user = useCurrentUser() as any;
  const searchParams = useSearchParams();
  const UTD = searchParams.get("UTD");

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<number>(1);

  // Dropdown states
  const [cityOptions, setCityOptions] = useState<{ value: string; label: string }[]>([]);
  const [stateOptions, setStateOptions] = useState<{ value: string; label: string }[]>([]);

  // Preview Modal State
  const [previewFile, setPreviewFile] = useState<{ url: string; title: string; type: "image" | "pdf" | "unknown" } | null>(null);

  // Candidate Profile Photo
  const [candidatePhoto, setCandidatePhoto] = useState<File | null>(null);
  const [candidatePhotoUrl, setCandidatePhotoUrl] = useState<string>("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Status pills
  const [employerStatus, setEmployerStatus] = useState<VerificationStatus>("Verified clear");
  const [landlordStatus, setLandlordStatus] = useState<VerificationStatus>("Verified clear");
  const [requestingStatus, setRequestingStatus] = useState<VerificationStatus>("Verified clear");
  const [policeStatus, setPoliceStatus] = useState<VerificationStatus>("In progress");

  // Police verification certificates (CertificatesUpload atom)
  const [policeCertificates, setPoliceCertificates] = useState<UploadValue>({});

  const policeDocItems: UploadItem[] = useMemo(
    () => [
      { name: "doc_0", title: "Police Clearance Certificate (PCC)", subtitle: "Official PCC · PDF/JPG", icon: <ShieldCheck size={18} /> },
      { name: "doc_1", title: "Criminal Record / FIR Clearance", subtitle: "Clearance report · PDF/JPG", icon: <FileCheck size={18} /> },
      { name: "doc_2", title: "Station Beat Officer Report", subtitle: "Station report · PDF/JPG", icon: <Building2 size={18} /> },
      { name: "doc_3", title: "Character Certificate / NOC", subtitle: "Official NOC · PDF/JPG", icon: <FileText size={18} /> },
      { name: "doc_4", title: "Address / Resident Verification", subtitle: "Local verification · PDF/JPG", icon: <Home size={18} /> },
      { name: "doc_5", title: "Additional Clearance / ID Document", subtitle: "Clearance document · PDF/JPG", icon: <CreditCard size={18} /> },
    ],
    []
  );

  // Main Form Data with all fields from Reference_Check_Form
  const [formData, setFormData] = useState({
    // 1. Candidate Personal Information (11 fields)
    CandidateName: "",
    Date_Of_Request: new Date().toISOString().split("T")[0],
    MobileNo: "",
    Email: "",
    AadharNo: "",
    PanCard: "",
    City: "",
    State: "",
    DOB: "",
    PositionAppliedFor: "",
    CandidateAddress: "",
    CandidateImage: "",

    // 2. Previous Employer (all fields from Reference_Check_Form/EmpPrevious)
    PreviousCompanyName: "",
    PreviousContactName: "",
    ReferenceMobileNo: "",
    ReferenceEmail: "",
    Date_Of_Reference: "",
    EmployeeStartDate: "",
    EmployeeEndDate: "",
    PreviousPosition: "",
    PreviousSalary: "",
    ReasonForSeperation: "",
    SeperationVoluntary: "",
    EligileForRehire: "",
    LengthTimeKnown: "",
    PreviousAddress: "",
    RelationToCandidate: "",
    Strength: "",
    Weakness: "",
    Skills: "",
    Issues: "", // Verifier's notes for employer

    // 3. Landlord (all fields from Reference_Check_Form/Landlord)
    LandloardName: "",
    LandlordMobileNo: "",
    LandlordEmail: "",
    MoveInDate: "",
    MoveOutDate: "",
    MonthlyRent: "",
    LandlordAddress: "",
    DidCandidate_make_Timely_Payement: "",
    Candidate_Complaint: "",
    DidCandidate_give_Proper_Notice: "",
    LandlordIssues: "", // Verifier's notes for landlord

    // 4. Requesting Party (all fields from Reference_Check_Form/RequestingParty)
    NewCompanyName: "",
    NewCompanyContactName: "",
    NewCompanyMobileNo: "",
    NewCompanyEmail: "",
    NewCompanyAddress: "",

    // 5. Police Verification (all fields from Reference_Check_Form/Police)
    Verication_Status: "1", // 0: Yes, 1: No
    Receipt_Date: "",
    Receipt_No: "",
    Agency_Remark: "", // Verifier's notes / Agency remarks
    Verification_Documents: [] as string[],

    // Attachments
    Attachments: Array(6).fill({ imagePath: "", description: "" }) as AttachmentItem[],

    Created_By: user?.name || "",
    Loc_code: user?.branch || "",
  });

  // Descriptions for 6 documents
  const [docDescriptions, setDocDescriptions] = useState<string[]>(Array(6).fill(""));
  const docInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const showSideAlert = (message: string, type: "success" | "warning" | "error" | "info" = "info") => {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: type,
      title: message,
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
  };

  const validateEmail = (value: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(value);
  };

  // Fetch initial dropdowns
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/quotation/dropdown`,
          { loc_code: user?.branch },
          {
            headers: { compcode: user?.Comp_Code, name: user?.name },
          }
        );
        const districts = result.data?.data?.district || [];
        const states = result.data?.data?.state || [];

        setCityOptions(
          districts.map((item: any) => ({
            value: item.value ?? item.label ?? item,
            label: String(item.label ?? item.value ?? item),
          }))
        );
        setStateOptions(
          states.map((item: any) => ({
            value: item.value ?? item.label ?? item,
            label: String(item.label ?? item.value ?? item),
          }))
        );
      } catch (err) {
        console.error("Dropdown fetch error:", err);
      }
    };

    fetchDropdowns();
  }, [user?.Comp_Code, user?.name, user?.branch]);

  // Fetch existing candidate data if UTD present
  useEffect(() => {
    const fetchData = async () => {
      if (!UTD) return;
      setIsLoading(true);
      try {
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/EmployeeReferenceDetails/setData`,
          { UTD },
          {
            headers: { compcode: user?.Comp_Code, name: user?.name },
          }
        );

        const data = result?.data?.MstData;
        if (!data) return;

        const rawAttachments = result?.data?.res1 || [];
        const formattedAttachments: AttachmentItem[] = Array(6)
          .fill(null)
          .map((_, idx) => ({
            imagePath: rawAttachments[idx]?.imagePath || "",
            description: rawAttachments[idx]?.description || "",
            misspunch_inout: rawAttachments[idx]?.misspunch_inout ?? null,
          }));

        setDocDescriptions(formattedAttachments.map((a) => a.description || ""));

        let verificationDocs: string[] = [];
        if (data.Verification_Documents) {
          try {
            const parsed =
              typeof data.Verification_Documents === "string"
                ? JSON.parse(data.Verification_Documents)
                : data.Verification_Documents;
            if (Array.isArray(parsed)) {
              verificationDocs = parsed;
              const certs: UploadValue = {};
              const keys = ["doc_0", "doc_1", "doc_2", "doc_3", "doc_4", "doc_5"];
              parsed.forEach((docPath: string, idx: number) => {
                if (docPath && keys[idx]) {
                  certs[keys[idx]] = docPath;
                }
              });
              setPoliceCertificates(certs);
            }
          } catch {
            verificationDocs = [];
          }
        }

        setFormData((prev) => ({
          ...prev,
          ...data,
          Date_Of_Request: data.Date_Of_Request ? data.Date_Of_Request.split("T")[0] : prev.Date_Of_Request,
          DOB: data.DOB ? data.DOB.split("T")[0] : "",
          Date_Of_Reference: data.Date_Of_Reference ? data.Date_Of_Reference.split("T")[0] : "",
          EmployeeStartDate: data.EmployeeStartDate ? data.EmployeeStartDate.split("T")[0] : "",
          EmployeeEndDate: data.EmployeeEndDate ? data.EmployeeEndDate.split("T")[0] : "",
          MoveInDate: data.MoveInDate ? data.MoveInDate.split("T")[0] : "",
          MoveOutDate: data.MoveOutDate ? data.MoveOutDate.split("T")[0] : "",
          Receipt_Date: data.Receipt_Date ? data.Receipt_Date.split("T")[0] : "",
          Attachments: formattedAttachments,
          Verification_Documents: verificationDocs,
        }));

        if (data.CandidateImage) {
          setCandidatePhotoUrl(data.CandidateImage);
        }
      } catch (err) {
        console.error("Error fetching candidate reference data:", err);
        showSideAlert("Failed to load candidate reference check data", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [UTD, user?.Comp_Code, user?.name]);

  const handleInputChange = (name: string, value: any) => {
    let cleanVal = value;
    if (name === "AadharNo") {
      cleanVal = String(value).replace(/\D/g, "").slice(0, 12);
    }
    if (name === "MobileNo" || name === "ReferenceMobileNo" || name === "LandlordMobileNo" || name === "NewCompanyMobileNo") {
      cleanVal = String(value).replace(/\D/g, "").slice(0, 10);
    }
    if (name === "PanCard") {
      cleanVal = String(value).replace(/[^A-Za-z0-9]/g, "").slice(0, 10).toUpperCase();
    }

    setFormData((prev) => ({
      ...prev,
      [name]: cleanVal,
    }));
  };

  // Upload photo handler
  const handlePhotoSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["jpg", "jpeg", "png", "gif", "webp", "avif"];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !allowed.includes(ext)) {
      showSideAlert("Only image files are allowed", "warning");
      return;
    }

    setCandidatePhoto(file);
    const localUrl = URL.createObjectURL(file);
    setCandidatePhotoUrl(localUrl);

    try {
      const fd = new FormData();
      fd.append("name", user?.name || "");
      fd.append("Image", file);
      if (UTD) fd.append("UTD", UTD);

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmployeeReferenceDetails/uploadedImage`,
        fd,
        {
          headers: { compcode: user?.Comp_Code, name: user?.name },
        }
      );
      if (res.data) {
        setFormData((prev) => ({ ...prev, CandidateImage: res.data }));
      }
    } catch (err) {
      console.error("Error uploading candidate photo:", err);
    }
  };

  // Upload document handler
  const handleDocFileSelect = async (file: File | null, index: number) => {
    if (!file) return;

    // Immediately update local file in state so preview is instantly available
    const initialWithFile = [...formData.Attachments];
    initialWithFile[index] = {
      imagePath: initialWithFile[index]?.imagePath || "",
      description: docDescriptions[index] || "",
      file,
    };
    setFormData((prev) => ({
      ...prev,
      Attachments: initialWithFile,
    }));

    try {
      const fd = new FormData();
      if (UTD) fd.append("UTD", UTD);
      fd.append("name", user?.name || "");
      fd.append("Image", file);

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmployeeReferenceDetails/uploadedImage`,
        fd,
        {
          headers: { compcode: user?.Comp_Code, name: user?.name },
        }
      );

      const uploadedPath = res.data;
      const updated = [...formData.Attachments];
      updated[index] = {
        imagePath: uploadedPath,
        description: docDescriptions[index] || "",
        file,
      };

      setFormData((prev) => ({
        ...prev,
        Attachments: updated,
      }));

      showSideAlert(`${DOCUMENT_DEFINITIONS[index].title} uploaded successfully`, "success");
    } catch (err) {
      console.error("Error uploading document:", err);
      showSideAlert("Failed to upload document", "error");
    }
  };

  const handleDocDescriptionChange = (index: number, val: string) => {
    setDocDescriptions((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });

    setFormData((prev) => {
      const updated = [...prev.Attachments];
      if (updated[index]) {
        updated[index] = { ...updated[index], description: val };
      }
      return { ...prev, Attachments: updated };
    });
  };

  const handleRemoveDoc = (index: number) => {
    const updated = [...formData.Attachments];
    updated[index] = { imagePath: "", description: "" };
    setFormData((prev) => ({ ...prev, Attachments: updated }));
    if (docInputRefs.current[index]) {
      docInputRefs.current[index]!.value = "";
    }
  };

  const handlePoliceCertificatesChange = async (nextVal: UploadValue) => {
    setPoliceCertificates(nextVal);
    const keys = ["doc_0", "doc_1", "doc_2", "doc_3", "doc_4", "doc_5"];
    const updatedDocs = [...(formData.Verification_Documents || [])];

    for (let idx = 0; idx < keys.length; idx++) {
      const key = keys[idx];
      const val = nextVal[key];
      if (val instanceof File) {
        try {
          const formdata1 = new FormData();
          formdata1.append("name", user?.name || "");
          formdata1.append("Image", val);
          if (UTD) formdata1.append("UTD", UTD);

          const result = await axios.post(
            `${process.env.NEXT_PUBLIC_URL}/EmployeeReferenceDetails/uploadedImage`,
            formdata1,
            {
              headers: {
                compcode: user?.Comp_Code,
                name: user?.name,
                token: user?.email,
              },
            }
          );
          if (result.data) {
            updatedDocs[idx] = result.data;
          }
        } catch (e) {
          console.error("Error uploading police doc:", e);
        }
      } else if (typeof val === "string") {
        updatedDocs[idx] = val;
      } else if (!val) {
        updatedDocs[idx] = "";
      }
    }

    setFormData((prev) => ({
      ...prev,
      Verification_Documents: updatedDocs,
    }));
  };

  const openPreview = (fileOrUrl: any, title: string) => {
    if (!fileOrUrl) return;

    let fullUrl = "";
    let isPdf = false;

    if (fileOrUrl instanceof File) {
      isPdf =
        fileOrUrl.type === "application/pdf" ||
        fileOrUrl.name.toLowerCase().endsWith(".pdf");
      fullUrl = URL.createObjectURL(fileOrUrl);
    } else if (typeof fileOrUrl === "string") {
      isPdf = fileOrUrl.toLowerCase().endsWith(".pdf");
      fullUrl =
        fileOrUrl.startsWith("http://") ||
        fileOrUrl.startsWith("https://") ||
        fileOrUrl.startsWith("blob:") ||
        fileOrUrl.startsWith("data:")
          ? fileOrUrl
          : `${process.env.NEXT_PUBLIC_URL}/${fileOrUrl.replace(/^\/+/, "")}`;
    }

    setPreviewFile({
      url: fullUrl,
      title,
      type: isPdf ? "pdf" : "image",
    });
  };

  // Dynamic counter calculations
  const candidateFields = [
    formData.CandidateName,
    formData.Date_Of_Request,
    formData.MobileNo,
    formData.Email,
    formData.AadharNo,
    formData.PanCard,
    formData.City,
    formData.State,
    formData.DOB,
    formData.PositionAppliedFor,
    formData.CandidateAddress,
  ];
  const filledCandidateCount = candidateFields.filter((f) => f && String(f).trim().length > 0).length;
  const attachedDocsCount = formData.Attachments.filter((a) => a && a.imagePath && a.imagePath.trim().length > 0).length;

  // Validation matching Reference_Check_Form logic & warnings
  const validateCandidateForm = () => {
    if (!formData?.CandidateName) {
      showSideAlert("Please Enter Candidate Name", "info");
      return false;
    }

    if (!formData?.Date_Of_Request) {
      showSideAlert("Please Select Date Of Request", "info");
      return false;
    }

    if (!formData?.MobileNo) {
      showSideAlert("Please Enter Mobile No.", "info");
      return false;
    }

    if (!formData?.Email) {
      showSideAlert("Please Enter Email", "info");
      return false;
    }

    if (!validateEmail(formData?.Email)) {
      showSideAlert("Email is invalid or contains restricted characters", "warning");
      return false;
    }

    if (!formData?.AadharNo) {
      showSideAlert("Please Enter AadharNo", "info");
      return false;
    }

    if (!formData?.PanCard) {
      showSideAlert("Please Enter PanCard No", "info");
      return false;
    }

    if (!formData?.City) {
      showSideAlert("Please Select Your City ", "info");
      return false;
    }

    if (!formData?.State) {
      showSideAlert("Please Select Your State ", "info");
      return false;
    }

    if (!formData?.DOB) {
      showSideAlert("Please Select Your DOB ", "info");
      return false;
    }

    if (!formData?.PositionAppliedFor) {
      showSideAlert("Please Enter Position Applied For", "info");
      return false;
    }

    if (!formData?.CandidateAddress) {
      showSideAlert("Please Enter Address", "info");
      return false;
    }

    if (UTD) {
      if (!formData?.CandidateImage && !candidatePhotoUrl && !candidatePhoto) {
        showSideAlert("Please add an image", "info");
        return false;
      }
    } else {
      if (!candidatePhoto && !candidatePhotoUrl && !formData?.CandidateImage) {
        showSideAlert("Please add an Profile image", "info");
        return false;
      }
    }

    if (!formData?.ReferenceEmail) {
      showSideAlert("Fill the Email input with the Email in the 'Emp Previous Reference Check' tab,", "info");
      return false;
    }

    if (!validateEmail(formData?.ReferenceEmail)) {
      showSideAlert("Email is invalid or contains restricted characters", "warning");
      return false;
    }

    if (!formData?.LandlordEmail) {
      showSideAlert("Fill the Email input with the Email in the 'Landlord Reference Check' tab,", "info");
      return false;
    }

    if (!validateEmail(formData?.LandlordEmail)) {
      showSideAlert("Email is invalid or contains restricted characters", "warning");
      return false;
    }

    return true;
  };

  // Save / Update Handler matching Reference_Check_Form
  const handleSave = async () => {
    if (!validateCandidateForm()) return;

    setIsLoading(true);
    try {
      let candidateImgPath = formData.CandidateImage;
      if (candidatePhoto) {
        const fileExtension = candidatePhoto.name.split(".").pop()?.toLowerCase();
        const allowedExtensions = ["jpg", "jpeg", "png", "gif", "jfif", "tiff", "tif", "bmp", "webp", "avif"];
        if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
          showSideAlert("Only Images are allowed", "info");
          setIsLoading(false);
          return;
        }

        const formdata2 = new FormData();
        formdata2.append("name", user?.name || "");
        formdata2.append("Image", candidatePhoto);
        if (UTD) formdata2.append("UTD", UTD);

        const imageResult = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/EmployeeReferenceDetails/uploadedImage`,
          formdata2,
          {
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
            },
          }
        );
        candidateImgPath = imageResult.data;
        setFormData((prev) => ({ ...prev, CandidateImage: candidateImgPath }));
      }

      // Filter attachments so only uploaded documents with valid imagePath are sent (avoids backend empty imagePath error)
      const cleanAttachments = (formData.Attachments || [])
        .filter((att) => att && att.imagePath && att.imagePath.trim() !== "")
        .map((att) => ({
          imagePath: att.imagePath,
          description: att.description || "",
        }));

      // Filter verification documents
      const cleanVerificationDocs = (formData.Verification_Documents || []).filter(
        (doc: any) => doc && typeof doc === "string" && doc.trim() !== ""
      );

      // Sanitize fields: convert empty strings to null so SQL Server does not fail on date/int/bit conversion
      const sanitize = (val: any) => {
        if (val === "" || val === undefined) return null;
        return val;
      };

      const payload = {
        CandidateName: sanitize(formData.CandidateName),
        Date_Of_Request: sanitize(formData.Date_Of_Request),
        CandidateAddress: sanitize(formData.CandidateAddress),
        MobileNo: sanitize(formData.MobileNo),
        Email: sanitize(formData.Email),
        AadharNo: sanitize(formData.AadharNo),
        PanCard: sanitize(formData.PanCard),
        City: sanitize(formData.City),
        State: sanitize(formData.State),
        DOB: sanitize(formData.DOB),
        CandidateImage: candidateImgPath || sanitize(formData.CandidateImage),
        PositionAppliedFor: sanitize(formData.PositionAppliedFor),

        PreviousCompanyName: sanitize(formData.PreviousCompanyName),
        PreviousContactName: sanitize(formData.PreviousContactName),
        ReferenceMobileNo: sanitize(formData.ReferenceMobileNo),
        ReferenceEmail: sanitize(formData.ReferenceEmail),
        Date_Of_Reference: sanitize(formData.Date_Of_Reference),
        EmployeeStartDate: sanitize(formData.EmployeeStartDate),
        EmployeeEndDate: sanitize(formData.EmployeeEndDate),
        PreviousPosition: sanitize(formData.PreviousPosition),
        PreviousSalary: sanitize(formData.PreviousSalary),
        ReasonForSeperation: sanitize(formData.ReasonForSeperation),
        SeperationVoluntary: sanitize(formData.SeperationVoluntary),
        EligileForRehire: sanitize(formData.EligileForRehire),
        LengthTimeKnown: sanitize(formData.LengthTimeKnown),
        PreviousAddress: sanitize(formData.PreviousAddress),
        RelationToCandidate: sanitize(formData.RelationToCandidate),
        Strength: sanitize(formData.Strength),
        Weakness: sanitize(formData.Weakness),
        Skills: sanitize(formData.Skills),
        Issues: sanitize(formData.Issues),

        LandloardName: sanitize(formData.LandloardName),
        LandlordMobileNo: sanitize(formData.LandlordMobileNo),
        LandlordEmail: sanitize(formData.LandlordEmail),
        MoveInDate: sanitize(formData.MoveInDate),
        MoveOutDate: sanitize(formData.MoveOutDate),
        MonthlyRent: sanitize(formData.MonthlyRent),
        LandlordAddress: sanitize(formData.LandlordAddress),
        DidCandidate_make_Timely_Payement: sanitize(formData.DidCandidate_make_Timely_Payement),
        Candidate_Complaint: sanitize(formData.Candidate_Complaint),
        DidCandidate_give_Proper_Notice: sanitize(formData.DidCandidate_give_Proper_Notice),
        LandlordIssues: sanitize(formData.LandlordIssues),

        NewCompanyName: sanitize(formData.NewCompanyName),
        NewCompanyContactName: sanitize(formData.NewCompanyContactName),
        NewCompanyMobileNo: sanitize(formData.NewCompanyMobileNo),
        NewCompanyEmail: sanitize(formData.NewCompanyEmail),
        NewCompanyAddress: sanitize(formData.NewCompanyAddress),

        Verication_Status: sanitize(formData.Verication_Status),
        Receipt_Date: sanitize(formData.Receipt_Date),
        Receipt_No: sanitize(formData.Receipt_No),
        Agency_Remark: sanitize(formData.Agency_Remark),
        Verification_Documents: cleanVerificationDocs,
        Attachments: cleanAttachments,
        Created_By: user?.name || null,
        Loc_code: user?.branch || null,
      };

      if (UTD) {
        // UPDATE
        await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/EmployeeReferenceDetails/UpdateData`,
          {
            ...payload,
            UTD,
          },
          {
            headers: { compcode: user?.Comp_Code, name: user?.name },
          }
        );

        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Data Update successfully.",
        });
      } else {
        // INSERT
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/EmployeeReferenceDetails/InsertData`,
          payload,
          {
            headers: { compcode: user?.Comp_Code, name: user?.name },
          }
        );

        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Data Save successfully.",
        });

        // Reset
        handleRefresh();
      }
    } catch (error: any) {
      const errMsg =
        error.response?.data?.Message ||
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Error saving data";
      Swal.fire({
        icon: "error",
        title: `${errMsg}`,
      });
      console.error("Error saving data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setFormData({
      CandidateName: "",
      Date_Of_Request: new Date().toISOString().split("T")[0],
      MobileNo: "",
      Email: "",
      AadharNo: "",
      PanCard: "",
      City: "",
      State: "",
      DOB: "",
      PositionAppliedFor: "",
      CandidateAddress: "",
      CandidateImage: "",
      PreviousCompanyName: "",
      PreviousContactName: "",
      ReferenceMobileNo: "",
      ReferenceEmail: "",
      Date_Of_Reference: "",
      EmployeeStartDate: "",
      EmployeeEndDate: "",
      PreviousPosition: "",
      PreviousSalary: "",
      ReasonForSeperation: "",
      SeperationVoluntary: "",
      EligileForRehire: "",
      LengthTimeKnown: "",
      PreviousAddress: "",
      RelationToCandidate: "",
      Strength: "",
      Weakness: "",
      Skills: "",
      Issues: "",
      LandloardName: "",
      LandlordMobileNo: "",
      LandlordEmail: "",
      MoveInDate: "",
      MoveOutDate: "",
      MonthlyRent: "",
      LandlordAddress: "",
      DidCandidate_make_Timely_Payement: "",
      Candidate_Complaint: "",
      DidCandidate_give_Proper_Notice: "",
      LandlordIssues: "",
      NewCompanyName: "",
      NewCompanyContactName: "",
      NewCompanyMobileNo: "",
      NewCompanyEmail: "",
      NewCompanyAddress: "",
      Verication_Status: "1",
      Receipt_Date: "",
      Receipt_No: "",
      Agency_Remark: "",
      Verification_Documents: [],
      Attachments: Array(6).fill({ imagePath: "", description: "" }),
      Created_By: user?.name || "",
      Loc_code: user?.branch || "",
    });
    setCandidatePhoto(null);
    setCandidatePhotoUrl("");
    setDocDescriptions(Array(6).fill(""));
    setPoliceCertificates({});
    setActiveTab(1);
  };

  // Email triggers for existing records
  const handleSendEmployerEmail = async () => {
    if (!UTD) return;
    if (!formData.ReferenceEmail && !formData.Email) {
      showSideAlert("Please provide a valid email in Previous Employer reference", "warning");
      return;
    }
    setIsLoading(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmployeeReferenceDetails/EmpReferenceEmail`,
        { UTD },
        { headers: { compcode: user?.Comp_Code, name: user?.name } }
      );
      showSideAlert("Employer verification email sent successfully", "success");
    } catch {
      showSideAlert("Failed to send email", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendLandlordEmail = async () => {
    if (!UTD) return;
    if (!formData.LandlordEmail) {
      showSideAlert("Please enter Landlord Email address", "warning");
      return;
    }
    setIsLoading(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmployeeReferenceDetails/EmpLandlordEmail`,
        { UTD },
        { headers: { compcode: user?.Comp_Code, name: user?.name } }
      );
      showSideAlert("Landlord verification email sent successfully", "success");
    } catch {
      showSideAlert("Failed to send email", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendRequestingEmail = async () => {
    if (!UTD) return;
    setIsLoading(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmployeeReferenceDetails/EmpRequestingEmail`,
        { UTD },
        { headers: { compcode: user?.Comp_Code, name: user?.name } }
      );
      showSideAlert("Requesting party notification email sent successfully", "success");
    } catch {
      showSideAlert("Failed to send email", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Status Pill renderer
  const renderStatusPills = (
    current: VerificationStatus,
    setter: (s: VerificationStatus) => void
  ) => {
    const statuses: VerificationStatus[] = ["Verified clear", "In progress", "Discrepancy"];
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        {statuses.map((st) => {
          const isSelected = current === st;
          let activeStyles = "";
          if (isSelected) {
            if (st === "Verified clear") {
              activeStyles = "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
            } else if (st === "In progress") {
              activeStyles = "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
            } else {
              activeStyles = "border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
            }
          } else {
            activeStyles = "border-slate-200 text-slate-500 bg-white dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800";
          }

          return (
            <button
              key={st}
              type="button"
              onClick={() => setter(st)}
              className={cn(
                "rounded-full border px-3 py-1 text-[11.5px] font-medium transition cursor-pointer select-none",
                activeStyles
              )}
            >
              {st}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-28 font-['Inter',system-ui,sans-serif] text-[13px] text-[#1E293B] antialiased transition-colors dark:bg-[#0A0F1C] dark:text-[#E7ECF3]">
      <div className="mx-auto max-w-[1700px] p-4 sm:p-6 space-y-4">
        {/* Page Header */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
              Candidate reference check
            </h1>
            <p className="mt-1 text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
              Background verification before joining — previous employer, landlord, requesting party and police record.
            </p>
          </div>
          <AButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.history.back()}
            icon={<ArrowLeft className="h-3.5 w-3.5" />}
            className="!h-[36px] px-3.5 !rounded-[9px] text-[12.5px] font-medium"
          >
            Back
          </AButton>
        </header>

        {/* Top Card: Candidate Personal Information */}
        <section className={`${cardClass} p-4 sm:p-[18px]`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF]">
                <UserRound className="h-4 w-4" />
              </span>
              <h2 className="text-[14px] font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                Candidate personal information
              </h2>
            </div>
            <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] font-medium">
              {filledCandidateCount} / 11 fields
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_160px] gap-4 items-stretch">
            {/* 11 Fields Grid */}
            <div className="space-y-3.5">
              {/* Row 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                <Einput
                  title="CANDIDATE NAME"
                  ShortName
                  redlabel=" *"
                  name="CandidateName"
                  type="text"
                  placeholder="Full name as per Aadhar"
                  value={formData.CandidateName}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <Einput
                  title="DATE OF REQUEST"
                  ShortName
                  redlabel=" *"
                  name="Date_Of_Request"
                  type="date"
                  value={formData.Date_Of_Request}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <Einput
                  title="MOBILE NUMBER"
                  ShortName
                  redlabel=" *"
                  name="MobileNo"
                  type="text"
                  placeholder="10-digit mobile"
                  value={formData.MobileNo}
                  handleInputChange={handleInputChange}
                  maxLength={10}
                  className={inputClass}
                />
                <Einput
                  title="EMAIL"
                  ShortName
                  redlabel=" *"
                  name="Email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.Email}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                <Einput
                  title="AADHAR NO."
                  ShortName
                  redlabel=" *"
                  name="AadharNo"
                  type="text"
                  placeholder="12 digits"
                  value={formData.AadharNo}
                  handleInputChange={handleInputChange}
                  maxLength={12}
                  className={inputClass}
                />
                <Einput
                  title="PAN CARD NO."
                  ShortName
                  redlabel=" *"
                  name="PanCard"
                  type="text"
                  placeholder="ABCDE1234F"
                  value={formData.PanCard}
                  handleInputChange={handleInputChange}
                  maxLength={10}
                  className={inputClass}
                />
                <Eselect
                  title="CITY"
                  ShortName
                  redlabel=" *"
                  name="City"
                  option={cityOptions}
                  initialValue={formData.City}
                  handleInputChange={handleInputChange}
                  placeholder="Select city"
                  className={inputClass}
                />
                <Eselect
                  title="STATE"
                  ShortName
                  redlabel=" *"
                  name="State"
                  option={stateOptions}
                  initialValue={formData.State}
                  handleInputChange={handleInputChange}
                  placeholder="Select state"
                  className={inputClass}
                />
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                <Einput
                  title="DOB"
                  ShortName
                  redlabel=" *"
                  name="DOB"
                  type="date"
                  value={formData.DOB}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <Einput
                  title="POSITION APPLIED FOR"
                  ShortName
                  redlabel=" *"
                  name="PositionAppliedFor"
                  type="text"
                  placeholder="Designation"
                  value={formData.PositionAppliedFor}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <div className="sm:col-span-2">
                  <Einput
                    title="ADDRESS"
                    ShortName
                    redlabel=" *"
                    name="CandidateAddress"
                    type="text"
                    placeholder="House, street, area"
                    value={formData.CandidateAddress}
                    handleInputChange={handleInputChange}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Photo Upload Box (Right side) */}
            <div className="flex flex-col justify-center">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <div
                onClick={() => photoInputRef.current?.click()}
                className="group relative flex h-full min-h-[160px] w-full cursor-pointer flex-col items-center justify-center rounded-[11px] border border-dashed border-slate-300 bg-slate-50/50 p-3 text-center transition hover:border-[#4F46E5] hover:bg-indigo-50/20 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-indigo-400"
              >
                {candidatePhotoUrl ? (
                  <div className="relative h-full w-full">
                    <img
                      src={
                        candidatePhotoUrl.startsWith("http") || candidatePhotoUrl.startsWith("blob:")
                          ? candidatePhotoUrl
                          : `${process.env.NEXT_PUBLIC_URL}/${candidatePhotoUrl.replace(/^\/+/, "")}`
                      }
                      alt="Candidate"
                      className="h-full w-full rounded-[8px] object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center rounded-[8px] bg-black/40 opacity-0 transition group-hover:opacity-100">
                      <span className="text-[11px] font-medium text-white">Change photo</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm transition group-hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-500">
                      <UploadCloud className="h-5 w-5" />
                    </span>
                    <span className="mt-2 text-[12px] font-medium text-slate-700 dark:text-slate-300">
                      Upload photo
                    </span>
                    <span className="mt-0.5 text-[10px] text-slate-400">
                      PNG, JPG up to 5MB
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Middle: Segmented Tabs Bar */}
        <nav className="flex items-center justify-start overflow-x-auto rounded-[12px] border border-slate-200/90 bg-white p-1.5 shadow-2xs dark:border-slate-800 dark:bg-[#111827]">
          <div className="flex items-center gap-1.5 min-w-max">
            {/* Tab 1: Documents */}
            <button
              type="button"
              onClick={() => setActiveTab(1)}
              className={cn(
                "inline-flex items-center gap-2 rounded-[9px] px-4 py-2 text-[12.5px] font-semibold transition cursor-pointer select-none",
                activeTab === 1
                  ? "bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF] shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              )}
            >
              <Paperclip className="h-4 w-4" />
              <span>Documents</span>
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
            </button>

            {/* Tab 2: Previous employer */}
            <button
              type="button"
              onClick={() => setActiveTab(2)}
              className={cn(
                "inline-flex items-center gap-2 rounded-[9px] px-4 py-2 text-[12.5px] font-semibold transition cursor-pointer select-none",
                activeTab === 2
                  ? "bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF] shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              )}
            >
              <Building2 className="h-4 w-4" />
              <span>Previous employer</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </button>

            {/* Tab 3: Landlord */}
            <button
              type="button"
              onClick={() => setActiveTab(3)}
              className={cn(
                "inline-flex items-center gap-2 rounded-[9px] px-4 py-2 text-[12.5px] font-semibold transition cursor-pointer select-none",
                activeTab === 3
                  ? "bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF] shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              )}
            >
              <Home className="h-4 w-4" />
              <span>Landlord</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </button>

            {/* Tab 4: Requesting party */}
            <button
              type="button"
              onClick={() => setActiveTab(4)}
              className={cn(
                "inline-flex items-center gap-2 rounded-[9px] px-4 py-2 text-[12.5px] font-semibold transition cursor-pointer select-none",
                activeTab === 4
                  ? "bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF] shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              )}
            >
              <Building className="h-4 w-4" />
              <span>Requesting party</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </button>

            {/* Tab 5: Police verification */}
            <button
              type="button"
              onClick={() => setActiveTab(5)}
              className={cn(
                "inline-flex items-center gap-2 rounded-[9px] px-4 py-2 text-[12.5px] font-semibold transition cursor-pointer select-none",
                activeTab === 5
                  ? "bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF] shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Police verification</span>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            </button>
          </div>
        </nav>

        {/* Tab 1: Documents Upload */}
        {activeTab === 1 && (
          <section className={`${cardClass} p-4 sm:p-[18px]`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF]">
                  <Paperclip className="h-4 w-4" />
                </span>
                <h2 className="text-[14px] font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                  Documents upload
                </h2>
              </div>
              <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] font-medium">
                {attachedDocsCount} of 6 attached
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DOCUMENT_DEFINITIONS.map((doc, idx) => {
                const IconComp = doc.icon;
                const attachment = formData.Attachments[idx];
                const hasFile = Boolean(attachment?.imagePath);

                return (
                  <div key={doc.id} className="space-y-2">
                    <DocumentFileUpload
                      variant="card"
                      title={doc.title}
                      icon={<IconComp className="h-4 w-4" />}
                      file={attachment?.file || attachment?.imagePath || null}
                      onChange={(file) => handleDocFileSelect(file, idx)}
                      onPreview={() => {
                        const target = attachment?.file || attachment?.imagePath;
                        if (target) {
                          openPreview(target, doc.title);
                        }
                      }}
                      onRemove={() => handleRemoveDoc(idx)}
                      accept=".pdf,.png,.jpg,.jpeg,.webp"
                    />

                    {/* Description Input & Status */}
                    <div className="space-y-1">
                      <input
                        type="text"
                        placeholder="Description"
                        value={docDescriptions[idx] || ""}
                        onChange={(e) => handleDocDescriptionChange(idx, e.target.value)}
                        className="h-[34px] w-full rounded-[8px] border border-slate-200 bg-white px-2.5 text-[12px] text-[#1E293B] placeholder-slate-400 outline-none transition focus:border-indigo-400 dark:border-slate-800 dark:bg-[#0E1524] dark:text-[#E7ECF3]"
                      />
                      {attachment?.imagePath && (attachment?.misspunch_inout === "1" || attachment?.misspunch_inout === 1) && (
                        <div className="flex items-center gap-1.5 px-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <Check className="h-3 w-3" />
                          <span>Status: Verified</span>
                        </div>
                      )}
                      {attachment?.imagePath && (attachment?.misspunch_inout === "0" || attachment?.misspunch_inout === 0) && (
                        <div className="flex items-center gap-1.5 px-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                          <X className="h-3 w-3" />
                          <span>Status: Rejected</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Tab 2: Previous Employer */}
        {activeTab === 2 && (
          <section className={`${cardClass} p-4 sm:p-[18px] space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF]">
                  <Building2 className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-[14px] font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                    Previous employer reference
                  </h2>
                  <p className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                    Confirm the last employment on record
                  </p>
                </div>
              </div>

              {renderStatusPills(employerStatus, setEmployerStatus)}
            </div>

            <div className="space-y-3.5">
              {/* Row 1: Company Name, Contact Name, Contact Number, Reference Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                <Einput
                  title="COMPANY NAME"
                  ShortName
                  name="PreviousCompanyName"
                  type="text"
                  placeholder="Employer"
                  value={formData.PreviousCompanyName}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <Einput
                  title="HR / MANAGER CONTACTED"
                  ShortName
                  name="PreviousContactName"
                  type="text"
                  placeholder="Name"
                  value={formData.PreviousContactName}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <Einput
                  title="CONTACT NUMBER"
                  ShortName
                  name="ReferenceMobileNo"
                  type="text"
                  placeholder="Phone"
                  value={formData.ReferenceMobileNo}
                  handleInputChange={handleInputChange}
                  maxLength={10}
                  className={inputClass}
                />
                <Einput
                  title="REFERENCE EMAIL"
                  ShortName
                  redlabel=" *"
                  name="ReferenceEmail"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.ReferenceEmail}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
              </div>

              {/* Row 2: Worked From, Worked To, Designation, Reference Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                <Einput
                  title="WORKED FROM"
                  ShortName
                  name="EmployeeStartDate"
                  type="date"
                  value={formData.EmployeeStartDate}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <Einput
                  title="WORKED TO"
                  ShortName
                  name="EmployeeEndDate"
                  type="date"
                  value={formData.EmployeeEndDate}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <Einput
                  title="DESIGNATION HELD"
                  ShortName
                  name="PreviousPosition"
                  type="text"
                  placeholder="Role"
                  value={formData.PreviousPosition}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <Einput
                  title="REFERENCE DATE"
                  ShortName
                  name="Date_Of_Reference"
                  type="date"
                  value={formData.Date_Of_Reference}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
              </div>

              {/* Row 3: Salary, Relationship, Separation Voluntary, Rehire */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                <Einput
                  title="LAST DRAWN SALARY"
                  ShortName
                  name="PreviousSalary"
                  type="text"
                  placeholder="Monthly ₹"
                  value={formData.PreviousSalary}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <Einput
                  title="RELATIONSHIP TO APPLICANT"
                  ShortName
                  name="RelationToCandidate"
                  type="text"
                  placeholder="Manager / Colleague / HR"
                  value={formData.RelationToCandidate}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <Eselect
                  title="SEPARATION VOLUNTARY"
                  ShortName
                  name="SeperationVoluntary"
                  option={yesNoOptions}
                  initialValue={formData.SeperationVoluntary}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <Eselect
                  title="ELIGIBLE FOR REHIRE"
                  ShortName
                  name="EligileForRehire"
                  option={yesNoOptions}
                  initialValue={formData.EligileForRehire}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
              </div>

              {/* Row 4: Length Known, Reason For Leaving, Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                <Einput
                  title="LENGTH OF TIME KNOWN"
                  ShortName
                  name="LengthTimeKnown"
                  type="text"
                  placeholder="e.g. 2 years"
                  value={formData.LengthTimeKnown}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <Einput
                  title="REASON FOR LEAVING"
                  ShortName
                  name="ReasonForSeperation"
                  type="text"
                  placeholder="As stated by employer"
                  value={formData.ReasonForSeperation}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <div className="sm:col-span-2">
                  <Einput
                    title="PREVIOUS COMPANY ADDRESS"
                    ShortName
                    name="PreviousAddress"
                    type="text"
                    placeholder="Full office address"
                    value={formData.PreviousAddress}
                    handleInputChange={handleInputChange}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Row 5: Strengths, Weaknesses, Skills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <Einput
                  title="APPLICANT'S STRENGTHS"
                  ShortName
                  name="Strength"
                  type="text"
                  placeholder="Key strengths"
                  value={formData.Strength}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <Einput
                  title="APPLICANT'S WEAKNESSES"
                  ShortName
                  name="Weakness"
                  type="text"
                  placeholder="Areas of improvement"
                  value={formData.Weakness}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <Einput
                  title="SKILLS / ABILITIES"
                  ShortName
                  name="Skills"
                  type="text"
                  placeholder="Technical & soft skills"
                  value={formData.Skills}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
              </div>

              {/* Row 6: Verifier Notes Textarea */}
              <div>
                <ATextArea
                  title="VERIFIER'S NOTES / ISSUES"
                  name="Issues"
                  rows={3}
                  placeholder="Verifier's notes — what was confirmed, who confirmed it, and anything that did not match..."
                  value={formData.Issues}
                  handleInputChange={handleInputChange}
                  className="w-full rounded-[9px] border border-[#E2E8F0] p-3 text-[12.5px] outline-none transition focus:border-indigo-400 dark:border-[#1F2937] dark:bg-[#0E1524] dark:text-[#E7ECF3]"
                />
              </div>

              {UTD && (
                <div className="flex justify-end pt-2">
                  <AButton
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={<Send className="h-3.5 w-3.5" />}
                    onClick={handleSendEmployerEmail}
                  >
                    Send Employer Verification Email
                  </AButton>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Tab 3: Landlord */}
        {activeTab === 3 && (
          <section className={`${cardClass} p-4 sm:p-[18px] space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF]">
                  <Home className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-[14px] font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                    Landlord reference
                  </h2>
                  <p className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                    Confirm the residential address
                  </p>
                </div>
              </div>

              {renderStatusPills(landlordStatus, setLandlordStatus)}
            </div>

            <div className="space-y-3.5">
              {/* Row 1: Landlord Name, Contact, Email, Move-in */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                <Einput
                  title="LANDLORD NAME"
                  ShortName
                  name="LandloardName"
                  type="text"
                  placeholder="Name"
                  value={formData.LandloardName}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <Einput
                  title="CONTACT NUMBER"
                  ShortName
                  name="LandlordMobileNo"
                  type="text"
                  placeholder="Phone"
                  value={formData.LandlordMobileNo}
                  handleInputChange={handleInputChange}
                  maxLength={10}
                  className={inputClass}
                />
                <Einput
                  title="LANDLORD EMAIL"
                  ShortName
                  redlabel=" *"
                  name="LandlordEmail"
                  type="email"
                  placeholder="landlord@example.com"
                  value={formData.LandlordEmail}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <Einput
                  title="STAYING SINCE (MOVE-IN)"
                  ShortName
                  name="MoveInDate"
                  type="date"
                  value={formData.MoveInDate}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
              </div>

              {/* Row 2: Move-out Date, Rent, Verified Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                <Einput
                  title="MOVE-OUT DATE"
                  ShortName
                  name="MoveOutDate"
                  type="date"
                  value={formData.MoveOutDate}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <Einput
                  title="MONTHLY RENT"
                  ShortName
                  name="MonthlyRent"
                  type="text"
                  placeholder="₹"
                  value={formData.MonthlyRent}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <div className="sm:col-span-2">
                  <Einput
                    title="VERIFIED RESIDENTIAL ADDRESS"
                    ShortName
                    name="LandlordAddress"
                    type="text"
                    placeholder="Full address"
                    value={formData.LandlordAddress}
                    handleInputChange={handleInputChange}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Row 3: Timely Payments, Complaints, Proper Notice */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <Eselect
                  title="DID TENANT MAKE TIMELY PAYMENTS"
                  ShortName
                  name="DidCandidate_make_Timely_Payement"
                  option={yesNoOptions}
                  initialValue={formData.DidCandidate_make_Timely_Payement}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <Eselect
                  title="ANY COMPLAINT ABOUT TENANT"
                  ShortName
                  name="Candidate_Complaint"
                  option={yesNoOptions}
                  initialValue={formData.Candidate_Complaint}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <Eselect
                  title="DID TENANT GIVE PROPER NOTICE"
                  ShortName
                  name="DidCandidate_give_Proper_Notice"
                  option={yesNoOptions}
                  initialValue={formData.DidCandidate_give_Proper_Notice}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
              </div>

              {/* Row 4: Verifier Notes Textarea */}
              <div>
                <ATextArea
                  title="VERIFIER'S NOTES / PROBLEMS OR ISSUES"
                  name="LandlordIssues"
                  rows={3}
                  placeholder="Verifier's notes — what was confirmed, who confirmed it, and anything that did not match..."
                  value={formData.LandlordIssues}
                  handleInputChange={handleInputChange}
                  className="w-full rounded-[9px] border border-[#E2E8F0] p-3 text-[12.5px] outline-none transition focus:border-indigo-400 dark:border-[#1F2937] dark:bg-[#0E1524] dark:text-[#E7ECF3]"
                />
              </div>

              {UTD && (
                <div className="flex justify-end pt-2">
                  <AButton
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={<Send className="h-3.5 w-3.5" />}
                    onClick={handleSendLandlordEmail}
                  >
                    Send Landlord Verification Email
                  </AButton>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Tab 4: Requesting Party */}
        {activeTab === 4 && (
          <section className={`${cardClass} p-4 sm:p-[18px] space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF]">
                  <Building className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-[14px] font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                    Requesting party information
                  </h2>
                  <p className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                    Who asked for this verification
                  </p>
                </div>
              </div>

              {renderStatusPills(requestingStatus, setRequestingStatus)}
            </div>

            <div className="space-y-3.5">
              {/* Row 1: Contact Name, Company Name, Contact Mobile, Contact Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                <Einput
                  title="REQUESTED BY / CONTACT NAME"
                  ShortName
                  name="NewCompanyContactName"
                  type="text"
                  placeholder="Name"
                  value={formData.NewCompanyContactName}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <Einput
                  title="COMPANY / VERIFICATION AGENCY"
                  ShortName
                  name="NewCompanyName"
                  type="text"
                  placeholder="Company name"
                  value={formData.NewCompanyName}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <Einput
                  title="CONTACT NUMBER"
                  ShortName
                  name="NewCompanyMobileNo"
                  type="text"
                  placeholder="Mobile"
                  value={formData.NewCompanyMobileNo}
                  handleInputChange={handleInputChange}
                  maxLength={10}
                  className={inputClass}
                />
                <Einput
                  title="CONTACT EMAIL"
                  ShortName
                  name="NewCompanyEmail"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.NewCompanyEmail}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
              </div>

              {/* Row 2: Address / Notes */}
              <div>
                <ATextArea
                  title="REQUESTING PARTY ADDRESS / NOTES"
                  name="NewCompanyAddress"
                  rows={3}
                  placeholder="Office address and verifier's notes..."
                  value={formData.NewCompanyAddress}
                  handleInputChange={handleInputChange}
                  className="w-full rounded-[9px] border border-[#E2E8F0] p-3 text-[12.5px] outline-none transition focus:border-indigo-400 dark:border-[#1F2937] dark:bg-[#0E1524] dark:text-[#E7ECF3]"
                />
              </div>

              {UTD && (
                <div className="flex justify-end pt-2">
                  <AButton
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={<Send className="h-3.5 w-3.5" />}
                    onClick={handleSendRequestingEmail}
                  >
                    Notify Requesting Party
                  </AButton>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Tab 5: Police Verification */}
        {activeTab === 5 && (
          <section className={`${cardClass} p-4 sm:p-[18px] space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF]">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-[14px] font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                    Police verification
                  </h2>
                  <p className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                    Confirm police verification receipt and criminal record clearance
                  </p>
                </div>
              </div>

              {renderStatusPills(policeStatus, setPoliceStatus)}
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <Eselect
                  title="VERIFICATION STATUS"
                  ShortName
                  name="Verication_Status"
                  option={yesNoOptions}
                  initialValue={formData.Verication_Status}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <Einput
                  title="RECEIPT DATE"
                  ShortName
                  name="Receipt_Date"
                  type="date"
                  value={formData.Receipt_Date}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
                <Einput
                  title="RECEIPT NO."
                  ShortName
                  name="Receipt_No"
                  type="text"
                  placeholder="Receipt number"
                  value={formData.Receipt_No}
                  handleInputChange={handleInputChange}
                  className={inputClass}
                />
              </div>

              {/* Agency Remarks */}
              <div>
                <ATextArea
                  title="AGENCY REMARKS"
                  name="Agency_Remark"
                  rows={4}
                  placeholder="Enter remarks from the police verification station or agency..."
                  value={formData.Agency_Remark}
                  handleInputChange={handleInputChange}
                  className="w-full rounded-[9px] border border-[#E2E8F0] p-3 text-[12.5px] outline-none transition focus:border-indigo-400 dark:border-[#1F2937] dark:bg-[#0E1524] dark:text-[#E7ECF3]"
                />
              </div>

              {/* Police Verification Documents using CertificatesUpload atom */}
              <div className="pt-2">
                <CertificatesUpload
                  headerTitle="POLICE VERIFICATION DOCUMENTS & CERTIFICATES"
                  headerIcon={<ShieldCheck size={18} />}
                  items={policeDocItems}
                  value={policeCertificates}
                  onChange={handlePoliceCertificatesChange}
                  compact={false}
                />
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Bottom Sticky Action Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-[#0B1220]/95 sm:px-6">
        <div className="mx-auto flex max-w-[1700px] flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12px] text-[#64748B] dark:text-[#94A3B8] font-medium">
            <span>
              {UTD ? `Editing record #${UTD}` : "New candidate"}
            </span>
            <span>·</span>
            <span>{filledCandidateCount}/11 fields</span>
            <span>·</span>
            <span>{attachedDocsCount}/6 documents</span>
          </div>

          <div className="flex items-center gap-2.5">
            <AButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.history.back()}
              icon={<ArrowLeft className="h-3.5 w-3.5" />}
              className="!h-[36px] px-3.5 !rounded-[9px] text-[12.5px] font-medium"
            >
              Back
            </AButton>

            <AButton
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              icon={<RotateCcw className="h-3.5 w-3.5" />}
              className="!h-[36px] px-4 !rounded-[9px] text-[12.5px] font-medium"
            >
              Refresh
            </AButton>

            <AButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSave}
              disabled={isLoading}
              icon={<Save className="h-4 w-4" />}
              className="!h-[36px] px-5 !rounded-[9px] text-[12.5px] font-semibold !bg-[#334155] hover:!bg-[#1E293B] dark:!bg-slate-700 dark:hover:!bg-slate-600 text-white shadow-sm active:scale-[0.98]"
            >
              {UTD ? "Update reference check" : "Save reference check"}
            </AButton>
          </div>
        </div>
      </footer>

      {/* Preview Modal for Images & PDFs */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#111827] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
              <h3 className="font-semibold text-[14px] text-slate-800 dark:text-slate-200">
                {previewFile.title}
              </h3>
              <div className="flex items-center gap-2">
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-center overflow-auto p-4 bg-slate-50 dark:bg-[#07101F] min-h-[400px]">
              {previewFile.type === "pdf" ? (
                <iframe
                  src={previewFile.url}
                  title={previewFile.title}
                  className="h-[70vh] w-full rounded-lg border border-slate-200 bg-white"
                />
              ) : (
                <img
                  src={previewFile.url}
                  alt={previewFile.title}
                  className="max-h-[72vh] max-w-full rounded-lg object-contain shadow-sm"
                />
              )}
            </div>
          </div>
        </div>
      )}

      <HashloaderComponent isLoading={isLoading} />
    </main>
  );
}
