import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { SerialPort } from "serialport";

const execFileAsync = promisify(execFile);

type CliArgs = {
  write: boolean;
  markdown: boolean;
  queryDevice: boolean;
  port?: string;
};

type SerialDevice = {
  path: string;
  basename: string;
  kind: "cu" | "tty";
};

type UsbCandidate = {
  productName?: string;
  vendorId?: string;
  productId?: string;
  serialNumber?: string;
  locationId?: string;
  matchedDrawCoreVidPid: boolean;
};

type ProbeReport = {
  generatedAt: string;
  safety: {
    opensSerialPorts: boolean;
    sendsDeviceCommands: boolean;
    allowedCommands: string[];
  };
  serialDevices: SerialDevice[];
  likelyPlotterDevices: SerialDevice[];
  usbCandidates: UsbCandidate[];
  serialQuery?: SerialQueryReport;
  notes: string[];
};

type SerialQueryReport = {
  port: string;
  baudRate: 115200;
  opened: boolean;
  commands: SerialCommandReport[];
  error?: string;
};

type SerialCommandReport = {
  label: string;
  command: string;
  motionRisk: "none";
  response: string;
  responseLines: string[];
  firmwareVersion?: string;
  status?: DrawCoreStatus;
};

type DrawCoreStatus = {
  rawLine: string;
  state: string;
  fields: Record<string, string>;
  machinePosition?: AxisTriple;
  workCoordinateOffset?: AxisTriple;
  feedSpindle?: {
    feed: number;
    spindle: number;
  };
  pinFlags?: string;
  overrides?: {
    feed: number;
    rapid: number;
    spindle: number;
  };
};

type AxisTriple = {
  x: number;
  y: number;
  z: number;
};

const DRAWCORE_VID_PID = new Set(["1A86:7523", "1A86:8040"]);
const SAFE_QUERY_COMMANDS = [
  { label: "firmwareVersion", command: "V\r" },
  { label: "status", command: "?\r" }
] as const;

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const portIndex = args.indexOf("--port");
  return {
    write: args.includes("--write"),
    markdown: args.includes("--markdown"),
    queryDevice: args.includes("--query-device"),
    port:
      portIndex >= 0 && args[portIndex + 1] && !args[portIndex + 1].startsWith("--")
        ? args[portIndex + 1]
        : undefined
  };
}

async function listSerialDevices(): Promise<SerialDevice[]> {
  const devEntries = await fs.readdir("/dev");
  return devEntries
    .filter((entry) => entry.startsWith("cu.") || entry.startsWith("tty."))
    .sort()
    .map((entry) => ({
      path: path.join("/dev", entry),
      basename: entry,
      kind: entry.startsWith("cu.") ? "cu" : "tty"
    }));
}

function parseUsbCandidates(ioreg: string): UsbCandidate[] {
  const lines = ioreg.split(/\r?\n/);
  const candidates: UsbCandidate[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes("USB CDC-Serial")) continue;

    const context = lines.slice(Math.max(0, i - 25), i + 35).join("\n");
    const productName = matchString(context, /"USB Product Name"\s*=\s*"([^"]+)"/);
    const productId = matchNumber(context, /"idProduct"\s*=\s*(\d+)/);
    const vendorId = matchNumber(context, /"idVendor"\s*=\s*(\d+)/);
    const serialNumber =
      matchString(context, /"kUSBSerialNumberString"\s*=\s*"([^"]+)"/) ??
      matchString(context, /"USB Serial Number"\s*=\s*"([^"]+)"/);
    const locationId = matchNumber(context, /"locationID"\s*=\s*(\d+)/);

    const vidPid =
      vendorId && productId
        ? `${Number(vendorId).toString(16).toUpperCase()}:${Number(productId)
            .toString(16)
            .toUpperCase()}`
        : undefined;

    candidates.push({
      productName,
      vendorId: vendorId ? toHexId(vendorId) : undefined,
      productId: productId ? toHexId(productId) : undefined,
      serialNumber,
      locationId,
      matchedDrawCoreVidPid: vidPid ? DRAWCORE_VID_PID.has(vidPid) : false
    });
  }

  return dedupeUsbCandidates(candidates);
}

function matchString(input: string, regex: RegExp): string | undefined {
  return input.match(regex)?.[1];
}

