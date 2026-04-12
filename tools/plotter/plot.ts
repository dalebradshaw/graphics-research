import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SerialPort } from "serialport";

import { buildManifestReport, formatManifestMarkdown, type ManifestReport, type Point } from "./manifest.js";
import { buildProbeReport, formatProbeMarkdown } from "./probe.js";

type CliArgs = {
  svgPath?: string;
  port?: string;
  markdown: boolean;
  write: boolean;
  live: boolean;
  force: boolean;
  penUpZ: number;
  penDownZ: number;
  feedMmPerMin: number;
};

type PlotCommand = {
  label: string;
  command: string;
  response?: string;
};

type PlotReport = {
  generatedAt: string;
  sourceSvg: string;
  safety: {
    opensSerialPorts: boolean;
    sendsDeviceCommands: boolean;
    armedMotion: boolean;
  };
  port: string;
  feedMmPerMin: number;
  penUpZ: number;
  penDownZ: number;
  probe: Awaited<ReturnType<typeof buildProbeReport>>;
  manifest: ManifestReport;
  commands: PlotCommand[];
  notes: string[];
};

const DEFAULT_PEN_UP_Z = 6;
const DEFAULT_PEN_DOWN_Z = 0;
const DEFAULT_FEED_MM_PER_MIN = 600;

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const getValue = (flag: string): string | undefined => {
    const index = args.indexOf(flag);
    if (index < 0) return undefined;
    const value = args[index + 1];
    return value && !value.startsWith("--") ? value : undefined;
  };

  return {
    svgPath: getValue("--svg"),
    port: getValue("--port"),
    markdown: args.includes("--markdown"),
    write: args.includes("--write"),
    live: args.includes("--live"),
    force: args.includes("--force"),
    penUpZ: Number(getValue("--pen-up-z") ?? DEFAULT_PEN_UP_Z),
    penDownZ: Number(getValue("--pen-down-z") ?? DEFAULT_PEN_DOWN_Z),
    feedMmPerMin: Number(getValue("--feed") ?? DEFAULT_FEED_MM_PER_MIN)
  };
}

function buildPlotCommands(report: ManifestReport, options: {
  penUpZ: number;
  penDownZ: number;
  feedMmPerMin: number;
}): PlotCommand[] {
  const commands: PlotCommand[] = [
    { label: "units", command: "G21" },
    { label: "positioning", command: "G90" },
    { label: "pen-up", command: `G0 Z${formatNumber(options.penUpZ)}` }
  ];

  const pageHeight = report.svg.height?.mm;
  const pageWidth = report.svg.width?.mm;
  let previousPoint: Point | undefined;
  let penDown = false;

  for (const segment of report.toolpath) {
    const start = mapPoint(segment.from, pageWidth, pageHeight);
    const end = mapPoint(segment.to, pageWidth, pageHeight);
    const connected = previousPoint ? samePoint(previousPoint, start) : false;

    if (!connected) {
      if (penDown) {
        commands.push({ label: "pen-up", command: `G0 Z${formatNumber(options.penUpZ)}` });
        penDown = false;
      }
      commands.push(
        { label: `travel-to-${segment.source}-start`, command: `G0 X${formatNumber(start.x)} Y${formatNumber(start.y)}` },
        { label: `pen-down`, command: `G0 Z${formatNumber(options.penDownZ)}` }
      );
      penDown = true;
    }

    commands.push({
      label: `draw-${segment.source}`,
      command: `G1 X${formatNumber(end.x)} Y${formatNumber(end.y)} F${formatNumber(options.feedMmPerMin)}`
    });

    previousPoint = end;
  }

  if (penDown) {
    commands.push({ label: "pen-up", command: `G0 Z${formatNumber(options.penUpZ)}` });
  }
  return commands;
}

function mapPoint(point: Point, pageWidthMm: number | undefined, pageHeightMm: number | undefined): Point {
  if (pageWidthMm === undefined || pageHeightMm === undefined) {
    return point;
  }
  return {
    x: pageWidthMm - point.x,
    y: pageHeightMm - point.y
  };
}

