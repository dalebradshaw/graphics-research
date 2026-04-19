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

static float sl_box(float2 p, float2 center, float2 half_size) {
    float2 d = abs(p - center) - half_size;
    float outside = max(d.x, d.y);
    return 1.0 - smoothstep(0.0, 0.025, outside);
}

static float sl_segment(float2 p, float2 a, float2 b, float radius) {
    float2 pa = p - a;
    float2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    float d = length(pa - ba * h);
    return 1.0 - smoothstep(radius, radius + 0.025, d);
}

static float sl_seven_segment(float2 p, int letter) {
    float m = 0.0;
    float th = 0.095;
    bool top = false;
    bool mid = false;
    bool bot = false;
    bool ul = false;
    bool ur = false;
    bool ll = false;
    bool lr = false;
    bool center = false;
    bool diag_a = false;
    bool diag_b = false;

    if (letter == 0) { top = true; mid = true; bot = true; ul = true; ur = true; ll = true; lr = true; }      // B
    if (letter == 1) { top = true; mid = true; ul = true; ur = true; ll = true; lr = true; }                  // A
    if (letter == 2) { top = true; mid = true; bot = true; ul = true; lr = true; }                            // S
    if (letter == 3) { top = true; mid = true; bot = true; ul = true; ll = true; }                            // E
    if (letter == 4) { ul = true; ur = true; ll = true; lr = true; diag_a = true; diag_b = true; }            // M
    if (letter == 5) { top = true; mid = true; bot = true; ul = true; ll = true; }                            // E
    if (letter == 6) { ul = true; ur = true; ll = true; lr = true; diag_a = true; }                           // N
    if (letter == 7) { top = true; center = true; }                                                           // T

    if (top) { m = max(m, sl_box(p, float2(0.0, 0.40), float2(0.35, th))); }
    if (mid) { m = max(m, sl_box(p, float2(0.0, 0.00), float2(0.33, th))); }
    if (bot) { m = max(m, sl_box(p, float2(0.0, -0.40), float2(0.35, th))); }
    if (ul) { m = max(m, sl_box(p, float2(-0.33, 0.22), float2(th, 0.26))); }
    if (ur) { m = max(m, sl_box(p, float2(0.33, 0.22), float2(th, 0.26))); }
    if (ll) { m = max(m, sl_box(p, float2(-0.33, -0.22), float2(th, 0.26))); }
    if (lr) { m = max(m, sl_box(p, float2(0.33, -0.22), float2(th, 0.26))); }
    if (center) { m = max(m, sl_box(p, float2(0.0, 0.02), float2(th, 0.44))); }
    if (diag_a) { m = max(m, sl_segment(p, float2(-0.30, 0.38), float2(0.30, -0.38), th * 0.75)); }
    if (diag_b) { m = max(m, sl_segment(p, float2(0.30, 0.38), float2(-0.30, -0.38), th * 0.75)); }
    return sl_saturate(m);
}

static float sl_basement_mask(float2 uv, float2 resolution) {
    float aspect = resolution.x / resolution.y;
    float2 p = float2((uv.x - 0.5) * aspect, uv.y - 0.5);
    p.y += 0.015;
    float word_width = 1.30;
    float word_height = 0.28;
    float2 q = float2(p.x / word_width + 0.5, p.y / word_height + 0.5);
    if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0) {
        return 0.0;
    }
    float cell = q.x * 8.0;
    int idx = int(floor(cell));
    float lx = fract(cell);
    float2 lp = float2((lx - 0.5) * 1.35, (q.y - 0.5) * 1.85);
    return sl_seven_segment(lp, idx);
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

[[stitchable]] float4 slGradient(float2 u_resolution, float u_time, destination dest) {
    float2 frag = dest.coord();
    float2 uv = frag / u_resolution;
    float2 p = (frag - 0.5 * u_resolution) / u_resolution.y;
    float t = u_time * 0.45;

    float2 w = p;
    float amp = 0.30;
    float scale = 3.0;
    for (int i = 0; i < 3; i++) {
        float n1 = sl_noise(w * scale + float2(93.1, t * 2.0));
        float n2 = sl_noise(w.yx * scale + float2(t * 1.7, 41.9));
        w += (float2(n1, n2) - 0.5) * amp;
        amp *= 0.55;
        scale *= 1.7;
    }

    float vortex = -0.25 * (1.0 - sl_saturate(length(w) * 0.75));
    w = sl_rotate(w, vortex + 0.06 * sin(u_time * 2.0));

    float3 c1 = float3(0.2392, 0.1255, 0.1255);
    float3 c2 = float3(1.0000, 0.0000, 0.0000);
    float2 p1 = float2(0.0, 0.0);
    float2 p2 = float2(-0.7, -0.5);
    float d1 = pow(max(length(w - p1), 0.04), -3.5) * 0.6;
    float d2 = pow(max(length(w - p2), 0.04), -3.5) * 1.3;
    float3 col = (c1 * d1 + c2 * d2) / max(d1 + d2, 0.0001);

    float mist = sl_noise(w * 9.0 + t) * 0.10;
    float vignette = smoothstep(1.05, 0.25, length((uv - 0.5) * float2(u_resolution.x / u_resolution.y, 1.0)));
    col = col * (0.55 + 0.85 * vignette) + mist;
    col = sl_saturate_color(col, 1.15);
    col = col / (col + float3(0.72));
    return float4(sl_saturate3(col), 1.0);
}

