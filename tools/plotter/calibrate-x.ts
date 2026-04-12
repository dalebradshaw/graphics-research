import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SerialPort } from "serialport";

import { buildProbeReport, formatProbeMarkdown } from "./probe.js";

type CliArgs = {
  port?: string;
  markdown: boolean;
  write: boolean;
  live: boolean;
  force: boolean;
  axis: "x" | "y";
  penUpZ: number;
  feedMmPerMin: number;
  stepMm: number;
  steps: number;
  direction: "positive" | "negative";
};

type CalibrationCommand = {
  label: string;
  command: string;
  response?: string;
};

type CalibrationReport = {
  generatedAt: string;
  safety: {
    opensSerialPorts: boolean;
    sendsDeviceCommands: boolean;
    armedMotion: boolean;
  };
  port: string;
  axis: "x" | "y";
  penUpZ: number;
  feedMmPerMin: number;
  stepMm: number;
  steps: number;
  direction: "positive" | "negative";
  probe: Awaited<ReturnType<typeof buildProbeReport>>;
  commands: CalibrationCommand[];
  notes: string[];
};

const DEFAULT_PEN_UP_Z = 6;
const DEFAULT_FEED_MM_PER_MIN = 240;
const DEFAULT_STEP_MM = 5;
const DEFAULT_STEPS = 40;
const DEFAULT_DIRECTION: "positive" | "negative" = "positive";
const DEFAULT_AXIS: "x" | "y" = "x";

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const getValue = (flag: string): string | undefined => {
    const index = args.indexOf(flag);
    if (index < 0) return undefined;
    const value = args[index + 1];
    return value && !value.startsWith("--") ? value : undefined;
  };

  const direction = getValue("--direction");
  if (direction && direction !== "positive" && direction !== "negative") {
    throw new Error("Provide --direction positive or negative.");
  }

  const axis = getValue("--axis");
  if (axis && axis !== "x" && axis !== "y") {
    throw new Error("Provide --axis x or --axis y.");
  }

  return {
    port: getValue("--port"),
    markdown: args.includes("--markdown"),
    write: args.includes("--write"),
    live: args.includes("--live"),
    force: args.includes("--force"),
    axis: (axis as CliArgs["axis"]) ?? DEFAULT_AXIS,
    penUpZ: Number(getValue("--pen-up-z") ?? DEFAULT_PEN_UP_Z),
    feedMmPerMin: Number(getValue("--feed") ?? DEFAULT_FEED_MM_PER_MIN),
    stepMm: Number(getValue("--step-mm") ?? DEFAULT_STEP_MM),
    steps: Number(getValue("--steps") ?? DEFAULT_STEPS),
    direction: (direction as CliArgs["direction"]) ?? DEFAULT_DIRECTION
  };
}

function buildCalibrationCommands(options: {
  axis: "x" | "y";
  penUpZ: number;
  feedMmPerMin: number;
  stepMm: number;
  steps: number;
  direction: "positive" | "negative";
}): CalibrationCommand[] {
  const signedStep = options.direction === "positive" ? options.stepMm : -options.stepMm;
  const axis = options.axis.toUpperCase();
  const commands: CalibrationCommand[] = [
    { label: "units", command: "G21" },
    { label: "absolute", command: "G90" },
    { label: "pen-up", command: `G0 Z${formatNumber(options.penUpZ)}` },
    { label: "relative", command: "G91" }
  ];

  for (let index = 0; index < options.steps; index++) {
    commands.push({
      label: `${options.axis}-jog-${index + 1}`,
      command: `G1 ${axis}${formatNumber(signedStep)} F${formatNumber(options.feedMmPerMin)}`
    });
  }

  commands.push({ label: "absolute-final", command: "G90" });
  return commands;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function formatCommandForLog(command: string): string {
  return command.replace(/\s+/g, " ").trim();
}

async function buildReport(args: CliArgs): Promise<CalibrationReport> {
  const probe = await buildProbeReport({
    write: false,
    markdown: false,
    queryDevice: false
  });
  const port = args.port ?? probe.likelyPlotterDevices.find((device) => device.kind === "cu")?.path;
  if (!port) {
    throw new Error("No serial port was provided and no likely /dev/cu.* plotter device was found.");
  }

  const commands = buildCalibrationCommands({
    axis: args.axis,
    penUpZ: args.penUpZ,
    feedMmPerMin: args.feedMmPerMin,
    stepMm: args.stepMm,
    steps: args.steps,
    direction: args.direction
  });

  return {
    generatedAt: new Date().toISOString(),
    safety: {
      opensSerialPorts: args.live,
      sendsDeviceCommands: args.live,
      armedMotion: args.live
    },
    port,
    axis: args.axis,
    penUpZ: args.penUpZ,
    feedMmPerMin: args.feedMmPerMin,
    stepMm: args.stepMm,
    steps: args.steps,
    direction: args.direction,
    probe,
    commands,
    notes: [
      "This command retracts the pen before any axis movement.",
      "It uses small relative jogs so calibration can stop at a physical hard limit.",
      "Use the machine observer to stop the run once the intended home edge is reached."
    ]
  };
}

function formatMarkdown(report: CalibrationReport): string {
  const lines: string[] = [];
  lines.push(`# Plotter ${report.axis.toUpperCase()} Calibration`);
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");
  lines.push("## Safety");
  lines.push("");
  lines.push(`- Opens serial ports: ${report.safety.opensSerialPorts}`);
  lines.push(`- Sends device commands: ${report.safety.sendsDeviceCommands}`);
  lines.push(`- Armed motion: ${report.safety.armedMotion}`);
  lines.push("");
  lines.push("## Calibration");
  lines.push("");
  lines.push(`- Port: ${report.port}`);
  lines.push(`- Axis: ${report.axis.toUpperCase()}`);
  lines.push(`- Pen up Z: ${report.penUpZ}`);
  lines.push(`- Feed: ${report.feedMmPerMin} mm/min`);
  lines.push(`- Step: ${report.stepMm} mm`);
  lines.push(`- Steps: ${report.steps}`);
  lines.push(`- Direction: ${report.direction}`);
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

async function writeReport(report: CalibrationReport, markdown: boolean): Promise<string> {
  const outputDir = path.join(process.cwd(), "artifacts", "plotter");
  await fs.mkdir(outputDir, { recursive: true });
  const stamp = report.generatedAt.replace(/[:.]/g, "-");
  const ext = markdown ? "md" : "json";
  const outputPath = path.join(outputDir, `${report.axis}-calibration-${stamp}.${ext}`);
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

async function runLiveCalibration(report: CalibrationReport): Promise<CalibrationReport> {
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
    const liveReport = await runLiveCalibration(report);
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
  buildCalibrationCommands,
  buildReport as buildXCalibrationReport,
  formatMarkdown as formatXCalibrationMarkdown,
  writeReport as writeXCalibrationReport
};

export type { CalibrationCommand, CalibrationReport };
