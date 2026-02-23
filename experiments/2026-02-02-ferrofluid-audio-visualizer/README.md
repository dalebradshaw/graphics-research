# Ferrofluid Audio Visualizer

A real-time audio-reactive 3D particle system inspired by [@sabosugi's Three.js demo](https://twitter.com/sabosugi/status/2015719730007490923).

## Overview

This experiment creates a ferrofluid-like visualization that responds to microphone input. It features:

- **5000 particles** arranged in a spherical formation
- **Real-time audio analysis** using Web Audio API
- **Custom GLSL shaders** for metallic/ferrofluid appearance
- **Frequency-based reactions** (low, mid, high bands)
- **Audio visualizer bars** showing frequency spectrum
- **Mouse interaction** for camera control
- **Dynamic lighting** that pulses with audio

## How to Run

```bash
cd experiments/2026-02-02-ferrofluid-audio-visualizer
npm install
npm run dev
```

Then open your browser to `http://localhost:3000` and click "Start Audio". Allow microphone access when prompted.

## Technical Details

### Audio Processing
- Uses Web Audio API's `AnalyserNode` for frequency analysis
- FFT size: 256 bins
- Three frequency bands: Low (bass), Mid, High (treble)
- Smoothing time constant: 0.8 for fluid motion

### Visual Effects
- **Vertex shader**: Displaces particles based on audio amplitude
- **Fragment shader**: Creates circular particles with soft edges and metallic look
- **Additive blending**: Creates glowing effect when particles overlap
- **Fog**: Adds depth and atmosphere

### Interaction
- Audio reactivity creates "spikes" and waves in the particle sphere
- Mouse movement controls camera angle
- Real-time FPS and particle count display
- Frequency visualization bars at bottom

## Inspired By

This implementation is based on concepts from the X bookmark by @sabosugi showing a ferrofluid audio visualizer using Three.js. The original used CodePen and demonstrated how audio input can drive beautiful 3D visuals.

## Resources

- [Three.js Documentation](https://threejs.org/docs/)
- [Web Audio API Guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [GLSL Shaders](https://thebookofshaders.com/)
- Original inspiration: https://codepen.io/sabosugi/full/XJKeqZj

## License

MIT - Feel free to use and modify!
