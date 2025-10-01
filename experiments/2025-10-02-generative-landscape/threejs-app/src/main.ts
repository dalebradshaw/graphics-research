import "./style.css";
import {
  Clock,
  Color,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer
} from "three";

const canvas = document.getElementById("scene") as HTMLCanvasElement;
const info = document.createElement("div");
info.className = "info";
info.innerHTML = `
  <strong>Reference:</strong> yt-7dm776rZz-s<br/>
  <span>Inspired by Ducky3D generative landscape tutorial.</span>
`;
document.body.appendChild(info);
const renderer = new WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(new Color("#05060a"));

const scene = new Scene();
const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.2, 2.1);

const geometry = new PlaneGeometry(2.5, 2.5, 256, 256);
geometry.rotateX(-Math.PI / 2);

const uniforms = {
  uTime: { value: 0 },
  uResolution: { value: new Vector2(window.innerWidth, window.innerHeight) }
};

const material = new ShaderMaterial({
  uniforms,
  vertexShader: /* glsl */ `
    uniform float uTime;
    varying vec2 vUv;

    float fbm(vec2 p) {
      float total = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      for (int i = 0; i < 5; i++) {
        total += amplitude * sin(p.x * frequency) * cos(p.y * frequency);
        frequency *= 1.9;
        amplitude *= 0.55;
      }
      return total;
    }

    void main() {
      vUv = uv;
      vec3 pos = position;
      float height = fbm(uv * 3.0 + uTime * 0.1);
      pos.y += height * 0.25;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    varying vec2 vUv;

    void main() {
      float shade = smoothstep(0.0, 1.0, vUv.y);
      vec3 base = mix(vec3(0.02, 0.09, 0.12), vec3(0.18, 0.65, 0.75), shade);
      gl_FragColor = vec4(base, 1.0);
    }
  `
});

const terrain = new Mesh(geometry, material);
scene.add(terrain);

const clock = new Clock();

function onResize() {
  const { innerWidth, innerHeight } = window;
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  uniforms.uResolution.value.set(innerWidth, innerHeight);
}

window.addEventListener("resize", onResize);

function render() {
  uniforms.uTime.value = clock.getElapsedTime();
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

render();
