"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
    ArrowLeft,
    ArrowLeftRight,
    ArrowRight,
    ArrowUpRight,
    Building2,
    Calendar,
    CheckCircle2,
    ChevronDown,
    Clock,
    DoorClosed,
    Download,
    Eye,
    FileSpreadsheet,
    FileText,
    Filter,
    Fingerprint,
    HelpCircle,
    Inbox,
    Lock,
    Moon,
    RefreshCw,
    Search,
    ShieldAlert,
    SlidersHorizontal,
    Sparkles,
    Sun,
    UserCheck,
    Users,
    X,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import HashloaderComponent from "@/components/Templates/hashloader";
import { Chart, ColumnChart, DonutChart } from "@/components/atoms/chart";

// ============================================================================
// Types
// ============================================================================

interface ManagerDashboardData {
    summary: {
        teamStrength: number;
        presentToday: number;
        onLeaveToday?: number;
        absentToday?: number;
        presentPercentage?: number;
        waitingOnMe: number;
        monthlyMispunches: number;
    };
    attendance: {
        shifts: Array<{
            SHIFTSTARTTIME: number;
            SHIFTENDTIME: number;
            SHIFT?: string;
        }>;
        last7Days: Array<{
            DATE_LABEL: string;
            DAY_NAME: string;
            ON_TIME: number;
            LATE: number;
            ON_LEAVE: number;
            ABSENT: number;
            TOTAL_EMP: number;
            ATTENDANCE_PCT: number;
        }>;
        departments: Array<{
            DEPT_CODE: string;
            DEPT_NAME: string;
            TOTAL: number;
            PRESENT: number;
            ABSENT: number;
            ON_TIME: number;
            LATE: number;
            ON_LEAVE: number;
        }>;
        employees: {
            all: any[];
            present: any[];
            absent: any[];
        };
    };
    salary: {
        overall: {
            gross: number;
            deduction: number;
            netPay: number;
        };
        byDepartment: Array<{
            deptCode: string;
            deptName: string;
            empCount: number;
            gross: number;
            deduction: number;
            netPay: number;
            grossPercentage: number;
        }>;
        byLocation: Array<{
            locCode: string;
            locName: string;
            empCount: number;
            gross: number;
            deduction: number;
            netPay: number;
            grossPercentage: number;
        }>;
    };
    actions: Array<{
        REFERENCE_ID: any;
        EMP_CODE: string;
        EMP_NAME: string;
        DESIGNATION: string;
        DEPT_CODE: string;
        DEPARTMENT: string;
        ACTION_DATE: string;
        ACTION_TYPE: string;
        TITLE: string;
        REMARKS: string;
        APPLIED_ON: string;
        PENDING_LEVEL: string;
    }>;
    watchlist: Array<{
        employeeId: string;
        employeeName: string;
        department: string;
        location: string;
        issueType: string;
        message: string;
        value: string;
        severity: "HIGH" | "MEDIUM" | "LOW";
        referenceId: string;
    }>;
}

// ============================================================================
// Helper Utilities
// ============================================================================

const showSideAlert = (message: string, type: "success" | "error" | "warning" | "info") => {
    Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
    }).fire({
        icon: type,
        title: message,
    });
};

const formatCurrencyLakhs = (val: number | string | undefined | null) => {
    const num = Number(val) || 0;
    if (num >= 10000000) {
        return `₹${(num / 10000000).toFixed(2)} Cr`;
    }
    if (num >= 100000) {
        return `₹${(num / 100000).toFixed(2)} L`;
    }
    if (num >= 1000) {
        return `₹${(num / 1000).toFixed(1)} k`;
    }
    return `₹${num.toLocaleString("en-IN")}`;
};

const formatTo12Hr = (timeVal: number | string | undefined | null) => {
    if (timeVal === undefined || timeVal === null || timeVal === "") return "--:--";
    const num = Number(timeVal);
    if (isNaN(num)) return String(timeVal);
    const hour = Math.floor(num);
    const min = Math.round((num - hour) * 60);
    const period = hour >= 12 ? "PM" : "AM";
    const h = hour % 12 || 12;
    return `${h}:${String(min).padStart(2, "0")} ${period}`;
};

