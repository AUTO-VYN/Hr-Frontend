"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import ExcelJS from "exceljs";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import Eselect from "@/components/atoms/Eselect";
import Einput from "@/components/atoms/Einput";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";
import AButton from "@/components/atoms/Button";

/* ------------------------------------------------------------------ */
/* CONFIGURATION                                                       */
/* ------------------------------------------------------------------ */

const API_URL = process.env.NEXT_PUBLIC_URL;

const EMPLOYEE_ALL_ENDPOINT = "/employee/all";
const TDS_EMPLOYEE_ENDPOINT = "/tds/employee";
const TDS_SAVE_ENDPOINT = "/tds/savetds";
const TDS_UPDATE_ENDPOINT = "/tds/updatetds";

type Option = { value: string; label: string };
type TableRow = Record<string, any>;
type TDSForm = Record<string, any>;

const Tax_Slab: Option[] = [
  { label: "2024-25 Rate", value: "0" },
  { label: "New Rate (2023-24)", value: "1" },
  { label: "Old Rate (2017-18 to 2022-23)", value: "2" },
];

const RESIDENCE_OPTIONS: Option[] = [
  { label: "Metro", value: "METRO" },
  { label: "Other", value: "OTHER" },
];

const MONTH_NAMES = [
  "Apr",
  "May",
  "June",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
];

const COLUMN_KEYS = Array.from(
  { length: 14 },
  (_, i) => `_${String(i + 1).padStart(2, "0")}`,
);

const makeInitialTable = (): TableRow[] =>
  MONTH_NAMES.map((Month, i) => ({
    ...Object.fromEntries(COLUMN_KEYS.map((k) => [k, "0.00"])),
    Month,
    MonthOrder: i + 4,
  }));

const zeros = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, 0]));
const pad = (prefix: string, count: number) =>
  Array.from(
    { length: count },
    (_, i) => `${prefix}${String(i + 1).padStart(2, "0")}`,
  );

const initialData: TDSForm = {
  Tran_Id: null,
  Emp_Code: "",
  Emp_Name: "",
  PAN_No: null,
  Designation: null,
  BrLocation: null,
  Residence: "OTHER",
  Salaried: "",
  Emp_Add: null,
  Landlord_PAN: "",
  PF: null,
  Age: 0,
  ...zeros([
    ...pad("Inv_", 9),
    "Inv_10_1",
    "Inv_10_2",
    "Inv_11",
    "Inv_12_1",
    "Inv_12_2",
    "Inv_13_1",
    "Inv_13_2",
    ...pad("Inc_", 29),
    "Ded_80C_1",
    "Ded_80C_2",
    "Ded_80D_1",
    "Ded_80D_2",
  ]),
  Ded_80G_Head: "0",
  ...zeros([
    "Ded_80G_1",
    "Ded_80G_2",
    "Totl_Ded",
    "Net_Inc_1",
    "Net_Inc_2",
    "Tax_Payable",
    "Rebate_87A",
    "Surcharge",
    "Edu_Cess",
    "Totl_Tax",
    "TDS_Deducation",
    "Bal_Tax",
    "Avg_Tds",
  ]),
  FY_Mnth: "", // "" = use remaining months of the current FY
  Tax_Slab: "0",
  StandardDed: "-70000.00",
  Loc_Code: null,
  USR_Code: 0,
  Export_Type: "1",
  ENTR_DATE: "",
  ENTR_TIME: 0,
  MOD_USER: 0,
  MOD_DATE: "",
  MOD_TIME: 0,
};

/* ------------------------------------------------------------------ */
/* HELPERS                                                             */
/* ------------------------------------------------------------------ */

const getApiError = (error: any) =>
  error?.response?.data?.message ||
  error?.response?.data?.Message ||
  error?.response?.data?.error ||
  error?.message ||
  "Something went wrong. Please try again.";

const toast = (
  icon: "error" | "warning" | "info" | "success",
  title: string,
  timer = 2000,
) =>
  Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    showConfirmButton: false,
    timer,
  });

const P = (v: any) => parseFloat(String(v ?? "").replace(/,/g, "")) || 0;

const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;
const fmt = (v: number) => Math.round(v).toLocaleString("en-IN");

const fmtTotal = (v: number) =>
  v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const convertTimeToDecimal = (date: Date) => {
  const [h, m, s] = date.toTimeString().split(" ")[0].split(":").map(Number);
  return h + m / 60 + s / 3600;
};

const getCurrentFinancialYear = () => {
  const now = new Date();
  return now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
};

const generateFinancialYears = (): Option[] => {
  const currentYear = getCurrentFinancialYear() + 1;
  return Array.from({ length: 5 }, (_, i) => {
    const startYear = currentYear - i;
    return { value: `${startYear}`, label: `${startYear}-${startYear + 1}` };
  });
};

const FY_OPTIONS = generateFinancialYears();

const calculateRemainingMonths = () => {
  const currentMonth = new Date().getMonth() + 1;
  const remaining = (3 + 12 - currentMonth + 1) % 12;
  return remaining > 0 ? remaining : 0;
};

/** Monthly HRA exemption = min(HRA received, rent - 10% basic, 50%/40% basic) */
const calcHraExempt = (row: TableRow, residence: string) => {
  const basic = P(row._01);
  const hra = P(row._02);
  const rent = P(row._03);
  if (rent <= 0 || hra <= 0) return 0;
  const percent = residence === "METRO" ? 0.5 : 0.4;
  return Math.max(0, Math.min(hra, rent - 0.1 * basic, percent * basic));
};

/* ---- slab calculations (same logic as the existing page) ---- */

