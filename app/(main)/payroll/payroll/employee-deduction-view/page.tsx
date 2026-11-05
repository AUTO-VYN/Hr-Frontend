
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Search, Download } from "lucide-react";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

const API_URL = process.env.NEXT_PUBLIC_URL;

type AnyRecord = Record<string, any>;
type Option = { value: string; label: string };

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

const getValue = (obj: AnyRecord, keys: string[], fallback: any = "") => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) {
      return obj[key];
    }
  }
  return fallback;
};

// MASTER OPTIONS
const makeOptions = (list: any[]): Option[] => {
  const options = (Array.isArray(list) ? list : [])
    .map((item: any) => {
      if (typeof item === "string" || typeof item === "number") {
        return {
          value: String(item),
          label: String(item),
        };
      }

      return {
        value: String(item?.value ?? ""),
        label: String(item?.label ?? ""),
      };
    })
    .filter((item) => item.value && item.label);

  return Array.from(
    new Map(
      options.map((item) => [item.value.toLowerCase(), item]),
    ).values(),
  );
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (value: any) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function EmployeeDeductionView() {
  const user = useCurrentUser();
  const today = new Date();

  const compcode = user?.Comp_Code;
  const username = user?.name;

  const [month, setMonth] = useState(String(today.getMonth() + 1));
  const [year, setYear] = useState(String(today.getFullYear()));
  const [region, setRegion] = useState("all");
  const [channel, setChannel] = useState("all");
  const [cluster, setCluster] = useState("all");
  const [deductionType, setDeductionType] = useState("all");
  const [search, setSearch] = useState("");

  const [rows, setRows] = useState<AnyRecord[]>([]);
  const [deductionTypes, setDeductionTypes] = useState<Option[]>([]);
  const [regions, setRegions] = useState<Option[]>([]);
  const [channels, setChannels] = useState<Option[]>([]);
  const [clusters, setClusters] = useState<Option[]>([]);

  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // INPUT HANDLER
  const handleInputChange = (name: string, value: any) => {
    switch (name) {
      case "month":
        setMonth(String(value));
        break;
      case "year":
        setYear(String(value));
        break;
      case "region":
        setRegion(String(value));
        break;
      case "channel":
        setChannel(String(value));
        break;
      case "cluster":
        setCluster(String(value));
        break;
      case "deductionType":
        setDeductionType(String(value));
        break;
      case "search":
        setSearch(String(value));
        break;
      default:
        break;
    }
  };

  // FIELD MAPPING
  const getEmployeeName = (row: AnyRecord) =>
    getValue(
      row,
      [
        "Emp_Name",
        "EmpName",
        "Employee_Name",
        "EmployeeName",
        "Name",
        "emp_name",
        "name",
      ],
      "Unknown Employee",
    );

  const getEmployeeCode = (row: AnyRecord) =>
    getValue(row, [
      "Emp_Id",
      "Emp_id",
      "Emp_Code",
      "EmpCode",
      "Employee_Code",
      "EmployeeCode",
      "EMPCODE",
      "empcode",
    ]);

  const getLocation = (row: AnyRecord) =>
    getValue(
      row,
      ["Location", "Branch_Name", "BranchName", "Loc_Code", "Branch", "branch"],
      "-",
    );

  const getRegion = (row: AnyRecord) =>
    getValue(
      row,
      ["Region", "Sal_Region", "Region_Name", "region", "SalRegion"],
      "-",
    );

  const getChannel = (row: AnyRecord) =>
    getValue(
      row,
      ["Channel", "Sal_Channel", "Channel_Name", "ChannelName", "channel"],
      "",
    );

  const getCluster = (row: AnyRecord) =>
    getValue(
      row,
      ["Cluster", "Sal_Cluster", "Cluster_Name", "ClusterName", "cluster"],
      "",
    );

  const getDepartment = (row: AnyRecord) =>
    getValue(row, ["Department", "Department_Name", "Dept_Name", "department"]);

  const getDesignation = (row: AnyRecord) =>
    getValue(row, [
      "EMPLOYEEDESIGNATION",
      "Designation",
      "Designation_Name",
      "Desig_Name",
      "designation",
    ]);

  const getDeductionName = (row: AnyRecord) => {
    const value = getValue(
      row,
      [
        "DeductionType",
        "Deduction_Name",
        "Ded_Type_Name",
        "Deduction_Type_Name",
        "Deduction_Type",
        "Ded_Type",
        "deduction_type",
      ],
      "Other",
    );

    const master = deductionTypes.find(
      (item) => item.value.toLowerCase() === String(value).toLowerCase(),
    );

    return master?.label || String(value);
  };

  const getAmount = (row: AnyRecord) =>
    Number(
      getValue(
        row,
        [
          "Amount",
          "Ded_Amt",
          "Deduction_Amount",
          "DeductionAmount",
          "amount",
          "deduction_amount",
        ],
        0,
      ),
    ) || 0;

  const getDeductionDate = (row: AnyRecord) =>
    getValue(row, [
      "Rec_Date",
      "Deduction_Date",
      "Ded_Date",
      "Date",
      "deduction_date",
    ]);

  const getRemark = (row: AnyRecord) =>
    getValue(
      row,
      ["Ded_Rem", "Remark", "Remarks", "Narration", "Description", "remark"],
      "-",
    );

  // GET DEDUCTION TYPES
  const getDeductionTypes = useCallback(async () => {
    if (!compcode) return;

    try {
      const response = await axios.post(
        `${API_URL}/EmpMaster/GetDeductionList`,
        {
          compcode,
          name: username,
        },
        { headers: { compcode } },
      );

      const list = response?.data?.DeductionList || response?.data?.data || [];

      const options: Option[] = (Array.isArray(list) ? list : [])
        .map((item: AnyRecord) => ({
          value: String(
            getValue(item, [
              "value",
              "UTD",
              "Deduction_Type",
              "Ded_Type",
              "Code",
              "id",
            ]),
          ),
          label: String(
            getValue(item, [
              "display_label",
              "label",
              "Deduction_Name",
              "DeductionType",
              "Name",
              "Description",
            ]),
          ),
        }))
        .filter((item: Option) => item.value && item.label);

      setDeductionTypes(options);
    } catch (error) {
      console.error("Get deduction types error:", error);
    }
  }, [compcode, username]);

  // GET REGION, CHANNEL, CLUSTER MASTER
  const getMasterData = useCallback(async () => {
    if (!compcode) return;

    try {
      const response = await axios.post(
        `${API_URL}/employee/masters`,
        {},
        {
          headers: {
            compcode,
            name: username,
          },
        },
      );

      console.log("Employee Masters Full Response:", response.data);

      const masters = response?.data?.data || {};

      setRegions(makeOptions(masters?.Sal_Region || []));
      setChannels(makeOptions(masters?.CHANNEL1 || []));
      setClusters(makeOptions(masters?.CLUSTER1 || []));

      await axios.post(
        `${API_URL}/employee/all`,
        {},
        {
          headers: {
            compcode,
            name: username,
          },
        },
      );
    } catch (error) {
      console.error("Get master/employee data error:", error);

      setRegions([]);
      setChannels([]);
      setClusters([]);
    }
  }, [compcode, username]);

  // GET DEDUCTION DATA
  const getDeductionData = useCallback(async () => {
    if (!compcode) return;

    setLoading(true);

    try {
      const filterData = {
        DATE_FROM: month,
        DATE_TO: year,
        DedType: deductionType === "all" ? null : deductionType,
        Region: region === "all" ? null : region,
        Cluster: cluster === "all" ? null : cluster,
        Channel: channel === "all" ? null : channel,
        branch: user?.branch,
      };

      const payload = {
        Created_by: username,
        filterData,
      };

      console.log("Employee Deduction API Payload:", payload);

      const response = await axios.post(
        `${API_URL}/empded/findAllbyfilter`,
        payload,
        { headers: { compcode } },
      );

      console.log("Employee Deduction API Response:", response.data);

      if (response.data?.success === false) {
        setRows([]);
        setHasLoaded(true);

        Swal.fire({
          icon: "warning",
          title: "Unable to load deductions",
          text: response.data?.message || "No deduction data found.",
        });

        return;
      }

      const apiData = response?.data?.data;

      const deductionRows: AnyRecord[] = Array.isArray(apiData?.[0])
        ? apiData[0]
        : Array.isArray(apiData)
          ? apiData
          : [];

      setRows(deductionRows);
      setHasLoaded(true);
    } catch (error: any) {
      console.error("Get deduction list error:", error);

      setRows([]);
      setHasLoaded(true);

      Swal.fire({
        icon: "error",
        title: "Unable to load deductions",
        text:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Something went wrong while loading deduction records.",
      });
    } finally {
      setLoading(false);
    }
  }, [
    compcode,
    username,
    month,
    year,
    region,
    channel,
    cluster,
    deductionType,
    user?.branch,
  ]);

  // INITIAL API CALLS
  useEffect(() => {
    if (!compcode) return;

    getDeductionTypes();
    getMasterData();
  }, [compcode, getDeductionTypes, getMasterData]);

  useEffect(() => {
    if (!compcode) return;

    getDeductionData();
  }, [compcode, getDeductionData]);

  // SEARCH + FILTER
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const employeeName = String(getEmployeeName(row)).toLowerCase();
      const employeeCode = String(getEmployeeCode(row)).toLowerCase();
      const location = String(getLocation(row)).toLowerCase();
      const type = String(getDeductionName(row)).toLowerCase();
      const remark = String(getRemark(row)).toLowerCase();
      const rowRegion = String(getRegion(row)).toLowerCase();
      const rowChannel = String(getChannel(row)).toLowerCase();
      const rowCluster = String(getCluster(row)).toLowerCase();

      const matchesSearch =
        !query ||
        employeeName.includes(query) ||
        employeeCode.includes(query) ||
        location.includes(query) ||
        type.includes(query) ||
        remark.includes(query);

      const matchesRegion =
        region === "all" || rowRegion === region.toLowerCase();

      const matchesChannel =
        channel === "all" || rowChannel === channel.toLowerCase();

      const matchesCluster =
        cluster === "all" || rowCluster === cluster.toLowerCase();

      return (
        matchesSearch &&
        matchesRegion &&
        matchesChannel &&
        matchesCluster
      );
    });
  }, [rows, search, region, channel, cluster, deductionTypes]);

  // DUPLICATE DETECTION
  const duplicateKeys = useMemo(() => {
    const counts = new Map<string, number>();

    filteredRows.forEach((row) => {
      const key =
        `${getEmployeeCode(row)}_${getDeductionName(row)}`.toLowerCase();

      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([key]) => key),
    );
  }, [filteredRows, deductionTypes]);

  const isDuplicate = (row: AnyRecord) => {
    const key =
      `${getEmployeeCode(row)}_${getDeductionName(row)}`.toLowerCase();

    return duplicateKeys.has(key);
  };

  // SUMMARY
  const totalAmount = filteredRows.reduce(
    (sum, row) => sum + getAmount(row),
    0,
  );

  const affectedEmployees = new Set(
    filteredRows.map((row) => String(getEmployeeCode(row))),
  ).size;

  const duplicateCount = filteredRows.filter(isDuplicate).length;

  // TABLE DATA
  const tableData = useMemo(
    () =>
      filteredRows.map((row, index) => ({
        ...row,
        _rowKey:
          getValue(row, ["UTD", "Id", "id"], "") ||
          `${getEmployeeCode(row)}-${index}`,
        _employeeName: getEmployeeName(row),
        _employeeCode: getEmployeeCode(row),
        _location: getLocation(row),
        _region: getRegion(row),
        _department: getDepartment(row),
        _designation: getDesignation(row),
        _deductionName: getDeductionName(row),
        _amount: getAmount(row),
        _date: getDeductionDate(row),
        _remark: getRemark(row),
        _duplicate: isDuplicate(row),
      })),
    [filteredRows, duplicateKeys, deductionTypes],
  );

  // TABLE COLUMNS
  const columns = useMemo(
    () => [
      {
        Header: "EMPLOYEE ↑",
        accessor: "_employeeName",
        width: 260,
        Cell: ({ row }: any) => {
          const item = row.original;

          return (
            <div className="py-1">
              <div className="text-[12px] font-semibold text-[#152b4b] dark:text-slate-100">
                {item._employeeName}
              </div>
              <div className="mt-0.5 text-[11px] text-[#64748b] dark:text-slate-400">
                {item._designation || item._department}
                {item._designation || item._department ? " · " : ""}
                {item._employeeCode}
              </div>
            </div>
          );
        },
      },
      {
        Header: "LOCATION",
        accessor: "_location",
        width: 230,
        Cell: ({ row }: any) => {
          const item = row.original;

          return (
            <div className="py-1">
              <div className="text-[11px] font-medium text-[#475569] dark:text-slate-300">
                {item._location}
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wide text-[#64748b] dark:text-slate-400">
                {item._region}
                {item._department ? ` · ${item._department}` : ""}
              </div>
            </div>
          );
        },
      },
      {
        Header: "DEDUCTION TYPE",
        accessor: "_deductionName",
        width: 190,
        Cell: ({ row }: any) => {
          const item = row.original;

          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                item._duplicate
                  ? "bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300"
                  : "bg-[#eae8ff] text-[#5145e9] dark:bg-indigo-950/60 dark:text-indigo-300"
              }`}
            >
              {item._deductionName}
            </span>
          );
        },
      },
      {
        Header: "AMOUNT",
        accessor: "_amount",
        width: 130,
        Cell: ({ row }: any) => (
          <div
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              whiteSpace: "nowrap",
            }}
          >
            <span className="text-[12px] font-bold text-[#142b49] dark:text-slate-100">
              {formatCurrency(Number(row.original._amount) || 0)}
            </span>
          </div>
        ),
      },
      {
        Header: "DEDUCTION DATE",
        accessor: "_date",
        width: 160,
        Cell: ({ row }: any) => (
          <div
            style={{ width: "100%", textAlign: "left", whiteSpace: "nowrap" }}
          >
            <span className="text-[11px] text-[#64748b] dark:text-slate-400">
              {formatDate(row.original._date)}
            </span>
          </div>
        ),
      },
      {
        Header: "REMARK",
        accessor: "_remark",
        width: 300,
        Cell: ({ row }: any) => {
          const item = row.original;

          return (
            <div
              className={`max-w-[340px] text-[11px] ${
                item._duplicate
                  ? "font-medium text-rose-600 dark:text-rose-400"
                  : "text-[#52627c] dark:text-slate-400"
              }`}
            >
              {item._duplicate
                ? `Possible duplicate · ${item._remark}`
                : item._remark}
            </div>
          );
        },
      },
    ],
    [],
  );

  // RESET
  const handleReset = () => {
    setMonth(String(today.getMonth() + 1));
    setYear(String(today.getFullYear()));
    setRegion("all");
    setChannel("all");
    setCluster("all");
    setDeductionType("all");
    setSearch("");
  };

  // EXPORT CSV
  const exportToExcel = () => {
    if (!filteredRows.length) {
      Swal.fire({
        icon: "info",
        title: "No records",
        text: "There are no deduction records to export.",
      });
      return;
    }

    const headers = [
      "Employee Name",
      "Employee Code",
      "Location",
      "Region",
      "Channel",
      "Cluster",
      "Department",
      "Designation",
      "Deduction Type",
      "Amount",
      "Deduction Date",
      "Remark",
      "Duplicate",
    ];

    const escapeCSV = (value: any) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csvRows = [
      headers.map(escapeCSV).join(","),
      ...filteredRows.map((row) =>
        [
          getEmployeeName(row),
          getEmployeeCode(row),
          getLocation(row),
          getRegion(row),
          getChannel(row),
          getCluster(row),
          getDepartment(row),
          getDesignation(row),
          getDeductionName(row),
          getAmount(row),
          formatDate(getDeductionDate(row)),
          getRemark(row),
          isDuplicate(row) ? "Yes" : "No",
        ]
          .map(escapeCSV)
          .join(","),
      ),
    ];

    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `Employee_Deductions_${month}_${year}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const selectedMonth =
    MONTHS.find((item) => item.value === month)?.label || month;

  const yearOptions: Option[] = Array.from(
    { length: 8 },
    (_, index) => today.getFullYear() - 4 + index,
  ).map((item) => ({
    value: String(item),
    label: String(item),
  }));

  return (
    <div className="min-h-screen bg-[#f5f8fc] p-3 transition-colors duration-200 dark:bg-[#0f172a] sm:p-5">
      <HashloaderComponent isLoading={loading} />

      <div className="mx-auto max-w-[1800px] space-y-3.5">
        {/* PAGE HEADER */}
        <div>
          <h1 className="text-[21px] font-bold leading-tight text-[#10213b] dark:text-slate-100">
            Employee deduction view
          </h1>
          <p className="mt-1 text-[13px] text-[#64748b] dark:text-slate-400">
            All deductions loaded against a salary month. Filter by region,
            channel, cluster and type before you sign the payroll off.
          </p>
        </div>

        {/* FILTER PANEL */}
        <div className="rounded-xl border border-[#dce5f1] bg-white p-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-colors duration-200 dark:border-slate-700 dark:bg-slate-900">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[140px_120px_repeat(3,minmax(130px,1fr))_1fr_auto_auto] lg:items-end">
            <Eselect
              title="MONTH "
              redlabel="*"
              name="month"
              option={MONTHS}
              initialValue={month}
              handleInputChange={handleInputChange}
              className="h-[34px] w-full"
              placeholder="Select month"
            />

            <Eselect
              title="YEAR "
              redlabel="*"
              name="year"
              option={yearOptions}
              initialValue={year}
              handleInputChange={handleInputChange}
              className="h-[34px] w-full"
              placeholder="Select year"
            />

            <Eselect
              title="REGION"
              name="region"
              option={[{ value: "all", label: "All regions" }, ...regions]}
              initialValue={region}
              handleInputChange={handleInputChange}
              className="h-[34px] w-full"
              placeholder="Select region"
            />

            <Eselect
              title="CHANNEL"
              name="channel"
              option={[{ value: "all", label: "All channels" }, ...channels]}
              initialValue={channel}
              handleInputChange={handleInputChange}
              className="h-[34px] w-full"
              placeholder="Select channel"
            />

            <Eselect
              title="CLUSTER"
              name="cluster"
              option={[{ value: "all", label: "All clusters" }, ...clusters]}
              initialValue={cluster}
              handleInputChange={handleInputChange}
              className="h-[34px] w-full"
              placeholder="Select cluster"
            />

            <Eselect
              title="DEDUCTION TYPE"
              name="deductionType"
              option={[{ value: "all", label: "All types" }, ...deductionTypes]}
              initialValue={deductionType}
              handleInputChange={handleInputChange}
              className="h-[34px] w-full"
              placeholder="Select deduction type"
            />

            <Einput
              title="SEARCH"
              name="search"
              type="text"
              value={search}
              handleInputChange={handleInputChange}
              className="h-[34px] w-full"
              placeholder="Name, code, type or remark"
            />

            <AButton
              type="button"
              onClick={getDeductionData}
              disabled={loading}
              className="inline-flex h-[37px] items-center justify-center gap-2 rounded-lg bg-[#5145e9] px-4 text-[13px] font-semibold text-white hover:bg-[#4035d5] disabled:opacity-60"
            >
              <Search size={15} />
              Show
            </AButton>

            {/* RESET BUTTON KEPT COMMENTED AS IN EXISTING CODE */}
            {/*
            <AButton
              type="button"
              onClick={handleReset}
              className="inline-flex h-[37px] items-center justify-center gap-2 rounded-lg border border-[#dce5f1] bg-white px-4 text-[13px] font-medium text-[#43546d] hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <RotateCcw size={14} />
              Reset
            </AButton>
            */}
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            dot="#5145e9"
            label="Deductions"
            value={filteredRows.length.toString()}
            subtitle={`${selectedMonth} ${year}`}
          />

          <SummaryCard
            dot="#e11d48"
            label="Total deducted"
            value={formatCurrency(totalAmount)}
            subtitle="Across the filter"
          />

          <SummaryCard
            dot="#0ea5e9"
            label="Employees affected"
            value={affectedEmployees.toString()}
            subtitle="Unique codes"
          />

          <SummaryCard
            dot="#f59e0b"
            label="Possible duplicates"
            value={duplicateCount.toString()}
            subtitle="Same employee and type"
          />
        </div>

        {/* DATA TABLE */}
        <div className="overflow-hidden rounded-xl border border-[#dce5f1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-colors duration-200 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex min-h-[54px] items-center justify-between gap-3 border-b border-[#dce5f1] px-4 py-2.5 dark:border-slate-700">
            <div className="text-[13px] font-semibold text-[#172b4d] dark:text-slate-100">
              {filteredRows.length} deductions
            </div>

            <AButton
              type="button"
              onClick={exportToExcel}
              className="inline-flex h-[33px] items-center gap-2 rounded-lg border border-[#dce5f1] bg-white px-3 text-[12px] font-semibold text-[#334155] hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Download size={15} />
              Export to Excel
            </AButton>
          </div>

          {/* RESPONSIVE TABLE + DARK MODE TABLE OVERRIDES */}
          <div
            className="
              w-full overflow-x-auto p-2
              dark:[&_table]:!border-slate-700
              dark:[&_thead]:!bg-slate-800
              dark:[&_th]:!border-slate-700
              dark:[&_th]:!bg-slate-800
              dark:[&_th]:!text-slate-200
              dark:[&_tbody]:!bg-slate-900
              dark:[&_tr]:!border-slate-700
              dark:[&_td]:!border-slate-700
              dark:[&_td]:!bg-slate-900
              dark:[&_td]:!text-slate-300
              dark:[&_input]:!border-slate-600
              dark:[&_select]:!border-slate-600
              dark:[&_button]:!text-slate-300
            "
          >
            <div className="min-w-[1150px]">
              <DataTable
                columns={columns}
                data={tableData}
                showTopSearch={false}
                showExcelExport={false}
                initialPageSize={10}
              />
            </div>
          </div>

          <div className="flex min-h-[37px] items-center border-t border-[#dce5f1] bg-[#f8fafc] px-4 text-[11px] text-[#64748b] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            {filteredRows.length
              ? `Showing ${filteredRows.length} deduction records`
              : hasLoaded
                ? "No deduction records found"
                : "Loading deduction records"}
          </div>
        </div>
      </div>
    </div>
  );
}

// SUMMARY CARD
function SummaryCard({
  dot,
  label,
  value,
  subtitle,
}: {
  dot: string;
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="min-h-[91px] rounded-xl border border-[#dce5f1] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-colors duration-200 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <span
          className="h-[7px] w-[7px] rounded-full"
          style={{ backgroundColor: dot }}
        />
        <span className="text-[11px] font-medium text-[#52627c] dark:text-slate-400">
          {label}
        </span>
      </div>

      <div className="mt-1.5 text-[23px] font-bold leading-none text-[#10213b] dark:text-slate-100">
        {value}
      </div>

      <div className="mt-1 text-[10px] text-[#64748b] dark:text-slate-500">
        {subtitle}
      </div>
    </div>
  );
}
