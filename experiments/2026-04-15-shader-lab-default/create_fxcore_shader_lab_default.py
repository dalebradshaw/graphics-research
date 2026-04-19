#!/usr/bin/env python3
"""Generate an FxCore approximation of Shader Lab's default five-layer composition."""

import argparse
from pathlib import Path
import shutil
import sqlite3
import subprocess
import sys

FXCORE_DIR = Path.home() / "Documents" / "fxcore"
sys.path.insert(0, str(FXCORE_DIR))

from fxcore_gen import (  # noqa: E402
    Composition,
    EntityType,
    PortType,
    _bplist_bool,
    _bplist_float,
    _bplist_int,
    _bplist_string,
    make_billboard_node,
    make_ci_container_node,
    make_cishader_node,
    make_local_time_node,
    make_output_info_node,
)


ROOT = Path(__file__).resolve().parent
SHADER_PATH = ROOT / "shader_lab_default_5layer.metal"
COMPOSITE_SHADER_PATH = ROOT / "shader_lab_default_composite.metal"
OUTPUT_PATH = FXCORE_DIR / "Generated_ShaderLab_Default_5Layer.fxcore"
BASE_TEXT_SIZE = 201
TEXT_FONT_NAME = "HelveticaNeue-CondensedBlack"
FIELD_SHADER_INPUTS = [
    ("inputU_resolution", "U Resolution", PortType.GEOMETRY),
    ("inputU_time", "U Time", PortType.FLOAT),
    ("inputU_gradient_warp", "Gradient Warp", PortType.FLOAT, 0.30),
    ("inputU_gradient_scale", "Gradient Scale", PortType.FLOAT, 3.0),
    ("inputU_motion_speed", "Motion Speed", PortType.FLOAT, 2.0),
    ("inputU_vortex_amount", "Vortex Amount", PortType.FLOAT, -0.25),
    ("inputU_saturation", "Saturation", PortType.FLOAT, 1.15),
    ("inputU_pattern_cell_size", "Pattern Cell Size", PortType.FLOAT, 8.0),
    ("inputU_pattern_bg_opacity", "Pattern Background", PortType.FLOAT, 0.16),
    ("inputU_pattern_boost", "Pattern Boost", PortType.FLOAT, 1.25),
    ("inputU_dither_pixel_size", "Dither Pixel Size", PortType.FLOAT, 2.0),
    ("inputU_dither_spread", "Dither Spread", PortType.FLOAT, 0.5),
    ("inputU_dither_levels", "Dither Levels", PortType.FLOAT, 3.0),
    ("inputU_scanline_intensity", "CRT Scanlines", PortType.FLOAT, 0.17),
    ("inputU_mask_intensity", "CRT Mask", PortType.FLOAT, 1.0),
    ("inputU_brightness", "CRT Brightness", PortType.FLOAT, 1.2),
    ("inputU_vignette_intensity", "CRT Vignette", PortType.FLOAT, 0.45),
    ("inputU_flicker_intensity", "CRT Flicker", PortType.FLOAT, 0.2),
    ("inputU_noise_amount", "CRT Noise", PortType.FLOAT, 0.018),
]
FIELD_CONTROL_DEFS = [
    {
        "input_key": "inputU_gradient_warp",
        "title": "Gradient Warp",
        "default": 0.30,
        "minimum": 0.0,
        "maximum": 1.5,
        "group": "Gradient",
    },
    {
        "input_key": "inputU_gradient_scale",
        "title": "Gradient Scale",
        "default": 3.0,
        "minimum": 0.25,
        "maximum": 8.0,
        "group": "Gradient",
    },
    {
        "input_key": "inputU_motion_speed",
        "title": "Motion Speed",
        "default": 2.0,
        "minimum": 0.0,
        "maximum": 6.0,
        "group": "Gradient",
    },
    {
        "input_key": "inputU_vortex_amount",
        "title": "Vortex Amount",
        "default": -0.25,
        "minimum": -2.0,
        "maximum": 2.0,
        "group": "Gradient",
    },
    {
        "input_key": "inputU_saturation",
        "title": "Saturation",
        "default": 1.15,
        "minimum": 0.0,
        "maximum": 3.0,
        "group": "Gradient",
    },
    {
        "input_key": "inputU_pattern_cell_size",
        "title": "Pattern Cell Size",
        "default": 8.0,
        "minimum": 1.0,
        "maximum": 32.0,
        "group": "Pattern",
    },
    {
        "input_key": "inputU_pattern_bg_opacity",
        "title": "Pattern Background",
        "default": 0.16,
        "minimum": 0.0,
        "maximum": 1.0,
        "group": "Pattern",
    },
    {
        "input_key": "inputU_pattern_boost",
        "title": "Pattern Boost",
        "default": 1.25,
        "minimum": 0.0,
        "maximum": 4.0,
        "group": "Pattern",
    },
    {
        "input_key": "inputU_dither_pixel_size",
        "title": "Dither Pixel Size",
        "default": 2.0,
        "minimum": 0.5,
        "maximum": 8.0,
        "group": "Dither",
    },
    {
        "input_key": "inputU_dither_spread",
        "title": "Dither Spread",
        "default": 0.5,
        "minimum": 0.0,
        "maximum": 2.0,
        "group": "Dither",
    },
    {
        "input_key": "inputU_dither_levels",
        "title": "Dither Levels",
        "default": 3.0,
        "minimum": 2.0,
        "maximum": 8.0,
        "group": "Dither",
    },
    {
        "input_key": "inputU_scanline_intensity",
        "title": "CRT Scanlines",
        "default": 0.17,
        "minimum": 0.0,
        "maximum": 1.0,
        "group": "CRT",
    },
    {
        "input_key": "inputU_mask_intensity",
        "title": "CRT Mask",
        "default": 1.0,
        "minimum": 0.0,
        "maximum": 2.0,
        "group": "CRT",
    },
    {
        "input_key": "inputU_brightness",
        "title": "CRT Brightness",
        "default": 1.2,
        "minimum": 0.0,
        "maximum": 4.0,
        "group": "CRT",
    },
    {
        "input_key": "inputU_vignette_intensity",
        "title": "CRT Vignette",
        "default": 0.45,
        "minimum": 0.0,
        "maximum": 1.0,
        "group": "CRT",
    },
    {
        "input_key": "inputU_flicker_intensity",
        "title": "CRT Flicker",
        "default": 0.2,
        "minimum": 0.0,
        "maximum": 1.0,
        "group": "CRT",
    },
    {
        "input_key": "inputU_noise_amount",
        "title": "CRT Noise",
        "default": 0.018,
        "minimum": 0.0,
        "maximum": 0.2,
        "group": "CRT",
    },
]


