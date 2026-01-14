/**
 * AudioWorklet processor for measuring output volume
 * Used for visualizing AI audio playback levels
 *
 * IMPORTANT: This worklet runs in a separate thread and cannot import ES modules.
 * It operates at the AudioContext's sample rate, which should be configured to
 * AUDIO_CONFIG.OUTPUT_SAMPLE_RATE (24000) in the AudioStreamer.
 */

class VolumeMeterProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._updateInterval = 50; // ms
    this._lastUpdate = 0;
  }

  /**
   * Calculate RMS volume level (0-1)
   */
  calculateVolume(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sum / samples.length);
    return Math.min(1, rms * 2);
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input[0]) {
      return true;
    }

    // Pass through audio unchanged
    for (let channel = 0; channel < input.length; channel++) {
      if (output[channel]) {
        output[channel].set(input[channel]);
      }
    }

    // Calculate volume at intervals
    const now = currentTime * 1000;
    if (now - this._lastUpdate >= this._updateInterval) {
      const volume = this.calculateVolume(input[0]);
      this.port.postMessage({ volume });
      this._lastUpdate = now;
    }

    return true;
  }
}

registerProcessor('volume-meter-processor', VolumeMeterProcessor);