const taxOld = (age: number, net: number) => {
  if (age > 79) {
    if (net <= 500000) return 0;
    if (net <= 1000000) return (net - 500000) * 0.2;
    return (net - 1000000) * 0.3 + 100000;
  }
  if (age > 59) {
    if (net <= 300000) return 0;
    if (net <= 500000) return (net - 300000) * 0.05;
    if (net <= 1000000) return (net - 500000) * 0.2 + 10000;
    return (net - 1000000) * 0.3 + 110000;
  }
  if (net <= 250000) return 0;
  if (net <= 500000) return (net - 250000) * 0.05;
  if (net <= 1000000) return (net - 500000) * 0.2 + 12500;
  return (net - 1000000) * 0.3 + 112500;
};

const taxNewRate = (net: number) => {
  if (net <= 250000) return 0;
  if (net <= 500000) return (net - 250000) * 0.05;
  if (net <= 750000) return (net - 500000) * 0.1 + 12500;
  if (net <= 1000000) return (net - 750000) * 0.15 + 25000;
  if (net <= 1250000) return (net - 1000000) * 0.2 + 62500;
  if (net <= 1500000) return (net - 1250000) * 0.25 + 112500;
  return (net - 1500000) * 0.3 + 175000;
};

const tax2425 = (net: number) => {
  if (net <= 300000) return 0;
  if (net <= 700000) return (net - 300000) * 0.05;
  if (net <= 1000000) return (net - 700000) * 0.1 + 20000;
  if (net <= 1200000) return (net - 1000000) * 0.15 + 70000;
  if (net <= 1500000) return (net - 1200000) * 0.2 + 130000;
  return (net - 1500000) * 0.3 + 230000;
};

/* ------------------------------------------------------------------ */
/* SMALL COMPONENTS                                                    */
/* ------------------------------------------------------------------ */

const noop = () => {};

// Defined at module level so its identity stays stable between renders
// (otherwise the input loses focus on every keystroke inside DataTable).
function NumCell({
  index,
  field,
  value,
  readOnly,
  onChange,
}: {
  index: number;
  field: string;
  value: any;
  readOnly?: boolean;
  onChange: (index: number, field: string, value: string) => void;
}) {
  const isBlank =
    value === "0.00" ||
    value === 0 ||
    value === "" ||
    value === null ||
    value === undefined;

  return (
    <input
      type="text"
      inputMode="decimal"
      readOnly={readOnly}
      value={isBlank ? "" : String(value)}
      placeholder="0"
      onChange={(e) => {
        if (/^\d*\.?\d{0,2}$/.test(e.target.value)) {
          onChange(index, field, e.target.value);
        }
      }}
      className="h-[32px] w-full min-w-[100px] rounded-md border border-transparent bg-transparent px-2 text-right text-[13px] text-slate-800 outline-none placeholder:text-slate-300 hover:border-slate-200 focus:border-indigo-500 focus:bg-white dark:text-slate-100 dark:focus:bg-slate-900"
    />
  );
}

function CalcCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-2 -my-1 bg-slate-50 px-2 py-1 text-right text-[13px] font-semibold text-slate-900 dark:bg-slate-800/40 dark:text-slate-100">
      {children}
    </div>
  );
}

const INV_ROWS: [string, string][] = [
  ["Provident fund", "Inv_01"],
  ["LIC paid / other life insurance", "Inv_02"],
  ["Children's tuition fees", "Inv_03"],
  ["NSC purchased", "Inv_05"],
  ["PPF deposit", "Inv_06"],
  ["Stamp duty on home", "Inv_07"],
  ["Repayment of home loan", "Inv_08"],
  ["Equity linked saving scheme", "Inv_09"],
  ["Others (specify) - 1", "Inv_10_1"],
  ["Others (specify) - 2", "Inv_10_2"],
];

const neg = (v: number) => `₹-${fmt(Math.abs(v))}`;

function Card({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
        <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        {aside && <span className="text-[12px] text-slate-400">{aside}</span>}
      </div>
      <div className="px-5 py-2">{children}</div>
    </div>
  );
}

function SectionLabel({ text, aside }: { text: string; aside?: string }) {
  return (
    <div className="flex items-center justify-between pb-1 pt-3">
      <span className="text-[12px] font-bold uppercase tracking-wide text-slate-400">
        {text}
      </span>
      {aside && <span className="text-[12px] text-slate-400">{aside}</span>}
    </div>
  );
}

