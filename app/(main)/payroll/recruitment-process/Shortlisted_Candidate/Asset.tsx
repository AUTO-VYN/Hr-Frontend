"use client";
import SmallTitle from "@/components/atoms/smallTitle";
import React, { useEffect, useState } from "react";
import { useFormData } from "./Context/FormDataContext";

interface RowData {
  Aset_Code: string;
  Asset_Serial_no: string;
  Asset_Type: string;
  Issue_Date: string;
  Revoke_Date: string;
  Lost_Date: string;
  Revoke_Rem: string;
}

const Page: React.FC = () => {
  const { formData, setFormData } = useFormData();
  const [AssetIssue, setAssetIssue] = useState<RowData[]>([]);
  const [currentRow, setCurrentRow] = useState<RowData>({
    Aset_Code: "",
    Asset_Serial_no: "",
    Asset_Type: "",
    Issue_Date: "",
    Revoke_Date: "",
    Lost_Date: "",
    Revoke_Rem: "",
  });

  const handleInputChange = (name: keyof RowData, value: string) => {
    setCurrentRow((prevRow) => ({
      ...prevRow,
      [name]: value,
    }));
  };
  const handleTabPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const newRow = { ...currentRow };

      setAssetIssue([...AssetIssue, newRow]);
      setCurrentRow({
        Aset_Code: "",
        Asset_Serial_no: "",
        Asset_Type: "",
        Issue_Date: "",
        Revoke_Date: "",
        Lost_Date: "",
        Revoke_Rem: "",
      });
    }
  };

  useEffect(() => {
    if (AssetIssue.length > 0) {
      setFormData((prevData: any) => ({
        ...prevData,
        AssetIssue: AssetIssue,
      }));
    } else {
      setAssetIssue(formData.AssetIssue);
    }
    // setWorkDetails(formData.workDetails);
  }, [formData.AssetIssue, AssetIssue]);

  return (
    <div className="p-2 mt-2 shadow rounded-lg dark:bg-primary dark:bg-opacity-10">
      <SmallTitle text="Asset Details" />
      <div className="overflow-x-scroll">
        <table className="w-screen text-sm text-left rtl:text-right overflow-x-scroll">
          <thead className="text-xs  uppercase ">
            <tr>
              <th scope="col" className="px-6 py-3 text-center">
                Sr No
              </th>
              <th scope="col" className="px-6 py-3 text-center">
                Asset Name
              </th>
              <th scope="col" className="px-6 py-3 text-center">
                Serial No
              </th>
              <th scope="col" className="px-6 py-3 text-center">
                Asset Type
              </th>
              <th scope="col" className="px-6 py-3 text-center">
                Location
              </th>
              <th scope="col" className="px-6 py-3 text-center">
                Issue Date
              </th>
              <th scope="col" className="px-6 py-3 text-center">
                Return Date
              </th>
              <th scope="col" className="px-6 py-3 text-center">
                Lost Date
              </th>
              <th scope="col" className="px-6 py-3 text-center">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-center">
              <td>-</td>
              <td>
                <input
                  type="text"
                  name="Aset_Code"
                  className="border-0 px-1.5 py-1.5 dark:bg-input  rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                  value={currentRow.Aset_Code}
                  onChange={(e) =>
                    handleInputChange("Aset_Code", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  type="text"
                  name="Asset_Serial_no"
                  className="border-0 px-1.5 py-1.5 dark:bg-input  rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                  value={currentRow.Asset_Serial_no}
                  onChange={(e) =>
                    handleInputChange("Asset_Serial_no", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  name="Asset_Type"
                  className="border-0 px-1.5 py-1.5 dark:bg-input  rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                  value={currentRow.Asset_Type}
                  onChange={(e) =>
                    handleInputChange("Asset_Type", e.target.value)
                  }
                />
              </td>

              <td>
                <input
                  type="date"
                  name="Issue_Date"
                  className="border-0 px-1.5 py-1.5 dark:bg-input  rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                  value={currentRow.Issue_Date}
                  onChange={(e) =>
                    handleInputChange("Issue_Date", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  type="date"
                  className="border-0 px-1.5 py-1.5 dark:bg-input  rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                  name="Revoke_Date"
                  value={currentRow.Revoke_Date}
                  onChange={(e) =>
                    handleInputChange("Revoke_Date", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  type="date"
                  name="Lost_Date"
                  className="border-0 px-1.5 py-1.5 dark:bg-input  rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                  value={currentRow.Lost_Date}
                  onChange={(e) =>
                    handleInputChange("Lost_Date", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  type="text"
                  name="Revoke_Rem"
                  className="border-0 px-1.5 py-1.5 dark:bg-input  rounded text-sm shadow focus:outline-none focus:ring w-full ease-linear transition-all duration-150"
                  value={currentRow.Revoke_Rem}
                  onChange={(e) =>
                    handleInputChange("Revoke_Rem", e.target.value)
                  }
                  onKeyDown={handleTabPress}
                />
              </td>
            </tr>
          </tbody>
          <tbody className="bg-white dark:bg-primary dark:bg-opacity-10 divide-y divide-gray-200 py-2">
            {AssetIssue.map((rowData, index) => (
              <tr
                key={index}
                className="text-center hover:bg-gray-600 border p-2"
              >
                <td>{index + 1}</td>
                <td>{rowData.Aset_Code}</td>
                <td>{rowData.Asset_Serial_no}</td>
                <td>{rowData.Asset_Type}</td>
                <td>{rowData.Issue_Date}</td>
                <td>{rowData.Revoke_Date}</td>
                <td>{rowData.Lost_Date}</td>
                <td>{rowData.Revoke_Rem}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default Page;
