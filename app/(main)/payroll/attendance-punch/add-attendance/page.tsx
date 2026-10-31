"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Swal from "sweetalert2";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useDateRange } from "@/app/hooks/use-date-range";
import useExcelDownload from "@/app/hooks/excel-download";

import ServiceTablePagination from "@/components/Templates/reacttable";
import Einput from "@/components/atoms/Einput";
import AButton from "@/components/atoms/Button";
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
  Camera,
  CameraOff,
  MapPin,
  LogIn,
  LogOut,
  Download,
  ListChecks,
  Info,
  X,
  Check,
  ArrowRight,
} from "lucide-react";
import { MdFlipCameraIos } from "react-icons/md";
import { FaImage } from "react-icons/fa";
import { GoX } from "react-icons/go";

export default function Addattendance() {
  const router = useRouter();
  const user = useCurrentUser();
  const globalDateRange = useDateRange();
  const {  handleExcelDownload } = useExcelDownload();

  function showSideAlert(message: any, type: any) {
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

  // --- Real-time Clock ---
  const [now, setNow] = useState<Date>(new Date());
  const [dateTime, setDateTime] = useState({
    date: "",
    time: "",
    day: "",
  });

  useEffect(() => {
    const updateDateTime = () => {
      const current = new Date();
      setNow(current);
      const options = { weekday: "long" } as const;
      const day = new Intl.DateTimeFormat("en-US", options).format(current);
      const formattedDate = current.toISOString().split("T")[0];

      setDateTime({
        date: formattedDate,
        time: current.toLocaleTimeString(),
        day: day,
      });
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- States ---
  const [flag, setFlag] = useState(0);
  const [punchData, setPunchData] = useState<any>({
    In_Add: "",
    Out_Add: "",
    App_In1: null,
    App_Out1: null,
  });

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [showCaptureButton, setShowCaptureButton] = useState(false);
  const [GoXButton, setGoX] = useState(false);
  const [isOpenCameraDisabledIN, setIsOpenCameraDisabledIN] = useState(false);
  const [isOpenCameraDisabledOUT, setIsOpenCameraDisabledOUT] = useState(false);
  const [ShowSave, setShowSave] = useState(true);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [model, setModel] = useState<any>({});
  const [tabledata, setTabledata] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "APPROVED">("ALL");

  const [isLoading, setIsLoading] = useState(false);
  const [useFrontCamera, setUseFrontCamera] = useState(true);
  const [apprData, setApprData] = useState<any[]>([]);
  const [isModalVisible1, setIsModalVisible1] = useState(false);

  // --- Date Range Helper ---
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

  const todayOneMonthBackDate = getCurrentDate(1);
  const [dates, setDates] = useState({
    DATE_FROM: globalDateRange?.DATE_FROM || todayOneMonthBackDate,
    DATE_TO: globalDateRange?.DATE_TO || getCurrentDate(),
    head_remark: "",
  });

  const handleDateChange = (name: string, value: any) => {
    setDates((prevData) => ({
      ...prevData,
      [name]: value || "",
    }));
  };

  // --- Ref to prevent duplicate API hits on tab switch / window focus ---
  const hasFetchedInitialData = useRef(false);
  const lastFetchedEmpCode = useRef("");

  // --- Initial Data Fetching ---
  useEffect(() => {
    if (!user?.EMPCODE) return;

    if (hasFetchedInitialData.current && lastFetchedEmpCode.current === user.EMPCODE) {
      return;
    }

    hasFetchedInitialData.current = true;
    lastFetchedEmpCode.current = user.EMPCODE;

    fetchPunchData();
    showDataOFAPPRVL();
    showdata();
  }, [user?.EMPCODE]);

  const showDataOFAPPRVL = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/GetApprList`,
        {
          params: {
            Empcode: user?.EMPCODE,
            module: "attdence",
            isPayroll: 1,
          },
          headers: {
            compcode: user?.Comp_Code,
          },
        }
      );
      setApprData(response.data?.Result || []);
    } catch (error) {
      console.error("Error fetching approval list:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPunchData = async () => {
    setIsLoading(true);
    try {
      const result = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/getPunchingInfo`,
        {
          params: {
            EMPCODE: user?.EMPCODE,
          },
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      const pData = result?.data?.Result?.[0];
      if (pData) {
        setPunchData(pData);
        setIsOpenCameraDisabledIN(
          pData.In_Add !== undefined && pData.In_Add !== null && pData.In_Add !== ""
        );
        setIsOpenCameraDisabledOUT(
          pData.Out_Add !== undefined && pData.Out_Add !== null && pData.Out_Add !== ""
        );
      }
    } catch (error) {
      console.error("Error fetching punch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAddress = async (latitude: any, longitude: any) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse`,
        {
          params: {
            lat: latitude,
            lon: longitude,
            format: "json",
          },
        }
      );
      return response.data?.display_name;
    } catch (error) {
      console.error("Error fetching address:", error);
      return null;
    }
  };

  const showdata = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/getPendingAppList`,
        {
          params: {
            Comp_Code: user?.Comp_Code,
            name: user?.name,
            EMPCODE: user?.EMPCODE,
            StartDate: dates.DATE_FROM,
            EndDate: dates.DATE_TO,
          },
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );
      const res = response.data?.Result || [];
      setTabledata(res);
      setFilteredData(res);
    } catch (error) {
      console.error("Error fetching punch history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilter = () => {
    setIsLoading(true);
    const from = new Date(dates.DATE_FROM).getTime();
    const to = new Date(dates.DATE_TO).getTime();

    if (from && to) {
      const result = tabledata.filter((item) => {
        const itemDate = new Date(item.Date).getTime();
        return itemDate >= from && itemDate <= to;
      });
      setFilteredData(result);
    } else {
      setFilteredData(tabledata);
    }
    setIsLoading(false);
  };

  // --- Camera & Location Handlers ---
  const AddpunchIn = () => {
    setFlag(1);
    openCamera();
  };

  const AddpunchOut = () => {
    setFlag(2);
    openCamera();
  };

  const openCamera = async () => {
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const address = await fetchAddress(latitude, longitude);
            setLocation(address || `Lat: ${latitude}, Lon: ${longitude}`);

            const response = await axios.get(
              `${process.env.NEXT_PUBLIC_URL}/mobile/checkLocationInOut`,
              {
                params: {
                  Latitude: latitude,
                  Longitude: longitude,
                  EMPCODE: user?.EMPCODE,
                },
                headers: {
                  compcode: user?.Comp_Code,
                  name: user?.name,
                },
              }
            );

            if (response.data?.Result?.[0]?.Result == 1) {
              const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                  facingMode: useFrontCamera
                    ? "user"
                    : { exact: "environment" },
                },
              });
              setVideoStream(stream);
              if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                setShowCaptureButton(true);
              }
            } else if (response.data?.Result?.[0]?.Result == "0") {
              Swal.fire({
                icon: "error",
                title: "Error!",
                text: `You are outside the Area,please try from geo location`,
              });
            } else if (response.data?.Result?.[0]?.Result) {
              Swal.fire({
                icon: "error",
                title: "Error!",
                text: `${response.data.Result[0]?.Result}`,
              });
            }
          },
          (error) => {
            if (error.code === error.PERMISSION_DENIED) {
              showSideAlert("Please enable GPS & camera permissions.", "error");
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              showSideAlert(
                "GPS is unavailable. Please check your settings.",
                "error"
              );
            } else {
              showSideAlert(
                "An unknown error occurred while accessing GPS.",
                "error"
              );
            }
            setLocation(null);
          }
        );
      }
    } catch (error) {
      console.error("Error accessing camera or checking location:", error);
    }
  };

  const captureImage = async () => {
    try {
      if (videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (context) {
          canvas.width = videoRef.current.videoWidth || 640;
          canvas.height = videoRef.current.videoHeight || 480;
          context.drawImage(
            videoRef.current,
            0,
            0,
            canvas.width,
            canvas.height
          );

          if (location) {
            context.font = "20px Arial";
            context.fillStyle = "red";
            context.textBaseline = "bottom";

            const maxWidth = canvas.width - 20;
            const lineHeight = 28;
            const y = 15;
            const x = canvas.height - 15;
            wrapText(context, location, x, y, maxWidth, lineHeight);
          }
          const dataUrl = canvas.toDataURL("image/png");
          setImageSrc(dataUrl);
          videoStream?.getTracks().forEach((track) => track.stop());
          setVideoStream(null);
          setShowCaptureButton(false);
          setShowSave(false);
          setGoX(true);
        }
      }
    } catch (error) {
      console.error("Error capturing image:", error);
    }
  };

  const wrapText = (
    context: any,
    text: any,
    x: any,
    y: any,
    maxWidth: any,
    lineHeight: any
  ) => {
    const words = text.split(" ");
    let line = "";
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = context.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        context.fillText(line, y, x);
        line = words[n] + " ";
        x -= lineHeight;
      } else {
        line = testLine;
      }
    }
    context.fillText(line, y, x);
  };

  const toggleCamera = () => {
    setUseFrontCamera((prevState) => !prevState);
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
    }
    openCamera();
  };

  const cancealImage = () => {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }
    setImageSrc(null);
    setGoX(false);
    setShowCaptureButton(false);
    setShowSave(true);
  };

  const AddpunchInOut = async () => {
    if (imageSrc == null) {
      showSideAlert("Please Upload Correctly Image...", "warning");
      return;
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const updatePunchInResponse = await axios.get(
              `${process.env.NEXT_PUBLIC_URL}/mobile/${
                flag == 1 ? "AddPunchIN" : flag == 2 ? "AddPunchOUT" : ""
              }`,
              {
                params: {
                  empCode: user?.EMPCODE,
                  date: dateTime.date,
                  time: dateTime.time,
                  latitude: latitude,
                  longitude: longitude,
                  in_address: location,
                  out_address: location,
                },
                headers: {
                  compcode: user?.Comp_Code,
                  name: user?.name,
                },
              }
            );

            Swal.fire({
              icon: updatePunchInResponse.data.Status === true ? "success" : "info",
              title: updatePunchInResponse.data.Status === true ? "Success!" : "Info",
              text: updatePunchInResponse.data.Message,
            });

            if (flag === 1) setIsOpenCameraDisabledIN(true);
            if (flag === 2) setIsOpenCameraDisabledOUT(true);

            await uploadAttendance();
            fetchPunchData();
            showdata();
            setImageSrc(null);
            setGoX(false);
            setShowSave(true);
          } catch (error) {
            console.error("Error during Punch In/Out:", error);
          }
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            showSideAlert("Please enable GPS to submit attendance.", "error");
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            showSideAlert("GPS is unavailable. Please check your settings.", "error");
          } else {
            showSideAlert("An unknown error occurred while accessing GPS.", "error");
          }
        }
      );
    }
  };

  const uploadAttendance = async () => {
    try {
      const formData = new FormData();
      formData.append("empCode", user?.EMPCODE || "");
      if (flag == 1 && imageSrc) {
        const blob = await fetch(imageSrc).then((res) => res.blob());
        formData.append("punchIn", blob, "attendance.png");
      } else if (flag == 2 && imageSrc) {
        const blob = await fetch(imageSrc).then((res) => res.blob());
        formData.append("punchOut", blob, "attendance.png");
      }
      await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/mobile/uploadAttendance`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  // --- Formatting Helpers ---
  function formatTimeToHHMM(time?: string): string {
    if (!time) return "--:--";
    const [hoursStr, minutesStr] = time.split(":");
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    if (isNaN(hours) || isNaN(minutes)) return time;

    let period = "AM";
    let formattedHours = hours;

    if (hours === 0) {
      formattedHours = 12;
    } else if (hours >= 12) {
      period = "PM";
      if (hours > 12) {
        formattedHours = hours - 12;
      }
    }

    const formattedMinutes = minutes.toString().padStart(2, "0");
    return `${formattedHours}:${formattedMinutes} ${period}`;
  }

  function formatDateTime(dateTimeStr: string): string {
    if (!dateTimeStr || dateTimeStr === "1970-01-01 00:00:00.000") return "N/A";
    const parts = dateTimeStr.split(" ");
    const datePart = parts[0];
    const timePart = parts[1];
    if (!datePart) return "N/A";

    const [year, month, day] = datePart.split("-");
    const formattedDate = `${day}-${month}-${year}`;
    const formattedTime = timePart ? formatTimeToHHMM(timePart) : "";

    return `${formattedDate} ${formattedTime}`.trim();
  }

  const getDisplayPunchTime = (punchDateStr?: string) => {
    if (!punchDateStr || punchDateStr.includes("1970-01-01")) return "--:--";
    const timePart = punchDateStr.split(" ")[1];
    if (!timePart) return "--:--";
    const [hh, mm] = timePart.split(":");
    return `${hh}:${mm}`;
  };

  const getWorkedDuration = () => {
    if (!punchData?.App_In1?.date || punchData.App_In1.date.includes("1970-01-01")) {
      return { text: "0h 0m", percent: 0 };
    }
    const inDate = new Date(punchData.App_In1.date.replace(" ", "T"));
    const inTime = isNaN(inDate.getTime()) ? 0 : inDate.getTime();
    if (!inTime) return { text: "0h 0m", percent: 0 };

    let outTime = Date.now();
    if (punchData?.App_Out1?.date && !punchData.App_Out1.date.includes("1970-01-01")) {
      const outDate = new Date(punchData.App_Out1.date.replace(" ", "T"));
      if (!isNaN(outDate.getTime())) {
        outTime = outDate.getTime();
      }
    }

    const diffMs = Math.max(0, outTime - inTime);
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const percent = Math.min(100, Math.round((diffMs / (9 * 60 * 60 * 1000)) * 100));

    return {
      text: `${hours}h ${minutes}m`,
      percent: Math.max(percent, 8),
    };
  };

  const worked = getWorkedDuration();

  // --- Status & Dot Logic ---
  const getDotColor = (index: number, stat: any, isLastDotRed: any) => {
    if (stat == 4) {
      return isLastDotRed == "Y" ? "bg-red-500" : "bg-emerald-500";
    }
    if (index < stat - 1) {
      return "bg-emerald-500";
    }
    return "bg-amber-400";
  };

  const getStatusBadge = (stat: any, manRej: any, atnStatus?: string) => {
    if (manRej === "Y" || stat === "R" || atnStatus?.toLowerCase().includes("rej")) {
      return {
        label: "Rejected",
        dot: "bg-[#E11D48]",
        pill: "bg-[#E11D48]/10 text-[#E11D48] border-[#E11D48]/35",
      };
    }
    if (stat == 4 || atnStatus?.toLowerCase().includes("appr")) {
      return {
        label: "Approved",
        dot: "bg-[#10B981]",
        pill: "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/35",
      };
    }
    return {
      label: "Pending",
      dot: "bg-[#F59E0B]",
      pill: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/35",
    };
  };

  // --- Table Columns matching user's original logic & screenshot ---
  const columns = useMemo(
    () => [
      {
        Header: "STATUS",
        accessor: "stat",
        Cell: ({ row }: any) => {
          const badge = getStatusBadge(
            row.original.stat,
            row.original.Man_Rej,
            row.original.AtnStatus
          );
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${badge.pill} whitespace-nowrap`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              <span>{badge.label}</span>
            </span>
          );
        },
      },
      {
        Header: "EMP CODE",
        accessor: "EmpCode",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-normal text-[#64748B] dark:text-[#94A3B8] tabular-nums">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: "EmpName",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[550] text-[#1E293B] dark:text-[#E7ECF3] truncate block">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "DESIGNATION",
        accessor: "EmployeeDesignation",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-normal text-[#64748B] dark:text-[#94A3B8] truncate block">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "IN TIME",
        accessor: "In1",
        Cell: ({ value }: any) => (
          <span
            className={`text-[12.5px] font-normal tabular-nums ${
              value ? "text-[#1E293B] dark:text-[#E7ECF3]" : "text-[#E11D48]"
            }`}
          >
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "OUT TIME",
        accessor: "Out1",
        Cell: ({ value }: any) => (
          <span
            className={`text-[12.5px] font-normal tabular-nums ${
              value ? "text-[#1E293B] dark:text-[#E7ECF3]" : "text-[#E11D48]"
            }`}
          >
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "DATE",
        accessor: "Date",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-normal text-[#64748B] dark:text-[#94A3B8] tabular-nums whitespace-nowrap">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "REASON",
        accessor: "Mipunch_Reason",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-normal text-[#64748B] dark:text-[#94A3B8]">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "REMARK",
        accessor: "MI_Remark",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-normal text-[#64748B] dark:text-[#94A3B8]">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "HEAD NAME",
        accessor: "head_remark_by",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-normal text-[#64748B] dark:text-[#94A3B8]">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "HEAD REMARK",
        accessor: "head_remark",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-normal text-[#64748B] dark:text-[#94A3B8]">
            {value || "—"}
          </span>
        ),
      },
    ],
    []
  );

  const columnsDownload = useMemo(
    () => [
      { Header: "Status", accessor: "AtnStatus" },
      { Header: "Emp Code", accessor: "EmpCode" },
      { Header: "Emp Name", accessor: "EmpName" },
      { Header: "Designation", accessor: "EmployeeDesignation" },
      { Header: "In Time", accessor: "In1" },
      { Header: "Out Time", accessor: "Out1" },
      { Header: "Date", accessor: "Date" },
      { Header: "Reason", accessor: "Mipunch_Reason" },
      { Header: "Remark", accessor: "MI_Remark" },
      { Header: "Head Name", accessor: "head_remark_by" },
      { Header: "Head Remark", accessor: "head_remark" },
    ],
    []
  );

  // --- Counts & Filtered Rows for Tabs ---
  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    (tabledata || []).forEach((item: any) => {
      const isRej =
        item.Man_Rej === "Y" ||
        item.stat === "R" ||
        item.AtnStatus?.toLowerCase().includes("rej");
      const isAppr =
        !isRej &&
        (item.stat == 4 || item.AtnStatus?.toLowerCase().includes("appr"));
      if (isAppr) approved++;
      else if (!isRej) pending++;
    });
    return {
      all: tabledata?.length || 0,
      pending,
      approved,
    };
  }, [tabledata]);

  const displayData = useMemo(() => {
    let base = filteredData?.length > 0 ? filteredData : tabledata || [];
    if (activeTab === "PENDING") {
      base = base.filter((item: any) => {
        const isRej =
          item.Man_Rej === "Y" ||
          item.stat === "R" ||
          item.AtnStatus?.toLowerCase().includes("rej");
        return (
          !isRej &&
          item.stat != 4 &&
          !item.AtnStatus?.toLowerCase().includes("appr")
        );
      });
    } else if (activeTab === "APPROVED") {
      base = base.filter((item: any) => {
        const isRej =
          item.Man_Rej === "Y" ||
          item.stat === "R" ||
          item.AtnStatus?.toLowerCase().includes("rej");
        return (
          !isRej &&
          (item.stat == 4 || item.AtnStatus?.toLowerCase().includes("appr"))
        );
      });
    }
    return base;
  }, [filteredData, tabledata, activeTab]);

  const handleExportData = () => {
    handleExcelDownload(columnsDownload, displayData);
  };

  const onRowDoubleClick = (rowData: any) => {
    setModel(rowData);
    setIsModalVisible(true);
  };

  const handleSelectApprover = (item: any) => {
    setIsModalVisible1(false);
  };

  const dayName = now
    .toLocaleDateString("en-US", { weekday: "long" })
    .toUpperCase();
  const timeFormatted = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const dateFormatted = `${now.getDate()} ${now.toLocaleDateString("en-US", {
    month: "long",
  })} ${now.getFullYear()} · shift 09:00 – 18:00`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] font-sans p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 overflow-x-hidden w-full max-w-full">
      <div className="grid grid-cols-1 lg:grid-cols-[392px_minmax(0,1fr)] gap-3.5 items-start">
        {/* ================= LEFT COLUMN ================= */}
        <div className="space-y-3">
          {/* Card 1: Clock, Shift, In/Out actions, Location, Worked so far */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] p-5 pb-[22px]">
            <div>
              <div className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase">
                {dayName}
              </div>
              <div className="text-[30px] font-[650] tracking-[-0.03em] mt-1 tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                {timeFormatted}
              </div>
              <div className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                {dateFormatted}
              </div>
            </div>

            {/* Punch In / Out Cards */}
            <div className="grid grid-cols-2 gap-2.5 mt-4.5">
              {/* Punch in */}
              <button
                type="button"
                onClick={AddpunchIn}
                disabled={isOpenCameraDisabledIN}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-center select-none ${
                  isOpenCameraDisabledIN
                    ? "bg-[#10B981]/10 border-[#10B981]/45 text-[#10B981] dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-400 cursor-not-allowed"
                    : "bg-[#10B981] text-white border-transparent hover:brightness-105 cursor-pointer shadow-xs active:scale-[0.99]"
                }`}
              >
                <LogIn className="w-5 h-5 mb-1.5" />
                <span className="text-[13px] font-[650]">
                  Punch in
                </span>
                <span className="text-[11px] opacity-85 font-medium tabular-nums mt-0.5">
                  {punchData?.App_In1?.date
                    ? getDisplayPunchTime(punchData.App_In1.date)
                    : isOpenCameraDisabledIN
                    ? "punched"
                    : "not punched"}
                </span>
              </button>

              {/* Punch out */}
              <button
                type="button"
                onClick={AddpunchOut}
                disabled={isOpenCameraDisabledOUT}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all text-center select-none ${
                  isOpenCameraDisabledOUT
                    ? "bg-[#E11D48]/10 border-[#E11D48]/45 text-[#E11D48] dark:bg-rose-950/20 dark:border-rose-800/40 dark:text-rose-400 cursor-not-allowed"
                    : isOpenCameraDisabledIN
                    ? "bg-[#E11D48] text-white border-transparent hover:brightness-105 cursor-pointer shadow-xs active:scale-[0.99]"
                    : "bg-[#F8FAFC] dark:bg-[#0E1524] border-slate-200 dark:border-slate-800 text-[#64748B] dark:text-[#94A3B8] cursor-not-allowed"
                }`}
              >
                <LogOut className="w-5 h-5 mb-1.5" />
                <span className="text-[13px] font-[650]">
                  Punch out
                </span>
                <span className="text-[11px] opacity-85 font-medium tabular-nums mt-0.5">
                  {punchData?.App_Out1?.date
                    ? getDisplayPunchTime(punchData.App_Out1.date)
                    : isOpenCameraDisabledOUT
                    ? "punched"
                    : isOpenCameraDisabledIN
                    ? "pending"
                    : "punch in first"}
                </span>
              </button>
            </div>

            {/* Location Banner */}
            <div className="mt-3.5 p-3 px-3.5 rounded-[10px] border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0E1524] flex items-center gap-3">
              <span className="w-[26px] h-[26px] rounded-lg shrink-0 flex items-center justify-center bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF]">
                <MapPin className="w-3.5 h-3.5" />
              </span>
              <div className="flex-1 min-w-0">
                <span className="block text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase">
                  PUNCH LOCATION
                </span>
                <span
                  className="block text-[12px] text-[#1E293B] dark:text-[#E7ECF3] mt-0.5 leading-[1.45] line-clamp-2"
                  title={location || punchData?.In_Add || punchData?.Out_Add || ""}
                >
                  {location ||
                    punchData?.In_Add ||
                    punchData?.Out_Add ||
                    "Location will be detected when you punch"}
                </span>
              </div>
            </div>

            {/* Worked so far */}
            <div className="flex items-center justify-between gap-3 mt-3 text-[12px] text-[#64748B] dark:text-[#94A3B8]">
              <span className="font-medium">Worked so far</span>
              <span
                className={`text-[14px] font-[650] tabular-nums ${
                  worked.percent >= 100
                    ? "text-[#10B981]"
                    : "text-[#1E293B] dark:text-[#E7ECF3]"
                }`}
              >
                {worked.text}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#F8FAFC] dark:bg-[#0E1524] border border-slate-200/80 dark:border-slate-800 mt-2 relative overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  worked.percent >= 100
                    ? "bg-[#10B981]"
                    : worked.percent >= 50
                    ? "bg-[#4F46E5]"
                    : "bg-[#F59E0B]"
                }`}
                style={{ width: `${worked.percent}%` }}
              />
            </div>
          </div>

          {/* Card 2: Selfie verification */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] p-4 sm:p-[18px]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-[26px] h-[26px] rounded-lg shrink-0 flex items-center justify-center bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF]">
                  <Camera className="w-3.5 h-3.5" />
                </span>
                <h2 className="text-[14px] font-semibold text-[#1E293B] dark:text-[#E7ECF3] m-0">
                  Selfie verification
                </h2>
              </div>
              {imageSrc && (
                <button
                  type="button"
                  onClick={cancealImage}
                  className="text-[#64748B] hover:text-[#E11D48] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Retake
                </button>
              )}
            </div>

            {/* Media Box */}
            <div className="h-[210px] w-full rounded-[11px] border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-transparent flex flex-col items-center justify-center relative overflow-hidden">
              {videoStream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover rounded-[11px]"
                />
              ) : imageSrc ? (
                <img
                  src={imageSrc}
                  alt="Captured selfie"
                  className="h-full w-full object-cover rounded-[11px]"
                />
              ) : (
                <div className="flex flex-col items-center text-center p-4">
                  <div className="w-11 h-11 rounded-[13px] bg-slate-100/80 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2.5">
                    <CameraOff className="w-5 h-5" />
                  </div>
                  <span className="text-[12.5px] font-[550] text-[#1E293B] dark:text-[#E7ECF3]">
                    No selfie yet
                  </span>
                  <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] max-w-[240px] text-center mt-1">
                    Required before the first punch of the day
                  </span>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            <div className="mt-3 flex items-center justify-center gap-2">
              {showCaptureButton && (
                <>
                  <AButton
                    variant="primary"
                    size="sm"
                    type="button"
                    onClick={captureImage}
                    icon={<Camera className="w-4 h-4" />}
                    className="flex-1 !bg-[#4F46E5] hover:!bg-[#4338CA] !text-white !h-9 !rounded-[9px] !text-[12px] !font-semibold"
                  >
                    Capture
                  </AButton>
                  <AButton
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={toggleCamera}
                    icon={<MdFlipCameraIos className="w-4 h-4" />}
                    className="flex-1 !h-9 !rounded-[9px] !text-[12px] !font-semibold !border-slate-200 dark:!border-slate-700 !bg-white dark:!bg-[#111827] !text-[#1E293B] dark:!text-[#E7ECF3]"
                  >
                    Flip
                  </AButton>
                </>
              )}

              {imageSrc && (
                <AButton
                  variant="primary"
                  size="sm"
                  type="button"
                  onClick={AddpunchInOut}
                  icon={<Check className="w-4 h-4" />}
                  className="w-full !bg-[#10B981] hover:!bg-[#059669] !text-white !h-9 !rounded-[9px] !text-[12px] !font-semibold"
                >
                  Submit Punch
                </AButton>
              )}

              {!videoStream && !imageSrc && (
                <div className="italic text-[12px] text-slate-400 text-center py-1">
                  Click &ldquo;Punch in&rdquo; or &ldquo;Punch out&rdquo; to start camera verification
                </div>
              )}
            </div>

            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>
        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div className="space-y-3.5 min-w-0">
          {/* Top Filter Bar */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[180px_180px_minmax(0,1fr)_auto_auto] gap-3 items-end">
              <div>
                <Einput
                  title="DATE FROM"
                  type="date"
                  name="DATE_FROM"
                  value={dates.DATE_FROM}
                  handleInputChange={handleDateChange}
                  labelClassName="!text-[11px] !font-semibold !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                  className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-slate-200 dark:!border-slate-800"
                />
              </div>

              <div>
                <Einput
                  title="DATE TO"
                  type="date"
                  name="DATE_TO"
                  value={dates.DATE_TO}
                  handleInputChange={handleDateChange}
                  labelClassName="!text-[11px] !font-semibold !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                  className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-slate-200 dark:!border-slate-800"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                <Einput
                  title="SEARCH"
                  type="text"
                  name="search"
                  placeholder="Employee, reason, remark..."
                  value={searchQuery}
                  handleInputChange={(_, val) => setSearchQuery(val)}
                  labelClassName="!text-[11px] !font-semibold !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                  className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-slate-200 dark:!border-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1 w-full lg:w-auto">
                <AButton
                  variant="primary"
                  size="md"
                  type="button"
                  onClick={handleFilter}
                  className="flex-1 lg:flex-initial !bg-[#10B981] hover:!bg-[#059669] !text-white !h-[38px] !px-5 !rounded-[9px] !text-[12.5px] !font-semibold shadow-xs whitespace-nowrap"
                >
                  Show
                </AButton>
                <AButton
                  variant="outline"
                  size="md"
                  type="button"
                  onClick={handleExportData}
                  icon={<Download className="w-4 h-4" />}
                  className="flex-1 lg:flex-initial !h-[38px] !px-3.5 !rounded-[9px] !text-[12.5px] !font-[550] !border-slate-200 dark:!border-slate-700 !bg-white dark:!bg-[#111827] !text-[#1E293B] dark:!text-[#E7ECF3] hover:!bg-slate-50 dark:hover:!bg-slate-800 shadow-xs whitespace-nowrap"
                  title="Export to Excel"
                >
                  Export
                </AButton>
                <AButton
                  variant="outline"
                  size="md"
                  type="button"
                  onClick={() => setIsModalVisible1(true)}
                  icon={<ListChecks className="w-4 h-4" />}
                  className="shrink-0 !h-[38px] !px-3 !rounded-[9px] !border-slate-200 dark:!border-slate-700 !bg-white dark:!bg-[#111827] !text-[#1E293B] dark:!text-[#E7ECF3] hover:!bg-slate-50 dark:hover:!bg-slate-800 shadow-xs"
                  title="Approver Hierarchy"
                />
              </div>
            </div>
          </div>

          {/* Punch History Card with Tabs & Table */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col justify-between w-full max-w-full">
            {/* Header + Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 sm:px-4.5 py-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-semibold text-[#1E293B] dark:text-[#E7ECF3] m-0">
                  My punch history
                </h2>
                <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] font-normal tabular-nums">
                  {displayData?.length || 0} records
                </span>
              </div>

              {/* Status Filter Tabs */}
              <div className="w-full sm:w-auto grid grid-cols-3 sm:flex items-center gap-1 sm:gap-[3px] bg-[#F8FAFC] dark:bg-[#0E1524] border border-slate-200 dark:border-slate-800 p-1 sm:p-[3px] rounded-[10px]">
                <button
                  type="button"
                  onClick={() => setActiveTab("ALL")}
                  className={`w-full sm:w-auto px-2 sm:px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                    activeTab === "ALL"
                      ? "bg-[#4F46E5] text-white shadow-xs"
                      : "bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-white"
                  }`}
                >
                  <span>All</span>
                  <span className="opacity-75 tabular-nums text-[11px] font-semibold">
                    {counts.all}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("PENDING")}
                  className={`w-full sm:w-auto px-2 sm:px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                    activeTab === "PENDING"
                      ? "bg-[#4F46E5] text-white shadow-xs"
                      : "bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-white"
                  }`}
                >
                  <span>Pending</span>
                  <span className="opacity-75 tabular-nums text-[11px] font-semibold">
                    {counts.pending}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("APPROVED")}
                  className={`w-full sm:w-auto px-2 sm:px-3 py-1.5 text-[12px] font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                    activeTab === "APPROVED"
                      ? "bg-[#4F46E5] text-white shadow-xs"
                      : "bg-transparent text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-white"
                  }`}
                >
                  <span>Approved</span>
                  <span className="opacity-75 tabular-nums text-[11px] font-semibold">
                    {counts.approved}
                  </span>
                </button>
              </div>
            </div>

            {/* ServiceTablePagination */}
            <div className="w-full max-w-full overflow-x-auto min-h-[360px]">
              <ServiceTablePagination
                columns={columns}
                data={displayData}
                showTopSearch={false}
                searchValue={searchQuery}
                showColumnFilters={true}
                onSearchChange={setSearchQuery}
                showExcelExport={true}
                columnsDownload={columnsDownload}
                containerClassName="border-0 shadow-none p-0 !bg-transparent w-full"
                headerClassName="!text-[10.5px] !font-bold !tracking-[0.05em] !uppercase !text-[#64748B] dark:!text-[#94A3B8] !bg-[#F8FAFC] dark:!bg-[#0E1524] !border-b !border-slate-200 dark:!border-slate-800 !py-2.5 !px-3"
              />
            </div>

            {/* Bottom Notice Strip matching screenshot */}
            <div className="px-3.5 sm:px-4.5 py-3 border-t border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0E1524] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px] text-[#64748B] dark:text-[#94A3B8]">
              <div className="flex items-start sm:items-center gap-2">
                <Info className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] shrink-0 mt-0.5 sm:mt-0" />
                <span className="leading-snug">
                  An incomplete punch pair becomes a mis-punch at midnight — raise the request the same day.
                </span>
              </div>
              <button
                type="button"
                onClick={() => router.push("/payroll/attendance-punch/mispunch-request")}
                className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-[12px] font-semibold text-[#1E293B] dark:text-[#E7ECF3] hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer shadow-xs"
              >
                <span>Raise mis-punch</span> <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <HashloaderComponent isLoading={isLoading} />

      {/* ================= ROW DOUBLE CLICK DETAIL MODAL ================= */}
      <Dialog open={isModalVisible} onOpenChange={setIsModalVisible}>
        <DialogContent className="w-full max-w-3xl max-h-[90vh] overflow-hidden p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1.5">
                  {[1, 2, 3].map((dot, index) => (
                    <span
                      key={index}
                      className={`w-3.5 h-3.5 rounded-full ${getDotColor(
                        index,
                        model.stat,
                        model.Man_Rej
                      )}`}
                    />
                  ))}
                </div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white ml-2">
                  Punch Details
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <DialogDescription asChild>
            <div className="overflow-y-auto max-h-[calc(85vh-120px)] pr-1 space-y-4 text-slate-700 dark:text-slate-300">
              {/* Employee Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-xs">
                <div className="flex items-center">
                  <span className="w-32 text-slate-500 dark:text-slate-400 font-medium">Employee Code:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{model?.EmpCode || "N/A"}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-32 text-slate-500 dark:text-slate-400 font-medium">Employee Name:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{model?.EmpName || "N/A"}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-32 text-slate-500 dark:text-slate-400 font-medium">In Time:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{model?.In1 || "N/A"}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-32 text-slate-500 dark:text-slate-400 font-medium">Out Time:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{model?.Out1 || "N/A"}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-32 text-slate-500 dark:text-slate-400 font-medium">Designation:</span>
                  <span className="text-slate-700 dark:text-slate-200">{model?.EmployeeDesignation || "N/A"}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-32 text-slate-500 dark:text-slate-400 font-medium">Reason:</span>
                  <span className="text-slate-700 dark:text-slate-200">{model?.Mipunch_Reason || "N/A"}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-32 text-slate-500 dark:text-slate-400 font-medium">Remark:</span>
                  <span className="text-slate-700 dark:text-slate-200">{model?.MI_Remark || "N/A"}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-32 text-slate-500 dark:text-slate-400 font-medium">Head Name:</span>
                  <span className="text-slate-700 dark:text-slate-200">{model?.head_remark_by || "N/A"}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-32 text-slate-500 dark:text-slate-400 font-medium">Status:</span>
                  <span className="font-semibold">{model?.AtnStatus || "N/A"}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-32 text-slate-500 dark:text-slate-400 font-medium">Head Remark:</span>
                  <span className="text-slate-700 dark:text-slate-200">{model?.head_remark || "N/A"}</span>
                </div>
              </div>

              {/* Photos Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* In Image */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                    Punch In Image
                  </span>
                  <div className="h-[180px] w-full flex items-center justify-center bg-slate-50 dark:bg-slate-800/40 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800">
                    {model?.fileIn ? (
                      <img
                        src={model.fileIn}
                        alt="Punch In file"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <FaImage className="h-14 w-14 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>
                  {model?.fileIn && (
                    <div className="mt-2">
                      <FileViewer fileLink={model.fileIn} celldata="" />
                    </div>
                  )}
                </div>

                {/* Out Image */}
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-2">
                    Punch Out Image
                  </span>
                  <div className="h-[180px] w-full flex items-center justify-center bg-slate-50 dark:bg-slate-800/40 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800">
                    {model?.fileOut ? (
                      <img
                        src={model.fileOut}
                        alt="Punch Out file"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <FaImage className="h-14 w-14 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>
                  {model?.fileOut && (
                    <div className="mt-2">
                      <FileViewer fileLink={model.fileOut} celldata="" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>

      {/* ================= APPROVER LIST MODAL ================= */}
      <Dialog open={isModalVisible1} onOpenChange={setIsModalVisible1}>
        <DialogContent className="w-full max-w-2xl max-h-[85vh] overflow-hidden p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Approver List
            </DialogTitle>
          </DialogHeader>

          <DialogDescription asChild>
            <div className="mt-3 max-h-[380px] overflow-y-auto">
              {apprData.length === 0 ? (
                <div className="text-center text-slate-400 py-10 text-sm">
                  No Approver Found
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-left font-semibold">
                          <th className="p-2.5 border-b border-r border-slate-200 dark:border-slate-800">Approver 1A</th>
                          <th className="p-2.5 border-b border-r border-slate-200 dark:border-slate-800">Approver 1B</th>
                          <th className="p-2.5 border-b border-r border-slate-200 dark:border-slate-800">Approver 2A</th>
                          <th className="p-2.5 border-b border-r border-slate-200 dark:border-slate-800">Approver 2B</th>
                          <th className="p-2.5 border-b border-r border-slate-200 dark:border-slate-800">Approver 3A</th>
                          <th className="p-2.5 border-b border-slate-200 dark:border-slate-800">Approver 3B</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apprData.map((item, index) => (
                          <tr
                            key={index}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                            onClick={() => handleSelectApprover(item)}
                          >
                            <td className="p-2.5 border-r border-slate-100 dark:border-slate-800 capitalize font-medium">{item.approver1_A || "—"}</td>
                            <td className="p-2.5 border-r border-slate-100 dark:border-slate-800 capitalize font-medium">{item.approver1_B || "—"}</td>
                            <td className="p-2.5 border-r border-slate-100 dark:border-slate-800 capitalize font-medium">{item.approver2_A || "—"}</td>
                            <td className="p-2.5 border-r border-slate-100 dark:border-slate-800 capitalize font-medium">{item.approver2_B || "—"}</td>
                            <td className="p-2.5 border-r border-slate-100 dark:border-slate-800 capitalize font-medium">{item.approver3_A || "—"}</td>
                            <td className="p-2.5 capitalize font-medium">{item.approver3_B || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-3">
                    {apprData.map((item, index) => (
                      <div
                        key={index}
                        className="border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xs bg-white dark:bg-slate-800 cursor-pointer"
                        onClick={() => handleSelectApprover(item)}
                      >
                        <div className="grid grid-cols-2 gap-y-2 text-xs">
                          <span className="font-semibold text-slate-500">Approver 1A:</span>
                          <span className="capitalize">{item.approver1_A || "—"}</span>

                          <span className="font-semibold text-slate-500">Approver 1B:</span>
                          <span className="capitalize">{item.approver1_B || "—"}</span>

                          <span className="font-semibold text-slate-500">Approver 2A:</span>
                          <span className="capitalize">{item.approver2_A || "—"}</span>

                          <span className="font-semibold text-slate-500">Approver 2B:</span>
                          <span className="capitalize">{item.approver2_B || "—"}</span>

                          <span className="font-semibold text-slate-500">Approver 3A:</span>
                          <span className="capitalize">{item.approver3_A || "—"}</span>

                          <span className="font-semibold text-slate-500">Approver 3B:</span>
                          <span className="capitalize">{item.approver3_B || "—"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
}
