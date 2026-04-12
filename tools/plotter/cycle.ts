import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SerialPort } from "serialport";

import { buildManifestReport, formatManifestMarkdown } from "./manifest.js";
import { buildProbeReport, formatProbeMarkdown } from "./probe.js";

type CliArgs = {
  svgPath?: string;
  port?: string;
  markdown: boolean;
  write: boolean;
  live: boolean;
  dwellMs: number;
  penUpZ: number;
  penDownZ: number;
  cycles: number;
  force: boolean;
};

type PenCycleCommand = {
  label: string;
  command: string;
  response?: string;
};

type PenCycleReport = {
  generatedAt: string;
  sourceSvg?: string;
  safety: {
    opensSerialPorts: boolean;
    sendsDeviceCommands: boolean;
    armedMotion: boolean;
  };
  port: string;
  cycle: {
    penUpZ: number;
    penDownZ: number;
    dwellMs: number;
    cycles: number;
  };
  probe?: Awaited<ReturnType<typeof buildProbeReport>>;
  manifest?: Awaited<ReturnType<typeof buildManifestReport>>;
  commands: PenCycleCommand[];
  notes: string[];
};

const DEFAULT_PEN_UP_Z = 6;
const DEFAULT_PEN_DOWN_Z = 0;
const DEFAULT_DWELL_MS = 500;
const DEFAULT_CYCLES = 1;

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
    dwellMs: Number(getValue("--dwell-ms") ?? DEFAULT_DWELL_MS),
    penUpZ: Number(getValue("--pen-up-z") ?? DEFAULT_PEN_UP_Z),
    penDownZ: Number(getValue("--pen-down-z") ?? DEFAULT_PEN_DOWN_Z),
    cycles: Number(getValue("--cycles") ?? DEFAULT_CYCLES)
  };
}

function buildPenCycleCommands(options: {
  penUpZ: number;
  penDownZ: number;
  dwellMs: number;
  cycles: number;
}): PenCycleCommand[] {
  const commands: PenCycleCommand[] = [
    { label: "units", command: "G21" },
    { label: "positioning", command: "G90" },
    { label: "normalizeUp", command: `G0 Z${formatZ(options.penUpZ)}` }
  ];

  for (let index = 0; index < options.cycles; index++) {
    commands.push(
      { label: `cycle${index + 1}-down`, command: `G0 Z${formatZ(options.penDownZ)}` },
      { label: `cycle${index + 1}-dwell-down`, command: `G4 P${formatSeconds(options.dwellMs)}` },
      { label: `cycle${index + 1}-up`, command: `G0 Z${formatZ(options.penUpZ)}` }
    );
    if (index < options.cycles - 1) {
      commands.push({ label: `cycle${index + 1}-dwell-up`, command: `G4 P${formatSeconds(options.dwellMs)}` });
    }
  }

  return commands;
}

function formatZ(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function formatSeconds(milliseconds: number): string {
  return (milliseconds / 1000).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function formatCommandForLog(command: string): string {
  return command.replace(/\s+/g, " ").trim();
}

async function buildReport(args: CliArgs): Promise<PenCycleReport> {
  const manifest = args.svgPath ? await buildManifestReport(args.svgPath) : undefined;
  const probe = await buildProbeReport({
    write: false,
    markdown: false,
    queryDevice: false
  });

  const port = args.port ?? probe.likelyPlotterDevices.find((device) => device.kind === "cu")?.path;
  if (!port) {
    throw new Error("No serial port was provided and no likely /dev/cu.* plotter device was found.");
  }

  if (manifest && args.live && !args.force) {
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

  const commands = buildPenCycleCommands({
    penUpZ: args.penUpZ,
    penDownZ: args.penDownZ,
    dwellMs: args.dwellMs,
    cycles: args.cycles
  });

  const report: PenCycleReport = {
    generatedAt: new Date().toISOString(),
    sourceSvg: args.svgPath ? path.resolve(args.svgPath) : undefined,
    safety: {
      opensSerialPorts: args.live,
      sendsDeviceCommands: args.live,
      armedMotion: args.live
    },
    port,
    cycle: {
      penUpZ: args.penUpZ,
      penDownZ: args.penDownZ,
      dwellMs: args.dwellMs,
      cycles: args.cycles
    },
    probe,
    manifest,
    commands,
    notes: [
      "This command only performs a Z-axis pen cycle.",
      "The cycle is intentionally simple so it can be observed before any full plot execution path exists.",
      "Use the pen-cycle fixture to validate the gate before connecting a real SVG job."
    ]
  };

  return report;
}

function formatMarkdown(report: PenCycleReport): string {
  const lines: string[] = [];
  lines.push("# Plotter Pen Cycle");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  if (report.sourceSvg) {
    lines.push(`Source SVG: ${report.sourceSvg}`);
  }
  lines.push("");
  lines.push("## Safety");
  lines.push("");
  lines.push(`- Opens serial ports: ${report.safety.opensSerialPorts}`);
  lines.push(`- Sends device commands: ${report.safety.sendsDeviceCommands}`);
  lines.push(`- Armed motion: ${report.safety.armedMotion}`);
  lines.push("");
  lines.push("## Cycle");
  lines.push("");
  lines.push(`- Port: ${report.port}`);
  lines.push(`- Pen up Z: ${report.cycle.penUpZ}`);
  lines.push(`- Pen down Z: ${report.cycle.penDownZ}`);
  lines.push(`- Dwell: ${report.cycle.dwellMs} ms`);
  lines.push(`- Cycles: ${report.cycle.cycles}`);
  lines.push("");
  if (report.manifest) {
    lines.push("## SVG Manifest");
    lines.push("");
    lines.push(formatManifestMarkdown(report.manifest));
    lines.push("");
  }
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

async function writeReport(report: PenCycleReport, markdown: boolean): Promise<string> {
  const outputDir = path.join(process.cwd(), "artifacts", "plotter");
  await fs.mkdir(outputDir, { recursive: true });
  const stamp = report.generatedAt.replace(/[:.]/g, "-");
  const ext = markdown ? "md" : "json";
  const outputPath = path.join(outputDir, `pen-cycle-${stamp}.${ext}`);
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
  await sleep(650);
  return response;
}

async function runLiveCycle(report: PenCycleReport): Promise<PenCycleReport> {
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

  if (args.markdown && !args.live) {
    console.log(formatMarkdown(report));
    return;
  }

  if (args.live) {
    const liveReport = await runLiveCycle(report);
    if (args.markdown) {
      console.log(formatMarkdown(liveReport));
      return;
    }
    console.log(JSON.stringify(liveReport, null, 2));
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
  buildPenCycleCommands,
  buildReport as buildPenCycleReport,
  formatMarkdown as formatPenCycleMarkdown,
  writeReport as writePenCycleReport
};

export type { PenCycleCommand, PenCycleReport };
