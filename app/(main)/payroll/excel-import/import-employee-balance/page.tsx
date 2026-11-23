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
    timer: 5000,
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

export default function EmployeeBalanceImportPage() {
  const user: any = useCurrentUser();

  const [excelfile, setFile] = useState<File | null>(null);
  const [tabledata, setTabledata] = useState<any[]>([]);
  const [erroredData, setErroredData] = useState<any[]>([]);
  const [correctData, setCorrectData] = useState<any[]>([]);
  const [isLoadingonpage, setisLoadingonpage] = useState(false);
  const [hasImported, setHasImported] = useState(false);
  const [activeTab, setActiveTab] = useState<"IMPORTED" | "NON_IMPORTED">("NON_IMPORTED");

  // ----------------------------------------------------------------------
  // DOWNLOAD SAMPLE
  // ----------------------------------------------------------------------
  const handleDownloadSample = async () => {
    try {
      window.location.href = `${process.env.NEXT_PUBLIC_URL}/EmpMaster/EmployeeBalanceFormat?compcode=${user?.Comp_Code}`;
    } catch (error) {
      console.error("Error downloading sample:", error);
    }
  };

  // ----------------------------------------------------------------------
  // TABLE COLUMNS (6 FIXED COLUMNS)
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
      { Header: "Employee Code", accessor: "EMPCODE", minWidth: 140 },
      { Header: "Location", accessor: "LOCATION_NAME", minWidth: 140 },
      { Header: "Opening Balance", accessor: "OPENING_BALANCE", minWidth: 140 },
      { Header: "Deductions", accessor: "DEDUCTIONS", minWidth: 140 },
      { Header: "Deduction Type", accessor: "DEDUCTION_TYPE_NAME", minWidth: 160 },
    ],
    []
  );

  const columnsList = useMemo(() => columns.map((col) => col.Header), [columns]);

  // ----------------------------------------------------------------------
  // UPLOAD FILE & EXECUTE IMPORT
  // ----------------------------------------------------------------------
  const handleImport = async () => {
    if (!excelfile) {
      showSideAlert("Please select an Excel file first", "warning");
      return;
    }

    try {
      setisLoadingonpage(true);

      const formData = new FormData();
      formData.append("excel", excelfile, excelfile.name);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmpMaster/EmployeeBalanceImport`,
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
        const errored = response.data?.ErroredData || [];
        const correct = response.data?.CorrectData || [];

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
        error?.response?.data?.Message || "Error Importing Data",
        "error"
      );
      console.error("Error importing balance file:", error);
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
      title="Employee Balance Excel Import"
      subtitle="Import employee opening balances, deductions, and deduction types from excel."
      onDownloadSample={handleDownloadSample}
      isLoading={isLoadingonpage}
      file={excelfile}
      onFileSelect={setFile}
      onImport={handleImport}
      isImportDisabled={!excelfile || isLoadingonpage}
      columnsList={columnsList}
      showStatusCards={hasImported}
      importedCount={correctData.length}
      nonImportedCount={erroredData.length}
      activeStatusTab={activeTab}
      onStatusTabChange={handleStatusTabChange}
      columns={columns}
      data={hasImported ? tabledata : undefined}
      tableProps={{
        excelname: "Employee Balance Data",
      }}
    />
  );
}
