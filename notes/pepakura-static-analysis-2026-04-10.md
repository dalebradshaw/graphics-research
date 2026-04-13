# Pepakura Static Analysis

## Scope

This note captures the deeper static-analysis pass on the extracted Pepakura Designer binaries.

This is not recovered source code. It is a behavior-oriented read based on:

- PE headers
- imports
- bundled assets
- version metadata
- command strings
- settings keys

That is enough to recover the app’s functional model with decent confidence.

## Extraction result

The installer payload was extracted into:

- `/Users/dalebradshaw/graphics_research/pepakura-static-analysis/extracted`

Key binaries:

- `pepakura6.exe`
- `pepakura6_launcher.exe`
- language DLLs

Key templates:

- `templates/quick_start_guide_en.pdo`
- `templates/quick_start_guide_ja.pdo`

## Binary identity

### Main app

- file: `pepakura6.exe`
- version: `6.1.7.0`
- product name: `Pepakura Designer 6`
- timestamp: March 13, 2026

### Launcher

- file: `pepakura6_launcher.exe`
- version: `1.0.0.1`
- timestamp: July 11, 2025

Working interpretation:

- the launcher is auxiliary
- the real papercraft logic lives in `pepakura6.exe`

## Rendering and UI architecture

Imports strongly indicate a split rendering model:

- `OPENGL32.dll`
- bundled `glut32.dll`
- `gdiplus.dll`
- `USER32.dll`

Working interpretation:

- 3D model view is OpenGL-based
- 2D layout, image export, and UI surfaces use GDI+ and standard Win32/MFC-style UI
- this is a desktop document editor with dedicated 3D and 2D surfaces, not a toy viewer

The binary also contains:

- `RT_MENU`
- `RT_DIALOG`
- `RT_STRING`
- `RT_ACCELERATOR`

So the command model is built directly into native Windows resources.

## Command surface recovered from strings

The command strings reveal the real workflow quite clearly.

### Seams and topology

- `Specify Cutline Edges`
- `Pick the Open Edges on the Shortest Path between Two Points`
- `Pick a Single Open Edge`
- `Reset Cutting Edges`
- `Join Adjacent Isolated Edges`
- `Join/Disjoin Faces`
- `Separate All Faces`
- `Merge adjacent edges`
- `Apply open edge info to 3D model`

This confirms that Pepakura treats unfolding as seam-graph editing over a 3D mesh, not as one irreversible operation.

### Remeshing and smoothing support

- `Subdivide Edges and Make Them Smooth`
- `Divide Edge`
- `Split Quad`
- `Swap Edge`
- `Minimal length of divide edges relative to model size`
- `Edge swap limit angle (90-180 Deg.)`
- `Smooth limit`

This is especially useful for our understanding. Pepakura is not assuming imported meshes are already ideal for papercraft. It includes local remeshing tools to improve unfoldability or visual quality before or during layout work.

### Flap system

- `Edit Flap`
- `Edit Flaps`
- `Switch Flap Position`
- `Add a Flap (with Mountain Fold)`
- `Add a Flap (with Valley Fold)`
- `Add a Flap (without Fold)`
- `No Flap`
- `Merge Adjacent Flaps`
- `Adjacent mergeable flaps are automatically merged`

Settings keys:

- `dDefaultFlapHeightMM`
- `iMaxFlapBaseAngle`
- `iVirtualFlapHeightMM`
- `bFlapAlternate`
- `bPaintFlapWithNeighboringFaceInsteadOfOffsetFill`

This is one of the clearest algorithmic surfaces in the app.

Working interpretation:

- flap placement is edge-local and stateful
- flap geometry is generated from explicit dimensional constraints
- base-angle and virtual-height settings imply tab polygon synthesis, not only on/off decoration
- adjacent-tab merging is a real geometry operation

For our app, this validates:

- tabs must be first-class geometry
- tab generation needs numeric constraints
- merged tabs should be handled in the layout model, not improvised in export code

## Fold and cut classification

Strings recovered:

- `Mountain Fold`
- `Valley Fold`
- `Mountain Edge`
- `Valley Edge`
- `Mountain Fold Line`
- `Valley Fold Line`
- `Hide Flat Edges`
- `Hide nearly flat folding lines`

Settings keys:

- `iMountainLineStyle`
- `iValleyLineStyle`
- `iCutLineStyle`
- `iFlatEdgeAngle`
- `bOmitFlatEdge`
- `dMountainDot%d`
- `dValleyDot%d`

Working interpretation:

- Pepakura computes and preserves fold polarity
- it also supports angle-threshold suppression of nearly flat folds
- line semantics are carried through to print/export styling

For our app, this argues for three distinct concepts in the model:

- cut edges
- fold edges with polarity
- suppressed or omitted fold edges via threshold policy

