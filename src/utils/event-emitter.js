/**
 * Simple event emitter system
 */
export default class EventEmitter {
    constructor() {
        this.events = {};
    }

    /**
     * Register an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback function
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);

        return this; // Allow chaining
    }

    /**
     * Remove an event listener
     * @param {string} event - Event name 
     * @param {Function} [callback] - Event callback to remove (if omitted, all listeners for this event are removed)
     */
    off(event, callback) {
        if (!this.events[event]) return this;

        if (callback) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        } else {
            delete this.events[event];
        }

        return this; // Allow chaining
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {...any} args - Arguments to pass to listeners
     */
    emit(event, ...args) {
        if (!this.events[event]) return;

        this.events[event].forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });

        return this; // Allow chaining
    }

    /**
     * Register a one-time event listener
     * @param {string} event - Event name
     * @param {Function} callback - Event callback function
     */
    once(event, callback) {
        const onceWrapper = (...args) => {
            this.off(event, onceWrapper);
            callback(...args);
        };

        return this.on(event, onceWrapper);
    }
} 