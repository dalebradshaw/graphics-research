# FxCore Inspection

Inspected 17 compositions.

## Summary

| Composition | Role | Nodes | Edges | Root | Notable Nodes | Host Safety | Highlights |
|---|---:|---:|---:|---|---|---|---|
| Apps in Space.fxcore | data-driven 3D sprites | 44 | 57 | `FxCorePlugIn3DRenderToTexture` | FxCorePlugIn3DRenderToTexture, DirectoryScannerPlugIn, FxCorePlugIn3DSprite, FxCorePlugInIteratorVariables, FinderIconPlugIn, FxCorePlugInIterator | review | url: file:///Applications/; expression: lerp(0, 10, -2 * z); expression: lerp(0, -1, -2 * z); expression: lerp(-1.2, 1.2, y) |
| Baseline Anchored Text.fxcore | anchored text layout | 8 | 8 | `FxCorePlugInCIContainer` |  | review | text: 1 Infinite Loop |
| Composite Stack Accumulator.fxcore | iterator accumulation | 15 | 12 | `FxCorePlugInCIContainer` | FxCorePlugInIterator, AVCaptureDevicePlugIn, FxCorePlugInIteratorVariables | review | expression: centerX + randomDeltaX; expression: centerY + randomDeltaY |
| DepthAnything.fxcore | CoreML depth mask | 11 | 8 | `FxCorePlugInCIContainer` | FxCorePlugInMLModelImporter, AVCaptureDevicePlugIn | review | model: DepthAnythingSmallF16.mlpackage; model: file:///Users/gds/Desktop/ML/DepthAnythingSmallF16P8.mlpackage/; model: image; model: Image |
| Directory Scanner.fxcore | filesystem image scan | 14 | 13 | `FxCorePlugIn3DRenderToTexture` | FxCorePlugIn3DRenderToTexture, DirectoryScannerPlugIn | review | url: file:///System/Library/Desktop%20Pictures/hello%20Grey.heic; url: file:///System/Library/Desktop%20Pictures/; url: file:///System/Library/Desktop%20Pictures/hello%20Blue; expression: floor(time / 3) |
| Eagly.fxcore | animated image source | 4 | 2 | `FxCorePlugInCIContainer` | CGImageSourcePlugIn | review |  |
| Events.fxcore | standalone mouse/keyboard input | 7 | 18 | `FxCorePlugInCIContainer` | FxCorePlugInMouseInfo, FxCorePlugInKeyboardInfo | standalone-only | format: Mouse x%@ y%@ Window %@ x %@ points Left button %@ Left drag ...; text: 0; text: 360; text: 640 |
| Feedback.fxcore | standalone temporal feedback | 4 | 3 | `FxCorePlugIn3DRenderToTexture` | FxCorePlugIn3DRenderToTexture, FxCorePlugInCIKernel, AVCaptureDevicePlugIn | standalone-only | kernel: kernel vec4 myFilter(__sample image, __sample previousImage) ...; kernel: myFilter |
| Fire.fxcore | GLSL to Core Image shader | 7 | 3 | `FxCorePlugInCIContainer` | FxCorePlugInCIShader | review | kernel: // Original shader: https://fragcoord.xyz/s/3zoe0vgo // Copyr...; kernel: fireKernel; kernel: #include <metal_stdlib> #include <CoreImage/CoreImage.h> usin... |
| Human.fxcore | Vision body pose | 19 | 16 | `FxCorePlugIn3DRenderToTexture` | FxCorePlugIn3DRenderToTexture, FxCorePlugInIterator, HumanBodyPosePlugIn, FxCorePlugInIteratorVariables, HumanBodyJointsPlugIn | review |  |
| Inferno.fxcore | styled text animation | 13 | 16 | `FxCorePlugInCIContainer` |  | review | expression: max(width, height)/3; text: Nel mezzo del cammin di nostra vita mi ritrovai per una selva...; text: Baskerville-Italic; text: 1 1 1 |
| Interpolation.fxcore | timed interpolation | 8 | 7 | `FxCorePlugIn3DRenderToTexture` | FxCorePlugIn3DRenderToTexture | review | expression: a + a*b; expression: a + a * b |
| Iterator 2.fxcore | iterated camera feedback | 13 | 15 | `FxCorePlugInCIContainer` | FxCorePlugInIterator, AVCaptureDevicePlugIn, FxCorePlugInIteratorVariables, FxCorePlugInCIKernel | review | kernel: myFilter; kernel: kernel vec4 myFilter(__sample image) { return image * 0.9; }; expression: 1.0 - 0.9 / iterations; expression: 30 / iterations |
| Iterator.fxcore | iterator text repetition | 10 | 13 | `FxCorePlugIn3DRenderToTexture` | FxCorePlugIn3DRenderToTexture, FxCorePlugIn3DSprite, FxCorePlugInIteratorVariables | review | expression: a + b; text: 99 |
| Pac-Man.fxcore | procedural CI chain | 9 | 14 | `FxCorePlugIn3DRenderToTexture` | FxCorePlugIn3DRenderToTexture | review |  |
| Spaghetti Poetry.fxcore | language model text graphics | 20 | 31 | `FxCorePlugInCIContainer` | LanguageModelPlugIn | review | prompt: Write a poem to the Flying Spaghetti Monster; expression: max(width, height)/5; expression: width * 0.8; expression: (status == 0) * time |
| Sprite.fxcore | nested render-to-texture | 10 | 8 | `FxCorePlugIn3DRenderToTexture` | FxCorePlugIn3DRenderToTexture, FxCorePlugIn3DSprite | review |  |

## Apps in Space.fxcore

- Path: `/Users/dalebradshaw/Documents/fxcore/sample_plugins/Apps in Space.fxcore`
- Size: 184,320 bytes
- Role: data-driven 3D sprites
- Nodes: 44
- Connections: 57
- Root: `com.fxfactory.FxCore.FxCorePlugIn3DRenderToTexture`
- Notable nodes: FxCorePlugIn3DRenderToTexture, DirectoryScannerPlugIn, FxCorePlugIn3DSprite, FxCorePlugInIteratorVariables, FinderIconPlugIn, FxCorePlugInIterator

### Nodes

