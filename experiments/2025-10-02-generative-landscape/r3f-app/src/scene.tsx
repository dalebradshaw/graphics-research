import { useMemo } from "react";
import { ShaderMaterial, Vector2 } from "three";
import { extend, useFrame, ReactThreeFiber } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";

const LandscapeMaterial = shaderMaterial(
  {
    uTime: 0,
    uResolution: new Vector2(1, 1)
  },
  /* glsl */ `
    uniform float uTime;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    float fbm(vec2 p) {
      float total = 0.0;
      float amplitude = 0.5;
      float frequency = 1.0;
      for (int i = 0; i < 5; i++) {
        total += amplitude * noise(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
      }
      return total;
    }

    void main() {
      vUv = uv;
      vec3 transformed = position;
      float elevation = fbm(uv * 2.8 + uTime * 0.05);
      transformed.y += elevation * 0.4;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
    }
  `,
  /* glsl */ `
    varying vec2 vUv;
    void main() {
      float shade = smoothstep(0.0, 1.0, vUv.y);
      vec3 color = mix(vec3(0.03, 0.08, 0.12), vec3(0.2, 0.75, 0.82), shade);
      gl_FragColor = vec4(color, 1.0);
    }
  `
);

extend({ LandscapeMaterial });

type LandscapeMaterialImpl = typeof LandscapeMaterial & ShaderMaterial;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      landscapeMaterial: ReactThreeFiber.Object3DNode<LandscapeMaterialImpl, typeof LandscapeMaterial>;
    }
  }
}

export function Landscape() {
  const material = useMemo(() => new LandscapeMaterial(), []);

  useFrame(({ clock, size }) => {
    material.uniforms.uTime.value = clock.getElapsedTime();
    material.uniforms.uResolution.value.set(size.width, size.height);
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[3, 3, 256, 256]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
