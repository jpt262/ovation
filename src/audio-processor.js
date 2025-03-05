import EventEmitter from './utils/event-emitter';
import {
    createAudioContext,
    requestMicrophoneAccess,
    calculateRMS,
    amplitudeToDecibels,
    getAttackTime,
    calculateDominantFrequency
} from './utils/audio-utils';

/**
 * Audio processor that handles microphone input and detects claps
 */
export default class AudioProcessor extends EventEmitter {
    /**
     * @param {Object} options - Configuration options
     * @param {number} [options.threshold=0.3] - Amplitude threshold for clap detection (0-1)
     * @param {number} [options.minDecibels=-45] - Minimum volume level to register in dB
     * @param {Array<number>} [options.frequencyRange=[2000, 4000]] - Target frequency range for claps [min, max]
     * @param {number} [options.minAttackTime=5] - Minimum attack time in samples
     * @param {number} [options.maxAttackTime=20] - Maximum attack time in samples
     * @param {boolean} [options.debug=false] - Output debug information to console
     */
    constructor(options = {}) {
        super();

        this.options = {
            threshold: 0.3,
            minDecibels: -45,
            frequencyRange: [2000, 4000],
            minAttackTime: 5,
            maxAttackTime: 20,
            debug: false,
            ...options
        };

        this._isListening = false;
        this._audioContext = null;
        this._analyser = null;
        this._microphone = null;
        this._mediaStream = null;

        // For clap detection
        this._lastClapTime = 0;
        this._cooldownPeriod = 300; // ms between possible claps

        // Analysis buffers
        this._analyserBufferLength = 0;
        this._timeData = null;
        this._frequencyData = null;
        this._animationFrame = null;
    }

    /**
     * Start listening for claps
     * @returns {Promise<void>}
     */
    async start() {
        if (this._isListening) return;

        try {
            // Create audio context on user gesture to comply with browser policies
            if (!this._audioContext) {
                this._audioContext = createAudioContext();
            }

            // Resume context if suspended (Safari policy)
            if (this._audioContext.state === 'suspended') {
                await this._audioContext.resume();
            }

            // Request microphone access
            this._mediaStream = await requestMicrophoneAccess();

            // Set up audio processing pipeline
            this._setupAudioProcessing();

            // Start analyzing audio
            this._isListening = true;
            this._startAnalysis();

            this.emit('start');

            if (this.options.debug) {
                console.log('Clap detection started');
            }
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Stop listening for claps
     */
    stop() {
        if (!this._isListening) return;

        // Stop the animation frame
        if (this._animationFrame) {
            cancelAnimationFrame(this._animationFrame);
            this._animationFrame = null;
        }

        // Disconnect and clean up audio nodes
        if (this._microphone) {
            this._microphone.disconnect();
            this._microphone = null;
        }

        // Stop all tracks on the mediaStream
        if (this._mediaStream) {
            this._mediaStream.getTracks().forEach(track => track.stop());
            this._mediaStream = null;
        }

        this._isListening = false;
        this.emit('stop');

        if (this.options.debug) {
            console.log('Clap detection stopped');
        }
    }

    /**
     * Check if currently listening for claps
     * @returns {boolean} True if listening
     */
    isListening() {
        return this._isListening;
    }

    /**
     * Set up the Web Audio API processing pipeline
     * @private
     */
    _setupAudioProcessing() {
        // Create audio source from microphone
        this._microphone = this._audioContext.createMediaStreamSource(this._mediaStream);

        // Create analyser node for detecting claps
        this._analyser = this._audioContext.createAnalyser();
        this._analyser.fftSize = 1024; // Large enough for good frequency resolution
        this._analyser.smoothingTimeConstant = 0.2; // Lower for more responsive detection

        // Connect the microphone to the analyser
        this._microphone.connect(this._analyser);

        // Initialize analysis buffers
        this._analyserBufferLength = this._analyser.frequencyBinCount;
        this._timeData = new Float32Array(this._analyserBufferLength);
        this._frequencyData = new Float32Array(this._analyserBufferLength);
    }

    /**
     * Start continuous audio analysis
     * @private
     */
    _startAnalysis() {
        const analyze = () => {
            if (!this._isListening) return;

            // Get time-domain data
            this._analyser.getFloatTimeDomainData(this._timeData);

            // Calculate RMS value
            const rms = calculateRMS(this._timeData);
            const db = amplitudeToDecibels(rms);

            // Check if the sound is loud enough
            if (db > this.options.minDecibels && rms > this.options.threshold) {
                // Check if attack time is characteristic of a clap
                const attackTime = getAttackTime(this._timeData, this.options.threshold);

                // Get frequency data for additional verification
                this._analyser.getFloatFrequencyData(this._frequencyData);
                const dominantFreq = calculateDominantFrequency(
                    this._frequencyData,
                    this._audioContext.sampleRate,
                    this._analyser.fftSize
                );

                // Verify this is within the frequency range typical of claps
                const isInFrequencyRange =
                    dominantFreq >= this.options.frequencyRange[0] &&
                    dominantFreq <= this.options.frequencyRange[1];

                // Verify attack time is characteristic of a clap
                const hasCorrectAttackTime =
                    attackTime >= this.options.minAttackTime &&
                    attackTime <= this.options.maxAttackTime;

                const now = Date.now();
                const timeSinceLastClap = now - this._lastClapTime;

                // Debug output
                if (this.options.debug) {
                    console.log(`Potential sound detected:
            RMS: ${rms.toFixed(3)}, 
            dB: ${db.toFixed(1)}, 
            Attack: ${attackTime}, 
            Freq: ${dominantFreq.toFixed(0)}Hz,
            Cooldown: ${timeSinceLastClap}ms`);
                }

                // Detect clap based on all parameters and cooldown
                if (
                    isInFrequencyRange &&
                    hasCorrectAttackTime &&
                    timeSinceLastClap > this._cooldownPeriod
                ) {
                    this._lastClapTime = now;
                    this._onClapDetected();
                }
            }

            // Schedule next analysis
            this._animationFrame = requestAnimationFrame(analyze);
        };

        // Start the analysis loop
        this._animationFrame = requestAnimationFrame(analyze);
    }

    /**
     * Handle a detected clap
     * @private
     */
    _onClapDetected() {
        if (this.options.debug) {
            console.log('Clap detected!');
        }

        this.emit('clap');
    }
} 