| Title | Identifier | Parent |
|---|---|---|
| Root | `com.fxfactory.FxCore.FxCorePlugIn3DRenderToTexture` |  |
| Scan | `com.fxfactory.FxCore.DirectoryScannerPlugIn` | 7 |
| 2D | `com.fxfactory.FxCore.FxCorePlugInCIBillboard` | 7 |
| Wave | `com.fxfactory.FxCore.FxCorePlugInWaveGenerator` | 7 |
| Wave | `com.fxfactory.FxCore.FxCorePlugInWaveGenerator` | 7 |
| Sunbeams | `com.fxfactory.FxCore.FxCorePlugInCISunbeamsGenerator` | 7 |
| Transformation | `com.fxfactory.FxCore.FxCorePlugIn3DTransform` | 7 |
| Time | `com.fxfactory.FxCore.FxCorePlugInLocalTime` | 7 |
| Output | `com.fxfactory.FxCore.FxCorePlugInOutputInfo` | 7 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 7 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 7 |
| Split | `com.fxfactory.FxCore.FxCorePlugInSplitter` | 7 |
| Threshold | `com.fxfactory.FxCore.FxCorePlugInNIThresholdWithColors` | 7 |
| Noise (Perlin) | `com.fxfactory.FxCore.FxCorePlugInNIPerlinNoise` | 7 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 7 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 7 |
| Transform | `com.fxfactory.FxCore.FxCorePlugInNIAffineTransformUnit` | 7 |
| Wave | `com.fxfactory.FxCore.FxCorePlugInWaveGenerator` | 7 |
| Wave | `com.fxfactory.FxCore.FxCorePlugInWaveGenerator` | 7 |
| Sprite | `com.fxfactory.FxCore.FxCorePlugIn3DSprite` | 49 |
| Random | `com.fxfactory.FxCore.FxCorePlugInRandomValueGenerator` | 49 |
| Iterator Variables | `com.fxfactory.FxCore.FxCorePlugInIteratorVariables` | 49 |
| Time | `com.fxfactory.FxCore.FxCorePlugInLocalTime` | 49 |
| Index → Value | `com.fxfactory.FxCore.FxCorePlugInArrayValueAtIndex` | 49 |
| Icon | `com.fxfactory.FxCore.FinderIconPlugIn` | 49 |
| Count | `com.fxfactory.FxCore.FxCorePlugInValuesCount` | 49 |
| Split | `com.fxfactory.FxCore.FxCorePlugInSplitter` | 49 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 49 |
| Output | `com.fxfactory.FxCore.FxCorePlugInOutputInfo` | 49 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 49 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 49 |
| Gaussian Blur | `com.fxfactory.FxCore.FxCorePlugInCIGaussianBlur` | 49 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 49 |
| Exposure | `com.fxfactory.FxCore.FxCorePlugInCIExposureAdjust` | 49 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 49 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 49 |
| Color Over Source | `com.fxfactory.FxCore.FxCorePlugInNIColorOver` | 49 |
| Alpha | `com.fxfactory.FxCore.ColorChangeAlphaPlugIn` | 49 |
| Transform | `com.fxfactory.FxCore.FxCorePlugInNIAffineTransformUnit` | 49 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 49 |
| Motion Blur | `com.fxfactory.FxCore.FxCorePlugInCIMotionBlur` | 49 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 49 |
| Container | `com.fxfactory.FxCore.FxCorePlugInIterator` | 56 |
| Split | `com.fxfactory.FxCore.FxCorePlugInSplitter` | 56 |

### Decoded Values

- `expression` `nodeKeyValue` Expression / `candidateString`: lerp(0, 10, -2 * z)
- `expression` `nodeKeyValue` Expression / `expressionString`: lerp(0, -1, -2 * z)
- `expression` `nodeKeyValue` Expression / `candidateString`: lerp(-1.2, 1.2, y)
- `expression` `nodeKeyValue` Expression / `expressionString`: -w/h + abs(fract(x + time * speed * 0.2)) * 2 * w/h
- `expression` `nodeKeyValue` Expression / `candidateString`: lerp(-0.5, 0.5, z)
- `expression` `nodeKeyValue` Expression / `candidateString`: lerp(0, -1, -2 * z)
- `expression` `nodeKeyValue` Expression / `expressionString`: lerp(-0.5, 0.5, z)
- `expression` `nodeKeyValue` Expression / `expressionString`: lerp(-1.2, 1.2, y)
- `expression` `nodeKeyValue` Expression / `candidateString`: -w/h + abs(fract(x + time * speed * 0.2)) * 2 * w/h
- `expression` `nodeKeyValue` Expression / `expressionString`: lerp(0, 10, -2 * z)
- `expression` `nodeKeyValue` Expression / `expressionString`: diagonal
- `expression` `nodeKeyValue` Expression / `candidateString`: diagonal
- `expression` `nodeKeyValue` Expression / `candidateString`: diagonal * 0.1
- `expression` `nodeKeyValue` Expression / `expressionString`: diagonal * 0.1
- `expression` `nodeKeyValue` Expression / `expressionString`: time * 0.5
- `expression` `nodeKeyValue` Expression / `candidateString`: time * 0.5
- `expression` `nodeKeyValue` Expression / `expressionString`: (max(0.5, a) - 0.5) * 360 * time
- `expression` `nodeKeyValue` Expression / `candidateString`: (max(0.5, a) - 0.5) * 360 * time
- `expression` `nodeKeyValue` Expression / `expressionString`: time * 0.05
- `expression` `nodeKeyValue` Expression / `candidateString`: time * 0.05
- `expression` `nodeKeyValue` Expression / `candidateString`: diagonal * -0.1
- `expression` `nodeKeyValue` Expression / `expressionString`: diagonal * -0.1
- `expression` `nodeKeyValue` Expression / `expressionString`: speed * diagonal * 0.0005
- `expression` `nodeKeyValue` Expression / `candidateString`: speed * diagonal * 0.0005
- `url` `input` Scan / `inputURL`: file:///Applications/

### Connections

- Iterator Variables.Current Index -> Random.Time
- Output.Width -> Expression.W
- Iterator Variables.Current Index -> Index → Value.Index 0
- Random.? -> Expression.Y
- Split.? -> Index → Value.Array
- Split.? -> Count.Collection
- Expression.= -> Sprite.Position X
- Expression.= -> Sprite.Position Z
- Random.? -> Expression.Speed
- Expression.= -> Exposure.EV
- Index → Value.? -> Icon.URL
- Expression.= -> Expression.Z
- Exposure.Image -> Gaussian Blur.Image
- Time.Time -> Expression.Time
- Expression.= -> Gaussian Blur.Radius
- Expression.= -> Expression.Z
- Expression.= -> Sprite.Position Y
- Count.Count -> Icon.Cache Size
- Output.Height -> Expression.H
- Iterator Variables.Progress -> Expression.Z
- Random.? -> Expression.X
- Wave.Value -> Transformation.Rotation Y
- Wave.Value -> Transformation.Rotation X
- Output.Diagonal -> Expression.Diagonal
- Expression.= -> Sunbeams.Sun Radius
- Output.Diagonal -> Expression.Diagonal
- Expression.= -> Icon.Size
- Scan.URLs -> Transformation.Array
- Split.? -> Container.Array
- Time.Time -> Expression.Time
- Split.? -> Sunbeams.Color
- Alpha.Color -> Color Over Source.Color
- Color Over Source.Image -> Exposure.Image
- Transform.Image -> Color Over Source.Top
- Icon.Image -> Transform.Image
- Time.Time -> Expression.Time
- Expression.= -> Transform.Angle
- Random.? -> Expression.A
- Split.? -> Transformation.Blend Color
- Noise (Perlin).Image -> Threshold.Image
- Time.Time -> Expression.Time
- Expression.= -> Noise (Perlin).Seed
- Output.Diagonal -> Expression.Diagonal
- Expression.= -> Sunbeams.Center
- Sunbeams.Image -> Transform.Image
- Expression.= -> Transform.Origin
- Expression.= -> Transform.Angle
- Wave.Value -> Sunbeams.Striation Strength
- Random.? -> Expression.Speed
- Expression.= -> Motion Blur.Radius
- Motion Blur.Image -> Sprite.Image
- Gaussian Blur.Image -> Motion Blur.Image
- Output.Diagonal -> Expression.Diagonal
- Transform.Image -> 2D.Image
- Threshold.Image -> 2D.Image 2
- Split.? -> Container.Iterations
- Wave.Value -> Transformation.Rotation Z

