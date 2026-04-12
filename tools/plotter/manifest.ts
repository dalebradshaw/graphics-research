import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { XMLParser } from "fast-xml-parser";

type CliArgs = {
  svgPath?: string;
  write: boolean;
  markdown: boolean;
  outPath?: string;
};

type SvgLength = {
  raw?: string;
  value: number;
  unit: string;
  mm: number;
};

type ViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Point = {
  x: number;
  y: number;
};

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

type Matrix = [number, number, number, number, number, number];

type Segment = {
  from: Point;
  to: Point;
  source: string;
};

type ShapeReport = {
  type: string;
  id?: string;
  segmentCount: number;
  drawDistanceMm: number;
  boundsMm?: Bounds;
  warnings: string[];
};

type UnsupportedFeature = {
  feature: string;
  count: number;
  examples: string[];
};

type ManifestReport = {
  generatedAt: string;
  sourceSvg: string;
  safety: {
    opensSerialPorts: false;
    sendsDeviceCommands: false;
    motion: false;
  };
  deviceProfile: {
    name: "Writing Robot T-A4 DrawCore";
    workingAreaMm: {
      width: 300;
      height: 210;
    };
    origin: "unresolved-svg-coordinate-space";
  };
  svg: {
    width?: SvgLength;
    height?: SvgLength;
    viewBox?: ViewBox;
    coordinateMapping: string;
  };
  geometry: {
    shapeCount: number;
    segmentCount: number;
    penLiftCount: number;
    drawDistanceMm: number;
    travelDistanceMm: number;
    boundsMm?: Bounds;
    outOfBounds: boolean;
  };
  shapes: ShapeReport[];
  toolpath: Array<{
    from: Point;
    to: Point;
    source: string;
  }>;
  unsupportedFeatures: UnsupportedFeature[];
  warnings: string[];
  nextSteps: string[];
};

type SvgContext = {
  matrix: Matrix;
  svgToMm: (point: Point) => Point;
};

type SvgDocumentInfo = {
  width?: SvgLength;
  height?: SvgLength;
  viewBox?: ViewBox;
  coordinateMapping: string;
  svgToMm: (point: Point) => Point;
};

type PathCursor = {
  current: Point;
  subpathStart: Point;
  lastCubicControl?: Point;
  lastQuadraticControl?: Point;
  activeCommand?: string;
};

type ParsedPath = {
  segments: Segment[];
  warnings: string[];
  unsupportedCommands: string[];
};

const DEVICE_WIDTH_MM = 300;
const DEVICE_HEIGHT_MM = 210;
const PX_TO_MM = 25.4 / 96;
const IDENTITY_MATRIX: Matrix = [1, 0, 0, 1, 0, 0];
const XML_ATTRIBUTE_PREFIX = "@_";
const PATH_FLATTEN_STEPS = 16;
const ELLIPSE_SEGMENTS = 64;

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const svgFlagIndex = args.indexOf("--svg");
  const outFlagIndex = args.indexOf("--out");
  const positionalSvg = args.find((arg) => !arg.startsWith("--"));

  return {
    svgPath:
      svgFlagIndex >= 0 && args[svgFlagIndex + 1] && !args[svgFlagIndex + 1].startsWith("--")
        ? args[svgFlagIndex + 1]
        : positionalSvg,
    write: args.includes("--write"),
    markdown: args.includes("--markdown"),
    outPath:
      outFlagIndex >= 0 && args[outFlagIndex + 1] && !args[outFlagIndex + 1].startsWith("--")
        ? args[outFlagIndex + 1]
        : undefined
  };
}

async function main() {
  const args = parseArgs();
  if (!args.svgPath) {
    throw new Error("Provide an SVG path with --svg <path> or as the first positional argument.");
  }

  const report = await buildManifestReport(args.svgPath);

  if (args.write) {
    const outputPath = await writeManifestReport(report, args.markdown, args.outPath);
    console.log(outputPath);
    return;
  }

  if (args.markdown) {
    console.log(formatMarkdown(report));
    return;
  }

  console.log(`${JSON.stringify(report, null, 2)}\n`);
}

