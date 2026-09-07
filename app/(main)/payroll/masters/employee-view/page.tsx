"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

import Ainput from "@/components/atoms/Input";
import AButton from "@/components/atoms/Button";
import SelectSearch from "@/components/atoms/Select";
import ServiceTablePagination from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";
import CardView from "@/components/Templates/card";

import {
  ArrowLeft,
  LayoutGrid,
  Table2,
  Plus,
  Columns3,
  Sparkles,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";

type Option = { value: any; label: string };

// Helper formatters
const renderDash = () => (
  <span className="text-slate-400 font-normal select-none">—</span>
);

const formatCellText = (val: any) => {
  if (
    val === null ||
    val === undefined ||
    val === "" ||
    val === "null" ||
    val === "—"
  ) {
    return renderDash();
  }
  return (
    <span className="text-slate-600 dark:text-slate-300 font-normal">
      {String(val)}
    </span>
  );
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
  return (
    <span className="text-slate-600 dark:text-slate-300 font-normal">
      {String(val)}
    </span>
  );
};

export default function Page() {
  const user = useCurrentUser();
  const router = useRouter();

  // =========================
  // UI State
  // =========================
  const [view, setView] = useState<"table" | "cards">("table");
  const [tab, setTab] = useState<"ACTIVE" | "LEFT" | "ALL">("ACTIVE");

  // API expects empView: "ACTIVE" | "LEFT" | "ALL"
  const [empView, setEmpView] = useState<"ACTIVE" | "LEFT" | "ALL">("ACTIVE");

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

  // counts
  const [activeCount, setActiveCount] = useState<number>(0);
  const [leftCount, setLeftCount] = useState<number>(0);
  const [allCount, setAllCount] = useState<number>(0);

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

  // Helper to ensure array format for backend (e.g. Cluster.map)
  const toArrayParam = (val: any) => {
    if (!val || val === "") return [];
    if (Array.isArray(val)) return val;
    return [val];
  };

  // =========================
  // API: showapi (table data)
  // =========================
  const showapi = async (
    targetView: "ACTIVE" | "LEFT" | "ALL" = empView,
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
          Cluster: toArrayParam(dashbord.Br_Location),
          Section: toArrayParam(dashbord.Section),
          Location: toArrayParam(dashbord.Location),
          Channel: toArrayParam(dashbord.Channel),
          Joining_DateFROM: dashbord.Joining_DateFROM || null,
          Joining_DateTO: dashbord.Joining_DateTO || null,
          empView: targetView,
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

      // update count for current view we loaded
      if (targetView === "ACTIVE") setActiveCount(count);
      if (targetView === "LEFT") setLeftCount(count);
      if (targetView === "ALL") setAllCount(count);
    } catch (error) {
      console.error("Error fetching employee data:", error);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  // =========================
  // Fetch ONLY counts for all tabs (no data change)
  // =========================
  const fetchCountOnly = async (targetView: "ACTIVE" | "LEFT" | "ALL") => {
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/EmployeeMasterView`,
        {
          Loc_code: user?.branch,
          Cluster: toArrayParam(dashbord.Br_Location),
          Section: toArrayParam(dashbord.Section),
          Location: toArrayParam(dashbord.Location),
          Channel: toArrayParam(dashbord.Channel),
          Joining_DateFROM: dashbord.Joining_DateFROM || null,
          Joining_DateTO: dashbord.Joining_DateTO || null,
          empView: targetView,
          search: debouncedSearch,
          filters: {},
          pageSize: 1,
          pageNo: 1,
        },
        {
          headers: { compcode: user?.Comp_Code, name: user?.name },
        }
      );

      const rows = res.data.Result || res.data.data || [];
      const count = Number(res.data.TotalCount ?? res.data.total ?? rows.length);
      return count;
    } catch (err) {
      console.error("Error in fetchCountOnly:", err);
      return 0;
    }
  };

  const refreshTabCounts = async () => {
    if (!user?.Comp_Code) return;
    try {
      const [ac, lc, alc] = await Promise.all([
        fetchCountOnly("ACTIVE"),
        fetchCountOnly("LEFT"),
        fetchCountOnly("ALL"),
      ]);
      setActiveCount(ac);
      setLeftCount(lc);
      setAllCount(alc);
    } catch (e) {
      console.log("Error fetching counts:", e);
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
  // Auto refresh on deps (data for current tab)
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

  // ✅ refresh counts on filters/search change
  useEffect(() => {
    if (!user?.Comp_Code) return;
    refreshTabCounts();
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
  // Columns
  // =========================
  const columns = useMemo(
    () => [
      {
        Header: "Employee name",
        accessor: "EMPLOYEENAME",
        Cell: ({ value, row }: any) => {
          const val =
            value ||
            row.original?.EMPLOYEENAME ||
            row.original?.Employee_Name ||
            row.original?.name;
          if (!val) return renderDash();
          return (
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {String(val)}
            </span>
          );
        },
      },
      { Header: "Gender", accessor: "GENDER", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Employee type", accessor: "EmployeeType", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Region", accessor: "region1", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Location", accessor: "Location", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Department", accessor: "Department", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Employee designation", accessor: "EMPLOYEEDESIGNATION", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Joining date", accessor: "JOININGDATE", Cell: ({ value }: any) => formatCellDate(value) },
      { Header: "Punch code", accessor: "PUNCHCODE", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Payment mode", accessor: "PAYMENTMODE", Cell: ({ value }: any) => formatCellText(value) },

      { Header: "Empcode", accessor: "EMPCODE", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Section", accessor: "SECTION", Cell: ({ value }: any) => formatCellText(value) },
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

  const handleTab = (next: "ACTIVE" | "LEFT" | "ALL") => {
    setTab(next);
    setEmpView(next);
    setCurrentPage(1);
    setDashbord((prev) => ({
      ...prev,
      Joining_DateFROM: "",
      Joining_DateTO: "",
    }));
    showapi(next, 1, pageSize, {}, true);
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] dark:bg-[#07101F]">
      <HashloaderComponent isLoading={isLoading} />

      {/* BODY */}
      <div className="mx-auto max-w-[1380px] px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
        {/* Title + actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100/90 text-[#4338CA] mb-2 shadow-2xs">
              <Sparkles className="h-3.5 w-3.5 text-[#4338CA] shrink-0" />
              <span>What can AI do here?</span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-[26px] font-bold py-2 text-slate-900 dark:text-slate-100 tracking-tight leading-tight truncate">
              Employee records
            </h1>
            <div className="text-md text-slate-500 dark:text-slate-400 mt-0.5">
              Manage your employee records ·{" "}
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {totalCount}
              </span>{" "}
              rows in current filter
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="inline-flex rounded-xl border border-slate-200/90 bg-white p-1 dark:border-slate-800 dark:bg-[#0B1220] shadow-2xs">
              <button
                type="button"
                onClick={() => setView("table")}
                className={[
                  "h-9 px-3 sm:px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 sm:gap-2 transition-all",
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
                  "h-9 px-3 sm:px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 sm:gap-2 transition-all",
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
              variant="primary"
              size="md"
              className="h-9 sm:h-10 rounded-xl px-3 sm:px-4 text-xs font-semibold bg-[#4338CA] hover:bg-[#3730A3] text-white shadow-2xs flex items-center gap-1.5"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => { }}
            >
              Add employee
            </AButton>

            <AButton
              variant="outline"
              size="md"
              className="h-9 sm:h-10 rounded-xl px-3 sm:px-4 flex items-center gap-2 border-slate-200 bg-white shadow-2xs hover:bg-slate-50 text-slate-700 font-medium text-xs"
              icon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => history.back()}
            >
              Back
            </AButton>
          </div>
        </div>

        {/* Filters card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs dark:border-slate-800 dark:bg-[#0B1220]">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 items-end">
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
              className="h-10 rounded-xl dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 text-xs w-full"
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
              className="h-10 rounded-xl dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 text-xs w-full"
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
              className="h-10 rounded-xl dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 text-xs w-full"
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
              className="h-10 rounded-xl dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 text-xs w-full"
            />

            <Ainput
              title={empView === "LEFT" ? "LEFT FROM" : "JOINING FROM"}
              ShortName
              type="date"
              name="Joining_DateFROM"
              label={empView === "LEFT" ? "Left Date From" : "Joining Date From"}
              value={
                dashbord.Joining_DateFROM
                  ? String(dashbord.Joining_DateFROM).slice(0, 10)
                  : ""
              }
              handleInputChange={(_, v) => {
                const next = v ? String(v).slice(0, 10) : "";
                setDashbord((p) => ({ ...p, Joining_DateFROM: next }));
                setCurrentPage(1);
              }}
              className="h-10 rounded-xl text-xs w-full"
            />

            <Ainput
              title={empView === "LEFT" ? "LEFT TO" : "JOINING TO"}
              ShortName
              type="date"
              name="Joining_DateTO"
              label={empView === "LEFT" ? "Left Date To" : "Joining Date To"}
              value={
                dashbord.Joining_DateTO
                  ? String(dashbord.Joining_DateTO).slice(0, 10)
                  : ""
              }
              handleInputChange={(_, v) => {
                const next = v ? String(v).slice(0, 10) : "";
                setDashbord((p) => ({ ...p, Joining_DateTO: next }));
                setCurrentPage(1);
              }}
              className="h-10 rounded-xl text-xs w-full"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 mt-3.5 pt-3.5 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setCurrentPage(1);
                showapi(empView, 1, pageSize, {}, true);
              }}
              className="h-9 px-5 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white font-semibold text-xs shadow-2xs transition-all flex items-center justify-center cursor-pointer shrink-0"
            >
              Show
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className="h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-2xs transition-all cursor-pointer dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 shrink-0"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Tabs + Columns */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-1">
          <div className="inline-flex rounded-xl border border-slate-200/90 bg-white p-1 dark:border-slate-800 dark:bg-[#0B1220] shadow-2xs overflow-x-auto">
            {[
              { key: "ACTIVE" as const, label: "Active employees", count: activeCount },
              { key: "LEFT" as const, label: "Left employees", count: leftCount },
              { key: "ALL" as const, label: "All employees", count: allCount },
            ].map((t) => {
              const isActive = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => handleTab(t.key)}
                  className={[
                    "h-8 px-2.5 sm:px-3.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap",
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

          <div className="flex items-center gap-2 sm:gap-3 justify-end">
            <button
              type="button"
              className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-2 shadow-2xs transition-all dark:border-slate-800 dark:bg-[#0B1220] dark:text-slate-200"
            >
              <Columns3 className="h-3.5 w-3.5 text-slate-500" />
              <span>
                Columns <span className="text-slate-400 font-semibold">11/25</span>
              </span>
            </button>
          </div>
        </div>

        {/* TABLE */}
        {view === "table" ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden dark:border-slate-800 dark:bg-[#0B1220] w-full">
            <ServiceTablePagination
              title=""
              columns={columns}
              data={data}
              height={580}
              serverMode={true}
              serverPagination={serverPagination}
              showPageSizeInFooter={true}
              showTopSearch={true}
              searchValue={searchInput}
              onSearchChange={(val) => {
                setSearchInput(val);
                setCurrentPage(1);
              }}
              searchPlaceholder="Search by name or code..."
              onServerPageChange={(p) => {
                setCurrentPage(p);
                showapi(empView, p, pageSize, {}, true);
              }}
              onServerPageSizeChange={(s) => {
                setPageSize(s);
                setCurrentPage(1);
                showapi(empView, 1, s, {}, true);
              }}
            />
          </div>
        ) : (
          <CardView
            data={data}
            totalCount={totalCount}
            onCardDoubleClick={(employee) => {
              router.push(
                `/autovyn/payroll/Master/Employee_Master?UTD=${employee?.EMPCODE}`
              );
            }}
            empView={empView}
            setEmpView={(newView) => {
              handleTab(newView as "ACTIVE" | "LEFT" | "ALL");
            }}
            globalSearch={searchInput}
            setGlobalSearch={(value) => {
              setSearchInput(value);
              setCurrentPage(1);
            }}
            isLoading={isLoading}
          />
        )}
      </div>

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