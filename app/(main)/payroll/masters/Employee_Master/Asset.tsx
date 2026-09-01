"use client";
import React, { useEffect, useState } from "react";
import { useFormData } from "./Context/FormDataContext";
import TableComponent from "@/components/atoms/YNDynamicTable";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import axios from "axios";
import Swal from "sweetalert2";
import HashloaderComponent from "@/components/Templates/hashloader";
import { Plus, Box } from "lucide-react";

function showSideAlert(message: any, type: any) {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
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

interface AssetRow {
  UTD?: string | number | null;
  Asset_Serial_no?: string;
  Aset_Code?: string;
  Aset_Name?: string;
  Asset_Type?: string;
  Issue_Date?: string;
  Revoke_Date?: string;
  Lost_Date?: string;
  Revoke_Rem?: string;
}

const Page: React.FC = () => {
  const user = useCurrentUser();
  const { formData, setFormData } = useFormData();
  
  // ✅ Initial state mein ek empty row set ki
  const [tableData, setTableData] = useState<AssetRow[]>([{}]);
  
  const [isUTDPresent, setIsUTDPresent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setFormData((prevData: any) => ({
      ...prevData,
      AssetIssue: tableData,
    }));
    const utdFound = tableData.some((row) => row.UTD != null);
    setIsUTDPresent(utdFound);
  }, [tableData]);

  const handleEmpChange = async (EMP_CODE) => {
   
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/AssetDetailsEmp/${EMP_CODE}`,
        {},
        {
          headers: {
            compcode: (user as any)?.Comp_Code,
            name: user?.name,
          },
        }
      );
      
      const apiData = response?.data?.data?.AssetIssue || [];

      setTableData(apiData.length > 0 ? apiData : [{}]);
      
    } catch (e) {
      showSideAlert(e.response?.data?.message || "Error fetching data", "warning");

      setTableData([{}]);
    }
  };

  useEffect(() => {
    if (formData.EmpMst.EMPCODE) {
      handleEmpChange(formData.EmpMst.EMPCODE);
    } else {
    
      setTableData([{}]);
    }
  }, [formData.EmpMst.EMPCODE]);

  const SaveAssets = async () => {
    if (!formData.EmpMst?.EMPCODE) {
      showSideAlert("Please select Employee Code", "info");
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/AssetDetailsSave`,
        {
          AssetIssue: tableData,
          Created_by: user?.name,
          EMPCODE: formData.EmpMst.EMPCODE,
        },
        {
          headers: {
            compcode: (user as any)?.Comp_Code,
            name: user?.name,
          },
        }
      );
      handleEmpChange(formData.EmpMst.EMPCODE);
    } catch (e) {
      showSideAlert(e.response?.data?.message || "Error", "warning");
    } finally {
      setIsLoading(false);
    }
  };

  const UpdateAssets = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/UpdateAssets`,
        {
          AssetIssue: tableData,
          Created_by: user?.name,
          EMPCODE: formData.EmpMst.EMPCODE,
        },
        {
          headers: {
            compcode: (user as any)?.Comp_Code,
            name: user?.name,
          },
        }
      );
      handleEmpChange(formData.EmpMst.EMPCODE);
      showSideAlert("Asset updated successfully", "success");
    } catch (e) {
      showSideAlert(e.response?.data?.message || "Error", "warning");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Function to add new row when "+ Issue asset" button is clicked
  const handleAddRow = () => {
    setTableData((prev) => [...prev, {}]);
  };

  const a = {};

  a["Asset_Type"] = [
    { value: "Fixed", label: "Fixed" },
    { value: "Consumable", label: "Consumable" },
  ];

  const columnsShow = [
    "Asset Serial no",
    "Asset Code",
    "Asset Name",
    "Asset Type",
    "Issue Date",
    "Return Date",
    "Lost Date",
    "Remark",
  ];
  const columns = [
    "Asset_Serial_no",
    "Aset_Code",
    "Aset_Name",
    "Asset_Type",
    "Issue_Date",
    "Revoke_Date",
    "Lost_Date",
    "Revoke_Rem",
  ];
  const constraints = {
    Asset_Serial_no: { type: "TEXT", required: true, disabled: true },
    Aset_Code: { type: "TEXT", required: true, disabled: true },
    Aset_Name: { type: "TEXT", required: true, disabled: true },
    Asset_Type: { type: "Select", required: true, disabled: true },
    Issue_Date: { type: "DATE", required: true, disabled: true },
    Revoke_Date: { type: "DATE" },
    Lost_Date: { type: "DATE" },
    Revoke_Rem: { type: "TEXT" },
  };

  return (
    <div className="w-full bg-[#F8FAFC] dark:bg-[#1E293B] p-4 rounded-xl border border-[#E2E8F0] dark:border-[#334155] shadow-sm">
      
      {/* ✅ Header Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md">
            <Box className="h-7 w-6 text-[#4F46E5] dark:text-[#818CF8]" />
          </div>
          <h1 className="font-bold text-[13px] text-[#1E293B] dark:text-[#E2E8F0] tracking-wide uppercase">
            Asset Details
          </h1>
        </div>

        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          {/* View Asset Button */}
          <Button
            variant="outline"
            className="h-9 border-[#E2E8F0] dark:border-[#334155] text-[#4F46E5] dark:text-[#818CF8] font-large bg-white dark:bg-[#0F172A] hover:bg-[#EEF2FF] dark:hover:bg-[#1E293B] hover:text-[#4F46E5] dark:hover:text-[#818CF8]"
            onClick={() => {
              const url = `${process.env.NEXT_PUBLIC_URL}/asset/AssetViewEmployeeMaster?compcode=${(user as any)?.Comp_Code}&EmpCode=${formData.EmpMst.EMPCODE}`;
              window.open(url, "_blank");
            }}
          >
            View asset
          </Button>

          {/* Save Button (Role 1.2.2) */}
          {(user as any)?.role1.includes("1.2.2") && (
            <Button
              variant="outline"
              className="h-9 border-[#E2E8F0] dark:border-[#334155] text-[#4F46E5] dark:text-[#818CF8] font-large bg-white dark:bg-[#0F172A] hover:bg-[#EEF2FF] dark:hover:bg-[#1E293B] hover:text-[#4F46E5] dark:hover:text-[#818CF8]"
              onClick={SaveAssets}
              disabled={isUTDPresent}
            >
              Save
            </Button>
          )}

          {/* Update Button (Role 1.2.3) */}
          {(user as any)?.role1.includes("1.2.3") && (
            <Button
              variant="outline"
              className="h-9 border-[#E2E8F0] dark:border-[#334155] text-[#4F46E5] dark:text-[#818CF8] font-medium bg-white dark:bg-[#0F172A] hover:bg-[#EEF2FF] dark:hover:bg-[#1E293B] hover:text-[#4F46E5] dark:hover:text-[#818CF8]"
              onClick={UpdateAssets}
              disabled={!isUTDPresent}
            >
              Update
            </Button>
          )}
        </div>
      </div>

      {/* ✅ Table Wrapper */}
      <div className="w-full border border-[#EAECF0] dark:border-[#334155] rounded-lg overflow-hidden bg-white dark:bg-[#0F172A]">
        
        {/* Original TableComponent */}
        <div className="[&_th]:!text-[10px] [&_th]:!tracking-[0.08em] [&_th]:!bg-[#F8FAFC] dark:[&_th]:!bg-[#1E293B] [&_th]:!text-[#475569] dark:[&_th]:!text-[#94A3B8] [&_tbody_tr]:!bg-white dark:[&_tbody_tr]:!bg-[#0F172A] [&_tbody_td]:!text-[#334155] dark:[&_tbody_td]:!text-[#E2E8F0] [&_tbody_tr:last-child]:!hidden [&_tbody_tr:last-child]:!pointer-events-none">
          <TableComponent
            columns={columns}
            tableData={tableData}
            setTableData={setTableData}
            constraints={constraints}
            columnsShow={columnsShow}
            DropDownOp={a}
          />
        </div>

        {/* ✅ "+ Issue asset" button */}
        <div className="px-6 py-4 border-t border-[#EAECF0] dark:border-[#334155] bg-white dark:bg-[#0F172A]">
          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[#D0D5DD] dark:border-[#475569] bg-white dark:bg-[#0F172A] px-4 py-2 text-m font-medium text-[#4F46E5] dark:text-[#818CF8] hover:bg-[#F3F4FF] dark:hover:bg-[#1E293B] hover:border-[#A5B4FC] dark:hover:border-[#6366F1] transition-colors"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Issue asset
          </button>
        </div>
      </div>

      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
};

export default Page;