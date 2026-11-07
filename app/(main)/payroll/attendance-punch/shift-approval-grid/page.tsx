"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Layers,
  ListChecks,
  FileSpreadsheet,
} from "lucide-react";

import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import AButton from "@/components/atoms/Button";
import { StatCard } from "@/components/Templates/card";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useDateRange } from "@/app/hooks/use-date-range";
import { useToast } from "@/app/hooks/useToast";
import useExcelDownload from "@/app/hooks/excel-download";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function ShiftApprovalGridPage() {
  const user = useCurrentUser();
  const { toast } = useToast();
  const dateRange = useDateRange();
  const { handleExcelDownload, isLoading: isExporting } = useExcelDownload();

  const getCurrentDate = (monthsBack = 0) => {
    const today = new Date();
    today.setMonth(today.getMonth() - monthsBack);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [dates, setDates] = useState({
    DATE_FROM: dateRange?.DATE_FROM || getCurrentDate(1),
    DATE_TO: dateRange?.DATE_TO || getCurrentDate(0),
    branch: user?.branch || "ALL",
    status: 2, // 2: Pending, 1: Approved, 0: Reject, "ALL": All
  });

  const [tabledata, setTabledata] = useState<any[]>([]);
  const [filtereddata, setFiltereddata] = useState<any[]>([]);
  const [selectedrowdata, setsellectedrowdata] = useState<any[]>([]);
  const [branchList, setBranchList] = useState<any[]>([]);
  const [remark, setRemark] = useState<string>("");
  const [isClicked, setIsClicked] = useState(false);

  // Approver List Modal State
  const [isModalVisible1, setIsModalVisible1] = useState(false);
  const [apprData, setApprData] = useState<any[]>([]);

  const handleInputChange = (name: string, value: any) => {
    if (name === "status") {
      let newVlaue: any = value;
      if (value == 2 || value === "2") {
        newVlaue = null;
      }
      setFiltereddata(filterByStatus(tabledata, newVlaue));
      setsellectedrowdata([]);
    }
    setDates((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleResetFilters = () => {
    setDates({
      DATE_FROM: dateRange?.DATE_FROM || getCurrentDate(1),
      DATE_TO: dateRange?.DATE_TO || getCurrentDate(0),
      branch: user?.branch || "ALL",
      status: 2,
    });
    setsellectedrowdata([]);
    setRemark("");
  };

  function filterByStatus(data: any[], status: any) {
    if (status === "ALL") return data;
    return data.filter((item) => {
      if (status === null) {
        return (
          item.status_khud_ka == null ||
          item.status_khud_ka === "null" ||
          item.Fin_Appr === null ||
          item.Fin_Appr === "null"
        );
      }
      return (
        item.status_khud_ka == status ||
        item.status_khud_ka === String(status) ||
        item.Fin_Appr == status ||
        item.Fin_Appr === String(status)
      );
    });
  }

  // Ref to always access latest dates inside callbacks without re-triggering effects
  const datesRef = React.useRef(dates);
  useEffect(() => {
    datesRef.current = dates;
  }, [dates]);

  // ── Fetch Branch List ──────────────────────────────────────────────────────
  const fetchBranches = useCallback(async () => {
    if (!user?.Comp_Code) return;
    try {
      const currentDates = datesRef.current;
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/payout/payout`,
        {
          dateFrom: currentDates.DATE_FROM,
          dateto: currentDates.DATE_TO,
          multi_loc: user?.branch,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
            token: user?.email,
          },
        },
      );
      if (Array.isArray(result.data?.branch)) {
        setBranchList(result.data.branch);
      }
    } catch (err) {
      console.error("Error fetching branches:", err);
    }
  }, [user?.Comp_Code, user?.name, user?.email, user?.branch]);

  // ── Fetch Approver Hierarchy List ──────────────────────────────────────────
  const showDataOFAPPRVL = useCallback(async () => {
    if (!user?.EMPCODE || !user?.Comp_Code) return;
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_URL}/mobile/GetApprList`,
        {
          params: {
            Empcode: user?.EMPCODE,
            module: "Shift",
          },
          headers: {
            compcode: user?.Comp_Code,
          },
        },
      );
      if (Array.isArray(response.data?.Result)) {
        setApprData(response.data.Result);
      }
    } catch (error) {
      console.error("Error fetching approver list:", error);
    }
  }, [user?.EMPCODE, user?.Comp_Code]);

  // ── Fetch Shift Requests ───────────────────────────────────────────────────
  const showdata = useCallback(async () => {
    if (!user?.EMPCODE || !user?.Comp_Code) return;

    const currentDates = datesRef.current;

    if (!currentDates.branch) {
      toast({
        title: "Please Select Branch",
        variant: "destructive",
      });
      return;
    }
    if (currentDates.status === "" || currentDates.status === undefined) {
      toast({
        title: "Please Select Status",
        variant: "destructive",
      });
      return;
    }

    setIsClicked(true);
    setFiltereddata([]);
    setTabledata([]);
    setsellectedrowdata([]);

    try {
      const locCode = currentDates.branch === "ALL" ? "" : currentDates.branch;
      const statusParam = currentDates.status === "ALL" ? "" : currentDates.status;

      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/ShiftApproverView`,
        {
          username: user?.name,
          loc_code: locCode,
          status: statusParam,
          Appr_Code: user?.EMPCODE,
          DateFrom: currentDates.DATE_FROM,
          DateTo: currentDates.DATE_TO,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      const records = Array.isArray(result.data?.Result)
        ? result.data.Result
        : [];
      setTabledata(records);

      let targetStatus: any = currentDates.status;
      if (currentDates.status == 2 || currentDates.status === "2") {
        targetStatus = null;
      }
      setFiltereddata(filterByStatus(records, targetStatus));
    } catch (err: any) {
      console.error("Error fetching shift requests:", err);
      toast({
        title: err?.response?.data?.Message || "Failed to fetch shift requests",
        variant: "destructive",
      });
    } finally {
      setIsClicked(false);
    }
  }, [user?.name, user?.EMPCODE, user?.Comp_Code, toast]);

  // Initial load only once when user is ready
  const initialFetchDone = React.useRef(false);
  useEffect(() => {
    if (user?.EMPCODE && user?.Comp_Code && !initialFetchDone.current) {
      initialFetchDone.current = true;
      showdata();
      fetchBranches();
      showDataOFAPPRVL();
    }
  }, [user?.EMPCODE, user?.Comp_Code, showdata, fetchBranches, showDataOFAPPRVL]);

  const getFormattedTimestamp = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = now.toLocaleString("en-US", { month: "short" });
    const year = now.getFullYear();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, "0");
    return `${day} ${month} ${year}, ${strHours}:${minutes}:${seconds} ${ampm}`;
  };

  // ── Batch Approve Action ───────────────────────────────────────────────────
  const approver = async () => {
    if (!selectedrowdata || selectedrowdata.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Request Selected",
        text: "Please select at least one shift request to approve.",
        confirmButtonColor: "#4F46E5",
      });
      return;
    }

    const confirmed = await Swal.fire({
      icon: "question",
      title: "Are you sure?",
      text: "Are you sure you want to approve this record?",
      confirmButtonText: "Yes, approve",
      cancelButtonText: "Cancel",
      showCancelButton: true,
      confirmButtonColor: "#4F46E5",
      cancelButtonColor: "#64748B",
    });

    if (confirmed.isConfirmed) {
      setIsClicked(true);
      const tran_id = selectedrowdata.map((item: any) => {
        const raw = item.rowData || item;
        const idVal = item.Tran_id || item.id || raw?.Tran_id || raw?.id;
        return {
          ...raw,
          ...item,
          Tran_id: idVal,
          id: idVal,
          rowData: raw,
        };
      });

      try {
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/ars/Shiftapproveby2`,
          {
            tran_id: tran_id,
            Tran_id: tran_id,
            Appr_Code: user?.EMPCODE,
            Remark: remark || "",
          },
          {
            headers: {
              compcode: user?.Comp_Code,
              Comp_Code: user?.Comp_Code,
              name: user?.name,
            },
          },
        );

        setIsClicked(false);

        const isSuccess =
          result.data?.status === true ||
          result.data?.Status === true ||
          result.data?.status === "true" ||
          result.data?.Status === "true" ||
          result.data?.success === true ||
          (result.status === 200 && result.data?.status !== false && result.data?.Status !== false);

        if (isSuccess) {
          const timestamp = getFormattedTimestamp();
          await Swal.fire({
            icon: "success",
            title: "Approved Successfully",
            html: `<div style="display:flex; flex-direction:column; gap:6px; align-items:center;">
              <span style="font-size: 14px; color: #475569;">${result.data?.Message || result.data?.message || "Shift change request approved successfully."}</span>
              <span style="font-size: 13px; color: #64748B; background: #F1F5F9; padding: 4px 10px; border-radius: 6px; font-weight: 500;">
                Timestamp: <b>${timestamp}</b>
              </span>
            </div>`,
            confirmButtonColor: "#4F46E5",
          });
          toast({
            title: "Approve Successfully",
            variant: "default",
          });
        } else {
          await Swal.fire({
            icon: "error",
            title: "Approval Failed",
            text: result.data?.Message || result.data?.message || "Failed to approve shift request.",
            confirmButtonColor: "#E11D48",
          });
        }
        setsellectedrowdata([]);
        setRemark("");
        await showdata();
      } catch (err: any) {
        setIsClicked(false);
        await Swal.fire({
          icon: "error",
          title: "Approval Error",
          text: err?.response?.data?.Message || err?.response?.data?.message || err?.message || "Failed to approve shift request",
          confirmButtonColor: "#E11D48",
        });
        toast({
          title: `${err?.response?.data?.Message || "Failed to approve shift request"}`,
          variant: "destructive",
        });
        setsellectedrowdata([]);
        setRemark("");
      } finally {
        setIsClicked(false);
      }
    }
  };

  // ── Batch Reject Action ────────────────────────────────────────────────────
  const reject = async () => {
    if (!selectedrowdata || selectedrowdata.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Request Selected",
        text: "Please select at least one shift request to reject.",
        confirmButtonColor: "#E11D48",
      });
      return;
    }

    if (!remark || !remark.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Remark Required",
        text: "Please enter a remark before rejecting this record.",
        confirmButtonColor: "#E11D48",
      });
      return;
    }

    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Are you sure?",
      text: "Are you sure you want to reject this record?",
      confirmButtonText: "Yes, reject",
      cancelButtonText: "Cancel",
      showCancelButton: true,
      confirmButtonColor: "#E11D48",
      cancelButtonColor: "#64748B",
    });

    if (confirmed.isConfirmed) {
      setIsClicked(true);
      const tran_id = selectedrowdata.map((item: any) => {
        const raw = item.rowData || item;
        const idVal = item.Tran_id || item.id || raw?.Tran_id || raw?.id;
        return {
          ...raw,
          ...item,
          Tran_id: idVal,
          id: idVal,
          rowData: raw,
        };
      });

      try {
        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/ars/Shiftrejectby2`,
          {
            tran_id: tran_id,
            Tran_id: tran_id,
            Appr_Code: user?.EMPCODE,
            Remark: remark,
          },
          {
            headers: {
              compcode: user?.Comp_Code,
              Comp_Code: user?.Comp_Code,
              name: user?.name,
            },
          },
        );

        setIsClicked(false);

        const isSuccess =
          result.data?.status === true ||
          result.data?.Status === true ||
          result.data?.status === "true" ||
          result.data?.Status === "true" ||
          result.data?.success === true ||
          (result.status === 200 && result.data?.status !== false && result.data?.Status !== false);

        if (isSuccess) {
          const timestamp = getFormattedTimestamp();
          await Swal.fire({
            icon: "success",
            title: "Rejected Successfully",
            html: `<div style="display:flex; flex-direction:column; gap:6px; align-items:center;">
              <span style="font-size: 14px; color: #475569;">${result.data?.Message || result.data?.message || "Shift change request rejected successfully."}</span>
              <span style="font-size: 13px; color: #64748B; background: #F1F5F9; padding: 4px 10px; border-radius: 6px; font-weight: 500;">
                Timestamp: <b>${timestamp}</b>
              </span>
            </div>`,
            confirmButtonColor: "#E11D48",
          });
          toast({
            title: "Rejected Successfully",
            variant: "default",
          });
        } else {
          await Swal.fire({
            icon: "error",
            title: "Reject Failed",
            text: result.data?.Message || result.data?.message || "Failed to reject shift request.",
            confirmButtonColor: "#E11D48",
          });
        }
        setsellectedrowdata([]);
        setRemark("");
        await showdata();
      } catch (err: any) {
        setIsClicked(false);
        console.error("Reject error:", err);
        await Swal.fire({
          icon: "error",
          title: "Reject Error",
          text: err?.response?.data?.Message || err?.response?.data?.message || err?.message || "Failed to reject shift request",
          confirmButtonColor: "#E11D48",
        });
        toast({
          title: `${err?.response?.data?.Message || "Failed to reject shift request"}`,
          variant: "destructive",
        });
        setRemark("");
      } finally {
        setIsClicked(false);
      }
    }
  };

  const doubleclicked = (row: any) => {
    console.log("Row double clicked:", row);
  };

  // ── Metric Counts ──────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    tabledata.forEach((item: any) => {
      if (
        item.status_khud_ka == null ||
        item.status_khud_ka === "null" ||
        item.Fin_Appr === null ||
        item.Fin_Appr === "null"
      ) {
        pending++;
      } else if (
        item.status_khud_ka == 1 ||
        item.status_khud_ka === "1" ||
        item.Fin_Appr == 1
      ) {
        approved++;
      } else if (
        item.status_khud_ka == 0 ||
        item.status_khud_ka === "0" ||
        item.Fin_Appr == 0
      ) {
        rejected++;
      }
    });

    return {
      pending,
      approved,
      rejected,
      all: tabledata.length,
    };
  }, [tabledata]);

  const handleCardClick = (statusVal: any) => {
    setDates((prev) => ({
      ...prev,
      status: statusVal,
    }));
    setsellectedrowdata([]);
    let targetStatus: any = statusVal;
    if (statusVal == 2 || statusVal === "2") {
      targetStatus = null;
    }
    setFiltereddata(filterByStatus(tabledata, targetStatus));
  };

  // ── Row Selectable Condition: Only Pending records can have a checkbox ─────
  const isRowPending = useCallback((row: any) => {
    if (!row) return false;

    // If final status is already Approved or Rejected, no checkbox
    if (
      row.Fin_Appr == 1 ||
      row.Fin_Appr === "1" ||
      row.Fin_Appr == 0 ||
      row.Fin_Appr === "0"
    ) {
      return false;
    }

    // If already approved or rejected by the logged-in user, no checkbox
    if (
      row.status_khud_ka == 1 ||
      row.status_khud_ka === "1" ||
      row.status_khud_ka == 0 ||
      row.status_khud_ka === "0"
    ) {
      return false;
    }

    // Pending records (awaiting approval) get the checkbox
    return (
      row.status_khud_ka == null ||
      row.status_khud_ka === "null" ||
      row.status_khud_ka == 2 ||
      row.status_khud_ka === "2" ||
      row.Fin_Appr == null ||
      row.Fin_Appr === "null" ||
      row.Fin_Appr == 2 ||
      row.Fin_Appr === "2"
    );
  }, []);

  // ── Format Date Helper ─────────────────────────────────────────────────────
  const formatAttnDate = (value: any) => {
    if (!value) return { formattedDate: "waiting", isFutureDate: false };
    const dateObj = new Date(value);
    if (isNaN(dateObj.getTime())) return { formattedDate: String(value), isFutureDate: false };

    const currentDate = new Date();
    const futureDate = new Date(currentDate);
    futureDate.setDate(currentDate.getDate() + 10);

    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = dateObj.toLocaleString("en-US", { month: "short" });
    const year = dateObj.getFullYear();
    const formattedDate = `${day} ${month} ${year}`;
    const isFutureDate = dateObj >= futureDate;

    return { formattedDate, isFutureDate };
  };

  // ── Check if an approver is defined for the row ───────────────────────────
  const isApproverDefined = (name: any, ...codes: any[]) => {
    const isValid = (val: any) => {
      if (val === null || val === undefined) return false;
      const s = String(val).trim();
      if (
        !s ||
        s.toLowerCase() === "null" ||
        s.toLowerCase() === "undefined" ||
        s === "0" ||
        s === "-" ||
        s === "—"
      ) {
        return false;
      }
      return true;
    };

    if (isValid(name)) return true;
    for (const c of codes) {
      if (isValid(c)) return true;
    }
    return false;
  };

  // ── Table Columns ──────────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        Header: "S. NO",
        accessor: "Tran_id",
        width: 70,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
            {value ?? "—"}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: "NewEmpName",
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "REQ. SHIFT",
        accessor: "Req_SHIFT",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-800 dark:text-slate-200">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "DESIGNATION",
        accessor: "EMPLOYEEDESIGNATION",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-400">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "ATTN. DATE FROM",
        accessor: "ATN_DATE_FROM",
        Cell: ({ value }: any) => {
          const { formattedDate, isFutureDate } = formatAttnDate(value);
          return (
            <div
              style={
                isFutureDate
                  ? { border: "2px solid #E11D48", padding: "2px 6px", borderRadius: "6px" }
                  : {}
              }
              className="whitespace-nowrap text-slate-800 dark:text-slate-200 font-medium"
            >
              {formattedDate}
            </div>
          );
        },
      },
      {
        Header: "ATTN. DATE TO",
        accessor: "ATN_DATE_TO",
        Cell: ({ value }: any) => {
          const { formattedDate, isFutureDate } = formatAttnDate(value);
          return (
            <div
              style={
                isFutureDate
                  ? { border: "2px solid #E11D48", padding: "2px 6px", borderRadius: "6px" }
                  : {}
              }
              className="whitespace-nowrap text-slate-800 dark:text-slate-200 font-medium"
            >
              {formattedDate}
            </div>
          );
        },
      },
      {
        Header: "CREATED BY",
        accessor: "Created_by",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "APPROVER 1",
        accessor: "apr1_name",
        Cell: ({ row }: any) => {
          const stat = row.original?.Appr_1_Stat;
          const name = row.original?.apr1_name;
          const isDefined = isApproverDefined(
            name,
            row.original?.Appr_1_Code,
            row.original?.Appr_1,
            row.original?.apr1_code,
          );

          if (!isDefined && stat != 1 && stat !== "1") {
            return (
              <span className="text-slate-400 dark:text-slate-500 font-medium">
                —
              </span>
            );
          }

          if (stat == 1 || stat === "1") {
            return (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40 shadow-2xs"
                title={name ? `Approved by ${name}` : "Approved"}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Approved
              </span>
            );
          }
          if (stat == 0 || stat === "0") {
            return (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-rose-50 text-rose-600 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40 shadow-2xs"
                title={name ? `Rejected by ${name}` : "Rejected"}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Rejected
              </span>
            );
          }
          return (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200/80 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800/40 shadow-2xs"
              title={name ? `Pending with ${name}` : "Pending"}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              Pending
            </span>
          );
        },
      },
      {
        Header: "APPROVER 1 REMARK",
        accessor: "Appr_1_Rem",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-400 max-w-[200px] truncate block" title={value}>
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "APPROVER 2",
        accessor: "apr2_name",
        Cell: ({ row }: any) => {
          const stat = row.original?.Appr_2_Stat;
          const name = row.original?.apr2_name;
          const isDefined = isApproverDefined(
            name,
            row.original?.Appr_2_Code,
            row.original?.Appr_2,
            row.original?.apr2_code,
          );

          if (!isDefined && stat != 1 && stat !== "1") {
            return (
              <span className="text-slate-400 dark:text-slate-500 font-medium">
                —
              </span>
            );
          }

          if (stat == 1 || stat === "1") {
            return (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40 shadow-2xs"
                title={name ? `Approved by ${name}` : "Approved"}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Approved
              </span>
            );
          }
          if (stat == 0 || stat === "0") {
            return (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-rose-50 text-rose-600 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40 shadow-2xs"
                title={name ? `Rejected by ${name}` : "Rejected"}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Rejected
              </span>
            );
          }
          return (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200/80 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800/40 shadow-2xs"
              title={name ? `Pending with ${name}` : "Pending"}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              Pending
            </span>
          );
        },
      },
      {
        Header: "APPROVER 2 REMARK",
        accessor: "Appr_2_Rem",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-400 max-w-[200px] truncate block" title={value}>
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "REASON",
        accessor: "Reason",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-400 max-w-[240px] truncate block" title={value}>
            {value || "—"}
          </span>
        ),
      },
    ],
    [],
  );

  const statusOptions = [
    { value: 2, label: "Pending" },
    { value: 1, label: "Approved" },
    { value: 0, label: "Reject" },
    { value: "ALL", label: "All records" },
  ];

  const branchOptions = useMemo(() => {
    const list = Array.isArray(branchList)
      ? branchList.map((b: any) => ({
          value: String(b.value ?? b.loc_code ?? b.branch_code ?? b),
          label: String(b.label ?? b.loc_name ?? b.branch_name ?? b),
        }))
      : [];
    return [{ value: "ALL", label: "All branches" }, ...list];
  }, [branchList]);

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[#F8FAFC] dark:bg-[#070D18] px-3 sm:px-5 lg:px-7 py-4 sm:py-5 text-slate-900 dark:text-slate-100 pb-24">
      <div className="mx-auto w-full max-w-[1600px] min-w-0 space-y-4">
        {/* ── 1. HEADER ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Shift approver grid
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Two-level sign-off on shift changes. Approver 1&apos;s remark travels with the row to approver 2.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <AButton
              type="button"
              variant="outline"
              onClick={() => setIsModalVisible1(true)}
              icon={<ListChecks className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
              className="!h-9 !px-3.5 !rounded-lg !border-slate-200 !text-slate-700 !text-sm !font-semibold hover:!bg-slate-50 dark:!border-slate-700 dark:!text-slate-200 dark:!bg-[#111827]"
            >
              Approver list
            </AButton>

            <AButton
              type="button"
              variant="outline"
              onClick={() => handleExcelDownload(columns, filtereddata)}
              loading={isExporting}
              icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
              className="!h-9 !px-3.5 !rounded-lg !border-slate-200 !text-slate-700 !text-sm !font-semibold hover:!bg-slate-50 dark:!border-slate-700 dark:!text-slate-200 dark:!bg-[#111827]"
            >
              Export to Excel
            </AButton>
          </div>
        </div>

        {/* ── 2. STAT CARDS ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: PENDING */}
          <div className="[&>div]:!min-h-[110px] [&>div]:!rounded-2xl [&>div]:!border-slate-200 [&>div]:!bg-white [&>div]:!shadow-[0_1px_3px_rgba(15,23,42,0.04)] [&>div]:transition-all [&>div]:duration-200 [&>div]:hover:!shadow-md dark:[&>div]:!border-slate-800 dark:[&>div]:!bg-[#111827]">
            <StatCard
              title="PENDING"
              count={counts.pending}
              variant="amber"
              icon={<Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
              isActive={dates.status == 2 || dates.status === "2"}
              activeClassName="!border-[#4F46E5] !ring-2 !ring-[#4F46E5]/20 !bg-white dark:!bg-[#111827] shadow-sm"
              onClick={() => handleCardClick(2)}
              titleClassName="!text-[12px] sm:!text-[12px] !font-bold"
            />
          </div>

          {/* Card 2: APPROVED */}
          <div className="[&>div]:!min-h-[110px] [&>div]:!rounded-2xl [&>div]:!border-slate-200 [&>div]:!bg-white [&>div]:!shadow-[0_1px_3px_rgba(15,23,42,0.04)] [&>div]:transition-all [&>div]:duration-200 [&>div]:hover:!shadow-md dark:[&>div]:!border-slate-800 dark:[&>div]:!bg-[#111827]">
            <StatCard
              title="APPROVED"
              count={counts.approved}
              variant="emerald"
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
              isActive={dates.status == 1 || dates.status === "1"}
              activeClassName="!border-[#4F46E5] !ring-2 !ring-[#4F46E5]/20 !bg-white dark:!bg-[#111827] shadow-sm"
              onClick={() => handleCardClick(1)}
              titleClassName="!text-[12px] sm:!text-[12px] !font-bold"
            />
          </div>

          {/* Card 3: REJECTED */}
          <div className="[&>div]:!min-h-[110px] [&>div]:!rounded-2xl [&>div]:!border-slate-200 [&>div]:!bg-white [&>div]:!shadow-[0_1px_3px_rgba(15,23,42,0.04)] [&>div]:transition-all [&>div]:duration-200 [&>div]:hover:!shadow-md dark:[&>div]:!border-slate-800 dark:[&>div]:!bg-[#111827]">
            <StatCard
              title="REJECTED"
              count={counts.rejected}
              variant="rose"
              icon={<XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
              isActive={dates.status == 0 || dates.status === "0"}
              activeClassName="!border-[#4F46E5] !ring-2 !ring-[#4F46E5]/20 !bg-white dark:!bg-[#111827] shadow-sm"
              onClick={() => handleCardClick(0)}
              titleClassName="!text-[12px] sm:!text-[12px] !font-bold"
            />
          </div>

          {/* Card 4: ALL RECORDS */}
          <div className="[&>div]:!min-h-[110px] [&>div]:!rounded-2xl [&>div]:!border-slate-200 [&>div]:!bg-white [&>div]:!shadow-[0_1px_3px_rgba(15,23,42,0.04)] [&>div]:transition-all [&>div]:duration-200 [&>div]:hover:!shadow-md dark:[&>div]:!border-slate-800 dark:[&>div]:!bg-[#111827]">
            <StatCard
              title="ALL RECORDS"
              count={counts.all}
              variant="indigo"
              icon={<Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
              isActive={dates.status === "ALL"}
              activeClassName="!border-[#4F46E5] !ring-2 !ring-[#4F46E5]/20 !bg-white dark:!bg-[#111827] shadow-sm"
              onClick={() => handleCardClick("ALL")}
              titleClassName="!text-[12px] sm:!text-[12px] !font-bold"
            />
          </div>
        </div>

        {/* ── 3. FILTER BAR ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] p-3 sm:p-4 shadow-sm">
          <div className="grid grid-cols-1 min-[540px]:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            <div className="lg:col-span-3">
              <Einput
                title="DATE FROM"
                type="date"
                name="DATE_FROM"
                value={dates.DATE_FROM}
                handleInputChange={handleInputChange}
                className="!h-[36px] !rounded-lg !border-slate-200 dark:!border-slate-700 !bg-white dark:!bg-[#0E1524] text-[13px]"
                labelClassName="!text-[11px] !font-bold !text-slate-500 !uppercase !tracking-wider"
              />
            </div>

            <div className="lg:col-span-3">
              <Einput
                title="DATE TO"
                type="date"
                name="DATE_TO"
                value={dates.DATE_TO}
                handleInputChange={handleInputChange}
                className="!h-[36px] !rounded-lg !border-slate-200 dark:!border-slate-700 !bg-white dark:!bg-[#0E1524] text-[13px]"
                labelClassName="!text-[11px] !font-bold !text-slate-500 !uppercase !tracking-wider"
              />
            </div>

            <div className="lg:col-span-2">
              <Eselect
                title="STATUS"
                name="status"
                option={statusOptions}
                initialValue={dates.status}
                handleInputChange={handleInputChange}
                className="!h-[36px] !rounded-lg !border-slate-200 dark:!border-slate-700 !bg-white dark:!bg-[#0E1524] text-[13px]"
                labelClassName="!text-[11px] !font-bold !text-slate-500 !uppercase !tracking-wider"
              />
            </div>

            <div className="lg:col-span-2">
              <Eselect
                title="BRANCH"
                name="branch"
                option={branchOptions}
                initialValue={dates.branch}
                handleInputChange={handleInputChange}
                className="!h-[36px] !rounded-lg !border-slate-200 dark:!border-slate-700 !bg-white dark:!bg-[#0E1524] text-[13px]"
                labelClassName="!text-[11px] !font-bold !text-slate-500 !uppercase !tracking-wider"
              />
            </div>

            <div className="min-[540px]:col-span-2 lg:col-span-2 flex items-center gap-2 pb-[1px]">
              <AButton
                type="button"
                variant="primary"
                onClick={showdata}
                loading={isClicked}
                className="!h-[36px] flex-1 !bg-[#4F46E5] hover:!bg-[#4338CA] !text-white !rounded-lg !font-semibold !text-[13px] shadow-sm whitespace-nowrap"
              >
                Show
              </AButton>
              <AButton
                type="button"
                variant="outline"
                onClick={handleResetFilters}
                className="!h-[36px] !px-3.5 !rounded-lg !border-slate-200 hover:!bg-slate-50 text-slate-700 dark:!border-slate-700 dark:text-slate-300 dark:hover:!bg-slate-800 !font-semibold !text-[13px] whitespace-nowrap"
              >
                Reset
              </AButton>
            </div>
          </div>
        </div>

        {/* ── 4. DATA TABLE ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-sm overflow-hidden">
          <DataTable
            title={`Shift changes awaiting approval  ${filtereddata.length} of ${tabledata.length} rows`}
            columns={columns}
            data={filtereddata}
            check={dates.status == 2 || dates.status === "2" || dates.status === "ALL"}
            isRowSelectable={isRowPending}
            selectValue="Tran_id"
            selectedRows={selectedrowdata}
            setSelectedRows={setsellectedrowdata}
            onRowDoubleClick={doubleclicked}
            showExcelExport={false}
            showTopSearch={false}
            initialPageSize={25}
            footerTextMode="pageItems"
            containerClassName="border-0 shadow-none rounded-none"
          />
        </div>
      </div>

      {/* ── 5. FIXED BOTTOM ACTION FOOTER ───────────────────────────────────── */}
      <footer className="fixed bottom-0 left-0 sm:left-[var(--sidebar-width,68px)] right-0 z-40 bg-white dark:bg-[#111827] border-t border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center gap-3 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] transition-[left] duration-150 ease-in-out">
        <span className="text-[12.5px] font-[600] tabular-nums whitespace-nowrap text-slate-800 dark:text-slate-100 min-w-[75px]">
          {selectedrowdata.length} selected
        </span>

        <input
          type="text"
          placeholder="Remark (required when rejecting)..."
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          className="flex-1 min-w-0 max-w-[540px] h-[38px] px-3.5 text-[12.5px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0E1524] text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-[#4F46E5] transition-all"
        />

        <div className="flex-1" />

        <AButton
          type="button"
          variant="outline"
          onClick={reject}
          disabled={isClicked}
          icon={<XCircle className="w-4 h-4 text-[#E11D48]" />}
          className="!h-[38px] !px-4 !rounded-xl !border-[rgba(225,29,72,0.4)] !bg-transparent hover:!bg-rose-50 text-[#E11D48] hover:text-[#BE123C] dark:hover:!bg-rose-950/30 !text-[12.5px] !font-semibold whitespace-nowrap cursor-pointer transition-all"
        >
          Reject
        </AButton>

        <AButton
          type="button"
          variant="primary"
          onClick={approver}
          disabled={isClicked}
          icon={<CheckCircle2 className="w-4 h-4 text-white" />}
          className={`!h-[38px] !px-5 !rounded-xl !text-white !text-[12.5px] !font-semibold whitespace-nowrap transition-all shadow-sm ${
            selectedrowdata.length > 0
              ? "!bg-[#4F46E5] hover:!bg-[#4338CA] cursor-pointer"
              : "!bg-[#475569] dark:!bg-[#334155] cursor-not-allowed opacity-90"
          }`}
        >
          Approve
        </AButton>
      </footer>

      {/* ── 6. APPROVER LIST MODAL ─────────────────────────────────────────── */}
      <Dialog open={isModalVisible1} onOpenChange={setIsModalVisible1}>
        <DialogContent className="w-full max-w-2xl max-h-[85vh] overflow-hidden p-0 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#111827]">
          <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <DialogTitle className="text-base font-bold text-slate-800 dark:text-slate-200">
              Approver List
            </DialogTitle>
          </DialogHeader>
          <DialogDescription asChild>
            <div className="p-6 max-h-[420px] overflow-y-auto">
              {apprData.length === 0 ? (
                <div className="text-center text-slate-500 py-10 text-sm">
                  No Approver Found
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full border border-slate-200 dark:border-slate-800 text-[13px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300">
                          <th className="p-2.5 border border-slate-200 dark:border-slate-800 text-left font-semibold">Approver 1A</th>
                          <th className="p-2.5 border border-slate-200 dark:border-slate-800 text-left font-semibold">Approver 1B</th>
                          <th className="p-2.5 border border-slate-200 dark:border-slate-800 text-left font-semibold">Approver 2A</th>
                          <th className="p-2.5 border border-slate-200 dark:border-slate-800 text-left font-semibold">Approver 2B</th>
                          <th className="p-2.5 border border-slate-200 dark:border-slate-800 text-left font-semibold">Approver 3A</th>
                          <th className="p-2.5 border border-slate-200 dark:border-slate-800 text-left font-semibold">Approver 3B</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apprData.map((item, index) => (
                          <tr
                            key={index}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <td className="border border-slate-200 dark:border-slate-800 p-2.5 capitalize">{item.approver1_A || "—"}</td>
                            <td className="border border-slate-200 dark:border-slate-800 p-2.5 capitalize">{item.approver1_B || "—"}</td>
                            <td className="border border-slate-200 dark:border-slate-800 p-2.5 capitalize">{item.approver2_A || "—"}</td>
                            <td className="border border-slate-200 dark:border-slate-800 p-2.5 capitalize">{item.approver2_B || "—"}</td>
                            <td className="border border-slate-200 dark:border-slate-800 p-2.5 capitalize">{item.approver3_A || "—"}</td>
                            <td className="border border-slate-200 dark:border-slate-800 p-2.5 capitalize">{item.approver3_B || "—"}</td>
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
                        className="border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl bg-white dark:bg-slate-900 shadow-xs"
                      >
                        <div className="grid grid-cols-2 gap-y-2 text-[12.5px]">
                          <span className="font-semibold text-slate-500">Approver 1A:</span>
                          <span className="text-slate-800 dark:text-slate-200">{item.approver1_A || "—"}</span>
                          <span className="font-semibold text-slate-500">Approver 1B:</span>
                          <span className="text-slate-800 dark:text-slate-200">{item.approver1_B || "—"}</span>
                          <span className="font-semibold text-slate-500">Approver 2A:</span>
                          <span className="text-slate-800 dark:text-slate-200">{item.approver2_A || "—"}</span>
                          <span className="font-semibold text-slate-500">Approver 2B:</span>
                          <span className="text-slate-800 dark:text-slate-200">{item.approver2_B || "—"}</span>
                          <span className="font-semibold text-slate-500">Approver 3A:</span>
                          <span className="text-slate-800 dark:text-slate-200">{item.approver3_A || "—"}</span>
                          <span className="font-semibold text-slate-500">Approver 3B:</span>
                          <span className="text-slate-800 dark:text-slate-200">{item.approver3_B || "—"}</span>
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

      {/* Global Loading Spinner */}
      <HashloaderComponent isLoading={isClicked} />
    </div>
  );
}
