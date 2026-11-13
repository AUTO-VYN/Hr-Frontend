
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Download, CalendarDays } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";

/* =========================================================
   API CONFIGURATION
========================================================= */

const EMPLOYEE_API = "/employee/all";
const ATTENDANCE_API = "/sendEmailSalary/attdencedata";
const PRINT_HEADER_API = "/interview/PrintHeader";

/* =========================================================
   HELPERS
========================================================= */

const getDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getInitialDates = () => {
  const today = new Date();
  const from = new Date();

  from.setDate(today.getDate() - 30);

  return {
    DATE_FROM: getDateString(from),
    DATE_TO: getDateString(today),
    EmpCode: "",
  };
};

const getValue = (...values: any[]) => {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  return "";
};

const formatDisplayDate = (value: any) => {
  if (!value) return "";

  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  const date = match
    ? new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      )
    : new Date(raw);

  if (Number.isNaN(date.getTime())) return raw;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatShortDate = (value: any) => {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
  });
};

const getDayName = (value: string) => {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
  });
};

const formatNumber = (value: any) => {
  const number = Number(value || 0);

  return Number.isFinite(number)
    ? Number(number.toFixed(2)).toString()
    : "0";
};

const getStatusColor = (status: string) => {
  const value = String(status || "").toUpperCase();

  if (["P", "PRESENT"].includes(value)) {
    return "text-emerald-600 dark:text-emerald-400";
  }

  if (["A", "ABSENT"].includes(value)) {
    return "text-red-600 dark:text-red-400";
  }

  if (["L", "LEAVE"].includes(value)) {
    return "text-amber-600 dark:text-amber-400";
  }

  if (
    ["WO", "WEEK OFF", "WEEKOFF", "H", "HOLIDAY"].includes(value)
  ) {
    return "text-slate-500 dark:text-slate-400";
  }

  return "text-slate-700 dark:text-slate-200";
};

const getStatusLabel = (status: any) => {
  const value = String(status || "").trim().toUpperCase();

  if (value === "PRESENT") return "P";
  if (value === "ABSENT") return "A";
  if (value === "LEAVE") return "L";
  if (value === "WEEK OFF" || value === "WEEKOFF") return "WO";
  if (value === "HOLIDAY") return "H";

  return value || "—";
};

const toast = (
  message: string,
  icon: "success" | "error" | "warning" | "info" = "info"
) => {
  Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  }).fire({
    icon,
    title: message,
  });
};

/* =========================================================
   ATTENDANCE RESPONSE MAPPING
========================================================= */

const getMonthNumber = (monthName: string) => {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  return months.findIndex(
    (month) => month.toLowerCase() === monthName.toLowerCase()
  );
};

const formatAttendanceTime = (time: any) => {
  if (
    time === undefined ||
    time === null ||
    time === "" ||
    time === "0.00" ||
    time === "00:00:00"
  ) {
    return "0.00";
  }

  const value = String(time).trim();

  if (value.includes(":")) {
    const parts = value.split(":");

    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  }

  return value;
};

const calculateWorkingHours = (
  inTime: string,
  outTime: string
) => {
  if (
    !inTime ||
    !outTime ||
    inTime === "0.00" ||
    outTime === "0.00"
  ) {
    return "0.00";
  }

  const [inHour, inMinute] = inTime.split(":").map(Number);
  const [outHour, outMinute] = outTime.split(":").map(Number);

  if (
    !Number.isFinite(inHour) ||
    !Number.isFinite(inMinute) ||
    !Number.isFinite(outHour) ||
    !Number.isFinite(outMinute)
  ) {
    return "0.00";
  }

  const startMinutes = inHour * 60 + inMinute;
  let endMinutes = outHour * 60 + outMinute;

  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  const difference = endMinutes - startMinutes;
  const hours = Math.floor(difference / 60);
  const minutes = difference % 60;

  return `${hours}.${String(minutes).padStart(2, "0")}`;
};

