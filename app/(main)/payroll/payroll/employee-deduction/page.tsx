"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  IndianRupee,
  Save,
  TriangleAlert,
  CalendarClock,
  HandCoins,
  Shirt,
  Landmark,
  Wrench,
  FileX2,
  UtensilsCrossed,
  ReceiptText,
  CircleEllipsis,
} from "lucide-react";
import axios from "axios";
import Swal from "sweetalert2";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import { useSecureStorage } from "@/app/hooks/comp-key-data";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import HashloaderComponent from "@/components/Templates/hashloader";

/* =========================================================
   TYPES
========================================================= */

type SelectOption = {
  value: string;
  label: string;
  [key: string]: any;
};

type EmployeeData = {
  Ded_Type: number | null;
  Emp_Id: number | null;
  Emp_Name: string | null;
  Mnth: string | null;
  Rec_Date: string;
  Ded_Amt: number | null;
  Basic_Arr: number | null;
  HRA_ARR: number | null;
  Conv_Arr: number | null;
  Medical_Arr: number | null;
  Washing_Arr: number | null;
  Yr: string | null;
  Loc_Code: number | null;
  Ded_Rem: string;
  Created_by: string | null;
  status: string | number | null;
};

type FormData = {
  Created_by: string;
  employeeData: EmployeeData | null;
};

type ExistingItem = {
  id: string | number;
  title: string;
  note: string;
  amount: number;
};

/* =========================================================
   CONSTANTS
========================================================= */

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const getPreviousPeriod = () => {
  const now = new Date();

  let month = now.getMonth();
  let year = now.getFullYear();

  if (month === 0) {
    month = 12;
    year -= 1;
  }

  return {
    month: String(month),
    year: String(year),
    date: `${year}-${String(month).padStart(2, "0")}-01`,
  };
};

const getEventValue = (value: any) => {
  if (value && typeof value === "object" && "target" in value) {
    return value.target?.value ?? "";
  }

  return value ?? "";
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  return String(value).split("T")[0].slice(0, 10);
};

const formatINR = (value: number | string | null | undefined) => {
  const amount = Number(value) || 0;

  return `₹${Math.abs(amount).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
};

/* =========================================================
   API RESPONSE HELPERS
========================================================= */

const getAmountFromResponse = (response: any): number => {
  const data =
    response?.data?.data ?? response?.data?.Data ?? response?.data ?? response;

  if (typeof data === "number" || typeof data === "string") {
    return Number(data) || 0;
  }

  if (Array.isArray(data)) {
    return data.reduce((sum: number, item: any) => {
      return (
        sum +
        (Number(
          item?.Ded_Amt ??
            item?.Balance ??
            item?.balance ??
            item?.amount ??
            item?.Amount ??
            0,
        ) || 0)
      );
    }, 0);
  }

  return (
    Number(
      data?.Ded_Amt ??
        data?.Balance ??
        data?.balance ??
        data?.amount ??
        data?.Amount ??
        data?.Total ??
        data?.total ??
        0,
    ) || 0
  );
};

const getSalaryAmount = (salaryData: any, fields: string[]): number | null => {
  if (!salaryData) return null;

  for (const field of fields) {
    const value = salaryData[field];

    if (value !== undefined && value !== null && value !== "") {
      return Number(value) || 0;
    }
  }

  return 0;
};

/* =========================================================
   COMPACT UI HELPERS
========================================================= */

const labelClass =
  "mb-[5px] block text-[11px] font-[700] uppercase tracking-[0.03em] text-[var(--muted)]";

const compactInputClass =
  "!h-[38px] !min-h-[38px] !rounded-[8px] !px-[11px] !text-[13px]";

/* =========================================================
   DEDUCTION TYPE META
========================================================= */

const getTypeMeta = (label: string) => {
  const l = label.toLowerCase();

  if (l.includes("advance")) {
    return {
      icon: HandCoins,
      iconStyle: "text-indigo-500",
      hint: "Recovered in EMIs",
    };
  }

  if (l.includes("uniform")) {
    return {
      icon: Shirt,
      iconStyle: "text-sky-500",
      hint: "One-time",
    };
  }

  if (l.includes("loan") || l.includes("emi")) {
    return {
      icon: Landmark,
      iconStyle: "text-violet-500",
      hint: "From loan module",
    };
  }

  if (l.includes("damage")) {
    return {
      icon: Wrench,
      iconStyle: "text-rose-500",
      hint: "Needs approval",
    };
  }

  if (l.includes("notice")) {
    return {
      icon: FileX2,
      iconStyle: "text-amber-500",
      hint: "On exit only",
    };
  }

  if (l.includes("canteen")) {
    return {
      icon: UtensilsCrossed,
      iconStyle: "text-emerald-500",
      hint: "Monthly bill",
    };
  }

  if (l.includes("tds")) {
    return {
      icon: ReceiptText,
      iconStyle: "text-slate-600",
      hint: "Statutory",
    };
  }

  return {
    icon: CircleEllipsis,
    iconStyle: "text-slate-400",
    hint: "Explain in remark",
  };
};

/* =========================================================
   TYPE CARD
========================================================= */

const TypeCard = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => {
  const { icon: Icon, iconStyle, hint } = getTypeMeta(label);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[58px] flex-col justify-center rounded-[9px] border px-[10px] text-left transition ${
        active
          ? "border-indigo-500 bg-indigo-50"
          : "border-[var(--border)] bg-[var(--field)] hover:border-indigo-300"
      }`}
    >
      <span className="flex items-center gap-[8px]">
        <Icon size={15} className={`shrink-0 ${iconStyle}`} />

        <span
          className={`truncate text-[13px] font-[700] ${
            active ? "text-indigo-600" : "text-[var(--fg)]"
          }`}
        >
          {label}
        </span>
      </span>

      <span className="mt-[2px] pl-[23px] text-[11px] text-[var(--muted)]">
        {hint}
      </span>
    </button>
  );
};