function matchNumber(input: string, regex: RegExp): string | undefined {
  return input.match(regex)?.[1];
}

function toHexId(decimalString: string): string {
  return `0x${Number(decimalString).toString(16).toUpperCase().padStart(4, "0")}`;
}

function dedupeUsbCandidates(candidates: UsbCandidate[]): UsbCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = [
      candidate.productName,
      candidate.vendorId,
      candidate.productId,
      candidate.serialNumber
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findLikelyPlotterDevices(
  serialDevices: SerialDevice[],
  usbCandidates: UsbCandidate[]
): SerialDevice[] {
  const serialHints = usbCandidates
    .filter((candidate) => candidate.matchedDrawCoreVidPid)
    .map((candidate) => candidate.serialNumber)
    .filter((value): value is string => Boolean(value));

  return serialDevices.filter((device) => {
    const basename = device.basename.toLowerCase();
    if (basename.includes("usbmodem")) return true;
    if (basename.includes("wch") || basename.includes("ch34")) return true;
    return serialHints.some((hint) => basename.includes(hint.toLowerCase()));
  });
}

async function buildReport(args: CliArgs): Promise<ProbeReport> {
  const serialDevices = await listSerialDevices();
  const { stdout } = await execFileAsync("ioreg", ["-p", "IOUSB", "-l", "-w0"], {
    maxBuffer: 10 * 1024 * 1024
  });
  const usbCandidates = parseUsbCandidates(stdout);
  const likelyPlotterDevices = findLikelyPlotterDevices(serialDevices, usbCandidates);
  const queryPort =
    args.port ?? likelyPlotterDevices.find((device) => device.kind === "cu")?.path;

  const report: ProbeReport = {
    generatedAt: new Date().toISOString(),
    safety: {
      opensSerialPorts: args.queryDevice,
      sendsDeviceCommands: args.queryDevice,
      allowedCommands: args.queryDevice
        ? SAFE_QUERY_COMMANDS.map((item) => commandForHumans(item.command))
        : []
    },
    serialDevices,
    likelyPlotterDevices,
    usbCandidates,
    notes: [
      args.queryDevice
        ? "This probe opened the selected serial port and sent only no-motion query commands."
        : "This probe only inspects /dev and macOS USB registry output.",
      "DrawCore VID/PID matches are based on the installed iDraw 2.0 driver search list: 1A86:7523 and 1A86:8040.",
      "Use /dev/cu.* paths for outbound serial connections on macOS when we add explicit serial queries."
    ]
  };

  if (args.queryDevice) {
    if (!queryPort) {
      report.serialQuery = {
        port: "unresolved",
        baudRate: 115200,
        opened: false,
        commands: [],
        error: "No serial port was provided and no likely /dev/cu.* plotter device was found."
      };
    } else {
      report.serialQuery = await queryDevice(queryPort);
    }
  }

  return report;
}

function formatMarkdown(report: ProbeReport): string {
  const lines: string[] = [];
  lines.push("# Plotter Probe Report");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");
  lines.push("## Safety");
  lines.push("");
  lines.push(`- Opens serial ports: ${report.safety.opensSerialPorts}`);
  lines.push(`- Sends device commands: ${report.safety.sendsDeviceCommands}`);
  if (report.safety.allowedCommands.length) {
    lines.push(`- Allowed commands: ${report.safety.allowedCommands.join(", ")}`);
  }
  lines.push("");
  lines.push("## Likely Plotter Devices");
  lines.push("");
  if (report.likelyPlotterDevices.length) {
    report.likelyPlotterDevices.forEach((device) => {
      lines.push(`- ${device.path}`);
    });
  } else {
    lines.push("- None found");
  }
  lines.push("");
  lines.push("## USB Candidates");
  lines.push("");
  if (report.usbCandidates.length) {
    report.usbCandidates.forEach((candidate) => {
      lines.push(
        `- product=${candidate.productName ?? "unknown"} vendor=${candidate.vendorId ?? "unknown"} productId=${candidate.productId ?? "unknown"} serial=${candidate.serialNumber ?? "unknown"} drawCoreMatch=${candidate.matchedDrawCoreVidPid}`
      );
    });
  } else {
    lines.push("- None found");
  }
  lines.push("");
  if (report.serialQuery) {
    lines.push("## Serial Query");
    lines.push("");
    lines.push(`- Port: ${report.serialQuery.port}`);
    lines.push(`- Baud rate: ${report.serialQuery.baudRate}`);
    lines.push(`- Opened: ${report.serialQuery.opened}`);
    if (report.serialQuery.error) {
      lines.push(`- Error: ${report.serialQuery.error}`);
    }
    report.serialQuery.commands.forEach((command) => {
      lines.push("");
      lines.push(`### ${command.label}`);
      lines.push("");
      lines.push(`- Command: ${commandForHumans(command.command)}`);
      lines.push(`- Motion risk: ${command.motionRisk}`);
      if (command.firmwareVersion) {
        lines.push(`- Firmware version: ${command.firmwareVersion}`);
      }
      if (command.status) {
        lines.push(`- State: ${command.status.state}`);
        if (command.status.machinePosition) {
          lines.push(`- Machine position: ${formatAxisTriple(command.status.machinePosition)} mm`);
        }
        if (command.status.feedSpindle) {
          lines.push(
            `- Feed/spindle: ${command.status.feedSpindle.feed}, ${command.status.feedSpindle.spindle}`
          );
        }
        if (command.status.pinFlags) {
          lines.push(`- Pin flags: ${command.status.pinFlags}`);
        }
        if (command.status.workCoordinateOffset) {
          lines.push(
            `- Work coordinate offset: ${formatAxisTriple(command.status.workCoordinateOffset)} mm`
          );
        }
        if (command.status.overrides) {
          lines.push(
            `- Overrides: feed ${command.status.overrides.feed}, rapid ${command.status.overrides.rapid}, spindle ${command.status.overrides.spindle}`
          );
        }
      }
      lines.push("- Response:");
      lines.push("");
      lines.push("```text");
      lines.push(responseForMarkdown(command.response) || "(empty)");
      lines.push("```");
    });
    lines.push("");
  }
  lines.push("## Notes");
  lines.push("");
  report.notes.forEach((note) => lines.push(`- ${note}`));
  return lines.join("\n");
}

async function writeReport(report: ProbeReport, markdown: boolean): Promise<string> {
  const outputDir = path.join(process.cwd(), "artifacts", "plotter");
  await fs.mkdir(outputDir, { recursive: true });
  const stamp = report.generatedAt.replace(/[:.]/g, "-");
  const ext = markdown ? "md" : "json";
  const outputPath = path.join(outputDir, `device-probe-${stamp}.${ext}`);
  const content = markdown
    ? formatMarkdown(report)
    : `${JSON.stringify(report, null, 2)}\n`;
  await fs.writeFile(outputPath, content, "utf-8");
  return outputPath;
}

async function main() {
  const args = parseArgs();
  const report = await buildReport(args);

  if (args.write) {
    const outputPath = await writeReport(report, args.markdown);
    console.log(outputPath);
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

async function queryDevice(portPath: string): Promise<SerialQueryReport> {
  const serialQuery: SerialQueryReport = {
    port: portPath,
    baudRate: 115200,
    opened: false,
    commands: []
  };
  const port = new SerialPort({
    path: portPath,
    baudRate: 115200,
    autoOpen: false
  });

  try {
    await openSerialPort(port);
    serialQuery.opened = true;
    await setSerialControlLines(port);
    await flushSerialPort(port);

    for (const safeCommand of SAFE_QUERY_COMMANDS) {
      const response = await sendQueryCommand(port, safeCommand.command);
      const responseLines = response
        .split(/\r?\n/)
        .map((line) => line.trimEnd())
        .filter(Boolean);
      serialQuery.commands.push({
        label: safeCommand.label,
        command: safeCommand.command,
        motionRisk: "none",
        response,
        responseLines,
        firmwareVersion:
          safeCommand.label === "firmwareVersion"
            ? parseFirmwareVersion(responseLines)
            : undefined,
        status: safeCommand.label === "status" ? parseDrawCoreStatus(responseLines) : undefined
      });
    }
  } catch (error) {
    serialQuery.error = error instanceof Error ? error.message : String(error);
  } finally {
    await closeSerialPort(port);
  }

  return serialQuery;
}

async function openSerialPort(port: SerialPort): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    port.open((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function setSerialControlLines(port: SerialPort): Promise<void> {
  await new Promise<void>((resolve) => {
    port.set({ dtr: false, rts: false }, () => resolve());
  });
}

async function flushSerialPort(port: SerialPort): Promise<void> {
  await new Promise<void>((resolve) => {
    port.flush(() => resolve());
  });
}

async function closeSerialPort(port: SerialPort): Promise<void> {
  if (!port.isOpen) return;
  await new Promise<void>((resolve) => {
    port.close(() => resolve());
  });
}

async function sendQueryCommand(port: SerialPort, command: string): Promise<string> {
  let response = "";
  const onData = (chunk: Buffer) => {
    response += chunk.toString("utf-8");
  };

  port.on("data", onData);
  try {
    await new Promise<void>((resolve, reject) => {
      port.write(command, "ascii", (writeError) => {
        if (writeError) {
          reject(writeError);
          return;
        }
        port.drain((drainError) => {
          if (drainError) reject(drainError);
          else resolve();
        });
      });
    });
    await sleep(600);
    return response;
  } finally {
    port.off("data", onData);
  }
}

function parseFirmwareVersion(responseLines: string[]): string | undefined {
  return responseLines.find((line) => line.startsWith("DrawCore V"))?.trim();
}

function parseDrawCoreStatus(responseLines: string[]): DrawCoreStatus | undefined {
  const statusLine = responseLines.find((line) => line.startsWith("<") && line.endsWith(">"));
  if (!statusLine) return undefined;

  const [state, ...fieldParts] = statusLine.slice(1, -1).split("|");
  const fields: Record<string, string> = {};

  fieldParts.forEach((fieldPart) => {
    const separator = fieldPart.indexOf(":");
    if (separator < 0) return;
    fields[fieldPart.slice(0, separator)] = fieldPart.slice(separator + 1);
  });

  return {
    rawLine: statusLine,
    state,
    fields,
    machinePosition: parseAxisTriple(fields.MPos),
    workCoordinateOffset: parseAxisTriple(fields.WCO),
    feedSpindle: parsePair(fields.FS, "feed", "spindle"),
    pinFlags: fields.Pn,
    overrides: parseOverrides(fields.Ov)
  };
}

function parseAxisTriple(value: string | undefined): AxisTriple | undefined {
  const values = parseNumberList(value, 3);
  if (!values) return undefined;
  return {
    x: values[0],
    y: values[1],
    z: values[2]
  };
}

function parsePair<K1 extends string, K2 extends string>(
  value: string | undefined,
  firstKey: K1,
  secondKey: K2
): Record<K1 | K2, number> | undefined {
  const values = parseNumberList(value, 2);
  if (!values) return undefined;
  return {
    [firstKey]: values[0],
    [secondKey]: values[1]
  } as Record<K1 | K2, number>;
}

function parseOverrides(value: string | undefined): DrawCoreStatus["overrides"] | undefined {
  const values = parseNumberList(value, 3);
  if (!values) return undefined;
  return {
    feed: values[0],
    rapid: values[1],
    spindle: values[2]
  };
}

function parseNumberList(value: string | undefined, expectedLength: number): number[] | undefined {
  if (!value) return undefined;
  const values = value.split(",").map(Number);
  if (values.length !== expectedLength || values.some((item) => Number.isNaN(item))) {
    return undefined;
  }
  return values;
}

function formatAxisTriple(value: AxisTriple): string {
  return `X ${value.x.toFixed(3)}, Y ${value.y.toFixed(3)}, Z ${value.z.toFixed(3)}`;
}

function commandForHumans(command: string): string {
  const commandBody = command.replace(/[\r\n]/g, "");
  const terminators: string[] = [];
  if (command.includes("\r")) terminators.push("CR");
  if (command.includes("\n")) terminators.push("LF");
  return terminators.length ? `${commandBody} + ${terminators.join(" + ")}` : commandBody;
}

function responseForMarkdown(response: string): string {
  return response.trimEnd().replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export {
  buildReport as buildProbeReport,
  commandForHumans,
  formatMarkdown as formatProbeMarkdown,
  queryDevice,
  writeReport as writeProbeReport
};

export type {
  AxisTriple,
  DrawCoreStatus,
  ProbeReport,
  SerialCommandReport,
  SerialDevice,
  SerialQueryReport,
  UsbCandidate
};
