#!/bin/bash

# Add latest bookmarks to corpus
# High priority items from Feb 12, 2026 batch

cd /Users/dalebradshaw/graphics_research

echo "📝 Adding Latest Bookmarks to Corpus"
echo "===================================="
echo ""

# 1. Matthew Berman's OpenClaw Workflow (AI/Automation)
npx tsx scripts/add-from-x-export.ts \
    --id "2021669868366598632" \
    --url "https://x.com/MatthewBerman/status/2021669868366598632" \
    --title "Matthew Berman: Advanced OpenClaw + GPT5.3 + Opus 4.6 Workflow" \
    --category "ai-tools" \
    --tags "openclaw,automation,workflow,ai,codex,opus" \
    --createdAt "2026-02-11"

# 2. XorDev Shader Techniques (Graphics/Shaders)  
npx tsx scripts/add-from-x-export.ts \
    --id "2021356467115462961" \
    --url "https://x.com/XorDev/status/2021356467115462961" \
    --title "XorDev: 14 Years of Shader Programming Techniques" \
    --category "shaders" \
    --tags "shaders,webgl,glsl,techniques,optimization" \
    --createdAt "2026-02-10"

# 3. Maxime Heckel Halftone Shaders (Graphics/Shaders)
npx tsx scripts/add-from-x-export.ts \
    --id "2021255085981143397" \
    --url "https://x.com/MaximeHeckel/status/2021255085981143397" \
    --title "Maxime Heckel: Halftone Shader Effects Breakdown" \
    --category "shaders" \
    --tags "shaders,webgl,halftone,effects,blog" \
    --createdAt "2026-02-10"

# 4. Noggi 3D Anime Tutorial (Blender/Animation)
npx tsx scripts/add-from-x-export.ts \
    --id "2021635350389809486" \
    --url "https://x.com/Noggi_3D/status/2021635350389809486" \
    --title "Noggi: 15-Hour 3D Anime in Blender + Davinci Resolve" \
    --category "blender" \
    --tags "blender,anime,davinci-resolve,3d,animation,tutorial" \
    --createdAt "2026-02-11"

# 5. Codrops Procedural Snake (Three.js)
npx tsx scripts/add-from-x-export.ts \
    --id "2021197783693394046" \
    --url "https://x.com/codrops/status/2021197783693394046" \
    --title "Codrops: GPU-Enhanced Procedural Snake in Three.js" \
    --category "threejs" \
    --tags "threejs,webgl,procedural,animation,shaders,tutorial" \
    --createdAt "2026-02-10"

# 6. mesqme Infinite Terrain (Three.js/R3F)
npx tsx scripts/add-from-x-export.ts \
    --id "2020672277055197234" \
    --url "https://x.com/mesqme/status/2020672277055197234" \
    --title "mesqme: Infinite Terrain with R3F/Three.js" \
    --category "threejs" \
    --tags "threejs,r3f,webgl,terrain,shaders,streaming" \
    --createdAt "2026-02-09"

# 7. Claude Code Three.js Skill (AI/Development)
npx tsx scripts/add-from-x-export.ts \
    --id "2020936842208821420" \
    --url "https://x.com/dani_avila7/status/2020936842208821420" \
    --title "Claude Code with Three.js Skill" \
    --category "ai-tools" \
    --tags "claude-code,threejs,ai,development,skills" \
    --createdAt "2026-02-09"

# 8. MIDI Lens (Audio Tool)
npx tsx scripts/add-from-x-export.ts \
    --id "2021607134828605907" \
    --url "https://x.com/iamgbxin/status/2021607134828605907" \
    --title "MIDI Lens - Free MIDI Visualization Tool" \
    --category "tooling" \
    --tags "midi,audio,tools,visualization,music" \
    --createdAt "2026-02-11"

# 9. Obsidian CLI (Knowledge Management)
npx tsx scripts/add-from-x-export.ts \
    --id "2021251878521073847" \
    --url "https://x.com/kepano/status/2021251878521073847" \
    --title "Obsidian CLI - Agent Integration" \
    --category "tooling" \
    --tags "obsidian,cli,knowledge-base,agents,automation" \
    --createdAt "2026-02-10"

# 10. Visign Academy Design PDF
npx tsx scripts/add-from-x-export.ts \
    --id "2020905344046707097" \
    --url "https://x.com/visignacademy/status/2020905344046707097" \
    --title "Visign Academy: 400+ Page Design PDF" \
    --category "design" \
    --tags "design,learning,resources,pdf,fundamentals" \
    --createdAt "2026-02-09"

echo ""
echo "✅ Added 10 high-priority bookmarks to corpus"
echo ""
echo "📊 Next steps:"
echo "   npm run build:md  # Rebuild documentation"
echo "   npm run search -- --query 'shaders'  # Search new entries"