## Baseline Anchored Text.fxcore

- Path: `/Users/dalebradshaw/Documents/fxcore/sample_plugins/Baseline Anchored Text.fxcore`
- Size: 143,360 bytes
- Role: anchored text layout
- Nodes: 8
- Connections: 8
- Root: `com.fxfactory.FxCore.FxCorePlugInCIContainer`

### Nodes

| Title | Identifier | Parent |
|---|---|---|
| Root | `com.fxfactory.FxCore.FxCorePlugInCIContainer` |  |
| 2D | `com.fxfactory.FxCore.FxCorePlugInCIBillboard` | 2 |
| Image With String | `com.fxfactory.FxCore.ImageWithStringPlugIn` | 2 |
| Rounded Rectangle (Fill) | `com.fxfactory.FxCore.FxCorePlugInCIRoundedRectangleGenerator` | 2 |
| Time | `com.fxfactory.FxCore.FxCorePlugInLocalTime` | 2 |
| Split | `com.fxfactory.FxCore.FxCorePlugInSplitter` | 2 |
| Circle | `com.fxfactory.FxCore.FxCorePlugInNISmoothCircle` | 2 |
| Time String | `com.fxfactory.FxCore.TimeStringPlugIn` | 2 |

### Decoded Values

- `text` `input` Image With String / `inputString`: 1 Infinite Loop

### Connections

- Rounded Rectangle (Fill).Image -> 2D.Image
- Image With String.Image -> 2D.Image 2
- Circle.Image -> 2D.Image 3
- Image With String.Extent -> Rounded Rectangle (Fill).Extent
- Split.? -> Circle.Center
- Split.? -> Image With String.Baseline
- Time.Time -> Time String.Time
- Time String.String -> Image With String.String

## Composite Stack Accumulator.fxcore

- Path: `/Users/dalebradshaw/Documents/fxcore/sample_plugins/Composite Stack Accumulator.fxcore`
- Size: 135,168 bytes
- Role: iterator accumulation
- Nodes: 15
- Connections: 12
- Root: `com.fxfactory.FxCore.FxCorePlugInCIContainer`
- Notable nodes: FxCorePlugInIterator, AVCaptureDevicePlugIn, FxCorePlugInIteratorVariables

### Nodes

| Title | Identifier | Parent |
|---|---|---|
| Root | `com.fxfactory.FxCore.FxCorePlugInCIContainer` |  |
| Container | `com.fxfactory.FxCore.FxCorePlugInIterator` |  |
| 􀍊 | `com.fxfactory.FxCore.AVCaptureDevicePlugIn` | 1 |
| Resize | `com.fxfactory.FxCore.FxCorePlugInImageFitInsideDestination` | 1 |
| Container | `com.fxfactory.FxCore.FxCorePlugInIterator` | 1 |
| 2D | `com.fxfactory.FxCore.FxCorePlugInCIBillboard` | 1 |
| Stack (check Options out) | `com.fxfactory.FxCore.FxCorePlugInCICompositeOperation` | 7 |
| Splitter | `com.fxfactory.FxCore.FxCorePlugInSplitter` | 7 |
| Random | `com.fxfactory.FxCore.FxCorePlugInRandomValueGenerator` | 7 |
| Destination | `com.fxfactory.FxCore.FxCorePlugInOutputInfo` | 7 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 7 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 7 |
| Center | `com.fxfactory.FxCore.FxCorePlugInNICenterImageTransform` | 7 |
| Iterator | `com.fxfactory.FxCore.FxCorePlugInIteratorVariables` | 7 |
| Create Array (This too can work as an Accumulator... check Options) | `com.fxfactory.FxCore.FxCorePlugInCreateArray` | 7 |

### Decoded Values

- `expression` `nodeKeyValue` Expression / `expressionString`: centerX + randomDeltaX
- `expression` `nodeKeyValue` Expression / `candidateString`: centerX + randomDeltaX
- `expression` `nodeKeyValue` Expression / `expressionString`: centerY + randomDeltaY
- `expression` `nodeKeyValue` Expression / `candidateString`: centerY + randomDeltaY

### Connections

- 􀍊.? -> Resize.Image
- Resize.? -> Container.Image
- Container.? -> 2D.Image
- Random.? -> Expression.Random Delta Y
- Random.? -> Expression.Random Delta X
- Destination.Center Y -> Expression.Center Y
- Expression.= -> Center.Y
- Expression.= -> Center.X
- Center.? -> Stack (check Options out).Image
- Splitter.? -> Center.?
- Destination.Center X -> Expression.Center X
- Iterator.Index -> Random.Time

## DepthAnything.fxcore

- Path: `/Users/dalebradshaw/Documents/fxcore/sample_plugins/DepthAnything.fxcore`
- Size: 159,744 bytes
- Role: CoreML depth mask
- Nodes: 11
- Connections: 8
- Root: `com.fxfactory.FxCore.FxCorePlugInCIContainer`
- Notable nodes: FxCorePlugInMLModelImporter, AVCaptureDevicePlugIn

### Nodes

| Title | Identifier | Parent |
|---|---|---|
| Root | `com.fxfactory.FxCore.FxCorePlugInCIContainer` |  |
| DepthAnythingSmallF16 | `com.fxfactory.FxCore.FxCorePlugInMLModelImporter` | 2 |
| Video | `com.fxfactory.FxCore.AVCaptureDevicePlugIn` | 2 |
| Notes | `com.fxfactory.FxCore.FxCorePlugInNotes` | 2 |
| Scale | `com.fxfactory.FxCore.FxCorePlugInImageFitInsideDestination` | 2 |
| Scale | `com.fxfactory.FxCore.FxCorePlugInImageFitInsideDestination` | 2 |
| 2D | `com.fxfactory.FxCore.FxCorePlugInCIBillboard` | 2 |
| Variable Blur | `com.fxfactory.FxCore.FxCorePlugInCIMaskedVariableBlur` | 2 |
| Invert | `com.fxfactory.FxCore.FxCorePlugInCIColorInvert` | 2 |
| Notes | `com.fxfactory.FxCore.FxCorePlugInNotes` | 2 |
| Notes | `com.fxfactory.FxCore.FxCorePlugInNotes` | 2 |

### Decoded Values

