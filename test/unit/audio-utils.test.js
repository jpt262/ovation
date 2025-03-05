import * as AudioUtils from '../../src/utils/audio-utils';

describe('AudioUtils', () => {
    describe('isAudioSupported', () => {
        test('should return true when AudioContext is available', () => {
            expect(AudioUtils.isAudioSupported()).toBe(true);
        });

        test('should return false when AudioContext is not available', () => {
            const originalAudioContext = window.AudioContext;
            const originalWebkitAudioContext = window.webkitAudioContext;

            delete window.AudioContext;
            delete window.webkitAudioContext;

            expect(AudioUtils.isAudioSupported()).toBe(false);

            // Restore for other tests
            window.AudioContext = originalAudioContext;
            window.webkitAudioContext = originalWebkitAudioContext;
        });
    });

    describe('createAudioContext', () => {
        test('should create and return a new AudioContext', () => {
            const context = AudioUtils.createAudioContext();
            expect(context).toBeInstanceOf(AudioContext);
        });

        test('should use webkitAudioContext if AudioContext is not available', () => {
            const originalAudioContext = window.AudioContext;
            delete window.AudioContext;

            const context = AudioUtils.createAudioContext();
            expect(context).toBeInstanceOf(AudioContext); // Our mock is the same class

            // Restore for other tests
            window.AudioContext = originalAudioContext;
        });
    });

    describe('hasMicrophoneSupport', () => {
        test('should return true when audioinput devices are available', async () => {
            const result = await AudioUtils.hasMicrophoneSupport();
            expect(result).toBe(true);
        });

        test('should return false when no audioinput devices are found', async () => {
            // Mock no audio devices
            navigator.mediaDevices.enumerateDevices.mockImplementationOnce(() =>
                Promise.resolve([{ kind: 'videoinput' }])
            );

            const result = await AudioUtils.hasMicrophoneSupport();
            expect(result).toBe(false);
        });

        test('should return false when mediaDevices is not supported', async () => {
            const originalMediaDevices = navigator.mediaDevices;
            delete navigator.mediaDevices;

            const result = await AudioUtils.hasMicrophoneSupport();
            expect(result).toBe(false);

            // Restore for other tests
            navigator.mediaDevices = originalMediaDevices;
        });

        test('should return false when enumerateDevices throws an error', async () => {
            navigator.mediaDevices.enumerateDevices.mockImplementationOnce(() =>
                Promise.reject(new Error('Test error'))
            );

            const result = await AudioUtils.hasMicrophoneSupport();
            expect(result).toBe(false);
        });
    });

    describe('requestMicrophoneAccess', () => {
        test('should return a MediaStream on success', async () => {
            const stream = await AudioUtils.requestMicrophoneAccess();
            expect(stream).toBeInstanceOf(MediaStream);
        });

        test('should throw an error when permission is denied', async () => {
            navigator.mediaDevices.getUserMedia.mockImplementationOnce(() =>
                Promise.reject({ name: 'NotAllowedError' })
            );

            await expect(AudioUtils.requestMicrophoneAccess())
                .rejects
                .toThrow('Microphone access denied by user');
        });

        test('should throw an error when no microphone is found', async () => {
            navigator.mediaDevices.getUserMedia.mockImplementationOnce(() =>
                Promise.reject({ name: 'NotFoundError' })
            );

            await expect(AudioUtils.requestMicrophoneAccess())
                .rejects
                .toThrow('No microphone detected');
        });

        test('should throw a generic error for other failures', async () => {
            navigator.mediaDevices.getUserMedia.mockImplementationOnce(() =>
                Promise.reject({ name: 'OtherError', message: 'Test error' })
            );

            await expect(AudioUtils.requestMicrophoneAccess())
                .rejects
                .toThrow('Failed to access microphone: Test error');
        });
    });

    describe('calculateRMS', () => {
        test('should calculate the correct RMS value', () => {
            const buffer = new Float32Array([0.5, -0.5, 0.5, -0.5]); // RMS should be 0.5
            expect(AudioUtils.calculateRMS(buffer)).toBeCloseTo(0.5);
        });

        test('should handle zero values', () => {
            const buffer = new Float32Array([0, 0, 0, 0]);
            expect(AudioUtils.calculateRMS(buffer)).toBe(0);
        });
    });

    describe('amplitudeToDecibels', () => {
        test('should convert amplitude to correct decibel value', () => {
            // 0.5 amplitude is approximately -6.02 dB
            expect(AudioUtils.amplitudeToDecibels(0.5)).toBeCloseTo(-6.02, 1);

            // 1.0 amplitude is 0 dB
            expect(AudioUtils.amplitudeToDecibels(1.0)).toBeCloseTo(0, 1);

            // 0.1 amplitude is approximately -20 dB
            expect(AudioUtils.amplitudeToDecibels(0.1)).toBeCloseTo(-20, 1);
        });

        test('should handle very small values', () => {
            // Near-zero values should return a very negative dB value
            expect(AudioUtils.amplitudeToDecibels(0.000000001)).toBeLessThan(-100);
        });

        test('should handle zero properly', () => {
            expect(AudioUtils.amplitudeToDecibels(0)).toBe(-100);
        });
    });

    describe('calculateDominantFrequency', () => {
        test('should identify the dominant frequency bin', () => {
            const fftSize = 1024;
            const sampleRate = 44100;
            const frequencyData = new Float32Array(512); // frequencyBinCount = fftSize/2

            // Set a peak at bin 100
            for (let i = 0; i < frequencyData.length; i++) {
                frequencyData[i] = i === 100 ? -20 : -80;
            }

            const dominantFreq = AudioUtils.calculateDominantFrequency(frequencyData, sampleRate, fftSize);
            const expectedFreq = 100 * sampleRate / fftSize; // Bin index to Hz formula

            expect(dominantFreq).toBeCloseTo(expectedFreq);
        });
    });

    describe('getAttackTime', () => {
        test('should detect attack time correctly', () => {
            const buffer = new Float32Array(100);

            // Create a signal with attack starting at index 20, peak at index 30
            for (let i = 0; i < buffer.length; i++) {
                if (i < 20) {
                    buffer[i] = 0.01; // Background noise
                } else if (i < 30) {
                    buffer[i] = 0.01 + (i - 20) * 0.1; // Rising attack
                } else {
                    buffer[i] = 1 - (i - 30) * 0.02; // Decay
                }
            }

            // With threshold 0.5, attack should be detected around bin 25
            // and peak around bin 30, giving ~5 samples of attack time
            const attackTime = AudioUtils.getAttackTime(buffer, 0.5);
            expect(attackTime).toBeGreaterThan(0);
            expect(attackTime).toBeLessThan(15); // Allow some wiggle room
        });

        test('should return -1 when no peak above threshold is found', () => {
            const buffer = new Float32Array(100).fill(0.1); // All values below threshold
            const attackTime = AudioUtils.getAttackTime(buffer, 0.5);
            expect(attackTime).toBe(-1);
        });
    });
});
