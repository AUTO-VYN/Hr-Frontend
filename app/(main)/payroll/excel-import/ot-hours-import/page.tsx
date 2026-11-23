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

export default function OTHoursImportPage() {
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
      window.location.href = `${process.env.NEXT_PUBLIC_URL}/EmpMaster/importformat?compcode=${user?.Comp_Code}`;
    } catch (error) {
      console.error("Error occurred while making the download request:", error);
    }
  };

  // ----------------------------------------------------------------------
  // TABLE COLUMNS (5 FIXED COLUMNS)
  // ----------------------------------------------------------------------
  const columns = useMemo(
    () => [
      { Header: "Employee Code", accessor: "EMP_CODE", minWidth: 140 },
      { Header: "Month", accessor: "SALMNTH", minWidth: 120 },
      { Header: "Year", accessor: "SALYR", minWidth: 120 },
      { Header: "OT Hours", accessor: "OT_HRS", minWidth: 130 },
      {
        Header: "Reason",
        accessor: "RejectionReason",
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
    ],
    []
  );

  const columnsList = useMemo(() => columns.map((col) => col.Header), [columns]);

  // ----------------------------------------------------------------------
  // UPLOAD FILE & EXECUTE IMPORT
  // ----------------------------------------------------------------------
  const handleButtonClick = async () => {
    if (!excelfile) {
      showSideAlert("Please select an Excel file first", "warning");
      return;
    }

    try {
      setTabledata([]);
      setisLoadingonpage(true);

      const formData = new FormData();
      formData.append("excel", excelfile, excelfile.name);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmpMaster/importOTEarnExcel`,
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
        const result = response.data;

        const errorRows = (result.ErrorData || []).map((item: any) => ({
          EMP_CODE: item.EMP_CODE,
          SALMNTH: item.MONTH,
          SALYR: item.YEAR,
          OT_HRS: item["OT HRS"],
          RejectionReason: item.RejectionReason,
        }));

        const correctRows = result.CorrectData || [];

        setCorrectData(correctRows);
        setErroredData(errorRows);
        setHasImported(true);

        if (errorRows.length > 0) {
          setActiveTab("NON_IMPORTED");
          setTabledata(errorRows);
        } else {
          setActiveTab("IMPORTED");
          setTabledata(correctRows);
        }

        showSideAlert(
          `Imported : ${result.inserted ?? correctRows.length} | Rejected : ${result.rejected ?? errorRows.length}`,
          "success"
        );
      }
    } catch (error: any) {
      showSideAlert(
        error?.response?.data?.Message || "Error Importing Data",
        "error"
      );
      console.error("Error importing OT Hours file:", error);
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
      title="OT Hours Import"
      subtitle="Import monthly employee overtime (OT) hours from excel."
      onDownloadSample={handleDownloadSample}
      isLoading={isLoadingonpage}
      file={excelfile}
      onFileSelect={setFile}
      onImport={handleButtonClick}
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
        excelname: "OT Hours Data",
      }}
    />
  );
}