/* =========================================================
   PREVIEW ROW
========================================================= */

const PreviewRow = ({
  label,
  value,
  valueClass = "text-[var(--fg)]",
  textClass = "text-[var(--muted)]",
}: {
  label: string;
  value: string;
  valueClass?: string;
  textClass?: string;
}) => (
  <div className="flex items-center justify-between border-b border-[var(--border)] py-[8px]">
    <span className={`text-[12px] ${textClass}`}>{label}</span>

    <span className={`text-[12px] font-[700] ${valueClass}`}>{value}</span>
  </div>
);

/* =========================================================
   PAGE
========================================================= */

export default function AddDeduction() {
  const user = useCurrentUser();
  const { compdata } = useSecureStorage();

  const previousPeriod = useMemo(() => getPreviousPeriod(), []);

  const [employees, setEmployees] = useState<SelectOption[]>([]);
  const [deductionTypes, setDeductionTypes] = useState<SelectOption[]>([]);
  const [showAllDeductionTypes, setShowAllDeductionTypes] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSalaryLoading, setIsSalaryLoading] = useState(false);
  const [isExistingLoading, setIsExistingLoading] = useState(false);

  const [balanceMessage, setBalanceMessage] = useState("");
  const [balanceAmount, setBalanceAmount] = useState<number | null>(null);

  const [salaryData, setSalaryData] = useState<any>(null);

  const [existingItems, setExistingItems] = useState<ExistingItem[]>([]);
  const [existingLoaded, setExistingLoaded] = useState(false);

  const [formdata, setFormData] = useState<FormData>({
    Created_by: user?.name || "",
    employeeData: {
      Ded_Type: null,
      Emp_Id: null,
      Emp_Name: null,
      Mnth: previousPeriod.month,
      Rec_Date: previousPeriod.date,
      Ded_Amt: null,
      Basic_Arr: null,
      HRA_ARR: null,
      Conv_Arr: null,
      Medical_Arr: null,
      Washing_Arr: null,
      Yr: previousPeriod.year,
      Loc_Code: user?.branch ?? null,
      Ded_Rem: "",
      Created_by: user?.name || null,
      status: null,
    },
  });

  const employeeData = formdata.employeeData;

  // Company permission controls manual deduction date change.
  const canChangeDate = Number(compdata?.allow_chng_Date_EmpDed) === 1;

  /* =========================================================
     USER DETAILS
  ========================================================= */

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      Created_by: user?.name || "",
      employeeData: prev.employeeData
        ? {
            ...prev.employeeData,
            Created_by: user?.name || null,
            Loc_Code: user?.branch ?? null,
          }
        : null,
    }));
  }, [user?.name, user?.branch]);

  /* =========================================================
     LOAD EMPLOYEES - DIRECT API
  ========================================================= */

  const findMasters = useCallback(async () => {
    if (!user?.Comp_Code) return;

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/empded/findMasters`,
        {
          branch: user?.branch,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
          timeout: 120000,
        },
      );

      console.log("FindMasters API Response:", response.data);

      const employeeList = Array.isArray(response.data)
        ? response.data
        : (response.data?.Employees ??
          response.data?.data?.Employees ??
          response.data?.data ??
          []);

      if (!Array.isArray(employeeList)) {
        console.error("Invalid Employee Response:", response.data);
        setEmployees([]);
        return;
      }

      const formattedEmployees: SelectOption[] = employeeList
        .map((item: any) => {
          const value =
            item?.value ??
            item?.Emp_Id ??
            item?.Emp_id ??
            item?.EMPCODE ??
            item?.Emp_Code ??
            item?.EmpCode;

          const label =
            item?.label ??
            item?.display_label ??
            item?.Emp_Name ??
            item?.EmployeeName ??
            item?.EmpName ??
            item?.name ??
            value;

          return {
            ...item,
            value: value !== undefined && value !== null ? String(value) : "",
            label: String(label ?? "").trim(),
          };
        })
        .filter((item: SelectOption) => item.value !== "");

      setEmployees(formattedEmployees);
    } catch (error: any) {
      console.error("FindMasters API Error:", error);
      console.error("FindMasters Server Response:", error?.response?.data);

      setEmployees([]);

      Swal.fire({
        icon: "error",
        title: "Employee Loading Failed",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to load employees",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.Comp_Code, user?.branch, user?.name]);

  useEffect(() => {
    if (user?.Comp_Code) {
      findMasters();
    }
  }, [user?.Comp_Code, findMasters]);

  /* =========================================================
     LOAD DEDUCTION TYPES
  ========================================================= */

  const getDeductionTypes = useCallback(async () => {
    if (!user?.Comp_Code) return;

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmpMaster/GetDeductionList`,
        {},
        {
          headers: {
            compcode: user.Comp_Code,
            name: user.name,
          },
        },
      );

      console.log("Deduction API Response:", response.data);

      const list =
        response.data?.DeductionList ??
        response.data?.data?.DeductionList ??
        [];

      const formattedTypes: SelectOption[] = Array.isArray(list)
        ? list.map((item: any) => ({
            ...item,
            value: String(item.value ?? item.Ded_Type ?? ""),
            label: String(
              item.display_label ?? item.label ?? item.Ded_Name ?? "",
            ),
          }))
        : [];

      setDeductionTypes(formattedTypes);
    } catch (error) {
      console.error("Deduction type API error:", error);

      Swal.fire({
        icon: "error",
        title: "Unable to load deduction types",
        text: "Please try again.",
      });
    }
  }, [user?.Comp_Code, user?.name]);

  useEffect(() => {
    getDeductionTypes();
  }, [getDeductionTypes]);

  /* =========================================================
     SALARY STRUCTURE API
  ========================================================= */

  const getEmployeeSalaryStructure = useCallback(async () => {
    const data = employeeData;

    if (!data?.Emp_Id || !data?.Mnth || !data?.Yr) {
      setSalaryData(null);
      return;
    }

    const selectedEmployee = employees.find(
      (item) => String(item.value) === String(data.Emp_Id),
    );

    const employeeCode =
      selectedEmployee?.EMPCODE ??
      selectedEmployee?.Emp_Code ??
      selectedEmployee?.EmpCode ??
      selectedEmployee?.EmployeeCode ??
      selectedEmployee?.empcode ??
      data.Emp_Id;

    const month = Number(data.Mnth);
    const year = Number(data.Yr);

    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(year)
    ) {
      setSalaryData(null);
      return;
    }

    const DATE_FROM = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();

    const DATE_TO = `${year}-${String(month).padStart(2, "0")}-${String(
      lastDay,
    ).padStart(2, "0")}`;

    try {
      setIsSalaryLoading(true);
      setSalaryData(null);

      const baseUrl =
        process.env.NEXT_PUBLIC_URL_local || process.env.NEXT_PUBLIC_URL;

      const response = await axios.post(
        `${baseUrl}/ars/getEmployeeSalaryStructure`,
        {
          EMPCODE: String(employeeCode),
          DATE_FROM,
          DATE_TO,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
          timeout: 120000,
        },
      );

      console.log("Employee Salary Structure API Response:", response.data);

      if (response.data?.success && response.data?.data) {
        setSalaryData(
          Array.isArray(response.data.data)
            ? response.data.data[0]
            : response.data.data,
        );
      } else {
        setSalaryData(null);
      }
    } catch (error: any) {
      console.error(
        "Get Employee Salary Structure Error:",
        error?.response?.data || error,
      );

      setSalaryData(null);
    } finally {
      setIsSalaryLoading(false);
    }
  }, [
    employeeData?.Emp_Id,
    employeeData?.Mnth,
    employeeData?.Yr,
    employees,
    user?.Comp_Code,
    user?.name,
  ]);

  useEffect(() => {
    if (
      employeeData?.Emp_Id &&
      employeeData?.Mnth &&
      employeeData?.Yr &&
      employees.length > 0
    ) {
      getEmployeeSalaryStructure();
    } else {
      setSalaryData(null);
    }
  }, [
    employeeData?.Emp_Id,
    employeeData?.Mnth,
    employeeData?.Yr,
    employees,
    getEmployeeSalaryStructure,
  ]);

  /* =========================================================
     BALANCE API
  ========================================================= */

  const getBalanceByDedType = async (
    dedType: string | number,
    month: string,
    year: string,
    empId: string | number,
    recDate?: string,
  ) => {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_URL}/empded/getbalancebyded_type`,
      {
        Emp_Id: String(empId),
        Ded_Type: dedType,
        Mnth: month,
        Yr: year,
        Loc_Code: user?.branch,
        ...(canChangeDate ? { Rec_Date: recDate } : {}),
      },
      {
        headers: {
          compcode: user?.Comp_Code,
          name: user?.name,
        },
      },
    );

    return response?.data;
  };

  /* =========================================================
     LOAD ALL EXISTING DEDUCTIONS FOR SELECTED MONTH
  ========================================================= */

  const fetchExistingDeductions = useCallback(async () => {
    const data = employeeData;

    if (
      !data?.Emp_Id ||
      !data?.Mnth ||
      !data?.Yr ||
      deductionTypes.length === 0
    ) {
      setExistingItems([]);
      setExistingLoaded(false);
      return;
    }

    setIsExistingLoading(true);
    setExistingLoaded(false);

    try {
      const results = await Promise.all(
        deductionTypes.map(async (deduction) => {
          try {
            const response = await getBalanceByDedType(
              deduction.value,
              data.Mnth!,
              data.Yr!,
              data.Emp_Id!,
              data.Rec_Date,
            );

            const amount = getAmountFromResponse(response);

            if (amount <= 0) return null;

            const responseData =
              response?.data?.data ??
              response?.data?.Data ??
              response?.data ??
              {};

            const note =
              responseData?.Ded_Rem ??
              responseData?.Remark ??
              responseData?.remarks ??
              responseData?.Description ??
              responseData?.description ??
              "";

            return {
              id: deduction.value,
              title: deduction.label,
              note: String(note || "Already deducted this month"),
              amount,
            } as ExistingItem;
          } catch (error) {
            console.error(
              `Existing deduction API error for ${deduction.label}:`,
              error,
            );
            return null;
          }
        }),
      );

      const validItems = results.filter(
        (item): item is ExistingItem => item !== null,
      );

      setExistingItems(validItems);
    } catch (error) {
      console.error("Existing deductions loading error:", error);
      setExistingItems([]);
    } finally {
      setIsExistingLoading(false);
      setExistingLoaded(true);
    }
  }, [
    employeeData?.Emp_Id,
    employeeData?.Mnth,
    employeeData?.Yr,
    employeeData?.Rec_Date,
    deductionTypes,
    user?.Comp_Code,
    user?.branch,
    user?.name,
    canChangeDate,
  ]);

  useEffect(() => {
    fetchExistingDeductions();
  }, [fetchExistingDeductions]);

  /* =========================================================
     FETCH SELECTED DEDUCTION BALANCE
  ========================================================= */

  const fetchDeductionBalance = async (data: EmployeeData) => {
    if (!data.Emp_Id || !data.Ded_Type || !data.Mnth || !data.Yr) {
      return;
    }

    if (canChangeDate && !data.Rec_Date) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await getBalanceByDedType(
        data.Ded_Type,
        data.Mnth,
        data.Yr,
        data.Emp_Id,
        data.Rec_Date,
      );

      if (
        response?.success &&
        response?.data !== undefined &&
        response?.data !== null
      ) {
        const amount = getAmountFromResponse(response);

        setBalanceAmount(amount);

        setFormData((prev) => ({
          ...prev,
          employeeData: prev.employeeData
            ? {
                ...prev.employeeData,
                Ded_Amt: amount,
              }
            : null,
        }));

        const employeeLabel =
          employees.find((item) => String(item.value) === String(data.Emp_Id))
            ?.label ||
          data.Emp_Name ||
          data.Emp_Id;

        const deductionLabel =
          deductionTypes.find(
            (item) => String(item.value) === String(data.Ded_Type),
          )?.label || data.Ded_Type;

        setBalanceMessage(
          `Employee: ${employeeLabel} | Deduction Type: ${deductionLabel} | Deduction Amount: ${formatINR(
            amount,
          )}`,
        );
      } else {
        setBalanceAmount(null);
        setBalanceMessage("");

        setFormData((prev) => ({
          ...prev,
          employeeData: prev.employeeData
            ? {
                ...prev.employeeData,
                Ded_Amt: null,
              }
            : null,
        }));
      }
    } catch (error) {
      console.error("Error fetching deduction balance:", error);

      setBalanceAmount(null);
      setBalanceMessage("");

      setFormData((prev) => ({
        ...prev,
        employeeData: prev.employeeData
          ? {
              ...prev.employeeData,
              Ded_Amt: null,
            }
          : null,
      }));

      Swal.fire({
        icon: "error",
        title: "Balance not available",
        text: "Unable to fetch deduction balance. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /* =========================================================
     FORM CHANGE HANDLER
  ========================================================= */

  const handleInputChange = async (name: string, rawValue: any) => {
    const value = getEventValue(rawValue);
    const current = employeeData;

    if (!current) return;

    // Date cannot be manually changed without company permission.
    // if (name === "Rec_Date" && !canChangeDate) {
    //   return;
    // }

    let nextValue: any = value;

    if (name === "Ded_Type" || name === "Emp_Id") {
      nextValue = value ? Number(value) : null;
    }

    if (name === "Ded_Amt") {
      nextValue = value === "" ? null : Number(value);
    }

    const updated: EmployeeData = {
      ...current,
      [name]: nextValue,
    };

    // Month/year change: default date becomes first day of selected month.
    if (name === "Mnth" || name === "Yr") {
      if (updated.Mnth && updated.Yr) {
        updated.Rec_Date = `${updated.Yr}-${String(updated.Mnth).padStart(
          2,
          "0",
        )}-01`;
      }
    }

    if (name === "Emp_Id") {
      const selectedEmployee = employees.find(
        (item) => String(item.value) === String(value),
      );

      updated.Emp_Name = selectedEmployee
        ? String(
            selectedEmployee.Emp_Name ??
              selectedEmployee.EmployeeName ??
              selectedEmployee.EmpName ??
              selectedEmployee.name ??
              selectedEmployee.label,
          )
            .replace(/^\d+\s*-\s*/, "")
            .trim()
        : null;

      updated.Ded_Amt = null;

      setBalanceAmount(null);
      setBalanceMessage("");
      setSalaryData(null);
      setExistingItems([]);
      setExistingLoaded(false);
    }

    if (name === "Ded_Type") {
      updated.Ded_Amt = null;
      setBalanceAmount(null);
      setBalanceMessage("");
    }

    setFormData((prev) => ({
      ...prev,
      employeeData: updated,
    }));

    const triggerFields = canChangeDate
      ? ["Mnth", "Yr", "Ded_Type", "Emp_Id", "Rec_Date"]
      : ["Mnth", "Yr", "Ded_Type", "Emp_Id"];

    if (triggerFields.includes(name)) {
      if (
        updated.Emp_Id &&
        updated.Ded_Type &&
        updated.Mnth &&
        updated.Yr &&
        (!canChangeDate || updated.Rec_Date)
      ) {
        await fetchDeductionBalance(updated);
      }
    }
  };

  /* =========================================================
     CLEAR FORM
  ========================================================= */

  const getEmptyForm = (): FormData => ({
    Created_by: user?.name || "",
    employeeData: {
      Ded_Type: null,
      Emp_Id: null,
      Emp_Name: null,
      Mnth: previousPeriod.month,
      Rec_Date: previousPeriod.date,
      Ded_Amt: null,
      Basic_Arr: null,
      HRA_ARR: null,
      Conv_Arr: null,
      Medical_Arr: null,
      Washing_Arr: null,
      Yr: previousPeriod.year,
      Loc_Code: user?.branch ?? null,
      Ded_Rem: "",
      Created_by: user?.name || null,
      status: null,
    },
  });

  const handleClear = () => {
    setFormData(getEmptyForm());
    setBalanceMessage("");
    setBalanceAmount(null);
    setSalaryData(null);
    setExistingItems([]);
    setExistingLoaded(false);
    setShowAllDeductionTypes(false);
  };

  /* =========================================================
     SAVE DEDUCTION
  ========================================================= */

  const handleSave = async () => {
    const data = formdata.employeeData;

    if (!data?.Emp_Id) {
      Swal.fire({
        icon: "warning",
        title: "Please select employee",
        text: "Employee cannot be empty.",
      });
      return;
    }

    if (!data.Rec_Date) {
      Swal.fire({
        icon: "warning",
        title: "Please select deduction date",
        text: "Deduction date cannot be empty.",
      });
      return;
    }

    if (!data.Mnth || !data.Yr) {
      Swal.fire({
        icon: "warning",
        title: "Select salary month and year",
        text: "Month and year are required.",
      });
      return;
    }

    const selectedDate = formatDate(data.Rec_Date);
    const [dateYear, dateMonth] = selectedDate.split("-");

    if (
      Number(dateMonth) !== Number(data.Mnth) ||
      Number(dateYear) !== Number(data.Yr)
    ) {
      Swal.fire({
        icon: "warning",
        title: "Invalid deduction date",
        text: `Deduction date must belong to month ${data.Mnth} and year ${data.Yr}.`,
      });
      return;
    }

    if (!data.Ded_Type) {
      Swal.fire({
        icon: "warning",
        title: "Please select deduction type",
        text: "Deduction type cannot be empty.",
      });
      return;
    }

    if (
      data.Ded_Amt === null ||
      Number(data.Ded_Amt) <= 0 ||
      !Number.isFinite(Number(data.Ded_Amt))
    ) {
      Swal.fire({
        icon: "warning",
        title: "Please enter deduction amount",
        text: "Deduction amount must be greater than zero.",
      });
      return;
    }

    if (!data.Ded_Rem?.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Please enter deduction remark",
        text: "Deduction remark cannot be empty.",
      });
      return;
    }

    /*
      Emp_Id / Emp_id are sent as strings to avoid backend
      validation errors such as "Emp_Id must be a string".
    */
    const employeeId = String(data.Emp_Id);

    const payload = {
      Created_by: user?.name || "",

      Emp_Id: employeeId,
      Emp_id: employeeId,

      employeeData: {
        ...data,

        Emp_Id: employeeId,
        Emp_id: employeeId,

        Loc_Code: user?.branch ?? data.Loc_Code,
        Created_by: user?.name || null,
        Rec_Date: selectedDate,
        Ded_Amt: Number(data.Ded_Amt),
      },
    };

    console.log("Insert Deduction Payload:", payload);

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/empded/insertData`,
        payload,
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
          timeout: 120000,
        },
      );

      console.log("Insert Deduction Response:", response.data);

      if (
        response.data?.success === false &&
        response.data?.message === "Record already exists"
      ) {
        const existing = response.data?.data;

        const result = await Swal.fire({
          icon: "warning",
          title: "Record already exists",
          text: "Do you want to load the existing record for updating?",
          showCancelButton: true,
          confirmButtonText: "Yes, update",
          cancelButtonText: "No, keep current",
        });

        if (result.isConfirmed && existing) {
          const existingData: EmployeeData = {
            Ded_Type: existing.Ded_Type ? Number(existing.Ded_Type) : null,

            Emp_Id:
              existing.Emp_Id !== undefined && existing.Emp_Id !== null
                ? Number(existing.Emp_Id)
                : null,

            Emp_Name: existing.Emp_Name ?? null,

            Mnth: existing.Mnth != null ? String(existing.Mnth) : null,

            Rec_Date: formatDate(existing.Rec_Date),

            Ded_Amt:
              existing.Ded_Amt !== undefined && existing.Ded_Amt !== null
                ? Number(existing.Ded_Amt)
                : null,

            Basic_Arr: existing.Basic_Arr ?? null,
            HRA_ARR: existing.HRA_ARR ?? null,
            Conv_Arr: existing.Conv_Arr ?? null,
            Medical_Arr: existing.Medical_Arr ?? null,
            Washing_Arr: existing.Washing_Arr ?? null,

            Yr: existing.Yr != null ? String(existing.Yr) : null,

            Loc_Code: existing.Loc_Code ?? user?.branch ?? null,

            Ded_Rem: existing.Ded_Rem ?? "",
            Created_by: user?.name || null,

            // Existing record is now marked for update.
            status: 1,
          };

          setFormData({
            Created_by: user?.name || "",
            employeeData: existingData,
          });

          setBalanceAmount(Number(existingData.Ded_Amt) || null);

          setBalanceMessage("");

          await Swal.fire({
            icon: "info",
            title: "Existing record loaded",
            text: "Existing record has been loaded into the form.",
          });
        } else {
          await Swal.fire({
            icon: "info",
            title: "Cancelled",
            text: "Existing data was not loaded.",
          });
        }

        return;
      }
      if (response.data?.success === true) {
        await Swal.fire({
          icon: "success",
          title: "Success",
          text: "Employee deduction saved successfully.",
        });

        setShowAllDeductionTypes(false);
        handleClear();
      } else {
        Swal.fire({
          icon: "error",
          title: "Unable to save",
          text: response.data?.message || "Something went wrong.",
        });
      }
    } catch (error: any) {
      console.error("Insert deduction error:", error);
      console.error("Insert deduction server response:", error?.response?.data);

      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "Something went wrong while saving the deduction.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /* =========================================================
     DERIVED VALUES
  ========================================================= */

  const selectedEmployeeLabel =
    employees.find(
      (item) => String(item.value) === String(employeeData?.Emp_Id),
    )?.label ||
    employeeData?.Emp_Name ||
    "";

  const selectedDeductionLabel =
    deductionTypes.find(
      (item) => String(item.value) === String(employeeData?.Ded_Type),
    )?.label || "";

  const monthLabel =
    MONTHS.find((item) => item.value === employeeData?.Mnth)?.label || "";

  const monthShort = monthLabel.slice(0, 3);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();

    return Array.from({ length: 8 }, (_, index) => {
      const value = String(currentYear - 3 + index);

      return {
        label: value,
        value,
      };
    });
  }, []);

  const thisDeduction = Number(employeeData?.Ded_Amt) || 0;

  const grossSalary = getSalaryAmount(salaryData, [
    "Gross_Salary",
    "GrossSalary",
    "GROSS_SALARY",
    "Gross",
  ]);

  const pfAmount = getSalaryAmount(salaryData, [
    "PF_Amount",
    "PF",
    "Pf_Amount",
    "PF_AMOUNT",
  ]);

  const esicAmount = getSalaryAmount(salaryData, [
    "ESIC_Amount",
    "ESIC",
    "ESIC_AMOUNT",
    "Esic_Amount",
  ]);

  const ptAmount = getSalaryAmount(salaryData, [
    "PT_Amount",
    "PT",
    "Professional_Tax",
    "ProfessionalTax",
    "PT_AMOUNT",
  ]);

  const statutoryAmount =
    pfAmount !== null && esicAmount !== null && ptAmount !== null
      ? pfAmount + esicAmount + ptAmount
      : null;

  const existingCount = existingItems.length;

  const existingTotal = existingItems.reduce(
    (total, item) => total + Number(item.amount || 0),
    0,
  );

  const netTakeHome =
    grossSalary !== null && statutoryAmount !== null && existingLoaded
      ? grossSalary - statutoryAmount - existingTotal - thisDeduction
      : null;

  const moneyOrDash = (value: number | null) =>
    value === null ? "—" : formatINR(value);

  const footerName = employeeData?.Emp_Name || selectedEmployeeLabel;

  /* =========================================================
     JSX
  ========================================================= */

  return (
    <main className="min-h-screen bg-[var(--bg)] px-[10px] py-[8px] text-[var(--fg)]">
      {/* HEADER */}

      <div className="mb-[10px]">
        <h1 className="m-0 text-[22px] font-[800] leading-tight tracking-[-0.02em]">
          Add a deduction
        </h1>

        <p className="mb-0 mt-[3px] text-[12px] text-[var(--muted)]">
          Recover an advance, uniform, damage or dues from a salary month. The
          net-pay preview updates as you type so nobody&apos;s take-home goes
          below the floor.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-[12px] xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* LEFT FORM */}

        <section className="min-w-0 rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-[16px] shadow-[var(--shadow)]">
          <div>
            <div className="relative">
              <Eselect
                title="EMPLOYEE"
                redlabel="*"
                name="Emp_Id"
                option={employees}
                initialValue={employeeData?.Emp_Id ?? ""}
                handleInputChange={handleInputChange}
                className={`${compactInputClass} !pl-[36px]`}
                placeholder="Select employee"
              />

              <Search
                size={15}
                className="pointer-events-none absolute bottom-[12px] left-[12px] text-[var(--muted)]"
              />
            </div>
          </div>

          <div className="mt-[12px] grid grid-cols-1 gap-[10px] sm:grid-cols-[145px_125px_minmax(0,1fr)]">
            <div>
              <Eselect
                title="SALARY MONTH"
                name="Mnth"
                option={MONTHS}
                redlabel="*"
                initialValue={employeeData?.Mnth ?? ""}
                handleInputChange={handleInputChange}
                className={compactInputClass}
                placeholder="Select month"
              />
            </div>

            <div>
              <Eselect
                title="YEAR"
                name="Yr"
                option={yearOptions}
                initialValue={employeeData?.Yr ?? ""}
                handleInputChange={handleInputChange}
                className={compactInputClass}
                placeholder="Select year"
              />
            </div>

            <div>
              <div
                onBlur={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;

                  setFormData((prev) => {
                    if (!prev.employeeData) return prev;

                    const { Mnth, Yr } = prev.employeeData;

                    if (!Mnth || !Yr) return prev;

                    return {
                      ...prev,
                      employeeData: {
                        ...prev.employeeData,
                        Rec_Date: `${Yr}-${String(Mnth).padStart(2, "0")}-01`,
                      },
                    };
                  });
                }}
              >
                <Einput
                  title="DEDUCTION DATE"
                  name="Rec_Date"
                  type="date"
                  value={employeeData?.Rec_Date ?? ""}
                  handleInputChange={handleInputChange}
                  className={compactInputClass}
                />
              </div>
            </div>
          </div>
