import React, { useState, useRef, useEffect, useCallback } from "react";
import { FaDownload } from "react-icons/fa";
import { MdCropRotate, MdZoomIn, MdZoomOut } from "react-icons/md";
import { FaRegFilePdf } from "react-icons/fa6";

const FileViewer = ({
  fileLink,
  celldata = "",
  Title = "",
}: {
  fileLink: string;
  celldata: string;
  Title: string;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalFileLink, setModalFileLink] = useState("");
  const [rotation, setRotation] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 0, h: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  // ── NEW: Blob URL for PDF ──
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  const isPdf = (url: string) => /\.pdf$/i.test(url);

  const openModal = (link: string | null) => {
    setModalFileLink(link ?? "");
    setIsModalOpen(true);
    setRotation(0);
    setZoomLevel(1);
    setImgLoaded(false);
    setImgNaturalSize({ w: 0, h: 0 });
    setPdfBlobUrl(""); // reset blob
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalFileLink("");
    setRotation(0);
    setZoomLevel(1);
    setImgNaturalSize({ w: 0, h: 0 });
    setImgLoaded(false);
    setContainerSize({ w: 0, h: 0 });
    setPdfBlobUrl("");
    setPdfLoading(false);
  };

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen) closeModal();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isModalOpen]);

  // ── NEW: Fetch PDF as Blob when modal opens ──
  useEffect(() => {
    if (!isModalOpen || !isPdf(modalFileLink) || !modalFileLink) return;

    let cancelled = false;
    setPdfLoading(true);

    fetch(modalFileLink)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch PDF");
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setPdfBlobUrl(url);
        setPdfLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        // Fallback: direct link agar fetch fail ho
        setPdfBlobUrl(modalFileLink);
        setPdfLoading(false);
      });

    return () => {
      cancelled = true;
      setPdfBlobUrl((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return "";
      });
    };
  }, [isModalOpen, modalFileLink]);

  // Track available content-area size so the image can be fitted into it
  useEffect(() => {
    if (!isModalOpen || !scrollRef.current) return;
    const el = scrollRef.current;

    const measure = () => {
      setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isModalOpen]);

  const rotateImage = () => setRotation((prev) => (prev + 90) % 360);

  const zoomImage = (zoomIn: boolean) => {
    setZoomLevel((prev) => {
      const next = zoomIn ? prev + 0.25 : prev - 0.25;
      return Math.min(5, Math.max(0.25, Math.round(next * 100) / 100));
    });
  };

  const isRotated90or270 = rotation === 90 || rotation === 270;

  const getBaseScale = useCallback(() => {
    if (!imgNaturalSize.w || !containerSize.w) return 1;
    const PADDING = 96;
    const availW = Math.max(containerSize.w - PADDING, 50);
    const availH = Math.max(containerSize.h - PADDING, 50);

    const naturalW = isRotated90or270 ? imgNaturalSize.h : imgNaturalSize.w;
    const naturalH = isRotated90or270 ? imgNaturalSize.w : imgNaturalSize.h;

    const scale = Math.min(availW / naturalW, availH / naturalH, 1);
    return scale;
  }, [imgNaturalSize, containerSize, isRotated90or270]);

  const getImageWrapperStyle = (): React.CSSProperties => {
    if (imgNaturalSize.w === 0) return {};
    const baseScale = getBaseScale();
    const scaledW = imgNaturalSize.w * baseScale * zoomLevel;
    const scaledH = imgNaturalSize.h * baseScale * zoomLevel;
    const effectiveW = isRotated90or270 ? scaledH : scaledW;
    const effectiveH = isRotated90or270 ? scaledW : scaledH;
    return {
      width: effectiveW,
      height: effectiveH,
      minWidth: effectiveW,
      minHeight: effectiveH,
      flexShrink: 0,
    };
  };

  const getImgStyle = (): React.CSSProperties => {
    const baseScale = getBaseScale();
    const scaledW = imgNaturalSize.w * baseScale * zoomLevel;
    const scaledH = imgNaturalSize.h * baseScale * zoomLevel;
    return {
      transform: `rotate(${rotation}deg)`,
      transformOrigin: "center center",
      transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      width: scaledW,
      height: scaledH,
      objectFit: "contain",
      display: "block",
      flexShrink: 0,
    };
  };

  const displayZoomPercent = Math.round(zoomLevel * 100);
  const readyToShow = imgLoaded && containerSize.w > 0;

  return (
    <div>
      {/* ───── MODAL ───── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            className="relative flex flex-col rounded-2xl overflow-hidden"
            style={{
              width: "min(1600px, 96vw)",
              height: "min(820px, 92vh)",
              background: "linear-gradient(145deg, #1a1f2e, #111827)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)",
            }}
          >
            {/* ── Header ── */}
            <div
              className="flex items-center justify-between px-5 py-3 shrink-0"
              style={{
                background: "rgba(255,255,255,0.04)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                  style={{
                    background: isImage(modalFileLink)
                      ? "rgba(99,179,237,0.15)"
                      : "rgba(252,129,74,0.15)",
                    color: isImage(modalFileLink) ? "#63b3ed" : "#fc814a",
                    border: `1px solid ${isImage(modalFileLink) ? "rgba(99,179,237,0.3)" : "rgba(252,129,74,0.3)"}`,
                  }}
                >
                  {isImage(modalFileLink) ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  ) : (
                    <FaRegFilePdf size={10} />
                  )}
                  {isImage(modalFileLink) ? "IMAGE" : "PDF"}
                </span>
                <span
                  className="text-sm font-semibold truncate"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  {typeof Title === "string" ? Title.toUpperCase() : Title}
                </span>
              </div>

              {isImage(modalFileLink) && (
                <span
                  className="text-xs font-mono px-2 py-0.5 rounded"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.45)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {displayZoomPercent}%
                </span>
              )}

              <div className="flex items-center gap-2 shrink-0">
                {isImage(modalFileLink) && (
                  <>
                    <button
                      onClick={() => zoomImage(false)}
                      disabled={zoomLevel <= 0.25}
                      title="Zoom Out"
                      className="flex items-center justify-center rounded-lg transition-all duration-150"
                      style={{
                        width: 34, height: 34,
                        background: zoomLevel <= 0.25 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)",
                        color: zoomLevel <= 0.25 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        cursor: zoomLevel <= 0.25 ? "not-allowed" : "pointer",
                      }}
                    >
                      <MdZoomOut size={18} />
                    </button>
                    <button
                      onClick={() => zoomImage(true)}
                      disabled={zoomLevel >= 5}
                      title="Zoom In"
                      className="flex items-center justify-center rounded-lg transition-all duration-150"
                      style={{
                        width: 34, height: 34,
                        background: zoomLevel >= 5 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)",
                        color: zoomLevel >= 5 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        cursor: zoomLevel >= 5 ? "not-allowed" : "pointer",
                      }}
                    >
                      <MdZoomIn size={18} />
                    </button>
                    <button
                      onClick={rotateImage}
                      title="Rotate 90°"
                      className="flex items-center justify-center rounded-lg transition-all duration-150"
                      style={{
                        width: 34, height: 34,
                        background: "rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.7)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      <MdCropRotate size={17} />
                    </button>
                    <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.1)" }} />
                  </>
                )}

                <button
                  onClick={() => window.open(modalFileLink, "_blank")}
                  title="Download"
                  className="flex items-center justify-center rounded-lg transition-all duration-150"
                  style={{
                    width: 34, height: 34,
                    background: "rgba(74,222,128,0.12)",
                    color: "#4ade80",
                    border: "1px solid rgba(74,222,128,0.25)",
                  }}
                >
                  <FaDownload size={13} />
                </button>

                <button
                  onClick={closeModal}
                  title="Close (Esc)"
                  className="flex items-center justify-center rounded-lg transition-all duration-150"
                  style={{
                    width: 34, height: 34,
                    background: "rgba(248,113,113,0.12)",
                    color: "#f87171",
                    border: "1px solid rgba(248,113,113,0.25)",
                    fontSize: 18,
                    fontWeight: 600,
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* ── Content Area ── */}
            <div
              ref={scrollRef}
              className="relative flex-1 overflow-auto"
              style={{
                background: "repeating-conic-gradient(rgba(255,255,255,0.025) 0% 25%, transparent 0% 50%) 0 0 / 28px 28px",
              }}
            >
              {isImage(modalFileLink) ? (
                <div
                  className="flex"
                  style={{ padding: "48px", minHeight: "100%", minWidth: "100%" }}
                >
                  <div
                    style={{
                      ...(readyToShow ? getImageWrapperStyle() : { width: 0, height: 0 }),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "auto",
                    }}
                  >
                    <img
                      src={modalFileLink}
                      alt="File Preview"
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        setImgNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                        setImgLoaded(true);
                      }}
                      style={{
                        ...getImgStyle(),
                        opacity: readyToShow ? 1 : 0,
                        transition: "opacity 0.2s ease",
                      }}
                      draggable={false}
                    />
                  </div>
                  {!readyToShow && (
                    <div
                      className="absolute flex items-center justify-center"
                      style={{ inset: 0 }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          border: "3px solid rgba(255,255,255,0.15)",
                          borderTopColor: "#63b3ed",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                  )}
                </div>
              ) : isPdf(modalFileLink) ? (
                // ── UPDATED PDF Section with Blob URL ──
                pdfLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-3">
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          border: "3px solid rgba(255,255,255,0.15)",
                          borderTopColor: "#fc814a",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                        }}
                      />
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
                        Loading PDF...
                      </span>
                    </div>
                  </div>
                ) : pdfBlobUrl ? (
                  <iframe
                    src={pdfBlobUrl}
                    title="PDF Preview"
                    style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <FaRegFilePdf size={48} color="#fc814a" />
                    <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
                      Unable to load PDF preview
                    </span>
                    <a
                      href={modalFileLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#fc814a", textDecoration: "underline", fontSize: 14 }}
                    >
                      Open in New Tab
                    </a>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-full">
                  <a
                    href={modalFileLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#63b3ed" }}
                  >
                    View File
                  </a>
                </div>
              )}
            </div>

            {/* ── Bottom bar ── */}
            {isImage(modalFileLink) && (
              <div
                className="shrink-0 flex items-center justify-center gap-6 py-2"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {[
                  { key: "Scroll", label: "Pan" },
                  { key: "+ / −", label: "Zoom" },
                  { key: "R", label: "Rotate" },
                  { key: "Esc", label: "Close" },
                ].map(({ key, label }) => (
                  <span key={key} className="flex items-center gap-1.5">
                    <kbd
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.45)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        fontFamily: "monospace",
                      }}
                    >
                      {key}
                    </kbd>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {label}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───── TRIGGER LINKS ───── */}
      {isImage(fileLink) ? (
        <a
          href="#"
          className="font-medium ml-1 text-primary dark:text-primary capitalize hover:underline"
          onClick={(e) => { e.preventDefault(); openModal(fileLink); }}
        >
          View Image
        </a>
      ) : isPdf(fileLink) ? (
        <a
          href="#"
          className="font-medium ml-1 text-primary dark:text-primary capitalize hover:underline"
          onClick={(e) => { e.preventDefault(); openModal(fileLink); }}
        >
          View PDF
        </a>
      ) : !celldata ? (
        <a
          href={fileLink}
          target="_blank"
          className="font-medium ml-1 text-primary dark:text-primary capitalize hover:underline"
          rel="noopener noreferrer"
        >
          <span>Download File</span>
        </a>
      ) : (
        <>{celldata}</>
      )}
    </div>
  );
};

export default FileViewer;