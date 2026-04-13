# Papercraft Cube Fixture Research

## Purpose

This note establishes the `Cube` as the first research-grade papercraft fixture for the app.

The goal is not to imitate Pepakura or Unfolder feature-for-feature. The goal is to lock one indisputable fixture that proves our core export geometry and UI vocabulary:

- 3D mesh baseline
- 2D net baseline
- cut versus fold separation
- perimeter-only tab placement
- seam closure logic
- registration marks for machine alignment

## Why the cube comes first

The cube is the cleanest base fixture because it exercises the whole pipeline without curvature ambiguity:

- face adjacency is obvious
- hinge lines are obvious
- closure seam is obvious
- tabs can be validated by inspection
- export layers can be checked visually and mechanically

This matches the way Pepakura’s own sample set starts with simple polyhedra before higher-curvature cases.

## External reference points

### Pepakura local package

Local files inspected:

- `/Users/dalebradshaw/Downloads/Pepakura/setup_pepakura617.exe`
- `/Users/dalebradshaw/Downloads/Pepakura/sample_platonic_solids/Cube.obj`
- `/Users/dalebradshaw/Downloads/Pepakura/sample_platonic_solids/Cube.pdo`

Observed facts:

- `Cube.obj` is a plain OBJ starter mesh with `8` vertices and `12` faces.
- `Cube.pdo` is a binary native Pepakura document, not a plain interchange file.
- The `.pdo` header contains `version 3` and also `Pepakura Designer 6`, suggesting a versioned document container written by the Pepakura 6 app family.

### Official Pepakura references

- Product page: <https://pepakura.tamasoft.co.jp/pepakura_designer/>
- Helpful features: <https://pepakura.tamasoft.co.jp/pepakura_designer/helpful-features/>
- Cutting plotter workflow: <https://pepakura.tamasoft.co.jp/pepakura_designer/dxf-exporter-for-silhouette-studio/>

Most relevant takeaways:

- OBJ is a primary interchange format.
- The authoring file stores much more than mesh import.
- Pre-unfold cutline control matters.
- 2D and 3D correspondence is a first-class editing mode.
- Cutter export is not just vectors. It needs alignment logic and separate treatment for cut and crease behavior.

## Fixture definition

### Mesh baseline

- Fixture name: `Cube`
- Source baseline: `Pepakura Cube.obj`
- Vertex count: `8`
- Face count: `12`

### Net baseline

- Net face count: `6`
- Structural hinges: `5`
- Perimeter tabs: `7`
- Dedicated seam tabs: `1`

### Net structure

Use the canonical cross net:

- four side faces in a horizontal strip
- top face hinged to the front face
- bottom face hinged to the front face
- one seam tab on the back face for final shell closure

### Tab rules

Rules locked by this fixture:

- tabs only belong on free perimeter edges
- no tabs may occupy interior hinge edges
- seam tabs should be treated as their own semantic class
- tab bases are fold lines, not cut lines

## Export semantics

The fixture should serialize these semantic layers consistently:

- `cut`: outer perimeter of faces and tabs
- `fold`: structural hinges between connected faces
- `tab-fold`: fold line at the base of each glue tab
- `registration`: external alignment marks for plotter workflows
- `annotation`: assembly badges, face labels, or IDs

For the cube, the registration marks are intentionally outside the net boundary so they can survive into SVG, PDF, and later G-code or cutter-driven workflows.

## App changes derived from this research

Implemented in `LightingModelsRK`:

- the box study is now a `Cube Fixture`
- the app now carries a dedicated papercraft fixture model
- the inspector now exposes:
  - mesh baseline
  - layout baseline
  - export semantics
  - corpus insights
  - linked research note name
- the 2D layout now includes registration marks in the validated cube case

## Corpus insights

These should remain true as the corpus grows:

- start with fixtures, not aspirational shapes
- treat authoring documents as richer than interchange meshes
- separate structural hinges from seam closure operations
- use perimeter-only tabs as a hard constraint
- preserve export semantics in the model, not only in the renderer
- add registration marks early because cutter workflows depend on stable page coordinates

## Next fixtures

The next sequence should stay strict:

1. `Tetrahedron`
2. `Cylinder`
3. only then revisit `Sphere` and `Torus`

`Tetrahedron` validates the system on a minimal non-orthogonal polyhedron. `Cylinder` is the first curved proxy that still has a tractable strip-and-cap construction model.
