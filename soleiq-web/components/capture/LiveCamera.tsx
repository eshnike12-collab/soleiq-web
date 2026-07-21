"use client";

/**
 * In-app live camera for the four-photo flow. Streams getUserMedia into a
 * <video>, captures a frame to JPEG on shutter, and hands back a File that
 * goes through the same prepareFootPhoto() quality gate as uploads.
 *
 * The old "Take photo" control was a file input with capture="environment",
 * which desktop browsers treat as a plain upload dialog — this component is
 * the fix. If the camera can't start (no device, permission denied,
 * insecure context), onUnavailable fires so the caller can steer the user
 * to the upload path instead.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCcw, X } from "lucide-react";

export function LiveCamera({
  onCapture,
  onClose,
  onUnavailable,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
  onUnavailable: (message: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [canFlip, setCanFlip] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        onUnavailable("This browser can't open a camera here. Use Upload photo instead.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setReady(true);
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        if (!cancelled) {
          setCanFlip(devices.filter((device) => device.kind === "videoinput").length > 1);
        }
      } catch (reason) {
        if (cancelled) return;
        const name = reason instanceof DOMException ? reason.name : "";
        onUnavailable(
          name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access in your browser, or use Upload photo."
            : name === "NotFoundError"
              ? "No camera was found on this device. Use Upload photo instead."
              : "The camera could not start. Use Upload photo instead."
        );
      }
    };

    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [facing, onUnavailable, stop]);

  const shutter = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stop();
        onCapture(new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <div className="absolute inset-0 bg-black">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="h-full w-full object-cover"
      />
      {!ready && (
        <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-white/80">
          Starting camera…
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          stop();
          onClose();
        }}
        aria-label="Close camera"
        className="absolute left-3 top-3 rounded-full bg-black/50 p-2 text-white"
      >
        <X className="h-5 w-5" />
      </button>

      {canFlip && (
        <button
          type="button"
          onClick={() => setFacing((value) => (value === "environment" ? "user" : "environment"))}
          aria-label="Switch camera"
          className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white"
        >
          <RefreshCcw className="h-5 w-5" />
        </button>
      )}

      <div className="absolute inset-x-0 bottom-4 flex justify-center">
        <button
          type="button"
          onClick={shutter}
          disabled={!ready}
          aria-label="Take photo"
          className="h-16 w-16 rounded-full border-4 border-white bg-white/30 transition active:scale-95 disabled:opacity-40"
        >
          <span className="mx-auto block h-11 w-11 rounded-full bg-white" />
        </button>
      </div>
    </div>
  );
}
