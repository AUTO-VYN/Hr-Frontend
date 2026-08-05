"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import Image from "next/image";
import { FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/app/hooks/useToast";

type ReleaseRow = {
  module_name?: string;
  release_date?: string;
  description?: string;
  solution?: string;
  benefit?: string;
  images?: string[] | string;
};

type ReleaseData = {
  web: ReleaseRow[];
  mobile: ReleaseRow[];
};

export default function ReleaseNotesDialog() {
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [data, setData] = useState<ReleaseData>({ web: [], mobile: [] });
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<"web" | "mobile">("web");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNote, setSelectedNote] = useState<ReleaseRow | null>(null);

  // ✅ Use reusable toast hook
  const { toast, hideToast, warning, error } = useToast();

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadNotes = async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_URL}/users/findreleaseforlogin`,
        {},
        {
          headers: {
            compcode: process.env.NEXT_PUBLIC_SECRET_KEY_COMP_DATA,
          },
        }
      );
      setData({
        web: Array.isArray(res.data?.web) ? res.data.web : [],
        mobile: Array.isArray(res.data?.mobile) ? res.data.mobile : [],
      });
      setLoaded(true);
    } catch (err: any) {
      console.error("Release notes error:", err?.response?.data || err?.message);
      error("Failed to load release notes"); // ✅ Error toast
      setData({ web: [], mobile: [] });
    } finally {
      setLoading(false);
    }
  };

  const toggleModal = () => {
    if (!isModalOpen) loadNotes();
    setIsModalOpen(!isModalOpen);
    if (isModalOpen) setSearchTerm("");
  };

  const ModelOpenImage = () => setIsModalVisible(true);
  const handleModalOk = () => setIsModalVisible(false);

  const filterNotes = (tab: "web" | "mobile") => {
    const rows = data[tab] || [];
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter(
      (r) =>
        r.module_name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.solution?.toLowerCase().includes(q) ||
        r.benefit?.toLowerCase().includes(q)
    );
  };

  const modalContent = isModalOpen && (
    <div
      className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-[9999] p-4"
      style={{ margin: 0 }}
    >
      <div className="bg-[#193A69] rounded-lg shadow-2xl w-[74vw] max-w-[1800px] h-[92vh] flex flex-col p-6">
        <h2 className="text-3xl font-bold mb-4 text-center text-[#F3F8FC]">
          Release Notes
        </h2>

        <div className="flex justify-center space-x-6 mb-4 border-b border-b-[#959CB1] pb-2">
          <button
            className={`px-6 py-2 text-base ${
              activeTab === "web"
                ? "text-[#F3F8FC] border-b-2 border-white font-bold"
                : "text-[#959CB1]"
            }`}
            onClick={() => setActiveTab("web")}
          >
            Web
          </button>
          <button
            className={`px-6 py-2 text-base ${
              activeTab === "mobile"
                ? "text-[#F3F8FC] border-b-2 border-white font-bold"
                : "text-[#959CB1]"
            }`}
            onClick={() => setActiveTab("mobile")}
          >
            Mobile
          </button>
        </div>

        <div className="mb-3 flex justify-end">
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded-lg p-2 w-72 bg-[#325583] border-[#F3F8FC] text-[#F3F8FC] placeholder-[#F3F8FC]/60 focus:outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden branch-scroll">
          {loading ? (
            <div className="text-center text-[#F3F8FC] py-20">Loading...</div>
          ) : (
            <table className="w-full table-fixed text-left border-collapse">
              <thead className="sticky top-0 bg-[#0F2749] z-10">
                <tr>
                  <th className="px-3 py-3 w-[14%] text-[#F3F8FC] text-sm">
                    Module Name
                  </th>
                  <th className="px-3 py-3 w-[10%] text-[#F3F8FC] text-sm">
                    Date
                  </th>
                  <th className="px-3 py-3 w-[26%] text-[#F3F8FC] text-sm">
                    Problem
                  </th>
                  <th className="px-3 py-3 w-[26%] text-[#F3F8FC] text-sm">
                    Solution
                  </th>
                  <th className="px-3 py-3 w-[24%] text-[#F3F8FC] text-sm">
                    Benefit
                  </th>
                </tr>
              </thead>
              <tbody>
                {filterNotes(activeTab).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-[#F3F8FC] py-10">
                      No release notes to show.
                    </td>
                  </tr>
                ) : (
                  filterNotes(activeTab).map(
                    (note: ReleaseRow, index: number) => (
                      <tr
                        key={index}
                        className="border-t border-t-[#959CB1] hover:cursor-pointer hover:bg-[#264a80] transition"
                        onClick={() => {
                          if (
                            note.images &&
                            Array.isArray(note.images) &&
                            note.images.length > 0
                          ) {
                            setSelectedNote(note);
                            ModelOpenImage();
                          } else {
                            // ✅ Use warning toast
                            warning("No images found for this release note.");
                          }
                        }}
                      >
                        <td className="px-3 py-3 font-semibold text-[#F3F8FC] align-top text-sm break-words">
                          {note.module_name}
                        </td>
                        <td className="px-3 py-3 text-[#F3F8FC] align-top text-sm break-words">
                          {note.release_date
                            ? (() => {
                                const dateObj = new Date(note.release_date);
                                if (isNaN(dateObj.getTime())) return "";
                                return `${dateObj.getDate()} ${dateObj.toLocaleString(
                                  "default",
                                  { month: "long" }
                                )} ${dateObj.getFullYear()}`;
                              })()
                            : ""}
                        </td>
                        <td className="px-3 py-3 text-[#F3F8FC] whitespace-pre-line align-top text-sm break-words">
                          {note.description}
                        </td>
                        <td className="px-3 py-3 text-[#F3F8FC] whitespace-pre-line align-top text-sm break-words">
                          {note.solution}
                        </td>
                        <td className="px-3 py-3 text-[#F3F8FC] whitespace-pre-line align-top text-sm break-words">
                          {note.benefit}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="text-center mt-4">
          <button
            onClick={toggleModal}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded-lg font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={toggleModal}
        className="flex items-center gap-1.5 text-[12px] font-semibold text-brand hover:underline"
      >
        <FileText className="h-3.5 w-3.5" /> Release Notes
      </button>

      {mounted && modalContent && createPortal(modalContent, document.body)}

      <Dialog open={isModalVisible} onOpenChange={handleModalOk}>
        <DialogContent className="w-[74vw] max-w-[1400px] h-[85vh] z-[10000]">
          <DialogHeader>
            <DialogTitle className="mt-2 ml-3 flex">
              <div>Release Images</div>
            </DialogTitle>
            <hr className="bg-body-color mx-2" />
            <DialogDescription asChild>
              <div
                className="p-2 branch-scroll"
                style={{ maxHeight: "70vh", overflowY: "scroll" }}
              >
                {selectedNote?.images &&
                Array.isArray(selectedNote.images) &&
                selectedNote.images.length > 0 ? (
                  <div className="grid grid-cols-12 pt-4 gap-x-5 gap-y-6">
                    {selectedNote.images.map((img: any, index: any) => (
                      <div
                        key={index}
                        className="col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-3 xl:col-span-4"
                      >
                        <div className="dark:bg-primary dark:bg-opacity-10 bg-white rounded-lg shadow flex">
                          <label className="flex w-full h-32 sm:h-40 md:h-44 lg:h-56 xl:h-60 items-center justify-center rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                            <Image
                              width={800}
                              height={800}
                              src={`https://erp.autovyn.com/backend/fetch?filePath=${img}`}
                              alt={`Uploaded ${index + 1}`}
                              className="w-full h-full object-contain rounded-lg"
                              unoptimized
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-gray-500 pt-6">
                    No images found.
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* ✅ Toast component */}
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
      />
    </>
  );
}