- `model` `nodeKeyValue` DepthAnythingSmallF16 / `modelPorts`: description
- `model` `nodeKeyValue` DepthAnythingSmallF16 / `modelPorts`: image
- `model` `nodeKeyValue` DepthAnythingSmallF16 / `modelPorts`: inputFeatureImage
- `model` `nodeKeyValue` DepthAnythingSmallF16 / `modelPorts`: Image
- `model` `nodeKeyValue` DepthAnythingSmallF16 / `modelPorts`: Image supports 518x396 images by default. This is a required input feature.
- `model` `nodeKeyValue` DepthAnythingSmallF16 / `modelPorts`: menuItems
- `model` `nodeKeyValue` DepthAnythingSmallF16 / `modelPorts`: menuItemsRepresentedObjects
- `model` `nodeKeyValue` DepthAnythingSmallF16 / `modelPorts`: Default
- `model` `nodeKeyValue` DepthAnythingSmallF16 / `modelPorts`: Lanczos
- `model` `nodeKeyValue` DepthAnythingSmallF16 / `modelPorts`: Bicubic
- `model` `nodeKeyValue` DepthAnythingSmallF16 / `modelPorts`: inputFeatureImageResamplingFilter
- `model` `nodeKeyValue` DepthAnythingSmallF16 / `modelPorts`: Image Resampling
- `model` `nodeKeyValue` DepthAnythingSmallF16 / `modelPorts`: Algorithm used to scale the input to Image to one of the sizes supported by the model.
- `model` `nodeKeyValue` DepthAnythingSmallF16 / `modelPorts`: depth
- `model` `nodeKeyValue` DepthAnythingSmallF16 / `modelPorts`: outputPredictionDepth
- `model` `nodeKeyValue` DepthAnythingSmallF16 / `modelPorts`: Depth
- `model` `nodeKeyValue` DepthAnythingSmallF16 / `modelPorts`: Depth supports 518x392 images by default. This is a required output prediction.
- `model` `nodeKeyValue` DepthAnythingSmallF16 / `modelName`: DepthAnythingSmallF16.mlpackage
- `model` `input` DepthAnythingSmallF16 / `inputURL`: file:///Users/gds/Desktop/ML/DepthAnythingSmallF16P8.mlpackage/

### Connections

- Video.Image -> DepthAnythingSmallF16.Image
- DepthAnythingSmallF16.Depth -> Scale.Image
- Scale.Image -> Variable Blur.Image
- Invert.Image -> Variable Blur.Mask
- Scale.Rectangle -> Scale.Extent (Destination)
- Video.Image -> Scale.Image
- Scale.Image -> Invert.Image
- Variable Blur.Image -> 2D.Image

## Directory Scanner.fxcore

- Path: `/Users/dalebradshaw/Documents/fxcore/sample_plugins/Directory Scanner.fxcore`
- Size: 139,264 bytes
- Role: filesystem image scan
- Nodes: 14
- Connections: 13
- Root: `com.fxfactory.FxCore.FxCorePlugIn3DRenderToTexture`
- Notable nodes: FxCorePlugIn3DRenderToTexture, DirectoryScannerPlugIn

### Nodes

| Title | Identifier | Parent |
|---|---|---|
| Root | `com.fxfactory.FxCore.FxCorePlugIn3DRenderToTexture` |  |
| Directory | `com.fxfactory.FxCore.DirectoryScannerPlugIn` | 1 |
| Random | `com.fxfactory.FxCore.RandomElementPlugIn` | 1 |
| Local Time | `com.fxfactory.FxCore.FxCorePlugInLocalTime` | 1 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 1 |
| Image Importer | `com.fxfactory.FxCore.FxCorePlugInImageImporter` | 1 |
| Billboard | `com.fxfactory.FxCore.FxCorePlugInCIBillboard` | 1 |
| Fit Image | `com.fxfactory.FxCore.FxCorePlugInImageFitInsideDestination` | 1 |
| Image With String | `com.fxfactory.FxCore.FxCorePlugInImageWithString` | 1 |
| Center Image | `com.fxfactory.FxCore.FxCorePlugInNICenterImageTransform` | 1 |
| Destination | `com.fxfactory.FxCore.FxCorePlugInOutputInfo` | 1 |
| Billboard | `com.fxfactory.FxCore.FxCorePlugInCIBillboard` | 1 |
| URL | `com.fxfactory.FxCore.FxCorePlugInManipulateURL` | 1 |
| URL | `com.fxfactory.FxCore.FxCorePlugInManipulateURL` | 1 |

### Decoded Values

- `expression` `nodeKeyValue` Expression / `expressionString`: floor(time / 3)
- `expression` `nodeKeyValue` Expression / `candidateString`: floor(time / 3)
- `url` `input` Image Importer / `inputURL`: file:///System/Library/Desktop%20Pictures/hello%20Grey.heic
- `url` `input` Directory / `inputURL`: file:///System/Library/Desktop%20Pictures/
- `text` `input` Image With String / `inputString`: hello Grey
- `url` `input` URL / `inputURL`: file:///System/Library/Desktop%20Pictures/hello%20Grey.heic
- `url` `input` URL / `inputURL`: file:///System/Library/Desktop%20Pictures/hello%20Blue

### Connections

- Local Time.Time -> Expression.Time
- Image With String.Image -> Center Image.Image
- Destination.Center -> Center Image.Center
- Directory.? -> Random.Array
- Image Importer.Image -> Fit Image.Image
- Expression.= -> Random.Time
- Fit Image.Image -> Billboard.Image
- Center Image.? -> Billboard.Image
- Destination.Width -> Image With String.Max Width
- URL.Component -> Image With String.String
- URL.URL -> URL.URL
- Random.? -> Image Importer.URL
- Random.? -> URL.URL

## Eagly.fxcore

- Path: `/Users/dalebradshaw/Documents/fxcore/sample_plugins/Eagly.fxcore`
- Size: 1,150,976 bytes
- Role: animated image source
- Nodes: 4
- Connections: 2
- Root: `com.fxfactory.FxCore.FxCorePlugInCIContainer`
- Notable nodes: CGImageSourcePlugIn

### Nodes

| Title | Identifier | Parent |
|---|---|---|
| Root | `com.fxfactory.FxCore.FxCorePlugInCIContainer` |  |
| 2D | `com.fxfactory.FxCore.FxCorePlugInCIBillboard` | 1 |
| Animation | `com.fxfactory.FxCore.CGImageSourcePlugIn` | 1 |
| Resize | `com.fxfactory.FxCore.FxCorePlugInImageFitInsideDestination` | 1 |

### Connections

- Resize.Image -> 2D.Image
- Animation.? -> Resize.Image

## Events.fxcore

- Path: `/Users/dalebradshaw/Documents/fxcore/sample_plugins/Events.fxcore`
- Size: 139,264 bytes
- Role: standalone mouse/keyboard input
- Nodes: 7
- Connections: 18
- Root: `com.fxfactory.FxCore.FxCorePlugInCIContainer`
- Notable nodes: FxCorePlugInMouseInfo, FxCorePlugInKeyboardInfo
- Host safety: captures mouse state, which is not available during video-frame rendering
- Host safety: captures keyboard state, which is not available during video-frame rendering

### Nodes

| Title | Identifier | Parent |
|---|---|---|
| Root | `com.fxfactory.FxCore.FxCorePlugInCIContainer` |  |
| Mouse | `com.fxfactory.FxCore.FxCorePlugInMouseInfo` | 1 |
| Create String | `com.fxfactory.FxCore.FxCorePlugInStringWithFormat` | 1 |
| Image With String | `com.fxfactory.FxCore.FxCorePlugInImageWithString` | 1 |
| Keys | `com.fxfactory.FxCore.FxCorePlugInKeyboardInfo` | 1 |
| System Font | `com.fxfactory.FxCore.FxCorePlugInSystemFont` | 1 |
| 2D | `com.fxfactory.FxCore.FxCorePlugInCIBillboard` | 1 |

### Decoded Values

