#!/usr/bin/env python3
"""Inspect FxCore .fxcore SQLite/CoreData composition files.

The goal is not to fully deserialize every CoreData value. It is to make the
graph understandable enough for research: nodes, edges, interesting decoded
strings, kernels, prompts, model URLs, and host-safety clues.
"""

from __future__ import annotations

import argparse
import json
import plistlib
import re
import sqlite3
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


INTERESTING_KEY = re.compile(
    r"(kernel|candidate|expression|prompt|model|url|string|attributed|"
    r"accumulate|filesystem|skip|format)",
    re.IGNORECASE,
)

HOST_UNSAFE_IDENTIFIERS = {
    "com.fxfactory.FxCore.FxCorePlugInMouseInfo": "captures mouse state, which is not available during video-frame rendering",
    "com.fxfactory.FxCore.FxCorePlugInKeyboardInfo": "captures keyboard state, which is not available during video-frame rendering",
}

KNOWN_SAMPLE_ROLES = {
    "Apps in Space.fxcore": "data-driven 3D sprites",
    "Baseline Anchored Text.fxcore": "anchored text layout",
    "Composite Stack Accumulator.fxcore": "iterator accumulation",
    "DepthAnything.fxcore": "CoreML depth mask",
    "Directory Scanner.fxcore": "filesystem image scan",
    "Eagly.fxcore": "animated image source",
    "Events.fxcore": "standalone mouse/keyboard input",
    "Feedback.fxcore": "standalone temporal feedback",
    "Fire.fxcore": "GLSL to Core Image shader",
    "Human.fxcore": "Vision body pose",
    "Inferno.fxcore": "styled text animation",
    "Interpolation.fxcore": "timed interpolation",
    "Iterator 2.fxcore": "iterated camera feedback",
    "Iterator.fxcore": "iterator text repetition",
    "Pac-Man.fxcore": "procedural CI chain",
    "Spaghetti Poetry.fxcore": "language model text graphics",
    "Sprite.fxcore": "nested render-to-texture",
}


@dataclass
class Node:
    pk: int
    title: str
    identifier: str
    parent: int | None
    index: int | None
    is_iterator: bool
    is_consumer: bool


@dataclass
class Connection:
    pk: int
    from_node: str | None
    from_output: str | None
    to_node: str | None
    to_input: str | None


@dataclass
class DecodedValue:
    source: str
    node: str | None
    category: str
    key: str
    value: str


@dataclass
class FxCoreSummary:
    name: str
    path: str
    bytes: int
    node_count: int
    connection_count: int
    role: str | None
    root_identifier: str | None
    identifier_counts: dict[str, int]
    notable_identifiers: list[str]
    nodes: list[Node]
    connections: list[Connection]
    decoded_values: list[DecodedValue]
    host_safety_notes: list[str]


def collect_strings(value: Any) -> list[str]:
    strings: list[str] = []
    if isinstance(value, str):
        strings.append(value)
    elif isinstance(value, bytes):
        try:
            strings.append(value.decode("utf-8"))
        except UnicodeDecodeError:
            pass
    elif isinstance(value, dict):
        for child in value.values():
            strings.extend(collect_strings(child))
    elif isinstance(value, list | tuple):
        for child in value:
            strings.extend(collect_strings(child))
    return strings


def decode_blob(blob: bytes | None) -> list[str]:
    if not blob:
        return []
    try:
        plist = plistlib.loads(blob)
    except Exception:
        return []

    ignored = {
        "$null",
        "NSKeyedArchiver",
        "NSMutableString",
        "NSString",
        "NSObject",
        "NSColor",
        "NSColorSpace",
        "NSAttributedString",
        "NSURL",
        "associatedValue",
        "key",
        "type",
        "name",
    }
    results: list[str] = []
    seen: set[str] = set()
    for value in collect_strings(plist):
        cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", value)
        cleaned = cleaned.replace("\r", "\n").strip()
        if (
            not cleaned
            or cleaned in ignored
            or cleaned.startswith("$")
            or cleaned.startswith("NS")
        ):
            continue
        if cleaned not in seen:
            seen.add(cleaned)
            results.append(cleaned)
    return results


