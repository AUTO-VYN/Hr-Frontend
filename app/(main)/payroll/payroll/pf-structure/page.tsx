"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import { useCurrentUser } from "@/app/hooks/use-current-user";

import {
  Search,
  Users,
  IndianRupee,
  Wallet,
  TrendingDown,
} from "lucide-react";

import AButton from "@/components/atoms/Button";
import Eselect from "@/components/atoms/Eselect";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

type Option = {
  value: string;
  label: string;
};

type FilterOption = {
  value: string;
  label: string;
};

type PFRow = {
  id: string;
  payCode: string;
  employee: string;
  empCode: string;
  location: string;
  region: string;
  hra: number;
  earnDA: number;
  salaryAdvance: number;
  loan1: number;
  tds1: number;
  conveyance: number;
  newUniform: number;
  otherDeduction: number;
  pfContribution: number;
  finalPayment: number;
  [key: string]: any;
};

const MONTHS: Option[] = [
  { value: "1", label: "Jan" },
  { value: "2", label: "Feb" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Apr" },
  { value: "5", label: "May" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Aug" },
  { value: "9", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

const getCurrentFinancialYear = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  return currentDate.getMonth() < 3
    ? currentYear - 1
    : currentYear;
};

const CURRENT_FY = getCurrentFinancialYear();

const YEARS: Option[] = Array.from({ length: 6 }, (_, index) => {
  const year = CURRENT_FY + 1 - index;

  return {
    value: String(year),
    label: `${year}-${String(year + 1).slice(-2)}`,
  };
});

const COLUMNS = [
  {
    key: "payCode",
    label: "Pay code",
    accessor: "payCode",
    headerKey: "pay_code",
  },
  {
    key: "employee",
    label: "Employee",
    accessor: "employee",
    headerKey: "EmpName",
  },
  {
    key: "location",
    label: "Location",
    accessor: "location",
    headerKey: "Location",
  },
  {
    key: "hra",
    label: "HRA earn",
    accessor: "hra",
    headerKey: "hra_earn",
  },
  {
    key: "earnDA",
    label: "Earn DA",
    accessor: "earnDA",
    headerKey: "other_earn",
  },
  {
    key: "salaryAdvance",
    label: "Salary advance",
    accessor: "salaryAdvance",
    headerKey: "advance",
  },
  {
    key: "loan1",
    label: "Loan 1",
    accessor: "loan1",
    headerKey: "loan",
  },
  {
    key: "tds1",
    label: "TDS 1",
    accessor: "tds1",
    headerKey: "tds",
  },
  {
    key: "conveyance",
    label: "Conveyance",
    accessor: "conveyance",
    headerKey: "CONVEN_Earn",
  },
  {
    key: "newUniform",
    label: "New uniform",
    accessor: "newUniform",
    headerKey: "New_Uniform",
  },
  {
    key: "otherDeduction",
    label: "Other deduction",
    accessor: "otherDeduction",
    headerKey: "ded",
  },
  {
    key: "pfContribution",
    label: "PF contribution",
    accessor: "pfContribution",
    headerKey: "pf_employee",
  },
  {
    key: "finalPayment",
    label: "Final payment",
    accessor: "finalPayment",
    headerKey: "Final_Payment",
  },
] as const;

const DEFAULT_COLUMNS = [
  "payCode",
  "employee",
  "location",
  "hra",
  "earnDA",
  "salaryAdvance",
  "loan1",
  "tds1",
  "finalPayment",
];

const INITIAL_REGIONS: FilterOption[] = [];
const INITIAL_LOCATIONS: FilterOption[] = [];

const formatAmount = (value: any) => {
  const amount = Number(value || 0);

  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
};

const formatCompactAmount = (value: number) => {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)} L`;
  }

  if (value >= 1000) {
    return `₹${(value / 1000).toFixed(1)} K`;
  }

  return formatAmount(value);
};

const getValue = (obj: any, ...keys: string[]) => {
  for (const key of keys) {
    const value = obj?.[key];

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return "";
};

const getNumber = (obj: any, ...keys: string[]) => {
  const value = getValue(obj, ...keys);
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
};

const mapMasterOptions = (data: any[]): FilterOption[] => {
  if (!Array.isArray(data)) return [];

  const mapped = data
    .map((item: any) => {
      if (
        typeof item === "string" ||
        typeof item === "number"
      ) {
        return {
          value: String(item),
          label: String(item),
        };
      }

      const value = getValue(
        item,
        "value",
        "Code",
        "code",
        "Loc_Code",
        "LocCode",
        "Region_Code",
        "RegionCode",
        "id"
      );

      const label = getValue(
        item,
        "label",
        "Name",
        "name",
        "loc_name",
        "Loc_Name",
        "Location",
        "Region",
        "Region_Name",
        "Branch_Name"
      );

      if (!value && !label) return null;

      return {
        value: String(value || label),
        label: String(label || value),
      };
    })
    .filter(Boolean) as FilterOption[];

  return mapped.filter(
    (item, index, arr) =>
      arr.findIndex(
        (x) => x.value === item.value
      ) === index
  );
};

const getPFResponseRows = (responseData: any): any[] => {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  const possibleRows = [
    responseData?.data,
    responseData?.result,
    responseData?.rows,
    responseData?.Data,
    responseData?.Result,
    responseData?.data?.data,
    responseData?.data?.result,
    responseData?.data?.rows,
  ];

  return possibleRows.find(Array.isArray) || [];
};

const mapPFRow = (row: any, index: number): PFRow => {
  return {
    id: String(
      getValue(row, "UTD", "id", "ID", "EmpCode", "Emp_Code") ||
        index
    ),

    payCode: String(
      getValue(row, "pay_code", "payCode", "PayCode") || ""
    ),

    employee: String(
      getValue(row, "EmpName", "employee", "EmployeeName") || ""
    ),

    empCode: String(
      getValue(row, "EmpCode", "empCode", "EMP_CODE") || ""
    ),

    location: String(
      getValue(
        row,
        "Location",
        "location",
        "Loc_Name",
        "loc_name"
      ) || ""
    ),

    region: String(
      getValue(row, "Region", "region", "Region_Name") || ""
    ),

    hra: getNumber(row, "hra_earn", "hra", "HRA"),

    earnDA: getNumber(
      row,
      "other_earn",
      "earnDA",
      "Da",
      "DA"
    ),

    salaryAdvance: getNumber(
      row,
      "advance",
      "salaryAdvance",
      "Advance"
    ),

    loan1: getNumber(row, "loan", "loan1", "Loan"),

    tds1: getNumber(row, "tds", "tds1", "TDS"),

    conveyance: getNumber(
      row,
      "CONVEN_Earn",
      "conveyance",
      "VCONV_AMT"
    ),

    newUniform: getNumber(
      row,
      "New_Uniform",
      "newUniform",
      "Uniform"
    ),

    otherDeduction: getNumber(
      row,
      "ded",
      "otherDeduction",
      "OTH_DEDUCTION"
    ),

    pfContribution: getNumber(
      row,
      "pf_employee",
      "pfContribution",
      "PF"
    ),

    finalPayment: getNumber(
      row,
      "Final_Payment",
      "finalPayment",
      "VSALARY"
    ),
  };
};


function FilterCard({
  title,
  options,
  selected,
  search,
  onSearch,
  onChange,
  onAll,
}: {
  title: string;
  options: FilterOption[];
  selected: string[];
  search: string;
  onSearch: (value: string) => void;
  onChange: (value: string) => void;
  onAll: () => void;
}) {
  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return options;

    return options.filter((item) =>
      item.label.toLowerCase().includes(term)
    );
  }, [options, search]);

  const allSelected =
    options.length > 0 &&
    options.every((item) => selected.includes(item.value));

  return (
    <div className="overflow-hidden rounded-xl border border-[#dce5f1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e8edf5] px-4 py-3.5 dark:border-slate-800">
        <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-[#152b4b] dark:text-slate-100">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => {
              if (e.target.checked) onAll();
              else onChange("__CLEAR_ALL__");
            }}
            className="h-4 w-4 rounded border-[#dce5f1] text-indigo-600"
          />

          {title}

          <span className="text-[11px] font-normal text-slate-400">
            ({selected.length}/{options.length})
          </span>
        </label>

        <button
          type="button"
          onClick={onAll}
          className="text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
        >
          All
        </button>
      </div>

      {/* Search */}
      <div className="relative border-b border-[#e8edf5] px-4 py-3 dark:border-slate-800">
        <Search
          size={15}
          className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={`Search ${title.toLowerCase()}...`}
          className="h-[36px] w-full rounded-lg border border-[#dce5f1] bg-white pl-9 pr-3 text-[12px] text-[#152b4b] outline-none placeholder:text-slate-400 focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      {/* Options */}
      <div className="max-h-[230px] min-h-[150px] space-y-1.5 overflow-y-auto p-3">
        {filteredOptions.length ? (
          filteredOptions.map((item) => (
            <label
              key={item.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <input
                type="checkbox"
                checked={selected.includes(item.value)}
                onChange={() => onChange(item.value)}
                className="h-4 w-4 shrink-0 rounded border-[#dce5f1] text-indigo-600"
              />

              <span className="text-[12px] font-medium text-[#52627c] dark:text-slate-300">
                {item.label}
              </span>
            </label>
          ))
        ) : (
          <p className="px-2 py-3 text-[12px] text-slate-400">
            No options found
          </p>
        )}
      </div>
    </div>
  );
}


function SummaryCard({
  label,
  value,
  subText,
  dotColor,
  icon: Icon,
}: {
  label: string;
  value: string;
  subText: string;
  dotColor: string;
  icon: React.ElementType;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#dce5f1] bg-white px-3.5 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />

        <span className="text-[11px] font-medium text-[#64748b] dark:text-slate-400">
          {label}
        </span>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="truncate text-[19px] font-bold leading-tight text-[#152b4b] dark:text-slate-100">
          {value}
        </p>

        <Icon
          size={17}
          className="shrink-0 text-slate-300 dark:text-slate-600"
        />
      </div>

      <p className="mt-1 text-[10px] text-[#71819b] dark:text-slate-500">
        {subText}
      </p>
    </div>
  );
}

export default function PFStructurePage() {
  const user = useCurrentUser();

  const [loading, setLoading] = useState(false);

  const [year, setYear] = useState(String(CURRENT_FY));

  const [month, setMonth] = useState(
    String(new Date().getMonth() + 1)
  );

  const [regions, setRegions] = useState<FilterOption[]>(
    INITIAL_REGIONS
  );

  const [locations, setLocations] = useState<FilterOption[]>(
    INITIAL_LOCATIONS
  );

  const [selectedRegions, setSelectedRegions] = useState<string[]>(
    []
  );

  const [selectedLocations, setSelectedLocations] = useState<
    string[]
  >([]);

  const [regionSearch, setRegionSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [tableSearch, setTableSearch] = useState("");

  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    [...DEFAULT_COLUMNS]
  );

  const [headerLabels, setHeaderLabels] = useState<
    Record<string, string>
  >({});

  const [rows, setRows] = useState<PFRow[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const baseUrl = process.env.NEXT_PUBLIC_URL;

  const periodLabel = `${
    MONTHS.find((item) => item.value === month)?.label || month
  } ${year}-${String(Number(year) + 1).slice(-2)}`;

  const apiHeaders = useMemo(
    () => ({
      compcode: user?.Comp_Code,
      name: user?.name,
    }),
    [user?.Comp_Code, user?.name]
  );

  const handleInputChange = (name: string, value: any) => {
    if (name === "year") setYear(String(value));
    if (name === "month") setMonth(String(value));
  };

  const toggleFilter = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (value === "__CLEAR_ALL__") {
      setter([]);
      return;
    }

    setter((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) =>
      prev.includes(key)
        ? prev.filter((item) => item !== key)
        : [...prev, key]
    );
  };

  const resetColumns = () => {
    setSelectedColumns([...DEFAULT_COLUMNS]);
  };

  // Dynamic table headings
  useEffect(() => {
    if (!user?.Comp_Code || !baseUrl) return;

    let cancelled = false;

    const fetchHeaders = async () => {
      try {
        const response = await axios.post(
          `${baseUrl}/employee/GetPfStructureHeaders`,
          {},
          {
            headers: apiHeaders,
          }
        );

        if (cancelled) return;

        const headers = response.data?.headers;

        if (Array.isArray(headers)) {
          const mapped: Record<string, string> = {};

          headers.forEach((item: any) => {
            if (item?.accessor && item?.Header) {
              mapped[String(item.accessor)] = String(
                item.Header
              );
            }
          });

          setHeaderLabels(mapped);
        }
      } catch (error) {
        console.error("PF header fetch error:", error);
      }
    };

    fetchHeaders();

    return () => {
      cancelled = true;
    };
  }, [baseUrl, apiHeaders, user?.Comp_Code]);

  // Region and Location master data
  useEffect(() => {
    if (!user?.Comp_Code || !user?.branch || !baseUrl) return;

    let cancelled = false;

    const fetchMasters = async () => {
      try {
        const response = await axios.post(
          `${baseUrl}/hrmsreport/findMasters`,
          {
            multiloc: user.branch,
          },
          {
            headers: apiHeaders,
          }
        );

        if (cancelled) return;

        const masterData = response.data?.data || {};

        // Existing API returns Location[0] as location options.
        const rawLocations = Array.isArray(masterData.Location?.[0])
          ? masterData.Location[0]
          : Array.isArray(masterData.Location)
            ? masterData.Location
            : [];

        const rawRegions = Array.isArray(masterData.Region)
          ? masterData.Region
          : [];

        setLocations(mapMasterOptions(rawLocations));
        setRegions(mapMasterOptions(rawRegions));
      } catch (error) {
        console.error("PF master fetch error:", error);

        if (!cancelled) {
          setLocations([]);
          setRegions([]);
        }
      }
    };

    fetchMasters();

    return () => {
      cancelled = true;
    };
  }, [baseUrl, apiHeaders, user?.Comp_Code, user?.branch]);

  const visibleColumns = useMemo(
    () =>
      COLUMNS.filter((column) =>
        selectedColumns.includes(column.key)
      ),
    [selectedColumns]
  );

  const filteredRows = useMemo(() => {
    const term = tableSearch.trim().toLowerCase();

    if (!term) return rows;

    return rows.filter((row) =>
      [
        row.payCode,
        row.employee,
        row.empCode,
        row.location,
        row.region,
      ].some((value) =>
        String(value || "").toLowerCase().includes(term)
      )
    );
  }, [rows, tableSearch]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.employees += 1;
        acc.finalPayment += Number(row.finalPayment || 0);
        acc.pfContribution += Number(row.pfContribution || 0);

        acc.recoveries +=
          Number(row.salaryAdvance || 0) +
          Number(row.loan1 || 0) +
          Number(row.tds1 || 0) +
          Number(row.newUniform || 0) +
          Number(row.otherDeduction || 0);

        return acc;
      },
      {
        employees: 0,
        finalPayment: 0,
        pfContribution: 0,
        recoveries: 0,
      }
    );
  }, [rows]);

  const columns = useMemo(() => {
    return visibleColumns.map((column) => {
      const isAmount = [
        "hra",
        "earnDA",
        "salaryAdvance",
        "loan1",
        "tds1",
        "conveyance",
        "newUniform",
        "otherDeduction",
        "pfContribution",
        "finalPayment",
      ].includes(column.key);

      const dynamicLabel =
        headerLabels[column.headerKey] || column.label;

      return {
        Header: (
          <span
            className={
              column.key === "payCode" ? "text-indigo-600" : ""
            }
          >
            {dynamicLabel.toUpperCase()}
            {column.key === "payCode" ? " ↑" : ""}
          </span>
        ),

        accessor: column.accessor,

        minWidth:
          column.key === "employee"
            ? 190
            : column.key === "location"
              ? 140
              : 110,

        Cell: ({ row, value }: any) => {
          const item = row.original as PFRow;

          if (column.key === "payCode") {
            return (
              <span className="text-[12px] font-semibold text-[#152b4b] dark:text-slate-100">
                {value || "—"}
              </span>
            );
          }

          if (column.key === "employee") {
            return (
              <div className="min-w-[130px]">
                <p className="text-[12px] font-semibold text-[#152b4b] dark:text-slate-100">
                  {item.employee || "—"}
                </p>

                <p className="text-[10px] text-[#71819b] dark:text-slate-400">
                  Code {item.empCode || "—"}
                </p>
              </div>
            );
          }

          if (column.key === "location") {
            return (
              <span className="text-[11px] text-[#64748b] dark:text-slate-300">
                {value || "—"}
              </span>
            );
          }

          if (isAmount) {
            return (
              <span
                className={`whitespace-nowrap text-[11px] ${
                  column.key === "finalPayment"
                    ? "font-bold text-[#152b4b] dark:text-slate-100"
                    : "font-medium text-[#52627c] dark:text-slate-300"
                }`}
              >
                {Number(value || 0) === 0
                  ? "—"
                  : formatAmount(value)}
              </span>
            );
          }

          return value || "—";
        },
      };
    });
  }, [visibleColumns, headerLabels]);

  // Fetch PF Structure
  const handleShowStructure = useCallback(async () => {
    if (!user?.Comp_Code || !baseUrl) {
      setErrorMessage("User or company information is not available.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await axios.post(
        `${baseUrl}/employee/PfStructure`,
        {
          location: selectedLocations,
          region: selectedRegions,
          salyear: year,
          SalMnth: month,
        },
        {
          headers: apiHeaders,
        }
      );

      const responseRows = getPFResponseRows(response.data);

      const mappedRows = responseRows.map((row, index) =>
        mapPFRow(row, index)
      );

      setRows(mappedRows);
      setHasSearched(true);
      setTableSearch("");
    } catch (error: any) {
      console.error("PF Structure API error:", error);

      setRows([]);
      setHasSearched(true);

      setErrorMessage(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Unable to fetch PF Structure. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [
    user?.Comp_Code,
    baseUrl,
    selectedLocations,
    selectedRegions,
    year,
    month,
    apiHeaders,
  ]);

  const handleClearFilters = () => {
    setSelectedRegions([]);
    setSelectedLocations([]);
    setRegionSearch("");
    setLocationSearch("");
    setTableSearch("");
    setHasSearched(false);
    setErrorMessage("");
    setRows([]);
  };

  return (
    <div className="min-h-screen min-w-0 bg-[#f5f8fc] p-3 transition-colors dark:bg-[#0b1220] sm:p-4 lg:p-5">
      <HashloaderComponent isLoading={loading} />

      <div className="mx-auto max-w-[1900px] space-y-3">
        {/* PAGE HEADER */}
        <div>
          <h1 className="text-[20px] font-bold leading-tight text-[#152b4b] dark:text-slate-100 sm:text-[22px]">
            PF structure
          </h1>

          <p className="mt-1 text-[12px] text-[#64748b] dark:text-slate-400">
            The full salary structure behind the month, head by
            head. Pick which columns you want to see — the export
            carries exactly the same set.
          </p>
        </div>

        {/* MAIN LAYOUT */}
        <div className="grid min-w-0 grid-cols-1 items-start gap-3 lg:grid-cols-[268px_minmax(0,1fr)]">
          {/* LEFT FILTER PANEL */}
          <aside className="min-w-0 space-y-3">
            {/* PERIOD CARD */}
            <div className="rounded-xl border border-[#dce5f1] bg-white p-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="min-w-0">
                  <Eselect
                    title="YEAR"
                    name="year"
                    option={YEARS}
                    initialValue={year}
                    handleInputChange={handleInputChange}
                    className="h-[36px] w-full"
                  />
                </div>

                <div className="min-w-0">
                  <Eselect
                    title="MONTH"
                    name="month"
                    option={MONTHS}
                    initialValue={month}
                    handleInputChange={handleInputChange}
                    className="h-[36px] w-full"
                  />
                </div>
              </div>

              <AButton
                type="button"
                onClick={handleShowStructure}
                disabled={loading || !user?.Comp_Code}
                className="mt-3 inline-flex h-[36px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 text-[12px] font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                <Search size={14} />
                Show structure
              </AButton>
            </div>

            {/* REGIONS */}
            <FilterCard
              title="Regions"
              options={regions}
              selected={selectedRegions}
              search={regionSearch}
              onSearch={setRegionSearch}
              onChange={(value) =>
                toggleFilter(value, setSelectedRegions)
              }
              onAll={() =>
                setSelectedRegions(
                  regions.map((item) => item.value)
                )
              }
            />

            {/* LOCATIONS */}
            <FilterCard
              title="Locations"
              options={locations}
              selected={selectedLocations}
              search={locationSearch}
              onSearch={setLocationSearch}
              onChange={(value) =>
                toggleFilter(value, setSelectedLocations)
              }
              onAll={() =>
                setSelectedLocations(
                  locations.map((item) => item.value)
                )
              }
            />

            {/* COLUMN SELECTOR */}
            <div className="rounded-xl border border-[#dce5f1] bg-white p-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#71819b]">
                  Columns
                </span>

                <button
                  type="button"
                  onClick={resetColumns}
                  className="text-[10px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Reset
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {COLUMNS.map((column) => {
                  const active = selectedColumns.includes(
                    column.key
                  );

                  return (
                    <button
                      key={column.key}
                      type="button"
                      onClick={() => toggleColumn(column.key)}
                      className={`rounded-lg border px-2 py-1 text-[10px] font-medium transition ${
                        active
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500/60 dark:bg-indigo-500/10 dark:text-indigo-300"
                          : "border-[#dce5f1] bg-white text-[#64748b] hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {column.label}
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 border-t border-slate-100 pt-2 text-[10px] text-[#94a3b8] dark:border-slate-800">
                {selectedColumns.length} columns selected
              </p>
            </div>

          
          </aside>

          {/* RIGHT CONTENT */}
          <main className="min-w-0 space-y-3">
            {/* SUMMARY CARDS */}
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Employees"
                value={String(totals.employees)}
                subText={periodLabel}
                dotColor="bg-indigo-500"
                icon={Users}
              />

              <SummaryCard
                label="Final payment"
                value={formatCompactAmount(totals.finalPayment)}
                subText="Sum of the column"
                dotColor="bg-emerald-500"
                icon={Wallet}
              />

              <SummaryCard
                label="PF contribution"
                value={formatAmount(totals.pfContribution)}
                subText="Employee share"
                dotColor="bg-violet-500"
                icon={IndianRupee}
              />

              <SummaryCard
                label="Recoveries"
                value={formatAmount(totals.recoveries)}
                subText="Advance, loan, uniform, other"
                dotColor="bg-rose-500"
                icon={TrendingDown}
              />
            </div>

            {/* TABLE CARD */}
            <div className="min-w-0 overflow-hidden rounded-xl border border-[#dce5f1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900">
              {/* TABLE HEADER */}
              <div className="flex flex-col gap-2.5 border-b border-[#e8edf5] px-3.5 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-[12px] font-semibold text-[#152b4b] dark:text-slate-100">
                    {filteredRows.length} employees
                  </span>

                  <span className="text-[11px] text-[#71819b] dark:text-slate-400">
                    {periodLabel} · {visibleColumns.length} columns
                    shown
                  </span>
                </div>

                <div className="relative w-full sm:max-w-[205px]">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) =>
                      setTableSearch(e.target.value)
                    }
                    placeholder="Pay code, name or emp code"
                    className="h-[30px] w-full rounded-lg border border-[#dce5f1] bg-white pl-8 pr-2 text-[10px] text-[#152b4b] outline-none placeholder:text-slate-400 focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* ERROR */}
              {errorMessage && (
                <div className="border-b border-rose-100 bg-rose-50 px-3.5 py-2.5 text-[11px] text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
                  {errorMessage}
                </div>
              )}

              {/* TABLE */}
              <div className="w-full min-w-0 overflow-x-auto">
                <div className="min-w-[1050px]">
                  <DataTable
                    columns={columns}
                    data={filteredRows}
                    showTopSearch={false}
                    showExcelExport={false}
                    initialPageSize={10}
                  />
                </div>
              </div>

              {/* TABLE FOOTER */}
              <div className="flex flex-col gap-2 border-t border-[#e8edf5] bg-[#f8fafc] px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-[10px] text-[#71819b] dark:text-slate-400">
                  {hasSearched
                    ? `PF structure for ${periodLabel} · ${filteredRows.length} items`
                    : "Select period and filters, then click Show structure"}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#71819b] dark:text-slate-400">
                    Final payment total
                  </span>

                  <strong className="text-[12px] font-bold text-[#152b4b] dark:text-slate-100">
                    {formatAmount(totals.finalPayment)}
                  </strong>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}