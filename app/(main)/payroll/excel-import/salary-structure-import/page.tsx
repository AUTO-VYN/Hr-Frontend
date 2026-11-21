"use client";

import React, { useEffect, useMemo, useState } from "react";
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

interface SalaryStructureImportPageProps {
  isDialogMode?: boolean;
}

export default function SalaryStructureImportPage({
  isDialogMode = false,
}: SalaryStructureImportPageProps) {
  const user: any = useCurrentUser();

  const [excelfile, setFile] = useState<File | null>(null);
  const [isLoadingonpage, setisLoadingonpage] = useState(false);
  const [hasImported, setHasImported] = useState(false);
  const [tabledata, setTabledata] = useState<any[]>([]);
  const [erroredData, setErroredData] = useState<any[]>([]);
  const [correctData, setCorrectData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"IMPORTED" | "NON_IMPORTED">("NON_IMPORTED");

  // Dynamic column configuration states
  const [GratuityCompKeyData, setGratuityCompKeyData] = useState(false);
  const [DalyWagescompKeyData, setDalyWagescompKeyData] = useState(false);
  const [OnlyBonusCompKeyData, setOnlyBonusCompKeyData] = useState(false);
  const [OnlyPFAmountCompKeyData, setOnlyPFAmountCompKeyData] = useState(false);

  // ----------------------------------------------------------------------
  // CHECK COMPANY SALARY CONFIGURATION (DAILY WAGES, GRATUITY, ETC.)
  // ----------------------------------------------------------------------
  const isDailyWages = async () => {
    if (!user?.Comp_Code) return;
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/isDailyWages`,
        {},
        {
          headers: {
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      if (res.data?.success) {
        setDalyWagescompKeyData(res.data.data?.is_Daily_Wages == 1);
        setGratuityCompKeyData(res.data.data?.Gratuity == 1);
        setOnlyBonusCompKeyData(res.data.data?.Is_Add_Emp_Bonus == 1);
        setOnlyPFAmountCompKeyData(res.data.data?.PF_Amount == 1);
      } else {
        setDalyWagescompKeyData(false);
        setGratuityCompKeyData(false);
        setOnlyBonusCompKeyData(false);
        setOnlyPFAmountCompKeyData(false);
      }
    } catch (err) {
      setDalyWagescompKeyData(false);
      setGratuityCompKeyData(false);
      setOnlyBonusCompKeyData(false);
      setOnlyPFAmountCompKeyData(false);
    }
  };

  useEffect(() => {
    if (user?.Comp_Code) {
      isDailyWages();
    }
  }, [user?.Comp_Code]);

  // ----------------------------------------------------------------------
  // DOWNLOAD SAMPLE
  // ----------------------------------------------------------------------
  const handleDownloadSample = () => {
    try {
      window.location.href = `${process.env.NEXT_PUBLIC_URL}/employee/importformatsalary?compcode=${user?.Comp_Code}`;
    } catch (error) {
      console.error("Error occurred while making the download request:", error);
    }
  };

  // ----------------------------------------------------------------------
  // DYNAMIC COLUMNS DEFINITION
  // ----------------------------------------------------------------------
  const columns = useMemo(
    () => [
      {
        Header: "Rejection Reasons",
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
      { Header: "Emp Code", accessor: "EmpCode", minWidth: 130 },
      { Header: "Gross Salary", accessor: "GrossSalary", minWidth: 140 },
      { Header: "Basic", accessor: "Basic", minWidth: 120 },
      { Header: "HRA", accessor: "HRA", minWidth: 120 },
      { Header: "Conveyance", accessor: "Conveyance", minWidth: 130 },
      { Header: "Medical", accessor: "Medical", minWidth: 120 },
      { Header: "Other", accessor: "Other", minWidth: 120 },
      { Header: "Uniform", accessor: "Uniform", minWidth: 120 },
      { Header: "Washing", accessor: "Washing", minWidth: 120 },
      ...(GratuityCompKeyData
        ? [
            { Header: "Gratuity", accessor: "Gratuity", minWidth: 120 },
            { Header: "Bonus", accessor: "Bonus", minWidth: 120 },
          ]
        : []),
      ...(DalyWagescompKeyData
        ? [{ Header: "Daily Wages", accessor: "Daily_Wages", minWidth: 130 }]
        : []),
      { Header: "Effective Date", accessor: "Effective_date", minWidth: 140 },
      ...(OnlyBonusCompKeyData
        ? [{ Header: "Bonus", accessor: "Bonus_Amount", minWidth: 120 }]
        : []),
      ...(OnlyPFAmountCompKeyData
        ? [{ Header: "PF Amount", accessor: "PF_Amount", minWidth: 130 }]
        : []),
    ],
    [
      GratuityCompKeyData,
      DalyWagescompKeyData,
      OnlyBonusCompKeyData,
      OnlyPFAmountCompKeyData,
    ]
  );

  const columnsList = useMemo(() => columns.map((col) => col.Header), [columns]);

  // ----------------------------------------------------------------------
  // FILE UPLOAD & API CALL
  // ----------------------------------------------------------------------
  const handleImport = async () => {
    if (!excelfile) {
      showSideAlert("Please select an Excel file first", "warning");
      return;
    }

    try {
      setTabledata([]);
      setisLoadingonpage(true);

      const formData = new FormData();
      formData.append("excel", excelfile, excelfile.name);
      formData.append("Created_By", user?.id || "");

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/salaryImport`,
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

        showSideAlert(response?.data?.Message || "File uploaded successfully", "success");
      }
    } catch (error: any) {
      showSideAlert(
        error?.response?.data?.Message || "Error! Invalid Format",
        "error"
      );
      console.error("Error uploading salary file:", error);
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
      title="Salary Structure Excel Import"
      subtitle="Import employee salary structures and allowances using standard excel template."
      onDownloadSample={handleDownloadSample}
      hideBack={isDialogMode}
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