## Layout and page fitting

Strings recovered:

- `Parts Layout`
- `Recalculate Parts Layout`
- `Adjust scale to fit one page`
- `UnfoldFitOnePage`
- `Export current layout in a single file`
- `Export development as sequentially numbered bitmap image files, one file per sheet`
- `Layout: single file`
- `Layout: per sheet`

Working interpretation:

- after unfolding, Pepakura treats page arrangement as a second optimization phase
- it supports both unified-export and per-sheet-export paths
- fitting and arrangement are not side effects, they are explicit commands

For our app:

- page layout should remain a separate stage after net construction
- export should support both one-layout and per-sheet variants

## Cutter / plotter semantics

Strings recovered:

- `Show Registration-mark`
- `Registration-mark Settings`
- `Print Settings:Show Registration-marks for cutting`
- `Export DXF file for Silhouette Studio`
- `How to cut with Silhouette Studio`
- `Distance between registration marks`

The app also exposes:

- `DXF`
- `SVG`
- `EPS`
- `EMF`
- raster image exports

Working interpretation:

- registration marks are part of the internal print/export model
- cutter workflows are a first-class product surface, not an afterthought
- Pepakura separates visual editing from machine alignment data

For our app:

- registration marks belong in the layout model
- export serializers should receive semantic geometry, not infer marks from UI state

## Texture and material pipeline

Strings recovered:

- `UV for texture`
- `Texture Configuration`
- `Set texture image`
- `Remove texture`
- `Allow texture changes`
- `Set Materials to Faces`
- `Faces without Material`
- `Include texture image filename in .pdo file`
- `Export current development as a BMP file for texture editing`

Working interpretation:

- texture support is deeply integrated
- face/material assignment affects the development workflow
- export and authoring preserve enough surface identity to support texture editing

For our app, this supports an eventual distinction between:

- fabrication geometry
- surface annotation / texture payload

## Settings that matter most to us

The most useful settings keys recovered from the binary are:

- `bUnfoldAuto`
- `bUnfoldFitOnePage`
- `bAutoMergeOrphanEdgesWhenOpenModel`
- `bMergeNearEdgeOnTenkaizu`
- `dMergeNearEdgeOnTenkaizuEPSMM`
- `dDefaultScaleBeforeUnfold`
- `dDefaultFlapHeightMM`
- `iMaxFlapBaseAngle`
- `iVirtualFlapHeightMM`
- `bFlapAlternate`
- `bShowRegistrationMark`
- `bTextureBackside`
- `bOmitFlatEdge`
- `iFlatEdgeAngle`

These are valuable because they expose the parameter surface of the real product, not just its visible menu labels.

## Most useful algorithms to integrate into our understanding

### 1. Shortest-path seam selection

Pepakura explicitly supports selecting open edges on the shortest path between two points.

Implication:

- treat the mesh as an adjacency graph
- shortest-path edge picking is worth supporting in our seam tools

### 2. Topology repair by proximity

The binary exposes automatic joining of nearby isolated edges and edge merging thresholds.

Implication:

- import cleanup should include tolerance-driven topology repair
- this should be an explicit pre-processing stage, not hidden behavior

### 3. Flap synthesis with real constraints

The presence of flap height, virtual height, base angle, alternation, and adjacent-flap merging shows a concrete tab-generation system.

Implication:

- our layout model should support parameterized tab generation
- merged-tab logic belongs in the geometry layer

### 4. Fold semantics with suppression rules

Pepakura distinguishes mountain, valley, cut, and flat-edge omission.

Implication:

- fold polarity and visibility thresholds should be stored as data, not merely stroke styles

### 5. Layout as a separate optimization stage

`Recalculate Parts Layout` and `Fit one page` make it clear that net construction and page arrangement are distinct phases.

Implication:

- keep net solving and page packing separate in our architecture

### 6. Registration-aware export

Registration marks are built into print and DXF workflows.

Implication:

- registration geometry should be a first-class export layer

## What this changes for our app

This pass reinforces several concrete choices:

- continue using `Cube`, `Tetrahedron`, and `Cylinder` as the first fixtures
- add shortest-path seam selection to the backlog
- keep flaps as geometry with numeric parameters
- separate:
  - cut
  - fold
  - tab-fold
  - registration
  - annotation
- keep page layout distinct from net generation

## Confidence and limits

Confidence is high for:

- command structure
- rendering stack
- export surfaces
- parameter names and user-facing behavior

Confidence is moderate for:

- exact internal algorithms
- exact data structures behind unfolding and packing

Reason:

- this pass used static metadata, imports, and strings
- it did not reconstruct the actual code paths instruction-by-instruction

## Related notes

- `pepakura-research-run-2026-04-10.md`
- `papercraft-cube-fixture-research-2026-04-10.md`
