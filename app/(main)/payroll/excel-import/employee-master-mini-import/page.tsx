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

interface EmployeeMasterMiniImportProps {
  isDialogMode?: boolean;
}

export default function EmployeeMasterMiniImportPage({
  isDialogMode = false,
}: EmployeeMasterMiniImportProps) {
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
  const handleDownloadSample = async () => {
    try {
      window.location.href = `${process.env.NEXT_PUBLIC_URL}/employee/importformat?compcode=${user?.Comp_Code}&flag=${1}`;
    } catch (error) {
      console.error("Error occurred while making the download request:", error);
    }
  };

  // ----------------------------------------------------------------------
  // TABLE COLUMNS (31 FIXED COLUMNS)
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
      { Header: "EmpName", accessor: "EMPFIRSTNAME", minWidth: 140 },
      { Header: "Gender", accessor: "GENDER", minWidth: 100 },
      { Header: "Employee Type", accessor: "EMPTYPE", minWidth: 130 },
      { Header: "CHANNEL", accessor: "CHANNEL_NAME", minWidth: 130 },
      { Header: "CLUSTER", accessor: "CLUSTER_NAME", minWidth: 130 },
      { Header: "LOCATION", accessor: "LOCATION_NAME", minWidth: 130 },
      { Header: "SECTION", accessor: "SECTION_NAME", minWidth: 130 },
      { Header: "DEPARTMENT", accessor: "DIVISION_NAME", minWidth: 140 },
      { Header: "Designation", accessor: "EMPLOYEEDESIGNATION", minWidth: 140 },
      { Header: "Punch Code", accessor: "PAY_CODE", minWidth: 120 },
      { Header: "MSPIN", accessor: "MSPIN", minWidth: 120 },
      { Header: "Mobile", accessor: "MOBILE_NO", minWidth: 120 },
      { Header: "DOB", accessor: "DOB", minWidth: 120 },
      { Header: "Joining Date", accessor: "CURRENTJOINDATE", minWidth: 130 },
      { Header: "Aadhar", accessor: "UID_NO", minWidth: 140 },
      { Header: "PAN", accessor: "PANNO", minWidth: 120 },
      { Header: "Address", accessor: "PERMANENTADDRESS1", minWidth: 180 },
      { Header: "Religion", accessor: "RELCODE", minWidth: 120 },
      { Header: "PF %", accessor: "pfper", minWidth: 100 },
      { Header: "PF Y/N", accessor: "PFNO", minWidth: 100 },
      { Header: "PF Number", accessor: "pfnumber", minWidth: 130 },
      { Header: "ESI Y/N", accessor: "ESINO", minWidth: 100 },
      { Header: "LWF Y/N", accessor: "LWFNO", minWidth: 100 },
      { Header: "Professional Tax", accessor: "pro_tax", minWidth: 140 },
      { Header: "Payment Mode", accessor: "PAYMENTMODE", minWidth: 130 },
      { Header: "BANK NAME", accessor: "BANKNAME", minWidth: 140 },
      { Header: "BANK ACCOUNT NO", accessor: "BANKACCOUNTNO", minWidth: 160 },
      { Header: "IFSC", accessor: "ifsc_code", minWidth: 120 },
      { Header: "WEEKLYOFF", accessor: "WEEKLYOFF", minWidth: 120 },
      { Header: "SHIFT", accessor: "EMP_SHIFT_NAME", minWidth: 130 },
    ],
    []
  );

  const columnsList = useMemo(() => columns.map((col) => col.Header), [columns]);

  // ----------------------------------------------------------------------
  // DATA VALUE TRANSFORMATION MAPPINGS
  // ----------------------------------------------------------------------
  const convertYN = (value: any) => {
    if (value === 1) return "YES";
    if (value === 0) return "NO";
    return value;
  };

  const WeeklyOff = [
    "SUNDAY", // 0
    "MONDAY", // 1
    "TUESDAY", // 2
    "WEDNESDAY", // 3
    "THURSDAY", // 4
    "FRIDAY", // 5
    "SATURDAY", // 6
  ];

  const convertWeeklyOff = (value: any) => {
    if (value === null || value === undefined || value === "") return value;
    return WeeklyOff[value] || value;
  };

  const Religion = [
    "", // index 0 unused
    "HINDU", // 1
    "MUSLIMS", // 2
    "SIKH", // 3
    "CHRISTIAN", // 4
    "JAIN", // 5
    "BUDDHA", // 6
    "PERSIANS", // 7
  ];

  const convertReligion = (value: any) => {
    if (!value) return value;
    return Religion[value] || value;
  };

  const convertEmpType = (value: any) => {
    if (value == 1 || value == "1") return "REGULAR";
    if (value == 2 || value == "2") return "CASUAL";
    if (value == 3 || value == "3") return "APPRENTICE";
    return value;
  };

  const mapDisplayFields = (item: any) => ({
    ...item,
    PFNO: convertYN(item.PFNO),
    ESINO: convertYN(item.ESINO),
    LWFNO: convertYN(item.LWFNO),
    pro_tax: convertYN(item.pro_tax),
    WEEKLYOFF: convertWeeklyOff(item.WEEKLYOFF),
    RELCODE: convertReligion(item.RELCODE),
    EMPTYPE: convertEmpType(item.EMPTYPE),
  });

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
      formData.append("branch", user?.branch || "");

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/excelimportForAdmin`,
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

      if (response.status === 200) {
        const rawErrored = response.data?.ErroredData || [];
        const rawCorrect = response.data?.CorrectData || [];

        const ErroredMapped = rawErrored.map(mapDisplayFields);
        const CorrectMapped = rawCorrect.map(mapDisplayFields);

        setErroredData(ErroredMapped);
        setCorrectData(CorrectMapped);
        setHasImported(true);

        if (ErroredMapped.length > 0) {
          setActiveTab("NON_IMPORTED");
          setTabledata(ErroredMapped);
        } else {
          setActiveTab("IMPORTED");
          setTabledata(CorrectMapped);
        }

        showSideAlert(response?.data?.Message || "File processed successfully", "success");
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
      setTabledata(correctData);
    } else {
      setActiveTab("NON_IMPORTED");
      setTabledata(erroredData);
    }
  };

  return (
    <ExcelImportTemplate
      title="Employee Master Mini Excel Import"
      subtitle="Import basic employee master records, designations, department and banking details."
      onDownloadSample={handleDownloadSample}
      hideBack={isDialogMode}
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
    />
  );
}