function LineRow({
  no,
  label,
  value,
  sub,
  valueClass = "",
}: {
  no?: string;
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: boolean;
  valueClass?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 border-b border-slate-100 py-2 text-[13px] last:border-b-0 dark:border-slate-800 ${
        sub ? "text-slate-500" : "text-slate-800 dark:text-slate-100"
      }`}
    >
      {no !== undefined && (
        <span className="w-5 shrink-0 text-slate-400">{no}</span>
      )}
      <span className="flex-1">{label}</span>
      <span className={`text-right ${valueClass}`}>{value}</span>
    </div>
  );
}

function FieldRow({
  no,
  label,
  children,
}: {
  no?: string;
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-1.5 text-[13px] text-slate-600 last:border-b-0 dark:border-slate-800 dark:text-slate-300">
      {no !== undefined && (
        <span className="w-5 shrink-0 text-slate-400">{no}</span>
      )}
      <span className="flex-1">{label}</span>
      {children}
    </div>
  );
}

function HighlightRow({
  label,
  value,
  variant = "slate",
}: {
  label: string;
  value: React.ReactNode;
  variant?: "slate" | "indigo";
}) {
  return (
    <div
      className={`my-2 flex items-center justify-between rounded-lg px-4 py-2.5 text-[13px] font-semibold ${
        variant === "indigo"
          ? "bg-indigo-600 text-white"
          : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ReadField({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <Einput
        title={label}
        type="text"
        name={name}
        value={value}
        readOnly
        disabled
        handleInputChange={noop}
        className="h-[40px] w-full bg-slate-100 text-[13px] dark:bg-slate-800"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PAGE                                                                */
/* ------------------------------------------------------------------ */

export default function TDSCalculationPage() {
  const router = useRouter();
  const user = useCurrentUser();

  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<TDSForm>(initialData);
  const [tableData, setTableData] = useState<TableRow[]>(makeInitialTable());

  const [employeeOptions, setEmployeeOptions] = useState<Option[]>([]);
  const [locationOptions, setLocationOptions] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState("");
  const [yearvalue, setYearvalue] = useState<string>(
    String(getCurrentFinancialYear()),
  );

  const headers = useMemo(
    () => ({
      compcode: user?.Comp_Code,
      name: user?.name,
      token: user?.email,
    }),
    [user?.Comp_Code, user?.name, user?.email],
  );

  /* ------------------------ EMPLOYEE LIST ------------------------ */

  useEffect(() => {
    if (!user?.Comp_Code) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.post(
          `${API_URL}${EMPLOYEE_ALL_ENDPOINT}`,
          {},
          { headers: { compcode: user?.Comp_Code, name: user?.name } },
        );
        setEmployeeOptions(response.data?.data || []);
        setLocationOptions(response.data?.Location || []);
      } catch (error) {
        console.error("TDS employee list error:", error);
        toast("error", getApiError(error), 2500);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.Comp_Code]);

  /* ----------------------- LOAD EMPLOYEE DATA ----------------------- */

  const handleEmpChange = async (_name: string, value: string | number) => {
    const empValue = String(value ?? "");
    setSelectedEmp(empValue);
    setTableData(makeInitialTable());
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}${TDS_EMPLOYEE_ENDPOINT}`,
        { value, yearvalue },
        { headers: { compcode: user?.Comp_Code, name: user?.name } },
      );

      const details: TDSForm = {
        ...initialData,
        ...(response.data?.EmpDetails || {}),
      };
      if (!details.Tax_Slab) details.Tax_Slab = "0";
      if (details.StandardDed === undefined || details.StandardDed === null) {
        details.StandardDed =
          details.Tax_Slab === "2" ? "-50000.00" : "-70000.00";
      }
      if (!details.Residence) details.Residence = "OTHER";
      details.FY_Mnth = "";
      setFormData(details);

      setTableData((prev) => {
        const updated = [...prev];
        (response.data?.data || []).forEach((newItem: TableRow) => {
          const index = updated.findIndex(
            (item) => item.MonthOrder === newItem.MonthOrder,
          );
          if (index !== -1) updated[index] = newItem;
          else updated.push(newItem);
        });
        return updated;
      });
    } catch (error) {
      console.error("TDS load error:", error);
      toast("error", getApiError(error), 2500);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------- HANDLERS ---------------------------- */

  const handleInputChange = (name: string, value: any) => {
    if (name === "Tax_Slab") {
      setFormData((prev) => ({
        ...prev,
        StandardDed: value === "2" ? "-50000.00" : "-70000.00",
        [name]: value,
      }));
      return;
    }

    if (name === "Landlord_PAN") {
      setFormData((prev) => ({
        ...prev,
        [name]: String(value ?? "").toUpperCase(),
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleyear = (_name: string, value: any) => setYearvalue(String(value));

  const handleCellChange = useCallback(
    (index: number, key: string, value: string) => {
      setTableData((prev) =>
        prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
      );
    },
    [],
  );

  /** Copy the last filled month's figures into every empty month after it */
  const handlePopulateRemaining = () => {
    let lastFilled = -1;
    tableData.forEach((row, i) => {
      if (P(row._01) > 0) lastFilled = i;
    });

    if (lastFilled === -1) {
      toast("warning", "Enter at least one month of salary first");
      return;
    }

    const source = tableData[lastFilled];
    setTableData((prev) =>
      prev.map((row, i) =>
        i > lastFilled && P(row._01) === 0
          ? {
              ...row,
              ...source,
              _12: "0.00",
              Month: row.Month,
              MonthOrder: row.MonthOrder,
            }
          : row,
      ),
    );
  };

  const resetAll = () => {
    setFormData(initialData);
    setTableData(makeInitialTable());
    setSelectedEmp("");
  };

  /* ---------------------------- CALCULATION ---------------------------- */

  // Monthly rows with HRA exempt (_04) calculated from rent, basic and residence
  const monthly = useMemo(
    () =>
      tableData.map((row) => ({
        ...row,
        _04: calcHraExempt(row, formData.Residence).toFixed(2),
      })),
    [tableData, formData.Residence],
  );

  // Numeric totals + comma-formatted totals (same shape the existing API expects)
  const { totalsNum, totals } = useMemo(() => {
    const num: Record<string, number> = {};
    monthly.forEach((row) => {
      COLUMN_KEYS.forEach((k) => {
        num[k] = (num[k] || 0) + P(row[k]);
      });
    });
    const fmtd: Record<string, string> = {};
    Object.keys(num).forEach((k) => {
      fmtd[k] = fmtTotal(num[k]);
    });
    return { totalsNum: num, totals: fmtd };
  }, [monthly]);

  const calc = useMemo(() => {
    const fd = formData;
    const T = totalsNum;
    // Old regime only: HRA exemption, 80C, 80D, other deductions, home-loan interest
    const isOld = fd.Tax_Slab === "2";

    // 80C
    const Inv_11 =
      P(fd.Inv_01) +
      P(fd.Inv_02) +
      P(fd.Inv_03) +
      P(fd.Inv_05) +
      P(fd.Inv_06) +
      P(fd.Inv_07) +
      P(fd.Inv_08) +
      P(fd.Inv_09) +
      P(fd.Inv_10_2);
    const Ded_80C_1 = isOld ? Math.min(Inv_11, 150000) : 0;

    // 80D
    const ageSelf = P(fd.Inv_12_1);
    const ageParents = P(fd.Inv_13_1);
    const dSelf = Math.min(ageSelf > 60 ? 50000 : 25000, P(fd.Inv_12_2));
    const dParents = Math.min(ageParents > 60 ? 50000 : 25000, P(fd.Inv_13_2));
    const Ded_80D_1 = isOld ? dSelf + dParents : 0;

    // House property
    const diff = P(fd.Inc_22) - P(fd.Inc_24);
    const Inc_25 = isOld ? (diff <= -200000 ? -200000 : diff) : P(fd.Inc_22);

    // Income
    const salaryincome =
      T._01 +
      (T._02 - (isOld ? T._04 : 0)) +
      T._05 +
      T._07 +
      T._09 +
      T._08 +
      T._13 +
      P(fd.StandardDed);
    const totalgrossincome = salaryincome + Inc_25 + P(fd.Inc_27);

    const Totl_Ded = (isOld ? P(fd.Ded_80G_1) : 0) + Ded_80D_1 + Ded_80C_1;
    const Net_Inc_1 = totalgrossincome - Totl_Ded;
    const Net_Inc_2 = Math.round(Net_Inc_1);

    // Tax
    const net = Math.round(Net_Inc_2);
    let Tax_Payable = 0;
    if (fd.Tax_Slab === "2") Tax_Payable = taxOld(P(fd.Age), net);
    else if (fd.Tax_Slab === "1") Tax_Payable = taxNewRate(net);
    else if (fd.Tax_Slab === "0") Tax_Payable = tax2425(Net_Inc_2);

    let Rebate_87A = 0;
    if (net <= 500000) Rebate_87A = Tax_Payable < 12500 ? -Tax_Payable : -12500;

    let Surcharge = 0;
    if (net > 10000000) {
      let sur1 = (Tax_Payable + Rebate_87A) * 0.15;
      let val2 = (net - 10000000) * 0.07;
      val2 += (Tax_Payable + Rebate_87A) * 0.01;
      val2 = (val2 - (net - 10000000)) * 0.03 * 0.01;
      if (sur1 > val2) sur1 = val2;
      Surcharge = sur1;
    } else if (net > 5000000) {
      let sur1 = (Tax_Payable + Rebate_87A) * 0.01;
      const val2 = (net - 5000000) * 0.07;
      if (sur1 > val2) sur1 = val2;
      Surcharge = sur1;
    }

    const Edu_Cess = Math.floor((Surcharge + Rebate_87A + Tax_Payable) * 0.04);
    const Totl_Tax = Edu_Cess + Surcharge + Rebate_87A + Tax_Payable;

    const tdsDeducted = T._12 || 0;
    const Bal_Tax = Totl_Tax - tdsDeducted;
    const FY_Mnth =
      fd.FY_Mnth === "" || fd.FY_Mnth === null || fd.FY_Mnth === undefined
        ? calculateRemainingMonths()
        : P(fd.FY_Mnth);
    const Avg_Tds = FY_Mnth > 0 ? Bal_Tax / FY_Mnth : 0;

    return {
      // numeric values for the UI
      totalTax: Totl_Tax,
      balance: Bal_Tax,
      avgMonthly: Avg_Tds,
      annualRent: T._03 || 0,
      isOld,
      // string fields merged into the form for save / update / export
      fields: {
        Inv_11,
        Ded_80C_1: Ded_80C_1.toFixed(2),
        Ded_80D_1: Ded_80D_1.toFixed(2),
        Inc_25: Inc_25.toFixed(2),
        salaryincome: salaryincome.toFixed(2),
        totalgrossincome: totalgrossincome.toFixed(2),
        Totl_Ded: Totl_Ded.toFixed(2),
        Net_Inc_1: Net_Inc_1.toFixed(2),
        Net_Inc_2: Net_Inc_2.toFixed(2),
        Tax_Payable: Tax_Payable.toFixed(2),
        Rebate_87A: Rebate_87A.toFixed(2),
        Surcharge: Surcharge.toFixed(2),
        Edu_Cess: Edu_Cess.toFixed(2),
        Totl_Tax: Totl_Tax.toFixed(2),
        TDS_Deducation: totals._12,
        Bal_Tax: Bal_Tax.toFixed(2),
        FY_Mnth,
        Avg_Tds: Avg_Tds.toFixed(2),
      },
    };
  }, [formData, totalsNum, totals]);

  const landlordPanRequired = calc.annualRent > 100000;

  // Month rows + a Total row at the bottom of the table
  const tableRows = useMemo(
    () => [
      ...monthly,
      {
        Month: "Total",
        isTotal: true,
        ...Object.fromEntries(COLUMN_KEYS.map((k) => [k, totalsNum[k] || 0])),
      },
    ],
    [monthly, totalsNum],
  );

  const locationLabel = useMemo(() => {
    const loc = formData.BrLocation;
    if (loc === null || loc === undefined || loc === "") return "";
    const found = locationOptions.find(
      (o: any) => String(o?.value) === String(loc),
    );
    return String(found?.label ?? loc);
  }, [formData.BrLocation, locationOptions]);

  /* ------------------------------ SAVE / UPDATE ------------------------------ */

  const buildPayload = (mode: "save" | "update") => {
    const date = new Date();
    const full: TDSForm = { ...formData, ...calc.fields };

    if (mode === "save") {
      full.Loc_Code = user?.branch;
      full.USR_Code = user?.id;
      full.Export_Type = 1;
      full.ENTR_DATE = date.toISOString().split("T")[0];
      full.ENTR_TIME = convertTimeToDecimal(date);
    } else {
      full.MOD_USER = user?.id;
      full.MOD_DATE = date.toISOString().split("T")[0];
      full.MOD_TIME = convertTimeToDecimal(date);
    }

    return { tableData: monthly, formData: full, totals };
  };

  const validateBeforeSave = () => {
    if (!formData.Emp_Code) {
      toast("warning", "Please select an employee");
      return false;
    }
    if (landlordPanRequired && !String(formData.Landlord_PAN || "").trim()) {
      toast(
        "warning",
        "Landlord's PAN is required when rent exceeds ₹1 lakh/yr",
        2500,
      );
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateBeforeSave()) return;

    try {
      setLoading(true);
      await axios.post(`${API_URL}${TDS_SAVE_ENDPOINT}`, buildPayload("save"), {
        headers,
      });

      Swal.fire({ icon: "success", title: "Saved Successfully " });
      resetAll();
    } catch (error) {
      console.error("TDS save error:", error);
      toast("error", getApiError(error), 2500);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!validateBeforeSave()) return;

    try {
      setLoading(true);
      await axios.post(
        `${API_URL}${TDS_UPDATE_ENDPOINT}`,
        buildPayload("update"),
        { headers },
      );

      Swal.fire({ icon: "success", title: "Update Successfully " });
      resetAll();
    } catch (error) {
      console.error("TDS update error:", error);
      toast("error", getApiError(error), 2500);
    } finally {
      setLoading(false);
    }
  };

  /* ----------------------------- EXPORT (Excel template) ----------------------------- */

  const handleExport = async () => {
    if (!formData.Tax_Slab) {
      Swal.fire({ icon: "warning", title: "Please Select TDS RATE " });
      return;
    }

    try {
      setLoading(true);

      const fileName =
        formData.Tax_Slab === "1"
          ? "/TDS_CALC_2023-24.xlsx"
          : "/TDS_CALC_OLD_RATE(2017-2023).xlsx";

      const response = await fetch(fileName);
      if (!response.ok) throw new Error("Network response was not ok.");

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await response.arrayBuffer());

      const ws = workbook.worksheets[0];
      const set = (row: number, col: number, value: any) => {
        ws.getCell(row, col).value = value;
      };

      const fd: TDSForm = { ...formData, ...calc.fields };

      // Employee header
      set(4, 4, fd.Emp_Name);
      set(5, 4, fd.Designation);
      set(6, 4, locationLabel || fd.BrLocation);
      set(7, 4, fd.Emp_Add);
      set(4, 10, fd.PAN_No);
      set(6, 10, fd.Emp_Code);
      set(4, 15, fd.PF);
      set(5, 10, fd.Salaried);
      set(5, 15, fd.Residence);
      set(6, 15, fd.Age);
      set(7, 15, fd.Landlord_PAN);

      // Monthly table (_01.._13 -> columns 3..15, months -> rows 13..24, totals -> row 25)
      for (let k = 1; k <= 13; k++) {
        const key = `_${String(k).padStart(2, "0")}`;
        for (let m = 0; m < 12; m++) {
          set(13 + m, k + 2, monthly[m]?.[key]);
        }
        set(25, k + 2, totals[key]);
      }

      // Investments
      set(28, 5, fd.Inv_01);
      set(29, 5, fd.Inv_02);
      set(30, 5, fd.Inv_03);
      set(31, 5, fd.Inv_05);
      set(32, 5, fd.Inv_06);
      set(33, 5, fd.Inv_07);
      set(34, 5, fd.Inv_08);
      set(35, 5, fd.Inv_09);
      set(36, 4, fd.Inv_10_1);
      set(36, 5, fd.Inv_10_2);
      set(37, 5, fd.Inv_11);
      set(40, 4, fd.Inv_12_1);
      set(40, 5, fd.Inv_12_2);
      set(41, 4, fd.Inv_13_1);
      set(41, 5, fd.Inv_13_2);

      // Computation
      set(27, 11, totals._01);
      set(28, 10, totals._02);
      set(29, 10, totals._04);
      set(29, 11, (totalsNum._02 - totalsNum._04).toFixed(2));
      set(30, 10, totals._05);
      set(31, 10, 0.0);
      set(31, 11, totals._05);
      set(32, 10, 0.0);
      set(32, 11, totals._07);
      set(33, 10, 0.0);
      set(33, 11, totals._09);
      set(34, 10, 0.0);
      set(34, 11, totals._08);
      set(35, 10, 0.0);
      set(35, 11, totals._13);
      set(36, 11, fd.StandardDed);
      set(37, 11, fd.salaryincome);
      set(38, 10, fd.Inc_22);
      set(38, 11, fd.Inc_23);
      set(39, 10, fd.Inc_24);
      set(39, 11, fd.Inc_25);
      set(40, 10, fd.Inc_26);
      set(40, 11, fd.Inc_27);
      set(41, 10, fd.Inc_28);
      set(41, 11, fd.Inc_29);

      // Deductions & tax
      set(27, 15, fd.Ded_80C_1);
      set(27, 16, fd.Ded_80C_2);
      set(28, 15, fd.Ded_80D_1);
      set(28, 16, fd.Ded_80D_2);
      set(29, 14, fd.Ded_80G_Head);
      set(29, 15, fd.Ded_80G_1);
      set(29, 16, fd.Ded_80G_2);
      set(30, 16, fd.Totl_Ded);
      set(31, 16, fd.Net_Inc_1);
      set(32, 16, fd.Net_Inc_2);
      set(33, 16, fd.Tax_Payable);
      set(34, 16, fd.Rebate_87A);
      set(35, 16, fd.Surcharge);
      set(36, 16, fd.Edu_Cess);
      set(37, 16, fd.Totl_Tax);
      set(38, 16, fd.TDS_Deducation);
      set(39, 16, fd.Bal_Tax);
      set(40, 16, fd.FY_Mnth);
      set(41, 16, fd.Avg_Tds);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "TDS_CALC_UPDATED.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error handling the file:", error);
      toast("error", getApiError(error), 2500);
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------ TABLE COLUMNS ------------------------------ */

  const numColumn = (Header: string, accessor: string, readOnly = true) => ({
    Header,
    accessor,
    Cell: ({ value, row }: any) =>
      row.original.isTotal ? (
        <span className="block px-2 text-right text-[13px] font-bold text-slate-900 dark:text-slate-100">
          {fmt(P(value))}
        </span>
      ) : (
        <NumCell
          index={row.index}
          field={accessor}
          value={value}
          readOnly={readOnly}
          onChange={handleCellChange}
        />
      ),
  });

  // Columns must be stable (no dependency on row values) so inputs keep focus.
  const columns = useMemo(
    () => [
      {
        Header: "Month",
        accessor: "Month",
        Cell: ({ value, row }: any) => (
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {row.original.isTotal ? "Total" : String(value ?? "").slice(0, 3)}
          </span>
        ),
      },
      numColumn("Emp. basic sal.", "_01"),
      numColumn("HRA rec. from comp.", "_02"),
      numColumn("Rent paid by staff", "_03", false), // only editable column (same as existing page)
      {
        Header: "HRA exempt",
        accessor: "_04",
        Cell: ({ value, row }: any) => (
          <CalcCell>
            {row.original.isTotal || P(value) > 0 ? fmt(P(value)) : "—"}
          </CalcCell>
        ),
      },
      numColumn("Conveyance allowance paid", "_05"),
      {
        Header: "Conveyance allowance exempt",
        accessor: "_06",
        Cell: ({ value, row }: any) => (
          <CalcCell>
            {row.original.isTotal || P(row.original._01) > 0
              ? fmt(P(value))
              : "0"}
          </CalcCell>
        ),
      },
      numColumn("Other allw. given", "_07"),
      numColumn("TDS deducted", "_12"),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleCellChange],
  );

  /* ------------------------------ UI ------------------------------ */

  const isUpdate = Boolean(formData.Tran_Id);

  const f = calc.fields;
  const fyLabel = `${yearvalue}-${Number(yearvalue) + 1}`;

  // Numeric-only input handler for the amount fields below the table
  const handleAmountChange = (name: string, value: any) => {
    const v = String(value ?? "");
    if (/^\d*\.?\d{0,2}$/.test(v)) {
      setFormData((prev) => ({ ...prev, [name]: v }));
    }
  };

  const isBlankAmount = (v: any) =>
    v === 0 ||
    v === "0" ||
    v === "0.00" ||
    v === "" ||
    v === null ||
    v === undefined;

  // Plain function (not a component) so inputs keep focus while typing
  const amountInput = (name: string, disabled = false, width = "w-[160px]") => (
    <div className={width}>
      <Einput
        type="text"
        name={name}
        value={isBlankAmount(formData?.[name]) ? "" : String(formData[name])}
        placeholder="0"
        disabled={disabled}
        handleInputChange={handleAmountChange}
        className="h-[34px] w-full text-right text-[13px]"
      />
    </div>
  );

  return (
    <div className="min-h-screen min-w-0 bg-[#f8fafc] p-3 dark:bg-[#0b1220] sm:p-4">
      <HashloaderComponent isLoading={loading} />

      <div className="mx-auto max-w-[1800px] space-y-4">
        {/* HEADER */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[21px] font-bold text-slate-900 dark:text-slate-100">
              TDS Calculation
            </h1>
          </div>
        </div>

        {/* EMPLOYEE CARD */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="min-w-0 lg:col-span-2">
              <Eselect
                title="Employee name"
                name="SrNo"
                option={employeeOptions}
                initialValue={selectedEmp}
                handleInputChange={handleEmpChange}
                className="h-[40px] w-full text-[13px]"
              />
            </div>
            <div className="min-w-0">
              <Einput
                type="text"
                name="Emp_Code"
                title="Emp code"
                value={formData?.Emp_Code ?? ""}
                disabled
                handleInputChange={handleInputChange}
                className="h-[40px] w-full text-[13px]"
              />
            </div>
            <div className="min-w-0">
              <Einput
                type="text"
                name="Emp_Name"
                title="Name"
                value={formData?.Emp_Name ?? ""}
                disabled
                handleInputChange={handleInputChange}
                className="h-[40px] w-full text-[13px]"
              />
            </div>
            <div className="min-w-0">
              <Einput
                type="text"
                name="Designation"
                title="Designation"
                value={formData?.Designation ?? ""}
                disabled
                handleInputChange={handleInputChange}
                className="h-[40px] w-full text-[13px]"
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="min-w-0">
              <Eselect
                title="Location (in Co.)"
                name="BrLocation"
                option={locationOptions}
                initialValue={formData?.BrLocation?.toString() ?? ""}
                handleInputChange={handleInputChange}
                className="h-[40px] w-full text-[13px]"
              />
            </div>
            <div className="min-w-0">
              <Einput
                type="text"
                name="PAN_No"
                title="PAN no."
                value={formData?.PAN_No ?? ""}
                handleInputChange={handleInputChange}
                className="h-[40px] w-full text-[13px]"
              />
            </div>
            <div className="min-w-0">
              <Einput
                type="text"
                name="Salaried"
                title="Salaried / other"
                value={formData?.Salaried ?? ""}
                disabled
                handleInputChange={handleInputChange}
                className="h-[40px] w-full text-[13px]"
              />
            </div>
            <div className="min-w-0">
              <Einput
                type="text"
                name="PF"
                title="PF applicable (Y/N)"
                value={formData?.PF ?? ""}
                disabled
                handleInputChange={handleInputChange}
                className="h-[40px] w-full text-[13px]"
              />
            </div>
            <div className="min-w-0">
              <Einput
                type="text"
                name="Age"
                title="Age (in years)"
                value={formData?.Age ? formData.Age : ""}
                disabled
                handleInputChange={handleInputChange}
                className="h-[40px] w-full text-[13px]"
              />
            </div>

            <div className="min-w-0">
              <Eselect
                title="Residence (Metro/Other)"
                name="Residence"
                option={RESIDENCE_OPTIONS}
                initialValue={String(formData.Residence ?? "OTHER")}
                handleInputChange={handleInputChange}
                className="h-[40px] w-full text-[13px]"
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-4">
            <div className="min-w-0 lg:col-span-3">
              <ReadField
                label="Address"
                name="Emp_Add"
                value={String(formData.Emp_Add ?? "")}
              />
            </div>

            <div className="min-w-0">
              <Einput
                title="Landlord's PAN"
                type="text"
                name="Landlord_PAN"
                value={formData.Landlord_PAN ?? ""}
                maxLength={10}
                placeholder="NEEDED IF RENT > ₹1 LAKH/YR"
                handleInputChange={handleInputChange}
                className={`h-[40px] w-full text-[13px] ${
                  landlordPanRequired && !formData.Landlord_PAN
                    ? "border-amber-400"
                    : ""
                }`}
              />
            </div>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-[200px]">
                <Eselect
                  title="Income tax (TDS) for FY"
                  name="SrNo"
                  option={FY_OPTIONS}
                  initialValue={yearvalue}
                  handleInputChange={handleyear}
                  className="h-[40px] w-full text-[13px]"
                />
              </div>

              <div className="w-[220px]">
                <Eselect
                  title="TDS rate"
                  name="Tax_Slab"
                  option={Tax_Slab}
                  initialValue={String(formData.Tax_Slab ?? "")}
                  handleInputChange={handleInputChange}
                  className="h-[40px] w-full text-[13px]"
                />
              </div>

              <AButton
                onClick={handlePopulateRemaining}
                className="inline-flex h-[40px] items-center rounded-lg border border-slate-200 bg-white px-4 text-[12px] font-semibold text-indigo-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
              >
                Populate remaining months
              </AButton>

              <AButton
                onClick={resetAll}
                className="inline-flex h-[40px] items-center rounded-lg border border-slate-200 bg-white px-4 text-[12px] font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                Reset data
              </AButton>
            </div>

            <div className="flex flex-wrap items-end gap-6">
              <div>
                <p className="text-[11px] font-semibold text-slate-500">
                  Total tax
                </p>
                <p className="text-[20px] font-bold text-slate-900 dark:text-slate-100">
                  {inr(calc.totalTax)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500">
                  Balance
                </p>
                <p className="text-[20px] font-bold text-emerald-600">
                  {inr(calc.balance)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500">
                  Avg monthly TDS
                </p>
                <p className="text-[20px] font-bold text-indigo-600">
                  {inr(calc.avgMonthly)}
                </p>
              </div>

              <AButton
                onClick={handleExport}
                className="inline-flex h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-[12px] font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <Download size={14} />
                Export
              </AButton>

              <AButton
                onClick={isUpdate ? handleUpdate : handleSave}
                className="inline-flex h-[40px] items-center rounded-lg bg-indigo-600 px-6 text-[12px] font-semibold text-white hover:bg-indigo-700"
              >
                {isUpdate ? "Update" : "Save"}
              </AButton>
            </div>
          </div>
        </div>

        {/* MONTHLY SALARY TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <h2 className="text-[16px] font-bold text-slate-900 dark:text-slate-100">
              Monthly salary · FY {yearvalue}-{Number(yearvalue) + 1}
            </h2>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              Shaded columns are calculated. HRA exempt uses rent, basic and
              residence.
            </p>
          </div>

          <DataTable
            key={`${selectedEmp}-${yearvalue}`}
            columns={columns}
            data={tableRows}
            height={560}
            initialPageSize={13}
            showPageSizeInFooter={false}
            showTopSearch={false}
            showExcelExport={false}
            resetFilters={false}
            showColumnFilters={false}
            containerClassName="border-t border-slate-200 text-[12px] dark:border-slate-800"
          />
        </div>

        {/* REGIME NOTICE */}
        {!calc.isOld && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            New regime: HRA and conveyance exemptions, 80C, 80D, other
            deductions and home-loan interest are not counted. Switch TDS rate
            to old regime to apply them.
          </div>
        )}

        {/* INVESTMENTS · COMPUTATION · TAX */}
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
          {/* INVESTMENTS */}
          <Card title="Investments" aside="Old regime only">
            <SectionLabel text="Deduction u/s 80C" aside="Limit ₹1,50,000" />
            {INV_ROWS.map(([label, name]) => (
              <FieldRow key={name} label={label}>
                {amountInput(name, !calc.isOld)}
              </FieldRow>
            ))}
            <HighlightRow label="Total 80C" value={inr(Number(f.Inv_11))} />

            <SectionLabel
              text="Deduction u/s 80D · Mediclaim"
              aside="Age · Amount"
            />
            <FieldRow label="For self">
              <div className="flex gap-2">
                {amountInput("Inv_12_1", !calc.isOld, "w-[80px]")}
                {amountInput("Inv_12_2", !calc.isOld, "w-[120px]")}
              </div>
            </FieldRow>
            <FieldRow label="For parents">
              <div className="flex gap-2">
                {amountInput("Inv_13_1", !calc.isOld, "w-[80px]")}
                {amountInput("Inv_13_2", !calc.isOld, "w-[120px]")}
              </div>
            </FieldRow>
          </Card>

          {/* COMPUTATION */}
          <Card title={`Computation · FY ${fyLabel}`}>
            <LineRow no="1" label="Basic salary" value={inr(totalsNum._01)} />
            <LineRow no="2" label="HRA received" value={inr(totalsNum._02)} />
            <LineRow
              no=""
              sub
              label="Less: exempt"
              value={neg(calc.isOld ? totalsNum._04 : 0)}
            />
            <LineRow
              no="3"
              label="Conveyance allowance"
              value={inr(totalsNum._05)}
            />
            <LineRow no="" sub label="Less: exempt" value={neg(0)} />
            <LineRow
              no="4"
              label="Other allowance"
              value={inr(totalsNum._07)}
            />
            <LineRow
              no="5"
              label="Bonus / ex-gratia"
              value={inr(totalsNum._09)}
            />
            <LineRow
              no="6"
              label="Arrear salary / leave"
              value={inr(totalsNum._08)}
            />
            <LineRow
              no="7"
              label="Medical reimbursement"
              value={inr(totalsNum._13)}
            />
            <LineRow
              no="8"
              label="Standard deduction"
              value={`– ${inr(Math.abs(P(formData.StandardDed)))}`}
              valueClass="text-red-600"
            />

            <HighlightRow
              label="Salary income"
              value={inr(P(f.salaryincome))}
            />

            <FieldRow no="9" label="Income from house property">
              {amountInput("Inc_22")}
            </FieldRow>
            <FieldRow
              no=""
              label={
                <>
                  Less: interest paid on housing loan{" "}
                  <span className="text-[11px] text-slate-400">
                    · up to ₹2,00,000
                  </span>
                </>
              }
            >
              {amountInput("Inc_24", !calc.isOld)}
            </FieldRow>
            <FieldRow no="10" label="Other income received">
              {amountInput("Inc_27")}
            </FieldRow>

            <HighlightRow
              label="Total gross income"
              value={inr(P(f.totalgrossincome))}
              variant="indigo"
            />
          </Card>

          {/* TAX */}
          <Card title={`Tax · FY ${fyLabel}`}>
            <LineRow label="Deduction u/s 80C" value={inr(P(f.Ded_80C_1))} />
            <LineRow label="Deduction u/s 80D" value={inr(P(f.Ded_80D_1))} />
            <FieldRow label="Deduction u/s">
              <div className="flex gap-2">
                <div className="w-[170px]">
                  <Einput
                    type="text"
                    name="Ded_80G_Head"
                    value={
                      formData?.Ded_80G_Head === "0"
                        ? ""
                        : (formData?.Ded_80G_Head ?? "")
                    }
                    placeholder="80G, 80E..."
                    disabled={!calc.isOld}
                    handleInputChange={handleInputChange}
                    className="h-[34px] w-full text-[13px]"
                  />
                </div>
                {amountInput("Ded_80G_1", !calc.isOld, "w-[120px]")}
              </div>
            </FieldRow>

            <HighlightRow label="Total deduction" value={inr(P(f.Totl_Ded))} />

            <LineRow
              label="Net income"
              value={inr(P(f.Net_Inc_1))}
              valueClass="font-bold"
            />
            <LineRow label="Tax payable" value={inr(P(f.Tax_Payable))} />
            <LineRow
              label="Less: rebate u/s 87A"
              value={neg(P(f.Rebate_87A))}
            />
            <LineRow label="Add: surcharge" value={inr(P(f.Surcharge))} />
            <LineRow
              label="Add: health & education cess 4%"
              value={inr(P(f.Edu_Cess))}
            />

            <HighlightRow
              label="Total tax payable"
              value={inr(P(f.Totl_Tax))}
            />

            <LineRow
              label="TDS deducted / advance tax"
              value={inr(P(f.TDS_Deducation))}
            />
            <LineRow
              label="Balance tax payable"
              value={inr(P(f.Bal_Tax))}
              valueClass="font-bold"
            />

            <FieldRow label="No. of months remaining in this FY">
              <div className="w-[80px]">
                <Einput
                  type="text"
                  name="FY_Mnth"
                  value={
                    formData?.FY_Mnth === "" || formData?.FY_Mnth == null
                      ? String(f.FY_Mnth)
                      : String(formData.FY_Mnth)
                  }
                  handleInputChange={handleAmountChange}
                  className="h-[34px] w-full text-right text-[13px]"
                />
              </div>
            </FieldRow>

            <HighlightRow
              label="Average monthly TDS"
              value={inr(P(f.Avg_Tds))}
              variant="indigo"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
