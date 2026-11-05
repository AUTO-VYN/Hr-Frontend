"use client";
import React, { useState, useRef, useEffect } from "react";
import {
Dialog,
DialogContent,
DialogHeader,
DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DialogDescription } from "@radix-ui/react-dialog";
interface ImageCaptureDialogProps {
isOpen: boolean;
onClose: () => void;
onImageCapture: (imageData: string, imageFile: File) => void;
}
const ImageCaptureDialog = ({ isOpen, onClose, onImageCapture }: ImageCaptureDialogProps) => {
const [selectedOption, setSelectedOption] = useState<"camera" | "gallery" | null>(null);
const [capturedImage, setCapturedImage] = useState<string | null>(null);
const [capturedFile, setCapturedFile] = useState<File | null>(null);
const videoRef = useRef<HTMLVideoElement>(null);
const fileInputRef = useRef<HTMLInputElement>(null);
const streamRef = useRef<MediaStream | null>(null);
// Cleanup function
useEffect(() => {
return () => {
if (streamRef.current) {
streamRef.current.getTracks().forEach(track => track.stop());
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
streamRef.current.getTracks().forEach(track => track.stop());
}
};
}, [selectedOption, isOpen]);
const startCamera = async () => {
try {
const stream = await navigator.mediaDevices.getUserMedia({
video: { facingMode: "environment" } // Back camera preferred
});
streamRef.current = stream;
if (videoRef.current) {
videoRef.current.srcObject = stream;
videoRef.current.play().catch(err => console.error("Video play error:", err));
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
canvas.width = videoRef.current.videoWidth;
canvas.height = videoRef.current.videoHeight;
const ctx = canvas.getContext("2d");
if (ctx) {
ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
const imageData = canvas.toDataURL("image/jpeg", 0.8);
// Convert base64 to File object for backend
const blob = dataURLToBlob(imageData);
const file = new File([blob], `medical_certificate_${Date.now()}.jpg`, { type: "image/jpeg" });
setCapturedImage(imageData);
setCapturedFile(file);
// ✅ ADD THIS LINE - Camera view hide karne ke liye
setSelectedOption(null);
// Stop camera
if (streamRef.current) {
streamRef.current.getTracks().forEach(track => track.stop());
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
};
// Helper function to convert dataURL to Blob
const dataURLToBlob = (dataURL: string): Blob => {
const arr = dataURL.split(',');
const mime = arr[0].match(/:(.?);/)?.[1] || 'image/jpeg';
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
streamRef.current.getTracks().forEach(track => track.stop());
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
<DialogContent className="w-full max-w-screen-md overflow-y-auto p-0 bg-white dark:bg-black max-h-[90vh]
[&_button.absolute_svg]:w-8 [&_button.absolute_svg]:font-bold
[&_button.absolute_svg]:h-6 [&_button_svg]:text-header [&_button_svg]:dark:text-white border dark:border-borderColor-dark">
<div className="flex justify-between items-center px-6 py-2 bg-[#F3F8FC] dark:bg-black border-b border-borderColor dark:border-borderColor-dark">
<h2 className="text-2xl font-bold text-[#1f3b73] dark:text-white">
UPLOAD MEDICAL CERTIFICATE
</h2>
</div>
<div className="bg-white dark:bg-black">
<div className="rounded-lg shadow-lg px-5 py-4">
<div className="grid grid-cols-12 ">
<div className="col-span-12">
<DialogDescription>
<div className="mt-2">

{!selectedOption && !capturedImage && (
<div className="grid grid-cols-12 gap-4 justify-center">
<div className="col-span-12 sm:col-span-6 ">
<Button
onClick={() => setSelectedOption("camera")}
className="flex flex-col justify-center items-center gap-3 p-8 w-full border-2 border-dashed border-borderColor dark:border-borderColor-dark hover:border-header dark:hover:border-white transition-all"
variant="outline"
>
<span className="text-5xl">📷</span>
<span className="text-sm font-semibold text-header dark:text-white uppercase">
Capture Image
</span>
<span className="text-xs text-gray-500 dark:text-gray-400">
Take a photo using camera
</span>
</Button>
</div>
<div className="col-span-12 sm:col-span-6">
<Button
onClick={() => fileInputRef.current?.click()}
className="flex flex-col items-center gap-3 p-8 w-full border-2 border-dashed border-borderColor dark:border-borderColor-dark hover:border-header dark:hover:border-white transition-all"
variant="outline"
>
<span className="text-5xl">🖼️</span>
<span className="text-sm font-semibold text-header dark:text-white uppercase">
From Gallery
</span>
<span className="text-xs text-gray-500 dark:text-gray-400">
Choose from existing images
</span>
</Button>
<input
type="file"
ref={fileInputRef}
onChange={handleFileUpload}
accept="image/"
capture="environment"
className="hidden"
/>
</div>
</div>
)}

{selectedOption === "camera" && (
<div className="space-y-4">
<div className="relative bg-black rounded-lg overflow-hidden border border-borderColor dark:border-borderColor-dark" style={{ minHeight: "300px" }}>
<video
ref={videoRef}
autoPlay
playsInline
className="w-full h-full object-contain"
style={{ maxHeight: "300px" }}
/>
</div>
<div className="flex gap-3 justify-center mt-4">
<Button
onClick={capturePhoto}
variant="save"
className="px-6"
>
📸 CAPTURE PHOTO
</Button>
<Button
onClick={resetState}
variant="outline"
className="px-6"
>
CANCEL
</Button>
</div>
</div>
)}

{capturedImage && (
<div className="space-y-4">
<div className="rounded-lg overflow-hidden border border-borderColor dark:border-borderColor-dark bg-gray-50 dark:bg-gray-800 p-2">
<img
src={capturedImage}
alt="Captured"
className="w-full rounded-lg"
style={{ maxHeight: "300px", objectFit: "contain" }}
/>
</div>
<div className="flex gap-3 justify-center mt-4 pb-2">
<Button
onClick={handleConfirm}
variant="save"
className="px-8"
>
✓ CONFIRM
</Button>
<Button
onClick={() => {
setCapturedImage(null);
setCapturedFile(null);
setSelectedOption(null);
}}
variant="outline"
className="px-8"
>
↺ RETAKE
</Button>
</div>
</div>
)}
</div>
</DialogDescription>
</div>
</div>
</div>
</div>
</DialogContent>
</Dialog>
);
};
export default ImageCaptureDialog;