def add_shader_pass(comp, root, title, kernel_name, inputs, x, y):
    shader_source = SHADER_PATH.read_text()
    return make_cishader_node(
        comp,
        title,
        parent=root,
        shader_source=shader_source,
        kernel_name=kernel_name,
        inputs=inputs,
        frame_x=x,
        frame_y=y,
    )


def validate_metal(shader_path):
    metal = shutil.which("xcrun")
    if not metal:
        print("Skipping Metal validation: xcrun not found", file=sys.stderr)
        return

    output_air = Path("/tmp/shader_lab_default_5layer.air")
    try:
        subprocess.run(
            [
                metal,
                "-sdk",
                "macosx",
                "metal",
                "-c",
                str(shader_path),
                "-o",
                str(output_air),
            ],
            check=True,
        )
    finally:
        output_air.unlink(missing_ok=True)


def validate_fxcore(path, expected):
    conn = sqlite3.connect(path)
    try:
        integrity = conn.execute("PRAGMA integrity_check").fetchone()[0]
        if integrity != "ok":
            raise RuntimeError(f"SQLite integrity_check failed: {integrity}")

        counts = {
            "nodes": conn.execute("SELECT count(*) FROM ZNODE").fetchone()[0],
            "inputs": conn.execute("SELECT count(*) FROM ZINPUT").fetchone()[0],
            "outputs": conn.execute("SELECT count(*) FROM ZOUTPUT").fetchone()[0],
            "connections": conn.execute("SELECT count(*) FROM ZCONNECTION").fetchone()[
                0
            ],
        }
        if counts != expected:
            raise RuntimeError(
                f"Unexpected graph counts: {counts}, expected {expected}"
            )
    finally:
        conn.close()