async function buildManifestReport(svgPath: string): Promise<ManifestReport> {
  const sourceSvg = path.resolve(svgPath);
  const svgText = await fs.readFile(sourceSvg, "utf-8");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: XML_ATTRIBUTE_PREFIX,
    parseAttributeValue: false,
    trimValues: false
  });
  const parsed = parser.parse(svgText) as Record<string, unknown>;
  const svgNode = parsed.svg;

  if (!isRecord(svgNode)) {
    throw new Error(`Could not find an <svg> root in ${sourceSvg}.`);
  }

  const documentInfo = buildSvgDocumentInfo(svgNode);
  const unsupported = new Map<string, UnsupportedFeature>();
  const warnings: string[] = [];
  const shapes: ShapeReport[] = [];
  const allSegments: Segment[] = [];
  const rootContext: SvgContext = {
    matrix: parseTransform(getStringAttr(svgNode, "transform")),
    svgToMm: documentInfo.svgToMm
  };

  collectUnsupportedFeatures(svgNode, unsupported);
  walkSvgNode(svgNode, rootContext, allSegments, shapes, unsupported, warnings);

  const boundsMm = boundsForSegments(allSegments);
  const drawDistanceMm = sumSegmentLengths(allSegments);
  const travelDistanceMm = sumTravelDistance(allSegments);
  const outOfBounds = boundsMm ? isOutOfBounds(boundsMm) : false;

  if (!allSegments.length) {
    warnings.push("No drawable line segments were found.");
  }
  if (outOfBounds && boundsMm) {
    warnings.push(
      `Geometry bounds ${formatBounds(boundsMm)} exceed the current Writing Robot T-A4 working area ${DEVICE_WIDTH_MM} x ${DEVICE_HEIGHT_MM} mm.`
    );
  }
  if (unsupported.size) {
    warnings.push("Unsupported SVG features were detected; review before plotting.");
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceSvg,
    safety: {
      opensSerialPorts: false,
      sendsDeviceCommands: false,
      motion: false
    },
    deviceProfile: {
      name: "Writing Robot T-A4 DrawCore",
      workingAreaMm: {
        width: DEVICE_WIDTH_MM,
        height: DEVICE_HEIGHT_MM
      },
      origin: "unresolved-svg-coordinate-space"
    },
    svg: {
      width: documentInfo.width,
      height: documentInfo.height,
      viewBox: documentInfo.viewBox,
      coordinateMapping: documentInfo.coordinateMapping
    },
    geometry: {
      shapeCount: shapes.length,
      segmentCount: allSegments.length,
      penLiftCount: countPenLifts(allSegments),
      drawDistanceMm,
      travelDistanceMm,
      boundsMm,
      outOfBounds
    },
    shapes,
    toolpath: allSegments,
    unsupportedFeatures: Array.from(unsupported.values()),
    warnings,
    nextSteps: [
      "Confirm origin convention before converting manifest geometry into machine moves.",
      "Review unsupported SVG features and convert text/images/fills to explicit paths where needed.",
      "Keep real motion behind a separate armed command after dry-run reports are stable."
    ]
  };
}

function buildSvgDocumentInfo(svgNode: Record<string, unknown>): SvgDocumentInfo {
  const width = parseSvgLength(getStringAttr(svgNode, "width"));
  const height = parseSvgLength(getStringAttr(svgNode, "height"));
  const viewBox = parseViewBox(getStringAttr(svgNode, "viewBox"));

  if (viewBox && width && height) {
    const scaleX = width.mm / viewBox.width;
    const scaleY = height.mm / viewBox.height;
    return {
      width,
      height,
      viewBox,
      coordinateMapping: "viewBox scaled into declared page size",
      svgToMm: (point) => ({
        x: (point.x - viewBox.x) * scaleX,
        y: (point.y - viewBox.y) * scaleY
      })
    };
  }

  if (width && height && isAbsoluteUnit(width.unit) && width.unit === height.unit) {
    const scale = unitToMm(width.unit);
    return {
      width,
      height,
      viewBox,
      coordinateMapping: `no viewBox; assuming SVG user units are ${width.unit}`,
      svgToMm: (point) => ({
        x: point.x * scale,
        y: point.y * scale
      })
    };
  }

  return {
    width,
    height,
    viewBox,
    coordinateMapping: "no usable viewBox/page unit mapping; assuming 96 CSS px per inch",
    svgToMm: (point) => ({
      x: point.x * PX_TO_MM,
      y: point.y * PX_TO_MM
    })
  };
}

function walkSvgNode(
  node: Record<string, unknown>,
  context: SvgContext,
  allSegments: Segment[],
  shapes: ShapeReport[],
  unsupported: Map<string, UnsupportedFeature>,
  warnings: string[]
) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith(XML_ATTRIBUTE_PREFIX) || key === "#text") continue;

    const children = Array.isArray(value) ? value : [value];
    for (const child of children) {
      if (!isRecord(child)) continue;

      const childContext = {
        ...context,
        matrix: multiplyMatrices(context.matrix, parseTransform(getStringAttr(child, "transform")))
      };

      const shapeSegments = collectShapeSegments(key, child, childContext, unsupported, warnings);
      if (shapeSegments) {
        const boundsMm = boundsForSegments(shapeSegments);
        const drawDistanceMm = sumSegmentLengths(shapeSegments);
        allSegments.push(...shapeSegments);
        shapes.push({
          type: key,
          id: getStringAttr(child, "id"),
          segmentCount: shapeSegments.length,
          drawDistanceMm,
          boundsMm,
          warnings: []
        });
      }

      walkSvgNode(child, childContext, allSegments, shapes, unsupported, warnings);
    }
  }
}

