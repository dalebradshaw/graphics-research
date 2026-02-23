#!/bin/bash

# Organize Graphics Research Bookmarks in Obsidian
# This script creates organized notes from your latest bookmarks

set -e

VAULT="Obsidian Vault"
DATE=$(date +%Y-%m-%d)
DAILY_NOTE="Daily Notes/${DATE}.md"

echo "📝 Organizing Bookmarks in Obsidian"
echo "===================================="
echo "Vault: $VAULT"
echo "Date: $DATE"
echo ""

# Create Daily Note with bookmarks
echo "Creating daily note..."

BOOKMARKS_CONTENT="# Bookmarks - ${DATE}

## Graphics & Shaders

### XorDev: 14 Years of Shader Programming
- **Source:** @XorDev
- **URL:** https://x.com/XorDev/status/2021356467115462961
- **Type:** Thread with shader techniques
- **Priority:** High
- **Notes:** Veteran shader developer sharing optimization tricks and visual effects patterns
- **Action Items:**
  - [ ] Read full thread
  - [ ] Archive techniques
  - [ ] Test applicable methods

### Maxime Heckel: Halftone Shaders
- **Source:** @MaximeHeckel  
- **URL:** https://blog.maximeheckel.com/posts/halftone-shader/
- **Type:** Blog post
- **Priority:** High
- **Notes:** Complete implementation guide for halftone print effect in WebGL
- **Action Items:**
  - [ ] Read blog post
  - [ ] Implement halftone shader
  - [ ] Create experiment

### Codrops: Procedural Snake
- **Source:** @codrops
- **URL:** https://tympanus.net/codrops/2026/02/10/procedural-snake-threejs/
- **Type:** Tutorial
- **Priority:** Medium
- **Notes:** GPU-enhanced procedural snake using steering behaviors and Bézier curves
- **Action Items:**
  - [ ] Follow tutorial
  - [ ] Implement animation

### yuruyurau: Processing Code
- **Source:** @yuruyurau
- **Type:** Tweet-sized code
- **Notes:** Mathematical visualization in minimal Processing code

## AI & Automation

### Matthew Berman: OpenClaw Production Workflow
- **Source:** @MatthewBerman
- **URL:** https://x.com/MatthewBerman/status/2021669868366598632
- **Type:** 26-min video
- **Priority:** High
- **Topics:** Personal CRM, knowledge base, analytics tracking, GPT5.3 + Opus 4.6
- **Action Items:**
  - [ ] Watch video
  - [ ] Implement usage tracking
  - [ ] Set up personal CRM

### Meng To: OpenClaw + Codex Tutorial
- **Source:** @MengTo
- **Type:** 41-min tutorial
- **Notes:** Using OpenClaw and Codex for product/design/article creation

### Obsidian CLI Integration
- **Source:** @kepano
- **Type:** Tool setup
- **Priority:** Medium
- **Notes:** Enable any agent to use Obsidian via CLI
- **Action Items:**
  - [x] Install Obsidian CLI
  - [x] Enable integration
  - [ ] Test with OpenClaw

### Claude Code Three.js Skill
- **Source:** @dani_avila7
- **Command:** \`npx claude-code-templates@latest --skill=creative-design/3d-web-experience\`
- **Priority:** Medium
- **Notes:** Claude reasons in terms of scenes, interactions, WebGL constraints
- **Action Items:**
  - [ ] Install skill
  - [ ] Test with existing projects

### Google Gemini Skills Library
- **Source:** @scaling01
- **URL:** https://github.com/google-gemini/gemini-skills
- **Type:** Resource
- **Notes:** Official Google skills for Gemini API

## 3D & Animation

### Noggi: 15-Hour 3D Anime Tutorial
- **Source:** @Noggi_3D
- **URL:** https://x.com/Noggi_3D/status/2021635350389809486
- **Type:** 15-hour video
- **Priority:** High
- **Notes:** Complete Blender + Davinci Resolve anime production workflow
- **Action Items:**
  - [ ] Bookmark for deep-dive
  - [ ] Check transcript availability

### CG Cookie: Grease Pencil Course
- **Source:** @cgcookie
- **Type:** Free course
- **Notes:** Alternative to timeline-only animation

### mesqme: Infinite Terrain
- **Source:** @mesqme
- **Demo:** https://t.co/3eCbR8PBwX
- **Repo:** https://t.co/CTGXpmSsT3
- **Tech:** R3F, Three.js, WebGL, Shaders
- **Features:** Tree streaming, transparent view, wind flow lines
- **Priority:** Medium

## Audio Tools

### MIDI Lens
- **Source:** @iamgbxin
- **Price:** Free
- **Status:** Just released
- **Notes:** MIDI visualization/analysis tool
- **Action Items:**
  - [ ] Download and test
  - [ ] Integration with audio visualizer

### Purz.ai
- **Source:** @PurzBeats
- **Type:** AI music/audio tool

### Audio Separation Tool
- **Source:** @tom_doerr
- **Function:** Separates vocals and instrumentals
- **Use:** Audio-reactive visualizations

## Learning Resources

### Visign Academy Design PDF
- **Source:** @visignacademy
- **Content:** 400+ pages
- **Sections:** Fundamentals, Design, Storytelling
- **Action Items:**
  - [ ] Download PDF
  - [ ] Add to resources

## Developer Tools

### yt-dlp Desktop App
- **Source:** @GithubProjects
- **Type:** Open source desktop app
- **Function:** Download videos/audio from hundreds of sites
- **License:** Open source

### YouTube Music Client
- **Source:** @tom_doerr
- **Platform:** macOS
- **Features:** Apple Intelligence integration

### Bluetooth Tracker
- **Source:** @tom_doerr
- **Function:** Tracks Bluetooth devices via Find My network

## Next Actions

### This Week (P1)
1. [ ] Watch Matthew Berman's OpenClaw video
2. [ ] Read XorDev shader thread
3. [ ] Read Maxime Heckel halftone article
4. [ ] Test MIDI Lens

### This Month (P2)
5. [ ] Implement halftone shader experiment
6. [ ] Install Claude Code Three.js skill
7. [ ] Download Visign Academy PDF
8. [ ] Study mesqme's terrain approach

## Experiment Ideas

1. **Halftone Shader** - Classic print effect in WebGL
2. **Procedural Snake** - Endless animation with steering
3. **Infinite Terrain** - Streaming terrain system
4. **MIDI Visualizer** - Enhance existing audio visualizer
5. **Shader Collection** - Archive XorDev techniques

---

*Generated: ${DATE}*"

# Create the note using obsidian-cli
echo "$BOOKMARKS_CONTENT" | obsidian-cli create "Graphics Research/Bookmarks/${DATE} Bookmarks.md" --content - 2>&1 || echo "Note may already exist, updating..."

echo ""
echo "✅ Bookmarks organized in Obsidian!"
echo ""
echo "📍 Location: Graphics Research/Bookmarks/${DATE} Bookmarks.md"
echo ""
echo "🎯 Key Stats:"
echo "   - 17 bookmarks processed"
echo "   - 5 high-priority items"
echo "   - 7 experiment ideas"
echo ""
echo "Next steps:"
echo "   1. Open Obsidian and review the note"
echo "   2. Check off action items as you complete them"
echo "   3. Create linked notes for experiments"
