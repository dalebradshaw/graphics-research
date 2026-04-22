# FxCore Potential ML Models Summary

Date: 2026-04-21
Workspace: `/Users/dalebradshaw/graphics_research`

## Context

We now have two important constraints from live FxCore testing:

1. FxCore's `Model Importer` can surface more than image outputs. We verified:
   - image input -> `MLMultiArray` output
   - image input -> dictionary output
   - image input -> string output
2. FxCore does **not** regenerate ports automatically from a changed `inputURL`. A viable workflow is:
   - seed a blank importer document
   - reopen in FxCore
   - re-import the model in Settings
   - save to a fresh path

That means the best plugin candidates are not just image-to-image models. However, the easiest wins still come from models with simple I/O and minimal post-processing.

## What FxCore Already Covers Natively

From local inspection, FxCore already ships built-in nodes for:

- foreground/person masks
- contours
- face detection and face features
- human body pose / 3D pose
- optical flow
- saliency
- language model access to Apple's on-device model

So the best plugin targets are the things FxCore does **not** already cover well:

- better background matting
- depth
- semantic segmentation beyond person masks
- object detection / open-vocabulary segmentation
- restoration / upscaling
- audio transcription / captions
- shot tagging / OCR / scene understanding

## Ranked Shortlist

## Tier 1: Best Near-Term Plugin Targets

These have the best ratio of usefulness to implementation risk.

### 1. Background Removal / Matte

Top candidates:

- **BiRefNet**
- **BRIA RMBG 2.0**

Why they matter:

- direct value for cutouts, alpha generation, promo graphics, compositing, thumbnails, product renders
- strong fit for graphics and motion workflows
- output is naturally a grayscale matte, which maps well to FxCore

Why they fit:

- image in -> matte image out
- good importer fit or simple dedicated plugin fit
- much better target than duplicating FxCore's built-in person mask node

Caveats:

- BRIA RMBG 2.0 is source-available / non-commercial by default; commercial use requires a license
- BiRefNet is MIT-licensed and more attractive for open integration

Recommendation:

- **Start with BiRefNet if you want the cleanest open path**
- **Use BRIA RMBG 2.0 if licensed commercial-quality matte is the goal**

### 2. Monocular Depth

Top candidates:

- **Depth Anything V2**
- **Apple Depth Pro**

Why they matter:

- depth maps are useful for relighting, fake parallax, fog/DOF modulation, 2.5D camera moves, spatial photo/video experiments, edge-aware masks

Why they fit:

- image in -> depth image or dense map out
- very strong fit for our tested importer surface

Important distinction:

- **Depth Anything V2** already exists in Apple's Core ML model gallery and we already have a working `DepthAnything.fxcore` sample in local research
- **Depth Pro** is compelling because it predicts metric depth and emphasizes sharp boundaries, but it is not as ready-made for FxCore as Depth Anything today

Recommendation:

- **Ship with Depth Anything V2 first**
- **Evaluate Depth Pro as a second-generation upgrade path**

### 3. Semantic Segmentation

Top candidates:

- **DETR ResNet50 Semantic Segmentation** from Apple's Core ML gallery
- custom semantic segmentation models after that

Why they matter:

- scene parsing is useful for selective stylization, sky isolation, road/ground/horizon separation, environment-aware grading, automated masks

Why they fit:

- Apple already provides this in Core ML format
- good first test for multi-class masks inside FxCore

Recommendation:

- **Strong candidate for a low-friction first plugin or importer experiment**

### 4. Object Detection

Top candidates:

- **YOLO11 / YOLO26 Core ML export**
- **DETR-style detection**

Why they matter:

- automatic callouts, tracking targets, sticker placement, inventory/product detection, template matching at scale

Why they fit less cleanly than depth/mattes:

- output is tensors, boxes, masks, and post-processing logic
- importer can expose the tensors, but a dedicated plugin would make it actually usable

Recommendation:

- **Worth building as a custom plugin, not as a bare importer composition**

## Tier 2: High-Value But Better As Custom Plugins

These are useful, but the plugin should own UI, prompting, and post-processing rather than relying only on `Model Importer`.

### 5. Promptable Segmentation / Tracking

Top candidates:

- **SAM 2 CoreML**
- **SAM3 MLX**
- **EdgeSAM**

Why they matter:

- object-directed cutouts
- open-vocabulary masking
- region prompts
- video tracking workflows

Why they are strong:

- SAM2 CoreML already exists and is optimized for Apple hardware
- SAM3 in MLX adds text prompts and video tracking on Apple Silicon
- EdgeSAM is explicitly designed for on-device deployment and speed

Why they are not "importer first":

- the real value comes from prompts, multi-stage inference, and tracking state
- that wants plugin-owned UI for points, boxes, and text prompts

Recommendation:

- **Best candidate for a flagship custom ML plugin**
- especially attractive if the plugin goal is "smart masking" rather than generic model hosting

### 6. Speech-to-Text / Captions

Top candidates:

- **Whisper**
- **MLX Whisper**

Why they matter:

- subtitle generation
- transcript search
- auto-caption overlays
- edit indexing
- marker generation from speech

Why they do not map to `Model Importer`:

- audio input is not the same as image input inside the current FxCore graph shape
- timestamped text output wants timeline semantics, not just node outputs

Recommendation:

- **Very strong plugin target if the goal includes editorial tooling**
- better as a host/plugin feature than a Machine Learning shelf importer node

### 7. Vision-Language Tagging / OCR / Captioning