function collectShapeSegments(
  tagName: string,
  node: Record<string, unknown>,
  context: SvgContext,
  unsupported: Map<string, UnsupportedFeature>,
  warnings: string[]
): Segment[] | undefined {
  switch (tagName) {
    case "path":
      reportUnsupportedFill(tagName, node, unsupported);
      return collectPathSegments(node, context, unsupported, warnings);
    case "line":
      return collectLineSegments(node, context);
    case "polyline":
      return collectPolylineSegments(node, context, false);
    case "polygon":
      reportUnsupportedFill(tagName, node, unsupported);
      return collectPolylineSegments(node, context, true);
    case "rect":
      reportUnsupportedFill(tagName, node, unsupported);
      return collectRectSegments(node, context, unsupported);
    case "circle":
      reportUnsupportedFill(tagName, node, unsupported);
      return collectEllipseSegments(node, context, true);
    case "ellipse":
      reportUnsupportedFill(tagName, node, unsupported);
      return collectEllipseSegments(node, context, false);
    case "text":
    case "image":
    case "use":
      addUnsupported(unsupported, tagName, describeNode(tagName, node));
      return undefined;
    default:
      if (isPotentiallyDrawableContainer(tagName, node)) {
        warnings.push(`Skipping unsupported drawable element <${tagName}>.`);
        addUnsupported(unsupported, tagName, describeNode(tagName, node));
      }
      return undefined;
  }
}

function collectPathSegments(
  node: Record<string, unknown>,
  context: SvgContext,
  unsupported: Map<string, UnsupportedFeature>,
  warnings: string[]
): Segment[] | undefined {
  const d = getStringAttr(node, "d");
  if (!d) return undefined;
  const parsedPath = parsePathData(d);
  parsedPath.unsupportedCommands.forEach((command) => {
    addUnsupported(unsupported, `path command ${command}`, describeNode("path", node));
  });
  parsedPath.warnings.forEach((warning) => {
    warnings.push(`${describeNode("path", node)}: ${warning}`);
  });

  return parsedPath.segments.map((segment) => transformSegment(segment, context));
}

function collectLineSegments(node: Record<string, unknown>, context: SvgContext): Segment[] | undefined {
  const x1 = parseNumberAttr(node, "x1") ?? 0;
  const y1 = parseNumberAttr(node, "y1") ?? 0;
  const x2 = parseNumberAttr(node, "x2");
  const y2 = parseNumberAttr(node, "y2");
  if (x2 === undefined || y2 === undefined) return undefined;
  return [transformSegment({ from: { x: x1, y: y1 }, to: { x: x2, y: y2 }, source: "line" }, context)];
}

function collectPolylineSegments(
  node: Record<string, unknown>,
  context: SvgContext,
  closed: boolean
): Segment[] | undefined {
  const points = parsePoints(getStringAttr(node, "points"));
  if (points.length < 2) return undefined;
  const segments = segmentsFromPoints(points, closed, closed ? "polygon" : "polyline");
  return segments.map((segment) => transformSegment(segment, context));
}

function collectRectSegments(
  node: Record<string, unknown>,
  context: SvgContext,
  unsupported: Map<string, UnsupportedFeature>
): Segment[] | undefined {
  const x = parseNumberAttr(node, "x") ?? 0;
  const y = parseNumberAttr(node, "y") ?? 0;
  const width = parseNumberAttr(node, "width");
  const height = parseNumberAttr(node, "height");
  if (!width || !height) return undefined;

  const rx = parseNumberAttr(node, "rx") ?? 0;
  const ry = parseNumberAttr(node, "ry") ?? 0;
  if (rx > 0 || ry > 0) {
    addUnsupported(unsupported, "rounded rect", describeNode("rect", node));
  }

  const points = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height }
  ];
  return segmentsFromPoints(points, true, "rect").map((segment) => transformSegment(segment, context));
}

function collectEllipseSegments(
  node: Record<string, unknown>,
  context: SvgContext,
  circle: boolean
): Segment[] | undefined {
  const cx = parseNumberAttr(node, "cx") ?? 0;
  const cy = parseNumberAttr(node, "cy") ?? 0;
  const rx = circle ? parseNumberAttr(node, "r") : parseNumberAttr(node, "rx");
  const ry = circle ? rx : parseNumberAttr(node, "ry");
  if (!rx || !ry) return undefined;

  const points: Point[] = [];
  for (let index = 0; index < ELLIPSE_SEGMENTS; index++) {
    const theta = (index / ELLIPSE_SEGMENTS) * Math.PI * 2;
    points.push({
      x: cx + Math.cos(theta) * rx,
      y: cy + Math.sin(theta) * ry
    });
  }

  return segmentsFromPoints(points, true, circle ? "circle" : "ellipse").map((segment) =>
    transformSegment(segment, context)
  );
}

