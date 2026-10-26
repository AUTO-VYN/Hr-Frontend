"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  CheckCircle2,
  Clock,
  MinusCircle,
  Gauge,
  ListChecks,
  Save,
  Fingerprint,
  UserPlus,
  ClipboardCheck,
  Folder,
  CalendarDays,
  Shirt,
  Wallet,
  MessageSquare,
  GraduationCap,
  MapPin,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import AButton from "@/components/atoms/Button";
import { StatCard } from "@/components/Templates/card";
import ServiceTablePagination from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

type Option = {
  label: string;
  value: string;
};

const CHECKS = [
  {
    key: "Attendance_Reivew",
    label: "Attendance review",
    icon: Fingerprint,
  },
  {
    key: "Recruitment_Follow_up",
    label: "Recruitment follow-up",
    icon: UserPlus,
  },
  {
    key: "Joining_Formalities",
    label: "Joining formalities",
    icon: ClipboardCheck,
  },
  {
    key: "Employee_Documents",
    label: "Employee documents",
    icon: Folder,
  },
  {
    key: "Leave_Update",
    label: "Leave update",
    icon: CalendarDays,
  },
  {
    key: "Uniform_ID_Card",
    label: "Uniform / ID card",
    icon: Shirt,
  },
  {
    key: "Payroll_Input",
    label: "Payroll input",
    icon: Wallet,
  },
  {
    key: "Employee_Grievance",
    label: "Employee grievance",
    icon: MessageSquare,
  },
  {
    key: "Training_Induction",
    label: "Training / induction",
    icon: GraduationCap,
  },
  {
    key: "Branch_Visit",
    label: "Branch visit",
    icon: MapPin,
  },
];

const OPTIONS = [
  { key: "done", label: "Done", color: "#10B981" },
  { key: "pending", label: "Pending", color: "#F59E0B" },
  { key: "na", label: "N/A", color: "#94A3B8" },
] as const;