Top candidates:

- **Florence-2**
- **MLX-VLM** with small Qwen2-VL / similar models

Why they matter:

- shot descriptions
- OCR
- region captions
- searchable scene metadata
- content tagging for asset libraries

Why they are harder:

- prompt-based multi-task models
- text generation loops
- often need nontrivial decoding logic and output parsing

Recommendation:

- **Good candidate for a metadata plugin**
- not the best first graphics plugin unless tagging/search is a major product goal

## Tier 3: Useful, But Lower Priority For First Plugin

### 8. Super-Resolution / Restoration

Top candidate:

- **Real-ESRGAN**

Why it matters:

- upscale low-resolution assets
- improve textures and source stills
- rescue archives, screenshots, logos, scanned elements

Why it is lower priority:

- excellent utility, but less differentiating than depth or smart masks
- may need tiling and memory management for high-resolution work

Recommendation:

- **Worth building later as a restoration node**
- especially good if the plugin grows into a utility pack

### 9. General Classification / Shot Tagging

Top candidates:

- **FastViT**
- other headless image classifiers from Apple's model gallery

Why it matters:

- classify scenes, styles, content categories, art direction buckets

Why it is lower priority:

- less visually immediate
- more useful as metadata than as a graphics effect

Recommendation:

- **Add only if asset search, organization, or triage is part of the product**

## Best Starting Shapes

Given the current FxCore boundary, the smartest first implementations are:

### A. Importer-first experiments

Use plain Core ML artifacts and validate the graph surface:

1. **Depth Anything V2**
2. **Apple DETR semantic segmentation**
3. **FastViT / simple classifier**

These are good because they are already in Core ML form or close to it, and they probe:

- image output
- segmentation output
- classifier output

### B. First dedicated plugin

If the goal is one bespoke plugin rather than a generic model host:

1. **BiRefNet / RMBG matte plugin**
2. **Depth plugin** with Depth Anything V2 first, Depth Pro later
3. **SAM plugin** if interactivity matters more than simplicity

My ranking:

1. **Matte plugin**
2. **Depth plugin**
3. **Promptable SAM plugin**

## MLX-Specific Read

If you specifically want an **MLX-native** plugin, the most plausible model families are:

- **SAM3 MLX** for interactive segmentation / tracking
- **Whisper via MLX** for transcription and subtitles
- **small VLMs via MLX-VLM** for captioning, OCR, tagging

Those are attractive because they are already adapted for Apple Silicon and avoid some conversion work.

But for **FxCore Machine Learning section** integration, MLX is still the more awkward path. Our live findings point to Core ML as the natural contract for the shelf itself.

So the split is:

- **Core ML** for importer/shelf integration
- **MLX** for custom runtime plugins where prompts, streaming, audio, or multi-stage control matter

## Practical Recommendation

If the goal is a single focused plugin with the highest likelihood of producing useful graphics output quickly:

### Recommendation 1

**Foreground Matte Plugin**

- primary model: **BiRefNet**
- commercial alternative: **BRIA RMBG 2.0**
- outputs: alpha matte, cutout image, soft mask, edge confidence

### Recommendation 2

**Depth Plugin**

- primary model: **Depth Anything V2**
- future upgrade candidate: **Depth Pro**
- outputs: depth map, normalized depth, edge-preserving mask helpers

### Recommendation 3

**Promptable Segmentation Plugin**

- primary model: **SAM2 CoreML** or **SAM3 MLX**
- outputs: masks, boxes, tracked masks over time
- only choose this first if prompt interaction is the main product idea

## Sources

- Apple Core ML model gallery: [Models - Machine Learning - Apple Developer](https://developer.apple.com/machine-learning/models/)
- Ultralytics export docs: [Model Export with Ultralytics YOLO](https://docs.ultralytics.com/modes/export/)
- Depth Anything V2 official repo: [DepthAnything/Depth-Anything-V2](https://github.com/DepthAnything/Depth-Anything-V2)
- Apple Depth Pro official repo: [apple/ml-depth-pro](https://github.com/apple/ml-depth-pro)
- BiRefNet official repo: [ZhengPeng7/BiRefNet](https://github.com/ZhengPeng7/BiRefNet)
- BRIA RMBG 2.0 official repo: [Bria-AI/RMBG-2.0](https://github.com/Bria-AI/RMBG-2.0)
- SAM 2 CoreML repo: [alexhaugland/segment-anything-2-coreml](https://github.com/alexhaugland/segment-anything-2-coreml)
- EdgeSAM official repo: [chongzhou96/EdgeSAM](https://github.com/chongzhou96/EdgeSAM)
- MLX SAM3 model card: [mlx-community/sam3-image](https://huggingface.co/mlx-community/sam3-image)
- MLX SAM3 quantized/video tracking card: [mlx-community/sam3-6bit](https://huggingface.co/mlx-community/sam3-6bit)
- MLX Whisper docs: [mlx-examples whisper README](https://github.com/ml-explore/mlx-examples/blob/main/whisper/README.md)
- OpenAI Whisper repo: [openai/whisper](https://github.com/openai/whisper)
- Florence-2 model card: [microsoft/Florence-2-large](https://huggingface.co/microsoft/Florence-2-large)
- MLX-VLM repo: [Blaizzy/mlx-vlm](https://github.com/Blaizzy/mlx-vlm)
- Real-ESRGAN official repo: [xinntao/real-esrgan](https://github.com/xinntao/real-esrgan)