def build_fxcore(output_path):
    comp = Composition()
    configure_window_state(comp)

    root = make_ci_container_node(comp, "Root")
    output_info = make_output_info_node(
        comp, "Output", parent=root, frame_x=40, frame_y=220
    )
    time = make_local_time_node(comp, "Time", parent=root, frame_x=40, frame_y=340)

    gradient = add_shader_pass(
        comp,
        root,
        "01 Gradient Source",
        "slGradient",
        [
            ("inputU_resolution", "U Resolution", PortType.GEOMETRY),
            ("inputU_time", "U Time", PortType.FLOAT),
        ],
        250,
        120,
    )
    pattern = add_shader_pass(
        comp,
        root,
        "02 Pattern Bars",
        "slPattern",
        [
            ("inputImage", "Image", PortType.IMAGE),
            ("inputU_resolution", "U Resolution", PortType.GEOMETRY),
            ("inputU_time", "U Time", PortType.FLOAT),
        ],
        470,
        120,
    )
    text = add_shader_pass(
        comp,
        root,
        "03 Text Stencil",
        "slTextStencil",
        [
            ("inputImage", "Image", PortType.IMAGE),
            ("inputU_resolution", "U Resolution", PortType.GEOMETRY),
            ("inputU_time", "U Time", PortType.FLOAT),
        ],
        690,
        120,
    )
    dither = add_shader_pass(
        comp,
        root,
        "04 Bayer Dither",
        "slDither",
        [
            ("inputImage", "Image", PortType.IMAGE),
            ("inputU_resolution", "U Resolution", PortType.GEOMETRY),
            ("inputU_time", "U Time", PortType.FLOAT),
        ],
        910,
        120,
    )
    crt = add_shader_pass(
        comp,
        root,
        "05 CRT Finish",
        "slCRT",
        [
            ("inputImage", "Image", PortType.IMAGE),
            ("inputU_resolution", "U Resolution", PortType.GEOMETRY),
            ("inputU_time", "U Time", PortType.FLOAT),
        ],
        1130,
        120,
    )
    billboard = make_billboard_node(
        comp, "2D Output", parent=root, frame_x=1360, frame_y=120
    )

    shader_nodes = [gradient, pattern, text, dither, crt]
    for node in shader_nodes:
        comp.wire(output_info, "outputSize", node, "inputU_resolution")
        comp.wire(time, "outputLocalTime", node, "inputU_time")

    comp.wire(gradient, "outputImage", pattern, "inputImage")
    comp.wire(pattern, "outputImage", text, "inputImage")
    comp.wire(text, "outputImage", dither, "inputImage")
    comp.wire(dither, "outputImage", crt, "inputImage")
    comp.wire(crt, "outputImage", billboard, "inputImage")

    comp.save(str(output_path))


def build_source_fxcore(output_path):
    comp = build_native_text_composition(text_scale=1.0, control_mode="raw")
    comp.save(str(output_path))


def make_rgb_color_node(comp, title, *, parent, r, g, b, a=1.0, frame_x=0, frame_y=0):
    node = comp.add_node(
        "com.fxfactory.FxCore.FxCorePlugInRGBValuesToColor",
        title,
        parent=parent,
        frame_x=frame_x,
        frame_y=frame_y,
    )
    comp.add_input(
        node, "inputRed", "Red", 0, port_type=PortType.FLOAT, default_value=r
    )
    comp.add_input(
        node, "inputGreen", "Green", 1, port_type=PortType.FLOAT, default_value=g
    )
    comp.add_input(
        node, "inputBlue", "Blue", 2, port_type=PortType.FLOAT, default_value=b
    )
    comp.add_input(
        node, "inputAlpha", "Alpha", 3, port_type=PortType.FLOAT, default_value=a
    )
    comp.add_input(
        node,
        "inputColorSpaceName",
        "Color Space",
        4,
        port_type=PortType.STRING,
        default_value="FxCoreWorkingColorSpace",
    )
    comp.add_output(node, "outputColor", "Color", 0)
    return node


