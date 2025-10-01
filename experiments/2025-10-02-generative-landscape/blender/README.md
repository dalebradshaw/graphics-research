# Blender MCP Workflow

This folder holds Blender-specific assets and scripts for the generative landscape pipeline. The goal is to iterate in Blender, export geometry/material data through Blender's MaterialX/MCP pipeline (or glTF) and reuse it in the Three.js / React Three Fiber scaffolds.

## Setup
1. Enable the **Blender MCP (Material Capture Pipeline)** or the official glTF exporter:
   - Blender → `Edit` → `Preferences` → `Add-ons` → enable `Import-Export: glTF 2.0`.
   - For MCP, install the latest release from the Blender Experimental builds.
2. Create a dedicated collection (e.g., `MCP_Export`) containing the procedural mesh / instanced geometry you want to export.
3. Bake geometry if required:
   - Apply modifiers / geometry nodes to a duplicate object.
   - Convert curves to meshes when targeting Three.js.
4. Export:
   - **Via MCP:** `File` → `Export` → `MCP` → target `../threejs-app/public/assets/landscape.mcp`.
   - **Via glTF:** `File` → `Export` → `glTF 2.0` → target `../threejs-app/public/assets/landscape.glb` with `Selected Objects` enabled.

## Recommended asset structure
```
blender/
  scenes/
    generative-landscape.blend
  exports/
    landscape.glb
    landscape.json        # MCP metadata if applicable
  scripts/
    export_mcp.py         # helper to automate export pipeline
```

## Linking into Three.js / R3F
- Three.js: load assets via `GLTFLoader` or a custom MCP parser in `threejs-app/src/main.ts`.
- React Three Fiber: use `useGLTF` from `@react-three/drei` inside `r3f-app/src/scene.tsx`.
- Keep references to corpus entries in commit messages / comments for traceability.

## Next steps
- [ ] Automate MCP export (`scripts/export_mcp.py`) to batch multiple variants.
- [ ] Store shader parameter presets that mirror Blender node setups for cross-verification.
- [ ] Add viewport captures (`artefacts/`) to compare Blender vs web renders.