function parsePathData(pathData: string): ParsedPath {
  const tokens = tokenizePathData(pathData);
  const cursor: PathCursor = {
    current: { x: 0, y: 0 },
    subpathStart: { x: 0, y: 0 }
  };
  const segments: Segment[] = [];
  const warnings: string[] = [];
  const unsupportedCommands: string[] = [];
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index];
    let command = isPathCommand(token) ? token : cursor.activeCommand;
    if (!command) {
      warnings.push(`Ignoring path token before command: ${token}`);
      index++;
      continue;
    }
    if (isPathCommand(token)) {
      index++;
      if (command !== "Z" && command !== "z") {
        cursor.activeCommand = command;
      }
    }

    const relative = command === command.toLowerCase();
    const upper = command.toUpperCase();

    if (upper === "Z") {
      pushLineSegment(segments, cursor.current, cursor.subpathStart, "Z");
      cursor.current = { ...cursor.subpathStart };
      cursor.lastCubicControl = undefined;
      cursor.lastQuadraticControl = undefined;
      continue;
    }

    if (upper === "M") {
      const first = readPoint(tokens, index, relative, cursor.current);
      if (!first) break;
      cursor.current = first.point;
      cursor.subpathStart = { ...cursor.current };
      index = first.nextIndex;
      cursor.activeCommand = relative ? "l" : "L";
      cursor.lastCubicControl = undefined;
      cursor.lastQuadraticControl = undefined;
      while (hasNumberPair(tokens, index)) {
        const next = readPoint(tokens, index, relative, cursor.current);
        if (!next) break;
        pushLineSegment(segments, cursor.current, next.point, "M-as-L");
        cursor.current = next.point;
        index = next.nextIndex;
      }
      continue;
    }

    if (upper === "L") {
      while (hasNumberPair(tokens, index)) {
        const next = readPoint(tokens, index, relative, cursor.current);
        if (!next) break;
        pushLineSegment(segments, cursor.current, next.point, "L");
        cursor.current = next.point;
        index = next.nextIndex;
      }
      cursor.lastCubicControl = undefined;
      cursor.lastQuadraticControl = undefined;
      continue;
    }

    if (upper === "H") {
      while (hasNumber(tokens, index)) {
        const rawX = Number(tokens[index]);
        const next = { x: relative ? cursor.current.x + rawX : rawX, y: cursor.current.y };
        pushLineSegment(segments, cursor.current, next, "H");
        cursor.current = next;
        index++;
      }
      cursor.lastCubicControl = undefined;
      cursor.lastQuadraticControl = undefined;
      continue;
    }

    if (upper === "V") {
      while (hasNumber(tokens, index)) {
        const rawY = Number(tokens[index]);
        const next = { x: cursor.current.x, y: relative ? cursor.current.y + rawY : rawY };
        pushLineSegment(segments, cursor.current, next, "V");
        cursor.current = next;
        index++;
      }
      cursor.lastCubicControl = undefined;
      cursor.lastQuadraticControl = undefined;
      continue;
    }

    if (upper === "C") {
      while (hasNumbers(tokens, index, 6)) {
        const c1 = pointFromValues(tokens, index, relative, cursor.current);
        const c2 = pointFromValues(tokens, index + 2, relative, cursor.current);
        const end = pointFromValues(tokens, index + 4, relative, cursor.current);
        pushCubicSegments(segments, cursor.current, c1, c2, end, "C");
        cursor.current = end;
        cursor.lastCubicControl = c2;
        cursor.lastQuadraticControl = undefined;
        index += 6;
      }
      continue;
    }

    if (upper === "S") {
      while (hasNumbers(tokens, index, 4)) {
        const c1 = cursor.lastCubicControl
          ? reflectPoint(cursor.lastCubicControl, cursor.current)
          : cursor.current;
        const c2 = pointFromValues(tokens, index, relative, cursor.current);
        const end = pointFromValues(tokens, index + 2, relative, cursor.current);
        pushCubicSegments(segments, cursor.current, c1, c2, end, "S");
        cursor.current = end;
        cursor.lastCubicControl = c2;
        cursor.lastQuadraticControl = undefined;
        index += 4;
      }
      continue;
    }

    if (upper === "Q") {
      while (hasNumbers(tokens, index, 4)) {
        const control = pointFromValues(tokens, index, relative, cursor.current);
        const end = pointFromValues(tokens, index + 2, relative, cursor.current);
        pushQuadraticSegments(segments, cursor.current, control, end, "Q");
        cursor.current = end;
        cursor.lastQuadraticControl = control;
        cursor.lastCubicControl = undefined;
        index += 4;
      }
      continue;
    }

    if (upper === "T") {
      while (hasNumbers(tokens, index, 2)) {
        const control = cursor.lastQuadraticControl
          ? reflectPoint(cursor.lastQuadraticControl, cursor.current)
          : cursor.current;
        const end = pointFromValues(tokens, index, relative, cursor.current);
        pushQuadraticSegments(segments, cursor.current, control, end, "T");
        cursor.current = end;
        cursor.lastQuadraticControl = control;
        cursor.lastCubicControl = undefined;
        index += 2;
      }
      continue;
    }

    if (upper === "A") {
      unsupportedCommands.push(command);
      warnings.push("Arc path commands are approximated as straight chords in this dry run.");
      while (hasNumbers(tokens, index, 7)) {
        const end = pointFromValues(tokens, index + 5, relative, cursor.current);
        pushLineSegment(segments, cursor.current, end, "A-chord");
        cursor.current = end;
        cursor.lastCubicControl = undefined;
        cursor.lastQuadraticControl = undefined;
        index += 7;
      }
      continue;
    }

    warnings.push(`Unsupported path command: ${command}`);
    unsupportedCommands.push(command);
    cursor.activeCommand = undefined;
  }

  return {
    segments,
    warnings,
    unsupportedCommands: Array.from(new Set(unsupportedCommands))
  };
}

