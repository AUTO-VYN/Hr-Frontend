"use client";
import React, { MouseEventHandler, useState } from "react";
import Page1 from "./Page1";
import Page2 from "./Page2";
import Education from "./Education";
import References from "./References";
// import Separation from "./Separation";
import Others from "./Others";
// import EmployeeAcc from "./EmployeeAcc";
// import Asset from "./Asset";
import Docupload from "./DocUpload";
import WorkDetails from "./WorkDetails";
import InterviewProcess from "./InterviewProcess";

const EmpTabs = ({ cityoption, STATEoption, branch , flag ,evaluationCriteria }) => {
  const [activeTab, setActiveTab] = useState<number>(1);
  const handleTabClick: MouseEventHandler<HTMLButtonElement> = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    // Extract the tab number from the dataset if available, otherwise default to  1
    const tabNumber = parseInt(event.currentTarget.dataset.tabNumber || "1");
    setActiveTab(tabNumber);
  };

  return (
    <div className="">
      <div className="w-full">
        <div className="my-3 rounded-lg  bg-header dark:bg-black  dark:text-white border border-borderColor dark:border-borderColor-dark p-1 px-3">
          <div className="flex overflow-x-scroll xl:overflow-x-hidden justify-between gap-x-3">
            <button
             className={` px-2 py-1 text-base mt-1 mb-1 font-semibold capitalize rounded whitespace-nowrap transition duration-300 ease-in-out transform hover:-translate-y-0.2 shadow  hover:shadow-dark  ${
                  activeTab === 1
                    ? "bg-white text-[#193A69]"
                    : "text-white dark:text-white"
                }`}
              data-tab-number="1"
              onClick={handleTabClick}
            >
              {/* Basic Info */}
              Doc Upload
            </button>
            <button
              className={` px-2 py-1 text-base mt-1 mb-1 font-semibold capitalize rounded whitespace-nowrap transition duration-300 ease-in-out transform hover:-translate-y-0.2 shadow  hover:shadow-dark  ${
                  activeTab === 2
                    ? "bg-white text-[#193A69]"
                    : "text-white dark:text-white"
                }`}
              data-tab-number="2"
              onClick={handleTabClick}
            >
              {/* Personal Info */}
              interview process
            </button>
            <button
             className={` px-2 py-1 text-base mt-1 mb-1 font-semibold capitalize rounded whitespace-nowrap transition duration-300 ease-in-out transform hover:-translate-y-0.2 shadow  hover:shadow-dark  ${
                  activeTab === 3
                    ? "bg-white text-[#193A69]"
                    : "text-white dark:text-white"
                }`}
              data-tab-number="3"
              onClick={handleTabClick}
            >
              {/* interview process */}
              Basic Info
            </button>
            <button
              className={` px-2 py-1 text-base mt-1 mb-1 font-semibold capitalize rounded whitespace-nowrap transition duration-300 ease-in-out transform hover:-translate-y-0.2 shadow  hover:shadow-dark  ${
                  activeTab === 4
                    ? "bg-white text-[#193A69]"
                    : "text-white dark:text-white"
                }`}
              data-tab-number="4"
              onClick={handleTabClick}
            >
              {/* Education/Skills */}
              Personal Info
            </button>

            <button
              className={` px-2 py-1 text-base mt-1 mb-1 font-semibold capitalize rounded whitespace-nowrap transition duration-300 ease-in-out transform hover:-translate-y-0.2 shadow  hover:shadow-dark  ${
                  activeTab === 6
                    ? "bg-white text-[#193A69]"
                    : "text-white dark:text-white"
                }`}
              data-tab-number="6"
              onClick={handleTabClick}
            >
              {/* Others */}
              Work Details
            </button>

            <button
              className={` px-2 py-1 text-base mt-1 mb-1 font-semibold capitalize rounded whitespace-nowrap transition duration-300 ease-in-out transform hover:-translate-y-0.2 shadow  hover:shadow-dark  ${
                  activeTab === 9
                    ? "bg-white text-[#193A69]"
                    : "text-white dark:text-white"
                }`}
              data-tab-number="9"
              onClick={handleTabClick}
            >
              {/* Doc Upload */}
              Education/Skills
            </button>
            <button
              className={` px-2 py-1 text-base mt-1 mb-1 font-semibold capitalize rounded whitespace-nowrap transition duration-300 ease-in-out transform hover:-translate-y-0.2 shadow  hover:shadow-dark  ${
                  activeTab === 10
                    ? "bg-white text-[#193A69]"
                    : "text-white dark:text-white"
                }`}
              data-tab-number="10"
              onClick={handleTabClick}
            >
              {/* Work Details */}
              References
            </button>
            <button
             className={` px-2 py-1 text-base mt-1 mb-1 font-semibold capitalize rounded whitespace-nowrap transition duration-300 ease-in-out transform hover:-translate-y-0.2 shadow  hover:shadow-dark  ${
                  activeTab === 11
                    ? "bg-white text-[#193A69]"
                    : "text-white dark:text-white"
                }`}
              data-tab-number="11"
              onClick={handleTabClick}
            >
              {/* Work Details */}
              Others
            </button>
          </div>
        </div>
        <div className="">
          {activeTab === 1 && <Docupload flag={flag}  />}
          {activeTab === 2 && <InterviewProcess flag={flag} evaluationCriteria={evaluationCriteria} />}
          {activeTab === 3 && <Page1 flag={flag}  />}
          {activeTab === 4 && <Page2 cityoption={cityoption} STATEoption={STATEoption}  flag={flag}  />}
          {activeTab === 6 && <WorkDetails  flag={flag}  />}
          {activeTab === 9 && <Education flag={flag}  />}
          {activeTab === 10 && <References  flag={flag} />}
          {activeTab === 11 && <Others cityoption={cityoption} branch={branch} flag={flag}  />}
        </div>
      </div>
    </div>
  );
};

export default EmpTabs;
