import StateManager from '../../src/state-manager';

describe('StateManager', () => {
    let stateManager;

    beforeEach(() => {
        // Clear localStorage mock
        window.localStorage.getItem.mockClear();
        window.localStorage.setItem.mockClear();

        // Default instance with persistence disabled
        stateManager = new StateManager();
    });

    describe('constructor', () => {
        test('should initialize with default options', () => {
            expect(stateManager.options).toEqual({
                statePersistence: false,
                storageKey: 'ovation_state',
                initialState: false
            });

            expect(stateManager.isOn()).toBe(false);
        });

        test('should accept custom options', () => {
            const customManager = new StateManager({
                statePersistence: true,
                storageKey: 'custom_key',
                initialState: true
            });

            expect(customManager.options).toEqual({
                statePersistence: true,
                storageKey: 'custom_key',
                initialState: true
            });
        });

        test('should use persisted state when statePersistence is enabled', () => {
            window.localStorage.getItem.mockReturnValueOnce('true');

            const persistentManager = new StateManager({
                statePersistence: true
            });

            expect(window.localStorage.getItem).toHaveBeenCalledWith('ovation_state');
            expect(persistentManager.isOn()).toBe(true);
        });

        test('should use initialState when no persisted state exists', () => {
            window.localStorage.getItem.mockReturnValueOnce(null);

            const persistentManager = new StateManager({
                statePersistence: true,
                initialState: true
            });

            expect(persistentManager.isOn()).toBe(true);
        });

        test('should handle localStorage errors gracefully', () => {
            window.localStorage.getItem.mockImplementationOnce(() => {
                throw new Error('Storage error');
            });

            const persistentManager = new StateManager({
                statePersistence: true,
                initialState: true
            });

            expect(persistentManager.isOn()).toBe(true);
            expect(console.warn).toHaveBeenCalled();
        });
    });

    describe('isOn', () => {
        test('should return the current state', () => {
            expect(stateManager.isOn()).toBe(false);

            // Set internal state and check
            stateManager._state = true;
            expect(stateManager.isOn()).toBe(true);
        });
    });

    describe('setState', () => {
        test('should update the state and emit toggle event', () => {
            const callback = jest.fn();
            stateManager.on('toggle', callback);

            stateManager.setState(true);

            expect(stateManager._state).toBe(true);
            expect(callback).toHaveBeenCalledWith(true);
        });

        test('should normalize input to boolean', () => {
            stateManager.setState(1);
            expect(stateManager._state).toBe(true);

            stateManager.setState(0);
            expect(stateManager._state).toBe(false);

            stateManager.setState('true');
            expect(stateManager._state).toBe(true);
        });

        test('should return true if state changed', () => {
            expect(stateManager.setState(true)).toBe(true);
        });

        test('should return false if state did not change', () => {
            stateManager._state = true;
            expect(stateManager.setState(true)).toBe(false);
        });

        test('should persist state when statePersistence is enabled', () => {
            const persistentManager = new StateManager({
                statePersistence: true
            });

            persistentManager.setState(true);

            expect(window.localStorage.setItem).toHaveBeenCalledWith('ovation_state', 'true');
        });

        test('should handle localStorage errors gracefully', () => {
            const persistentManager = new StateManager({
                statePersistence: true
            });

            window.localStorage.setItem.mockImplementationOnce(() => {
                throw new Error('Storage error');
            });

            persistentManager.setState(true);

            expect(console.warn).toHaveBeenCalled();
        });
    });

    describe('toggle', () => {
        test('should toggle state from false to true', () => {
            stateManager._state = false;

            const result = stateManager.toggle();

            expect(stateManager._state).toBe(true);
            expect(result).toBe(true);
        });

        test('should toggle state from true to false', () => {
            stateManager._state = true;

            const result = stateManager.toggle();

            expect(stateManager._state).toBe(false);
            expect(result).toBe(false);
        });

        test('should emit toggle event with new state', () => {
            const callback = jest.fn();
            stateManager.on('toggle', callback);

            stateManager.toggle();

            expect(callback).toHaveBeenCalledWith(true);
        });
    });

    describe('on', () => {
        test('should set state to true', () => {
            stateManager._state = false;

            stateManager.on();

            expect(stateManager._state).toBe(true);
        });

        test('should return true if state changed', () => {
            stateManager._state = false;
            expect(stateManager.on()).toBe(true);
        });

        test('should return false if state did not change', () => {
            stateManager._state = true;
            expect(stateManager.on()).toBe(false);
        });
    });

    describe('off', () => {
        test('should set state to false', () => {
            stateManager._state = true;

            stateManager.off();

            expect(stateManager._state).toBe(false);
        });

        test('should return true if state changed', () => {
            stateManager._state = true;
            expect(stateManager.off()).toBe(true);
        });

        test('should return false if state did not change', () => {
            stateManager._state = false;
            expect(stateManager.off()).toBe(false);
        });
    });
}); 