function tokenizePathData(pathData: string): string[] {
  return (
    pathData.match(/[AaCcHhLlMmQqSsTtVvZz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? []
  );
}

function isPathCommand(token: string | undefined): token is string {
  return Boolean(token && /^[AaCcHhLlMmQqSsTtVvZz]$/.test(token));
}

function hasNumber(tokens: string[], index: number): boolean {
  return index < tokens.length && !isPathCommand(tokens[index]) && Number.isFinite(Number(tokens[index]));
}

function hasNumberPair(tokens: string[], index: number): boolean {
  return hasNumbers(tokens, index, 2);
}

function hasNumbers(tokens: string[], index: number, count: number): boolean {
  for (let offset = 0; offset < count; offset++) {
    if (!hasNumber(tokens, index + offset)) return false;
  }
  return true;
}

function readPoint(
  tokens: string[],
  index: number,
  relative: boolean,
  current: Point
): { point: Point; nextIndex: number } | undefined {
  if (!hasNumberPair(tokens, index)) return undefined;
  return {
    point: pointFromValues(tokens, index, relative, current),
    nextIndex: index + 2
  };
}

function pointFromValues(tokens: string[], index: number, relative: boolean, current: Point): Point {
  const x = Number(tokens[index]);
  const y = Number(tokens[index + 1]);
  return relative
    ? {
        x: current.x + x,
        y: current.y + y
      }
    : { x, y };
}

function pushLineSegment(segments: Segment[], from: Point, to: Point, source: string) {
  if (samePoint(from, to)) return;
  segments.push({
    from: { ...from },
    to: { ...to },
    source
  });
}

function pushCubicSegments(
  segments: Segment[],
  start: Point,
  c1: Point,
  c2: Point,
  end: Point,
  source: string
) {
  let previous = start;
  for (let step = 1; step <= PATH_FLATTEN_STEPS; step++) {
    const t = step / PATH_FLATTEN_STEPS;
    const next = cubicPoint(start, c1, c2, end, t);
    pushLineSegment(segments, previous, next, source);
    previous = next;
  }
}

function pushQuadraticSegments(
  segments: Segment[],
  start: Point,
  control: Point,
  end: Point,
  source: string
) {
  let previous = start;
  for (let step = 1; step <= PATH_FLATTEN_STEPS; step++) {
    const t = step / PATH_FLATTEN_STEPS;
    const next = quadraticPoint(start, control, end, t);
    pushLineSegment(segments, previous, next, source);
    previous = next;
  }
}

function cubicPoint(start: Point, c1: Point, c2: Point, end: Point, t: number): Point {
  const inverse = 1 - t;
  return {
    x:
      inverse ** 3 * start.x +
      3 * inverse ** 2 * t * c1.x +
      3 * inverse * t ** 2 * c2.x +
      t ** 3 * end.x,
    y:
      inverse ** 3 * start.y +
      3 * inverse ** 2 * t * c1.y +
      3 * inverse * t ** 2 * c2.y +
      t ** 3 * end.y
  };
}

function quadraticPoint(start: Point, control: Point, end: Point, t: number): Point {
  const inverse = 1 - t;
  return {
    x: inverse ** 2 * start.x + 2 * inverse * t * control.x + t ** 2 * end.x,
    y: inverse ** 2 * start.y + 2 * inverse * t * control.y + t ** 2 * end.y
  };
}

function reflectPoint(point: Point, around: Point): Point {
  return {
    x: around.x * 2 - point.x,
    y: around.y * 2 - point.y
  };
}

function segmentsFromPoints(points: Point[], closed: boolean, source: string): Segment[] {
  const segments: Segment[] = [];
  for (let index = 1; index < points.length; index++) {
    pushLineSegment(segments, points[index - 1], points[index], source);
  }
  if (closed && points.length > 2) {
    pushLineSegment(segments, points[points.length - 1], points[0], source);
  }
  return segments;
}

function transformSegment(segment: Segment, context: SvgContext): Segment {
  return {
    from: context.svgToMm(applyMatrix(context.matrix, segment.from)),
    to: context.svgToMm(applyMatrix(context.matrix, segment.to)),
    source: segment.source
  };
}

function parsePoints(value: string | undefined): Point[] {
  if (!value) return [];
  const numbers = value.match(/[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g)?.map(Number) ?? [];
  const points: Point[] = [];
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    points.push({ x: numbers[index], y: numbers[index + 1] });
  }
  return points;
}

function collectUnsupportedFeatures(
  node: Record<string, unknown>,
  unsupported: Map<string, UnsupportedFeature>
) {
  const unsupportedAttributes = ["clip-path", "mask", "filter"];
  unsupportedAttributes.forEach((attribute) => {
    if (getStringAttr(node, attribute)) {
      addUnsupported(unsupported, `attribute ${attribute}`, `attribute ${attribute}`);
    }
  });

  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith(XML_ATTRIBUTE_PREFIX) || key === "#text") continue;
    const children = Array.isArray(value) ? value : [value];
    for (const child of children) {
      if (!isRecord(child)) continue;
      if (["clipPath", "mask", "pattern", "filter", "linearGradient", "radialGradient"].includes(key)) {
        addUnsupported(unsupported, key, describeNode(key, child));
      }
      collectUnsupportedFeatures(child, unsupported);
    }
  }
}

