"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { ArrowLeft, Search, Check, Trash2, Info } from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useToast } from "@/app/hooks/useToast";

// Mandatory design-system components
import Button from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import { StatCard } from "@/components/Templates/card";
import ServiceTablePagination from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

/* ------------------------------------------------------------------ */
/*  Date Helpers                                                      */
/* ------------------------------------------------------------------ */
const formatDateForAPI = (dateStr?: string | null): string => {
  if (!dateStr) return "";
  if (dateStr.includes("/")) {
    const [day, month, year] = dateStr.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return dateStr;
};

const formatDisplayDate = (dateStr?: string | null): string => {
  if (!dateStr) return "—";
  const cleanStr = String(dateStr).split("T")[0];
  const parts = cleanStr.split(/[-/]/);
  let d: Date;
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else {
      d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
  } else {
    d = new Date(dateStr);
  }
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const calculateAgeInDays = (dateStr?: string | null): number => {
  if (!dateStr) return 0;
  try {
    let d: Date;
    if (dateStr.includes("/")) {
      const [day, mon, yr] = dateStr.split("/");
      d = new Date(Number(yr), Number(mon) - 1, Number(day));
    } else {
      d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) return 0;
    const diffTime = Math.abs(Date.now() - d.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */
export default function ApproveAutoRejectedLeaveMisspunchPage() {
  const user = useCurrentUser();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [remark, setRemark] = useState<string>("");
  const [tableData, setTableData] = useState<any[]>([]);
  const [selectedRowData, setSelectedRowData] = useState<any[]>([]);
  const [miscDates, setMiscDates] = useState<any[]>([]);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"ALL" | "IMPACT" | "OLDER_7">("ALL");
  const [revivedCount, setRevivedCount] = useState<number>(0);
  const [misspunchCount, setMisspunchCount] = useState<number>(0);
  const [leaveCount, setLeaveCount] = useState<number>(0);

  const [dates, setDates] = useState<{
    DATE_FROM: string | null;
    DATE_TO: string | null;
    status: number;
  }>({
    DATE_FROM: null,
    DATE_TO: null,
    status: 1, // 1 = Misspunch, 2 = Leave
  });

  const StatusOptions = [
    { value: "1", label: "Misspunch" },
    { value: "2", label: "Leave" },
  ];

  const compCode = (user as any)?.Comp_Code;
  const userBranch = (user as any)?.branch;
  const userName = user?.name;

  const isInitialLoaded = useRef(false);

  /* ------------------------------------------------------------------ */
  /*  Fetch Table Data (Called on Show Button or after Approval)        */
  /* ------------------------------------------------------------------ */
  const showData = async (overrideStatus?: number) => {
    const statusToUse = overrideStatus !== undefined ? overrideStatus : dates.status;
    setTableData([]);
    setSelectedRowData([]);
    setRemark("");

    if (!statusToUse) {
      toast({
        title: "Please Select Type",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/getAutoRejectedLeaveAndMisspunchData`,
        {
          DATE_FROM: dates.DATE_FROM,
          DATE_TO: dates.DATE_TO,
          loc_code: userBranch || "",
          MisspunchLeaveFlag: statusToUse,
        },
        {
          headers: {
            compcode: compCode,
            name: userName,
          },
        }
      );

      if (result.data?.success) {
        const fetchedList = result.data.data || [];
        setTableData(fetchedList);
        if (statusToUse === 1) {
          setMisspunchCount(fetchedList.length);
        } else {
          setLeaveCount(fetchedList.length);
        }
      } else {
        toast({
          title: result.data?.message || "Error fetching data",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Error fetching data:", err);
      toast({
        title: "Error fetching data",
        description: err?.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Single Initial Load on Page Mount / Refresh only (No Window Focus) */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!compCode || isInitialLoaded.current) return;
    isInitialLoaded.current = true;

    const initializePage = async () => {
      setIsLoading(true);
      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/hrmsreport/findMasters`,
          {
            multiloc: userBranch,
            Month: new Date().getMonth() + 1,
            Year: new Date().getFullYear(),
          },
          {
            headers: {
              compcode: compCode,
              name: userName,
            },
          }
        );

        const mDates = response.data?.data?.MiscDate ?? [];
        setMiscDates(mDates);

        if (mDates.length > 0) {
          const from = formatDateForAPI(mDates[0].Misc_Dtl1);
          const to = formatDateForAPI(mDates[0].Misc_Dtl2);

          setDates((prev) => ({
            ...prev,
            DATE_FROM: from,
            DATE_TO: to,
          }));

          // Initial load of both counts & data
          const [misspunchRes, leaveRes] = await Promise.all([
            axios.post(
              `${process.env.NEXT_PUBLIC_URL}/ars/getAutoRejectedLeaveAndMisspunchData`,
              {
                DATE_FROM: from,
                DATE_TO: to,
                loc_code: userBranch || "",
                MisspunchLeaveFlag: 1,
              },
              {
                headers: {
                  compcode: compCode,
                  name: userName,
                },
              }
            ),
            axios.post(
              `${process.env.NEXT_PUBLIC_URL}/ars/getAutoRejectedLeaveAndMisspunchData`,
              {
                DATE_FROM: from,
                DATE_TO: to,
                loc_code: userBranch || "",
                MisspunchLeaveFlag: 2,
              },
              {
                headers: {
                  compcode: compCode,
                  name: userName,
                },
              }
            ),
          ]);

          const mData = misspunchRes.data?.data || [];
          const lData = leaveRes.data?.data || [];
          setMisspunchCount(mData.length);
          setLeaveCount(lData.length);
          setTableData(mData); // default view is Misspunch
        }
      } catch (err) {
        console.error("Error during initial load:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initializePage();
  }, [compCode, userBranch, userName]);

  /* ------------------------------------------------------------------ */
  /*  4. Handlers                                                       */
  /* ------------------------------------------------------------------ */
  const handleDateChange = (name: string, value: any) => {
    setDates((prev) => ({
      ...prev,
      [name]: name === "status" ? Number(value) : value,
    }));
  };

  /* ------------------------------------------------------------------ */
  /*  5. Approve Action                                                 */
  /* ------------------------------------------------------------------ */
  const handleApprove = async () => {
    if (!selectedRowData || selectedRowData.length === 0) {
      toast({
        description: "Please select a row to approve",
        variant: "destructive",
      });
      return;
    }

    if (!remark || remark.trim() === "") {
      toast({
        description: "Please enter a remark",
        variant: "destructive",
      });
      return;
    }

    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Are you sure?",
      text: "Do you want to proceed?",
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      showCancelButton: true,
    });
    if (!confirmed.isConfirmed) return;

    setIsLoading(true);

    try {
      if (dates.status === 1) {
        // MISSPUNCH (Bulk Mode)
        const formattedRows = selectedRowData.map((row: any) => ({
          ...row,
          dateoffice: formatDateForAPI(row.dateoffice),
        }));

        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/ars/updateAutoRejectedLeaveAndMisspunch`,
          {
            MisspunchLeaveFlag: dates.status,
            rows: formattedRows,
            loc_code: (user as any)?.branch,
            approver_code: (user as any)?.EMPCODE,
            remark: remark,
          },
          {
            headers: {
              compcode: (user as any)?.Comp_Code,
              name: user?.name,
            },
          }
        );

        if (result.data?.success) {
          toast({
            title: "Success",
            description: result.data.message || "Approved successfully",
            variant: "default",
          });
          setRevivedCount((prev) => prev + formattedRows.length);
        } else {
          const failedRows = result.data?.failedRows || [];
          if (failedRows.length > 0) {
            failedRows.forEach((row: any) => {
              toast({
                title: `UTD ${row.UTD} Failed`,
                description: row.reason || "Unknown error",
                variant: "destructive",
              });
            });
          } else {
            toast({
              title: "Error",
              description: result.data?.message || "Some records failed",
              variant: "destructive",
            });
          }
        }
      } else {
        // LEAVE (Single Row Mode)
        const selectedRow = Array.isArray(selectedRowData)
          ? selectedRowData[0]?.UTD
            ? selectedRowData[0]
            : selectedRowData[1] || selectedRowData[0]
          : selectedRowData;

        if (!selectedRow) {
          toast({
            description: "No row selected for leave approval",
            variant: "destructive",
          });
          return;
        }

        const result = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/ars/updateAutoRejectedLeaveAndMisspunch`,
          {
            MisspunchLeaveFlag: dates.status,
            UTD: selectedRow.UTD,
            EMPCODE: selectedRow.EMPCODE,
            dateoffice: formatDateForAPI(selectedRow.dateoffice),
            loc_code: (user as any)?.branch,
            approver_code: (user as any)?.EMPCODE,
            remark: remark,
            rowData: selectedRow,
          },
          {
            headers: {
              compcode: (user as any)?.Comp_Code,
              name: user?.name,
            },
          }
        );

        toast({
          title: result.data?.success ? "Success" : "Error",
          description:
            result.data?.message ||
            (result.data?.success ? "Approved" : "Failed"),
          variant: result.data?.success ? "default" : "destructive",
        });

        if (result.data?.success) {
          setRevivedCount((prev) => prev + 1);
        }
      }
    } catch (err: any) {
      console.error("Error approving request:", err);
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSelectedRowData([]);
      setRemark("");
      setIsLoading(false);
      await showData();
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Computed Counts & Filtered Data by Search & Tabs                  */
  /* ------------------------------------------------------------------ */
  const lwpCount = useMemo(() => {
    return tableData.filter((item) => {
      if (item.LWP === 1 || item.LWP === "1" || item.isLwp) return true;
      const impact = String(
        item.payrollImpact || item.Payroll_Impact || item.Impact || ""
      ).toLowerCase();
      if (impact.includes("lwp") || impact.includes("absent")) return true;
      return false;
    }).length;
  }, [tableData]);

  const filteredData = useMemo(() => {
    let list = [...tableData];

    // Filter by Search Query
    if (searchFilter.trim()) {
      const q = searchFilter.trim().toLowerCase();
      list = list.filter((item) => {
        const emp = (item.empname || item.Emp_Name || "").toLowerCase();
        const code = String(item.EMPCODE || item.EmpCode || "").toLowerCase();
        const reason = (item.Mipunch_Reason_lable || item.Reason || "").toLowerCase();
        const remarkText = (item.Spl_Remark || item.spl_remark || "").toLowerCase();
        const appr = (item.Appr_3_Rem || item.MI_Remark_lable || "").toLowerCase();
        return (
          emp.includes(q) ||
          code.includes(q) ||
          reason.includes(q) ||
          remarkText.includes(q) ||
          appr.includes(q)
        );
      });
    }

    // Filter by Tab
    if (activeTab === "OLDER_7") {
      list = list.filter((item) => calculateAgeInDays(item.dateoffice) >= 7);
    } else if (activeTab === "IMPACT") {
      // Items that cause payroll impact (e.g. marked absent or late)
      list = list.filter((item) => {
        const r = (item.Mipunch_Reason_lable || item.Reason || "").toLowerCase();
        return r.length > 0;
      });
    }

    return list;
  }, [tableData, searchFilter, activeTab]);

  /* ------------------------------------------------------------------ */
  /*  7. Columns Definition (Exact columns from old code)               */
  /* ------------------------------------------------------------------ */
  const columns = useMemo(() => [
    { Header: "UTD", accessor: "UTD", show: false },
    {
      Header: "Emp Code",
      accessor: "EMPCODE",
      Cell: ({ row }: any) => (
        <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
          {row.original.EMPCODE ?? "—"}
        </span>
      ),
    },
    {
      Header: "Date",
      accessor: "dateoffice",
      Cell: ({ row }: any) => (
        <span className="text-[12px] font-medium text-slate-700 dark:text-slate-300">
          {formatDisplayDate(row.original.dateoffice)}
        </span>
      ),
    },
    {
      Header: "Employee Name",
      accessor: "empname",
      Cell: ({ row }: any) => (
        <span className="font-semibold text-slate-800 dark:text-slate-100">
          {row.original.empname || "—"}
        </span>
      ),
    },
    {
      Header: "Misspunch Reason",
      accessor: "Mipunch_Reason_lable",
      Cell: ({ row }: any) => (
        <span className="text-[12px] text-slate-700 dark:text-slate-300">
          {row.original.Mipunch_Reason_lable || "—"}
        </span>
      ),
    },
    {
      Header: "Special Remark",
      accessor: "Spl_Remark",
      Cell: ({ row }: any) => (
        <span className="text-[12px] text-slate-600 dark:text-slate-400">
          {row.original.Spl_Remark || "—"}
        </span>
      ),
    },
    {
      Header: "MI Remark",
      accessor: "MI_Remark_lable",
      Cell: ({ row }: any) => (
        <span className="text-[12px] text-slate-600 dark:text-slate-400">
          {row.original.MI_Remark_lable || "—"}
        </span>
      ),
    },
    {
      Header: "Approver 3 Remark",
      accessor: "Appr_3_Rem",
      Cell: ({ row }: any) => (
        <span className="text-[12px] text-slate-600 dark:text-slate-400">
          {row.original.Appr_3_Rem || "—"}
        </span>
      ),
    },
    {
      Header: "Approver 3 Date",
      accessor: "Appr_3_date",
      Cell: ({ row }: any) => (
        <span className="text-[12px] text-slate-600 dark:text-slate-400">
          {row.original.Appr_3_date ? formatDisplayDate(row.original.Appr_3_date) : "—"}
        </span>
      ),
    },
  ], []);

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
  /* ------------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] dark:bg-[#0A0F1C] dark:text-[#E7ECF3] px-2.5 py-3 sm:px-5 sm:py-5 md:px-8 md:py-6 font-['Inter',system-ui,sans-serif] antialiased max-w-full overflow-x-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* Top Header */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-3.5 sm:mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        <div>
          <h1 className="text-[17px] sm:text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
            Approve auto-rejected leave & misspunch
          </h1>
          <p className="mt-[3px] sm:mt-[5px] text-[11.5px] sm:text-[12.5px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
            Requests the system closed on its own — nobody approved them inside the SLA window. Revive the genuine ones here before the month is locked.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
          className="self-start sm:self-auto !h-[32px] sm:!h-[34px] !rounded-[9px] !px-3 sm:!px-3.5 !text-[11.5px] sm:!text-[12px] !font-[550] !border-[#E2E8F0] dark:!border-[#1F2937] !shadow-none shrink-0"
          icon={<ArrowLeft className="h-3.5 w-3.5" />}
        >
          Back
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Info / Notice Alert Banner */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-3.5 sm:mb-4 flex items-start gap-2.5 sm:gap-3 rounded-xl border border-amber-200/80 bg-[#FFFBEB] p-2.5 sm:p-3.5 text-[11.5px] sm:text-[12.5px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200 shadow-2xs">
        <div className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-amber-500 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
          i
        </div>
        <p className="leading-relaxed">
          Requests auto-reject after 7 days without an approver action. Approving here writes straight to the attendance month and skips the normal approval chain — the remark is mandatory and stays on the audit trail.
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Filter Bar Card */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-3.5 sm:mb-4 rounded-xl sm:rounded-2xl border border-[#E2E8F0] bg-white p-3 sm:p-[18px] shadow-[0_1px_2px_rgba(15,23,42,.04)] dark:border-[#1F2937] dark:bg-[#111827]">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 sm:gap-3 items-end">
          {/* DATE FROM */}
          <div className="col-span-1 lg:col-span-3 flex flex-col gap-1 min-w-0">
            <span className="text-[10.5px] sm:text-[11px] font-[650] uppercase tracking-[0.04em] text-[#64748B] dark:text-[#94A3B8]">
              DATE FROM
            </span>
            <Einput
              type="date"
              name="DATE_FROM"
              value={dates.DATE_FROM ?? ""}
              onChange={(e) => handleDateChange("DATE_FROM", e.target.value)}
              hideLabel
              wrapperClassName="w-full"
              className="!h-[36px] sm:!h-[38px] !rounded-[9px] !text-[12px] sm:!text-[12.5px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !px-2.5 sm:!px-3 shadow-none focus-visible:!ring-0 focus-visible:!border-[#4F46E5]"
            />
          </div>

          {/* DATE TO */}
          <div className="col-span-1 lg:col-span-3 flex flex-col gap-1 min-w-0">
            <span className="text-[10.5px] sm:text-[11px] font-[650] uppercase tracking-[0.04em] text-[#64748B] dark:text-[#94A3B8]">
              DATE TO
            </span>
            <Einput
              type="date"
              name="DATE_TO"
              value={dates.DATE_TO ?? ""}
              onChange={(e) => handleDateChange("DATE_TO", e.target.value)}
              hideLabel
              wrapperClassName="w-full"
              className="!h-[36px] sm:!h-[38px] !rounded-[9px] !text-[12px] sm:!text-[12.5px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !px-2.5 sm:!px-3 shadow-none focus-visible:!ring-0 focus-visible:!border-[#4F46E5]"
            />
          </div>

          {/* TYPE */}
          <div className="col-span-2 sm:col-span-1 lg:col-span-2 flex flex-col gap-1 min-w-0">
            <span className="text-[10.5px] sm:text-[11px] font-[650] uppercase tracking-[0.04em] text-[#64748B] dark:text-[#94A3B8]">
              TYPE
            </span>
            <Eselect
              name="status"
              option={StatusOptions}
              initialValue={dates.status?.toString()}
              handleInputChange={handleDateChange}
              mb={0}
              className="!h-[36px] sm:!h-[38px] !min-h-[36px] sm:!min-h-[38px] !mt-0 !rounded-[9px] !text-[12px] sm:!text-[12.5px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !px-2.5 sm:!px-3 shadow-none focus-within:!border-[#4F46E5] focus-within:!ring-0 cursor-pointer"
            />
          </div>

          {/* SEARCH */}
          <div className="col-span-2 sm:col-span-1 lg:col-span-3 flex flex-col gap-1 min-w-0">
            <span className="text-[10.5px] sm:text-[11px] font-[650] uppercase tracking-[0.04em] text-[#64748B] dark:text-[#94A3B8]">
              SEARCH
            </span>
            <Einput
              type="text"
              name="search"
              placeholder="Code, name, reason or approver"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              hideLabel
              wrapperClassName="w-full"
              className="!h-[36px] sm:!h-[38px] !rounded-[9px] !text-[12px] sm:!text-[12.5px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !px-2.5 sm:!px-3 shadow-none placeholder:!text-[#64748B]/60 focus-visible:!ring-0 focus-visible:!border-[#4F46E5]"
            />
          </div>

          {/* SHOW BUTTON */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-1">
            <Button
              type="button"
              onClick={() => showData()}
              icon={<Search className="h-4 w-4" />}
              className="!h-[36px] sm:!h-[38px] !w-full !rounded-[9px] !px-4 !text-[12px] sm:!text-[12.5px] !font-semibold !bg-[#4F46E5] hover:!bg-[#4338CA] text-white !shadow-none active:scale-[0.98] transition-all"
            >
              Show
            </Button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4 Stat Cards Row (Target UI Matching 1st Screenshot) */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-3.5 sm:mb-4 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatCard
          title="Auto-rejected misspunch"
          count={misspunchCount}
          subtitle="Punches never approved"
          uppercase={false}
          iconBox={false}
          icon={
            <span className="h-2 w-2 rounded-full bg-[#F59E0B] inline-block mr-1 shrink-0" />
          }
          className="!h-auto !min-h-[96px] sm:!min-h-[105px] !rounded-xl sm:!rounded-2xl !p-3 sm:!p-4 !bg-white dark:!bg-[#111827] !border-[#E2E8F0] dark:!border-[#1F2937] shadow-[0_1px_2px_rgba(15,23,42,.04)] hover:!border-[#CBD5E1] dark:hover:!border-[#374151]"
          activeClassName="!bg-white dark:!bg-[#111827] !border-[#E2E8F0] dark:!border-[#1F2937]"
          inactiveClassName="!bg-white dark:!bg-[#111827] !border-[#E2E8F0] dark:!border-[#1F2937]"
          titleClassName="!text-[11.5px] sm:!text-[12.5px] !font-medium !text-[#475569] dark:!text-[#94A3B8] leading-tight"
          countClassName="!text-[22px] sm:!text-[26px] !font-bold !text-[#0F172A] dark:!text-[#F8FAFC] !mt-0.5"
          subtitleClassName="!text-[10.5px] sm:!text-[11.5px] !font-normal !text-[#64748B] dark:!text-[#94A3B8] !mt-0.5 leading-tight"
          isActive={dates.status === 1}
          onClick={() => {
            handleDateChange("status", 1);
            showData(1);
          }}
        />

        <StatCard
          title="Auto-rejected leave"
          count={leaveCount}
          subtitle="Leave never approved"
          uppercase={false}
          iconBox={false}
          icon={
            <span className="h-2 w-2 rounded-full bg-[#8B5CF6] inline-block mr-1 shrink-0" />
          }
          className="!h-auto !min-h-[96px] sm:!min-h-[105px] !rounded-xl sm:!rounded-2xl !p-3 sm:!p-4 !bg-white dark:!bg-[#111827] !border-[#E2E8F0] dark:!border-[#1F2937] shadow-[0_1px_2px_rgba(15,23,42,.04)] hover:!border-[#CBD5E1] dark:hover:!border-[#374151]"
          activeClassName="!bg-white dark:!bg-[#111827] !border-[#E2E8F0] dark:!border-[#1F2937]"
          inactiveClassName="!bg-white dark:!bg-[#111827] !border-[#E2E8F0] dark:!border-[#1F2937]"
          titleClassName="!text-[11.5px] sm:!text-[12.5px] !font-medium !text-[#475569] dark:!text-[#94A3B8] leading-tight"
          countClassName="!text-[22px] sm:!text-[26px] !font-bold !text-[#0F172A] dark:!text-[#F8FAFC] !mt-0.5"
          subtitleClassName="!text-[10.5px] sm:!text-[11.5px] !font-normal !text-[#64748B] dark:!text-[#94A3B8] !mt-0.5 leading-tight"
          isActive={dates.status === 2}
          onClick={() => {
            handleDateChange("status", 2);
            showData(2);
          }}
        />

        <StatCard
          title="Turning into LWP"
          count={lwpCount}
          subtitle="Unpaid unless approved"
          uppercase={false}
          iconBox={false}
          icon={
            <span className="h-2 w-2 rounded-full bg-[#EF4444] inline-block mr-1 shrink-0" />
          }
          className="!h-auto !min-h-[96px] sm:!min-h-[105px] !rounded-xl sm:!rounded-2xl !p-3 sm:!p-4 !bg-white dark:!bg-[#111827] !border-[#E2E8F0] dark:!border-[#1F2937] shadow-[0_1px_2px_rgba(15,23,42,.04)]"
          activeClassName="!bg-white dark:!bg-[#111827] !border-[#E2E8F0] dark:!border-[#1F2937]"
          inactiveClassName="!bg-white dark:!bg-[#111827] !border-[#E2E8F0] dark:!border-[#1F2937]"
          titleClassName="!text-[11.5px] sm:!text-[12.5px] !font-medium !text-[#475569] dark:!text-[#94A3B8] leading-tight"
          countClassName="!text-[22px] sm:!text-[26px] !font-bold !text-[#0F172A] dark:!text-[#F8FAFC] !mt-0.5"
          subtitleClassName="!text-[10.5px] sm:!text-[11.5px] !font-normal !text-[#64748B] dark:!text-[#94A3B8] !mt-0.5 leading-tight"
        />

        <StatCard
          title="Revived today"
          count={revivedCount}
          subtitle="Approved from this screen"
          uppercase={false}
          iconBox={false}
          icon={
            <span className="h-2 w-2 rounded-full bg-[#10B981] inline-block mr-1 shrink-0" />
          }
          className="!h-auto !min-h-[96px] sm:!min-h-[105px] !rounded-xl sm:!rounded-2xl !p-3 sm:!p-4 !bg-white dark:!bg-[#111827] !border-[#E2E8F0] dark:!border-[#1F2937] shadow-[0_1px_2px_rgba(15,23,42,.04)]"
          activeClassName="!bg-white dark:!bg-[#111827] !border-[#E2E8F0] dark:!border-[#1F2937]"
          inactiveClassName="!bg-white dark:!bg-[#111827] !border-[#E2E8F0] dark:!border-[#1F2937]"
          titleClassName="!text-[11.5px] sm:!text-[12.5px] !font-medium !text-[#475569] dark:!text-[#94A3B8] leading-tight"
          countClassName="!text-[22px] sm:!text-[26px] !font-bold !text-[#0F172A] dark:!text-[#F8FAFC] !mt-0.5"
          subtitleClassName="!text-[10.5px] sm:!text-[11.5px] !font-normal !text-[#64748B] dark:!text-[#94A3B8] !mt-0.5 leading-tight"
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main Table Card */}
      {/* ------------------------------------------------------------------ */}
      <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)] dark:border-[#1F2937] dark:bg-[#111827]">
        {/* Table Top Header with Count & Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 border-b border-[#E2E8F0] px-3 sm:px-4 py-2.5 sm:py-3 dark:border-[#1F2937]">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12.5px] sm:text-[13px] font-[650] text-[#1E293B] dark:text-[#E7ECF3]">
              {filteredData.length}{" "}
              {dates.status === 1
                ? "auto-rejected misspunch requests"
                : "auto-rejected leave requests"}
            </span>
            <span className="text-[11px] sm:text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
              Approving overrides the auto-rejection
            </span>
          </div>

          {/* Quick Filter Pill Buttons with horizontal scroll on small devices */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5 scrollbar-none shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveTab("ALL")}
              className={`!h-[28px] sm:!h-[30px] !rounded-[8px] !px-2.5 sm:!px-3 !text-[11px] sm:!text-[11.5px] !font-medium !shadow-none shrink-0 ${
                activeTab === "ALL"
                  ? "!bg-[#EEF2FF] !text-[#4F46E5] dark:!bg-[#1E1B4B] dark:!text-[#8B84FF]"
                  : "!text-[#64748B] hover:!bg-slate-100 dark:!text-[#94A3B8] dark:hover:!bg-[#182235]"
              }`}
            >
              All
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveTab("IMPACT")}
              className={`!h-[28px] sm:!h-[30px] !rounded-[8px] !px-2.5 sm:!px-3 !text-[11px] sm:!text-[11.5px] !font-medium !shadow-none shrink-0 ${
                activeTab === "IMPACT"
                  ? "!bg-[#EEF2FF] !text-[#4F46E5] dark:!bg-[#1E1B4B] dark:!text-[#8B84FF]"
                  : "!text-[#64748B] hover:!bg-slate-100 dark:!text-[#94A3B8] dark:hover:!bg-[#182235]"
              }`}
            >
              Payroll impact
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveTab("OLDER_7")}
              className={`!h-[28px] sm:!h-[30px] !rounded-[8px] !px-2.5 sm:!px-3 !text-[11px] sm:!text-[11.5px] !font-medium !shadow-none shrink-0 ${
                activeTab === "OLDER_7"
                  ? "!bg-[#EEF2FF] !text-[#4F46E5] dark:!bg-[#1E1B4B] dark:!text-[#8B84FF]"
                  : "!text-[#64748B] hover:!bg-slate-100 dark:!text-[#94A3B8] dark:hover:!bg-[#182235]"
              }`}
            >
              Older than 7 days
            </Button>
          </div>
        </div>

        {/* Table Body using ServiceTablePagination */}
        <div className="w-full">
          <ServiceTablePagination
            columns={columns}
            data={filteredData}
            check={true}
            onlyOnecheck={dates.status !== 1}
            selectValue="UTD"
            setsellectedrowdata={setSelectedRowData}
            resetfilters={true}
            height={440}
            showTopSearch={false}
            showExcelExport={true}
            resetFilters={false}
            showPageSizeInFooter={true}
            showColumnFilters={true}
            containerClassName="!border-0 !shadow-none !rounded-none !bg-transparent w-full"
          />
        </div>

        {/* Footer Bar: Remark Input + Keep Rejected + Approve Button */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 border-t border-[#E2E8F0] bg-white px-3 sm:px-4 py-3 dark:border-[#1F2937] dark:bg-[#111827]">
          <div className="flex items-center">
            <span className="text-[11.5px] sm:text-[12.5px] font-medium text-[#64748B] dark:text-[#94A3B8]">
              {selectedRowData.length > 0
                ? `${selectedRowData.length} of ${filteredData.length} selected`
                : `Showing ${filteredData.length} of ${tableData.length} items`}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
            {/* Approval remark input */}
            <div className="w-full sm:w-[260px] lg:w-[320px]">
              <Einput
                type="text"
                name="remark"
                placeholder="Approval remark — mandatory"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                hideLabel
                wrapperClassName="w-full"
                className="!h-[36px] sm:!h-[38px] !w-full !rounded-[9px] !text-[12px] sm:!text-[12.5px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !px-3 shadow-none focus-visible:!ring-0 focus-visible:!border-[#4F46E5]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Keep rejected button */}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedRowData([]);
                  toast({
                    description: "Selection cleared. Records kept rejected.",
                  });
                }}
                icon={<Trash2 className="h-4 w-4 text-slate-500" />}
                className="!h-[36px] sm:!h-[38px] flex-1 sm:flex-initial !rounded-[9px] !px-3 sm:!px-3.5 !text-[11.5px] sm:!text-[12.5px] !font-medium !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#111827] text-[#334155] dark:text-[#E7ECF3] !shadow-none hover:!bg-[#F8FAFC]"
              >
                Keep rejected
              </Button>

              {/* Approve Button */}
              <Button
                type="button"
                onClick={handleApprove}
                loading={isLoading}
                icon={<Check className="h-4 w-4 text-white stroke-[3]" />}
                className="!h-[36px] sm:!h-[38px] flex-1 sm:flex-initial !rounded-[9px] !px-4 sm:!px-5 !text-[11.5px] sm:!text-[12.5px] !font-semibold !bg-[#334155] hover:!bg-[#1E293B] text-white !shadow-none active:scale-[0.98] transition-all"
              >
                Approve
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Global Loader */}
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
}