function samePoint(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < 0.000001 && Math.abs(a.y - b.y) < 0.000001;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function formatCommandForLog(command: string): string {
  return command.replace(/\s+/g, " ").trim();
}

async function buildReport(args: CliArgs): Promise<PlotReport> {
  if (!args.svgPath) {
    throw new Error("Provide an SVG path with --svg <path> or as the first positional argument.");
  }

  const manifest = await buildManifestReport(args.svgPath);
  const probe = await buildProbeReport({
    write: false,
    markdown: false,
    queryDevice: false
  });
  const port = args.port ?? probe.likelyPlotterDevices.find((device) => device.kind === "cu")?.path;
  if (!port) {
    throw new Error("No serial port was provided and no likely /dev/cu.* plotter device was found.");
  }

  if (args.live && !args.force) {
    const blockingReasons: string[] = [];
    if (manifest.geometry.outOfBounds) {
      blockingReasons.push("SVG geometry is out of bounds for the Writing Robot T-A4 working area.");
    }
    if (manifest.unsupportedFeatures.length) {
      blockingReasons.push("SVG contains unsupported features; review the manifest before motion.");
    }
    if (blockingReasons.length) {
      throw new Error(`${blockingReasons.join(" ")} Use --force to override after review.`);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceSvg: path.resolve(args.svgPath),
    safety: {
      opensSerialPorts: args.live,
      sendsDeviceCommands: args.live,
      armedMotion: args.live
    },
    port,
    feedMmPerMin: args.feedMmPerMin,
    penUpZ: args.penUpZ,
    penDownZ: args.penDownZ,
    probe,
    manifest,
    commands: buildPlotCommands(manifest, {
      penUpZ: args.penUpZ,
      penDownZ: args.penDownZ,
      feedMmPerMin: args.feedMmPerMin
    }),
    notes: [
      "This command executes the SVG toolpath as a live plot sequence.",
      "The current profile mirrors SVG coordinates into machine coordinates to land the toolpath in the viewport.",
      "Use the empty-pen fixture for an observation-only motion test before attaching ink."
    ]
  };
}

function formatMarkdown(report: PlotReport): string {
  const lines: string[] = [];
  lines.push("# Plotter SVG Plot");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Source SVG: ${report.sourceSvg}`);
  lines.push("");
  lines.push("## Safety");
  lines.push("");
  lines.push(`- Opens serial ports: ${report.safety.opensSerialPorts}`);
  lines.push(`- Sends device commands: ${report.safety.sendsDeviceCommands}`);
  lines.push(`- Armed motion: ${report.safety.armedMotion}`);
  lines.push("");
  lines.push("## Motion");
  lines.push("");
  lines.push(`- Port: ${report.port}`);
  lines.push(`- Feed: ${report.feedMmPerMin} mm/min`);
  lines.push(`- Pen up Z: ${report.penUpZ}`);
  lines.push(`- Pen down Z: ${report.penDownZ}`);
  lines.push("");
  lines.push("## Manifest");
  lines.push("");
  lines.push(formatManifestMarkdown(report.manifest));
  lines.push("");
  lines.push("## Commands");
  lines.push("");
  report.commands.forEach((item) => {
    lines.push(`- ${item.label}: ${formatCommandForLog(item.command)}`);
  });
  lines.push("");
  lines.push("## Probe");
  lines.push("");
  lines.push(formatProbeMarkdown(report.probe));
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  report.notes.forEach((note) => lines.push(`- ${note}`));
  return lines.join("\n");
}

async function writeReport(report: PlotReport, markdown: boolean): Promise<string> {
  const outputDir = path.join(process.cwd(), "artifacts", "plotter");
  await fs.mkdir(outputDir, { recursive: true });
  const stamp = report.generatedAt.replace(/[:.]/g, "-");
  const ext = markdown ? "md" : "json";
  const outputPath = path.join(outputDir, `svg-plot-${stamp}.${ext}`);
  const content = markdown ? formatMarkdown(report) : `${JSON.stringify(report, null, 2)}\n`;
  await fs.writeFile(outputPath, content, "utf-8");
  return outputPath;
}

async function openSerialPort(port: SerialPort): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    port.open((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function closeSerialPort(port: SerialPort): Promise<void> {
  if (!port.isOpen) return;
  await new Promise<void>((resolve) => {
    port.close(() => resolve());
  });
}

async function setSerialControlLines(port: SerialPort): Promise<void> {
  await new Promise<void>((resolve) => {
    port.set({ dtr: false, rts: false }, () => resolve());
  });
}

async function sendCommand(port: SerialPort, command: string): Promise<string> {
  let response = "";
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      finish(new Error(`Timed out waiting for acknowledgement after ${formatCommandForLog(command)}`));
    }, 5000);

    const cleanup = () => {
      clearTimeout(timeout);
      port.off("data", onData);
    };

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };

    const onData = (chunk: Buffer) => {
      const text = chunk.toString("utf-8");
      response += text;
      if (/\berror\b/i.test(text)) {
        finish(new Error(`Device rejected command ${formatCommandForLog(command)}: ${text.trim()}`));
      } else if (/\bok\b/i.test(text)) {
        finish();
      }
    };

    port.on("data", onData);
    port.write(`${command}\n`, "ascii", (error) => {
      if (error) {
        finish(error);
        return;
      }
      port.drain((drainError) => {
        if (drainError) {
          finish(drainError);
        }
      });
    });
  });
  await sleep(450);
  return response;
}

async function runLivePlot(report: PlotReport): Promise<PlotReport> {
  const port = new SerialPort({
    path: report.port,
    baudRate: 115200,
    autoOpen: false
  });

  try {
    await openSerialPort(port);
    await setSerialControlLines(port);
    for (const item of report.commands) {
      const response = await sendCommand(port, item.command);
      item.response = response.trim();
    }
    return report;
  } finally {
    await closeSerialPort(port);
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = parseArgs();
  const report = await buildReport(args);

  if (args.write) {
    const outputPath = await writeReport(report, args.markdown);
    console.log(outputPath);
    return;
  }

  if (args.live) {
    const liveReport = await runLivePlot(report);
    if (args.markdown) {
      console.log(formatMarkdown(liveReport));
      return;
    }
    console.log(JSON.stringify(liveReport, null, 2));
    return;
  }

  if (args.markdown) {
    console.log(formatMarkdown(report));
    return;
  }

  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export {
  buildPlotCommands,
  buildReport as buildPlotReport,
  formatMarkdown as formatPlotMarkdown,
  writeReport as writePlotReport
};

export type { PlotCommand, PlotReport };