function isPotentiallyDrawableContainer(tagName: string, node: Record<string, unknown>): boolean {
  const nonDrawable = new Set([
    "g",
    "defs",
    "metadata",
    "title",
    "desc",
    "style",
    "svg",
    "namedview",
    "sodipodi:namedview"
  ]);
  if (nonDrawable.has(tagName)) return false;
  return Boolean(
    getStringAttr(node, "d") ||
      getStringAttr(node, "points") ||
      getStringAttr(node, "x") ||
      getStringAttr(node, "y")
  );
}

function reportUnsupportedFill(
  tagName: string,
  node: Record<string, unknown>,
  unsupported: Map<string, UnsupportedFeature>
) {
  const fill = getPresentationValue(node, "fill");
  const fillOpacity = getPresentationValue(node, "fill-opacity");
  const opacity = getPresentationValue(node, "opacity");
  const fillIsDisabled = fill === "none" || fillOpacity === "0" || opacity === "0";
  const hasExplicitFill = fill !== undefined;

  if (!fillIsDisabled && hasExplicitFill) {
    addUnsupported(unsupported, "fill", describeNode(tagName, node));
  }
}

function getPresentationValue(node: Record<string, unknown>, name: string): string | undefined {
  const direct = getStringAttr(node, name);
  if (direct !== undefined) return direct.trim();

  const style = getStringAttr(node, "style");
  if (!style) return undefined;

  for (const declaration of style.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 0) continue;
    const key = declaration.slice(0, separator).trim();
    if (key === name) {
      return declaration.slice(separator + 1).trim();
    }
  }

  return undefined;
}

function addUnsupported(
  unsupported: Map<string, UnsupportedFeature>,
  feature: string,
  example: string
) {
  const existing = unsupported.get(feature);
  if (existing) {
    existing.count++;
    if (existing.examples.length < 5 && !existing.examples.includes(example)) {
      existing.examples.push(example);
    }
    return;
  }

  unsupported.set(feature, {
    feature,
    count: 1,
    examples: [example]
  });
}

function describeNode(tagName: string, node: Record<string, unknown>): string {
  const id = getStringAttr(node, "id");
  return id ? `<${tagName} id="${id}">` : `<${tagName}>`;
}

function parseTransform(transform: string | undefined): Matrix {
  if (!transform) return IDENTITY_MATRIX;
  const transformRegex = /([a-zA-Z]+)\(([^)]*)\)/g;
  let matrix = IDENTITY_MATRIX;
  let match: RegExpExecArray | null;

  while ((match = transformRegex.exec(transform))) {
    const [, name, rawArgs] = match;
    const args = parseNumberList(rawArgs);
    const next = transformFunctionToMatrix(name, args);
    matrix = multiplyMatrices(matrix, next);
  }

  return matrix;
}

