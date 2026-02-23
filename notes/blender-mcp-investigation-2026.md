# Blender MCP Servers - Current State & Comparison (2026)

## Executive Summary

The MCP (Model Context Protocol) ecosystem for Blender has exploded in popularity, with **ahujasid/blender-mcp** emerging as the clear winner with **16.8k GitHub stars** - 58x more than the second-place option. This server connects Claude, Cursor, and other AI assistants directly to Blender for natural language 3D modeling.

---

## 🏆 Top Blender MCP Server: ahujasid/blender-mcp

### Stats & Activity (As of Feb 2, 2026)
- **⭐ Stars:** 16,800 (clear community favorite)
- **🔱 Forks:** 1,600
- **👁️ Watchers:** 150
- **👥 Contributors:** 20
- **📝 Commits:** 139
- **📅 Last Commit:** January 23, 2026 (9 days ago - very active!)
- **⚖️ License:** MIT

### Key Features
- **Two-way communication** between Claude AI and Blender via socket server
- **Object manipulation:** Create, modify, delete 3D objects
- **Material control:** Apply and modify materials/colors
- **Scene inspection:** Get detailed scene information
- **Code execution:** Run arbitrary Python code in Blender
- **Asset integration:**
  - Poly Haven (free HDRIs, textures, models)
  - Hyper3D Rodin (AI-generated 3D models)
  - Sketchfab model search/download
  - Hunyuan3D support
- **Viewport screenshots:** Claude can see the current scene
- **Remote execution:** Run on remote hosts

### Installation (One-Line)
```bash
# Install uv package manager first
brew install uv  # macOS
# or
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"  # Windows

# Then install Blender MCP
uvx blender-mcp
```

### IDE Support
- ✅ **Claude Desktop** (Official support)
- ✅ **Cursor** (Official support)
- ✅ **VS Code** (Official support)
- ✅ **Claude Code CLI**

### Configuration Example (Claude Desktop)
```json
{
    "mcpServers": {
        "blender": {
            "command": "uvx",
            "args": ["blender-mcp"]
        }
    }
}
```

### Example Commands You Can Use
```
"Create a low poly scene in a dungeon, with a dragon guarding a pot of gold"
"Create a beach vibe using HDRIs, textures, and models like rocks from Poly Haven"
"Generate a 3D model of a garden gnome through Hyper3D"
"Make this car red and metallic"
"Create a sphere and place it above the cube"
"Point the camera at the scene, and make it isometric"
"Get information about the current scene, and make a threejs sketch from it"
```

---

## 🥈 Alternative Options (Ranked)

### 2. VxASI/blender-mcp-vxai (288 stars)
**Status:** ⚠️ Stale (last commit 10+ months ago)

- **Stars:** 288
- **Forks:** 24
- **Contributors:** ~1
- **Commits:** 39
- **Last Activity:** March 2025 (stale)

**Features:**
- Natural language control
- Image-to-3D conversion
- Export tools

**Verdict:** Not recommended due to lack of maintenance. Use ahujasid's version instead.

---

### 3. CommonSenseMachines/blender-mcp (118 stars)
**Status:** 🟡 Moderately Active (last commit Dec 2025)

- **Stars:** 118
- **Forks:** 17
- **Contributors:** 2
- **Commits:** 57
- **Last Activity:** December 11, 2025 (2 months ago)

**Features:**
- CSM.ai 3D asset integration
- Mixamo animation support
- Vector search capabilities
- Text-to-4D Worlds focus

**Best For:** Users specifically working with CSM.ai assets and 4D world generation

**Installation:** More complex (requires `pip install -e .`)

---

### 4. poly-mcp/Blender-MCP-Server (15 stars)
**Status:** 🆕 New Project (last commit Nov 2025)

- **Stars:** 15
- **Forks:** 3
- **Contributors:** 1
- **Commits:** 10
- **Last Activity:** November 13, 2025 (2.5 months ago)

**Unique Features:**
- **🎯 Explicit Geometry Nodes support** (only one mentioning this!)
- **51+ tools** covering complete 3D workflow
- **HTTP API** endpoints for custom integrations
- **Thread-safe execution** with queue system
- **Auto-dependency installation**
- **Real-time monitoring** dashboard

**Installation:**
```bash
# Download blender_mcp.py
# Install via Blender: Edit → Preferences → Add-ons → Install from Disk
```

**Best For:** Users who specifically need geometry nodes automation and prefer HTTP API access

**⚠️ Warning:** Very new project with minimal community adoption. Use with caution for production work.

---

## 📊 Comparison Matrix

| Feature | ahujasid/blender-mcp | poly-mcp/Blender-MCP-Server | CommonSenseMachines/blender-mcp | VxASI/blender-mcp-vxai |
|---------|---------------------|---------------------------|-------------------------------|----------------------|
| **GitHub Stars** | ⭐ 16,800 | 15 | 118 | 288 |
| **Community Size** | 🏆 Massive | Tiny | Small | Small |
| **Maintenance** | ✅ Very Active | 🟡 New | 🟡 Moderate | ❌ Stale |
| **Geometry Nodes** | Via Python | ✅ Explicit | Via Python | Via Python |
| **Installation** | ⭐ One-line | Moderate | Moderate | One-line |
| **Asset Libraries** | Poly Haven, Hyper3D, Sketchfab, Hunyuan3D | Basic | CSM.ai | Basic |
| **AI Model Gen** | ✅ Yes | No | ✅ Yes | No |
| **HTTP API** | No | ✅ Yes | No | No |
| **Viewport Vision** | ✅ Screenshots | No | No | No |
| **Remote Host** | ✅ Yes | No | No | No |
| **Claude Support** | ✅ Native | PolyMCP | ✅ Native | ✅ Native |
| **Cursor Support** | ✅ Native | HTTP API | ✅ Native | ✅ Native |
| **VS Code Support** | ✅ Native | HTTP API | No | No |

