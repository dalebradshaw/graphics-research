# FxCore.framework Yanobox / 3D Engine - Comprehensive Deep Dive

**Binary**: FxCore (Universal: x86_64 + arm64, 19MB)
**MetalLib**: default.metallib (1.7MB, MetalLib v1.2.7, compiled with metalfe-32023.883)
**SDK target**: macOS 13.5+

---

## 1. Complete Yanobox/3D Node Class Inventory

### 1.1 Core 3D Infrastructure Nodes (FxCorePlugIn3D*)

| Class | Source Path | Purpose |
|-------|------------|---------|
| `FxCorePlugIn3DRenderToTexture` | `Plug-Ins/3D/FxCorePlugIn3DRenderToTexture.m` | Master offscreen render node - creates MTLRenderPassDescriptor, manages depth/color attachments, projection/view/model matrices |
| `FxCorePlugIn3DCamera` | (3D/) | Camera node - field of view, trackball angles, forward/up/side vectors, eye position |
| `FxCorePlugIn3DSprite` | (3D/) | Billboard sprite in 3D space |
| `FxCorePlugIn3DTransform` | (3D/) | 3D transform node with dynamic input addition/removal |
| `FxCorePlugIn3DMatrices` | (3D/) | Direct matrix overrides for projection, model, view |
| `FxCorePlugIn3DBlockWipe` | (3D/) | 3D block wipe transition with Z-split |

### 1.2 Yanobox Nodes - Geometry Generators

| Class | Source Path | Metal Compute Function |
|-------|------------|----------------------|
| `FxCorePlugInYanoboxNodesGrid` | `Nodes/Geometry/...Grid.m` | `YanoNodes_Grid_Compute_Function` (grid via `Yano_Nodes_Grid_Uniforms`) |
| `FxCorePlugInYanoboxNodesSphere` | `Nodes/Geometry/...Sphere.m` | `Yano_Nodes_Sphere_Uniforms` |
| `FxCorePlugInYanoboxNodesSpiral` | `Nodes/Geometry/...` | `Yano_Nodes_Spiral_Uniforms` |
| `FxCorePlugInYanoboxNodesSineCurve` | `Nodes/Geometry/...SineCurve.m` | `Yano_Nodes_SineCurve_Uniforms` |
| `FxCorePlugInYanoboxNodesCircle` | `Nodes/Geometry/...` | (CPU-side) |
| `FxCorePlugInYanoboxNodesRegularPolygon` | `Nodes/Geometry/...` | (CPU-side) |
| `FxCorePlugInYanoboxNodesRandom` | `Nodes/Geometry/...Random.m` | `Yano_Nodes_Random_Uniforms` |
| `FxCorePlugInYanoboxNodesTextToQuads` | `Nodes/Geometry/...TextToQuads.m` | (CPU-side, text layout) |
| `FxCorePlugInYanoboxCreateGeometryFrom3DAsset` | `Nodes/Geometry/...From3DAsset.m` | `compute_YanoNodes_VoxelsFromAsset_Function` |
| `FxCorePlugInYanoboxVoxelGeometryFrom3DAsset` | `Nodes/Geometry/...` | Voxelization of 3D assets |
| `FxCorePlugInYanoboxNodesCurvedRadialSections` | `Nodes/Geometry/...` | `YanoNodes_CurvedRadialSectionsVertices_Compute_Function` |

### 1.3 Yanobox Nodes - Renderers

| Class | Source Path | Metal Shaders |
|-------|------------|--------------|
| `FxCorePlugInYanoboxNodesGlobalRenderer` | `Nodes/Renderers/...GlobalRenderer.m` | `Yano_Nodes_GlobalRender_{Vertex,Fragment,Triangles_Compute}Function` |
| `FxCorePlugInYanoboxNodes3DRenderer` | `Nodes/Renderers/...3DRenderer.m` | `Yano_Nodes_3DRenderer_{Vertex,Fragment}Function` |
| `FxCorePlugInYanoboxNodes3DRendererMax` | `Nodes/Renderers/...3DRendererMax.m` | `Yano_Nodes_3DRendererMax_{Vertex,Fragment,Compute}Function` |
| `FxCorePlugInYanoboxNodesRenderer` | `Nodes/Renderers/...Renderer.m` | Base renderer - `vertices_in_VertexShader_BufferOnDevice:` |
| `FxCorePlugInYanoboxNodesTextRenderer` | `Nodes/Renderers/...TextRenderer.m` | `Yano_Nodes_TextRender_{Vertex,Fragment,Triangles_Compute}Function` |
| `FxCorePlugInYanoboxNodesLinesRenderer` | `Nodes/Renderers/...LinesRenderer.m` | `Yano_Nodes_LinesRenderer_{Vertex,Fragment,Compute}Function`, `Nodes_CurvedLinesRenderer_ComputeFunction`, `Nodes_TangentLines_ComputeFunction` |
| `FxCorePlugInYanoboxNodesCalloutLinesRenderer` | `Nodes/Renderers/...CalloutLinesRenderer.m` | `Yano_Nodes_CalloutLinesRenderer_{Vertex,Fragment,Compute}Function` |
| `FxCorePlugInYanoboxNodesCurvedTubes` | `Nodes/Renderers/...CurvedTubes.m` | `YanoNodes_CurvedTubesVertices_Compute_Function`, `Yano_Nodes_CurvedTubes_{Vertex,Fragment}Function` |
| `FxCorePlugInYanoboxNodesDigitRenderer` | `Nodes/Renderers/...DigitRenderer.m` | `Yano_Nodes_DigitRender_{Vertex,Fragment,Triangles_Compute}Function` |
| `FxCorePlugInYanoboxNodes3DModelInfos` | `Nodes/Renderers/...3DModelInfos.m` | `Yano_Nodes_3DModelInfos_ComputeFunction` |
| `FxCorePlugInYanoboxNodesRender3DModelsWithInfos` | `Nodes/Renderers/...` | `Yano_Nodes_Render3DModelsWithInfos_{Vertex,Fragment}Function` |
| `FxCorePlugInYanoboxModelRenderer` | `Nodes/Renderers/...` | `Yano_ModelRender_VertexFunction`, `Yano_ModelRenderer_Basic_FragmentFunction`, `Yano_ModelRender_ProjectionMapping_VertexFunction` |
| `FxCorePlugInYanoboxExtruder` | `Nodes/Renderers/...Extruder.m` | `Yano_Extruder_{Vertex,Fragment,Compute}Function` |
| `FxCorePlugYanoboxNodesBackground` | `Nodes/Renderers/...Background.m` | `Nodes_BG_Fill_{Vertex,Fragment}Function`, `Nodes_BG_Env_{Vertex,Fragment}Function` |
| `FxCorePlugYanoboxBillboard` | (Renderers/) | `Yano_Billboard_{Vertex,Fragment}Function` |

### 1.4 Yanobox Nodes - Modifiers/Controllers

| Class | Source Path | Metal Compute |
|-------|------------|--------------|
| `FxCorePlugInYanoboxNodesHub` | `Nodes/Modifiers/...Hub.m` | **`YanoNodes_Hub_Compute_Function`** (the central transform/color/scale dispatcher) |
| `FxCorePlugInYanoboxNodesControler` | `Nodes/Utilities/...Controler.m` | Master controller for completions, colors, scales, orientations |
| `FxCorePlugInYanoboxNodesEffectsControler` | `Nodes/Utilities/...EffectsControler.m` | Effects: replicator, projection wrapping |
| `FxCorePlugInYanoboxNodesOscillator` | `Nodes/Modifiers/...Oscillator.m` | `YanoNodes_Oscillator_Compute_Function` |
| `FxCorePlugInYanoboxNodesOscillatorControler` | `Nodes/Utilities/...OscillatorControler.m` | Oscillator config: mode, axis, direction, damping |
| `FxCorePlugInYanoboxNodesReplicator` | `Nodes/Modifiers/...Replicator.m` | `YanoNodes_Replicator_Compute_Function` |
| `FxCorePlugInYanoboxNodesColorizer` | `Nodes/Modifiers/...Colorizer.m` | `YanoNodes_Colorizer_Compute_Function` |
| `FxCorePlugInYanoboxNodesCompletion` | `Nodes/Modifiers/...Completion.m` | `YanoNodes_Completion_Compute_Function` |
| `FxCorePlugInYanoboxNodesScaling` | `Nodes/Modifiers/...Scaling.m` | `YanoNodes_Scaling_Compute_Function` |
| `FxCorePlugInYanoboxNodesSelection` | `Nodes/Modifiers/...Selection.m` | `YanoNodes_Selection_Compute_Function` |
| `FxCorePlugInYanoboxNodesProjection` | `Nodes/Modifiers/...Projection.m` | `YanoNodes_ProjectionCylindrical/Polar/Spherical_Compute_Function` |
| `FxCorePlugInYanoboxNodesApplyMatrix` | (Modifiers/) | `YanoNodes_ApplyMatrix_Compute_Function` |
| `FxCorePlugInYanoboxNodesApplyNoise` | (Modifiers/) | `YanoNodes_ApplyNoise_Compute_Function` |
| `FxCorePlugInYanoboxNodesShadingControler` | `Nodes/Utilities/...ShadingControler.m` | Configures the shading model uniforms (see Section 3) |
| `FxCorePlugInYanoboxDepthControler` | `Nodes/Utilities/...DepthControler.m` | Depth effects: compositing pass, depth space |
| `FxCorePlugInYanoboxBlending` | `Nodes/Utilities/...Blending.m` | MTLBlendFactor configuration |
| `FxCorePlugInYanoboxNodesSampleImage` | `Nodes/Utilities/...SampleImage.m` | Sample image at node positions |

### 1.5 Yanobox Nodes - Connections (Topology)

| Class | Source Path | Metal Compute |
|-------|------------|--------------|
| `FxCorePlugInYanoboxNodesAttachConnections` | `Nodes/Connections/...AttachConnections.m` | `compute_Attached_Connections_Buffer` |
| `FxCorePlugInYanoboxNodesConnectGeometries` | `Nodes/Connections/...ConnectGeometries.m` | `compute_Connect_Vertices_Buffer` |
| `FxCorePlugInYanoboxNodesDistanceConnections` | `Nodes/Connections/...DistanceConnections.m` | `Yano_Dist_Connections_Uniforms` (spatial hashing with sub-boxes) |
| `FxCorePlugInYanoboxNodesFaceNormalsToLines` | `Nodes/Connections/...FaceNormalsToLines.m` | Normal vector visualization |
| `FxCorePlugInYanoboxNodesVoxelBoxConnections` | `Nodes/Connections/...VoxelBoxConnections.m` | Voxel-based connectivity |
| `FxCorePlugInYanoboxNodesSerialConnections` | (Connections/) | `Yano_Serial_Connections_Uniforms` (chain connect) |
| `FxCorePlugInYanoboxNodesConnectionsFromString` | (Connections/) | String-defined connectivity |

### 1.6 Yanobox Nodes - Join/Sort/BoundingBox

| Class | Purpose |
|-------|---------|
| `FxCorePlugInYanoboxNodesJoinGeometry` | `Yano_Join_Geometry_Uniforms` - merge two geometries |
| `FxCorePlugInYanoboxNodesBoundingBox` | `YanoNodes_BBox_Uniforms` - threadgroup-parallel AABB |
| `FxCorePlugInYanoboxNodesFastBoundingBox` | `YanoNodes_Fast_BBox_Uniforms` - faster variant |
| `FxCorePlugInYanoboxNodesDepthSorting` | `YanoboxNodesDepthSortingIndices` + `ApplyMatrixToVertices` |