function transformFunctionToMatrix(name: string, args: number[]): Matrix {
  switch (name) {
    case "matrix":
      return args.length >= 6 ? [args[0], args[1], args[2], args[3], args[4], args[5]] : IDENTITY_MATRIX;
    case "translate":
      return [1, 0, 0, 1, args[0] ?? 0, args[1] ?? 0];
    case "scale": {
      const sx = args[0] ?? 1;
      const sy = args[1] ?? sx;
      return [sx, 0, 0, sy, 0, 0];
    }
    case "rotate": {
      const angle = ((args[0] ?? 0) * Math.PI) / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const rotate: Matrix = [cos, sin, -sin, cos, 0, 0];
      if (args.length >= 3) {
        const [cx, cy] = [args[1], args[2]];
        return multiplyMatrices(
          multiplyMatrices([1, 0, 0, 1, cx, cy], rotate),
          [1, 0, 0, 1, -cx, -cy]
        );
      }
      return rotate;
    }
    case "skewX": {
      const angle = ((args[0] ?? 0) * Math.PI) / 180;
      return [1, 0, Math.tan(angle), 1, 0, 0];
    }
    case "skewY": {
      const angle = ((args[0] ?? 0) * Math.PI) / 180;
      return [1, Math.tan(angle), 0, 1, 0, 0];
    }
    default:
      return IDENTITY_MATRIX;
  }
}

function multiplyMatrices(left: Matrix, right: Matrix): Matrix {
  const [a1, b1, c1, d1, e1, f1] = left;
  const [a2, b2, c2, d2, e2, f2] = right;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1
  ];
}

function applyMatrix(matrix: Matrix, point: Point): Point {
  const [a, b, c, d, e, f] = matrix;
  return {
    x: a * point.x + c * point.y + e,
    y: b * point.x + d * point.y + f
  };
}

