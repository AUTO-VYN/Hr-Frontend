"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import axios from "axios";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useSecureStorage } from "@/app/hooks/comp-key-data";
import { useDateRange } from "@/app/hooks/use-date-range";
import { useSearchParams } from "next/navigation";
import Swal from "sweetalert2";

// Mandatory Atoms & Template Components
import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import ReactTable from "@/components/Templates/reacttable";
import CardView from "@/components/Templates/card";
import FileViewer from "@/components/atoms/Fileviewer";
import HashloaderComponent from "@/components/Templates/hashloader";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Clock,
  CheckCircle2,
  XCircle,
  Layers,
  Send,
  AlertTriangle,
  Upload,
  LogIn,
  LogOut,
  ArrowLeftRight,
  ListChecks,
  Camera,
  RefreshCw,
  LayoutGrid,
  Table as TableIcon,
  Check,
  X,
  ArrowLeft,
  FileSpreadsheet,
} from "lucide-react";
import { FaImage } from "react-icons/fa";
import { MdCameraAlt, MdFlipCameraIos } from "react-icons/md";

/* ------------------------------------------------------------------ */
/* Types from original logic                                          */
/* ------------------------------------------------------------------ */
type MisspunchData = {
  MP_Date: string | null;
  Type: number | null; // 1: Punch In, 2: Punch Out, 3: Both
  In_Time: string | null;
  Out_Time: string | null;
  MP_Reason: any;
  MP_Remark: any;
  Spl_Remark: string | null;
  [key: string]: any;
};

