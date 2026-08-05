"use client";
import SmallTitle from "@/components/atoms/smallTitle";
import React, { useEffect, useState } from "react";
import { useFormData } from "./Context/FormDataContext";
import TableComponent from "@/components/atoms/DynamicTable";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import axios from "axios";
import Swal from "sweetalert2";
import HashloaderComponent from "@/components/Templates/hashloader";

interface RowData {
  Asset_Serial_no: string;
  Aset_Code: string;
  Aset_Name: string;
  Asset_Type: string;
  Issue_Date: string;
  Revoke_Date: string;
  Lost_Date: string;
  Revoke_Rem: string;
}
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
const Page: React.FC = () => {
  const user = useCurrentUser();
  const { formData, setFormData } = useFormData();
  const [tableData, setTableData] = useState([{}]);
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
    setTableData([{}]);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/employee/AssetDetailsEmp/${EMP_CODE}`,
        {},
        {
          headers: {
            compcode: user?.Comp_Code, name: user?.name,
          },
        }
      );
      setTableData(response?.data?.data?.AssetIssue || []);
    } catch (e) {
      showSideAlert(e.response.data.message, "warning");
    }
  };

  useEffect(() => {
    if (formData.EmpMst.EMPCODE) {
      handleEmpChange(formData.EmpMst.EMPCODE);
    }
  }, [formData.EmpMst.EMPCODE]);

  const SaveAssets = async () => {
    if (!formData.EmpMst?.EMPCODE) {
      showSideAlert("Please select Employee Code", "info");
      return;
    }
    setIsLoading(true);
    console.log(tableData, "tableData");
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
            compcode: user?.Comp_Code, name: user?.name,
          },
        }
      );
      console.log(response)
      handleEmpChange(formData.EmpMst.EMPCODE);
    } catch (e) {
      console.log(e, 'hfvb')
      showSideAlert(e.response.data.message, "warning");
    } finally {
      setIsLoading(false)
    }
  };

  const UpdateAssets = async () => {
    setIsLoading(true)
    console.log(tableData, "tableData");
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
            compcode: user?.Comp_Code, name: user?.name,
          },
        }
      );
      console.log(response);
      handleEmpChange(formData.EmpMst.EMPCODE);
      showSideAlert("Asset updated successfully", "success");
    } catch (e) {
      showSideAlert(e.response.data.message, "warning");
    } finally {
      setIsLoading(false)
    }
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
    <div className="">
      {/* <SmallTitle text="Asset Details" /> */}

      <div className="rounded-t bg-[#193A69] dark:bg-black mb-0 px-2 py-2 border dark:border-[#D0D5DD]"> {/* ye pri div replesh karna h */}
        <div className="flex flex-col sm:flex-row items-center justify-between ">
          <h1 className=" font-semibold text-sm">
            <div className="flex  text-white dark:text-[#37a9dd] uppercase">
              Asset Details
            </div>
          </h1>
        </div>
      </div>


      <div className="overflow-x-auto w-full h-[200px] gap-3 p-4 mt-2 bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow">
        <TableComponent
          columns={columns}
          tableData={tableData}
          setTableData={setTableData}
          constraints={constraints}
          columnsShow={columnsShow}
          DropDownOp={a}
           AddBtn={true}
        />
      </div>
      <div className="flex mt-2 flex-wrap gap-x-2 p-2.5">
        {user?.role1.includes("1.2.2") && (
          <Button variant={"save"} onClick={SaveAssets} disabled={isUTDPresent}>
            Save
          </Button>
        )}
        {user?.role1.includes("1.2.3") && (
          <Button
            variant={"update"}
            onClick={UpdateAssets}
            disabled={!isUTDPresent}
          >
            update
          </Button>
        )}
        <Button
          variant={"outline"}
          onClick={() => {
            const url = `${process.env.NEXT_PUBLIC_URL}/asset/AssetViewEmployeeMaster?compcode=${user?.Comp_Code}&EmpCode=${formData.EmpMst.EMPCODE}`;
            window.open(url, "_blank"); // Opens the URL in a new tab/window
          }}
        >
          View Asset
        </Button>
      </div>
      <HashloaderComponent isLoading={isLoading} />
    </div>
  );
};
export default Page;
