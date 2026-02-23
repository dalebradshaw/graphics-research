# Blender MCP Integration - Example Workflows
# Copy and paste these prompts into Claude or Cursor to automate your Blender workflow

## ============================================================
## 🎨 GENERATIVE LANDSCAPE WORKFLOWS
## ============================================================

### 1. Create Basic Procedural Landscape
```
Create a procedural landscape in Blender using geometry nodes:
- Start with a 20x20 plane
- Add 6 levels of subdivision
- Use Musgrave noise texture with scale 15, detail 15, roughness 0.8
- Displace vertices based on noise
- Apply a color ramp material with dark brown at bottom transitioning to snow white at top
- Set up lighting with HDRI from Poly Haven
```

### 2. Generate Rocky Mountain Terrain
```
Generate a rocky mountain terrain:
1. Create a subdivided plane (subdivision level 6)
2. Add geometry nodes modifier
3. Use Musgrave noise with:
   - Scale: 15
   - Detail: 15
   - Roughness: 0.8
   - Dimension: 3.0
   - Lacunarity: 2.5
4. Displace geometry using noise
5. Create material with elevation-based colors:
   - Below 0.3: Dark rock (#5C4033)
   - 0.3-0.6: Light rock (#8B7355)
   - Above 0.6: Snow (#FFFFFF)
6. Add three-point lighting
7. Set up camera for dramatic angle
```

### 3. Create Desert Dunes
```
Create a desert dune landscape:
- Use Wave texture instead of noise
- Set wave type to Bands
- Direction along Y axis
- Profile as Sine
- Scale: 8, Detail: 4
- Height multiplier: 4
- Material with sandy colors (F4A460 to F5DEB3)
- Add sun lamp for harsh shadows
```

### 4. Batch Generate Landscape Variations
```
Generate 5 variations of a mountain landscape:
For each variation (1-5):
  - Create a new landscape with random seed
  - Use the same Musgrave noise settings
  - Vary the seed value
  - Export each as GLB to experiments/2025-10-02-generative-landscape/exports/
  - Create a JSON manifest with seed values and metadata

All variations should use the same base settings but different random seeds.
```

### 5. Export for Three.js
```
Export the current landscape for Three.js:
1. Ensure the mesh is selected
2. Export as GLB format
3. Enable material export
4. Set Y-up coordinate system
5. Save to: experiments/2025-10-02-generative-landscape/threejs-app/public/assets/
6. Also export heightmap as PNG for custom shaders
```

## ============================================================
## ✨ LIGHT TRAILS & CURVES WORKFLOWS
## ============================================================

### 6. Create Light Trail System
```
Create a light trail effect:
1. Draw a Bezier curve in the viewport
2. Convert to geometry using geometry nodes
3. Create a tube along the curve path
4. Add emission material with glow
5. Animate the material for flowing effect:
   - Use noise texture with time-based offset
   - Drive emission strength with animated value
6. Set up bloom in compositor
```

### 7. Animate Light Trails
```
Animate the light trail:
- Create keyframes on the material's offset
- Animate from frame 0 to 120
- Loop the animation seamlessly
- Add motion blur for trail effect
- Render as PNG sequence for web
```

### 8. Export Light Trails to Web
```
Export light trail for Three.js:
1. Bake the curve animation
2. Export curve data as JSON with point positions
3. Export material settings
4. Save to experiments/2025-10-02-generative-landscape/threejs-app/public/
5. Create a Three.js script to recreate the trail
```

## ============================================================
## 🎯 PARTICLE SYSTEMS & SCATTERING
## ============================================================

### 9. Create Particle Logo Animation
```
Create a particle system for logo animation:
1. Import SVG logo and convert to mesh
2. Use geometry nodes to:
   - Distribute points across logo surface
   - Convert points to small spheres
   - Animate particles converging to form logo
3. Add material with emission
4. Set up camera animation
5. Render animation
```

### 10. Scatter Vegetation on Terrain
```
Scatter trees on the landscape:
1. Use geometry nodes on the terrain
2. Distribute points based on:
   - Slope angle (less than 30 degrees)
   - Altitude (between 0.2 and 0.8 of max height)
3. Instance tree models at each point
4. Randomize scale (0.5 to 2.0)
5. Randomize rotation around Z axis
6. Export to GLB with instances
```

### 11. Procedural Rock Scatter
```
Scatter rocks on the terrain:
- Use geometry nodes
- Higher density on flatter areas
- Use icospheres with displacement for rocks
- Vary sizes from small pebbles to boulders
- Use vertex colors for variety
```

## ============================================================
## 🧪 ADVANCED WORKFLOWS
## ============================================================

### 12. Create Complete Scene
```
Create a complete scene:
1. Generate rocky mountain landscape
2. Add volumetric fog using new volume nodes (Blender 5.0)
3. Scatter vegetation using geometry nodes
4. Set up HDRI lighting from Poly Haven
5. Add camera with depth of field
6. Set up render settings (Cycles, 1920x1080, 128 samples)
7. Render and save
```