def make_image_with_string_node(
    comp, title, *, parent, text_scale, frame_x=0, frame_y=0
):
    font_size = max(24, round(BASE_TEXT_SIZE * text_scale))
    kerning = -0.10 * font_size
    node = comp.add_node(
        "com.fxfactory.FxCore.ImageWithStringPlugIn",
        title,
        parent=parent,
        frame_x=frame_x,
        frame_y=frame_y,
    )
    comp.add_input(
        node,
        "inputString",
        "String",
        0,
        port_type=PortType.STRING,
        default_value="basement",
    )
    comp.add_input(node, "inputBaseline", "Baseline", 1, port_type=PortType.GEOMETRY)
    comp.add_input(
        node,
        "inputTextAlignment",
        "Text Alignment",
        2,
        port_type=PortType.INTEGER,
        default_value=2,
    )
    comp.add_input(
        node,
        "inputVerticalAlignment",
        "Baseline Alignment",
        3,
        port_type=PortType.INTEGER,
        default_value=2,
    )
    comp.add_input(
        node,
        "inputVerticalShift",
        "Baseline Shift",
        4,
        port_type=PortType.FLOAT,
        default_value=0.0,
    )
    comp.add_input(node, "inputColor", "Color", 5, port_type=PortType.COLOR)
    comp.add_input(
        node,
        "inputColorSpaceName",
        "Color Space",
        6,
        port_type=PortType.STRING,
        default_value="FxCoreWorkingColorSpace",
    )
    comp.add_input(
        node,
        "inputAllowLigatures",
        "Ligatures",
        7,
        port_type=PortType.BOOL,
        default_value=True,
    )
    comp.add_input(
        node,
        "inputKerningAdjustment",
        "Kerning",
        8,
        port_type=PortType.FLOAT,
        default_value=kerning,
    )
    comp.add_input(
        node,
        "inputFontName",
        "Font Name",
        9,
        port_type=PortType.STRING,
        default_value=TEXT_FONT_NAME,
    )
    comp.add_input(
        node,
        "inputFontSize",
        "Font Size",
        10,
        port_type=PortType.INTEGER,
        default_value=font_size,
    )
    comp.add_input(
        node,
        "inputPaddingX",
        "Horizontal Padding",
        11,
        port_type=PortType.FLOAT,
        default_value=0.0,
    )
    comp.add_input(
        node,
        "inputPaddingY",
        "Vertical Padding",
        12,
        port_type=PortType.FLOAT,
        default_value=0.0,
    )
    comp.add_output(node, "outputImage", "Image", 0)
    comp.add_output(node, "outputStableExtent", "Extent", 1)
    comp.add_node_kvp(node, "allowCache", False)
    comp.add_node_kvp(node, "customizePadding", True)
    comp.add_node_kvp(node, "extractFontMetrics", False)
    comp.add_node_kvp(node, "extractOffsetToNumbers", False)
    comp.add_node_kvp(node, "extractOffsetToVector", False)
    comp.add_node_kvp(node, "extractStableBounds", False)
    comp.add_node_kvp(node, "extractStableExtent", True)
    comp.add_node_kvp(node, "stableExtentIncludesPadding", True)
    comp.add_node_kvp(node, "useFontInput", False)
    return node


def make_gaussian_blur_node(comp, title, *, parent, radius, frame_x=0, frame_y=0):
    node = comp.add_node(
        "com.fxfactory.FxCore.FxCorePlugInCIGaussianBlur",
        title,
        parent=parent,
        frame_x=frame_x,
        frame_y=frame_y,
    )
    comp.add_input(node, "inputImage", "Image", 0, port_type=PortType.IMAGE)
    comp.add_input(
        node, "inputRadius", "Radius", 1, port_type=PortType.FLOAT, default_value=radius
    )
    comp.add_output(node, "outputImage", "Image", 0)
    return node


def make_blend_with_mask_node(comp, title, *, parent, frame_x=0, frame_y=0):
    node = comp.add_node(
        "com.fxfactory.FxCore.FxCorePlugInCIBlendWithMask",
        title,
        parent=parent,
        frame_x=frame_x,
        frame_y=frame_y,
    )
    comp.add_input(node, "inputImage", "Image", 0, port_type=PortType.IMAGE)
    comp.add_input(
        node, "inputBackgroundImage", "Background Image", 1, port_type=PortType.IMAGE
    )
    comp.add_input(node, "inputMaskImage", "Mask Image", 2, port_type=PortType.IMAGE)
    comp.add_output(node, "outputImage", "Image", 0)
    return node


def make_black_source_node(comp, title, *, parent, frame_x=0, frame_y=0):
    return make_cishader_node(
        comp,
        title,
        parent=parent,
        shader_source=COMPOSITE_SHADER_PATH.read_text(),
        kernel_name="slBlack",
        inputs=[],
        frame_x=frame_x,
        frame_y=frame_y,
    )


SPLITTER_KEY_STYLES = {
    "value": ("inputValue0", "outputValue0"),
    "float": ("inputFloat0", "outputFloat0"),
    "number": ("inputNumber0", "outputNumber0"),
    "double": ("inputDouble0", "outputDouble0"),
    "scalar": ("inputScalar0", "outputScalar0"),
    "cgfloat": ("inputCGFloat0", "outputCGFloat0"),
}


