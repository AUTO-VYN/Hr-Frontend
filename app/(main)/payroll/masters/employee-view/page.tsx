"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

import Ainput from "@/components/atoms/Input";
import AButton from "@/components/atoms/Button";
import SelectSearch from "@/components/atoms/Select";
import ServiceTablePagination from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

import {
  ArrowLeft,
  Download,
  LayoutGrid,
  Table2,
  Plus,
  Columns3,
  Search,
  Moon,
  Sparkles,
  GitBranch,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";

type Option = { value: any; label: string };

// Helper formatters
const renderDash = () => (
  <span className="text-slate-400 font-normal select-none">—</span>
);

const formatCellText = (val: any) => {
  if (val === null || val === undefined || val === "" || val === "null" || val === "—") {
    return renderDash();
  }
  return <span className="text-slate-600 dark:text-slate-300 font-normal">{String(val)}</span>;
};

const formatCellDate = (val: any) => {
  if (!val || val === "null" || val === "—") return renderDash();
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const day = d.getDate().toString().padStart(2, "0");
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return (
        <span className="text-slate-600 dark:text-slate-300 font-normal">
          {`${day} ${month} ${year}`}
        </span>
      );
    }
  } catch { }
  return <span className="text-slate-600 dark:text-slate-300 font-normal">{String(val)}</span>;
};