### 13. Automated Pipeline
```
Run the automated pipeline:
1. Generate 3 landscape variations with different seeds
2. For each landscape:
   - Add vegetation scatter
   - Set up 3 camera angles
   - Render each angle
   - Export as GLB
3. Create metadata JSON with:
   - Seed values
   - Camera positions
   - Render settings
4. Save all to exports/ directory
```

### 14. Create Three.js Compatible Export
```
Prepare export for Three.js:
1. Optimize geometry (apply modifiers)
2. Bake textures
3. Ensure materials use Principled BSDF
4. Check UV mapping
5. Export as GLB with:
   - Draco compression enabled
   - Y-up coordinates
   - Embedded textures
6. Test file size is under 10MB
7. Copy to web app assets folder
```

### 15. Python Code Execution
```
Execute this Python code in Blender:

import bpy
import json

# Get current scene info
scene_info = {
    "objects": [obj.name for obj in bpy.context.scene.objects],
    "materials": [mat.name for mat in bpy.data.materials],
    "modifiers": []
}

for obj in bpy.context.selected_objects:
    for mod in obj.modifiers:
        scene_info["modifiers"].append({
            "object": obj.name,
            "modifier": mod.name,
            "type": mod.type
        })

# Export to JSON
with open('/tmp/scene_info.json', 'w') as f:
    json.dump(scene_info, f, indent=2)

print("Scene info exported")
```

## ============================================================
## 🔧 MAINTENANCE & UTILITIES
## ============================================================

### 16. Clean Up Scene
```
Clean up the current Blender scene:
1. Remove unused materials
2. Remove unused meshes
3. Purge orphan data
4. Remove empty collections
5. Save optimized file
```

### 17. Batch Export All Objects
```
Export all mesh objects individually:
For each mesh object in scene:
  - Select the object
  - Export as GLB
  - Name: {object_name}.glb
  - Location: exports/individual/
```

### 18. Create Render Preview
```
Create a quick render preview:
1. Switch to Eevee for speed
2. Set resolution to 50%
3. Enable bloom
4. Set samples to 32
5. Render and save as JPG
6. Switch back to Cycles
```

## ============================================================
## 📚 CUSTOM WORKFLOW COMMANDS
## ============================================================

### 19. Create Alien Landscape
```
Create an alien landscape:
- Use Voronoi noise with Chebyshev distance
- Feature: F2-F1 for alien ridges
- Scale: 12, Detail: 12
- Colors: Purple to cyan gradient
- Add emission for bioluminescence effect
```

### 20. Recreate Ducky3D Tutorial
```
Recreate the Ducky3D generative landscape tutorial:
1. Follow the workflow from corpus entry yt-7dm776rZz-s
2. Use geometry nodes for:
   - Topographic lines
   - Animated displacement
   - Color based on elevation
3. Add the specific noise settings mentioned
4. Export for web viewing
```

## ============================================================
## 💡 TIPS FOR BEST RESULTS
## ============================================================

1. **Save Before Major Operations**: Always save your Blender file before running complex MCP commands
2. **Break Down Complex Tasks**: Large operations work better when broken into smaller steps
3. **Use Python Execution**: For custom logic, use the "execute_blender_code" tool
4. **Check Scene First**: Ask "Get information about the current scene" to understand the state
5. **Viewport Screenshots**: Request "Take a screenshot of the viewport" to verify progress
6. **Iterate Gradually**: Build scenes step by step rather than all at once

## ============================================================
## 🔗 INTEGRATION WITH YOUR PROJECT
## ============================================================

### Link to Three.js Experiment
```
Generate a landscape and prepare it for my Three.js experiment:
1. Create landscape using the settings from my corpus entry yt-7dm776rZz-s
2. Export to: experiments/2025-10-02-generative-landscape/threejs-app/public/assets/
3. Name the file: generative_landscape_01.glb
4. Also export a JSON with the noise parameters used
5. The Three.js app is at experiments/2025-10-02-generative-landscape/threejs-app/
```

### Update R3F App Assets
```
Generate new assets for the R3F app:
1. Create 3 landscape variations
2. Export each as GLB
3. Save to: experiments/2025-10-02-generative-landscape/r3f-app/public/
4. Create a manifest.json listing all assets
5. Update the R3F scene to load these dynamically
```

## ============================================================

# Usage Instructions:
# 1. Ensure Blender MCP addon is installed and connected
# 2. Open Claude Desktop or Cursor
# 3. Copy any prompt above
# 4. Paste into the chat
# 5. Claude will execute the commands in Blender
# 
# For batch operations, use the Python code templates in:
# scripts/blender_mcp_landscape_automation.py
