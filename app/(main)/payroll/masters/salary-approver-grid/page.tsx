"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Clock,
  IndianRupee,
  TrendingUp,
  UserCheck,
  ListChecks,
  History,
  X,
  Check,
  Download,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useToast } from "@/app/hooks/useToast";
import useExcelDownload from "@/app/hooks/excel-download";
import HashloaderComponent from "@/components/Templates/hashloader";
import ServiceTablePagination from "@/components/Templates/reacttable";
import SelectSearch from "@/components/atoms/Select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

const formatDate = (dateString: any) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return String(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatCurrency = (val: any) => {
  if (val === null || val === undefined || val === "") return "₹0";
  const num = Number(val);
  if (isNaN(num)) return "₹" + val;
  return "₹" + num.toLocaleString("en-IN");
};

export default function SalaryApproverGridPage() {
  const user = useCurrentUser();
  const { showToast } = useToast();
  const { handleExcelDownload, isLoading: isExcelLoading } = useExcelDownload();

  const [isLoading, setIsLoading] = useState(false);
  const [tabledata, setTabledata] = useState<any[]>([]);
  const [filtereddata, setFiltereddata] = useState<any[]>([]);
  const [branch, setBranch] = useState<any[]>([]);
  const [apprData, setApprData] = useState<any[]>([]);
  const [SalaryData, setSalaryData] = useState<any[]>([]);

  // Selection & Remark
  const [selectedrowdata, setsellectedrowdata] = useState<any[]>([]);
  const [remark, setRemark] = useState("");

  // Modals
  const [isDialogOpen1, setIsDialogOpen1] = useState(false); // History Modal
  const [isDialogOpen2, setIsDialogOpen2] = useState(false); // Details/Edit Modal
  const [isModalVisible1, setIsModalVisible1] = useState(false); // Approver List Modal

  const [empcode, setempcode] = useState("");
  const [Tran_id, setTran_id] = useState<any>(null);
  const [approvedSalary, setApprovedSalary] = useState<any>("");
  const [proposedSalaryInput, setProposedSalaryInput] = useState<any>(0);

  const [dates, setDates] = useState({
    DATE_FROM: getCurrentDate(1),
    DATE_TO: getCurrentDate(0),
    branch: user?.branch || "",
    status: 2, // 2: Pending, 1: Approved, 0: Reject
  });

  const [formData1, setFormData1] = useState<any>({
    Salary_Type: null,
    Proposed_Salary: null,
    Effective_date: null,
    Basic: null,
    HRA: null,
    Conveyance: null,
    Medical: null,
    Other: null,
    Washing: null,
    Uniform: null,
    BONUS_AMOUNT: null,
    PFSALARY_LIMIT: null,
    LWF: null,
    Gross_Salary: null,
    ANNUAL_CTC: null,
    CTC: null,
  });

  const StatusOptions = [
    { value: 2, label: "Pending" },
    { value: 1, label: "Approved" },
    { value: 0, label: "Reject" },
  ];

  const SLTY = [
    { value: "0", label: "NEW JOINING" },
    { value: "1", label: "INCREMENT" },
  ];

  // Fetch branches
  const fetchBranches = async () => {
    if (!user?.Comp_Code) return; // ✅ compcode aane tak call mat karo

    setIsLoading(true);
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/payout/payout`,
        {
          dateFrom: dates.DATE_FROM,
          dateto: dates.DATE_TO,
          multi_loc: user?.branch,
        },
        {
          headers: {
            compcode: user.Comp_Code,  // ✅ ensure defined
            name: user?.name,
            token: user?.email,
          },
        }
      );
      setBranch(result.data?.branch || []);
    } catch (err) {
      console.error("Error fetching branches:", err);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    if (!user?.Comp_Code) return;
    fetchBranches();
    showDataOFAPPRVL();
  }, [user?.Comp_Code, dates.DATE_FROM, dates.DATE_TO]);

  // Fetch Approvers list
  const showDataOFAPPRVL = async () => {
    if (!user?.Comp_Code || !user?.EMPCODE) return; // ✅

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/GetApprList`,
        {
          params: {
            Empcode: user.EMPCODE,
            module: "EmpSalary",
          },
          headers: {
            compcode: user.Comp_Code, // ✅
          },
        }
      );
      setApprData(response.data?.Result || []);
    } catch (error) {
      console.error("Error fetching approver list:", error);
    }
  };

  function filterByStatus(data: any[], st: any) {
    if (st === 2 || st === "2") {
      return data.filter((item) => item.status_khud_ka == null || item.status_khud_ka == 2);
    }
    return data.filter((item) => item.status_khud_ka == st);
  }

  // Fetch grid data
  const showdata = async () => {
    if (!dates.branch) {
      showToast("Please Select Branch", "warning");
      return;
    }
    if (dates.status === "" || dates.status === undefined) {
      showToast("Please Select Status", "warning");
      return;
    }

    setIsLoading(true);
    setFiltereddata([]);
    setTabledata([]);
    setsellectedrowdata([]);

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmpMaster/SalaryApproverView`,
        {
          username: user?.name,
          loc_code: dates?.branch,
          status: dates.status,
          Appr_Code: user?.EMPCODE,
          DateFrom: dates.DATE_FROM,
          DateTo: dates.DATE_TO,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      const resList = result.data?.Result || [];
      setTabledata(resList);
      setFiltereddata(filterByStatus(resList, dates.status));
    } catch (err) {
      console.error("Error fetching approver view data:", err);
      showToast("Failed to fetch salary records", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    showDataOFAPPRVL();
  }, []);

  useEffect(() => {
    fetchBranches();
    showdata();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dates.status]);

  const handleDateChange = (name: string, value: any) => {
    if (name === "status") {
      setFiltereddata(filterByStatus(tabledata, value));
      setsellectedrowdata([]);
    }
    setDates((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // KPI Calculations (Pending, Approved, Rejected)
  const stats = useMemo(() => {
    const dataToUse = tabledata.length > 0 ? tabledata : filtereddata;
    const pendingList = dataToUse.filter(
      (x) => x.status_khud_ka == null || x.status_khud_ka == 2 || x.status_khud_ka === "2"
    );
    const approvedList = dataToUse.filter(
      (x) => x.status_khud_ka == 1 || x.status_khud_ka === "1"
    );
    const rejectedList = dataToUse.filter(
      (x) => x.status_khud_ka == 0 || x.status_khud_ka === "0"
    );

    return {
      pendingApprovals: pendingList.length,
      approvedCount: approvedList.length,
      rejectedCount: rejectedList.length,
    };
  }, [tabledata, filtereddata]);

  // See History
  const OutServiceView = async (Emp_Code: string) => {
    if (!Emp_Code) return;
    setIsLoading(true);
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmpMaster/SalaryStrReport`,
        { EmpCode: Emp_Code },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );
      const sortedData = (result.data?.Result || []).sort(
        (a: any, b: any) =>
          new Date(a.Effective_date).getTime() - new Date(b.Effective_date).getTime()
      );
      setSalaryData(sortedData);
      setIsDialogOpen1(true);
    } catch (error) {
      console.error("Error fetching salary history:", error);
      showToast("Could not load salary history", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Double click to view/edit salary details
  const doubleclicked = (row: any) => {
    setempcode(row.Emp_Code);
    setTran_id(row.Tran_id);

    const gross = Number(row.Gross_Salary) || 0;
    const annualGross = gross * 12;
    const ctc =
      annualGross +
      Number(row.BONUS_AMOUNT || 0) +
      Number(row.LWF || 0) +
      Number(row.PFSALARY_LIMIT || 0);

    setFormData1({
      ...row,
      Salary_Type: row?.Salary_Type?.toString() ?? "0",
      Effective_date: row?.Effective_date?.split("T")[0] ?? "",
      Basic: Number(row.Basic) || 0,
      HRA: Number(row.HRA) || 0,
      Conveyance: Number(row.Conveyance) || 0,
      Medical: Number(row.Medical) || 0,
      Other: Number(row.Other) || 0,
      Washing: Number(row.Washing) || 0,
      Uniform: Number(row.Uniform) || 0,
      Gross_Salary: gross,
      ANNUAL_CTC: annualGross,
      BONUS_AMOUNT: Number(row.BONUS_AMOUNT) || 0,
      PFSALARY_LIMIT: Number(row.PFSALARY_LIMIT) || 0,
      LWF: Number(row.LWF) || 0,
      CTC: ctc,
    });

    if (row.Salary_Type == 0) {
      setApprovedSalary(row?.Approver_Salary ?? row?.Gross_Salary ?? 0);
      setProposedSalaryInput(row?.Basic ?? 0);
    } else {
      setApprovedSalary(row?.Approver_Salary ?? row?.Proposed_Salary ?? 0);
      setProposedSalaryInput(row?.Proposed_Salary ?? 0);
    }

    setIsDialogOpen2(true);
  };

  // Approve Action
  const approver = async () => {
    if (selectedrowdata.length === 0) {
      showToast("Please select at least one record to approve", "warning");
      return;
    }

    const compCodeVal = user?.Comp_Code || (user as any)?.compcode || (user as any)?.comp_code || (user as any)?.DB || "";
    if (!compCodeVal) {
      showToast("Company code missing. Please re-login.", "error");
      return;
    }

    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Are you sure?",
      text: "This action is irreversible and cannot be undone. Do you want to approve the selected records?",
      confirmButtonText: "Yes, Approve",
      confirmButtonColor: "#059669",
      cancelButtonText: "Cancel",
      showCancelButton: true,
    });

    if (!confirmed.isConfirmed) return;

    setIsLoading(true);
    const tran_ids = selectedrowdata.map((item) => ({
      id: item.id ?? item.Tran_id,
      rowData: item.rowData ?? item,
    }));

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmpMaster/approveby2`,
        {
          tran_id: tran_ids,
          Tran_id: tran_ids,
          Appr_Code: user?.EMPCODE,
          Remark: remark || null,
        },
        {
          headers: {
            compcode: compCodeVal,
            Comp_Code: compCodeVal,
            comp_code: compCodeVal,
            name: user?.name,
            token: user?.email,
          },
        }
      );

      if (result.data?.status || result.data?.Status || result.status === 200) {
        await Swal.fire({
          icon: "success",
          title: "Approved Successfully",
          text: result.data?.Message || result.data?.message || "Selected records approved successfully.",
          confirmButtonColor: "#059669",
        });
      }

      setsellectedrowdata([]);
      setRemark("");
      await showdata();
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Approval Failed",
        text: err?.response?.data?.Message || err?.response?.data?.message || "Something went wrong while approving.",
      });
      setsellectedrowdata([]);
      setRemark("");
    } finally {
      setIsLoading(false);
    }
  };

  // Reject Action
  const reject = async () => {
    if (selectedrowdata.length === 0) {
      showToast("Please select at least one record to reject", "warning");
      return;
    }

    const compCodeVal = user?.Comp_Code || (user as any)?.compcode || (user as any)?.comp_code || (user as any)?.DB || "";
    if (!compCodeVal) {
      showToast("Company code missing. Please re-login.", "error");
      return;
    }

    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Are you sure?",
      text: "This action is irreversible and cannot be undone. Do you want to reject the selected records?",
      confirmButtonText: "Yes, Reject",
      confirmButtonColor: "#dc2626",
      cancelButtonText: "Cancel",
      showCancelButton: true,
    });

    if (!confirmed.isConfirmed) return;

    setIsLoading(true);
    const tran_ids = selectedrowdata.map((item) => ({
      id: item.id ?? item.Tran_id,
      rowData: item.rowData ?? item,
    }));

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmpMaster/rejectby2`,
        {
          tran_id: tran_ids,
          Tran_id: tran_ids,
          Appr_Code: user?.EMPCODE,
          Remark: remark || null,
          compcode: compCodeVal,
          Comp_Code: compCodeVal,
          comp_code: compCodeVal,
        },
        {
          headers: {
            compcode: compCodeVal,
            Comp_Code: compCodeVal,
            comp_code: compCodeVal,
            name: user?.name,
            token: user?.email,
          },
        }
      );

      if (result.data?.status || result.data?.Status || result.status === 200) {
        await Swal.fire({
          icon: "success",
          title: "Rejected Successfully",
          text: result.data?.Message || result.data?.message || "Selected records rejected successfully.",
          confirmButtonColor: "#059669",
        });
      }

      setsellectedrowdata([]);
      setRemark("");
      await showdata();
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Rejection Failed",
        text: err?.response?.data?.Message || err?.response?.data?.message || "Something went wrong while rejecting.",
      });
      setsellectedrowdata([]);
      setRemark("");
    } finally {
      setIsLoading(false);
    }
  };

  // Single Row Approve Action
  const handleSingleApprove = async (row: any) => {
    const compCodeVal = user?.Comp_Code || (user as any)?.compcode || (user as any)?.comp_code || (user as any)?.DB || "";
    if (!compCodeVal) {
      showToast("Company code missing. Please re-login.", "error");
      return;
    }

    const tran_id = [
      {
        id: row?.Tran_id ?? row?.id,
        rowData: row,
      },
    ];
    const name = row?.NewEmpName || row?.EMPLOYEENAME || "this employee";

    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Approve Salary Revision?",
      text: `Are you sure you want to approve proposed salary revision for ${name}?`,
      confirmButtonText: "Yes, Approve",
      confirmButtonColor: "#059669",
      cancelButtonText: "Cancel",
      showCancelButton: true,
    });

    if (!confirmed.isConfirmed) return;

    setIsLoading(true);
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmpMaster/approveby2`,
        {
          tran_id: tran_id,
          Tran_id: tran_id,
          Appr_Code: user?.EMPCODE,
          Remark: remark || null,
          compcode: compCodeVal,
          Comp_Code: compCodeVal,
          comp_code: compCodeVal,
        },
        {
          headers: {
            compcode: compCodeVal,
            Comp_Code: compCodeVal,
            comp_code: compCodeVal,
            name: user?.name,
            token: user?.email,
          },
        }
      );

      if (result.data?.status || result.data?.Status || result.status === 200) {
        await Swal.fire({
          icon: "success",
          title: "Approved Successfully",
          text: result.data?.Message || result.data?.message || "Salary revision approved successfully.",
          confirmButtonColor: "#059669",
        });
      }
      await showdata();
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Approval Failed",
        text: err?.response?.data?.Message || err?.response?.data?.message || "Something went wrong while approving.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Single Row Reject Action
  const handleSingleReject = async (row: any) => {
    const compCodeVal = user?.Comp_Code || (user as any)?.compcode || (user as any)?.comp_code || (user as any)?.DB || "";
    if (!compCodeVal) {
      showToast("Company code missing. Please re-login.", "error");
      return;
    }

    const tran_id = [
      {
        id: row?.Tran_id ?? row?.id,
        rowData: row,
      },
    ];
    const name = row?.NewEmpName || row?.EMPLOYEENAME || "this employee";

    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Reject Salary Revision?",
      text: `Are you sure you want to reject proposed salary revision for ${name}?`,
      confirmButtonText: "Yes, Reject",
      confirmButtonColor: "#dc2626",
      cancelButtonText: "Cancel",
      showCancelButton: true,
    });

    if (!confirmed.isConfirmed) return;

    setIsLoading(true);
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmpMaster/rejectby2`,
        {
          tran_id: tran_id,
          Tran_id: tran_id,
          Appr_Code: user?.EMPCODE,
          Remark: remark || null,
          compcode: compCodeVal,
          Comp_Code: compCodeVal,
          comp_code: compCodeVal,
        },
        {
          headers: {
            compcode: compCodeVal,
            Comp_Code: compCodeVal,
            comp_code: compCodeVal,
            name: user?.name,
            token: user?.email,
          },
        }
      );

      if (result.data?.status || result.data?.Status || result.status === 200) {
        await Swal.fire({
          icon: "success",
          title: "Rejected Successfully",
          text: result.data?.Message || result.data?.message || "Salary revision rejected successfully.",
          confirmButtonColor: "#059669",
        });
      }
      await showdata();
    } catch (err: any) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Rejection Failed",
        text: err?.response?.data?.Message || "Something went wrong while rejecting.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isPending = dates.status == 2 || dates.status === "2";

  // Table Columns configured for ReactTable
  const columns = useMemo(
    () => [
      {
        Header: "S. No.",
        id: "sno",
        Cell: ({ row }: any) => (
          <span className="text-[14px] font-normal text-slate-500 dark:text-slate-400">
            {row.index + 1}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: "NewEmpName",
        Cell: ({ row }: any) => {
          const name = row.original?.NewEmpName || row.original?.EMPLOYEENAME || "—";
          const code = row.original?.Emp_Code || "—";
          return (
            <div>
              <div className="font-bold text-[14px] text-slate-900 dark:text-slate-100">
                {name}
              </div>
              <div className="text-[12px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                {code}
              </div>
            </div>
          );
        },
      },
      {
        Header: "SALARY TYPE",
        accessor: "NewSalary_Type",
        Cell: ({ row }: any) => (
          <span className="text-[14px] font-normal text-slate-600 dark:text-slate-300">
            {row.original?.NewSalary_Type ||
              (row.original?.Salary_Type == 1 ? "Increment" : "Monthly")}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE DESIGNATION",
        accessor: "EMPLOYEEDESIGNATION",
        Cell: ({ value }: any) => (
          <span className="text-[14px] font-normal text-slate-600 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "LOCATION",
        accessor: "Location_Lable",
        Cell: ({ row }: any) => (
          <span className="text-[14px] font-normal text-slate-500 dark:text-slate-400">
            {row.original?.Location_Lable ||
              row.original?.branch_name ||
              row.original?.branch ||
              "—"}
          </span>
        ),
      },
      {
        Header: "CURRENT SALARY",
        accessor: "Gross_Salary",
        Cell: ({ row }: any) => {
          const currentSalary = Number(row.original?.Gross_Salary || row.original?.Basic || 0);
          return (
            <span className="text-[14px] font-normal text-slate-600 dark:text-slate-300">
              {formatCurrency(currentSalary)}
            </span>
          );
        },
      },
      {
        Header: "PROPOSED SALARY",
        accessor: "Proposed_Salary",
        Cell: ({ row }: any) => {
          const currentSalary = Number(row.original?.Gross_Salary || row.original?.Basic || 0);
          const proposedSalary = Number(row.original?.Proposed_Salary || row.original?.Gross_Salary || 0);
          const diff = proposedSalary - currentSalary;
          const diffPercent =
            currentSalary > 0 ? Math.round((diff / currentSalary) * 100) : 0;

          return (
            <div>
              <div className="font-bold text-[14px] text-slate-900 dark:text-white">
                {formatCurrency(proposedSalary)}
              </div>
              {diff !== 0 && (
                <div
                  className={`text-[12px] font-semibold mt-0.5 ${
                    diff > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-500"
                  }`}
                >
                  {diff > 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)} (
                  {diffPercent}%)
                </div>
              )}
            </div>
          );
        },
      },
      {
        Header: "EFFECTIVE DATE",
        accessor: "NewEffective_Date",
        Cell: ({ row }: any) => {
          const rawDate = row.original?.NewEffective_Date || row.original?.Effective_date;
          const effDateObj = rawDate ? new Date(rawDate) : null;
          const isFutureDate =
            effDateObj &&
            !isNaN(effDateObj.getTime()) &&
            effDateObj.getTime() >= Date.now() + 10 * 24 * 60 * 60 * 1000;

          return (
            <div
              className={
                isFutureDate
                  ? "border-2 border-red-500 text-red-600 rounded px-2 py-0.5 inline-block text-[12px] font-bold"
                  : "text-[14px] text-slate-600 dark:text-slate-300 font-normal"
              }
            >
              {formatDate(rawDate)}
            </div>
          );
        },
      },
      {
        Header: "PROPOSED BY",
        accessor: "Created_by",
        Cell: ({ value }: any) => (
          <span className="text-[14px] font-normal text-slate-600 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "APPROVER 1",
        accessor: "apr1_name",
        Cell: ({ row }: any) => {
          const stat = row.original?.Appr_1_Stat;
          const dotColor =
            stat == 1
              ? "bg-emerald-500"
              : stat == 0
                ? "bg-red-500"
                : "bg-[#EAB308]"; // Dark Yellow for pending
          const name = row.original?.apr1_name || "—";

          return (
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
              <span className="text-[14px] font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                {name}
              </span>
            </div>
          );
        },
      },
      {
        Header: "APPROVER 2",
        accessor: "apr2_name",
        Cell: ({ row }: any) => {
          const stat = row.original?.Appr_2_Stat;
          const dotColor =
            stat == 1
              ? "bg-emerald-500"
              : stat == 0
                ? "bg-red-500"
                : "bg-[#EAB308]"; // Dark Yellow for pending
          const name = row.original?.apr2_name || "—";

          return (
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
              <span className="text-[14px] font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                {name}
              </span>
            </div>
          );
        },
      },
      {
        Header: "HISTORY",
        accessor: "history",
        Cell: ({ row }: any) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              doubleclicked(row.original);
            }}
            className="h-8 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 text-[13px] font-semibold
                       hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700
                       inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <History className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            See History
          </button>
        ),
      },
      ...(isPending
        ? [
          {
            Header: "ACTION",
            id: "action",
            Cell: ({ row }: any) => (
              <div
                className="flex items-center gap-1.5"
                onClick={(e: any) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSingleApprove(row.original);
                  }}
                  title="Approve"
                  className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-all shadow-2xs hover:border-emerald-300 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSingleReject(row.original);
                  }}
                  title="Reject"
                  className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 dark:text-red-400 flex items-center justify-center transition-all shadow-2xs hover:border-red-300 cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            ),
          },
        ]
        : []),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isPending]
  );

  const columnsForDownload = [
    { Header: "S. No.", accessor: "Tran_id" },
    { Header: "Employee Code", accessor: "Emp_Code" },
    { Header: "Employee Name", accessor: "NewEmpName" },
    { Header: "Salary Type", accessor: "NewSalary_Type" },
    { Header: "Designation", accessor: "EMPLOYEEDESIGNATION" },
    { Header: "Location", accessor: "Location_Lable" },
    { Header: "Current Salary", accessor: "Gross_Salary" },
    { Header: "Proposed Salary", accessor: "Proposed_Salary" },
    { Header: "Effective Date", accessor: "NewEffective_Date" },
    { Header: "Proposed By", accessor: "Created_by" },
    { Header: "Approver 1", accessor: "apr1_name" },
    { Header: "Approver 2", accessor: "apr2_name" },
  ];

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-[#060B13] p-4 sm:p-6 space-y-5 pb-32">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Salary approver grid
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Approve or reject proposed salary revisions · two-level approval
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsModalVisible1(true)}
            className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold
                       hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800
                       inline-flex items-center gap-2 shadow-xs transition-colors"
            title="Approver List"
          >
            <ListChecks className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span className="hidden sm:inline">Approver List</span>
          </button>

          <button
            type="button"
            onClick={() => handleExcelDownload(columnsForDownload, filtereddata)}
            disabled={isExcelLoading}
            className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold
                       hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed
                       dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800
                       inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>{isExcelLoading ? "Exporting..." : "Export to Excel"}</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards (Pending, Approved, Rejected) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-7 max-w-5xl">
        {/* PENDING APPROVALS */}
        <div className="bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-yellow-100 dark:bg-yellow-950/60 text-yellow-500 dark:text-yellow-400">
              <Clock className="w-4.5 h-4.5 stroke-[2.5]" />
            </span>
            <span className="text-[12px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              PENDING APPROVALS
            </span>
          </div>
          <div className="mt-3.5 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {stats.pendingApprovals}
          </div>
        </div>

        {/* APPROVED */}
        <div className="bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Check className="w-4.5 h-4.5 stroke-[2.5]" />
            </span>
            <span className="text-[12px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              APPROVED
            </span>
          </div>
          <div className="mt-3.5 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {stats.approvedCount}
          </div>
        </div>

        {/* REJECTED */}
        <div className="bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
              <X className="w-4.5 h-4.5 stroke-[2.5]" />
            </span>
            <span className="text-[12px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              REJECTED
            </span>
          </div>
          <div className="mt-3.5 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {stats.rejectedCount}
          </div>
        </div>
      </div>

      {/* Filter Bar Card */}
      <div className="bg-white dark:bg-[#0B1220] border border-slate-300 dark:border-slate-700 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 items-end">
          {/* DATE FROM */}
          <div className="md:col-span-3 lg:col-span-2">
            <label className="block text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              DATE FROM
            </label>
            <div className="relative">
              <input
                type="date"
                name="DATE_FROM"
                value={dates.DATE_FROM}
                onChange={(e) => handleDateChange("DATE_FROM", e.target.value)}
                className="w-full h-11 sm:h-12 px-3.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-[15px] font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
              />
            </div>
          </div>

          {/* DATE TO */}
          <div className="md:col-span-3 lg:col-span-2">
            <label className="block text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              DATE TO
            </label>
            <div className="relative">
              <input
                type="date"
                name="DATE_TO"
                value={dates.DATE_TO}
                onChange={(e) => handleDateChange("DATE_TO", e.target.value)}
                className="w-full h-11 sm:h-12 px-3.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-[15px] font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
              />
            </div>
          </div>

          {/* BRANCH */}
          <div className="md:col-span-3 lg:col-span-3">
            <SelectSearch
              title="BRANCH"
              options={branch}
              name="branch"
              handleInputChange={handleDateChange}
              selectedValue={dates.branch?.toString()}
              isSelectAll={true}
              className="h-11 sm:h-12 border-slate-300 dark:border-slate-600 text-base sm:text-lg rounded-xl font-medium"
              labelClass="text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
            />
          </div>

          {/* STATUS */}
          <div className="md:col-span-3 lg:col-span-3">
            <SelectSearch
              title="STATUS"
              options={StatusOptions}
              name="status"
              handleInputChange={handleDateChange}
              selectedValue={dates.status?.toString()}
              className="h-11 sm:h-12 border-slate-300 dark:border-slate-600 text-lg sm:text-xl rounded-xl font-medium"
              labelClass="text-[13px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
            />
          </div>

          {/* SHOW BUTTON */}
          <div className="md:col-span-12 lg:col-span-2 flex items-end">
            <button
              onClick={showdata}
              className="w-full h-11 sm:h-12 px-6 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-bold text-base shadow-sm transition-colors cursor-pointer"
            >
              Show
            </button>
          </div>
        </div>
      </div>

      {/* Main Table using ReactTable Component */}
      <ServiceTablePagination
        columns={columns}
        data={filtereddata}
        check={isPending}
        selectValue="Tran_id"
        setsellectedrowdata={setsellectedrowdata}
        onRowDoubleClick={doubleclicked}
        height={540}
        showTopSearch={false}
        showExcelExport={false}
        columnsDownload={columnsForDownload}
      />

      {/* Fixed Footer Action Bar (Appears when >= 1 checkbox selected) */}
      {selectedrowdata.length > 0 && (
        <div className="fixed bottom-0 left-0 sm:left-[68px] right-0 z-30 w-auto bg-white dark:bg-[#0B1220] border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_25px_rgba(0,0,0,0.08)] px-4 sm:px-8 py-3.5 sm:py-4 animate-in slide-in-from-bottom duration-200">
          <div className="max-w-[1700px] mx-auto flex flex-col sm:flex-row items-center gap-3.5">
            <div className="flex-1 w-full">
              <input
                type="text"
                placeholder="Remark (applies to all selected records)"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="w-full h-12 px-4.5 text-[15px] border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4338CA] shadow-2xs font-medium"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setsellectedrowdata([]);
                  setRemark("");
                }}
                className="h-12 px-6 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[15px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={reject}
                className="h-12 px-6 rounded-xl border border-red-200 bg-[#FEF2F2] text-[#EF4444] text-[15px] font-semibold hover:bg-red-100 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/60 inline-flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
              >
                <X className="w-4.5 h-4.5 stroke-[2.5]" />
                Reject
              </button>

              <button
                type="button"
                onClick={approver}
                className="h-12 px-7 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-[15px] font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                <Check className="w-4.5 h-4.5 stroke-[2.5]" />
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. History Modal Dialog */}
      <Dialog open={isDialogOpen1} onOpenChange={setIsDialogOpen1}>
        <DialogContent className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl p-0 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220]">
          <div className="sticky top-0 z-10 bg-slate-900 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-wide uppercase">
                EMPLOYEE SALARY REVIEW
              </h2>
              {SalaryData.length > 0 && (
                <p className="text-xs text-slate-300 mt-0.5">
                  {SalaryData[0].EMPLOYEEDESIGNATION} · {SalaryData[0].DEPARTMENT} ·{" "}
                  {SalaryData[0].EMPLOYEENAME} ({SalaryData[0].Emp_Code})
                </p>
              )}
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SalaryData.map((item, index) => (
                <div
                  key={index}
                  className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4.5 space-y-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
                    <span className="text-xs font-bold text-[#4338CA] dark:text-indigo-400 uppercase tracking-wide">
                      {index < SalaryData.length - 1 ? (
                        <>
                          {new Date(item.Effective_date).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          —{" "}
                          {new Date(
                            SalaryData[index + 1].Effective_date
                          ).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </>
                      ) : (
                        <>
                          {new Date(item.Effective_date).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          — Ongoing
                        </>
                      )}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      Gross: {formatCurrency(item.Gross_Salary)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div className="text-slate-500">Basic: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(item.Basic)}</strong></div>
                    <div className="text-slate-500">HRA: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(item.HRA)}</strong></div>
                    <div className="text-slate-500">Conveyance: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(item.Conveyance)}</strong></div>
                    <div className="text-slate-500">Medical: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(item.Medical)}</strong></div>
                    <div className="text-slate-500">Washing: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(item.Washing)}</strong></div>
                    <div className="text-slate-500">Other: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(item.Other)}</strong></div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-400 flex flex-wrap justify-between">
                    <span>User: {item.MODIFIED_USER || "—"}</span>
                    <span>Date: {item.MOD_DATE ? item.MOD_DATE.split("-").reverse().join("-") : "—"}</span>
                  </div>
                </div>
              ))}
            </div>

            {SalaryData.length === 0 && (
              <div className="text-center py-12 text-sm text-slate-400">
                No past salary revision records found.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Salary Details Modal Dialog */}
      <Dialog open={isDialogOpen2} onOpenChange={setIsDialogOpen2}>
        <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl p-0 border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1220] shadow-2xl">
          <div className="sticky top-0 z-10 bg-slate-900 text-white px-7 py-5 rounded-t-2xl flex items-center justify-between border-b border-slate-800">
            <div>
              <h2 className="text-xl font-bold tracking-wide text-white">
                {formData1?.NewEmpName || "Employee"} - {formData1?.Emp_Code || ""} Salary Details
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                Detailed breakdown and revision summary
              </p>
            </div>
          </div>

          <div className="p-7 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Salary Information */}
              <div className="bg-slate-50/90 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 rounded-2xl p-6 space-y-4 shadow-2xs">
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 border-b-2 border-slate-200 dark:border-slate-700 pb-2.5 uppercase tracking-wide">
                  Salary Information
                </h3>
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-[15px] font-medium text-slate-600 dark:text-slate-400">Salary Type</span>
                    <span className="text-[15px] font-bold text-slate-900 dark:text-slate-100">
                      {SLTY.find((item) => item.value === formData1?.Salary_Type)?.label || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-[15px] font-medium text-slate-600 dark:text-slate-400">Effective Date</span>
                    <span className="text-[15px] font-bold text-slate-900 dark:text-slate-100">
                      {formatDate(formData1?.Effective_date)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-[15px] font-medium text-slate-600 dark:text-slate-400">Monthly Gross</span>
                    <span className="text-[16px] font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(formData1?.Gross_Salary)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-[15px] font-medium text-slate-600 dark:text-slate-400">Annual Gross</span>
                    <span className="text-[16px] font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(formData1?.ANNUAL_CTC)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 bg-emerald-50/80 dark:bg-emerald-950/40 px-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 mt-2">
                    <span className="text-[16px] font-bold text-emerald-900 dark:text-emerald-300">CTC</span>
                    <span className="text-[18px] font-extrabold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(formData1?.CTC)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Salary Breakdown */}
              <div className="bg-slate-50/90 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700 rounded-2xl p-6 space-y-4 shadow-2xs">
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 border-b-2 border-slate-200 dark:border-slate-700 pb-2.5 uppercase tracking-wide">
                  Salary Breakdown
                </h3>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/80 dark:border-slate-800">
                    <span className="text-[14px] font-medium text-slate-600 dark:text-slate-400">Basic</span>
                    <span className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{formatCurrency(formData1?.Basic)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/80 dark:border-slate-800">
                    <span className="text-[14px] font-medium text-slate-600 dark:text-slate-400">HRA</span>
                    <span className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{formatCurrency(formData1?.HRA)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/80 dark:border-slate-800">
                    <span className="text-[14px] font-medium text-slate-600 dark:text-slate-400">Conveyance</span>
                    <span className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{formatCurrency(formData1?.Conveyance)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/80 dark:border-slate-800">
                    <span className="text-[14px] font-medium text-slate-600 dark:text-slate-400">Medical</span>
                    <span className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{formatCurrency(formData1?.Medical)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/80 dark:border-slate-800">
                    <span className="text-[14px] font-medium text-slate-600 dark:text-slate-400">DA / Other</span>
                    <span className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{formatCurrency(formData1?.Other)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/80 dark:border-slate-800">
                    <span className="text-[14px] font-medium text-slate-600 dark:text-slate-400">Washing</span>
                    <span className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{formatCurrency(formData1?.Washing)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/80 dark:border-slate-800">
                    <span className="text-[14px] font-medium text-slate-600 dark:text-slate-400">Uniform</span>
                    <span className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{formatCurrency(formData1?.Uniform)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/80 dark:border-slate-800">
                    <span className="text-[14px] font-medium text-slate-600 dark:text-slate-400">PF Salary Limit</span>
                    <span className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{formatCurrency(formData1?.PFSALARY_LIMIT)}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/80 dark:border-slate-800">
                    <span className="text-[14px] font-medium text-slate-600 dark:text-slate-400">Bonus</span>
                    <span className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{formatCurrency(formData1?.BONUS_AMOUNT)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-sm font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 p-4 rounded-xl border border-amber-200 dark:border-amber-800/80">
              Please review the employee salary details carefully before approving or rejecting.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Approver List Modal Dialog */}
      <Dialog open={isModalVisible1} onOpenChange={setIsModalVisible1}>
        <DialogContent className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl p-0 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220]">
          <div className="sticky top-0 z-10 bg-slate-900 text-white px-6 py-4.5 rounded-t-2xl flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-wide">
                Approver List
              </h2>
              <p className="text-sm text-slate-300 mt-0.5">
                Hierarchical approver mapping
              </p>
            </div>
          </div>

          <div className="p-6">
            {apprData.length === 0 ? (
              <div className="text-center py-12 text-base text-slate-400">
                No Approvers Found
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800/60 font-bold uppercase tracking-wider text-[13px] text-slate-700 dark:text-slate-200">
                    <tr>
                      <th className="px-4 py-3.5 border-b">Approver 1A</th>
                      <th className="px-4 py-3.5 border-b">Approver 1B</th>
                      <th className="px-4 py-3.5 border-b">Approver 2A</th>
                      <th className="px-4 py-3.5 border-b">Approver 2B</th>
                      <th className="px-4 py-3.5 border-b">Approver 3A</th>
                      <th className="px-4 py-3.5 border-b">Approver 3B</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[15px]">
                    {apprData.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3.5 capitalize font-semibold text-slate-900 dark:text-slate-100">{item.approver1_A || "—"}</td>
                        <td className="px-4 py-3.5 capitalize font-medium text-slate-700 dark:text-slate-300">{item.approver1_B || "—"}</td>
                        <td className="px-4 py-3.5 capitalize font-semibold text-slate-900 dark:text-slate-100">{item.approver2_A || "—"}</td>
                        <td className="px-4 py-3.5 capitalize font-medium text-slate-700 dark:text-slate-300">{item.approver2_B || "—"}</td>
                        <td className="px-4 py-3.5 capitalize font-semibold text-slate-900 dark:text-slate-100">{item.approver3_A || "—"}</td>
                        <td className="px-4 py-3.5 capitalize font-medium text-slate-700 dark:text-slate-300">{item.approver3_B || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
