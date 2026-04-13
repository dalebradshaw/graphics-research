---
title: Papercraft First Pass Implementation
tags:
  - papercraft
  - implementation
  - lightingmodelsrk
  - media-score-studio
aliases:
  - First Pass Implementation
---

# Papercraft First Pass Implementation

## Scope

This note records the first implementation pass that moved the research out of notes and into app code.

Implementation target:

- `/Users/dalebradshaw/motion-experiments/LightingModelsRK`

This is still a fixture-driven prototype, not a generalized unfolding editor.

## What landed

### 1. Core papercraft types

Added:

- `SeamState`
- `FoldPolarity`
- `PapercraftEdgeSemantic`
- `FlapKind`
- `PapercraftFacePolygon`
- `PapercraftEdgeSegment`
- `FlapParameters`
- `FlapAttachment`
- `PapercraftFlapPolygon`
- `FaceAdjacency`
- `PartComponent`
- `PapercraftLayoutModel`

File:

- `/Users/dalebradshaw/motion-experiments/LightingModelsRK/LightingModelsRKPackage/Sources/LightingModelsRKFeature/PapercraftLayoutModel.swift`

Why it matters:

- the prototype now has explicit seam, fold, flap, and part vocabulary
- the 2D layout no longer has to be treated as anonymous drawing output

### 2. Cube fixture routed through the core model

The box layout builder now returns a full `PapercraftLayoutModel` instead of view-local ad hoc geometry.

File:

- `/Users/dalebradshaw/motion-experiments/LightingModelsRK/LightingModelsRKPackage/Sources/LightingModelsRKFeature/BoxLayoutModel.swift`

Current cube semantics:

- `6` faces
- `5` joined structural adjacencies
- `1` open seam adjacency for closure
- `7` flap polygons
- `1` seam flap
- explicit `fold`, `tabFold`, and `cut` edge semantics
- registration marks preserved separately

### 3. 2D renderer now consumes the semantic model

The box rendering path in the layout view now draws:

- face fills
- flap polygons
- cut edges
- structural fold edges
- tab-fold edges
- registration marks

File:

- `/Users/dalebradshaw/motion-experiments/LightingModelsRK/LightingModelsRKPackage/Sources/LightingModelsRKFeature/ProjectionLayoutView.swift`

### 4. Regression tests for the first pass

Added tests for:

- stable cube semantic counts
- flap/base-edge linkage

File:

- `/Users/dalebradshaw/motion-experiments/LightingModelsRK/LightingModelsRKPackage/Tests/LightingModelsRKFeatureTests/LightingModelsRKFeatureTests.swift`

### 5. USDZ viewport zoom and recentering

The 3D view now supports:

- orbit by drag
- zoom by magnification gesture
- explicit zoom in/out/reset controls
- recentering loaded USDZ content around its visual bounds center

Files:

- `/Users/dalebradshaw/motion-experiments/LightingModelsRK/LightingModelsRKPackage/Sources/LightingModelsRKFeature/SceneCoordinator.swift`
- `/Users/dalebradshaw/motion-experiments/LightingModelsRK/LightingModelsRKPackage/Sources/LightingModelsRKFeature/SceneView.swift`

## What this first pass deliberately does not do

- generalized unfolding from arbitrary meshes
- editable seam selection UI
- automatic shortest-path cutline tools
- flap optimization
- page packing
- SVG/PDF serializers
- tetrahedron or cylinder fixtures

## Verification

Verified paths:

- `swift build`
- `swift test`
- `./script/build_and_run.sh --verify`

Project:

- `/Users/dalebradshaw/motion-experiments/LightingModelsRK`

## Conclusion

This first pass is enough to stop reasoning only in notes.

The prototype now has a real papercraft core model for the cube, plus a usable 3D viewport for USDZ inspection. The next work should extend the same model outward, not invent a second representation.
