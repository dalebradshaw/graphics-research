# Plotter Manifest Dry Run

Generated: 2026-04-11T15:35:57.332Z
Source SVG: /Users/dalebradshaw/graphics_research/fixtures/plotter/simple-shapes.svg

## Safety

- Opens serial ports: false
- Sends device commands: false
- Motion: false

## Page

- Width: 300mm (300.000 mm)
- Height: 210mm (210.000 mm)
- ViewBox: 0, 0, 300, 210
- Coordinate mapping: viewBox scaled into declared page size

## Geometry

- Shapes: 5
- Segments: 91
- Pen lifts: 5
- Draw distance: 503.700 mm
- Travel distance: 261.439 mm
- Bounds: X 10.000..250.000 mm, Y 10.000..70.000 mm, size 240.000 x 60.000 mm
- Out of bounds: false

## Unsupported Features

- text: 1 (<text id="label">)

## Warnings

- Unsupported SVG features were detected; review before plotting.

## Shape Summary

| Type | ID | Segments | Draw distance | Bounds |
| --- | --- | ---: | ---: | --- |
| line | baseline | 1 | 40.000 mm | X 10.000..50.000 mm, Y 10.000..10.000 mm, size 40.000 x 0.000 mm |
| rect | box | 4 | 160.000 mm | X 10.000..60.000 mm, Y 20.000..50.000 mm, size 50.000 x 30.000 mm |
| path | fold-path | 19 | 165.893 mm | X 90.000..130.000 mm, Y 20.000..70.000 mm, size 40.000 x 50.000 mm |
| polyline | zigzag | 3 | 75.000 mm | X 170.000..190.000 mm, Y 20.000..65.000 mm, size 20.000 x 45.000 mm |
| circle | locator | 64 | 62.807 mm | X 230.000..250.000 mm, Y 50.000..70.000 mm, size 20.000 x 20.000 mm |

## Next Steps

- Confirm origin convention before converting manifest geometry into machine moves.
- Review unsupported SVG features and convert text/images/fills to explicit paths where needed.
- Keep real motion behind a separate armed command after dry-run reports are stable.