- `format` `nodeKeyValue` Create String / `formatString`: Mouse x%@ y%@ Window %@ x %@ points Left button %@ Left drag x%@ y%@ Right button %@ Right drag x%@ y%@ Scroll x%@ y%@ ⌘ %@ ⌥ %@ ⌃ %@
- `text` `input` Create String / `inputString5`: 0
- `text` `input` Create String / `inputString8`: 0
- `text` `input` Create String / `inputString4`: 0
- `text` `input` Create String / `inputString3`: 360
- `text` `input` Create String / `inputString9`: 0
- `text` `input` Create String / `inputString11`: 0
- `text` `input` Create String / `inputString10`: 0
- `text` `input` Create String / `inputString2`: 640
- `text` `input` Create String / `inputString6`: 0
- `text` `input` Create String / `inputString7`: 0
- `text` `input` Create String / `inputString13`: 0
- `text` `input` Image With String / `inputString`: Mouse x0 y205 Window 640 x 360 points Left button 0 Left drag x0 y0 Right button 0 Right drag x0 y0 Scroll x0 y0 ⌘ 0 ⌥ 0 ⌃ 0
- `text` `input` Create String / `inputString12`: 0
- `text` `input` Create String / `inputString14`: 0

### Connections

- Mouse.Window Width -> Create String.String 3
- Mouse.Right Drag Delta (X) -> Create String.String 9
- Mouse.Left Drag (Delta Y) -> Create String.String 7
- Mouse.Left Drag Delta (X) -> Create String.String 6
- Mouse.Left Button -> Create String.String 5
- Mouse.Window Height -> Create String.String 4
- Mouse.Scroll Delta (X) -> Create String.String 11
- Mouse.Right Drag Delta (Y) -> Create String.String 10
- Mouse.Scroll Delta (Y) -> Create String.String 12
- Mouse.Right Button Pressed -> Create String.String 8
- Create String.String -> Image With String.String
- Keys.⌃ -> Create String.String 15
- Keys.⌥ -> Create String.String 14
- Keys.⌘ -> Create String.String 13
- System Font.? -> Image With String.Font Name
- Image With String.Image -> 2D.Image
- Mouse.Location (Y) -> Create String.String 2
- Mouse.Location (X) -> Create String.String 1

## Feedback.fxcore

- Path: `/Users/dalebradshaw/Documents/fxcore/sample_plugins/Feedback.fxcore`
- Size: 118,784 bytes
- Role: standalone temporal feedback
- Nodes: 4
- Connections: 3
- Root: `com.fxfactory.FxCore.FxCorePlugIn3DRenderToTexture`
- Notable nodes: FxCorePlugIn3DRenderToTexture, FxCorePlugInCIKernel, AVCaptureDevicePlugIn
- Host safety: uses previousImage feedback; video hosts may render frames out of sequence

### Nodes

| Title | Identifier | Parent |
|---|---|---|
| Root | `com.fxfactory.FxCore.FxCorePlugIn3DRenderToTexture` |  |
| Simple Feedback | `com.fxfactory.FxCore.FxCorePlugInCIKernel` | 1 |
| 􀍊 | `com.fxfactory.FxCore.AVCaptureDevicePlugIn` | 1 |
| 2D | `com.fxfactory.FxCore.FxCorePlugInCIBillboard` | 1 |

### Decoded Values

- `kernel` `nodeKeyValue` Simple Feedback / `kernelString`: kernel vec4 myFilter(__sample image, __sample previousImage) { return mix(image, previousImage, -0.5); }
- `kernel` `nodeKeyValue` Simple Feedback / `candidateString`: kernel vec4 myFilter(__sample image, __sample previousImage) { return mix(image, previousImage, -0.5); }
- `kernel` `nodeKeyValue` Simple Feedback / `activeKernelName`: myFilter

### Connections

- 􀍊.? -> Simple Feedback.Image
- Simple Feedback.? -> Simple Feedback.Previous Image
- Simple Feedback.? -> 2D.Image

## Fire.fxcore

- Path: `/Users/dalebradshaw/Documents/fxcore/sample_plugins/Fire.fxcore`
- Size: 155,648 bytes
- Role: GLSL to Core Image shader
- Nodes: 7
- Connections: 3
- Root: `com.fxfactory.FxCore.FxCorePlugInCIContainer`
- Notable nodes: FxCorePlugInCIShader

### Nodes

| Title | Identifier | Parent |
|---|---|---|
| Root | `com.fxfactory.FxCore.FxCorePlugInCIContainer` |  |
| 2D | `com.fxfactory.FxCore.FxCorePlugInCIBillboard` | 1 |
| Time | `com.fxfactory.FxCore.FxCorePlugInLocalTime` | 1 |
| Output | `com.fxfactory.FxCore.FxCorePlugInOutputInfo` | 1 |
| Shader | `com.fxfactory.FxCore.FxCorePlugInCIShader` | 1 |
| Notes | `com.fxfactory.FxCore.FxCorePlugInNotes` | 1 |
| Notes | `com.fxfactory.FxCore.FxCorePlugInNotes` | 1 |

### Decoded Values

- `kernel` `nodeKeyValue` Shader / `candidateString`: // Original shader: https://fragcoord.xyz/s/3zoe0vgo // Copyright Xor [[stitchable]] float4 fireKernel(vec2 u_resolution, float u_time, destination dest) { const vec4 gl_FragCoord = vec4(dest.coord(), 0.5, 0.0); vec4 ...
- `kernel` `nodeKeyValue` Shader / `activeKernelName`: fireKernel
- `kernel` `nodeKeyValue` Shader / `kernelString`: #include <metal_stdlib> #include <CoreImage/CoreImage.h> using namespace metal; extern "C" { namespace coreimage { // FxCore: Begin User Content // Original shader: https://fragcoord.xyz/s/3zoe0vgo // Copyright Xor [[...

### Connections

- Time.Time -> Shader.U Time
- Output.Size -> Shader.U Resolution
- Shader.Image -> 2D.Image

## Human.fxcore

- Path: `/Users/dalebradshaw/Documents/fxcore/sample_plugins/Human.fxcore`
- Size: 565,248 bytes
- Role: Vision body pose
- Nodes: 19
- Connections: 16
- Root: `com.fxfactory.FxCore.FxCorePlugIn3DRenderToTexture`
- Notable nodes: FxCorePlugIn3DRenderToTexture, FxCorePlugInIterator, HumanBodyPosePlugIn, FxCorePlugInIteratorVariables, HumanBodyJointsPlugIn

### Nodes

| Title | Identifier | Parent |
|---|---|---|
| Root | `com.fxfactory.FxCore.FxCorePlugIn3DRenderToTexture` |  |
| Container | `com.fxfactory.FxCore.FxCorePlugInIterator` |  |
| 2D | `com.fxfactory.FxCore.FxCorePlugInCIBillboard` | 1 |
| Body Pose | `com.fxfactory.FxCore.HumanBodyPosePlugIn` | 1 |
| Container | `com.fxfactory.FxCore.FxCorePlugInIterator` | 1 |
| Resize | `com.fxfactory.FxCore.FxCorePlugInImageFitInsideDestination` | 1 |
| jakub-kusiow… | `com.fxfactory.FxCore.FxCorePlugInImageImporter` | 1 |
| Splitter | `com.fxfactory.FxCore.FxCorePlugInSplitter` | 9 |
| Iterator | `com.fxfactory.FxCore.FxCorePlugInIteratorVariables` | 9 |
| Index → Value | `com.fxfactory.FxCore.FxCorePlugInArrayValueAtIndex` | 9 |
| Container | `com.fxfactory.FxCore.FxCorePlugInIterator` | 9 |
| Joints | `com.fxfactory.FxCore.HumanBodyJointsPlugIn` | 9 |
| Joints (when you need them individually) | `com.fxfactory.FxCore.HumanBodyJointsPlugIn` | 9 |
| Splitter | `com.fxfactory.FxCore.FxCorePlugInSplitter` | 20 |
| Iterator | `com.fxfactory.FxCore.FxCorePlugInIteratorVariables` | 20 |
| Index → Value | `com.fxfactory.FxCore.FxCorePlugInArrayValueAtIndex` | 20 |
| 2D | `com.fxfactory.FxCore.FxCorePlugInCIBillboard` | 20 |
| Circle | `com.fxfactory.FxCore.FxCorePlugInNISmoothCircle` | 20 |
| Interpolation | `com.fxfactory.FxCore.FxCorePlugInInterpolation` | 20 |

