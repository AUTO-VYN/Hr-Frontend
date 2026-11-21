"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import ExcelImportTemplate, {
  ExcelDropzone,
} from "@/components/Templates/ExcelImportTemplate";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function showSideAlert(message: string, type: "success" | "error" | "warning" | "info") {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 4000,
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

export default function SalaryAttendanceDataImportPage() {
  const user: any = useCurrentUser();

  const [excelfile, setFile] = useState<File | null>(null);
  const [isLoadingonpage, setisLoadingonpage] = useState(false);
  const [hasImported, setHasImported] = useState(false);
  const [tabledata, setTabledata] = useState<any[]>([]);
  const [erroredData, setErroredData] = useState<any[]>([]);
  const [correctData, setCorrectData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"IMPORTED" | "NON_IMPORTED">("NON_IMPORTED");

  // In-progress calculation modal states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [processData, setProcessData] = useState<any>(null);

  // ----------------------------------------------------------------------
  // CHECK IF SALARY CALCULATION PROCESS IS ALREADY IN PROGRESS
  // ----------------------------------------------------------------------
  const fetchAlreadyProcessData = async () => {
    if (!user?.Comp_Code) return;
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmpMaster/alreadyProcessSalAttendeceData`,
        {},
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      const data = response.data;
      if (data?.modelVisible === true) {
        setProcessData(data);
        setIsModalVisible(true);
      } else {
        setIsModalVisible(false);
      }
    } catch (error) {
      console.error("Error checking in-progress salary calculation:", error);
    }
  };

  useEffect(() => {
    if (user?.Comp_Code) {
      fetchAlreadyProcessData();
    }
  }, [user?.Comp_Code]);

  // ----------------------------------------------------------------------
  // DOWNLOAD SAMPLE
  // ----------------------------------------------------------------------
  const handleDownloadSample = () => {
    try {
      window.location.href = `${process.env.NEXT_PUBLIC_URL}/EmpMaster/importformatminiforSalAttendeceData?compcode=${user?.Comp_Code}`;
    } catch (error) {
      console.error("Error occurred while making the download request:", error);
    }
  };

  // ----------------------------------------------------------------------
  // TABLE COLUMNS (11 COLUMNS)
  // ----------------------------------------------------------------------
  const columns = useMemo(
    () => [
      {
        Header: "Import Status",
        accessor: "rejectionReasons",
        minWidth: 200,
        Cell: ({ value }: any) =>
          value ? (
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              {value}
            </span>
          ) : (
            "—"
          ),
      },
      { Header: "Emp_Code", accessor: "EmpCode", minWidth: 130 },
      { Header: "Sal Mnth", accessor: "SalMnth", minWidth: 110 },
      { Header: "Month days", accessor: "Monthdays", minWidth: 120 },
      { Header: "Present Value", accessor: "presentvalue", minWidth: 130 },
      { Header: "Off Days", accessor: "Off_days", minWidth: 110 },
      { Header: "Holiday Value", accessor: "Holiday_Value", minWidth: 130 },
      { Header: "WO Value", accessor: "WO_Value", minWidth: 110 },
      { Header: "Absent Value", accessor: "ABSENTVALUE", minWidth: 120 },
      { Header: "Sal Year", accessor: "salyr", minWidth: 110 },
      { Header: "Leave Value", accessor: "LEAVEVALUE", minWidth: 120 },
    ],
    []
  );

  const columnsList = useMemo(() => columns.map((col) => col.Header), [columns]);

  // ----------------------------------------------------------------------
  // FILE UPLOAD & API CALL
  // ----------------------------------------------------------------------
  const handleImport = async () => {
    if (typeof user?.branch === "string") {
      showSideAlert("Cannot Import Data in MultiLocation", "info");
      return;
    }

    if (!excelfile) {
      showSideAlert("Please select an Excel file first", "warning");
      return;
    }

    try {
      setTabledata([]);
      setisLoadingonpage(true);

      const formData = new FormData();
      formData.append("excel", excelfile, excelfile.name);
      formData.append("user", user?.id || "");
      formData.append("branch", user?.branch || "");

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmpMaster/excelimportminiforSalAttendeceData`,
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
        const errored = response.data.ErroredData || [];
        const correct = response.data.CorrectData || [];

        setErroredData(errored);
        setCorrectData(correct);
        setHasImported(true);

        if (errored.length > 0) {
          setActiveTab("NON_IMPORTED");
          setTabledata(errored);
        } else {
          setActiveTab("IMPORTED");
          setTabledata(correct);
        }

        showSideAlert(response?.data?.Message || "File processed successfully", "success");
      }
    } catch (error: any) {
      showSideAlert(
        error?.response?.data?.Message || "Error! Invalid Format",
        "error"
      );
      console.error("Error uploading attendance file:", error);
    } finally {
      setisLoadingonpage(false);
    }
  };

  // ----------------------------------------------------------------------
  // TAB SWITCHING (IMPORTED vs NON-IMPORTED)
  // ----------------------------------------------------------------------
  const handleStatusTabChange = (tab: "IMPORTED" | "NON_IMPORTED" | "UPDATED") => {
    if (tab === "IMPORTED") {
      setActiveTab("IMPORTED");
      setTabledata(correctData);
    } else {
      setActiveTab("NON_IMPORTED");
      setTabledata(erroredData);
    }
  };

  // ----------------------------------------------------------------------
  // UPLOAD CARD CONTENT
  // ----------------------------------------------------------------------
  const uploadCardContent = (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] p-4 sm:p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] space-y-4">
      {/* Excel Dropzone */}
      <ExcelDropzone
        file={excelfile}
        onFileSelect={setFile}
        disabled={isLoadingonpage}
      />

      {/* Import Button */}
      <div className="flex items-center justify-between pt-1">
        <AButton
          type="button"
          onClick={handleImport}
          loading={isLoadingonpage}
          disabled={!excelfile || isLoadingonpage}
          className="rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white px-6 h-10 text-xs font-semibold shadow-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          Import
        </AButton>

        {excelfile && (
          <span className="text-[12px] text-slate-500 dark:text-slate-400">
            Selected: <span className="font-semibold text-slate-700 dark:text-slate-200">{excelfile.name}</span>
          </span>
        )}
      </div>
    </div>
  );

  return (
    <>
      <ExcelImportTemplate
        title="SALARY ATTENDENCE DATA Excel Import"
        subtitle="Import monthly employee attendance values, working days, and leave data using standard excel format."
        onDownloadSample={handleDownloadSample}
        isLoading={isLoadingonpage}
        uploadCard={uploadCardContent}
        columnsList={columnsList}
        showStatusCards={hasImported}
        importedCount={correctData.length}
        nonImportedCount={erroredData.length}
        activeStatusTab={activeTab}
        onStatusTabChange={handleStatusTabChange}
        columns={columns}
        data={hasImported ? tabledata : undefined}
      />

      {/* ============================================================== */}
      {/* SALARY CALCULATION IN PROGRESS BLOCKING MODAL */}
      {/* ============================================================== */}
      <Dialog
        open={isModalVisible}
        onOpenChange={(val) => {
          if (processData?.modelVisible) {
            setIsModalVisible(true); // Lock open when process is ongoing
          } else {
            setIsModalVisible(val);
          }
        }}
      >
        <DialogContent className="w-full max-w-4xl p-6 rounded-2xl bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Salary Calculation Process is Already In Progress
              </DialogTitle>
              <AButton
                type="button"
                variant="outline"
                size="md"
                onClick={() => window.history.back()}
                className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Back
              </AButton>
            </div>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Please wait until the background salary calculation is completed before uploading new attendance.
            </DialogDescription>
          </DialogHeader>

          {processData && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center gap-6 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-[13px]">
                <p>
                  <span className="text-slate-500 dark:text-slate-400">Total Pending Employees: </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{processData?.total_emp || 0}</span>
                </p>
                <p>
                  <span className="text-slate-500 dark:text-slate-400">Estimated Waiting Time: </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{processData?.estimated_time || "0 minutes"}</span>
                </p>
              </div>

              {processData.result && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[360px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5">Emp Code</th>
                        <th className="px-4 py-2.5">Month</th>
                        <th className="px-4 py-2.5">Year</th>
                        <th className="px-4 py-2.5">Imported On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {processData.result.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2.5 font-medium">{row.Emp_Code}</td>
                          <td className="px-4 py-2.5">{row.SalMnth}</td>
                          <td className="px-4 py-2.5">{row.SalYr}</td>
                          <td className="px-4 py-2.5 text-slate-500">
                            {row.Imported_On ? new Date(row.Imported_On).toUTCString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