<div className="mt-[14px]">
  <label className={labelClass}>
    Deduction type <span className="text-rose-500">*</span>
  </label>

  {deductionTypes.length === 0 ? (
    <p className="m-0 text-[12px] text-[var(--muted)]">
      Loading deduction types...
    </p>
  ) : (
    <div
      className="grid grid-cols-1 gap-[8px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {(showAllDeductionTypes
        ? deductionTypes
        : deductionTypes.slice(0, 6)
      ).map((item) => (
        <TypeCard
          key={item.value}
          label={item.label}
          active={
            String(employeeData?.Ded_Type) === String(item.value)
          }
          onClick={() => handleInputChange("Ded_Type", item.value)}
        />
      ))}

      {!showAllDeductionTypes && deductionTypes.length > 6 && (
        <button
          type="button"
          onClick={() => setShowAllDeductionTypes(true)}
          className="flex h-[58px] w-full min-w-0 flex-col justify-center rounded-[9px] border border-dashed border-indigo-300 bg-indigo-50/50 px-[10px] text-left transition-colors hover:border-indigo-500 hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/20"
        >
          <span className="flex min-w-0 items-center gap-[8px]">
            <CircleEllipsis
              size={15}
              className="shrink-0 text-indigo-500 dark:text-indigo-300"
            />

            <span className="truncate text-[13px] font-[700] text-indigo-600 dark:text-indigo-300">
              Other
            </span>
          </span>

          <span className="mt-[2px] pl-[23px] text-[11px] text-indigo-600/70 dark:text-indigo-300/70">
            Show all deduction types
          </span>
        </button>
      )}

      {showAllDeductionTypes && deductionTypes.length > 6 && (
        <button
          type="button"
          onClick={() => setShowAllDeductionTypes(false)}
          className="flex h-[58px] w-full min-w-0 flex-col justify-center rounded-[9px] border border-dashed border-slate-300 bg-slate-100 px-[10px] text-left transition-colors hover:border-indigo-400 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-indigo-400 dark:hover:bg-slate-700"
        >
          <span className="flex min-w-0 items-center gap-[8px]">
            <CircleEllipsis
              size={15}
              className="shrink-0 text-slate-500 dark:text-slate-300"
            />

            <span className="truncate text-[13px] font-[700] text-slate-700 dark:text-slate-200">
              Show less
            </span>
          </span>

          <span className="mt-[2px] pl-[23px] text-[11px] text-slate-600 dark:text-slate-400">
            Back to 2 rows
          </span>
        </button>
      )}
    </div>
  )}
