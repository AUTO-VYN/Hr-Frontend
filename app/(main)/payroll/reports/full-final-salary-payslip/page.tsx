"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  Download,
  Search,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  LayoutGrid,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  Sliders,
  Printer,
  FileCheck2,
  BadgeAlert,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";
import useExcelDownload from "@/app/hooks/excel-download";

// ----------------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------------

function showSideAlert(message: string, type: "success" | "error" | "warning" | "info") {
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

function numberToWords(num: number): string {
  if (isNaN(num) || num === 0) return "Zero Only";
  const absNum = Math.abs(num);
  const rupees = Math.floor(absNum);
  const paise = Math.round((absNum - rupees) * 100);

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function convertBelowThousand(n: number): string {
    let str = "";
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + " ";
    }
    return str.trim();
  }

  function convertFull(n: number): string {
    let result = "";
    if (n >= 10000000) {
      result += convertBelowThousand(Math.floor(n / 10000000)) + " Crore ";
      n %= 10000000;
    }
    if (n >= 100000) {
      result += convertBelowThousand(Math.floor(n / 100000)) + " Lakh ";
      n %= 100000;
    }
    if (n >= 1000) {
      result += convertBelowThousand(Math.floor(n / 1000)) + " Thousand ";
      n %= 1000;
    }
    if (n > 0) {
      result += convertBelowThousand(n);
    }
    return result.trim();
  }

  let words = (num < 0 ? "Minus " : "") + convertFull(rupees);
  if (words) words += " Rupees";
  if (paise > 0) {
    words += (words ? " and " : "") + convertBelowThousand(paise) + " Paise";
  }
  return (words.trim() || "Zero") + " Only";
}

const amountInWords = (amount: number) => {
  return numberToWords(Math.round(amount));
};

const calculateService = (startDate: any, endDate: any) => {
  if (!startDate || !endDate) return "-";
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) return "-";

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months--;
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  return `${years} Year(s) ${months} Month(s) ${days} Day(s)`;
};

const calculateDates = (
  year: any,
  monthStart: any,
  monthEnd: any,
  month: any,
) => {
  const parsedYear = parseInt(year, 10);
  const fiscalYearstart =
    parseInt(monthStart) >= month ? parsedYear : parsedYear + 1;
  const fiscalYearend =
    parseInt(monthEnd) >= month ? parsedYear : parsedYear + 1;
  const startDate = new Date(fiscalYearstart, parseInt(monthStart) - 1, 2);
  const yearStart = new Date(year, parseInt(month) - 1, 2);
  const endDate = new Date(fiscalYearend, parseInt(monthEnd), 1);
  return {
    start: startDate.toISOString().slice(0, 10),
    end: endDate.toISOString().slice(0, 10),
    yearStart: yearStart.toISOString().slice(0, 10),
  };
};

