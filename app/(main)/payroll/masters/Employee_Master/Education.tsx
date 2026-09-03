/* eslint-disable react/jsx-key */
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useFormData } from "./Context/FormDataContext";
import TableComponent from "@/components/atoms/DynamicTable";
import YNDynamicTable from "@/components/atoms/YNDynamicTable";
import CertificatesUpload from "@/components/atoms/CertificateUpload";

interface RowData1 {
  Emp_Degree: string;
  Emp_Board: string;
  Emp_College: string;
  Emp_Passing_year: string;
  Emp_Percentage: string;
}
interface RowData2 {
  Emp_Tool: string;
  Emp_Version: string;
  Emp_Proficiency: string;
  Emp_Last_Used: string;
  Emp_Experience: string;
}
interface RowData3 {
  Emp_Language: string;
  Emp_Language_Understand: string;
  Emp_Language_Speak: string;
  Emp_Language_Read: string;
  Emp_Language_Write: string;
}

const columnsShow = [
  "Degree/Certification",
  "Board/University",
  "School/College",
  "Year of passing",
  "Percentage/CGPA",
];
const columns = [
  "Emp_Degree",
  "Emp_Board",
  "Emp_College",
  "Emp_Passing_year",
  "Emp_Percentage",
];

const constraints = {
  Emp_Degree: { type: "TEXT", required: true, max: 30 },
  Emp_Board: { type: "TEXT", max: 30 },
  Emp_College: { type: "TEXT", max: 30 },
  Emp_Passing_year: { type: "NUMBER", max: 4 },
  Emp_Percentage: { type: "NUMBER", max: 5 },
};

const columnsShow1 = [
  "Technology/Tools",
  "Version",
  "Proficiency level",
  "Last Used",
  "Experience (Year)",
];
const columns1 = [
  "Emp_Tool",
  "Emp_Version",
  "Emp_Proficiency",
  "Emp_Last_Used",
  "Emp_Experience",
];

const constraints1 = {
  Emp_Tool: { type: "TEXT", required: true, max: 30 },
  Emp_Version: { type: "TEXT", max: 30 },
  Emp_Proficiency: { type: "TEXT", max: 30 },
  Emp_Last_Used: { type: "NUMBER", max: 4 },
  Emp_Experience: { type: "TEXT", max: 9 },
};

const columnsShow2 = [
  "Language",
  "Understand",
  "Speak (Yes/No)",
  "Read (Yes/No) ",
  "Write (Yes/No)",
];
const columns2 = [
  "Emp_Language",
  "Emp_Language_Understand",
  "Emp_Language_Speak",
  "Emp_Language_Read",
  "Emp_Language_Write",
];

const constraints2 = {
  Emp_Language: { type: "TEXT", required: true, max: 30 },
  Emp_Language_Understand: { type: "TEXT", max: 30 },
  Emp_Language_Speak: { type: "TEXT", max: 30 },
  Emp_Language_Read: { type: "TEXT", max: 30 },
  Emp_Language_Write: { type: "TEXT", max: 30 },
};

