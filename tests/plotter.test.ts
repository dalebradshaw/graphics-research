import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildCalibrationCommands,
  buildManifestReport,
  buildPenCycleCommands,
  buildPlotCommands,
  buildProbeReport,
  commandForHumans,
  formatManifestMarkdown,
  formatProbeMarkdown
} from "../tools/plotter/index.ts";

const TEST_SVG_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures/plotter/simple-shapes.svg"
);
const PEN_CYCLE_SVG_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures/plotter/pen-cycle.svg"
);
const FULL_PLOT_SVG_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures/plotter/full-plot.svg"
);
const FOUR_INCH_DIAGONAL_SVG_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures/plotter/four-inch-diagonal.svg"
);
const ONE_INCH_BOX_SVG_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../fixtures/plotter/one-inch-box.svg"
);

test("plotter manifest parses the canonical test SVG input", async () => {
  const report = await buildManifestReport(TEST_SVG_PATH);
  const shapeById = new Map(report.shapes.map((shape) => [shape.id, shape]));
  const markdown = formatManifestMarkdown(report);

  assert.equal(path.basename(report.sourceSvg), "simple-shapes.svg");
  assert.equal(report.deviceProfile.name, "Writing Robot T-A4 DrawCore");
  assert.equal(report.safety.opensSerialPorts, false);
  assert.equal(report.safety.sendsDeviceCommands, false);
  assert.equal(report.geometry.shapeCount, 5);
  assert.equal(report.geometry.segmentCount, 91);
  assert.equal(report.geometry.penLiftCount, 5);
  assert.equal(report.geometry.outOfBounds, false);
  assert.equal(shapeById.get("baseline")?.segmentCount, 1);
  assert.equal(shapeById.get("baseline")?.drawDistanceMm, 40);
  assert.equal(shapeById.get("box")?.segmentCount, 4);
  assert.equal(shapeById.get("box")?.drawDistanceMm, 160);
  assert.equal(shapeById.get("locator")?.segmentCount, 64);
  assert.equal(shapeById.get("locator")?.drawDistanceMm > 0, true);
  assert.equal(report.unsupportedFeatures.length, 1);
  assert.equal(report.unsupportedFeatures[0]?.feature, "text");
  assert.equal(report.unsupportedFeatures[0]?.count, 1);
  assert.match(markdown, /Plotter Manifest Dry Run/);
  assert.match(markdown, /Unsupported SVG features were detected/);
});

test("plotter manifest preserves a minimal pen cycle fixture", async () => {
  const report = await buildManifestReport(PEN_CYCLE_SVG_PATH);
  const markdown = formatManifestMarkdown(report);

  assert.equal(report.geometry.shapeCount, 1);
  assert.equal(report.geometry.segmentCount, 2);
  assert.equal(report.geometry.penLiftCount, 2);
  assert.equal(report.geometry.outOfBounds, false);
  assert.equal(report.unsupportedFeatures.length, 0);
  assert.match(markdown, /Pen lifts: 2/);
  assert.match(markdown, /Segments: 2/);
});

test("plotter manifest accepts the full plot fixture without unsupported features", async () => {
  const report = await buildManifestReport(FULL_PLOT_SVG_PATH);

  assert.equal(report.geometry.shapeCount, 5);
  assert.equal(report.geometry.segmentCount, 91);
  assert.equal(report.unsupportedFeatures.length, 0);
  assert.equal(report.geometry.outOfBounds, false);
});

test("plotter toolpath generates draw and travel commands from the full fixture", async () => {
  const report = await buildManifestReport(FULL_PLOT_SVG_PATH);
  const commands = buildPlotCommands(report, {
    penUpZ: 6,
    penDownZ: 0,
    feedMmPerMin: 600
  });

  assert.equal(commands[0]?.command, "G21");
  assert.equal(commands[1]?.command, "G90");
  assert.equal(commands[2]?.command, "G0 Z6");
  assert.match(commands.map((item) => item.command).join("\n"), /G0 X290 Y200/);
  assert.match(commands.map((item) => item.command).join("\n"), /G1 X250 Y200 F600/);
  assert.match(commands.map((item) => item.command).join("\n"), /G0 Z0/);
});