function parseSvgLength(value: string | undefined): SvgLength | undefined {
  if (!value) return undefined;
  const match = value.trim().match(/^([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)([a-zA-Z%]*)$/);
  if (!match) return undefined;
  const numericValue = Number(match[1]);
  const unit = match[2] || "px";
  if (!Number.isFinite(numericValue)) return undefined;
  return {
    raw: value,
    value: numericValue,
    unit,
    mm: numericValue * unitToMm(unit)
  };
}

function parseViewBox(value: string | undefined): ViewBox | undefined {
  if (!value) return undefined;
  const numbers = parseNumberList(value);
  if (numbers.length !== 4 || numbers.some((number) => !Number.isFinite(number))) {
    return undefined;
  }
  const [x, y, width, height] = numbers;
  return { x, y, width, height };
}

function unitToMm(unit: string): number {
  switch (unit) {
    case "mm":
      return 1;
    case "cm":
      return 10;
    case "in":
      return 25.4;
    case "pt":
      return 25.4 / 72;
    case "pc":
      return 25.4 / 6;
    case "px":
    case "":
      return PX_TO_MM;
    default:
      return PX_TO_MM;
  }
}

function isAbsoluteUnit(unit: string): boolean {
  return ["mm", "cm", "in", "pt", "pc"].includes(unit);
}

function parseNumberAttr(node: Record<string, unknown>, name: string): number | undefined {
  const value = getStringAttr(node, name);
  if (!value) return undefined;
  const match = value.trim().match(/^[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/);
  if (!match) return undefined;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getStringAttr(node: Record<string, unknown>, name: string): string | undefined {
  const value = node[`${XML_ATTRIBUTE_PREFIX}${name}`];
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

function parseNumberList(raw: string | undefined): number[] {
  if (!raw) return [];
  return raw
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);
}

function boundsForSegments(segments: Segment[]): Bounds | undefined {
  if (!segments.length) return undefined;
  const xs = segments.flatMap((segment) => [segment.from.x, segment.to.x]);
  const ys = segments.flatMap((segment) => [segment.from.y, segment.to.y]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function sumSegmentLengths(segments: Segment[]): number {
  return segments.reduce((total, segment) => total + distance(segment.from, segment.to), 0);
}

function sumTravelDistance(segments: Segment[]): number {
  let total = 0;
  for (let index = 1; index < segments.length; index++) {
    total += distance(segments[index - 1].to, segments[index].from);
  }
  return total;
}

function countPenLifts(segments: Segment[]): number {
  if (!segments.length) return 0;
  let lifts = 1;
  for (let index = 1; index < segments.length; index++) {
    if (!samePoint(segments[index - 1].to, segments[index].from)) {
      lifts++;
    }
  }
  return lifts;
}

function isOutOfBounds(bounds: Bounds): boolean {
  return bounds.minX < 0 || bounds.minY < 0 || bounds.maxX > DEVICE_WIDTH_MM || bounds.maxY > DEVICE_HEIGHT_MM;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function samePoint(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < 0.000001 && Math.abs(a.y - b.y) < 0.000001;
}

function formatMarkdown(report: ManifestReport): string {
  const lines: string[] = [];
  lines.push("# Plotter Manifest Dry Run");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Source SVG: ${report.sourceSvg}`);
  lines.push("");
  lines.push("## Safety");
  lines.push("");
  lines.push("- Opens serial ports: false");
  lines.push("- Sends device commands: false");
  lines.push("- Motion: false");
  lines.push("");
  lines.push("## Page");
  lines.push("");
  lines.push(`- Width: ${formatLength(report.svg.width)}`);
  lines.push(`- Height: ${formatLength(report.svg.height)}`);
  lines.push(`- ViewBox: ${report.svg.viewBox ? formatViewBox(report.svg.viewBox) : "not found"}`);
  lines.push(`- Coordinate mapping: ${report.svg.coordinateMapping}`);
  lines.push("");
  lines.push("## Geometry");
  lines.push("");
  lines.push(`- Shapes: ${report.geometry.shapeCount}`);
  lines.push(`- Segments: ${report.geometry.segmentCount}`);
  lines.push(`- Pen lifts: ${report.geometry.penLiftCount}`);
  lines.push(`- Draw distance: ${formatMm(report.geometry.drawDistanceMm)}`);
  lines.push(`- Travel distance: ${formatMm(report.geometry.travelDistanceMm)}`);
  lines.push(
    `- Bounds: ${report.geometry.boundsMm ? formatBounds(report.geometry.boundsMm) : "not found"}`
  );
  lines.push(`- Out of bounds: ${report.geometry.outOfBounds}`);
  lines.push("");
  lines.push("## Unsupported Features");
  lines.push("");
  if (report.unsupportedFeatures.length) {
    report.unsupportedFeatures.forEach((feature) => {
      lines.push(`- ${feature.feature}: ${feature.count} (${feature.examples.join(", ")})`);
    });
  } else {
    lines.push("- None detected");
  }
  lines.push("");
  lines.push("## Warnings");
  lines.push("");
  if (report.warnings.length) {
    report.warnings.forEach((warning) => lines.push(`- ${warning}`));
  } else {
    lines.push("- None");
  }
  lines.push("");
  lines.push("## Shape Summary");
  lines.push("");
  if (report.shapes.length) {
    lines.push("| Type | ID | Segments | Draw distance | Bounds |");
    lines.push("| --- | --- | ---: | ---: | --- |");
    report.shapes.forEach((shape) => {
      lines.push(
        `| ${shape.type} | ${shape.id ?? ""} | ${shape.segmentCount} | ${formatMm(shape.drawDistanceMm)} | ${shape.boundsMm ? formatBounds(shape.boundsMm) : ""} |`
      );
    });
  } else {
    lines.push("- None");
  }
  lines.push("");
  lines.push("## Next Steps");
  lines.push("");
  report.nextSteps.forEach((step) => lines.push(`- ${step}`));
  return lines.join("\n");
}

function formatLength(length: SvgLength | undefined): string {
  return length ? `${length.raw ?? `${length.value}${length.unit}`} (${formatMm(length.mm)})` : "not found";
}

function formatViewBox(viewBox: ViewBox): string {
  return `${viewBox.x}, ${viewBox.y}, ${viewBox.width}, ${viewBox.height}`;
}

function formatBounds(bounds: Bounds): string {
  return `X ${formatNumber(bounds.minX)}..${formatNumber(bounds.maxX)} mm, Y ${formatNumber(bounds.minY)}..${formatNumber(bounds.maxY)} mm, size ${formatNumber(bounds.width)} x ${formatNumber(bounds.height)} mm`;
}

function formatMm(value: number): string {
  return `${formatNumber(value)} mm`;
}

function formatNumber(value: number): string {
  return value.toFixed(3);
}

async function writeManifestReport(
  report: ManifestReport,
  markdown: boolean,
  requestedOutPath: string | undefined
): Promise<string> {
  const outputPath =
    requestedOutPath ??
    path.join(
      process.cwd(),
      "artifacts",
      "plotter",
      `manifest-${path.basename(report.sourceSvg, path.extname(report.sourceSvg))}-${report.generatedAt.replace(/[:.]/g, "-")}.${markdown ? "md" : "json"}`
    );
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(
    outputPath,
    markdown ? formatMarkdown(report) : `${JSON.stringify(report, null, 2)}\n`,
    "utf-8"
  );
  return outputPath;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export {
  buildManifestReport,
  formatMarkdown as formatManifestMarkdown,
  writeManifestReport
};

export type {
  Bounds,
  ManifestReport,
  Point,
  ShapeReport,
  SvgLength,
  UnsupportedFeature,
  ViewBox
};
