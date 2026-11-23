"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Swal from "sweetalert2";
import useExcelDownload from "@/app/hooks/excel-download";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Eselect from "@/components/atoms/Eselect";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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

const MONTH_NAMES: Record<string, string> = {
  "01": "Jan",
  "02": "Feb",
  "03": "Mar",
  "04": "Apr",
  "05": "May",
  "06": "Jun",
  "07": "Jul",
  "08": "Aug",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Dec",
};

const formatMonth = (m: any) => {
  if (!m) return "—";
  const str = String(m).padStart(2, "0");
  return MONTH_NAMES[str] || String(m);
};

interface BulkRosterCreationProps {
  isDialogMode?: boolean;
}

export default function BulkRosterCreationPage({
  isDialogMode = false,
}: BulkRosterCreationProps) {
  const user: any = useCurrentUser();
  const router = useRouter();

  const userRef = React.useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const getCompCode = () => {
    const u = userRef.current || user;
    return u?.Comp_Code || u?.compcode || u?.company;
  };

  const getUserName = () => {
    const u = userRef.current || user;
    return u?.name || u?.userName || "";
  };

  const [Mssage, setMssage] = useState(0);
  const [tabledata, setTabledata] = useState<any[]>([]);
  const [isClicked, setIsClicked] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "NOT_CREATED" | "CREATED">("ALL");

  const [showRosterDialog, setShowRosterDialog] = useState(false);
  const [rosterDetails, setRosterDetails] = useState<any[]>([]);
  const [rosterSummary, setRosterSummary] = useState<any>({});

  const totalInitialRef = React.useRef<number | null>(null);
  const [singleCreatedCount, setSingleCreatedCount] = useState(0);

  // ----------------------------------------------------------------------
  // MONTH & YEAR HELPERS
  // ----------------------------------------------------------------------
  const months = useMemo(
    () => [
      { value: "01", label: "Jan" },
      { value: "02", label: "Feb" },
      { value: "03", label: "Mar" },
      { value: "04", label: "Apr" },
      { value: "05", label: "May" },
      { value: "06", label: "Jun" },
      { value: "07", label: "Jul" },
      { value: "08", label: "Aug" },
      { value: "09", label: "Sep" },
      { value: "10", label: "Oct" },
      { value: "11", label: "Nov" },
      { value: "12", label: "Dec" },
    ],
    []
  );

  const getCurrentFinancialYear = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const financialYearStartMonth = 3;
    if (currentDate.getMonth() < financialYearStartMonth) {
      return currentYear - 1;
    }
    return currentYear;
  };

  const generateFinancialYearsArray = () => {
    const currentYear = getCurrentFinancialYear();
    const financialYears = [];

    for (let i = 0; i < 6; i++) {
      const year = currentYear - i + 1;
      financialYears.push({
        value: `${year}`,
        label: `${year}`,
      });
    }
    return financialYears;
  };

  const yearoptions = useMemo(() => generateFinancialYearsArray(), []);

  const getCurrentMonth = () => {
    const currentMonth = new Date().getMonth() + 1;
    return currentMonth < 10 ? `0${currentMonth}` : `${currentMonth}`;
  };

  const currentDate = new Date();
  const [dates, setDates] = useState({
    month: getCurrentMonth(),
    year: currentDate.getFullYear(),
  });

  const handleDateChange = (name: string, value: any) => {
    totalInitialRef.current = null;
    setSingleCreatedCount(0);
    setRosterSummary({});
    setMssage(0);
    setDates((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  // ----------------------------------------------------------------------
  // CONFIRM ROSTER CREATION (PREVIEW DATE RANGE)
  // ----------------------------------------------------------------------
  const confirmRosterCreation = async ({ month, year, empcode }: any) => {
    const compCode = getCompCode();
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/CreateRoaster`,
        {
          month,
          year,
          empcode,
          preview: true,
          compcode: compCode,
          Comp_Code: compCode,
        },
        {
          headers: {
            compcode: compCode,
            Comp_Code: compCode,
            name: getUserName(),
          },
        }
      );

      const { startDate, endDate } = res.data;

      const result = await Swal.fire({
        icon: "question",
        title: "Confirm Roster Creation",
        html: `
          <div style="text-align:left; font-size:15px;">
            The roster will be created
            ${empcode ? `for <b>EmpCode: ${empcode}</b>` : "for <b>all employees</b>"}
            from <b>${startDate}</b> to <b>${endDate}</b>.
            <br/><br/>
            Do you want to continue?
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Yes, Create",
        cancelButtonText: "No",
      });

      return result.isConfirmed;
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.response?.data?.message || "Unable to fetch roster date range",
      });
      return false;
    }
  };

  // ----------------------------------------------------------------------
  // FETCH PENDING ROSTER EMPLOYEES
  // ----------------------------------------------------------------------
  const CheckRoaster = async () => {
    const compCode = getCompCode();
    if (!compCode) {
      return;
    }
    if (!dates.month) {
      showSideAlert("Please select Month", "info");
      return;
    }
    if (!dates.year) {
      showSideAlert("Please select year", "info");
      return;
    }
    try {
      setIsClicked(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/CheckRoastercreated`,
        {
          month: dates.month,
          year: dates.year,
          compcode: compCode,
          Comp_Code: compCode,
        },
        {
          headers: {
            compcode: compCode,
            Comp_Code: compCode,
            name: getUserName(),
          },
        }
      );

      console.log(response.data, "aa");
      if (!response.data.Result || response.data.Result.length === 0) {
        showSideAlert(
          "Roster already Created for the selected month and year.",
          "info"
        );
        setTabledata([]);
        setMssage(1);
        return;
      }
      setMssage(0);
      const list = response.data.Result || [];
      if (totalInitialRef.current === null) {
        totalInitialRef.current = list.length;
      }
      setTabledata(list);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    } finally {
      setIsClicked(false);
    }
  };

  const hasLoadedInitialRef = React.useRef(false);
  const prevDatesRef = React.useRef({ month: dates.month, year: dates.year });

  useEffect(() => {
    const compCode = getCompCode();
    if (!compCode) return;

    const datesChanged =
      prevDatesRef.current.month !== dates.month ||
      prevDatesRef.current.year !== dates.year;

    if (!hasLoadedInitialRef.current || datesChanged) {
      hasLoadedInitialRef.current = true;
      prevDatesRef.current = { month: dates.month, year: dates.year };
      CheckRoaster();
    }
  }, [dates.month, dates.year, user?.Comp_Code]);

  // ----------------------------------------------------------------------
  // BULK CREATE ROSTER FOR ALL
  // ----------------------------------------------------------------------
  const handleAssetEMpReport = async () => {
    const compCode = getCompCode();
    if (!dates.month) {
      showSideAlert("Please select Month", "info");
      return;
    }
    if (!dates.year) {
      showSideAlert("Please select year", "info");
      return;
    }
    if (Mssage === 1) {
      showSideAlert("Already Created", "info");
      return;
    }

    const confirmed = await confirmRosterCreation({
      month: dates.month,
      year: dates.year,
    });
    if (!confirmed) return;

    try {
      setIsClicked(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/CreateRoaster`,
        {
          month: dates.month,
          year: dates.year,
          compcode: compCode,
          Comp_Code: compCode,
        },
        {
          headers: {
            compcode: compCode,
            Comp_Code: compCode,
            name: getUserName(),
          },
        }
      );

      if (response.data.success === true) {
        const { summary, details } = response.data;

        if (summary?.totalEmployees) {
          totalInitialRef.current = summary.totalEmployees;
        }
        setRosterSummary(summary || {});
        setRosterDetails(details || []);
        setShowRosterDialog(true);

        if (summary?.failedEmployees > 0 || summary?.skippedEmployees > 0) {
          showSideAlert(
            `${summary.createdEmployees} Created, ${summary.failedEmployees} Failed, ${summary.skippedEmployees} Skipped`,
            "warning"
          );
        } else {
          showSideAlert("Roster Created Successfully", "success");
        }
        await CheckRoaster();
      }
    } catch (error: any) {
      console.error("Error creating bulk roster:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.response?.data?.message || "Something went wrong",
      });
    } finally {
      setIsClicked(false);
    }
  };

  // ----------------------------------------------------------------------
  // SINGLE EMPLOYEE ROSTER CREATION
  // ----------------------------------------------------------------------
  const CheckRoasterForEmp = async ({ empcode, month, year }: any) => {
    console.log("Selected Employee:", empcode, month, year);
    const compCode = getCompCode();

    try {
      const confirmed = await confirmRosterCreation({ empcode, month, year });

      if (confirmed) {
        setIsClicked(true);
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/ars/CreateRoaster`,
          {
            empcode,
            month,
            year,
            compcode: compCode,
            Comp_Code: compCode,
          },
          {
            headers: {
              compcode: compCode,
              Comp_Code: compCode,
              name: getUserName(),
            },
          }
        );

        if (response.data.success) {
          const detail = response.data.details?.[0];

          if (detail?.status === "CREATED") {
            setSingleCreatedCount((prev) => prev + 1);
            Swal.fire({
              icon: "success",
              title: "Success!",
              text: `Roster created successfully for EmpCode: ${empcode}`,
            });
          } else {
            Swal.fire({
              icon: "warning",
              title: "Roster Not Created",
              html: `
                <div style="text-align:left; font-size:14px;">
                  <b>EmpCode:</b> ${detail?.empcode || empcode}<br/>
                  <b>Name:</b> ${detail?.empname || "-"}<br/>
                  <b>Status:</b> ${detail?.status || "-"}<br/>
                  <b>Reason:</b> ${detail?.reason || "Unknown reason"}
                </div>
              `,
            });
          }
        }
        await CheckRoaster();
      }
    } catch (error: any) {
      console.error("Error creating Roster:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error?.response?.data?.message || "Something went wrong",
      });
    } finally {
      setIsClicked(false);
    }
  };

  const { handleExcelDownload } = useExcelDownload();

  // ----------------------------------------------------------------------
  // EXPORT CURRENT TABLE DATA TO EXCEL
  // ----------------------------------------------------------------------
  const handleExportExcel = () => {
    if (!tabledata || tabledata.length === 0) {
      showSideAlert("No data to export", "info");
      return;
    }
    const exportCols = [
      { Header: "Empcode", accessor: "EmpCode" },
      { Header: "Employee name", accessor: "EmpName" },
      { Header: "Month", accessor: "Month" },
      { Header: "Year", accessor: "Year" },
    ];
    const exportData = tabledata.map((item: any) => ({
      EmpCode: item.EmpCode,
      EmpName: item.EmpName,
      Month: formatMonth(item.Month || dates.month),
      Year: item.Year || dates.year,
    }));
    handleExcelDownload(exportCols, exportData);
  };

  // ----------------------------------------------------------------------
  // COUNTS & FILTERING
  // ----------------------------------------------------------------------
  const notCreatedCount = tabledata.length;
  const isAllCreated = Mssage === 1 && notCreatedCount === 0;

  const totalCreated = isAllCreated
    ? (totalInitialRef.current || rosterSummary?.totalEmployees || 0)
    : (rosterSummary?.createdEmployees || 0) + singleCreatedCount;

  const effectiveTotal = isAllCreated
    ? totalCreated
    : Math.max(totalInitialRef.current || 0, notCreatedCount + totalCreated);

  const totalCount = isAllCreated ? totalCreated : effectiveTotal;
  const createdCount = totalCreated;

  const progressPercent = isAllCreated
    ? 100
    : totalCount > 0
    ? Math.min(100, Math.round((createdCount / totalCount) * 100))
    : 0;

  const filteredData = useMemo(() => {
    let list = tabledata;
    if (activeTab === "CREATED") {
      list = [];
    }
    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (item: any) =>
        String(item.EmpCode || "").toLowerCase().includes(q) ||
        String(item.EmpName || "").toLowerCase().includes(q)
    );
  }, [tabledata, activeTab, searchQuery]);

  // ----------------------------------------------------------------------
  // TABLE COLUMNS
  // ----------------------------------------------------------------------
  const columns = useMemo(
    () => [
      {
        Header: "Empcode",
        accessor: "EmpCode",
        minWidth: 120,
      },
      {
        Header: "Employee name",
        accessor: "EmpName",
        minWidth: 260,
      },
      {
        Header: "Month",
        accessor: "Month",
        minWidth: 100,
        Cell: ({ value }: any) => formatMonth(value || dates.month),
      },
      {
        Header: "Year",
        accessor: "Year",
        minWidth: 100,
        Cell: ({ value }: any) => value || dates.year,
      },
      {
        Header: "Roster",
        accessor: "rosterAction",
        minWidth: 140,
        Cell: ({ row }: any) => {
          return (
            <AButton
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                CheckRoasterForEmp({
                  empcode: row.original.EmpCode,
                  month: row.original.Month || dates.month,
                  year: row.original.Year || dates.year,
                })
              }
              className="rounded-lg text-s text-indigo-600 dark:text-indigo-400 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 font-semibold  h-8 px-3.5 shadow-2xs"
            >
              Create roster
            </AButton>
          );
        },
      },
    ],
    [dates.month, dates.year, user]
  );

  const rosterColumns = useMemo(
    () => [
      { Header: "Emp Code", accessor: "empcode", minWidth: 120 },
      { Header: "Emp Name", accessor: "empname", minWidth: 200 },
      { Header: "Shift", accessor: "shift", minWidth: 120 },
      {
        Header: "Status",
        accessor: "status",
        minWidth: 130,
        Cell: ({ row }: any) => {
          const status = row.original?.status;
          const colorMap: Record<string, string> = {
            CREATED: "text-emerald-600 font-semibold",
            ALREADY_EXISTS: "text-blue-600 font-semibold",
            SKIPPED: "text-amber-600 font-semibold",
            FAILED: "text-rose-600 font-semibold",
          };
          return <span className={colorMap[status] || ""}>{status}</span>;
        },
      },
      { Header: "Reason", accessor: "reason", minWidth: 220 },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#070D18] p-3 sm:p-4 lg:p-6 text-slate-800 dark:text-slate-100">
      <HashloaderComponent isLoading={isClicked} />

      <div className="mx-auto max-w-[1700px] w-full space-y-4">
        {/* ============================================================== */}
        {/* BREADCRUMB & HEADER */}
        {/* ============================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight mt-0.5">
              All roster creation
            </h1>
            <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
              Create monthly shift rosters for every employee, or one at a time.
            </p>
          </div>

        
        </div>

        {/* ============================================================== */}
        {/* TOP FILTER & PROGRESS CARD */}
        {/* ============================================================== */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] p-4 sm:p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Month & Year Selects */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-3">
              <Eselect
                title="Month"
                name="month"
                option={months}
                initialValue={dates.month}
                handleInputChange={handleDateChange}
                placeholder="Select Month"
                className="!h-10 w-full rounded-xl text-[13px]"
              />

              <Eselect
                title="Year"
                name="year"
                option={yearoptions}
                initialValue={dates.year?.toString()}
                handleInputChange={handleDateChange}
                placeholder="Select Year"
                className="!h-10 w-full rounded-xl text-[13px]"
              />
            </div>

            {/* Progress Bar Center Section */}
            <div className="lg:col-span-5 px-0 sm:px-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                <span>
                  Progress · {formatMonth(dates.month)} {dates.year}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {isAllCreated && totalCount === 0
                    ? "Completed (100%)"
                    : `${createdCount} / ${totalCount}`}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Action Button Right */}
            <div className="lg:col-span-3 flex justify-start lg:justify-end">
              <AButton
                type="button"
                onClick={handleAssetEMpReport}
                loading={isClicked}
                disabled={notCreatedCount === 0 || isClicked}
                className="rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white px-5 h-10 font-semibold shadow-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all whitespace-nowrap text-sm w-full lg:w-auto"
              >
                Create roster for all ({notCreatedCount})
              </AButton>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SEGMENTED TABS, EXPORT & SEARCH BAR ROW */}
        {/* ============================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Segmented Tabs */}
          <div className="inline-flex items-center rounded-xl bg-slate-200/60 dark:bg-slate-800/80 p-1 gap-1 self-start">
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-s font-semibold transition-all",
                activeTab === "ALL"
                  ? "bg-white dark:bg-[#0B1220] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              All {totalCount}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("NOT_CREATED")}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-s font-semibold transition-all",
                activeTab === "NOT_CREATED"
                  ? "bg-white dark:bg-[#0B1220] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Roster not created {notCreatedCount}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("CREATED")}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-s font-semibold transition-all",
                activeTab === "CREATED"
                  ? "bg-white dark:bg-[#0B1220] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Created {createdCount}
            </button>
          </div>

          {/* Right Action: Export to Excel & Search Bar */}
        
        </div>

        {/* ============================================================== */}
        {/* MAIN ROSTER DATA TABLE */}
        {/* ============================================================== */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] overflow-hidden shadow-xs">
          <DataTable
            columns={columns}
            data={filteredData}
            showTopSearch={true}
            showExcelExport={true}
            resetFilters={true}
            showPageSizeInFooter={true}
            showColumnFilters={true}
          />
        </div>
      </div>

      {/* ============================================================== */}
      {/* RESULT DIALOG / MODAL (BULK ROSTER RESULT) */}
      {/* ============================================================== */}
      <Dialog open={showRosterDialog} onOpenChange={setShowRosterDialog}>
        <DialogContent className="w-full max-w-[1200px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Roster Creation Result
            </DialogTitle>
          </DialogHeader>

          {/* Summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 my-3 text-sm">
            <div className="text-center p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
              <div className="font-bold text-xl text-slate-800 dark:text-slate-100">
                {rosterSummary?.totalEmployees || 0}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Total</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <div className="font-bold text-xl text-emerald-600 dark:text-emerald-400">
                {rosterSummary?.createdEmployees || 0}
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium mt-0.5">
                Created
              </div>
            </div>
            <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
              <div className="font-bold text-xl text-blue-600 dark:text-blue-400">
                {rosterSummary?.alreadyExists || 0}
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300 font-medium mt-0.5">
                Already Exists
              </div>
            </div>
            <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <div className="font-bold text-xl text-amber-600 dark:text-amber-400">
                {rosterSummary?.skippedEmployees || 0}
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-300 font-medium mt-0.5">
                Skipped
              </div>
            </div>
            <div className="text-center p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
              <div className="font-bold text-xl text-rose-600 dark:text-rose-400">
                {rosterSummary?.failedEmployees || 0}
              </div>
              <div className="text-xs text-rose-700 dark:text-rose-300 font-medium mt-0.5">
                Failed
              </div>
            </div>
          </div>

          {/* Full DataTable for result details */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <DataTable
              columns={rosterColumns}
              data={rosterDetails}
              showTopSearch={true}
              showExcelExport={true}
              showColumnFilters={true}
              resetFilters={true}
              showPageSizeInFooter={true}
              searchPlaceholder="Search in results..."
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
