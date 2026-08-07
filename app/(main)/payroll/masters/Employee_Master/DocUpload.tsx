import Image from "next/image";
import React, { useState } from "react";
import { useFormData } from "./Context/FormDataContext";
import FileViewer from "@/components/atoms/Fileviewer";
import Swal from "sweetalert2";
import { useToast } from "@/app/hooks/useToast";

function showSideAlert(message: any, type: any) {
  const Toast = Swal.mixin({
    toast: true,
    position: "bottom-end",
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

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  if (!bytes) return '';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const Docupload = () => {
  const { formData, setFormData } = useFormData();
  const [filePreviews, setFilePreviews] = useState({});
  const [fileSizes, setFileSizes] = useState({});
  const { toast } = useToast();

  const handleFileChange = (event, type) => {
    const file = event.target.files[0];
    if (
      file &&
      (file.type.startsWith("image/") || file.type === "application/pdf")
    ) {
      const reader = new FileReader();

      // Store file size
      setFileSizes((prev) => ({
        ...prev,
        [type]: file.size,
      }));

      reader.onload = (e) => {
        const src = e.target.result;

        // Set preview
        setFilePreviews((prev) => ({
          ...prev,
          [type]: src,
        }));

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
      // Reset preview and size
      setFilePreviews((prev) => ({
        ...prev,
        [type]: null,
      }));
      setFileSizes((prev) => ({
        ...prev,
        [type]: null,
      }));
    }
  };

  const uploadFields = [
    "adhar",      // index 0
    "pan",        // index 1
    "salary",     // index 2
    "other1",     // index 3
    "other2",     // index 4
    "other3",     // index 5
    "other4",     // index 6
    "otherpdf",   // optional; not mapped from backend
  ];

  const getUploadLabel = (fieldName: string) => {
    switch (fieldName) {
      case "adhar":
        return "Upload Aadhar Image";
      case "pan":
        return "Upload PAN Image";
      case "salary":
        return "Upload Salary Slip";
      case "otherpdf":
        return "Upload PDF Document";
      default:
        return "Upload Document";
    }
  };


  console.log("formData.EmpMst", formData.EmpMst);
  console.log("Image fields preview", uploadFields.map(f => ({ [f]: formData.EmpMst?.[f] })));
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 bg-slate-300 gap-x-3">
      {uploadFields.map((fieldName, index) => (
        <div
          key={index}
          className=" bg-white dark:bg-black border border-[#b5bfcb] dark:border-[#D0D5DD] rounded-b shadow mb-3"
        >
          <label className="flex w-full h-40 sm:h-48 md:h-56 lg:h-64 xl:h-72 items-center justify-center rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600 relative">
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

            {/* File size indicator */}
            {(fileSizes[fieldName] || formData.EmpMst[fieldName]?.size) && (
              <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full">
                {formatFileSize(fileSizes[fieldName] || formData.EmpMst[fieldName]?.size)}
              </div>
            )}
            <input
              type="file"
              className="hidden"
              name={fieldName}
              accept={
                fieldName === "otherpdf"
                  ? "application/pdf"
                  : "image/png, image/jpeg, image/jpg"
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
  );
};

export default Docupload;