def compact(value: str, max_chars: int) -> str:
    one_line = " ".join(value.split())
    if len(one_line) <= max_chars:
        return one_line
    return one_line[: max_chars - 3] + "..."


def classify_value(key: str, value: str) -> str:
    lowered_key = key.lower()
    lowered_value = value.lower()
    if "kernel" in lowered_key or "[[stitchable]]" in value or "kernel " in lowered_value:
        return "kernel"
    if "expression" in lowered_key or "candidate" in lowered_key:
        return "expression"
    if "prompt" in lowered_key:
        return "prompt"
    if "model" in lowered_key or ".mlpackage" in lowered_value or ".mlmodel" in lowered_value:
        return "model"
    if "url" in lowered_key or lowered_value.startswith("file://") or lowered_value.startswith("http"):
        return "url"
    if "format" in lowered_key:
        return "format"
    if "string" in lowered_key or "attributed" in lowered_key:
        return "text"
    if "accumulate" in lowered_key or "skip" in lowered_key or "filesystem" in lowered_key:
        return "option"
    return "value"


def short_identifier(identifier: str) -> str:
    prefix = "com.fxfactory.FxCore."
    if identifier.startswith(prefix):
        return identifier[len(prefix) :]
    return identifier


def notable_identifiers(identifier_counts: dict[str, int]) -> list[str]:
    notable_patterns = (
        "CIShader",
        "CIKernel",
        "MLModelImporter",
        "HumanBodyPose",
        "HumanBodyJoints",
        "LanguageModel",
        "DirectoryScanner",
        "FinderIcon",
        "AVCaptureDevice",
        "Iterator",
        "3DRenderToTexture",
        "3DSprite",
        "MouseInfo",
        "KeyboardInfo",
        "CGImageSource",
    )
    result: list[str] = []
    for identifier in identifier_counts:
        if any(pattern in identifier for pattern in notable_patterns):
            result.append(short_identifier(identifier))
    return result[:8]


def decoded_highlights(values: list[DecodedValue], max_items: int = 4) -> str:
    priority = ("kernel", "prompt", "model", "url", "expression", "format", "text")
    highlights: list[str] = []
    for category in priority:
        category_values = [value for value in values if value.category == category]
        if category == "model":
            category_values.sort(
                key=lambda value: (
                    ".mlpackage" not in value.value.lower()
                    and ".mlmodel" not in value.value.lower(),
                    len(value.value),
                )
            )
        for value in category_values:
            label = f"{category}: {compact(value.value, 64)}"
            if label not in highlights:
                highlights.append(label)
            if len(highlights) >= max_items:
                return "; ".join(highlights)
    return "; ".join(highlights)


