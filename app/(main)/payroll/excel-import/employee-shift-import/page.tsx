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

export default function EmployeeShiftImportPage() {
  const user: any = useCurrentUser();

  const [excelfile, setFile] = useState<File | null>(null);
  const [isLoadingonpage, setisLoadingonpage] = useState(false);
  const [hasImported, setHasImported] = useState(false);
  const [tabledata, setTabledata] = useState<any[]>([]);
  const [erroredData, setErroredData] = useState<any[]>([]);
  const [correctData, setCorrectData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"IMPORTED" | "NON_IMPORTED">("NON_IMPORTED");

  // ----------------------------------------------------------------------
  // DOWNLOAD SAMPLE
  // ----------------------------------------------------------------------
  const handleDownloadSample = () => {
    try {
      window.location.href = `${process.env.NEXT_PUBLIC_URL}/EmpMaster/importformatmini?compcode=${user?.Comp_Code}`;
    } catch (error) {
      console.error("Error occurred while making the download request:", error);
    }
  };

  // ----------------------------------------------------------------------
  // TABLE COLUMNS
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
      { Header: "Emp Code", accessor: "Empcode", minWidth: 130 },
      {
        Header: "Date From",
        accessor: "DateFrom",
        minWidth: 130,
        Cell: ({ value }: any) => {
          if (!value) return "—";
          const dateObj = new Date(value);
          if (isNaN(dateObj.getTime())) return String(value);

          const day = String(dateObj.getDate()).padStart(2, "0");
          const month = String(dateObj.getMonth() + 1).padStart(2, "0");
          const year = dateObj.getFullYear();

          return `${day}-${month}-${year}`;
        },
      },
      {
        Header: "Date To",
        accessor: "DateTo",
        minWidth: 130,
        Cell: ({ value }: any) => {
          if (!value) return "—";
          const dateObj = new Date(value);
          if (isNaN(dateObj.getTime())) return String(value);

          const day = String(dateObj.getDate()).padStart(2, "0");
          const month = String(dateObj.getMonth() + 1).padStart(2, "0");
          const year = dateObj.getFullYear();

          return `${day}-${month}-${year}`;
        },
      },
      { Header: "Start Time", accessor: "Start_Time", minWidth: 130 },
      { Header: "End Time", accessor: "End_Time", minWidth: 130 },
      { Header: "Weekly Off", accessor: "Weekly_Off", minWidth: 130 },
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
        `${process.env.NEXT_PUBLIC_URL}/EmpMaster/excelimportmini`,
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
      console.error("Error uploading shift file:", error);
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
      title="Shift Excel Import"
      subtitle="Import employee shift schedules, timings, and weekly offs using standard excel template."
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
