    #include <metal_stdlib>
    #include <CoreImage/CoreImage.h>
    using namespace metal; extern "C" { namespace coreimage { // FxCore: Begin User Content

static float sl_saturate(float x) {
    return clamp(x, 0.0, 1.0);
}

static float3 sl_saturate3(float3 x) {
    return clamp(x, float3(0.0), float3(1.0));
}

static float sl_luma(float3 c) {
    return dot(c, float3(0.2126, 0.7152, 0.0722));
}

static float sl_hash21(float2 p) {
    p = fract(p * float2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

static float sl_noise(float2 p) {
    float2 i = floor(p);
    float2 f = fract(p);
    float2 u = f * f * (3.0 - 2.0 * f);
    float a = sl_hash21(i);
    float b = sl_hash21(i + float2(1.0, 0.0));
    float c = sl_hash21(i + float2(0.0, 1.0));
    float d = sl_hash21(i + float2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

static float2 sl_rotate(float2 p, float a) {
    float s = sin(a);
    float c = cos(a);
    return float2(c * p.x - s * p.y, s * p.x + c * p.y);
}

static float3 sl_saturate_color(float3 c, float sat) {
    float y = sl_luma(c);
    return mix(float3(y), c, sat);
}

static float sl_segment(float2 p, float2 a, float2 b, float radius, float feather) {
    float2 pa = p - a;
    float2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    float d = length(pa - ba * h);
    return 1.0 - smoothstep(radius, radius + feather, d);
}

static float sl_bar(float2 p, float2 center, float2 half_size, float feather) {
    float2 d = abs(p - center) - half_size;
    float outside = length(max(d, float2(0.0))) + min(max(d.x, d.y), 0.0);
    return 1.0 - smoothstep(0.0, feather, outside);
}

static float sl_oval_stroke(float2 p, float2 center, float2 radius, float stroke, float feather) {
    float2 q = (p - center) / radius;
    float d = abs(length(q) - 1.0);
    return 1.0 - smoothstep(stroke, stroke + feather, d);
}

static float sl_lower_letter(float2 p, int letter, float feather) {
    float m = 0.0;
    float th = 0.105;

    if (letter == 0) {
        // b
        m = max(m, sl_segment(p, float2(-0.31, -0.45), float2(-0.31, 0.48), th, feather));
        m = max(m, sl_oval_stroke(p, float2(0.03, -0.12), float2(0.36, 0.34), 0.30, feather));
        m = max(m, sl_segment(p, float2(-0.14, 0.16), float2(0.18, 0.16), th * 0.75, feather));
        m = max(m, sl_segment(p, float2(-0.14, -0.39), float2(0.18, -0.39), th * 0.72, feather));
    } else if (letter == 1) {
        // a
        m = max(m, sl_oval_stroke(p, float2(-0.05, -0.13), float2(0.34, 0.32), 0.31, feather));
        m = max(m, sl_segment(p, float2(0.27, -0.42), float2(0.27, 0.18), th, feather));
        m = max(m, sl_segment(p, float2(-0.17, 0.18), float2(0.17, 0.18), th * 0.65, feather));
    } else if (letter == 2) {
        // s
        m = max(m, sl_segment(p, float2(-0.29, 0.27), float2(0.30, 0.27), th, feather));
        m = max(m, sl_segment(p, float2(-0.25, -0.02), float2(0.21, -0.02), th, feather));
        m = max(m, sl_segment(p, float2(-0.28, -0.35), float2(0.31, -0.35), th, feather));
        m = max(m, sl_segment(p, float2(-0.31, 0.03), float2(-0.31, 0.25), th * 0.86, feather));
        m = max(m, sl_segment(p, float2(0.31, -0.30), float2(0.31, -0.06), th * 0.86, feather));
    } else if (letter == 3) {
        // e
        m = max(m, sl_oval_stroke(p, float2(0.0, -0.12), float2(0.36, 0.33), 0.28, feather));
        m = max(m, sl_segment(p, float2(-0.27, -0.06), float2(0.24, -0.06), th * 0.82, feather));
        float cut = sl_bar(p, float2(0.35, 0.12), float2(0.14, 0.20), feather * 1.2);
        m = max(0.0, m - cut * 0.65);
    } else if (letter == 4) {
        // m
        m = max(m, sl_segment(p, float2(-0.42, -0.43), float2(-0.42, 0.19), th, feather));
        m = max(m, sl_segment(p, float2(-0.02, -0.43), float2(-0.02, 0.16), th, feather));
        m = max(m, sl_segment(p, float2(0.38, -0.43), float2(0.38, 0.13), th, feather));
        m = max(m, sl_oval_stroke(p, float2(-0.22, 0.02), float2(0.24, 0.27), 0.30, feather));
        m = max(m, sl_oval_stroke(p, float2(0.18, 0.00), float2(0.24, 0.27), 0.30, feather));
        m = max(0.0, m - sl_bar(p, float2(-0.02, -0.44), float2(0.55, 0.20), feather * 2.0) * 0.45);
    } else if (letter == 5) {
        // n
        m = max(m, sl_segment(p, float2(-0.31, -0.43), float2(-0.31, 0.18), th, feather));
        m = max(m, sl_segment(p, float2(0.29, -0.43), float2(0.29, 0.06), th, feather));
        m = max(m, sl_oval_stroke(p, float2(-0.01, 0.00), float2(0.33, 0.30), 0.30, feather));
        m = max(0.0, m - sl_bar(p, float2(0.0, -0.44), float2(0.48, 0.20), feather * 2.0) * 0.48);
    } else {
        // t
        m = max(m, sl_segment(p, float2(-0.02, -0.43), float2(-0.02, 0.43), th, feather));
        m = max(m, sl_segment(p, float2(-0.30, 0.17), float2(0.31, 0.17), th * 0.88, feather));
        m = max(m, sl_segment(p, float2(-0.02, -0.41), float2(0.29, -0.37), th * 0.72, feather));
    }
    return sl_saturate(m);
}

static float sl_basement_mask(float2 uv, float2 resolution, float feather) {
    float aspect = 16.0 / 9.0;
    float2 center = float2(0.49, 0.56);
    float2 p = float2((uv.x - center.x) * aspect, uv.y - center.y);
    float word_width = 2.88;
    float word_height = 0.58;
    float2 q = float2(p.x / word_width + 0.5, p.y / word_height + 0.5);
    float margin = 0.18 + feather;
    if (q.x < -margin || q.x > 1.0 + margin || q.y < -margin || q.y > 1.0 + margin) {
        return 0.0;
    }

    float widths[8] = {0.86, 0.76, 0.70, 0.74, 1.08, 0.74, 0.78, 0.55};
    int letters[8] = {0, 1, 2, 3, 4, 3, 5, 6};
    float total = 0.0;
    for (int i = 0; i < 8; i++) {
        total += widths[i];
    }
    float spacing = -0.035;
    total += spacing * 7.0;

    float x = (q.x - 0.5) * total;
    float cursor = -total * 0.5;
    float m = 0.0;
    for (int i = 0; i < 8; i++) {
        float w = widths[i];
        if (x >= cursor - feather && x <= cursor + w + feather) {
            float lx = ((x - cursor) / w - 0.5) * 1.0;
            float2 lp = float2(lx, (q.y - 0.5) * 1.16);
            m = max(m, sl_lower_letter(lp, letters[i], feather));
        }
        cursor += w + spacing;
    }
    return sl_saturate(m);
}

static float sl_bayer4(int x, int y) {
    int xi = x & 3;
    int yi = y & 3;
    int v = 0;
    if (yi == 0) {
        if (xi == 0) { v = 0; } else if (xi == 1) { v = 8; } else if (xi == 2) { v = 2; } else { v = 10; }
    } else if (yi == 1) {
        if (xi == 0) { v = 12; } else if (xi == 1) { v = 4; } else if (xi == 2) { v = 14; } else { v = 6; }
    } else if (yi == 2) {
        if (xi == 0) { v = 3; } else if (xi == 1) { v = 11; } else if (xi == 2) { v = 1; } else { v = 9; }
    } else {
        if (xi == 0) { v = 15; } else if (xi == 1) { v = 7; } else if (xi == 2) { v = 13; } else { v = 5; }
    }
    return (float(v) + 0.5) / 16.0;
}

static float3 sl_gradient(
    float2 frag,
    float2 resolution,
    float time,
    float warp_amount,
    float warp_scale,
    float motion_speed,
    float vortex_amount,
    float saturation
) {
    float2 uv = frag / resolution;
    float2 p = (frag - 0.5 * resolution) / resolution.y;
    float t = time * max(motion_speed, 0.0) * 0.225;
    float2 w = p;
    float amp = max(warp_amount, 0.0);
    float scale = max(warp_scale, 0.25);

    for (int i = 0; i < 3; i++) {
        float n1 = sl_noise(w * scale + float2(93.1, t * 2.0));
        float n2 = sl_noise(w.yx * scale + float2(t * 1.7, 41.9));
        w += (float2(n1, n2) - 0.5) * amp;
        amp *= 0.55;
        scale *= 1.7;
    }

    float vortex = vortex_amount * (1.0 - sl_saturate(length(w) * 0.75));
    w = sl_rotate(w, vortex + 0.06 * sin(time * 2.0));

    float3 c1 = float3(0.2392, 0.1255, 0.1255);
    float3 c2 = float3(1.0000, 0.0000, 0.0000);
    float d1 = pow(max(length(w), 0.04), -3.5) * 0.6;
    float d2 = pow(max(length(w - float2(-0.7, -0.5)), 0.04), -3.5) * 1.3;
    float3 col = (c1 * d1 + c2 * d2) / max(d1 + d2, 0.0001);

    float vignette = smoothstep(1.05, 0.25, length((uv - 0.5) * float2(resolution.x / resolution.y, 1.0)));
    col = col * (0.55 + 0.85 * vignette) + sl_noise(w * 9.0 + t) * 0.10;
    col = sl_saturate_color(col, saturation);
    return sl_saturate3(col / (col + float3(0.72)));
}

static float3 sl_pattern(float3 col, float2 frag, float cell_size, float bg_opacity, float pattern_boost) {
    float size = max(cell_size, 1.0);
    float2 cell = floor(frag / size);
    float2 local = fract(frag / size);
    float lum = sl_luma(col);
    float phase = sl_hash21(cell) * 0.12;
    float width = mix(0.16, 0.92, smoothstep(0.05, 0.95, lum));
    float vertical = 1.0 - smoothstep(width * 0.5, width * 0.5 + 0.08, abs(local.x - 0.5 + phase));
    float horizontal = 1.0 - smoothstep(width * 0.45, width * 0.45 + 0.08, abs(local.y - 0.5 - phase));
    float bars = mix(vertical, horizontal, step(0.5, sl_hash21(cell + 3.1)));
    return sl_saturate3(mix(col * bg_opacity, col * pattern_boost, bars) + col * bars * bars * 0.20 * pattern_boost);
}

static float3 sl_dither(float3 col, float2 frag, float pixel_size, float spread, float level_count) {
    float size = max(pixel_size, 0.5);
    int bx = int(floor(frag.x / size));
    int by = int(floor(frag.y / size));
    float threshold = sl_bayer4(bx, by) - 0.5;
    float levels = max(level_count, 2.0);
    return sl_saturate3(floor(sl_saturate3(col) * (levels - 1.0) + 0.5 + threshold * spread) / (levels - 1.0));
}

static float3 sl_crt(
    float3 col,
    float2 frag,
    float2 resolution,
    float time,
    float scanline_intensity,
    float mask_intensity,
    float brightness,
    float vignette_intensity,
    float flicker_intensity,
    float noise_amount
) {
    float2 uv = frag / resolution;
    float2 centered = uv * 2.0 - 1.0;
    centered.x *= resolution.x / resolution.y;
    float signal = smoothstep(0.004, 0.12, sl_luma(col));
    float scanline = mix(1.0, 1.0 - scanline_intensity, 0.5 + 0.5 * cos(frag.y * 3.14159265));
    float2 mask_cell = fract(frag / 6.0);
    float base_slot = 0.72 + 0.28 * step(0.34, mask_cell.x) * step(mask_cell.x, 0.66);
    float slot = mix(1.0, base_slot, mask_intensity);
    float3 base_triad = 0.82 + 0.18 * sin((frag.x / 6.0) * 6.2831853 + float3(0.0, 2.094, 4.188));
    float3 triad = mix(float3(1.0), base_triad, mask_intensity);
    float vignette = mix(1.0, smoothstep(1.24, 0.35, length(centered)), vignette_intensity);
    float flicker = 1.0 + flicker_intensity * (0.175 * sin(time * 37.0) + 0.10 * sl_noise(float2(time * 5.0, frag.y * 0.01)));
    col *= scanline * slot * triad * vignette * flicker;
    col = pow(sl_saturate3(col * brightness + 0.16 * sl_luma(col)), float3(0.92));
    col += float3(noise_amount, noise_amount * 0.17, noise_amount * 0.17) * sl_noise(frag * 0.12 + time) * signal;
    return sl_saturate3(col);
}

[[stitchable]] float4 slComposite(float2 u_resolution, float u_time, destination dest) {
    float2 frag = dest.coord();
    float2 uv = frag / u_resolution;
    float3 col = sl_gradient(frag, u_resolution, u_time, 0.30, 3.0, 2.0, -0.25, 1.15);
    col = sl_pattern(col, frag, 8.0, 0.16, 1.25);
    float text_hard = sl_basement_mask(uv, u_resolution, 0.014);
    float text_glow = sl_basement_mask(uv, u_resolution, 0.22);
    col *= sl_saturate(max(text_hard, text_glow * 0.52));
    col += float3(0.34, 0.018, 0.012) * text_glow * 0.35;
    col *= float3(1.45, 0.24, 0.16);
    col = sl_dither(col, frag, 2.0, 0.5, 3.0);
    col = sl_crt(col, frag, u_resolution, u_time, 0.17, 1.0, 1.2, 0.45, 0.2, 0.018);
    return float4(col, 1.0);
}

[[stitchable]] float4 slField(
    float2 u_resolution,
    float u_time,
    float u_gradient_warp,
    float u_gradient_scale,
    float u_motion_speed,
    float u_vortex_amount,
    float u_saturation,
    float u_pattern_cell_size,
    float u_pattern_bg_opacity,
    float u_pattern_boost,
    float u_dither_pixel_size,
    float u_dither_spread,
    float u_dither_levels,
    float u_scanline_intensity,
    float u_mask_intensity,
    float u_brightness,
    float u_vignette_intensity,
    float u_flicker_intensity,
    float u_noise_amount,
    destination dest
) {
    float2 frag = dest.coord();
    float3 col = sl_gradient(
        frag,
        u_resolution,
        u_time,
        u_gradient_warp,
        u_gradient_scale,
        u_motion_speed,
        u_vortex_amount,
        u_saturation
    );
    col = sl_pattern(col, frag, u_pattern_cell_size, u_pattern_bg_opacity, u_pattern_boost);
    col = sl_dither(col, frag, u_dither_pixel_size, u_dither_spread, u_dither_levels);
    col = sl_crt(
        col,
        frag,
        u_resolution,
        u_time,
        u_scanline_intensity,
        u_mask_intensity,
        u_brightness,
        u_vignette_intensity,
        u_flicker_intensity,
        u_noise_amount
    );
    return float4(col, 1.0);
}

[[stitchable]] float4 slBlack(destination dest) {
    return float4(0.0, 0.0, 0.0, 1.0);
}

} }
