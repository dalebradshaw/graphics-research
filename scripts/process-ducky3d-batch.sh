#!/bin/bash

# Process Ducky3D Videos - Download and add transcripts
# This script processes all 15 existing Ducky3D videos

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TRANSCRIPTS_DIR="$PROJECT_ROOT/transcripts-raw"

echo "🎬 Processing Ducky3D Videos"
echo "============================="
echo ""

# Ensure directories exist
mkdir -p "$TRANSCRIPTS_DIR"

# Video IDs to process (the 15 Ducky3D videos from your corpus)
VIDEOS=(
    "7dm776rZz-s:Generative Landscape Animations"
    "SerF_8yCVDA:Light Trails"
    "syfDKEpSf54:Shader Animation"
    "965bgIUHoxA:Light Trails with Camera"
    "dhYL2OTMR9o:Logo Particles"
    "45HruJxNBcY:Particle Systems"
    "t61gMdBXjQw:Geometry Nodes Learning"
    "x07cPMM6A-Q:Sci-Fi Environment"
    "lI1DMK9TCeg:Visual Hierarchy"
    "FJ6nEmjGWa8:Simulation Zones Strings"
    "0lBaaCMpZGs:Self-Teaching Method"
    "jUPqd8_Ig7g:Logo Concepts"
    "cbS86G0mqrU:Logo Particle Animation"
    "oC6guqEK9J4:Blob Tracking"
    "nJ1TWyYvgco:Metaballs"
)

SUCCESS_COUNT=0
FAIL_COUNT=0

echo "📊 Processing ${#VIDEOS[@]} videos..."
echo ""

for video_info in "${VIDEOS[@]}"; do
    IFS=: read -r VIDEO_ID VIDEO_TITLE <<< "$video_info"
    
    echo "[$((SUCCESS_COUNT + FAIL_COUNT + 1))/15] Processing: $VIDEO_TITLE"
    echo "    Video ID: $VIDEO_ID"
    
    # Download transcript
    if yt-dlp --write-auto-subs --sub-langs en --convert-subs srt --skip-download \
        --output "$TRANSCRIPTS_DIR/%(title)s [%(id)s].%(ext)s" \
        "https://www.youtube.com/watch?v=$VIDEO_ID" 2>&1 | grep -q "Writing video subtitles"; then
        
        echo "    ✅ Transcript downloaded"
        ((SUCCESS_COUNT++))
    else
        echo "    ❌ Failed to download transcript"
        ((FAIL_COUNT++))
    fi
    
    # Small delay to be respectful
    sleep 2
done

echo ""
echo "✅ Processing Complete!"
echo "   Success: $SUCCESS_COUNT"
echo "   Failed: $FAIL_COUNT"
echo ""
echo "📁 Transcripts saved to: $TRANSCRIPTS_DIR"
echo ""
echo "Next step: Parse transcripts and update corpus"