const transformAttendanceData = (
  rawData: Record<string, any>,
  dateFrom: string,
  dateTo: string
) => {
  if (!rawData || typeof rawData !== "object") return [];

  const from = new Date(`${dateFrom}T00:00:00`);
  const to = new Date(`${dateTo}T00:00:00`);

  const year = from.getFullYear();

  const monthDays = Object.keys(rawData).filter((key) =>
    /^\d{2}-[A-Za-z]{3}$/.test(key)
  );

  return monthDays
    .map((dateKey) => {
      const [dayPart, monthPart] = dateKey.split("-");
      const dayNumber = Number(dayPart);
      const monthNumber = getMonthNumber(monthPart);

      if (monthNumber < 0) return null;

      let rowYear = year;

      let fullDate = new Date(rowYear, monthNumber, dayNumber);

      if (fullDate < from && from.getMonth() === 11 && monthNumber === 0) {
        rowYear = from.getFullYear() + 1;
        fullDate = new Date(rowYear, monthNumber, dayNumber);
      } else if (
        fullDate > to &&
        to.getMonth() === 0 &&
        monthNumber === 11
      ) {
        rowYear = to.getFullYear() - 1;
        fullDate = new Date(rowYear, monthNumber, dayNumber);
      }

      const date = getDateString(fullDate);

      if (date < dateFrom || date > dateTo) return null;

      const inTime = formatAttendanceTime(
        rawData[`${dateKey}_in1`]
      );

      const outTime = formatAttendanceTime(
        rawData[`${dateKey}_out1`]
      );

      return {
        date,
        inTime,
        outTime,

        lateMinutes: getValue(
          rawData[`${dateKey}_late`],
          rawData[`${dateKey}_lateMinutes`],
          rawData[`${dateKey}_Late`],
          "0.00"
        ),

        workingHours: calculateWorkingHours(inTime, outTime),

        status: getStatusLabel(rawData[dateKey]),

        mispunch: getValue(
          rawData[`${dateKey}_mispunch`],
          rawData[`${dateKey}_Mispunch`],
          ""
        ),
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.date.localeCompare(b.date));
};

/* =========================================================
   PAGE
========================================================= */

export default function EmployeeDayAttendancePage() {
  const user = useCurrentUser();

  const reportRef = useRef<HTMLDivElement>(null);

  const [dates, setDates] = useState(getInitialDates);

  const [employees, setEmployees] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any>(null);
  const [company, setCompany] = useState<any>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isEmployeeLoading, setIsEmployeeLoading] = useState(false);

  /* =========================================================
     DATE / INPUT CHANGE
  ========================================================= */

  const handleDateChange = (name: string, value: any) => {
    setDates((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* =========================================================
     EMPLOYEE OPTIONS
  ========================================================= */

  const mappedEmployees = useMemo(() => {
    return employees
      .map((item: any) => {
        const code = String(
          getValue(
            item.EMPCODE,
            item.EmpCode,
            item.Emp_Code,
            item.PAYCODE,
            item.PayCode,
            item.EmployeeCode,
            item.value
          )
        );

        const name = String(
          getValue(
            item.EMPNAME,
            item.EmpName,
            item.EmployeeName,
            item.Emp_Name,
            item.name,
            item.label
          )
        );

        return {
          ...item,
          value: code,
          label: name ? `${code} · ${name}` : code,
        };
      })
      .filter((item: any) => item.value);
  }, [employees]);

  const employeeDetails = useMemo(() => {
    return mappedEmployees.find(
      (item: any) => String(item.value) === String(dates.EmpCode)
    );
  }, [mappedEmployees, dates.EmpCode]);

  /* =========================================================
     GET EMPLOYEE LIST
  ========================================================= */

  const getEmployees = useCallback(async () => {
    if (!user?.Comp_Code || !user?.branch) return;

    setIsEmployeeLoading(true);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${EMPLOYEE_API}`,
        {
          empcode: user?.EMPCODE,
          Loc_Code: user?.branch,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      const employeeData = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
          ? response.data
          : [];

      setEmployees(employeeData);
    } catch (error: any) {
      console.error(
        "Employee list error:",
        error?.response?.data || error
      );

      toast(
        error?.response?.data?.message ||
          "Unable to load employee list.",
        "error"
      );
    } finally {
      setIsEmployeeLoading(false);
    }
  }, [user?.Comp_Code, user?.branch, user?.EMPCODE, user?.name]);

  useEffect(() => {
    if (user?.Comp_Code && user?.branch) {
      getEmployees();
    }
  }, [user?.Comp_Code, user?.branch, getEmployees]);

  /* =========================================================
     GET COMPANY PRINT HEADER
  ========================================================= */

  const getPrintHeader = useCallback(async () => {
    if (!user?.Comp_Code || !user?.branch) return;

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${PRINT_HEADER_API}`,
        {
          multi_loc: user?.branch,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      setCompany(response.data?.company?.[0] || {});
    } catch (error: any) {
      console.error(
        "Print header error:",
        error?.response?.data || error
      );
    }
  }, [user?.Comp_Code, user?.branch, user?.name]);

  useEffect(() => {
    if (user?.Comp_Code && user?.branch) {
      getPrintHeader();
    }
  }, [user?.Comp_Code, user?.branch, getPrintHeader]);

  /* =========================================================
     MAP ATTENDANCE RESPONSE
  ========================================================= */

  const mapAttendanceResponse = (
    responseData: any,
    dateFrom: string,
    dateTo: string
  ) => {
    const rawDailyData = responseData?.[0] || {};
    const rawSummary = responseData?.[1] || {};

    const days = transformAttendanceData(
      rawDailyData,
      dateFrom,
      dateTo
    );

    return {
      companyName: getValue(
        company?.Comp_Name,
        user?.Company_Name,
        user?.Comp_Name,
        "Company"
      ),

      employee: {
        empCode: getValue(
          rawDailyData?.Empcode,
          rawDailyData?.EMPCODE,
          dates.EmpCode
        ),

        payCode: getValue(
          rawDailyData?.PAY_CODE,
          rawDailyData?.PayCode,
          employeeDetails?.PAYCODE,
          employeeDetails?.PayCode
        ),

        employeeName: getValue(
          rawDailyData?.EmployeeName,
          rawDailyData?.EMPNAME,
          employeeDetails?.EMPNAME,
          employeeDetails?.EmpName,
          employeeDetails?.EmployeeName
        ),

        shift: getValue(
          rawDailyData?.EMP_SHIFT,
          rawDailyData?.Shift,
          rawDailyData?.ShiftTime
        ),

        region: getValue(
          rawDailyData?.Region,
          rawDailyData?.Sal_Region
        ),

        department: getValue(
          rawDailyData?.Department,
          rawDailyData?.DEPARTMENT
        ),

        location: getValue(
          rawDailyData?.Location,
          rawDailyData?.Branch
        ),

        designation: getValue(
          rawDailyData?.Designation,
          rawDailyData?.DESIGNATION
        ),
      },

      summary: {
        present: getValue(
          rawSummary?.Presents,
          rawSummary?.Present,
          rawSummary?.PRESENT,
          0
        ),

        absent: getValue(
          rawSummary?.Absents,
          rawSummary?.Absent,
          rawSummary?.ABSENT,
          0
        ),

        leave: getValue(
          rawSummary?.Leave,
          rawSummary?.LEAVE,
          0
        ),

        weekOff: getValue(
          rawSummary?.WO,
          rawSummary?.WeekOff,
          rawSummary?.Week_Off,
          0
        ),

        holiday: getValue(
          rawSummary?.Holidays,
          rawSummary?.Holiday,
          0
        ),

        paidDays: getValue(
          rawSummary?.PaidDays,
          rawSummary?.Paid_Days,
          0
        ),

        lateMinutes: getValue(
          rawSummary?.LateHour,
          rawSummary?.LateMinutes,
          rawSummary?.Late_Minutes,
          0
        ),

        hoursWorked: getValue(
          rawSummary?.HoursWorked,
          rawSummary?.WorkingHours,
          0
        ),

        overtime: getValue(
          rawSummary?.OT_Duration,
          rawSummary?.OverTime,
          0
        ),

        monthDays: getValue(
          rawSummary?.["Month Day"],
          rawSummary?.MonthDays,
          0
        ),

        salaryLockDate: getValue(
          rawSummary?.["Salary Lock Date"],
          ""
        ),
      },

      days,
    };
  };

  /* =========================================================
     SHOW ATTENDANCE
  ========================================================= */

  const showAttendance = useCallback(async () => {
    if (!user?.Comp_Code || !user?.branch) {
      toast("Company or branch information is missing.", "warning");
      return;
    }

    if (!dates.EmpCode) {
      toast("Please select an employee.", "warning");
      return;
    }

    if (!dates.DATE_FROM || !dates.DATE_TO) {
      toast("Please select both dates.", "warning");
      return;
    }

    if (
      new Date(`${dates.DATE_FROM}T00:00:00`) >
      new Date(`${dates.DATE_TO}T00:00:00`)
    ) {
      toast("Date from cannot be greater than date to.", "warning");
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        loc_code: user?.branch,
        dateFrom: dates.DATE_FROM,
        dateto: dates.DATE_TO,
        empcode: dates.EmpCode,
      };

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}${ATTENDANCE_API}`,
        payload,
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      console.log(
        "Employee Day Attendance Response:",
        response.data
      );

      const responseData = response.data;

      if (
        responseData?.success === false ||
        responseData?.Status === false ||
        responseData?.status === false
      ) {
        throw new Error(
          responseData?.message ||
            responseData?.Message ||
            "Unable to fetch attendance report."
        );
      }

      if (!Array.isArray(responseData) || !responseData[0]) {
        setAttendance(null);
        toast("No attendance records found.", "info");
        return;
      }

      const mapped = mapAttendanceResponse(
        responseData,
        dates.DATE_FROM,
        dates.DATE_TO
      );

      setAttendance(mapped);

      if (!mapped.days.length) {
        toast("No attendance records found.", "info");
      }
    } catch (error: any) {
      console.error(
        "Employee Day Attendance Error:",
        error?.response?.data || error
      );

      setAttendance(null);

      Swal.fire({
        icon: "error",
        title: "Attendance report failed",
        text:
          error?.response?.data?.message ||
          error?.response?.data?.Message ||
          error?.message ||
          "Unable to fetch attendance report.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    user?.Comp_Code,
    user?.branch,
    user?.name,
    user?.Company_Name,
    user?.Comp_Name,
    dates.EmpCode,
    dates.DATE_FROM,
    dates.DATE_TO,
    company?.Comp_Name,
    employeeDetails,
  ]);

  /* =========================================================
     SUMMARY CARDS
  ========================================================= */

  const summaryCards = useMemo(() => {
    const summary = attendance?.summary || {};

    return [
      {
        label: "Present",
        value: summary.present ?? 0,
        style:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
      },
      {
        label: "Absent",
        value: summary.absent ?? 0,
        style:
          "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300",
      },
      {
        label: "Leave",
        value: summary.leave ?? 0,
        style:
          "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
      },
      {
        label: "Week off",
        value: summary.weekOff ?? 0,
        style:
          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      },
      {
        label: "Holiday",
        value: summary.holiday ?? 0,
        style:
          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      },
      {
        label: "Paid days",
        value: summary.paidDays ?? 0,
        style:
          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      },
      {
        label: "Late (mins)",
        value: summary.lateMinutes ?? 0,
        style:
          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      },
      {
        label: "Hours worked",
        value: summary.hoursWorked ?? 0,
        style:
          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      },
    ];
  }, [attendance]);

  /* =========================================================
     DOWNLOAD PDF
  ========================================================= */

  const downloadPDF = async () => {
    if (!attendance) {
      toast("Please show the attendance report first.", "warning");
      return;
    }

    if (!reportRef.current) {
      toast("Report not found.", "error");
      return;
    }

    try {
      setIsLoading(true);

      const reportElement = reportRef.current;

      // Include the complete table width, including horizontally
      // scrollable date columns.
      const tableElement = reportElement.querySelector(
        ".attendance-print-table table"
      ) as HTMLTableElement | null;

      const captureWidth = Math.max(
        reportElement.scrollWidth,
        reportElement.clientWidth,
        tableElement?.scrollWidth || 0,
        tableElement?.offsetWidth || 0
      );

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: captureWidth,
        windowWidth: captureWidth,
        onclone: (clonedDocument) => {
          const clonedReport = clonedDocument.querySelector(
            ".attendance-print-area"
          ) as HTMLElement | null;

          if (!clonedReport) return;

          clonedReport.style.width = `${captureWidth}px`;
          clonedReport.style.maxWidth = "none";
          clonedReport.style.overflow = "visible";
          clonedReport.style.background = "#ffffff";
          clonedReport.style.color = "#172b45";
          clonedReport.style.border = "1px solid #dce5f0";
          clonedReport.style.boxShadow = "none";

          // Remove horizontal scrolling in the PDF clone.
          const clonedTableWrapper = clonedReport.querySelector(
            ".attendance-print-table"
          ) as HTMLElement | null;

          if (clonedTableWrapper) {
            clonedTableWrapper.style.width = "100%";
            clonedTableWrapper.style.maxWidth = "none";
            clonedTableWrapper.style.overflow = "visible";
          }

          const clonedTable = clonedReport.querySelector(
            ".attendance-print-table table"
          ) as HTMLTableElement | null;

          if (clonedTable) {
            clonedTable.style.width = `${Math.max(
              captureWidth,
              clonedTable.scrollWidth
            )}px`;
            clonedTable.style.minWidth = "1250px";
          }

          // Sticky positioning can cause incorrect rendering in canvas.
          clonedReport
            .querySelectorAll(".sticky")
            .forEach((element) => {
              (element as HTMLElement).style.position = "static";
            });

          // Ensure all PDF content uses a printable light background.
          clonedReport
            .querySelectorAll("*")
            .forEach((element) => {
              const el = element as HTMLElement;

              el.style.borderColor = "#dce5f0";

              if (
                el.classList.contains("bg-white") ||
                el.classList.contains("dark:bg-slate-900") ||
                el.classList.contains("dark:bg-slate-800")
              ) {
                el.style.backgroundColor = "#ffffff";
              }
            });
        },
      });

      const imageData = canvas.toDataURL("image/png", 1);

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 5;

      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;

      const imageWidth = availableWidth;

      const imageHeight =
        (canvas.height * imageWidth) / canvas.width;

      if (imageHeight <= availableHeight) {
        pdf.addImage(
          imageData,
          "PNG",
          margin,
          margin,
          imageWidth,
          imageHeight,
          undefined,
          "FAST"
        );
      } else {
        // Split taller reports into multiple A4 landscape pages.
        const pageCanvas = document.createElement("canvas");
        const pageContext = pageCanvas.getContext("2d");

        if (!pageContext) {
          throw new Error("Unable to create PDF canvas.");
        }

        const sourceHeight = Math.max(
          1,
          Math.floor(
            (availableHeight / imageHeight) * canvas.height
          )
        );

        pageCanvas.width = canvas.width;

        let sourceY = 0;
        let pageNumber = 0;

        while (sourceY < canvas.height) {
          const currentHeight = Math.min(
            sourceHeight,
            canvas.height - sourceY
          );

          pageCanvas.height = currentHeight;

          pageContext.clearRect(
            0,
            0,
            pageCanvas.width,
            pageCanvas.height
          );

          pageContext.drawImage(
            canvas,
            0,
            sourceY,
            canvas.width,
            currentHeight,
            0,
            0,
            canvas.width,
            currentHeight
          );

          if (pageNumber > 0) {
            pdf.addPage("a4", "landscape");
          }

          const pageImage = pageCanvas.toDataURL("image/png", 1);

          const currentImageHeight =
            (currentHeight * availableWidth) / canvas.width;

          pdf.addImage(
            pageImage,
            "PNG",
            margin,
            margin,
            availableWidth,
            currentImageHeight,
            undefined,
            "FAST"
          );

          sourceY += currentHeight;
          pageNumber++;
        }
      }

      const employeeCode =
        attendance?.employee?.empCode ||
        dates.EmpCode ||
        "Employee";

      pdf.save(
        `Day_Attendance_${dates.DATE_FROM}_${dates.DATE_TO}_${employeeCode}.pdf`
      );

      toast("PDF downloaded successfully.", "success");
    } catch (error) {
      console.error("PDF download error:", error);

      toast("Unable to generate PDF.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="min-h-screen bg-[#f7f9fc] px-3 py-3 text-[#172b45] dark:bg-[#101827] dark:text-slate-100 sm:px-5">
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 8mm;
          }

          body {
            background: white !important;
            color: #172b45 !important;
          }

          .print-hidden {
            display: none !important;
          }

          .attendance-print-area {
            width: 100% !important;
            overflow: visible !important;
            background: white !important;
            color: #172b45 !important;
            border: 1px solid #dce5f0 !important;
            box-shadow: none !important;
          }

          .attendance-print-table {
            overflow: visible !important;
          }

          .attendance-print-table table {
            min-width: 100% !important;
          }

          .attendance-print-table th,
          .attendance-print-table td {
            color: #172b45 !important;
            border-color: #dce5f0 !important;
          }

          .attendance-print-area * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* PAGE HEADER */}

      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-[23px] font-bold leading-tight text-[#172b45] dark:text-white">
          Employee Day Attendance
        </h1>
      </div>

      {/* FILTER SECTION */}

      <div className="print-hidden mb-4 rounded-2xl border border-[#dce5f0] bg-white px-5 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.1fr_88px_155px]">
          <div>
            <Einput
              title="Date from"
              type="date"
              name="DATE_FROM"
              value={dates.DATE_FROM}
              handleInputChange={handleDateChange}
              className="h-[40px] w-full"
            />
          </div>

          <div>
            <Einput
              title="Date to"
              type="date"
              name="DATE_TO"
              value={dates.DATE_TO}
              handleInputChange={handleDateChange}
              className="h-[40px] w-full"
            />
          </div>

          {/* EMPLOYEE ESELECT */}

          <div>
            <Eselect
              title="Employee"
              option={mappedEmployees}
              name="EmpCode"
              initialValue={dates.EmpCode}
              handleInputChange={handleDateChange}
              disabled={isEmployeeLoading}
              className="h-[40px] w-full"
            />
          </div>

          <div>
            <AButton
              variant="primary"
              onClick={showAttendance}
              disabled={isLoading}
              className="h-[40px] w-full rounded-xl bg-[#5146e5] text-white hover:bg-[#4338ca]"
            >
              Show
            </AButton>
          </div>

          <div>
            <button
              type="button"
              onClick={downloadPDF}
              disabled={!attendance || isLoading}
              className="flex h-[40px] w-full items-center justify-center gap-2 rounded-xl border border-[#dce5f0] bg-white px-4 text-sm font-semibold text-[#172b45] transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Download size={16} />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* REPORT */}

      {attendance ? (
        <div
          ref={reportRef}
          className="attendance-print-area overflow-hidden rounded-2xl border border-[#dce5f0] bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
        >
          {/* COMPANY HEADER */}

          <div className="flex flex-col justify-between gap-2 border-b border-[#dce5f0] px-5 py-4 dark:border-slate-700 sm:flex-row sm:items-center">
            <h2 className="text-[17px] font-bold text-[#172b45] dark:text-white">
              {company?.Comp_Name || attendance.companyName}
            </h2>

            <p className="text-sm text-[#64748b] dark:text-slate-400">
              Performance report · {formatDisplayDate(dates.DATE_FROM)} –{" "}
              {formatDisplayDate(dates.DATE_TO)}
            </p>
          </div>

          {/* EMPLOYEE DETAILS */}

          <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-[#dce5f0] px-5 py-4 dark:border-slate-700 sm:grid-cols-3 lg:grid-cols-5">
            {[
              {
                label: "Emp code",
                value: getValue(
                  attendance.employee.empCode,
                  employeeDetails?.value,
                  dates.EmpCode
                ),
              },
              {
                label: "Pay code",
                value: getValue(
                  attendance.employee.payCode,
                  employeeDetails?.PAYCODE,
                  employeeDetails?.PayCode
                ),
              },
              {
                label: "Employee name",
                value: getValue(
                  attendance.employee.employeeName,
                  employeeDetails?.EMPNAME,
                  employeeDetails?.EmpName
                ),
              },
              {
                label: "Shift",
                value: attendance.employee.shift || "—",
              },
              {
                label: "Region",
                value: attendance.employee.region || "—",
              },
              {
                label: "Department",
                value: attendance.employee.department || "—",
              },
              {
                label: "Location",
                value: attendance.employee.location || "—",
              },
              {
                label: "Designation",
                value: attendance.employee.designation || "—",
              },
            ].map((item, index) => (
              <div key={index} className="min-w-0">
                <p className="mb-0.5 text-[13px] font-medium text-[#64748b] dark:text-slate-400">
                  {item.label}
                </p>

                <p className="break-words text-[15px] font-semibold text-[#172b45] dark:text-slate-100">
                  {item.value || "—"}
                </p>
              </div>
            ))}
          </div>

          {/* SUMMARY CARDS */}

          <div className="grid grid-cols-2 gap-2 border-b border-[#dce5f0] px-5 py-4 dark:border-slate-700 sm:grid-cols-4 xl:grid-cols-8">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className={`min-w-0 rounded-xl px-3.5 py-3 ${card.style}`}
              >
                <p className="text-[13px] font-medium opacity-90">
                  {card.label}
                </p>

                <p className="mt-0.5 text-[22px] font-bold leading-tight">
                  {formatNumber(card.value)}
                </p>
              </div>
            ))}
          </div>

          {/* DAY WISE ATTENDANCE TABLE */}

          <div className="attendance-print-table w-full overflow-x-auto">
            <table className="w-full min-w-[1250px] border-collapse text-center text-sm">
              <thead>
                <tr className="bg-[#f8fafc] dark:bg-slate-800">
                  <th className="sticky left-0 z-10 min-w-[105px] border-b border-r border-[#dce5f0] bg-[#f8fafc] px-3 py-3 text-left font-semibold text-[#64748b] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Day
                  </th>

                  {attendance.days.map((day: any, index: number) => (
                    <th
                      key={`${day.date}-${index}`}
                      className="min-w-[65px] border-b border-[#dce5f0] px-2 py-2 font-semibold text-[#172b45] dark:border-slate-700 dark:text-slate-100"
                    >
                      <div className="text-[14px] font-bold">
                        {formatShortDate(day.date)}
                      </div>

                      <div className="mt-0.5 text-[12px] font-normal text-[#64748b] dark:text-slate-400">
                        {day.date ? getDayName(day.date) : ""}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {[
                  {
                    label: "In time",
                    key: "inTime",
                    formatter: (value: any) => value || "—",
                  },
                  {
                    label: "Out time",
                    key: "outTime",
                    formatter: (value: any) => value || "—",
                  },
                  {
                    label: "Late (min)",
                    key: "lateMinutes",
                    formatter: (value: any) => value ?? "—",
                  },
                  {
                    label: "Working hrs",
                    key: "workingHours",
                    formatter: (value: any) =>
                      value === "—" ? "—" : formatNumber(value),
                  },
                  {
                    label: "Status",
                    key: "status",
                    formatter: (value: any) => value || "—",
                  },
                  {
                    label: "Mispunch",
                    key: "mispunch",
                    formatter: (value: any) => value || "—",
                  },
                ].map((row) => (
                  <tr
                    key={row.key}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <td className="sticky left-0 z-10 border-b border-r border-[#dce5f0] bg-white px-3 py-2.5 text-left font-medium text-[#64748b] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      {row.label}
                    </td>

                    {attendance.days.map(
                      (day: any, index: number) => {
                        const value = day[row.key];
                        const isStatus = row.key === "status";

                        return (
                          <td
                            key={`${row.key}-${index}`}
                            className={`border-b border-[#dce5f0] px-2 py-2.5 text-[14px] dark:border-slate-700 ${
                              isStatus
                                ? `font-bold ${getStatusColor(value)}`
                                : "text-[#172b45] dark:text-slate-200"
                            }`}
                          >
                            {row.formatter(value)}
                          </td>
                        );
                      }
                    )}
                  </tr>
                ))}

                {!attendance.days.length && (
                  <tr>
                    <td
                      colSpan={1}
                      className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                    >
                      No attendance records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ADDITIONAL SUMMARY */}

          <div className="grid grid-cols-2 gap-3 border-t border-[#dce5f0] px-5 py-4 text-sm dark:border-slate-700 sm:grid-cols-4">
            <div>
              <span className="text-slate-500 dark:text-slate-400">
                Overtime:{" "}
              </span>
              <strong>{attendance.summary.overtime || "0"}</strong>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400">
                Month days:{" "}
              </span>
              <strong>{attendance.summary.monthDays || "0"}</strong>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400">
                Salary lock by:{" "}
              </span>
              <strong>{user?.name || "—"}</strong>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400">
                Salary lock date:{" "}
              </span>
              <strong>{attendance.summary.salaryLockDate || "—"}</strong>
            </div>
          </div>

          {/* TABLE FOOTER */}

          <div className="border-t border-[#dce5f0] px-5 py-2 text-xs text-[#64748b] dark:border-slate-700 dark:text-slate-400">
            Total days: {attendance.days.length}
          </div>
        </div>
      ) : (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#dce5f0] bg-white px-5 text-center dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
            <CalendarDays size={23} />
          </div>

          <h3 className="text-[16px] font-semibold text-[#172b45] dark:text-white">
            Employee Day Attendance
          </h3>

          <p className="mt-1 max-w-md text-sm text-[#64748b] dark:text-slate-400">
            Select the date range and employee, then click Show
            to view the attendance report.
          </p>
        </div>
      )}

      <HashloaderComponent
        isLoading={isLoading || isEmployeeLoading}
      />
    </div>
  );
}
