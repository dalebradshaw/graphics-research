# FxCore Machine Learning Deep Dive

Date: 2026-04-21
Workspace: `/Users/dalebradshaw/graphics_research`

## Scope

Investigate how FxCore's **Machine Learning** section is implemented and determine whether a user-supplied **MLX** model could be brought into that section as a practical workflow.

## Executive Read

FxCore's Machine Learning shelf is not a generic third-party ML runtime. It is a set of built-in nodes implemented inside `FxCore.framework` that wrap:

- **Apple Vision** requests for detection / segmentation / saliency / optical flow / pose
- **Core ML** model loading and execution
- **Apple on-device language model** APIs for the Language Model node

The practical extension point for user models is the **Model Importer** node, which imports a **Core ML** model and synthesizes ports from the model's input/output schema.

There is **no evidence** that FxCore natively embeds an **MLX** runtime or can directly execute an MLX model package. The realistic route is:

1. author or fine-tune in MLX
2. convert/export to **Core ML** (`.mlmodel` / `.mlpackage`)
3. load through **Model Importer**

If the goal is a first-class custom Machine Learning node authored directly inside FxCore, I found no evidence of a public plugin API for adding new ML shelf nodes from userland. The discovered node classes appear to be compiled into `FxCore.framework`.

## Evidence

### 1. Framework linkage

`FxCore.framework` links the expected Apple ML frameworks:

- `CoreML.framework`
- `Vision.framework`
- `NaturalLanguage.framework`
- weak `FoundationModels.framework`
- `Accelerate.framework`

This matches the visible node set:

- detection and segmentation nodes -> Vision
- model import / execution -> Core ML
- language model -> Foundation Models / Apple Intelligence path

### 2. Discovered internal classes and symbols

Strings and exported symbols from `FxCore.framework` show built-in ML-related plugin classes and helpers:

- `FxCorePlugInMLModelImporter`
- `MLModelPlugIn`
- `LanguageModelPlugIn`
- `HumanBodyPosePlugIn`
- `HumanBodyPose3DPlugIn`
- `FxCorePlugInMLMultiArrayConverter`

Relevant strings include:

- `com.apple.coreml.mlpackage`
- `mlmodelc`
- `computeUnits`
- `allowLowPrecisionAccumulation`
- `outputMLModel`
- `setOutputMLModel:`
- `featureValueWithPixelBuffer:`
- `featureValueWithMultiArray:`
- `featureValueWithSequence:`
- `portValueWithFeatureValue:colorSpace:error:`
- `MLMultiArray`

This strongly suggests the ML path is built around `MLModel`, `MLFeatureValue`, image buffers, and multi-array conversion.

### 3. Vision request coverage is explicit

Framework strings reference concrete Vision requests:

- `VNDetectContoursRequest`
- `VNDetectFaceRectanglesRequest`
- `VNDetectFaceLandmarksRequest`
- `VNDetectRectanglesRequest`
- `VNDetectDocumentSegmentationRequest`
- `VNGenerateOpticalFlowRequest`
- `VNTrackOpticalFlowRequest`
- `VNGenerateAttentionBasedSaliencyImageRequest`
- `VNGenerateObjectnessBasedSaliencyImageRequest`
- `VNDetectHumanBodyPoseRequest`
- `VNDetectHumanBodyPose3DRequest`
- person / foreground mask requests

That lines up directly with the visible Machine Learning node list.

### 4. Model Importer is a Core ML bridge

The live FxCore UI description for **Model Importer** states:

- it imports a **CoreML-compatible model**
- it expects model selection through the Settings panel
- it can reference the model on disk through an input URL
- it introspects the model so the node can understand inputs/outputs
- it avoids embedding large models by referencing external files

Its settings expose:

- `Output`: `Predictions` or `Model`
- `Color space`
- model chooser
- `Computation`: `CPU, GPU and Neural Engine`
- `Prefer computation on the same device used by the composition`
- `Allow low precision accumulation on the GPU, where available`

This is a direct UI surface over Core ML loading / execution policy.

### 5. Sample composition confirms external Core ML usage

`DepthAnything.fxcore` contains a `Model Importer` node with these key settings:

- `modelName = DepthAnythingSmallF16.mlpackage`
- `computeUnits = 2`
- `allowLowPrecisionAccumulation = False`
- `computeOnSameDeviceAsRuntime = False`
- input URL pointing to an external `.mlpackage`

The serialized port metadata shows the importer synthesized:

- image input port
- resampling filter port
- depth output port

That confirms the importer is inspecting model I/O and projecting it into FxCore node ports.

### 6. Language Model is not a generic BYO LLM hook

The live UI description for **Language Model** says it interacts with the on-device language model available with newer macOS releases. Its settings expose:

- use case
- sampling mode
- temperature / max token customization
- caching
- status / message reporting
- synchronous execution

Observed status strings include availability states consistent with Apple Intelligence / Foundation Models readiness. This does **not** look like a generic model-loader node for arbitrary local LLM runtimes.

## What The Machine Learning Shelf Actually Is

FxCore's ML section appears to divide into three groups:

### A. Vision wrappers

These nodes likely convert FxCore image inputs into `CIImage` / `CVPixelBuffer` equivalents, run a Vision request, then project results back into FxCore port types.

Examples:

- Contours
- Face Detection
- Face Features
- Human Body Pose
- Human Body Pose 3D
- Optical Flow
- Quadrilateral Detection
- Saliency
- Extract Mask variants

### B. Core ML importer / executor