### 1.7 Yanobox Nodes - Text/Styled Text Pipeline

| Class | Source Path | Purpose |
|-------|------------|---------|
| `FxCorePlugInYanoboxStyledTextInfos` | `Styled Text/...` | Text attribute extraction |
| `FxCorePlugInYanoboxStyledTextParagraphInfos` | `Styled Text/...` | Per-paragraph animation: particles, trails, motion paint |
| `FxCorePlugInYanoboxStyledTextAtlas` | `Styled Text/...` | Font atlas generation for GPU text rendering |
| `FxCorePlugInYanoboxStyledTextInRectangleWithAttributes` | `Styled Text/...` | Text layout in rectangles |
| `FxCorePlugInYanoboxCoreGraphicReference` | `Styled Text/...` | Core Graphics glyph reference extraction |
| `FxCorePlugInYanoboxCoreGraphicRenderer` | `Rendering/...` | CG-based rendering (coordinates, drawing types) |
| `FxCorePlugInYanoboxLinguisticTagger` | `Styled Text/...` | NLP-based text coloring (adjective, adverb, etc.) |
| `FxCorePlugInYanoboxEmbeddingExplorer` | `Styled Text/...` | Word embedding exploration |
| `FxCorePlugInYanoboxSwipeText` | `Swipe/...` | Slot-machine text animation |
| `FxCorePlugInYanoboxSwipeTextGeometry` | `Swipe/...` | Geometry for swipe text cells |
| `FxCorePlugInYanoboxModifyStyledText` | (Styled Text/) | Modify text attributes |
| `FxCorePlugInYanoboxJoinStyledText` | (Styled Text/) | Concatenate styled texts |
| `FxCorePlugInYanoboxSplitStyledText` | (Styled Text/) | Split styled text |
| `FxCorePlugInYanoboxStringFromPDFPage` | (Styled Text/) | PDF text extraction |

### 1.8 Yanobox Nodes - Rendering/Animation

| Class | Source Path | Metal Shaders |
|-------|------------|--------------|
| `FxCorePlugInYanoboxTextRenderer` | `Rendering/...TextRenderer.m` | `TextRender{Vertex,Fragment,Compute}Function` |
| `FxCorePlugInYanoboxTextParticles` | `Rendering/...TextParticles.m` | `Text_Particle_ComputeFunction`, `Text_ParticleRender_{Vertex,Fragment}Function` |
| `FxCorePlugInYanoboxTrailingText` | `Rendering/...TrailingText.m` | `Text_TrailModeMotionBlur_ComputeFunction`, `Text_TrailModeMotionPainting_ComputeFunction{Forward,Backward}` |
| `FxCorePlugInYanoboxAnimationPathsRenderer` | `Rendering/...AnimationPathsRenderer.m` | `AnimationPaths_{Vertex,Fragment,ComputeFunction_Line,ComputeFunction_Extrusion}` |
| `FxCorePlugInYanoboxMotypeCommonControls` | `Rendering/...MotypeCommonControls.m` | Motion blur modes, scale origin, timing chronology |
| `FxCorePlugInYanoboxImageWithStringInRectangles` | `Rendering/...` | Text-to-image rasterization |

### 1.9 Yanobox Nodes - Linear Algebra/Math

| Class | Source Path | Metal Compute |
|-------|------------|--------------|
| `FxCorePlugInYanoboxMatrix` | `Linear Algebra/...Matrix.m` | Matrix creation/modification |
| `FxCorePlugInYanoboxMatrixModify` | `Linear Algebra/...MatrixModify.m` | Matrix modification |
| `FxCorePlugInYanoboxAEMatrixConverter` | `Linear Algebra/...AEMatrixConverter.m` | After Effects projection conversion |
| `FxCorePlugInYanoboxMathOperation` | `Nodes/Maths/...MathOperation.m` | `YanoMathOperation_{Add,Substract,Multiply,Divide,CrossProduct,DotProduct,Distance}_Compute_Function` |
| `FxCorePlugInYanoboxNodesGenerateNoise` | `Nodes/Maths/...GenerateNoise.m` | `YanoNodes_GenerateNoise_{1D,2D,3D}_Compute_Function` |
| `FxCorePlugInYanoboxNormalizeVector` | (Math/) | `Yano_NormalizeVector_Compute_Function` |

### 1.10 Yanobox Nodes - 3D Asset Import

| Class | Purpose |
|-------|---------|
| `FxCorePlugInYanoboxImport3DAsset` | Imports 3D files via MDLAsset |
| `FxCorePlugInYanoboxModelAssetInfos` | Extracts MTL objects, hierarchy, vertex descriptors from MDLAsset |
| `FxCorePlugInYanoboxModelAssetWithStyledText` | Combines 3D model with styled text |
| `FxCorePlugInYanoboxCreateGeometryFrom3DAsset` | Extracts first mesh from MDLAsset, creates wireframe |

### 1.11 Misc Yanobox Nodes

| Class | Purpose |
|-------|---------|
| `FxCorePlugInYanoboxIBLCreateBRDFImage` | Pre-compute BRDF LUT for IBL |
| `FxCorePlugInYanoboxCreateBuffer` | Generic buffer creation |
| `FxCorePlugInYanoboxCreateBufferFromArray` | Array-to-GPU-buffer conversion |
| `FxCorePlugInYanoboxCreateTexturesForImages` | Batch texture creation |
| `FxCorePlugInYanoboxAccumulateValue` | Value accumulation |
| `FxCorePlugInYanoboxBufferDebug` | Debug buffer visualization |
| `FxCorePlugInYanoboxPulse` | Pulse signal generator |
| `FxCorePlugInYanoboxSlotAnimator` | Slot machine animation |
| `FxCorePlugInYanoboxIndexedAnimation` | Keyframe-indexed animation |
| `FxCorePlugInYanoboxGeometry` | Base geometry class |
| `FxCorePlugInYanoboxRectangle` | Rectangle geometry |
| `FxCorePlugInYanoboxAnchoredRectangle` | Anchor-aware rectangle |
| `FxCorePlugInYanoboxSliceRectangle` | Rectangle slicing |
| `FxCorePlugInYanoboxQuadBordersWithSize` | Bordered quad |
| `Yanobox3DCoreTextureController` | Texture management |
| `YanoboxBinPacker` | Bin packing (atlas packing) |

**Total unique Yanobox classes: ~95**
**Total Yano-related strings: 518**

---

## 2. Metal Shader Deep Dive

### 2.1 Complete Metal Function Inventory

#### Vertex/Fragment/Compute Shader Triplets:

| Pipeline | Vertex | Fragment | Compute |
|----------|--------|----------|---------|
| **Accordion** | `AccordionVertexFunction` | `AccordionFragmentFunction` | `AccordionComputeFunction` |
| **BlockWipe** | `BlockWipeVertexFunction` | `BlockWipeFragmentFunction` | `BlockWipeComputeFunction` |
| **Origami** | `OrigamiVertexFunction` | `OrigamiFragmentFunction` | `OrigamiComputeFunction` |
| **Sprite** | `SpriteVertexFunction` | `SpriteFragmentFunction` | -- |
| **Billboard** | `Yano_Billboard_VertexFunction` | `Yano_Billboard_FragmentFunction` | -- |
| **Core3D** | `YanoCore3DVertexFunction` | `YanoCore3DFragmentFunction` / `...Atlas` / `...NoTexture` | -- |
| **Extruder** | `Yano_Extruder_VertexFunction` | `Yano_Extruder_FragmentFunction` / `...WithImage` | `Yano_Extruder_Compute_Function` |
| **ModelRender** | `Yano_ModelRender_VertexFunction` / `...ProjectionMapping_VertexFunction` | `Yano_ModelRenderer_Basic_FragmentFunction` / `...ProjectionMapping_FragmentFunction` | -- |
| **Nodes 3DRenderer** | `Yano_Nodes_3DRenderer_VertexFunction` | `Yano_Nodes_3DRenderer_FragmentFunction` | -- |
| **Nodes 3DRendererMax** | `Yano_Nodes_3DRendererMax_VertexFunction` | `Yano_Nodes_3DRendererMax_FragmentFunction` | `Yano_Nodes_3DRendererMax_ComputeFunction` |
| **Nodes GlobalRender** | `Yano_Nodes_GlobalRender_VertexFunction` | `Yano_Nodes_GlobalRender_FragmentFunction` | `Yano_Nodes_GlobalRender_Triangles_ComputeFunction` + OrderedQuadsCount + OrderedStartIndices + RangeOffset |
| **Nodes TextRender** | `Yano_Nodes_TextRender_VertexFunction` | `Yano_Nodes_TextRender_FragmentFunction` | `Yano_Nodes_TextRender_Triangles_ComputeFunction` + OrderedLengths + OrderedStartIndices + RangeOffset |
| **Nodes DigitRender** | `Yano_Nodes_DigitRender_VertexFunction` | `Yano_Nodes_DigitRender_FragmentFunction` | `Yano_Nodes_DigitRender_Triangles_ComputeFunction` + `Yano_Nodes_GlobalRenderDigit_Triangles_ComputeFunction` + `Yano_Nodes_TextDigit_Triangles_ComputeFunction` |
| **Nodes LinesRenderer** | `Yano_Nodes_LinesRenderer_VertexFunction` | `Yano_Nodes_LinesRenderer_FragmentFunction` | `Nodes_LinesRenderer_ComputeFunction` + `Nodes_CurvedLinesRenderer_ComputeFunction` + `Nodes_TangentLines_ComputeFunction` |
| **Nodes CalloutLines** | `Yano_Nodes_CalloutLinesRenderer_VertexFunction` | `Yano_Nodes_CalloutLinesRenderer_FragmentFunction` | `Nodes_CalloutLinesRenderer_ComputeFunction` |
| **Nodes CurvedTubes** | `Yano_Nodes_CurvedTubes_VertexFunction` | `Yano_Nodes_CurvedTubes_FragmentFunction` | `YanoNodes_CurvedTubesVertices_Compute_Function` |
| **Nodes 3DModelsWithInfos** | `Yano_Nodes_Render3DModelsWithInfos_VertexFunction` | `Yano_Nodes_Render3DModelsWithInfos_FragmentFunction` | -- |
| **Nodes BG Fill** | `Nodes_BG_Fill_VertexFunction` | `Nodes_BG_Fill_FragmentFunction` | -- |
| **Nodes BG Env** | `Nodes_BG_Env_VertexFunction` | `Nodes_BG_Env_FragmentFunction` | -- |
| **TextRender (Motype)** | `TextRenderVertexFunction` | `TextRenderFragmentFunction` | `TextRenderComputeFunction` |
| **TextParticle** | `Text_ParticleRender_VertexFunction` | `Text_ParticleRender_FragmentFunction_Monochrome` / `..._RGBA` | `Text_Particle_ComputeFunction` |
| **TextTrail** | `Text_TrailRender_VertexFunction` | `Text_TrailRender_FragmentFunction` | `Text_TrailModeMotionBlur_ComputeFunction` / `Text_TrailModeMotionPainting_ComputeFunction{Forward,Backward}` |
| **AnimationPaths** | `AnimationPaths_VertexFunction` | `AnimationPaths_FragmentFunction` | `AnimationPaths_ComputeFunction_Line` / `...Extrusion` |
| **QuadRenderer** | `Yano_QuadRenderer_VertexFunction` | `Yano_QuadRenderer_FragmentFunction` / `..._noImage` | `Yano_QuadRenderer_ComputeFunction` |

