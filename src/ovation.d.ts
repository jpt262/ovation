declare module 'ovation' {
  interface ClapSwitchOptions {
    /**
     * Number of claps required to trigger a toggle
     * @default 2
     */
    requiredClaps?: number;
    
    /**
     * Maximum time window for clap sequence (ms)
     * @default 1000
     */
    clapTimeout?: number;
    
    /**
     * Expected time between claps (ms)
     * @default 500
     */
    clapInterval?: number;
    
    /**
     * Amplitude threshold for clap detection (0-1)
     * @default 0.3
     */
    threshold?: number;
    
    /**
     * Minimum volume level to register
     * @default -45
     */
    minDecibels?: number;
    
    /**
     * Focus on these frequencies (Hz)
     * @default [2000, 4000]
     */
    frequencyRange?: [number, number];
    
    /**
     * Start listening immediately
     * @default false
     */
    autoStart?: boolean;
    
    /**
     * Remember state between page loads
     * @default false
     */
    statePersistence?: boolean;
    
    /**
     * Log detection information to console
     * @default false
     */
    debug?: boolean;
  }

  type EventCallback<T = any> = (data?: T) => void;

  class ClapSwitch {
    /**
     * Create a new clap-activated switch
     */
    constructor(options?: ClapSwitchOptions);
    
    /**
     * Start listening for claps
     */
    start(): Promise<void>;
    
    /**
     * Stop listening for claps
     */
    stop(): void;
    
    /**
     * Toggle the switch state manually
     * @returns New state after toggle
     */
    toggle(): boolean;
    
    /**
     * Turn the switch on
     * @returns Whether state changed
     */
    on(): boolean;
    
    /**
     * Turn the switch off
     * @returns Whether state changed
     */
    off(): boolean;
    
    /**
     * Check if currently listening for claps
     * @returns True if listening
     */
    isListening(): boolean;
    
    /**
     * Get the current switch state
     * @returns Current state (true = on, false = off)
     */
    isOn(): boolean;
    
    /**
     * Register an event listener
     * @param event Event name
     * @param callback Event callback function
     */
    on<T = any>(event: string, callback: EventCallback<T>): this;
    
    /**
     * Remove an event listener
     * @param event Event name
     * @param callback Event callback to remove
     */
    off(event: string, callback?: EventCallback): this;
    
    /**
     * Register a one-time event listener
     * @param event Event name
     * @param callback Event callback function
     */
    once<T = any>(event: string, callback: EventCallback<T>): this;
  }

  export default ClapSwitch;
} 