export default function Page() {
  const user = useCurrentUser();

  // =========================
  // UI State
  // =========================
  const [view, setView] = useState<"table" | "cards">("table");
  const [tab, setTab] = useState<"active" | "left" | "all">("active");

  // API expects empView
  const [empView, setEmpView] = useState<any>("active");

  // filters in your API body: dashbord.*
  const [dashbord, setDashbord] = useState({
    Br_Location: "", // Cluster
    Section: "",
    Location: "",
    Channel: "",
    Joining_DateFROM: "",
    Joining_DateTO: "",
  });

  // top search (debouncedSearch in api)
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // pagination
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // data
  const [data, setData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);

  // dropdown master options (PreData)
  const [Br_Location, setBr_Location] = useState<Option[]>([]);
  const [Location, setLocation] = useState<Option[]>([]);
  const [Section, setSection] = useState<Option[]>([]);
  const [Channel, setChannel] = useState<Option[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  // =========================
  // Debounce search
  // =========================
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // =========================
  // API: PreData (masters)
  // =========================
  const PreData = async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/MstData`,
        { branch: user?.branch },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      setBr_Location(response.data.Br_Location || []);
      setLocation(response.data.Locations || []);
      setSection(response.data.Section || []);
      setChannel(response.data.Channel || []);
    } catch (err) {
      console.log(err);
    }
  };

  // =========================
  // API: showapi (table data)
  // =========================
  const showapi = async (
    targetView = empView,
    targetPage = currentPage,
    targetPageSize = pageSize,
    filters: any = {},
    showLoader = true
  ) => {
    if (showLoader) setIsLoading(true);

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/EmployeeMasterView`,
        {
          Loc_code: user?.branch,
          Cluster: dashbord.Br_Location,
          Section: dashbord.Section,
          Location: dashbord.Location,
          Channel: dashbord.Channel,
          Joining_DateFROM: dashbord.Joining_DateFROM,
          Joining_DateTO: dashbord.Joining_DateTO,
          empView: targetView,
          EmpView: targetView,
          status: targetView,
          type: targetView,
          view: targetView,
          tab: targetView,
          search: debouncedSearch,
          filters: filters,
          pageSize: targetPageSize === -1 ? 1000000 : targetPageSize,
          pageNo: targetPage,
        },
        {
          headers: { compcode: user?.Comp_Code, name: user?.name },
        }
      );

      const rows = result.data.Result || result.data.data || [];
      const count = Number(
        result.data.TotalCount ?? result.data.total ?? rows.length
      );

      setData(rows);
      setTotalCount(count);
    } catch (error) {
      console.error("Error fetching employee data:", error);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  // =========================
  // Initial load
  // =========================
  useEffect(() => {
    if (!user?.Comp_Code) return;
    PreData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.Comp_Code]);

  // =========================
  // Auto refresh on deps
  // =========================
  useEffect(() => {
    if (!user?.Comp_Code) return;
    showapi(empView, currentPage, pageSize, {}, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user?.Comp_Code,
    dashbord.Br_Location,
    dashbord.Section,
    dashbord.Location,
    dashbord.Channel,
    dashbord.Joining_DateFROM,
    dashbord.Joining_DateTO,
    debouncedSearch,
  ]);

  // =========================
  // Columns for table (Ordered exact as in Screenshot)
  // =========================
  const columns = useMemo(
    () => [
      {
        Header: "Employee name",
        accessor: "EMPLOYEENAME",
        Cell: ({ value, row }: any) => {
          const val = value || row.original?.EMPLOYEENAME || row.original?.Employee_Name || row.original?.name;
          if (!val) return renderDash();
          return (
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {String(val)}
            </span>
          );
        },
      },
      {
        Header: "Gender",
        accessor: "GENDER",
        Cell: ({ value }: any) => formatCellText(value),
      },
      {
        Header: "Employee type",
        accessor: "EmployeeType",
        Cell: ({ value }: any) => formatCellText(value),
      },
      {
        Header: "Region",
        accessor: "region1",
        Cell: ({ value }: any) => formatCellText(value),
      },
      {
        Header: "Location",
        accessor: "Location",
        Cell: ({ value }: any) => formatCellText(value),
      },
      {
        Header: "Department",
        accessor: "Department",
        Cell: ({ value }: any) => formatCellText(value),
      },
      {
        Header: "Employee designation",
        accessor: "EMPLOYEEDESIGNATION",
        Cell: ({ value }: any) => formatCellText(value),
      },
      {
        Header: "Joining date",
        accessor: "JOININGDATE",
        Cell: ({ value }: any) => formatCellDate(value),
      },
      {
        Header: "Punch code",
        accessor: "PUNCHCODE",
        Cell: ({ value }: any) => formatCellText(value),
      },
      {
        Header: "Payment mode",
        accessor: "PAYMENTMODE",
        Cell: ({ value }: any) => formatCellText(value),
      },

      // Additional columns
      {
        Header: "Empcode",
        accessor: "EMPCODE",
        Cell: ({ value }: any) => formatCellText(value),
      },
      {
        Header: "Section",
        accessor: "SECTION",
        Cell: ({ value }: any) => formatCellText(value),
      },
      { Header: "Mobile no", accessor: "MOBILENO", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Corporate mail id", accessor: "CORPORATEMAILID", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Alternate mail", accessor: "ALTERNET_MAIL", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Current address", accessor: "CURRENTADDRESS1", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Per mobile no", accessor: "PERMOBILENO", Cell: ({ value }: any) => formatCellText(value) },

      { Header: "Date of birth", accessor: "DATEOFBIRTH", Cell: ({ value }: any) => formatCellDate(value) },
      { Header: "PAN no", accessor: "PANNO", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "UAN no", accessor: "UAN_No", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Aadhar no", accessor: "AADHARNO", Cell: ({ value }: any) => formatCellText(value) },

      { Header: "PF (Y/N)", accessor: "PFNO", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "PF %", accessor: "PFPER", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "PF number", accessor: "PFNUMBER", Cell: ({ value }: any) => formatCellText(value) },

      { Header: "ESI (Y/N)", accessor: "ESINO", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "ESI number", accessor: "ESINUMBER", Cell: ({ value }: any) => formatCellText(value) },

      { Header: "LWF (Y/N)", accessor: "LWFNO", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Pro tax", accessor: "pro_tax", Cell: ({ value }: any) => formatCellText(value) },

      { Header: "Father name", accessor: "FATHERNAME", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Mother name", accessor: "MOTHERNAME", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Spouse name", accessor: "SPOUSENAME", Cell: ({ value }: any) => formatCellText(value) },

      { Header: "Permanent address", accessor: "PERMANENTADDRESS1", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Pincode", accessor: "PINCODE", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "State", accessor: "STATE", Cell: ({ value }: any) => formatCellText(value) },

      { Header: "Bank name", accessor: "BANKNAME", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "IFSC code", accessor: "IFSC_CODE", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Bank account no", accessor: "BANKACCOUNTNO", Cell: ({ value }: any) => formatCellText(value) },

      { Header: "Verified account no", accessor: "VERIFIED_ACCOUNT_NO", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Verified IFSC code", accessor: "VERIFIED_IFSC_CODE", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Name at bank", accessor: "Name_AT_BANK", Cell: ({ value }: any) => formatCellText(value) },

      { Header: "Salary hold", accessor: "SALARYHOLD", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Employee shift", accessor: "EMPPLOYEESHIFT", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Weekly off", accessor: "WEEKLYOFF", Cell: ({ value }: any) => formatCellText(value) },

      { Header: "Last working date", accessor: "LASTWOR_NEWDATE", Cell: ({ value }: any) => formatCellDate(value) },

      { Header: "Category", accessor: "CATEGORY", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Cluster", accessor: "CLUSTER", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Channel", accessor: "CHANNEL", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Cost centre", accessor: "COSTCENTRE", Cell: ({ value }: any) => formatCellText(value) },

      { Header: "Punch type", accessor: "Punch_Type", Cell: ({ value }: any) => formatCellText(value) },

      { Header: "Android id", accessor: "Android_id", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "IEMI", accessor: "IEMI", Cell: ({ value }: any) => formatCellText(value) },

      { Header: "Effective date", accessor: "Effective_date", Cell: ({ value }: any) => formatCellDate(value) },
      { Header: "Basic salary", accessor: "BASICSALARY", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "HRA", accessor: "HRA", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Conveyance", accessor: "Conveyance", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Medical", accessor: "Medical", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Other", accessor: "OTHER", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Uniform", accessor: "Uniform", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Washing", accessor: "Washing", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Bonus amount", accessor: "BONUS_AMOUNT", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Gross salary", accessor: "Gross_Salary", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Annual gross", accessor: "ANNUAL_GROSS", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Daily wages", accessor: "Daily_Wages", Cell: ({ value }: any) => formatCellText(value) },

      { Header: "MSPN id", accessor: "MSPN_Id", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "MSPIN", accessor: "MSPIN", Cell: ({ value }: any) => formatCellText(value) },

      { Header: "Probation period", accessor: "PROBATIONPERIOD", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Prob period", accessor: "Prob_period", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Confirmation date", accessor: "Confirmation_Date", Cell: ({ value }: any) => formatCellDate(value) },

      { Header: "Apprentice date to", accessor: "Apprentice_Date_To", Cell: ({ value }: any) => formatCellDate(value) },
      { Header: "Apprentice date from", accessor: "Apprentice_Date_From", Cell: ({ value }: any) => formatCellDate(value) },

      { Header: "Geo offence loc", accessor: "GEOOFFENCELOC", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Marital status", accessor: "Marital_Status", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Grade", accessor: "GRADE", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Emergency no", accessor: "EMERGENCYNO", Cell: ({ value }: any) => formatCellText(value) },

      { Header: "Photo path", accessor: "PHOTO_PATH", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "DD club", accessor: "DD_CLUB", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Source code", accessor: "Source_Code", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Source name", accessor: "Source_Name", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Photo URL", accessor: "photoUrl", Cell: ({ value }: any) => formatCellText(value) },
    ],
    []
  );

  // =========================
  // Server pagination meta
  // =========================
  const totalPages = useMemo(() => {
    const size = pageSize === -1 ? 1000000 : pageSize;
    return Math.max(1, Math.ceil((totalCount || 0) / (size || 1)));
  }, [totalCount, pageSize]);

  const serverPagination = useMemo(
    () => ({
      currentPage,
      pageSize,
      totalPages,
      totalRecords: totalCount,
    }),
    [currentPage, pageSize, totalPages, totalCount]
  );

  // =========================
  // Handlers
  // =========================
  const resetFilters = () => {
    setDashbord({
      Br_Location: "",
      Section: "",
      Location: "",
      Channel: "",
      Joining_DateFROM: "",
      Joining_DateTO: "",
    });
    setSearchInput("");
    setCurrentPage(1);
  };

  const handleTab = (next: "active" | "left" | "all") => {
    setTab(next);
    setEmpView(next);
    setCurrentPage(1);
    showapi(next, 1, pageSize, {}, true);
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] dark:bg-[#07101F]">
      <HashloaderComponent isLoading={isLoading} />

      {/* TOP BAR */}
      <div className="sticky top-0 z-20 border-b border-slate-200/90 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-[#0B1220]/90">
        <div className="mx-auto max-w-[1380px] px-6 py-3 flex items-center gap-4">
          <AButton
            variant="outline"
            size="md"
            className="h-10 rounded-xl px-4 flex items-center gap-2 border-slate-200 bg-white shadow-2xs hover:bg-slate-50 text-slate-700 font-medium"
            icon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => history.back()}
          >
            Back
          </AButton>

          <div className="text-sm text-slate-500 dark:text-slate-400 hidden md:flex items-center">
            <span>Payroll</span>
            <span className="mx-2 text-slate-300">/</span>
            <span>Core HR</span>
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-slate-900 dark:text-slate-100 font-bold">
              Employee Records
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Search */}
            <div className="topbar-search relative w-[340px] max-w-[45vw]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <Ainput
                title=" "
                ShortName
                type="text"
                name="topSearch"
                value={searchInput}
                handleInputChange={(_, v) => {
                  setSearchInput(String(v));
                  setCurrentPage(1);
                }}
                placeholder="Search employees..."
                className="h-10 pl-10 rounded-xl border-slate-200 bg-white text-sm"
              />
            </div>

            <AButton
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-2xs"
              icon={<Moon className="h-4 w-4" />}
              aria-label="Theme"
              onClick={() => { }}
            />

            <button
              type="button"
              className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 shadow-2xs"
            >
              <GitBranch className="h-3.5 w-3.5 text-slate-500" />
              <span>Branch - {user?.branch ?? "4 +3"}</span>
            </button>

            <div className="h-10 w-10 rounded-full bg-[#4338CA] text-white flex items-center justify-center text-xs font-bold shadow-2xs">
              AK
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="mx-auto max-w-[1380px] px-6 py-6 space-y-5">
        {/* Title + actions */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            {/* AI Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100/90 text-[#4338CA] mb-2 shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-[#4338CA]" />
              <span>What can AI do here?</span>
            </div>

            <h1 className="text-[26px] font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              Employee records
            </h1>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage your employee records ·{" "}
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {totalCount}
              </span>{" "}
              rows in current filter
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Table / Cards toggle */}
            <div className="inline-flex rounded-xl border border-slate-200/90 bg-white p-1 dark:border-slate-800 dark:bg-[#0B1220] shadow-2xs">
              <button
                type="button"
                onClick={() => setView("table")}
                className={[
                  "h-9 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-all",
                  view === "table"
                    ? "bg-[#4338CA] text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5",
                ].join(" ")}
              >
                <Table2 className="h-3.5 w-3.5" />
                Table
              </button>
              <button
                type="button"
                onClick={() => setView("cards")}
                className={[
                  "h-9 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-all",
                  view === "cards"
                    ? "bg-[#4338CA] text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5",
                ].join(" ")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Cards
              </button>
            </div>

            <AButton
              variant="outline"
              size="md"
              className="h-10 rounded-xl px-4 text-xs font-semibold border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs flex items-center gap-2"
              icon={<Download className="h-3.5 w-3.5 text-slate-600" />}
              onClick={() => { }}
            >
              Export to Excel
            </AButton>

            <AButton
              variant="primary"
              size="md"
              className="h-10 rounded-xl px-4 text-xs font-semibold bg-[#4338CA] hover:bg-[#3730A3] text-white shadow-2xs flex items-center gap-1.5"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => { }}
            >
              Add employee
            </AButton>
          </div>
        </div>

        {/* Filters card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-[#0B1220]">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <SelectSearch
              title="CLUSTER"
              name="Br_Location"
              options={Br_Location}
              selectedValue={dashbord.Br_Location}
              handleInputChange={(name, v) => {
                setDashbord((p) => ({ ...p, Br_Location: v }));
                setCurrentPage(1);
              }}
              placeholder="All cluster"
              ShortName
              className="h-10 rounded-xl dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 text-xs"
            />

            <SelectSearch
              title="BRANCH"
              name="Location"
              options={Location}
              selectedValue={dashbord.Location}
              handleInputChange={(name, v) => {
                setDashbord((p) => ({ ...p, Location: v }));
                setCurrentPage(1);
              }}
              placeholder="All branch"
              ShortName
              className="h-10 rounded-xl dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 text-xs"
            />

            <SelectSearch
              title="SECTION"
              name="Section"
              options={Section}
              selectedValue={dashbord.Section}
              handleInputChange={(name, v) => {
                setDashbord((p) => ({ ...p, Section: v }));
                setCurrentPage(1);
              }}
              placeholder="All section"
              ShortName
              className="h-10 rounded-xl dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 text-xs"
            />

            <SelectSearch
              title="CHANNEL"
              name="Channel"
              options={Channel}
              selectedValue={dashbord.Channel}
              handleInputChange={(name, v) => {
                setDashbord((p) => ({ ...p, Channel: v }));
                setCurrentPage(1);
              }}
              placeholder="All channel"
              ShortName
              className="h-10 rounded-xl dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 text-xs"
            />

            <Ainput
              title="JOINING FROM"
              ShortName
              type="date"
              name="Joining_DateFROM"
              value={dashbord.Joining_DateFROM ? String(dashbord.Joining_DateFROM).slice(0, 10) : ""}
              handleInputChange={(_, v) => {
                const next = v ? String(v).slice(0, 10) : "";
                setDashbord((p) => ({ ...p, Joining_DateFROM: next }));
                setCurrentPage(1);
              }}
              className="h-10 rounded-xl text-xs"
            />

            <div className="flex gap-2.5 items-end">
              <div className="flex-1">
                <Ainput
                  title="JOINING TO"
                  ShortName
                  type="date"
                  name="Joining_DateTO"
                  value={dashbord.Joining_DateTO ? String(dashbord.Joining_DateTO).slice(0, 10) : ""}
                  handleInputChange={(_, v) => {
                    const next = v ? String(v).slice(0, 10) : "";
                    setDashbord((p) => ({ ...p, Joining_DateTO: next }));
                    setCurrentPage(1);
                  }}
                  className="h-10 rounded-xl text-xs"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setCurrentPage(1);
                  showapi({}, true);
                }}
                className="h-10 px-5 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-semibold text-xs shadow-2xs transition-all"
              >
                Show
              </button>

              <button
                type="button"
                onClick={resetFilters}
                className="h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition-all"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Tabs + Columns & Entries Controls */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pt-1">
          {/* Tabs */}
          <div className="inline-flex rounded-xl border border-slate-200/90 bg-white p-1 dark:border-slate-800 dark:bg-[#0B1220] shadow-2xs">
            {[
              {
                key: "active" as const,
                label: "Active employees",
                count: tab === "active" ? (totalCount) : totalCount,
              },
              {
                key: "left" as const,
                label: "Left employees",
                count: tab === "left" ? totalCount : totalCount,
              },
              {
                key: "all" as const,
                label: "All employees",
                count: tab === "all" ? totalCount : totalCount,
              },
            ].map((t) => {
              const isActive = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => handleTab(t.key)}
                  className={[
                    "h-8 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all",
                    isActive
                      ? "bg-[#4338CA] text-white shadow-2xs"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5",
                  ].join(" ")}
                >
                  <span>{t.label}</span>
                  <span
                    className={[
                      "text-[11px] font-bold",
                      isActive
                        ? "text-white/90"
                        : "text-slate-400 dark:text-slate-500",
                    ].join(" ")}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Controls: Columns & Show Entries */}
          <div className="flex items-center gap-3 justify-end">
            <button
              type="button"
              className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-2 shadow-2xs transition-all dark:border-slate-800 dark:bg-[#0B1220] dark:text-slate-200"
            >
              <Columns3 className="h-3.5 w-3.5 text-slate-500" />
              <span>
                Columns{" "}
                <span className="text-slate-400 font-semibold">11/25</span>
              </span>
            </button>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-semibold focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 shadow-2xs"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>entries</span>
            </div>
          </div>
        </div>

        {/* TABLE */}
        {view === "table" ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden dark:border-slate-800 dark:bg-[#0B1220]">
            <ServiceTablePagination
              title=""
              columns={columns}
              data={data}
              height={580}
              serverMode={true}
              serverPagination={serverPagination}
              onServerPageChange={(p) => {
                setCurrentPage(p);
                showapi(empView, p, pageSize, {}, true);
              }}
              onServerPageSizeChange={(s) => {
                setPageSize(s);
                setCurrentPage(1);
                showapi(empView, 1, s, {}, true);
              }}
              onRowDoubleClick={(row) => {
                console.log("double click row:", row);
              }}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-[#0B1220] dark:text-slate-400">
            Cards view (placeholder)
          </div>
        )}
      </div>

      {/* Global CSS tweaks */}
      <style jsx global>{`
        .topbar-search label {
          display: none !important;
        }
        .topbar-search > div {
          gap: 0 !important;
        }
      `}</style>
    </div>
  );
}
