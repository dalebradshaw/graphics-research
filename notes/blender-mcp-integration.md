# Blender MCP Integration Guide
## Complete Setup for ahujasid/blender-mcp

**Status:** ✅ Successfully integrated into your graphics research project

---

## 📁 What Was Set Up

### 1. Repository Downloaded
**Location:** `tools/blender-mcp/`
- Full clone of https://github.com/ahujasid/blender-mcp
- Version: Latest (as of Feb 2, 2026)
- Includes: addon.py, server code, documentation

### 2. Configuration Files Created

**Claude Desktop Config:**
- Path: `.claude/mcp.json`
- Ready to copy to: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

**Cursor Config:**
- Path: `.cursor/mcp.json`  
- Ready to use in Cursor MCP settings

Both configs disable telemetry by default.

### 3. Automation Scripts

**Setup Script:**
- `scripts/setup-blender-mcp.sh` - One-command installation
- Checks for uv package manager
- Installs blender-mcp globally
- Creates config files
- Provides next steps

**Landscape Automation:**
- `scripts/blender_mcp_landscape_automation.py`
- 5 pre-built landscape templates
- Python code generators for:
  - Procedural terrain
  - Export to Three.js
  - Batch variation generation

**Example Workflows:**
- `scripts/blender_mcp_examples.md`
- 20 ready-to-use prompts
- Specific to your workflows (landscapes, light trails, particles)

---

## 🚀 Quick Start

### Step 1: Run Setup Script
```bash
cd /Users/dalebradshaw/graphics_research
./scripts/setup-blender-mcp.sh
```

This will:
- ✅ Check/install uv package manager
- ✅ Install blender-mcp
- ✅ Create Claude/Cursor configs
- ✅ Show next steps

### Step 2: Install Blender Addon
1. Open Blender (5.0+ recommended)
2. Edit → Preferences → Add-ons
3. Click "Install..."
4. Select: `tools/blender-mcp/addon.py`
5. Enable the addon

### Step 3: Start the Connection
1. In Blender: Press **N** to open sidebar
2. Go to **BlenderMCP** tab
3. Click **"Connect to Claude"**
4. Check "Poly Haven" if you want free assets

### Step 4: Configure Your IDE

**For Claude Desktop:**
```bash
# macOS
cp .claude/mcp.json ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Windows
copy .cursor\mcp.json %APPDATA%\Claude\claude_desktop_config.json
```

**For Cursor:**
1. Open Cursor Settings
2. Go to MCP tab
3. Add new server
4. Point to `.cursor/mcp.json`

### Step 5: Test It
Open Claude/Cursor and type:
```
Create a cube at the origin
```

You should see a hammer icon with Blender tools available!

---

## 🎨 Using with Your Projects

### Generative Landscape Experiment
**Location:** `experiments/2025-10-02-generative-landscape/`

**Example workflow:**
```
Create a procedural landscape for my Three.js experiment:
1. Generate a rocky mountain terrain using geometry nodes
2. Use Musgrave noise with scale 15, detail 15
3. Add color ramp material with snow on peaks
4. Export as GLB to experiments/2025-10-02-generative-landscape/threejs-app/public/assets/
5. Name it: mountain_landscape_01.glb
```

### Light Trails Project
```
Create a light trail effect:
1. Draw a curve path in the viewport
2. Convert to tube geometry with emission material
3. Animate the material offset for flowing effect
4. Export curve data as JSON for web recreation
5. Save to: experiments/2025-10-02-generative-landscape/exports/
```

### Particle Logo Animation
```
Create a particle system animation:
1. Import an SVG logo and convert to mesh
2. Use geometry nodes to scatter particles
3. Animate particles converging to form the logo
4. Add glow/emission materials
5. Render 120 frame animation
```

---

## 📚 Available Commands

### Pre-built Templates

**Landscape Types:**
- `rocky_mountain` - High-frequency noise, snow caps
- `rolling_hills` - Smooth Voronoi, organic shapes  
- `desert_dunes` - Wave texture, sine patterns
- `alien_landscape` - Voronoi F2-F1, surreal ridges
- `fjord_coast` - Ridged Musgrave, dramatic cliffs

**Scatter Types:**
- `forest` - Trees on moderate slopes
- `rocks` - Varied sizes on all terrain
- `vegetation` - Ground cover on flat areas

### Example Prompts

See `scripts/blender_mcp_examples.md` for 20+ ready-to-use prompts including:
- Basic procedural landscapes
- Light trail systems
- Particle animations
- Batch generation
- Three.js export workflows

---

## 🔧 Advanced Usage

### Python Code Execution
You can execute arbitrary Python in Blender:
```
Execute this Python code in Blender:

import bpy
import json

# Get scene info
scene_data = {
    "objects": [obj.name for obj in bpy.data.objects],
    "materials": [mat.name for mat in bpy.data.materials]
}

# Export
with open('/tmp/scene_data.json', 'w') as f:
    json.dump(scene_data, f, indent=2)

print("Scene data exported")
```

### Custom Automation
Use the automation templates:
```python
# In your Python script
from scripts.blender_mcp_landscape_automation import generate_landscape_code

# Generate code for specific terrain
code = generate_landscape_code("rocky_mountain", seed=42)
print(code)  # Copy and paste into Claude
```

---

## 🌟 Key Features You'll Love

### 1. Poly Haven Integration
Automatic access to:
- Free HDRIs for lighting
- CC0 textures
- 3D models

**Usage:**
```
Create a beach scene using Poly Haven assets:
- Use HDRI for lighting
- Add rock models
- Apply sand texture
```

### 2. AI Model Generation (Hyper3D)
Generate 3D models from text:
```
Generate a 3D model of a garden gnome using Hyper3D Rodin
```

### 3. Viewport Screenshots
Claude can see your scene:
```
Take a screenshot of the viewport and suggest improvements
```

### 4. Remote Execution
Run on headless servers:
```
Set BLENDER_HOST and BLENDER_PORT env vars
```

---

## ⚠️ Important Notes

### Security
- `execute_blender_code` allows arbitrary Python execution
- Always save work before running AI-generated code
- Review code before execution in production

### Performance
- Complex geometry nodes may need simpler steps
- First command sometimes fails (retry works)
- Save frequently when experimenting

### Telemetry
- Disabled by default in our configs
- Can enable for development feedback
- Completely anonymous

---

## 🐛 Troubleshooting

### Connection Issues
```bash
# Make sure Blender addon is running
# In Blender: N panel → BlenderMCP → "Connect to Claude"

# Restart both Blender and Claude if needed
```

### Command Fails
- Break complex operations into smaller steps
- Use viewport screenshots to verify state
- Check Blender's System Console for errors

### Export Not Working
- Ensure objects are selected
- Check export path exists
- Verify file permissions

---

## 📖 Documentation

- **Main README:** `tools/blender-mcp/README.md`
- **Examples:** `scripts/blender_mcp_examples.md`
- **Automation:** `scripts/blender_mcp_landscape_automation.py`
- **Comparison:** `notes/blender-mcp-investigation-2026.md`

---

## 🎯 Next Steps

1. ✅ Run setup script
2. ✅ Install Blender addon
3. ✅ Test basic commands
4. 🎨 Try landscape generation
5. 🚀 Automate your workflow

**Ready to go!** Start with:
```
Create a procedural mountain landscape using geometry nodes
```

---

**Integration Date:** 2026-02-02  
**MCP Server:** ahujasid/blender-mcp (16.8k ⭐)  
**Status:** Production-ready
