import * as THREE from 'three';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.FogExp2(0x050505, 0.02);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 30;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Audio context and analyzer
let audioContext = null;
let analyser = null;
let dataArray = null;
let source = null;
let isPlaying = false;

// Ferrofluid particle system
const PARTICLE_COUNT = 5000;
const particles = new THREE.BufferGeometry();
const positions = new Float32Array(PARTICLE_COUNT * 3);
const colors = new Float32Array(PARTICLE_COUNT * 3);
const sizes = new Float32Array(PARTICLE_COUNT);
const originalPositions = new Float32Array(PARTICLE_COUNT * 3);

// Initialize particles in a spherical shape
for (let i = 0; i < PARTICLE_COUNT; i++) {
  const i3 = i * 3;
  
  // Create a spherical distribution
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const radius = 5 + Math.random() * 10;
  
  positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
  positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
  positions[i3 + 2] = radius * Math.cos(phi);
  
  originalPositions[i3] = positions[i3];
  originalPositions[i3 + 1] = positions[i3 + 1];
  originalPositions[i3 + 2] = positions[i3 + 2];
  
  // Color gradient from cyan to magenta
  const t = i / PARTICLE_COUNT;
  colors[i3] = t;
  colors[i3 + 1] = 1.0 - t * 0.5;
  colors[i3 + 2] = 1.0;
  
  sizes[i] = Math.random() * 2 + 0.5;
}

particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

// Shader material for ferrofluid effect
const particleMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    audioLow: { value: 0 },
    audioMid: { value: 0 },
    audioHigh: { value: 0 }
  },
  vertexShader: `
    attribute float size;
    attribute vec3 color;
    varying vec3 vColor;
    varying float vAlpha;
    uniform float time;
    uniform float audioLow;
    uniform float audioMid;
    uniform float audioHigh;
    
    void main() {
      vColor = color;
      
      vec3 pos = position;
      
      // Audio-reactive displacement
      float displacement = audioLow * 5.0 + audioMid * 3.0 + audioHigh * 2.0;
      
      // Create ferrofluid-like spikes
      float spike = sin(pos.x * 2.0 + time * 3.0) * cos(pos.y * 2.0 + time * 2.0);
      pos += normalize(pos) * spike * displacement;
      
      // Add wave motion
      pos.x += sin(time + pos.y * 0.5) * audioMid * 2.0;
      pos.y += cos(time + pos.x * 0.5) * audioMid * 2.0;
      pos.z += sin(time * 0.5 + pos.z) * audioLow * 3.0;
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = size * (30.0 / -mvPosition.z) * (1.0 + audioHigh * 2.0);
      gl_Position = projectionMatrix * mvPosition;
      
      vAlpha = 0.6 + audioLow * 0.4;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vAlpha;
    
    void main() {
      // Create circular particle
      vec2 center = gl_PointCoord - vec2(0.5);
      float dist = length(center);
      
      if (dist > 0.5) discard;
      
      // Soft edge
      float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
      alpha *= vAlpha;
      
      // Metallic/ferrofluid look
      vec3 metallic = vColor * (1.0 + alpha * 0.5);
      
      gl_FragColor = vec4(metallic, alpha);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const particleSystem = new THREE.Points(particles, particleMaterial);
scene.add(particleSystem);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

const pointLight1 = new THREE.PointLight(0x00ffff, 2, 50);
pointLight1.position.set(10, 10, 10);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0xff00ff, 2, 50);
pointLight2.position.set(-10, -10, 10);
scene.add(pointLight2);

// Audio visualization bars
const visualizerContainer = document.getElementById('visualizer');
const barCount = 32;
const bars = [];

for (let i = 0; i < barCount; i++) {
  const bar = document.createElement('div');
  bar.className = 'bar';
  bar.style.height = '5px';
  visualizerContainer.appendChild(bar);
  bars.push(bar);
}

// Initialize audio
async function initAudio() {
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    
    isPlaying = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
  } catch (err) {
    console.error('Error accessing microphone:', err);
    alert('Could not access microphone. Please allow microphone access and try again.');
  }
}

// Stop audio
function stopAudio() {
  if (source) {
    source.disconnect();
    source = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  isPlaying = false;
  document.getElementById('startBtn').disabled = false;
  document.getElementById('stopBtn').disabled = true;
}

// Get audio frequency data
function getAudioData() {
  if (!analyser || !dataArray) return { low: 0, mid: 0, high: 0 };
  
  analyser.getByteFrequencyData(dataArray);
  
  // Calculate averages for different frequency ranges
  const third = Math.floor(dataArray.length / 3);
  
  let low = 0, mid = 0, high = 0;
  
  for (let i = 0; i < third; i++) {
    low += dataArray[i];
    mid += dataArray[i + third];
    high += dataArray[i + third * 2];
  }
  
  return {
    low: (low / third) / 255,
    mid: (mid / third) / 255,
    high: (high / third) / 255
  };
}

// Update visualizer bars
function updateVisualizer() {
  if (!dataArray) return;
  
  const step = Math.floor(dataArray.length / barCount);
  
  for (let i = 0; i < barCount; i++) {
    const value = dataArray[i * step];
    const height = Math.max(5, (value / 255) * 60);
    bars[i].style.height = height + 'px';
    
    // Color based on frequency
    const hue = (i / barCount) * 180 + 180;
    bars[i].style.background = `linear-gradient(to top, hsl(${hue}, 100%, 50%), hsl(${hue + 30}, 100%, 70%))`;
  }
}

// Animation loop
let time = 0;
let lastTime = 0;
let frameCount = 0;
let lastFpsTime = 0;

function animate(currentTime) {
  requestAnimationFrame(animate);
  
  const delta = (currentTime - lastTime) / 1000;
  lastTime = currentTime;
  time += delta;
  
  // FPS counter
  frameCount++;
  if (currentTime - lastFpsTime >= 1000) {
    document.getElementById('fps').textContent = `FPS: ${frameCount}`;
    frameCount = 0;
    lastFpsTime = currentTime;
  }
  
  // Get audio data
  const audio = getAudioData();
  
  // Update shader uniforms
  particleMaterial.uniforms.time.value = time;
  particleMaterial.uniforms.audioLow.value = audio.low;
  particleMaterial.uniforms.audioMid.value = audio.mid;
  particleMaterial.uniforms.audioHigh.value = audio.high;
  
  // Update visualizer
  updateVisualizer();
  
  // Rotate particle system
  particleSystem.rotation.y += 0.002 + audio.mid * 0.01;
  particleSystem.rotation.x += 0.001 + audio.low * 0.005;
  
  // Pulse lights with audio
  pointLight1.intensity = 2 + audio.low * 3;
  pointLight2.intensity = 2 + audio.high * 3;
  
  renderer.render(scene, camera);
}

// Event listeners
document.getElementById('startBtn').addEventListener('click', initAudio);
document.getElementById('stopBtn').addEventListener('click', stopAudio);

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Mouse interaction
let mouseX = 0, mouseY = 0;
document.addEventListener('mousemove', (event) => {
  mouseX = (event.clientX / window.innerWidth) * 2 - 1;
  mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
  
  camera.position.x += (mouseX * 5 - camera.position.x) * 0.05;
  camera.position.y += (mouseY * 5 - camera.position.y) * 0.05;
  camera.lookAt(scene.position);
});

// Update stats
document.getElementById('particles').textContent = `Particles: ${PARTICLE_COUNT}`;

// Start animation
animate(0);
