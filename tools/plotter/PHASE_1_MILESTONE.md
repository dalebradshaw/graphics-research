# Writing Robot T-A4 Phase 1 Milestone

Date: 2026-04-12

Phase 1 is complete: the Writing Robot T-A4 has a calibrated, tested, live SVG plotting baseline that can be used as the foundation for a more robust media-environment output device.

## Hardware Contract

- Device: Writing Robot T-A4 DrawCore plotter
- Serial device: `/dev/cu.usbmodem201912341`
- Pen up: `G0 Z6`
- Pen down: `G0 Z0`
- Home return direction from the working area: positive X and positive Y
- Draw direction into the active viewport: negative X and negative Y
- Active viewport: 180 mm X by 250 mm Y
- Active viewport origin: shifted live-calibrated origin from the successful 180 x 250 mm box plot
- Default SVG live margin: 10 mm

Treat the active viewport as the normal calibrated plotting surface until a later calibration explicitly replaces it.

## Known Good Live Commands

The known good active viewport box from the calibrated origin is:

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

The known good full SVG fixture command is:

```bash
tools/plotter/plotter.sh plot --svg fixtures/plotter/full-plot.svg --calibrated-viewport --live --markdown
```

This command scales and centers `fixtures/plotter/full-plot.svg` inside the calibrated active viewport, emits relative XY moves, keeps Z absolute, and returns to the active origin with the pen up.

## Implemented Software Surface

- `buildManifestReport` parses supported SVG geometry into a no-motion manifest.
- `buildPlotCommands` now supports `coordinateMode: "calibratedViewport"`.
- `CALIBRATED_ACTIVE_VIEWPORT` is exported from `tools/plotter/index.ts` for Node/TypeScript consumers.
- `tools/plotter/plotter.sh plot --calibrated-viewport` is the bash integration for live calibrated SVG plotting.
- `tests/plotter.test.ts` verifies the full fixture fits inside the calibrated viewport and returns to active origin.

Legacy mirrored absolute SVG plotting remains available when `--calibrated-viewport` is not passed, but live work should prefer calibrated viewport mode.

## Validation

- Live plot completed with `fixtures/plotter/full-plot.svg`.
- `npm test` passed.
- `npx tsc --noEmit` passed.
- Focused milestone commit: `82c0703 plotter: add calibrated viewport plotting`.

## Guardrails

- Do not use 220 mm or 280 mm X spans as safe viewport bounds; both reached the mechanical X extent during calibration.
- Keep Z moves absolute while using relative XY moves for calibrated plotting.
- Return to active origin by inverting the full accumulated XY displacement, not the final local segment.
- Use `fixtures/plotter/full-plot.svg` as the supported end-to-end SVG smoke test.
- Use `fixtures/plotter/pen-cycle.svg` as the smallest actuator test.

## Phase 2 Starting Points

- Promote the plotter into the media environment as an abstract output target.
- Define a device-target API around input preparation, viewport fitting, command generation, and execution.
- Add richer SVG input configs for scale, margin, orientation, origin, pen policy, and dry-run/live gating.
- Persist generated plot reports as first-class artifacts for repeatability.
- Add explicit hardware profile versioning so future recalibrations can be tracked without overwriting this baseline.