function DailyHRReportContent() {
  const user = useCurrentUser() as any;

  const [divisionoption, setDivisionoption] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);

  const [fromdata, setfromdata] = useState<{ [key: string]: any }>({
    UTD: "",
    date: new Date().toISOString().split("T")[0],
    Attendance_Reivew: "",
    Recruitment_Follow_up: "",
    Joining_Formalities: "",
    Employee_Documents: "",
    Leave_Update: "",
    Uniform_ID_Card: "",
    Payroll_Input: "",
    Employee_Grievance: "",
    Training_Induction: "",
    Department: "",
    Branch_Visit: "",
    Remarks: "",
  });

  const showSideAlert = (
    message: string,
    type: "success" | "error" | "warning" | "info"
  ) => {
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    });
    Toast.fire({ icon: type, title: message });
  };

  // Fetch Master Division / Departments
  useEffect(() => {
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
          }
        );

        const convertValuesToString = (array: any[]) => {
          if (!Array.isArray(array)) return [];
          return array.map((obj) => ({
            label: obj.label,
            value: String(obj.value),
          }));
        };

        const masters = response.data?.data;
        if (masters?.DIVISION) {
          setDivisionoption(convertValuesToString(masters.DIVISION));
        }
      } catch (error) {
        console.error("Error fetching masters:", error);
      }
    };

    fetchData();
  }, [user?.Comp_Code, user?.name]);

  // Fetch Daily HR Reports Table
  const getDailyHRReport = async () => {
    if (!user?.Comp_Code) return;
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/getDailyHRReport`,
        {},
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );
      if (response.data.Status === "true") {
        setReportData(response.data.Result || []);
      }
    } catch (error) {
      console.error("Error fetching daily report:", error);
    }
  };

  useEffect(() => {
    getDailyHRReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.Comp_Code]);

  const saveDailyHRReport = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/saveDailyHRReport`,
        fromdata,
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );
      if (response.data.Status === "true") {
        showSideAlert(response.data.Message, "success");
        getDailyHRReport();
        handleClearDay();
      } else {
        showSideAlert(response.data.Message, "error");
      }
    } catch (error: any) {
      console.error(error);
      showSideAlert(
        error?.response?.data?.Message || "Something went wrong",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const updateDailyHRReport = async () => {
    try {
      setIsLoading(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/updateDailyHRReport`,
        fromdata,
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );
      if (response.data.Status === "true") {
        showSideAlert(response.data.Message, "success");
        getDailyHRReport();
        handleClearDay();
      } else {
        showSideAlert(response.data.Message, "error");
      }
    } catch (error: any) {
      console.error(error);
      showSideAlert(
        error?.response?.data?.Message || "Something went wrong",
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (name: string, value: any) => {
    setfromdata((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const normalizeStatus = (val: any): "done" | "pending" | "na" | "" => {
    if (!val) return "";
    const s = String(val).trim().toLowerCase();
    if (s === "done" || s === "yes") return "done";
    if (s === "pending" || s === "no") return "pending";
    if (s === "na" || s === "n/a" || s === "not applicable") return "na";
    return "";
  };

  const handleCheckChange = (key: string, value: "done" | "pending" | "na") => {
    setfromdata((prev) => {
      const current = normalizeStatus(prev[key]);
      return {
        ...prev,
        [key]: current === value ? "" : value,
      };
    });
  };

  const handleMarkAllDone = () => {
    setfromdata((prev) => {
      const updated = { ...prev };
      CHECKS.forEach((c) => {
        updated[c.key] = "done";
      });
      return updated;
    });
    showSideAlert(`All ${CHECKS.length} checks marked done`, "success");
  };

  const handleClearDay = () => {
    setfromdata({
      UTD: "",
      date: new Date().toISOString().split("T")[0],
      Attendance_Reivew: "",
      Recruitment_Follow_up: "",
      Joining_Formalities: "",
      Employee_Documents: "",
      Leave_Update: "",
      Uniform_ID_Card: "",
      Payroll_Input: "",
      Employee_Grievance: "",
      Training_Induction: "",
      Department: fromdata.Department || "",
      Branch_Visit: "",
      Remarks: "",
    });
  };

  const onRowDoubleClick = (row: any) => {
    setfromdata((prvs) => ({
      ...prvs,
      UTD: row?.UTD,
      date: row?.Report_Date
        ? new Date(row.Report_Date).toISOString().split("T")[0]
        : prvs.date,
      Attendance_Reivew: row?.Attendance_Reivew,
      Recruitment_Follow_up: row?.Recruitment_Follow_up,
      Joining_Formalities: row?.Joining_Formalities,
      Employee_Documents: row?.Employee_Documents,
      Leave_Update: row?.Leave_Update,
      Uniform_ID_Card: row?.Uniform_ID_Card,
      Payroll_Input: row?.Payroll_Input,
      Employee_Grievance: row?.Employee_Grievance,
      Training_Induction: row?.Training_Induction,
      Department: row?.Department,
      Branch_Visit: row?.Branch_Visit,
      Remarks: row?.Remarks,
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Live stats calculation matching HTML spec
  const stats = useMemo(() => {
    let done = 0;
    let pending = 0;
    let na = 0;

    CHECKS.forEach((c) => {
      const s = normalizeStatus(fromdata[c.key]);
      if (s === "done") done += 1;
      else if (s === "pending") pending += 1;
      else if (s === "na") na += 1;
    });

    const answered = done + pending + na;
    const pct = Math.round((done / CHECKS.length) * 100);
    const tint = pct >= 90 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#E11D48";

    return { done, pending, na, answered, pct, tint };
  }, [fromdata]);

  // Score calculation for table rows
  const getRowScore = (row: any) => {
    let doneCount = 0;
    CHECKS.forEach((c) => {
      const s = normalizeStatus(row[c.key]);
      if (s === "done") {
        doneCount += 1;
      }
    });
    const percentage = Math.round((doneCount / CHECKS.length) * 100);
    const tint =
      percentage >= 90 ? "#10B981" : percentage >= 60 ? "#F59E0B" : "#E11D48";
    return { doneCount, total: CHECKS.length, percentage, tint };
  };

  const selectedDepartmentLabel = useMemo(() => {
    if (!fromdata.Department) return "All departments";
    const found = divisionoption.find(
      (opt) => String(opt.value) === String(fromdata.Department)
    );
    return found?.label || fromdata.Department;
  }, [divisionoption, fromdata.Department]);

  const formattedDate = useMemo(() => {
    if (!fromdata.date) return "";
    return fromdata.date.split("-").reverse().join("/");
  }, [fromdata.date]);

  const statusLine = `${formattedDate} · ${selectedDepartmentLabel} · ${stats.answered} of ${CHECKS.length} answered`;

  // Columns for ServiceTablePagination
  const columns = useMemo(
    () => [
      {
        Header: "Date",
        accessor: "Report_Date",
        Cell: ({ value }: any) => {
          if (!value) return "—";
          const d = new Date(value);
          if (isNaN(d.getTime())) return String(value);
          return (
            <span className="text-[12.5px] font-[550] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
              {d.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          );
        },
      },
      {
        Header: "Department",
        accessor: "Department_Name",
        Cell: ({ row, value }: any) => (
          <span className="text-[12.5px] text-[#1E293B] dark:text-[#E7ECF3] truncate block">
            {value || row.original.Department || "All departments"}
          </span>
        ),
      },
      {
        Header: "Score",
        id: "Score",
        accessor: (row: any) => `${getRowScore(row).doneCount} / ${CHECKS.length}`,
        Cell: ({ row }: any) => {
          const { doneCount } = getRowScore(row.original);
          return (
            <span className="text-[12.5px] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
              {doneCount} / {CHECKS.length}
            </span>
          );
        },
      },
      {
        Header: "Completion",
        id: "Completion",
        accessor: (row: any) => getRowScore(row).percentage,
        Cell: ({ row }: any) => {
          const { percentage, tint } = getRowScore(row.original);
          return (
            <div className="flex items-center gap-[9px] min-w-[170px] w-full">
              <div className="flex-1 h-[6px] rounded-full bg-[#F8FAFC] dark:bg-[#0E1524] relative overflow-hidden border border-[#E2E8F0] dark:border-[#1F2937]">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%`, backgroundColor: tint }}
                />
              </div>
              <span
                className="shrink-0 text-[11.5px] font-[600] tabular-nums"
                style={{ color: tint }}
              >
                {percentage}%
              </span>
            </div>
          );
        },
      },
      {
        Header: "Created by",
        accessor: "Created_by",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8] truncate block">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "Remarks",
        accessor: "Remarks",
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8] truncate block max-w-xs">
            {value || "—"}
          </span>
        ),
      },
    ],
    []
  );

  const columnsDownload = useMemo(
    () => [
      { Header: "Date", accessor: "Report_Date" },
      { Header: "Department", accessor: "Department_Name" },
      {
        Header: "Score",
        accessor: (row: any) =>
          `${getRowScore(row).doneCount} / ${CHECKS.length}`,
      },
      {
        Header: "Completion %",
        accessor: (row: any) => `${getRowScore(row).percentage}%`,
      },
      { Header: "Created By", accessor: "Created_by" },
      { Header: "Remarks", accessor: "Remarks" },
      { Header: "Attendance Review", accessor: "Attendance_Reivew" },
      { Header: "Recruitment Follow Up", accessor: "Recruitment_Follow_up" },
      { Header: "Joining Formalities", accessor: "Joining_Formalities" },
      { Header: "Employee Documents", accessor: "Employee_Documents" },
      { Header: "Leave Update", accessor: "Leave_Update" },
      { Header: "Uniform ID Card", accessor: "Uniform_ID_Card" },
      { Header: "Payroll Input", accessor: "Payroll_Input" },
      { Header: "Employee Grievance", accessor: "Employee_Grievance" },
      { Header: "Training Induction", accessor: "Training_Induction" },
      { Header: "Branch Visit", accessor: "Branch_Visit" },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] font-sans antialiased">
      <HashloaderComponent isLoading={isLoading} />

      <main className="flex-1 p-[22px_24px_96px_24px] max-w-[1600px] mx-auto space-y-[14px]">
        {/* ── TOP HEADER / FILTER BAR ── */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-[18px]">
          <div>
            <h1 className="m-0 text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
              Daily HR executive checklist
            </h1>
            <p className="mt-[5px] mb-0 text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
              One line per day, ten checks. Mark each as done, pending or not applicable, then save the day.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-[10px]">
            {/* Date Input */}
            <div className="flex flex-col gap-[5px]">
              <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase">
                Date
              </span>
              <Einput
                type="date"
                name="date"
                value={fromdata.date}
                handleInputChange={handleDateChange}
                className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3] !px-[10px] !py-[9px] shadow-none"
              />
            </div>

            {/* Department Dropdown */}
            <div className="flex flex-col gap-[5px] min-w-[180px]">
              <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase">
                Department
              </span>
              <Eselect
                name="Department"
                option={divisionoption}
                initialValue={fromdata.Department}
                handleInputChange={handleDateChange}
                placeholder="Select department"
                className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3] shadow-none"
              />
            </div>

            {/* Mark All Done Button */}
            <AButton
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMarkAllDone}
              className="!h-[38px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] !text-[#4F46E5] dark:!text-[#8B84FF] hover:!bg-[#EEF2FF] dark:hover:!bg-[#1E1B4B] !text-[12.5px] !font-[600] !px-[14px] !py-[9px] !rounded-[10px] shadow-none whitespace-nowrap cursor-pointer transition-colors"
            >
              Mark all done
            </AButton>
          </div>
        </div>

        {/* ── KPI / SUMMARY CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[14px]">
          {/* Card 1: Completed */}
          <StatCard
            title="Completed"
            icon={<CheckCircle2 className="w-7 h-7" />}
            count={
              <div>
                <div className="text-[22px] font-[650] tracking-[-0.02em] mt-[9px] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                  {stats.done}
                </div>
                <div className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-[3px]">
                  of {CHECKS.length} checks
                </div>
              </div>
            }
            className="!h-auto !min-h-[105px] bg-white dark:bg-[#111827] !border-[#E2E8F0] dark:!border-[#1F2937] rounded-[12px] p-[14px_16px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)]"
            titleClassName="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase"
            iconClassName="w-[24px] h-[24px] rounded-[7px] grid place-items-center bg-[#10B9811F] text-[#10B981] border-0"
          />

          {/* Card 2: Pending */}
          <StatCard
            title="Pending"
            icon={<Clock className="w-4 h-4" />}
            count={
              <div>
                <div className="text-[22px] font-[650] tracking-[-0.02em] mt-[9px] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                  {stats.pending}
                </div>
                <div className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-[3px]">
                  need follow-up today
                </div>
              </div>
            }
            className="!h-auto !min-h-[105px] bg-white dark:bg-[#111827] !border-[#E2E8F0] dark:!border-[#1F2937] rounded-[12px] p-[14px_16px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)]"
            titleClassName="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase"
            iconClassName="w-[24px] h-[24px] rounded-[7px] grid place-items-center bg-[#F59E0B1F] text-[#F59E0B] border-0"
          />

          {/* Card 3: Not applicable */}
          <StatCard
            title="Not applicable"
            icon={<MinusCircle className="w-4 h-4" />}
            count={
              <div>
                <div className="text-[22px] font-[650] tracking-[-0.02em] mt-[9px] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                  {stats.na}
                </div>
                <div className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-[3px]">
                  skipped with reason
                </div>
              </div>
            }
            className="!h-auto !min-h-[105px] bg-white dark:bg-[#111827] !border-[#E2E8F0] dark:!border-[#1F2937] rounded-[12px] p-[14px_16px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)]"
            titleClassName="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase"
            iconClassName="w-[24px] h-[24px] rounded-[7px] grid place-items-center bg-[#94A3B81F] text-[#94A3B8] border-0"
          />

          {/* Card 4: Day score */}
          <StatCard
            title="Day score"
            icon={<Gauge className="w-4 h-4" />}
            count={
              <div>
                <div className="text-[22px] font-[650] tracking-[-0.02em] mt-[9px] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                  {stats.pct}%
                </div>
                <div className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-[3px]">
                  {stats.pct >= 90 ? "on target" : "below the 90% target"}
                </div>
              </div>
            }
            className="!h-auto !min-h-[105px] bg-white dark:bg-[#111827] !border-[#E2E8F0] dark:!border-[#1F2937] rounded-[12px] p-[14px_16px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)]"
            titleClassName="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase"
            iconClassName="w-[24px] h-[24px] rounded-[7px] grid place-items-center border-0"
          />
        </div>

        {/* ── TODAY'S CHECKS SECTION ── */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] p-[16px_18px_18px_18px]">
          {/* Header Bar */}
          <div className="flex items-center gap-[9px] mb-[14px]">
            <span className="w-[26px] h-[26px] rounded-[8px] grid place-items-center bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4F46E5] dark:text-[#8B84FF]">
              <ListChecks className="w-4 h-4" />
            </span>
            <h2 className="m-0 text-[14px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
              Today&apos;s checks
            </h2>
            <div className="flex-1" />
            <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
              {stats.done} of {CHECKS.length} complete
            </span>
            <span className="w-[130px] h-[6px] rounded-full bg-[#F8FAFC] dark:bg-[#0E1524] relative overflow-hidden border border-[#E2E8F0] dark:border-[#1F2937]">
              <span
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                style={{
                  width: `${stats.pct}%`,
                  backgroundColor: stats.tint,
                }}
              />
            </span>
          </div>

          {/* 10 Checklist Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[11px]">
            {CHECKS.map((c) => {
              const v = normalizeStatus(fromdata[c.key]);
              const t =
                v === "done"
                  ? "#10B981"
                  : v === "pending"
                  ? "#F59E0B"
                  : v === "na"
                  ? "#94A3B8"
                  : "var(--border, #E2E8F0)";

              const iconBg = v ? `${t}1F` : "var(--sub, #F8FAFC)";
              const cardBg =
                v === "pending" ? "rgba(245,158,11,0.05)" : "transparent";
              const cardBorder = v ? `${t}44` : "var(--border, #E2E8F0)";

              const ItemIcon = c.icon;

              return (
                <div
                  key={c.key}
                  style={{
                    border: `1px solid ${cardBorder}`,
                    borderLeft: `3px solid ${t}`,
                    borderRadius: "11px",
                    padding: "12px 13px",
                    backgroundColor: cardBg,
                  }}
                  className="transition-colors"
                >
                  <div className="flex items-center gap-[9px]">
                    <span
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "7px",
                        display: "grid",
                        placeItems: "center",
                        backgroundColor: iconBg,
                        color: t,
                        flex: "0 0 auto",
                      }}
                    >
                      <ItemIcon className="w-3.5 h-3.5" />
                    </span>
                    <span className="flex-1 min-w-0 text-[12.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3] truncate">
                      {c.label}
                    </span>
                  </div>

                  <div className="flex gap-[5px] mt-[11px]">
                    {OPTIONS.map((o) => {
                      const on = v === o.key;
                      return (
                        <button
                          key={o.key}
                          type="button"
                          onClick={() => handleCheckChange(c.key, o.key)}
                          style={{
                            flex: 1,
                            border: `1px solid ${
                              on ? `${o.color}66` : "var(--border, #E2E8F0)"
                            }`,
                            backgroundColor: on ? `${o.color}1A` : "transparent",
                            color: on ? o.color : "var(--muted, #64748B)",
                            fontFamily: "inherit",
                            fontSize: "11px",
                            fontWeight: 600,
                            padding: "5px 0",
                            borderRadius: "7px",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            transition: "all 150ms",
                          }}
                          className="hover:border-[#4F46E5] dark:hover:border-[#8B84FF]"
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Remarks Textarea */}
          <label className="flex flex-col gap-[5px] mt-[14px]">
            <span className="text-[11px] font-[600] text-[#64748B] dark:text-[#94A3B8] tracking-[0.03em] uppercase">
              Remarks
            </span>
            <textarea
              value={fromdata.Remarks || ""}
              onChange={(e) => handleDateChange("Remarks", e.target.value)}
              placeholder="Anything the branch head should know about today…"
              style={{
                width: "100%",
                minHeight: "70px",
                resize: "vertical",
                border: "1px solid var(--border, #E2E8F0)",
                borderRadius: "10px",
                background: "var(--field, #FFFFFF)",
                color: "var(--fg, #1E293B)",
                fontSize: "12.5px",
                padding: "10px 11px",
                outline: "none",
              }}
              className="dark:!bg-[#0E1524] dark:!text-[#E7ECF3] dark:!border-[#1F2937] focus:!border-[#4F46E5] dark:focus:!border-[#8B84FF]"
            />
          </label>
        </div>

        {/* ── SUBMITTED CHECKLISTS TABLE ── */}
        <ServiceTablePagination
          columns={columns}
          data={reportData}
          title={`Submitted checklists · ${reportData.length} days`}
          columnsDownload={columnsDownload}
          showTopSearch={false}
          showExcelExport={true}
          initialPageSize={10}
          onRowDoubleClick={onRowDoubleClick}
          headerClassName="!text-[10.5px] !font-[700] !tracking-[0.05em] !uppercase !text-[#64748B] dark:!text-[#94A3B8] !bg-[#F8FAFC] dark:!bg-[#0E1524] !py-[10px] !px-[12px] !border-b !border-[#E2E8F0] dark:!border-[#1F2937]"
          containerClassName="rounded-[12px] border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] overflow-hidden [&_.font-bold.text-base]:normal-case [&_.font-bold.text-base]:text-[14px] [&_.font-bold.text-base]:font-[600] [&_.font-bold.text-base]:text-[#1E293B] dark:[&_.font-bold.text-base]:text-[#E7ECF3] [&_tbody_tr]:hover:!bg-[#F8FAFC] dark:[&_tbody_tr]:hover:!bg-[#0E1524] [&_td]:!py-[11px] [&_td]:!px-[12px] [&_td]:!border-b [&_td]:!border-[#E2E8F0] dark:[&_td]:!border-[#1F2937]"
        />
      </main>

      {/* ── RESPONSIVE FIXED FOOTER ACTION BAR ── */}
      <div className="fixed bottom-0 left-0 sm:left-[var(--sidebar-width,68px)] right-0 z-40 bg-white dark:bg-[#111827] border-t border-[#E2E8F0] dark:border-[#1F2937] px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3.5 shadow-[0_-4px_16px_rgba(15,23,42,0.04)] backdrop-blur-md transition-[left] duration-150 ease-in-out">
        <span className="text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
          {statusLine}
        </span>
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleClearDay}
            className="border border-[#E2E8F0] dark:border-[#1F2937] bg-white dark:bg-[#111827] text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#E7ECF3] hover:bg-[#F1F5F9] dark:hover:bg-[#182235] text-[12.5px] font-[550] px-[14px] py-[9px] rounded-[10px] cursor-pointer transition-colors"
          >
            Clear day
          </button>

          <button
            type="button"
            onClick={() =>
              fromdata.UTD ? updateDailyHRReport() : saveDailyHRReport()
            }
            disabled={isLoading}
            className="flex items-center gap-[7px] border border-transparent text-white text-[12.5px] font-[600] px-[17px] py-[9px] rounded-[10px] cursor-pointer shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)] hover:brightness-105 transition-all disabled:opacity-50"
            style={{ backgroundColor: "#4F46E5" }}
          >
            <Save className="w-4 h-4" />
            {fromdata.UTD ? "Update checklist" : "Save checklist"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<HashloaderComponent isLoading={true} />}>
      <DailyHRReportContent />
    </Suspense>
  );
}