type FormDataState = {
  Comp_Code: string;
  Created_by: string;
  misspunchData: MisspunchData;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
function getCurrentDate(monthsBack = 0) {
  const today = new Date();
  today.setMonth(today.getMonth() - monthsBack);
  const year = today.getFullYear();
  let month: any = today.getMonth() + 1;
  let day: any = today.getDate();
  if (month < 10) month = "0" + month;
  if (day < 10) day = "0" + day;
  return `${year}-${month}-${day}`;
}

const formatDate = (value: any) => {
  if (!value) return "—";
  let dateObj: Date;

  if (
    typeof value === "string" &&
    /^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(value)
  ) {
    const [day, month, year] = value.split(/[/-]/);
    dateObj = new Date(+year, +month - 1, +day);
  } else {
    dateObj = new Date(value);
  }

  if (isNaN(dateObj.getTime())) return String(value);

  return dateObj.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getImageUrl = (path?: string) => {
  if (!path || typeof path !== "string") return "";
  const trimmed = path.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const cleanPath = trimmed.replace(/^undefined/i, "").replace(/\\/g, "/");
  const basePath =
    process.env.NEXT_PUBLIC_imagepath ||
    `${process.env.NEXT_PUBLIC_URL || "https://erp.autovyn.com/backend"}/fetch?filePath=`;

  return `${basePath}${cleanPath}`;
};

const allTypeOptions = [
  { value: 1, label: "In punch", icon: LogIn },
  { value: 2, label: "Out punch", icon: LogOut },
  { value: 3, label: "Both", icon: ArrowLeftRight },
];

const restrictedTypeOptions = [
  { value: 1, label: "In punch", icon: LogIn },
  { value: 2, label: "Out punch", icon: LogOut },
];

/* ------------------------------------------------------------------ */
/* Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function MispunchRequestPage() {
  const user: any = useCurrentUser();
  const { compdata } = useSecureStorage();
  const searchParams = useSearchParams();
  const globalDateRange = useDateRange();

  // Toast notification helper matching exact API from old code
  const toast = ({ title, variant }: { title: string; variant?: string }) => {
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      customClass: {
        container: "side-alert-container",
      },
    });

    Toast.fire({
      icon: variant === "destructive" ? "error" : "warning",
      title: title,
    });
  };

  const todayDate = getCurrentDate(0);
  const oneMonthAgoDate = getCurrentDate(1);

  const initialParamDate = searchParams?.get("date") || "";
  let formattedParamDate = "";
  if (initialParamDate) {
    if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(initialParamDate)) {
      const [d, m, y] = initialParamDate.split(/[/-]/);
      formattedParamDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    } else {
      formattedParamDate = initialParamDate;
    }
  }

  // --- Dates Filter States ---
  const [FROMDATE, setFromDate] = useState(
    globalDateRange?.from || oneMonthAgoDate
  );
  const [TODATE, setToDate] = useState(
    globalDateRange?.to || todayDate
  );

  // --- Form Data States ---
  const [formdata, setFormData] = useState<FormDataState>({
    Created_by: user?.name || "",
    Comp_Code: user?.Comp_Code || "",
    misspunchData: {
      MP_Date: formattedParamDate || todayDate,
      Type: null,
      In_Time: null,
      Out_Time: null,
      MP_Reason: null,
      MP_Remark: null,
      Spl_Remark: null,
    },
  });

  const [showSpl_Remark, setShowSpl_Remark] = useState(false);
  const [typeOptions, setTypeOptions] = useState(allTypeOptions);
  const [past_mp_allowed, setPast_mp_allowed] = useState(0);
  const [MPList, setMPList] = useState<any[]>([]);
  const [MPRemarksList, setMPRemarksList] = useState<any[]>([]);

  // --- Images and Camera State ---
  const [imageSrc, setImageSrc] = useState<string>(""); // Punch Out Preview
  const [imageSrc1, setImageSrc1] = useState<string>(""); // Punch In Preview
  const [punchIn, setPunchIn] = useState<File | Blob | null>(null);
  const [punchOut, setPunchOut] = useState<File | Blob | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("environment");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // --- Table & Requests Data ---
  const [tabledata, setTabledata] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  // --- Modals State ---
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [MissPunchData, setMissPunchData] = useState<MisspunchData>({
    MP_Date: null,
    Type: null,
    In_Time: null,
    Out_Time: null,
    MP_Reason: null,
    MP_Remark: null,
    Spl_Remark: null,
  });
  const [apprData, setApprData] = useState<any[]>([]);
  const [isModalVisible1, setIsModalVisible1] = useState(false);

  // Status Dot Color Function from original code
  const getDotColor = (index: number, stat: any, isLastDotRed: any) => {
    if (stat == 4) {
      return isLastDotRed == "Y" || isLastDotRed == "y" ? "bg-[#E11D48]" : "bg-[#10B981]";
    }
    if (index < Number(stat) - 1) {
      return "bg-[#10B981]";
    }
    return "bg-[#F59E0B]";
  };

  // 1. Fetch Employee Mispunch List
  const employeeview = useCallback(async () => {
    if (!user?.EMPCODE || !user?.Comp_Code) return;
    setTabledata([]);
    setIsLoading(true);
    try {
      const result = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/getMispunch_Employee_new`,
        {
          params: {
            EMPCODE: user?.EMPCODE,
            StartDate: FROMDATE,
            EndDate: TODATE,
          },
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );
      setTabledata(result.data?.Result || []);
    } catch (error) {
      console.error("Error occurred while making getMispunch_Employee_new request:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.EMPCODE, user?.Comp_Code, user?.name, FROMDATE, TODATE]);

  // 2. Fetch Mispunch Reasons & past_mp_allowed
  const getMPList = useCallback(async () => {
    if (!user?.Comp_Code) return;
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/getMPList`,
        {
          params: {
            Comp_Code: "demo",
          },
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );
      const pastAllowed = response.data?.past_mp_allowed || 0;
      setMPList(response.data?.Result || []);
      setPast_mp_allowed(pastAllowed);
      if (pastAllowed === 1) {
        setTypeOptions(restrictedTypeOptions);
      } else {
        setTypeOptions(allTypeOptions);
      }
    } catch (error) {
      console.error("Error fetching MP list:", error);
    }
  }, [user?.Comp_Code, user?.name]);

  // 3. Fetch Mispunch Remarks
  const getMPRemarksList = useCallback(async () => {
    if (!user?.Comp_Code) return;
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/getMPRemarksList`,
        {
          params: {
            Comp_Code: "demo",
          },
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );
      setMPRemarksList(response.data?.Result || []);
    } catch (error) {
      console.error("Error fetching MP remarks list:", error);
    }
  }, [user?.Comp_Code, user?.name]);

  // 4. Fetch Approver List Hierarchy
  const showDataOFAPPRVL = useCallback(async () => {
    if (!user?.EMPCODE || !user?.Comp_Code) return;
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/GetApprList`,
        {
          params: {
            Empcode: user?.EMPCODE,
            module: "misspunch",
            isPayroll: 1,
          },
          headers: {
            compcode: user?.Comp_Code,
          },
        }
      );
      setApprData(response.data?.Result || []);
    } catch (error) {
      console.error("Error fetching approvers list:", error);
    }
  }, [user?.EMPCODE, user?.Comp_Code]);

  useEffect(() => {
    if (user?.EMPCODE && user?.Comp_Code) {
      employeeview();
      getMPList();
      getMPRemarksList();
      showDataOFAPPRVL();
    }
  }, [user?.EMPCODE, user?.Comp_Code, employeeview, getMPList, getMPRemarksList, showDataOFAPPRVL]);

  // Camera Management
  const getMediaStream = () => {
    const constraints = {
      video: {
        facingMode: cameraFacingMode,
      },
    };
    navigator.mediaDevices
      ?.getUserMedia(constraints)
      .then((mediaStream) => {
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch((error) => {
        console.error("Error accessing camera:", error);
      });
  };

  const stopMediaStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      setStream(null);
    }
  };

  useEffect(() => {
    stopMediaStream();
    if (formdata.misspunchData?.Type !== null) {
      getMediaStream();
    } else {
      stopMediaStream();
    }
    return () => {
      stopMediaStream();
    };
  }, [formdata.misspunchData?.Type, cameraFacingMode]);

  const handleCameraToggle = () => {
    setCameraFacingMode((prevMode) =>
      prevMode === "environment" ? "user" : "environment"
    );
  };

  const handleCapture = () => {
    const type = formdata.misspunchData?.Type;
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    if (type == 3) {
      if (!punchIn) {
        const capturedImage = canvas.toDataURL("image/png");
        setImageSrc1(capturedImage);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "mispunch_in.png", { type: "image/png" });
            setPunchIn(file);
          }
        });
      } else {
        const capturedImage = canvas.toDataURL("image/png");
        setImageSrc(capturedImage);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "mispunch_out.png", { type: "image/png" });
            setPunchOut(file);
          }
        });
      }
    } else if (type == 2) {
      setPunchIn(null);
      setImageSrc1("");
      const capturedImage = canvas.toDataURL("image/png");
      setImageSrc(capturedImage);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "mispunch_out.png", { type: "image/png" });
          setPunchOut(file);
        }
      });
    } else if (type == 1) {
      setPunchOut(null);
      setImageSrc("");
      const capturedImage = canvas.toDataURL("image/png");
      setImageSrc1(capturedImage);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "mispunch_in.png", { type: "image/png" });
          setPunchIn(file);
        }
      });
    }
  };

  const handleFileChange = (event: any) => {
    setPunchOut(null);
    const file = event.target.files?.[0];
    if (file) {
      setPunchOut(file);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          setImageSrc(e.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        setImageSrc("");
      }
    }
  };

  const handleFileChange1 = (event: any) => {
    setPunchIn(null);
    const file = event.target.files?.[0];
    if (file) {
      setPunchIn(file);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          setImageSrc1(e.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        setImageSrc1("");
      }
    }
  };

  // Input Change with exact restrictions from original code
  const handleInputChange = (name: string, value: any) => {
    if (name === "MP_Remark") {
      if (value == 8) {
        setShowSpl_Remark(true);
      } else {
        setShowSpl_Remark(false);
      }
    }

    if (name === "MP_Date" && past_mp_allowed === 1) {
      const today = new Date().toISOString().split("T")[0];
      if (value < today) {
        toast({
          title: "Past date selection is not allowed!",
          variant: "destructive",
        });
        setFormData((prev) => ({
          ...prev,
          misspunchData: {
            ...prev.misspunchData,
            MP_Date: today,
          },
        }));
        return;
      }
    }

    if ((name === "In_Time" || name === "Out_Time") && past_mp_allowed === 1) {
      const selectedDate = formdata?.misspunchData?.MP_Date;
      const today = new Date().toISOString().split("T")[0];
      const currentTime = new Date();
      const currentHHMM = currentTime.toTimeString().slice(0, 5); // "HH:MM"
      if (selectedDate === today) {
        if (value < currentHHMM) {
          toast({
            title: "Past time selection is not allowed!",
            variant: "destructive",
          });
          setFormData((prev) => ({
            ...prev,
            misspunchData: {
              ...prev.misspunchData,
              [name]: currentHHMM,
            },
          }));
          return;
        }
      }
    }

    setFormData((prevData) => ({
      ...prevData,
      misspunchData: {
        ...prevData.misspunchData,
        [name]: value,
      },
    }));
  };

  useEffect(() => {
    if (past_mp_allowed === 1) {
      const today = new Date().toISOString().split("T")[0];
      if (formdata?.misspunchData?.MP_Date && formdata.misspunchData.MP_Date < today) {
        handleInputChange("MP_Date", today);
      }
    }
  }, [past_mp_allowed]);

  // Submit Handler with exact logic and warnings from original code
  const submitbtn = async () => {
    if (!formdata.misspunchData?.MP_Date) {
      toast({
        title: "Please Select MisPunch Date",
        variant: "destructive",
      });
      return;
    }

    const selectedReasonObj = MPList.find(
      (item: any) => item?.value == formdata.misspunchData?.MP_Reason
    );

    if (selectedReasonObj?.label === "LEAVE WITHOUT PAY (LWP)") {
      // Leave without pay bypasses in/out time & type
    } else {
      if (formdata.misspunchData?.Type == null) {
        toast({
          title: "Please Select Misspunch Type",
          variant: "destructive",
        });
        return;
      }

      if (
        formdata.misspunchData?.In_Time == null &&
        formdata.misspunchData?.Type == 1
      ) {
        toast({
          title: "Please Select In Time",
          variant: "destructive",
        });
        return;
      } else if (
        formdata.misspunchData?.Out_Time == null &&
        formdata.misspunchData?.Type == 2
      ) {
        toast({
          title: "Please Select Out Time",
          variant: "destructive",
        });
        return;
      } else if (
        formdata.misspunchData?.Type == 3 &&
        (formdata.misspunchData?.Out_Time == null ||
          formdata.misspunchData?.In_Time == null)
      ) {
        toast({
          title: "Please Select In /Out TIme",
          variant: "destructive",
        });
        return;
      } else if (formdata.misspunchData?.MP_Reason == null) {
        toast({
          title: "Please Select Mispunch Reason",
          variant: "destructive",
        });
        return;
      } else if (formdata.misspunchData?.MP_Remark == null) {
        toast({
          title: "Please Select Mispunch Remark",
          variant: "destructive",
        });
        return;
      } else if (
        formdata.misspunchData?.MP_Remark == 8 &&
        (formdata.misspunchData?.Spl_Remark == null ||
          formdata.misspunchData?.Spl_Remark === "")
      ) {
        toast({
          title: "Please Enter Mispunch Remark",
          variant: "destructive",
        });
        return;
      } else if (!punchIn && !punchOut) {
        toast({
          title: "Please capture at least one image (Punch In or Punch Out)",
          variant: "destructive",
        });
        return;
      }
    }

    // Restriction check when saving
    if (past_mp_allowed === 1) {
      const selectedDate = formdata?.misspunchData?.MP_Date;
      const today = new Date().toISOString().split("T")[0];
      const currentTime = new Date();
      const currentHHMM = currentTime.toTimeString().slice(0, 5); // "HH:MM"

      if (selectedDate === today) {
        const inTime = formdata.misspunchData?.In_Time;
        const outTime = formdata.misspunchData?.Out_Time;

        if (inTime && inTime < currentHHMM) {
          toast({
            title: "In Time cannot be in the past!",
            variant: "destructive",
          });
          return;
        }

        if (outTime && outTime < currentHHMM) {
          toast({
            title: "Out Time cannot be in the past!",
            variant: "destructive",
          });
          return;
        }
      }
    }

    setIsLoading(true);
    try {
      const result = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/AddMispunchRequest_New`,
        {
          params: {
            Comp_Code: user?.Comp_Code,
            MP_Date: formdata.misspunchData.MP_Date,
            In_Time: formdata.misspunchData.In_Time,
            Out_Time: formdata.misspunchData.Out_Time,
            MP_Reason: formdata.misspunchData.MP_Reason,
            MP_Remark: formdata.misspunchData.MP_Remark,
            Spl_Remark: formdata.misspunchData.Spl_Remark,
            AMR_EMPCODE: user?.EMPCODE,
            EMP_NAME: user?.name,
            mis_enterby: user?.name,
          },
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      if (result.status === 200) {
        if (!punchIn && !punchOut) {
          stopMediaStream();
          await employeeview();
          setImageSrc("");
          setImageSrc1("");
          setPunchIn(null);
          setPunchOut(null);
          setFormData({
            Created_by: user?.name || "",
            Comp_Code: user?.Comp_Code || "",
            misspunchData: {
              MP_Date: todayDate,
              Type: null,
              In_Time: null,
              Out_Time: null,
              MP_Reason: null,
              MP_Remark: null,
              Spl_Remark: null,
            },
          });
          Swal.fire({
            icon: "success",
            title: "Success!",
            text: "Misspunch added without Images",
          });
          return;
        }

        const formDataPayload = new FormData();
        if (punchIn) formDataPayload.append("punchIn", punchIn);
        if (punchOut) formDataPayload.append("punchOut", punchOut);
        formDataPayload.append("Comp_Code", user?.Comp_Code);
        formDataPayload.append("empCode", user?.EMPCODE);
        formDataPayload.append("date", formdata.misspunchData.MP_Date);

        try {
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_URL}/mobile/uploadMisspunch`,
            formDataPayload,
            {
              headers: {
                "Content-Type": "multipart/form-data",
                compcode: user?.Comp_Code,
                name: user?.name,
              },
            }
          );

          if (response.status === 200) {
            stopMediaStream();
            await employeeview();
            setImageSrc("");
            setImageSrc1("");
            setPunchIn(null);
            setPunchOut(null);
            setFormData({
              Created_by: user?.name || "",
              Comp_Code: user?.Comp_Code || "",
              misspunchData: {
                MP_Date: todayDate,
                Type: null,
                In_Time: null,
                Out_Time: null,
                MP_Reason: null,
                MP_Remark: null,
                Spl_Remark: null,
              },
            });
            Swal.fire({
              icon: "success",
              title: "Success!",
              text: result?.data?.Message || "Misspunch added successfully",
            });
          }
        } catch (uploadError) {
          stopMediaStream();
          console.error("Error uploading misspunch proof:", uploadError);
          Swal.fire({
            icon: "error",
            title: "Error!",
            text: "Error while submitting request please try again later",
          });
        }
      } else {
        Swal.fire({
          icon: "warning",
          title: "Warning!",
          text: result?.data?.Message
            ? result?.data?.Message
            : "Your request Cannot be submitted.",
        });
        await employeeview();
        setPunchIn(null);
        setPunchOut(null);
        setFormData({
          Created_by: user?.name || "",
          Comp_Code: user?.Comp_Code || "",
          misspunchData: {
            MP_Date: todayDate,
            Type: null,
            In_Time: null,
            Out_Time: null,
            MP_Reason: null,
            MP_Remark: null,
            Spl_Remark: null,
          },
        });
        setImageSrc("");
        setImageSrc1("");
      }
    } catch (error: any) {
      stopMediaStream();
      Swal.fire({
        icon: "error",
        title: "error!",
        text: error?.response?.data?.Message
          ? error?.response?.data?.Message
          : "Error while submitting request please try again later",
      });
      console.error("Error occurred while making the get request:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Row Click Dialog Handler
  const handleTableClick = (row: any) => {
    const item = row?.original ? row.original : row;
    setMissPunchData(item);
    setIsDialogOpen(true);
  };

  // KPI Stats Calculation
  const stats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    tabledata.forEach((row: any) => {
      const stat = row.stat;
      const isRej = row.Man_Rej === "Y" || row.Man_Rej === "y" || stat === 0 || stat === "0";
      const isApp = stat === 4 || stat === "4" || row.AtnStatus === "Approved";

      if (isRej) rejected++;
      else if (isApp) approved++;
      else pending++;
    });

    const total = tabledata.length;

    return {
      pending,
      approved,
      rejected,
      total,
      quotaDisplay: `${approved} / ${total}`,
    };
  }, [tabledata]);

  // Exact Table Columns styled according to HTML design
  const columns = useMemo(
    () => [
      {
        Header: "Status",
        accessor: "stat",
        Cell: ({ row }: any) => {
          const stat = row.original?.stat;
          const isRej =
            row.original?.Man_Rej === "Y" ||
            row.original?.Man_Rej === "y" ||
            stat === 0 ||
            stat === "0";
          const isApp =
            stat === 4 || stat === "4" || row.original?.AtnStatus === "Approved";

          let statusText = "Pending";
          let fg = "#F59E0B";
          let bg = "#F59E0B14";
          let border = "#F59E0B55";

          if (isRej) {
            statusText = "Rejected";
            fg = "#E11D48";
            bg = "#E11D4814";
            border = "#E11D4855";
          } else if (isApp) {
            statusText = "Approved";
            fg = "#10B981";
            bg = "#10B98114";
            border = "#10B98155";
          }

          return (
            <div className="flex items-center gap-2">
              <span
                style={{ color: fg, backgroundColor: bg, borderColor: border }}
                className="inline-flex items-center gap-1.5 text-[11px] font-[600] px-2 py-0.5 rounded-[8px] border whitespace-nowrap"
              >
                <span
                  style={{ backgroundColor: fg }}
                  className="w-1.5 h-1.5 rounded-full"
                ></span>
                {statusText}
              </span>
              <div className="flex items-center space-x-1">
                {[1, 2, 3].map((dot, index) => (
                  <span
                    key={index}
                    title={`Approval Step ${index + 1}`}
                    className={`w-2 h-2 rounded-full ${getDotColor(
                      index,
                      row.original?.stat,
                      row.original?.Man_Rej
                    )}`}
                  />
                ))}
              </div>
            </div>
          );
        },
        width: 14,
      },
      {
        Header: "Mis-punch date",
        accessor: "Date",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[550] tabular-nums text-[#1E293B] dark:text-[#E7ECF3] whitespace-nowrap">
            {formatDate(value)}
          </span>
        ),
        width: 12,
      },
      {
        Header: "Return time",
        accessor: "In1",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[550] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "Out time",
        accessor: "Out1",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[550] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "Actual in",
        accessor: "Actual_In",
        Cell: ({ value }: any) => (
          <span
            className={`text-[12.5px] font-[550] tabular-nums ${
              value ? "text-[#1E293B] dark:text-[#E7ECF3]" : "text-[#64748B] dark:text-[#94A3B8]"
            }`}
          >
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "Actual out",
        accessor: "Actual_Out",
        Cell: ({ value }: any) => (
          <span
            className={`text-[12.5px] font-[550] tabular-nums ${
              value ? "text-[#1E293B] dark:text-[#E7ECF3]" : "text-[#64748B] dark:text-[#94A3B8]"
            }`}
          >
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "Reason",
        accessor: "Mipunch_Reason",
        Cell: ({ value }: any) => (
          <span
            className="text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] max-w-[140px] truncate block"
            title={value}
          >
            {value || "—"}
          </span>
        ),
        width: 18,
      },
      {
        Header: "Remark",
        accessor: "MI_Remark",
        Cell: ({ value }: any) => (
          <span
            className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8] max-w-[160px] truncate block"
            title={value}
          >
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "Spl remark",
        accessor: "Spl_Remark",
        Cell: ({ value }: any) => (
          <span
            className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8] max-w-[160px] truncate block"
            title={value}
          >
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "Status",
        accessor: "AtnStatus",
        Cell: ({ value }: any) => (
          <span className="text-[12px] font-[550] text-[#1E293B] dark:text-[#E7ECF3] whitespace-nowrap">
            {value || "—"}
          </span>
        ),
        width: 10,
      },
      {
        Header: "Applied on",
        accessor: "Mispunch_applied_on",
        Cell: ({ value }: any) => (
          <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8] tabular-nums whitespace-nowrap">
            {formatDate(value)}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] font-['Inter',system-ui,sans-serif] [font-feature-settings:'tnum'_1]">
      {/* Top Header */}
      <header className="px-6 py-2 flex items-center justify-end">
        {/* Approver List Modal Trigger */}
        <button
          type="button"
          onClick={() => setIsModalVisible1(true)}
          className="inline-flex items-center gap-1.5 border border-[#E2E8F0] dark:border-[#1F2937] rounded-[10px] bg-[#FFFFFF] dark:bg-[#111827] text-[#1E293B] dark:text-[#E7ECF3] text-[12.5px] font-[550] px-3 py-1.5 cursor-pointer whitespace-nowrap hover:bg-[#F1F5F9] dark:hover:bg-[#182235] transition-colors"
        >
          <ListChecks className="w-4 h-4 text-[#4F46E5] dark:text-[#8B84FF]" />
          <span>Approver List</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="p-4 sm:p-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[400px_minmax(0,1fr)] gap-[14px] items-start">
          {/* ======================================================== */}
          {/* LEFT CARD: NEW MIS-PUNCH REQUEST FORM                     */}
          {/* ======================================================== */}
          <div className="w-full bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] p-[17px_19px_19px_19px]">
            {/* Header */}
            <div className="flex items-center gap-[9px] mb-[5px]">
              <span className="w-[26px] h-[26px] rounded-[8px] flex items-center justify-center bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF]">
                <Clock className="w-3.5 h-3.5" />
              </span>
              <h1 className="m-0 text-[16px] font-[650] tracking-[-0.01em] text-[#1E293B] dark:text-[#E7ECF3]">
                New mis-punch request
              </h1>
            </div>
            <p className="m-0 mb-[15px] text-[12px] text-[#64748B] dark:text-[#94A3B8] leading-[1.5]">
              Pick the day that was recorded wrong, tell us which punch is missing, and attach proof if you have it.
            </p>

            <div className="flex flex-col gap-[13px]">
              {/* MIS-PUNCH DATE */}
              <label className="flex flex-col gap-[5px]">
                <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase">
                  MIS-PUNCH DATE<span className="text-[#E11D48]"> *</span>
                </span>
                <Einput
                  type="date"
                  title=""
                  name="MP_Date"
                  value={formdata.misspunchData?.MP_Date || ""}
                  handleInputChange={handleInputChange}
                  required
                  labelClassName="hidden"
                  className="!h-[38px] text-[12.5px] rounded-[9px] border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] w-full"
                />
              </label>

              {/* WHICH PUNCH IS WRONG? Segmented Options */}
              <div>
                <span className="block text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase mb-[6px]">
                  WHICH PUNCH IS WRONG?<span className="text-[#E11D48]"> *</span>
                </span>
                <div className="flex gap-[6px]">
                  {typeOptions.map((opt) => {
                    const isSelected = formdata.misspunchData?.Type === opt.value;
                    const IconComponent = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleInputChange("Type", opt.value)}
                        className={`flex-1 flex flex-col items-center justify-center gap-[5px] text-[11.5px] font-[600] p-[10px_6px] rounded-[9px] cursor-pointer transition-colors border ${
                          isSelected
                            ? "border-[#4F46E5] bg-[#EEF2FF] text-[#4F46E5] dark:border-[#8B84FF] dark:bg-[#1E1B4B] dark:text-[#8B84FF]"
                            : "border-[#E2E8F0] dark:border-[#1F2937] bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:border-[#4F46E5]"
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* IN TIME & OUT TIME (Rendered depending on Type) */}
              {(formdata.misspunchData?.Type == 1 ||
                formdata.misspunchData?.Type == 2 ||
                formdata.misspunchData?.Type == 3) && (
                <div className="grid grid-cols-2 gap-[11px]">
                  {(formdata.misspunchData?.Type == 1 || formdata.misspunchData?.Type == 3) && (
                    <label className={`flex flex-col gap-[5px] ${formdata.misspunchData?.Type == 1 ? "col-span-2" : "col-span-1"}`}>
                      <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase">
                        CORRECT IN TIME
                      </span>
                      <Einput
                        type="time"
                        title=""
                        name="In_Time"
                        value={formdata.misspunchData?.In_Time || ""}
                        handleInputChange={handleInputChange}
                        labelClassName="hidden"
                        className="!h-[38px] text-[12.5px] rounded-[9px] border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] w-full"
                      />
                    </label>
                  )}

                  {(formdata.misspunchData?.Type == 2 || formdata.misspunchData?.Type == 3) && (
                    <label className={`flex flex-col gap-[5px] ${formdata.misspunchData?.Type == 2 ? "col-span-2" : "col-span-1"}`}>
                      <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase">
                        CORRECT OUT TIME
                      </span>
                      <Einput
                        type="time"
                        title=""
                        name="Out_Time"
                        value={formdata.misspunchData?.Out_Time || ""}
                        handleInputChange={handleInputChange}
                        labelClassName="hidden"
                        className="!h-[38px] text-[12.5px] rounded-[9px] border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] w-full"
                      />
                    </label>
                  )}
                </div>
              )}

              {/* REASON Selection Field */}
              <label className="flex flex-col gap-[5px]">
                <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase">
                  REASON<span className="text-[#E11D48]"> *</span>
                </span>
                <Eselect
                  title=""
                  name="MP_Reason"
                  option={MPList.map((item: any) => ({
                    value: item.value,
                    label: item.label,
                  }))}
                  initialValue={formdata.misspunchData?.MP_Reason}
                  handleInputChange={handleInputChange}
                  placeholder="Select a reason"
                  required
                  labelClassName="hidden"
                  className="!h-[38px] text-[12.5px] rounded-[9px] border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] w-full"
                />
              </label>

              {/* REMARK Selection Field */}
              <label className="flex flex-col gap-[5px]">
                <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase">
                  REMARK
                </span>
                <Eselect
                  title=""
                  name="MP_Remark"
                  option={MPRemarksList.map((item: any) => ({
                    value: item.value,
                    label: item.label,
                  }))}
                  initialValue={formdata.misspunchData?.MP_Remark}
                  handleInputChange={handleInputChange}
                  placeholder="A line for your manager — what happened and where you were…"
                  labelClassName="hidden"
                  className="!h-[38px] text-[12.5px] rounded-[9px] border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] w-full"
                />
              </label>

              {/* SPECIAL REMARK (Shown when MP_Remark == 8) */}
              {showSpl_Remark && (
                <label className="flex flex-col gap-[5px]">
                  <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase">
                    ENTER MIS-PUNCH REMARK<span className="text-[#E11D48]"> *</span>
                  </span>
                  <Einput
                    type="text"
                    title=""
                    name="Spl_Remark"
                    value={formdata.misspunchData?.Spl_Remark || ""}
                    handleInputChange={handleInputChange}
                    placeholder="Provide detailed description..."
                    required
                    labelClassName="hidden"
                    className="!h-[38px] text-[12.5px] rounded-[9px] border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#0E1524] text-[#1E293B] dark:text-[#E7ECF3] w-full"
                  />
                </label>
              )}

              {/* ======================================================== */}
              {/* PROOF (OPTIONAL)                                         */}
              {/* ======================================================== */}
              <div>
                <span className="block text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase mb-[6px]">
                  PROOF (OPTIONAL)
                </span>

                {/* Upload proof cards */}
                {(compdata?.Disable_Gallary_option == null ||
                  Number(compdata?.Disable_Gallary_option) === 0) && (
                  <div className="grid grid-cols-2 gap-[10px]">
                    {/* Punch In / Gate Register upload */}
                    <label
                      className={`border border-dashed rounded-[10px] p-[16px_10px] cursor-pointer flex flex-col items-center gap-[7px] transition-colors ${
                        punchIn || imageSrc1
                          ? "border-[rgba(16,185,129,0.5)] bg-[rgba(16,185,129,0.06)]"
                          : "border-[#E2E8F0] dark:border-[#1F2937] bg-transparent hover:border-[#4F46E5] hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524]"
                      }`}
                    >
                      <span
                        className={`w-[30px] h-[30px] rounded-[9px] flex items-center justify-center ${
                          punchIn || imageSrc1
                            ? "bg-[rgba(16,185,129,0.15)] text-[#10B981]"
                            : "bg-[#F8FAFC] dark:bg-[#0E1524] text-[#64748B] dark:text-[#94A3B8]"
                        }`}
                      >
                        {punchIn || imageSrc1 ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </span>
                      <span
                        className={`text-[11.5px] font-[600] ${
                          punchIn || imageSrc1 ? "text-[#10B981]" : "text-[#64748B] dark:text-[#94A3B8]"
                        }`}
                      >
                        {punchIn || imageSrc1 ? "Gate register (Attached)" : "Gate register"}
                      </span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        className="hidden"
                        onChange={handleFileChange1}
                      />
                    </label>

                    {/* Punch Out / Approval Mail upload */}
                    <label
                      className={`border border-dashed rounded-[10px] p-[16px_10px] cursor-pointer flex flex-col items-center gap-[7px] transition-colors ${
                        punchOut || imageSrc
                          ? "border-[rgba(16,185,129,0.5)] bg-[rgba(16,185,129,0.06)]"
                          : "border-[#E2E8F0] dark:border-[#1F2937] bg-transparent hover:border-[#4F46E5] hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524]"
                      }`}
                    >
                      <span
                        className={`w-[30px] h-[30px] rounded-[9px] flex items-center justify-center ${
                          punchOut || imageSrc
                            ? "bg-[rgba(16,185,129,0.15)] text-[#10B981]"
                            : "bg-[#F8FAFC] dark:bg-[#0E1524] text-[#64748B] dark:text-[#94A3B8]"
                        }`}
                      >
                        {punchOut || imageSrc ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                      </span>
                      <span
                        className={`text-[11.5px] font-[600] ${
                          punchOut || imageSrc ? "text-[#10B981]" : "text-[#64748B] dark:text-[#94A3B8]"
                        }`}
                      >
                        {punchOut || imageSrc ? "Approval mail (Attached)" : "Approval mail"}
                      </span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>
                )}

                {/* Live Camera Stream */}
                {formdata.misspunchData?.Type !== null && (
                  <div className="mt-3 p-3 rounded-[10px] border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0E1524] space-y-2">
                    <div className="relative h-40 w-full rounded-[8px] overflow-hidden bg-black flex items-center justify-center">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <AButton
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleCapture}
                        icon={<MdCameraAlt size={16} />}
                        className="flex-1 !h-[34px] text-[12px] font-[600] !rounded-[8px] !bg-[#4F46E5]"
                      >
                        Capture photo
                      </AButton>
                      <AButton
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCameraToggle}
                        icon={<MdFlipCameraIos size={16} />}
                        className="!h-[34px] px-3 text-[12px] font-[600] !rounded-[8px]"
                      >
                        Flip
                      </AButton>
                    </div>
                  </div>
                )}
              </div>

              {/* Generate Request Button */}
              <button
                type="button"
                onClick={submitbtn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 border border-transparent bg-[#4F46E5] hover:bg-[#4338CA] text-white font-inherit text-[13px] font-[600] py-[11px] px-[14px] rounded-[10px] cursor-pointer shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] hover:brightness-105 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>Generate request</span>
              </button>

              {/* Blocker Alert Box matching HTML design */}
              <div className="flex items-start gap-[9px] text-[11.5px] text-[#B45309] bg-[rgba(245,158,11,0.09)] border border-[rgba(245,158,11,0.3)] rounded-[9px] p-[9px_11px]">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#B45309] mt-0.5" />
                <span className="flex-1 min-w-0 leading-[1.5]">
                  Pick the date the punch went wrong.
                </span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT AREA: 4 KPI CARDS + MY REQUESTS TABLE               */}
          {/* ======================================================== */}
          <div className="flex flex-col gap-[14px]">
            {/* Top 4 KPI Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
              {/* Card 1: PENDING */}
              <div className="bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] p-[14px_16px]">
                <div className="flex items-center gap-[8px]">
                  <span className="w-[24px] h-[24px] rounded-[7px] flex items-center justify-center bg-[#F59E0B]/[0.12] text-[#F59E0B]">
                    <Clock className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase">
                    PENDING
                  </span>
                </div>
                <div className="text-[22px] font-[650] tracking-[-0.02em] font-mono tabular-nums mt-[9px] text-[#1E293B] dark:text-[#E7ECF3]">
                  {stats.pending}
                </div>
              </div>

              {/* Card 2: APPROVED */}
              <div className="bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] p-[14px_16px]">
                <div className="flex items-center gap-[8px]">
                  <span className="w-[24px] h-[24px] rounded-[7px] flex items-center justify-center bg-[#10B981]/[0.12] text-[#10B981]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase">
                    APPROVED
                  </span>
                </div>
                <div className="text-[22px] font-[650] tracking-[-0.02em] font-mono tabular-nums mt-[9px] text-[#1E293B] dark:text-[#E7ECF3]">
                  {stats.approved}
                </div>
              </div>

              {/* Card 3: REJECTED */}
              <div className="bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] p-[14px_16px]">
                <div className="flex items-center gap-[8px]">
                  <span className="w-[24px] h-[24px] rounded-[7px] flex items-center justify-center bg-[#E11D48]/[0.12] text-[#E11D48]">
                    <XCircle className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase">
                    REJECTED
                  </span>
                </div>
                <div className="text-[22px] font-[650] tracking-[-0.02em] font-mono tabular-nums mt-[9px] text-[#1E293B] dark:text-[#E7ECF3]">
                  {stats.rejected}
                </div>
              </div>

              {/* Card 4: QUOTA LEFT */}
              <div className="bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] p-[14px_16px]">
                <div className="flex items-center gap-[8px]">
                  <span className="w-[24px] h-[24px] rounded-[7px] flex items-center justify-center bg-[#4F46E5]/[0.12] text-[#4F46E5]">
                    <Layers className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase">
                    QUOTA LEFT
                  </span>
                </div>
                <div className="text-[22px] font-[650] tracking-[-0.02em] font-mono tabular-nums mt-[9px] text-[#1E293B] dark:text-[#E7ECF3]">
                  {stats.quotaDisplay}
                </div>
              </div>
            </div>

            {/* Table Container with Filter Bar on Top */}
            <div className="bg-[#FFFFFF] dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] overflow-hidden">
              {/* Header: "My requests", count badge, Date Filters, Export */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[10px] p-[13px_18px] border-b border-[#E2E8F0] dark:border-[#1F2937]">
                <div className="flex items-center gap-[10px]">
                  <h2 className="m-0 text-[14px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
                    My requests
                  </h2>
                  <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
                    {tabledata.length} in this period
                  </span>
                </div>

                {/* Filters & View Mode */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-[148px]">
                    <Einput
                      type="date"
                      title=""
                      name="FROMDATE"
                      value={FROMDATE}
                      handleInputChange={(_, val) => setFromDate(val)}
                      labelClassName="hidden"
                      className="!h-[32px] w-full rounded-[9px] border-[#E2E8F0] dark:border-[#1F2937] text-[12px] px-2.5"
                    />
                  </div>

                  <div className="w-[148px]">
                    <Einput
                      type="date"
                      title=""
                      name="TODATE"
                      value={TODATE}
                      handleInputChange={(_, val) => setToDate(val)}
                      labelClassName="hidden"
                      className="!h-[32px] w-full rounded-[9px] border-[#E2E8F0] dark:border-[#1F2937] text-[12px] px-2.5"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={employeeview}
                    className="inline-flex items-center gap-1.5 border border-[#E2E8F0] dark:border-[#1F2937] rounded-[8px] bg-transparent text-[#1E293B] dark:text-[#E7ECF3] text-[12px] font-[550] px-3 py-1.5 cursor-pointer hover:bg-[#F1F5F9] dark:hover:bg-[#182235] transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Filter</span>
                  </button>

                  {/* View Mode Toggle: Table / Card */}
                
                </div>
              </div>

              {/* View Body: ReactTable or CardView */}
              {viewMode === "table" ? (
                <div className="p-2">
                  <ReactTable
                    columns={columns}
                    data={tabledata}
                    showColumnFilters={true}
                    height={460}
                    showTopSearch={true}
                    showPageSizeInFooter={true}
                    showExcelExport={true}
                  />
                </div>
              ) : (
                <div className="p-3">
                  <CardView
                    data={tabledata}
                    onCardDoubleClick={handleTableClick}
                    totalCount={tabledata.length}
                    isLoading={isLoading}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Loading Overlay */}
      <HashloaderComponent isLoading={isLoading} />

      {/* ======================================================== */}
      {/* DIALOG: MIS-PUNCH ROW DETAILS (On Row Double Click)       */}
      {/* ======================================================== */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[16px] p-6 border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between mb-2">
              {/* 3-Dot Status Indicators */}
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((dot, index) => (
                  <span
                    key={index}
                    title={`Approval Step ${index + 1}`}
                    className={`w-3.5 h-3.5 rounded-full ${getDotColor(
                      index,
                      MissPunchData.stat,
                      MissPunchData.Man_Rej
                    )}`}
                  />
                ))}
              </div>
            </div>
            <DialogTitle className="text-[17px] font-[650] text-[#1E293B] dark:text-[#E7ECF3]">
              {MissPunchData.EmpName ? `${MissPunchData.EmpName}'s Details` : "Mis-punch Details"}
            </DialogTitle>
            <DialogDescription className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
              Review employee punch record, timestamps, remarks, and attached proofs.
            </DialogDescription>
          </DialogHeader>

          {/* Details Grid */}
          <div className="mt-4 p-4 rounded-[12px] bg-[#F8FAFC] dark:bg-[#0E1524] border border-[#E2E8F0] dark:border-[#1F2937] grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12.5px]">
            <div className="flex justify-between py-1 border-b border-[#E2E8F0] dark:border-[#1F2937]">
              <span className="text-[#64748B] dark:text-[#94A3B8] font-medium">Date:</span>
              <span className="font-[600] text-[#1E293B] dark:text-[#E7ECF3]">{formatDate(MissPunchData.Date)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E2E8F0] dark:border-[#1F2937]">
              <span className="text-[#64748B] dark:text-[#94A3B8] font-medium">Employee Code:</span>
              <span className="font-[600] text-[#1E293B] dark:text-[#E7ECF3]">{MissPunchData.EmpCode || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E2E8F0] dark:border-[#1F2937]">
              <span className="text-[#64748B] dark:text-[#94A3B8] font-medium">Employee Name:</span>
              <span className="font-[600] text-[#1E293B] dark:text-[#E7ECF3]">{MissPunchData.EmpName || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E2E8F0] dark:border-[#1F2937]">
              <span className="text-[#64748B] dark:text-[#94A3B8] font-medium">Designation:</span>
              <span className="font-[600] text-[#1E293B] dark:text-[#E7ECF3]">{MissPunchData.EmployeeDesignation || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E2E8F0] dark:border-[#1F2937]">
              <span className="text-[#64748B] dark:text-[#94A3B8] font-medium">In Time:</span>
              <span className="font-[600] text-[#10B981]">{MissPunchData.In1 || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E2E8F0] dark:border-[#1F2937]">
              <span className="text-[#64748B] dark:text-[#94A3B8] font-medium">Out Time:</span>
              <span className="font-[600] text-[#E11D48]">{MissPunchData.Out1 || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E2E8F0] dark:border-[#1F2937]">
              <span className="text-[#64748B] dark:text-[#94A3B8] font-medium">Actual In:</span>
              <span className="font-[600] text-[#1E293B] dark:text-[#E7ECF3]">{MissPunchData.Actual_In || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E2E8F0] dark:border-[#1F2937]">
              <span className="text-[#64748B] dark:text-[#94A3B8] font-medium">Actual Out:</span>
              <span className="font-[600] text-[#1E293B] dark:text-[#E7ECF3]">{MissPunchData.Actual_Out || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E2E8F0] dark:border-[#1F2937]">
              <span className="text-[#64748B] dark:text-[#94A3B8] font-medium">Mis-punch Reason:</span>
              <span className="font-[600] text-[#1E293B] dark:text-[#E7ECF3]">{MissPunchData.Mipunch_Reason || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E2E8F0] dark:border-[#1F2937]">
              <span className="text-[#64748B] dark:text-[#94A3B8] font-medium">Mis-punch Remark:</span>
              <span className="font-[600] text-[#1E293B] dark:text-[#E7ECF3]">{MissPunchData.MI_Remark || "—"}</span>
            </div>
            {MissPunchData.Spl_Remark && (
              <div className="flex justify-between py-1 border-b border-[#E2E8F0] dark:border-[#1F2937] sm:col-span-2">
                <span className="text-[#64748B] dark:text-[#94A3B8] font-medium">Special Remark:</span>
                <span className="font-[600] text-[#1E293B] dark:text-[#E7ECF3]">{MissPunchData.Spl_Remark}</span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-[#E2E8F0] dark:border-[#1F2937]">
              <span className="text-[#64748B] dark:text-[#94A3B8] font-medium">Head Remark By:</span>
              <span className="font-[600] text-[#1E293B] dark:text-[#E7ECF3]">{MissPunchData.head_remark_by || "—"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E2E8F0] dark:border-[#1F2937]">
              <span className="text-[#64748B] dark:text-[#94A3B8] font-medium">Head Remark:</span>
              <span className="font-[600] text-[#1E293B] dark:text-[#E7ECF3]">{MissPunchData.head_remark || "—"}</span>
            </div>
          </div>

          {/* Punch Images Section with FileViewer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            {/* Punch In Image */}
            <div className="flex flex-col items-center p-4 rounded-[12px] border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0E1524]">
              <span className="text-[11px] font-[600] uppercase tracking-[0.03em] text-[#10B981] mb-2">
                Punch In Image
              </span>
              <div className="h-44 w-full flex items-center justify-center bg-white dark:bg-[#111827] rounded-[9px] border border-[#E2E8F0] dark:border-[#1F2937] overflow-hidden relative">
                {MissPunchData?.fileIn && getImageUrl(MissPunchData.fileIn) ? (
                  <img
                    src={getImageUrl(MissPunchData.fileIn)}
                    alt="Punch In"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                ) : null}
                <FaImage
                  className={`w-14 h-14 text-[#E2E8F0] dark:text-[#1F2937] ${
                    MissPunchData?.fileIn && getImageUrl(MissPunchData.fileIn) ? "hidden" : "block"
                  }`}
                />
              </div>
              <div className="mt-2 font-medium">
                <FileViewer fileLink={getImageUrl(MissPunchData?.fileIn)} celldata="" />
              </div>
            </div>

            {/* Punch Out Image */}
            <div className="flex flex-col items-center p-4 rounded-[12px] border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0E1524]">
              <span className="text-[11px] font-[600] uppercase tracking-[0.03em] text-[#E11D48] mb-2">
                Punch Out Image
              </span>
              <div className="h-44 w-full flex items-center justify-center bg-white dark:bg-[#111827] rounded-[9px] border border-[#E2E8F0] dark:border-[#1F2937] overflow-hidden relative">
                {MissPunchData?.fileOut && getImageUrl(MissPunchData.fileOut) ? (
                  <img
                    src={getImageUrl(MissPunchData.fileOut)}
                    alt="Punch Out"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                ) : null}
                <FaImage
                  className={`w-14 h-14 text-[#E2E8F0] dark:text-[#1F2937] ${
                    MissPunchData?.fileOut && getImageUrl(MissPunchData.fileOut) ? "hidden" : "block"
                  }`}
                />
              </div>
              <div className="mt-2 font-medium">
                <FileViewer fileLink={getImageUrl(MissPunchData?.fileOut)} celldata="" />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: APPROVER HIERARCHY LIST MODAL                     */}
      {/* ======================================================== */}
      <Dialog open={isModalVisible1} onOpenChange={setIsModalVisible1}>
        <DialogContent className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-[16px] p-6 border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-[650] text-[#1E293B] dark:text-[#E7ECF3]">
              Approver List
            </DialogTitle>
            <DialogDescription className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
              Approval matrix configured for mispunch requests.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {apprData.length === 0 ? (
              <div className="text-center text-[#64748B] dark:text-[#94A3B8] py-10 text-[13px]">
                No Approver Found
              </div>
            ) : (
              <>
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto rounded-[10px] border border-[#E2E8F0] dark:border-[#1F2937]">
                  <table className="w-full text-left text-[12px]">
                    <thead>
                      <tr className="bg-[#F8FAFC] dark:bg-[#0E1524] border-b border-[#E2E8F0] dark:border-[#1F2937] text-[#64748B] dark:text-[#94A3B8] font-[700] uppercase tracking-[0.05em] text-[10.5px]">
                        <th className="p-3">Approver 1A</th>
                        <th className="p-3">Approver 1B</th>
                        <th className="p-3">Approver 2A</th>
                        <th className="p-3">Approver 2B</th>
                        <th className="p-3">Approver 3A</th>
                        <th className="p-3">Approver 3B</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1F2937] text-[#1E293B] dark:text-[#E7ECF3]">
                      {apprData.map((item, index) => (
                        <tr key={index} className="hover:bg-[#F8FAFC] dark:hover:bg-[#0E1524] transition-colors">
                          <td className="p-3 capitalize">{item.approver1_A || "—"}</td>
                          <td className="p-3 capitalize">{item.approver1_B || "—"}</td>
                          <td className="p-3 capitalize">{item.approver2_A || "—"}</td>
                          <td className="p-3 capitalize">{item.approver2_B || "—"}</td>
                          <td className="p-3 capitalize">{item.approver3_A || "—"}</td>
                          <td className="p-3 capitalize">{item.approver3_B || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden space-y-3">
                  {apprData.map((item, index) => (
                    <div
                      key={index}
                      className="p-3.5 rounded-[10px] border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#0E1524] space-y-2 text-[12px]"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="font-[600] text-[#64748B]">Approver 1A: </span>
                          <span className="font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                            {item.approver1_A || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="font-[600] text-[#64748B]">Approver 1B: </span>
                          <span className="font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                            {item.approver1_B || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="font-[600] text-[#64748B]">Approver 2A: </span>
                          <span className="font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                            {item.approver2_A || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="font-[600] text-[#64748B]">Approver 2B: </span>
                          <span className="font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                            {item.approver2_B || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="font-[600] text-[#64748B]">Approver 3A: </span>
                          <span className="font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                            {item.approver3_A || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="font-[600] text-[#64748B]">Approver 3B: </span>
                          <span className="font-medium text-[#1E293B] dark:text-[#E7ECF3]">
                            {item.approver3_B || "—"}
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
    </div>
  );
}
