# Plotter Tools

This folder contains the no-motion Writing Robot T-A4 toolchain surface.

## TypeScript API

Import from `tools/plotter/index.ts` when calling from Node or TypeScript:

```ts
import {
  buildManifestReport,
  buildProbeReport,
  formatManifestMarkdown,
  formatProbeMarkdown,
  writeManifestReport
} from "./tools/plotter/index.js";

const probe = await buildProbeReport({
  write: false,
  markdown: false,
  queryDevice: false
});

const manifest = await buildManifestReport("fixtures/plotter/simple-shapes.svg");
const markdown = formatManifestMarkdown(manifest);
await writeManifestReport(manifest, true, undefined);
```

Safety defaults:

- `buildProbeReport` is passive unless `queryDevice` is `true`.
- `buildManifestReport` never opens serial ports or sends device commands.
- `queryDevice` sends only the allowed no-motion `V + CR` and `? + CR` commands.

## NPM CLI

```bash
npm run plotter:probe -- --markdown
npm run plotter:manifest -- --svg fixtures/plotter/simple-shapes.svg --markdown
```

## Bash CLI

```bash
tools/plotter/plotter.sh probe --markdown
tools/plotter/plotter.sh manifest --svg fixtures/plotter/simple-shapes.svg --markdown
tools/plotter/plotter.sh preflight --svg fixtures/plotter/simple-shapes.svg --markdown
tools/plotter/plotter.sh cycle --svg fixtures/plotter/pen-cycle.svg --live --markdown
tools/plotter/plotter.sh calibrate-x --live --markdown
tools/plotter/plotter.sh calibrate-x --axis y --live --markdown
tools/plotter/plotter.sh plot --svg fixtures/plotter/full-plot.svg --live --markdown
```

`preflight` runs a passive device probe followed by an SVG manifest dry run. It does not send serial commands unless you explicitly pass `--query-device` to the `probe` command separately.

`cycle` performs a Z-only pen up/down motion after running the passive probe gate and optional SVG manifest gate. Use `--svg fixtures/plotter/pen-cycle.svg` for the smallest observable live control run.

`calibrate-x` retracts the pen, switches to relative jog mode, and steps toward the requested axis hard stop so you can define the home edge. Use `--axis y` for Y calibration. The current positive-Y sweep is the working Y home reference.

`plot` executes the SVG toolpath through the device with pen up/down transitions. Use `fixtures/plotter/full-plot.svg` for the supported multi-shape live test input.

The current T-A4 profile assumes pen-up is the higher Z clearance and pen-down is the lower contact position.

## Tests

The canonical SVG test input lives at `fixtures/plotter/simple-shapes.svg`.
The minimal pen-cycle fixture lives at `fixtures/plotter/pen-cycle.svg`.
The supported full-plot fixture lives at `fixtures/plotter/full-plot.svg`.

```bash
npm test
```

That test run checks the manifest parser against the fixture, verifies the no-motion command formatter, and keeps the passive probe path import-safe.