test("plotter toolpath generates a four inch diagonal line from home", async () => {
  const report = await buildManifestReport(FOUR_INCH_DIAGONAL_SVG_PATH);
  const commands = buildPlotCommands(report, {
    penUpZ: 6,
    penDownZ: 0,
    feedMmPerMin: 240
  });

  assert.equal(report.geometry.segmentCount, 1);
  assert.equal(report.geometry.outOfBounds, false);
  assert.equal(commands[0]?.command, "G21");
  assert.equal(commands[1]?.command, "G90");
  assert.equal(commands[2]?.command, "G0 Z6");
  assert.match(commands.map((item) => item.command).join("\n"), /G0 X300 Y210/);
  assert.match(commands.map((item) => item.command).join("\n"), /G1 X198\.4 Y108\.4 F240/);
  assert.match(commands.map((item) => item.command).join("\n"), /G0 Z0/);
});

test("plotter toolpath generates a one inch box at normal speed", async () => {
  const report = await buildManifestReport(ONE_INCH_BOX_SVG_PATH);
  const commands = buildPlotCommands(report, {
    penUpZ: 6,
    penDownZ: 0,
    feedMmPerMin: 600
  });

  assert.equal(report.geometry.segmentCount, 4);
  assert.equal(report.geometry.outOfBounds, false);
  assert.equal(commands[0]?.command, "G21");
  assert.equal(commands[1]?.command, "G90");
  assert.equal(commands[2]?.command, "G0 Z6");
  assert.match(commands.map((item) => item.command).join("\n"), /G0 X25\.4 Y25\.4/);
  assert.match(commands.map((item) => item.command).join("\n"), /G1 X0 Y25\.4 F600/);
  assert.match(commands.map((item) => item.command).join("\n"), /G1 X0 Y0 F600/);
  assert.match(commands.map((item) => item.command).join("\n"), /G1 X25\.4 Y0 F600/);
  assert.match(commands.map((item) => item.command).join("\n"), /G0 Z0/);
});

test("probe command formatting stays no-motion", () => {
  assert.equal(commandForHumans("V\r"), "V + CR");
  assert.equal(commandForHumans("?\r"), "? + CR");
});

test("pen cycle command sequence is z-only and deterministic", () => {
  const commands = buildPenCycleCommands({
    penUpZ: 6,
    penDownZ: 0,
    dwellMs: 500,
    cycles: 1
  });

  assert.deepEqual(commands.map((item) => item.command), [
    "G21",
    "G90",
    "G0 Z6",
    "G0 Z0",
    "G4 P0.5",
    "G0 Z6"
  ]);
});

test("x calibration command sequence retracts then jogs positive x", () => {
  const commands = buildCalibrationCommands({
    axis: "x",
    penUpZ: 6,
    feedMmPerMin: 240,
    stepMm: 5,
    steps: 3,
    direction: "positive"
  });

  assert.deepEqual(commands.map((item) => item.command), [
    "G21",
    "G90",
    "G0 Z6",
    "G91",
    "G1 X5 F240",
    "G1 X5 F240",
    "G1 X5 F240",
    "G90"
  ]);
});

test("y calibration command sequence retracts then jogs negative y", () => {
  const commands = buildCalibrationCommands({
    axis: "y",
    penUpZ: 6,
    feedMmPerMin: 240,
    stepMm: 5,
    steps: 2,
    direction: "negative"
  });

  assert.deepEqual(commands.map((item) => item.command), [
    "G21",
    "G90",
    "G0 Z6",
    "G91",
    "G1 Y-5 F240",
    "G1 Y-5 F240",
    "G90"
  ]);
});

test("probe report stays passive by default", { skip: process.platform !== "darwin" }, async () => {
  const report = await buildProbeReport({
    write: false,
    markdown: false,
    queryDevice: false
  });

  assert.equal(report.safety.opensSerialPorts, false);
  assert.equal(report.safety.sendsDeviceCommands, false);
  assert.deepEqual(report.safety.allowedCommands, []);
  assert.match(formatProbeMarkdown(report), /Plotter Probe Report/);
  assert.match(formatProbeMarkdown(report), /Opens serial ports: false/);
});
