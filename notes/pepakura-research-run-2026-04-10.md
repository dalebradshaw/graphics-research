# Pepakura Research Run

## Scope

This was a research pass over the local Pepakura package and the official Pepakura Designer website. The goal was not to port the app. The goal was to understand which parts of the workflow matter for our own papercraft toolchain.

## Local files inspected

Root:

- `/Users/dalebradshaw/Downloads/Pepakura/setup_pepakura617.exe`
- `/Users/dalebradshaw/Downloads/Pepakura/sample_basic_shapes`
- `/Users/dalebradshaw/Downloads/Pepakura/sample_platonic_solids`

Sample files:

- `sample_basic_shapes/cone.obj`
- `sample_basic_shapes/cone.pdo`
- `sample_basic_shapes/cylinder.obj`
- `sample_basic_shapes/cylinder.pdo`
- `sample_basic_shapes/pyramid.obj`
- `sample_basic_shapes/pyramid.pdo`
- `sample_basic_shapes/sphere.obj`
- `sample_basic_shapes/sphere.pdo`
- `sample_basic_shapes/torus.obj`
- `sample_basic_shapes/torus.pdo`
- `sample_platonic_solids/Cube.obj`
- `sample_platonic_solids/Cube.pdo`
- `sample_platonic_solids/Tetrahedron.obj`
- `sample_platonic_solids/Tetrahedron.pdo`
- `sample_platonic_solids/Octahedron.obj`
- `sample_platonic_solids/Octahedron.pdo`
- `sample_platonic_solids/Icosahedron.obj`
- `sample_platonic_solids/Icosahedron.pdo`
- `sample_platonic_solids/Dodecahedron.obj`
- `sample_platonic_solids/Dodecahedron.pdo`

## Local observations

### Installer

- `setup_pepakura617.exe` is a Windows PE executable, not a Mac-runnable package.
- SHA-256:
  - `2e5b6247ae2f88d0acb9b9e83cf7b1b5c94b10e46a120569d7ccbc7d17aec568`
- String inspection shows the installer bundles:
  - `pepakura6.exe`
  - `pepakura6_launcher.exe`
  - language DLLs
  - `glut32.dll`
  - `templates\\quick_start_guide_en.pdo`
  - `templates\\quick_start_guide_ja.pdo`
  - internal `7zip` and `unzip` helpers

Working inference:

- Pepakura Designer is a native Windows desktop app with a bundled runtime and helper tools.
- The packaging is richer than a plain installer stub because it carries templates and extraction utilities with it.

### Sample meshes

The included OBJ files are small, clean starter cases. They are good reference fixtures for our own app.

Counts observed:

- `Cube.obj`: `8` vertices, `12` faces
- `Tetrahedron.obj`: `4` vertices, `4` faces
- `Octahedron.obj`: `6` vertices, `8` faces
- `Icosahedron.obj`: `12` vertices, `20` faces
- `Dodecahedron.obj`: `20` vertices, `36` faces
- `cone.obj`: `34` vertices, `64` faces
- `cylinder.obj`: `66` vertices, `128` faces
- `sphere.obj`: `290` vertices, `576` faces
- `torus.obj`: `300` vertices, `600` faces

These are exactly the kinds of meshes that help sequence our own fixture work:

1. cube
2. tetrahedron
3. cylinder
4. only then sphere and torus

### `.pdo` files

The `.pdo` files are binary native Pepakura documents.

Observed header facts:

- every sample begins with `version 3`
- the UTF-16 header also contains `Pepakura Designer 6`

Working inference:

- `.pdo` is a versioned authoring document format
- it is not a generic interchange format like OBJ
- it almost certainly stores unfolded layout state and editing decisions, not just mesh data

## Official references

- Product page: <https://pepakura.tamasoft.co.jp/pepakura_designer/>
- Helpful features: <https://pepakura.tamasoft.co.jp/pepakura_designer/helpful-features/>
- Cutting plotter workflow: <https://pepakura.tamasoft.co.jp/pepakura_designer/dxf-exporter-for-silhouette-studio/>
- FAQ: <https://pepakura.tamasoft.co.jp/pepakura_designer/faqs/>

## Website takeaways

### Inputs and outputs

The FAQ confirms that Pepakura Designer imports formats such as:

- `OBJ`
- `3DS`
- `LWO`
- `DXF`
- binary `STL`
- `MQO`
- `KMZ/KML`

The same FAQ says OBJ is the most compatible import target for Pepakura.

The FAQ also lists exports including:

- `EMF`
- `DXF`
- `EPS`

### Workflow emphasis

The site makes a few priorities obvious:

- unfolding is only one stage
- pre-unfold cutline selection matters
- 2D and 3D correspondence is a first-class editing mode
- tabs, face separation, alignment, and arrangement are core operations
- cutter output depends on registration and machine-oriented semantics, not just pretty vectors

### Plotter / cutter implications

The Silhouette Studio page is especially useful for our app direction:

- Pepakura exports DXF specifically for cutting plotter workflows
- the printed sheet and the DXF share alignment marks
- the cutter can be used both for cutting and for crease behavior, depending on settings

This validates a strong requirement for us:

- export geometry needs explicit `cut`
- export geometry needs explicit `fold` or `score`
- registration marks need to be part of the model, not an afterthought

## Implications for our app

What we should copy conceptually:

- use OBJ as the primary interchange mesh
- keep a richer internal document state than the imported mesh
- make seam, tab, and layout decisions first-class data
- preserve 2D and 3D correspondence in the UI
- model cutter semantics separately from view rendering

What we should not copy blindly:

- impossible flattening claims for torus- or sphere-like surfaces
- interior tab placement
- treating export as a one-layer outline dump

## Corpus rules extracted from Pepakura

- start the corpus with simple polyhedral fixtures
- distinguish authoring document format from mesh interchange format
- do not collapse hinges, seam tabs, and cut edges into one generic line type
- registration marks belong in the real export model
- curved cases should come after solved flat-fixture cases

## Follow-on links

- `papercraft-cube-fixture-research-2026-04-10.md`
- `pepakura-static-analysis-2026-04-10.md`

That cube note is the first place where this Pepakura research was turned into concrete app behavior.