</div>

          <div className="mt-[14px] grid grid-cols-1 items-end gap-[10px] lg:grid-cols-[300px_155px_minmax(0,1fr)]">
            <div className="relative">
              <Einput
                title="DEDUCTION AMOUNT"
                redlabel="*"
                name="Ded_Amt"
                value={employeeData?.Ded_Amt ?? ""}
                handleInputChange={handleInputChange}
                placeholder="Enter deduction amount"
                className={`${compactInputClass} !pl-[36px]`}
              />

              <IndianRupee
                size={13}
                className="pointer-events-none absolute bottom-[13px] left-[12px] text-[var(--muted)]"
              />
            </div>

            <div>
              <label className={labelClass}>Installments</label>

              <div className="flex h-[38px] items-center rounded-[8px] border border-[var(--border)] bg-[var(--field)] px-[10px]">
                <span className="truncate text-[12px] text-[var(--fg)]">
                  1 — full amount this month
                </span>
              </div>
            </div>

            <div className="flex h-[38px] items-center gap-[8px] rounded-[8px] border border-[var(--border)] bg-[var(--field)] px-[10px]">
              <CalendarClock size={15} className="shrink-0 text-indigo-500" />

              <span className="truncate text-[12px] text-[var(--muted)]">
                {monthShort && employeeData?.Yr
                  ? `Deducted in full from ${monthShort} ${employeeData.Yr}.`
                  : "Deducted in full this month."}
              </span>
            </div>
          </div>

          <div className="mt-[14px]">
            <Einput
              title="Deduction remark"
              name="Ded_Rem"
              redlabel="*"
              value={employeeData?.Ded_Rem || ""}
              handleInputChange={handleInputChange}
              placeholder="Why is this being deducted?"
              maxLength={200}
              className={compactInputClass}
            />
          </div>

          {/* {balanceAmount !== null && balanceAmount > 0 && (
            <div className="mt-[12px] flex items-center gap-[9px] bg-yellow-100 rounded-[8px] border border-amber-200 bg-amber-50 px-[10px] py-[8px]">
              <TriangleAlert size={15} className="shrink-0 text-amber-600" />

              <p className="m-0 text-[12px] text-slate-700">
                This employee already has a{" "}
                {(selectedDeductionLabel || "deduction").toLowerCase()} of{" "}
                {formatINR(balanceAmount)} on this month. Check you are not
                deducting twice.
              </p>
            </div>
          )} */}

          <div className="mt-[10px] flex flex-col justify-between gap-[9px] border-t border-[var(--border)] pt-[13px] sm:flex-row sm:items-center">
            <p className="m-0 text-[12px] text-[var(--muted)]">
              {employeeData?.Ded_Amt
                ? `${formatINR(employeeData.Ded_Amt)} from ${footerName} in ${monthShort} ${employeeData.Yr}`
                : "Select employee and deduction details to continue."}
            </p>

            <div className="flex items-center gap-[8px]">
              <AButton
                type="button"
                onClick={handleClear}
                className="!h-[38px] !rounded-[8px] !border !border-[var(--border)] !bg-[var(--card)] !px-[16px] !text-[13px] !font-[700] !text-[var(--muted)] hover:!bg-[var(--field)]"
              >
                Clear
              </AButton>

              <AButton
                type="button"
                onClick={handleSave}
                disabled={isLoading}
                className="!inline-flex !h-[38px] !items-center !justify-center !gap-[7px] !rounded-[8px] !bg-emerald-500 !px-[16px] !text-[13px] !font-[700] !text-white hover:!bg-emerald-600 disabled:!cursor-not-allowed disabled:!opacity-60"
              >
                <Save size={14} />
                Save deduction
              </AButton>
            </div>
          </div>
        </section>

        {/* RIGHT SUMMARY */}

        <aside className="space-y-[12px]">
          {/* NET PAY PREVIEW */}

          <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-[14px] shadow-[var(--shadow)]">
            <div className="mb-[8px] flex items-center justify-between">
              <p className="m-0 text-[11px] font-[700] uppercase tracking-[0.03em] text-[var(--muted)]">
                Net Pay Preview
              </p>

              {isSalaryLoading && (
                <span className="text-[10px] font-[600] text-indigo-500">
                  Loading salary...
                </span>
              )}
            </div>

            <PreviewRow
              label="Gross for the month"
              value={moneyOrDash(grossSalary)}
            />

            <PreviewRow
              label="PF, ESIC and PT"
              value={
                statutoryAmount === null
                  ? "—"
                  : `-${formatINR(statutoryAmount)}`
              }
            />

            <PreviewRow
              label={`Existing deductions (${existingCount})`}
              value={
                existingLoaded ? `-${formatINR(existingTotal)}` : "Loading..."
              }
            />

            <PreviewRow
              label="This deduction"
              value={thisDeduction > 0 ? `-${formatINR(thisDeduction)}` : "—"}
              valueClass="text-rose-600"
              textClass="font-[600] text-[var(--fg)]"
            />

            <div className="flex items-center justify-between pt-[10px]">
              <span className="text-[14px] font-[800] text-[var(--fg)]">
                Net take-home
              </span>

              <span
                className={`text-[16px] font-[800] ${
                  netTakeHome !== null && netTakeHome < 0
                    ? "text-rose-600"
                    : "text-emerald-500"
                }`}
              >
                {netTakeHome === null
                  ? "—"
                  : `${netTakeHome < 0 ? "-" : ""}${formatINR(netTakeHome)}`}
              </span>
            </div>

            {!salaryData && !isSalaryLoading && employeeData?.Emp_Id && (
              <p className="mb-0 mt-[8px] text-[11px] text-[var(--muted)]">
                Salary structure not found for the selected month.
              </p>
            )}

            {!employeeData?.Emp_Id && (
              <p className="mb-0 mt-[8px] text-[11px] text-[var(--muted)]">
                Select an employee to view the salary preview.
              </p>
            )}
          </div>

          {/* ALREADY ON THIS MONTH */}

          <div className="rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-[14px] shadow-[var(--shadow)]">
            <div className="mb-[10px] flex items-center justify-between">
              <p className="m-0 text-[11px] font-[700] uppercase tracking-[0.03em] text-[var(--muted)]">
                Already on this month
              </p>

              {isExistingLoading && (
                <span className="text-[10px] font-[600] text-indigo-500">
                  Loading...
                </span>
              )}
            </div>

            <div className="space-y-[8px]">
              {existingItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-[9px] border border-[var(--border)] bg-[var(--card)] px-[10px] py-[9px]"
                >
                  <div className="min-w-0">
                    <p className="m-0 truncate text-[12px] font-[700] text-[var(--fg)]">
                      {item.title}
                    </p>

                    <p className="mb-0 mt-[2px] truncate text-[11px] text-[var(--muted)]">
                      {item.note}
                    </p>
                  </div>

                  <span className="ml-[8px] shrink-0 text-[13px] font-[800] text-rose-600">
                    {formatINR(item.amount)}
                  </span>
                </div>
              ))}

              {!isExistingLoading &&
                existingLoaded &&
                existingItems.length === 0 && (
                  <p className="m-0 text-[12px] text-[var(--muted)]">
                    No existing deductions found for this month.
                  </p>
                )}

              {!employeeData?.Emp_Id && (
                <p className="m-0 text-[12px] text-[var(--muted)]">
                  Select an employee to see existing deductions.
                </p>
              )}

              {employeeData?.Emp_Id &&
                !existingLoaded &&
                !isExistingLoading && (
                  <p className="m-0 text-[12px] text-[var(--muted)]">
                    Select month and year to load existing deductions.
                  </p>
                )}
            </div>
          </div>
        </aside>
      </div>

      <HashloaderComponent isLoading={isLoading} />
    </main>
  );
}
