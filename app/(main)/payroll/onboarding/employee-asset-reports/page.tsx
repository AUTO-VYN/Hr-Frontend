"use client";

import React, {useState,useEffect,useMemo,useRef,useCallback} from "react"
import axios from "axios";
import {
  Users,
  Layers,
  Hourglass,
  AlertTriangle,
  Printer,
  FileSpreadsheet,
} from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import { formatDate, useDateRange } from "@/app/hooks/use-date-range";
import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import Printout from "@/components/atoms/Printout";
import Card from "@/components/Templates/card";
import DataTable from "@/components/Templates/reacttable";

type ReportType =
  | "EMPLOYEE_WISE"
  | "CATEGORY_WISE"
  | "ASSET_AGEING"
  | "NOT_RETURNED";

// Helper functions for date formatting and calculations
function formatDateDisplay(dStr?: string) {
  if (!dStr || dStr === "—" || dStr === "null") return "—";
  try {
    const d = new Date(dStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
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
      return `${day} ${month} ${year}`;
    }
  } catch {}
  return String(dStr);
}

function calculateAgeString(dateStr?: string) {
  if (!dateStr || dateStr === "—" || dateStr === "null") return "—";
  try {
    const issueDate = new Date(dateStr);
    if (isNaN(issueDate.getTime())) return "—";
    const now = new Date();
    let years = now.getFullYear() - issueDate.getFullYear();
    let months = now.getMonth() - issueDate.getMonth();
    let days = now.getDate() - issueDate.getDate();

    if (days < 0) {
      months--;
      days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    if (years > 0) return `${years} yr${years > 1 ? "s" : ""} ${months} mo`;
    if (months > 0) return `${months} mo`;
    return `${Math.max(days, 0)} days`;
  } catch {
    return "—";
  }
}

function calculateDaysOverdue(dateStr?: string) {
  if (!dateStr || dateStr === "—" || dateStr === "null") return 0;
  try {
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) return 0;
    const diff = Math.floor(
      (new Date().getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
    );
    return Math.max(diff, 0);
  } catch {
    return 0;
  }
}

// Reusable status badge with exact HTML colors and circle dot
function renderStatusBadge(status: string) {
  let tint = "#64748B"; // default returned
  if (status === "In use") tint = "#10B981";
  else if (status === "Overdue") tint = "#E11D48";
  else if (status === "Lost" || status === "Consumed") tint = "#F59E0B";
  else if (status === "Returned") tint = "#64748B";

  return (
    <span
      className="inline-flex items-center gap-[6px] text-[11px] font-[600] px-[8px] py-[4px] rounded-[8px] whitespace-nowrap"
      style={{
        color: tint,
        backgroundColor: `${tint}14`,
        border: `1px solid ${tint}55`,
      }}
    >
      <span
        className="w-[6px] h-[6px] rounded-full shrink-0"
        style={{ backgroundColor: tint }}
      />
      {status}
    </span>
  );
}




export default function EmployeeAssetReportsPage() {
  const user = useCurrentUser() as any;

const today = new Date();
const lastMonthThird = new Date(
  today.getFullYear(),
  today.getMonth() - 1,
  3
);
  const { DATE_FROM, DATE_TO } = useDateRange({
  defaultFrom: formatDate(lastMonthThird),
  defaultTo: formatDate(today),
  })
  const printRef = useRef<HTMLDivElement | null>(null);

  // Filter States
  const [dates, setDates] = useState({
    DATE_FROM: "",
    DATE_TO: "" 
  });

  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [activeReport, setActiveReport] = useState<ReportType>("EMPLOYEE_WISE");

  // Options from APIs
  const [branchOptions, setBranchOptions] = useState<
    { value: string; label: string }[]
  >([{ value: "ALL", label: "All branches" }]);
  const [categoryOptions, setCategoryOptions] = useState<
    { value: string; label: string }[]
  >([{ value: "ALL", label: "All categories" }]);

  // Raw API Data
  const [rawApiRecords, setRawApiRecords] = useState<any[]>([]);


  useEffect(() => {
  const formatInputDate = (value: any) => {
    if (!value) return "";

    const date = String(value).trim();

    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }

    // Convert DD-MM-YYYY to YYYY-MM-DD
    const match = date.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);

    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }

    return "";
  };

  setDates({
    DATE_FROM: formatInputDate(DATE_FROM),
    DATE_TO: formatInputDate(DATE_TO),
  });
}, [DATE_FROM, DATE_TO]);
  // ── 1. Fetch Masters (Branch/Locations & IT Categories) from API ────────────
  useEffect(() => {
    if (!user?.Comp_Code) return;

    const fetchMasters = async () => {
      try {
        const [mastersRes, itRes] = await Promise.all([
          axios
            .post(
              `${process.env.NEXT_PUBLIC_URL}/hrmsreport/findMasters`,
              { multiloc: user?.branch },
              {
                headers: {
                  compcode: user?.Comp_Code,
                  name: user?.name,
                },
              },
            )
            .catch(() => null),
          axios
            .post(
              `${process.env.NEXT_PUBLIC_URL}/employee/getItCategoryOptions`,
              {},
              {
                headers: {
                  compcode: user?.Comp_Code,
                },
              },
            )
            .catch(() => null),
        ]);

        // Branch options
        const locList =
          mastersRes?.data?.data?.Location?.[0] ||
          mastersRes?.data?.data?.Location ||
          [];
        if (Array.isArray(locList) && locList.length > 0) {
          const mappedBranches = locList.map((loc: any) => ({
            value: String(loc.Loc_Code || loc.value || loc),
            label: String(loc.Loc_Desc || loc.label || loc),
          }));
          setBranchOptions([
            { value: "ALL", label: "All branches" },
            ...mappedBranches,
          ]);
        }

        // Category options
        const itList = itRes?.data?.data || [];
        if (Array.isArray(itList) && itList.length > 0) {
          const mappedCategories = itList.map((cat: any) => ({
            value: String(cat.value || cat.label || cat),
            label: String(cat.label || cat.value || cat),
          }));
          setCategoryOptions([
            { value: "ALL", label: "All categories" },
            ...mappedCategories,
          ]);
        }
      } catch (err) {
        console.error("Error fetching report masters:", err);
      }
    };

    fetchMasters();
  }, [user?.Comp_Code, user?.branch, user?.name]);

  // ── 2. Fetch Live Asset Report Data from API ───────────────────────────────
  const fetchReportData = useCallback(async () => {
    if (!user?.Comp_Code) return;

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/template/AssetEmpReport`,
        {
          dateFrom: dates.DATE_FROM,
          dateto: dates.DATE_TO,
          branch: selectedBranch === "ALL" ? "" : selectedBranch,
          category: selectedCategory === "ALL" ? "" : selectedCategory,
          flag: "1",
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        },
      );

      const records =
        response.data?.data?.records ||
        response.data?.data?.AssetDetails ||
        response.data?.data ||
        [];

      if (Array.isArray(records)) {
        setRawApiRecords(records);
      } else {
        setRawApiRecords([]);
      }
    } catch (err) {
      console.error("Error fetching asset report data:", err);
      setRawApiRecords([]);
    }
  }, [
    user?.Comp_Code,
    user?.name,
    dates.DATE_FROM,
    dates.DATE_TO,
    selectedBranch,
    selectedCategory,
  ]);

  useEffect(() => {
    if (user?.Comp_Code) {
      fetchReportData();
    }
  }, [user?.Comp_Code, fetchReportData]);

  const handleDateChange = (name: string, value: any) => {
    setDates((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleExport = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_URL}/template/AssetEmpReport?dateFrom=${dates.DATE_FROM}&dateto=${dates.DATE_TO}&compcode=${user?.Comp_Code}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const formatShortDate = (dStr?: string) => {
    if (!dStr) return "";
    if (dStr.includes("-")) {
      const parts = dStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return dStr;
  };

  // ── 3. Dynamically Generate 4 Reports from API Records ────────────────────

  // 1. Employee wise asset report
  const employeeWiseData = useMemo(() => {
    if (!rawApiRecords.length) return [];

    const empMap = new Map<string, any>();

    rawApiRecords.forEach((item: any) => {
      const empCode = item.Emp_Code || item.EMP_CODE || "—";
      const empName = item.EMP_NAME || "—";
      const department = item.DEVISION || item.Department || "—";
      const price = Number(
        item.Asset_Price || item.Price || item.price || item.Value || 0,
      );
      const isReturned = Boolean(
        item.Revoke_Date && item.Revoke_Date !== "null",
      );
      const isLost = Boolean(item.Lost_Date && item.Lost_Date !== "null");
      const issueDate = item.Issue_Date;

      if (!empMap.has(empCode)) {
        empMap.set(empCode, {
          Emp_Code: empCode,
          EMP_NAME: empName,
          DEVISION: department,
          assetsHeld: 0,
          totalValueNum: 0,
          oldestIssueDate: issueDate || null,
          hasOverdue: false,
          hasActive: false,
        });
      }

      const empEntry = empMap.get(empCode);
      if (!isReturned && !isLost) {
        empEntry.assetsHeld += 1;
        empEntry.hasActive = true;
      }
      empEntry.totalValueNum += price;

      if (issueDate) {
        if (
          !empEntry.oldestIssueDate ||
          new Date(issueDate) < new Date(empEntry.oldestIssueDate)
        ) {
          empEntry.oldestIssueDate = issueDate;
        }
      }

      if (item.LASTWOR_NEWDATE && !isReturned) {
        empEntry.hasOverdue = true;
      }
    });

    return Array.from(empMap.values()).map((emp) => {
      let status = "Returned";
      if (emp.hasOverdue) status = "Overdue";
      else if (emp.hasActive || emp.assetsHeld > 0) status = "In use";

      return {
        Emp_Code: emp.Emp_Code,
        EMP_NAME: emp.EMP_NAME,
        DEVISION: emp.DEVISION,
        assetsHeld: emp.assetsHeld,
        totalValue: `₹ ${emp.totalValueNum.toLocaleString("en-IN")}`,
        oldestIssue: emp.oldestIssueDate
          ? formatDateDisplay(emp.oldestIssueDate)
          : "—",
        status,
      };
    });
  }, [rawApiRecords]);

  // 2. Category wise stock report
  const categoryWiseData = useMemo(() => {
    if (!rawApiRecords.length) return [];

    const catMap = new Map<string, any>();

    rawApiRecords.forEach((item: any) => {
      const category = item.Asset_category || item.It_category || "General";
      const isReturned = Boolean(
        item.Revoke_Date && item.Revoke_Date !== "null",
      );
      const isLost = Boolean(item.Lost_Date && item.Lost_Date !== "null");
      const price = Number(
        item.Asset_Price || item.Price || item.price || item.Value || 0,
      );

      if (!catMap.has(category)) {
        catMap.set(category, {
          Asset_category: category,
          totalAssets: 0,
          issued: 0,
          inStore: 0,
          underRepair: 0,
          totalValueNum: 0,
        });
      }

      const catEntry = catMap.get(category);
      catEntry.totalAssets += 1;
      catEntry.totalValueNum += price;

      if (!isReturned && !isLost && item.Emp_Code) {
        catEntry.issued += 1;
      } else if (isReturned) {
        catEntry.inStore += 1;
      } else if (
        item.status === "Under Repair" ||
        item.Status === "Under Repair"
      ) {
        catEntry.underRepair += 1;
      } else {
        catEntry.inStore += 1;
      }
    });

    return Array.from(catMap.values()).map((c) => ({
      Asset_category: c.Asset_category,
      totalAssets: c.totalAssets,
      issued: c.issued,
      inStore: c.inStore,
      underRepair: c.underRepair,
      value: `₹ ${c.totalValueNum.toLocaleString("en-IN")}`,
    }));
  }, [rawApiRecords]);

  // 3. Asset ageing report
  const assetAgeingData = useMemo(() => {
    if (!rawApiRecords.length) return [];

    return rawApiRecords.map((item: any) => {
      const isReturned = Boolean(
        item.Revoke_Date && item.Revoke_Date !== "null",
      );
      const isLost = Boolean(item.Lost_Date && item.Lost_Date !== "null");
      const isConsumable =
        item.Asset_Type === "Consumable" || item.assetType === "Consumable";
      const issueDate = item.Issue_Date;

      let status = "In use";
      if (isReturned) status = "Returned";
      else if (isLost) status = "Lost";
      else if (isConsumable) status = "Consumed";
      else if (item.LASTWOR_NEWDATE) status = "Overdue";

      return {
        Aset_Code: item.Aset_Code || "—",
        Aset_Name: item.Aset_Name || "Asset",
        Asset_category: item.Asset_category || item.It_category || "General",
        EMP_NAME: item.EMP_NAME || item.Emp_Code || "Store",
        age: calculateAgeString(issueDate),
        status,
      };
    });
  }, [rawApiRecords]);

  // 4. Not returned report
  const notReturnedData = useMemo(() => {
    if (!rawApiRecords.length) return [];

    return rawApiRecords
      .filter((item: any) => {
        const isReturned = Boolean(
          item.Revoke_Date && item.Revoke_Date !== "null",
        );
        const isLost = Boolean(item.Lost_Date && item.Lost_Date !== "null");
        const hasLeftDate = Boolean(
          item.LASTWOR_NEWDATE && item.LASTWOR_NEWDATE !== "null",
        );
        return (!isReturned && hasLeftDate) || isLost;
      })
      .map((item: any) => {
        const isLost = Boolean(item.Lost_Date && item.Lost_Date !== "null");
        const lastWorkDate = item.LASTWOR_NEWDATE;
        const issueDate = item.Issue_Date;

        return {
          Emp_Code: item.Emp_Code || item.EMP_CODE || "—",
          EMP_NAME: item.EMP_NAME || "—",
          Aset_Name: item.Aset_Name || "Asset",
          issuedOn: formatDateDisplay(issueDate),
          lastWorkDate: formatDateDisplay(lastWorkDate),
          daysOverdue: calculateDaysOverdue(lastWorkDate),
          status: isLost ? "Lost" : "Overdue",
        };
      });
  }, [rawApiRecords]);

  // ── Column Definitions ────────────────────────────────────────────────────
  const employeeWiseColumns = useMemo(
    () => [
      {
        Header: "EMP CODE",
        accessor: "Emp_Code",
        width: 150,
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: "EMP_NAME",
        width: 180,
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
            {value}
          </span>
        ),
      },
      {
        Header: "DEPARTMENT",
        accessor: "DEVISION",
        width: 150,
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value}
          </span>
        ),
      },
      {
        Header: "ASSETS HELD",
        accessor: "assetsHeld",
        width: 120,
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value}
          </span>
        ),
      },
      {
        Header: "TOTAL VALUE",
        accessor: "totalValue",
        width: 140,
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value}
          </span>
        ),
      },
      {
        Header: "OLDEST ISSUE",
        accessor: "oldestIssue",
        width: 150,
        Cell: ({ value }: any) => (
          <span
            className={`text-[12.5px] font-[400] ${
              value === "—"
                ? "text-[#64748B] dark:text-[#94A3B8]"
                : "text-[#1E293B] dark:text-[#E7ECF3]"
            }`}
          >
            {value}
          </span>
        ),
      },
      {
        Header: "STATUS",
        accessor: "status",
        width: 150,
        Cell: ({ value }: any) => renderStatusBadge(value),
      },
    ],
    [],
  );

  const categoryWiseColumns = useMemo(
    () => [
      {
        Header: "CATEGORY",
        accessor: "Asset_category",
        width: 190,
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
            {value}
          </span>
        ),
      },
      {
        Header: "TOTAL ASSETS",
        accessor: "totalAssets",
        width: 140,
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value}
          </span>
        ),
      },
      {
        Header: "ISSUED",
        accessor: "issued",
        width: 120,
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value}
          </span>
        ),
      },
      {
        Header: "IN STORE",
        accessor: "inStore",
        width: 120,
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value}
          </span>
        ),
      },
      {
        Header: "UNDER REPAIR",
        accessor: "underRepair",
        width: 140,
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value}
          </span>
        ),
      },
      {
        Header: "VALUE",
        accessor: "value",
        width: 150,
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value}
          </span>
        ),
      },
    ],
    [],
  );

  const assetAgeingColumns = useMemo(
    () => [
      {
        Header: "ASSET CODE",
        accessor: "Aset_Code",
        width: 160,
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value}
          </span>
        ),
      },
      {
        Header: "ASSET NAME",
        accessor: "Aset_Name",
        width: 220,
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
            {value}
          </span>
        ),
      },
      {
        Header: "CATEGORY",
        accessor: "Asset_category",
        width: 160,
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value}
          </span>
        ),
      },
      {
        Header: "HOLDER",
        accessor: "EMP_NAME",
        width: 170,
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value}
          </span>
        ),
      },
      {
        Header: "AGE",
        accessor: "age",
        width: 110,
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value}
          </span>
        ),
      },
      {
        Header: "STATUS",
        accessor: "status",
        width: 140,
        Cell: ({ value }: any) => renderStatusBadge(value),
      },
    ],
    [],
  );

  const notReturnedColumns = useMemo(
    () => [
      {
        Header: "EMP CODE",
        accessor: "Emp_Code",
        width: 150,
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: "EMP_NAME",
        width: 180,
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
            {value}
          </span>
        ),
      },
      {
        Header: "ASSET",
        accessor: "Aset_Name",
        width: 220,
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value}
          </span>
        ),
      },
      {
        Header: "ISSUED ON",
        accessor: "issuedOn",
        width: 140,
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value}
          </span>
        ),
      },
      {
        Header: "LAST WORK DATE",
        accessor: "lastWorkDate",
        width: 150,
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value}
          </span>
        ),
      },
      {
        Header: "DAYS OVERDUE",
        accessor: "daysOverdue",
        width: 140,
        Cell: ({ value }: any) => (
          <span className="text-[12.5px] font-[400] text-[#1E293B] dark:text-[#E7ECF3]">
            {value}
          </span>
        ),
      },
      {
        Header: "STATUS",
        accessor: "status",
        width: 130,
        Cell: ({ value }: any) => renderStatusBadge(value),
      },
    ],
    [],
  );

  // Active Report Meta
  const activeReportMeta = useMemo(() => {
    switch (activeReport) {
      case "EMPLOYEE_WISE":
        return {
          title: "Employee wise asset report",
          subtitle: `${employeeWiseData.length} rows · ${formatShortDate(dates.DATE_FROM)} – ${formatShortDate(dates.DATE_TO)}`,
          columns: employeeWiseColumns,
          data: employeeWiseData,
          footerNote:
            "Employee-wise holding, valued at purchase cost. Overdue = asset not returned after the last working date.",
        };
      case "CATEGORY_WISE":
        return {
          title: "Category wise stock report",
          subtitle: `${categoryWiseData.length} rows · ${formatShortDate(dates.DATE_FROM)} – ${formatShortDate(dates.DATE_TO)}`,
          columns: categoryWiseColumns,
          data: categoryWiseData,
          footerNote:
            "Category-wise stock position as on the end date of the selected range.",
        };
      case "ASSET_AGEING":
        return {
          title: "Asset ageing report",
          subtitle: `${assetAgeingData.length} rows · ${formatShortDate(dates.DATE_FROM)} – ${formatShortDate(dates.DATE_TO)}`,
          columns: assetAgeingColumns,
          data: assetAgeingData,
          footerNote:
            "Assets older than 4 years are due for replacement as per the IT policy.",
        };
      case "NOT_RETURNED":
        return {
          title: "Not returned report",
          subtitle: `${notReturnedData.length} rows · ${formatShortDate(dates.DATE_FROM)} – ${formatShortDate(dates.DATE_TO)}`,
          columns: notReturnedColumns,
          data: notReturnedData,
          footerNote:
            "Recovery of these assets should be settled before the full and final payout.",
        };
    }
  }, [
    activeReport,
    dates,
    employeeWiseData,
    employeeWiseColumns,
    categoryWiseData,
    categoryWiseColumns,
    assetAgeingData,
    assetAgeingColumns,
    notReturnedData,
    notReturnedColumns,
  ]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1C] text-[#1E293B] dark:text-[#E7ECF3] font-['Inter',system-ui,sans-serif] [font-feature-settings:'tnum'_1] antialiased">
      <main className="p-[22px_24px_60px_24px] max-w-full">
        {/* ── 1. PAGE HEADER ────────────────────────────────────────────── */}
        <div className="mb-[18px]">
          <h1 className="m-0 text-[21px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
            Asset reports
          </h1>
          <p className="m-0 mt-[5px] text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
            Pick a period, choose a report, and export. Everything below
            reflects the selected date range.
          </p>
        </div>

        {/* ── 2. FILTER BAR ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] p-[14px_18px_16px_18px] mb-[14px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[180px_180px_minmax(0,1fr)_minmax(0,1fr)_auto] gap-[12px] items-end">
            {/* Date From */}
            <div className="min-w-0">
              <Einput
                title="Date from"
                ShortName={true}
                type="date"
                name="DATE_FROM"
                value={dates.DATE_FROM}
                handleInputChange={handleDateChange}
                labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3] w-full"
              />
            </div>

            {/* Date To */}
            <div className="min-w-0">
              <Einput
                title="Date to"
                ShortName={true}
                type="date"
                name="DATE_TO"
                value={dates.DATE_TO}
                handleInputChange={handleDateChange}
                labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3] w-full"
              />
            </div>

            {/* Branch */}
            <div className="min-w-0">
              <Eselect
                title="Branch"
                ShortName={true}
                name="branch"
                option={branchOptions}
                initialValue={selectedBranch}
                handleInputChange={(_, val) => setSelectedBranch(val)}
                placeholder="All branches"
                labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3] w-full"
              />
            </div>

            {/* Category */}
            <div className="min-w-0">
              <Eselect
                title="Category"
                ShortName={true}
                name="category"
                option={categoryOptions}
                initialValue={selectedCategory}
                handleInputChange={(_, val) => setSelectedCategory(val)}
                placeholder="All categories"
                labelClassName="!text-[11px] !font-[600] !text-[#64748B] dark:!text-[#94A3B8] !tracking-[0.03em] !uppercase"
                className="!h-[38px] !text-[12.5px] !rounded-[9px] !border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] !text-[#1E293B] dark:!text-[#E7ECF3] w-full"
              />
            </div>

            {/* Export Button */}
            <div className="min-w-0">
              <AButton
                type="button"
                variant="primary"
                size="sm"
                icon={<FileSpreadsheet className="w-4 h-4" />}
                onClick={handleExport}
                className="!bg-[#4F46E5] hover:!bg-[#4338CA] text-white !h-[38px] px-[17px] text-[12.5px] font-[600] !rounded-[9px] cursor-pointer whitespace-nowrap shadow-none border-transparent w-full sm:w-auto"
              >
                Export
              </AButton>
            </div>
          </div>
        </div>

        {/* ── 3. FOUR REPORT SELECTION CARDS ───────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[14px] mb-[16px]">
          {/* Card 1: Employee wise asset */}
          <button
            type="button"
            onClick={() => setActiveReport("EMPLOYEE_WISE")}
            className={`text-left bg-white dark:bg-[#111827] rounded-[12px] p-[15px_16px_16px_16px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] cursor-pointer transition-all border-t-[3px] border-t-[#4F46E5] ${
              activeReport === "EMPLOYEE_WISE"
                ? "border border-[#4F46E5] dark:border-[#8B84FF]"
                : "border border-[#E2E8F0] dark:border-[#1F2937] hover:border-[#4F46E5]"
            }`}
          >
            <div className="flex items-center gap-[9px]">
              <span className="w-[26px] h-[26px] rounded-[8px] flex items-center justify-center shrink-0 bg-[#4F46E5]/10 text-[#4F46E5]">
                <Users className="w-3.5 h-3.5" />
              </span>
              <span className="text-[13px] font-[600] text-[#1E293B] dark:text-[#E7ECF3] flex-1 min-w-0 truncate">
                Employee wise asset
              </span>
            </div>
            <div className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-[9px] leading-[1.5]">
              What each employee is holding right now, with value.
            </div>
            <div className="flex items-baseline gap-[6px] mt-[11px]">
              <span className="text-[19px] font-[650] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                {employeeWiseData.length}
              </span>
              <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                employees
              </span>
            </div>
          </button>

          {/* Card 2: Category wise stock */}
          <button
            type="button"
            onClick={() => setActiveReport("CATEGORY_WISE")}
            className={`text-left bg-white dark:bg-[#111827] rounded-[12px] p-[15px_16px_16px_16px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] cursor-pointer transition-all border-t-[3px] border-t-[#0D9488] ${
              activeReport === "CATEGORY_WISE"
                ? "border border-[#4F46E5] dark:border-[#8B84FF]"
                : "border border-[#E2E8F0] dark:border-[#1F2937] hover:border-[#4F46E5]"
            }`}
          >
            <div className="flex items-center gap-[9px]">
              <span className="w-[26px] h-[26px] rounded-[8px] flex items-center justify-center shrink-0 bg-[#0D9488]/10 text-[#0D9488]">
                <Layers className="w-3.5 h-3.5" />
              </span>
              <span className="text-[13px] font-[600] text-[#1E293B] dark:text-[#E7ECF3] flex-1 min-w-0 truncate">
                Category wise stock
              </span>
            </div>
            <div className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-[9px] leading-[1.5]">
              Issued, in store and under repair, by asset category.
            </div>
            <div className="flex items-baseline gap-[6px] mt-[11px]">
              <span className="text-[19px] font-[650] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                {categoryWiseData.length}
              </span>
              <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                categories
              </span>
            </div>
          </button>

          {/* Card 3: Asset ageing */}
          <button
            type="button"
            onClick={() => setActiveReport("ASSET_AGEING")}
            className={`text-left bg-white dark:bg-[#111827] rounded-[12px] p-[15px_16px_16px_16px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] cursor-pointer transition-all border-t-[3px] border-t-[#F59E0B] ${
              activeReport === "ASSET_AGEING"
                ? "border border-[#4F46E5] dark:border-[#8B84FF]"
                : "border border-[#E2E8F0] dark:border-[#1F2937] hover:border-[#4F46E5]"
            }`}
          >
            <div className="flex items-center gap-[9px]">
              <span className="w-[26px] h-[26px] rounded-[8px] flex items-center justify-center shrink-0 bg-[#F59E0B]/10 text-[#F59E0B]">
                <Hourglass className="w-3.5 h-3.5" />
              </span>
              <span className="text-[13px] font-[600] text-[#1E293B] dark:text-[#E7ECF3] flex-1 min-w-0 truncate">
                Asset ageing
              </span>
            </div>
            <div className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-[9px] leading-[1.5]">
              How old each asset is, oldest first — drives replacement.
            </div>
            <div className="flex items-baseline gap-[6px] mt-[11px]">
              <span className="text-[19px] font-[650] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                {assetAgeingData.length}
              </span>
              <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                assets
              </span>
            </div>
          </button>

          {/* Card 4: Not returned */}
          <button
            type="button"
            onClick={() => setActiveReport("NOT_RETURNED")}
            className={`text-left bg-white dark:bg-[#111827] rounded-[12px] p-[15px_16px_16px_16px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] cursor-pointer transition-all border-t-[3px] border-t-[#E11D48] ${
              activeReport === "NOT_RETURNED"
                ? "border border-[#4F46E5] dark:border-[#8B84FF]"
                : "border border-[#E2E8F0] dark:border-[#1F2937] hover:border-[#4F46E5]"
            }`}
          >
            <div className="flex items-center gap-[9px]">
              <span className="w-[26px] h-[26px] rounded-[8px] flex items-center justify-center shrink-0 bg-[#E11D48]/10 text-[#E11D48]">
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
              <span className="text-[13px] font-[600] text-[#1E293B] dark:text-[#E7ECF3] flex-1 min-w-0 truncate">
                Not returned
              </span>
            </div>
            <div className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] mt-[9px] leading-[1.5]">
              Assets still out after the employee&apos;s last working date.
            </div>
            <div className="flex items-baseline gap-[6px] mt-[11px]">
              <span className="text-[19px] font-[650] tabular-nums text-[#1E293B] dark:text-[#E7ECF3]">
                {notReturnedData.length}
              </span>
              <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                open cases
              </span>
            </div>
          </button>
        </div>

        {/* ── 4. REPORT DATA TABLE SECTION ──────────────────────────────── */}
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1F2937] rounded-[12px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] overflow-hidden">
          {/* Table Header Bar */}
          <div className="flex items-center gap-[10px] p-[13px_18px] border-b border-[#E2E8F0] dark:border-[#1F2937]">
            <h2 className="m-0 text-[14px] font-[600] text-[#1E293B] dark:text-[#E7ECF3]">
              {activeReportMeta.title}
            </h2>
            <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8] tabular-nums">
              {activeReportMeta.subtitle}
            </span>
            <div className="flex-1" />
            <AButton
              type="button"
              variant="outline"
              size="sm"
              icon={<Printer className="w-3.5 h-3.5" />}
              onClick={handlePrint}
              className="!bg-transparent hover:!bg-[#F1F5F9] dark:hover:!bg-[#182235] !border-[#E2E8F0] dark:!border-[#1F2937] !text-[#1E293B] dark:!text-[#E7ECF3] !text-[12px] !font-[550] !px-[11px] !py-[6px] !h-auto !rounded-[8px] cursor-pointer shadow-none flex items-center gap-[6px]"
            >
              Print
            </AButton>
          </div>

          {/* Table Content */}
          <div className="w-full overflow-x-auto [&_thead]:!bg-[#F8FAFC] dark:[&_thead]:!bg-[#0E1524] [&_th]:!bg-[#F8FAFC] dark:[&_th]:!bg-[#0E1524] [&_th]:!border-b [&_th]:!border-[#E2E8F0] dark:[&_th]:!border-[#1F2937] [&_th]:!py-[10px] [&_th]:!px-[12px] [&_th]:!text-[10.5px] [&_th]:!font-[700] [&_th]:!tracking-[0.05em] [&_th]:!uppercase [&_th]:!text-[#64748B] dark:[&_th]:!text-[#94A3B8] [&_td]:!py-[11px] [&_td]:!px-[12px] [&_td]:!border-b [&_td]:!border-[#E2E8F0] dark:[&_td]:!border-[#1F2937] [&_tr:hover]:!bg-[#F8FAFC] dark:[&_tr:hover]:!bg-[#0E1524]">
            <DataTable
              columns={activeReportMeta.columns}
              data={activeReportMeta.data}
              showTopSearch={false}
              showExcelExport={false}
              initialPageSize={50}
              headerClassName="!bg-[#F8FAFC] dark:!bg-[#0E1524] !py-[10px] !px-[12px] !text-[10.5px] !font-[700] !tracking-[0.05em] !uppercase !text-[#64748B] dark:!text-[#94A3B8]"
            />
          </div>

          {/* Footer Notice / Remark */}
          <div className="flex items-center gap-[12px] p-[12px_18px] border-t border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0E1524] text-[12px] text-[#64748B] dark:text-[#94A3B8]">
            <span>{activeReportMeta.footerNote}</span>
          </div>
        </div>

        {/* Hidden Printout Component for print engine integration */}
        <div className="hidden">
          <Printout ref={printRef} />
          <Card />
        </div>
      </main>
    </div>
  );
}
