"use client";

import React, { useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import AButton from "@/components/atoms/Button";
import ExcelImportTemplate, {
  ExcelDropzone,
} from "@/components/Templates/ExcelImportTemplate";

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

export default function ImportSalarySheetPage() {
  const user: any = useCurrentUser();

  const [excelfile, setFile] = useState<File | null>(null);
  const [isLoadingonpage, setisLoadingonpage] = useState(false);
  const [hasImported, setHasImported] = useState(false);
  const [tabledata, setTabledata] = useState<any[]>([]);
  const [erroredData, setErroredData] = useState<any[]>([]);
  const [correctData, setCorrectData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"IMPORTED" | "NON_IMPORTED">("IMPORTED");

  // ----------------------------------------------------------------------
  // DOWNLOAD SAMPLE
  // ----------------------------------------------------------------------
  const handleDownloadSample = () => {
    try {
      window.location.href = `${process.env.NEXT_PUBLIC_URL}/EmpMaster/importformatminiforSalarySheet?compcode=${user?.Comp_Code}`;
    } catch (error) {
      console.error("Error occurred while making the download request:", error);
    }
  };

  // ----------------------------------------------------------------------
  // TABLE COLUMNS (41 COLUMNS)
  // ----------------------------------------------------------------------
  const columns = useMemo(
    () => [
      {
        Header: "Import Status",
        accessor: "rejectionReasons",
        minWidth: 180,
        Cell: ({ value }: any) =>
          value ? (
            <span className="font-semibold text-rose-600 dark:text-rose-400">
              {value}
            </span>
          ) : (
            "—"
          ),
      },
      { Header: "Emp_Code", accessor: "Emp_Code", minWidth: 130 },
      { Header: "Month_days", accessor: "Monthdays", minWidth: 120 },
      { Header: "Present_days", accessor: "Present_days", minWidth: 120 },
      { Header: "Off_days", accessor: "Off_days", minWidth: 110 },
      { Header: "Holiday_Leaves", accessor: "Holiday_Leaves", minWidth: 130 },
      { Header: "Total_Days", accessor: "Total_Days", minWidth: 110 },
      { Header: "Gross", accessor: "Gross", minWidth: 120 },
      { Header: "Basic", accessor: "Basic", minWidth: 110 },
      { Header: "HRA", accessor: "HRA", minWidth: 110 },
      { Header: "Medical", accessor: "Medical", minWidth: 110 },
      { Header: "CONVEN", accessor: "CONVEN", minWidth: 110 },
      { Header: "Other", accessor: "Other", minWidth: 110 },
      { Header: "Total", accessor: "Total", minWidth: 110 },
      { Header: "Gross_Earn", accessor: "Gross_Earn", minWidth: 120 },
      { Header: "Basic_Earn", accessor: "Basic_Earn", minWidth: 110 },
      { Header: "HRA_Earn", accessor: "HRA_Earn", minWidth: 110 },
      { Header: "CONVEN_Earn", accessor: "CONVEN_Earn", minWidth: 120 },
      { Header: "Medical_Earn", accessor: "Medical_Earn", minWidth: 120 },
      { Header: "Other_Earn", accessor: "Other_Earn", minWidth: 110 },
      { Header: "Total_Earn", accessor: "Total_Earn", minWidth: 110 },
      { Header: "Arrear", accessor: "Arrear", minWidth: 110 },
      { Header: "DEDUCTION", accessor: "Deducation", minWidth: 120 },
      { Header: "Advance", accessor: "Advance", minWidth: 110 },
      { Header: "Final_Payment", accessor: "Final_Payment", minWidth: 130 },
      { Header: "Loc_Code", accessor: "Loc_Code", minWidth: 110 },
      { Header: "pf_employee", accessor: "pf_employee", minWidth: 120 },
      { Header: "esic_employee", accessor: "esic_employee", minWidth: 130 },
      { Header: "lwf_employee", accessor: "lwf_employee", minWidth: 130 },
      { Header: "pf_employer", accessor: "pf_employer", minWidth: 120 },
      { Header: "esic_employer", accessor: "esic_employer", minWidth: 130 },
      { Header: "lwf_employer", accessor: "lwf_employer", minWidth: 130 },
      { Header: "PROF_TAX", accessor: "PROF_TAX", minWidth: 120 },
      { Header: "TDS", accessor: "TDS", minWidth: 110 },
      { Header: "Penalty", accessor: "Penulty", minWidth: 110 },
      { Header: "Outstanding", accessor: "Outstanding", minWidth: 120 },
      { Header: "Loan", accessor: "Loan", minWidth: 110 },
      { Header: "Mob_ded", accessor: "Mob_ded", minWidth: 110 },
      { Header: "Sal_Unpaid", accessor: "Sal_Unpaid", minWidth: 110 },
      { Header: "SalMnth", accessor: "SalMnth", minWidth: 110 },
      { Header: "SalYear", accessor: "SalYear", minWidth: 110 },
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
        `${process.env.NEXT_PUBLIC_URL}/EmpMaster/excelimportminiforSalarySheet`,
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
        const correct = response.data.CorrectData || [];
        const errored = response.data.ErroredData || [];

        setCorrectData(correct);
        setErroredData(errored);
        setHasImported(true);

        if (errored.length > 0) {
          setActiveTab("NON_IMPORTED");
          setTabledata(errored);
        } else {
          setActiveTab("IMPORTED");
          setTabledata(correct);
        }

        showSideAlert(response?.data?.Message || "Salary sheet processed successfully", "success");
      }
    } catch (error: any) {
      showSideAlert(
        error?.response?.data?.Message || "Error! Invalid Format",
        "error"
      );
      console.error("Error uploading salary sheet:", error);
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
    <ExcelImportTemplate
      title="Employee Salary Sheet Excel Import"
      subtitle="Import complete monthly salary sheet records, earnings, deductions, and payouts using standard excel format."
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
  );
}
