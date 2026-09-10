"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import Swal from "sweetalert2";
import {
  ExternalLink,
  Calendar,
  RefreshCw,
  Clock,
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle,
  IndianRupee 
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import HashloaderComponent from "@/components/Templates/hashloader";
import LeaveProgressRing from "@/components/Templates/progressing";

const AttendanceCard = ({ attendance }: { attendance: any }) => {
  return (
    <div className="w-full rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-[#0B1220] mb-3 transition-all">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
            {attendance.EmpName}
          </h3>
          <p className="text-sm text-slate-400">{attendance.DateDisplay}</p>
        </div>
        <span
          className="px-3 py-1 text-sm font-semibold rounded-full shadow-2xs"
          style={{
            backgroundColor: attendance.colorCode || "#EEF2FF",
            color: "#1E293B",
          }}
        >
          {attendance.AtnStatus}
        </span>
      </div>
      <div className="flex items-center justify-between pt-2.5 text-sm text-slate-600 dark:text-slate-300">
        <div>
          <p>
            In Time: <span className="font-semibold text-slate-800 dark:text-slate-200">{attendance.In1 || "—"}</span>
          </p>
          <p>
            Out Time: <span className="font-semibold text-slate-800 dark:text-slate-200">{attendance.Out1 || "—"}</span>
          </p>
        </div>
        <div className="text-right">
          <span className="text-slate-400">Paid value: </span>
          <span className="font-bold text-base text-indigo-600 dark:text-indigo-400">
            {attendance.paidDays}
          </span>
        </div>
      </div>
    </div>
  );
};

function showSideAlert(message: string, type: any) {
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

export default function SalaryApproverGridPage() {
  const user = useCurrentUser();
  const [isLoading, setIsLoading] = useState(false);

  const getCurrentMonth = () => {
    const currentMonth = new Date().getMonth() + 1;
    return currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`;
  };

  const currentDate = new Date();
  const initaldata = {
    month: getCurrentMonth(),
    year: currentDate.getFullYear(),
    EMPCODE: "",
    Designation: "",
    MobileNo: "",
    Email: "",
    EmpName: "",
    Location: "",
    Department: "",

    startDate: null,
    AttendanceDate: null,
    Name: null,
    OutTime: null,
    InTime: null,
    weekdays: null,
    MP_Remark: null,
    MP_Reason: null,
    shift: null,
    endDate: null,
    AttdenceDate2: null,
  };

  const [misdata, setMiscdata] = useState<any>(initaldata);
  const [options, setOptions] = useState<any[] | null>(null);
  const [UserCode, setUserCode] = useState<string | null>(null);

  const [ViewMispunchData, setViewMispunchData] = useState<any[]>([]);
  const [IsMispunchData, setIsMispunchData] = useState(false);
  const [BackButton, setBackButton] = useState(false);
  const [isClicked, setisClicked] = useState(false);

  const [roasterCreated, setRoasterCreated] = useState<boolean | null>(null);
  const [roasterCorrected, setRoasterCorrected] = useState<boolean | null>(null);
  const [roasterMessage, setRoasterMessage] = useState("");
  const [WeeklyOff, setWeeklyOff] = useState<string | null>(null);
  const [LeaveData, setLeaveData] = useState<any[]>([]);
  const [SalaryInfo, setSalaryInfo] = useState<any[]>([]);

  const leaveTypes = [
    "Casual Leave",
    "Paid Leave",
    "Sick Leave",
    "Comp. Off (CO)",
  ];

  const [startDate, setstartDate] = useState<string | null>(null);
  const [EndDate, setEndDate] = useState<string | null>(null);

  const [summary, setSummary] = useState({
    Absents: 0,
    HalfDays: 0,
    Holidays: 0,
    PaidDays: 0,
    Presents: 0,
    Relaxations: 0,
    UnAprMP: 0,
    WO: 0,
    LateMarks: 0,
    Overtime: 0,
  });

  const months = [
    { value: "01", label: "01 - Jan" },
    { value: "02", label: "02 - Feb" },
    { value: "03", label: "03 - Mar" },
    { value: "04", label: "04 - Apr" },
    { value: "05", label: "05 - May" },
    { value: "06", label: "06 - Jun" },
    { value: "07", label: "07 - Jul" },
    { value: "08", label: "08 - Aug" },
    { value: "09", label: "09 - Sep" },
    { value: "10", label: "10 - Oct" },
    { value: "11", label: "11 - Nov" },
    { value: "12", label: "12 - Dec" },
  ];

  useEffect(() => {
    const fetchData1 = async () => {
      if (!user?.Comp_Code) return;            // ✅ comp code aane tak wait
      if (options?.length) return;             // ✅ options check sahi

      setisClicked(true);
      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/users/findAllEmployee`,
          { branch: (user as any)?.branch },
          {
            headers: {
              compcode: (user as any)?.Comp_Code,
              name: (user as any)?.name,
            },
          }
        );
        setOptions(response.data.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setisClicked(false);
      }
    };

    fetchData1();
  }, [user?.Comp_Code, options?.length]);

  const getCurrentFinancialYear = () => {
    const d = new Date();
    const currentYear = d.getFullYear();
    const financialYearStartMonth = 3;
    if (d.getMonth() < financialYearStartMonth) {
      return currentYear - 1;
    }
    return currentYear;
  };

  const generateFinancialYearsArray = () => {
    const currentYear = getCurrentFinancialYear();
    const financialYears = [];
    for (let i = -2; i < 4; i++) {
      const year = currentYear - i;
      financialYears.push({
        value: `${year}`,
        label: `${year}`,
      });
    }
    return financialYears;
  };

  const yearoptions = generateFinancialYearsArray();

  const handleMispunchData = (name: string, value: any) => {
    if (name === "EMPCODE") setUserCode(value);
    setMiscdata((prevData: any) => ({ ...prevData, [name]: value }));
  };

  const fetchUserData = async () => {
    try {
      if (!misdata.EMPCODE) return;
      setisClicked(true);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/users/approvalmatrixfindone`,
        { empcode: misdata.EMPCODE },
        {
          headers: {
            compcode: (user as any)?.Comp_Code,
            name: (user as any)?.name,
          },
        }
      );
      setisClicked(false);
      const data = response.data.data;
      setMiscdata((prevState: any) => ({
        ...prevState,
        EmpName: data?.EMPNAME?.trim() || "",
        Location: data?.Location || data?.region1 || "",
        Email: data?.CORPORATEMAILID || data?.EMAIL || "",
        Designation: data?.EMPLOYEEDESIGNATION || data?.designation || "",
        MobileNo: data?.MOBILE_NO || data?.MOBILENO || "",
        Department: data?.Department || data?.SECTION || "",
      }));
    } catch (error) {
      setisClicked(false);
      console.error("An error occurred while fetching user data:", error);
    }
  };

  const Roastercreation = async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/RoasterCreation`,
        {
          empcode: misdata.EMPCODE,
          month: misdata.month,
          year: misdata.year,
        },
        {
          headers: {
            compcode: (user as any)?.Comp_Code,
            name: (user as any)?.name,
          },
        }
      );
      setRoasterCreated(response.data.isCreted);
      setRoasterCorrected(response.data.isCorrect);
      setRoasterMessage(response.data.message || "");
      setWeeklyOff(response.data.weeklyOff?.WEEKLYOFF || "Sunday");
      setLeaveData(response.data.LeaveData || []);
      setSalaryInfo(response.data.SalaryInfoData || []);
    } catch (error) {
      console.error("An error occurred while fetching roaster data:", error);
    }
  };

  const processedLeaveData = leaveTypes.map((type) => {
    const leave = LeaveData.find((item: any) => item.Leave_TypeName === type) || {};
    return {
      leaveType: type,
      opBal: leave.Op_Bal || 0,
      availLev: leave.Avail_Lev || 0,
      clBal: leave.Cl_Bal || 0,
      Gen_Lev: leave.Gen_Lev || 0,
    };
  });

  const MonthData = async () => {
    if (!user?.Comp_Code || !misdata?.month) return null;

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/mobile/MonthMasterRange`,
        { month: misdata.month },
        {
          headers: {
            compcode: (user as any)?.Comp_Code,
            name: (user as any)?.name,
          },
        }
      );

      const result = response.data.Result?.[0];
      if (result) {
        setstartDate(result.Misc_Dtl1_Date);
        setEndDate(result.Misc_Dtl2_Date);
        return { startDate: result.Misc_Dtl1_Date, endDate: result.Misc_Dtl2_Date };
      }
      return null;
    } catch (error) {
      console.error("Error fetching month range:", error);
      return null;
    }
  }

  useEffect(() => {
    if (!user?.Comp_Code) return;
    if (!misdata?.month) return;

    MonthData();
  }, [user?.Comp_Code, misdata?.month]);

  const fetchData = async (sDate?: any, eDate?: any) => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/getAttendance1`,
        {
          params: {
            empCode: misdata.EMPCODE,
            startDate: sDate || startDate,
            endDate: eDate || EndDate,
          },
          headers: {
            compcode: (user as any)?.Comp_Code,
            name: (user as any)?.name,
          },
        }
      );

      setSummary(response.data?.summary || {});
      setBackButton(false);
      setIsMispunchData(false);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    }
  };

  const MispunchdtlData = async () => {
    if (!misdata.EMPCODE) {
      showSideAlert("Please select EmpCode", "info");
      return;
    }
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/getAttendance1`,
        {
          params: {
            empCode: misdata.EMPCODE,
            startDate: startDate,
            endDate: EndDate,
          },
          headers: {
            compcode: (user as any)?.Comp_Code,
            name: (user as any)?.name,
          },
        }
      );
      setViewMispunchData(response.data.Result || []);
      setIsMispunchData(true);
      setBackButton(true);
    } catch (error) {
      console.error("Error fetching mispunch details:", error);
    }
  };

  const saveUserData1 = async () => {
    if (!misdata.EMPCODE) {
      showSideAlert("Please select EmpCode", "info");
      return;
    }
    try {
      setIsLoading(true);
      const dates = await MonthData();
      if (!dates) {
        showSideAlert("Month range data not found", "error");
        setIsLoading(false);
        return;
      }
      await fetchUserData();
      await Roastercreation();
      await fetchData(dates.startDate, dates.endDate);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const RoasterCreationSave = async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/CreateRoaster`,
        {
          empCode: misdata.EMPCODE,
          month: misdata.month,
          year: misdata.year,
        },
        {
          headers: {
            compcode: (user as any)?.Comp_Code,
            name: (user as any)?.name,
          },
        }
      );
      if (response.data.success === true) {
        setRoasterCreated(true);
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Roster Created Successfully",
          confirmButtonColor: "#4338CA",
        });
      }
    } catch (error) {
      console.error("Error creating roaster:", error);
    }
  };

  // Avatar Initials
  const initials = (misdata.EmpName || "KV")
    .split(" ")
    .filter(Boolean)
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const monthLabel =
    months.find((m) => m.value === String(misdata.month).padStart(2, "0"))?.label?.split(" - ")?.[1] || "JUL";

  return (
    <div className="w-full space-y-4 pb-8">
      {/* ========================================================================= */}
      {/* 1. TOP FILTER BAR */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-[#0B1220]">
        <div className="flex flex-wrap items-end gap-3 sm:gap-4">
          {/* Find Employee */}
          <div className="min-w-[240px] flex-1 sm:max-w-xs">
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5 tracking-tight">
              Find Employee
            </label>
            <div className="relative">
              <input
                list="employee-options"
                type="text"
                placeholder="Search Emp Code / Name..."
                value={misdata.EMPCODE || ""}
                onChange={(e) => handleMispunchData("EMPCODE", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveUserData1();
                }}
                className="w-full h-11 px-4 text-base border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4338CA] shadow-2xs"
              />
              <datalist id="employee-options">
                {options?.map((emp: any, idx: number) => {
                  const code = emp.EMPCODE || emp.empcode || emp.value || "";
                  const name = emp.EMPNAME || emp.name || emp.label || "";
                  return (
                    <option key={idx} value={code}>
                      {code} - {name}
                    </option>
                  );
                })}
              </datalist>
            </div>
          </div>

          {/* Month */}
          <div className="w-32 sm:w-36">
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5 tracking-tight">
              Month
            </label>
            <select
              value={misdata.month}
              onChange={(e) => handleMispunchData("month", e.target.value)}
              className="w-full h-11 px-3 text-base font-semibold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#4338CA] shadow-2xs cursor-pointer"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div className="w-32 sm:w-36">
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1.5 tracking-tight">
              Year
            </label>
            <select
              value={misdata.year?.toString()}
              onChange={(e) => handleMispunchData("year", e.target.value)}
              className="w-full h-11 px-3 text-base font-semibold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#4338CA] shadow-2xs cursor-pointer"
            >
              {yearoptions.map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label}
                </option>
              ))}
            </select>
          </div>

          {/* Fetch Action Button */}
          <button
            type="button"
            onClick={saveUserData1}
            disabled={isLoading}
            title="Fetch Employee Salary Grid"
            className="h-11 px-6 rounded-xl bg-[#4338CA] hover:bg-indigo-700 text-white font-bold text-base inline-flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer active:scale-95"
          >
            {isLoading ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Search className="h-5 w-5" />
                <span>Fetch</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. EMPLOYEE HEADER PROFILE CARD */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:px-6 sm:py-5 shadow-sm dark:border-slate-800 dark:bg-[#0B1220] justify-between">
        <div className="flex flex-col lg:flex-row lg:items-center  justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 lg:gap-8 w-full sm:flex-nowrap">
            {/* Avatar + Name + Subtitle */}
            <div className="flex items-center gap-3.5 min-w-0 shrink-0">
              <div className="w-20 h-20 rounded-full bg-[#EEF2FF] text-[#4338CA] dark:bg-indigo-950/60 dark:text-indigo-400 font-bold text-2xl flex items-center justify-center shrink-0 select-none shadow-2xs border border-indigo-100 dark:border-indigo-900/60">
                {initials}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 truncate leading-tight">
                  {misdata.EmpName || "Select an Employee"}
                </h2>
                <p className="text-sm sm:text-base text-slate-400 dark:text-slate-500 font-medium mt-0.5 truncate">
                  {misdata.EMPCODE || "—"} · {misdata.Designation || "General Manager"}
                </p>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="hidden sm:block h-8 w-px bg-slate-200 dark:bg-slate-800 shrink-0" />

            {/* Details Row: Location, Department, Email, Mobile */}
            <div className="flex items-center gap-6 sm:gap-8 lg:gap-10 w-full sm:flex-1 sm:justify-between sm:flex-nowrap min-w-0">
              <div className="shrink-0">
                <span className="text-slate-400 uppercase font-semibold text-[12px] tracking-wider block">
                  LOCATION
                </span>
                <span className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-200 block mt-0.5">
                  {misdata.Location || "Branch - 1"}
                </span>
              </div>

              <div className="shrink-0">
                <span className="text-slate-400 uppercase font-semibold text-[12px] tracking-wider block">
                  DEPARTMENT
                </span>
                <span className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-200 block mt-0.5">
                  {misdata.Department || "Sales"}
                </span>
              </div>

              <div className="min-w-0">
                <span className="text-slate-400 uppercase font-semibold text-[12px] tracking-wider block">
                  EMAIL
                </span>
                <span className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-200 block mt-0.5 truncate">
                  {misdata.Email || "—"}
                </span>
              </div>

              <div className="shrink-0">
                <span className="text-slate-400 uppercase font-semibold text-[12px] tracking-wider block">
                  MOBILE NO.
                </span>
                <span className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-200 block mt-0.5">
                  {misdata.MobileNo || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Link: Open Master */}
          <div className="shrink-0 flex items-center justify-end">
            <Link
              href="/payroll/masters/Employee_Master"
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#4338CA] dark:border-slate-800 dark:bg-slate-900 dark:text-indigo-400 font-semibold text-sm sm:text-base inline-flex items-center gap-1.5 shadow-2xs transition-all"
            >
              <span>Open master</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. THREE STATUS CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Card 1: Roster creation */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-[#0B1220] flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-[#4338CA] dark:text-indigo-400">
                <Calendar className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Roster creation
              </h3>
            </div>

            {roasterCreated === true && roasterCorrected !== false ? null : roasterCreated === false || roasterCorrected === false ? (
              <button
                type="button"
                onClick={RoasterCreationSave}
                className="px-3.5 py-1 rounded-lg text-sm font-bold bg-[#4338CA] hover:bg-indigo-700 text-white shadow-2xs transition-colors cursor-pointer"
              >
                Create
              </button>
            ) : (
              <span className="px-3 py-0.5 rounded-full text-sm font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Pending
              </span>
            )}
          </div>

          {roasterCreated !== null ? (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-6 sm:gap-8 flex-wrap">
                {/* ROSTER CREATED */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg sm:text-base tracking-wide text-slate-900 dark:text-slate-100 uppercase">
                    ROSTER CREATED
                  </span>
                  {roasterCreated === true ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 text-md shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  )}
                </div>

                {/* ROSTER CORRECT */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg sm:text-base tracking-wide text-slate-900 dark:text-slate-100 uppercase">
                    ROSTER CORRECT
                  </span>
                  {roasterCorrected === true ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  )}
                </div>
              </div>

              <p className="text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-300">
                {roasterMessage || (roasterCreated && roasterCorrected ? "All Ok" : "Dates Missing")}
              </p>
            </div>
          ) : (
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              {roasterMessage ||
                "Roster created and verified correct for the full month. Shift: General (09:30 – 18:30)."}
            </p>
          )}
        </div>

        {/* Card 2: Leave generation */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-[#0B1220] flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                <RefreshCw className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Leave generation
              </h3>
            </div>

            <span className="px-3 py-0.5 rounded-full text-sm font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
              Done
            </span>
          </div>
          <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
            Monthly accrual posted on 01 {monthLabel} — casual 1.0, paid 1.25, sick 0.5.
          </p>
        </div>

        {/* Card 3: Weekly off */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-[#0B1220] flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                <Clock className="h-4.5 w-4.5" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Weekly off
              </h3>
            </div>

            <span className="px-3 py-0.5 rounded-full text-sm font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
              {WeeklyOff || "Sunday"}
            </span>
          </div>
          <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
            {summary.WO || 4} week-offs in this period. Rotational off not applicable for this grade.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. ATTENDANCE & LEAVE INFORMATION */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
  {/* Left: ATTENDANCE */}
  <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0B1220] flex flex-col overflow-hidden">
    <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800 shrink-0">
      <div className="flex items-center gap-3">
        <Calendar className="h-5 w-5 text-[#4338CA] dark:text-indigo-400" />
        <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider text-slate-900 dark:text-slate-100">
          ATTENDANCE · {monthLabel} {misdata.year}
        </h3>
      </div>

      {BackButton ? (
        <button
          type="button"
          onClick={() => fetchData(startDate, EndDate)}
          className="px-5 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 shadow-sm transition-colors inline-flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={MispunchdtlData}
          className="px-5 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#4338CA] dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-300 shadow-sm transition-colors cursor-pointer"
        >
          View calendar
        </button>
      )}
    </div>

    {/* Attendance Content */}
    {IsMispunchData ? (
      <div className="flex-1 p-4 max-h-[360px] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {ViewMispunchData.length === 0 ? (
          <p className="text-base text-slate-400 py-8 text-center font-medium">
            No mispunch records found
          </p>
        ) : (
          ViewMispunchData.map((attendance, index) => (
            <AttendanceCard key={index} attendance={attendance} />
          ))
        )}
      </div>
    ) : (
      <div className="flex-1 min-h-0 grid grid-rows-5 divide-y divide-slate-200 dark:divide-slate-800 ">
        {/* Row 1 */}
        <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800 items-stretch">
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 h-full">
            <div className="flex items-center gap-3">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: "#10b981", minWidth: "10px", minHeight: "10px" }}
              />
              <span className="text-slate-900 dark:text-slate-100 font-medium text-xl sm:text-xl">
                Present
              </span>
            </div>
            <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 tabular-nums">
              {summary.Presents ?? 0}
            </span>
          </div>

          <div className="flex items-center justify-between px-5 sm:px-6 py-4 h-full">
            <div className="flex items-center gap-3">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: "#ef4444", minWidth: "10px", minHeight: "10px" }}
              />
              <span className="text-slate-900 dark:text-slate-100 font-medium text-xl sm:text-xl">
                Absent
              </span>
            </div>
            <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 tabular-nums">
              {summary.Absents ?? 0}
            </span>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800 items-stretch">
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 h-full">
            <div className="flex items-center gap-3">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: "#f59e0b", minWidth: "10px", minHeight: "10px" }}
              />
              <span className="text-slate-900 dark:text-slate-100 font-medium text-xl sm:text-xl">
                Half day
              </span>
            </div>
            <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 tabular-nums">
              {summary.HalfDays ?? 0}
            </span>
          </div>

          <div className="flex items-center justify-between px-5 sm:px-6 py-4 h-full">
            <div className="flex items-center gap-3">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: "#0ea5e9", minWidth: "10px", minHeight: "10px" }}
              />
              <span className="text-slate-900 dark:text-slate-100 font-medium text-xl sm:text-xl">
                Week off
              </span>
            </div>
            <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 tabular-nums">
              {summary.WO ?? 0}
            </span>
          </div>
        </div>

        {/* Row 3 */}
        <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800 items-stretch">
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 h-full">
            <div className="flex items-center gap-3">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: "#8b5cf6", minWidth: "10px", minHeight: "10px" }}
              />
              <span className="text-slate-900 dark:text-slate-100 font-medium text-xl sm:text-xl">
                Holiday
              </span>
            </div>
            <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 tabular-nums">
              {summary.Holidays ?? 0}
            </span>
          </div>

          <div className="flex items-center justify-between px-5 sm:px-6 py-4 h-full">
            <div className="flex items-center gap-3">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: "#3b82f6", minWidth: "10px", minHeight: "10px" }}
              />
              <span className="text-slate-900 dark:text-slate-100 font-medium text-xl sm:text-xl">
                Relaxation
              </span>
            </div>
            <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 tabular-nums">
              {summary.Relaxations ?? 0}
            </span>
          </div>
        </div>

        {/* Row 4 */}
        <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800 items-stretch">
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 h-full">
            <div className="flex items-center gap-3">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: "#10b981", minWidth: "10px", minHeight: "10px" }}
              />
              <span className="text-slate-900 dark:text-slate-100 font-medium text-xl sm:text-xl">
                Paid days
              </span>
            </div>
            <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 tabular-nums">
              {summary.PaidDays ?? 0}
            </span>
          </div>

          <div className="flex items-center justify-between px-5 sm:px-6 py-4 h-full">
            <div className="flex items-center gap-3">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: "#ec4899", minWidth: "10px", minHeight: "10px" }}
              />
              <span className="text-slate-900 dark:text-slate-100 font-medium text-xl sm:text-xl">
                Unapproved MP
              </span>
            </div>
            <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 tabular-nums">
              {summary.UnAprMP ?? 0}
            </span>
          </div>
        </div>

        {/* Row 5 */}
        <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800 items-stretch">
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 h-full">
            <div className="flex items-center gap-3">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: "#f59e0b", minWidth: "10px", minHeight: "10px" }}
              />
              <span className="text-slate-900 dark:text-slate-100 font-medium text-xl sm:text-xl">
                Late marks
              </span>
            </div>
            <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 tabular-nums">
              {summary.LateMarks ?? 0}
            </span>
          </div>

          <div className="flex items-center justify-between px-5 sm:px-6 py-4 h-full">
            <div className="flex items-center gap-3">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: "#6366f1", minWidth: "10px", minHeight: "10px" }}
              />
              <span className="text-slate-900 dark:text-slate-100 font-medium text-xl sm:text-xl">
                Overtime hrs
              </span>
            </div>
            <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 tabular-nums">
              {summary.Overtime ?? 0}
            </span>
          </div>
        </div>
      </div>
    )}
  </div>

  {/* Right: LEAVE INFORMATION */}
  <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0B1220] overflow-hidden">
    <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <RefreshCw className="h-5 w-5 text-[#4338CA] dark:text-indigo-400" />
        <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider text-slate-900 dark:text-slate-100">
          LEAVE INFORMATION
        </h3>
      </div>
    </div>

    <div className="p-4 sm:p-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {processedLeaveData.map((data, index) => (
          <div
            key={index}
            className="rounded-xl bg-white dark:border-slate-800 dark:bg-[#0B1220] p-4 sm:p-5"
          >
            <LeaveProgressRing
              leaveType={data.leaveType}
              opBal={data.opBal}
              availLev={data.availLev}
              clBal={data.clBal}
              GenLev={data.Gen_Lev}
            />
          </div>
        ))}
      </div>
    </div>
  </div>