const DEPARTMENT_COLORS = [
    "#2563eb", // blue (SERVICE)
    "#10b981", // green (SALES)
    "#f59e0b", // amber (BODYSHOP)
    "#ef4444", // red (CC - SERVICE)
    "#8b5cf6", // purple (ACCOUNT)
    "#ec4899", // pink (HOUSEKEEPING)
    "#06b6d4", // cyan (SPARE PART)
    "#84cc16", // lime (SECURITY)
    "#ea580c", // orange (INSURANCE)
    "#6366f1", // indigo (MANAGEMENT)
    "#d946ef", // fuchsia (TRUE VALUE)
    "#14b8a6",
    "#e11d48",
    "#3b82f6",
    "#a855f7",
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ManagerDashboard() {
    const router = useRouter();
    const user = useCurrentUser();

    // State: Filters & View
    const [selectedRole, setSelectedRole] = useState("Manager");
    const [selectedMonth, setSelectedMonth] = useState("2026-07");
    const [selectedShift, setSelectedShift] = useState("");
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [showAiBanner, setShowAiBanner] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAllDeptModalOpen, setIsAllDeptModalOpen] = useState(false);
    const [selectedDeptModal, setSelectedDeptModal] = useState<{
        open: boolean;
        deptName: string;
        deptCode: string;
        loading: boolean;
        data: any[];
        activeTab: "all" | "present" | "absent" | "leave" | "late";
        search: string;
    }>({
        open: false,
        deptName: "",
        deptCode: "",
        loading: false,
        data: [],
        activeTab: "all",
        search: "",
    });

    // State: Dashboard Data
    const [dashboardData, setDashboardData] = useState<ManagerDashboardData | null>(null);
    const [needsYouTodayData, setNeedsYouTodayData] = useState<{
        totalPendingCount: number;
        mispunch?: {
            title: string;
            count: number;
            subtitle: string;
            items: any[];
        };
        shiftRequest?: {
            title: string;
            count: number;
            subtitle: string;
            items: any[];
        };
        gatePass?: {
            title: string;
            count: number;
            subtitle: string;
            items: any[];
        };
        paidDays?: {
            title: string;
            count: number;
            subtitle: string;
            items: any[];
        };
        [key: string]: any;
    } | null>(null);

    // State: Modals
    const [listModal, setListModal] = useState<{
        open: boolean;
        title: string;
        subtitle: string;
        data: any[];
    }>({
        open: false,
        title: "",
        subtitle: "",
        data: [],
    });

    const roles = ["Manager", "HOD", "CEO", "MD", "Director", "Account", "Audit"];

    // ============================================================================
    // Fetch Dashboard Data
    // ============================================================================

    const fetchDashboardData = async () => {
        const compCode =
            user?.Comp_Code ||
            (user as any)?.compcode ||
            (user as any)?.comp_code ||
            (user as any)?.company_code ||
            (user as any)?.DB ||
            "";

        if (!compCode) {
            console.log("Waiting for company code to load from session...");
            return;
        }

        setIsLoading(true);
        try {
            const [yearStr, monthStr] = selectedMonth.split("-");
            const payload = {
                empcode: user?.empcode || user?.EMPCODE || user?.name || "",
                managerEmpCode: user?.empcode || user?.EMPCODE || "",
                selectedDate: selectedDate,
                date: selectedDate,
                month: monthStr ? parseInt(monthStr, 10) : new Date().getMonth() + 1,
                year: yearStr ? parseInt(yearStr, 10) : new Date().getFullYear(),
                shiftstarttime: selectedShift || undefined,
                Loc_code: user?.branch || undefined,
            };

            const headers = {
                compcode: String(compCode),
                name: user?.name || "",
                empcode: user?.empcode || user?.EMPCODE || "",
            };

            // 1. Primary Dashboard API: /hr/getManagerDashboardData
            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_URL}/hr/getManagerDashboardData`,
                payload,
                { headers }
            );

            if (res.data && res.data.success) {
                setDashboardData(res.data);
            } else {
                fallbackMockData();
            }

            // 2. Needs You Today API: /hr/needsyoutoday
            try {
                const needsRes = await axios.post(
                    `${process.env.NEXT_PUBLIC_URL}/hr/needsyoutoday`,
                    payload,
                    { headers }
                );
                if (needsRes.data && needsRes.data.success && needsRes.data.data) {
                    setNeedsYouTodayData(needsRes.data.data);
                }
            } catch (needsErr) {
                console.warn("Error fetching /hr/needsyoutoday:", needsErr);
            }
        } catch (err: any) {
            console.warn("API request fallback:", err?.message);
            fallbackMockData();
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user?.Comp_Code || (user as any)?.compcode) {
            fetchDashboardData();
        }
    }, [user, selectedMonth, selectedShift, selectedDate]);


    useEffect(() => {
        fetchDashboardData();
    }, [selectedMonth, selectedShift, selectedDate]);

    // ============================================================================
    // Excel Export
    // ============================================================================

    //   const handleExportExcel = async () => {
    //     try {
    //       const workbook = new ExcelJS.Workbook();
    //       const sheet = workbook.addWorksheet("Manager_Dashboard_Summary");

    //       sheet.addRow(["Metric", "Value"]);
    //       sheet.addRow(["Team Strength", dashboardData?.summary.teamStrength || 0]);
    //       sheet.addRow(["Present Today", dashboardData?.summary.presentToday || 0]);
    //       sheet.addRow(["Waiting On Me", dashboardData?.summary.waitingOnMe || 0]);
    //       sheet.addRow(["Monthly Mispunches", dashboardData?.summary.monthlyMispunches || 0]);
    //       sheet.addRow([]);
    //       sheet.addRow(["Gross Salary", dashboardData?.salary.overall.gross || 0]);
    //       sheet.addRow(["Deduction Amount", dashboardData?.salary.overall.deduction || 0]);
    //       sheet.addRow(["Net Pay", dashboardData?.salary.overall.netPay || 0]);

    //       // Style header
    //       sheet.getRow(1).font = { bold: true };

    //       const buffer = await workbook.xlsx.writeBuffer();
    //       const blob = new Blob([buffer], {
    //         type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    //       });
    //       saveAs(blob, `Manager_HRMS_Dashboard_${selectedDate}.xlsx`);
    //       showSideAlert("Dashboard report exported successfully!", "success");
    //     } catch {
    //       showSideAlert("Failed to export Excel", "error");
    //     }
    //   };

    // ============================================================================
    // Chart Data Transformations
    // ============================================================================

    // 1. Attendance Stacked Column Chart
    const attendanceCategories = useMemo(() => {
        return dashboardData?.attendance.last7Days.map((d) => d.DAY_NAME) || [];
    }, [dashboardData]);

    const attendanceSeries = useMemo(() => {
        const list = dashboardData?.attendance.last7Days || [];
        return [
            {
                name: "On-time",
                data: list.map((d) => d.ON_TIME),
                color: "#10b981", // Emerald
                stack: "attendance",
            },
            {
                name: "Late",
                data: list.map((d) => d.LATE),
                color: "#f59e0b", // Amber
                stack: "attendance",
            },
            {
                name: "Leave",
                data: list.map((d) => d.ON_LEAVE),
                color: "#cbd5e1", // Slate
                stack: "attendance",
            },
            {
                name: "Absent",
                data: list.map((d) => d.ABSENT),
                color: "#ef4444", // Red
                stack: "attendance",
            },
        ];
    }, [dashboardData]);

    // Total scope employees
    const totalEmployeesInScope = dashboardData?.summary.teamStrength || 79;

    // 2. Department Wise Salary Donut Chart & Lists
    const allDepartmentsList = useMemo(() => {
        return dashboardData?.salary.byDepartment || [];
    }, [dashboardData]);

    const top5Departments = useMemo(() => {
        return allDepartmentsList.slice(0, 5);
    }, [allDepartmentsList]);

    const departmentSalaryDonutData = useMemo(() => {
        return allDepartmentsList.map((d, i) => ({
            name: d.deptName,
            y: d.gross,
            color: DEPARTMENT_COLORS[i % DEPARTMENT_COLORS.length],
        }));
    }, [allDepartmentsList]);

    // Overall Salary Values
    const grossSalaryStr = formatCurrencyLakhs(dashboardData?.salary.overall.gross);
    const deductionSalaryStr = formatCurrencyLakhs(dashboardData?.salary.overall.deduction);
    const netPaySalaryStr = formatCurrencyLakhs(dashboardData?.salary.overall.netPay);

    const deductionPercent = useMemo(() => {
        const gross = dashboardData?.salary.overall.gross || 0;
        const ded = dashboardData?.salary.overall.deduction || 0;
        if (!gross) return "0.0%";
        return `${((ded / gross) * 100).toFixed(1)}%`;
    }, [dashboardData]);

    const netPayPercent = useMemo(() => {
        const gross = dashboardData?.salary.overall.gross || 0;
        const net = dashboardData?.salary.overall.netPay || 0;
        if (!gross) return "0.0%";
        return `${((net / gross) * 100).toFixed(1)}%`;
    }, [dashboardData]);

    // Attendance Summary Metrics
    const teamStrengthVal = dashboardData?.summary.teamStrength ?? 0;
    const presentTodayVal = dashboardData?.summary.presentToday ?? 0;
    const onLeaveTodayVal =
        dashboardData?.summary.onLeaveToday ??
        dashboardData?.attendance.departments?.reduce((acc, d) => acc + (d.ON_LEAVE || 0), 0) ??
        0;
    const absentTodayVal =
        dashboardData?.summary.absentToday ??
        Math.max(0, teamStrengthVal - presentTodayVal - onLeaveTodayVal);

    const presentPercentageVal =
        dashboardData?.summary.presentPercentage !== undefined
            ? dashboardData.summary.presentPercentage
            : teamStrengthVal > 0
                ? Number(((presentTodayVal / teamStrengthVal) * 100).toFixed(1))
                : 0;

    // Waiting On Me & Needs You Today Metrics
    const waitingOnMeCount = needsYouTodayData
        ? needsYouTodayData.totalPendingCount
        : (dashboardData?.summary.waitingOnMe ?? dashboardData?.actions?.length ?? 0);
    const mispunchPendingCount = needsYouTodayData?.mispunch
        ? needsYouTodayData.mispunch.count
        : (dashboardData?.actions?.filter((a) => a.ACTION_TYPE === "MISPUNCH_APPROVAL").length ?? 0);
    const shiftPendingCount = needsYouTodayData?.shiftRequest
        ? needsYouTodayData.shiftRequest.count
        : 0;
    const leavePendingCount = dashboardData?.actions?.filter((a) => a.ACTION_TYPE === "LEAVE_APPROVAL").length ?? 0;
    const otherPendingCount = Math.max(0, waitingOnMeCount - mispunchPendingCount - shiftPendingCount - leavePendingCount);

    // Active Needs You Today Items (STRICTLY filter count > 0)
    const activeNeedsYouItems = useMemo(() => {
        const items: Array<{
            key: string;
            title: string;
            count: number;
            subtitle: string;
            items: any[];
            iconType: "mispunch" | "gate" | "sliders" | "shift";
            badgeStyle: string;
        }> = [];

        if (needsYouTodayData) {
            if (needsYouTodayData.mispunch && needsYouTodayData.mispunch.count > 0) {
                items.push({
                    key: "mispunch",
                    title: needsYouTodayData.mispunch.title || "Mispunch approvals",
                    count: needsYouTodayData.mispunch.count,
                    subtitle: needsYouTodayData.mispunch.subtitle || `${needsYouTodayData.mispunch.count} pending`,
                    items: needsYouTodayData.mispunch.items || [],
                    iconType: "mispunch",
                    badgeStyle: "bg-amber-100/90 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400",
                });
            }
            if (needsYouTodayData.gatePass && needsYouTodayData.gatePass.count > 0) {
                items.push({
                    key: "gatePass",
                    title: needsYouTodayData.gatePass.title || "Gate pass approvals",
                    count: needsYouTodayData.gatePass.count,
                    subtitle: needsYouTodayData.gatePass.subtitle || `${needsYouTodayData.gatePass.count} still open at the gate`,
                    items: needsYouTodayData.gatePass.items || [],
                    iconType: "gate",
                    badgeStyle: "bg-rose-100/90 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400",
                });
            }
            if (needsYouTodayData.paidDays && needsYouTodayData.paidDays.count > 0) {
                items.push({
                    key: "paidDays",
                    title: needsYouTodayData.paidDays.title || "Paid-days deviation entry",
                    count: needsYouTodayData.paidDays.count,
                    subtitle: needsYouTodayData.paidDays.subtitle || `${needsYouTodayData.paidDays.count} pending`,
                    items: needsYouTodayData.paidDays.items || [],
                    iconType: "sliders",
                    badgeStyle: "bg-indigo-100/90 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-400",
                });
            }
            if (needsYouTodayData.shiftRequest && needsYouTodayData.shiftRequest.count > 0) {
                items.push({
                    key: "shiftRequest",
                    title: needsYouTodayData.shiftRequest.title || "Shift change requests",
                    count: needsYouTodayData.shiftRequest.count,
                    subtitle: needsYouTodayData.shiftRequest.subtitle || `${needsYouTodayData.shiftRequest.count} requests pending`,
                    items: needsYouTodayData.shiftRequest.items || [],
                    iconType: "shift",
                    badgeStyle: "bg-indigo-100/90 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-400",
                });
            }
        } else if (dashboardData?.actions && dashboardData.actions.length > 0) {
            dashboardData.actions.forEach((act, idx) => {
                const countNum = parseInt(String(act.PENDING_LEVEL || "0"), 10) || 0;
                if (countNum > 0) {
                    items.push({
                        key: `action-${idx}`,
                        title: act.TITLE,
                        count: countNum,
                        subtitle: act.REMARKS,
                        items: [],
                        iconType: act.ACTION_TYPE === "MISPUNCH_APPROVAL" ? "mispunch" : "shift",
                        badgeStyle: idx === 0
                            ? "bg-amber-100/90 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"
                            : "bg-indigo-100/90 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-400",
                    });
                }
            });
        }

        return items;
    }, [needsYouTodayData, dashboardData]);

    // ============================================================================
    // Department Employees Modal Handlers
    // ============================================================================

    const handleDepartmentClick = async (dept: {
        DEPT_CODE: string;
        DEPT_NAME: string;
        TOTAL: number;
        PRESENT?: number;
        ABSENT?: number;
        ON_TIME?: number;
        LATE?: number;
        ON_LEAVE?: number;
    }) => {
        setSelectedDeptModal({
            open: true,
            deptName: dept.DEPT_NAME,
            deptCode: dept.DEPT_CODE,
            loading: true,
            data: [],
            activeTab: "all",
            search: "",
        });

        const compCode =
            user?.Comp_Code ||
            (user as any)?.compcode ||
            (user as any)?.comp_code ||
            (user as any)?.company_code ||
            "";

        let fetchedEmployees: any[] = [];

        try {
            const res = await axios.post(
                `${process.env.NEXT_PUBLIC_URL}/hrmsreport/getDashboardData`,
                {
                    selectedDate: selectedDate,
                    dept_code: dept.DEPT_CODE,
                    Loc_code: user?.branch ? (Array.isArray(user.branch) ? user.branch : [user.branch]) : undefined,
                    shiftstarttime: selectedShift || undefined,
                },
                {
                    headers: {
                        compcode: String(compCode),
                        name: user?.name || "",
                        empcode: user?.empcode || user?.EMPCODE || "",
                    },
                }
            );

            if (res.data?.result?.employees?.all && res.data.result.employees.all.length > 0) {
                fetchedEmployees = res.data.result.employees.all;
            } else if (res.data?.result?.employees && Array.isArray(res.data.result.employees) && res.data.result.employees.length > 0) {
                fetchedEmployees = res.data.result.employees;
            }
        } catch (e) {
            console.log("Error fetching department employees, using local data fallback:", e);
        }

        if (!fetchedEmployees || fetchedEmployees.length === 0) {
            const existingAll = dashboardData?.attendance?.employees?.all || [];
            const deptFiltered = existingAll.filter(
                (e: any) => e.DEPT_CODE === dept.DEPT_CODE || e.DEPARTMENT === dept.DEPT_NAME
            );

            if (deptFiltered.length > 0) {
                fetchedEmployees = deptFiltered;
            } else {
                const onTimeCount = dept.ON_TIME ?? Math.round((dept.TOTAL || 10) * 0.7);
                const lateCount = dept.LATE ?? Math.round((dept.TOTAL || 10) * 0.1);
                const leaveCount = dept.ON_LEAVE ?? Math.round((dept.TOTAL || 10) * 0.1);
                const absentCount = dept.ABSENT ?? Math.max(0, (dept.TOTAL || 10) - onTimeCount - lateCount - leaveCount);

                const sampleNames = [
                    "Aadarsh Chkradhar Khansole", "Aadesh Balu Solase", "Aabid Abdul Ajiz Sheikh",
                    "A B Hussain Ahmed", "Aarti Sharma", "Amit Verma", "Deepak Kumar", "Kavita Saini",
                    "Manoj Joshi", "Pooja Mehta", "Rahul Rathore", "Sanjay Gupta", "Sunil Yadav",
                    "Vikram Singh", "Yogesh Patidar"
                ];
                const sampleDesignations = ["Technician", "Executive", "Relationship Manager", "Service Advisor", "Team Lead", "Sr. Engineer"];

                let idCounter = 1001;
                const generated: any[] = [];

                for (let k = 0; k < onTimeCount; k++) {
                    const name = sampleNames[k % sampleNames.length] + (k >= sampleNames.length ? ` ${k + 1}` : "");
                    generated.push({
                        EMP_CODE: String(idCounter++),
                        EMP_NAME: name,
                        DESIGNATION: sampleDesignations[k % sampleDesignations.length],
                        DEPARTMENT: dept.DEPT_NAME,
                        LOGIN_TIME: "09:15 AM",
                        LOGOUT_TIME: "--:--",
                        PUNCH_STATUS: "PRESENT",
                        PUNCH_SUBSTATUS: "ONTIME",
                    });
                }
                for (let k = 0; k < lateCount; k++) {
                    const name = sampleNames[(k + 3) % sampleNames.length] + ` (Late ${k + 1})`;
                    generated.push({
                        EMP_CODE: String(idCounter++),
                        EMP_NAME: name,
                        DESIGNATION: sampleDesignations[(k + 1) % sampleDesignations.length],
                        DEPARTMENT: dept.DEPT_NAME,
                        LOGIN_TIME: "10:45 AM",
                        LOGOUT_TIME: "--:--",
                        PUNCH_STATUS: "PRESENT",
                        PUNCH_SUBSTATUS: "LATE",
                    });
                }
                for (let k = 0; k < leaveCount; k++) {
                    const name = sampleNames[(k + 5) % sampleNames.length] + ` (Leave ${k + 1})`;
                    generated.push({
                        EMP_CODE: String(idCounter++),
                        EMP_NAME: name,
                        DESIGNATION: sampleDesignations[(k + 2) % sampleDesignations.length],
                        DEPARTMENT: dept.DEPT_NAME,
                        LOGIN_TIME: "--:--",
                        LOGOUT_TIME: "--:--",
                        PUNCH_STATUS: "LEAVE",
                        PUNCH_SUBSTATUS: "LEAVE",
                    });
                }
                for (let k = 0; k < absentCount; k++) {
                    const name = sampleNames[(k + 7) % sampleNames.length] + ` (Absent ${k + 1})`;
                    generated.push({
                        EMP_CODE: String(idCounter++),
                        EMP_NAME: name,
                        DESIGNATION: sampleDesignations[(k + 3) % sampleDesignations.length],
                        DEPARTMENT: dept.DEPT_NAME,
                        LOGIN_TIME: "--:--",
                        LOGOUT_TIME: "--:--",
                        PUNCH_STATUS: "ABSENT",
                        PUNCH_SUBSTATUS: "ABSENT",
                    });
                }
                fetchedEmployees = generated;
            }
        }

        setSelectedDeptModal((prev) => ({
            ...prev,
            loading: false,
            data: fetchedEmployees,
        }));
    };

    const deptModalFilteredEmployees = useMemo(() => {
        let list = selectedDeptModal.data || [];

        if (selectedDeptModal.activeTab === "present") {
            list = list.filter(
                (e) =>
                    String(e.PUNCH_STATUS).toUpperCase() === "PRESENT" ||
                    String(e.PUNCH_SUBSTATUS).toUpperCase() === "ONTIME" ||
                    String(e.status).toUpperCase() === "PRESENT"
            );
        } else if (selectedDeptModal.activeTab === "absent") {
            list = list.filter(
                (e) =>
                    String(e.PUNCH_STATUS).toUpperCase() === "ABSENT" ||
                    String(e.status).toUpperCase() === "ABSENT"
            );
        } else if (selectedDeptModal.activeTab === "leave") {
            list = list.filter(
                (e) =>
                    String(e.PUNCH_STATUS).toUpperCase() === "LEAVE" ||
                    String(e.PUNCH_SUBSTATUS).toUpperCase() === "LEAVE" ||
                    String(e.status).toUpperCase() === "LEAVE"
            );
        } else if (selectedDeptModal.activeTab === "late") {
            list = list.filter(
                (e) =>
                    String(e.PUNCH_SUBSTATUS).toUpperCase() === "LATE" ||
                    String(e.status).toUpperCase() === "LATE"
            );
        }

        if (selectedDeptModal.search.trim()) {
            const q = selectedDeptModal.search.toLowerCase();
            list = list.filter(
                (e) =>
                    e.EMP_NAME?.toLowerCase().includes(q) ||
                    e.EMP_CODE?.toLowerCase().includes(q) ||
                    e.DESIGNATION?.toLowerCase().includes(q)
            );
        }

        return list;
    }, [selectedDeptModal.data, selectedDeptModal.activeTab, selectedDeptModal.search]);

    const deptTabCounts = useMemo(() => {
        const list = selectedDeptModal.data || [];
        const present = list.filter(
            (e) =>
                String(e.PUNCH_STATUS).toUpperCase() === "PRESENT" ||
                String(e.PUNCH_SUBSTATUS).toUpperCase() === "ONTIME" ||
                String(e.status).toUpperCase() === "PRESENT"
        ).length;
        const absent = list.filter(
            (e) =>
                String(e.PUNCH_STATUS).toUpperCase() === "ABSENT" ||
                String(e.status).toUpperCase() === "ABSENT"
        ).length;
        const leave = list.filter(
            (e) =>
                String(e.PUNCH_STATUS).toUpperCase() === "LEAVE" ||
                String(e.PUNCH_SUBSTATUS).toUpperCase() === "LEAVE" ||
                String(e.status).toUpperCase() === "LEAVE"
        ).length;
        const late = list.filter(
            (e) =>
                String(e.PUNCH_SUBSTATUS).toUpperCase() === "LATE" ||
                String(e.status).toUpperCase() === "LATE"
        ).length;

        return {
            all: list.length,
            present,
            absent,
            leave,
            late,
        };
    }, [selectedDeptModal.data]);

    const exportDeptEmployeesToExcel = async () => {
        const list = deptModalFilteredEmployees;
        if (!list || list.length === 0) {
            showSideAlert("No employee data to export", "warning");
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(selectedDeptModal.deptName || "Department");

        const headerRow = worksheet.addRow(["Emp Code", "Name", "Designation", "Department", "Login Time", "Logout Time", "Status"]);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        });

        list.forEach((emp) => {
            const empCode = emp.EMP_CODE ?? emp.EMPCODE ?? "-";
            const empName = emp.EMP_NAME ?? emp.name ?? "-";
            const designation = emp.DESIGNATION ?? emp.designation ?? "-";
            const department = emp.DEPARTMENT ?? selectedDeptModal.deptName ?? "-";
            const loginTime = emp.LOGIN_TIME ?? "--:--";
            const logoutTime = emp.LOGOUT_TIME ?? "--:--";
            const status = emp.PUNCH_SUBSTATUS ?? emp.PUNCH_STATUS ?? "-";

            const row = worksheet.addRow([empCode, empName, designation, department, loginTime, logoutTime, status]);
            row.eachCell((cell) => {
                cell.alignment = { horizontal: "center", vertical: "middle" };
                cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
            });
        });

        worksheet.columns.forEach((column) => {
            let maxLength = 12;
            column.eachCell?.({ includeEmpty: true }, (cell: any) => {
                const len = cell.value ? cell.value.toString().length : 12;
                if (len > maxLength) maxLength = len;
            });
            column.width = maxLength + 4;
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        saveAs(blob, `${selectedDeptModal.deptName || "Department"}_Employees_${new Date().toISOString().split("T")[0]}.xlsx`);
    };

    const handleExportExcel = async () => {
        showSideAlert("Exporting Manager Dashboard Data to Excel...", "info");
        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet("Dashboard Summary");
        ws.addRow(["Metric", "Value"]);
        ws.addRow(["Team Strength", dashboardData?.summary.teamStrength || 0]);
        ws.addRow(["Present Today", dashboardData?.summary.presentToday || 0]);
        ws.addRow(["Waiting on Me", dashboardData?.summary.waitingOnMe || 0]);
        ws.addRow(["Monthly Mispunches", dashboardData?.summary.monthlyMispunches || 0]);
        ws.addRow(["Gross Salary", grossSalaryStr]);
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        saveAs(blob, `Manager_Dashboard_Summary_${new Date().toISOString().split("T")[0]}.xlsx`);
    };

    // ============================================================================
    // RENDER
    // ============================================================================

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#070b14] text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1780px] mx-auto transition-colors">
            {/* ────────────────────────────────────────────────────────────────────────── */}
            {/* 1. TOP HEADER & BREADCRUMBS */}
            {/* ────────────────────────────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
                {/* Left: Back + Breadcrumb */}
                <div className="flex items-center gap-3.5 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.back()}
                        className="h-9 px-4 rounded-full shadow-xs text-xs sm:text-sm font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
                    </Button>

                    <nav className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        <span>Dashboards</span>
                        <span>/</span>
                        <span>HRMS</span>
                        <span>/</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                            Manager HRMS Dashboard
                        </span>
                    </nav>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportExcel}
                        className="h-9 px-4 rounded-full shadow-xs text-xs sm:text-sm font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        <Download className="h-4 w-4 mr-1.5" /> Export
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchDashboardData}
                        className="h-9 px-4 rounded-full shadow-xs text-xs sm:text-sm font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
                    </Button>

                    {/* Location Badge */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-700 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                        <Building2 className="h-4 w-4 text-indigo-500" />
                        <span>Branch - 4 +3</span>
                    </div>

                    {/* User Avatar */}
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center shadow-sm">
                        {user?.name?.slice(0, 2).toUpperCase() || "AK"}
                    </div>
                </div>
            </div>

           

            {/* 3. DASHBOARD TITLE & ROLE SELECTOR */}
                <div className="space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                            Manager HRMS Dashboard
                        </h1>
                        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium mt-1">
                            Your team, today. Attendance you must fix before the cut-off, and the approvals sitting with you.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 shrink-0 font-medium bg-white dark:bg-slate-900 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-xs">
                        <Clock className="h-4 w-4 text-indigo-500" />
                        <span>Data as of {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, 11:40</span>
                    </div>
                </div>

                {/* Role Pills */}
                <div className="flex items-center gap-2.5 overflow-x-auto py-1">
                    {roles.map((role) => {
                        const isActive = selectedRole === role;
                        return (
                            <button
                                key={role}
                                type="button"
                                onClick={() => setSelectedRole(role)}
                                className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition whitespace-nowrap ${isActive
                                    ? "bg-indigo-600 border border-indigo-600 text-white shadow-md shadow-indigo-500/20"
                                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                                    }`}
                            >
                                <Users className="h-3.5 w-3.5" />
                                {role}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ────────────────────────────────────────────────────────────────────────── */}
            {/* 4. FILTER CONTROLS BAR */}
            {/* ────────────────────────────────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        {/* Month Filter */}
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-extrabold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                                MONTH
                            </span>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-xs"
                            >
                                <option value="2026-07">July 2026</option>
                                <option value="2026-08">August 2026</option>
                                <option value="2026-09">September 2026</option>
                                <option value="2026-06">June 2026</option>
                            </select>
                        </div>

                        {/* Shift Filter */}
                        <div className="flex items-center gap-2.5">
                            <span className="text-xs font-extrabold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                                SHIFT
                            </span>
                            <select
                                value={selectedShift}
                                onChange={(e) => setSelectedShift(e.target.value)}
                                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-xs"
                            >
                                <option value="">All shifts</option>
                                {dashboardData?.attendance.shifts?.map((s, idx) => (
                                    <option key={idx} value={String(s.SHIFTSTARTTIME)}>
                                        {formatTo12Hr(s.SHIFTSTARTTIME)} - {formatTo12Hr(s.SHIFTENDTIME)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Scope Indicator */}
                        <div className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 pl-2">
                            <Eye className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            <span>
                                <b className="font-bold text-slate-900 dark:text-slate-100">Scope:</b> Own department, own branch -{" "}
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{totalEmployeesInScope} employees</span>
                            </span>
                        </div>
                    </div>

                    {/* Right: Security info */}
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                        <Lock className="h-3.5 w-3.5" />
                        <span>Other departments and company-wide cost hidden</span>
                    </div>
                </div>
            </div>

            {/* ────────────────────────────────────────────────────────────────────────── */}
            {/* 5. TOP 4 METRIC CARDS */}
            {/* ────────────────────────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Metric 1: Team Strength */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition hover:shadow-lg hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Team strength
                        </span>
                        <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Users className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                        {teamStrengthVal}
                    </div>
                    <div className="mt-3.5 flex items-center gap-2 text-xs sm:text-sm font-semibold">
                        <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md">
                            👥 Active
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                            {dashboardData?.attendance.departments?.length || 0} departments in scope
                        </span>
                    </div>
                </div>

                {/* Metric 2: Present Today */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition hover:shadow-lg hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Present today
                        </span>
                        <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <UserCheck className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                        {presentTodayVal}
                    </div>
                    <div className="mt-3.5 flex items-center gap-2 text-xs sm:text-sm font-semibold">
                        <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                            ↗ {presentPercentageVal}%
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                            {onLeaveTodayVal} on leave · {absentTodayVal} absent
                        </span>
                    </div>
                </div>

                {/* Metric 3: Waiting on me */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition hover:shadow-lg hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Waiting on me
                        </span>
                        <div className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <Inbox className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                        {waitingOnMeCount}
                    </div>
                    <div className="mt-3.5 flex items-center gap-2 text-xs sm:text-sm font-semibold">
                        {waitingOnMeCount > 0 ? (
                            <>
                                <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md">
                                    ⏰ {waitingOnMeCount} pending
                                </span>
                                <span className="text-slate-500 dark:text-slate-400 truncate">
                                    {mispunchPendingCount > 0 ? `${mispunchPendingCount} mispunch` : ""}
                                    {mispunchPendingCount > 0 && shiftPendingCount > 0 ? " · " : ""}
                                    {shiftPendingCount > 0 ? `${shiftPendingCount} shift` : ""}
                                    {leavePendingCount > 0 ? `${(mispunchPendingCount > 0 || shiftPendingCount > 0) ? " · " : ""}${leavePendingCount} leave` : ""}
                                    {otherPendingCount > 0 && (mispunchPendingCount > 0 || shiftPendingCount > 0 || leavePendingCount > 0) ? ` · ${otherPendingCount} other` : otherPendingCount > 0 ? `${otherPendingCount} requests` : ""}
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                                    ✓ 0 pending
                                </span>
                                <span className="text-slate-500 dark:text-slate-400 truncate">
                                    0 actions required
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Metric 4: Mispunches this month */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition hover:shadow-lg hover:-translate-y-0.5">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Mispunches this month
                        </span>
                        <div className="h-9 w-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <Fingerprint className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                        {dashboardData?.summary.monthlyMispunches ?? 0}
                    </div>
                    <div className="mt-3.5 flex items-center gap-2 text-xs sm:text-sm font-semibold">
                        <span className="text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-md">
                            📅 Total
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 truncate">
                            {dashboardData?.summary.monthlyMispunches ?? 0} recorded this month
                        </span>
                    </div>
                </div>
            </div>

        {/* ────────────────────────────────────────────────────────────────────────── */ }
    {/* 6. ATTENDANCE SECTION (CHART & DEPARTMENT BREAKDOWN) */ }
    {/* ────────────────────────────────────────────────────────────────────────── */ }
    <div className="grid grid-cols-12 gap-6">
        {/* Left (Col-8/9): Last 7 days attendance Stacked Bar Chart */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-9 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                        Last 7 days attendance
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {totalEmployeesInScope} employees in scope
                    </p>
                </div>

                {/* Custom Legend Header */}
                <div className="flex items-center gap-4 text-xs sm:text-sm flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                            On-time <b className="font-extrabold text-slate-900 dark:text-white">63</b>
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-amber-500" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Late <b className="font-extrabold text-slate-900 dark:text-white">7</b>
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-slate-400" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Leave <b className="font-extrabold text-slate-900 dark:text-white">5</b>
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-rose-500" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Absent <b className="font-extrabold text-slate-900 dark:text-white">4</b>
                        </span>
                    </div>
                </div>
            </div>

            {/* Reusable Chart Component */}
            <div className="w-full">
                <Chart
                    type="column"
                    stacked="normal"
                    height={360}
                    categories={attendanceCategories}
                    series={attendanceSeries}
                    showLegend={false}
                    showDataLabels={false}
                    options={{
                        plotOptions: {
                            column: {
                                borderRadius: 4,
                                pointPadding: 0.12,
                                groupPadding: 0.12,
                            },
                        },
                        xAxis: {
                            labels: {
                                style: { fontSize: "12px", fontWeight: "600" },
                            },
                        },
                    }}
                />

                {/* Percentage row beneath bars */}
                <div className="grid grid-cols-7 text-center pt-3 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm font-extrabold text-amber-600 dark:text-amber-400">
                    {dashboardData?.attendance.last7Days.map((d, i) => (
                        <div key={i}>{d.ATTENDANCE_PCT}%</div>
                    ))}
                </div>
            </div>
        </div>

        {/* Right (Col-4/3): Department List */}
        <div className="col-span-12 lg:col-span-4 xl:col-span-3 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div>
                <div className="mb-4">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                        Department
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        Today · on-time / leave / late
                    </p>
                </div>

                {/* Dept Item */}
                <div className="max-h-[380px] overflow-y-auto pr-2 space-y-4">
                    {dashboardData?.attendance.departments?.map((dept, i) => (
                        <div
                            key={i}
                            onClick={() => handleDepartmentClick(dept)}
                            className="space-y-2 pb-2 border-b border-slate-100 dark:border-slate-800/60 last:border-0 last:pb-0 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/50 p-2 rounded-xl transition group"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <span className="h-2.5 w-2.5 rounded-full bg-sky-500 group-hover:scale-125 transition" />
                                    <span className="text-sm font-extrabold tracking-wider text-slate-900 dark:text-slate-100 uppercase group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                                        {dept.DEPT_NAME}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-base font-black text-slate-900 dark:text-slate-100">
                                        {dept.TOTAL}
                                    </span>
                                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                                </div>
                            </div>

                            {/* Sub stats */}
                            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                                <span>
                                    <b className="font-bold text-slate-900 dark:text-slate-100">{dept.ON_TIME}</b> on-time
                                </span>
                                <span>·</span>
                                <span>
                                    <b className="font-bold text-slate-900 dark:text-slate-100">{dept.ON_LEAVE}</b> leave
                                </span>
                                <span>·</span>
                                <span>
                                    <b className="font-bold text-slate-900 dark:text-slate-100">{dept.LATE}</b> late
                                </span>
                                {dept.ABSENT !== undefined && dept.ABSENT > 0 && (
                                    <>
                                        <span>·</span>
                                        <span className="text-rose-600 dark:text-rose-400 font-bold">
                                            {dept.ABSENT} absent
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Progress Line */}
                            <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-sky-500"
                                    style={{
                                        width: `${dept.TOTAL > 0 ? (dept.ON_TIME / dept.TOTAL) * 100 : 80}%`,
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>

    {/* ────────────────────────────────────────────────────────────────────────── */ }
    {/* 7. MIDDLE INSIGHT ALERT BANNER */ }
    {/* ────────────────────────────────────────────────────────────────────────── */ }
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-indigo-200/90 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/40 p-4 sm:px-6 shadow-xs dark:border-indigo-950/80 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40">
        <div className="flex items-center gap-3 text-sm sm:text-base text-slate-800 dark:text-slate-200">
            <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
                Attendance is running at <b className="font-extrabold text-slate-900 dark:text-white">{presentPercentageVal}%</b> against a 92% target.
            </span>
        </div>
        <Button
            variant="outline"
            size="sm"
            onClick={() => showSideAlert("Generating detailed attendance report...", "info")}
            className="rounded-full text-xs sm:text-sm font-bold shrink-0 bg-white border-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 h-9 px-5 shadow-xs"
        >
            Open report <ArrowUpRight className="h-4 w-4 ml-1.5" />
        </Button>
    </div>

    {/* ────────────────────────────────────────────────────────────────────────── */ }
    {/* 8. SALARY SUMMARY CARDS */ }
    {/* ────────────────────────────────────────────────────────────────────────── */ }
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Gross Salary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition hover:shadow-md">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                <span>Gross salary</span>
            </div>
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 mt-2.5">
                {grossSalaryStr}
            </div>
            <div className="h-1.5 w-full rounded-full bg-sky-500 mt-4 mb-2.5" />
            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                <b className="font-bold text-slate-900 dark:text-slate-100">100%</b> Your team&apos;s cost for the month
            </div>
        </div>

        {/* Deduction Amount */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition hover:shadow-md">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span>Deduction amount</span>
            </div>
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 mt-2.5">
                {deductionSalaryStr}
            </div>
            <div className="h-1.5 w-full rounded-full bg-rose-500 mt-4 mb-2.5" />
            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                <b className="font-bold text-slate-900 dark:text-slate-100">{deductionPercent}</b> Recoveries and statutory
            </div>
        </div>

        {/* Net Pay */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition hover:shadow-md">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>Net pay</span>
            </div>
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 mt-2.5">
                {netPaySalaryStr}
            </div>
            <div className="h-1.5 w-full rounded-full bg-emerald-500 mt-4 mb-2.5" />
            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                <b className="font-bold text-slate-900 dark:text-slate-100">{netPayPercent}</b> What your team takes home
            </div>
        </div>
    </div>

    {/* ────────────────────────────────────────────────────────────────────────── */ }
    {/* 9. SALARY BREAKDOWN (DEPARTMENT DONUT & LOCATION BARS) */ }
    {/* ────────────────────────────────────────────────────────────────────────── */ }
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (Col-6): Department Wise Salary Donut */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                        Department wise Salary
                    </h2>
                    {/* Month Dropdown Filter */}
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none shadow-2xs focus:border-indigo-500 cursor-pointer"
                    >
                        <option value="2026-05">May</option>
                        <option value="2026-06">June</option>
                        <option value="2026-07">July</option>
                        <option value="2026-08">August</option>
                        <option value="2026-09">September</option>
                        <option value="2026-10">October</option>
                        <option value="2026-11">November</option>
                        <option value="2026-12">December</option>
                        <option value="2026-01">January</option>
                        <option value="2026-02">February</option>
                        <option value="2026-03">March</option>
                        <option value="2026-04">April</option>
                    </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-6 py-2">
                    <div className="sm:col-span-6 relative flex items-center justify-center">
                        <DonutChart
                            data={departmentSalaryDonutData}
                            height={240}
                            innerSize="70%"
                            showLegend={false}
                            showDataLabels={false}
                        />
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Total
                            </span>
                            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
                                {grossSalaryStr}
                            </span>
                        </div>
                    </div>

                    {/* Top 5 departments list */}
                    <div className="sm:col-span-6 space-y-3.5">
                        {top5Departments.map((d, i) => {
                            const color = DEPARTMENT_COLORS[i % DEPARTMENT_COLORS.length];
                            return (
                                <div key={i} className="flex items-center justify-between text-xs sm:text-sm">
                                    <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                                        <span
                                            className="h-2.5 w-2.5 rounded-full shrink-0"
                                            style={{ backgroundColor: color }}
                                        />
                                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate uppercase">
                                            {d.deptName}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-right shrink-0">
                                        <span className="font-extrabold text-slate-900 dark:text-slate-100">
                                            ₹{Number(d.gross).toLocaleString("en-IN")}
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-xs font-bold text-sky-600 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-400">
                                            {d.grossPercentage}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <button
                    type="button"
                    onClick={() => setIsAllDeptModalOpen(true)}
                    className="w-full py-2.5 px-4 rounded-xl border border-blue-500/80 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-bold text-xs sm:text-sm transition text-center"
                >
                    View All Departments ({allDepartmentsList.length})
                </button>
            </div>
        </div>

        {/* Right (Col-6): Location Wise Salary */}
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                    Location wise salary
                </h2>
                <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                    1 in scope
                </span>
            </div>

            <div className="space-y-5 py-3">
                {dashboardData?.salary.byLocation.map((loc, i) => (
                    <div key={i} className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                {loc.locName}
                            </span>
                            <div className="flex items-center gap-3.5">
                                <span className="text-slate-500 dark:text-slate-400 font-semibold">{loc.empCount} emp</span>
                                <span className="font-black text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                                    {formatCurrencyLakhs(loc.gross)}
                                </span>
                            </div>
                        </div>

                        {/* Bar */}
                        <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500"
                                style={{ width: `${loc.grossPercentage}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>

    {/* ────────────────────────────────────────────────────────────────────────── */ }
    {/* 10. BOTTOM SECTION: NEEDS YOU TODAY & WATCHLIST */ }
    {/* ────────────────────────────────────────────────────────────────────────── */ }
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (Col-5): Needs You Today */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                        Needs you today
                    </h2>
                    <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs sm:text-sm font-extrabold dark:bg-indigo-950/60 dark:text-indigo-300">
                        {activeNeedsYouItems.length} items
                    </span>
                </div>

                {activeNeedsYouItems.length > 0 ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                        {activeNeedsYouItems.map((act) => (
                            <div
                                key={act.key}
                                className="flex items-center justify-between p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition cursor-pointer group"
                                onClick={() => showSideAlert(`Opening ${act.title} (${act.count} pending)`, "info")}
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shadow-2xs group-hover:border-indigo-300 dark:group-hover:border-indigo-700 transition shrink-0">
                                        {act.iconType === "mispunch" ? (
                                            <Fingerprint className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                                        ) : act.iconType === "gate" ? (
                                            <DoorClosed className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                                        ) : act.iconType === "sliders" ? (
                                            <SlidersHorizontal className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                                        ) : (
                                            <ArrowLeftRight className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                                            {act.title}
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                                            {act.subtitle}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2.5 shrink-0">
                                    <span className={`px-2.5 py-0.5 rounded-lg text-xs sm:text-sm font-extrabold ${act.badgeStyle}`}>
                                        {act.count}
                                    </span>
                                    <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-8 px-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            All caught up!
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            No pending approvals or requests requiring your action today.
                        </p>
                    </div>
                )}
            </div>
        </div>

        {/* Right (Col-7): Watchlist */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                    Watchlist
                </h2>
                <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                    Click a row to open the record
                </span>
            </div>

            <div className="overflow-x-auto max-h-[280px] overflow-y-auto pr-1">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-xs">
                            <th className="py-3 px-3">WHO</th>
                            <th className="py-3 px-3">WHERE</th>
                            <th className="py-3 px-3">WHAT</th>
                            <th className="py-3 px-3 text-right">VALUE</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                        {dashboardData?.watchlist.map((row, i) => (
                            <tr
                                key={i}
                                onClick={() => showSideAlert(`Viewing profile for ${row.employeeName} (${row.employeeId})`, "info")}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition"
                            >
                                <td className="py-3.5 px-3">
                                    <div className="font-bold text-slate-900 dark:text-slate-100">
                                        {row.employeeName}
                                    </div>
                                    <div className="text-xs text-slate-400">{row.employeeId}</div>
                                </td>
                                <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 font-semibold">
                                    {row.location}
                                </td>
                                <td className="py-3.5 px-3">
                                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                        <span
                                            className={`h-2.5 w-2.5 rounded-full ${row.severity === "HIGH" ? "bg-rose-500" : "bg-amber-500"
                                                }`}
                                        />
                                        <span>{row.message}</span>
                                    </div>
                                </td>
                                <td className="py-3.5 px-3 text-right">
                                    <span
                                        className={`font-black text-xs sm:text-sm ${row.severity === "HIGH"
                                            ? "text-rose-600 dark:text-rose-400"
                                            : "text-amber-600 dark:text-amber-400"
                                            }`}
                                    >
                                        {row.value}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    {/* ────────────────────────────────────────────────────────────────────────── */ }
    {/* 11. FLOATING ACTION BUTTONS */ }
    {/* ────────────────────────────────────────────────────────────────────────── */ }
    <div className="fixed bottom-6 right-6 flex items-center gap-3 z-40">
        <button
            type="button"
            onClick={() => showSideAlert("Setu AI Assistant activated", "info")}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-xl hover:brightness-110 transition active:scale-95"
        >
            <Sparkles className="h-4 w-4" />
            Setu AI
        </button>

        <button
            type="button"
            onClick={() => showSideAlert("Need help with Manager HRMS Dashboard? Contact HR support.", "question")}
            className="h-10 w-10 rounded-full bg-indigo-700 text-white flex items-center justify-center font-bold text-base shadow-lg hover:bg-indigo-800 transition"
        >
            ?
        </button>
    </div>

    {/* ============================================================================ */ }
    {/* ALL DEPARTMENTS DIALOG MODAL */ }
    {/* ============================================================================ */ }
    {
        isAllDeptModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                        <h3 className="text-lg font-black tracking-wider uppercase text-slate-900 dark:text-slate-100">
                            ALL DEPARTMENTS
                        </h3>
                        <button
                            type="button"
                            onClick={() => setIsAllDeptModalOpen(false)}
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Modal Body / Table */}
                    <div className="overflow-y-auto p-4 sm:p-6 custom-scrollbar max-h-[65vh]">
                        <table className="w-full text-left border-collapse text-xs sm:text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-wider">
                                    <th className="py-3 px-3 w-12 text-center">#</th>
                                    <th className="py-3 px-4">Department</th>
                                    <th className="py-3 px-4 text-right">Salary</th>
                                    <th className="py-3 px-4 text-right">Percentage</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                                {allDepartmentsList.map((dept, index) => {
                                    const color = DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length];
                                    return (
                                        <tr
                                            key={index}
                                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                                        >
                                            <td className="py-3.5 px-3 text-center text-slate-400 font-semibold">
                                                {index + 1}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-2.5">
                                                    <span
                                                        className="h-3 w-3 rounded-full shrink-0"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                    <span className="font-bold text-slate-900 dark:text-slate-100 uppercase">
                                                        {dept.deptName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 dark:text-slate-100">
                                                ₹ {Number(dept.gross).toLocaleString("en-IN")}
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <span className="text-slate-600 dark:text-slate-300 font-semibold">
                                                    {dept.grossPercentage}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )
    }

    {/* ============================================================================ */ }
    {/* DEPARTMENT EMPLOYEES MODAL */ }
    {/* ============================================================================ */ }
    {
        selectedDeptModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
                <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-indigo-600" />
                                <h3 className="text-base sm:text-lg font-black tracking-wide uppercase text-slate-900 dark:text-slate-100">
                                    {selectedDeptModal.deptName}
                                </h3>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Showing {deptModalFilteredEmployees.length} of {selectedDeptModal.data.length} employees
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={exportDeptEmployeesToExcel}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-xs"
                            >
                                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                <span className="hidden sm:inline">Export Excel</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedDeptModal((prev) => ({ ...prev, open: false }))}
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Filter Tabs & Search */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900">
                        {/* Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                            {[
                                { key: "all", label: `All (${deptTabCounts.all})`, color: "border-indigo-600 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-400" },
                                { key: "present", label: `Present (${deptTabCounts.present})`, color: "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400" },
                                { key: "absent", label: `Absent (${deptTabCounts.absent})`, color: "border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400" },
                                ...(deptTabCounts.leave > 0
                                    ? [{ key: "leave", label: `Leave (${deptTabCounts.leave})`, color: "border-sky-500 text-sky-600 bg-sky-50 dark:bg-sky-950/50 dark:text-sky-400" }]
                                    : []),
                                ...(deptTabCounts.late > 0
                                    ? [{ key: "late", label: `Late (${deptTabCounts.late})`, color: "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400" }]
                                    : []),
                            ].map((tab) => {
                                const isActive = selectedDeptModal.activeTab === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() =>
                                            setSelectedDeptModal((prev) => ({
                                                ...prev,
                                                activeTab: tab.key as any,
                                            }))
                                        }
                                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap border ${isActive
                                            ? tab.color
                                            : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-400"
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search Bar */}
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name or designation..."
                                    value={selectedDeptModal.search}
                                    onChange={(e) =>
                                        setSelectedDeptModal((prev) => ({
                                            ...prev,
                                            search: e.target.value,
                                        }))
                                    }
                                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 shadow-2xs"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    setSelectedDeptModal((prev) => ({
                                        ...prev,
                                        search: "",
                                        activeTab: "all",
                                    }))
                                }
                                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
                            >
                                View All
                            </button>
                        </div>
                    </div>

                    {/* List Body */}
                    <div className="overflow-y-auto p-4 space-y-2.5 custom-scrollbar max-h-[60vh]">
                        {selectedDeptModal.loading ? (
                            <div className="py-12 text-center text-slate-400 font-semibold text-sm">
                                Loading employees...
                            </div>
                        ) : deptModalFilteredEmployees.length > 0 ? (
                            deptModalFilteredEmployees.map((emp, i) => {
                                const status = String(emp.PUNCH_SUBSTATUS || emp.PUNCH_STATUS || emp.status || "ABSENT").toUpperCase();
                                const isPresent = status === "PRESENT" || status === "ONTIME";
                                const isLate = status === "LATE";
                                const isLeave = status === "LEAVE";
                                const isAbsent = !isPresent && !isLate && !isLeave;

                                const bottomBorder = isPresent
                                    ? "border-b-emerald-500"
                                    : isLate
                                        ? "border-b-amber-500"
                                        : isLeave
                                            ? "border-b-sky-500"
                                            : "border-b-rose-500";

                                const badgeStyle = isPresent
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                                    : isLate
                                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                                        : isLeave
                                            ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800"
                                            : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800";

                                const badgeText = isPresent ? "✅ Present" : isLate ? "🟡 Late" : isLeave ? "🔵 Leave" : "❌ Absent";

                                const initial = emp.EMP_NAME ? emp.EMP_NAME.charAt(0).toUpperCase() : "A";

                                return (
                                    <div
                                        key={i}
                                        onClick={() => showSideAlert(`Viewing profile for ${emp.EMP_NAME} (${emp.EMP_CODE})`, "info")}
                                        className={`flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-white dark:bg-slate-800/60 dark:border-slate-800 hover:shadow-md hover:scale-[1.005] transition cursor-pointer border-b-[3px] ${bottomBorder}`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0 pr-2">
                                            {emp.PHOTO_URL ? (
                                                <img
                                                    src={`${process.env.NEXT_PUBLIC_imagepath || ""}${emp.PHOTO_URL}`}
                                                    alt={emp.EMP_NAME}
                                                    className="h-10 w-10 rounded-full object-cover border-2 shrink-0"
                                                    style={{ borderColor: isPresent ? "#10b981" : isLate ? "#f59e0b" : "#ef4444" }}
                                                />
                                            ) : (
                                                <div
                                                    className={`h-10 w-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${isAbsent
                                                        ? "bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
                                                        : isPresent
                                                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
                                                            : "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                                                        }`}
                                                >
                                                    {initial}
                                                </div>
                                            )}

                                            <div className="min-w-0">
                                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                                    {emp.EMP_NAME}
                                                </h4>
                                                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase truncate">
                                                    {emp.DESIGNATION || "-"}
                                                </div>
                                                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                                    Login: {emp.LOGIN_TIME || "--:--"} | Logout: {emp.LOGOUT_TIME || "--:--"}
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`px-3 py-1 rounded-full border text-xs font-extrabold shrink-0 ${badgeStyle}`}>
                                            {badgeText}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-12 text-center text-slate-400 font-semibold text-sm">
                                📭 No employees found matching criteria
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    {/* Loader */ }
    <HashloaderComponent isLoading={isLoading} />
        </div >
    );
}
