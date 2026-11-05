
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Search, Download, Trash2 } from "lucide-react";

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

const makeOptions = (list: any[]): Option[] => {
  const options = (Array.isArray(list) ? list : [])
    .map((item: any) => {
      if (typeof item === "string" || typeof item === "number") {
        return { value: String(item), label: String(item) };
      }

      return {
        value: String(item?.value ?? ""),
        label: String(item?.label ?? ""),
      };
    })
    .filter((item) => item.value && item.label);

  return Array.from(
    new Map(options.map((item) => [item.value.toLowerCase(), item])).values(),
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

const getDateForApi = (value: any) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

export default function EmployeeDeductionView() {
  const user = useCurrentUser();
  const today = new Date();

  const compcode = user?.Comp_Code;
  const username = user?.name;

  // FILTER STATES
  const [month, setMonth] = useState(String(today.getMonth() + 1));
  const [year, setYear] = useState(String(today.getFullYear()));

  const [region, setRegion] = useState("all");
  const [channel, setChannel] = useState("all");
  const [cluster, setCluster] = useState("all");
  const [deductionType, setDeductionType] = useState("all");
  const [search, setSearch] = useState("");

  // DELETE STATES
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [deleteReason, setDeleteReason] = useState("");

  // DATA STATES
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
      case "deleteReason":
        setDeleteReason(String(value));
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
      (item) =>
        item.value.toLowerCase() === String(value).toLowerCase() ||
        item.label.toLowerCase() === String(value).toLowerCase(),
    );

    return master?.label || String(value);
  };

  const getDeductionTypeValue = (row: AnyRecord) => {
    const rawValue = getValue(
      row,
      [
        "Ded_Type",
        "Deduction_Type",
        "DeductionType",
        "Deduction_Name",
        "Ded_Type_Name",
        "Deduction_Type_Name",
        "deduction_type",
      ],
      "",
    );

    const master = deductionTypes.find(
      (item) =>
        item.value.toLowerCase() === String(rawValue).toLowerCase() ||
        item.label.toLowerCase() === String(rawValue).toLowerCase(),
    );

    return master?.value || String(rawValue);
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
        {},
        {
          headers: {
            compcode,
            name: username,
          },
        },
      );

      const list =
        response?.data?.DeductionList ||
        response?.data?.data?.DeductionList ||
        response?.data?.data ||
        [];

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

    const branches = Array.isArray(user?.branch)
      ? user.branch
      : typeof user?.branch === "string"
        ? user.branch.split(",").filter(Boolean)
        : [];

    if (branches.length > 1) {
      Swal.fire({
        icon: "info",
        title: "Select one branch",
        text: "Select only one Branch and refresh.",
      });
      return;
    }

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

      const response = await axios.post(
        `${API_URL}/empded/findAllbyfilter`,
        payload,
        {
          headers: {
            compcode,
            name: username,
          },
        },
      );

      if (response.data?.success === false) {
        setRows([]);
        setSelectedRows([]);
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
      setSelectedRows([]);
      setHasLoaded(true);
    } catch (error: any) {
      console.error("Get deduction list error:", error);

      setRows([]);
      setSelectedRows([]);
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

  // SEARCH FILTER
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const employeeName = String(getEmployeeName(row)).toLowerCase();
      const employeeCode = String(getEmployeeCode(row)).toLowerCase();
      const location = String(getLocation(row)).toLowerCase();
      const type = String(getDeductionName(row)).toLowerCase();
      const remark = String(getRemark(row)).toLowerCase();

      return (
        !query ||
        employeeName.includes(query) ||
        employeeCode.includes(query) ||
        location.includes(query) ||
        type.includes(query) ||
        remark.includes(query)
      );
    });
  }, [rows, search, deductionTypes]);

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
        _channel: getChannel(row),
        _cluster: getCluster(row),
        _department: getDepartment(row),
        _designation: getDesignation(row),
        _deductionName: getDeductionName(row),
        _deductionTypeValue: getDeductionTypeValue(row),
        _amount: getAmount(row),
        _date: getDeductionDate(row),
        _remark: getRemark(row),
        _duplicate: isDuplicate(row),
      })),
    [filteredRows, duplicateKeys, deductionTypes],
  );

  // SELECTION
  const visibleRowKeys = tableData.map((row: AnyRecord) =>
    String(row._rowKey),
  );

  const allVisibleSelected =
    visibleRowKeys.length > 0 &&
    visibleRowKeys.every((key) => selectedRows.includes(key));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows((previous) =>
        Array.from(new Set([...previous, ...visibleRowKeys])),
      );
    } else {
      setSelectedRows((previous) =>
        previous.filter((key) => !visibleRowKeys.includes(key)),
      );
    }
  };

  const handleSelectRow = (key: string, checked: boolean) => {
    setSelectedRows((previous) =>
      checked
        ? Array.from(new Set([...previous, key]))
        : previous.filter((item) => item !== key),
    );
  };

  // TABLE COLUMNS
  const columns = useMemo(
    () => [
      {
        Header: "",
        accessor: "_select",
        width: 45,
        Cell: ({ row }: any) => {
          const item = row.original;
          const key = String(item._rowKey);

          return (
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={selectedRows.includes(key)}
                onChange={(e) => handleSelectRow(key, e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-[#5145e9]"
              />
            </div>
          );
        },
      },
      {
        Header: "EMPLOYEE ↑",
        accessor: "_employeeName",
        width: 300,
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
        width: 210,
        Cell: ({ row }: any) => {
          const item = row.original;

          return (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                item._duplicate
                  ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300"
                  : "bg-[#eae8ff] text-[#5145e9] dark:bg-indigo-950/70 dark:text-indigo-300"
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
          <div className="w-full whitespace-nowrap text-left">
            <span className="text-[12px] font-bold text-[#142b49] dark:text-slate-100">
              {formatCurrency(Number(row.original._amount) || 0)}
            </span>
          </div>
        ),
      },
      {
        Header: "DEDUCTION DATE",
        accessor: "_date",
        width: 170,
        Cell: ({ row }: any) => (
          <div className="w-full whitespace-nowrap text-left">
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
                  : "text-[#52627c] dark:text-slate-300"
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
    [selectedRows],
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
    setSelectedRows([]);
    setDeleteReason("");
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

  // REMOVE DEDUCTION
  const handleRemoveDeduction = async () => {
    if (!selectedRows.length) {
      Swal.fire({
        icon: "warning",
        title: "Select deductions",
        text: "Please select at least one deduction.",
      });
      return;
    }

    if (!deleteReason.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Reason required",
        text: "Please enter a reason for removing the deduction.",
      });
      return;
    }

    const selectedRecords = tableData.filter((row: AnyRecord) =>
      selectedRows.includes(String(row._rowKey)),
    );

    if (!selectedRecords.length) {
      Swal.fire({
        icon: "warning",
        title: "No records selected",
        text: "Please select valid deduction records.",
      });
      return;
    }

    const deleteParams = selectedRecords.map((row: AnyRecord) => ({
      Employee_Id: String(
        getValue(
          row,
          [
            "Emp_Id",
            "Emp_id",
            "Emp_Code",
            "EmpCode",
            "Employee_Code",
            "EmployeeCode",
            "EMPCODE",
            "empcode",
          ],
          "",
        ),
      ),
      Deduction_Type: String(row._deductionTypeValue || ""),
      Deduction_Month: String(
        getValue(row, ["Mnth", "Month", "Deduction_Month"], month),
      ),
      Year: String(getValue(row, ["Yr", "Year", "Deduction_Year"], year)),
      Deleted_By: username,
      Loc_Code: user?.branch,
      Rec_Date: getDateForApi(
        getValue(
          row,
          ["Rec_Date", "Deduction_Date", "Ded_Date", "Date", "deduction_date"],
          "",
        ),
      ),
    }));

    const invalidRecord = deleteParams.find(
      (item) =>
        !item.Employee_Id ||
        !item.Deduction_Type ||
        !item.Deduction_Month ||
        !item.Year,
    );

    if (invalidRecord) {
      Swal.fire({
        icon: "error",
        title: "Invalid deduction data",
        text: "Employee ID, deduction type, month or year is missing in one of the selected records.",
      });

      console.error("Invalid delete parameters:", deleteParams);
      return;
    }

    const result = await Swal.fire({
      icon: "warning",
      title: "Remove selected deductions?",
      html: `
        <div style="font-size:13px;color:#64748b">
          You have selected <b>${deleteParams.length}</b> deduction(s).
          <br/><br/>
          Reason: <b>${deleteReason.trim()}</b>
          <br/><br/>
          This action will permanently remove the selected deduction(s).
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Confirm removal",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#64748b",
    });

    if (!result.isConfirmed) return;

    setLoading(true);

    try {
      for (const item of deleteParams) {
        const response = await axios.post(
          `${API_URL}/EmpDed/softDeleteEmpDed`,
          item,
          {
            headers: {
              compcode,
              name: username,
            },
          },
        );

        if (
          response?.data?.success === false ||
          response?.data?.status === false
        ) {
          throw new Error(
            response?.data?.message || "Unable to remove deduction.",
          );
        }
      }

      await Swal.fire({
        icon: "success",
        title: "Removed!",
        text: "Selected deduction(s) removed successfully.",
      });

      setSelectedRows([]);
      setDeleteReason("");

      await getDeductionData();
    } catch (error: any) {
      console.error("Delete deduction error:", error);

      Swal.fire({
        icon: "error",
        title: "Unable to remove deduction",
        text:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Something went wrong while removing deductions.",
      });

      await getDeductionData();
    } finally {
      setLoading(false);
    }
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
    <div className="deduction-page min-h-screen min-w-0 bg-[#f5f8fc] p-2 text-slate-800 transition-colors duration-200 dark:bg-[#0b1220] dark:text-slate-100 sm:p-3 xl:p-5">
      <HashloaderComponent isLoading={loading} />

      <div className="mx-auto min-w-0 max-w-[1800px] space-y-3.5">
        {/* PAGE HEADER */}
        <div className="min-w-0">
          <h1 className="text-[21px] font-bold leading-tight text-[#10213b] dark:text-slate-100">
            Remove wrong deduction
          </h1>

          <p className="mt-1 text-[12px] text-[#64748b] dark:text-slate-400">
            Delete deductions that were entered on the wrong employee or twice.
            Duplicates are flagged for you below.
          </p>
        </div>

        {/* FILTER PANEL */}
        <div className="min-w-0 rounded-xl border border-[#dce5f1] bg-white p-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-colors dark:border-slate-700 dark:bg-[#151f30] dark:shadow-none sm:p-4">
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[130px_110px_minmax(150px,1fr)_minmax(170px,1fr)_minmax(190px,1.2fr)_auto_auto] 2xl:items-end">
            <Eselect
              title="MONTH"
              redlabel="*"
              name="month"
              option={MONTHS}
              initialValue={month}
              handleInputChange={handleInputChange}
              className="h-[34px] w-full"
              placeholder="Select month"
            />

            <Eselect
              title="YEAR"
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
              option={[
                { value: "all", label: "All regions" },
                ...regions,
              ]}
              initialValue={region}
              handleInputChange={handleInputChange}
              className="h-[34px] w-full"
              placeholder="Select region"
            />

            <Eselect
              title="DEDUCTION TYPE"
              name="deductionType"
              option={[
                { value: "all", label: "All types" },
                ...deductionTypes,
              ]}
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

            <div className="flex min-w-0 items-end gap-2 sm:col-span-2 xl:col-span-1 2xl:col-span-1">
              <AButton
                type="button"
                onClick={getDeductionData}
                disabled={loading}
                className="inline-flex h-[34px] w-full items-center justify-center gap-2 rounded-lg bg-[#5145e9] px-4 text-[12px] font-semibold text-white hover:bg-[#4035d5] disabled:opacity-60 sm:w-auto"
              >
                <Search size={14} />
                Show
              </AButton>

              <AButton
                type="button"
                onClick={handleReset}
                className="inline-flex h-[34px] w-full items-center justify-center rounded-lg border border-[#dce5f1] bg-white px-4 text-[12px] font-medium text-[#43546d] hover:bg-slate-50 dark:border-slate-600 dark:bg-[#202c3e] dark:text-slate-200 dark:hover:bg-slate-700 sm:w-auto"
              >
                Reset
              </AButton>
            </div>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
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

        {/* WARNING */}
        <div className="flex min-w-0 items-start gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2.5 dark:border-rose-900/70 dark:bg-rose-950/30">
          <span className="mt-0.5 shrink-0 text-rose-500 dark:text-rose-400">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M10.3 3.9 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </span>

          <p className="text-[11px] leading-5 text-[#334155] dark:text-rose-200">
            Removing a deduction deletes it from the salary month permanently.
            Use this only for deductions entered on the wrong employee or twice
            — never to waive a genuine recovery.
          </p>
        </div>

        {/* DATA TABLE */}
        <div className="deduction-table min-w-0 overflow-hidden rounded-xl border border-[#dce5f1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-colors dark:border-slate-700 dark:bg-[#151f30] dark:shadow-none">
          {/* TABLE TOOLBAR */}
          <div className="flex min-w-0 flex-col gap-2 border-b border-[#dce5f1] px-3 py-3 dark:border-slate-700 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="h-4 w-4 shrink-0 cursor-pointer accent-[#5145e9]"
              />

              <span className="whitespace-nowrap text-[12px] font-semibold text-[#172b4d] dark:text-slate-100">
                {filteredRows.length} deductions
              </span>

              <span className="hidden text-[11px] text-[#64748b] dark:text-slate-400 sm:inline">
                Select the rows you need to delete
              </span>
            </div>

            <AButton
              type="button"
              onClick={exportToExcel}
              className="inline-flex h-[32px] w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-[#dce5f1] bg-white px-3 text-[11px] font-semibold text-[#334155] hover:bg-slate-50 dark:border-slate-600 dark:bg-[#202c3e] dark:text-slate-200 dark:hover:bg-slate-700 sm:w-auto"
            >
              <Download size={14} />
              Export to Excel
            </AButton>
          </div>

          {/* TABLE */}
          <div className="w-full min-w-0 overflow-x-auto p-0">
            <div className="min-w-[1100px]">
              <DataTable
                columns={columns}
                data={tableData}
                showTopSearch={false}
                showExcelExport={false}
                initialPageSize={10}
              />
            </div>
          </div>

          {/* TABLE FOOTER */}
          <div className="flex min-w-0 flex-col gap-3 border-t border-[#dce5f1] bg-[#f8fafc] px-3 py-2.5 dark:border-slate-700 dark:bg-[#111b2b] sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[11px] text-[#64748b] dark:text-slate-400">
              {filteredRows.length
                ? `Page 1 of 1 · ${filteredRows.length} items`
                : hasLoaded
                  ? "No deduction records found"
                  : "Loading deduction records"}
            </div>

            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 sm:w-[240px] sm:flex-none xl:w-[300px]">
                <Einput
                  title=""
                  name="deleteReason"
                  type="text"
                  value={deleteReason}
                  handleInputChange={handleInputChange}
                  className="h-[33px] w-full"
                  placeholder="Why is this deduction wrong? (required)"
                />
              </div>

              <AButton
                type="button"
                onClick={handleRemoveDeduction}
                disabled={
                  !selectedRows.length || !deleteReason.trim() || loading
                }
                className="inline-flex h-[33px] w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#64748b] px-4 text-[11px] font-semibold text-white hover:bg-[#475569] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                <Trash2 size={14} />
                Remove deduction
              </AButton>
            </div>
          </div>
        </div>
      </div>

      {/* DARK MODE SUPPORT FOR CUSTOM INPUTS AND DATATABLE */}
      <style jsx global>{`
        .dark .deduction-page input:not([type="checkbox"]),
        .dark .deduction-page select,
        .dark .deduction-page textarea {
          color: #e2e8f0 !important;
          background-color: #202c3e !important;
          border-color: #475569 !important;
        }

        .dark .deduction-page input::placeholder,
        .dark .deduction-page textarea::placeholder {
          color: #94a3b8 !important;
          opacity: 1;
        }

        .dark .deduction-page label {
          color: #cbd5e1;
        }

        .dark .deduction-page select option {
          color: #e2e8f0;
          background-color: #202c3e;
        }

        .dark .deduction-table table {
          color: #cbd5e1;
          background-color: #151f30;
          border-color: #334155;
        }

        .dark .deduction-table thead,
        .dark .deduction-table thead tr {
          background-color: #1e293b !important;
          color: #e2e8f0 !important;
        }

        .dark .deduction-table th {
          color: #cbd5e1 !important;
          background-color: #1e293b !important;
          border-color: #334155 !important;
        }

        .dark .deduction-table td {
          color: #cbd5e1;
          background-color: #151f30;
          border-color: #334155 !important;
        }

        .dark .deduction-table tbody tr {
          background-color: #151f30;
        }

        .dark .deduction-table tbody tr:hover td {
          background-color: #202c3e !important;
        }

        .dark .deduction-table button {
          color: #cbd5e1;
        }

        .dark .deduction-table select {
          color: #e2e8f0;
          background-color: #202c3e;
          border-color: #475569;
        }

        .dark .deduction-table input:not([type="checkbox"]) {
          color: #e2e8f0;
          background-color: #202c3e;
          border-color: #475569;
        }

        .dark .deduction-table input[type="checkbox"] {
          accent-color: #818cf8;
        }

        .deduction-table {
          min-width: 0;
          max-width: 100%;
        }

        .deduction-table table {
          max-width: 100%;
        }

        @media (max-width: 640px) {
          .deduction-table {
            border-radius: 10px;
          }
        }
      `}</style>
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
    <div className="min-w-0 min-h-[85px] rounded-xl border border-[#dce5f1] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-colors dark:border-slate-700 dark:bg-[#151f30] dark:shadow-none">
      <div className="flex items-center gap-2">
        <span
          className="h-[7px] w-[7px] shrink-0 rounded-full"
          style={{ backgroundColor: dot }}
        />

        <span className="text-[11px] font-medium text-[#52627c] dark:text-slate-400">
          {label}
        </span>
      </div>

      <div className="mt-1.5 break-words text-[23px] font-bold leading-tight text-[#10213b] dark:text-slate-100">
        {value}
      </div>

      <div className="mt-1 text-[10px] text-[#64748b] dark:text-slate-500">
        {subtitle}
      </div>
    </div>
  );
}
