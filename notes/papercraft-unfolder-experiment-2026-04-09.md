# Papercraft

## Why this exists

This note replaces the looser "Physical Planning" framing with a more specific papercraft study. The immediate goal is to connect media-driven geometry experiments to real fabrication output, especially plotter-oriented layouts.

## Key takeaways from the Unfolder decompiler session

- Papercraft is treated as a constrained mesh-to-net workflow, not a generic illustration export.
- Valid input matters first: polygon meshes, consistent face normals, and manifold edges are prerequisites for a usable paper shell.
- Join and split actions define a seam graph. That graph determines how many physical parts the model becomes.
- Flaps are first-class geometry. They need side choice, angle logic, and local optimization so they do not collide or overflow.
- Fabrication output is page-aware. Overlap, overflow, fold angles, IDs, mirrored backsides, and page boundaries are all part of the solution.
- The 2D net stays linked to the 3D face structure, which is why UV/export workflows remain stable.

## Working model for the app

Papercraft in the app should mean:

1. read or sketch a simple model projection
2. decide which seams stay joined and which open
3. generate a companion 2D net
4. assign plotter semantics to the 2D net
5. export a machine-oriented artifact

## Small experiment

### Model projection

- Use a very simple lantern-like shell with three main faces.
- Keep the front spine joined.
- Open the rear edge so the shell can flatten into a net.
- Mark face IDs so the projection stays legible when it becomes 2D.

### Plotter layout

- `cut`: outer outline of the net
- `fold`: dashed interior score lines
- `score`: glue flap region
- `registration`: a simple crosshair for device alignment
- `annotation`: tab labels and assembly hints

## Why this matters for media work

The papercraft experiment is useful because it turns timeline or scene structure into a physical companion artifact:

- a title sequence can become a folded insert
- a scene beat can become a plotted score card
- an edit structure can become a cut/fold poster object
- a model-derived silhouette can become a machine-readable fabrication layout

## Current v1 interpretation

For the sample app scene:

- the 3D side is represented as a projection sketch
- the 2D side is the plotter-ready companion net
- the plotter piece is the real deliverable
- the projection is the reasoning surface that explains the layout
