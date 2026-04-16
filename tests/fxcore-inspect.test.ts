import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INSPECTOR = path.join(REPO_ROOT, "tools/fxcore-inspect/fxcore_inspect.py");
const SAMPLE_DIR = "/Users/dalebradshaw/Documents/fxcore/sample_plugins";

function runInspector(args: string[]) {
  const output = execFileSync("python3", [INSPECTOR, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8"
  });
  return output;
}

function sampleAvailable(name: string) {
  return fs.existsSync(path.join(SAMPLE_DIR, name));
}

test(
  "fxcore inspector decodes the Fire shader sample",
  { skip: !sampleAvailable("Fire.fxcore") && "local FxCore sample plugin is not available" },
  () => {
    const output = runInspector([
      "--format",
      "json",
      path.join(SAMPLE_DIR, "Fire.fxcore")
    ]);
    const [summary] = JSON.parse(output);

    assert.equal(summary.name, "Fire.fxcore");
    assert.equal(summary.role, "GLSL to Core Image shader");
    assert.equal(summary.node_count, 7);
    assert.equal(summary.connection_count, 3);
    assert.equal(
      summary.root_identifier,
      "com.fxfactory.FxCore.FxCorePlugInCIContainer"
    );
    assert.equal(
      summary.decoded_values.some(
        (value: { category: string; value: string }) =>
          value.category === "kernel" && value.value.includes("fireKernel")
      ),
      true
    );
  }
);

test(
  "fxcore inspector marks mouse and keyboard samples as standalone-only",
  { skip: !sampleAvailable("Events.fxcore") && "local FxCore sample plugin is not available" },
  () => {
    const output = runInspector([
      "--summary-only",
      path.join(SAMPLE_DIR, "Events.fxcore")
    ]);

    assert.match(output, /Events\.fxcore/);
    assert.match(output, /standalone-only/);
    assert.match(output, /MouseInfo/);
    assert.match(output, /KeyboardInfo/);
  }
);

test(
  "fxcore inspector discovers the full local sample directory",
  { skip: !fs.existsSync(SAMPLE_DIR) && "local FxCore sample directory is not available" },
  () => {
    const output = runInspector(["--summary-only", SAMPLE_DIR]);

    assert.match(output, /Inspected 17 compositions/);
    assert.match(output, /DepthAnything\.fxcore/);
    assert.match(output, /Spaghetti Poetry\.fxcore/);
    assert.match(output, /language model text graphics/);
  }
);