def make_interpolation_control_node(comp, control, *, parent, frame_x=0, frame_y=0):
    title = f"{control['group']} Slider - {control['title']}"
    node = comp.add_node(
        "com.fxfactory.FxCore.FxCorePlugInInterpolation",
        title,
        parent=parent,
        frame_x=frame_x,
        frame_y=frame_y,
        comments=(
            f"Scalar control range: {control['minimum']} to {control['maximum']}. "
            "Keep Start Value and End Value equal for a static parameter."
        ),
    )
    comp.add_input(
        node,
        "inputStartValue",
        "Start Value",
        0,
        port_type=PortType.FLOAT,
        default_value=control["default"],
    )
    comp.add_input(
        node,
        "inputEndValue",
        "End Value",
        1,
        port_type=PortType.FLOAT,
        default_value=control["default"],
    )
    comp.add_input(
        node,
        "inputDuration",
        "Duration",
        2,
        port_type=PortType.FLOAT,
        default_value=1.0,
    )
    comp.add_input(
        node,
        "inputRepeatMode",
        "Repeat Mode",
        3,
        port_type=PortType.INTEGER,
        default_value=2,
    )
    comp.add_input(
        node,
        "inputRepeatCount",
        "Repeat Count",
        4,
        port_type=PortType.INTEGER,
        default_value=0,
    )
    comp.add_input(
        node,
        "inputFunction",
        "Function",
        5,
        port_type=PortType.INTEGER,
        default_value=3,
    )
    comp.add_output(node, "outputValue", "Value", 0)
    comp.add_node_kvp(node, "minimumValue", control["minimum"])
    comp.add_node_kvp(node, "maximumValue", control["maximum"])
    comp.add_node_kvp(node, "sliderMinimumValue", control["minimum"])
    comp.add_node_kvp(node, "sliderMaximumValue", control["maximum"])
    return node, "inputStartValue"


def make_splitter_control_node(
    comp, control, *, parent, key_style, frame_x=0, frame_y=0
):
    input_key, output_key = SPLITTER_KEY_STYLES[key_style]
    title = f"{control['group']} Slider - {control['title']}"
    node = comp.add_node(
        "com.fxfactory.FxCore.FxCorePlugInSplitter",
        title,
        parent=parent,
        dynamic_inputs_count=1,
        dynamic_port_type=PortType.FLOAT,
        frame_x=frame_x,
        frame_y=frame_y,
        comments=(
            f"Scalar splitter control range: {control['minimum']} to {control['maximum']}. "
            f"Generated with key style '{key_style}'."
        ),
    )
    comp.add_input(
        node,
        input_key,
        control["title"],
        0,
        port_type=PortType.FLOAT,
        default_value=control["default"],
    )
    comp.add_output(node, output_key, "Value", 0)
    comp.add_node_kvp(node, "URLEntity", 0)
    comp.add_node_kvp(node, "URLSemantics", 0)
    comp.add_node_kvp(node, "conditional", False)
    comp.add_node_kvp(node, "indexRange", 0)
    comp.add_node_kvp(node, "stringSemantics", 0)
    comp.add_node_kvp(node, "vectorComponentCount", 0)
    comp.add_node_kvp(node, "vectorSemantics", 0)
    comp.add_node_kvp(node, "minimumValue", control["minimum"])
    comp.add_node_kvp(node, "maximumValue", control["maximum"])
    comp.add_node_kvp(node, "sliderMinimumValue", control["minimum"])
    comp.add_node_kvp(node, "sliderMaximumValue", control["maximum"])
    return node, output_key


def make_field_control_nodes(
    comp, *, parent, control_mode, control_count=None, splitter_key_style="double"
):
    group_columns = {
        "Gradient": (40, 1500),
        "Pattern": (320, 1500),
        "Dither": (600, 1500),
        "CRT": (880, 1500),
    }
    row_counts = {group: 0 for group in group_columns}
    controls = {}
    control_defs = (
        FIELD_CONTROL_DEFS[:control_count] if control_count else FIELD_CONTROL_DEFS
    )
    for control in control_defs:
        group = control["group"]
        x, y = group_columns[group]
        if control_mode == "interpolation":
            node, control_input_key = make_interpolation_control_node(
                comp,
                control,
                parent=parent,
                frame_x=x,
                frame_y=y + row_counts[group] * 86,
            )
            output_key = "outputValue"
        elif control_mode == "splitter":
            node, output_key = make_splitter_control_node(
                comp,
                control,
                parent=parent,
                key_style=splitter_key_style,
                frame_x=x,
                frame_y=y + row_counts[group] * 86,
            )
            control_input_key, _ = SPLITTER_KEY_STYLES[splitter_key_style]
        else:
            raise ValueError(f"Unsupported control mode: {control_mode}")
        row_counts[group] += 1
        controls[control["input_key"]] = (node, output_key, control_input_key)
    return controls


