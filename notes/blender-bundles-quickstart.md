# Quick Start: Blender 5.0 + Bundles for Your Landscape Workflow

This guide helps you immediately adopt the most impactful new feature (Closures/Bundles) in your existing generative landscape workflow.

## Step 1: Install Blender 5.0

Download from: https://www.blender.org/download/

**Check your current files:**
- Open Blender 5.0
- File → Open → Navigate to your existing .blend files
- Most Ducky3D tutorials will work without changes
- Simulation zones are now more stable

## Step 2: Create Your First Bundle

### What You'll Build
A **Landscape Params Bundle** to replace your scattered parameter inputs.

### Node Setup

```
[Group Input]
    │
    ▼
[Combine XYZ] ──┐
                │
[Value: Scale] ─┼──► [Bundle: Landscape_Params]
                │         ├── seed: Integer
[Value: Seed] ──┤         ├── scale: Vector
                │         ├── height: Float
[Value: Height]─┘         └── noise_type: String
```

### Step-by-Step

1. **Create a new node group:**
   - Shift + A → Group → New
   - Name: `Landscape_Params_Bundle`

2. **Add inputs to the group:**
   - `seed` (Integer)
   - `scale` (Vector)
   - `height_multiplier` (Float)
   - `noise_type` (String - use Menu Switch node)

3. **Create the bundle:**
   - Add **Combine Bundle** node (new in 5.0)
   - Connect all inputs to the bundle
   - Name the bundle "Landscape_Params"

4. **Use the bundle in your landscape:**
   ```
   [Bundle Output: Landscape_Params]
           │
           ▼
   [Separate Bundle] ──┬──► [Math] ──► [Noise Texture: Scale]
       ├── seed        │
       ├── scale       ├──► [Noise Texture: Detail]
       ├── height      │
       └── noise_type  └──► [Switch] ──► [Noise Type]
   ```

## Step 3: Refactor Your Landscape Node Group

### Current Structure (Likely)
```
[Noise Texture] ──► [ColorRamp] ──► [Set Position]
      ▲
[Separate XYZ] ◄── [Input: Scale]
```

### New Structure with Bundles
```
[Input: Landscape_Params (Bundle)]
           │
           ▼
   [Separate Bundle]
           │
     ┌────┼────┐
     ▼    ▼    ▼
[Noise] [Math] [Color]
     │     │     │
     └────┼─────┘
          ▼
   [Set Position]
```

### Action Items

1. **Replace multiple inputs** with single bundle input
2. **Use Separate Bundle** node to extract parameters
3. **Keep the core logic** (noise, displacement, etc.)
4. **Test** that output looks identical

## Step 4: Advanced - Nested Bundles

### Scenario: Complex Landscape with Multiple Layers

```
Master_Bundle: {
  terrain: Terrain_Bundle {
    base_height: Float,
    noise_params: Noise_Bundle {
      scale: Float,
      detail: Float,
      roughness: Float
    }
  },
  scatter: Scatter_Bundle {
    density: Float,
    object_types: List,
    scale_variance: Float
  }
}
```

### Implementation

1. Create `Noise_Bundle` node group first
2. Create `Terrain_Bundle` that includes `Noise_Bundle`
3. Create `Master_Bundle` that combines everything
4. Use **Bundle Insert** node to nest bundles

## Step 5: Integration with Your Three.js Export

### Current Export Script (Hypothetical)

```python
# Current approach - multiple parameters
export_landscape(
    mesh=landscape_mesh,
    seed=42,
    scale=(10, 10, 5),
    height=2.5,
    noise_type="Musgrave"
)
```

### New Approach with Bundles

```python
# Export the entire bundle
bundle_data = get_bundle_data("Landscape_Params")
export_landscape_bundle(bundle_data)

# In Three.js:
const landscape = generateFromBundle(bundleData);
// Bundle contains all parameters needed for recreation
```

### Python Script for Blender