#### Pure Compute Kernels:

| Function | Purpose |
|----------|---------|
| `YanoNodes_Hub_Compute_Function` | **Central hub** - transforms, colors, scales, orientations, noise, oscillation, projection, replication |
| `YanoNodes_Replicator_Compute_Function` | Instance geometry along points |
| `YanoNodes_Replicator_Hub_Compute_Function` | Hub variant for replicator |
| `YanoNodes_Oscillator_Compute_Function` | Wave/bounce displacement |
| `YanoNodes_Colorizer_Compute_Function` | Per-vertex coloring |
| `YanoNodes_Completion_Compute_Function` | Reveal/completion animation |
| `YanoNodes_Scaling_Compute_Function` | Per-vertex scaling |
| `YanoNodes_Selection_Compute_Function` | Spatial selection (box, sphere, plane falloff) |
| `YanoNodes_ApplyMatrix_Compute_Function` | Apply 4x4 matrix to vertices/normals |
| `YanoNodes_ApplyNoise_Compute_Function` | Gradient noise / curl noise displacement |
| `YanoNodes_GenerateNoise_{1D,2D,3D}_Compute_Function` | Noise buffer generation |
| `YanoNodes_Compute_BoundingBox_Function` | Threadgroup-parallel AABB |
| `YanoNodes_Compute_Fast_BoundingBox_Function` | Optimized AABB variant |
| `YanoNodes_Compute_Fast_Visual_BoundingBox_Function` | Visual bounds |
| `YanoNodes_Compute_GetSubBoxForPoints_Function` | Spatial hash: assign points to sub-boxes |
| `YanoNodes_Compute_PointCountPerBox_Function` | Spatial hash: count per cell |
| `YanoNodes_Compute_SubBoxRanges_Function` | Spatial hash: prefix-sum ranges |
| `YanoNodes_Compute_OrderedPointIndicesByBox_Function` | Spatial hash: reorder by cell |
| `YanoNodes_Compute_SubBoxesVisualisation_Function` | Debug visualization of spatial hash |
| `YanoNodes_ProjectionCylindrical_Compute_Function` | Cylindrical projection wrap |
| `YanoNodes_ProjectionPolar_Compute_Function` | Polar projection wrap |
| `YanoNodes_ProjectionSpherical_Compute_Function` | Spherical projection wrap |
| `YanoNodes_ParallelTransport_Compute_Function` | Parallel transport frames for curves |
| `YanoNodes_RadialSections_ParallelTransport_Compute_Function` | PT for radial sections |
| `YanoNodes_Curves_Compute_Function` | Bezier curve evaluation |
| `YanoNodes_RadialSections_Curves_Compute_Function` | Curves for radial sections |
| `YanoNodes_CurvedRadialSectionsVertices_Compute_Function` | Tube mesh from radial sections |
| `YanoNodes_TubesTriangleIndices_Compute_Function` | Index buffer for tubes |
| `YanoNodes_CAPS_TriangleIndices_Compute_Function` | Cap geometry for tubes |
| `YanoNodes_wind_Compute_Function` | Wind displacement |
| `YanoMathOperation_{Add,Substract,Multiply,Divide,CrossProduct,DotProduct,Distance}_Compute_Function` | Vector math ops |
| `Yano_NormalizeVector_Compute_Function` | Vector normalization |
| `Yano_VectorLength_Compute_Function` | Vector length |
| `Yano_Nodes_3DModelInfos_ComputeFunction` | Index remapping for instanced 3D models |
| `compute_IBL_BRDF_Image_Function` | Pre-compute BRDF LUT |
| `YanoboxBoundingBoxCalculatorFunction` | Alternate bbox path |
| `YanoboxNodesDepthSortingApplyMatrixToVertices` | Pre-sort vertex transform |
| `YanoboxNodesDepthSortingIndices` | Depth sort indices |
| `compute_YanoNodes_VoxelsFromAsset_Function` | Voxelize 3D model |

### 2.2 Vertex Format (from metallib struct definitions)

The engine uses **multiple vertex formats** depending on the pipeline:

#### `Yano_Nodes_3D_Vertex` (Core 3D vertex)
Fragment shader inputs:
```
float4 position     [[position]]
float4 color        [[perspective]]
float3 worldPos     [[perspective]]
float3 rawPos       [[perspective]]
float3 normal       [[perspective]]
float3 flatNormal   [[flat]]   // flat shading support
```

#### `Yano_Nodes_GlobalRender_VertexInput` (Quad/text renderer)
```
float4 position
float4 color
float2 texCoord
```

#### `Yano_Extruder_VertexInput` (Text extrusion)
```
float3 position
float3 normal
float4 color
float2 texCoord
float  luma
float  face       // front/back/side identification
float  clamped
```

#### `YanoNodes_CurvedTubes_VertexInput`
```
float3 position
float4 color
float3 normal
uint   connectionID
uint   segmentID
```

#### `BlockWipeVertexInput` / `AccordionVertexInput` / `OrigamiVertexInput`
```
float3 position
float3 normal
float2 texcoord
```

#### Buffer Layout per Geometry
The core geometry buffers are always:
- `float3 vertices` (positions)
- `float3 normals`
- `float3 upVectors` (orientation frames)
- `uint indices` (point indices into geometry)
- `uint3 connections` (topology: triangle/edge indices)
- `float4 colors` (per-vertex RGBA)
- `float scales` (1D) or `float3 scales` (3D per-axis)

### 2.3 Shading Model (Extracted from `YanoNodes_Shading_GlobalUniforms`)

The fragment shader receives a comprehensive struct:

```metal
struct YanoNodes_Shading_GlobalUniforms {
    // Flags
    bool shouldPremultiply;
    bool shouldUseFlatShading;
    bool shouldUseLighting;
    bool shouldShowNormals;
    bool shouldUseBloomTexture;
    bool useBackgroundColor;
    bool optionalColorIsEmissive;
    bool lightFollowView;
    bool useDepthFx;
    bool useFresnel;
    bool useAmbiant;           // [sic]
    bool useSSAO;
    bool useBloom;
    bool useLinearSampler;
    bool UseEmissiveSaturation;

    // Enums
    uint depthEffect;
    uint depthSpace;
    uint renderPass;
    uint ambiantType;          // [sic]
    uint fresnelColorSource;
    uint fogColorSource;
    uint optionalColorIndex;
    uint optionalColorMode;
    uint aoSamples;
    uint aoType;

    // Scalar parameters
    float depthStart;
    float depthRange;
    float depthInfluence;
    float emissiveDepthInfluence;
    float depthRangeMinusStartRec;
    float lightIntensity;
    float lightSaturation;
    float backgroundIntensity;
    float fresnel;
    float fresnelPower;
    float inBloomAmount;
    float inBloomPower;
    float bloomEmissiveSaturation;
    float aoIntensity;
    float aoRadius;
    float aoBias;
    float ao;
    float sceneScale;
    float aoRange;
    float aoPower;
    float aoSampleRec;

    // Spherical Harmonics (Order 2)
    float L00;
    float L1m1, L10, L11;
    float L2m2, L2m1, L20, L21, L22;
    Yano_Spherical_Harmonics_Luma sphericalHarmonicsLuma;

    // Colors
    float3 fresnelColor;
    float3 fogColor;
    float3 backgroundColor;
    float3 optionalColor;
    float3 lineStartColor;
    float3 lineEndColor;

    // Lighting
    float3x3 lightMatrix;

    // Scene
    float2 sceneSizeRec;
    float2 cameraPos;
    float4 blendColor;
};
```

**Dual-path shading architecture:**

The `3DRenderer` pipeline (`Nodes_3DRenderer_FragmentUniforms`) supports **PBR texture slots**:
- `baseColorTexture`, `normalTexture`, `roughnessTexture`, `metallicTexture`, `opacityTexture`
- Plus `extImageTexture` for projection mapping
- This path is used for imported 3D models with material properties

The `3DRendererMax` pipeline (`Nodes_3DRendererMax_FragmentUniforms`) uses the **full custom shading model**:
- Embeds `YanoNodes_Shading_GlobalUniforms` with SH, SSAO, Bloom, Fog, Fresnel
- Also has `depthTexture`, `bloomTexture` for post-processing reads
- Dual render targets (color0 + color1) for MRT
- `objectID` and `isEmissive` per-fragment for compositing
- This is the primary path for generated Yanobox geometry

**Key insight: The overall model is NOT full PBR.** The primary shading model is:
- **Spherical Harmonics (L2)** for ambient/diffuse illumination (9 coefficients, luminance-only variant)
- **Fake IBL** via `fakeIBLOutdoorDiffuse()` function in the fragment shader
- **Fresnel** rim lighting (configurable color source)
- **SSAO** (screen-space ambient occlusion with configurable samples)
- **Bloom** post-process (emissive saturation support)
- **Fog** (color source: custom or from scene)
- **Depth effects** (start/range/influence)
- **Flat shading** toggle
- **Specular** via `inputSpecular` / `inputSpecularExponent` (Phong-style)
- **Diffuse** via `inputDiffuse`
- **No normal mapping / no PBR metallic-roughness workflow**

The IBL is precomputed via `FxCorePlugInYanoboxIBLCreateBRDFImage` → `compute_IBL_BRDF_Image_Function`.

---

## 3. 3D Pipeline Architecture

### 3.1 Camera System

**Class**: `FxCorePlugIn3DCamera` + `FxCorePlugInYanoboxCameraInfos` + `FxCoreCamera`

```objc
// FxCoreCamera properties:
- forwardVector   (float3)
- upVector        (float3)
- sideVector      (float3)
- eyePosition     (float3)
- trackballAngleX (float)
- trackballAngleY (float)
```

**Matrix pipeline**:
```
FxCorePlugIn3DRenderToTexture:
  projectionMatrixWithFieldOfView:nearZ:farZ:   → perspective projection
  viewMatrixWithFieldOfView:                     → view matrix from camera state
  executeWithProjection:model:view:handler:      → passes all 3 matrices to renderers

FxCorePlugIn3DMatrices:
  customizeProjectionMatrix  (bool toggle)
  customizeModelMatrix       (bool toggle)
  customizeViewMatrix        (bool toggle)
  → allows direct matrix override

FxCorePlugInYanoboxCameraInfos:
  modelMatrixByApplyingTransformsToModelViewMatrix:pluginArchitecture:SceneSize:
  descriptionForRotationOrder:   → euler angle rotation orders
```

**Ports**:
- `inputFieldOfView` / `outputFieldOfView`
- `inputProjectionMatrix` / `outputProjectionMatrix`
- `inputViewMatrix` / `outputViewMatrix`
- `inputModelMatrix` / `outputModelMatrix`
- `outputModelViewMatrix`
- `inputHostViewMatrix` (from host app camera)
- `outputVideoEffectMotionCameraModelMatrix` / `ProjectionMatrix` / `ViewMatrix` (After Effects integration)
- `outputVideoEffectAfterEffectsCameraIsOrthographic`

### 3.2 Transform Composition

The MVP chain is standard but with some unique features:

1. **Model matrix**: Per-node transform (translation, rotation, scale, anchor)
2. **View matrix**: Camera look-at derived from forward/up/side/eye vectors + trackball angles
3. **Projection matrix**: Perspective (FOV, near, far) or Orthographic

The Hub node (`YanoNodes_Hub_Compute_Function`) applies per-vertex transforms:
```
translation_matrix(float3) → 4x4 translation
fast_nodes_xyz_rotation_matrix(float3) → euler rotation
scaling_matrix(float3) → non-uniform scale
orientVertexToNormal_Matrix(float3, float3) → orient to face normal
```

### 3.3 Shading Model Summary

| Component | Implementation |
|-----------|---------------|
| **Ambient** | Spherical Harmonics L2 (9 coefficients) OR `fakeIBLOutdoorDiffuse` |
| **Diffuse** | SH-based irradiance, light matrix rotation |
| **Specular** | Phong-style with exponent (`inputSpecularExponent`) |
| **Fresnel** | Power-based rim with configurable color source |
| **SSAO** | Screen-space AO: configurable samples (4,8,16,32), radius, bias, range, power |
| **Bloom** | Emissive-driven bloom with saturation control, separate bloom texture |
| **Fog** | Distance-based fog with custom color source |
| **Depth FX** | Start/range/influence for depth-based effects |
| **Flat Shading** | Toggle flat vs smooth normals (uses `flatNormal [[flat]]`) |
| **IBL BRDF** | Pre-computed BRDF LUT via `compute_IBL_BRDF_Image_Function` |
| **SH Types** | `YanoSphericalHarmonicsCoefficientsOfType(YanoSphericalHarmonicsType)` - multiple presets |

### 3.4 Replicator / Instancing System

**Class**: `FxCorePlugInYanoboxNodesReplicator`
**Compute**: `YanoNodes_Replicator_Compute_Function`

The replicator works by GPU compute kernel that stamps geometry at each point in an instancer:

```metal
struct YanoNodes_Replicator_Uniforms {
    bool geoHasConnectionsBuffer;
    bool instancerHasScalesBuffer;
    bool needsCurveTangents;
    bool needsFreePoints;
    bool needsControlPoints;
    bool scaleNodes;
    uint orientation;          // enum: face up, face camera, orient to normal, etc.
    uint rotationMode;
    uint columns, rows, depth;
    uint geometryVertexCount;
    uint instancerVertexCount;
    float step, replicaStep, seed;
    float3 up, target, freePoint, controlPoint;
    float3 tangentOffset, tangentScale;
    float3 rotationAngles;
    float4x4 rotationMatrix, tangentMatrix, tangentScaleMatrix;
};
```

It outputs:
- `verticesOut`, `normalsOut`, `upVectorsOut` - replicated geometry
- `indicesOut`, `connectionsOut` - replicated topology
- `cpTangentsOut`, `freePointsOut`, `controlPointsOut` - curve data for chaining

The **Hub** node (`YanoNodes_Hub_Compute_Function`) also has a full replicator path (`YanoNodes_Replicator_Hub_Compute_Function`) that applies per-instance:
- Color assignment (cycling colors, gradient, noise-based)
- Scale per instance (1D and 3D)
- Orientation (orient FX, face camera)
- Oscillation per instance
- Noise displacement per instance
- Projection warping (spherical, cylindrical, polar)
- Completion/reveal per instance

### 3.5 Text Extrusion

**Class**: `FxCorePlugInYanoboxExtruder`
**Compute**: `Yano_Extruder_Compute_Function`
**Uniforms**: `Yano_Extruder_Compute_Triangles_Uniforms`

```metal
struct Yano_Extruder_Compute_Triangles_Uniforms {
    bool invert, colorize, invertGradient;
    uint mappingMode;         // UV mapping mode
    uint cubeCount;           // number of extrusion cubes
    uint columns, rows, depth;
    uint interpolation;
    uint gradientSamples;
    float extrusionMultiplier;
    float clamping, maxPadding;
    float step1D;
    float2 cubeScale;
    float3 centerOffset, stepSize, tcStep, step2D;
    float3 rgbColor1..5;     // gradient colors
    float3 dilate;
    char4 positions;          // face positions encoded
    char3 normals;            // face normals encoded
    char2 texcoords;          // face texcoords encoded
};
```

The extruder:
1. Takes a luminance/SDF texture from text rasterization
2. Samples it to determine extrusion depth per column
3. Creates front face, back face, and side geometry
4. Supports depth anchor (front/center/back)
5. Supports multiple UV mapping modes
6. Outputs `Yano_Extruder_VertexInput` with position, normal, color, texcoord, luma, face ID

### 3.6 3D Model Import (ModelIO Integration)

The pipeline uses ModelIO exclusively (NOT SceneKit rendering):

```
MDLAsset → FxCorePlugInYanoboxImport3DAsset
  → FxCorePlugInYanoboxModelAssetInfos
    - getMTLObjectsFromMDLAsset:           → extracts Metal buffers
    - extractHierarchyFromMDLAsset:        → scene graph traversal
    - extractMDLMeshProperties:            → vertex descriptors, submeshes
    - debugMDLAssetHierarchy:              → debugging
    - debugMDLAssetVertexDescriptor:       → vertex format inspection
  → FxCorePlugInYanoboxCreateGeometryFrom3DAsset
    - extractFirstMeshFromMDLAsset:        → MDLMesh extraction
    - computeGeometryBufferOnDevice:...    → GPU buffer creation
  → FxCorePlugInYanoboxModelRenderer
    - computeNormalizationWithBoundingBoxFromMDLMesh:  → normalize to unit space
```

`MTKModelIOVertexDescriptorFromMetalWithError` is used to convert MDL vertex descriptors to Metal.

**Supported types** (from linked UTIs):
- `kUTType3dObject`
- `kUTTypeUniversalSceneDescription` (USDZ)
- `kUTTypeUniversalSceneDescriptionMobile`

SCNScene/SCNNode are used for scene graph representation but NOT for rendering:
```
_OBJC_CLASS_$_SCNNode    (imported - used for hierarchy)
_OBJC_CLASS_$_SCNScene   (imported - used for loading)
_OBJC_CLASS_$_SCNText    (imported - used for text geometry)
```

### 3.7 Built-in Geometry Primitives

| Primitive | Compute Uniform Struct | Parameters |
|-----------|----------------------|------------|
| **Grid** | `Yano_Nodes_Grid_Uniforms` | rows, columns, depth, cellSize, cellOffset, alignEvenOdd, connectAxis, offsetType, seed, randomness |
| **Sphere** | `Yano_Nodes_Sphere_Uniforms` | columns, radius, innerRadius, angle, rollup, angleAffects, tangencial, randomizeAngle, radiusRandomness |
| **Spiral** | `Yano_Nodes_Spiral_Uniforms` | columns, rows, radius, minorRadius, balance, rollup, branchStep, halfDepth, tangencial |
| **SineCurve** | `Yano_Nodes_SineCurve_Uniforms` | columns, axis, amplitude, extent, period, phase, progressiveAmplitude, tangential |
| **Random** | `Yano_Nodes_Random_Uniforms` | columns, size, surfaceDensity, seed, isSpherical |
| **Circle** | (CPU) | column count |
| **RegularPolygon** | (CPU) | sides |
| **TextToQuads** | `YanoNodesTextQuad` | per-character quads with advance, lineHeight, tcLeft/Right/Top/Bottom |

### 3.8 Render-to-Texture / Offscreen Rendering

**Class**: `FxCorePlugIn3DRenderToTexture` (the master render node)

```objc
@interface FxCorePlugIn3DRenderToTexture
// Scene properties
@property colorSpace;
@property pixelsWide, pixelsHigh;
@property colorPixelFormat;           // MTLPixelFormat
@property depthPixelFormat;           // MTLPixelFormat
@property sampleCount;                // MSAA

// Matrix outputs
@property projectionMatrix;           // float4x4
@property viewMatrix;                 // float4x4
@property modelMatrix;                // float4x4

// Multi-target
@property colorAttachmentCount;
@property colorAttachmentPixelFormats; // array
@property allowTogglingColorAttachment;
@property customizeColorSpace;

// Methods
- projectionMatrixWithFieldOfView:nearZ:farZ:
- viewMatrixWithFieldOfView:
- executeWithProjection:model:view:handler:
- dynamicallyAllocateTexturesOnDevice:
- renderPassDescriptor
- renderPassDescriptorOnDevice:
- addDynamicOutputsAtIndexes:          // dynamic MRT
- removeDynamicOutputsAtIndexes:
@end
```

It supports:
- Multiple Render Targets (MRT) with dynamic attachment toggling
- Custom color space per attachment
- MSAA with configurable sample count
- Depth buffer with configurable format
- Dynamic texture allocation
- Separate projection/view/model matrices passed as handler arguments

---

## 4. SceneKit vs Custom Engine

### Verdict: **Custom Metal Rendering Pipeline**

FxCore has its **own custom Metal rendering engine**. SceneKit is linked but used only for:

1. **Scene graph import** (`SCNScene`, `SCNNode`) - reading .scn/.usdz files
2. **Text geometry source** (`SCNText`) - generating text outline paths
3. **NOT** for rendering - there is NO `SCNRenderer` or `SCNView` symbol

Evidence:

| Symbol | Present | Usage |
|--------|---------|-------|
| `SCNRenderer` | **NO** | Not used at all |
| `SCNView` | **NO** | Not used at all |
| `SCNScene` | Yes (U) | Import only |
| `SCNNode` | Yes (U) | Hierarchy only |
| `SCNText` | Yes (U) | Text geometry source |
| `MDLAsset` | Yes (U) | Model import |
| `MDLMesh` | Yes (U) | Mesh data extraction |
| `MDLCamera` | Yes (U) | Camera parameter import |
| `MTLRenderPassDescriptor` | Yes (U) | Direct Metal rendering |
| `MTLRenderPipelineDescriptor` | Yes | Pipeline state management |
| `MTLDepthStencilDescriptor` | Yes | Depth buffer management |
| `MTLRenderPipelineState` | Yes | Cached pipeline states |
| `MTLCommandBuffer` | Yes | Command encoding |
| `MetalFX.framework` | Yes | MetalFX upscaling |

The entire pipeline is:
```
Compute kernels (geometry generation, transforms, animation)
  → MTLBuffer (vertex/index data)
  → MTLRenderCommandEncoder (via MTLRenderPassDescriptor)
  → Custom vertex/fragment shaders
  → MTLTexture output (render-to-texture)
```

---

## 5. Node Parameter Extraction (Key Nodes)

### 5.1 FxCorePlugIn3DRenderToTexture

**Inputs:**
- `inputFieldOfView` - Camera field of view
- `inputProjectionMatrix` - Override projection
- `inputViewMatrix` - Override view
- `inputModelMatrix` - Override model
- `inputColorAttachmentActive` - Toggle per-attachment
- `inputImage` (per-child pipeline)
- `customizeProjectionMatrix` (bool)
- `customizeModelMatrix` (bool)
- `customizeViewMatrix` (bool)
- `customizeColorSpace` (bool)
- `allowTogglingColorAttachment` (bool)

**Outputs:**
- `outputImage` (rendered texture)
- `outputProjectionMatrix`, `outputViewMatrix`, `outputModelMatrix`
- `outputModelViewMatrix`
- `outputFieldOfView`
- Dynamic MRT outputs (indexed)