def publish_field_inputs_to_root(comp, *, root, field, control_count=None):
    """Expose raw field shader inputs through the root container without rewiring values."""
    control_defs = (
        FIELD_CONTROL_DEFS[:control_count] if control_count else FIELD_CONTROL_DEFS
    )
    for index, control in enumerate(control_defs):
        child_pk = comp.find_input_pk(field, control["input_key"])
        parent_pk = comp.add_input(
            root,
            control["input_key"],
            control["title"],
            index,
            port_type=PortType.FLOAT,
            is_assignable=False,
        )
        for input_row in comp._inputs:
            if input_row["Z_PK"] == child_pk:
                input_row["ZCHILD"] = parent_pk
                input_row["Z4_CHILD"] = EntityType.INPUT
            elif input_row["Z_PK"] == parent_pk:
                input_row["ZPARENT"] = child_pk
                input_row["Z4_PARENT"] = EntityType.ASSIGNABLE_INPUT


def publish_control_inputs_to_root(comp, *, root, controls, control_count=None):
    """Expose generated value-control inputs through the root container for FxPack import."""
    control_defs = (
        FIELD_CONTROL_DEFS[:control_count] if control_count else FIELD_CONTROL_DEFS
    )
    for index, control in enumerate(control_defs):
        control_node, _, control_input_key = controls[control["input_key"]]
        child_pk = comp.find_input_pk(control_node, control_input_key)
        published_key_base = control_input_key.rstrip("0123456789")
        published_key = (
            published_key_base if index == 0 else f"{published_key_base}{index}"
        )
        parent_pk = comp.add_input(
            root,
            published_key,
            control["title"],
            index,
            is_assignable=False,
        )
        for input_row in comp._inputs:
            if input_row["Z_PK"] == child_pk:
                input_row["ZCHILD"] = parent_pk
                input_row["Z4_CHILD"] = EntityType.INPUT
            elif input_row["Z_PK"] == parent_pk:
                input_row["ZPARENT"] = child_pk
                input_row["Z4_PARENT"] = EntityType.ASSIGNABLE_INPUT


