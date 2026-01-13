'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseVideoPreviewResult {
  /** Whether the video is currently on */
  isVideoOn: boolean;
  /** The media stream from the camera */
  stream: MediaStream | null;
  /** Toggle video on/off */
  toggleVideo: () => Promise<void>;
  /** Any error that occurred */
  error: Error | null;
  /** Whether the browser supports video */
  isSupported: boolean;
}

/**
 * Hook to manage camera access for video preview.
 * The video is for self-viewing only, not sent to any external service.
 */
export function useVideoPreview(): UseVideoPreviewResult {
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const streamRef = useRef<MediaStream | null>(null);

  // Check if browser supports getUserMedia
  const isSupported =
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia === 'function';

  // Start the camera
  const startCamera = useCallback(async () => {
    if (!isSupported) {
      setError(new Error('Camera not supported in this browser'));
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false, // We only need video for self-viewing
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsVideoOn(true);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to access camera');
      setError(error);
      setIsVideoOn(false);
    }
  }, [isSupported]);

  // Stop the camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }
    setIsVideoOn(false);
  }, []);

  // Toggle video on/off
  const toggleVideo = useCallback(async () => {
    if (isVideoOn) {
      stopCamera();
    } else {
      await startCamera();
    }
  }, [isVideoOn, startCamera, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    isVideoOn,
    stream,
    toggleVideo,
    error,
    isSupported,
  };
}
