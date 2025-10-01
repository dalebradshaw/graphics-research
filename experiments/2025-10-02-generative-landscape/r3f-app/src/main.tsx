import React from "react";
import ReactDOM from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense } from "react";
import "./style.css";
import { Landscape } from "./scene";

const root = ReactDOM.createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <section className="layout">
      <aside>
        <h1>Generative Landscape (R3F)</h1>
        <p>
          Reference: <code>yt-7dm776rZz-s</code>
        </p>
        <ul>
          <li>Geometry nodes heightmap reinterpreted as shader displacement.</li>
          <li>Extendable to import Blender MCP exports (see README).</li>
          <li>Use this scaffold to iterate quickly across web + Blender.</li>
        </ul>
      </aside>
      <Canvas camera={{ position: [0, 1.4, 2.4], fov: 45 }}>
        <color attach="background" args={["#05060a"]} />
        <Suspense fallback={null}>
          <Landscape />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={1.2} maxDistance={4} />
      </Canvas>
    </section>
  </React.StrictMode>
);