def build_native_text_composition(
    *,
    text_scale,
    text_glow_radius=18.0,
    control_mode="raw",
    control_count=None,
    splitter_key_style="float",
    publish_field_inputs=True,
):
    comp = Composition()
    configure_window_state(comp)

    root = make_ci_container_node(comp, "Root")
    output_info = make_output_info_node(
        comp, "Output", parent=root, frame_x=40, frame_y=180
    )
    time = make_local_time_node(comp, "Time", parent=root, frame_x=40, frame_y=300)
    field = make_cishader_node(
        comp,
        "Shader Lab Animated Field",
        parent=root,
        shader_source=COMPOSITE_SHADER_PATH.read_text(),
        kernel_name="slField",
        inputs=FIELD_SHADER_INPUTS,
        frame_x=280,
        frame_y=80,
    )
    # Add kernelArgumentOptions to set slider ranges on CIShader float inputs.
    # We emit TWO copies of each range entry: one keyed by the FxCore input name
    # (e.g. "inputU_pattern_cell_size") and one by the bare Metal param name
    # (e.g. "u_pattern_cell_size"), since we don't yet know which key FxCore uses.
    control_defs = (
        FIELD_CONTROL_DEFS[:control_count] if control_count else FIELD_CONTROL_DEFS
    )
    arg_ranges = {}
    for cdef in control_defs:
        input_key = cdef["input_key"]  # e.g. "inputU_pattern_cell_size"
        # Bare Metal name: strip "input" prefix, lowercase first char
        metal_name = input_key
        if metal_name.startswith("input"):
            metal_name = metal_name[len("input") :]
        if metal_name.startswith("U_"):
            metal_name = "u_" + metal_name[2:]
        # Add both key variants
        arg_ranges[input_key] = (cdef["minimum"], cdef["maximum"])
        arg_ranges[metal_name] = (cdef["minimum"], cdef["maximum"])
    if arg_ranges:
        from fxcore_gen import _build_kernel_arg_options_archive

        comp.add_node_kvp(
            field,
            "kernelArgumentOptions",
            _build_kernel_arg_options_archive(arg_ranges),
        )
    field_controls = {}
    if control_mode in {"interpolation", "splitter"}:
        field_controls = make_field_control_nodes(
            comp,
            parent=root,
            control_mode=control_mode,
            control_count=control_count,
            splitter_key_style=splitter_key_style,
        )
        if publish_field_inputs:
            publish_control_inputs_to_root(
                comp,
                root=root,
                controls=field_controls,
                control_count=control_count,
            )
    elif publish_field_inputs:
        publish_field_inputs_to_root(
            comp,
            root=root,
            field=field,
            control_count=control_count,
        )
    text_color = make_rgb_color_node(
        comp,
        "White Text Matte",
        parent=root,
        r=1.0,
        g=1.0,
        b=1.0,
        a=1.0,
        frame_x=280,
        frame_y=560,
    )
    text = make_image_with_string_node(
        comp,
        f"Native Text Matte ({text_scale:.2f}x)",
        parent=root,
        text_scale=text_scale,
        frame_x=560,
        frame_y=540,
    )
    glow = make_gaussian_blur_node(
        comp,
        "Text Glow Mask",
        parent=root,
        radius=text_glow_radius,
        frame_x=820,
        frame_y=540,
    )
    black = make_black_source_node(
        comp,
        "Opaque Black Background",
        parent=root,
        frame_x=820,
        frame_y=100,
    )
    glow_mask = make_blend_with_mask_node(
        comp,
        "Glow Field Over Black",
        parent=root,
        frame_x=1060,
        frame_y=160,
    )
    sharp_mask = make_blend_with_mask_node(
        comp,
        "Sharp Field Through Text",
        parent=root,
        frame_x=1300,
        frame_y=260,
    )
    billboard = make_billboard_node(
        comp, "2D Output", parent=root, frame_x=1560, frame_y=260
    )

    comp.wire(output_info, "outputSize", field, "inputU_resolution")
    comp.wire(time, "outputLocalTime", field, "inputU_time")
    for input_key, (control_node, output_key, _) in field_controls.items():
        comp.wire(control_node, output_key, field, input_key)
    comp.wire(output_info, "outputCenter", text, "inputBaseline")
    comp.wire(text_color, "outputColor", text, "inputColor")
    comp.wire(text, "outputImage", glow, "inputImage")
    comp.wire(field, "outputImage", glow_mask, "inputImage")
    comp.wire(black, "outputImage", glow_mask, "inputBackgroundImage")
    comp.wire(glow, "outputImage", glow_mask, "inputMaskImage")
    comp.wire(field, "outputImage", sharp_mask, "inputImage")
    comp.wire(glow_mask, "outputImage", sharp_mask, "inputBackgroundImage")
    comp.wire(text, "outputImage", sharp_mask, "inputMaskImage")
    comp.wire(sharp_mask, "outputImage", billboard, "inputImage")

    return comp


def build_procedural_text_fxcore(output_path):
    comp = Composition()
    configure_window_state(comp)

    root = make_ci_container_node(comp, "Root")
    output_info = make_output_info_node(
        comp, "Output", parent=root, frame_x=40, frame_y=220
    )
    time = make_local_time_node(comp, "Time", parent=root, frame_x=40, frame_y=340)
    shader = make_cishader_node(
        comp,
        "Shader Lab 5-Layer Composite",
        parent=root,
        shader_source=COMPOSITE_SHADER_PATH.read_text(),
        kernel_name="slComposite",
        inputs=[
            ("inputU_resolution", "U Resolution", PortType.GEOMETRY),
            ("inputU_time", "U Time", PortType.FLOAT),
        ],
        frame_x=260,
        frame_y=240,
    )
    billboard = make_billboard_node(
        comp, "2D Output", parent=root, frame_x=560, frame_y=240
    )

    comp.wire(output_info, "outputSize", shader, "inputU_resolution")
    comp.wire(time, "outputLocalTime", shader, "inputU_time")
    comp.wire(shader, "outputImage", billboard, "inputImage")
    comp.save(str(output_path))


def configure_window_state(comp):
    """Seed visible editor and output windows using FxCore's native frame encodings."""
    comp.set_aspect_ratio(16, 9)
    comp.add_comp_kvp("outputSampleCount", _bplist_int(1))
    comp.add_comp_kvp("outputWindowFrame", _bplist_string("{{960, 720}, {960, 540}}"))
    comp.add_comp_kvp(
        "editingWindowFrame", _bplist_string("40 80 1400 900 0 0 2560 1415 ")
    )