### Connections

- Body Pose.? -> Container.Iterations
- Body Pose.? -> Container.Poses
- Iterator.Index -> Index → Value.Index 0
- Splitter.? -> Index → Value.Array
- Iterator.Index -> Index → Value.Index 0
- Splitter.? -> Index → Value.Array
- Circle.? -> 2D.Image
- Index → Value.? -> Circle.Center
- Index → Value.? -> Joints.Pose
- Joints.? -> Container.Points
- Joints.? -> Container.Iterations
- Resize.? -> Body Pose.Image
- Resize.? -> 2D.Image
- Interpolation.? -> Circle.Radius
- jakub-kusiow….? -> Resize.Image
- Index → Value.? -> Joints (when you need them individually).Pose

## Inferno.fxcore

- Path: `/Users/dalebradshaw/Documents/fxcore/sample_plugins/Inferno.fxcore`
- Size: 163,840 bytes
- Role: styled text animation
- Nodes: 13
- Connections: 16
- Root: `com.fxfactory.FxCore.FxCorePlugInCIContainer`

### Nodes

| Title | Identifier | Parent |
|---|---|---|
| Root | `com.fxfactory.FxCore.FxCorePlugInCIContainer` |  |
| Styled Text With String | `com.fxfactory.FxCore.FxCorePlugInStyledTextWithString` | 5 |
| Image With Styled Text | `com.fxfactory.FxCore.FxCorePlugInImageWithStyledText` | 5 |
| Billboard | `com.fxfactory.FxCore.FxCorePlugInCIBillboard` | 5 |
| Interpolation | `com.fxfactory.FxCore.FxCorePlugInInterpolation` | 5 |
| Destination | `com.fxfactory.FxCore.FxCorePlugInOutputInfo` | 5 |
| Local Time | `com.fxfactory.FxCore.FxCorePlugInLocalTime` | 5 |
| Source Over | `com.fxfactory.FxCore.FxCorePlugInCISourceOverCompositing` | 5 |
| Masked Variable Blur | `com.fxfactory.FxCore.FxCorePlugInCIMaskedVariableBlur` | 5 |
| Circle (Filled) | `com.fxfactory.FxCore.FxCorePlugInNICircle` | 5 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 5 |
| Clouds | `com.fxfactory.FxCore.FxCorePlugInNICloudsGenerator` | 5 |
| Bump | `com.fxfactory.FxCore.FxCorePlugInCIBumpDistortion` | 5 |

### Decoded Values

- `expression` `nodeKeyValue` Expression / `candidateString`: max(width, height)/3
- `expression` `nodeKeyValue` Expression / `expressionString`: max(width, height)/3
- `text` `input` Styled Text With String / `inputString`: Nel mezzo del cammin di nostra vita mi ritrovai per una selva oscura ché la diritta via era smarrita. Ahi quanto a dir qual era è cosa dura esta selva selvaggia e aspra e forte che nel pensier rinova la paura! Tant'è ...
- `text` `input` Image With Styled Text / `inputAttributedString`: Nel mezzo del cammin di nostra vita mi ritrovai per una selva oscura ché la diritta via era smarrita. Ahi quanto a dir qual era è cosa dura esta selva selvaggia e aspra e forte che nel pensier rinova la paura! Tant'è ...
- `text` `input` Image With Styled Text / `inputAttributedString`: Baskerville-Italic
- `text` `input` Image With Styled Text / `inputAttributedString`: 1 1 1

### Connections

- Styled Text With String.Styled Text -> Image With Styled Text.Styled Text
- Interpolation.Value -> Image With Styled Text.Vertical Scroll
- Destination.Center -> Circle (Filled).Center
- Source Over.? -> Masked Variable Blur.Image
- Circle (Filled).? -> Masked Variable Blur.Mask
- Masked Variable Blur.? -> Billboard.Image
- Destination.Height -> Expression.Height
- Expression.= -> Circle (Filled).Radius
- Destination.Width -> Expression.Width
- Expression.= -> Circle (Filled).Softness
- Local Time.Time -> Clouds.Time
- Clouds.? -> Source Over.Bottom
- Destination.Width -> Bump.Radius
- Destination.Center -> Bump.Center
- Bump.? -> Source Over.Top
- Image With Styled Text.Image -> Bump.Image

## Interpolation.fxcore

- Path: `/Users/dalebradshaw/Documents/fxcore/sample_plugins/Interpolation.fxcore`
- Size: 126,976 bytes
- Role: timed interpolation
- Nodes: 8
- Connections: 7
- Root: `com.fxfactory.FxCore.FxCorePlugIn3DRenderToTexture`
- Notable nodes: FxCorePlugIn3DRenderToTexture

### Nodes

| Title | Identifier | Parent |
|---|---|---|
| Root | `com.fxfactory.FxCore.FxCorePlugIn3DRenderToTexture` |  |
| Interpolation | `com.fxfactory.FxCore.FxCorePlugInInterpolation` | 5 |
| Circle | `com.fxfactory.FxCore.FxCorePlugInNISmoothCircle` | 5 |
| 􀷘 | `com.fxfactory.FxCore.FxCorePlugInOutputInfo` | 5 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 5 |
| 2D | `com.fxfactory.FxCore.FxCorePlugInCIBillboard` | 5 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 5 |
| Interpolation | `com.fxfactory.FxCore.FxCorePlugInInterpolation` | 5 |

### Decoded Values

- `expression` `nodeKeyValue` Expression / `expressionString`: a + a*b
- `expression` `nodeKeyValue` Expression / `candidateString`: a + a*b
- `expression` `nodeKeyValue` Expression / `expressionString`: a + a * b
- `expression` `nodeKeyValue` Expression / `candidateString`: a + a * b

### Connections

- Expression.= -> Circle.Center X
- Interpolation.Value -> Expression.B
- Circle.? -> 2D.Image
- Expression.= -> Circle.Center Y
- 􀷘.Center X -> Expression.A
- 􀷘.Center Y -> Expression.A
- Interpolation.Value -> Expression.B

## Iterator 2.fxcore

- Path: `/Users/dalebradshaw/Documents/fxcore/sample_plugins/Iterator 2.fxcore`
- Size: 139,264 bytes
- Role: iterated camera feedback
- Nodes: 13
- Connections: 15
- Root: `com.fxfactory.FxCore.FxCorePlugInCIContainer`
- Notable nodes: FxCorePlugInIterator, AVCaptureDevicePlugIn, FxCorePlugInIteratorVariables, FxCorePlugInCIKernel

