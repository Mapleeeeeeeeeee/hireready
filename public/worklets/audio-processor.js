/**
 * AudioWorklet processor for recording audio
 * Converts Float32 audio samples to Int16 PCM format
 * and calculates volume levels for visualization
 *
 * IMPORTANT: This worklet runs in a separate thread and cannot import ES modules.
 * Any constants used here must be kept in sync with lib/gemini/types.ts AUDIO_CONFIG:
 * - _bufferSize must match AUDIO_CONFIG.CHUNK_SIZE (4096)
 * - Sample rate is expected to be AUDIO_CONFIG.INPUT_SAMPLE_RATE (16000)
 *
 * Performance optimizations (Fix #10):
 * - Uses pre-allocated ring buffer instead of dynamic array push/slice
 * - Reuses typed arrays to reduce GC pressure
 */

class AudioRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // SYNC: This value must match AUDIO_CONFIG.CHUNK_SIZE in lib/gemini/types.ts
    this._bufferSize = 4096; // ~256ms at 16kHz

    // Fix #10: Pre-allocated ring buffer for better performance
    this._ringBuffer = new Float32Array(this._bufferSize * 2); // Double size for safety
    this._writeIndex = 0;
    this._isRecording = true;

    // Pre-allocate output arrays to reduce GC pressure
    this._outputFloat32 = new Float32Array(this._bufferSize);
    this._outputInt16 = new Int16Array(this._bufferSize);

    // Track corruption for logging (Fix #13)
    this._corruptionCount = 0;

    this.port.onmessage = (event) => {
      if (event.data.type === 'stop') {
        this._isRecording = false;
      } else if (event.data.type === 'start') {
        this._isRecording = true;
        this._writeIndex = 0; // Reset buffer on start
      }
    };
  }

  /**
   * Convert Float32 samples to Int16 with NaN/Infinity handling (Fix #13)
   * @returns {Int16Array} - New Int16Array (transferred to main thread)
   */
  float32ToInt16(float32Array) {
    // Create new array for transfer (cannot reuse when transferring ownership)
    const int16Array = new Int16Array(float32Array.length);
    let hasCorruption = false;

    for (let i = 0; i < float32Array.length; i++) {
      let sample = float32Array[i];

      // Fix #13: Handle NaN and Infinity values
      if (!Number.isFinite(sample)) {
        hasCorruption = true;
        sample = 0; // Replace corrupted samples with silence
      }

      // Clamp to [-1, 1] and convert to Int16 range
      const s = Math.max(-1, Math.min(1, sample));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Log corruption events (throttled)
    if (hasCorruption) {
      this._corruptionCount++;
      if (this._corruptionCount === 1 || this._corruptionCount % 100 === 0) {
        this.port.postMessage({
          type: 'warning',
          message: `Audio corruption detected (count: ${this._corruptionCount})`,
        });
      }
    }

    return int16Array;
  }

  /**
   * Calculate RMS volume level (0-1)
   */
  calculateVolume(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      // Skip NaN/Infinity in volume calculation
      if (Number.isFinite(sample)) {
        sum += sample * sample;
      }
    }
    const rms = Math.sqrt(sum / samples.length);
    // Scale RMS to 0-1 range (typical speech RMS is 0.1-0.3)
    return Math.min(1, rms * 3);
  }

  /**
   * Process audio input
   * Fix #10: Uses ring buffer for O(1) operations instead of O(n) array operations
   */
  process(inputs, _outputs, _parameters) {
    const input = inputs[0];

    if (!input || !input[0] || !this._isRecording) {
      return true;
    }

    const samples = input[0];
    const sampleCount = samples.length;

    // Calculate and send volume level
    const volume = this.calculateVolume(samples);
    this.port.postMessage({
      type: 'volume',
      volume,
    });

    // Fix #10: Copy samples to ring buffer (O(1) per sample)
    for (let i = 0; i < sampleCount; i++) {
      this._ringBuffer[this._writeIndex++] = samples[i];
    }

    // When buffer is full, convert and send
    if (this._writeIndex >= this._bufferSize) {
      // Copy to output buffer
      for (let i = 0; i < this._bufferSize; i++) {
        this._outputFloat32[i] = this._ringBuffer[i];
      }

      const int16Array = this.float32ToInt16(this._outputFloat32);

      // Send Int16 PCM data (transfer ownership for zero-copy)
      this.port.postMessage(
        {
          type: 'audio',
          audio: int16Array.buffer,
        },
        [int16Array.buffer]
      );

      // Move remaining samples to beginning of ring buffer
      const remaining = this._writeIndex - this._bufferSize;
      if (remaining > 0) {
        for (let i = 0; i < remaining; i++) {
          this._ringBuffer[i] = this._ringBuffer[this._bufferSize + i];
        }
      }
      this._writeIndex = remaining;
    }

    return true;
  }
}

registerProcessor('audio-recorder-processor', AudioRecorderProcessor);