---

## 🎯 Recommendation for Your Geometry Nodes Workflow

### Primary Choice: ahujasid/blender-mcp

**Why it's the best overall:**
1. **Overwhelming community adoption** - 16.8k stars means battle-tested, lots of community support
2. **Very actively maintained** - Last commit 9 days ago, frequent updates
3. **Easiest installation** - One-line `uvx blender-mcp`
4. **Most comprehensive** - Asset libraries, AI model generation, viewport screenshots
5. **Best IDE support** - Native Claude, Cursor, VS Code integration

**For Geometry Nodes specifically:**
- While it doesn't explicitly advertise "geometry nodes" support, you can control geometry nodes through Python code execution
- Example: "Execute Python code to create a geometry nodes modifier with noise displacement"
- The `execute_blender_code` tool gives you full access to Blender's Python API including geometry nodes

### When to Consider poly-mcp/Blender-MCP-Server:

**Use this if:**
- Geometry nodes is your primary use case
- You need HTTP API access for custom integrations
- You want 51+ pre-built tools specifically for 3D workflows
- You're comfortable with a newer, less-tested project

**⚠️ Trade-offs:**
- Only 15 stars (vs 16,800)
- Single contributor
- No active community support
- Last commit 2.5 months ago

---

## 🚀 Quick Start Guide (Recommended)

### Step 1: Install Prerequisites
```bash
# macOS
brew install uv

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
# Then add to PATH and restart terminal
```

### Step 2: Install Blender MCP Server
```bash
uvx blender-mcp
```

### Step 3: Configure Claude Desktop
Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%/Claude/claude_desktop_config.json` (Windows):

```json
{
    "mcpServers": {
        "blender": {
            "command": "uvx",
            "args": ["blender-mcp"]
        }
    }
}
```

### Step 4: Install Blender Addon
1. Download `addon.py` from https://github.com/ahujasid/blender-mcp
2. Open Blender → Edit → Preferences → Add-ons
3. Click "Install..." and select `addon.py`
4. Enable the addon

### Step 5: Start Using
1. In Blender: Press N → BlenderMCP tab → "Connect to Claude"
2. In Claude: You should see a hammer icon with Blender tools
3. Try: "Create a procedural mountain landscape using geometry nodes"

---

## 💡 Use Cases for Your Workflow

### 1. Generative Landscapes (Your Current Work)
```
"Create a geometry nodes setup that generates a mountainous terrain with:
- Musgrave noise for rocky peaks
- Color ramp for elevation-based materials (snow on top, rock below)
- Scatter vegetation on slopes less than 30 degrees
- Export to JSON for Three.js import"
```

### 2. Light Trails (Your Current Work)
```
"Create a curve-based light trail system:
- Draw a curve in the viewport
- Add geometry nodes to create a glowing tube along the curve
- Animate the material for a flowing light effect
- Set up for export to web"
```

### 3. Particle Systems (Your Current Work)
```
"Create a particle system for logo animation:
- Import SVG logo
- Convert to mesh
- Use geometry nodes to scatter particles across the surface
- Set up force fields for animation
- Bake the simulation"
```

### 4. Automation Pipeline
```
"Set up an automated workflow:
- Generate 10 variations of the landscape with different seeds
- Render each one from 3 camera angles
- Export all to FBX for Three.js
- Create a manifest JSON with metadata"
```

---

## 🔮 What's Coming Next

### Official Blender MCP (Blender Lab Initiative)
- **Status:** Planned for 2026 by Blender Foundation
- **Features:** Native MCP server integrated into Blender
- **Benefits:** Official support, better integration, no addons needed
- **Timeline:** No release date yet, likely late 2026

### Recommendation
Don't wait for official support. **ahujasid/blender-mcp** is production-ready now and will likely transition smoothly when official support arrives.

---

## 📚 Resources

- **Main Repository:** https://github.com/ahujasid/blender-mcp
- **Discord Community:** https://discord.gg/z5apgR8TFU
- **Tutorial Video:** https://www.youtube.com/watch?v=lCyQ717DuzQ
- **Setup Video:** https://www.youtube.com/watch?v=neoK_WMq92g

---

## ⚠️ Important Notes

### Security
- `execute_blender_code` tool allows arbitrary Python execution
- Always save your work before using AI-generated code
- Review code before execution in production environments

### Telemetry
- ahujasid/blender-mcp collects anonymous usage data by default
- Disable with: `DISABLE_TELEMETRY=true uvx blender-mcp`
- Or uncheck telemetry in Blender addon preferences

### Performance
- Complex geometry nodes operations may need to be broken into smaller steps
- First command sometimes fails (known issue), retry works
- Save work frequently when experimenting

---

## Bottom Line

**Use ahujasid/blender-mcp** - It's the clear winner with:
- ✅ 16,800 GitHub stars (58x more than #2)
- ✅ Active development (last commit 9 days ago)
- ✅ Easiest installation (one-line)
- ✅ Best feature set (assets, AI models, screenshots)
- ✅ Native Claude/Cursor/VS Code support
- ✅ Large community for support

**Alternative:** Only consider poly-mcp/Blender-MCP-Server if you absolutely need explicit geometry nodes tooling and HTTP API access, but be aware it's a new project with minimal adoption.

**Avoid:** VxASI/blender-mcp-vxai (stale, not maintained)

---

*Last Updated: February 2, 2026*