### Nodes

| Title | Identifier | Parent |
|---|---|---|
| Root | `com.fxfactory.FxCore.FxCorePlugInCIContainer` |  |
| Container | `com.fxfactory.FxCore.FxCorePlugInIterator` | 1 |
| 􀍊 | `com.fxfactory.FxCore.AVCaptureDevicePlugIn` | 1 |
| 2D | `com.fxfactory.FxCore.FxCorePlugInCIBillboard` | 1 |
| Resize | `com.fxfactory.FxCore.FxCorePlugInImageFitInsideDestination` | 1 |
| Iterator | `com.fxfactory.FxCore.FxCorePlugInIteratorVariables` | 3 |
| On Index > 1, it is clamped | `com.fxfactory.FxCore.FxCorePlugInMultiplexer` | 3 |
| Transform | `com.fxfactory.FxCore.FxCorePlugInNIAffineTransformUnit` | 3 |
| Destination | `com.fxfactory.FxCore.FxCorePlugInOutputInfo` | 3 |
| Kernel | `com.fxfactory.FxCore.FxCorePlugInCIKernel` | 3 |
| Over | `com.fxfactory.FxCore.FxCorePlugInCISourceOverCompositing` | 3 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 3 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 3 |

### Decoded Values

- `kernel` `nodeKeyValue` Kernel / `activeKernelName`: myFilter
- `kernel` `nodeKeyValue` Kernel / `candidateString`: kernel vec4 myFilter(__sample image) { return image * 0.9; }
- `kernel` `nodeKeyValue` Kernel / `kernelString`: kernel vec4 myFilter(__sample image) { return image * 0.9; }
- `expression` `nodeKeyValue` Expression / `expressionString`: 1.0 - 0.9 / iterations
- `expression` `nodeKeyValue` Expression / `candidateString`: 1.0 - 0.9 / iterations
- `expression` `nodeKeyValue` Expression / `expressionString`: 30 / iterations
- `expression` `nodeKeyValue` Expression / `candidateString`: 30 / iterations

### Connections

- Iterator.Index -> On Index > 1, it is clamped.Index
- Destination.Center -> Transform.Origin
- Resize.? -> Container.Image 0
- 􀍊.? -> Resize.Image
- On Index > 1, it is clamped.? -> Kernel.Image
- On Index > 1, it is clamped.? -> Over.?
- Transform.? -> Over.?
- Container.? -> 2D.Image
- Kernel.? -> Transform.Image
- Over.? -> On Index > 1, it is clamped.Image 1
- Iterator.Iterations -> Expression.Iterations
- Expression.= -> Transform.Scale X
- Expression.= -> Transform.Scale Y
- Iterator.Iterations -> Expression.Iterations
- Expression.= -> Transform.Angle

## Iterator.fxcore

- Path: `/Users/dalebradshaw/Documents/fxcore/sample_plugins/Iterator.fxcore`
- Size: 135,168 bytes
- Role: iterator text repetition
- Nodes: 10
- Connections: 13
- Root: `com.fxfactory.FxCore.FxCorePlugIn3DRenderToTexture`
- Notable nodes: FxCorePlugIn3DRenderToTexture, FxCorePlugIn3DSprite, FxCorePlugInIteratorVariables

### Nodes

| Title | Identifier | Parent |
|---|---|---|
| Root | `com.fxfactory.FxCore.FxCorePlugIn3DRenderToTexture` |  |
| Image With String | `com.fxfactory.FxCore.FxCorePlugInImageWithString` | 7 |
| Sprite | `com.fxfactory.FxCore.FxCorePlugIn3DSprite` | 7 |
| Random | `com.fxfactory.FxCore.FxCorePlugInRandomValueGenerator` | 7 |
| Iterator Variables | `com.fxfactory.FxCore.FxCorePlugInIteratorVariables` | 7 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 7 |
| Local Time | `com.fxfactory.FxCore.FxCorePlugInLocalTime` | 7 |
| Random | `com.fxfactory.FxCore.FxCorePlugInRandomValueGenerator` | 7 |
| Create Color | `com.fxfactory.FxCore.FxCorePlugInRGBValuesToColor` | 7 |
| System Font | `com.fxfactory.FxCore.FxCorePlugInSystemFont` | 7 |

### Decoded Values

- `expression` `nodeKeyValue` Expression / `expressionString`: a + b
- `expression` `nodeKeyValue` Expression / `candidateString`: a + b
- `text` `input` Image With String / `inputString`: 99

### Connections

- Expression.= -> Random.Time
- Local Time.Time -> Expression.a
- Random.? -> Sprite.Position Y
- Random.? -> Sprite.Position X
- Iterator Variables.Current Index -> Expression.b
- Iterator Variables.Current Index -> Image With String.String
- Image With String.Image -> Sprite.Image
- Iterator Variables.Progress -> Random.Time
- Create Color.? -> Image With String.Text Color
- System Font.? -> Image With String.Font Name
- Random.? -> Create Color.Green
- Random.? -> Create Color.Blue
- Random.? -> Create Color.Red

## Pac-Man.fxcore

- Path: `/Users/dalebradshaw/Documents/fxcore/sample_plugins/Pac-Man.fxcore`
- Size: 131,072 bytes
- Role: procedural CI chain
- Nodes: 9
- Connections: 14
- Root: `com.fxfactory.FxCore.FxCorePlugIn3DRenderToTexture`
- Notable nodes: FxCorePlugIn3DRenderToTexture

### Nodes

| Title | Identifier | Parent |
|---|---|---|
| Root | `com.fxfactory.FxCore.FxCorePlugIn3DRenderToTexture` |  |
| Circle (Filled) | `com.fxfactory.FxCore.FxCorePlugInNICircle` | 4 |
| Destination | `com.fxfactory.FxCore.FxCorePlugInOutputInfo` | 4 |
| Radial Wipe | `com.fxfactory.FxCore.FxCorePlugInNIRadialWipeTransition` | 4 |
| Billboard | `com.fxfactory.FxCore.FxCorePlugInCIBillboard` | 4 |
| Interpolation | `com.fxfactory.FxCore.FxCorePlugInInterpolation` | 4 |
| Interpolation | `com.fxfactory.FxCore.FxCorePlugInInterpolation` | 4 |
| Pixelate | `com.fxfactory.FxCore.FxCorePlugInCIPixellate` | 4 |
| CRT Scanlines | `com.fxfactory.FxCore.FxCorePlugInNICRTScanlines` | 4 |

### Connections

- Destination.Center Y -> Radial Wipe.Center Y
- Destination.Center Y -> Circle (Filled).Center Y
- Destination.Center X -> Radial Wipe.Center X
- Interpolation.Value -> Radial Wipe.Angle
- Circle (Filled).? -> Radial Wipe.Image
- Interpolation.Value -> Radial Wipe.Time
- Destination.Center X -> Circle (Filled).Center X
- Destination.Center X -> Pixelate.Center X
- Radial Wipe.? -> Pixelate.Image
- Destination.Center Y -> Pixelate.Center Y
- CRT Scanlines.? -> Billboard.Image
- Pixelate.? -> CRT Scanlines.Image
- Destination.Center Y -> CRT Scanlines.Center Y
- Destination.Center X -> CRT Scanlines.Center X

