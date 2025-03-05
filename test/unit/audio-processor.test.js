import AudioProcessor from '../../src/audio-processor';
import { createAudioContext } from '../../src/utils/audio-utils';

describe('AudioProcessor', () => {
    let processor;
    let mockAnalyser;

    beforeEach(() => {
        jest.useFakeTimers();
        Date.now.mockReturnValue(1000);

        // Create a fresh processor for each test
        processor = new AudioProcessor({
            threshold: 0.3,
            minDecibels: -45,
            debug: false
        });

        // Keep track of created analyser for later testing
        mockAnalyser = null;
        const originalCreateAnalyser = AudioContext.prototype.createAnalyser;
        AudioContext.prototype.createAnalyser = jest.fn(() => {
            mockAnalyser = originalCreateAnalyser.call(new AudioContext());
            return mockAnalyser;
        });
    });

    afterEach(() => {
        // Clean up
        processor.stop();
        jest.clearAllTimers();
    });

    describe('constructor', () => {
        test('should initialize with default options', () => {
            const defaultProcessor = new AudioProcessor();

            expect(defaultProcessor.options).toEqual({
                threshold: 0.3,
                minDecibels: -45,
                frequencyRange: [2000, 4000],
                minAttackTime: 5,
                maxAttackTime: 20,
                debug: false
            });

            expect(defaultProcessor._isListening).toBe(false);
            expect(defaultProcessor._audioContext).toBeNull();
            expect(defaultProcessor._lastClapTime).toBe(0);
        });

        test('should accept custom options', () => {
            const customProcessor = new AudioProcessor({
                threshold: 0.5,
                minDecibels: -30,
                frequencyRange: [1000, 3000],
                debug: true
            });

            expect(customProcessor.options.threshold).toBe(0.5);
            expect(customProcessor.options.minDecibels).toBe(-30);
            expect(customProcessor.options.frequencyRange).toEqual([1000, 3000]);
            expect(customProcessor.options.debug).toBe(true);
        });
    });

    describe('start', () => {
        test('should initialize audio context and request microphone access', async () => {
            await processor.start();

            expect(processor._audioContext).toBeTruthy();
            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
            expect(processor._isListening).toBe(true);
            expect(processor._analyser).toBeTruthy();
            expect(processor._microphone).toBeTruthy();
        });

        test('should set up audio processing pipeline', async () => {
            await processor.start();

            expect(processor._microphone.connect).toHaveBeenCalledWith(processor._analyser);
            expect(processor._timeData).toBeInstanceOf(Float32Array);
            expect(processor._frequencyData).toBeInstanceOf(Float32Array);
        });

        test('should emit start event', async () => {
            const startCallback = jest.fn();
            processor.on('start', startCallback);

            await processor.start();

            expect(startCallback).toHaveBeenCalled();
        });

        test('should not restart if already listening', async () => {
            await processor.start();

            const spy = jest.spyOn(processor, '_setupAudioProcessing');
            await processor.start();

            expect(spy).not.toHaveBeenCalled();
        });

        test('should resume suspended audio context', async () => {
            processor._audioContext = createAudioContext();
            processor._audioContext.state = 'suspended';
            const resumeSpy = jest.spyOn(processor._audioContext, 'resume');

            await processor.start();

            expect(resumeSpy).toHaveBeenCalled();
        });

        test('should emit error if microphone access fails', async () => {
            navigator.mediaDevices.getUserMedia.mockImplementationOnce(() =>
                Promise.reject(new Error('Access denied'))
            );

            const errorCallback = jest.fn();
            processor.on('error', errorCallback);

            await expect(processor.start()).rejects.toThrow('Access denied');
            expect(errorCallback).toHaveBeenCalled();
        });
    });

    describe('stop', () => {
        test('should clean up resources and stop listening', async () => {
            await processor.start();

            // Get references to mocks
            const disconnectSpy = processor._microphone.disconnect;
            const tracks = processor._mediaStream.getTracks();

            processor.stop();

            expect(processor._isListening).toBe(false);
            expect(disconnectSpy).toHaveBeenCalled();
            tracks.forEach(track => {
                expect(track.stop).toHaveBeenCalled();
            });
        });

        test('should emit stop event', async () => {
            await processor.start();

            const stopCallback = jest.fn();
            processor.on('stop', stopCallback);

            processor.stop();

            expect(stopCallback).toHaveBeenCalled();
        });

        test('should do nothing if not listening', () => {
            // Should not throw
            processor.stop();
        });

        test('should cancel animation frame if active', async () => {
            await processor.start();
            processor._animationFrame = 123;

            const spy = jest.spyOn(window, 'cancelAnimationFrame');

            processor.stop();

            expect(spy).toHaveBeenCalledWith(123);
        });
    });

    describe('isListening', () => {
        test('should return the listening state', async () => {
            expect(processor.isListening()).toBe(false);

            await processor.start();
            expect(processor.isListening()).toBe(true);

            processor.stop();
            expect(processor.isListening()).toBe(false);
        });
    });

    describe('clap detection', () => {
        beforeEach(async () => {
            // Start the processor and get the analyser
            await processor.start();
        });

        test('should detect a clap and emit clap event', () => {
            const clapCallback = jest.fn();
            processor.on('clap', clapCallback);

            // Simulate a clap sound
            simulateClap(mockAnalyser, 0.8);

            // Trigger the analysis cycle
            jest.runOnlyPendingTimers();

            expect(clapCallback).toHaveBeenCalled();
        });

        test('should enforce cooldown period between claps', () => {
            const clapCallback = jest.fn();
            processor.on('clap', clapCallback);

            // First clap
            simulateClap(mockAnalyser, 0.8);
            jest.runOnlyPendingTimers();
            expect(clapCallback).toHaveBeenCalledTimes(1);

            // Second clap immediately after (within cooldown) should be ignored
            simulateClap(mockAnalyser, 0.8);
            jest.runOnlyPendingTimers();
            expect(clapCallback).toHaveBeenCalledTimes(1);

            // Advance time beyond cooldown period
            advanceTimersByTime(processor._cooldownPeriod + 1);

            // Third clap after cooldown should be detected
            simulateClap(mockAnalyser, 0.8);
            jest.runOnlyPendingTimers();
            expect(clapCallback).toHaveBeenCalledTimes(2);
        });

        test('should ignore sounds below threshold', () => {
            const clapCallback = jest.fn();
            processor.on('clap', clapCallback);

            // Simulate a weak sound
            simulateClap(mockAnalyser, 0.1);

            jest.runOnlyPendingTimers();

            expect(clapCallback).not.toHaveBeenCalled();
        });

        test('should filter sounds outside the frequency range', () => {
            const clapCallback = jest.fn();
            processor.on('clap', clapCallback);

            // Override the frequency data to simulate sound outside the range
            mockAnalyser.getFloatFrequencyData.mockImplementation(buffer => {
                for (let i = 0; i < buffer.length; i++) {
                    // Only frequencies below 1000Hz (outside our default range)
                    const freqInHz = i * 44100 / 2048;
                    if (freqInHz < 1000) {
                        buffer[i] = -30;
                    } else {
                        buffer[i] = -80;
                    }
                }
            });

            // Simulate a loud sound but with wrong frequency profile
            simulateClap(mockAnalyser, 0.8);

            jest.runOnlyPendingTimers();

            expect(clapCallback).not.toHaveBeenCalled();
        });
    });
}); 