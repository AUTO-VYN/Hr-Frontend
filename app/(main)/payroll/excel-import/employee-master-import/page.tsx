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

export default function EmployeeMasterImportPage() {
  const user: any = useCurrentUser();

  const [excelfile, setFile] = useState<File | null>(null);
  const [isLoadingonpage, setisLoadingonpage] = useState(false);
  const [hasImported, setHasImported] = useState(false);
  const [tabledata, setTabledata] = useState<any[]>([]);
  const [erroredData, setErroredData] = useState<any[]>([]);
  const [correctData, setCorrectData] = useState<any[]>([]);
  const [updatedData, setUpdatedData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"IMPORTED" | "UPDATED" | "NON_IMPORTED">("NON_IMPORTED");

  // ----------------------------------------------------------------------
  // DOWNLOAD SAMPLE
  // ----------------------------------------------------------------------
  const handleDownloadSample = () => {
    try {
      window.location.href = `${process.env.NEXT_PUBLIC_URL}/employee/importformat?compcode=${user?.Comp_Code}`;
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
      { Header: "Emp Name", accessor: "EMPFIRSTNAME", minWidth: 160 },
      { Header: "Gender", accessor: "GENDER", minWidth: 100 },
      { Header: "Employee Type", accessor: "EMPTYPE", minWidth: 140 },
      { Header: "Channel", accessor: "CHANNEL_NAME", minWidth: 140 },
      { Header: "Cluster", accessor: "CLUSTER_NAME", minWidth: 140 },
      { Header: "Location", accessor: "LOCATION_NAME", minWidth: 150 },
      { Header: "Section", accessor: "SECTION_NAME", minWidth: 140 },
      { Header: "Department", accessor: "DIVISION_NAME", minWidth: 150 },
      { Header: "Designation", accessor: "EMPLOYEEDESIGNATION", minWidth: 180 },
      { Header: "Punch Code", accessor: "PAY_CODE", minWidth: 130 },
      { Header: "MSPIN", accessor: "MSPIN", minWidth: 120 },
      { Header: "Mobile", accessor: "MOBILE_NO", minWidth: 130 },
      { Header: "DOB", accessor: "DOB", minWidth: 120 },
      { Header: "Joining Date", accessor: "CURRENTJOINDATE", minWidth: 130 },
      { Header: "Aadhar", accessor: "UID_NO", minWidth: 140 },
      { Header: "PAN", accessor: "PANNO", minWidth: 130 },
      { Header: "Address", accessor: "PERMANENTADDRESS1", minWidth: 220 },
      { Header: "Religion", accessor: "RELCODE", minWidth: 130 },
      { Header: "PF %", accessor: "pfper", minWidth: 100 },
      { Header: "PF Y/N", accessor: "PFNO", minWidth: 100 },
      { Header: "PF Number", accessor: "pfnumber", minWidth: 130 },
      { Header: "ESI Y/N", accessor: "ESINO", minWidth: 100 },
      { Header: "LWF Y/N", accessor: "LWFNO", minWidth: 100 },
      { Header: "Professional Tax", accessor: "pro_tax", minWidth: 150 },
      { Header: "Payment Mode", accessor: "PAYMENTMODE", minWidth: 140 },
      { Header: "Bank Name", accessor: "BANKNAME", minWidth: 160 },
      { Header: "Bank Account No", accessor: "BANKACCOUNTNO", minWidth: 170 },
      { Header: "IFSC", accessor: "ifsc_code", minWidth: 130 },
      { Header: "Weekly Off", accessor: "WEEKLYOFF", minWidth: 130 },
      { Header: "Shift", accessor: "EMP_SHIFT_NAME", minWidth: 140 },
    ],
    []
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

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/excelimport`,
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
        const convertYN = (value: any) => {
          if (value === 1 || value === "1") return "YES";
          if (value === 0 || value === "0") return "NO";
          return value;
        };

        const WeeklyOff = [
          "SUNDAY",
          "MONDAY",
          "TUESDAY",
          "WEDNESDAY",
          "THURSDAY",
          "FRIDAY",
          "SATURDAY",
        ];

        const convertWeeklyOff = (value: any) => {
          if (value === null || value === undefined || value === "") return value;
          return WeeklyOff[value] || value;
        };

        const Religion = [
          "",
          "HINDU",
          "MUSLIMS",
          "SIKH",
          "CHRISTIAN",
          "JAIN",
          "BUDDHA",
          "PERSIANS",
        ];

        const convertReligion = (value: any) => {
          if (!value) return value;
          return Religion[value] || value;
        };

        const convertEmpType = (value: any) => {
          if (value === 1 || value === "1") return "REGULAR";
          if (value === 2 || value === "2") return "CASUAL";
          if (value === 3 || value === "3") return "APPRENTICE";
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

        const ErroredMapped = (response.data.ErroredData || []).map(mapDisplayFields);
        const CorrectMapped = (response.data.CorrectData || []).map(mapDisplayFields);
        const UpdatedMapped = (response.data.UpdatedData || []).map(mapDisplayFields);

        setErroredData(ErroredMapped);
        setCorrectData(CorrectMapped);
        setUpdatedData(UpdatedMapped);
        setHasImported(true);

        if (ErroredMapped.length > 0) {
          setActiveTab("NON_IMPORTED");
          setTabledata(ErroredMapped);
        } else if (CorrectMapped.length > 0) {
          setActiveTab("IMPORTED");
          setTabledata(CorrectMapped);
        } else if (UpdatedMapped.length > 0) {
          setActiveTab("UPDATED");
          setTabledata(UpdatedMapped);
        }

        showSideAlert(response?.data?.Message || "File processed successfully", "success");
      }
    } catch (error: any) {
      showSideAlert(
        error?.response?.data?.Message || "Error! Invalid file format or data",
        "error"
      );
      console.error("Error uploading file:", error);
    } finally {
      setisLoadingonpage(false);
    }
  };

  // ----------------------------------------------------------------------
  // TAB SWITCHING (IMPORTED vs UPDATED vs NON-IMPORTED)
  // ----------------------------------------------------------------------
  const handleStatusTabChange = (tab: "IMPORTED" | "UPDATED" | "NON_IMPORTED") => {
    setActiveTab(tab);
    if (tab === "IMPORTED") {
      setTabledata(correctData);
    } else if (tab === "UPDATED") {
      setTabledata(updatedData);
    } else {
      setTabledata(erroredData);
    }
  };

  // ----------------------------------------------------------------------
  // UPLOAD CARD CONTENT (PASSED AS PROP)
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
      title="Employee Master Excel Import"
      subtitle="Import employee master records and demographic details using standard excel format."
      onDownloadSample={handleDownloadSample}
      isLoading={isLoadingonpage}
      uploadCard={uploadCardContent}
      columnsList={columnsList}
      showStatusCards={hasImported}
      importedCount={correctData.length}
      updatedCount={updatedData.length}
      showUpdatedCard={hasImported}
      nonImportedCount={erroredData.length}
      activeStatusTab={activeTab}
      onStatusTabChange={handleStatusTabChange}
      columns={columns}
      data={hasImported ? tabledata : undefined}
    />
  );
}
