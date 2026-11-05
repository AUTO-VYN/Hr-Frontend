"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import AButton from "@/components/atoms/Button";
import { Camera, Image as ImageIcon, RotateCcw, Check, X } from "lucide-react";

interface ImageCaptureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImageCapture: (imageData: string, imageFile: File) => void;
}

const ImageCaptureDialog = ({
  isOpen,
  onClose,
  onImageCapture,
}: ImageCaptureDialogProps) => {
  const [selectedOption, setSelectedOption] = useState<"camera" | "gallery" | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup camera stream
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Start camera when option is selected
  useEffect(() => {
    if (selectedOption === "camera" && isOpen) {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [selectedOption, isOpen]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => console.error("Video play error:", err));
      }
    } catch (error) {
      console.error("Camera error:", error);
      alert("Camera access denied or not available. Please check permissions.");
      setSelectedOption(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL("image/jpeg", 0.85);

        // Convert base64 to File object
        const blob = dataURLToBlob(imageData);
        const file = new File([blob], `medical_certificate_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });

        setCapturedImage(imageData);
        setCapturedFile(file);
        setSelectedOption(null);

        // Stop camera stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
        setCapturedFile(file);
        setSelectedOption(null);
      };
      reader.readAsDataURL(file);
    }
    // Reset file input so user can re-select the same image if needed
    event.target.value = "";
  };

  // Helper function to convert dataURL to Blob with fixed regex
  const dataURLToBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleConfirm = () => {
    if (capturedImage && capturedFile) {
      onImageCapture(capturedImage, capturedFile);
      resetState();
      onClose();
    }
  };

  const resetState = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setSelectedOption(null);
    setCapturedImage(null);
    setCapturedFile(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-lg p-0 overflow-hidden bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-2xl !shadow-none shadow-none">
        <DialogHeader className="px-6 py-4 pr-12 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 relative">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#4338CA] dark:text-indigo-400" />
            Upload Medical Certificate
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Take a live photo or choose a document/prescription from your device.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          {/* Initial Options - Camera / Gallery */}
          {!selectedOption && !capturedImage && (
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setSelectedOption("camera")}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#4338CA] dark:hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-[#4338CA] dark:text-indigo-400 group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                    Use Camera
                  </span>
                  <span className="text-xs text-slate-400">
                    Capture photo directly
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#4338CA] dark:hover:border-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                    From Gallery
                  </span>
                  <span className="text-xs text-slate-400">
                    Choose from files
                  </span>
                </div>
              </button>

              {/* Hidden file input without capture so gallery opens on mobile */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
            </div>
          )}

          {/* Camera View */}
          {selectedOption === "camera" && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3] flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex gap-3 justify-center">
                <AButton
                  onClick={capturePhoto}
                  variant="primary"
                  className="px-6"
                  icon={<Camera className="w-4 h-4" />}
                >
                  Capture Photo
                </AButton>
                <AButton
                  onClick={resetState}
                  variant="outline"
                  className="px-6"
                >
                  Cancel
                </AButton>
              </div>
            </div>
          )}

          {/* Captured Image Preview */}
          {capturedImage && (
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-2">
                <img
                  src={capturedImage}
                  alt="Medical Certificate Preview"
                  className="w-full max-h-[300px] object-contain rounded-xl"
                />
              </div>

              <div className="flex gap-3 justify-center">
                <AButton
                  onClick={handleConfirm}
                  variant="primary"
                  className="px-8"
                  icon={<Check className="w-4 h-4" />}
                >
                  Confirm & Attach
                </AButton>
                <AButton
                  onClick={() => {
                    setCapturedImage(null);
                    setCapturedFile(null);
                    setSelectedOption(null);
                  }}
                  variant="outline"
                  className="px-6"
                  icon={<RotateCcw className="w-4 h-4" />}
                >
                  Retake
                </AButton>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCaptureDialog;
