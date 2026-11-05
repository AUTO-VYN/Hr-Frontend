
"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useCurrentUser } from "@/app/hooks/use-current-user";

import {
  Search,
  RotateCcw,
  Check,
  Pause,
  Building2,
  Wallet,
  Banknote,
} from "lucide-react";

import AButton from "@/components/atoms/Button";
import Eselect from "@/components/atoms/Eselect";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

type Option = {
  value: string;
  label: string;
};

type Employee = {
  id: string | number;
  name: string;
  code: string;
  designation: string;
  employeeType: string;
  branch: string;
  monthDays: number;
  paidDays: number;
  gross: number;
  deductions: number;
  net: number;
  mode: string;
  approval: "Pending approval" | "Needs review" | "Approved" | "On hold";
  issue?: string;
  raw: any;
};

type AppliedFilters = {
  month: string;
  year: string;
  employeeType: string;
  paymentMode: string;
  employeeCode: string;
  cluster: string;
  channel: string;
  section: string;
  branch: string;
};

const MONTHS: Option[] = [
  { value: "1", label: "Jan" },
  { value: "2", label: "Feb" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Apr" },
  { value: "5", label: "May" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Aug" },
  { value: "9", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

const getYears = (): Option[] => {
  const currentYear = new Date().getFullYear();

  return Array.from({ length: 8 }, (_, i) => {
    const year = currentYear - 3 + i;

    return {
      value: String(year),
      label: String(year),
    };
  });
};

const YEARS = getYears();

const EMPLOYEE_TYPES: Option[] = [
  { value: "all", label: "All types" },
  { value: "On roll", label: "On roll" },
  { value: "Off roll", label: "Off roll" },
  { value: "Contract", label: "Contract" },
  { value: "Trainee", label: "Trainee" },
];

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatCompactMoney = (value: number) => {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)} L`;
  }

  return money(value);
};

const getNumber = (...values: any[]): number => {
  for (const value of values) {
    if (
      value !== null &&
      value !== undefined &&
      value !== "" &&
      Number.isFinite(Number(value))
    ) {
      return Number(value);
    }
  }

  return 0;
};

const getText = (...values: any[]): string => {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value);
    }
  }

  return "";
};

const getApiError = (error: any) =>
  error?.response?.data?.Message ||
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

const mapOptions = (
  data: any[],
  valueKeys: string[],
  labelKeys: string[],
  allLabel: string
): Option[] => {
  const options: Option[] = (Array.isArray(data) ? data : [])
    .map((item: any) => {
      if (typeof item === "string" || typeof item === "number") {
        return {
          value: String(item),
          label: String(item),
        };
      }

      const value = getText(...valueKeys.map((key) => item?.[key]));
      const label = getText(
        ...labelKeys.map((key) => item?.[key]),
        value
      );

      return {
        value,
        label,
      };
    })
    .filter((item) => item.value);

  const uniqueOptions = options.filter(
    (item, index, array) =>
      array.findIndex((option) => option.value === item.value) === index
  );

  return [
    {
      value: "all",
      label: allLabel,
    },
    ...uniqueOptions.filter((item) => item.value !== "all"),
  ];
};

// API response to existing UI format
const mapEmployeeData = (item: any, index: number): Employee => {
  const employeeCode = getText(
    item.EMPCODE,
    item.EmpCode,
    item.EMP_CODE,
    item.code
  );

  const transactionId =
    item.id ??
    item.UTD ??
    item.utd ??
    item.Tran_id ??
    item.tran_id ??
    item.SRNO ??
    item.srno ??
    `${employeeCode || "employee"}-${index}`;

  const statusValue = getText(
    item.HRApproval,
    item.HR_Approval,
    item.ApprovalStatus,
    item.approval,
    item.status
  );

  let approval: Employee["approval"] = "Pending approval";

  if (/approved|approve/i.test(statusValue)) {
    approval = "Approved";
  } else if (/hold|on hold/i.test(statusValue)) {
    approval = "On hold";
  } else if (/review|reject|pending correction/i.test(statusValue)) {
    approval = "Needs review";
  }

  const issue = getText(
    item.ApprovalRemark,
    item.HR_Remark,
    item.Issue
  );

  return {
    id: transactionId,
    name: getText(
      item.EmpName,
      item.EMP_NAME,
      item.EmployeeName,
      item.name
    ),
    code: employeeCode,
    designation: getText(
      item.EMPLOYEEDESIGNATION,
      item.Designation,
      item.designation
    ),
    employeeType: getText(
      item.EMPLOYEETYPE,
      item.EmployeeType,
      item.employeeType
    ),
    branch: getText(
      item.Loc_code,
      item.LocationName,
      item.BranchName,
      item.branch
    ),
    monthDays: getNumber(item.Monthdays, item.MonthDays),
    paidDays: getNumber(
      item.Total_Days,
      item.Net_Present_Days,
      item.Present_days,
      item.PaidDays
    ),
    gross: getNumber(item.Gross_Salary, item.Gross, item.gross),
    deductions: getNumber(
      item.Deducation,
      item.Total_Deduction,
      item.deductions
    ),
    net: getNumber(
      item.Final_Payment,
      item.Disb_Pay,
      item.NetPay,
      item.net
    ),
    mode: getText(
      item.PAYMENTMODE,
      item.PaymentMode,
      item.mode
    ),
    approval,
    issue: issue || undefined,
    raw: item,
  };
};

export default function SalaryDisbursementPage() {
  const user = useCurrentUser();
  const today = new Date();

  const [month, setMonth] = useState(String(today.getMonth() + 1));
  const [year, setYear] = useState(String(today.getFullYear()));

  const [employeeType, setEmployeeType] = useState("all");
  const [paymentMode, setPaymentMode] = useState("all");

  const [employeeCode, setEmployeeCode] = useState("all");
  const [cluster, setCluster] = useState("all");
  const [channel, setChannel] = useState("all");
  const [section, setSection] = useState("all");
  const [branch, setBranch] = useState("all");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedRows, setSelectedRows] = useState<(string | number)[]>([]);

  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const [paymentModeOptions, setPaymentModeOptions] = useState<Option[]>([
    { value: "all", label: "All modes" },
  ]);

  const [employeeOptions, setEmployeeOptions] = useState<Option[]>([
    { value: "all", label: "All employees" },
  ]);

  const [clusterOptions, setClusterOptions] = useState<Option[]>([
    { value: "all", label: "All clusters" },
  ]);

  const [channelOptions, setChannelOptions] = useState<Option[]>([
    { value: "all", label: "All channels" },
  ]);

  const [sectionOptions, setSectionOptions] = useState<Option[]>([
    { value: "all", label: "All sections" },
  ]);

  const [branchOptions, setBranchOptions] = useState<Option[]>([
    { value: "all", label: "All branches" },
  ]);

  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
    month: String(today.getMonth() + 1),
    year: String(today.getFullYear()),
    employeeType: "all",
    paymentMode: "all",
    employeeCode: "all",
    cluster: "all",
    channel: "all",
    section: "all",
    branch: "all",
  });

  const apiHeaders = useMemo(
    () => ({
      compcode: user?.Comp_Code,
      name: user?.name,
    }),
    [user?.Comp_Code, user?.name]
  );

  const handleInputChange = (name: string, value: any) => {
    const selectedValue = String(value ?? "all");

    switch (name) {
      case "month":
        setMonth(selectedValue);
        break;
      case "year":
        setYear(selectedValue);
        break;
      case "employeeType":
        setEmployeeType(selectedValue);
        break;
      case "paymentMode":
        setPaymentMode(selectedValue);
        break;
      case "employeeCode":
        setEmployeeCode(selectedValue);
        break;
      case "cluster":
        setCluster(selectedValue);
        break;
      case "channel":
        setChannel(selectedValue);
        break;
      case "section":
        setSection(selectedValue);
        break;
      case "branch":
        setBranch(selectedValue);
        break;
      default:
        break;
    }
  };

  // 1. Get payment modes
  const fetchPaymentModes = useCallback(async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/PaymentMode`,
        {},
        {
          headers: apiHeaders,
        }
      );

      const apiModes = response.data?.Branch || [];

      const options = mapOptions(
        apiModes,
        [
          "value",
          "Value",
          "PAYMENTMODE",
          "PaymentMode",
          "Mode",
          "Code",
          "id",
        ],
        [
          "label",
          "Label",
          "PAYMENTMODE",
          "PaymentMode",
          "Mode",
          "Name",
        ],
        "All modes"
      );

      setPaymentModeOptions(options);
    } catch (error) {
      console.error("Payment mode API error:", error);
    }
  }, [apiHeaders]);

  // 2. Get employee code options
  const fetchEmployees = useCallback(async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/all`,
        {},
        {
          headers: apiHeaders,
        }
      );

      const data = response.data?.data || [];

      const options = mapOptions(
        data,
        ["EMPCODE", "EmpCode", "EMP_CODE", "Code"],
        ["EmpName", "EMP_NAME", "EmployeeName", "name"],
        "All employees"
      );

      const employeeDropdownOptions = options.map((option) => {
        if (option.value === "all") return option;

        return {
          value: option.value,
          label: `${option.value} - ${option.label}`,
        };
      });

      setEmployeeOptions(employeeDropdownOptions);
    } catch (error) {
      console.error("Employee API error:", error);
    }
  }, [apiHeaders]);

  // 3. Get cluster, section and channel master data
  const fetchMasterData = useCallback(async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/MstData`,
        {
          branch: user?.branch,
        },
        {
          headers: apiHeaders,
        }
      );

      const result = response.data || {};

      setClusterOptions(
        mapOptions(
          result.Br_Location || [],
          [
            "value",
            "Value",
            "Br_Location",
            "br_location",
            "Cluster",
            "ClusterCode",
            "Code",
            "id",
          ],
          [
            "label",
            "Label",
            "Br_Location",
            "Cluster",
            "ClusterName",
            "Name",
          ],
          "All clusters"
        )
      );

      setChannelOptions(
        mapOptions(
          result.Channel || [],
          [
            "value",
            "Value",
            "Channel",
            "ChannelCode",
            "Code",
            "id",
          ],
          [
            "label",
            "Label",
            "Channel",
            "ChannelName",
            "Name",
          ],
          "All channels"
        )
      );

      setSectionOptions(
        mapOptions(
          result.Section || [],
          [
            "value",
            "Value",
            "Section",
            "SectionCode",
            "Code",
            "id",
          ],
          [
            "label",
            "Label",
            "Section",
            "SectionName",
            "Name",
          ],
          "All sections"
        )
      );
    } catch (error) {
      console.error("Master data API error:", error);
    }
  }, [apiHeaders, user?.branch]);

  // 4. Get branch options
  const fetchBranches = useCallback(async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/fuel/Masters`,
        {
          multi_loc: user?.branch,
        },
        {
          headers: apiHeaders,
        }
      );

      const branchData = response.data?.branch || [];

      setBranchOptions(
        mapOptions(
          branchData,
          [
            "value",
            "Value",
            "Loc_code",
            "Loc_Code",
            "BranchCode",
            "Branch_Code",
            "Code",
            "id",
            "UTD",
          ],
          [
            "label",
            "Label",
            "BranchName",
            "Branch_Name",
            "Loc_Name",
            "LocationName",
            "Name",
          ],
          "All branches"
        )
      );
    } catch (error) {
      console.error("Branch API error:", error);
    }
  }, [apiHeaders, user?.branch]);

  // 5. Fetch disbursement data
  const fetchDisbursementData = useCallback(
    async (filters: AppliedFilters) => {
      if (!filters.month) {
        Swal.fire("Required", "Please select month.", "warning");
        return;
      }

      if (!filters.year) {
        Swal.fire("Required", "Please select year.", "warning");
        return;
      }

      setLoading(true);

      try {
        const apiEmployeeType =
          filters.employeeType === "all"
            ? null
            : filters.employeeType === "On roll"
              ? "regular"
              : filters.employeeType === "Off roll"
                ? "casual"
                : filters.employeeType.toLowerCase();

        const payload = {
          month: String(filters.month).padStart(2, "0"),
          year: filters.year,

          EMPCODE:
            filters.employeeCode === "all"
              ? null
              : filters.employeeCode,

          EMPLOYEETYPE: apiEmployeeType,

          UPIPayment:
            filters.paymentMode === "all"
              ? null
              : filters.paymentMode,

          Loc_code:
            filters.branch === "all"
              ? user?.branch
              : filters.branch,

          Cluster:
            filters.cluster === "all"
              ? null
              : filters.cluster,

          Section:
            filters.section === "all"
              ? null
              : filters.section,

          Location: null,

          Channel:
            filters.channel === "all"
              ? null
              : filters.channel,
        };

        console.log("EmpDisburshmentData payload:", payload);

        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/employee/EmpDisburshmentData`,
          payload,
          {
            headers: apiHeaders,
          }
        );

        const result =
          response.data?.Result ||
          response.data?.data?.Result ||
          [];

        const mappedData = result.map(
          (item: any, index: number) => mapEmployeeData(item, index)
        );

        setEmployees(mappedData);
        setSelectedRows([]);
        setHasFetched(true);

        if (!mappedData.length) {
          Swal.fire({
            icon: "info",
            title: "No records found",
            text: "No employee disbursement records found for the selected filters.",
            timer: 2200,
            showConfirmButton: false,
          });
        }
      } catch (error: any) {
        console.error("EmpDisburshmentData API error:", error);

        Swal.fire({
          icon: "error",
          title: "Unable to fetch data",
          text: getApiError(error),
        });

        setEmployees([]);
        setHasFetched(true);
      } finally {
        setLoading(false);
      }
    },
    [apiHeaders, user?.branch]
  );

  // Initial master API calls
  useEffect(() => {
    if (!user?.Comp_Code || !user?.branch) return;

    fetchPaymentModes();
    fetchEmployees();
    fetchMasterData();
    fetchBranches();
  }, [
    user?.Comp_Code,
    user?.branch,
    fetchPaymentModes,
    fetchEmployees,
    fetchMasterData,
    fetchBranches,
  ]);

  // Show button
  const showData = () => {
    const filters: AppliedFilters = {
      month,
      year,
      employeeType,
      paymentMode,
      employeeCode,
      cluster,
      channel,
      section,
      branch,
    };

    setAppliedFilters(filters);
    setActiveTab("all");
    setSelectedRows([]);

    fetchDisbursementData(filters);
  };

  // Reset button
  const resetFilters = () => {
    const resetMonth = String(today.getMonth() + 1);
    const resetYear = String(today.getFullYear());

    setMonth(resetMonth);
    setYear(resetYear);
    setEmployeeType("all");
    setPaymentMode("all");
    setEmployeeCode("all");
    setCluster("all");
    setChannel("all");
    setSection("all");
    setBranch("all");

    const filters: AppliedFilters = {
      month: resetMonth,
      year: resetYear,
      employeeType: "all",
      paymentMode: "all",
      employeeCode: "all",
      cluster: "all",
      channel: "all",
      section: "all",
      branch: "all",
    };

    setAppliedFilters(filters);
    setActiveTab("all");
    setSelectedRows([]);

    setEmployees([]);
    setHasFetched(false);
  };

  const selectedMonth =
    MONTHS.find((item) => item.value === appliedFilters.month)?.label ||
    appliedFilters.month;

  // Local filters and tabs
  const filteredRows = useMemo(() => {
    return employees.filter((employee) => {
      const matchesEmployee =
        appliedFilters.employeeCode === "all" ||
        employee.code === appliedFilters.employeeCode;

      const matchesType =
        appliedFilters.employeeType === "all" ||
        employee.employeeType.toLowerCase() ===
          appliedFilters.employeeType.toLowerCase() ||
        (appliedFilters.employeeType === "On roll" &&
          employee.employeeType.toLowerCase() === "regular") ||
        (appliedFilters.employeeType === "Off roll" &&
          employee.employeeType.toLowerCase() === "casual");

      const matchesMode =
        appliedFilters.paymentMode === "all" ||
        employee.mode.toLowerCase() ===
          appliedFilters.paymentMode.toLowerCase();

      const matchesTab =
        activeTab === "all" ||
        (activeTab === "flagged" &&
          employee.approval === "Needs review") ||
        (activeTab === "approved" &&
          employee.approval === "Approved") ||
        (activeTab === "cash" &&
          employee.mode.toLowerCase() === "cash");

      return (
        matchesEmployee &&
        matchesType &&
        matchesMode &&
        matchesTab
      );
    });
  }, [employees, appliedFilters, activeTab]);

  // Summary calculations
  const totalGross = filteredRows.reduce(
    (sum, row) => sum + row.gross,
    0
  );

  const totalDeductions = filteredRows.reduce(
    (sum, row) => sum + row.deductions,
    0
  );

  const totalNet = filteredRows.reduce(
    (sum, row) => sum + row.net,
    0
  );

  const flaggedCount = employees.filter(
    (row) => row.approval === "Needs review"
  ).length;

  const approvedCount = employees.filter(
    (row) => row.approval === "Approved"
  ).length;

  const selectedNet = filteredRows
    .filter((row) => selectedRows.includes(row.id))
    .reduce((sum, row) => sum + row.net, 0);

  const visibleIds = filteredRows.map((row) => row.id);

  const allVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedRows.includes(id));

  // Select all
  const handleSelectAll = (checked: boolean) => {
    setSelectedRows((previous) =>
      checked
        ? Array.from(new Set([...previous, ...visibleIds]))
        : previous.filter((id) => !visibleIds.includes(id))
    );
  };

  // Select individual row
  const handleSelectRow = (
    id: string | number,
    checked: boolean
  ) => {
    setSelectedRows((previous) =>
      checked
        ? previous.includes(id)
          ? previous
          : [...previous, id]
        : previous.filter((item) => item !== id)
    );
  };

  // 6. HR Approval API
  const handleApproval = async () => {
    if (!selectedRows.length) {
      Swal.fire(
        "Select employees",
        "Please select employees to approve.",
        "info"
      );
      return;
    }

    const selectedEmployees = employees.filter((row) =>
      selectedRows.includes(row.id)
    );

    const blocked = selectedEmployees.filter(
      (row) => row.approval === "Needs review"
    );

    if (blocked.length) {
      Swal.fire({
        icon: "warning",
        title: "Some rows need review",
        text: `${blocked.length} selected employee(s) have exceptions. Resolve these issues before approval.`,
      });
      return;
    }

    const result = await Swal.fire({
      title: "Update HR approval?",
      text: `Approve ${selectedRows.length} selected employee(s)?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Approve selected",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#5145e9",
    });

    if (!result.isConfirmed) return;

    setLoading(true);

    try {
      const transactionIds = selectedEmployees.map((item) => {
        const raw = item.raw;

        return (
          raw.id ??
          raw.UTD ??
          raw.utd ??
          raw.Tran_id ??
          raw.tran_id ??
          raw.SRNO ??
          raw.srno
        );
      });

      if (
        transactionIds.some(
          (id) => id === undefined || id === null || id === ""
        )
      ) {
        throw new Error(
          "Transaction ID is missing for one or more selected employees."
        );
      }

      const payload = {
        tran_id: transactionIds,
        Month: String(appliedFilters.month).padStart(2, "0"),
        year: appliedFilters.year,
      };

      console.log("UpdateDisbushment payload:", payload);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/UpdateDisbushment`,
        payload,
        {
          headers: apiHeaders,
        }
      );

      const success =
        response.data?.status === true ||
        response.data?.status === "true" ||
        response.data?.success === true;

      if (!success) {
        throw new Error(
          response.data?.Message ||
            response.data?.message ||
            "HR approval could not be updated."
        );
      }

      setSelectedRows([]);

      await Swal.fire({
        icon: "success",
        title: "Approved",
        text: "Selected employees have been approved successfully.",
        timer: 1800,
        showConfirmButton: false,
      });

      await fetchDisbursementData(appliedFilters);
    } catch (error: any) {
      console.error("UpdateDisbushment API error:", error);

      Swal.fire({
        icon: "error",
        title: "Approval failed",
        text: getApiError(error),
      });
    } finally {
      setLoading(false);
    }
  };

  // Hold API is not present in the supplied backend reference
  const handleHold = async () => {
    if (!selectedRows.length) {
      Swal.fire(
        "Select employees",
        "Please select at least one employee.",
        "info"
      );
      return;
    }

    Swal.fire({
      icon: "info",
      title: "Hold API not configured",
      text: "The provided backend reference does not include a Hold API. No database changes have been made.",
    });
  };

  // Existing columns
  const columns = useMemo(
    () => [
      {
        Header: "EMPLOYEE ↑",
        accessor: "name",
        width: 250,
        Cell: ({ row }: any) => {
          const item = row.original as Employee;

          return (
            <div className="min-w-[180px] py-1">
              <div className="whitespace-nowrap text-[12px] font-semibold text-[#152b4b] dark:text-slate-100">
                {item.name}
              </div>
              <div className="mt-0.5 whitespace-nowrap text-[10px] text-[#64748b] dark:text-slate-400">
                {item.designation} · {item.code} · {item.employeeType}
              </div>
            </div>
          );
        },
      },
      {
        Header: "BRANCH",
        accessor: "branch",
        width: 170,
        Cell: ({ value }: any) => (
          <span className="whitespace-nowrap text-[11px] text-[#64748b] dark:text-slate-300">
            {value}
          </span>
        ),
      },
      {
        Header: "MONTH DAYS",
        accessor: "monthDays",
        width: 110,
        Cell: ({ value }: any) => (
          <span className="block text-center text-[11px] text-[#52627c] dark:text-slate-300">
            {value}
          </span>
        ),
      },
      {
        Header: "PAID DAYS",
        accessor: "paidDays",
        width: 105,
        Cell: ({ value }: any) => (
          <span className="block text-center text-[11px] font-semibold text-[#152b4b] dark:text-slate-100">
            {value}
          </span>
        ),
      },
      {
        Header: "GROSS",
        accessor: "gross",
        width: 120,
        Cell: ({ value }: any) => (
          <span className="block whitespace-nowrap text-right text-[11px] font-semibold text-[#152b4b] dark:text-slate-100">
            {money(value)}
          </span>
        ),
      },
      {
        Header: "DEDUCTIONS",
        accessor: "deductions",
        width: 130,
        Cell: ({ value }: any) => (
          <span className="block whitespace-nowrap text-right text-[11px] font-medium text-rose-500 dark:text-rose-400">
            -{money(value)}
          </span>
        ),
      },
      {
        Header: "NET PAYABLE",
        accessor: "net",
        width: 130,
        Cell: ({ value }: any) => (
          <span className="block whitespace-nowrap text-right text-[11px] font-bold text-[#152b4b] dark:text-slate-100">
            {money(value)}
          </span>
        ),
      },
      {
        Header: "MODE",
        accessor: "mode",
        width: 150,
        Cell: ({ value }: any) => (
          <div className="flex items-center gap-1.5 whitespace-nowrap text-[10px] text-[#64748b] dark:text-slate-300">
            {value === "Cash" ? (
              <Wallet size={13} />
            ) : value === "UPI" ? (
              <Banknote size={13} />
            ) : value === "Cheque" ? (
              <Wallet size={13} />
            ) : (
              <Building2 size={13} />
            )}
            {value}
          </div>
        ),
      },
      {
        Header: "HR APPROVAL",
        accessor: "approval",
        width: 180,
        Cell: ({ row }: any) => {
          const item = row.original as Employee;

          const statusClass =
            item.approval === "Approved"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
              : item.approval === "Needs review"
                ? "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
                : item.approval === "On hold"
                  ? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  : "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400";

          return (
            <div className="min-w-[145px] py-1">
              <span
                className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-semibold ${statusClass}`}
              >
                {item.approval}
              </span>

              {item.issue && (
                <div className="mt-1 max-w-[180px] text-[9px] leading-4 text-rose-500 dark:text-rose-400">
                  {item.issue}
                </div>
              )}
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="min-h-screen min-w-0 bg-[#f5f8fc] p-2.5 transition-colors dark:bg-[#0b1220] sm:p-4">
      <HashloaderComponent isLoading={loading} />

      <div className="mx-auto min-w-0 max-w-[1900px] space-y-2.5">
        {/* HEADER */}
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[#152b4b] dark:text-slate-100">
            Salary disbursement
          </h1>
          <p className="mt-1 text-[11px] text-[#64748b] dark:text-slate-400">
            The calculated month, employee by employee. Give HR approval to
            the rows that are clean — flagged rows stay out until their
            exception is fixed.
          </p>
        </div>

        {/* FILTER PANEL */}
        <div className="min-w-0 rounded-xl border border-[#dce5f1] bg-white p-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-colors dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_2px_8px_rgba(0,0,0,0.20)] sm:p-4 lg:p-6">
          <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[105px_100px_minmax(145px,1fr)_minmax(145px,1fr)_minmax(170px,1.2fr)_minmax(145px,1fr)_minmax(145px,1fr)_minmax(145px,1fr)_minmax(145px,1fr)_auto_auto] 2xl:items-end">
            <Eselect
              title="MONTH"
              redlabel="*"
              name="month"
              option={MONTHS}
              initialValue={month}
              handleInputChange={handleInputChange}
              className="h-[32px] w-full"
            />

            <Eselect
              title="YEAR"
              redlabel="*"
              name="year"
              option={YEARS}
              initialValue={year}
              handleInputChange={handleInputChange}
              className="h-[32px] w-full"
            />

            <Eselect
              title="EMPLOYEE TYPE"
              name="employeeType"
              option={EMPLOYEE_TYPES}
              initialValue={employeeType}
              handleInputChange={handleInputChange}
              className="h-[32px] w-full"
            />

            <Eselect
              title="PAYMENT MODE"
              name="paymentMode"
              option={paymentModeOptions}
              initialValue={paymentMode}
              handleInputChange={handleInputChange}
              className="h-[32px] w-full"
            />

            <Eselect
              title="EMPLOYEE CODE"
              name="employeeCode"
              option={employeeOptions}
              initialValue={employeeCode}
              handleInputChange={handleInputChange}
              className="h-[32px] w-full"
            />

            <Eselect
              title="CLUSTER"
              name="cluster"
              option={clusterOptions}
              initialValue={cluster}
              handleInputChange={handleInputChange}
              className="h-[32px] w-full"
            />

            <Eselect
              title="CHANNEL"
              name="channel"
              option={channelOptions}
              initialValue={channel}
              handleInputChange={handleInputChange}
              className="h-[32px] w-full"
            />

            <Eselect
              title="SECTION"
              name="section"
              option={sectionOptions}
              initialValue={section}
              handleInputChange={handleInputChange}
              className="h-[32px] w-full"
            />

            <Eselect
              title="BRANCH"
              name="branch"
              option={branchOptions}
              initialValue={branch}
              handleInputChange={handleInputChange}
              className="h-[32px] w-full"
            />

            <AButton
              type="button"
              onClick={showData}
              disabled={loading}
              className="inline-flex h-[32px] items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#5145e9] px-4 text-[11px] font-semibold text-white hover:bg-[#4035d5] disabled:opacity-50"
            >
              <Search size={13} />
              Show
            </AButton>

            <AButton
              type="button"
              onClick={resetFilters}
              disabled={loading}
              className="inline-flex h-[32px] items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#dce5f1] bg-white px-3 text-[11px] font-medium text-[#475569] hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <RotateCcw size={12} />
              Reset
            </AButton>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 2xl:grid-cols-5">
          <SummaryCard
            dot="#5145e9"
            label="Employees"
            value={String(filteredRows.length)}
            subtitle={`${selectedMonth} ${appliedFilters.year}`}
          />

          <SummaryCard
            dot="#0ea5e9"
            label="Gross payable"
            value={formatCompactMoney(totalGross)}
            subtitle="After paid-days proration"
          />

          <SummaryCard
            dot="#e11d48"
            label="Deductions"
            value={formatCompactMoney(totalDeductions)}
            subtitle="Statutory and recoveries"
          />

          <SummaryCard
            dot="#10b981"
            label="Net payable"
            value={formatCompactMoney(totalNet)}
            subtitle="What leaves the account"
          />

          <SummaryCard
            dot="#f59e0b"
            label="Needs review"
            value={String(flaggedCount)}
            subtitle="Blocked from approval"
          />
        </div>

        {/* TABLE CONTAINER */}
        <div className="min-w-0 overflow-hidden rounded-xl border border-[#dce5f1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-colors dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_2px_8px_rgba(0,0,0,0.20)]">
          {/* TABLE TOOLBAR */}
          <div className="flex min-w-0 flex-col gap-2 border-b border-[#dce5f1] px-3 py-2.5 dark:border-slate-700 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-[#5145e9]"
              />

              <span className="text-[11px] font-semibold text-[#152b4b] dark:text-slate-100">
                {filteredRows.length} employees
              </span>

              <span className="text-[10px] text-[#64748b] dark:text-slate-400">
                Flagged rows cannot be approved until fixed
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", label: "All" },
                { id: "flagged", label: "Flagged" },
                { id: "approved", label: "Approved" },
                { id: "cash", label: "Cash payouts" },
              ].map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSelectedRows([]);
                  }}
                  className={`h-[25px] whitespace-nowrap rounded-lg border px-2.5 text-[9px] font-medium transition ${
                    activeTab === tab.id
                      ? "border-[#5145e9] bg-[#f5f4ff] text-[#5145e9] dark:border-indigo-400 dark:bg-indigo-500/15 dark:text-indigo-300"
                      : "border-[#dce5f1] bg-white text-[#52627c] hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* RESPONSIVE TABLE */}
          <div className="w-full min-w-0 overflow-x-auto dark:bg-slate-900">
            <div className="min-w-[1120px]">
              <DataTable
                columns={[
                  {
                    Header: "",
                    accessor: "_select",
                    width: 42,
                    Cell: ({ row }: any) => {
                      const item = row.original as Employee;

                      return (
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(item.id)}
                            onChange={(e) =>
                              handleSelectRow(item.id, e.target.checked)
                            }
                            className="h-4 w-4 cursor-pointer rounded accent-[#5145e9]"
                          />
                        </div>
                      );
                    },
                  },
                  ...columns,
                ]}
                data={filteredRows}
                showTopSearch={false}
                showExcelExport={false}
                initialPageSize={10}
              />
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex min-w-0 flex-col gap-3 border-t border-[#dce5f1] bg-[#f8fafc] px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[10px] text-[#64748b] dark:text-slate-400">
              {hasFetched
                ? `Showing ${filteredRows.length} items`
                : "Select filters and click Show"}{" "}
              · {approvedCount} approved so far
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <div className="mr-1 flex items-center gap-2 text-[10px] text-[#64748b] dark:text-slate-400">
                Selected net
                <span className="font-bold text-[#152b4b] dark:text-slate-100">
                  {selectedRows.length ? money(selectedNet) : "—"}
                </span>
              </div>

              <AButton
                type="button"
                onClick={handleHold}
                disabled={!selectedRows.length || loading}
                className="inline-flex h-[32px] items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#dce5f1] bg-white px-3 text-[10px] font-semibold text-[#52627c] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                <Pause size={12} />
                Hold
              </AButton>

              <AButton
                type="button"
                onClick={handleApproval}
                disabled={!selectedRows.length || loading}
                className="inline-flex h-[32px] items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#64748b] px-3 text-[10px] font-semibold text-white hover:bg-[#475569] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check size={13} />
                Update HR approval
              </AButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// SUMMARY CARD
function SummaryCard({
  dot,
  label,
  value,
  subtitle,
}: {
  dot: string;
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#dce5f1] bg-white px-3.5 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-colors dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_2px_8px_rgba(0,0,0,0.20)]">
      <div className="flex items-center gap-2">
        <span
          className="h-[7px] w-[7px] shrink-0 rounded-full"
          style={{ backgroundColor: dot }}
        />
        <span className="text-[10px] font-medium text-[#52627c] dark:text-slate-300">
          {label}
        </span>
      </div>

      <div className="mt-1.5 truncate text-[21px] font-bold leading-none text-[#10213b] dark:text-slate-100">
        {value}
      </div>

      <div className="mt-1 truncate text-[9px] text-[#64748b] dark:text-slate-400">
        {subtitle}
      </div>
    </div>
  );
}
