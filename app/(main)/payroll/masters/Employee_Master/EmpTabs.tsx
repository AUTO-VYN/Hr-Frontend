"use client";
import React, { MouseEventHandler, useMemo, useState } from "react";
import Page1 from "./Page1";
import Page2 from "./Page2";
import SalaryDetails from "./SalaryDetails";
import Education from "./Education";
import Separation from "./Separation";
import Others from "./Others";
import EmployeeAcc from "./EmployeeAcc";
import Asset from "./Asset";
import Docupload from "./DocUpload";
import WorkDetails from "./WorkDetails";
import { useCurrentUser } from "@/app/hooks/use-current-user";
import{button} from "@/components/ui/button";

type EmpTabsProps = {
  masterData: any;
  formData: any;
  onOpenDialog: any;
  documentData: any;
  setDocumentData: any;
  onAadharVerified: any;
  isMandatory: any;

  activeTab?: number; // 1..10
  onTabChange?: (tabNo: number) => void;
  hideTabList?: boolean; // true => blue bar hide
};

const EmpTabs = ({
  masterData,
  formData,
  onOpenDialog,
  documentData,
  setDocumentData,
  onAadharVerified,
  isMandatory,

  activeTab: controlledActiveTab,
  onTabChange,
  hideTabList = false,
}: EmpTabsProps) => {
  const user = useCurrentUser();

  const firstAllowedTab = useMemo(() => {
    const role1 = user?.role1 || "";
    if (role1.includes("1.1.4")) return 1;
    if (role1.includes("1.1.5")) return 2;
    if (role1.includes("1.1.12")) return 3;
    if (role1.includes("1.1.6")) return 4;
    if (role1.includes("1.1.7")) return 5;
    if (role1.includes("1.1.8")) return 6;
    if (role1.includes("1.1.9")) return 7;
    if (role1.includes("1.2.1")) return 8;
    if (role1.includes("1.1.10")) return 9;
    if (role1.includes("1.1.11")) return 10;
    return 1;
  }, [user?.role1]);

  const [internalTab, setInternalTab] = useState<number>(firstAllowedTab);

  const activeTab =
    typeof controlledActiveTab === "number" ? controlledActiveTab : internalTab;

  const disableSalaryTab = formData?.EmpMst?.EmpType == "3";

  const handleTabClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    const tabNumber = parseInt(event.currentTarget.dataset.tabNumber || "1");

    if (tabNumber === 3 && disableSalaryTab) return;

    if (onTabChange) {
      onTabChange(tabNumber);
      return;
    }

    setInternalTab(tabNumber);
  };

  // ✅ Employee Identity (tab 2 / Page2) still uses its own light+thin scroll wrapper
  const employeeIdentityScroll =
    "h-[calc(100vh-220px)] overflow-y-auto overflow-x-hidden pr-2 scrollbar-thin scrollbar-thumb-zinc-300 scrollbar-track-zinc-50 hover:scrollbar-thumb-zinc-400 dark:scrollbar-thumb-zinc-600 dark:scrollbar-track-zinc-900";

  return (
    <div className="">
      <div className="w-full">
        {!hideTabList && (
          <div className="my-3 rounded-lg bg-[#193A69] dark:bg-black dark:text-white border border-[#b5bfcb] dark:border-[#D0D5DD] p-1 px-3 ">
            <div className="flex overflow-x-scroll xl:overflow-x-hidden justify-between gap-x-3">
              {user?.role1.includes("1.1.4") && (
                <button
                  className={`px-2 py-1 text-base mt-1 mb-1 font-semibold capitalize rounded whitespace-nowrap transition duration-300 ease-in-out transform hover:-translate-y-0.2 shadow hover:shadow-dark ${
                    activeTab === 1 ? "bg-white text-[#193A69]" : "text-white dark:text-white"
                  }`}
                  data-tab-number="1"
                  onClick={handleTabClick}
                >
                  Basic Info
                </button>
              )}

              {user?.role1.includes("1.1.5") && (
                <button
                  className={`px-2 py-1 text-base mt-1 mb-1 font-semibold capitalize rounded whitespace-nowrap transition duration-300 ease-in-out transform hover:-translate-y-0.2 shadow hover:shadow-dark ${
                    activeTab === 2 ? "bg-white text-[#193A69]" : "text-white dark:text-white"
                  }`}
                  data-tab-number="2"
                  onClick={handleTabClick}
                >
                  Personal Info
                </button>
              )}

              {user?.role1.includes("1.1.12") && (
                <button
                  className={`px-2 py-1 text-base mt-1 mb-1 font-semibold capitalize rounded whitespace-nowrap transition duration-300 ease-in-out transform hover:-translate-y-0.2 shadow hover:shadow-dark ${
                    activeTab === 3 ? "bg-white text-[#193A69]" : "text-white dark:text-white"
                  } ${disableSalaryTab ? "opacity-50 cursor-not-allowed" : ""}`}
                  data-tab-number="3"
                  onClick={handleTabClick}
                >
                  Salary Details
                </button>
              )}

              {user?.role1.includes("1.1.6") && (
                <button
                  className={`px-2 py-1 text-base mt-1 mb-1 font-semibold capitalize rounded whitespace-nowrap transition duration-300 ease-in-out transform hover:-translate-y-0.2 shadow hover:shadow-dark ${
                    activeTab === 4 ? "bg-white text-[#193A69]" : "text-white dark:text-white"
                  }`}
                  data-tab-number="4"
                  onClick={handleTabClick}
                >
                  Education/Skills
                </button>
              )}

              {user?.role1.includes("1.1.11") && (
                <button
                  className={`px-2 py-1 text-base mt-1 mb-1 font-semibold capitalize rounded whitespace-nowrap transition duration-300 ease-in-out transform hover:-translate-y-0.2 shadow hover:shadow-dark ${
                    activeTab === 10 ? "bg-white text-[#193A69]" : "text-white dark:text-white"
                  }`}
                  data-tab-number="10"
                  onClick={handleTabClick}
                >
                  Work Details
                </button>
              )}

              {user?.role1.includes("1.1.9") && (
                <button
                  className={`px-2 py-1 text-base mt-1 mb-1 font-semibold capitalize rounded whitespace-nowrap transition duration-300 ease-in-out transform hover:-translate-y-0.2 shadow hover:shadow-dark ${
                    activeTab === 7 ? "bg-white text-[#193A69]" : "text-white dark:text-white"
                  }`}
                  data-tab-number="7"
                  onClick={handleTabClick}
                >
                  Mobile App Access
                </button>
              )}

              {user?.role1.includes("1.2.1") && (
                <button
                  className={`px-2 py-1 text-base mt-1 mb-1 font-semibold capitalize rounded whitespace-nowrap transition duration-300 ease-in-out transform hover:-translate-y-0.2 shadow hover:shadow-dark ${
                    activeTab === 8 ? "bg-white text-[#193A69]" : "text-white dark:text-white"
                  }`}
                  data-tab-number="8"
                  onClick={handleTabClick}
                >
                  Asset Issue
                </button>
              )}

              {user?.role1.includes("1.1.10") && (
                <button
                  className={`px-2 py-1 text-base mt-1 mb-1 font-semibold capitalize rounded whitespace-nowrap transition duration-300 ease-in-out transform hover:-translate-y-0.2 shadow hover:shadow-dark ${
                    activeTab === 9 ? "bg-white text-[#193A69]" : "text-white dark:text-white"
                  }`}
                  data-tab-number="9"
                  onClick={handleTabClick}
                >
                  Doc Upload
                </button>
              )}

              {user?.role1.includes("1.1.8") && (
                <button
                  className={`px-2 py-1 text-base mt-1 mb-1 font-semibold capitalize rounded whitespace-nowrap transition duration-300 ease-in-out transform hover:-translate-y-0.2 shadow hover:shadow-dark ${
                    activeTab === 6 ? "bg-white text-[#193A69]" : "text-white dark:text-white"
                  }`}
                  data-tab-number="6"
                  onClick={handleTabClick}
                >
                  Others
                </button>
              )}

              {user?.role1.includes("1.1.7") && (
                <button
                  className={`px-2 py-1 text-base mt-1 mb-1 font-semibold capitalize rounded whitespace-nowrap transition duration-300 ease-in-out transform hover:-translate-y-0.2 shadow hover:shadow-dark ${
                    activeTab === 5 ? "bg-white text-[#193A69]" : "text-white dark:text-white"
                  }`}
                  data-tab-number="5"
                  onClick={handleTabClick}
                >
                  Separation
                </button>
              )}
            </div>
          </div>
        )}

        {/* CONTENT */}
        <div className="">
          {/* ✅ Basic Joining Detail (Tab 1) => scroll is handled INSIDE Page1 (per-card) */}
          {activeTab === 1 && (
            <Page1
              onOpenDialog={onOpenDialog}
              documentData={documentData}
              setDocumentData={setDocumentData}
              onAadharVerified={onAadharVerified}
              isMandatory={isMandatory}
            />
          )}

          {/* ✅ Employee Identity (Tab 2) => its own scroll */}
          {activeTab === 2 && (
            <div className={employeeIdentityScroll}>
              <Page2 masterData={masterData} isMandatory={isMandatory} />
            </div>
          )}

          {activeTab === 3 && (
            <SalaryDetails
              disapleForSalary={disableSalaryTab}
              isActiveTab={activeTab === 3}
              isMandatory={isMandatory}
              masterData={masterData}
            />
          )}

          {activeTab === 4 && <Education />}
          {activeTab === 5 && <Separation masterData={masterData} />}
          {activeTab === 6 && <Others masterData={masterData} isMandatory={isMandatory} />}
          {activeTab === 7 && <EmployeeAcc isMandatory={isMandatory} />}
          {activeTab === 8 && <Asset />}
          {activeTab === 9 && <Docupload />}
          {activeTab === 10 && <WorkDetails />}
        </div>
      </div>
    </div>
  );
};

export default EmpTabs;