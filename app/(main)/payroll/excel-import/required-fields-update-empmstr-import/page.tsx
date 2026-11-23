"use client";

import React, { useState } from "react";
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

export default function RequiredFieldsUpdateEmpMstrImportPage() {
  const user: any = useCurrentUser();

  const [excelfile, setFile] = useState<File | null>(null);
  const [isLoadingonpage, setisLoadingonpage] = useState(false);
  const [hasImported, setHasImported] = useState(false);
  const [tabledata, setTabledata] = useState<any[]>([]);
  const [erroredData, setErroredData] = useState<any[]>([]);
  const [correctData, setCorrectData] = useState<any[]>([]);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [columns, setColumns] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"IMPORTED" | "NON_IMPORTED">("NON_IMPORTED");

  // ----------------------------------------------------------------------
  // DOWNLOAD SAMPLE
  // ----------------------------------------------------------------------
  const handleDownloadSample = async () => {
    try {
      window.location.href = `${process.env.NEXT_PUBLIC_URL}/employee/importUpdateReqFieldsEmpMst?compcode=${user?.Comp_Code}`;
    } catch (error) {
      console.error("Error occurred while making the get request:", error);
    }
  };

  // ----------------------------------------------------------------------
  // DYNAMIC COLUMNS GENERATOR
  // ----------------------------------------------------------------------
  const generateColumns = (data: any[]) => {
    if (!data?.length) return [];

    return Object.keys(data[0]).map((key) => ({
      Header: key,
      accessor: key,
      minWidth: key.toLowerCase().includes("reason") ? 200 : 140,
      Cell: ({ value }: any) =>
        key.toLowerCase().includes("reason") ? (
          <span className="font-semibold text-rose-600 dark:text-rose-400">
            {value ?? "—"}
          </span>
        ) : (
          value !== undefined && value !== null ? String(value) : "—"
        ),
    }));
  };

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
        `${process.env.NEXT_PUBLIC_URL}/employee/updateEmployeeDynamic`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            compcode: user?.Comp_Code,
            name: user?.name,
          },
        }
      );

      console.log(response);
      const rejected = response.data?.RejectedRecords || [];
      const updated = response.data?.UpdatedRecords || [];

      setApiResponse(response.data);
      setErroredData(rejected);
      setCorrectData(updated);
      setHasImported(true);

      if (response.status === 200) {
        if (rejected.length > 0) {
          setActiveTab("NON_IMPORTED");
          setTabledata(rejected);
          setColumns(generateColumns(rejected));
        } else {
          setActiveTab("IMPORTED");
          setTabledata(updated);
          setColumns(generateColumns(updated));
        }
        showSideAlert(response?.data?.Message || "File uploaded successfully", "success");
      }

      console.log("File uploaded successfully:", response.data);
    } catch (error: any) {
      showSideAlert(
        error?.response?.data?.Message || "Error! Invalid Format",
        "error"
      );
      console.error("Error uploading file:", error);
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
      const data = apiResponse?.UpdatedRecords || correctData || [];
      setTabledata(data);
      setColumns(generateColumns(data));
    } else {
      setActiveTab("NON_IMPORTED");
      const data = apiResponse?.RejectedRecords || erroredData || [];
      setTabledata(data);
      setColumns(generateColumns(data));
    }
  };

  return (
    <ExcelImportTemplate
      title="Update Required Fields Employee Master"
      subtitle="Import and update required fields for employee master records via excel."
      onDownloadSample={handleDownloadSample}
      isLoading={isLoadingonpage}
      file={excelfile}
      onFileSelect={setFile}
      onImport={handleButtonClick}
      isImportDisabled={!excelfile || isLoadingonpage}
      columnsList={columns.length > 0 ? columns.map((col: any) => col.Header) : undefined}
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