[[stitchable]] float4 slPattern(sampler inputImage, float2 u_resolution, float u_time, destination dest) {
    float2 frag = dest.coord();
    float4 src = inputImage.sample(inputImage.transform(frag));
    float3 col = src.rgb;

    float cell_size = 8.0;
    float2 cell = floor(frag / cell_size);
    float2 local = fract(frag / cell_size);
    float lum = sl_luma(col);
    float phase = sl_hash21(cell) * 0.12;
    float width = mix(0.16, 0.92, smoothstep(0.05, 0.95, lum));
    float vertical = 1.0 - smoothstep(width * 0.5, width * 0.5 + 0.08, abs(local.x - 0.5 + phase));
    float horizontal = 1.0 - smoothstep(width * 0.45, width * 0.45 + 0.08, abs(local.y - 0.5 - phase));
    float bars = mix(vertical, horizontal, step(0.5, sl_hash21(cell + 3.1)));
    float bg_opacity = 0.16;
    float3 bg = col * bg_opacity;
    float3 out_col = mix(bg, col * 1.25, bars);
    out_col += col * bars * bars * 0.20;
    return float4(sl_saturate3(out_col), src.a);
}

[[stitchable]] float4 slTextStencil(sampler inputImage, float2 u_resolution, float u_time, destination dest) {
    float2 frag = dest.coord();
    float2 uv = frag / u_resolution;
    float4 src = inputImage.sample(inputImage.transform(frag));
    float mask = sl_basement_mask(uv, u_resolution);
    return float4(src.rgb * mask, src.a * mask);
}

[[stitchable]] float4 slDither(sampler inputImage, float2 u_resolution, float u_time, destination dest) {
    float2 frag = dest.coord();
    float pixel_size = 2.0;
    float2 snapped = floor(frag / pixel_size) * pixel_size + pixel_size * 0.5;
    float4 src = inputImage.sample(inputImage.transform(snapped));
    int bx = int(floor(snapped.x / pixel_size));
    int by = int(floor(snapped.y / pixel_size));
    float threshold = sl_bayer4(bx, by) - 0.5;
    float levels = 3.0;
    float spread = 0.5;
    float3 q = floor(sl_saturate3(src.rgb) * (levels - 1.0) + 0.5 + threshold * spread) / (levels - 1.0);
    return float4(sl_saturate3(q), src.a);
}

[[stitchable]] float4 slCRT(sampler inputImage, float2 u_resolution, float u_time, destination dest) {
    float2 frag = dest.coord();
    float2 uv = frag / u_resolution;
    float2 centered = uv * 2.0 - 1.0;
    centered.x *= u_resolution.x / u_resolution.y;

    float r2 = dot(centered, centered);
    float2 warped = centered * (1.0 + 0.15 * r2);
    warped.x /= u_resolution.x / u_resolution.y;
    float2 wuv = warped * 0.5 + 0.5;
    if (wuv.x < 0.0 || wuv.x > 1.0 || wuv.y < 0.0 || wuv.y > 1.0) {
        return float4(0.0, 0.0, 0.0, 1.0);
    }

    float2 wc = wuv * u_resolution;
    float split = 2.0;
    float r = inputImage.sample(inputImage.transform(wc + float2(split, 0.0))).r;
    float g = inputImage.sample(inputImage.transform(wc)).g;
    float b = inputImage.sample(inputImage.transform(wc - float2(split, 0.0))).b;
    float3 col = float3(r, g, b);

    float scanline = mix(1.0, 0.83, 0.5 + 0.5 * cos(wc.y * 3.14159265));
    float2 mask_cell = fract(wc / 6.0);
    float slot = 0.72 + 0.28 * step(0.34, mask_cell.x) * step(mask_cell.x, 0.66);
    float3 triad = 0.82 + 0.18 * sin((wc.x / 6.0) * 6.2831853 + float3(0.0, 2.094, 4.188));
    float vignette = smoothstep(1.24, 0.35, length(centered));
    float flicker = 1.0 + 0.035 * sin(u_time * 37.0) + 0.02 * sl_noise(float2(u_time * 5.0, wc.y * 0.01));

    col *= scanline * slot * triad * vignette * flicker;
    col = pow(sl_saturate3(col * 1.2 + 0.16 * sl_luma(col)), float3(0.92));
    col += float3(0.03, 0.005, 0.005) * sl_noise(wc * 0.12 + u_time);
    return float4(sl_saturate3(col), 1.0);
}

} }