</div>

      {/* ========================================================================= */}
      {/* 5. SALARY INFORMATION */}
      {/* ========================================================================= */}
       <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <span className="text-[#4338CA] font-bold text-xl leading-none">
            <IndianRupee/>
          </span>
          <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider text-slate-900">
            SALARY INFORMATION
          </h3>
        </div>
        <span className="text-sm text-slate-600">
          Read-only · from Employee Master
        </span>
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* Section 1 */}
        <div className="text-sm sm:text-base">
          {/* Row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-slate-200 border-b border-slate-200">
            <div className="flex items-center justify-between px-0 sm:px-5 py-4">
              <span className="text-slate-600 font-medium">PF effective from</span>
              <span className="font-semibold text-slate-900">
                {SalaryInfo[0]?.PF_Date
                  ? new Date(SalaryInfo[0].PF_Date)
                      .toLocaleDateString("en-GB")
                      .replaceAll("/", "-")
                  : "—"}
              </span>
            </div>

            <div className="flex items-center justify-between px-0 sm:px-5 py-4">
              <span className="text-slate-600 font-medium">PF no.</span>
              <span className="font-semibold text-slate-900 font-mono">
                {SalaryInfo[0]?.pfnumber || "—"}
              </span>
            </div>

            <div className="flex items-center justify-between px-0 sm:px-5 py-4">
              <span className="text-slate-600 font-medium">UAN no.</span>
              <span className="font-semibold text-slate-900 font-mono">
                {SalaryInfo[0]?.UAN_No || "—"}
              </span>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-slate-200 border-b border-slate-200">
            <div className="flex items-center justify-between px-0 sm:px-5 py-4">
              <span className="text-slate-600 font-medium">ESIC effective from</span>
              <span className="font-semibold text-slate-900">
                {SalaryInfo[0]?.ESI_Date
                  ? new Date(SalaryInfo[0].ESI_Date)
                      .toLocaleDateString("en-GB")
                      .replaceAll("/", "-")
                  : "—"}
              </span>
            </div>

            <div className="flex items-center justify-between px-0 sm:px-5 py-4">
              <span className="text-slate-600 font-medium">ESIC no.</span>
              <span className="font-semibold text-slate-900 font-mono">
                {SalaryInfo[0]?.esinumber || "—"}
              </span>
            </div>

            <div className="flex items-center justify-between px-0 sm:px-5 py-4">
              <span className="text-slate-600 font-medium">LWF</span>
              <span className="font-semibold text-slate-900">
                {SalaryInfo[0]?.LWFNO || "Applicable"}
              </span>
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 sm:divide-x divide-slate-200">
            <div className="flex items-center justify-between px-0 sm:px-5 py-4">
              <span className="text-slate-600 font-medium">Bank name</span>
              <span className="font-semibold text-slate-900">
                {SalaryInfo[0]?.BANKNAME || "—"}
              </span>
            </div>

            <div className="flex items-center justify-between px-0 sm:px-5 py-4">
              <span className="text-slate-600 font-medium">Account number</span>
              <span className="font-semibold text-slate-900 font-mono">
                {SalaryInfo[0]?.BANKACCOUNTNO || "—"}
              </span>
            </div>

            <div className="flex items-center justify-between px-0 sm:px-5 py-4">
              <span className="text-slate-600 font-medium">IFSC code</span>
              <span className="font-semibold text-slate-900 font-mono">
                {SalaryInfo[0]?.ifsc_code || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Salary Breakup */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
            <h4 className="font-bold text-sm sm:text-base uppercase tracking-wider text-slate-700">
              SALARY BREAKUP
            </h4>
            <span className="font-semibold text-slate-900">
              Gross ₹
              {SalaryInfo[0]?.Gross_Salary
                ? Number(SalaryInfo[0].Gross_Salary).toLocaleString("en-IN")
                : "0"}
            </span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-200">
            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-4 sm:divide-x divide-slate-200">
              <div className="px-6 py-5">
                <div className="text-slate-600 font-medium text-sm">Emp. basic</div>
                <div className="mt-1 font-semibold text-lg text-slate-900">
                  ₹{SalaryInfo[0]?.Basic ? Number(SalaryInfo[0].Basic).toLocaleString("en-IN") : "0"}
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="text-slate-600 font-medium text-sm">HRA</div>
                <div className="mt-1 font-semibold text-lg text-slate-900">
                  ₹{SalaryInfo[0]?.HRA ? Number(SalaryInfo[0].HRA).toLocaleString("en-IN") : "0"}
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="text-slate-600 font-medium text-sm">Conveyance</div>
                <div className="mt-1 font-semibold text-lg text-slate-900">
                  ₹{SalaryInfo[0]?.Conveyance ? Number(SalaryInfo[0].Conveyance).toLocaleString("en-IN") : "0"}
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="text-slate-600 font-medium text-sm">Medical</div>
                <div className="mt-1 font-semibold text-lg text-slate-900">
                  ₹{SalaryInfo[0]?.Medical ? Number(SalaryInfo[0].Medical).toLocaleString("en-IN") : "0"}
                </div>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-4 sm:divide-x divide-slate-200">
              <div className="px-6 py-5">
                <div className="text-slate-600 font-medium text-sm">Other</div>
                <div className="mt-1 font-semibold text-lg text-slate-900">
                  ₹{SalaryInfo[0]?.Other ? Number(SalaryInfo[0].Other).toLocaleString("en-IN") : "0"}
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="text-slate-600 font-medium text-sm">Washing</div>
                <div className="mt-1 font-semibold text-lg text-slate-900">
                  ₹{SalaryInfo[0]?.Washing ? Number(SalaryInfo[0].Washing).toLocaleString("en-IN") : "0"}
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="text-slate-600 font-medium text-sm">Gross salary</div>
                <div className="mt-1 font-semibold text-lg text-slate-900">
                  ₹{SalaryInfo[0]?.Gross_Salary ? Number(SalaryInfo[0].Gross_Salary).toLocaleString("en-IN") : "0"}
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="text-slate-600 font-medium text-sm">Annual CTC</div>
                <div className="mt-1 font-semibold text-lg text-slate-900">
                  {SalaryInfo[0]?.Gross_Salary
                    ? `₹${((Number(SalaryInfo[0].Gross_Salary) * 12) / 100000).toFixed(2)} L`
                    : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Global Skeleton Loader */}
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
