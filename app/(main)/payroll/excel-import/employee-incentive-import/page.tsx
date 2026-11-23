"use client";

import React, { useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

import { useCurrentUser } from "@/app/hooks/use-current-user";
import ExcelImportTemplate from "@/components/Templates/ExcelImportTemplate";

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

interface EmployeeIncentiveImportPageProps {
  isDialogMode?: boolean;
}

export default function EmployeeIncentiveImportPage({
  isDialogMode = false,
}: EmployeeIncentiveImportPageProps) {
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
      window.location.href = `${process.env.NEXT_PUBLIC_URL}/EmpMaster/importformatminiforEmpInctive?compcode=${user?.Comp_Code}`;
    } catch (error) {
      console.error("Error occurred while making the download request:", error);
    }
  };

  // ----------------------------------------------------------------------
  // TABLE COLUMNS (9 COLUMNS)
  // ----------------------------------------------------------------------
  const columns = useMemo(
    () => [
      {
        Header: "Import Status",
        accessor: "Rejection Reasons",
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
      { Header: "Emp_Code", accessor: "Emp_Id", minWidth: 120 },
      { Header: "Emp_Name", accessor: "Emp_Name", minWidth: 160 },
      { Header: "Paid_Month", accessor: "Mnth", minWidth: 110 },
      { Header: "Incentive_Year", accessor: "Yr", minWidth: 120 },
      {
        Header: "Paid_Date",
        accessor: "Rec_Date",
        minWidth: 120,
        Cell: ({ value }: any) => {
          if (!value) return "—";
          const dateObj = new Date(value);
          if (isNaN(dateObj.getTime())) return "—";
          const day = String(dateObj.getDate()).padStart(2, "0");
          const month = String(dateObj.getMonth() + 1).padStart(2, "0");
          const year = dateObj.getFullYear();
          return `${day}-${month}-${year}`;
        },
      },
      { Header: "Gross_Incentive", accessor: "INCENTIVE_AMT", minWidth: 130 },
      { Header: "ESIC_DEDUCTION", accessor: "DEDUCTION", minWidth: 130 },
      { Header: "Net_Amt", accessor: "INCENTIVE_AMT1", minWidth: 110 },
    ],
    []
  );

  const columnsList = useMemo(() => columns.map((col) => col.Header), [columns]);

  // ----------------------------------------------------------------------
  // FILE UPLOAD & IMPORT FLOW
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
      setisLoadingonpage(true);

      const formData = new FormData();
      formData.append("excel", excelfile, excelfile.name);
      formData.append("user", user?.name || "");
      formData.append("branch", user?.branch || "");

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmpMaster/excelimportminiforEmpInctive`,
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

        showSideAlert(
          response?.data?.Message || "Incentive data processed successfully",
          "success"
        );
      }
    } catch (error: any) {
      console.error("Error uploading incentive file:", error);
      showSideAlert(
        error?.response?.data?.Message || "Error! Invalid Format",
        "error"
      );
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

  return (
    <ExcelImportTemplate
      title="Employee Incentive Excel Import"
      subtitle="Import monthly employee incentive payouts, ESIC deductions, and net amounts using standard excel format."
      onDownloadSample={handleDownloadSample}
      hideBack={isDialogMode}
      isLoading={isLoadingonpage}
      file={excelfile}
      onFileSelect={setFile}
      onImport={handleImport}
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
