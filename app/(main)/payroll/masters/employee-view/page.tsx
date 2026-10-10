"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  <span className="text-[#64748B] font-normal select-none text-[12.5px]">—</span>
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
    <span className="text-[#1E293B] dark:text-slate-200 font-normal text-[12.5px]">
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
        <span className="text-[#1E293B] dark:text-slate-200 font-normal text-[12.5px]">
          {`${day} ${month} ${year}`}
        </span>
      );
    }
  } catch { }
  return (
    <span className="text-[#1E293B] dark:text-slate-200 font-normal text-[12.5px]">
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
        { branch: user?.multi || user?.branch },
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

  // Helper to extract option label or value
  const resolveOptionValues = (options: Option[], val: any): string[] => {
    if (!val || val === "") return [];
    const str = String(val).trim();
    if (str.toUpperCase().startsWith("ALL")) return [];

    const parts = str.includes(",")
      ? str.split(",").map((p) => p.trim())
      : [str];
    const results = new Set<string>();

    parts.forEach((p) => {
      if (!p || p.toUpperCase().startsWith("ALL")) return;
      results.add(p);
      const match = options.find(
        (o) =>
          String(o.value).toLowerCase() === p.toLowerCase() ||
          String(o.label).toLowerCase() === p.toLowerCase()
      );
      if (match) {
        if (match.value && !String(match.value).toUpperCase().startsWith("ALL"))
          results.add(String(match.value));
        if (match.label && !String(match.label).toUpperCase().startsWith("ALL"))
          results.add(String(match.label));
      }
    });

    return Array.from(results);
  };

  const toArrayParam = (val: any) => {
    if (!val || val === "") return [];
    if (Array.isArray(val)) {
      return val.filter(
        (v) => v && !String(v).trim().toUpperCase().startsWith("ALL")
      );
    }
    const str = String(val).trim();
    if (!str || str.toUpperCase().startsWith("ALL")) return [];
    if (str.includes(",")) {
      return str
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s && !s.toUpperCase().startsWith("ALL"));
    }
    return [str];
  };

  const allFilteredRowsRef = useRef<any[]>([]);

  const getRowCluster = (r: any) =>
    r?.CLUSTER ??
    r?.Cluster ??
    r?.cluster ??
    r?.CLUSTERLabel ??
    r?.ClusterLabel ??
    r?.Cluster_Name ??
    r?.CLUSTER_NAME ??
    r?.Br_Location ??
    r?.br_location ??
    r?.BR_LOCATION;

  const getRowSection = (r: any) =>
    r?.SECTION ??
    r?.Section ??
    r?.section ??
    r?.SECTIONLabel ??
    r?.SectionLabel ??
    r?.Section_Name ??
    r?.SECTION_NAME;

  const getRowChannel = (r: any) =>
    r?.CHANNEL ??
    r?.Channel ??
    r?.channel ??
    r?.CHANNELLabel ??
    r?.ChannelLabel ??
    r?.Channel_Name ??
    r?.CHANNEL_NAME;

  const getRowLocation = (r: any) =>
    r?.Location ??
    r?.LOCATION ??
    r?.location ??
    r?.Branch ??
    r?.BRANCH ??
    r?.branch ??
    r?.LOC_CODE ??
    r?.LOC_CODE1 ??
    r?.Loc_Name ??
    r?.LOC_NAME;

  const matchField = (raw: any, filterArr: string[], options: Option[]) => {
    if (!filterArr || filterArr.length === 0) return true;
    if (raw === null || raw === undefined || raw === "" || raw === "null") return false;
    const str = String(raw).trim().toUpperCase();

    // Direct match with any value in filter array
    if (filterArr.some((f) => String(f).trim().toUpperCase() === str)) return true;

    // Check against option label or value
    const matchedOpt = options.find(
      (o) =>
        String(o.value).trim().toUpperCase() === str ||
        String(o.label).trim().toUpperCase() === str
    );
    if (matchedOpt) {
      const optVal = String(matchedOpt.value).trim().toUpperCase();
      const optLbl = String(matchedOpt.label).trim().toUpperCase();
      if (
        filterArr.some((f) => {
          const fs = String(f).trim().toUpperCase();
          return fs === optVal || fs === optLbl;
        })
      ) {
        return true;
      }
    }
    return false;
  };

  const filterRowsLocally = (
    rawRows: any[],
    clusterArr: string[],
    sectionArr: string[],
    locationArr: string[],
    channelArr: string[],
    dash: typeof dashbord,
    searchStr: string
  ) => {
    let res = rawRows;

    if (clusterArr.length > 0) {
      res = res.filter((r) => matchField(getRowCluster(r), clusterArr, Br_Location));
    }

    if (sectionArr.length > 0) {
      res = res.filter((r) => matchField(getRowSection(r), sectionArr, Section));
    }

    if (channelArr.length > 0) {
      res = res.filter((r) => matchField(getRowChannel(r), channelArr, Channel));
    }

    if (locationArr.length > 0) {
      res = res.filter((r) => matchField(getRowLocation(r), locationArr, Location));
    }

    if (dash.Joining_DateFROM) {
      const fromTime = new Date(dash.Joining_DateFROM).getTime();
      if (!isNaN(fromTime)) {
        res = res.filter((r) => {
          const d = r.JOININGDATE || r.JoiningDate || r.LASTWOR_NEWDATE;
          return d && new Date(d).getTime() >= fromTime;
        });
      }
    }

    if (dash.Joining_DateTO) {
      const toTime = new Date(dash.Joining_DateTO).getTime();
      if (!isNaN(toTime)) {
        res = res.filter((r) => {
          const d = r.JOININGDATE || r.JoiningDate || r.LASTWOR_NEWDATE;
          return d && new Date(d).getTime() <= toTime;
        });
      }
    }

    if (searchStr) {
      const s = searchStr.toLowerCase().trim();
      res = res.filter((r) => {
        return (
          String(r.EMPCODE || "").toLowerCase().includes(s) ||
          String(r.EMPLOYEENAME || r.Employee_Name || r.name || "")
            .toLowerCase()
            .includes(s)
        );
      });
    }

    return res;
  };

  const formatCellFromOptions = (
    raw: any,
    options: Option[],
    fallbackFilterVal?: string
  ) => {
    if (
      raw === null ||
      raw === undefined ||
      raw === "" ||
      raw === "null" ||
      raw === "—"
    ) {
      if (
        fallbackFilterVal &&
        !String(fallbackFilterVal).toUpperCase().startsWith("ALL")
      ) {
        const opt = options.find(
          (o) =>
            String(o.value).trim().toLowerCase() ===
            String(fallbackFilterVal).trim().toLowerCase() ||
            String(o.label).trim().toLowerCase() ===
            String(fallbackFilterVal).trim().toLowerCase()
        );
        return formatCellText(opt?.label || fallbackFilterVal);
      }
      return renderDash();
    }
    const str = String(raw).trim();
    const opt = options.find(
      (o) =>
        String(o.value).trim().toLowerCase() === str.toLowerCase() ||
        String(o.label).trim().toLowerCase() === str.toLowerCase()
    );
    return formatCellText(opt?.label || str);
  };

  // =========================
  // API: showapi (table data)
  // =========================
  const showapi = async (
    targetView: "ACTIVE" | "LEFT" | "ALL" = empView,
    targetPage = currentPage,
    targetPageSize = pageSize,
    filters: any = {},
    showLoader = true,
    dash = dashbord
  ) => {
    if (showLoader) setIsLoading(true);

    const clusterArr = resolveOptionValues(Br_Location, dash.Br_Location);
    const sectionArr = resolveOptionValues(Section, dash.Section);
    const locationArr = resolveOptionValues(Location, dash.Location);
    const channelArr = resolveOptionValues(Channel, dash.Channel);

    const isAllBranchSelected = Boolean(
      dash.Location && String(dash.Location).trim().toUpperCase().startsWith("ALL")
    );

    let effectiveLocCode = user?.branch;
    if (isAllBranchSelected) {
      effectiveLocCode = user?.multi || user?.branch || "";
    } else if (locationArr.length > 0) {
      effectiveLocCode = locationArr.join(",");
    } else {
      effectiveLocCode = user?.branch;
    }

    const hasActiveFilter = Boolean(
      clusterArr.length > 0 ||
      sectionArr.length > 0 ||
      locationArr.length > 0 ||
      channelArr.length > 0 ||
      dash.Joining_DateFROM ||
      dash.Joining_DateTO
    );

    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/EmployeeMasterView`,
        {
          Loc_code: effectiveLocCode,
          branch: effectiveLocCode,
          Cluster: clusterArr.length > 0 ? clusterArr : null,
          cluster: clusterArr.length > 0 ? clusterArr : null,
          Br_Location: clusterArr.length > 0 ? clusterArr : null,
          br_location: clusterArr.length > 0 ? clusterArr : null,

          Section: sectionArr.length > 0 ? sectionArr : null,
          section: sectionArr.length > 0 ? sectionArr : null,

          Location: locationArr.length > 0 ? locationArr : null,
          location: locationArr.length > 0 ? locationArr : null,

          Channel: channelArr.length > 0 ? channelArr : null,
          channel: channelArr.length > 0 ? channelArr : null,

          Joining_DateFROM: dash.Joining_DateFROM || null,
          Joining_DateTO: dash.Joining_DateTO || null,
          empView: targetView,
          search: debouncedSearch,
          filters: filters,
          pageSize: hasActiveFilter
            ? 10000
            : targetPageSize === -1
              ? 10000
              : targetPageSize,
          pageNo: hasActiveFilter ? 1 : targetPage,
        },
        {
          headers: { compcode: user?.Comp_Code, name: user?.name },
        }
      );

      const rawRows = result.data.Result || result.data.data || [];

      if (hasActiveFilter) {
        const filtered = filterRowsLocally(
          rawRows,
          clusterArr,
          sectionArr,
          locationArr,
          channelArr,
          dash,
          debouncedSearch
        );
        allFilteredRowsRef.current = filtered;
        const total = filtered.length;
        setTotalCount(total);
        const pSize = targetPageSize === -1 ? 10000 : targetPageSize;
        const paged = filtered.slice(
          (targetPage - 1) * pSize,
          targetPage * pSize
        );
        setData(paged);

        if (targetView === "ACTIVE") setActiveCount(total);
        if (targetView === "LEFT") setLeftCount(total);
        if (targetView === "ALL") setAllCount(total);
      } else {
        allFilteredRowsRef.current = rawRows;
        const count = Number(
          result.data.TotalCount ?? result.data.total ?? rawRows.length
        );
        setData(rawRows);
        setTotalCount(count);

        if (targetView === "ACTIVE") setActiveCount(count);
        if (targetView === "LEFT") setLeftCount(count);
        if (targetView === "ALL") setAllCount(count);
      }
    } catch (error) {
      console.error("Error fetching employee data:", error);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  // =========================
  // Fetch ONLY counts for all tabs (no data change)
  // =========================
  const fetchCountOnly = async (
    targetView: "ACTIVE" | "LEFT" | "ALL",
    dash = dashbord
  ) => {
    const clusterArr = resolveOptionValues(Br_Location, dash.Br_Location);
    const sectionArr = resolveOptionValues(Section, dash.Section);
    const locationArr = resolveOptionValues(Location, dash.Location);
    const channelArr = resolveOptionValues(Channel, dash.Channel);

    const isAllBranchSelected = Boolean(
      dash.Location && String(dash.Location).trim().toUpperCase().startsWith("ALL")
    );

    let effectiveLocCode = user?.branch;
    if (isAllBranchSelected) {
      effectiveLocCode = user?.multi || user?.branch || "";
    } else if (locationArr.length > 0) {
      effectiveLocCode = locationArr.join(",");
    } else {
      effectiveLocCode = user?.branch;
    }

    const hasActiveFilter = Boolean(
      clusterArr.length > 0 ||
      sectionArr.length > 0 ||
      locationArr.length > 0 ||
      channelArr.length > 0 ||
      dash.Joining_DateFROM ||
      dash.Joining_DateTO
    );

    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/EmployeeMasterView`,
        {
          Loc_code: effectiveLocCode,
          branch: effectiveLocCode,
          Cluster: clusterArr.length > 0 ? clusterArr : null,
          cluster: clusterArr.length > 0 ? clusterArr : null,
          Br_Location: clusterArr.length > 0 ? clusterArr : null,
          br_location: clusterArr.length > 0 ? clusterArr : null,

          Section: sectionArr.length > 0 ? sectionArr : null,
          section: sectionArr.length > 0 ? sectionArr : null,

          Location: locationArr.length > 0 ? locationArr : null,
          location: locationArr.length > 0 ? locationArr : null,

          Channel: channelArr.length > 0 ? channelArr : null,
          channel: channelArr.length > 0 ? channelArr : null,

          Joining_DateFROM: dash.Joining_DateFROM || null,
          Joining_DateTO: dash.Joining_DateTO || null,
          empView: targetView,
          search: debouncedSearch,
          filters: {},
          pageSize: hasActiveFilter ? 10000 : 1,
          pageNo: 1,
        },
        {
          headers: { compcode: user?.Comp_Code, name: user?.name },
        }
      );

      const rawRows = res.data.Result || res.data.data || [];
      if (hasActiveFilter) {
        const filtered = filterRowsLocally(
          rawRows,
          clusterArr,
          sectionArr,
          locationArr,
          channelArr,
          dash,
          debouncedSearch
        );
        return filtered.length;
      }
      const count = Number(
        res.data.TotalCount ?? res.data.total ?? rawRows.length
      );
      return count;
    } catch (err) {
      console.error("Error in fetchCountOnly:", err);
      return 0;
    }
  };

  const refreshTabCounts = async (dash = dashbord) => {
    if (!user?.Comp_Code) return;
    try {
      const [ac, lc, alc] = await Promise.all([
        fetchCountOnly("ACTIVE", dash),
        fetchCountOnly("LEFT", dash),
        fetchCountOnly("ALL", dash),
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
    showapi("ACTIVE", 1, pageSize, {}, true);
    refreshTabCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.Comp_Code, user?.branch]);

  // =========================
  // Search filter: Auto fetch on typing
  // =========================
  const isInitialSearch = useRef(true);
  useEffect(() => {
    if (!user?.Comp_Code) return;
    if (isInitialSearch.current) {
      isInitialSearch.current = false;
      return;
    }
    setCurrentPage(1);
    showapi(empView, 1, pageSize, {}, true);
    refreshTabCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // =========================
  // Navigation / Redirection
  // =========================
  const doubleclick = (employee: any) => {
    const empCode =
      employee?.EMPCODE ||
      employee?.EmpCode ||
      employee?.empcode ||
      employee?.UTD;
    if (empCode) {
      router.push(`/payroll/masters/Employee_Master?UTD=${empCode}`);
    }
  };

  // =========================
  // Columns
  // =========================
  const columns = useMemo(
    () => [
      {
        Header: "Empcode",
        accessor: "EMPCODE",
        id: "EMPLOYEENAME",
        Cell: ({ value, row }: any) => {
          const val = row.original?.EMPCODE ?? value;
          if (!val) return renderDash();
          return (
            <span
              onClick={(e) => {
                e.stopPropagation();
                doubleclick(row.original);
              }}
              className="text-[#1E293B] dark:text-slate-200 font-normal text-[12.5px] hover:text-[#4F46E5] dark:hover:text-indigo-400 hover:underline cursor-pointer"
            >
              {String(val)}
            </span>
          );
        },
      },
      {
        Header: "Employee name",
        accessor: "EMPLOYEENAME",
        id: "emp_full_name",
        Cell: ({ value, row }: any) => {
          const val =
            row.original?.EMPLOYEENAME ||
            row.original?.Employee_Name ||
            row.original?.name ||
            value;
          if (!val) return renderDash();
          return (
            <span
              onClick={(e) => {
                e.stopPropagation();
                doubleclick(row.original);
              }}
              className="font-[600] text-[12.5px] text-[#1E293B] dark:text-slate-100 hover:text-[#4F46E5] dark:hover:text-indigo-400 hover:underline cursor-pointer"
            >
              {String(val)}
            </span>
          );
        },
      },
      { Header: "Gender", accessor: "GENDER", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Employee type", accessor: "EmployeeType", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Region", accessor: "region1", Cell: ({ value }: any) => formatCellText(value) },
      {
        Header: "Location",
        accessor: "Location",
        Cell: ({ value, row }: any) =>
          formatCellFromOptions(
            value ?? getRowLocation(row?.original),
            Location,
            dashbord.Location
          ),
      },
      { Header: "Department", accessor: "Department", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Employee designation", accessor: "EMPLOYEEDESIGNATION", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Joining date", accessor: "JOININGDATE", Cell: ({ value }: any) => formatCellDate(value) },
      { Header: "Punch code", accessor: "PUNCHCODE", Cell: ({ value }: any) => formatCellText(value) },
      { Header: "Payment mode", accessor: "PAYMENTMODE", Cell: ({ value }: any) => formatCellText(value) },
      {
        Header: "Section",
        accessor: "SECTION",
        Cell: ({ value, row }: any) =>
          formatCellFromOptions(
            value ?? getRowSection(row?.original),
            Section,
            dashbord.Section
          ),
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
      {
        Header: "Cluster",
        accessor: "CLUSTER",
        Cell: ({ value, row }: any) =>
          formatCellFromOptions(
            value ?? getRowCluster(row?.original),
            Br_Location,
            dashbord.Br_Location
          ),
      },
      {
        Header: "Channel",
        accessor: "CHANNEL",
        Cell: ({ value, row }: any) =>
          formatCellFromOptions(
            value ?? getRowChannel(row?.original),
            Channel,
            dashbord.Channel
          ),
      },
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
    [Location, Section, Br_Location, Channel, dashbord]
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
    const emptyDash = {
      Br_Location: "",
      Section: "",
      Location: "",
      Channel: "",
      Joining_DateFROM: "",
      Joining_DateTO: "",
    };
    setDashbord(emptyDash);
    setSearchInput("");
    setCurrentPage(1);
    showapi(empView, 1, pageSize, {}, true, emptyDash);
    refreshTabCounts(emptyDash);
  };

  const fetchAllForExport = async () => {
    if (allFilteredRowsRef.current.length > 0) {
      return allFilteredRowsRef.current;
    }
    const clusterArr = resolveOptionValues(Br_Location, dashbord.Br_Location);
    const sectionArr = resolveOptionValues(Section, dashbord.Section);
    const locationArr = resolveOptionValues(Location, dashbord.Location);
    const channelArr = resolveOptionValues(Channel, dashbord.Channel);

    const isAllBranchSelected = Boolean(
      dashbord.Location && String(dashbord.Location).trim().toUpperCase().startsWith("ALL")
    );

    let effectiveLocCode = user?.branch;
    if (isAllBranchSelected) {
      effectiveLocCode = user?.multi || user?.branch || "";
    } else if (locationArr.length > 0) {
      effectiveLocCode = locationArr.join(",");
    } else {
      effectiveLocCode = user?.branch;
    }

    const hasActiveFilter = Boolean(
      clusterArr.length > 0 ||
      sectionArr.length > 0 ||
      locationArr.length > 0 ||
      channelArr.length > 0 ||
      dashbord.Joining_DateFROM ||
      dashbord.Joining_DateTO
    );

    try {
      setIsLoading(true);
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/EmployeeMasterView`,
        {
          Loc_code: effectiveLocCode,
          branch: effectiveLocCode,
          Cluster: clusterArr.length > 0 ? clusterArr : null,
          cluster: clusterArr.length > 0 ? clusterArr : null,
          Br_Location: clusterArr.length > 0 ? clusterArr : null,
          br_location: clusterArr.length > 0 ? clusterArr : null,

          Section: sectionArr.length > 0 ? sectionArr : null,
          section: sectionArr.length > 0 ? sectionArr : null,

          Location: locationArr.length > 0 ? locationArr : null,
          location: locationArr.length > 0 ? locationArr : null,

          Channel: channelArr.length > 0 ? channelArr : null,
          channel: channelArr.length > 0 ? channelArr : null,

          Joining_DateFROM: dashbord.Joining_DateFROM || null,
          Joining_DateTO: dashbord.Joining_DateTO || null,
          empView: empView,
          search: debouncedSearch,
          filters: {},
          pageSize: 10000,
          pageNo: 1,
        },
        {
          headers: { compcode: user?.Comp_Code, name: user?.name },
        }
      );
      const rawRows = result.data.Result || result.data.data || [];
      if (hasActiveFilter) {
        return filterRowsLocally(
          rawRows,
          clusterArr,
          sectionArr,
          locationArr,
          channelArr,
          dashbord,
          debouncedSearch
        );
      }
      return rawRows;
    } catch (error) {
      console.error("Error exporting all data:", error);
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const handleTab = (next: "ACTIVE" | "LEFT" | "ALL") => {
    setTab(next);
    setEmpView(next);
    setCurrentPage(1);
    showapi(next, 1, pageSize, {}, true, dashbord);
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] dark:bg-[#07101F]">
      <HashloaderComponent isLoading={isLoading} />

      {/* BODY */}
      <div className="mx-auto max-w-[1380px] px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
        {/* Title + actions */}
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-end sm:justify-between mb-4">
          <div className="min-w-0">
            <h1 className="text-[21px] font-[650] tracking-[-0.02em] text-slate-900 dark:text-slate-100 leading-tight truncate">
              Employee master view
            </h1>
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mt-1">
              Manage your employee records ·{" "}
              <span className="font-[550] text-slate-900 dark:text-slate-200 tabular-nums">
                {totalCount}
              </span>{" "}
              rows in current filter
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-[3px] dark:border-slate-800 dark:bg-[#0E1524]">
              <button
                type="button"
                onClick={() => setView("table")}
                className={`h-auto px-[11px] py-[6px] rounded-[8px] text-[12px] font-[600] inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${view === "table"
                    ? "bg-[#4F46E5] text-white shadow-2xs"
                    : "bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800"
                  }`}
              >
                <Table2 className="h-3.5 w-3.5" />
                Table
              </button>
              <button
                type="button"
                onClick={() => setView("cards")}
                className={`h-auto px-[11px] py-[6px] rounded-[8px] text-[12px] font-[600] inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${view === "cards"
                    ? "bg-[#4F46E5] text-white shadow-2xs"
                    : "bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800"
                  }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Cards
              </button>
            </div>

            <button
              type="button"
              onClick={() => router.push("/payroll/masters/Employee_Master")}
              className="h-auto px-[14px] py-[8px] rounded-[10px] text-[12.5px] font-[600] bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-sm flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add employee</span>
            </button>

            <button
              type="button"
              onClick={() => history.back()}
              className="h-auto px-[12px] py-[8px] rounded-[10px] text-[12.5px] font-[550] border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          </div>
        </div>

        {/* Filters card */}
        <div className="filter-card-wrapper bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] p-3.5 sm:p-4 shadow-sm mb-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_1fr_150px_150px_auto] gap-3 items-end">
            <SelectSearch
              title="CLUSTER"
              name="Br_Location"
              options={Br_Location}
              selectedValue={dashbord.Br_Location}
              handleInputChange={(name, v) => {
                setDashbord((p) => ({ ...p, Br_Location: v }));
              }}
              placeholder="All cluster"
              ShortName
              className="!h-[38px] !rounded-[9px] dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 !text-[12.5px] font-medium w-full"
              labelClass="!text-[11px] !font-[600] !text-[#64748B] !tracking-[0.03em] !uppercase mb-1"
            />

            <SelectSearch
              title="BRANCH"
              name="Location"
              options={Location}
              selectedValue={dashbord.Location}
              handleInputChange={(name, v) => {
                setDashbord((p) => ({ ...p, Location: v }));
              }}
              placeholder="All branch"
              ShortName
              className="!h-[38px] !rounded-[9px] dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 !text-[12.5px] font-medium w-full"
              labelClass="!text-[11px] !font-[600] !text-[#64748B] !tracking-[0.03em] !uppercase mb-1"
            />

            <SelectSearch
              title="SECTION"
              name="Section"
              options={Section}
              selectedValue={dashbord.Section}
              handleInputChange={(name, v) => {
                setDashbord((p) => ({ ...p, Section: v }));
              }}
              placeholder="All section"
              ShortName
              className="!h-[38px] !rounded-[9px] dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 !text-[12.5px] font-medium w-full"
              labelClass="!text-[11px] !font-[600] !text-[#64748B] !tracking-[0.03em] !uppercase mb-1"
            />

            <SelectSearch
              title="CHANNEL"
              name="Channel"
              options={Channel}
              selectedValue={dashbord.Channel}
              handleInputChange={(name, v) => {
                setDashbord((p) => ({ ...p, Channel: v }));
              }}
              placeholder="All channel"
              ShortName
              className="!h-[38px] !rounded-[9px] dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 !text-[12.5px] font-medium w-full"
              labelClass="!text-[11px] !font-[600] !text-[#64748B] !tracking-[0.03em] !uppercase mb-1"
            />

            <Ainput
              title={empView === "LEFT" ? "LEFT FROM" : "JOINING FROM"}
              ShortName
              type="date"
              name="Joining_DateFROM"
              label={empView === "LEFT" ? "LEFT FROM" : "JOINING FROM"}
              value={
                dashbord.Joining_DateFROM
                  ? String(dashbord.Joining_DateFROM).slice(0, 10)
                  : ""
              }
              handleInputChange={(_, v) => {
                const next = v ? String(v).slice(0, 10) : "";
                setDashbord((p) => ({ ...p, Joining_DateFROM: next }));
              }}
              className="!h-[38px] !rounded-[9px] !text-[12.5px] font-medium w-full"
              labelClass="!text-[11px] !font-[600] !text-[#64748B] !tracking-[0.03em] !uppercase mb-1"
            />

            <Ainput
              title={empView === "LEFT" ? "LEFT TO" : "JOINING TO"}
              ShortName
              type="date"
              name="Joining_DateTO"
              label={empView === "LEFT" ? "LEFT TO" : "JOINING TO"}
              value={
                dashbord.Joining_DateTO
                  ? String(dashbord.Joining_DateTO).slice(0, 10)
                  : ""
              }
              handleInputChange={(_, v) => {
                const next = v ? String(v).slice(0, 10) : "";
                setDashbord((p) => ({ ...p, Joining_DateTO: next }));
              }}
              className="!h-[38px] !rounded-[9px] !text-[12.5px] font-medium w-full"
              labelClass="!text-[11px] !font-[600] !text-[#64748B] !tracking-[0.03em] !uppercase mb-1"
            />

            <div className="flex items-center gap-2 pb-0.5 col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-1">
              <button
                type="button"
                onClick={() => {
                  setCurrentPage(1);
                  showapi(empView, 1, pageSize, {}, true, dashbord);
                  refreshTabCounts(dashbord);
                }}
                className="h-[38px] px-4 rounded-[9px] bg-[#4F46E5] hover:bg-[#4338CA] text-white font-[600] text-[12.5px] shadow-2xs transition-all flex items-center justify-center cursor-pointer shrink-0"
              >
                Show
              </button>

              <button
                type="button"
                onClick={resetFilters}
                className="h-[38px] px-3.5 rounded-[9px] border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] text-slate-500 font-[550] text-[12.5px] shadow-2xs transition-all cursor-pointer dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 shrink-0"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Tabs + Columns */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5 mb-3.5">
          <div className="inline-flex items-center rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-[3px] dark:border-slate-800 dark:bg-[#0E1524] shadow-2xs max-w-full overflow-x-auto">
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
                  className={`h-auto px-[13px] py-[7px] rounded-[8px] text-[12.5px] font-[600] inline-flex items-center gap-1.5 transition-all shrink-0 cursor-pointer whitespace-nowrap ${isActive
                      ? "bg-[#4F46E5] text-white shadow-2xs"
                      : "bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800"
                    }`}
                >
                  <span>{t.label}</span>
                  <span className="text-[11px] font-[600] opacity-75 tabular-nums">
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-auto px-[12px] py-[8px] rounded-[10px] border border-[#E2E8F0] bg-white text-slate-700 hover:bg-[#F1F5F9] text-[12.5px] font-[550] inline-flex items-center gap-1.5 shadow-2xs transition-all dark:border-slate-800 dark:bg-[#0B1220] dark:text-slate-200 shrink-0 cursor-pointer"
            >
              <Columns3 className="h-4 w-4 text-slate-500" />
              <span>
                Columns{" "}
                <span className="text-slate-400 font-[550] text-[12.5px] tabular-nums">
                  11/25
                </span>
              </span>
            </button>
          </div>
        </div>

        {/* TABLE */}
        {view === "table" ? (
          <div className="employee-view-table rounded-[12px] border border-[#E2E8F0] bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-[#111827] w-full">
            <ServiceTablePagination
              title=""
              headerClassName="!text-[10.5px] !font-[700] !uppercase !tracking-[0.05em] !py-[11px] !px-[12px]"
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
              onRowDoubleClick={doubleclick}
              onExportAll={fetchAllForExport}
              onServerPageChange={(p, showLoader = true) => {
                setCurrentPage(p);
                showapi(empView, p, pageSize, {}, showLoader);
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
            onCardDoubleClick={doubleclick}
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

        /* Employee View Table - Exact match with HTML prototype */
        .employee-view-table {
          background: #ffffff !important;
          border: 1px solid #E2E8F0 !important;
          border-radius: 12px !important;
          box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 10px 26px -14px rgba(15,23,42,.14) !important;
        }

        .dark .employee-view-table {
          background: #111827 !important;
          border-color: #1F2937 !important;
        }

        /* Table Header */
        .employee-view-table table thead tr {
          background: #F8FAFC !important;
          border-bottom: 1px solid #E2E8F0 !important;
        }

        .dark .employee-view-table table thead tr {
          background: #0E1524 !important;
          border-bottom: 1px solid #1F2937 !important;
        }

        .employee-view-table table thead th {
          font-size: 10.5px !important;
          font-weight: 700 !important;
          letter-spacing: 0.05em !important;
          text-transform: uppercase !important;
          padding: 11px 12px !important;
          color: #64748B !important;
          white-space: nowrap !important;
        }

        .dark .employee-view-table table thead th {
          color: #94A3B8 !important;
        }

        /* Active/Sorted Column Header (EMPCODE) */
        .employee-view-table table thead th:first-child {
          color: #4F46E5 !important;
        }
        .dark .employee-view-table table thead th:first-child {
          color: #8B84FF !important;
        }
        .employee-view-table table thead th:first-child svg {
          color: #4F46E5 !important;
        }

        /* Table Body Rows and Cells */
        .employee-view-table table tbody tr {
          border-bottom: 1px solid #E2E8F0 !important;
        }

        .dark .employee-view-table table tbody tr {
          border-bottom: 1px solid #1F2937 !important;
        }

        .employee-view-table table tbody tr:hover {
          background-color: #F8FAFC !important;
        }

        .dark .employee-view-table table tbody tr:hover {
          background-color: #0E1524 !important;
        }

        .employee-view-table table tbody td {
          font-size: 12.5px !important;
          padding: 11px 12px !important;
          white-space: nowrap !important;
          color: #1E293B !important;
        }

        .dark .employee-view-table table tbody td {
          color: #E7ECF3 !important;
        }

        .employee-view-table table tbody td > div {
          font-size: 12.5px !important;
          line-height: normal !important;
        }

        /* Table Footer / Pagination */
        .employee-view-table .pagination-container,
        .employee-view-table table + div {
          font-size: 12px !important;
          color: #64748B !important;
          padding: 12px 18px !important;
          background: #F8FAFC !important;
          border-top: 1px solid #E2E8F0 !important;
        }

        .dark .employee-view-table .pagination-container,
        .dark .employee-view-table table + div {
          background: #0E1524 !important;
          border-top: 1px solid #1F2937 !important;
          color: #94A3B8 !important;
        }

        /* Filter Card input styling */
        .filter-card-wrapper input,
        .filter-card-wrapper select,
        .filter-card-wrapper div[role="button"],
        .filter-card-wrapper .custom-select-trigger {
          height: 38px !important;
          min-height: 38px !important;
          font-size: 12.5px !important;
          border-radius: 9px !important;
          border-color: #E2E8F0 !important;
        }

        .dark .filter-card-wrapper input,
        .dark .filter-card-wrapper select,
        .dark .filter-card-wrapper div[role="button"],
        .dark .filter-card-wrapper .custom-select-trigger {
          border-color: #1F2937 !important;
        }
      `}</style>
    </div>
  );
}