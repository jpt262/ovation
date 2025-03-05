// Mock for Web Audio API
class AudioContext {
    constructor() {
        this.state = 'running';
        this.sampleRate = 44100;
    }

    createAnalyser() {
        return {
            fftSize: 1024,
            frequencyBinCount: 512,
            smoothingTimeConstant: 0.8,
            connect: jest.fn(),
            disconnect: jest.fn(),
            getFloatTimeDomainData: jest.fn(buffer => {
                // Fill buffer with some test data
                for (let i = 0; i < buffer.length; i++) {
                    buffer[i] = Math.sin(i / 10) * 0.5;
                }
            }),
            getFloatFrequencyData: jest.fn(buffer => {
                // Fill buffer with some test frequency data
                for (let i = 0; i < buffer.length; i++) {
                    buffer[i] = -100 + (i < 100 ? i : 0);
                }
            })
        };
    }

    createMediaStreamSource() {
        return {
            connect: jest.fn(),
            disconnect: jest.fn()
        };
    }

    resume() {
        this.state = 'running';
        return Promise.resolve();
    }
}

class MediaStream {
    constructor() {
        this.tracks = [
            { stop: jest.fn() },
            { stop: jest.fn() }
        ];
    }

    getTracks() {
        return this.tracks;
    }
}

// Mock window and navigator objects
global.window = {
    AudioContext,
    webkitAudioContext: AudioContext,
    localStorage: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn()
    },
    requestAnimationFrame: callback => {
        return setTimeout(callback, 0);
    },
    cancelAnimationFrame: id => {
        clearTimeout(id);
    }
};

global.navigator = {
    mediaDevices: {
        getUserMedia: jest.fn().mockImplementation(() => Promise.resolve(new MediaStream())),
        enumerateDevices: jest.fn().mockImplementation(() => Promise.resolve([
            { kind: 'audioinput', deviceId: 'default' }
        ]))
    }
};

// Create mock for Date.now()
global.Date.now = jest.fn(() => 1000);

// Console mocks
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

// Mock HTMLElement
class HTMLElement {
    constructor() {
        this.classList = {
            add: jest.fn(),
            remove: jest.fn(),
            toggle: jest.fn()
        };
        this.style = {};
    }
}

global.HTMLElement = HTMLElement;

// Mock document
global.document = {
    createElement: () => new HTMLElement(),
    querySelector: jest.fn(() => new HTMLElement()),
    getElementById: jest.fn(() => new HTMLElement())
};

// Helper to simulate clock ticking forward
global.advanceTimersByTime = time => {
    const now = Date.now();
    Date.now.mockImplementation(() => now + time);
    jest.advanceTimersByTime(time);
};

// Helper to simulate a clap sound
global.simulateClap = (analyser, amplitude = 0.8) => {
    // Override getFloatTimeDomainData to return a signal resembling a clap
    analyser.getFloatTimeDomainData.mockImplementation(buffer => {
        // Create sharp transient similar to a clap
        for (let i = 0; i < buffer.length; i++) {
            // High amplitude at the start that quickly decays
            const decay = Math.exp(-i / 20);
            buffer[i] = amplitude * decay * (Math.random() * 0.4 + 0.8);
        }
    });

    // Override getFloatFrequencyData to simulate clap frequency components
    analyser.getFloatFrequencyData.mockImplementation(buffer => {
        for (let i = 0; i < buffer.length; i++) {
            // Concentrate energy in the mid-high frequency range typical of claps
            const freqInHz = i * 44100 / 2048;
            if (freqInHz > 2000 && freqInHz < 4000) {
                buffer[i] = -30 + (Math.random() * 10);
            } else {
                buffer[i] = -80 + (Math.random() * 10);
            }
        }
    });
}; 