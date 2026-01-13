'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Audio Analysis Constants
 *
 * These values are chosen based on Web Audio API best practices and UX requirements:
 */

/**
 * FFT (Fast Fourier Transform) size for frequency analysis.
 * Must be a power of 2 between 32 and 32768.
 * 256 provides 128 frequency bins (fftSize/2), offering a good balance between
 * frequency resolution and performance. Lower values = faster but less detail,
 * higher values = more detail but more CPU intensive.
 */
export const FFT_SIZE = 256;

/**
 * Smoothing constant for the analyser (0-1).
 * Controls how much the previous analysis frame affects the current one.
 * 0.8 means 80% of the previous value is retained, resulting in smoother
 * transitions that look natural for audio visualizations without being sluggish.
 */
export const SMOOTHING_TIME_CONSTANT = 0.8;

/**
 * RMS normalization divisor.
 * Web Audio API getByteFrequencyData returns values 0-255 (Uint8Array).
 * The RMS (Root Mean Square) of a full-scale signal would be ~180 (255/sqrt(2)).
 * We use 128 (half of max) to provide headroom and make typical speech/audio
 * register in a comfortable 0.3-0.7 range rather than peaking too easily.
 */
export const RMS_NORMALIZATION_DIVISOR = 128;

/**
 * Minimum change threshold for state updates.
 * Only update the React state when the audio level changes by more than this amount.
 * This debouncing prevents excessive re-renders while still providing smooth visual feedback.
 * 0.02 (2% change) is imperceptible visually but significantly reduces render frequency.
 */
export const LEVEL_CHANGE_THRESHOLD = 0.02;

interface UseAudioLevelResult {
  /** Current audio level (0-1) */
  audioLevel: number;
  /** Whether the microphone is active */
  isActive: boolean;
  /** Start monitoring microphone */
  start: () => Promise<void>;
  /** Stop monitoring microphone */
  stop: () => void;
  /** Any error that occurred */
  error: Error | null;
  /** Whether the browser supports audio monitoring */
  isSupported: boolean;
}

/**
 * Hook to monitor microphone audio level independently of any API connection.
 * This is for visual feedback only - the audio is not sent anywhere.
 */
export function useAudioLevel(): UseAudioLevelResult {
  const [audioLevel, setAudioLevel] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isStartingRef = useRef(false);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const lastLevelRef = useRef(0);

  // Check if browser supports required APIs
  const isSupported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof AudioContext !== 'undefined';

  // Stable reference for the animation loop using ref
  const analyzeAudioRef = useRef<(() => void) | null>(null);

  // Initialize the analyze function once
  useEffect(() => {
    analyzeAudioRef.current = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;

      const analyser = analyserRef.current;
      const dataArray = dataArrayRef.current;
      analyser.getByteFrequencyData(dataArray);

      // Calculate RMS (Root Mean Square) for better volume representation
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);

      // Normalize to 0-1 range
      const normalizedLevel = Math.min(1, rms / RMS_NORMALIZATION_DIVISOR);

      // Only update state when level changes significantly (debounce)
      if (Math.abs(normalizedLevel - lastLevelRef.current) > LEVEL_CHANGE_THRESHOLD) {
        setAudioLevel(normalizedLevel);
        lastLevelRef.current = normalizedLevel;
      }

      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(() => analyzeAudioRef.current?.());
    };
  }, []);

  // Start monitoring microphone
  const start = useCallback(async () => {
    // Guard against double-start and in-progress start
    if (!isSupported || isActive || isStartingRef.current) return;

    isStartingRef.current = true;

    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;

    try {
      // Request microphone permission
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create audio context and analyser
      audioContext = new AudioContext();

      // Resume if suspended (browser autoplay policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;

      // Pre-allocate data array for performance
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      // Connect microphone to analyser
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      // Don't connect to destination - we only want to analyze, not play back

      // Store refs only after successful setup
      mediaStreamRef.current = stream;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      setIsActive(true);
      setError(null);

      // Start animation loop
      analyzeAudioRef.current?.();
    } catch (err) {
      // Cleanup on failure
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (audioContext) {
        audioContext.close();
      }

      const error = err instanceof Error ? err : new Error('Failed to access microphone');
      setError(error);
      setIsActive(false);
    } finally {
      isStartingRef.current = false;
    }
  }, [isSupported, isActive]);

  // Stop monitoring
  const stop = useCallback(() => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    dataArrayRef.current = null;

    // Stop media tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setIsActive(false);
    setAudioLevel(0);
    lastLevelRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    audioLevel,
    isActive,
    start,
    stop,
    error,
    isSupported,
  };
}