def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate the Shader Lab default five-layer FxCore composition."
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=OUTPUT_PATH,
        help=f"Output .fxcore path. Default: {OUTPUT_PATH}",
    )
    parser.add_argument(
        "--open",
        action="store_true",
        help="Open the generated file in FxCore after validation.",
    )
    parser.add_argument(
        "--experimental-chain",
        action="store_true",
        help="Generate the earlier five-node sampled-CIShader chain. This is known to be fragile in FxCore.",
    )
    parser.add_argument(
        "--procedural-text",
        action="store_true",
        help="Use the older single-CIShader procedural text mask instead of native FxCore text nodes.",
    )
    parser.add_argument(
        "--text-scale",
        type=float,
        default=1.0,
        help="Scale multiplier for the native FxCore text matte. Default: 1.0.",
    )
    parser.add_argument(
        "--text-glow-radius",
        type=float,
        default=18.0,
        help="Gaussian blur radius for the native text glow/mask. Default: 18.",
    )
    parser.add_argument(
        "--experimental-value-controls",
        action="store_true",
        help=(
            "Wire shader values through generated Interpolation scalar control nodes. "
            "Experimental: the default keeps raw shader inputs."
        ),
    )
    parser.add_argument(
        "--raw-values",
        action="store_true",
        help=(
            "Generate the raw shader input baseline without published root inputs "
            "or generated control nodes."
        ),
    )
    parser.add_argument(
        "--no-publish-field-inputs",
        action="store_true",
        help=(
            "Do not publish Shader Lab Animated Field parameters to the root container. "
            "Publishing is enabled by default and does not change render wiring."
        ),
    )
    parser.add_argument(
        "--experimental-splitter-controls",
        action="store_true",
        help="Wire shader values through generated FxCore Splitter scalar control nodes.",
    )
    parser.add_argument(
        "--control-count",
        type=int,
        default=None,
        help="Limit experimental control-node wiring to the first N shader controls.",
    )
    parser.add_argument(
        "--splitter-key-style",
        choices=sorted(SPLITTER_KEY_STYLES),
        default="double",
        help="Scalar input/output key naming to use for experimental Splitter controls.",
    )
    parser.add_argument(
        "--skip-metal-check",
        action="store_true",
        help="Skip xcrun Metal syntax validation.",
    )
    parser.add_argument(
        "--skip-db-check",
        action="store_true",
        help="Skip SQLite graph/integrity validation.",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    output_path = args.output.expanduser().resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    shader_path = SHADER_PATH if args.experimental_chain else COMPOSITE_SHADER_PATH
    if args.experimental_chain:
        expected = {"nodes": 9, "inputs": 16, "outputs": 9, "connections": 15}
    elif args.procedural_text:
        expected = {"nodes": 5, "inputs": 4, "outputs": 5, "connections": 3}
    elif args.experimental_splitter_controls:
        count = args.control_count or len(FIELD_CONTROL_DEFS)
        published_inputs = 0 if args.no_publish_field_inputs else count
        expected = {
            "nodes": 11 + count,
            "inputs": 47 + count + published_inputs,
            "outputs": 12 + count,
            "connections": 12 + count,
        }
    elif args.experimental_value_controls:
        count = args.control_count or len(FIELD_CONTROL_DEFS)
        published_inputs = 0 if args.no_publish_field_inputs else count
        expected = {
            "nodes": 11 + count,
            "inputs": 47 + (6 * count) + published_inputs,
            "outputs": 12 + count,
            "connections": 12 + count,
        }
    elif args.raw_values or args.no_publish_field_inputs:
        expected = {"nodes": 11, "inputs": 47, "outputs": 12, "connections": 12}
    else:
        count = args.control_count or len(FIELD_CONTROL_DEFS)
        expected = {"nodes": 11, "inputs": 47 + count, "outputs": 12, "connections": 12}

    if not args.skip_metal_check:
        validate_metal(shader_path)

    if args.experimental_chain:
        build_fxcore(output_path)
    elif args.procedural_text:
        build_procedural_text_fxcore(output_path)
    else:
        if args.experimental_value_controls and args.experimental_splitter_controls:
            raise ValueError("Choose only one experimental control mode.")
        comp = build_native_text_composition(
            text_scale=max(0.1, args.text_scale),
            text_glow_radius=max(0.0, args.text_glow_radius),
            control_mode=(
                "splitter"
                if args.experimental_splitter_controls
                else "interpolation"
                if args.experimental_value_controls
                else "raw"
            ),
            control_count=args.control_count,
            splitter_key_style=args.splitter_key_style,
            publish_field_inputs=not (args.raw_values or args.no_publish_field_inputs),
        )
        comp.save(str(output_path))

    if not args.skip_db_check:
        validate_fxcore(output_path, expected)

    print(output_path)

    if args.open:
        subprocess.run(["open", "-a", "FxCore", str(output_path)], check=True)


if __name__ == "__main__":
    main()
