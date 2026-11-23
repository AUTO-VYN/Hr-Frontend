"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import ExcelJS from "exceljs";

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

interface EmployeeDeductionsImportPageProps {
  isDialogMode?: boolean;
}

export default function EmployeeDeductionsImportPage({
  isDialogMode = false,
}: EmployeeDeductionsImportPageProps) {
  const user: any = useCurrentUser();

  // State
  const [excelfile, setFile] = useState<File | null>(null);
  const [isLoadingonpage, setisLoadingonpage] = useState(false);
  const [hasImported, setHasImported] = useState(false);
  const [tabledata, setTabledata] = useState<any[]>([]);
  const [erroredData, setErroredData] = useState<any[]>([]);
  const [correctData, setCorrectData] = useState<any[]>([]);
  const [DedType, setDedType] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"IMPORTED" | "NON_IMPORTED">("IMPORTED");

  const [formdata, setFormdata] = useState({
    employeeData: {
      Ded_Type: null,
      Month: null as string | null,
      Year: null as string | null,
    },
  });

  // Month & Year Options
  const monthOptions = useMemo(
    () => [
      { value: "1", label: "January" },
      { value: "2", label: "February" },
      { value: "3", label: "March" },
      { value: "4", label: "April" },
      { value: "5", label: "May" },
      { value: "6", label: "June" },
      { value: "7", label: "July" },
      { value: "8", label: "August" },
      { value: "9", label: "September" },
      { value: "10", label: "October" },
      { value: "11", label: "November" },
      { value: "12", label: "December" },
    ],
    []
  );

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
      years.push({ value: i.toString(), label: i.toString() });
    }
    return years;
  }, []);

  const handleSelectChange = (name: string, value: any) => {
    setFormdata((prev: any) => ({
      ...prev,
      employeeData: {
        ...prev.employeeData,
        [name]: value,
      },
    }));
  };

  // ----------------------------------------------------------------------
  // FETCH DEDUCTION TYPES ON MOUNT
  // ----------------------------------------------------------------------
  useEffect(() => {
    const fetchDeductionTypes = async () => {
      if (!user?.Comp_Code) return;
      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_URL}/EmpMaster/GetDeductionList`,
          {},
          {
            headers: {
              compcode: user?.Comp_Code,
              name: user?.name,
            },
          }
        );
        setDedType(response.data?.DeductionList || []);
      } catch (error) {
        console.error("Error fetching deduction types:", error);
      }
    };

    fetchDeductionTypes();
  }, [user?.Comp_Code, user?.name]);

  // ----------------------------------------------------------------------
  // DOWNLOAD SAMPLE
  // ----------------------------------------------------------------------
  const handleDownloadSample = () => {
    try {
      const month = formdata.employeeData.Month || "";
      const year = formdata.employeeData.Year || "";
      window.location.href = `${process.env.NEXT_PUBLIC_URL}/EmpMaster/importformatminiforEmplDed?compcode=${user?.Comp_Code}&month=${month}&year=${year}`;
    } catch (error) {
      console.error("Error occurred while making the download request:", error);
    }
  };

  // ----------------------------------------------------------------------
  // CLIENT-SIDE EXCEL PARSE FOR DUPLICATE CHECK
  // ----------------------------------------------------------------------
  const parseExcelToJson = async (file: File): Promise<any[]> => {
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return [];

    const headers: string[] = [];
    const rowsData: any[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        row.eachCell((cell, colNumber) => {
          headers[colNumber] = String(cell.text || cell.value || "").trim();
        });
      } else {
        const rowObj: Record<string, any> = {};
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            rowObj[header] = cell.text !== undefined ? cell.text : (cell.value ?? "");
          }
        });
        if (Object.keys(rowObj).length > 0) {
          rowsData.push(rowObj);
        }
      }
    });

    return rowsData;
  };

  // ----------------------------------------------------------------------
  // FILE UPLOAD & IMPORT FLOW
  // ----------------------------------------------------------------------
  const handleImport = async () => {
    // 1. MultiLocation validation
    if (typeof user?.branch === "string") {
      showSideAlert("Cannot Import Data in MultiLocation", "info");
      return;
    }

    // 2. Month & Year validation
    if (!formdata.employeeData.Month || !formdata.employeeData.Year) {
      showSideAlert("Please select both Month and Year before importing", "error");
      return;
    }

    // 3. File validation
    if (!excelfile) {
      showSideAlert("Please select an Excel file first", "warning");
      return;
    }

    try {
      setisLoadingonpage(true);

      // Step 1: Parse excel data on client
      const excelData = await parseExcelToJson(excelfile);

      // Step 2: Check duplicates before import
      const checkResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmpMaster/checkExistingEmpDedBeforeImport`,
        {
          data: excelData,
          branch: user?.branch,
          month: formdata.employeeData.Month,
          year: formdata.employeeData.Year,
        },
        { headers: { compcode: user?.Comp_Code } }
      );

      // Step 3: Ask user confirmation if duplicates found
      if (checkResponse.data.duplicatesFound) {
        const duplicateList = (checkResponse.data.duplicates || [])
          .map(
            (d: any) =>
              `<div style="text-align:left; font-size:12px; margin-bottom:4px;">Emp: <b>${d.Emp_Id}</b>, DedType: <b>${d.Ded_Type}</b>, Month: ${d.Mnth}, Year: ${d.Yr}</div>`
          )
          .join("");

        const confirmed = await Swal.fire({
          icon: "warning",
          title: "Duplicate Entries Found!",
          html: `${checkResponse.data.message || "Some entries already exist."}<br><br><div style="max-height:160px; overflow-y:auto; border:1px solid #e2e8f0; padding:8px; border-radius:8px;">${duplicateList}</div><br><b>Do you still want to proceed?</b>`,
          confirmButtonText: "Yes, Import Anyway",
          cancelButtonText: "No, Cancel",
          showCancelButton: true,
          allowOutsideClick: false,
        });

        if (!confirmed.isConfirmed) {
          showSideAlert("Import cancelled by user", "info");
          setisLoadingonpage(false);
          return;
        }
      }

      // Step 4: Proceed with import if confirmed or no duplicates
      const formData = new FormData();
      formData.append("excel", excelfile, excelfile.name);
      formData.append("user", user?.name || "");
      formData.append("branch", user?.branch || "");
      formData.append("month", formdata.employeeData.Month);
      formData.append("year", formdata.employeeData.Year);

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/EmpMaster/excelimportminiforEmpDed`,
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
          response?.data?.Message || "Deductions imported successfully",
          "success"
        );
      }
    } catch (error: any) {
      console.error("Error uploading file:", error);
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

  // ----------------------------------------------------------------------
  // TABLE COLUMNS (14 COLUMNS)
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
      { Header: "Ded Type", accessor: "Ded_Type", minWidth: 110 },
      { Header: "Emp Id", accessor: "Emp_Id", minWidth: 110 },
      { Header: "Emp Name", accessor: "Emp_Name", minWidth: 160 },
      { Header: "Month", accessor: "Mnth", minWidth: 90 },
      {
        Header: "Rec Date",
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
      { Header: "Ded Amt", accessor: "Ded_Amt", minWidth: 110 },
      { Header: "Basic Arr", accessor: "Basic_Arr", minWidth: 110 },
      { Header: "HRA Arr", accessor: "HRA_ARR", minWidth: 110 },
      { Header: "Conv Arr", accessor: "Conv_Arr", minWidth: 110 },
      { Header: "Medical Arr", accessor: "Medical_Arr", minWidth: 120 },
      { Header: "Washing_Arr", accessor: "Washing_Arr", minWidth: 120 },
      { Header: "Year", accessor: "Yr", minWidth: 90 },
      { Header: "Remark", accessor: "Ded_Rem", minWidth: 140 },
    ],
    []
  );

  const columnsList = useMemo(() => columns.map((col) => col.Header), [columns]);

  // ----------------------------------------------------------------------
  // RIGHT HELPER CARD CONTENT (Deduction Types Table Reference)
  // ----------------------------------------------------------------------
  const helperCardContent = (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1220] p-4 sm:p-5 shadow-[0_2px_8px_rgba(15,23,42,0.03)] space-y-3 flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-200">
            Deduction Types
          </h3>
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            ({DedType?.length || 0})
          </span>
        </div>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          Reference for Excel
        </span>
      </div>

      <div className="overflow-auto h-[195px] max-h-[195px] rounded-xl border border-slate-200/80 dark:border-slate-800/80">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900/60 sticky top-0 text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-3 py-1.5">Deduction Code</th>
              <th className="px-3 py-1.5">Deduction Name</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {DedType && DedType.length > 0 ? (
              DedType.map((row: any, index: number) => (
                <tr
                  key={index}
                  className="h-[24px] hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-3 py-1 font-mono font-medium text-slate-800 dark:text-slate-200">
                    {row.value}
                  </td>
                  <td className="px-3 py-1 text-slate-700 dark:text-slate-300">
                    {row.display_label || row.label}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={2}
                  className="px-3 py-4 text-center text-slate-400 dark:text-slate-500"
                >
                  No deduction types found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <ExcelImportTemplate
      title="Employee Deduction Excel Import"
      subtitle="Import monthly employee deductions, arrears, and adjustments with automatic duplicate checking."
      onDownloadSample={handleDownloadSample}
      hideBack={isDialogMode}
      isLoading={isLoadingonpage}
      file={excelfile}
      onFileSelect={setFile}
      onImport={handleImport}
      selectFields={[
        {
          title: "Month",
          name: "Month",
          option: monthOptions,
          value: formdata.employeeData.Month,
          handleInputChange: handleSelectChange,
          placeholder: "Select Month",
        },
        {
          title: "Year",
          name: "Year",
          option: yearOptions,
          value: formdata.employeeData.Year,
          handleInputChange: handleSelectChange,
          placeholder: "Select Year",
        },
      ]}
      helperCard={helperCardContent}
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