This is the user-supplied model path:

- **Model Importer** loads and introspects a Core ML model
- hidden/internal `MLModelPlugIn` suggests there is a lower-level executor path
- `FxCorePlugInMLMultiArrayConverter` suggests FxCore has internal glue for turning Core ML tensor outputs into usable graph values

### C. Apple language-model integration

`LanguageModelPlugIn` appears to target Apple's system language model APIs, not arbitrary external runtimes.

## Can MLX Be Used Here?

## Short answer

**Not directly as MLX.**

I found no evidence that FxCore includes:

- an MLX runtime
- Python embedding for model execution
- a generic custom inference node that could load MLX weights
- a public mechanism to register a new Machine Learning shelf node implemented outside FxCore.framework

## Practical answer

**Yes, if the MLX model can be converted to Core ML.**

FxCore's import surface clearly expects:

- `.mlmodel`
- `.mlpackage`
- compiled `mlmodelc`

So the usable path is:

1. train / adapt / run experiments in MLX
2. export or convert to Core ML
3. load that model with **Model Importer**
4. wire image / tensor outputs into the graph

## What counts as "bringing in my own model"

There are two materially different goals:

### Goal 1: Use your own model inside FxCore

This looks feasible today if you can express the model as Core ML with supported feature types:

- image input / output
- `MLMultiArray`
- scalar / dictionary / sequence cases, depending on what FxCore exposes

This is the path already demonstrated by `DepthAnything.fxcore`.

### Goal 2: Create a brand-new FxCore ML plugin backed by MLX

This looks unlikely from within FxCore alone.

What I found suggests FxCore ML nodes are built-in plugin classes, not graph-authored nodes with arbitrary runtime code execution. I did not find evidence of:

- a documented public SDK for registering new Machine Learning shelf nodes
- a scripting runtime for custom inference inside FxCore
- a node-authoring API that could host MLX directly

That does not make it impossible at the host-platform level, but it does make it unlikely as a purely FxCore-native workflow.

## Likely Data Model For Imported Models

Based on the importer UI, symbols, and serialized sample composition, the probable execution model is:

1. user selects a Core ML model in the settings panel
2. FxCore reads `MLModelDescription`
3. FxCore synthesizes graph ports from feature descriptions
4. a model file URL is supplied at runtime
5. the model is lazily compiled / loaded
6. inputs are converted to `MLFeatureValue`
7. prediction runs under chosen compute units
8. outputs are converted back into FxCore port values

The presence of `featureValueWithPixelBuffer`, `featureValueWithMultiArray`, and `portValueWithFeatureValue` strongly supports this interpretation.

## Constraints For An MLX -> FxCore Pipeline

If the model originates in MLX, the main constraints are not FxCore-specific. They are conversion constraints:

- can the architecture be exported to Core ML at all
- are operators supported
- are dynamic shapes acceptable
- does the output type map cleanly to something FxCore exposes
- does precision / quantization survive conversion

The safest candidates are models with simple image-in / image-out or image-in / single-multiarray-out behavior.

Riskier candidates include:

- models requiring unsupported custom ops
- models expecting token-by-token generation loops managed in user code
- models with complex postprocessing that FxCore does not expose as ports

## Best Near-Term Experiments

### 1. Probe the importer with tiny known-good Core ML models

Use a sequence of minimal models to map exactly what FxCore exposes:

- image -> image
- image -> multi-array
- multi-array -> multi-array
- image -> dictionary / labels

This will tell us which Core ML feature types survive the importer cleanly.

### 2. Test an MLX-derived model only after conversion

Do not start by trying to get MLX "into" FxCore directly. Start with a converted Core ML artifact and verify:

- does it import
- what ports get synthesized
- do outputs appear as images, arrays, or opaque predictions

### 3. Look for the multi-array bridge in the public node list

Because `FxCorePlugInMLMultiArrayConverter` exists internally, there may be a visible node elsewhere in FxCore for converting tensor outputs into graph-friendly forms. If it is hidden, that limits what non-image models are practical.

### 4. Prefer models whose outputs are already visually meaningful

For first success, target:

- segmentation masks
- depth maps
- heatmaps
- image enhancement / stylization

Those are easier to validate than abstract embeddings or sequence models.

## Practical Verdict

### Feasible now

- Bring your own **Core ML** model into FxCore with **Model Importer**
- Use externally referenced `.mlpackage` assets
- Exercise Apple accelerators through compute-unit settings
- Likely handle image and some tensor workflows

### Feasible with conversion

- Develop in **MLX**, then convert to **Core ML**, then run in FxCore

### Not supported by current evidence

- Native execution of raw **MLX** models inside FxCore
- Authoring a brand-new Machine Learning node in FxCore backed directly by an MLX runtime
- Using the **Language Model** node as a generic loader for arbitrary local models

## Recommended Next Step

Build a controlled test matrix around **Model Importer**:

1. tiny image-to-image Core ML model
2. tiny image-to-multiarray Core ML model
3. one converted MLX model
4. inspect resulting `.fxcore` graph serialization after configuration

That will answer the only question that matters operationally: what Core ML feature surface FxCore actually exposes to the graph.

## Related Local Artifacts

- `/Users/dalebradshaw/graphics_research/fxcore-yanobox-3d-engine-report.md`
- `/Users/dalebradshaw/graphics_research/artifacts/fxcore/sample-plugins-inspection.md`
- `/Users/dalebradshaw/graphics_research/artifacts/fxcore/sample-plugins-inspection.json`
