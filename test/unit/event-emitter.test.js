import EventEmitter from '../../src/utils/event-emitter';

describe('EventEmitter', () => {
    let emitter;

    beforeEach(() => {
        emitter = new EventEmitter();
    });

    test('should initialize with empty events object', () => {
        expect(emitter.events).toEqual({});
    });

    describe('on()', () => {
        test('should register an event listener', () => {
            const callback = jest.fn();
            emitter.on('test', callback);

            expect(emitter.events.test).toBeDefined();
            expect(emitter.events.test.length).toBe(1);
            expect(emitter.events.test[0]).toBe(callback);
        });

        test('should register multiple listeners for the same event', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            emitter.on('test', callback1);
            emitter.on('test', callback2);

            expect(emitter.events.test.length).toBe(2);
            expect(emitter.events.test[0]).toBe(callback1);
            expect(emitter.events.test[1]).toBe(callback2);
        });

        test('should return the emitter for chaining', () => {
            const result = emitter.on('test', jest.fn());
            expect(result).toBe(emitter);
        });
    });

    describe('off()', () => {
        test('should remove a specific event listener', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            emitter.on('test', callback1);
            emitter.on('test', callback2);

            emitter.off('test', callback1);

            expect(emitter.events.test.length).toBe(1);
            expect(emitter.events.test[0]).toBe(callback2);
        });

        test('should remove all listeners for an event when no callback is provided', () => {
            emitter.on('test', jest.fn());
            emitter.on('test', jest.fn());

            emitter.off('test');

            expect(emitter.events.test).toBeUndefined();
        });

        test('should do nothing if event does not exist', () => {
            emitter.off('nonexistent');
            expect(emitter.events.nonexistent).toBeUndefined();
        });

        test('should return the emitter for chaining', () => {
            const result = emitter.off('test');
            expect(result).toBe(emitter);
        });
    });

    describe('emit()', () => {
        test('should call all listeners for an event', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();

            emitter.on('test', callback1);
            emitter.on('test', callback2);

            emitter.emit('test');

            expect(callback1).toHaveBeenCalledTimes(1);
            expect(callback2).toHaveBeenCalledTimes(1);
        });

        test('should pass arguments to the listeners', () => {
            const callback = jest.fn();

            emitter.on('test', callback);

            emitter.emit('test', 'arg1', 'arg2');

            expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
        });

        test('should do nothing if event does not exist', () => {
            // This should not throw
            emitter.emit('nonexistent');
        });

        test('should continue calling listeners even if some throw errors', () => {
            const errorCallback = jest.fn(() => {
                throw new Error('Test error');
            });
            const normalCallback = jest.fn();

            emitter.on('test', errorCallback);
            emitter.on('test', normalCallback);

            // Should not throw
            emitter.emit('test');

            expect(errorCallback).toHaveBeenCalledTimes(1);
            expect(normalCallback).toHaveBeenCalledTimes(1);
            expect(console.error).toHaveBeenCalled();
        });

        test('should return the emitter for chaining', () => {
            const result = emitter.emit('test');
            expect(result).toBe(emitter);
        });
    });

    describe('once()', () => {
        test('should register a one-time event listener', () => {
            const callback = jest.fn();

            emitter.once('test', callback);

            emitter.emit('test', 'arg');
            expect(callback).toHaveBeenCalledWith('arg');

            // Second emit should not call the callback again
            emitter.emit('test', 'arg2');
            expect(callback).toHaveBeenCalledTimes(1);

            // Event should be removed
            expect(emitter.events.test.length).toBe(0);
        });

        test('should return the emitter for chaining', () => {
            const result = emitter.once('test', jest.fn());
            expect(result).toBe(emitter);
        });
    });
}); 