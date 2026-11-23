"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Swal from "sweetalert2";
import { ChevronDown } from "lucide-react";
import { FaUsers } from "react-icons/fa";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import Eselect from "@/components/atoms/Eselect";
import DataTable from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function showSideAlert(message: string, type: "success" | "error" | "warning" | "info") {
  Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true,
  }).fire({
    icon: type,
    title: message,
  });
}

const MONTH_NAMES = [
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

const monthsArray = [
  { label: "All", value: "13" },
  { label: "Jan", value: "1" },
  { label: "Feb", value: "2" },
  { label: "Mar", value: "3" },
  { label: "Apr", value: "4" },
  { label: "May", value: "5" },
  { label: "Jun", value: "6" },
  { label: "Jul", value: "7" },
  { label: "Aug", value: "8" },
  { label: "Sep", value: "9" },
  { label: "Oct", value: "10" },
  { label: "Nov", value: "11" },
  { label: "Dec", value: "12" },
];

interface MonthWiseEmployeeSalaryProps {
  isDialogMode?: boolean;
}

export default function MonthWiseEmployeeSalaryPage({
  isDialogMode = false,
}: MonthWiseEmployeeSalaryProps) {
  const user: any = useCurrentUser();
  const router = useRouter();

  const userRef = React.useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const getCompCode = () => {
    const u = userRef.current || user;
    return u?.Comp_Code || u?.compcode || u?.company;
  };

  const getUserName = () => {
    const u = userRef.current || user;
    return u?.name || u?.userName || "";
  };

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  const [isLoading, setIsLoading] = useState(false);
  const [employeeOptions, setEmployeeOptions] = useState<any[]>([]);
  const [monthData, setMonthData] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Modal / details states
  const [monthDetailItem, setMonthDetailItem] = useState<any | null>(null);
  const [deductionPopup, setDeductionPopup] = useState(false);
  const [deductionData, setDeductionData] = useState<any[]>([]);
  const [totalDeduction, setTotalDeduction] = useState(0);

  // Form state
  const [form, setForm] = useState({
    Emp_Code: "",
    SalMnth: (currentDate.getMonth() + 1).toString(),
    SalYr: currentYear.toString(),
  });

  const handleChange = (name: string, value: any) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Generate Year options
  const yearoptions = useMemo(() => {
    const years = [];
    for (let i = 0; i < 6; i++) {
      const year = currentYear - i + 1;
      years.push({
        value: `${year}`,
        label: `${year}`,
      });
    }
    return years;
  }, [currentYear]);

  // Fetch employees list
  useEffect(() => {
    const compCode = getCompCode();
    if (!compCode) return;

    const fetchEmployees = async () => {
      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/employee/all`,
          {},
          { headers: { compcode: compCode, name: getUserName() } }
        );

        const list = response.data?.data || [];
        const options = list.map((item: any) => {
          const code =
            item.EMPCODE ||
            item.EmpCode ||
            item.Emp_Code ||
            item.EmployeeCode ||
            item.value ||
            "";
          const name =
            item.Emp_Name ||
            item.EmployeeName ||
            item.EmpName ||
            item.Name ||
            item.label ||
            "";
          return {
            value: String(code),
            label: name ? `${code} · ${name}` : String(code),
            empCode: code,
            empName: name,
          };
        });
        setEmployeeOptions(options);
      } catch (err: any) {
        console.error("Error fetching employees:", err);
      }
    };

    fetchEmployees();
  }, [user?.Comp_Code]);

  // Fetch salary summary
  const getSalarySummary = async () => {
    if (!form.Emp_Code) {
      showSideAlert("Please select employee.", "warning");
      return;
    }
    const compCode = getCompCode();
    if (!compCode) {
      showSideAlert("Company code missing.", "error");
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/hrmsreport/MonthWiseEmployeeSalarySummary`,
        {
          Emp_Code: form.Emp_Code,
          SalMnth: Number(form.SalMnth),
          SalYr: form.SalYr,
          Year: form.SalYr,
          loc_code: Array.isArray(user?.branch) ? user.branch : [user?.branch],
        },
        { headers: { compcode: compCode, name: getUserName() } }
      );

      if (response.data.success) {
        setMonthData(response.data.data || []);
        setHasSearched(true);
      } else {
        showSideAlert(response.data.message || "Failed to load salary data.", "error");
      }
    } catch (err: any) {
      showSideAlert(err.response?.data?.message || err.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch deduction details
  const getDeductionDetails = async (month: number) => {
    const compCode = getCompCode();
    try {
      setIsLoading(true);
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/hrmsreport/MonthWiseDeductionDetails`,
        {
          Emp_Code: form.Emp_Code,
          Month: month,
        },
        {
          headers: {
            compcode: compCode,
            name: getUserName(),
          },
        }
      );

      setDeductionData(res.data?.data || []);
      setTotalDeduction(res.data?.total || 0);
      setDeductionPopup(true);
    } catch (err: any) {
      console.error(err);
      showSideAlert(err.response?.data?.message || "Failed to load deduction details", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Annual Totals Calculation
  const annualTotal = useMemo(() => {
    return monthData.reduce(
      (acc, item) => ({
        Present: acc.Present + (Number(item.Present) || 0),
        Absent: acc.Absent + (Number(item.Absent) || 0),
        Salary: acc.Salary + (Number(item.Salary) || 0),
        Deduction: acc.Deduction + (Number(item.Deduction) || 0),
        NetPay: acc.NetPay + (Number(item.NetPay) || 0),
      }),
      { Present: 0, Absent: 0, Salary: 0, Deduction: 0, NetPay: 0 }
    );
  }, [monthData]);

  // Selected employee metadata
  const selectedEmployee = useMemo(() => {
    return employeeOptions.find((e) => String(e.value) === String(form.Emp_Code));
  }, [employeeOptions, form.Emp_Code]);

  // Months paid count
  const monthsPaidCount = useMemo(() => {
    return monthData.filter(
      (m) => (Number(m.Salary) || 0) > 0 || (Number(m.Present) || 0) > 0
    ).length;
  }, [monthData]);

  // Construct 12 months dataset
  const tableData = useMemo(() => {
    if (!hasSearched) return [];

    const selectedYear = form.SalYr || currentYear;
    return MONTH_NAMES.map((name, index) => {
      const monthNumber = index + 1;
      const apiItem = monthData.find(
        (d: any) =>
          Number(d.Month) === monthNumber ||
          String(d.MonthName || "").toLowerCase() === name.toLowerCase()
      );

      const hasSalary = (Number(apiItem?.Salary) || 0) > 0;
      const hasPresent = (Number(apiItem?.Present) || 0) > 0;
      const isPaid = Boolean(apiItem && (hasSalary || hasPresent));

      return {
        Month: monthNumber,
        MonthName: name,
        MonthLabel: `${name} ${selectedYear}`,
        Present: isPaid ? apiItem?.Present : null,
        Absent: apiItem?.Absent ?? 0,
        DailyWages: apiItem?.DailyWages ?? 0,
        Salary: isPaid ? apiItem?.Salary : null,
        Deduction: apiItem?.Deduction ?? 0,
        NetPay: isPaid ? apiItem?.NetPay : null,
        isPaid,
        raw: apiItem,
      };
    });
  }, [monthData, form.SalYr, currentYear, hasSearched]);

  // Table Columns
  const columns = useMemo(
    () => [
      {
        Header: "Month",
        accessor: "MonthLabel",
        minWidth: 150,
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {value}
          </span>
        ),
      },
      {
        Header: "Present",
        accessor: "Present",
        minWidth: 120,
        Cell: ({ row, value }: any) => (
          <span className="text-slate-700 dark:text-slate-300">
            {row.original.isPaid && value !== undefined && value !== null ? value : "—"}
          </span>
        ),
      },
      {
        Header: "Gross",
        accessor: "Salary",
        minWidth: 150,
        Cell: ({ row, value }: any) => (
          <span className="text-slate-700 dark:text-slate-300">
            {row.original.isPaid && value !== undefined && value !== null
              ? `₹${Number(value).toLocaleString("en-IN")}`
              : "—"}
          </span>
        ),
      },
      {
        Header: "Net pay",
        accessor: "NetPay",
        minWidth: 150,
        Cell: ({ row, value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 font-medium">
            {row.original.isPaid && value !== undefined && value !== null
              ? `₹${Number(value).toLocaleString("en-IN")}`
              : "—"}
          </span>
        ),
      },
      {
        Header: "Status",
        accessor: "Status",
        minWidth: 150,
        Cell: ({ row }: any) => {
          const isPaid = row.original.isPaid;
          if (isPaid) {
            return (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-s font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
                  Paid
                </span>
                <button
                  type="button"
                  onClick={() => setMonthDetailItem(row.original)}
                  className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  title="View Details"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            );
          }
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-s font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Not processed
            </span>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#070D18] p-3 sm:p-4 lg:p-6 text-slate-800 dark:text-slate-100">
      <HashloaderComponent isLoading={isLoading} />

      <div className="mx-auto max-w-[1700px] w-full space-y-4">
        {/* ============================================================== */}
        {/* BREADCRUMB & HEADER */}
        {/* ============================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
          
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight mt-0.5">
              Month wise employee salary
            </h1>
            <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
              Annual salary breakdown, month by month.
            </p>
          </div>

        
        </div>

        {/* ============================================================== */}
        {/* FILTER CARD */}
        {/* ============================================================== */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] p-4 sm:p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)]">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-6">
              <Eselect
                title="Employee code"
                name="Emp_Code"
                option={employeeOptions}
                initialValue={form.Emp_Code}
                handleInputChange={handleChange}
                placeholder="Select Employee"
                className="!h-10 w-full rounded-xl text-[13px]"
              />
            </div>

            <div className="md:col-span-2">
              <Eselect
                title="Year"
                name="SalYr"
                option={yearoptions}
                initialValue={form.SalYr?.toString()}
                handleInputChange={handleChange}
                placeholder="Select Year"
                className="!h-10 w-full rounded-xl text-[13px]"
              />
            </div>

            <div className="md:col-span-2">
              <Eselect
                title="Month"
                name="SalMnth"
                option={monthsArray}
                initialValue={form.SalMnth?.toString()}
                handleInputChange={handleChange}
                placeholder="Select Month"
                className="!h-10 w-full rounded-xl text-[13px]"
              />
            </div>

            <div className="md:col-span-2">
              <AButton
                type="button"
                onClick={getSalarySummary}
                loading={isLoading}
                disabled={isLoading}
                className="rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white px-6 h-10 font-semibold shadow-xs w-full text-sm"
              >
                Submit
              </AButton>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SUMMARY STRIP */}
        {/* ============================================================== */}
        {hasSearched && monthData.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 pt-2">
            <div className="text-base font-bold text-slate-900 dark:text-white">
              {selectedEmployee?.empName ? (
                <>
                  {selectedEmployee.empName} · {selectedEmployee.empCode || form.Emp_Code} · {form.SalYr}
                </>
              ) : (
                <>
                  {form.Emp_Code} · {form.SalYr}
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
              <div className="text-slate-500 dark:text-slate-400">
                Months paid{" "}
                <span className="font-bold text-slate-900 dark:text-white ml-1">
                  {monthsPaidCount}
                </span>
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                Gross{" "}
                <span className="font-bold text-slate-900 dark:text-white ml-1">
                  ₹{Number(annualTotal.Salary).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="text-slate-500 dark:text-slate-400">
                Net pay{" "}
                <span className="font-bold text-slate-900 dark:text-white ml-1">
                  ₹{Number(annualTotal.NetPay).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MAIN DATA TABLE */}
        {/* ============================================================== */}
        {hasSearched ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] overflow-hidden shadow-xs">
            <DataTable
              columns={columns}
              data={tableData}
              showTopSearch={false}
              showExcelExport={false}
              showColumnFilters={false}
              showPageSizeInFooter={false}
              initialPageSize={12}
            />
          </div>
        ) : (
          !isLoading && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] p-16 text-center text-slate-400">
              <FaUsers size={40} className="mx-auto mb-3 opacity-30 text-indigo-500" />
              <p className="text-sm font-medium">
                Select employee and click Submit to view salary data
              </p>
            </div>
          )
        )}
      </div>

      {/* ============================================================== */}
      {/* MONTH DETAILS BREAKDOWN MODAL */}
      {/* ============================================================== */}
      <Dialog
        open={Boolean(monthDetailItem)}
        onOpenChange={(open) => !open && setMonthDetailItem(null)}
      >
        <DialogContent className="w-full max-w-[700px] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Salary Breakdown · {monthDetailItem?.MonthLabel}
            </DialogTitle>
          </DialogHeader>

          {monthDetailItem && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Present Days */}
                <div className="rounded-xl p-4 border bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800">
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                    Present Days
                  </p>
                  <p className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-300">
                    {monthDetailItem.Present ?? 0}
                  </p>
                </div>

                {/* Absent Days */}
                <div className="rounded-xl p-4 border bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-800">
                  <p className="text-xs font-semibold text-rose-800 dark:text-rose-400">
                    Absent Days
                  </p>
                  <p className="text-2xl font-bold mt-1 text-rose-700 dark:text-rose-300">
                    {monthDetailItem.Absent ?? 0}
                  </p>
                </div>

                {/* Daily Wages */}
                <div className="rounded-xl p-4 border bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                    Daily Wages
                  </p>
                  <p className="text-2xl font-bold mt-1 text-amber-700 dark:text-amber-300">
                    ₹{Number(monthDetailItem.DailyWages || 0).toLocaleString("en-IN")}
                  </p>
                </div>

                {/* Gross Salary */}
                <div className="rounded-xl p-4 border bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-800">
                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-400">
                    Gross Salary
                  </p>
                  <p className="text-2xl font-bold mt-1 text-blue-700 dark:text-blue-300">
                    ₹{Number(monthDetailItem.Salary || 0).toLocaleString("en-IN")}
                  </p>
                </div>

                {/* Deduction */}
                <div
                  onClick={() => getDeductionDetails(monthDetailItem.Month)}
                  className="rounded-xl p-4 border bg-orange-50/60 dark:bg-orange-950/20 border-orange-200/80 dark:border-orange-800 cursor-pointer hover:scale-[1.02] transition-all group"
                  title="Click to view deduction details"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-orange-800 dark:text-orange-400">
                      Deduction
                    </p>
                    <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium underline group-hover:opacity-100 opacity-70">
                      View details
                    </span>
                  </div>
                  <p className="text-2xl font-bold mt-1 text-orange-700 dark:text-orange-300">
                    ₹{Number(monthDetailItem.Deduction || 0).toLocaleString("en-IN")}
                  </p>
                </div>

                {/* Net Pay */}
                <div
                  className={`rounded-xl p-4 border ${
                    Number(monthDetailItem.NetPay) < 0
                      ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-800"
                      : "bg-purple-50/60 dark:bg-purple-950/20 border-purple-200/80 dark:border-purple-800"
                  }`}
                >
                  <p
                    className={`text-xs font-semibold ${
                      Number(monthDetailItem.NetPay) < 0
                        ? "text-rose-800 dark:text-rose-400"
                        : "text-purple-800 dark:text-purple-400"
                    }`}
                  >
                    Net Pay
                  </p>
                  <p
                    className={`text-2xl font-bold mt-1 ${
                      Number(monthDetailItem.NetPay) < 0
                        ? "text-rose-700 dark:text-rose-300"
                        : "text-purple-700 dark:text-purple-300"
                    }`}
                  >
                    ₹{Number(monthDetailItem.NetPay || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* DEDUCTION DETAILS MODAL */}
      {/* ============================================================== */}
      <Dialog open={deductionPopup} onOpenChange={setDeductionPopup}>
        <DialogContent className="w-full max-w-[540px] max-h-[85vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Deduction Details
            </DialogTitle>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Monthly breakdown of deductions
            </p>
          </DialogHeader>

          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-xs uppercase tracking-wider">
                  <th className="text-left p-3 font-semibold">Month</th>
                  <th className="text-left p-3 font-semibold">Year</th>
                  <th className="text-left p-3 font-semibold">Date</th>
                  <th className="text-right p-3 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {deductionData.length > 0 ? (
                  deductionData.map((row: any, i: number) => (
                    <tr
                      key={i}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                        {row.Mnth}
                      </td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">
                        {row.Yr}
                      </td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">
                        {row.Rec_Date
                          ? new Date(row.Rec_Date).toLocaleDateString("en-GB")
                          : "—"}
                      </td>
                      <td className="p-3 text-right font-medium">
                        <span className="bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md font-semibold">
                          ₹{Number(row.Ded_Amt || 0).toLocaleString("en-IN")}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-400 text-sm">
                      No deduction records found.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-indigo-50/70 dark:bg-indigo-950/30 border-t border-slate-200 dark:border-slate-700">
                  <td colSpan={3} className="p-3 font-bold text-slate-800 dark:text-white">
                    Total Deduction
                  </td>
                  <td className="p-3 text-right">
                    <span className="text-indigo-700 dark:text-indigo-300 font-bold text-base bg-indigo-100 dark:bg-indigo-900/60 px-3 py-1 rounded-lg">
                      ₹{Number(totalDeduction).toLocaleString("en-IN")}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
