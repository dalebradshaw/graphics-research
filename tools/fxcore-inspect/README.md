# fxcore-inspect

Small research utility for inspecting FxCore `.fxcore` files.

`.fxcore` compositions are SQLite/CoreData stores. This tool extracts the parts that are useful for planning experiments:

- node inventory
- graph connections
- decoded strings from interesting plist blobs
- shader/kernel snippets
- expression strings
- model URLs and prompts
- basic host-safety notes for event or feedback patterns

## Usage

```bash
npm run fxcore:inspect -- /Users/dalebradshaw/Documents/fxcore/sample_plugins
```

Inspect one file:

```bash
npm run fxcore:inspect -- /Users/dalebradshaw/Documents/fxcore/sample_plugins/Fire.fxcore
```

Emit JSON:

```bash
npm run fxcore:inspect -- --format json /Users/dalebradshaw/Documents/fxcore/sample_plugins
```

Print only the directory-level matrix:

```bash
npm run fxcore:inspect -- --summary-only /Users/dalebradshaw/Documents/fxcore/sample_plugins
```

Write output to an artifact:

```bash
npm run fxcore:inspect -- \
  --output artifacts/fxcore/sample-plugins.md \
  /Users/dalebradshaw/Documents/fxcore/sample_plugins
```

Run the local regression tests:

```bash
npm run test:fxcore
```

The tests skip automatically when the local FxCore sample folder is not present.

The entrypoint is `tools/fxcore-inspect/fxcore_inspect.py`.

The script uses only Python standard-library modules: `sqlite3`, `plistlib`, `json`, and `argparse`.
