import EventEmitter from './utils/event-emitter';

/**
 * Manages the on/off state for the clap switch
 */
export default class StateManager extends EventEmitter {
    /**
     * @param {Object} options - Configuration options
     * @param {boolean} [options.statePersistence=false] - Whether to persist state between page loads
     * @param {string} [options.storageKey='ovation_state'] - Local storage key for persisting state
     * @param {boolean} [options.initialState=false] - Initial state of the switch
     */
    constructor(options = {}) {
        super();

        this.options = {
            statePersistence: false,
            storageKey: 'ovation_state',
            initialState: false,
            ...options
        };

        // Initialize state
        this._state = this._getInitialState();
    }

    /**
     * Get the current state
     * @returns {boolean} Current state (true = on, false = off)
     */
    isOn() {
        return this._state;
    }

    /**
     * Set the state explicitly
     * @param {boolean} state - New state
     * @returns {boolean} Whether state changed
     */
    setState(state) {
        // Convert to boolean to normalize input
        const newState = !!state;

        // No change
        if (newState === this._state) {
            return false;
        }

        this._state = newState;
        this._persistState();

        // Emit toggle event with new state
        this.emit('toggle', this._state);

        return true;
    }

    /**
     * Toggle the current state
     * @returns {boolean} New state after toggle
     */
    toggle() {
        const newState = !this._state;
        this.setState(newState);
        return newState;
    }

    /**
     * Turn on
     * @returns {boolean} Whether state changed
     */
    on() {
        return this.setState(true);
    }

    /**
     * Turn off
     * @returns {boolean} Whether state changed
     */
    off() {
        return this.setState(false);
    }

    /**
     * Get the initial state, considering persisted state if enabled
     * @private
     * @returns {boolean} Initial state
     */
    _getInitialState() {
        // Check for persisted state if enabled
        if (this.options.statePersistence && typeof window !== 'undefined' && window.localStorage) {
            try {
                const savedState = localStorage.getItem(this.options.storageKey);
                if (savedState !== null) {
                    return savedState === 'true';
                }
            } catch (error) {
                // localStorage might be unavailable (private browsing, etc.)
                console.warn('Failed to retrieve persisted state:', error);
            }
        }

        return this.options.initialState;
    }

    /**
     * Save current state to local storage if persistence is enabled
     * @private
     */
    _persistState() {
        if (this.options.statePersistence && typeof window !== 'undefined' && window.localStorage) {
            try {
                localStorage.setItem(this.options.storageKey, String(this._state));
            } catch (error) {
                // localStorage might be unavailable (private browsing, etc.)
                console.warn('Failed to persist state:', error);
            }
        }
    }
} 