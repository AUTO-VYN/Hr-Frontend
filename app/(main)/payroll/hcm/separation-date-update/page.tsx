"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import {
  AlertTriangle,
  Search,
  FileSpreadsheet,
  Save,
  ShieldCheck,
  Lock,
  KeyRound,
  UserRound,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";


// Atoms and template components as requested
import AButton from "@/components/atoms/Button";
import DocumentFileUpload from "@/components/atoms/Documentupload";
import Einput from "@/components/atoms/Einput";
import CustomInputWithDatalist from "@/components/atoms/selectsearch";
import ServiceTablePagination from "@/components/Templates/reacttable";
import HashloaderComponent from "@/components/Templates/hashloader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const cardClass =
  "min-w-0 rounded-[12px] border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_26px_-14px_rgba(15,23,42,0.14)] transition-colors dark:border-[#1F2937] dark:bg-[#111827] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),0_10px_26px_-14px_rgba(0,0,0,0.6)]";

const inputClass =
  "!h-[38px] w-full min-w-0 !rounded-[9px] !border border-[#E2E8F0] dark:!border-[#1F2937] !bg-white dark:!bg-[#0E1524] px-2.5 py-2 !text-[12.5px] !text-[#1E293B] dark:!text-[#E7ECF3] outline-none transition placeholder:text-[#64748B]/70 dark:placeholder:text-[#94A3B8]/70 focus-visible:!border-[#4F46E5] dark:focus-visible:!border-[#8B84FF] focus-visible:!ring-0 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-800/50 !shadow-none";

