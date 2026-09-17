"use client";

import React, { useEffect, useState } from "react";
import { useFormData } from "./Context/FormDataContext";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import TableComponent from "@/components/atoms/DynamicTable";
import SectionCard from "./SectionCard";
import { UserCheck, Shield } from "lucide-react";

type Props = {
  flag?: string | null;
};

const References: React.FC<Props> = ({ flag }) => {
  const user = useCurrentUser();
  const { formData, setFormData } = useFormData();
  const [tableData, setTableData] = useState<any[]>(
    Array.isArray(formData.References) && formData.References.length
      ? formData.References
      : [{}]
  );
  const [tableData2, setTableData2] = useState<any[]>(
    Array.isArray(formData.EmpNominee) && formData.EmpNominee.length
      ? formData.EmpNominee
      : [{}]
  );

  const [flageData, setflageDataData] = useState<boolean>(false);

  useEffect(() => {
    if (flag === "true") {
      setflageDataData(false);
    } else {
      setflageDataData(true);
    }
  }, [flag]);

  useEffect(() => {
    setFormData((prevData: any) => {
      const updatedTableData = tableData.map((item) => ({
        ...item,
        Loc_Code: (user as any)?.branch,
        Emp_Code: (user as any)?.EMPCODE,
      }));
      return {
        ...prevData,
        References: updatedTableData,
      };
    });
  }, [tableData, (user as any)?.branch, (user as any)?.EMPCODE, setFormData]);

  useEffect(() => {
    setFormData((prevData: any) => {
      const updatedTableData2 = tableData2.map((item) => ({
        ...item,
        Loc_Code: (user as any)?.branch,
        Emp_Code: (user as any)?.EMPCODE,
      }));
      return {
        ...prevData,
        EmpNominee: updatedTableData2,
      };
    });
  }, [tableData2, (user as any)?.branch, (user as any)?.EMPCODE, setFormData]);

  // Columns for Employee References
  const columnsShow1 = [
    "Reference Name",
    "Occupation",
    "Address",
    "Mobile",
    "Email",
    "Relation",
  ];
  const columns1 = [
    "Emp_Ref_Name",
    "Emp_Ref_Occup",
    "Emp_Ref_Address",
    "Emp_Ref_Mobile",
    "Emp_Ref_emailid",
    "Emp_Ref_relation",
  ];
  const constraints1 = {
    Emp_Ref_Name: { type: "TEXT", max: 30 },
    Emp_Ref_Occup: { type: "TEXT", max: 30 },
    Emp_Ref_Address: { type: "TEXT", max: 50 },
    Emp_Ref_Mobile: { type: "NUMBER", max: 10 },
    Emp_Ref_emailid: { type: "TEXT", max: 40 },
    Emp_Ref_relation: { type: "TEXT", max: 30 },
  };

  // Columns for Nominee Details
  const columnsShow3 = [
    "Relation",
    "Nominee Name",
    "Member Name",
    "Percentage",
    "Is Minor",
  ];
  const columns3 = [
    "Relation",
    "Nominee_Name",
    "Member_Name",
    "Percentage",
    "Is_Minor",
  ];
  const constraints3 = {
    Relation: { type: "TEXT", required: true, max: 50 },
    Nominee_Name: { type: "TEXT", required: true, max: 50 },
    Member_Name: { type: "TEXT", max: 50 },
    Percentage: { type: "NUMBER", max: 3 },
    Is_Minor: { type: "TEXT", max: 10 },
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. Candidate References */}
      <SectionCard
        title="Candidate Professional References"
        icon={<UserCheck size={18} />}
        bodyClassName="p-0"
      >
        <div className="w-full overflow-x-auto">
          <TableComponent
            columns={columns1}
            columnsShow={columnsShow1}
            tableData={tableData}
            setTableData={setTableData}
            constraints={constraints1}
            disabledProp={flageData}
            AddBtn={!flageData}
            AddBtnText="Add Reference"
          />
        </div>
      </SectionCard>

      {/* 2. Nominee Details */}
      <SectionCard
        title="Nominee / Beneficiary Details"
        icon={<Shield size={18} />}
        bodyClassName="p-0"
      >
        <div className="w-full overflow-x-auto">
          <TableComponent
            columns={columns3}
            columnsShow={columnsShow3}
            tableData={tableData2}
            setTableData={setTableData2}
            constraints={constraints3}
            disabledProp={flageData}
            AddBtn={!flageData}
            AddBtnText="Add Nominee"
          />
        </div>
      </SectionCard>
    </div>
  );
};

export default References;
