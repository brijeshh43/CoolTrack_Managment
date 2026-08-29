"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RotateCcw, Check, X, Upload, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
  initialImage?: string | null;
}

export function CameraCapture({ onCapture, onClose, initialImage }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(initialImage || null);
  const [showPreview, setShowPreview] = useState(!!initialImage);
  const [isLoading, setIsLoading] = useState(false);

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = useCallback(
    async (mode: "user" | "environment") => {
      setIsLoading(true);
      setPermissionDenied(false);
      stopStream();

      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        setStream(newStream);
        setFacingMode(mode);
        setShowPreview(false);
        setCapturedImage(null);
      } catch (error) {
        console.error("Camera access error:", error);
        setPermissionDenied(true);
      } finally {
        setIsLoading(false);
      }
    },
    [stopStream],
  );

  useEffect(() => {
    startCamera("user");
    return () => stopStream();
  }, [startCamera, stopStream]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {
        // Autoplay was prevented, user interaction needed
        console.warn("Video autoplay prevented");
      });
    }
  }, [stream]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(dataUrl);
    setShowPreview(true);
    stopStream();
  };

  const retakePhoto = () => {
    setShowPreview(false);
    setCapturedImage(null);
    startCamera(facingMode);
  };

  const confirmPhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCapturedImage(dataUrl);
        setShowPreview(true);
        stopStream();
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const switchCamera = () => {
    startCamera(facingMode === "user" ? "environment" : "user");
  };

  return (
    <div className="camera-modal-overlay" onClick={onClose}>
      <div className="camera-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="camera-modal-header">
          <h2 className="text-lg font-semibold">Attendance Selfie</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>

        <div className="camera-modal-body">
          {permissionDenied ? (
            <div className="camera-permission-denied">
              <Camera className="size-12 mx-auto text-destructive" />
              <h3>Camera Permission Required</h3>
              <p>Please enable camera access in your browser settings to take attendance photos.</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => startCamera("user")}>
                  <RotateCcw className="size-4" /> Try Again
                </Button>
                <Button onClick={triggerFileUpload}>
                  <Upload className="size-4" /> Upload Photo
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    hidden
                    onChange={handleFileUpload}
                  />
                </Button>
              </div>
            </div>
          ) : capturedImage && showPreview ? (
            <div className="space-y-4">
              <div className="camera-preview">
                <img src={capturedImage} alt="Captured photo" />
              </div>
              <div className="camera-controls">
                <Button variant="outline" size="lg" onClick={retakePhoto} className="gap-2 px-6">
                  <RotateCcw className="size-4" /> Retake
                </Button>
                <Button size="lg" onClick={confirmPhoto} className="gap-2 px-6">
                  <Check className="size-4" /> Confirm
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="camera-mode-selector">
                <Button
                  variant={facingMode === "user" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => startCamera("user")}
                  disabled={isLoading}
                >
                  <Camera className="size-4" /> Front Camera
                </Button>
                <Button
                  variant={facingMode === "environment" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => startCamera("environment")}
                  disabled={isLoading}
                >
                  <RotateCcw className="size-4" /> Back Camera
                </Button>
              </div>

              <div className="camera-preview">
                {stream ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    {isLoading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Starting camera...</span>
                      </div>
                    ) : (
                      <Camera className="size-12" />
                    )}
                  </div>
                )}
                <canvas ref={canvasRef} hidden />
              </div>

              <div className="camera-controls">
                <Button
                  size="xl"
                  variant="default"
                  onClick={capturePhoto}
                  disabled={!stream || isLoading}
                  className="gap-2 px-8"
                >
                  <Camera className="size-5" /> Capture
                </Button>
              </div>

              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={triggerFileUpload} className="gap-2">
                  <Upload className="size-4" /> Upload Photo
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    hidden
                    onChange={handleFileUpload}
                  />
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="camera-modal-footer">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