const formatCurrency = (val: number | string | undefined | null) => {
  const num = Number(val || 0);
  return `₹${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// ----------------------------------------------------------------------
// MAIN COMPONENT
// ----------------------------------------------------------------------

export default function FullAndFinalSalaryPayslipPage() {
  const router = useRouter();
  const user: any = useCurrentUser();
  const { handleExcelDownload } = useExcelDownload();

  // Navigation & tabs
  const [activeExitTab, setActiveExitTab] = useState("Full & final settlement");
  const [activeSubTab, setActiveSubTab] = useState<"filters" | "payslip_data">("filters");
  const [showAIBanner, setShowAIBanner] = useState(true);
  const [showChecklistModal, setShowChecklistModal] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [showButtonClicked, setShowButtonClicked] = useState(false);

  // Dropdown master options
  const [loc_code, setLoc_code] = useState<{ value: string; label: string }[]>([]);
  const [divisionoption, setDivisionoption] = useState<{ value: string; label: string }[]>([]);
  const [empcode, setEmpcode] = useState<{ value: string; label: string }[]>([]);

  // Search filter for card view
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState("");
  const [selectedEmpList, setSelectedEmpList] = useState<string[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    Month: "",
    Year: "",
    EmpCode: [] as any[],
    tran_id: null,
    loc_code: "",
    EMPLOYEETYPE: "",
    DIVISION: "",
    EmpType: "",
  });

  // Salary data
  const [Data, setData] = useState<any[]>([]);
  const [companyName, setCompanyName] = useState("N/A");
  const [compAddress, setCompAddress] = useState("N/A");
  const [companyLogo, setCompanyLogo] = useState("");
  const [data1, setData1] = useState<any>({});
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Adjustment Modal
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [manualData, setManualData] = useState<Record<string, any>>({});

  // Print Mode State ("fullStatement" | "onePager" | null)
  const [printMode, setPrintMode] = useState<"fullStatement" | "onePager" | null>(null);
  const printStatementRef = useRef<HTMLDivElement>(null);
  const printOnePagerRef = useRef<HTMLDivElement>(null);

  // Month & Year Options
  const MonthOptions = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const YearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const financialYears = [];
    for (let i = 0; i < 5; i++) {
      const yr = currentYear - i;
      financialYears.push({
        value: `${yr}`,
        label: `${yr}`,
      });
    }
    return financialYears;
  }, []);

  const EmpTypeOption = [
    { value: "1", label: "Regular" },
    { value: "2", label: "Casual" },
  ];

  const exitProcessTabs = [
    "Resignation Request",
    "Manager view",
    "Manager approval",
    "Exit by Manager",
    "HR view",
    "Exit by HR",
    "CEO view",
    "Full & final settlement",
  ];

  // ----------------------------------------------------------------------
  // API CALLS
  // ----------------------------------------------------------------------

  // 1. Fetch Masters (Locations & Departments)
  const fetchMasters = async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/masters`,
        {},
        {
          headers: {
            compcode: user?.Comp_Code,
          },
        },
      );
      const locs = response?.data?.data?.LOCATION || [];
      const depts = response?.data?.data?.SECTION || [];

      setLoc_code(
        locs.map((l: any) => ({
          value: String(l.value ?? l.Loc_Code ?? l.id ?? ""),
          label: String(l.label ?? l.Loc_Desc ?? l.name ?? ""),
        })),
      );

      setDivisionoption(
        depts.map((d: any) => ({
          value: String(d.value ?? d.Dept_Code ?? d.id ?? ""),
          label: String(d.label ?? d.Dept_Desc ?? d.name ?? ""),
        })),
      );
    } catch (error) {
      console.error("Error fetching masters data:", error);
    }
  };

  useEffect(() => {
    fetchMasters();
  }, [user?.Comp_Code]);

  // 2. Fetch Employees on Location change
  const fetchEmployeesByLocation = async () => {
    if (!formData.loc_code) return;
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/hrmsreport/getEmployeeFullFinal`,
        {
          Loc_code: `${formData.loc_code}`,
          Month: formData?.Month,
          Year: formData?.Year,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      const emps = response.data?.data || [];
      setEmpcode(
        emps.map((emp: any) => ({
          value: String(emp.value ?? emp.EmpCode ?? emp["Employee Code"] ?? ""),
          label: String(emp.label ?? emp.EmpName ?? emp["Employee Name"] ?? emp.value ?? ""),
        })),
      );
    } catch (error) {
      console.error("Error fetching employee full final:", error);
    }
  };

  useEffect(() => {
    if (formData.loc_code) {
      fetchEmployeesByLocation();
    }
  }, [formData.loc_code, formData.Month, formData.Year]);

  // Handle Input Changes
  const handleInputChange = (name: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [name]:
        name === "EmpCode" ? (Array.isArray(value) ? value : value ? [value] : []) : value,
    }));
    setShowButtonClicked(false);
  };

  // Helper to remove duplicate employee entries
  const removeDuplicates = (dataArr: any[]) => {
    if (!dataArr || !Array.isArray(dataArr)) return [];
    const seen = new Set();
    const uniqueData = [];
    for (const item of dataArr) {
      const empCode = item["Employee Code"] || item.EmpCode;
      if (!seen.has(empCode)) {
        seen.add(empCode);
        uniqueData.push(item);
      }
    }
    return uniqueData;
  };

  // 3. Main PaySlip Data Fetcher
  const PaySlip = async () => {
    const { Month, Year, EmpCode, loc_code, DIVISION, EMPLOYEETYPE, EmpType } = formData;

    const validationMap = [
      { field: Month, message: "Please select a Month" },
      { field: Year, message: "Please select a Year" },
      { field: loc_code, message: "Please select a Location" },
      {
        field: EmpCode && EmpCode.length > 0 ? EmpCode : null,
        message: "Please select at least one Employee",
      },
    ];

    for (const { field, message } of validationMap) {
      if (!field) {
        showSideAlert(message, "warning");
        return;
      }
    }

    try {
      setIsLoading(true);
      const { start, end } = calculateDates(Year, Month, Month, 1);
      const empCodes = Array.isArray(EmpCode) ? EmpCode : [EmpCode];

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/hrmsreport/FullFinalPaySlip`,
        {
          location: loc_code,
          department: DIVISION,
          empcode: empCodes,
          dateFrom: start,
          dateto: end,
          employeeType: EMPLOYEETYPE,
          EmpType: EmpType,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
          },
        },
      );

      const rawData = response.data?.data || [];
      const resData = removeDuplicates(rawData);

      if (resData.length > 0) {
        setData(resData);
        setShowButtonClicked(true);

        // Pre-fill manual adjustments
        const prefill: Record<string, any> = {};
        resData.forEach((emp: any) => {
          const code = emp["Employee Code"] || emp.EmpCode;
          prefill[code] = {
            Bonus_Payable: Number(emp.Bonus_Payable) || 0,
            Notice_Pay_Lieu: Number(emp.Notice_Pay_Lieu) || 0,
            Other_Payable: Number(emp.Other_Payable) || 0,
            Other_Outstanding: Number(emp.Other_Outstanding) || 0,
            Notice_Pay_Deduction: Number(emp.Notice_Pay_Deduction) || 0,
            isExisting: Boolean(
              emp.Bonus_Payable ||
              emp.Notice_Pay_Lieu ||
              emp.Other_Payable ||
              emp.Other_Outstanding ||
              emp.Notice_Pay_Deduction
            ),
          };
        });

        setManualData(prefill);
        setCompanyName(resData[0]?.comp_name || "N/A");
        setCompAddress(resData[0]?.Comp_Address || "N/A");
        setData1(resData[0]);

        // Select all employees by default in card view
        setSelectedEmpList(resData.map((e: any) => e["Employee Code"] || e.EmpCode));

        showSideAlert(`Data fetched successfully for ${resData.length} employee(s)`, "success");
      } else {
        setData([]);
        setShowButtonClicked(false);
        setCompAddress("N/A");
        showSideAlert("No Data Found for selected criteria", "warning");
      }
    } catch (error) {
      console.error("Error fetching payslip data:", error);
      Swal.fire("Error", "Failed to fetch salary slip data. Please check inputs.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Manual Adjustments Handlers
  const handleManualChange = (empCode: string, field: string, value: any) => {
    setManualData((prev) => ({
      ...prev,
      [empCode]: {
        ...prev[empCode],
        [field]: parseFloat(value) || 0,
      },
    }));
  };

  const saveManualAdjustments = async (empCode: string) => {
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/hrmsreport/saveFullFinalAdjustments`,
        {
          EmpCode: empCode,
          SalMonth: formData.Month,
          SalYear: formData.Year,
          ...manualData[empCode],
        },
        { headers: { compcode: user?.Comp_Code } },
      );

      showSideAlert("Adjustments Saved Successfully", "success");
      PaySlip();
    } catch (error) {
      console.error("Error saving manual adjustments:", error);
      showSideAlert("Error Saving Adjustments", "error");
    }
  };

  // 5. Fetch Print Company Logo and Data Range for One Pager
  const preparePrintData = async () => {
    const { Month, Year } = formData;
    try {
      const masterRes = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/hrmsreport/findMasters`,
        { Month, Year, multiloc: user?.branch },
        { headers: { compcode: user?.Comp_Code } },
      );

      const misc = masterRes.data?.data?.MiscDate?.[0]?.[0];
      let fDate = misc?.Misc_Dtl1;
      let tDate = misc?.Misc_Dtl2;

      if (!fDate || !tDate) {
        const m = Number(Month || 1);
        const y = Number(Year || new Date().getFullYear());
        const firstDay = new Date(y, m - 1, 1);
        const lastDay = new Date(y, m, 0);
        const fmt = (d: Date) =>
          `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
        fDate = fmt(firstDay);
        tDate = fmt(lastDay);
      }

      setFromDate(fDate);
      setToDate(tDate);

      // Company Logo & Print Meta
      const companyLogoRes = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/Tvicm/PrintData`,
        {
          multi_loc: user?.branch,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      if (companyLogoRes.data?.complogo) {
        setCompanyLogo(companyLogoRes.data.complogo);
      }
      if (companyLogoRes.data?.a?.[0]?.[0]) {
        setData1(companyLogoRes.data.a[0][0]);
      }
    } catch (e) {
      console.error("Error loading print logo/dates:", e);
    }
  };

  // 6. Print Full Statement PDF
  const triggerFullStatementPrint = async () => {
    if (!showButtonClicked || Data.length === 0) {
      showSideAlert("Please click 'Show' first to load data", "warning");
      return;
    }
    setPrintMode("fullStatement");
    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 400);
  };

  // 7. Print One-Pager PDF
  const triggerOnePagerPrint = async () => {
    if (!showButtonClicked || Data.length === 0) {
      showSideAlert("Please click 'Show' first to load data", "warning");
      return;
    }
    setIsLoading(true);
    await preparePrintData();
    setIsLoading(false);
    setPrintMode("onePager");
    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 400);
  };

  // ----------------------------------------------------------------------
  // EMPLOYEE SELECTION & CALCULATIONS
  // ----------------------------------------------------------------------

  const filteredEmployeesForCards = useMemo(() => {
    if (!Data || Data.length === 0) return [];
    if (!searchEmployeeQuery.trim()) return Data;
    const q = searchEmployeeQuery.toLowerCase();
    return Data.filter((emp) => {
      const code = String(emp["Employee Code"] || "").toLowerCase();
      const name = String(emp["Employee Name"] || "").toLowerCase();
      const dept = String(emp.Department || emp.Section || "").toLowerCase();
      return code.includes(q) || name.includes(q) || dept.includes(q);
    });
  }, [Data, searchEmployeeQuery]);

  const handleSelectAllCards = (checked: boolean) => {
    if (checked) {
      setSelectedEmpList(filteredEmployeesForCards.map((e) => e["Employee Code"] || e.EmpCode));
    } else {
      setSelectedEmpList([]);
    }
  };

  const handleToggleCardSelection = (code: string) => {
    setSelectedEmpList((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  // Helper for calculated figures per employee
  const getEmployeeCalculations = (emp: any) => {
    const code = emp["Employee Code"] || emp.EmpCode;
    const adjustments = manualData[code] || {};

    const salaryList = emp.salary || [];
    const earningsList = [...(emp.earnings || [])];
    const deductionsList = [...(emp.deductions || [])];

    const hasHead = (array: any[], headName: string) =>
      array.some((item: any) =>
        item.head?.toLowerCase().includes(headName.toLowerCase()),
      );

    // Additional earnings
    const bonus = Number(adjustments.Bonus_Payable ?? emp.Bonus_Payable ?? 0);
    const noticeInLieu = Number(adjustments.Notice_Pay_Lieu ?? emp.Notice_Pay_Lieu ?? 0);
    const otherPayable = Number(adjustments.Other_Payable ?? emp.Other_Payable ?? 0);

    // Additional deductions
    const otherOutstanding = Number(adjustments.Other_Outstanding ?? emp.Other_Outstanding ?? 0);
    const noticeDeduction = Number(adjustments.Notice_Pay_Deduction ?? emp.Notice_Pay_Deduction ?? 0);

    const baseEarnings = earningsList.reduce((acc, cur) => acc + Number(cur.amount || 0), 0);
    const baseDeductions = deductionsList.reduce((acc, cur) => acc + Number(cur.amount || 0), 0);

    const totalEarnings =
      baseEarnings +
      (!hasHead(earningsList, "bonus") ? bonus : 0) +
      (!hasHead(earningsList, "notice pay lieu") ? noticeInLieu : 0) +
      (!hasHead(earningsList, "other payable") ? otherPayable : 0);

    const totalDeductions =
      baseDeductions +
      (!hasHead(deductionsList, "other outstanding") ? otherOutstanding : 0) +
      (!hasHead(deductionsList, "notice pay") ? noticeDeduction : 0);

    const finalSettlement = totalEarnings - totalDeductions;
    const netSalary = Number(emp["Net Salary"] || finalSettlement);

    // Breakdown tags for table
    const leaveEncashment = Number(
      earningsList.find((e) => e.head?.toLowerCase().includes("leave encash"))?.amount || 0,
    );
    const gratuity = Number(
      earningsList.find((e) => e.head?.toLowerCase().includes("gratuity"))?.amount || 0,
    );
    const pfTds = Number(
      deductionsList
        .filter((d) => {
          const h = (d.head || "").toLowerCase();
          return h.includes("pf") || h.includes("provident") || h.includes("tds") || h.includes("tax");
        })
        .reduce((sum, d) => sum + Number(d.amount || 0), 0),
    );
    const loanDues = Number(
      deductionsList.find((d) => d.head?.toLowerCase().includes("loan"))?.amount || 0,
    );
    const recovery = Number(
      deductionsList
        .filter((d) => {
          const h = (d.head || "").toLowerCase();
          return (
            h.includes("recovery") ||
            h.includes("notice") ||
            h.includes("outstanding") ||
            h.includes("other")
          );
        })
        .reduce((sum, d) => sum + Number(d.amount || 0), 0),
    );

    return {
      code,
      name: emp["Employee Name"] || emp.EmpName,
      designation: emp.Designation || "-",
      department: emp.Department || emp.Section || "-",
      branch: emp.Branch || "-",
      lastDay: emp["Last Working Date"]
        ? new Date(emp["Last Working Date"]).toLocaleDateString("en-GB")
        : "-",
      workedDays: emp["Days Paid"] ?? emp.Days_Paid ?? 0,
      monthlySalary: Number(emp["Salary Monthly Rate"] || emp.Monthly_Rate || 0),
      leaveEncashment,
      gratuity,
      bonus,
      recovery,
      pfTds,
      loanDues,
      totalEarnings,
      totalDeductions,
      netSalary,
      finalSettlement,
      salaryList,
      earningsList,
      deductionsList,
    };
  };

  // ----------------------------------------------------------------------
  // REACT-TABLE COLUMNS (for View 2: "Payslip data")
  // ----------------------------------------------------------------------

  const tableColumns = useMemo(
    () => [
      {
        Header: "EMP CODE",
        accessor: "Employee Code",
        minWidth: 100,
        Cell: ({ row }: any) => {
          const calc = getEmployeeCalculations(row.original);
          return <span className="font-semibold text-slate-800 dark:text-slate-100">{calc.code}</span>;
        },
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: "Employee Name",
        minWidth: 160,
        Cell: ({ row }: any) => {
          const calc = getEmployeeCalculations(row.original);
          return (
            <div>
              <p className="font-semibold text-slate-900 dark:text-white leading-snug">{calc.name}</p>
              <p className="text-[11px] text-slate-400">{calc.designation}</p>
            </div>
          );
        },
      },
      {
        Header: "DEPARTMENT",
        accessor: "Department",
        minWidth: 120,
        Cell: ({ row }: any) => {
          const calc = getEmployeeCalculations(row.original);
          return <span className="text-slate-600 dark:text-slate-300">{calc.department}</span>;
        },
      },
      {
        Header: "LAST DAY",
        accessor: "Last Working Date",
        minWidth: 110,
        Cell: ({ row }: any) => {
          const calc = getEmployeeCalculations(row.original);
          return <span className="text-slate-600 dark:text-slate-300">{calc.lastDay}</span>;
        },
      },
      {
        Header: "WORKED DAYS",
        accessor: "Days Paid",
        minWidth: 100,
        Cell: ({ row }: any) => {
          const calc = getEmployeeCalculations(row.original);
          return <span className="font-medium text-center block">{calc.workedDays}</span>;
        },
      },
      {
        Header: "SALARY",
        accessor: "Salary Monthly Rate",
        minWidth: 100,
        Cell: ({ row }: any) => {
          const calc = getEmployeeCalculations(row.original);
          return <span className="text-right block font-medium">{formatCurrency(calc.monthlySalary)}</span>;
        },
      },
      {
        Header: "LEAVE ENCASHMENT",
        accessor: "LeaveEncashment",
        minWidth: 120,
        Cell: ({ row }: any) => {
          const calc = getEmployeeCalculations(row.original);
          return <span className="text-right block text-slate-700 dark:text-slate-300">{formatCurrency(calc.leaveEncashment)}</span>;
        },
      },
      {
        Header: "GRATUITY",
        accessor: "Gratuity",
        minWidth: 110,
        Cell: ({ row }: any) => {
          const calc = getEmployeeCalculations(row.original);
          return <span className="text-right block text-slate-700 dark:text-slate-300">{formatCurrency(calc.gratuity)}</span>;
        },
      },
      {
        Header: "BONUS",
        accessor: "Bonus_Payable",
        minWidth: 100,
        Cell: ({ row }: any) => {
          const calc = getEmployeeCalculations(row.original);
          return <span className="text-right block text-slate-700 dark:text-slate-300">{formatCurrency(calc.bonus)}</span>;
        },
      },
      {
        Header: "RECOVERY",
        accessor: "Recovery",
        minWidth: 110,
        Cell: ({ row }: any) => {
          const calc = getEmployeeCalculations(row.original);
          return <span className="text-right block text-rose-600 font-medium">{formatCurrency(calc.recovery)}</span>;
        },
      },
      {
        Header: "PF + TDS",
        accessor: "PfTds",
        minWidth: 100,
        Cell: ({ row }: any) => {
          const calc = getEmployeeCalculations(row.original);
          return <span className="text-right block text-slate-700 dark:text-slate-300">{formatCurrency(calc.pfTds)}</span>;
        },
      },
      {
        Header: "LOAN DUES",
        accessor: "LoanDues",
        minWidth: 100,
        Cell: ({ row }: any) => {
          const calc = getEmployeeCalculations(row.original);
          return <span className="text-right block text-rose-600 font-medium">{formatCurrency(calc.loanDues)}</span>;
        },
      },
      {
        Header: "NET PAYABLE",
        accessor: "Net Salary",
        minWidth: 130,
        Cell: ({ row }: any) => {
          const calc = getEmployeeCalculations(row.original);
          return (
            <span className="text-right block font-bold text-slate-900 dark:text-white">
              {formatCurrency(calc.finalSettlement)}
            </span>
          );
        },
      },
      {
        Header: "ACTIONS",
        accessor: "actions",
        minWidth: 160,
        disableSortBy: true,
        Cell: ({ row }: any) => {
          return (
            <div className="flex items-center gap-1.5 justify-center">
              <AButton
                variant="subtle"
                size="sm"
                className="h-7 text-xs px-2.5 rounded-lg"
                onClick={() => {
                  setSelectedEmployee(row.original);
                  setShowAdjustmentModal(true);
                }}
              >
                Adjustment
              </AButton>
            </div>
          );
        },
      },
    ],
    [manualData],
  );

  // Grand totals for Table View
  const grandTotals = useMemo(() => {
    return Data.reduce(
      (acc, emp) => {
        const c = getEmployeeCalculations(emp);
        acc.workedDays += Number(c.workedDays || 0);
        acc.monthlySalary += c.monthlySalary;
        acc.leaveEncashment += c.leaveEncashment;
        acc.gratuity += c.gratuity;
        acc.bonus += c.bonus;
        acc.recovery += c.recovery;
        acc.pfTds += c.pfTds;
        acc.loanDues += c.loanDues;
        acc.finalSettlement += c.finalSettlement;
        return acc;
      },
      {
        workedDays: 0,
        monthlySalary: 0,
        leaveEncashment: 0,
        gratuity: 0,
        bonus: 0,
        recovery: 0,
        pfTds: 0,
        loanDues: 0,
        finalSettlement: 0,
      },
    );
  }, [Data, manualData]);

  // Export Table Data to Excel
  const exportSettlementToExcel = () => {
    if (!Data || Data.length === 0) {
      showSideAlert("No data available to export", "warning");
      return;
    }
    const cols = [
      { Header: "Emp Code", accessor: "Employee Code" },
      { Header: "Employee Name", accessor: "Employee Name" },
      { Header: "Department", accessor: "Department" },
      { Header: "Designation", accessor: "Designation" },
      { Header: "Branch", accessor: "Branch" },
      { Header: "Last Working Date", accessor: "Last Working Date" },
      { Header: "Days Paid", accessor: "Days Paid" },
      { Header: "Total Earnings", accessor: "Total Earnings" },
      { Header: "Total Deductions", accessor: "Total Deductions" },
      { Header: "Net Payable", accessor: "Final Settlement" },
    ];

    const exportRows = Data.map((emp) => {
      const c = getEmployeeCalculations(emp);
      return {
        "Employee Code": c.code,
        "Employee Name": c.name,
        Department: c.department,
        Designation: c.designation,
        Branch: c.branch,
        "Last Working Date": c.lastDay,
        "Days Paid": c.workedDays,
        "Total Earnings": c.totalEarnings.toFixed(2),
        "Total Deductions": c.totalDeductions.toFixed(2),
        "Final Settlement": c.finalSettlement.toFixed(2),
      };
    });

    handleExcelDownload(cols, exportRows);
  };

  const selectedMonthLabel =
    MonthOptions.find((m) => m.value === formData.Month)?.label || "Selected Month";

  // ----------------------------------------------------------------------
  // RENDER UI
  // ----------------------------------------------------------------------

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-[#070D18] text-slate-800 dark:text-slate-100 p-4 md:p-6 space-y-5">
 
    

   
      <div className="space-y-1">
        <h1 className="text-3xl  font-semibold text-slate-900 dark:text-white">
          Full & final settlement
        </h1>
        <p className="text-md md:text-md text-slate-500 dark:text-slate-400 max-w-4xl">
          Everyone whose last working day falls in the selected month. Pick the people you are
          settling — anyone still short a department NOC cannot be released, and the run tells you
          which one is missing.
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 5. VIEW SUB-TABS (Filters vs Payslip Data)                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-800 text-xs md:text-sm">
        <button
          onClick={() => setActiveSubTab("filters")}
          className={`flex items-center gap-2 pb-3 font-medium transition-colors relative ${
            activeSubTab === "filters"
              ? "text-[#4338CA] dark:text-[#818CF8] font-semibold"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filters</span>
          {activeSubTab === "filters" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#4338CA] dark:bg-[#818CF8] rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab("payslip_data")}
          className={`flex items-center gap-2 pb-3 font-medium transition-colors relative ${
            activeSubTab === "payslip_data"
              ? "text-[#4338CA] dark:text-[#818CF8] font-semibold"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Payslip data</span>
          {activeSubTab === "payslip_data" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#4338CA] dark:bg-[#818CF8] rounded-full" />
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 6. SELECT FILTERS CARD                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] p-4 md:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            SELECT FILTERS
          </p>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Month */}
          <div>
            <Eselect
              title="MONTH"
              name="Month"
              ShortName={true}
              redlabel="*"
              labelClassName="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 gap-0.5"
              className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] text-[13px] text-slate-800 dark:text-slate-100 shadow-xs hover:border-slate-300 focus-within:border-indigo-500"
              option={MonthOptions}
              initialValue={formData.Month}
              handleInputChange={handleInputChange}
              placeholder="Select Month"
            />
          </div>

          {/* Year */}
          <div>
            <Eselect
              title="YEAR"
              name="Year"
              ShortName={true}
              redlabel="*"
              labelClassName="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 gap-0.5"
              className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] text-[13px] text-slate-800 dark:text-slate-100 shadow-xs hover:border-slate-300 focus-within:border-indigo-500"
              option={YearOptions}
              initialValue={formData.Year}
              handleInputChange={handleInputChange}
              placeholder="Select Year"
            />
          </div>

          {/* Location */}
          <div>
            <Eselect
              title="LOCATION"
              name="loc_code"
              ShortName={true}
              redlabel="*"
              labelClassName="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 gap-0.5"
              className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] text-[13px] text-slate-800 dark:text-slate-100 shadow-xs hover:border-slate-300 focus-within:border-indigo-500"
              option={loc_code}
              initialValue={formData.loc_code}
              handleInputChange={handleInputChange}
              placeholder="All locations"
            />
          </div>

          {/* Employee Name (Multi-select with Checkbox) */}
          <div>
            <Eselect
              title="EMPLOYEE"
              name="EmpCode"
              ShortName={true}
              labelClassName="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 gap-0.5"
              className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] text-[13px] text-slate-800 dark:text-slate-100 shadow-xs hover:border-slate-300 focus-within:border-indigo-500"
              option={empcode}
              initialValue={formData.EmpCode}
              handleInputChange={handleInputChange}
              checkbox={true}
              isMulti={true}
              placeholder="Select Employee"
            />
          </div>

          {/* Department */}
          <div>
            <Eselect
              title="DEPARTMENT"
              name="DIVISION"
              ShortName={true}
              labelClassName="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 gap-0.5"
              className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] text-[13px] text-slate-800 dark:text-slate-100 shadow-xs hover:border-slate-300 focus-within:border-indigo-500"
              option={divisionoption}
              initialValue={formData.DIVISION}
              handleInputChange={handleInputChange}
              placeholder="All Departments"
            />
          </div>

          {/* Employee Type */}
          <div>
            <Eselect
              title="EMPLOYEE TYPE"
              name="EmpType"
              ShortName={true}
              labelClassName="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 gap-0.5"
              className="h-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] text-[13px] text-slate-800 dark:text-slate-100 shadow-xs hover:border-slate-300 focus-within:border-indigo-500"
              option={EmpTypeOption}
              initialValue={formData.EmpType}
              handleInputChange={handleInputChange}
              placeholder="Select Type"
            />
          </div>
        </div>

        {/* Filter Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-2 flex-wrap">
            <AButton
              variant="primary"
              size="md"
              icon={<Search className="w-4 h-4 text-white" />}
              onClick={PaySlip}
              loading={isLoading}
              className="bg-[#4338CA] hover:bg-[#3730A3] text-white px-5 rounded-xl h-10 text-xs font-semibold shadow-xs flex items-center gap-2 active:scale-[0.98] transition-all"
            >
              Show
            </AButton>

            <AButton
              variant="outline"
              size="md"
              icon={<Download className="w-3.5 h-3.5 text-slate-500" />}
              onClick={triggerFullStatementPrint}
              disabled={!showButtonClicked || Data.length === 0}
              className="rounded-xl h-10 px-4 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-xs flex items-center gap-2 active:scale-[0.98] transition-all"
            >
              Download PDF
            </AButton>

            <AButton
              variant="outline"
              size="md"
              icon={<Download className="w-3.5 h-3.5 text-slate-500" />}
              onClick={triggerOnePagerPrint}
              disabled={!showButtonClicked || Data.length === 0}
              className="rounded-xl h-10 px-4 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-xs flex items-center gap-2 active:scale-[0.98] transition-all"
            >
              Download One Pager PDF
            </AButton>
          </div>

          <AButton
            variant="ghost"
            size="sm"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={() => {
              setFormData({
                Month: "",
                Year: "",
                EmpCode: [],
                tran_id: null,
                loc_code: "",
                EMPLOYEETYPE: "",
                DIVISION: "",
                EmpType: "",
              });
              setData([]);
              setShowButtonClicked(false);
            }}
            className="h-10 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl px-3 flex items-center gap-1.5 transition-all"
          >
            Reset
          </AButton>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 7. CONTENT VIEW 1: FILTERS (EMPLOYEE CARDS & RELEASE LIST)         */}
      {/* ------------------------------------------------------------------ */}
      {activeSubTab === "filters" && (
        <div className="space-y-3">
          {/* List Header Bar */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="select-all-cards"
                checked={
                  filteredEmployeesForCards.length > 0 &&
                  selectedEmpList.length === filteredEmployeesForCards.length
                }
                onChange={(e) => handleSelectAllCards(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
              />
              <label
                htmlFor="select-all-cards"
                className="text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer select-none"
              >
                Select employees ({selectedEmpList.length})
              </label>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-full sm:w-64">
                <Einput
                  name="search_employee"
                  placeholder="Search employee..."
                  value={searchEmployeeQuery}
                  onChange={(e) => setSearchEmployeeQuery(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <AButton
                variant={selectedEmpList.length > 0 ? "secondary" : "ghost"}
                size="sm"
                disabled={selectedEmpList.length === 0}
                onClick={() => {
                  showSideAlert(`Settlement released for ${selectedEmpList.length} employees`, "success");
                }}
                className="rounded-xl h-9 text-xs px-4 whitespace-nowrap"
              >
                Release settlement
              </AButton>
            </div>
          </div>

          {/* Employee Cards List */}
          {filteredEmployeesForCards.length > 0 ? (
            <div className="space-y-2">
              {filteredEmployeesForCards.map((employeeData) => {
                const calc = getEmployeeCalculations(employeeData);
                const isChecked = selectedEmpList.includes(calc.code);

                // Initials avatar
                const initials = calc.name
                  .split(" ")
                  .slice(0, 2)
                  .map((w: string) => w.charAt(0).toUpperCase())
                  .join("");

                // Mock NOC Status logic: ready if no deductions, else 2 NOC pending
                const isReady = calc.recovery === 0 && calc.loanDues === 0;

                return (
                  <div
                    key={calc.code}
                    className={`rounded-2xl border transition-all p-4 bg-white dark:bg-[#0B1220] flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs ${
                      isChecked
                        ? "border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/10"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                    }`}
                  >
                    {/* Left: Checkbox & Employee Details */}
                    <div className="flex items-center gap-3.5 min-w-[280px]">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleCardSelection(calc.code)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                      />

                      <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4338CA] dark:text-[#818CF8] font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/60">
                        {initials || "EM"}
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                          {calc.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {calc.code} · {calc.designation} · {calc.department} · {calc.branch}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Figures Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 lg:gap-8 text-xs py-2 lg:py-0 border-y lg:border-y-0 border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">LAST DAY</p>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                          {calc.lastDay}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">EARNINGS</p>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {formatCurrency(calc.totalEarnings)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">DEDUCTIONS</p>
                        <p className="font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                          {formatCurrency(calc.totalDeductions)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">NET PAYABLE</p>
                        <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                          {formatCurrency(calc.finalSettlement)}
                        </p>
                      </div>
                    </div>

                    {/* Right: Badges & Actions */}
                    <div className="flex items-center gap-2.5 justify-end">
                      {isReady ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50">
                          <AlertCircle className="w-3.5 h-3.5" />
                          2 NOC pending
                        </span>
                      )}

                      <AButton
                        variant="subtle"
                        size="sm"
                        onClick={() => {
                          setSelectedEmployee(employeeData);
                          setShowAdjustmentModal(true);
                        }}
                        className="h-8 text-xs rounded-xl px-3"
                      >
                        Adjust
                      </AButton>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-white dark:bg-[#0B1220]">
              <p className="text-sm font-medium text-slate-500">
                {showButtonClicked
                  ? "No matching employees found"
                  : "Please select Month, Year & Location, then click 'Show'"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 8. CONTENT VIEW 2: PAYSLIP DATA (REACT-TABLE VIEW)                */}
      {/* ------------------------------------------------------------------ */}
      {activeSubTab === "payslip_data" && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] p-4 md:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm md:text-base font-bold text-slate-900 dark:text-white">
              Settlement payslip data {selectedMonthLabel} {formData.Year} · {Data.length} employees
            </h2>
          </div>

          <div className="overflow-x-auto">
            <DataTable
              columns={tableColumns}
              data={Data}
              height={500}
              showTopSearch={true}
              searchPlaceholder="Search in settlement records..."
            />
          </div>

          {/* Grand Totals Footer */}
          {Data.length > 0 && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-4 border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3 text-xs">
              <div className="lg:col-span-1 font-bold text-slate-800 dark:text-slate-100">
                Grand Total:
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">WORKED DAYS</span>
                <span className="font-bold">{grandTotals.workedDays}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">SALARY</span>
                <span className="font-bold">{formatCurrency(grandTotals.monthlySalary)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">LEAVE ENCASH.</span>
                <span className="font-bold">{formatCurrency(grandTotals.leaveEncashment)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">GRATUITY</span>
                <span className="font-bold">{formatCurrency(grandTotals.gratuity)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">BONUS</span>
                <span className="font-bold">{formatCurrency(grandTotals.bonus)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">RECOVERY</span>
                <span className="font-bold text-rose-600">{formatCurrency(grandTotals.recovery)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">PF + TDS</span>
                <span className="font-bold">{formatCurrency(grandTotals.pfTds)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">NET PAYABLE</span>
                <span className="font-bold text-[#4338CA] dark:text-[#818CF8]">
                  {formatCurrency(grandTotals.finalSettlement)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 9. MANUAL ADJUSTMENT MODAL                                        */}
      {/* ------------------------------------------------------------------ */}
      {showAdjustmentModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0B1220] w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Manual Adjustment
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedEmployee["Employee Name"]} ({selectedEmployee["Employee Code"]})
                </p>
              </div>

              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Additional Earnings */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border-b border-emerald-100 dark:border-emerald-950 pb-1">
                  Additional Earnings
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Einput
                    type="number"
                    title="Bonus Payable"
                    name="Bonus_Payable"
                    value={
                      manualData[selectedEmployee["Employee Code"]]?.Bonus_Payable ?? ""
                    }
                    onChange={(e) =>
                      handleManualChange(
                        selectedEmployee["Employee Code"],
                        "Bonus_Payable",
                        e.target.value,
                      )
                    }
                  />

                  <Einput
                    type="number"
                    title="Notice Pay (Lieu)"
                    name="Notice_Pay_Lieu"
                    value={
                      manualData[selectedEmployee["Employee Code"]]?.Notice_Pay_Lieu ?? ""
                    }
                    onChange={(e) =>
                      handleManualChange(
                        selectedEmployee["Employee Code"],
                        "Notice_Pay_Lieu",
                        e.target.value,
                      )
                    }
                  />

                  <Einput
                    type="number"
                    title="Other Payable"
                    name="Other_Payable"
                    value={
                      manualData[selectedEmployee["Employee Code"]]?.Other_Payable ?? ""
                    }
                    onChange={(e) =>
                      handleManualChange(
                        selectedEmployee["Employee Code"],
                        "Other_Payable",
                        e.target.value,
                      )
                    }
                  />
                </div>
              </div>

              {/* Additional Deductions */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 border-b border-rose-100 dark:border-rose-950 pb-1">
                  Additional Deductions
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Einput
                    type="number"
                    title="Other Outstanding"
                    name="Other_Outstanding"
                    value={
                      manualData[selectedEmployee["Employee Code"]]?.Other_Outstanding ?? ""
                    }
                    onChange={(e) =>
                      handleManualChange(
                        selectedEmployee["Employee Code"],
                        "Other_Outstanding",
                        e.target.value,
                      )
                    }
                  />

                  <Einput
                    type="number"
                    title="Notice Pay Deduction"
                    name="Notice_Pay_Deduction"
                    value={
                      manualData[selectedEmployee["Employee Code"]]?.Notice_Pay_Deduction ?? ""
                    }
                    onChange={(e) =>
                      handleManualChange(
                        selectedEmployee["Employee Code"],
                        "Notice_Pay_Deduction",
                        e.target.value,
                      )
                    }
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <AButton
                variant="outline"
                size="sm"
                onClick={() => setShowAdjustmentModal(false)}
                className="rounded-xl h-9 text-xs"
              >
                Cancel
              </AButton>

              <AButton
                variant="primary"
                size="sm"
                onClick={() => {
                  saveManualAdjustments(selectedEmployee["Employee Code"]);
                  setShowAdjustmentModal(false);
                }}
                className="rounded-xl h-9 text-xs px-4"
              >
                {manualData[selectedEmployee["Employee Code"]]?.isExisting
                  ? "Update Adjustment"
                  : "Save Adjustment"}
              </AButton>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 10. SETU AI F&F CHECKLIST MODAL                                    */}
      {/* ------------------------------------------------------------------ */}
      {showChecklistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0B1220] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#6366F1]" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  F&F Pre-Payout Checklist
                </h3>
              </div>
              <button
                onClick={() => setShowChecklistModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      1. Asset Recovery & IT Handover
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Laptops, ID badges, access cards, and company property collected.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      2. Loan & Advance Clearance
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Outstanding employee loans and salary advances recovered or adjusted.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      3. Open Claims & Reimbursements
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Pending travel vouchers, medical claims, and approvals settled.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      4. Leave Encashment & Gratuity
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Calculated as per statutory rules and tenure of service.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <AButton
                variant="primary"
                size="sm"
                onClick={() => setShowChecklistModal(false)}
                className="rounded-xl h-9 text-xs px-4"
              >
                Got It
              </AButton>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 11. PRINTABLE CONTAINERS (FULL STATEMENT & ONE-PAGER)              */}
      {/* ------------------------------------------------------------------ */}

      {/* Mode A: Full Statement Print Container */}
      <div
        id="full-statement-print-section"
        ref={printStatementRef}
        className={printMode === "fullStatement" ? "block" : "hidden print:hidden"}
      >
        {Data.map((employeeData, index) => {
          const calc = getEmployeeCalculations(employeeData);
          const maxRows = Math.max(
            calc.salaryList.length,
            calc.earningsList.length,
            calc.deductionsList.length,
          );

          return (
            <div
              key={index}
              className="p-8 bg-white text-black text-sm"
              style={{ pageBreakAfter: index < Data.length - 1 ? "always" : "auto" }}
            >
              <div className="border border-black p-6">
                <div className="text-center mb-3">
                  <p className="font-bold text-lg uppercase">{companyName}</p>
                  <p className="text-xs uppercase">{compAddress}</p>
                </div>
                <hr className="border-t border-black my-2" />
                <p className="text-center font-bold underline mb-4 mt-3">
                  FULL AND FINAL STATEMENT OF ACCOUNT {selectedMonthLabel.toUpperCase()} -{" "}
                  {formData.Year}
                </p>

                <table className="w-full text-xs mb-3 border-collapse">
                  <tbody>
                    <tr>
                      <td className="py-1 px-2 font-medium">EMP CODE</td>
                      <td className="py-1 px-2 font-bold">{calc.code}</td>
                      <td className="py-1 px-2 font-medium">UNIT</td>
                      <td className="py-1 px-2">{calc.branch}</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 font-medium">NAME</td>
                      <td className="py-1 px-2 font-bold">{calc.name}</td>
                      <td className="py-1 px-2 font-medium">DEPARTMENT</td>
                      <td className="py-1 px-2">{calc.department}</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 font-medium">DESIGNATION</td>
                      <td className="py-1 px-2">{calc.designation}</td>
                      <td className="py-1 px-2 font-medium">CATEGORY</td>
                      <td className="py-1 px-2">{employeeData.Category || "-"}</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 font-medium">D.O. Joining</td>
                      <td className="py-1 px-2">
                        {employeeData["Joining Date"]
                          ? new Date(employeeData["Joining Date"]).toLocaleDateString("en-GB")
                          : "-"}
                      </td>
                      <td className="py-1 px-2 font-medium">Last Working Day</td>
                      <td className="py-1 px-2">{calc.lastDay}</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 font-medium">RESIGNATION DATE</td>
                      <td className="py-1 px-2">
                        {employeeData["RESIGNATION SUBMISSION DATE"]
                          ? new Date(
                              employeeData["RESIGNATION SUBMISSION DATE"],
                            ).toLocaleDateString("en-GB")
                          : "-"}
                      </td>
                      <td className="py-1 px-2 font-medium">Salary Payable Days</td>
                      <td className="py-1 px-2 font-bold">{calc.workedDays}</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 font-bold">TOTAL SERVICE</td>
                      <td className="py-1 px-2" colSpan={3}>
                        {calculateService(
                          employeeData["Joining Date"],
                          employeeData["Last Working Date"],
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <hr className="border-t border-black my-2" />

                <table className="w-full mt-3 text-xs mb-3 border-collapse">
                  <thead>
                    <tr className="font-bold border-b border-black">
                      <th className="py-1 px-2 text-left">RATE HEAD</th>
                      <th className="py-1 px-2 text-right">AMOUNT</th>
                      <th className="py-1 px-2 text-left">EARNINGS</th>
                      <th className="py-1 px-2 text-right">AMOUNT</th>
                      <th className="py-1 px-2 text-left">DEDUCTIONS</th>
                      <th className="py-1 px-2 text-right">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(maxRows)].map((_, rIdx) => (
                      <tr key={rIdx} className="border-b border-slate-100">
                        <td className="py-1 px-2">{calc.salaryList[rIdx]?.head || ""}</td>
                        <td className="py-1 px-2 text-right">
                          {calc.salaryList[rIdx]?.amount != null
                            ? Number(calc.salaryList[rIdx].amount).toFixed(2)
                            : ""}
                        </td>
                        <td className="py-1 px-2">{calc.earningsList[rIdx]?.head || ""}</td>
                        <td className="py-1 px-2 text-right">
                          {calc.earningsList[rIdx]?.amount != null
                            ? Number(calc.earningsList[rIdx].amount).toFixed(2)
                            : ""}
                        </td>
                        <td className="py-1 px-2">{calc.deductionsList[rIdx]?.head || ""}</td>
                        <td className="py-1 px-2 text-right">
                          {calc.deductionsList[rIdx]?.amount != null
                            ? Number(calc.deductionsList[rIdx].amount).toFixed(2)
                            : ""}
                        </td>
                      </tr>
                    ))}

                    <tr className="font-bold bg-slate-100 border-t border-black">
                      <td className="py-1 px-2">TOTAL</td>
                      <td className="py-1 px-2 text-right">
                        {calc.salaryList
                          .reduce((s: number, i: any) => s + Number(i.amount || 0), 0)
                          .toFixed(2)}
                      </td>
                      <td className="py-1 px-2">TOTAL</td>
                      <td className="py-1 px-2 text-right">{calc.totalEarnings.toFixed(2)}</td>
                      <td className="py-1 px-2">TOTAL</td>
                      <td className="py-1 px-2 text-right">{calc.totalDeductions.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>

                <hr className="border-t border-black my-2" />

                <div className="mt-4 space-y-1 text-xs">
                  <p className="font-bold">
                    Net Amount Payable : ₹ {calc.finalSettlement.toFixed(2)}
                  </p>
                  <p className="italic">({amountInWords(calc.finalSettlement)})</p>
                </div>

                <div className="grid grid-cols-3 mt-12 text-center text-xs font-semibold">
                  <p>HR MANAGER</p>
                  <p>AGM HR</p>
                  <p>GM HR</p>
                </div>

                <div className="grid grid-cols-2 mt-8 text-xs">
                  <p>Cheque / Ref No: _________________________</p>
                  <p className="text-right">Paid on: _________________________</p>
                </div>

                <p className="text-center text-[10px] text-slate-500 mt-6">
                  This is a computer generated statement, hence no signature is required.
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mode B: One-Pager Print Container */}
      <div
        id="one-pager-print-section"
        ref={printOnePagerRef}
        className={printMode === "onePager" ? "block" : "hidden print:hidden"}
      >
        {Data.map((employeeData, index) => {
          const calc = getEmployeeCalculations(employeeData);

          return (
            <div
              key={index}
              style={{
                pageBreakAfter: index < Data.length - 1 ? "always" : "auto",
                pageBreakInside: "avoid",
              }}
              className="p-6 text-[11px] leading-tight text-black bg-white"
            >
              <div className="border border-black p-4">
                {/* Header Section */}
                <div className="grid grid-cols-12 items-center">
                  <div className="col-span-3 flex justify-center">
                    <img
                      src={companyLogo || "/logo.png"}
                      alt="Company Logo"
                      className="h-16 object-contain"
                      onError={(e: any) => (e.target.style.display = "none")}
                    />
                  </div>

                  <div className="col-span-6 text-center">
                    <p className="text-base font-bold uppercase">{data1?.comp_name || companyName}</p>
                    <p className="text-[10px] font-bold uppercase mt-1">{data1?.Godw_Add1}</p>
                    <p className="text-[10px] font-bold uppercase">{data1?.Godw_Add2}</p>
                    <p className="text-[10px] font-bold uppercase">{data1?.Godw_Add3}</p>
                  </div>
                </div>

                <div className="text-center text-[12px] font-bold uppercase mt-4 border-y border-black py-1">
                  Full & Final Payslip for the period of {fromDate} to {toDate}
                </div>

                {/* Employee Details Grid */}
                <div className="grid grid-cols-12 text-[10px] uppercase border border-black p-2 mt-2 gap-y-1">
                  <div className="col-span-6 space-y-1 pr-2">
                    <p>Branch : {calc.branch}</p>
                    <p>Designation : {calc.designation}</p>
                    <p>Group : {companyName}</p>
                    <p>Sub-Department : {calc.department}</p>
                    <p>Employee Name : {calc.name}</p>
                    <p>Bank A/C No. : {employeeData["Account No"] || "-"}</p>
                    <p>Last Working Date : {calc.lastDay}</p>
                    <p>
                      Date Of Resignation :{" "}
                      {employeeData["RESIGNATION SUBMISSION DATE"]
                        ? new Date(
                            employeeData["RESIGNATION SUBMISSION DATE"],
                          ).toLocaleDateString("en-GB")
                        : "-"}
                    </p>
                    <p>PF Account No. : {employeeData.pfnumber || "-"}</p>
                    <p>Days Worked : {calc.workedDays}</p>
                    <p>Esic A/C No : {employeeData.esinumber || "-"}</p>
                    <p>UAN Number : {employeeData.UAN_NO || "-"}</p>
                  </div>

                  <div className="col-span-6 border-l border-black space-y-1 pl-3">
                    <p>Department : {employeeData.Section || calc.department}</p>
                    <p>Channel : {employeeData.Channel || "-"}</p>
                    <p>Cluster : {employeeData.Cluster || "-"}</p>
                    <p>Employee Code : {calc.code}</p>
                    <p>Bank Name : {employeeData["Bank Name"] || "-"}</p>
                    <p>Permanent A/C No : {employeeData.PANNO || "-"}</p>
                    <p>
                      Date of Joining :{" "}
                      {employeeData["Joining Date"]
                        ? new Date(employeeData["Joining Date"]).toLocaleDateString("en-GB")
                        : "-"}
                    </p>
                    <p>LWP : {employeeData.ABSENTVALUE || 0}</p>
                    <p>Tax Regime : New Tax Regime</p>
                  </div>
                </div>

                {/* Earnings & Deductions Tables */}
                <div className="grid grid-cols-12 text-[10px] mt-2 border border-black">
                  {/* Earnings Column */}
                  <div className="col-span-6 border-r border-black flex flex-col">
                    <div className="border-b border-black p-1 font-bold bg-slate-50 uppercase">
                      Earnings
                    </div>
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-black font-semibold">
                          <th className="p-1 text-left">Particulars</th>
                          <th className="p-1 text-right">Rates/Month</th>
                          <th className="p-1 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calc.earningsList.map((e: any, i: number) => (
                          <tr key={i} className="border-b border-slate-100">
                            <td className="p-1">{e.head}</td>
                            <td className="p-1 text-right">
                              {Number(e.amount1 || 0).toFixed(2)}
                            </td>
                            <td className="p-1 text-right">{Number(e.amount).toFixed(2)}</td>
                          </tr>
                        ))}
                        <tr className="font-bold border-t border-black bg-slate-50">
                          <td className="p-1 text-left">Total Earnings :</td>
                          <td className="p-1 text-right">
                            {calc.monthlySalary.toFixed(2)}
                          </td>
                          <td className="p-1 text-right">{calc.totalEarnings.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Deductions Column */}
                  <div className="col-span-6 flex flex-col">
                    <div className="border-b border-black p-1 font-bold bg-slate-50 uppercase">
                      Deductions
                    </div>
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-black font-semibold">
                          <th className="p-1 text-left">Particulars</th>
                          <th className="p-1 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calc.deductionsList.map((d: any, i: number) => (
                          <tr key={i} className="border-b border-slate-100">
                            <td className="p-1">{d.head}</td>
                            <td className="p-1 text-right">{Number(d.amount).toFixed(2)}</td>
                          </tr>
                        ))}
                        <tr className="font-bold border-t border-black bg-slate-50">
                          <td className="p-1 text-left">Total Deductions :</td>
                          <td className="p-1 text-right">{calc.totalDeductions.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer Section */}
                <div className="grid grid-cols-12 text-[11px] font-bold border border-black border-t-0">
                  <div className="col-span-9 border-r border-black p-1">
                    Final Settlement Payable (In words) : {amountInWords(calc.finalSettlement)}
                  </div>
                  <div className="col-span-3 p-1 text-right">
                    Net Payable : ₹ {calc.finalSettlement.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Loading Overlay */}
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