### 5.2 FxCorePlugIn3DSprite

**Inputs:**
- `inputImage` - Texture to display
- `inputBillboard` - Face camera toggle
- `inputBlendMode` - MTL blend mode
- `inputBlendColor` - Tint color
- `inputOpacity`

**Shaders:** `SpriteVertexFunction` / `SpriteFragmentFunction`

### 5.3 FxCorePlugIn3DCamera

**Inputs:**
- `inputFieldOfView`
- `inputRotationOrder` (enum: XYZ, XZY, YXZ, YZX, ZXY, ZYX)
- `inputHostViewMatrix` (host app camera)

**Outputs:**
- `outputProjectionMatrix`
- `outputViewMatrix`
- `outputModelMatrix`
- `outputFieldOfView`
- Motion camera outputs (AE integration)

### 5.4 FxCorePlugIn3DTransform

Supports dynamic input addition/removal for transform stacking.

### 5.5 FxCorePlugInYanoboxExtruder (Text-to-3D)

**Inputs:**
- `inputAttributedString` - Styled text to extrude
- `inputDepthAnchor` (enum: Front, Center, Back)
- `inputMapping` (enum: UV mapping modes)
- `inputluminanceCurve` (depth profile)
- `inputDiffuse`, `inputSpecular`, `inputSpecularExponent`
- Color inputs (rgbColor1..5 gradient)
- `extrusionMultiplier`, `clamping`, `maxPadding`

**Outputs:** Extruded 3D geometry (vertices, normals, texcoords, indices)

### 5.6 FxCorePlugInYanoboxNodesReplicator

**Inputs:**
- `inputOrientation` (enum: Up, Face camera, Orient to normal, ...)
- `inputPointAffectedBy` (enum)
- `inputRotationMode` (enum)
- `inputColumns`, `inputRows`, `inputDepth` (grid dimensions)
- Rotation angles, seeds, sizes

**Outputs:** Replicated geometry with full transform per instance

### 5.7 FxCorePlugInYanoboxCreateGeometryFrom3DAsset / Import3DAsset

**Inputs:**
- `inputAsset` - MDLAsset
- `inputPointSource` (enum: Vertices, Random surface, etc.)
- `inputWireframeExtract` (enum: edges, wireframe)
- `probability` - Random sampling factor

**Outputs:**
- Geometry buffers (vertices, normals, indices, connections)
- Bounding box info
- Model normalizer data

### 5.8 FxCorePlugInYanoboxNodesShadingControler

**Inputs:**
- `inputDiffuse` - Diffuse intensity
- `inputSpecular` - Specular intensity
- `inputSpecularExponent`
- `inputFresnel`, `inputFresnelPower`, `inputFresnelColor`, `inputFresnelColorSource`
- `inputFogColor`, `inputFogColorSource`, `inputFogDensity`
- `inputUseBloom`, `inputInBloomAmount`, `inputInBloomDiffusion`, `inputBloomEmissiveSaturation`
- SSAO: `descriptionForSSAOSampleCount` (4/8/16/32), `descriptionForAOType`
- `descriptionForAmbiantType` (SH presets, fake IBL)
- `descriptionForCompositingPass`, `descriptionForDepthEffect`, `descriptionForDepthSpace`
- `descriptionForNodeType` - Shading model type
- `descriptionForOptionalColor` - Emissive color mode

### 5.9 FxCorePlugInYanoboxNodesGrid

**Parameters (from `Yano_Nodes_Grid_Uniforms`):**
- `rows`, `columns`, `depth`
- `connectAxis` (X, Y, Z, XY, XZ, YZ, XYZ)
- `offsetType` (none, alternate row, alternate column)
- `cellSize`, `cellOffset`, `demiCellSize`
- `alignEvenOdd`, `alignEvenOddOffset`, `alignEvenOddScale`
- `seed`, `randomness`

### 5.10 FxCorePlugInYanoboxNodesSphere

**Parameters (from `Yano_Nodes_Sphere_Uniforms`):**
- `columns` (point count)
- `radius`, `innerRadius`
- `angle`, `angleRandomness`, `angleAffects`
- `rollup` (latitude distribution)
- `seed`
- `shouldAlignEvenOdd`, `shouldOffsetAngle`, `shouldOrbit`, `shouldRandomizeAngle`
- `useRadiusRandomness`, `tangencial`

---

## Summary: Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FxCore Composition Graph               │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────────┐  │
│  │ Geometry  │  │ Text/    │  │ 3D Asset Import       │  │
│  │ Generators│  │ Styled   │  │ (MDLAsset→MTLBuffer)  │  │
│  │ Grid,     │  │ Text     │  │ (SCNScene for import) │  │
│  │ Sphere,   │  │ Pipeline │  │ (SCNText for outlines)│  │
│  │ Spiral... │  │          │  │                       │  │
│  └────┬──────┘  └────┬─────┘  └──────────┬────────────┘  │
│       │              │                    │               │
│       ▼              ▼                    ▼               │
│  ┌─────────────────────────────────────────────────────┐  │
│  │           Modifier Pipeline (Metal Compute)          │  │
│  │  Hub → Replicator → Oscillator → Completion → Scale  │  │
│  │  → Colorizer → Projection → Selection → ApplyNoise   │  │
│  │  → ApplyMatrix → JoinGeometry → DepthSorting         │  │
│  └────────────────────────┬────────────────────────────┘  │
│                           │                               │
│                           ▼                               │
│  ┌─────────────────────────────────────────────────────┐  │
│  │         3DRenderToTexture (Custom Metal Pipeline)     │  │
│  │  • MTLRenderPassDescriptor (MRT, MSAA, Depth)        │  │
│  │  • Custom V/F shaders (per renderer type)            │  │
│  │  • Shading: SH L2 ambient + Phong + Fresnel + SSAO  │  │
│  │  • IBL: fakeIBLOutdoorDiffuse + BRDF LUT            │  │
│  │  • Bloom, Fog, Depth FX post-processing              │  │
│  │  • MetalFX upscaling                                 │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  Camera: FxCoreCamera (trackball) → P/V/M matrices       │
│  Blending: MTLBlendFactor (per-component RGB/A config)   │
│  Spatial Hash: Sub-box partitioning for distance queries  │
└─────────────────────────────────────────────────────────┘
```

**Key Architectural Insights:**
1. **No SceneKit rendering** - Fully custom Metal pipeline
2. **Compute-first architecture** - Geometry generated/transformed on GPU via compute kernels, then rendered
3. **SH-based lighting** - Not PBR, uses Order-2 Spherical Harmonics with luminance variant
4. **Highly modular** - Each node is a separate ObjC class with its own Metal compute/render functions
5. **Text-centric design** - Enormous infrastructure for text animation (Motype heritage from Yanobox)
6. **MetalFX integration** - Hardware upscaling support
7. **Per-vertex everything** - Colors, scales, orientations, completions all computed per-vertex in compute kernels
8. **Developer path**: `/Users/gds/Noise Industries/Development/FxCore/` (compiled by "gds" at Noise Industries)

---

## 6. Node Category Taxonomy (Categories.strings)

FxCore organizes its 338 plugin nodes into 29 categories:

| Category Key | Display Name | Description |
|-------------|-------------|-------------|
| `kFxCoreCategory2D` | 2D | Nodes designed around the Core Image API to process and render images in 2D |
| `kFxCoreCategory3D` | 3D | Nodes designed around the Metal API to setup and render objects in a 3D environment |
| `kFxCoreCategoryBlur` | Blur | Blur effects |
| `kFxCoreCategoryCaptions` | Captions | Nodes to extract and process captions from Caption Converter or FxFactory |
| `kFxCoreCategoryCollections` | Collections | Nodes to create ordered/dictionary collections, manipulate contents and access elements |
| `kFxCoreCategoryColorCorrection` | Color Correction | Color correction effects |
| `kFxCoreCategoryColorManagement` | Color Management | Create, inspect and convert color and color spaces |
| `kFxCoreCategoryDistortion` | Distortion | Distortion effects |
| `kFxCoreCategoryEnvironment` | Environment | Nodes that return information about the execution environment |
| `kFxCoreCategoryFiles` | Files | Nodes for processing files and file paths |
| `kFxCoreCategoryFxFactory` | FxFactory | Nodes for developing video effects through FxFactory |
| `kFxCoreCategoryFxFactoryPro` | FxFactory Pro | Nodes developed for FxFactory Pro |
| `kFxCoreCategoryGenerator` | Generator | Generators |
| `kFxCoreCategoryGeometryPrimitives` | Geometry Primitives | Create, manipulate or extract properties of geometric shapes, paths, etc. |
| `kFxCoreCategoryHalftones` | Halftones | Halftoning effects |
| `kFxCoreCategoryImages` | Images | Import, export, extract info, or manipulate image properties |
| `kFxCoreCategoryIterators` | Iterators | Group multiple nodes and execute them as a single node with iteration passes |
| `kFxCoreCategoryLinearAlgebra` | Linear Algebra | Create and manipulate vectors and matrices (column-major) |
| `kFxCoreCategoryMachineLearning` | Machine Learning | Nodes to access CoreML functionality |
| `kFxCoreCategoryMath` | Math | Mathematical and logical computations |
| `kFxCoreCategoryPDF` | PDF | Import PDF documents, inspect and rasterize individual pages |
| `kFxCoreCategoryPhotoMontage` | Photo Montage | Photo Montage plug-ins |
| `kFxCoreCategorySharpen` | Sharpen | Sharpen effects |
| `kFxCoreCategoryStrings` | Strings | Create and manipulate strings of text |
| `kFxCoreCategoryStyledText` | Styled Text | Create, process and render styled text (attributed strings) |
| `kFxCoreCategoryStylization` | Stylization | Stylization effects |
| `kFxCoreCategoryTiling` | Tiling | Tiling effects |
| `kFxCoreCategoryTime` | Time | Fractional time components, timecode strings, etc. |
| `kFxCoreCategoryTransitions` | Transitions | Transition-style effects with image and target image inputs |
| `kFxCoreCategoryUtility` | Utility | General purpose nodes: splitters, multiplexers, etc. |
| `kFxCoreCategoryVideo` | Video | Acquisition, playback, and processing of video via AVFoundation |
| `kFxCoreCategoryYanobox` | Yanobox | Nodes for creation of Yanobox plugins |

---

## 7. CIKernels.metallib - Core Image Metal Kernels

The separate `CIKernels.metallib` (184KB) contains **20 Core Image kernel functions** compiled as Metal stitchable functions. These are 2D image processing kernels (NOT 3D pipeline):

| Kernel | Purpose | Key Parameters |
|--------|---------|---------------|
| `CIInvertRed` | Red channel inversion | sample |
| `CIRadialBlurWeights` | Pre-compute radial blur weights | span |
| `CIRadialBlur` | Single-axis radial/spin blur | center, angle, samples, weights |
| `CIMaskedRadialBlur` | Masked variant of radial blur | center, angle, samples, mask, weights |
| `CIRadialBlurChannels` | Per-channel radial blur (RGB separate angles) | center, angles(float3), samples, weights |
| `CIMaskedRadialBlurChannels` | Masked per-channel radial blur | center, angles, samples, mask, weights |
| `CINebula` | Procedural nebula generator | center, width, time, turbulence, roughness, brightness, distance, depth, contrast, palette, rotation, scale, shape, background |
| `CIDissolve` | Standard dissolve transition | a, b, t |
| `CIDissolvePerceptual` | Perceptual-space dissolve (sRGB→OkLab) | a, b, t |
| `CIDissolveWithMask` | Masked dissolve | a, b, m, t |
| `CIDissolveWithMaskPerceptual` | Perceptual masked dissolve | a, b, m, t |
| `CIPersonSegmentationMerge0/1/2` | Person segmentation mask merge (3 variants) | a, b, c, d |
| `CIFadeToColor` | Fade to solid color | dissolve, color, tent |
| `CIFadeToColorPerceptual` | Perceptual fade to color (OkLab) | dissolve, color, tent |
| `CIWormhole` | Procedural wormhole distortion | origin, size, angle, contrast, density, strength, color0, color1 |
| `CIWormholePerceptual` | Perceptual wormhole (OkLab) | (same as above) |
| `CIReplaceWithImageColor` | Replace regions with solid color | image, color, amount |
| `CIReplaceWithImageColorPerceptual` | Perceptual color replacement (OkLab) | image, color, amount |
| `CIColorBlendModePerceptual` | Perceptual color blend mode (sRGB→OkLab) | a, b |
| `CIScanlines` | CRT scanline overlay | center, thickness, intensity, sharpness, offset |

**Key observations:**
- Links dynamically to `/System/Library/Frameworks/CoreImage.framework/CoreImage.metallib`
- Compiled with Metal AIR v25, targeting macOS 13.5+
- Multiple kernels have "Perceptual" variants using **OkLab** color space (sRGB→OkLab→blend→sRGB)
- Uses `coreimage::Sampler` and `coreimage::Destination` stitching types
- Math intrinsics: `air.cos`, `air.pow`, `air.tanh`, `air.rsqrt`, `air.atan2`, `air.dot`

---

## 8. Core Data Model (FxCorePersistentDocument)

The composition document format is a Core Data persistent store with **9 entities**:

### 8.1 Entity Relationship Model

```
Composition (root)
 ├── nodes: [Node]
 ├── keyValuePairs: [CompositionKeyValuePair]
 ├── comments: String
 ├── timebase: ???
 ├── isConsumer: Bool
 │
 └── Node
      ├── title: String
      ├── identifier: String
      ├── tag: ???
      ├── frameOriginX: Float
      ├── frameOriginY: Float
      ├── isIterator: Bool
      ├── dynamicInputsCount: Int
      ├── dynamicOutputsCount: Int
      ├── dynamicPortType: ???
      ├── inputs: [Input]
      ├── outputs: [Output]
      ├── keyValuePairs: [NodeKeyValuePair]
      │
      ├── Input (extends AssignableInput)
      │    ├── assignedValue: ???
      │    ├── lastKnownType: String
      │    ├── connection: Connection?
      │    └── node: Node (back-ref)
      │
      ├── Output (extends ComputableOutput)
      │    ├── connections: [Connection]
      │    └── node: Node (back-ref)
      │
      └── Connection
           ├── input: Input
           ├── output: Output
           ├── index: Int
           └── parent/child relationships

