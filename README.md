# Ovation

A lightweight, vanilla JavaScript NPM module for adding clap-activated controls to any web application.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Tests](https://img.shields.io/badge/tests-passing-brightgreen)

## Features

- 👏 Toggle functionality ON/OFF with claps
- 🎛️ Configurable clap patterns (single, double, or custom sequences)
- 🔊 Advanced audio processing for reliable clap detection
- 🔄 Event-based API for flexible integration
- 📱 Works across desktop and mobile browsers
- 🪶 Zero dependencies, vanilla JavaScript
- 🧪 Comprehensive unit test suite

## Installation

```bash
npm install ovation
```

Or use via CDN:

```html
<script src="https://unpkg.com/ovation@1.0.0/dist/ovation.min.js"></script>
```

## Quick Start

```javascript
import ClapSwitch from 'ovation';

// Initialize with default settings
const clapSwitch = new ClapSwitch();

// Start listening for claps
clapSwitch.start();

// React to toggle events
clapSwitch.on('toggle', (isOn) => {
  console.log('Switched ' + (isOn ? 'ON' : 'OFF'));
  
  // Control any application feature
  if (isOn) {
    document.body.style.backgroundColor = 'white';
  } else {
    document.body.style.backgroundColor = 'black';
  }
});
```

## Browser Compatibility

Works in all modern browsers that support the Web Audio API:
- Chrome 34+
- Firefox 25+
- Safari 14.1+
- Edge 79+

## Permissions

This module requires microphone access. The browser will prompt users for permission when you call `start()`. For better user experience, explain to your users why the microphone is needed before initializing.

## API Reference

### Constructor

```javascript
const clapSwitch = new ClapSwitch(options);
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `requiredClaps` | Number | `2` | Number of claps required to trigger a toggle |
| `clapTimeout` | Number | `1000` | Maximum time window for clap sequence (ms) |
| `clapInterval` | Number | `500` | Expected time between claps (ms) |
| `threshold` | Number | `0.3` | Amplitude threshold for clap detection (0-1) |
| `minDecibels` | Number | `-45` | Minimum volume level to register |
| `frequencyRange` | Array | `[2000, 4000]` | Focus on these frequencies (Hz) |
| `autoStart` | Boolean | `false` | Start listening immediately |
| `statePersistence` | Boolean | `false` | Remember state between page loads |
| `debug` | Boolean | `false` | Log detection information to console |

### Methods

| Method | Description |
|--------|-------------|
| `start()` | Begin listening for claps |
| `stop()` | Stop listening for claps |
| `toggle()` | Manually toggle the switch state |
| `on(event, callback)` | Register an event listener |
| `off(event, callback)` | Remove an event listener |
| `isOn()` | Returns current switch state |
| `isListening()` | Returns whether actively listening for claps |

### Events

| Event | Callback Arguments | Description |
|-------|-------------------|-------------|
| `toggle` | `(isOn: boolean)` | Fired when switch toggles state |
| `clap` | `(clapCount: number)` | Fired when a clap is detected |
| `pattern` | `(clapCount: number)` | Fired when a complete clap pattern is detected |
| `start` | `none` | Fired when listening starts |
| `stop` | `none` | Fired when listening stops |
| `error` | `(error: Error)` | Fired when an error occurs |

## Advanced Examples

### Light Switch

```javascript
import ClapSwitch from 'ovation';

const light = document.querySelector('.light');
const clapSwitch = new ClapSwitch({ 
  requiredClaps: 2,
  threshold: 0.4
});

clapSwitch.on('toggle', (isOn) => {
  light.classList.toggle('on', isOn);
});

clapSwitch.on('clap', () => {
  // Visual feedback on each detected clap
  light.classList.add('flash');
  setTimeout(() => light.classList.remove('flash'), 200);
});

// Start on user interaction to comply with browser autoplay policies
document.getElementById('startButton').addEventListener('click', () => {
  clapSwitch.start();
});
```

### Custom Clap Pattern Detection

```javascript
import ClapSwitch from 'ovation';

// Create a switch that responds to a specific rhythm
const rhythmSwitch = new ClapSwitch({ 
  // We'll handle the pattern logic ourselves
  requiredClaps: 1
});

let clapTimes = [];
const rhythmPattern = [300, 600]; // Short gap, long gap (in ms)
const tolerance = 150; // Timing tolerance (ms)

rhythmSwitch.on('clap', () => {
  const now = Date.now();
  clapTimes.push(now);
  
  // Keep only claps within our pattern timeframe
  const patternDuration = rhythmPattern.reduce((sum, val) => sum + val, 0) + tolerance;
  clapTimes = clapTimes.filter(time => (now - time) < patternDuration);
  
  // Check if we have enough claps for a complete pattern
  if (clapTimes.length >= rhythmPattern.length + 1) {
    // Calculate intervals between claps
    const intervals = [];
    for (let i = 1; i < clapTimes.length; i++) {
      intervals.push(clapTimes[i] - clapTimes[i-1]);
    }
    
    // Check if intervals match our pattern (within tolerance)
    let patternMatch = true;
    for (let i = 0; i < rhythmPattern.length; i++) {
      if (Math.abs(intervals[i] - rhythmPattern[i]) > tolerance) {
        patternMatch = false;
        break;
      }
    }
    
    if (patternMatch) {
      rhythmSwitch.toggle();
      clapTimes = []; // Reset after successful pattern
    }
  }
});

rhythmSwitch.start();
```

## Testing

Ovation includes a comprehensive test suite to ensure reliability and stability. The tests cover all components of the module and focus on both functionality and edge cases.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Coverage

The test suite aims for high code coverage:
- 80% lines and statements
- 80% functions
- 70% branches

### What's Tested

- **EventEmitter**: Event registration, emission, and removal
- **Audio Utilities**: Audio processing algorithms, browser API interactions
- **State Manager**: State persistence, toggle functionality
- **Audio Processor**: Clap detection, microphone handling
- **ClapSwitch**: Integration of all components, pattern detection

### Test Environment

Tests run in a JSDOM environment with mocks for Web Audio API and browser permissions, allowing thorough testing of browser-specific functionality in a Node.js environment.

## Troubleshooting

### No claps detected

- Ensure microphone permissions are granted
- Try increasing the `threshold` value for less sensitive microphones
- Check that you're clapping loudly enough and close to the microphone
- Verify your browser supports the Web Audio API

### False positives

- Try decreasing the `threshold` value
- Adjust the `frequencyRange` to better match clap frequencies
- Increase the number of `requiredClaps` for toggle

### Browser permission errors

- Ensure HTTPS is used in production (required for microphone access)
- Call `start()` in response to a user gesture (click, tap, etc.)

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Development mode with live reloading
npm run dev

# Production build
npm run build
```

## License

MIT
