"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useCurrentUser } from "@/app/hooks/use-current-user";

import {
  Download,
  Inbox,
  Banknote,
  FileText,
  Smartphone,
  Building2,
  RotateCcw,
  X,
} from "lucide-react";

import AButton from "@/components/atoms/Button";
import Einput from "@/components/atoms/Einput";
import Eselect from "@/components/atoms/Eselect";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";

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

const YEARS: Option[] = Array.from({ length: 8 }, (_, index) => {
  const value = String(new Date().getFullYear() - 4 + index);
  return { value, label: value };
});

const PAYMENT_MODES: Option[] = [
  { value: "all", label: "All payment modes" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "NEEM", label: "NEEM" },
  { value: "Salary Hold", label: "Salary Hold" },
  { value: "BANK", label: "BANK" },
  { value: "CASH", label: "CASH" },
  { value: "NEFT", label: "NEFT" },
  { value: "Other", label: "Other" },
  { value: "ROLL", label: "ROLL" },
  { value: "NATS/NAPS", label: "NATS/NAPS" },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const getValue = (obj: AnyRecord, keys: string[], fallback: any = "") => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) {
      return obj[key];
    }
  }

  return fallback;
};

const getOptionValue = (item: AnyRecord) =>
  String(
    getValue(
      item,
      [
        "value",
        "Value",
        "Code",
        "CODE",
        "UTD",
        "LocationCode",
        "Loc_Code",
        "Branch_Code",
        "Cluster_Code",
        "Region_Code",
        "Financer",
        "BankName",
        "Bank_Name",
      ],
      "",
    ),
  );

const getOptionLabel = (item: AnyRecord) =>
  String(
    getValue(
      item,
      [
        "label",
        "Label",
        "Name",
        "name",
        "Location",
        "LocationName",
        "Branch_Name",
        "Cluster",
        "Cluster_Name",
        "Region",
        "Region_Name",
        "Financer",
        "BankName",
        "Bank_Name",
      ],
      getOptionValue(item),
    ),
  );

const normalizeOptions = (items: any[]): Option[] => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      if (
        item &&
        typeof item === "object" &&
        item.value !== undefined &&
        item.label !== undefined
      ) {
        return {
          value: String(item.value),
          label: String(item.label),
        };
      }

      const value = getOptionValue(item);
      const label = getOptionLabel(item);

      if (!value) return null;

      return { value, label: label || value };
    })
    .filter(Boolean) as Option[];
};

const isBankPayment = (mode: string) => {
  const value = String(mode || "")
    .trim()
    .toLowerCase();

  return [
    "bank",
    "bank transfer",
    "bank_transfer",
    "neft",
    "neem",
    "nats/naps",
  ].includes(value);
};