def table_cell(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ")


def host_safety_label(notes: list[str]) -> str:
    if not notes:
        return "review"
    if any("mouse" in note or "keyboard" in note or "previousImage" in note for note in notes):
        return "standalone-only"
    return "caution"


def inspect_file(path: Path, decode_limit: int) -> FxCoreSummary:
    with sqlite3.connect(path) as db:
        db.row_factory = sqlite3.Row

        nodes = [
            Node(
                pk=row["Z_PK"],
                title=row["ZTITLE"] or "",
                identifier=row["ZIDENTIFIER"] or "",
                parent=row["ZPARENT"],
                index=row["ZINDEX"],
                is_iterator=bool(row["ZISITERATOR"]),
                is_consumer=bool(row["ZISCONSUMER"]),
            )
            for row in db.execute(
                """
                select Z_PK, ZTITLE, ZIDENTIFIER, ZPARENT, ZINDEX, ZISITERATOR, ZISCONSUMER
                from ZNODE
                order by coalesce(ZPARENT, 0), coalesce(ZINDEX, 0), Z_PK
                """
            )
        ]

        connections = [
            Connection(
                pk=row["pk"],
                from_node=row["from_node"],
                from_output=row["from_output"],
                to_node=row["to_node"],
                to_input=row["to_input"],
            )
            for row in db.execute(
                """
                select
                  c.Z_PK as pk,
                  src.ZTITLE as from_node,
                  coalesce(o.ZTITLE, o.ZKEY) as from_output,
                  dst.ZTITLE as to_node,
                  coalesce(i.ZTITLE, i.ZKEY) as to_input
                from ZCONNECTION c
                left join ZOUTPUT o on o.Z_PK = c.ZOUTPUT
                left join ZNODE src on src.Z_PK = o.ZNODE
                left join ZINPUT i on i.Z_PK = c.ZINPUT
                left join ZNODE dst on dst.Z_PK = i.ZNODE
                order by c.Z_PK
                """
            )
        ]

        decoded_values: list[DecodedValue] = []
        for source, query in [
            (
                "nodeKeyValue",
                """
                select n.ZTITLE as node, t.ZKEY as key, t.ZVALUE as blob
                from ZNODEKEYVALUEPAIR t
                left join ZNODE n on n.Z_PK = t.ZNODE
                """,
            ),
            (
                "input",
                """
                select n.ZTITLE as node, t.ZKEY as key, t.ZASSIGNEDVALUE as blob
                from ZINPUT t
                left join ZNODE n on n.Z_PK = t.ZNODE
                """,
            ),
        ]:
            for row in db.execute(query):
                key = row["key"] or ""
                if not INTERESTING_KEY.search(key):
                    continue
                for value in decode_blob(row["blob"]):
                    decoded_values.append(
                        DecodedValue(
                            source=source,
                            node=row["node"],
                            category=classify_value(key, value),
                            key=key,
                            value=value,
                        )
                    )
                    if len(decoded_values) >= decode_limit:
                        break
                if len(decoded_values) >= decode_limit:
                    break
            if len(decoded_values) >= decode_limit:
                break

    notes: list[str] = []
    identifiers = {node.identifier for node in nodes}
    for identifier, reason in HOST_UNSAFE_IDENTIFIERS.items():
        if identifier in identifiers:
            notes.append(reason)
    for value in decoded_values:
        if "previousImage" in value.value:
            notes.append(
                "uses previousImage feedback; video hosts may render frames out of sequence"
            )
            break

    identifier_counts: dict[str, int] = {}
    for node in nodes:
        identifier_counts[node.identifier] = identifier_counts.get(node.identifier, 0) + 1

    root_identifier = next((node.identifier for node in nodes if node.parent is None), None)

    return FxCoreSummary(
        name=path.name,
        path=str(path),
        bytes=path.stat().st_size,
        node_count=len(nodes),
        connection_count=len(connections),
        role=KNOWN_SAMPLE_ROLES.get(path.name),
        root_identifier=root_identifier,
        identifier_counts=identifier_counts,
        notable_identifiers=notable_identifiers(identifier_counts),
        nodes=nodes,
        connections=connections,
        decoded_values=decoded_values,
        host_safety_notes=notes,
    )


def find_fxcore_files(paths: list[Path]) -> list[Path]:
    files: list[Path] = []
    for path in paths:
        expanded = path.expanduser()
        if expanded.is_dir():
            files.extend(sorted(expanded.glob("*.fxcore")))
        elif expanded.suffix == ".fxcore":
            files.append(expanded)
    return files


def render_markdown(
    summaries: list[FxCoreSummary],
    value_chars: int,
    summary_only: bool,
) -> str:
    lines = ["# FxCore Inspection", ""]
    lines.append(
        f"Inspected {len(summaries)} composition{'s' if len(summaries) != 1 else ''}."
    )
    lines.append("")

    lines.append("## Summary")
    lines.append("")
    lines.append("| Composition | Role | Nodes | Edges | Root | Notable Nodes | Host Safety | Highlights |")
    lines.append("|---|---:|---:|---:|---|---|---|---|")
    for summary in summaries:
        root = short_identifier(summary.root_identifier or "")
        role = summary.role or ""
        notable = ", ".join(summary.notable_identifiers)
        safety = host_safety_label(summary.host_safety_notes)
        highlights = decoded_highlights(summary.decoded_values)
        lines.append(
            f"| {table_cell(summary.name)} | {table_cell(role)} | {summary.node_count} | "
            f"{summary.connection_count} | `{table_cell(root)}` | {table_cell(notable)} | "
            f"{table_cell(safety)} | {table_cell(highlights)} |"
        )
    lines.append("")

    if summary_only:
        return "\n".join(lines).rstrip() + "\n"

    for summary in summaries:
        lines.append(f"## {summary.name}")
        lines.append("")
        lines.append(f"- Path: `{summary.path}`")
        lines.append(f"- Size: {summary.bytes:,} bytes")
        if summary.role:
            lines.append(f"- Role: {summary.role}")
        lines.append(f"- Nodes: {summary.node_count}")
        lines.append(f"- Connections: {summary.connection_count}")
        if summary.root_identifier:
            lines.append(f"- Root: `{summary.root_identifier}`")
        if summary.notable_identifiers:
            lines.append(f"- Notable nodes: {', '.join(summary.notable_identifiers)}")
        if summary.host_safety_notes:
            for note in summary.host_safety_notes:
                lines.append(f"- Host safety: {note}")
        lines.append("")

        lines.append("### Nodes")
        lines.append("")
        lines.append("| Title | Identifier | Parent |")
        lines.append("|---|---|---|")
        for node in summary.nodes:
            parent = "" if node.parent is None else str(node.parent)
            lines.append(f"| {node.title} | `{node.identifier}` | {parent} |")
        lines.append("")

        if summary.decoded_values:
            lines.append("### Decoded Values")
            lines.append("")
            for value in summary.decoded_values:
                rendered = compact(value.value, value_chars)
                lines.append(
                    f"- `{value.category}` `{value.source}` {value.node or '?'} / `{value.key}`: {rendered}"
                )
            lines.append("")

        lines.append("### Connections")
        lines.append("")
        for conn in summary.connections:
            left = f"{conn.from_node or '?'}.{conn.from_output or '?'}"
            right = f"{conn.to_node or '?'}.{conn.to_input or '?'}"
            lines.append(f"- {left} -> {right}")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "paths",
        nargs="*",
        type=Path,
        default=[Path("/Users/dalebradshaw/Documents/fxcore/sample_plugins")],
        help="FxCore .fxcore files or directories containing .fxcore files.",
    )
    parser.add_argument(
        "--format",
        choices=("markdown", "json"),
        default="markdown",
        help="Output format.",
    )
    parser.add_argument(
        "--decode-limit",
        type=int,
        default=80,
        help="Maximum decoded values to include per file.",
    )
    parser.add_argument(
        "--value-chars",
        type=int,
        default=220,
        help="Maximum characters per decoded value in Markdown output.",
    )
    parser.add_argument(
        "--summary-only",
        action="store_true",
        help="Only print the directory-level summary table in Markdown output.",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        help="Write output to a file instead of stdout.",
    )
    args = parser.parse_args()

    files = find_fxcore_files(args.paths)
    if not files:
        parser.error("No .fxcore files found.")

    summaries = [inspect_file(file, args.decode_limit) for file in files]

    if args.format == "json":
        output = json.dumps([asdict(summary) for summary in summaries], indent=2) + "\n"
    else:
        output = render_markdown(summaries, args.value_chars, args.summary_only)

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output, encoding="utf-8")
    else:
        print(output, end="")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
