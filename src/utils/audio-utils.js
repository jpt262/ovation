/**
 * Audio utility functions
 */

/**
 * Check if Web Audio API is supported in the current browser
 * @returns {boolean} True if Web Audio API is supported
 */
export function isAudioSupported() {
    return !!(window.AudioContext || window.webkitAudioContext);
}

/**
 * Create an AudioContext instance with fallbacks for different browsers
 * @returns {AudioContext} The audio context instance
 */
export function createAudioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    return new AudioContext();
}

/**
 * Check if the user's device has microphone support
 * @returns {Promise<boolean>} Promise resolving to true if microphone is available
 */
export async function hasMicrophoneSupport() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return false;
    }

    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.some(device => device.kind === 'audioinput');
    } catch (error) {
        return false;
    }
}

/**
 * Request microphone access
 * @returns {Promise<MediaStream>} Promise resolving to the microphone MediaStream
 * @throws {Error} If microphone access is denied or unavailable
 */
export async function requestMicrophoneAccess() {
    try {
        return await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            video: false
        });
    } catch (error) {
        if (error.name === 'NotAllowedError') {
            throw new Error('Microphone access denied by user. Please allow microphone access to use clap detection.');
        } else if (error.name === 'NotFoundError') {
            throw new Error('No microphone detected on this device.');
        } else {
            throw new Error(`Failed to access microphone: ${error.message}`);
        }
    }
}

/**
 * Calculate the RMS (Root Mean Square) value of an audio buffer
 * @param {Float32Array} buffer - Audio data buffer
 * @returns {number} RMS value between 0 and 1
 */
export function calculateRMS(buffer) {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
}

/**
 * Calculate decibels from amplitude
 * @param {number} amplitude - Amplitude value (0-1)
 * @returns {number} Decibel value
 */
export function amplitudeToDecibels(amplitude) {
    // Avoid log(0)
    if (amplitude < 0.0000001) {
        return -100;
    }
    return 20 * Math.log10(amplitude);
}

/**
 * Calculate the dominant frequency in an audio buffer
 * @param {Float32Array} frequencyData - FFT frequency data
 * @param {number} sampleRate - Audio context sample rate
 * @param {number} fftSize - FFT size used
 * @returns {number} Dominant frequency in Hz
 */
export function calculateDominantFrequency(frequencyData, sampleRate, fftSize) {
    let maxIndex = 0;
    let maxValue = 0;

    for (let i = 0; i < frequencyData.length; i++) {
        if (frequencyData[i] > maxValue) {
            maxValue = frequencyData[i];
            maxIndex = i;
        }
    }

    // Convert bin index to frequency
    return maxIndex * sampleRate / fftSize;
}

/**
 * Extract the attack time from an audio buffer
 * @param {Float32Array} buffer - Audio data buffer
 * @param {number} threshold - Amplitude threshold (0-1)
 * @returns {number} Attack time in samples
 */
export function getAttackTime(buffer, threshold) {
    // Find the peak
    let peakIndex = 0;
    let peakValue = 0;

    for (let i = 0; i < buffer.length; i++) {
        const abs = Math.abs(buffer[i]);
        if (abs > peakValue) {
            peakValue = abs;
            peakIndex = i;
        }
    }

    // No significant peak found
    if (peakValue < threshold) {
        return -1;
    }

    // Find attack time (start of the sound)
    const startThreshold = threshold * 0.1;
    let attackIndex = peakIndex;

    while (attackIndex > 0 && Math.abs(buffer[attackIndex]) > startThreshold) {
        attackIndex--;
    }

    return peakIndex - attackIndex;
} 