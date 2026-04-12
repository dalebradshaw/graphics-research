#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

usage() {
  cat <<'USAGE'
Plotter helper

Usage:
  tools/plotter/plotter.sh probe [probe args]
  tools/plotter/plotter.sh manifest --svg <path> [manifest args]
  tools/plotter/plotter.sh preflight --svg <path> [manifest args]
  tools/plotter/plotter.sh cycle --svg <path> [cycle args]
  tools/plotter/plotter.sh calibrate-x [calibration args]
  tools/plotter/plotter.sh plot --svg <path> [plot args]

Examples:
  tools/plotter/plotter.sh probe --markdown
  tools/plotter/plotter.sh manifest --svg fixtures/plotter/simple-shapes.svg --markdown
  tools/plotter/plotter.sh preflight --svg fixtures/plotter/simple-shapes.svg --write --markdown

Safety:
  probe is passive unless --query-device is provided.
  manifest and preflight do not open serial ports or send device commands.
USAGE
}

if [[ $# -lt 1 ]]; then
  usage
  exit 2
fi

command="$1"
shift

case "$command" in
  probe)
    exec npm --prefix "$ROOT_DIR" run -s plotter:probe -- "$@"
    ;;
  manifest|dry-run)
    exec npm --prefix "$ROOT_DIR" run -s plotter:manifest -- "$@"
    ;;
  preflight)
    printf '== Plotter device probe (passive) ==\n'
    npm --prefix "$ROOT_DIR" run -s plotter:probe -- --markdown
    printf '\n== SVG manifest dry run ==\n'
    exec npm --prefix "$ROOT_DIR" run -s plotter:manifest -- "$@"
    ;;
  cycle)
    exec npm --prefix "$ROOT_DIR" run -s plotter:cycle -- "$@"
    ;;
  calibrate-x)
    exec npm --prefix "$ROOT_DIR" run -s plotter:calibrate-x -- "$@"
    ;;
  plot)
    exec npm --prefix "$ROOT_DIR" run -s plotter:plot -- "$@"
    ;;
  help|--help|-h)
    usage
    ;;
  *)
    printf 'Unknown plotter command: %s\n\n' "$command" >&2
    usage >&2
    exit 2
    ;;
esac