AssignableInput
 └── assignedValue, lastKnownType

ComputableOutput
 └── (base for Output)

CompositionKeyValuePair
 └── key, value, composition

NodeKeyValuePair
 └── key, value, node
```

### 8.2 Secure Unarchiving

The model uses `FxCoreSecureUnarchiveFromDataTransformer` as the value transformer, indicating NSSecureCoding compliance for serialized port values.

### 8.3 Entity Descriptions

| Entity | Purpose |
|--------|---------|
| `FxCorePersistentComposition` | Top-level composition containing nodes |
| `FxCorePersistentNode` | Individual node in the graph (position, type, dynamic ports) |
| `FxCorePersistentInput` | Input port with assigned value and type |
| `FxCorePersistentOutput` | Output port with downstream connections |
| `FxCorePersistentConnection` | Wire between an output and an input |
| `FxCorePersistentAssignableInput` | Base class for inputs with assignable values |
| `FxCorePersistentComputableOutput` | Base class for computable outputs |
| `FxCorePersistentCompositionKeyValuePair` | Metadata key-value pair on composition |
| `FxCorePersistentNodeKeyValuePair` | Metadata key-value pair on node |

---

## 9. Complete Plugin Node Inventory (338 Nodes)

### 9.1 3D/Metal Nodes (37 nodes)

| Plugin ID | Display Name |
|-----------|-------------|
| `FxCorePlugIn3DBlockWipe` | Block Wipe |
| `FxCorePlugIn3DCamera` | 3D Camera |
| `FxCorePlugIn3DMatrices` | 3D Matrices |
| `FxCorePlugIn3DRenderToTexture` | 3D Render to Texture |
| `FxCorePlugIn3DSprite` | Sprite |
| `FxCorePlugIn3DTransform` | 3D Transformation |
| `FxCorePlugInCIBillboard` | Billboard |
| `FxCorePlugInFxFactoryRenderingInfo` | Rendering |
| `FxCorePlugInMLModelImporter` | Model Importer |
| `FxCorePlugInYanoboxAnimationPathsRenderer` | Yanobox Animation Paths Renderer |
| `FxCorePlugInYanoboxCoreGraphicRenderer` | Yanobox Core Graphics Renderer |
| `FxCorePlugInYanoboxCreateGeometryFrom3DAsset` | Yanobox Create Geometry from 3D Asset |
| `FxCorePlugInYanoboxExtruder` | Yanobox Extruder |
| `FxCorePlugInYanoboxImport3DAsset` | Yanobox Import 3D Asset |
| `FxCorePlugInYanoboxModelAssetInfos` | Yanobox Model Asset Infos |
| `FxCorePlugInYanoboxModelAssetWithStyledText` | Yanobox Model Asset With Text |
| `FxCorePlugInYanoboxModelRenderer` | Yanobox Model Renderer |
| `FxCorePlugInYanoboxNodes3DModelInfos` | Yanobox Nodes 3D Model Infos |
| `FxCorePlugInYanoboxNodes3DRenderer` | Yanobox Nodes 3D Renderer |
| `FxCorePlugInYanoboxNodes3DRendererMax` | Yanobox Nodes 3D Renderer Max |
| `FxCorePlugInYanoboxNodesCalloutLinesRenderer` | Yanobox Nodes Callout Lines Renderer |
| `FxCorePlugInYanoboxNodesDigitRenderer` | Yanobox Nodes Digit Renderer |
| `FxCorePlugInYanoboxNodesGlobalRenderer` | Yanobox Nodes Global Renderer |
| `FxCorePlugInYanoboxNodesLinesRenderer` | Yanobox Nodes Lines Renderer |
| `FxCorePlugInYanoboxNodesRender3DModelsWithInfos` | Yanobox Nodes Render 3D Models With Infos |
| `FxCorePlugInYanoboxNodesRenderer` | Yanobox Nodes Renderer |
| `FxCorePlugInYanoboxNodesReplicator` | Yanobox Nodes Replicator |
| `FxCorePlugInYanoboxNodesTextRenderer` | Yanobox Nodes Text Renderer |
| `FxCorePlugInYanoboxTextRenderer` | Yanobox Text Renderer |
| `FxCorePlugInYanoboxVoxelGeometryFrom3DAsset` | Yanobox Voxel Geometry from 3D Asset |
| `FxCorePlugYanoboxBillboard` | Yanobox Billboard |
| `FxFactoryProLightEmitterPlugIn` | Light Emitter |
| `FxFactoryProLightLeaksPlugIn` | Light Leaks |
| `FxFactoryProSpotLightsPlugIn` | Spot Lights |
| `HumanBodyPose3DPlugIn` | Human Body Pose 3D |
| `LanguageModelPlugIn` | Language Model |
| `MLModelPlugIn` | Model Executor |

### 9.2 Yanobox Utility/Infrastructure Nodes (99 nodes)

Full list of all 99 Yanobox-prefixed nodes with descriptions:

| Plugin ID | Display Name | Description |
|-----------|-------------|-------------|
| `FxCorePlugInYanoboxAEMatrixConverter` | AE Matrix Converter | Converts After Effects Camera Matrix into Metal View Matrix |
| `FxCorePlugInYanoboxAccumulateValue` | Accumulate Value | Accumulates a scalar value |
| `FxCorePlugInYanoboxAnchoredRectangle` | Anchored Rectangle | Align child rectangle in parent by anchor settings |
| `FxCorePlugInYanoboxBlending` | Advanced Blending | Sets advanced MTLBlendFactor |
| `FxCorePlugInYanoboxBufferDebug` | Buffer Debug | Helper to debug GPU buffers |
| `FxCorePlugInYanoboxCameraInfos` | Camera Infos | Converts AE/Motion camera matrices to FxCore view matrix |
| `FxCorePlugInYanoboxCreateBuffer` | Create Buffer | Converts dictionary data into Metal buffers |
| `FxCorePlugInYanoboxCreateBufferFromArray` | Create Buffer From Array | Creates Metal buffers from CIVector/NSNumber arrays (bool, uint, int, float types) |
| `FxCorePlugInYanoboxCreateGeometryFrom3DAsset` | Geometry from 3D Asset | Create geometry from 3D model asset |
| `FxCorePlugInYanoboxCreateTexturesForImages` | Create Textures | Create array of textures from images |
| `FxCorePlugInYanoboxDepthControler` | Depth Controler | Manages depth functionalities in renderer nodes |
| `FxCorePlugInYanoboxEmbeddingExplorer` | Embedding Explorer | Explore word embeddings |
| `FxCorePlugInYanoboxExtruder` | Extruder | Extrude cubes from text/luminance |
| `FxCorePlugInYanoboxGeometry` | Geometry | Renders 3D geometry from CIVector/Dictionary (float3..float9 interpreted as position+normal+color+texcoord) |
| `FxCorePlugInYanoboxIBLCreateBRDFImage` | IBL BRDF Look-up | Pre-compute BRDF LUT (roughness vs NdotV) |
| `FxCorePlugInYanoboxIndexedAnimation` | Indexed Animation | Returns array of sequenced interpolations |
| `FxCorePlugInYanoboxLinguisticTagger` | Linguistic Tagger | Colorizes text by grammatical rules (adjective, noun, verb...) |
| `FxCorePlugInYanoboxMathOperation` | Vector Math | GPU math on 3-component vectors (add/sub/mul/div/cross/dot/distance) |
| `FxCorePlugInYanoboxMatrix` | Matrix | Create 4x4 matrix from transformations |
| `FxCorePlugInYanoboxMatrixModify` | Matrix Modify | Modify a 4x4 matrix (CIVector of 16 elements) |
| `FxCorePlugInYanoboxModelAssetInfos` | Model Asset Infos | Get infos about a model asset |
| `FxCorePlugInYanoboxModelAssetWithStyledText` | Model Asset With Text | Create model asset from styled text via SceneKit |
| `FxCorePlugInYanoboxModelRenderer` | Model Renderer | Render a 3D model |
| `FxCorePlugInYanoboxMotypeCommonControls` | Motype Common Controls | Distributes common settings to Motype renderers |
| `FxCorePlugInYanoboxNodesApplyMatrix` | Apply Matrix | Applies matrix to geometry data |
| `FxCorePlugInYanoboxNodesApplyNoise` | Apply Noise | Applies fractal noise to geometry |
| `FxCorePlugInYanoboxNodesAttachConnections` | Attach Connections | Creates line indices for attached points |
| `FxCorePlugInYanoboxNodesBoundingBox` | Bounding Box | Compute AABB of point cloud |
| `FxCorePlugInYanoboxNodesCalloutConnections` | Callout Connections | Connections between form points and text lines |
| `FxCorePlugInYanoboxNodesCalloutLinesRenderer` | Callout Lines Renderer | Render lines between form/text points |
| `FxCorePlugInYanoboxNodesCircle` | Circle | Distribute vertices along circle |
| `FxCorePlugInYanoboxNodesColorizer` | Colorizer | Per-vertex color distributions (float4 colors buffer) |
| `FxCorePlugInYanoboxNodesCompletion` | Completion | Create completions for nodes/text by index or axis |
| `FxCorePlugInYanoboxNodesConnectGeometries` | Connect Geometries | Connect vertices between geometries |
| `FxCorePlugInYanoboxNodesConnectionsFromString` | Connections from String | Create connections from multiline string (parent-child format) |
| `FxCorePlugInYanoboxNodesControler` | Controler | Master controller for node/text style parameters |
| `FxCorePlugInYanoboxNodesCurvedRadialSections` | Curved Radial Sections | Generate curved tube radial section vertices |
| `FxCorePlugInYanoboxNodesCurvedTubes` | Curved Tubes | Render curved tubes |
| `FxCorePlugInYanoboxNodesDepthSorting` | Depth Sorting | Depth-sort points for correct transparency |
| `FxCorePlugInYanoboxNodesDistanceConnections` | Distance Connections | Connections based on spatial proximity (spatial hash) |
| `FxCorePlugInYanoboxNodesEffectsControler` | Effects Controler | Manages replicator/projection effects parameters |
| `FxCorePlugInYanoboxNodesFaceNormalsToLines` | Normals to Lines | Create line indices for normal visualization |
| `FxCorePlugInYanoboxNodesFastBoundingBox` | Fast Bounding Box | Optimized AABB variant |
| `FxCorePlugInYanoboxNodesGenerateNoise` | Generate Noise | 1D/2D/3D fractal noise from float3 buffer |
| `FxCorePlugInYanoboxNodesGlobalRenderer` | Global Renderer | Renders nodes and texts (primary renderer) |
| `FxCorePlugInYanoboxNodesGrid` | Grid | 3D grid vertex distribution |
| `FxCorePlugInYanoboxNodesHub` | Hub | Central transform/style/effects dispatcher |
| `FxCorePlugInYanoboxNodesJoinGeometry` | Join Geometry | Merge geometry vertices and/or connections |
| `FxCorePlugInYanoboxNodesLinesRenderer` | Lines Renderer | Render lines (straight/curved/tangent) |
| `FxCorePlugInYanoboxNodesOscillator` | Oscillator | Wave/bounce geometry displacement |
| `FxCorePlugInYanoboxNodesOscillatorControler` | Oscillator Controler | Manages oscillator parameters |
| `FxCorePlugInYanoboxNodesProjection` | Projection | Project vertices onto radial primitives (cylindrical/polar/spherical) |
| `FxCorePlugInYanoboxNodesRandom` | Random | Random vertex distribution in 3D |
| `FxCorePlugInYanoboxNodesRegularPolygon` | Regular Polygon | Distribute vertices on polygon sides |
| `FxCorePlugInYanoboxNodesRender3DModelsWithInfos` | Render 3D Models With Infos | Render models attached to geometry points |
| `FxCorePlugInYanoboxNodesRenderer` | Renderer | Renders geometry onto quads |
| `FxCorePlugInYanoboxNodesReplicator` | Replicator | Replicate form along instancer geometry |
| `FxCorePlugInYanoboxNodesSampleImage` | Sample Image | Sample pixel values at node positions (luminance + colors) |
| `FxCorePlugInYanoboxNodesScaling` | Scaling | Per-vertex scale distributions |
| `FxCorePlugInYanoboxNodesSelection` | Selection Falloff | Selection by distance to virtual shapes (Plane/Box/Sphere) |
| `FxCorePlugInYanoboxNodesSerialConnections` | Serial Connections | Chain-connect geometry vertices |
| `FxCorePlugInYanoboxNodesShadingControler` | Shading Controler | Manages shading model parameters (SH, specular, SSAO, bloom, fog) |
| `FxCorePlugInYanoboxNodesSineCurve` | Sine Curve | Distribute vertices along sine curve |
| `FxCorePlugInYanoboxNodesSphere` | Sphere | Distribute vertices on sphere surface |
| `FxCorePlugInYanoboxNodesSpiral` | Spiral | Distribute vertices along spiral |
| `FxCorePlugInYanoboxNodesTextRenderer` | Text Renderer | Render text onto nodes |
| `FxCorePlugInYanoboxNodesTextToQuads` | Text To Quads | Parse styled text into per-character quads |
| `FxCorePlugInYanoboxNodesVoxelBoxConnections` | Voxel Box Connections | Create voxel boxes attached to nodes |
| `FxCorePlugInYanoboxNormalizeVector` | Normalize Vector | Normalize single or buffer of float3 |
| `FxCorePlugInYanoboxPulse` | Pulse | Boolean pulse for one frame on signal |
| `FxCorePlugInYanoboxQuadBordersWithSize` | Quad Borders With Size | Create bordered quads with texcoords and 9-slice |
| `FxCorePlugInYanoboxRectangle` | Rectangle | Create rectangle as CIVector |
| `FxCorePlugInYanoboxSliceRectangle` | Slice Rectangle | Slice rectangle into parts |
| `FxCorePlugInYanoboxSlotAnimator` | Slot Animator | Sequenced slot-machine animation for parameter arrays |
| `FxCorePlugInYanoboxSplitStyledText` | Split Styled Text | Split styled text by separator |
| `FxCorePlugInYanoboxStringFromPDFPage` | String from PDF Page | Extract text from PDF page |
| `FxCorePlugInYanoboxStyledTextAtlas` | Styled Text Atlas | Create font atlas from styled text |
| `FxCorePlugInYanoboxStyledTextInRectangleWithAttributes` | Styled Text In Rectangle | Apply tracking/line/paragraph spacing to styled text |
| `FxCorePlugInYanoboxStyledTextInfos` | Styled Text Infos | Extract text info for rendering |
| `FxCorePlugInYanoboxStyledTextParagraphInfos` | Styled Text Paragraph Infos | Line origins and glyph positions |
| `FxCorePlugInYanoboxSwipeText` | Swipe Text | Slot-machine text animation setup |
| `FxCorePlugInYanoboxSwipeTextGeometry` | Swipe Text Geometry | Create geometry for swipe text cells |
| `FxCorePlugInYanoboxTextParticles` | Text Particles | Render text with particle effects |
| `FxCorePlugInYanoboxTextRenderer` | Text Renderer | Render text with font atlas |
| `FxCorePlugInYanoboxTrailingText` | Trailing Text | Render trailing text (motion blur/paint) |
| `FxCorePlugInYanoboxVoxelGeometryFrom3DAsset` | Voxel Geometry from 3D Asset | Voxelize 3D model |
| `FxCorePlugYanoboxBillboard` | Billboard | Full screen textured quad in 3D scene |
| `FxCorePlugYanoboxNodesBackground` | Nodes Background | Render background in 3D scene context |

### 9.3 3D-Related Port Parameters (from Ports.strings)

Key 3D port parameters extracted from the 1,647 total port definitions:

| Port Key | Display Name | Description |
|----------|-------------|-------------|
| `input3DAxisAngle` | 3D Axis Angle | Angle identifying the 3D rotation axis vector |
| `input3DRotationAngle` | 3D Rotation Angle | Angle of rotation around the 3D axis |
| `inputAnimate3DAngle` | Animate 3D Angle | Animates the 3D rotation angle |
| `inputCameraInfo` | Camera Info | Keyed collection with FxFactory runtime camera info |
| `inputShadows` | Shadows | Contribution of shadows to the output |
| `inputUseHostCamera` | Use Host Camera | Use host application camera |
| `outputIs3DScene` | Rendering in 3D? | True if rendering within a 3D scene context |
| `outputVideoEffectCameraIsEnabled` | Camera Enabled | True when 3D camera is active |
| `outputVideoEffectMotionCameraFocalLength` | Focal Length (Motion) | Focal length in mm (35mm equivalent) |
| `outputVideoEffectMotionCameraMatrix` | Camera Matrix (Motion) | Apple Motion camera matrix |
| `outputVideoEffectMotionCameraModelMatrix` | Model Matrix (Motion) | 4x4 layer/model matrix |
| `outputVideoEffectMotionCameraProjectionMatrix` | Projection Matrix (Motion) | 4x4 projection matrix |
| `outputVideoEffectMotionCameraViewMatrix` | View Matrix (Motion) | 4x4 view matrix |
| `outputVideoEffectAfterEffectsCameraDistanceToPlane` | Distance To Plane (AE) | After Effects camera distance |
| `outputVideoEffectAfterEffectsCameraFocalLength` | Focal Length (AE) | After Effects focal length |
| `outputVideoEffectAfterEffectsCameraIsOrthographic` | Is Orthographic (AE) | AE orthographic camera flag |
| `outputVideoEffectAfterEffectsCameraToWorldMatrix` | Camera To World Matrix (AE) | AE camera-to-world transform |

### 9.4 Detailed Parameter Lists for Key Nodes

#### ShadingControler Parameters (from PlugIns.strings)

| Parameter | Description |
|-----------|-------------|
| `inputDiffuse` | Diffuse intensity |
| `inputSpecular` | Specular intensity |
| `inputSpecularExponent` | Phong exponent |
| `inputFresnel` | Fresnel amount |
| `inputFresnelPower` | Fresnel power curve |
| `inputFresnelColor` | Fresnel rim color |
| `inputFresnelColorSource` | Fresnel color source (custom, vertex, etc.) |
| `inputFogColor` | Fog color |
| `inputFogColorSource` | Fog color source |
| `inputFogDensity` | Fog density |
| `inputUseBloom` | Enable bloom |
| `inputInBloomAmount` | Bloom amount |
| `inputInBloomDiffusion` | Bloom diffusion |
| `inputBloomEmissiveSaturation` | Bloom emissive saturation |
| `descriptionForSSAOSampleCount` | SSAO samples (4/8/16/32) |
| `descriptionForAOType` | AO type |
| `descriptionForAmbiantType` | Ambient type (SH presets, fake IBL) |
| `descriptionForCompositingPass` | Compositing pass mode |
| `descriptionForDepthEffect` | Depth effect mode |
| `descriptionForDepthSpace` | Depth space |
| `descriptionForNodeType` | Shading model type |
| `descriptionForOptionalColor` | Optional/emissive color mode |

#### Hub (Central Compute) Parameters

All Hub parameters are encoded in the massive `YanoNodes_Hub_Uniforms` struct:

| Sub-struct | Key Parameters |
|-----------|---------------|
| `YanoNodes_Nodes_GlobalUniforms` | columns, rows, depth, step, seed, enable, isParented, shouldDoCompletion, generate3DSizes, interpolateColor, useCurvedCompletion, useRandomCompletion, useVoxelSize, useDistanceSize |
| `YanoNodesSevenColors` | 7 float4 colors for cycling/gradient |
| `YanoNodes_Oscillator_GlobalUniforms` | shouldBounce, loopNoise, skipEvenIndices, skipOddIndices, mode, axis, direction, destination, amplitude, period, phase, demiAmp, phaseRandomness, minAmpRandomness, maxAmpRandomness, damping |
| `YanoNodes_Effects_GlobalUniforms` | effectType, replicatorUseCurvedLine, replicatorScaleNodes, projectionSwap, projectionRemap, projectionType, replicatorRotationMode, replicatorSeed, replicatorRotationAngles, replicatorSize, progress, projectionRadius, lattitude, longitude, projectionBalance, projectionHeight |

Full Hub scalar parameters include: colorSeed, colorDistribution, colorDestination, colorSamples, sizeMode, scale3DAxis, sizeModulo, completionCurve, sizeSeed, orientFxMode, completionType, completionDestination, completionAxis, completionRotationAxis, planarAnchor, depthAnchor, orientFxMaxAngle, colorRandomness, colorCycles, colorOffset, colorProgressPower, opacity, opacityRandomness, minCompletion, maxCompletion, completionTension, axisCompletionPhase, axisCompletionScale, axisCompletionFalloff, probability, size, secondarySize, voxelSize, sizePeriod, sizePhase, sizeRandomness, and more.

#### GlobalRenderer Parameters

| Parameter | Description |
|-----------|-------------|
| `inputFaceCamera` | Billboard quads to camera |
| `inputOrientation` | Quad orientation mode |
| `inputImage` / `inputTextures` | Texture source |
| `inputProbability` / `inputProbabilitySeed` | Random show/hide per quad |
| `inputDepthNear` / `inputDepthFar` | Depth range |
| `inputFogColor` / `inputFogDensity` | Fog settings |
| `inputSceneScale` | Scene scale factor |

#### Colorizer Parameters

| Parameter | Description |
|-----------|-------------|
| `inputColorDistribution` | Distribution mode (from index, random, gradient) |
| `inputColorDestination` | Where to apply (nodes, text, both) |
| `inputColors` | Array of up to 7 float4 colors |
| `inputColorSeed` | Randomization seed |
| `inputColorRandomness` | Randomness amount |
| `inputColorCycles` | Color cycling period |
| `inputOpacity` | Overall opacity multiplier |

#### Oscillator Parameters

| Parameter | Description |
|-----------|-------------|
| `inputMode` | Oscillation mode (wave, bounce, noise) |
| `inputAxis` | Displacement axis (X, Y, Z, XY, XZ, YZ, XYZ) |
| `inputDirection` | Wave direction |
| `inputAmplitude` | Wave amplitude |
| `inputPeriod` | Wave period |
| `inputPhase` | Wave phase offset |
| `inputDamping` | Amplitude damping over distance |
| `inputShouldBounce` | Enable bounce mode |
| `inputLoopNoise` | Loop noise for seamless animation |

#### Selection (Falloff) Parameters

| Parameter | Description |
|-----------|-------------|
| `inputFalloffType` | Plane, Box, or Sphere |
| `inputFalloffSize` | Falloff region size |
| `inputFalloffSoftness` | Edge softness |
| `inputFalloffCenter` | Falloff center position |
| `inputInvert` | Invert selection |

#### DistanceConnections Parameters

| Parameter | Description |
|-----------|-------------|
| `inputMaxDistance` | Maximum connection distance |
| `inputDistanceType` | Distance metric type |
| Uses spatial hashing | Sub-box partitioning for O(n) neighbor queries instead of O(n^2) |

### 9.5 Plugin Count Summary

| Category | Count |
|----------|-------|
| Yanobox nodes (3D/text/utility) | 99 |
| Other 3D/Metal nodes | 37 |
| General utility/2D/math/etc. | 202 |
| **Total plugin nodes** | **338** |
| **Total port definitions** | **1,647** |
| **Total localization keys (PlugIns.strings)** | **3,317** |

---

## 10. Yanobox Product Line Context

### 10.1 Background: Yanobox and Noise Industries

FxCore.framework is the rendering engine behind **FxFactory**, a plugin platform by **Noise Industries** (developer username `gds` visible in source paths at `/Users/gds/Noise Industries/Development/FxCore/`). Yanobox was originally an independent motion graphics company that created plugins for Final Cut Pro, Motion, After Effects, and Premiere Pro. Noise Industries acquired or deeply integrated Yanobox's technology into FxCore, making it the 3D/motion graphics backbone of FxFactory.

### 10.2 Yanobox Product Lineup

Based on the binary analysis, the following Yanobox products are identifiable through code references:

| Product | Evidence in Binary | Primary FxCore Nodes Used |
|---------|-------------------|--------------------------|
| **Yanobox Nodes 3** | `Nodes` prefix on all geometry/modifier/renderer classes, `kFxCoreCategoryYanobox` category, `YanoNodes_*` Metal compute functions | Grid, Sphere, Spiral, SineCurve, Random, Circle, RegularPolygon, Hub, Replicator, Oscillator, Colorizer, Completion, Scaling, Selection, Projection, ApplyNoise, GlobalRenderer, 3DRenderer, 3DRendererMax, LinesRenderer, CurvedTubes, CalloutLines, DistanceConnections, all Connections nodes, BoundingBox, JoinGeometry, DepthSorting |
| **Yanobox Motype 2** | `FxCorePlugInYanoboxMotypeCommonControls` class, `YanoMotypeSymmetry` enum, `descriptionForMotionBlurMode:`, `descriptionForScaleOrigin:`, `descriptionForTimmingChronology:`, Motype source paths in Rendering/ | TextRenderer, TextParticles, TrailingText, AnimationPathsRenderer, MotypeCommonControls, SwipeText, SwipeTextGeometry, StyledTextInfos, StyledTextParagraphInfos, StyledTextAtlas, TextToQuads, Extruder, DigitRenderer, LinguisticTagger |
| **Yanobox Moods** | StyledText pipeline classes, `EmbeddingExplorer`, `LinguisticTagger` (NLP-driven coloring), particle/trail text effects | StyledTextInfos, StyledTextParagraphInfos, EmbeddingExplorer, LinguisticTagger, TextParticles (particle opacity/size fade modes), TrailingText (motion blur/painting modes) |

**Note:** Yanobox Storm and Yanobox Mosaic do not have explicit named references in FxCore 9.0.2. They may be implemented as composition-level presets (.fxcore files) that wire together the existing Nodes/Motype primitives, or they may be distributed as separate bundles outside FxCore.framework.

### 10.3 How the Engine Maps to Products

The FxCore architecture is a **shared engine** model:

```
┌─────────────────────────────────────────────────────────────┐
│                   FxFactory Application                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              FxCore.framework (Shared Engine)            │  │
│  │                                                         │  │
│  │  338 Plugin Nodes    50+ Metal Shaders    Core Data     │  │
│  │  29 Categories       CIKernels.metallib   Persistence   │  │
│  │                                                         │  │
│  │  ┌─────────────────┐ ┌────────────────┐ ┌───────────┐  │  │
│  │  │ "Nodes" Engine  │ │ "Motype" Engine│ │ 2D/CI     │  │  │
│  │  │ (~45 classes)   │ │ (~25 classes)  │ │ Pipeline  │  │  │
│  │  │ Geometry+       │ │ Text anim+     │ │ (~200     │  │  │
│  │  │ Modifier+       │ │ Extrusion+     │ │  nodes)   │  │  │
│  │  │ Renderer        │ │ Particles      │ │           │  │  │
│  │  └─────────────────┘ └────────────────┘ └───────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────┐                           │
│  │    .fxcore Compositions       │  ← Product presets        │
│  │    (Core Data documents)      │    wired from nodes       │
│  │    Nodes 3 / Motype 2 /      │                           │
│  │    Storm / Mosaic / Moods     │                           │
│  └───────────────────────────────┘                           │
│                                                              │
│  Host Integration:                                           │
│  • Final Cut Pro (FxPlug API)                                │
│  • Apple Motion (FxPlug API)                                 │
│  • After Effects (AE matrix converter, camera bridge)        │
│  • Premiere Pro                                              │
└─────────────────────────────────────────────────────────────┘
```

### 10.4 Capabilities Exposed Through FxCore

**Everything is in the shared framework.** There is no code-level gating visible in the binary between "free" and "paid" nodes. The licensing/product boundary is managed at the FxFactory application level, not within FxCore itself. All 338 nodes, all Metal shaders, and the complete 3D pipeline are compiled into every copy of FxCore.framework shipped with FxFactory.

This means:
- **Nodes 3** capabilities (3D geometry generation, instancing, shading, connections) are all present in FxCore
- **Motype 2** capabilities (text animation, extrusion, particles, trails) are all present in FxCore
- **FxFactory Pro** nodes (LightEmitter, LightLeaks, SpotLights, CameraShake, ChannelGeometry) are Swift classes also compiled into FxCore
- The **composition files** (.fxcore) are what define specific product presets, stored as Core Data documents using the 9-entity schema
- Product licensing is enforced at the FxFactory store/application layer (watermarking, trial mode, purchase validation)

### 10.5 Key Technical Differentiators

| Capability | Technical Implementation |
|-----------|------------------------|
| **Compute-first 3D** | All geometry generated/transformed in Metal compute kernels before rendering |
| **Text-centric 3D** | Deep text pipeline: CoreText → font atlas → GPU quads → extrusion → particles → trails |
| **Custom shading** | SH L2 ambient + Phong + Fresnel + SSAO + Bloom + Fog (not standard PBR) |
| **PBR for imports** | 3DRenderer path supports baseColor/normal/roughness/metallic/opacity textures for imported models |
| **Spatial algorithms** | GPU spatial hashing for O(n) distance-based connections |
| **MetalFX upscaling** | Hardware upscaling for performance on complex scenes |
| **NLP text effects** | Linguistic tagger for grammar-aware text coloring (adjective, noun, verb) |
| **Word embeddings** | EmbeddingExplorer for semantic text analysis |
| **After Effects bridge** | Full AE camera matrix conversion, projection interop |
| **OkLab color science** | Perceptual color blending in CI kernels (dissolves, fades, blends) |
| **Core Data persistence** | Full composition serialization with secure coding (NSSecureCoding) |

### 10.6 Developer Identification

The binary was compiled by developer `gds` at Noise Industries:
- Build path: `/Users/gds/Noise Industries/Development/FxCore/Framework/`
- Plugin paths: `Plug-Ins/Yanobox/Nodes/`, `Plug-Ins/Yanobox/Rendering/`, `Plug-Ins/Yanobox/Styled Text/`, `Plug-Ins/Yanobox/Linear Algebra/`, `Plug-Ins/Yanobox/Environment/`, `Plug-Ins/Yanobox/Geometry/`
- Metal compiler: `metalfe-32023.883` (Apple Metal AIR v25)
- Target: macOS 13.5+, Universal Binary (x86_64 + arm64)

---

## Appendix A: File Manifest

| File | Size | Content |
|------|------|---------|
| `FxCore` (binary) | 19 MB | Universal Mach-O, 4,117 3D-related symbols |
| `default.metallib` | 1.7 MB | ~50+ Metal shader functions, 6,976 string entries |
| `CIKernels.metallib` | 184 KB | 20 Core Image kernels |
| `PlugIns.strings` | 607 KB | 338 plugins, 3,317 localization keys |
| `Ports.strings` | 233 KB | 1,647 port definitions |
| `Categories.strings` | 10 KB | 29 categories |
| `FxCorePersistentDocument.momd` | ~4 KB | 9 Core Data entities |
