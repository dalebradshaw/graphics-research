/*
 * fxcore_slider_inject.m
 *
 * DYLD_INSERT_LIBRARIES dylib that swizzles
 * +[FxCorePlugInCIKernel optionsForArgumentName:index:class:vectorSize:
 *                        showSamplerOptions:useVectorInputs:colorInputsCount:]
 * to inject sliderMinimumValue / sliderMaximumValue into CIShader port options.
 *
 * The slider ranges are read from the node's kernelArgumentOptions KVP at runtime.
 * The KVP stores an NSDictionary: { argName: { "sliderMin": N, "sliderMax": N } }
 *
 * Build:
 *   clang -dynamiclib -framework Foundation -framework objc \
 *         -o fxcore_slider_inject.dylib fxcore_slider_inject.m
 *
 * Run:
 *   DYLD_INSERT_LIBRARIES=./fxcore_slider_inject.dylib /Applications/FxCore.app/Contents/MacOS/FxCore
 */

#import <Foundation/Foundation.h>
#import <objc/runtime.h>

// Original IMP storage
static IMP sOriginalOptionsIMP = NULL;

// Selector for the class method we swizzle
static SEL sOptionsSel;

// Type: +[CIKernel optionsForArgumentName:(NSString*)name
//                                   index:(NSUInteger)index
//                                   class:(Class)cls
//                              vectorSize:(NSUInteger)vectorSize
//                    showSamplerOptions:(BOOL)showSampler
//                       useVectorInputs:(BOOL)useVectors
//                      colorInputsCount:(NSUInteger)colorCount]
// Returns NSArray<NSDictionary*>*
typedef NSArray* (*OptionsIMP)(id, SEL, NSString*, NSUInteger, Class, NSUInteger, BOOL, BOOL, NSUInteger);

static NSArray* swizzled_optionsForArgumentName(id self, SEL _cmd,
    NSString *name, NSUInteger index, Class cls, NSUInteger vectorSize,
    BOOL showSamplerOptions, BOOL useVectorInputs, NSUInteger colorInputsCount)
{
    // Call original
    NSArray *result = ((OptionsIMP)sOriginalOptionsIMP)(
        self, _cmd, name, index, cls, vectorSize,
        showSamplerOptions, useVectorInputs, colorInputsCount);

    if (!result || result.count == 0) return result;

    // Check if this argument has slider ranges in kernelArgumentOptions
    // We store ranges as a global dict that gets populated from the KVP
    // For now, use a simple static dict (will be enhanced to read from KVP)
    static NSDictionary *sRanges = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        // Default ranges for ShaderLab parameters
        sRanges = @{
            @"u_gradient_warp":       @[@0.0, @1.5],
            @"u_gradient_scale":      @[@0.25, @8.0],
            @"u_motion_speed":        @[@0.0, @6.0],
            @"u_vortex_amount":       @[@-2.0, @2.0],
            @"u_saturation":          @[@0.0, @3.0],
            @"u_pattern_cell_size":   @[@1.0, @32.0],
            @"u_pattern_bg_opacity":  @[@0.0, @1.0],
            @"u_pattern_boost":       @[@0.0, @4.0],
            @"u_dither_pixel_size":   @[@1.0, @8.0],
            @"u_dither_spread":       @[@0.0, @2.0],
            @"u_dither_levels":       @[@2.0, @8.0],
            @"u_scanline_intensity":  @[@0.0, @1.0],
            @"u_mask_intensity":      @[@0.0, @2.0],
            @"u_brightness":          @[@0.5, @2.0],
            @"u_vignette_intensity":  @[@0.0, @1.0],
            @"u_flicker_intensity":   @[@0.0, @1.0],
            @"u_noise_amount":        @[@0.0, @0.1],
        };
    });

    NSArray *range = sRanges[name];
    if (!range) return result;

    float rmin = [range[0] floatValue];
    float rmax = [range[1] floatValue];

    NSMutableArray *newResult = [NSMutableArray arrayWithCapacity:result.count];
    for (NSDictionary *opts in result) {
        NSMutableDictionary *d = [opts mutableCopy];
        d[@"minimumValue"]        = @(rmin);
        d[@"maximumValue"]        = @(rmax);
        d[@"sliderMinimumValue"]  = @(rmin);
        d[@"sliderMaximumValue"]  = @(rmax);
        [newResult addObject:d];
    }

    NSLog(@"[SliderInject] Injected slider [%.2f, %.2f] for %@", rmin, rmax, name);
    return newResult;
}

static void do_swizzle(Class kernelClass);

__attribute__((constructor))
static void fxcore_slider_inject_init(void) {
    NSLog(@"[SliderInject] Loading slider injection dylib...");

    Class kernelClass = NSClassFromString(@"FxCorePlugInCIKernel");
    if (kernelClass) {
        do_swizzle(kernelClass);
    } else {
        [[NSNotificationCenter defaultCenter]
            addObserverForName:NSBundleDidLoadNotification
            object:nil queue:nil
            usingBlock:^(NSNotification *note) {
                Class kc = NSClassFromString(@"FxCorePlugInCIKernel");
                if (kc && !sOriginalOptionsIMP) {
                    do_swizzle(kc);
                }
            }];
    }
}

static void do_swizzle(Class kernelClass) {
    sOptionsSel = @selector(optionsForArgumentName:index:class:vectorSize:showSamplerOptions:useVectorInputs:colorInputsCount:);

    // Get the metaclass (class methods are instance methods on the metaclass)
    Class metaClass = object_getClass(kernelClass);

    Method m = class_getInstanceMethod(metaClass, sOptionsSel);
    if (!m) {
        NSLog(@"[SliderInject] ERROR: Could not find optionsForArgumentName: method");
        return;
    }

    sOriginalOptionsIMP = method_getImplementation(m);
    method_setImplementation(m, (IMP)swizzled_optionsForArgumentName);

    NSLog(@"[SliderInject] Successfully swizzled optionsForArgumentName:");
}
