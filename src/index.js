import AudioProcessor from './audio-processor';
import StateManager from './state-manager';
import EventEmitter from './utils/event-emitter';
import { isAudioSupported, hasMicrophoneSupport } from './utils/audio-utils';

/**
 * Main ClapSwitch class
 */
export default class ClapSwitch extends EventEmitter {
    /**
     * @param {Object} options - Configuration options
     * @param {number} [options.requiredClaps=2] - Number of claps required to trigger a toggle
     * @param {number} [options.clapTimeout=1000] - Max time window for clap sequence (ms)
     * @param {number} [options.clapInterval=500] - Expected time between claps (ms)
     * @param {number} [options.threshold=0.3] - Amplitude threshold for clap detection (0-1)
     * @param {number} [options.minDecibels=-45] - Minimum volume level to register
     * @param {Array<number>} [options.frequencyRange=[2000, 4000]] - Focus on these frequencies (Hz)
     * @param {boolean} [options.autoStart=false] - Start listening immediately
     * @param {boolean} [options.statePersistence=false] - Remember state between page loads
     * @param {boolean} [options.debug=false] - Log detection information to console
     */
    constructor(options = {}) {
        super();

        this.options = {
            requiredClaps: 2,
            clapTimeout: 1000,
            clapInterval: 500,
            threshold: 0.3,
            minDecibels: -45,
            frequencyRange: [2000, 4000],
            autoStart: false,
            statePersistence: false,
            debug: false,
            ...options
        };

        // Perform browser capability checks
        this._supportsWebAudio = isAudioSupported();

        if (!this._supportsWebAudio) {
            const error = new Error('Web Audio API is not supported in this browser.');
            this.emit('error', error);
            if (this.options.debug) {
                console.error(error);
            }
            return;
        }

        // Initialize components
        this._audioProcessor = new AudioProcessor({
            threshold: this.options.threshold,
            minDecibels: this.options.minDecibels,
            frequencyRange: this.options.frequencyRange,
            debug: this.options.debug
        });

        this._stateManager = new StateManager({
            statePersistence: this.options.statePersistence
        });

        // For clap pattern detection
        this._clapCount = 0;
        this._clapTimer = null;

        // Set up event listeners
        this._setupEventListeners();

        // Auto-start if configured
        if (this.options.autoStart) {
            // Wrap in timeout to give time for the page to load
            // and handle autoplay policy restrictions
            setTimeout(() => this.start(), 100);
        }
    }

    /**
     * Start listening for claps
     * @returns {Promise<void>}
     */
    async start() {
        if (!this._supportsWebAudio) {
            throw new Error('Web Audio API is not supported in this browser.');
        }

        // Check if microphone is available
        const hasMicrophone = await hasMicrophoneSupport();
        if (!hasMicrophone) {
            const error = new Error('No microphone detected on this device.');
            this.emit('error', error);
            throw error;
        }

        try {
            await this._audioProcessor.start();
            this.emit('start');
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Stop listening for claps
     */
    stop() {
        this._audioProcessor.stop();
        this.emit('stop');
    }

    /**
     * Check if currently listening for claps
     * @returns {boolean} True if listening
     */
    isListening() {
        return this._audioProcessor.isListening();
    }

    /**
     * Get the current switch state
     * @returns {boolean} Current state (true = on, false = off)
     */
    isOn() {
        return this._stateManager.isOn();
    }

    /**
     * Toggle the switch state manually
     * @returns {boolean} New state after toggle
     */
    toggle() {
        return this._stateManager.toggle();
    }

    /**
     * Turn the switch on
     * @returns {boolean} Whether state changed
     */
    on() {
        return this._stateManager.on();
    }

    /**
     * Turn the switch off
     * @returns {boolean} Whether state changed
     */
    off() {
        return this._stateManager.off();
    }

    /**
     * Set up internal event listeners
     * @private
     */
    _setupEventListeners() {
        // Forward events from components
        this._stateManager.on('toggle', isOn => {
            this.emit('toggle', isOn);
        });

        this._audioProcessor.on('error', error => {
            this.emit('error', error);
        });

        // Handle clap detection
        this._audioProcessor.on('clap', () => {
            this.emit('clap', this._clapCount + 1);
            this._handleClap();
        });
    }

    /**
     * Handle detected claps and manage patterns
     * @private
     */
    _handleClap() {
        // Increment clap counter
        this._clapCount++;

        // Clear existing timer
        if (this._clapTimer) {
            clearTimeout(this._clapTimer);
        }

        // If we've reached the required number of claps
        if (this._clapCount >= this.options.requiredClaps) {
            this.emit('pattern', this._clapCount);

            // Toggle the state
            this._stateManager.toggle();

            // Reset clap counter
            this._clapCount = 0;
        } else {
            // Set a timeout for the clap sequence
            this._clapTimer = setTimeout(() => {
                // Emit canceled pattern event if partial pattern was detected
                if (this._clapCount > 0) {
                    this.emit('pattern-canceled', this._clapCount);
                }
                // Reset clap counter
                this._clapCount = 0;
            }, this.options.clapTimeout);
        }
    }
} 