## Spaghetti Poetry.fxcore

- Path: `/Users/dalebradshaw/Documents/fxcore/sample_plugins/Spaghetti Poetry.fxcore`
- Size: 192,512 bytes
- Role: language model text graphics
- Nodes: 20
- Connections: 31
- Root: `com.fxfactory.FxCore.FxCorePlugInCIContainer`
- Notable nodes: LanguageModelPlugIn

### Nodes

| Title | Identifier | Parent |
|---|---|---|
| Root | `com.fxfactory.FxCore.FxCorePlugInCIContainer` |  |
| Styled Text With String | `com.fxfactory.FxCore.FxCorePlugInStyledTextWithString` | 5 |
| Image With Styled Text | `com.fxfactory.FxCore.FxCorePlugInImageWithStyledText` | 5 |
| 2D | `com.fxfactory.FxCore.FxCorePlugInCIBillboard` | 5 |
| Interpolation | `com.fxfactory.FxCore.FxCorePlugInInterpolation` | 5 |
| Destination | `com.fxfactory.FxCore.FxCorePlugInOutputInfo` | 5 |
| Time | `com.fxfactory.FxCore.FxCorePlugInLocalTime` | 5 |
| Masked Variable Blur | `com.fxfactory.FxCore.FxCorePlugInCIMaskedVariableBlur` | 5 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 5 |
| Bump | `com.fxfactory.FxCore.FxCorePlugInCIBumpDistortion` | 5 |
| Language Model | `com.fxfactory.FxCore.LanguageModelPlugIn` | 5 |
| Alert | `com.fxfactory.FxCore.AlertGeneratorPlugIn` | 5 |
| Circle | `com.fxfactory.FxCore.FxCorePlugInNISmoothCircle` | 5 |
| Hyperspace | `com.fxfactory.FxCore.FxCorePlugInNIHyperspaceGenerator` | 5 |
| Over Color | `com.fxfactory.FxCore.FxCorePlugInNICompositeOverColor` | 5 |
| Blend With Mask | `com.fxfactory.FxCore.FxCorePlugInCIBlendWithMask` | 5 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 5 |
| Center | `com.fxfactory.FxCore.FxCorePlugInNICenterImageTransform` | 5 |
| Gaussian Blur | `com.fxfactory.FxCore.FxCorePlugInCIGaussianBlur` | 5 |
| Expression | `com.fxfactory.FxCore.FxCorePlugInMathExpression` | 5 |

### Decoded Values

- `expression` `nodeKeyValue` Expression / `candidateString`: max(width, height)/5
- `expression` `nodeKeyValue` Expression / `expressionString`: max(width, height)/5
- `expression` `nodeKeyValue` Expression / `expressionString`: width * 0.8
- `expression` `nodeKeyValue` Expression / `candidateString`: width * 0.8
- `expression` `nodeKeyValue` Expression / `candidateString`: (status == 0) * time
- `expression` `nodeKeyValue` Expression / `expressionString`: (status == 0) * time
- `text` `input` Styled Text With String / `inputString`: Infinite Loop
- `text` `input` Image With Styled Text / `inputAttributedString`: Nel mezzo del cammin di nostra vita mi ritrovai per una selva oscura ché la diritta via era smarrita. Ahi quanto a dir qual era è cosa dura esta selva selvaggia e aspra e forte che nel pensier rinova la paura! Tant'è ...
- `text` `input` Image With Styled Text / `inputAttributedString`: Baskerville-Italic
- `text` `input` Image With Styled Text / `inputAttributedString`: 1 1 1 1
- `text` `input` Image With Styled Text / `inputAttributedString`: 1 1 1
- `prompt` `input` Language Model / `inputPrompt`: Write a poem to the Flying Spaghetti Monster
- `text` `input` Alert / `inputString`: Sorry, there is a problem with Apple Music.

### Connections

- Styled Text With String.Styled Text -> Image With Styled Text.Styled Text
- Interpolation.Value -> Image With Styled Text.Vertical Scroll
- Destination.Height -> Expression.Height
- Destination.Width -> Expression.Width
- Destination.Width -> Bump.Radius
- Destination.Center -> Bump.Center
- Language Model.Message -> Alert.Text
- Language Model.Response -> Styled Text With String.String
- Destination.Center -> Circle.Center
- Circle.Image -> Masked Variable Blur.Mask
- Expression.= -> Circle.Radius
- Expression.= -> Circle.Border
- Alert.Image -> 2D.Image 3
- Masked Variable Blur.? -> 2D.Image 2
- Language Model.Status -> 2D.Image 3
- Destination.Center -> Hyperspace.Center
- Hyperspace.Image -> Blend With Mask.Image
- Circle.Image -> Blend With Mask.Mask Image
- Time.Time -> Hyperspace.Time
- Blend With Mask.Image -> Over Color.Top
- Expression.= -> Image With Styled Text.Width
- Destination.Width -> Expression.Width
- Image With Styled Text.Image -> Center.?
- Center.Image -> Bump.Image
- Destination.Center -> Center.?
- Gaussian Blur.Image -> 2D.Image
- Over Color.Image -> Gaussian Blur.Image
- Bump.? -> Masked Variable Blur.Image
- Expression.= -> Interpolation.Time
- Time.Time -> Expression.Time
- Language Model.Status -> Expression.Status

## Sprite.fxcore

- Path: `/Users/dalebradshaw/Documents/fxcore/sample_plugins/Sprite.fxcore`
- Size: 147,456 bytes
- Role: nested render-to-texture
- Nodes: 10
- Connections: 8
- Root: `com.fxfactory.FxCore.FxCorePlugIn3DRenderToTexture`
- Notable nodes: FxCorePlugIn3DRenderToTexture, FxCorePlugIn3DSprite

### Nodes

| Title | Identifier | Parent |
|---|---|---|
| Root | `com.fxfactory.FxCore.FxCorePlugIn3DRenderToTexture` |  |
| Render to Texture | `com.fxfactory.FxCore.FxCorePlugIn3DRenderToTexture` | 2 |
| Sprite | `com.fxfactory.FxCore.FxCorePlugIn3DSprite` | 2 |
| Interpolation | `com.fxfactory.FxCore.FxCorePlugInInterpolation` | 2 |
| Sprite | `com.fxfactory.FxCore.FxCorePlugIn3DSprite` | 4 |
| Interpolation | `com.fxfactory.FxCore.FxCorePlugInInterpolation` | 4 |
| Checkerboard | `com.fxfactory.FxCore.FxCorePlugInCICheckerboardGenerator` | 4 |
| Crop | `com.fxfactory.FxCore.FxCorePlugInCICrop` | 4 |
| 􀷘 | `com.fxfactory.FxCore.FxCorePlugInOutputInfo` | 4 |
| Create Color | `com.fxfactory.FxCore.FxCorePlugInRGBValuesToColor` | 4 |

### Connections

- Render to Texture.Image -> Sprite.Image
- Interpolation.Value -> Sprite.Rotation Y
- Crop.Image -> Sprite.Image
- 􀷘.Center -> Checkerboard.Center
- Create Color.Color -> Checkerboard.Color 2
- 􀷘.Rectangle -> Crop.?
- Checkerboard.Image -> Crop.?
- Interpolation.Value -> Create Color.Green
