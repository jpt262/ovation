import ClapSwitch from '../../src/index';
import AudioProcessor from '../../src/audio-processor';
import StateManager from '../../src/state-manager';
import * as AudioUtils from '../../src/utils/audio-utils';

// Mock the AudioProcessor and StateManager classes
jest.mock('../../src/audio-processor');
jest.mock('../../src/state-manager');

describe('ClapSwitch', () => {
    let clapSwitch;
    let mockAudioProcessor;
    let mockStateManager;

    beforeEach(() => {
        jest.useFakeTimers();
        // Clear mocks
        AudioProcessor.mockClear();
        StateManager.mockClear();

        // Set up mock implementations
        mockAudioProcessor = {
            start: jest.fn().mockResolvedValue(undefined),
            stop: jest.fn(),
            isListening: jest.fn().mockReturnValue(false),
            on: jest.fn(),
            emit: jest.fn()
        };

        mockStateManager = {
            isOn: jest.fn().mockReturnValue(false),
            toggle: jest.fn().mockReturnValue(true),
            on: jest.fn().mockReturnValue(true),
            off: jest.fn().mockReturnValue(true),
            emit: jest.fn(),
            on: jest.fn()
        };

        // Set up mock returns
        AudioProcessor.mockImplementation(() => mockAudioProcessor);
        StateManager.mockImplementation(() => mockStateManager);

        // Spy on hasMicrophoneSupport
        jest.spyOn(AudioUtils, 'hasMicrophoneSupport').mockResolvedValue(true);
        jest.spyOn(AudioUtils, 'isAudioSupported').mockReturnValue(true);

        // Create a fresh instance for each test
        clapSwitch = new ClapSwitch();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    describe('constructor', () => {
        test('should initialize with default options', () => {
            expect(clapSwitch.options).toEqual({
                requiredClaps: 2,
                clapTimeout: 1000,
                clapInterval: 500,
                threshold: 0.3,
                minDecibels: -45,
                frequencyRange: [2000, 4000],
                autoStart: false,
                statePersistence: false,
                debug: false
            });
        });

        test('should create AudioProcessor with correct options', () => {
            expect(AudioProcessor).toHaveBeenCalledWith({
                threshold: 0.3,
                minDecibels: -45,
                frequencyRange: [2000, 4000],
                debug: false
            });
        });

        test('should create StateManager with correct options', () => {
            expect(StateManager).toHaveBeenCalledWith({
                statePersistence: false
            });
        });

        test('should initialize clap pattern variables', () => {
            expect(clapSwitch._clapCount).toBe(0);
            expect(clapSwitch._clapTimer).toBeNull();
        });

        test('should set up event listeners', () => {
            expect(mockAudioProcessor.on).toHaveBeenCalledWith('clap', expect.any(Function));
            expect(mockStateManager.on).toHaveBeenCalledWith('toggle', expect.any(Function));
        });

        test('should auto-start if configured', () => {
            const autoStartSwitch = new ClapSwitch({ autoStart: true });

            // Should call start after a timeout
            expect(mockAudioProcessor.start).not.toHaveBeenCalled();

            jest.runAllTimers();

            expect(mockAudioProcessor.start).toHaveBeenCalled();
        });

        test('should emit error if Web Audio API is not supported', () => {
            AudioUtils.isAudioSupported.mockReturnValueOnce(false);

            const errorSpy = jest.fn();
            const unsupportedSwitch = new ClapSwitch();
            unsupportedSwitch.on('error', errorSpy);

            expect(errorSpy).toHaveBeenCalled();
            expect(AudioProcessor).not.toHaveBeenCalled();
        });
    });

    describe('start', () => {
        test('should check for microphone support', async () => {
            await clapSwitch.start();

            expect(AudioUtils.hasMicrophoneSupport).toHaveBeenCalled();
        });

        test('should start the audio processor', async () => {
            await clapSwitch.start();

            expect(mockAudioProcessor.start).toHaveBeenCalled();
        });

        test('should emit start event', async () => {
            const startCallback = jest.fn();
            clapSwitch.on('start', startCallback);

            await clapSwitch.start();

            expect(startCallback).toHaveBeenCalled();
        });

        test('should throw error if Web Audio API is not supported', async () => {
            AudioUtils.isAudioSupported.mockReturnValueOnce(false);

            const unsupportedSwitch = new ClapSwitch();

            await expect(unsupportedSwitch.start()).rejects.toThrow('Web Audio API is not supported');
        });

        test('should throw error if no microphone is detected', async () => {
            AudioUtils.hasMicrophoneSupport.mockResolvedValueOnce(false);

            const errorSpy = jest.fn();
            clapSwitch.on('error', errorSpy);

            await expect(clapSwitch.start()).rejects.toThrow('No microphone detected');
            expect(errorSpy).toHaveBeenCalled();
        });

        test('should propagate errors from audio processor', async () => {
            mockAudioProcessor.start.mockRejectedValueOnce(new Error('Test error'));

            const errorSpy = jest.fn();
            clapSwitch.on('error', errorSpy);

            await expect(clapSwitch.start()).rejects.toThrow('Test error');
            expect(errorSpy).toHaveBeenCalled();
        });
    });

    describe('stop', () => {
        test('should stop the audio processor', () => {
            clapSwitch.stop();

            expect(mockAudioProcessor.stop).toHaveBeenCalled();
        });

        test('should emit stop event', () => {
            const stopCallback = jest.fn();
            clapSwitch.on('stop', stopCallback);

            clapSwitch.stop();

            expect(stopCallback).toHaveBeenCalled();
        });
    });

    describe('isListening', () => {
        test('should return audio processor listening state', () => {
            mockAudioProcessor.isListening.mockReturnValue(true);

            expect(clapSwitch.isListening()).toBe(true);

            mockAudioProcessor.isListening.mockReturnValue(false);

            expect(clapSwitch.isListening()).toBe(false);
        });
    });

    describe('isOn', () => {
        test('should return state manager state', () => {
            mockStateManager.isOn.mockReturnValue(true);

            expect(clapSwitch.isOn()).toBe(true);

            mockStateManager.isOn.mockReturnValue(false);

            expect(clapSwitch.isOn()).toBe(false);
        });
    });

    describe('toggle', () => {
        test('should call state manager toggle', () => {
            clapSwitch.toggle();

            expect(mockStateManager.toggle).toHaveBeenCalled();
        });

        test('should return the new state', () => {
            mockStateManager.toggle.mockReturnValue(true);

            expect(clapSwitch.toggle()).toBe(true);

            mockStateManager.toggle.mockReturnValue(false);

            expect(clapSwitch.toggle()).toBe(false);
        });
    });

    describe('on method', () => {
        test('should call state manager on', () => {
            clapSwitch.on();

            expect(mockStateManager.on).toHaveBeenCalled();
        });

        test('should return whether state changed', () => {
            mockStateManager.on.mockReturnValue(true);

            expect(clapSwitch.on()).toBe(true);

            mockStateManager.on.mockReturnValue(false);

            expect(clapSwitch.on()).toBe(false);
        });
    });

    describe('off method', () => {
        test('should call state manager off', () => {
            clapSwitch.off();

            expect(mockStateManager.off).toHaveBeenCalled();
        });

        test('should return whether state changed', () => {
            mockStateManager.off.mockReturnValue(true);

            expect(clapSwitch.off()).toBe(true);

            mockStateManager.off.mockReturnValue(false);

            expect(clapSwitch.off()).toBe(false);
        });
    });

    describe('clap pattern detection', () => {
        let clapHandler;

        beforeEach(() => {
            // Extract the clap handler function registered with the AudioProcessor
            clapHandler = mockAudioProcessor.on.mock.calls.find(call => call[0] === 'clap')[1];
        });

        test('should increment clap counter when clap detected', () => {
            clapHandler();

            expect(clapSwitch._clapCount).toBe(1);
        });

        test('should emit clap event with current count', () => {
            const clapCallback = jest.fn();
            clapSwitch.on('clap', clapCallback);

            clapHandler();

            expect(clapCallback).toHaveBeenCalledWith(1);
        });

        test('should toggle state when required claps are detected', () => {
            // Mock requiredClaps = 2
            clapSwitch.options.requiredClaps = 2;

            // First clap
            clapHandler();
            expect(mockStateManager.toggle).not.toHaveBeenCalled();

            // Second clap
            clapHandler();
            expect(mockStateManager.toggle).toHaveBeenCalled();

            // Counter should be reset
            expect(clapSwitch._clapCount).toBe(0);
        });

        test('should emit pattern event when pattern is completed', () => {
            const patternCallback = jest.fn();
            clapSwitch.on('pattern', patternCallback);

            // Mock requiredClaps = 2
            clapSwitch.options.requiredClaps = 2;

            // Two claps
            clapHandler();
            clapHandler();

            expect(patternCallback).toHaveBeenCalledWith(2);
        });

        test('should set timeout to reset clap counter', () => {
            // First clap
            clapHandler();

            expect(clapSwitch._clapTimer).not.toBeNull();

            // Advance time past the timeout
            jest.advanceTimersByTime(clapSwitch.options.clapTimeout + 1);

            // Counter should be reset
            expect(clapSwitch._clapCount).toBe(0);
        });

        test('should emit pattern-canceled event when pattern times out', () => {
            const cancelCallback = jest.fn();
            clapSwitch.on('pattern-canceled', cancelCallback);

            // First clap
            clapHandler();

            // Advance time past the timeout
            jest.advanceTimersByTime(clapSwitch.options.clapTimeout + 1);

            expect(cancelCallback).toHaveBeenCalledWith(1);
        });

        test('should clear existing timer when new clap arrives', () => {
            // First clap
            clapHandler();

            const firstTimer = clapSwitch._clapTimer;

            // Second clap before timeout
            clapHandler();

            const secondTimer = clapSwitch._clapTimer;

            expect(firstTimer).not.toBe(secondTimer);
        });
    });
}); 