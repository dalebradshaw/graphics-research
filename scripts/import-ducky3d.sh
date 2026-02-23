#!/bin/bash

# Import Ducky3D Tutorials with Full Transcripts
# This script fetches the latest Ducky3D videos with AI-powered summarization

echo "🎬 Ducky3D Tutorial Import Script"
echo "=================================="
echo ""

# Check for API key
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "⚠️  Warning: ANTHROPIC_API_KEY not set"
    echo "   AI summarization will be disabled"
    echo "   Set it with: export ANTHROPIC_API_KEY='sk-...'"
    echo ""
    AI_FLAG="--no-ai"
else
    echo "✅ AI summarization enabled"
    AI_FLAG="--use-ai"
fi

# Import recent Ducky3D videos
echo "📥 Importing Ducky3D videos..."
echo ""

npx tsx scripts/import-youtube-channel-enhanced.ts \
    --url "@Ducky3D" \
    --category "blender" \
    --tags "geometry-nodes,blender3d,tutorial,motion-graphics" \
    --limit 20 \
    --concurrency 2 \
    $AI_FLAG \
    --build

echo ""
echo "✅ Import complete!"
echo ""
echo "📊 Check the results:"
echo "   - corpus/corpus.json - New entries added"
echo "   - transcripts/ - Full transcript files"
echo "   - corpus/corpus.md - Rendered documentation"
echo ""
echo "🔍 To search your knowledge base:"
echo "   npm run search -- --query 'geometry nodes'"