// ------- Icons (UI only) -------
function IconEducation(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M12 3L1 9L12 15L23 9L12 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M5 11V16C5 16 8 19 12 19C16 19 19 16 19 16V11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconTools(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M14.7 6.3C14.3 4.4 12.6 3 10.6 3C8.3 3 6.4 4.9 6.4 7.2C6.4 9.2 7.8 10.9 9.7 11.3L3 18V21H6L12.7 14.3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M16 10L21 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconLanguage(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M4 5H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 9H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 19H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M14 21C16.5 18.5 18 15.5 18 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M18 12C18 8.5 16.5 5.5 14 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M20 21L16 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ------- UI Wrapper (no functionality change) -------
function SectionCard({
  title,
  icon,
  children,
  cardRef,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  cardRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={cardRef as any}
      className="bg-white dark:bg-black rounded-xl border border-[#E4E7EC] dark:border-[#344054] shadow-[0_1px_2px_rgba(16,24,40,0.06)] overflow-hidden"
    >
      <div className="flex items-center gap-3 px-6 py-4 bg-[#F9FAFB] dark:bg-[#0B1220] border-b border-[#EAECF0] dark:border-[#344054]">
        <span className="text-[#5B5EF7]">{icon}</span>
        <div className="text-[14px] font-semibold tracking-[0.12em] text-[#101828] dark:text-white uppercase">
          {title}
        </div>
      </div>

      <div className="w-full overflow-x-auto">{children}</div>
    </div>
  );
}

const YourComponent: React.FC = () => {
  const { formData, setFormData } = useFormData();

  const [tableData, setTableData] = useState(formData.EmpEdu || [{}]);
  const [tableData1, setTableData1] = useState(formData.EmpItSkill || [{}]);
  const [tableData2, setTableData2] = useState(formData.EmpLang || [{}]);
  const [certificates, setCertificates] = useState<any>(formData.EmpCertificates || {});

  useEffect(() => {
    setFormData((prevData: any) => ({ ...prevData, EmpEdu: tableData }));
  }, [tableData]);

  useEffect(() => {
    setFormData((prevData: any) => ({ ...prevData, EmpItSkill: tableData1 }));
  }, [tableData1]);

  useEffect(() => {
    setFormData((prevData: any) => ({ ...prevData, EmpLang: tableData2 }));
  }, [tableData2]);

  useEffect(() => {
    setFormData((prevData: any) => ({ ...prevData, EmpCertificates: certificates }));
  }, [certificates]);

  // ✅ Language auto-scroll (UI only)
  const languagesCardRef = useRef<HTMLDivElement | null>(null);
  const languagesScrollWrapRef = useRef<HTMLDivElement | null>(null);
  const prevLangLenRef = useRef<number>(Array.isArray(tableData2) ? tableData2.length : 0);
  const langLen = Array.isArray(tableData2) ? tableData2.length : 0;

  useEffect(() => {
    if (langLen > prevLangLenRef.current) {
      languagesCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

      requestAnimationFrame(() => {
        const wrap = languagesScrollWrapRef.current;
        if (wrap) wrap.scrollTo({ top: wrap.scrollHeight, behavior: "smooth" });
      });
    }
    prevLangLenRef.current = langLen;
  }, [langLen]);

  return (
    <div className="w-full bg-[#F6F8FC] dark:bg-[#0B1220]">
      {/* ✅ SCROLL FIX: parent-height based scroll container (no extra functional changes) */}
      <div
        className="w-full h-full min-h-0 overflow-y-auto"
        style={{
          // header/topbar ki height agar different ho to 90px change kar dena
          maxHeight: "calc(100vh - 200px)",
        }}
      >
        <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 py-6 pb-28 min-h-0">
          <div className="space-y-6 min-h-0">
            <SectionCard title="EDUCATION" icon={<IconEducation />}>
              <TableComponent
                columns={columns}
                tableData={tableData}
                setTableData={setTableData}
                constraints={constraints}
                columnsShow={columnsShow}
                AddBtn={true}
              />
            </SectionCard>

            <SectionCard title="TECHNOLOGY / TOOLS" icon={<IconTools />}>
              <TableComponent
                columns={columns1}
                tableData={tableData1}
                setTableData={setTableData1}
                constraints={constraints1}
                columnsShow={columnsShow1}
                AddBtn={true}
              />
            </SectionCard>

            <SectionCard title="LANGUAGES" icon={<IconLanguage />} cardRef={languagesCardRef}>
              <div ref={languagesScrollWrapRef} className="max-h-[320px] overflow-y-auto">
                <YNDynamicTable
                  columns={columns2}
                  tableData={tableData2}
                  setTableData={setTableData2}
                  constraints={constraints2}
                  columnsShow={columnsShow2}
                />
              </div>
            </SectionCard>

            {/* ✅ CERTIFICATES */}
            <CertificatesUpload value={certificates} onChange={setCertificates} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default YourComponent;