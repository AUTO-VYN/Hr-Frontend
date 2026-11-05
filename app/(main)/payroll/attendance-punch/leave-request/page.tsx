"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useSecureStorage } from "@/app/hooks/comp-key-data";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/app/hooks/useToast";

// Components requested by user
import AButton from "@/components/atoms/Button";
import ServiceTablePagination from "@/components/Templates/reacttable";
import Ainput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import ATextArea from "@/components/atoms/textArea";
import FileViewer from "@/components/atoms/FileviewerBank";
import ImageCaptureDialog from "./ImageCaptureDialog";

// UI Dialogs
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Icons
import {
  CalendarPlus,
  CalendarDays,
  Send,
  AlertTriangle,
  Camera,
  Eye,
  X,
  ListChecks,
  Coffee,
  Thermometer,
  Palmtree,
  Gift,
  Award,
  CheckCircle2,
  UserCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type MisspunchData = {
  MP_Date: string | null;
  MP_To_Date: string | null;
  Type: number | string | null;
  In_Time: string | null;
  Out_Time: number | string | null;
  MP_Reason: number | string | null;
  MP_Remark: number | null;
  Spl_Remark: string | null;
  stat?: number;
  Man_Rej?: string | null;
  Date?: string;
  EmpCode?: string;
  EmpName?: string;
  EmployeeDesignation?: string;
  In1?: string;
  Out1?: string;
  Mipunch_Reason?: string;
  spl_remark?: string;
  head_remark_by?: string;
  head_remark?: string;
  AtnStatus?: string;
  PROFILE?: string;
  [key: string]: any;
};

type FormData = {
  Created_by: string;
  misspunchData: {
    MP_Date: string | null;
    MP_To_Date: string | null;
    Type: number | string | null;
    In_Time: string | null;
    Out_Time: number | null;
    MP_Reason: number | string | null;
    MP_Remark: number | null;
    Spl_Remark: string | null;
  };
};

// Dot color logic from original code
const getDotColor = (index: number, stat: number, isLastDotRed: string | null) => {
  if (stat == 4) {
    return isLastDotRed == "Y" ? "bg-[#EF4444]" : "bg-[#10B981]";
  }
  if (index < stat - 1) {
    return "bg-[#10B981]";
  }
  return "bg-[#F59E0B]";
};

export default function LeaveRequestPage() {
  const user = useCurrentUser();
  const { compdata } = useSecureStorage();
  const { toast, hideToast } = useToast();

  const cardsScrollRef = useRef<HTMLDivElement>(null);

  const scrollCards = (direction: "left" | "right") => {
    if (cardsScrollRef.current) {
      const scrollAmount = cardsScrollRef.current.clientWidth;
      cardsScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Dialog & Capture States
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isApproverModalVisible, setIsApproverModalVisible] = useState(false);
  const [selectedLeaveDetail, setSelectedLeaveDetail] = useState<MisspunchData | null>(null);

  // Form Data State
  const [formdata, setFormData] = useState<FormData>({
    Created_by: user?.name || "",
    misspunchData: {
      MP_Date: null,
      MP_To_Date: null,
      Type: 1, // Default full day
      In_Time: null,
      Out_Time: null,
      MP_Reason: null,
      MP_Remark: null,
      Spl_Remark: "",
    },
  });

  const [showSpl_Remark, setShowSpl_Remark] = useState<any>({});
  const [differenceInDays, setdifferenceInDays] = useState(0);
  const [disableType, setDisableType] = useState(false);
  const [tabledata, setTabledata] = useState<any[]>([]);
  const [MPList, setMPList] = useState<any[]>([]);
  const [halfSLFlag, setHalfSLFlag] = useState(0);
  const [apprData, setApprData] = useState<any[]>([]);
  const [continuous_maxValue, setContinuous_maxValue] = useState<number | null>(null);
  const [minValue, setMinValue] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date filters for table history (Default last 1 month to today)
  const [FROMDATE, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().substring(0, 10);
  });
  const [TODATE, setToDate] = useState(() => {
    return new Date().toISOString().substring(0, 10);
  });

  // Load Leave Types and Approver List on mount
  useEffect(() => {
    if (user?.EMPCODE && user?.Comp_Code) {
      getMPList();
      showDataOFAPPRVL();
      employeeview();
    }
  }, [user?.EMPCODE, user?.Comp_Code]);

  const showDataOFAPPRVL = async () => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/GetApprList`,
        {
          params: {
            Empcode: user?.EMPCODE,
            module: "leave",
            isPayroll: 1,
          },
          headers: {
            compcode: user?.Comp_Code,
          },
        }
      );
      setApprData(response.data?.Result || []);
    } catch (error) {
      console.error("Error fetching approver list:", error);
    }
  };

  const getMPList = async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/mobile/leaveTypes`,
        {
          empcode: user?.EMPCODE,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );
      const list = response.data?.Result || [];
      setMPList(list);
      setHalfSLFlag(response.data?.HalfSLFlag || 0);

      // Auto-select first leave type if available and none selected
      if (list.length > 0 && !formdata.misspunchData.MP_Reason) {
        const first = list[0];
        setFormData((prev) => ({
          ...prev,
          misspunchData: {
            ...prev.misspunchData,
            MP_Reason: first.value,
          },
        }));
        setShowSpl_Remark(first);
        setMinValue(first.min_value ?? null);
        setContinuous_maxValue(first.continuous_max ?? null);
      }
    } catch (error) {
      console.error("Error fetching leave types:", error);
    }
  };

  const employeeview = async () => {
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/mobile/getLeaveData`,
        {
          EMPCODE: user?.EMPCODE,
          StartDate: FROMDATE,
          EndDate: TODATE,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );
      setTabledata(result.data?.Result || []);
    } catch (error) {
      console.error("Error fetching leave history:", error);
    }
  };

  // Half / Full options calculation
  const typeOptions = useMemo(() => {
    const reason = formdata?.misspunchData?.MP_Reason;
    if (Number(reason) === 6 && Number(halfSLFlag) === 1) {
      return [
        { value: 1, label: "Full day" },
        { value: 2, label: "First half" },
        { value: 3, label: "Second half" },
      ];
    }
    return [
      { value: 1, label: "Full day" },
      { value: 0, label: "Half day" },
    ];
  }, [formdata?.misspunchData?.MP_Reason, halfSLFlag]);

  // Date calculation logic & continuous max validation
  useEffect(() => {
    const fromStr = formdata.misspunchData?.MP_Date;
    const toStr = formdata.misspunchData?.MP_To_Date;

    if (!fromStr || !toStr) {
      setdifferenceInDays(0);
      return;
    }

    const startDate = new Date(fromStr);
    const endDate = new Date(toStr);
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

    if (isNaN(diffDays) || diffDays < 0) {
      setdifferenceInDays(0);
      return;
    }

    const totalDays = diffDays + 1;
    setdifferenceInDays(totalDays);

    if (continuous_maxValue && totalDays > continuous_maxValue) {
      toast({
        title: `You can select up to ${continuous_maxValue} continuous days only.`,
        variant: "destructive",
      });
      setFormData((prev) => ({
        ...prev,
        misspunchData: {
          ...prev.misspunchData,
          MP_To_Date: fromStr,
        },
      }));
      setdifferenceInDays(1);
      return;
    }

    // If single day selected
    if (totalDays === 1) {
      setDisableType(false);
      if (minValue === 1) {
        setFormData((prev) => ({
          ...prev,
          misspunchData: {
            ...prev.misspunchData,
            Type: 1,
          },
        }));
      }
    } else {
      // More than 1 day => Force Full Day
      setDisableType(true);
      setFormData((prev) => ({
        ...prev,
        misspunchData: {
          ...prev.misspunchData,
          Type: 1,
        },
      }));
    }
  }, [
    formdata.misspunchData?.MP_Date,
    formdata.misspunchData?.MP_To_Date,
    minValue,
    continuous_maxValue,
  ]);

  // Input change handler
  const handleInputChange = (name: string, value: any) => {
    if (name === "MP_Reason") {
      const selectedLeave = MPList.find((item) => String(item.value) === String(value));
      setShowSpl_Remark(selectedLeave || {});
      setMinValue(selectedLeave?.min_value ?? null);
      setContinuous_maxValue(selectedLeave?.continuous_max ?? null);
      setCapturedImage(null);
      setCapturedFile(null);
      setFormData((prev) => ({
        ...prev,
        misspunchData: {
          ...prev.misspunchData,
          MP_Reason: value,
          Type: 1,
        },
      }));
      return;
    }

    if (name === "MP_Date") {
      const startDate = new Date(value);
      const endDate = formdata?.misspunchData?.MP_To_Date
        ? new Date(formdata.misspunchData.MP_To_Date)
        : null;

      if (endDate && continuous_maxValue) {
        const diffDays =
          Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (diffDays > continuous_maxValue) {
          toast({
            title: `You can apply leave for max ${continuous_maxValue} days only.`,
            variant: "destructive",
          });
          setFormData((prev) => ({
            ...prev,
            misspunchData: {
              ...prev.misspunchData,
              MP_Date: value,
              MP_To_Date: value,
            },
          }));
          return;
        }
      }

      setFormData((prev) => ({
        ...prev,
        misspunchData: {
          ...prev.misspunchData,
          MP_Date: value,
          MP_To_Date: formdata.misspunchData?.MP_To_Date || value,
        },
      }));
      return;
    }

    if (name === "MP_To_Date") {
      const startDate = formdata?.misspunchData?.MP_Date
        ? new Date(formdata.misspunchData.MP_Date)
        : null;
      const endDate = new Date(value);

      if (startDate && continuous_maxValue) {
        const diffDays =
          Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (diffDays > continuous_maxValue) {
          toast({
            title: `You can select up to ${continuous_maxValue} continuous days only.`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    setFormData((prev) => ({
      ...prev,
      misspunchData: {
        ...prev.misspunchData,
        [name]: value,
      },
    }));
  };

  // Upload Medical Certificate API
  const uploadLeaveImage = async (
    empCode: string,
    compCode: string,
    fromDate: string,
    toDate: string,
    imageFile: File
  ) => {
    try {
      const fd = new FormData();
      fd.append("empCode", empCode);
      fd.append("fromDate", fromDate);
      fd.append("toDate", toDate);
      fd.append("photo", imageFile);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/mobile/uploadLeaveImage`,
        fd,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            compcode: compCode,
            name: user?.name,
          },
        }
      );
      return response;
    } catch (error) {
      console.error("Error uploading leave image:", error);
      throw error;
    }
  };

  const handleImageCapture = (imageData: string, imageFile: File) => {
    setCapturedImage(imageData);
    setCapturedFile(imageFile);
    toast({
      title: "Medical certificate attached successfully",
      variant: "success",
    });
  };

  // Submit Leave Request
  const submitbtn = async () => {
    const isSickLeave = Number(formdata.misspunchData?.MP_Reason) === 6;
    const isMedicalCertificateMandatory = isSickLeave && compdata?.mand_SL_Img == 1;

    if (!formdata?.misspunchData?.MP_Date) {
      toast({
        title: "Please fill From Date field",
        variant: "destructive",
      });
      return;
    }
    if (!formdata?.misspunchData?.MP_To_Date) {
      toast({
        title: "Please fill To Date field",
        variant: "destructive",
      });
      return;
    }
    if (differenceInDays <= 0) {
      toast({
        title: "The to date must be on or after the from date.",
        variant: "destructive",
      });
      return;
    }
    if (
      formdata.misspunchData?.MP_Reason === null ||
      formdata.misspunchData?.MP_Reason === "" ||
      formdata.misspunchData?.MP_Reason === undefined
    ) {
      toast({
        title: "Please fill Leave Type field",
        variant: "destructive",
      });
      return;
    }
    if (formdata.misspunchData?.Type === null || formdata.misspunchData?.Type === "") {
      toast({
        title: "Please fill Half or Full Day field",
        variant: "destructive",
      });
      return;
    }
    if (
      !formdata.misspunchData?.Spl_Remark ||
      formdata.misspunchData.Spl_Remark.trim() === ""
    ) {
      toast({
        title: "Please fill Reason field",
        variant: "destructive",
      });
      return;
    }

    // Medical certificate prompt if mandatory and missing
    if (isMedicalCertificateMandatory && !capturedImage) {
      const result = await Swal.fire({
        icon: "warning",
        title: "Medical Certificate Required",
        text: "Sick leave requires a medical certificate. Would you like to upload one now?",
        confirmButtonText: "Upload Now",
        cancelButtonText: "Cancel",
        showCancelButton: true,
        confirmButtonColor: "#4F46E5",
      });
      if (result.isConfirmed) {
        setIsImageDialogOpen(true);
      }
      return;
    }

    const confirmed = await Swal.fire({
      icon: "question",
      title: "Apply Leave?",
      text:
        differenceInDays !== 1
          ? `Submit leave application for ${formdata.misspunchData.MP_Date} to ${formdata.misspunchData.MP_To_Date} (${differenceInDays} days)?`
          : `Submit leave application for ${formdata.misspunchData.MP_Date}?`,
      confirmButtonText: "Yes, Apply",
      cancelButtonText: "Cancel",
      showCancelButton: true,
      confirmButtonColor: "#4F46E5",
    });

    if (!confirmed.isConfirmed) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/mobile/AddLeave`,
        {
          MP_Date: formdata.misspunchData?.MP_Date,
          MP_To_Date: formdata.misspunchData?.MP_To_Date,
          MP_Reason: formdata.misspunchData?.MP_Reason,
          Spl_Remark: formdata.misspunchData?.Spl_Remark,
          empcode: user?.EMPCODE,
          half_full: formdata.misspunchData?.Type,
          mis_enterby: user?.name,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      if (result.status === 200) {
        // Upload certificate if sick leave and file present
        if (isSickLeave && compdata?.mand_SL_Img == 1 && capturedFile) {
          try {
            await uploadLeaveImage(
              user?.EMPCODE || "",
              user?.Comp_Code || "",
              formdata.misspunchData?.MP_Date || "",
              formdata.misspunchData?.MP_To_Date || formdata.misspunchData?.MP_Date || "",
              capturedFile
            );
          } catch (imgErr) {
            console.error("Image upload failed:", imgErr);
            Swal.fire({
              icon: "warning",
              title: "Partial Success",
              text: "Leave applied successfully, but medical certificate upload failed. Please contact HR.",
            });
          }
        }

        Swal.fire({
          icon: "success",
          title: "Leave Applied Successfully",
          text: result?.data?.Message || "Your leave request has been submitted.",
          confirmButtonColor: "#4F46E5",
        });

        await employeeview();

        // Reset form
        setFormData({
          Created_by: user?.name || "",
          misspunchData: {
            MP_Date: null,
            MP_To_Date: null,
            Type: 1,
            In_Time: null,
            Out_Time: null,
            MP_Reason: formdata.misspunchData?.MP_Reason, // keep current selected type
            MP_Remark: null,
            Spl_Remark: "",
          },
        });
        setdifferenceInDays(0);
        setDisableType(false);
        setCapturedImage(null);
        setCapturedFile(null);
      } else {
        Swal.fire({
          icon: "warning",
          title: "Warning",
          text: result?.data?.Message || "Your request cannot be submitted.",
        });
        await employeeview();
      }
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text:
          error?.response?.data?.Message ||
          "Error while submitting request. Please try again later.",
      });
      console.error("Error submitting leave request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Approver selection handler
  const handleSelectApprover = (approver: any) => {
    console.log("Selected approver:", approver);
  };

  // Helper for Leave Type Badges & Colors
  const getLeaveTypeCode = (name?: string) => {
    if (!name) return "LV";
    const upper = name.toUpperCase();
    if (upper.includes("CASUAL")) return "CL";
    if (upper.includes("SICK")) return "SL";
    if (upper.includes("EARNED") || upper.includes("PRIVILEGE") || upper.includes("EL")) return "EL";
    if (upper.includes("COMP")) return "CO";
    if (upper.includes("MATERNITY")) return "ML";
    if (upper.includes("PATERNITY")) return "PL";
    return name.substring(0, 2).toUpperCase();
  };

  const getLeaveTheme = (code: string) => {
    switch (code) {
      case "CL":
        return {
          tint: "#0EA5E9",
          tintBg: "#0EA5E91F",
          icon: <Coffee className="w-3.5 h-3.5" />,
        };
      case "SL":
        return {
          tint: "#E11D48",
          tintBg: "#E11D481F",
          icon: <Thermometer className="w-3.5 h-3.5" />,
        };
      case "EL":
        return {
          tint: "#10B981",
          tintBg: "#10B9811F",
          icon: <Palmtree className="w-3.5 h-3.5" />,
        };
      case "CO":
        return {
          tint: "#7C3AED",
          tintBg: "#7C3AED1F",
          icon: <Gift className="w-3.5 h-3.5" />,
        };
      default:
        return {
          tint: "#4F46E5",
          tintBg: "#4F46E51F",
          icon: <Award className="w-3.5 h-3.5" />,
        };
    }
  };

  // ==============================================================
  // EXACT TABLE COLUMNS FROM USER'S CODE
  // ==============================================================
  const columns = useMemo(
    () => [
      {
        Header: "Status",
        accessor: "stat",
        Cell: ({ row }: any) => (
          <div className="flex space-x-1.5 items-center">
            {[1, 2, 3].map((dot, index) => (
              <span
                key={index}
                className={`w-3.5 h-3.5 rounded-full ${getDotColor(
                  index,
                  row.original.stat,
                  row.original.Man_Rej
                )}`}
                title={`Status step ${dot}`}
              />
            ))}
          </div>
        ),
        width: 90,
      },
      {
        Header: "Mis-Punch Date",
        accessor: "Date",
        Cell: ({ row }: any) => {
          const raw = row.original.Date;
          if (!raw) return <span className="text-[#64748B]">—</span>;
          try {
            const d = new Date(raw);
            if (!isNaN(d.getTime())) {
              return (
                <span className="text-[12.5px] font-[550] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                  {d.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </span>
              );
            }
          } catch {}
          return <span className="text-[12.5px] font-[550] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">{raw}</span>;
        },
        width: 130,
      },
      {
        Header: "Reason",
        accessor: "Mipunch_Reason",
        Cell: ({ row }: any) => (
          <span className="text-[12.5px] font-medium text-[#1E293B] dark:text-[#E7ECF3]">
            {row.original.Mipunch_Reason || "—"}
          </span>
        ),
        width: 140,
      },
      {
        Header: "Spl Remark",
        accessor: "Spl_Remark",
        Cell: ({ row }: any) => (
          <span
            className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8] truncate max-w-[180px] block"
            title={row.original.Spl_Remark || row.original.spl_remark || ""}
          >
            {row.original.Spl_Remark || row.original.spl_remark || "—"}
          </span>
        ),
        width: 160,
      },
      {
        Header: "Head Name",
        accessor: "head_remark_by",
        Cell: ({ row }: any) => (
          <span className="text-[12.5px] font-semibold uppercase text-[#1E293B] dark:text-[#E7ECF3] truncate block">
            {row.original.head_remark_by || "—"}
          </span>
        ),
        width: 160,
      },
      {
        Header: "Head Remark",
        accessor: "head_remark",
        Cell: ({ row }: any) => (
          <span
            className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8] truncate max-w-[180px] block"
            title={row.original.head_remark || ""}
          >
            {row.original.head_remark || "—"}
          </span>
        ),
        width: 150,
      },
      {
        Header: "Attn. Status",
        accessor: "AtnStatus",
        Cell: ({ row }: any) => (
          <span className="text-[12.5px] font-medium text-[#1E293B] dark:text-[#E7ECF3]">
            {row.original.AtnStatus || "—"}
          </span>
        ),
        width: 110,
      },
      {
        Header: "File",
        accessor: "PROFILE",
        Cell: ({ row }: any) => {
          const { PROFILE } = row.original;
          if (!PROFILE) return <span className="text-[#64748B]">—</span>;
          const cleanUrl = PROFILE.replace(/\\/g, "/");
          return (
            <div className="flex items-center text-xs font-semibold text-[#4F46E5] dark:text-[#8B84FF]">
              <FileViewer fileLink={cleanUrl} celldata="" Title="Medical Certificate" />
            </div>
          );
        },
        width: 110,
      },
    ],
    []
  );

  // Leave Type Dropdown Options for Eselect
  const leaveSelectOptions = useMemo(() => {
    return (MPList || []).map((item) => ({
      value: item.value,
      label: `${getLeaveTypeCode(item.Misc_Name || item.label)} · ${item.Misc_Name || item.label}`,
    }));
  }, [MPList]);

  // Request Days Count
  const requestDaysCount = useMemo(() => {
    if (differenceInDays <= 0) return "—";
    const t = Number(formdata.misspunchData?.Type);
    if (t === 0 || t === 2 || t === 3) return "0.5";
    return differenceInDays.toFixed(1);
  }, [differenceInDays, formdata.misspunchData?.Type]);

  // Blocker warning message
  const blocker = useMemo(() => {
    if (!formdata.misspunchData?.MP_Date || !formdata.misspunchData?.MP_To_Date) {
      return "Pick both the from and to dates.";
    }
    if (differenceInDays <= 0) {
      return "The to date must be on or after the from date.";
    }
    if (!formdata.misspunchData?.MP_Reason) {
      return "Choose the leave type you want to use.";
    }
    if (!formdata.misspunchData?.Spl_Remark?.trim()) {
      return "A short reason helps your manager approve faster.";
    }
    return "";
  }, [
    formdata.misspunchData?.MP_Date,
    formdata.misspunchData?.MP_To_Date,
    differenceInDays,
    formdata.misspunchData?.MP_Reason,
    formdata.misspunchData?.Spl_Remark,
  ]);

  return (
    <div className="w-full space-y-3.5 pb-10 text-[#1E293B] dark:text-[#E7ECF3] font-['Inter',system-ui,sans-serif]">
      {/* ============================================================== */}
      {/* 1. TOP CARDS ROW: Horizontal Scroll (Only 4 visible at a time) */}
      {/* ============================================================== */}
      {MPList && MPList.length > 0 && (
        <div className="relative group w-full">
          {/* Scroll Left Button (Visible when MPList > 4) */}
          {MPList.length > 4 && (
            <button
              type="button"
              onClick={() => scrollCards("left")}
              aria-label="Scroll left"
              className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] text-[#1E293B] dark:text-[#E7ECF3] shadow-sm flex items-center justify-center hover:bg-[#F8FAFC] dark:hover:bg-[#182235] cursor-pointer transition-all opacity-80 hover:opacity-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <div
            ref={cardsScrollRef}
            className="flex gap-3.5 overflow-x-auto scroll-smooth pb-1.5 [scrollbar-width:thin] [scrollbar-color:#CBD5E1_transparent] dark:[scrollbar-color:#334155_transparent]"
          >
            {MPList.map((item: any, idx: number) => {
              const name = item.Misc_Name || item.label || "Leave";
              const code = getLeaveTypeCode(name);
              const theme = getLeaveTheme(code);
              const isSelected = String(formdata.misspunchData?.MP_Reason) === String(item.value);
              const left = Number(item.Cl_Bal ?? 0);
              const total = Number(item.Gen_Lev || item.Op_Bal || left || 1);
              const availed = Number(item.Avail_Lev ?? 0);
              const percent = Math.min(100, Math.max(0, Math.round((left / (total || 1)) * 100)));

              return (
                <button
                  key={item.value || idx}
                  type="button"
                  onClick={() => handleInputChange("MP_Reason", item.value)}
                  className={`text-left bg-white dark:bg-[#111827] rounded-[12px] p-[15px_17px] cursor-pointer transition-all border shrink-0 min-w-[260px] sm:min-w-[calc((100%-14px)/2)] lg:w-[calc((100%-42px)/4)] lg:min-w-[calc((100%-42px)/4)] lg:max-w-[calc((100%-42px)/4)] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,.4),0_10px_26px_-14px_rgba(0,0,0,.6)] ${
                    isSelected
                      ? "border-[#4F46E5] ring-1 ring-[#4F46E5]/30"
                      : "border-[#E2E8F0] dark:border-[#1F2937] hover:border-[#4F46E5]"
                  }`}
                >
                  {/* Header: Icon + Name + Short Code */}
                  <div className="flex items-center gap-[9px]">
                    <span
                      className="w-[26px] h-[26px] rounded-[8px] grid place-items-center shrink-0"
                      style={{ background: theme.tintBg, color: theme.tint }}
                    >
                      {theme.icon}
                    </span>
                    <span className="text-[11.5px] font-[600] flex-1 min-w-0 text-[#1E293B] dark:text-[#E7ECF3] truncate">
                      {name}
                    </span>
                    <span
                      className="text-[10.5px] font-[700] uppercase shrink-0"
                      style={{ color: theme.tint }}
                    >
                      {code}
                    </span>
                  </div>

                  {/* Numbers */}
                  <div className="flex items-baseline gap-[7px] mt-[11px]">
                    <span className="text-[24px] font-[650] tracking-[-0.02em] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                      {left}
                    </span>
                    <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                      of {total} left
                    </span>
                  </div>

                  {/* Progress Bar (5px height pill) */}
                  <span className="block w-full h-[5px] rounded-full bg-[#F8FAFC] dark:bg-[#0E1524] relative overflow-hidden mt-[9px]">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                      style={{ width: `${percent}%`, background: theme.tint }}
                    />
                  </span>

                  {/* Availed */}
                  <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-[7px] tabular-nums">
                    {availed} availed
                  </div>
                </button>
              );
            })}
          </div>

          {/* Scroll Right Button (Visible when MPList > 4) */}
          {MPList.length > 4 && (
            <button
              type="button"
              onClick={() => scrollCards("right")}
              aria-label="Scroll right"
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] text-[#1E293B] dark:text-[#E7ECF3] shadow-sm flex items-center justify-center hover:bg-[#F8FAFC] dark:hover:bg-[#182235] cursor-pointer transition-all opacity-80 hover:opacity-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. MAIN GRID (Left: 404px Apply Form, Right: 1fr History)      */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-[404px_minmax(0,1fr)] gap-[14px] items-start">
        {/* ============================================================ */}
        {/* LEFT COLUMN: Apply for leave Card (404px)                     */}
        {/* ============================================================ */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] p-[17px_19px_19px_19px]">
          {/* Header */}
          <div className="flex items-center gap-[9px] mb-[5px]">
            <span className="w-[26px] h-[26px] rounded-[8px] grid place-items-center bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF] shrink-0">
              <CalendarPlus className="w-4 h-4" />
            </span>
            <h1 className="m-0 text-[16px] font-[650] tracking-[-0.01em] text-[#1E293B] dark:text-[#E7ECF3]">
              Apply for leave
            </h1>
          </div>
          <p className="m-0 mb-[15px] text-[12px] text-[#64748B] dark:text-[#94A3B8] leading-[1.5]">
            The balance updates live as you pick dates, so you can see what is left before you submit.
          </p>

          <div className="flex flex-col gap-[13px]">
            {/* From Date & To Date Grid */}
            <div className="grid grid-cols-2 gap-[11px]">
              <Ainput
                title="From Date"
                redlabel="*"
                type="date"
                name="MP_Date"
                value={formdata.misspunchData?.MP_Date}
                handleInputChange={handleInputChange}
                className="rounded-md text-[12.5px] p-[9px_10px] h-20px border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#0E1524]"
                labelClassName="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[.03em] uppercase"
              />
              <Ainput
                title="To Date"
                redlabel="*"
                type="date"
                name="MP_To_Date"
                value={formdata.misspunchData?.MP_To_Date}
                handleInputChange={handleInputChange}
                className="rounded-md text-[12.5px] p-[9px_10px] h-20px border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#0E1524]"
                labelClassName="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[.03em] uppercase"
              />
            </div>

            {/* Day Count Box */}
            <div
              className={`flex items-center gap-[10px] p-[11px_13px] border rounded-[10px] transition-colors ${
                differenceInDays > 0
                  ? "border-[#10B98166] bg-[#10B9810F]"
                  : "border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0E1524]"
              }`}
            >
              <span
                className={`w-[26px] h-[26px] rounded-[8px] shrink-0 grid place-items-center ${
                  differenceInDays > 0
                    ? "bg-[#10B98126] text-[#10B981]"
                    : "bg-[#F8FAFC] dark:bg-[#0E1524] text-[#64748B] dark:text-[#94A3B8]"
                }`}
              >
                <CalendarDays className="w-4 h-4" />
              </span>
              <span
                className={`flex-1 min-w-0 text-[12.5px] ${
                  differenceInDays > 0
                    ? "text-[#1E293B] dark:text-[#E7ECF3] font-[550]"
                    : "text-[#64748B] dark:text-[#94A3B8]"
                }`}
              >
                {differenceInDays > 0
                  ? `You have selected ${differenceInDays} day(s) for leave`
                  : "Select dates to see the day count"}
              </span>
            </div>

            {/* Half or Full Day Buttons */}
            <div>
              <span className="block text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[.03em] uppercase mb-[6px]">
                Half or full day
              </span>
              <div className="flex gap-[6px]">
                {typeOptions.map((opt) => {
                  const isActive = Number(formdata.misspunchData?.Type) === Number(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={disableType && opt.value !== 1}
                      onClick={() => handleInputChange("Type", opt.value)}
                      className={`flex-1 text-[12px] font-[600] py-[8px] rounded-[9px] border transition-all cursor-pointer ${
                        isActive
                          ? "border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF] dark:border-[#8B84FF]"
                          : "border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] text-[#64748B] dark:text-[#94A3B8] hover:border-[#4F46E5]"
                      } ${disableType && opt.value !== 1 ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Leave Type Select */}
            <div>
              <Eselect
                title="Leave Type"
                redlabel="*"
                name="MP_Reason"
                option={leaveSelectOptions}
                initialValue={formdata.misspunchData?.MP_Reason}
                handleInputChange={handleInputChange}
                placeholder="Select leave type"
                labelClassName="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[.03em] uppercase mb-[5px]"
                className="rounded-[9px] text-[12.5px] border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#0E1524]"
              />
            </div>

            {/* Reason Textarea */}
            <div>
              <ATextArea
                title="Leave Remark"
                redlabel="*"
                name="Spl_Remark"
                value={formdata.misspunchData?.Spl_Remark || ""}
                handleInputChange={(name, val) => handleInputChange(name, val)}
                placeholder="Where you'll be and who is covering for you…"
                rows={3}
                max="200"
                className="rounded-[9px] text-[12.5px] p-[9px_10px] min-h-[76px] border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#0E1524]"
              />
            </div>

            {/* Medical Certificate Upload Box (When Sick Leave MP_Reason === 6) */}
            {Number(formdata.misspunchData?.MP_Reason) === 6 && (
              <div className="rounded-[10px] border border-dashed border-[#E2E8F0] dark:border-[#1F2937] p-[11px_13px] bg-[#F8FAFC] dark:bg-[#0E1524] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[9px]">
                    <span className="w-[26px] h-[26px] rounded-[8px] grid place-items-center bg-[#E11D481F] text-[#E11D48]">
                      <Camera className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <p className="text-[12px] font-[600] text-[#1E293B] dark:text-[#E7ECF3] m-0">
                        Medical Certificate
                      </p>
                      <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] m-0">
                        Upload prescription / report
                      </p>
                    </div>
                  </div>

                  {!capturedImage ? (
                    <AButton
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsImageDialogOpen(true)}
                      icon={<Camera className="w-3.5 h-3.5" />}
                      className="rounded-[8px] text-[11.5px] h-7 px-2.5"
                    >
                      Upload
                    </AButton>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <AButton
                        type="button"
                        variant="subtle"
                        size="sm"
                        onClick={() => setShowImagePreview(true)}
                        icon={<Eye className="w-3.5 h-3.5" />}
                        className="rounded-[8px] text-[11.5px] h-7 px-2"
                      >
                        View
                      </AButton>
                      <button
                        type="button"
                        onClick={() => {
                          setCapturedImage(null);
                          setCapturedFile(null);
                        }}
                        className="p-1 rounded-[6px] text-[#E11D48] hover:bg-[#E11D4814] transition-colors"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {capturedImage ? (
                  <div className="flex items-center gap-2 text-[11px] font-[600] text-[#10B981]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Certificate attached</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[11px] text-[#F59E0B]">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Certificate required for Sick Leave</span>
                  </div>
                )}
              </div>
            )}

            {/* Ledger Box */}
            <div className="p-[12px_13px] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[10px] bg-[#F8FAFC] dark:bg-[#0E1524] flex flex-col gap-[8px]">
              <div className="flex items-baseline gap-[10px] text-[12.5px]">
                <span className="flex-1 min-w-0 text-[#64748B] dark:text-[#94A3B8]">
                  Opening balance
                </span>
                <span className="font-[600] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                  {showSpl_Remark?.Op_Bal !== undefined ? Number(showSpl_Remark.Op_Bal).toFixed(1) : "0.0"}
                </span>
              </div>

              <div className="flex items-baseline gap-[10px] text-[12.5px]">
                <span className="flex-1 min-w-0 text-[#64748B] dark:text-[#94A3B8]">
                  Availed so far
                </span>
                <span className="font-[600] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                  {showSpl_Remark?.Avail_Lev !== undefined ? Number(showSpl_Remark.Avail_Lev).toFixed(1) : "0.0"}
                </span>
              </div>

              <div className="flex items-baseline gap-[10px] text-[12.5px]">
                <span className="flex-1 min-w-0 text-[#64748B] dark:text-[#94A3B8]">
                  This request
                </span>
                <span className="font-[600] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                  {requestDaysCount}
                </span>
              </div>

              <div className="flex items-baseline gap-[10px] text-[12.5px] border-t border-[#E2E8F0] dark:border-[#1F2937] pt-[6px]">
                <span className="flex-1 min-w-0 font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                  Closing balance
                </span>
                <span className="font-[600] tabular-nums text-[#10B981]">
                  {showSpl_Remark?.Cl_Bal !== undefined ? Number(showSpl_Remark.Cl_Bal).toFixed(1) : "0.0"}
                </span>
              </div>
            </div>

            {/* Generate Request Button */}
            <button
              type="button"
              onClick={submitbtn}
              disabled={isSubmitting}
              className="flex items-center justify-center gap-[8px] border border-transparent bg-[#4F46E5] text-white text-[13px] font-[600] p-[11px_14px] rounded-[10px] cursor-pointer shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? "Submitting…" : "Generate request"}</span>
            </button>

            {/* Blocker Alert */}
            {blocker && (
              <div className="flex items-start gap-[9px] text-[11.5px] text-[#B45309] bg-[rgba(245,158,11,.09)] border border-[rgba(245,158,11,.3)] rounded-[9px] p-[9px_11px]">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#B45309]" />
                <span className="flex-1 min-w-0 leading-[1.5]">{blocker}</span>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: My leave history Card                          */}
        {/* ============================================================ */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,.04),0_10px_26px_-14px_rgba(15,23,42,.14)] overflow-hidden">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-[10px] p-[13px_18px] border-b border-[#E2E8F0] dark:border-[#1F2937]">
            <h2 className="m-0 text-[14px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
              My leave history
            </h2>
            <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
              {tabledata.length} applications
            </span>
            <div className="flex-1 min-w-[20px]" />

            {/* Date Filters & Action Buttons */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={FROMDATE}
                onChange={(e) => setFromDate(e.target.value)}
                className="border border-[#E2E8F0] dark:border-[#1F2937] rounded-[9px] bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] text-[12px] p-[6px_9px] outline-none"
              />
              <span className="text-[11px] text-[#64748B]">to</span>
              <input
                type="date"
                value={TODATE}
                onChange={(e) => setToDate(e.target.value)}
                className="border border-[#E2E8F0] dark:border-[#1F2937] rounded-[9px] bg-white dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] text-[12px] p-[6px_9px] outline-none"
              />

              <button
                type="button"
                onClick={employeeview}
                title="Refresh"
                className="w-8 h-8 rounded-[8px] border border-[#E2E8F0] dark:border-[#1F2937] bg-transparent text-[#1E293B] dark:text-[#E7ECF3] grid place-items-center hover:bg-[#F1F5F9] dark:hover:bg-[#182235] cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsApproverModalVisible(true)}
                className="flex items-center gap-[6px] border border-[#E2E8F0] dark:border-[#1F2937] bg-transparent text-[#1E293B] dark:text-[#E7ECF3] text-[12px] font-[550] p-[6px_11px] rounded-[8px] cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#182235]"
              >
                <ListChecks className="w-3.5 h-3.5" />
                Approvers
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="p-3">
            <ServiceTablePagination
              columns={columns}
              data={tabledata}
              height={520}
              showExcelExport={true}
              searchPlaceholder="Filter leave requests..."
              onRowDoubleClick={(row) => {
                setSelectedLeaveDetail(row);
                setIsDetailDialogOpen(true);
              }}
            />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. DIALOGS: Capture, Preview, Leave Detail, Approver Modal     */}
      {/* ============================================================== */}

      {/* Image Capture Dialog */}
      <ImageCaptureDialog
        isOpen={isImageDialogOpen}
        onClose={() => setIsImageDialogOpen(false)}
        onImageCapture={handleImageCapture}
      />

      {/* Image Preview Dialog */}
      {showImagePreview && capturedImage && (
        <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
          <DialogContent className="w-full max-w-xl p-0 overflow-hidden bg-white dark:bg-[#111827] rounded-[12px] border border-[#E2E8F0] dark:border-[#1F2937] !shadow-none shadow-none">
            <DialogHeader className="p-[14px_18px] pr-12 bg-[#F8FAFC] dark:bg-[#0E1524] border-b border-[#E2E8F0] dark:border-[#1F2937] relative">
              <DialogTitle className="text-[14px] font-[650] text-[#1E293B] dark:text-[#E7ECF3] flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#4F46E5]" />
                Medical Certificate Preview
              </DialogTitle>
            </DialogHeader>
            <div className="p-6 flex justify-center bg-[#F8FAFC]/50 dark:bg-[#0E1524]/50">
              <img
                src={capturedImage}
                alt="Medical Certificate"
                className="max-h-[60vh] rounded-[10px] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Leave Detail Dialog (Triggered on Row Double Click) */}
      {isDetailDialogOpen && selectedLeaveDetail && (
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="w-full max-w-lg p-0 overflow-hidden bg-white dark:bg-[#111827] rounded-[12px] border border-[#E2E8F0] dark:border-[#1F2937] !shadow-none shadow-none">
            <DialogHeader className="p-[14px_18px] pr-14 bg-[#F8FAFC] dark:bg-[#0E1524] border-b border-[#E2E8F0] dark:border-[#1F2937] relative">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-[14px] font-[650] text-[#1E293B] dark:text-[#E7ECF3]">
                  Leave Application Details
                </DialogTitle>
                <div className="flex space-x-1.5 items-center mr-4">
                  {[1, 2, 3].map((dot, index) => (
                    <span
                      key={index}
                      className={`w-3 h-3 rounded-full ${getDotColor(
                        index,
                        selectedLeaveDetail.stat || 0,
                        selectedLeaveDetail.Man_Rej || null
                      )}`}
                    />
                  ))}
                </div>
              </div>
            </DialogHeader>

            <div className="p-5 space-y-3 text-[12.5px]">
              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-[#E2E8F0] dark:border-[#1F2937]">
                <div>
                  <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] block">Date</span>
                  <span className="font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                    {selectedLeaveDetail.Date || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] block">Reason</span>
                  <span className="font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                    {selectedLeaveDetail.Mipunch_Reason || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] block">Employee Code</span>
                  <span className="font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                    {selectedLeaveDetail.EmpCode || user?.EMPCODE || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] block">Employee Name</span>
                  <span className="font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                    {selectedLeaveDetail.EmpName || user?.name || "—"}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div>
                  <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] block">Spl Remark</span>
                  <p className="text-[#1E293B] dark:text-[#E7ECF3] font-medium m-0">
                    {selectedLeaveDetail.Spl_Remark || selectedLeaveDetail.spl_remark || "—"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] block">Head Name</span>
                    <span className="text-[#1E293B] dark:text-[#E7ECF3] font-medium">
                      {selectedLeaveDetail.head_remark_by || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] block">Head Remark</span>
                    <span className="text-[#1E293B] dark:text-[#E7ECF3] font-medium">
                      {selectedLeaveDetail.head_remark || "—"}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] block">Attn. Status</span>
                  <span className="text-[#1E293B] dark:text-[#E7ECF3] font-medium">
                    {selectedLeaveDetail.AtnStatus || "—"}
                  </span>
                </div>

                {selectedLeaveDetail.PROFILE && (
                  <div className="pt-3">
                    <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] block mb-1">
                      Attached Document
                    </span>
                    <FileViewer fileLink={selectedLeaveDetail.PROFILE.replace(/\\/g, "/")} celldata="" Title="Medical Certificate" />
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Approver List Dialog */}
      <Dialog open={isApproverModalVisible} onOpenChange={setIsApproverModalVisible}>
        <DialogContent className="w-full max-w-3xl p-0 overflow-hidden bg-white dark:bg-[#111827] rounded-[12px] border border-[#E2E8F0] dark:border-[#1F2937] !shadow-none shadow-none max-h-[85vh] flex flex-col">
          <DialogHeader className="p-[14px_18px] pr-12 bg-[#F8FAFC] dark:bg-[#0E1524] border-b border-[#E2E8F0] dark:border-[#1F2937] shrink-0 relative">
            <DialogTitle className="text-[14px] font-[650] text-[#1E293B] dark:text-[#E7ECF3] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#4F46E5]" />
              Approver Hierarchy List
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 overflow-y-auto">
            {apprData.length === 0 ? (
              <div className="text-center py-10 text-[#64748B] text-[12.5px]">
                No approvers found for this module.
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block rounded-[10px] border border-[#E2E8F0] dark:border-[#1F2937] overflow-hidden">
                  <table className="w-full text-left text-[12px]">
                    <thead className="bg-[#F8FAFC] dark:bg-[#0E1524] text-[#64748B] dark:text-[#94A3B8] font-[700] text-[10.5px] uppercase tracking-[.05em] border-b border-[#E2E8F0] dark:border-[#1F2937]">
                      <tr>
                        <th className="p-3">Approver 1A</th>
                        <th className="p-3">Approver 1B</th>
                        <th className="p-3">Approver 2A</th>
                        <th className="p-3">Approver 2B</th>
                        <th className="p-3">Approver 3A</th>
                        <th className="p-3">Approver 3B</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1F2937]">
                      {apprData.map((item, index) => (
                        <tr
                          key={index}
                          onClick={() => handleSelectApprover(item)}
                          className="hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] transition-colors cursor-pointer"
                        >
                          <td className="p-3 font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                            {item.approver1_A || "—"}
                          </td>
                          <td className="p-3 text-[#64748B] dark:text-[#94A3B8]">
                            {item.approver1_B || "—"}
                          </td>
                          <td className="p-3 font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                            {item.approver2_A || "—"}
                          </td>
                          <td className="p-3 text-[#64748B] dark:text-[#94A3B8]">
                            {item.approver2_B || "—"}
                          </td>
                          <td className="p-3 font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                            {item.approver3_A || "—"}
                          </td>
                          <td className="p-3 text-[#64748B] dark:text-[#94A3B8]">
                            {item.approver3_B || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden space-y-2.5">
                  {apprData.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => handleSelectApprover(item)}
                      className="border border-[#E2E8F0] dark:border-[#1F2937] p-3.5 rounded-[10px] bg-[#F8FAFC] dark:bg-[#0E1524] text-[12px] space-y-2"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[#64748B] block text-[10.5px]">Approver 1A</span>
                          <span className="font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                            {item.approver1_A || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#64748B] block text-[10.5px]">Approver 1B</span>
                          <span className="text-[#1E293B] dark:text-[#E7ECF3]">
                            {item.approver1_B || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#64748B] block text-[10.5px]">Approver 2A</span>
                          <span className="font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                            {item.approver2_A || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#64748B] block text-[10.5px]">Approver 2B</span>
                          <span className="text-[#1E293B] dark:text-[#E7ECF3]">
                            {item.approver2_B || "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Global Toast Component */}
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
      />
    </div>
  );
}