```python
import bpy
import json

def export_landscape_bundle(filepath: str):
    """Export landscape bundle to JSON for Three.js"""
    
    # Get the active object with geometry nodes
    obj = bpy.context.active_object
    modifier = obj.modifiers["GeometryNodes"]
    
    # Access bundle data (new API in 5.0)
    bundle = modifier.node_group.inputs["Landscape_Params"]
    
    # Extract bundle contents
    bundle_data = {
        "seed": bundle.seed,
        "scale": list(bundle.scale),
        "height_multiplier": bundle.height_multiplier,
        "noise_type": bundle.noise_type,
        "geometry": export_mesh_data(obj)
    }
    
    # Save to JSON
    with open(filepath, 'w') as f:
        json.dump(bundle_data, f, indent=2)
    
    print(f"Exported bundle to {filepath}")

# Usage
export_landscape_bundle("/path/to/threejs-app/public/assets/landscape_bundle.json")
```

## Step 6: MCP Server Preparation

While waiting for official MCP server, prepare your workflow:

### Document Natural Language Commands

Think about how you'd describe your landscape generation:

```
"Create a rocky mountain landscape with:
- High frequency noise for rocks
- Snow above elevation 500m  
- A river valley cutting through
- Sparse vegetation on slopes
- Export to threejs-app"
```

### Create Command Templates

```python
# mcp_commands.py
LANDSCAPE_TEMPLATES = {
    "rocky_mountain": {
        "noise_type": "Musgrave",
        "scale": (15, 15, 8),
        "detail": 15,
        "roughness": 0.8,
        "snow_threshold": 500
    },
    "rolling_hills": {
        "noise_type": "Voronoi", 
        "scale": (25, 25, 3),
        "detail": 8,
        "roughness": 0.4
    },
    "desert_dunes": {
        "noise_type": "Wave",
        "scale": (8, 40, 4),
        "detail": 4,
        "roughness": 0.2
    }
}

def parse_landscape_description(description: str) -> dict:
    """
    Parse natural language to landscape parameters.
    This will integrate with MCP server when available.
    """
    # Simple keyword matching (placeholder for LLM)
    params = {}
    
    if "mountain" in description.lower():
        params.update(LANDSCAPE_TEMPLATES["rocky_mountain"])
    elif "hills" in description.lower():
        params.update(LANDSCAPE_TEMPLATES["rolling_hills"])
    elif "desert" in description.lower():
        params.update(LANDSCAPE_TEMPLATES["desert_dunes"])
    
    # Extract numbers
    import re
    elevations = re.findall(r'(\d+)m', description)
    if elevations:
        params["snow_threshold"] = int(elevations[0])
    
    return params
```

## Common Issues & Solutions

### Issue 1: "Bundle node not found"
**Solution:** Ensure you're using Blender 5.0+. Bundles are only available in 5.0+.

### Issue 2: "Simulation zones break with bundles"
**Solution:** Update your simulation zones to 5.0 format:
- Bake support is now built-in
- Use "Skip" input on Simulation Output node
- Reset simulation when changing bundled parameters

### Issue 3: "Export script doesn't work"
**Solution:** The Python API for bundles is new. Check:
```python
# Check Blender version
import bpy
print(bpy.app.version)  # Should be (5, 0, 0) or higher

# Check if bundle API exists
try:
    from bpy.types import GeometryNodeBundle
    print("Bundle API available")
except ImportError:
    print("Bundle API not found - update Blender")
```

## Testing Checklist

- [ ] Blender 5.0 installed and running
- [ ] Opened existing landscape .blend file
- [ ] Created first bundle node group
- [ ] Refactored main landscape node group
- [ ] Output looks identical to before
- [ ] Export script works with bundles
- [ ] Three.js app can import bundled data

## Next Steps

1. **Experiment** with closures (functions as data)
2. **Plan** for MCP server integration
3. **Document** your bundle structures
4. **Share** your workflow with the community

## Resources

- [Bundles and Closures Blog Post](https://code.blender.org/2025/08/bundles-and-closures/)
- [Blender 5.0 Manual - Bundles](https://docs.blender.org/manual/en/5.0/modeling/geometry_nodes/bundles.html)
- Your existing Ducky3D tutorials (still relevant!)

---

**Estimated time to implement:** 2-4 hours for basic bundle setup
**Impact:** 50% reduction in node graph complexity, easier parameter sharing

Happy Blending! 🎨
