# Writing Robot T-A4 Calibration

## Current Active Profile

Date: 2026-04-12

This profile is based on the live mechanical calibration run, not the SVG transform path.

- Pen up: `G0 Z6`
- Pen down: `G0 Z0`
- Home direction from the working area: positive X and positive Y
- Draw direction away from home: negative X and negative Y
- Active viewport origin: the shifted start position from the successful 180 x 250 mm box plot
- Active viewport size: 180 mm X by 250 mm Y

The known good active viewport box from that origin is:

```gcode
G21
G90
G0 Z6
G91
G0 Z0
G1 X-180 F600
G1 Y-250 F600
G1 X180 F600
G1 Y250 F600
G0 Z6
G90
```

The earlier 220 mm and 280 mm X spans reached the mechanical X extent. Do not treat them as safe viewport bounds.

The current SVG plot transform is not yet calibrated to this active viewport. For live tests, prefer explicit machine-relative calibration moves until the plot transform is updated.