export default function EmpLocTranshfr() {
  const user = useCurrentUser();

  const [table, setTable] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<any[]>([]);
  const [department, setDepartment] = useState<any[]>([]);
  const [Designation, setDesignation] = useState<any[]>([]);
  const [EmpCode, setEmpCode] = useState<any[]>([]);

  const [Formdata, setFormData] = useState({
    Laft_Date: "",
    EmpCode: "",
    EmpName: "",
    Location: "",
    department: "",
    Designation: "",
    Reason: "Resignation",
    OTP: null as any,
    CreatedBy: user?.name,
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [falg, setFalg] = useState(false);
  const [otp, setOtp] = useState<string | null>("");
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [Error, setError] = useState("");
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null);
  const [excelfile, setFile] = useState<File | null>(null);

  const formatDate = (date: any) => {
    if (!date) return "—";
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (date: any) => {
    if (!date) return "—";
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    const dateStr = d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const timeStr = d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${dateStr}, ${timeStr}`;
  };

  function showSideAlert(message: string, type: "success" | "warning" | "error" | "info") {
    const Toast = Swal.mixin({
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      customClass: {
        container: "side-alert-container",
        popup: `side-alert-${type}`,
        title: "side-alert-title",
        icon: "side-alert-icon",
      },
    });

    Toast.fire({
      icon: type,
      title: message,
    });
  }

  useEffect(() => {
    fetchData();
  }, [user?.Comp_Code, user?.name]);

  const fetchData = async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/all`,
        {},
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );
      setEmpCode(response.data?.data || []);

      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/masters`,
        {},
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );
      setLocation(result.data?.data?.LOCATION || []);
      setDepartment(result.data?.data?.DIVISION || []);
      setDesignation(result.data?.data?.EMPLOYEEDESIGNATION || []);
    } catch (err) {
      console.error("Error fetching initial master data:", err);
    }
  };

  const handleInputChange = (name: string, value: any) => {
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const ShowData = async () => {
    if (!Formdata?.EmpCode) {
      showSideAlert("Please Fill Employee Code", "warning");
      return;
    }
    setIsLoading(true);
    try {
      const result = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/GetEmployeeLocation`,
        {
          empCode: Formdata?.EmpCode,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );
      const employeeData = result?.data?.result1;
      setTable(result?.data?.result4 || []);

      if (!employeeData) {
        Swal.fire({
          icon: "info",
          title: "Information",
          text: "Employee Code does not match.",
        });
        setFormData({
          Laft_Date: "",
          EmpCode: "",
          EmpName: "",
          Location: "",
          department: "",
          Designation: "",
          Reason: "",
          OTP: null,
          CreatedBy: user?.name,
        });
        return;
      }

      const formattedLeftDate = employeeData.LASTWOR_DATE
        ? new Date(employeeData.LASTWOR_DATE).toISOString().split("T")[0]
        : "";

      setFormData((prev) => ({
        ...prev,
        EmpName: employeeData.FullName || "",
        Location: employeeData.LOCATION || "",
        department: employeeData.DIVISION || "",
        Designation: employeeData.EMPLOYEEDESIGNATION || "",
        Laft_Date: formattedLeftDate,
      }));

      showSideAlert("Fetch completed successfully.", "success");
    } catch (error) {
      console.error("Error fetching employee details:", error);
      showSideAlert("An error occurred while fetching data.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const DataSave = async () => {
    if (!Formdata?.EmpCode) {
      showSideAlert("Please Fill Employee Code", "warning");
      return;
    }

    if (!Formdata?.EmpName) {
      showSideAlert("Please Fill Employee Name", "warning");
      return;
    }

    if (!Formdata?.Laft_Date) {
      showSideAlert("Please Fill Left Date", "warning");
      return;
    }

    setIsLoading(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/SeparationSave`,
        {
          Formdata,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Employee Saved successfully.",
      });

      // Refresh records after saving
      if (Formdata.EmpCode) {
        try {
          const result = await axios.post(
            `${process.env.NEXT_PUBLIC_URL}/employee/GetEmployeeLocation`,
            { empCode: Formdata?.EmpCode },
            {
              headers: {
                compcode: user?.Comp_Code,
                name: user?.name,
              },
            }
          );
          setTable(result?.data?.result4 || []);
        } catch (e) {
          console.error("Error refreshing separation list:", e);
        }
      }

      setFormData({
        Laft_Date: "",
        EmpCode: "",
        EmpName: "",
        Location: "",
        department: "",
        Designation: "",
        Reason: "",
        OTP: null,
        CreatedBy: user?.name,
      });
      setFalg(false);
    } catch (error) {
      console.error("Error saving separation data:", error);
      showSideAlert("An error occurred while saving.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const SendOtp = async () => {
    if (!Formdata?.EmpCode) {
      showSideAlert("Please Fill Employee Code And Click To Get Details Button", "warning");
      return;
    }
    setIsDialogOpen(true);
    setTimeRemaining(60);
    setError("");

    if (timerId) {
      clearInterval(timerId);
    }

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/sendOtp`,
        {
          Formdata,
          empcode: user?.EMPCODE,
        },
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      if (response.data.Status === "false") {
        setIsDialogOpen(false);
        Swal.fire({
          icon: "warning",
          title: "Warning!",
          text: `${response.data.Message}`,
        });
      } else {
        setOtp(response.data.Otp);
        const tId = setInterval(() => {
          setTimeRemaining((prev) => {
            if (prev <= 1) {
              clearInterval(tId);
              setOtp(null);
              setError("OTP has expired. Please request a new OTP.");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        setTimerId(tId);
      }
    } catch (error: any) {
      console.log("Error sending OTP:", error.response?.data || error.message);
      showSideAlert("Error sending OTP", "error");
    }
  };

  const disebal = () => {
    if (Formdata?.OTP != otp) {
      setFalg(false);
      showSideAlert("Wrong OTP Typed", "info");
      return;
    } else {
      setFalg(true);
      setIsDialogOpen(false);
      setFormData((prevData) => ({
        ...prevData,
        OTP: "",
      }));
      showSideAlert("OTP verified successfully! You can now save.", "success");
    }
  };

  const handleButtonClick = async () => {
    if (!excelfile) {
      showSideAlert("Please select an Excel file first.", "warning");
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append("excel", excelfile, excelfile.name);
      formData.append("user", user?.name || "");
      formData.append("branch", user?.branch || "");

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/excelimportSep`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      if (response.status === 200) {
        showSideAlert(response.data.Message || "Imported successfully.", "success");
        setFile(null);
      } else {
        showSideAlert(response.data.Message || "Import failed.", "warning");
      }
    } catch (error: any) {
      showSideAlert(
        error?.response?.data?.Message || "Error! Invalid Format",
        "error"
      );
      console.error("Error uploading file:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSample = async () => {
    try {
      setIsLoading(true);
      const baseUrl =
        process.env.NEXT_PUBLIC_URL ||
        process.env.NEXT_PUBLIC_URL_LIVE ||
        "http://localhost:5000";

      const response = await axios.post(
        `${baseUrl}/employee/downloadSeparationSample`,
        {},
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
          responseType: "blob",
        }
      );

      // Check if response is error (HTML / JSON) instead of actual excel binary
      if (
        response.data.type?.includes("html") ||
        response.data.type?.includes("json") ||
        response.data.type?.includes("text")
      ) {
        const text = await response.data.text();
        try {
          const json = JSON.parse(text);
          showSideAlert(json.Message || json.Error || "Failed to download sample file.", "error");
        } catch {
          showSideAlert("Failed to download sample file from server.", "error");
        }
        return;
      }

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Separation_Sample.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSideAlert("Sample file downloaded successfully.", "success");
    } catch (error: any) {
      console.error("Error downloading sample file:", error);
      showSideAlert("Failed to download sample file.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const exportTableData = () => {
    if (!table.length) {
      showSideAlert("No records available to export.", "info");
      return;
    }
    const headers = [
      "SR NO",
      "EMP CODE",
      "EMPLOYEE NAME",
      "LEFT DATE",
      "REASON",
      "CREATED AT",
      "STATUS",
    ];
    const escapeCsv = (val: any) => `"${String(val ?? "").replace(/"/g, '""')}"`;
    const rows = table.map((row: any, idx: number) => [
      idx + 1,
      row.EmpCode || row.EMPCODE || "",
      row.Emp_Name || row.EmpName || row.FullName || "",
      formatDate(row.Laft_Date || row.Left_Date || row.LASTWOR_DATE),
      row.Reason || row.reason || row.SepReason || "Resignation",
      formatDateTime(row.CreatedAt || row.Created_At),
      row.Status || row.status || (row.IsSettled ? "Settled" : "F&F pending"),
    ]);
    const csv = [headers, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Separations_Recorded_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleRowDoubleClick = (rowData: any) => {
    console.log(rowData, "rowData");
  };

  const columns = useMemo(
    () => [
      {
        Header: "SR NO",
        id: "sr_no",
        Cell: ({ row }: any) => (
          <span className="text-slate-600 dark:text-slate-400 font-medium text-[12.5px]">
            {row.index + 1}
          </span>
        ),
      },
      {
        Header: "EMP CODE",
        accessor: (row: any) => row.EmpCode || row.EMPCODE || "—",
        id: "EmpCode",
        Cell: ({ value }: any) => (
          <span className="font-medium text-slate-800 dark:text-slate-200 text-[12.5px]">
            {value}
          </span>
        ),
      },
      {
        Header: "EMPLOYEE NAME",
        accessor: (row: any) => row.Emp_Name || row.EmpName || row.FullName || "—",
        id: "Emp_Name",
        Cell: ({ value }: any) => (
          <span className="font-semibold text-slate-900 dark:text-white text-[12.5px]">
            {value}
          </span>
        ),
      },
      {
        Header: "LEFT DATE",
        accessor: (row: any) => row.Laft_Date || row.Left_Date || row.LASTWOR_DATE || "—",
        id: "Laft_Date",
        Cell: ({ value }: any) => (
          <span className="text-slate-700 dark:text-slate-300 text-[12.5px]">
            {formatDate(value)}
          </span>
        ),
      },
      {
        Header: "REASON",
        accessor: (row: any) => row.Reason || row.reason || row.SepReason || "—",
        id: "Reason",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-300 text-[12.5px]">
            {value || "—"}
          </span>
        ),
      },
      {
        Header: "CREATED AT",
        accessor: (row: any) => row.CreatedAt || row.Created_At || "—",
        id: "CreatedAt",
        Cell: ({ value }: any) => (
          <span className="text-slate-600 dark:text-slate-400 text-[12px]">
            {formatDateTime(value)}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-24 font-['Inter',system-ui,sans-serif] text-[13px] text-[#1E293B] antialiased transition-colors dark:bg-[#0A0F1C] dark:text-[#E7ECF3]">
      <div className="mx-auto max-w-[1700px] p-4 sm:p-6 space-y-4">
        {/* Page Heading */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-[650] tracking-[-0.02em] text-[#1E293B] dark:text-[#E7ECF3]">
              Separation date update
            </h1>
            <p className="mt-1 text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
              Set the last working date for a leaver. This locks attendance and payroll beyond that date, so it needs an OTP.
            </p>
          </div>
        </header>

        {/* Warning Banner */}
        <div className="rounded-[12px] border border-rose-200/80 bg-[#FFF5F5] p-3.5 px-4 text-rose-900 transition-colors dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200 flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <p className="text-[12.5px] leading-relaxed">
            Setting a left date is irreversible from this screen. Attendance, leave accrual and salary stop the day after the date you enter — reversal needs a request to the payroll admin.
          </p>
        </div>

        {/* Card 1: Single employee */}
        <section className={`${cardClass} p-4 sm:p-[18px]`}>
          {/* Section Header */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF]">
                <UserRound className="h-4 w-4" />
              </span>
              <h2 className="text-[14px] font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                Single employee
              </h2>
            </div>
            <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
              Enter a code and fetch to load master details
            </span>
          </div>

          {/* Form Fields: Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
            {/* EMPLOYEE CODE + GET DETAILS BUTTON */}
            <div className="col-span-12 md:col-span-5 flex items-end gap-2">
              <div className="flex-1 min-w-0">
                <CustomInputWithDatalist
                  idPrefix="EmpCode"
                  name="EmpCode"
                  title="EMPLOYEE CODE"
                  ShortName={true}
                  redlabel=" *"
                  placeholder="Enter employee code"
                  options={EmpCode}
                  selectedValue={Formdata?.EmpCode}
                  handleInputChange={handleInputChange}
                  disabled={falg}
                  className={cn(
                    inputClass,
                    !Formdata?.EmpCode && "!border-[rgba(225,29,72,0.45)]"
                  )}
                />
              </div>
              <AButton
                type="button"
                onClick={ShowData}
                disabled={isLoading || !Formdata?.EmpCode || falg}
                icon={<Search className="w-3.5 h-3.5" />}
                className="!h-[38px] px-4 shrink-0 !rounded-[9px] !bg-[#059669] hover:!bg-[#047857] text-white font-medium text-[12.5px] cursor-pointer shadow-sm active:scale-[0.98] disabled:!bg-slate-300 dark:disabled:!bg-slate-800"
              >
                Get details
              </AButton>
            </div>

            {/* EMPLOYEE NAME */}
            <div className="col-span-12 md:col-span-4">
              <Einput
                title="EMPLOYEE NAME"
                ShortName={true}
                name="EmpName"
                type="text"
                value={Formdata?.EmpName}
                placeholder="Loads after fetch"
                handleInputChange={handleInputChange}
                readOnly
                disabled
                className={inputClass}
              />
            </div>

            {/* LOCATION */}
            <div className="col-span-12 md:col-span-3">
              <Einput
                title="LOCATION"
                ShortName={true}
                name="Location"
                type="text"
                value={Formdata?.Location}
                placeholder="—"
                handleInputChange={handleInputChange}
                readOnly
                disabled
                className={inputClass}
              />
            </div>
          </div>

          {/* Form Fields: Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 mt-3.5">
            {/* DEPARTMENT */}
            <div className="col-span-12 md:col-span-3">
              <Einput
                title="DEPARTMENT"
                ShortName={true}
                name="department"
                type="text"
                value={Formdata?.department}
                placeholder="—"
                handleInputChange={handleInputChange}
                readOnly
                disabled
                className={inputClass}
              />
            </div>

            {/* DESIGNATION */}
            <div className="col-span-12 md:col-span-3">
              <Einput
                title="DESIGNATION"
                ShortName={true}
                name="Designation"
                type="text"
                value={Formdata?.Designation}
                placeholder="—"
                handleInputChange={handleInputChange}
                readOnly
                disabled
                className={inputClass}
              />
            </div>

            {/* LEFT DATE */}
            <div className="col-span-12 md:col-span-3">
              <Einput
                title="LEFT DATE"
                ShortName={true}
                redlabel=" *"
                name="Laft_Date"
                type="date"
                value={Formdata?.Laft_Date}
                handleInputChange={handleInputChange}
                disabled={falg}
                className={cn(
                  inputClass,
                  !Formdata?.Laft_Date && "!border-[rgba(225,29,72,0.45)]"
                )}
              />
            </div>

            {/* SEPARATION REASON */}
            <div className="col-span-12 md:col-span-3">
              <Einput
                title="SEPARATION REASON"
                ShortName={true}
                name="Reason"
                type="text"
                value={Formdata?.Reason}
                placeholder="Resignation"
                handleInputChange={handleInputChange}
                disabled={falg}
                className={inputClass}
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-5 pt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-[12.5px] text-[#64748B] dark:text-[#94A3B8]">
              {falg ? (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <ShieldCheck className="h-4 w-4" />
                  OTP verified · Saving unlocked
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                  Verify with OTP to unlock saving
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <AButton
                type="button"
                variant="outline"
                size="sm"
                onClick={SendOtp}
                disabled={isLoading || !Formdata?.EmpCode}
                className="!h-[36px] px-4 !rounded-[9px] text-[12.5px] font-medium"
              >
                Send OTP
              </AButton>

              <AButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={DataSave}
                disabled={!falg || isLoading}
                icon={<Save className="h-4 w-4" />}
                className="!h-[36px] px-4 !rounded-[9px] text-[12.5px] font-medium !bg-[#334155] hover:!bg-[#1E293B] dark:!bg-slate-700 dark:hover:!bg-slate-600 text-white cursor-pointer shadow-sm active:scale-[0.98]"
              >
                Save left date
              </AButton>
            </div>
          </div>
        </section>

        {/* Card 2: Bulk update from Excel */}
        <section className={`${cardClass} p-4 sm:p-[16px_18px]`}>
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-[26px] w-[26px] items-center justify-center rounded-[8px] bg-[#EEF2FF] text-[#4F46E5] dark:bg-[#1E1B4B] dark:text-[#8B84FF]">
                <FileSpreadsheet className="h-4 w-4" />
              </span>
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-[13.5px] font-semibold text-[#1E293B] dark:text-[#E7ECF3]">
                  Bulk update from Excel
                </h2>
                <span className="text-[11.5px] text-[#64748B] dark:text-[#94A3B8]">
                  Columns: employee code, left date, reason
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <DocumentFileUpload
                file={excelfile}
                onChange={(file) => setFile(file)}
                accept=".xlsx, .xls, .csv"
                placeholder="Choose the separation Excel file (.xlsx or .csv · employee code, left date, reason)"
                disabled={falg || isLoading}
                height={40}
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <AButton
                type="button"
                variant="outline"
                onClick={downloadSample}
                disabled={isLoading}
                icon={<Download className="h-4 w-4 text-[#4F46E5] dark:text-[#8B84FF]" />}
                className="!h-[40px] px-3.5 !rounded-[9px] text-[12.5px] font-medium cursor-pointer"
              >
                Download Sample
              </AButton>

              <AButton
                type="button"
                variant="secondary"
                onClick={handleButtonClick}
                disabled={!excelfile || isLoading || falg}
                className="!h-[40px] px-5 !rounded-[9px] text-[12.5px] font-semibold !bg-[#334155] hover:!bg-[#1E293B] dark:!bg-slate-700 dark:hover:!bg-slate-600 text-white cursor-pointer shadow-sm active:scale-[0.98]"
              >
                Import
              </AButton>
            </div>
          </div>
        </section>

        {/* Card 3: Separations recorded */}
        <section className={`${cardClass} overflow-hidden`}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8F0] dark:border-[#1F2937]">
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-bold text-[#1E293B] dark:text-[#E7ECF3]">
                Separations recorded
              </h2>
              <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8]">
                {table?.length || 0} {table?.length === 1 ? "employee" : "employees"}
              </span>
            </div>

            <AButton
              type="button"
              variant="outline"
              size="sm"
              onClick={exportTableData}
              disabled={!table?.length}
              icon={<FileSpreadsheet className="h-4 w-4" />}
              className="!h-[34px] px-3.5 !rounded-[8px] text-[12px] font-medium"
            >
              Export
            </AButton>
          </div>

          <div className="w-full overflow-x-auto">
            <ServiceTablePagination
              columns={columns}
              data={table}
              onRowDoubleClick={handleRowDoubleClick}
              showExcelExport={false}
              height={480}
              initialPageSize={10}
              containerClassName="w-full !rounded-none !border-0 shadow-none"
            />
          </div>
        </section>
      </div>

      {/* OTP Verification Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[460px] !rounded-[16px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] p-6 !shadow-none">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="flex items-center gap-2 text-[17px] font-bold text-slate-900 dark:text-slate-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <KeyRound className="h-4 w-4" />
              </span>
              Verify with OTP
            </DialogTitle>
            <DialogDescription className="text-[12.5px] text-slate-500 dark:text-slate-400">
              Please enter the OTP sent to your registered contact to unlock saving the separation date.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2.5 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[12px] text-slate-600 dark:text-slate-300">
                {Error ? (
                  <span className="text-red-500 font-medium">{Error}</span>
                ) : (
                  "OTP expires in:"
                )}
              </span>
              <span className="font-mono text-[13px] font-bold text-indigo-600 dark:text-indigo-400">
                {Math.floor(timeRemaining / 60)}:
                {("0" + (timeRemaining % 60)).slice(-2)}
              </span>
            </div>

            <div>
              <Einput
                title="ENTER OTP"
                ShortName={true}
                type="text"
                name="OTP"
                value={Formdata?.OTP}
                placeholder="Enter 6-digit OTP"
                handleInputChange={handleInputChange}
                className={inputClass}
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <AButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsDialogOpen(false)}
                className="!h-[36px] px-3.5 text-[12.5px]"
              >
                Cancel
              </AButton>

              {timeRemaining === 0 && (
                <AButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={SendOtp}
                  className="!h-[36px] px-3.5 text-[12.5px]"
                >
                  Resend OTP
                </AButton>
              )}

              <AButton
                type="button"
                variant="primary"
                size="sm"
                onClick={disebal}
                className="!h-[36px] px-5 text-[12.5px] font-semibold"
              >
                Submit
              </AButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <HashloaderComponent isLoading={isLoading} />
    </main>
  );
}