export default function BankTransferSheetPage() {
  const user = useCurrentUser();
  const today = new Date();

  const [loading, setLoading] = useState(false);

  // FILTER STATES
  const [year, setYear] = useState(String(today.getFullYear()));
  const [month, setMonth] = useState(String(today.getMonth() + 1));
  const [paymentMode, setPaymentMode] = useState("all");

  // BANK AND CLUSTER BLANK BY DEFAULT
  // Blank means all banks / all clusters.
  const [bank, setBank] = useState("");
  const [cluster, setCluster] = useState("");

  const [search, setSearch] = useState("");

  // MASTER DATA
  const [clusterOptions, setClusterOptions] = useState<Option[]>([]);
  const [bankOptions, setBankOptions] = useState<Option[]>([]);
  const [locationOptions, setLocationOptions] = useState<Option[]>([]);
  const [regionOptions, setRegionOptions] = useState<Option[]>([]);

  // TABLE DATA
  const [rows, setRows] = useState<AnyRecord[]>([]);

  const [activeTab, setActiveTab] = useState<"all" | "bank" | "incomplete">(
    "all",
  );

  const selectedMonth =
    MONTHS.find((item) => item.value === month)?.label || month;

  // INPUT HANDLER
  const handleInputChange = (name: string, value: any) => {
    switch (name) {
      case "year":
        setYear(String(value));
        break;

      case "month":
        setMonth(String(value));
        break;

      case "paymentMode":
        setPaymentMode(String(value));
        break;

      case "bank":
        setBank(String(value));
        break;

      case "cluster":
        setCluster(String(value));
        break;

      case "search":
        setSearch(String(value));
        break;

      default:
        break;
    }
  };

  // FETCH LOCATION BY CLUSTER
  const fetchLocationByCluster = useCallback(async () => {
    if (!user?.branch || !user?.Comp_Code) return;

    try {
      const locationsArray = String(user.branch)
        .split(",")
        .map((item: string) => Number(item.trim()))
        .filter((item: number) => !Number.isNaN(item));

      // No cluster selected = all available clusters.
      const selectedClusters = cluster
        ? [cluster]
        : clusterOptions.map((item) => item.value);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/ars/Emp_AtnrunGetLocation_1`,
        {
          locations: locationsArray,
          Cluster: selectedClusters,
        },
        {
          headers: {
            compcode: user.Comp_Code,
            name: user.name,
          },
        },
      );

      const result = response?.data?.results || response?.data?.data || [];

      setLocationOptions(normalizeOptions(result));
    } catch (error) {
      console.error("Error fetching locations:", error);
      setLocationOptions([]);
    }
  }, [user?.branch, user?.Comp_Code, user?.name, cluster, clusterOptions]);

  // FETCH MASTERS
  useEffect(() => {
    if (!user?.branch || !user?.Comp_Code) return;

    const fetchMasters = async () => {
      setLoading(true);

      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/hrmsreport/findMasters`,
          {
            multiloc: user.branch,
          },
          {
            headers: {
              compcode: user.Comp_Code,
              name: user.name,
            },
          },
        );

        const masterData = response?.data?.data || {};

        const clusters = normalizeOptions(masterData.CLUSTER || []);
        const regions = normalizeOptions(masterData.Region || []);

        // No All option in cluster dropdown.
        setClusterOptions(clusters);
        setRegionOptions(regions);

        // BANK MASTER
        const bankResponse = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/manualdiscount/disc7`,
          {
            multi_loc: user.branch,
          },
          {
            headers: {
              compcode: user.Comp_Code,
              name: user.name,
            },
          },
        );

        const banks = normalizeOptions(bankResponse?.data?.Financer || []);

        // No All option in bank dropdown.
        setBankOptions(banks);
      } catch (error) {
        console.error("Error fetching masters:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMasters();
  }, [user?.branch, user?.Comp_Code, user?.name]);

  // FETCH LOCATIONS WHEN CLUSTER CHANGES
  useEffect(() => {
    if (!user?.branch || !clusterOptions.length) return;

    fetchLocationByCluster();
  }, [user?.branch, cluster, clusterOptions, fetchLocationByCluster]);

  // FILTERED DATA
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const employeeName = String(
        getValue(row, [
          "Emp_Name",
          "EmpName",
          "EmployeeName",
          "Employee_Name",
          "Name",
        ]),
      ).toLowerCase();

      const employeeCode = String(
        getValue(row, [
          "Emp_Code",
          "EmpCode",
          "Emp_Id",
          "EmployeeCode",
          "EMPCODE",
        ]),
      ).toLowerCase();

      const accountNo = String(
        getValue(row, [
          "BankAccountNo",
          "AccountNo",
          "Account_No",
          "BankAccount",
        ]),
      ).toLowerCase();

      const rowMode = String(
        getValue(row, [
          "PAYMENTMODES",
          "PaymentMode",
          "ModeOfPay",
          "Mode_Of_Pay",
        ]),
      );

      const rowBank = String(
        getValue(row, ["BANKNAME", "Bank", "BankName", "Bank_Name"]),
      );

      const rowCluster = String(
        getValue(row, ["Cluster", "Cluster_Name", "Sal_Cluster"]),
      );

      const ifsc = String(
        getValue(row, ["IfscCode", "IFSC", "IFSCCode", "IFSC_Code"]),
      );

      const matchesSearch =
        !query ||
        employeeName.includes(query) ||
        employeeCode.includes(query) ||
        accountNo.includes(query);

      const matchesMode =
        paymentMode === "all" ||
        rowMode.toLowerCase() === paymentMode.toLowerCase();

      // Blank bank means all banks.
      const matchesBank = !bank || rowBank.toLowerCase() === bank.toLowerCase();

      // Blank cluster means all clusters.
      const matchesCluster =
        !cluster || rowCluster.toLowerCase() === cluster.toLowerCase();

      const matchesTab =
        activeTab === "all" ||
        (activeTab === "bank" && isBankPayment(rowMode)) ||
        (activeTab === "incomplete" && (!accountNo || !ifsc));

      return (
        matchesSearch &&
        matchesMode &&
        matchesBank &&
        matchesCluster &&
        matchesTab
      );
    });
  }, [rows, search, paymentMode, bank, cluster, activeTab]);

  // AMOUNT HELPER
  const getRowAmount = (row: AnyRecord) =>
    Number(
      getValue(
        row,
        ["Amount_Paid", "Amount", "NetAmount", "Net_Pay", "NetSalary"],
        0,
      ),
    ) || 0;

  // SUMMARY
  const totalPayable = filteredRows.reduce(
    (sum, row) => sum + getRowAmount(row),
    0,
  );

  const bankRows = filteredRows.filter((row) => {
    const mode = String(
      getValue(row, [
        "PAYMENTMODES",
        "PaymentMode",
        "PAYMENTMODE",
        "PAYMENT_MODE",
        "ModeOfPay",
        "Mode_Of_Pay",
        "PayMode",
        "Pay_Mode",
        "Mode",
      ]),
    ).trim();

    const bankName = String(
      getValue(row, [
        "BANKNAME",
        "Bank",
        "BankName",
        "Bank_Name",
        "BANK_NAME",
        "Financer",
      ]),
    ).trim();

    const account = String(
      getValue(row, [
        "BankAccountNo",
        "AccountNo",
        "Account_No",
        "BankAccount",
        "BANK_ACCOUNT_NO",
        "ACCOUNTNO",
        "AC_NO",
      ]),
    ).trim();

    const ifsc = String(
      getValue(row, ["IfscCode", "IFSC", "IFSCCode", "IFSC_Code", "IFSC_CODE"]),
    ).trim();

    const hasBankName =
      bankName !== "" && bankName !== "-" && bankName.toLowerCase() !== "cash";

    const isBankRow = isBankPayment(mode) || hasBankName;

    return isBankRow && account !== "" && ifsc !== "";
  });

  const bankSummary = useMemo(() => {
    const summary: Record<string, { amount: number; count: number }> = {};

    bankRows.forEach((row) => {
      const bankName =
        String(
          getValue(
            row,
            [
              "BANKNAME",
              "Bank",
              "BankName",
              "Bank_Name",
              "BANK_NAME",
              "Financer",
            ],
            "Other",
          ),
        ).trim() || "Other";

      if (!summary[bankName]) {
        summary[bankName] = {
          amount: 0,
          count: 0,
        };
      }

      summary[bankName].amount += getRowAmount(row);
      summary[bankName].count += 1;
    });

    return Object.entries(summary).sort((a, b) => b[1].amount - a[1].amount);
  }, [bankRows]);

  const bankTransferable = bankRows.reduce(
    (sum, row) => sum + getRowAmount(row),
    0,
  );

  const heldBackRows = filteredRows.filter((row) => {
    const account = getValue(row, [
      "BankAccountNo",
      "AccountNo",
      "Account_No",
      "BankAccount",
    ]);

    const ifsc = getValue(row, ["IfscCode", "IFSC", "IFSCCode", "IFSC_Code"]);

    return !account || !ifsc;
  });

  const heldBackAmount = heldBackRows.reduce(
    (sum, row) => sum + getRowAmount(row),
    0,
  );

  const getModeTotal = (modes: string[]) =>
    filteredRows
      .filter((row) => {
        const mode = String(
          getValue(row, [
            "PAYMENTMODES",
            "PaymentMode",
            "ModeOfPay",
            "Mode_Of_Pay",
          ]),
        ).toLowerCase();

        return modes.some((item) => item.toLowerCase() === mode);
      })
      .reduce((sum, row) => sum + getRowAmount(row), 0);

  const cashTotal = getModeTotal(["CASH", "Cash"]);
  const chequeTotal = getModeTotal(["Cheque"]);
  const upiTotal = getModeTotal(["UPI"]);

  // TABLE DATA
  const tableData = useMemo(
    () =>
      filteredRows.map((row, index) => ({
        ...row,

        _id: getValue(row, ["UTD", "Id", "id", "Seq_No"]) || `${index}`,

        _employee: getValue(
          row,
          ["Emp_Name", "EmpName", "EmployeeName", "Employee_Name", "Name"],
          "Unknown Employee",
        ),

        _code: getValue(row, [
          "Emp_Code",
          "EmpCode",
          "Emp_Id",
          "EmployeeCode",
          "EMPCODE",
        ]),

        _location: getValue(
          row,
          ["Location", "Branch_Name", "BranchName", "Branch"],
          "-",
        ),

        _mode: getValue(
          row,
          ["PAYMENTMODES", "PaymentMode", "ModeOfPay", "Mode_Of_Pay"],
          "-",
        ),

        _bank: getValue(
          row,
          ["BANKNAME", "Bank", "BankName", "Bank_Name"],
          "-",
        ),

        _account: getValue(
          row,
          ["BankAccountNo", "AccountNo", "Account_No", "BankAccount"],
          "-",
        ),

        _ifsc: getValue(
          row,
          ["IfscCode", "IFSC", "IFSCCode", "IFSC_Code"],
          "-",
        ),

        _amount: getRowAmount(row),

        _status: getValue(row, ["Status", "PaymentStatus"], "Pending"),
      })),
    [filteredRows],
  );

  // TABLE COLUMNS
  const columns = useMemo(
    () => [
      {
        Header: "EMPLOYEE ↑",
        accessor: "_employee",
        width: 220,
        Cell: ({ row }: any) => {
          const item = row.original;

          return (
            <div className="flex flex-col gap-0.5 py-1">
              <span className="text-[12px] font-semibold text-[#152b4b] dark:text-slate-100">
                {item._employee}
              </span>

              <span className="text-[10px] text-[#64748b] dark:text-slate-400">
                {item._code}
              </span>
            </div>
          );
        },
      },
      {
        Header: "LOCATION",
        accessor: "_location",
        width: 150,
      },
      {
        Header: "MODE OF PAY",
        accessor: "_mode",
        width: 140,
        Cell: ({ value }: any) => (
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {value}
          </span>
        ),
      },
      {
        Header: "BANK",
        accessor: "_bank",
        width: 160,
      },
      {
        Header: "ACCOUNT NO.",
        accessor: "_account",
        width: 160,
      },
      {
        Header: "IFSC",
        accessor: "_ifsc",
        width: 130,
      },
      {
        Header: "AMOUNT",
        accessor: "_amount",
        width: 130,
        Cell: ({ value }: any) => (
          <span className="whitespace-nowrap text-[12px] font-bold text-[#142b49] dark:text-slate-100">
            {formatCurrency(Number(value) || 0)}
          </span>
        ),
      },
    ],
    [],
  );

  // SHOW DATA API
  const ShowData = async () => {
    if (!user?.Comp_Code) return;
    if (!month || !year) return;

    setLoading(true);

    try {
      const selectedLocations = locationOptions.map((item) => item.value);

      const selectedRegions = regionOptions.map((item) => item.value);

      // Blank cluster means all clusters.
      const selectedClusters = cluster
        ? [cluster]
        : clusterOptions.map((item) => item.value);

      const payload = {
        location: selectedLocations,
        region: selectedRegions,
        salyear: Number(year),
        SalMnth: Number(month),
        PAYMENTMODES: paymentMode === "all" ? "" : paymentMode,

        // Blank bank means all banks.
        BANKNAME: bank || "",

        Cluster: selectedClusters,
      };

      console.log("BankTransferSheet Payload:", payload);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/BankTransferSheet`,
        payload,
        {
          headers: {
            compcode: user.Comp_Code,
            name: user.name,
          },
        },
      );

      const responseData =
        response?.data?.data || response?.data?.result || response?.data || [];

      const resultRows = Array.isArray(responseData) ? responseData : [];

      setRows(resultRows);
    } catch (error: any) {
      console.error("BankTransferSheet API Error:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // RESET FILTERS
  const handleReset = () => {
    setYear(String(today.getFullYear()));
    setMonth(String(today.getMonth() + 1));
    setPaymentMode("all");

    // Reset to blank = all banks and clusters.
    setBank("");
    setCluster("");

    setSearch("");
    setActiveTab("all");
    setRows([]);
  };

  // EXPORT CSV
  const handleExport = () => {
    if (!filteredRows.length) return;

    const headers = [
      "Employee",
      "Employee Code",
      "Location",
      "Mode of Pay",
      "Bank",
      "Account No",
      "IFSC",
      "Amount",
      "Status",
    ];

    const escapeCSV = (value: any) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csvRows = [
      headers.map(escapeCSV).join(","),
      ...tableData.map((row: AnyRecord) =>
        [
          row._employee,
          row._code,
          row._location,
          row._mode,
          row._bank,
          row._account,
          row._ifsc,
          row._amount,
          row._status,
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
    link.download = `Bank_Transfer_${month}_${year}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="bank-transfer-page min-h-screen min-w-0 bg-[#f5f8fc] p-2 text-slate-800 transition-colors dark:bg-[#0b1220] dark:text-slate-100 sm:p-3 xl:p-5">
      <HashloaderComponent isLoading={loading} />

      <div className="mx-auto max-w-[1800px] space-y-3.5">
        {/* HEADER */}
        <div>
          <h1 className="text-[21px] font-bold leading-tight text-[#10213b] dark:text-slate-100">
            Bank transfer sheet
          </h1>

          <p className="mt-1 text-[12px] text-[#64748b] dark:text-slate-400">
            The payment instruction for the month, grouped by bank. Rows missing
            an account number or IFSC are held back from the NEFT file.
          </p>
        </div>

        {/* MAIN GRID */}
        <div className="grid min-w-0 grid-cols-1 items-start gap-3.5 xl:grid-cols-[300px_minmax(0,1fr)]">
          {/* LEFT FILTERS */}
          <aside className="flex min-w-0 flex-col gap-3">
            <div className="rounded-xl border border-[#dce5f1] bg-white p-3.5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-[#151f30] dark:shadow-none sm:p-4">
              <div className="grid grid-cols-2 gap-3">
                <Eselect
                  title="YEAR"
                  name="year"
                  option={YEARS}
                  initialValue={year}
                  handleInputChange={handleInputChange}
                  className="h-[34px] w-full"
                  placeholder="Select year"
                />

                <Eselect
                  title="MONTH"
                  name="month"
                  option={MONTHS}
                  initialValue={month}
                  handleInputChange={handleInputChange}
                  className="h-[34px] w-full"
                  placeholder="Select month"
                />
              </div>

              <div className="mt-3">
                <Eselect
                  title="PAYMENT MODE"
                  name="paymentMode"
                  option={PAYMENT_MODES}
                  initialValue={paymentMode}
                  handleInputChange={handleInputChange}
                  className="h-[34px] w-full"
                  placeholder="Select payment mode"
                />
              </div>

              <div className="mt-3">
                <Eselect
                  title="BANK"
                  name="bank"
                  option={bankOptions}
                  initialValue={bank}
                  handleInputChange={handleInputChange}
                  className="h-[34px] w-full"
                  placeholder="All banks"
                />
              </div>

              <div className="mt-3">
                <Eselect
                  title="CLUSTER"
                  name="cluster"
                  option={clusterOptions}
                  initialValue={cluster}
                  handleInputChange={handleInputChange}
                  className="h-[34px] w-full"
                  placeholder="All clusters"
                />
              </div>

              <AButton
                type="button"
                onClick={handleReset}
                className="mt-3 inline-flex h-[35px] w-full items-center justify-center gap-2 rounded-lg border border-[#dce5f1] bg-white px-3 text-[12px] font-medium text-[#43546d] hover:bg-slate-50 dark:border-slate-600 dark:bg-[#202c3e] dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <RotateCcw size={14} />
                Reset filters
              </AButton>

              <AButton
                type="button"
                onClick={ShowData}
                className="mt-2 inline-flex h-[35px] w-full items-center justify-center gap-2 rounded-lg bg-[#5145e9] px-3 text-[12px] font-semibold text-white hover:bg-[#4338ca]"
              >
                Show Data
              </AButton>
            </div>

            {/* PAYABLE BY BANK */}
            <div className="rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-[#151f30] dark:shadow-none">
              <h3 className="mb-3 text-[10px] font-bold tracking-wide text-[#536987] dark:text-slate-400">
                PAYABLE BY BANK
              </h3>

              {bankSummary.length > 0 ? (
                <div
                  className={`bank-summary-scroll space-y-2 overflow-x-hidden overflow-y-auto pr-2 ${
                    !bank && bankSummary.length > 3 ? "h-[220px]" : ""
                  }`}
                >
                  {bankSummary.map(([bankName, details]) => (
                    <div
                      key={bankName}
                      className="rounded-lg border border-[#dce5f1] bg-[#f8fafd] px-3 py-2.5 dark:border-slate-700 dark:bg-[#202c3e]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2 text-[11px] font-medium text-[#647894] dark:text-slate-300">
                          <Building2 size={15} className="shrink-0" />
                          <span className="truncate">{bankName}</span>
                        </div>

                        <strong className="whitespace-nowrap text-[11px] text-[#14213d] dark:text-slate-100">
                          {formatCurrency(details.amount)}
                        </strong>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-[#e7eaf2] dark:bg-slate-700">
                          <div
                            className="h-full rounded-full bg-[#5145e9]"
                            style={{
                              width: `${
                                bankSummary[0][1].amount > 0
                                  ? Math.min(
                                      (details.amount /
                                        bankSummary[0][1].amount) *
                                        100,
                                      100,
                                    )
                                  : 0
                              }%`,
                            }}
                          />
                        </div>

                        <span className="whitespace-nowrap text-[10px] text-[#71819c] dark:text-slate-400">
                          {details.count} employees
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-2 text-center text-[11px] text-[#71819c] dark:text-slate-400">
                  No bank payable data found
                </div>
              )}
            </div>

            {/* NON BANK PAYOUTS */}
            <div className="rounded-xl border border-[#dce5f1] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-[#151f30] dark:shadow-none">
              <h3 className="mb-3 text-[10px] font-bold tracking-wide text-[#536987] dark:text-slate-400">
                NON-BANK PAYOUTS
              </h3>

              <div className="space-y-2">
                <PayoutItem
                  icon={<Banknote size={16} />}
                  label="Cash payouts"
                  amount={cashTotal}
                  color="cash"
                />

                <PayoutItem
                  icon={<FileText size={16} />}
                  label="Cheque"
                  amount={chequeTotal}
                  color="cheque"
                />

                <PayoutItem
                  icon={<Smartphone size={16} />}
                  label="UPI"
                  amount={upiTotal}
                  color="upi"
                />
              </div>
            </div>
          </aside>

          {/* RIGHT SIDE */}
          <main className="min-w-0">
            {/* SUMMARY CARDS */}
            <div className="mb-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              <SummaryCard
                dot="#5145e9"
                label="Transfers"
                value={String(filteredRows.length)}
                subtitle={`${selectedMonth} ${year}`}
              />

              <SummaryCard
                dot="#0ea5e9"
                label="Total payable"
                value={formatCurrency(totalPayable)}
                subtitle="All payment modes"
              />

              <SummaryCard
                dot="#10b981"
                label="Bank transferable"
                value={formatCurrency(bankTransferable)}
                subtitle={`${bankRows.length} complete rows`}
              />

              <SummaryCard
                dot="#10b981"
                label="Held back"
                value={formatCurrency(heldBackAmount)}
                subtitle={
                  heldBackRows.length
                    ? `${heldBackRows.length} incomplete rows`
                    : "Nothing incomplete"
                }
              />
            </div>

            {/* TABLE CARD */}
            <div className="min-w-0 overflow-hidden rounded-xl border border-[#dce5f1] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-[#151f30] dark:shadow-none">
              {/* TOOLBAR */}
              <div className="flex min-w-0 flex-col gap-3 border-b border-[#dce5f1] px-3 py-3 dark:border-slate-700 xl:flex-row xl:items-center xl:justify-between xl:px-4">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-[12px] text-[#152541] dark:text-slate-100">
                    {filteredRows.length} transfers
                  </strong>

                  <span className="text-[11px] text-[#71819c] dark:text-slate-400">
                    {selectedMonth} {year} · HR approved only
                  </span>
                </div>

                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
                  {/* TABS */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveTab("all")}
                      className={`h-[30px] rounded-lg border px-3 text-[11px] transition ${
                        activeTab === "all"
                          ? "border-[#5145e9] bg-[#f0efff] text-[#5145e9] dark:bg-indigo-950/50"
                          : "border-[#dce5f1] bg-white text-[#536987] dark:border-slate-600 dark:bg-[#202c3e] dark:text-slate-300"
                      }`}
                    >
                      All
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("bank")}
                      className={`h-[30px] rounded-lg border px-3 text-[11px] transition ${
                        activeTab === "bank"
                          ? "border-[#5145e9] bg-[#f0efff] text-[#5145e9] dark:bg-indigo-950/50"
                          : "border-[#dce5f1] bg-white text-[#536987] dark:border-slate-600 dark:bg-[#202c3e] dark:text-slate-300"
                      }`}
                    >
                      Bank only
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("incomplete")}
                      className={`h-[30px] rounded-lg border px-3 text-[11px] transition ${
                        activeTab === "incomplete"
                          ? "border-[#5145e9] bg-[#f0efff] text-[#5145e9] dark:bg-indigo-950/50"
                          : "border-[#dce5f1] bg-white text-[#536987] dark:border-slate-600 dark:bg-[#202c3e] dark:text-slate-300"
                      }`}
                    >
                      Incomplete
                    </button>
                  </div>

                  {/* SEARCH */}
                  <div className="relative min-w-0 sm:w-[210px]">
                    <Einput
                      title=""
                      name="search"
                      type="text"
                      value={search}
                      handleInputChange={handleInputChange}
                      className="h-[32px] w-full pl-8"
                      placeholder="Name, code or account"
                    />

                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="absolute right-2 top-[9px] z-10 text-slate-400"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                
                </div>
              </div>

              {/* DATA TABLE */}
              <div className="bank-transfer-table w-full min-w-0 overflow-x-auto">
                <div className="min-w-[1050px]">
                  {tableData.length > 0 ? (
                    <DataTable
                      columns={columns}
                      data={tableData}
                      showTopSearch={false}
                       showExcelExport={true}
                      showColumnFilters= {true}
                      initialPageSize={10}
                    />
                  ) : (
                    <>
                      {/* EMPTY TABLE HEADER */}
                      <div className="grid grid-cols-[220px_150px_140px_160px_160px_130px_130px_120px] border-b border-[#dce5f1] bg-[#f8fafd] dark:border-slate-700 dark:bg-[#1e293b]">
                        {[
                          "EMPLOYEE ↑",
                          "LOCATION",
                          "MODE OF PAY",
                          "BANK",
                          "ACCOUNT NO.",
                          "IFSC",
                          "AMOUNT",
                          "STATUS",
                        ].map((heading) => (
                          <div
                            key={heading}
                            className="px-3 py-3 text-[10px] font-bold text-[#536987] dark:text-slate-300"
                          >
                            {heading}
                          </div>
                        ))}
                      </div>

                      <div className="flex min-h-[200px] flex-col items-center justify-center px-4 py-8 text-center">
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-[#dce5f1] bg-[#f8fafd] text-[#71819c] dark:border-slate-700 dark:bg-[#202c3e] dark:text-slate-400">
                          <Inbox size={18} />
                        </div>

                        <strong className="text-[12px] font-bold text-[#152541] dark:text-slate-100">
                          Nothing to transfer here
                        </strong>

                        <p className="mt-1 text-[11px] text-[#71819c] dark:text-slate-400">
                          No approved salary matches this month and filter.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* FOOTER */}
              <div className="flex min-w-0 flex-col gap-2 border-t border-[#dce5f1] bg-[#fafbfd] px-3 py-2.5 dark:border-slate-700 dark:bg-[#111b2b] sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <span className="text-[11px] text-[#71819c] dark:text-slate-400">
                  Page 1 of 1 · {filteredRows.length} items
                </span>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="text-[11px] text-[#71819c] dark:text-slate-400">
                    Transferable total
                  </span>

                  <strong className="text-[15px] font-bold text-[#14213d] dark:text-slate-100">
                    {formatCurrency(bankTransferable)}
                  </strong>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* RESPONSIVE / DARK MODE STYLES */}
      <style jsx global>{`
        .bank-transfer-page label {
          color: #536987;
          font-size: 10px;
          font-weight: 600;
        }

        .bank-transfer-page select {
          min-height: 34px;
        }

        .bank-transfer-page input:not([type="checkbox"]),
        .bank-transfer-page select,
        .bank-transfer-page textarea {
          font-size: 11px;
        }

        .bank-transfer-page .bank-transfer-table table {
          width: 100%;
          min-width: 1050px;
          border-collapse: collapse;
        }

        .bank-transfer-page .bank-transfer-table thead th {
          padding: 11px 12px !important;
          background: #f8fafd !important;
          color: #536987 !important;
          border-bottom: 1px solid #dce5f1 !important;
          font-size: 10px !important;
          font-weight: 700 !important;
          white-space: nowrap;
          text-align: left;
        }

        .bank-transfer-page .bank-transfer-table tbody td {
          padding: 10px 12px !important;
          border-bottom: 1px solid #edf1f6 !important;
          color: #536987;
          font-size: 11px;
          white-space: nowrap;
        }

        /* PAYABLE BY BANK SCROLLBAR */
        .bank-transfer-page .bank-summary-scroll {
          overflow-y: auto !important;
          overflow-x: hidden !important;
          scrollbar-width: thin;
          scrollbar-color: #94a3b8 #edf2f7;
          padding-right: 6px;
        }

        .bank-transfer-page .bank-summary-scroll::-webkit-scrollbar {
          width: 7px;
          display: block;
        }

        .bank-transfer-page .bank-summary-scroll::-webkit-scrollbar-track {
          background: #edf2f7;
          border-radius: 10px;
        }

        .bank-transfer-page .bank-summary-scroll::-webkit-scrollbar-thumb {
          background: #94a3b8;
          border-radius: 10px;
          border: 1px solid #edf2f7;
        }

        .bank-transfer-page
          .bank-summary-scroll::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }

        /* DARK MODE */
        .dark .bank-transfer-page label {
          color: #cbd5e1;
        }

        .dark .bank-transfer-page input:not([type="checkbox"]),
        .dark .bank-transfer-page select,
        .dark .bank-transfer-page textarea {
          color: #e2e8f0 !important;
          background-color: #202c3e !important;
          border-color: #475569 !important;
        }

        .dark .bank-transfer-page input::placeholder {
          color: #94a3b8 !important;
        }

        .dark .bank-transfer-page select option {
          color: #e2e8f0;
          background-color: #202c3e;
        }

        .dark .bank-transfer-page .bank-transfer-table table {
          color: #cbd5e1;
          background-color: #151f30;
        }

        .dark .bank-transfer-page .bank-transfer-table thead th {
          color: #cbd5e1 !important;
          background-color: #1e293b !important;
          border-color: #334155 !important;
        }

        .dark .bank-transfer-page .bank-transfer-table tbody td {
          color: #cbd5e1;
          background-color: #151f30;
          border-color: #334155 !important;
        }

        .dark .bank-transfer-page .bank-transfer-table tbody tr:hover td {
          background-color: #202c3e !important;
        }

        /* DARK MODE SCROLLBAR */
        .dark .bank-transfer-page .bank-summary-scroll {
          scrollbar-color: #64748b #263449;
        }

        .dark
          .bank-transfer-page
          .bank-summary-scroll::-webkit-scrollbar-track {
          background: #263449;
        }

        .dark
          .bank-transfer-page
          .bank-summary-scroll::-webkit-scrollbar-thumb {
          background: #64748b;
          border-color: #263449;
        }

        .dark
          .bank-transfer-page
          .bank-summary-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        @media (max-width: 640px) {
          .bank-transfer-page .bank-transfer-table {
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
    <div className="min-h-[90px] min-w-0 rounded-xl border border-[#dce5f1] bg-white px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-[#151f30] dark:shadow-none">
      <div className="flex items-center gap-2">
        <span
          className="h-[7px] w-[7px] shrink-0 rounded-full"
          style={{ backgroundColor: dot }}
        />

        <span className="text-[11px] font-medium text-[#52627c] dark:text-slate-400">
          {label}
        </span>
      </div>

      <div className="mt-1.5 break-words text-[21px] font-bold leading-tight text-[#10213b] dark:text-slate-100">
        {value}
      </div>

      <div className="mt-1 text-[10px] text-[#64748b] dark:text-slate-500">
        {subtitle}
      </div>
    </div>
  );
}

// NON-BANK PAYOUT ITEM
function PayoutItem({
  icon,
  label,
  amount,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  amount: number;
  color: "cash" | "cheque" | "upi";
}) {
  const colorClasses = {
    cash: "bg-[#fff1d9] text-[#f59e0b]",
    cheque: "bg-[#f0e7ff] text-[#9146f5]",
    upi: "bg-[#e0f4ff] text-[#0ea5e9]",
  };

  return (
    <div className="flex min-h-[48px] items-center justify-between gap-2 rounded-lg border border-[#dce5f1] bg-[#f8fafd] px-3 py-2 dark:border-slate-700 dark:bg-[#202c3e]">
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-[25px] w-[25px] items-center justify-center rounded-lg ${colorClasses[color]}`}
        >
          {icon}
        </span>

        <span className="text-[11px] text-[#647894] dark:text-slate-300">
          {label}
        </span>
      </div>

      <strong className="whitespace-nowrap text-[11px] font-bold text-[#14213d] dark:text-slate-100">
        {formatCurrency(amount)}
      </strong>
    </div>
  );
}
