"use client"; 
import Einput from "@/components/atoms/Einput";
import ATextArea from "@/components/atoms/textArea";
import React, { useState } from "react";
import { useFormData } from "./Context/FormDataContext";
import Eselect from "@/components/atoms/Eselect";
import Image from "next/image";
import FileViewer from "@/components/atoms/Fileviewer";

function Separation({ masterData }) {
  console.log(masterData, "masterData")
  const { formData, setFormData } = useFormData();

  const [Notice_Period_opt, setNotice_Period_opt] = useState(masterData.Notice_Period || []);
  const [Sepration_Mode_opt, setSepration_Mode_opt] = useState(masterData.Sepration_Mode || []);
  const [Exit_Interview_opt, setExit_Interview_opt] = useState(masterData.Exit_Interview || []);
  const [Resigned_Status_opt, setResigned_Status_opt] = useState(masterData.Resigned_Status || []);
  const [Sepration_Cat_opt, setSepration_Cat_opt] = useState(masterData.Sepration_Cat || []);

  const handleSelectChange = (name: any, selectedOption: any) => {
    const value = selectedOption;
    setFormData((prevData) => ({
      ...prevData,
      EmpMst: {
        ...prevData.EmpMst,
        [name]: value,
      },
    }));
    console.log(formData, "bnext");
  };

  const handleInputChange = (name, value) => {
    setFormData((prevData) => ({
      ...prevData,
      EmpMst: {
        ...prevData.EmpMst,
        [name]: value,
      },
    }));

    console.log(formData, "bnext");
  };




  //ADD CODE 


  const [filePreviews, setFilePreviews] = useState({});

  const uploadFields = [
    "Separation1",      // index 0
    "Separation2",        // index 1
  ];
  const getUploadLabel = (fieldName: string) => {
    switch (fieldName) {
      case "Separation1":
        return "Upload Separation1 Image";
      case "Separation2":
        return "Upload Separation2 Image";

    }
  };


  const handleFileChange = (event, type) => {
    const file = event.target.files[0];
    if (
      file &&
      (file.type.startsWith("image/") || file.type === "application/pdf")
    ) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target.result;

        // Set preview
        setFilePreviews((prev) => ({
          ...prev,
          [type]: src,
        }));
        console.log(file, "file", type, "type")
        // Set file in formData
        setFormData((prevData) => ({
          ...prevData,
          EmpMst: {
            ...prevData.EmpMst,
            [type]: file,
          },
        }));
      };
      reader.readAsDataURL(file);
    } else {
      // Reset preview
      setFilePreviews((prev) => ({
        ...prev,
        [type]: null,
      }));
    }
  };




  return (
    <div className="grid grid-cols-12">
      <div className="col-span-12 ">
        <div className="">

          <div className="grid grid-cols-12 gap-3">

            <div className="col-span-12 xl:col-span-6 w-full ">

              <div className="col-span-12 md:col-span-12 rounded-t bg-[#193A69] dark:bg-black px-3 py-2 border dark:border-[#D0D5DD]">
                <h1 className="text-white dark:text-[#37a9dd] uppercase font-semibold text-sm">
                  Resignation Details
                </h1>
              </div>


              <div className="w-full  gap-3 p-4 mt-2 bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow"> {/* ye se bg ko remove kiya h  */}
                <div className="grid grid-cols-12">
                  <div className="col-span-12 sm:col-span-6">
                    <div className="p-1">
                      <Einput
                        type="date"
                        title="Resignation Submission Date:"
                        name="RESIGNATION_SUBMISSION_DATE"
                        value={formData.EmpMst.RESIGNATION_SUBMISSION_DATE}
                        handleInputChange={handleInputChange}
                      />
                    </div>


                  </div>
                  <div className="col-span-12 sm:col-span-6">
                    {/* <div className="p-1">
                      <Einput
                        type="text"
                        title="Notice Period:"
                        name="NOTICEPERIOD"
                        value={formData.EmpMst.NOTICEPERIOD}
                        handleInputChange={handleInputChange}
                      />
                    </div> */}

                    <div className="p-1">
                      <Eselect
                        title="Notice Period:"
                        name="NOTICEPERIOD"
                        option={Notice_Period_opt}
                        handleInputChange={handleInputChange}
                        initialValue={formData.EmpMst.NOTICEPERIOD}
                      />
                    </div>
                  </div>
                  <div className="col-span-12 mt-1">
                    <div className="p-1">
                      <ATextArea
                        title="Reason for Resignation"
                        name="REASON_FOR_RESIGNATION"
                        handleInputChange={handleInputChange}
                        value={formData.EmpMst.REASON_FOR_RESIGNATION}
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-6">
                    <div className="p-1">
                      <Einput
                        value={formData.EmpMst.NOTICEPERIOD}
                        type="text"
                        title="Shortfall in Notice Period:"
                        name="NOTICEPERIOD"
                        handleInputChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-6">
                    <div className="p-1 flex">
                      <Einput
                        title="Tentative Leaving Date"
                        name="TEN_LEAVE_DATE"
                        type="date"
                        handleInputChange={handleInputChange}
                        value={formData.EmpMst.TEN_LEAVE_DATE}

                      />
                    </div>
                  </div>

                  <div className="col-span-12">
                    <div className="p-1">
                      <ATextArea
                        handleInputChange={handleInputChange}
                        title="Remarks:"
                        name="SEPERATIONREMARKS"
                        value={formData.EmpMst.SEPERATIONREMARKS}
                        max="500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-12 xl:col-span-6  w-full">
              <div className=" col-span-12 md:col-span-12 rounded-t bg-[#193A69] dark:bg-black px-3 py-2 border dark:border-[#D0D5DD]">
                <h1 className="text-white dark:text-[#37a9dd] uppercase font-semibold text-sm">
                  Exit Interview
                </h1>
              </div>
              <div className="gap-3 p-4 mt-2  bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow">
                <div className="grid grid-cols-12">
                  <div className="col-span-12 sm:col-span-6">
                    <div className="p-1">
                      <Eselect
                        title="Separation Mode:"
                        name="SEPARATION_MODE"
                        option={Sepration_Mode_opt}
                        handleInputChange={handleInputChange}
                        initialValue={formData.EmpMst.SEPARATION_MODE}
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-6">
                    <div className="p-1">
                      <Eselect
                        title="Exit Interview Done:"
                        name="ExitInterview_Done"
                        handleInputChange={handleInputChange}
                        option={Exit_Interview_opt}
                        initialValue={formData.EmpMst.ExitInterview_Done}
                      />
                    </div>
                  </div>

                  {/* //start add new  */}
                  <div className="col-span-12 sm:col-span-6">
                    <div className="p-1">
                      <Eselect
                        title="RESIGNED STATUS:"
                        name="RESIGNED_STATUS"
                        option={Resigned_Status_opt}
                        handleInputChange={handleInputChange}
                        initialValue={formData.EmpMst.RESIGNED_STATUS}
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-6">
                    <div className="p-1">
                      <Eselect
                        title="Categaory:"
                        name="SEPRATION_CATE"
                        handleInputChange={handleInputChange}
                        option={Sepration_Cat_opt}
                        initialValue={formData.EmpMst.SEPRATION_CATE}
                      />
                    </div>
                  </div>
                  {/* //end add new  */}




                  <div className="col-span-12 sm:col-span-6">
                    <div className="p-1">
                      <Einput
                        type="date"
                        title="Last Working Date:"
                        name="LASTWOR_DATE"
                        value={formData.EmpMst.LASTWOR_DATE?.slice(0, 10) || ""}
                        handleInputChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-6 ">
                    <div className="p-1">
                      <Einput
                        title="Date of Exit Interview:"
                        name="DATE_OF_EXIT_INTERVIEW"
                        type="date"
                        handleInputChange={handleInputChange}
                        value={formData.EmpMst.DATE_OF_EXIT_INTERVIEW}

                      />
                    </div>
                  </div>
                  <div className="col-span-6 mt-1 sm:col-span-6">
                    <div className="p-1">
                      <Einput
                        title="Date of Settlement:"
                        name="DATE_OF_SETTLEMENT"
                        type="date"
                        handleInputChange={handleInputChange}
                        value={formData.EmpMst.DATE_OF_SETTLEMENT}

                      />
                    </div>
                  </div>
                  {/* <div className="col-span-6 mt-6">
                    <div className="p-1">
                      <Button variant={"outline"} type="submit" size={"sm"}>
                        generate otp
                      </Button>
                    </div>
                  </div> */}
                  <div className="col-span-12">
                    <div className="p-1">
                      <ATextArea
                        title="Exit Interview Remarks"
                        name="INTERVIEWREMAKS"
                        handleInputChange={handleInputChange}
                        value={formData.EmpMst.INTERVIEWREMAKS}
                        max="500"

                      />
                    </div>
                  </div>
                </div>


              </div>


            </div>






          </div>
        </div>





        {/*START ADD IMAGE FOR SEPARATION  */}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 bg-slate-300  gap-x-3  mt-3.5 mb-2">
          {uploadFields.map((fieldName, index) => (
            <div
              key={index}
              className=" p-4  bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow "
            >
              <label className="flex w-full h-40 sm:h-48 md:h-56 lg:h-64 xl:h-72 items-center justify-center rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                {!filePreviews[fieldName] && !formData.EmpMst[fieldName] ? (
                  <span className="text-gray-500 dark:text-gray-400 flex flex-col items-center gap-2">
                    <svg
                      className="w-6 h-6 text-gray-800 dark:text-white"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12 3c.3 0 .6.1.8.4l4 5a1 1 0 1 1-1.6 1.2L13 7v7a1 1 0 1 1-2 0V6.9L8.8 9.6a1 1 0 1 1-1.6-1.2l4-5c.2-.3.5-.4.8-.4ZM9 14v-1H5a2 2 0 0 0-2 2v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-4v1a3 3 0 1 1-6 0Zm8 2a1 1 0 1 0 0 2 1 1 0 1 0 0-2Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-center px-2">
                      {getUploadLabel(fieldName)}
                    </span>
                  </span>
                ) : fieldName === "otherpdf" ||
                  filePreviews[fieldName]?.includes("pdf") ||
                  (typeof formData?.EmpMst[fieldName] === "string" &&
                    formData.EmpMst[fieldName].includes(".pdf")) ? (
                  <iframe
                    src={filePreviews[fieldName] || formData.EmpMst[fieldName]}
                    className="w-full h-full rounded-lg"
                    title={`PDF Preview - ${fieldName}`}
                  ></iframe>
                ) : (
                  <Image
                    width={80}
                    height={80}
                    src={filePreviews[fieldName] || formData.EmpMst[fieldName]}
                    alt={`Uploaded ${fieldName}`}
                    className="w-full h-full object-fill rounded-lg"
                  />
                )}
                <input
                  type="file"
                  className="hidden"
                  name={fieldName}
                  accept={
                    fieldName === "otherpdf"
                      ? "application/pdf"
                      : "image/png, image/jpeg, image/jpg, application/pdf"
                  }
                  onChange={(event) => handleFileChange(event, fieldName)}
                />
              </label>
              <FileViewer
                fileLink={filePreviews[fieldName] || formData.EmpMst[fieldName]}
                celldata={""}
              />
            </div>
          ))}
        </div>

        {/*END ADD IMAGE FOR SEPARATION  */}
      </div>
    </div>
  );
}

export default Separation;
