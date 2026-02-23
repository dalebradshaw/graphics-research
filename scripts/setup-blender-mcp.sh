#!/bin/bash

# Blender MCP Integration Setup Script
# This script sets up ahujasid/blender-mcp for your graphics research workflow

set -e

echo "🚀 Setting up Blender MCP Integration..."
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Please run this script from the graphics_research root directory${NC}"
    exit 1
fi

# Check for uv package manager
echo "📦 Checking for uv package manager..."
if ! command -v uv &> /dev/null; then
    echo -e "${YELLOW}uv not found. Installing...${NC}"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install uv
        else
            echo -e "${RED}Homebrew not found. Please install Homebrew first:${NC}"
            echo '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
            exit 1
        fi
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
        # Windows
        powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
        echo -e "${YELLOW}Please add uv to your PATH and restart your terminal${NC}"
        echo "Run: $localBin = \"$env:USERPROFILE\\.local\\bin\""
        echo "Then: [Environment]::SetEnvironmentVariable(\"Path\", $env:Path + \";\" + $localBin, \"User\")"
        exit 1
    else
        # Linux
        curl -LsSf https://astral.sh/uv/install.sh | sh
    fi
fi

echo -e "${GREEN}✓ uv is installed${NC}"

# Install blender-mcp globally
echo "🔧 Installing blender-mcp..."
uv tool install blender-mcp || echo -e "${YELLOW}blender-mcp may already be installed${NC}"

echo -e "${GREEN}✓ blender-mcp installed${NC}"

# Create Claude Desktop config directory
echo "⚙️  Setting up Claude Desktop configuration..."

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
    CURSOR_CONFIG_DIR="$HOME/.cursor"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows
    CLAUDE_CONFIG_DIR="$APPDATA/Claude"
    CURSOR_CONFIG_DIR="$USERPROFILE/.cursor"
else
    # Linux
    CLAUDE_CONFIG_DIR="$HOME/.config/Claude"
    CURSOR_CONFIG_DIR="$HOME/.cursor"
fi

# Create directories
mkdir -p "$CLAUDE_CONFIG_DIR"
mkdir -p "$CURSOR_CONFIG_DIR"

# Check if Claude config already exists
CLAUDE_CONFIG_FILE="$CLAUDE_CONFIG_DIR/claude_desktop_config.json"
if [ -f "$CLAUDE_CONFIG_FILE" ]; then
    echo -e "${YELLOW}⚠️  Claude config already exists at $CLAUDE_CONFIG_FILE${NC}"
    echo "Please manually add the blender-mcp configuration:"
    cat << 'EOF'
{
    "mcpServers": {
        "blender": {
            "command": "uvx",
            "args": ["blender-mcp"]
        }
    }
}
EOF
else
    # Create Claude config
    cat > "$CLAUDE_CONFIG_FILE" << 'EOF'
{
    "mcpServers": {
        "blender": {
            "command": "uvx",
            "args": ["blender-mcp"]
        }
    }
}
EOF
    echo -e "${GREEN}✓ Created Claude Desktop config at $CLAUDE_CONFIG_FILE${NC}"
fi

# Create Cursor config
echo "⚙️  Setting up Cursor configuration..."
CURSOR_CONFIG_FILE="$CURSOR_CONFIG_DIR/mcp.json"
if [ -f "$CURSOR_CONFIG_FILE" ]; then
    echo -e "${YELLOW}⚠️  Cursor config already exists at $CURSOR_CONFIG_FILE${NC}"
    echo "Please manually add the blender-mcp configuration"
else
    cat > "$CURSOR_CONFIG_FILE" << 'EOF'
{
    "mcpServers": {
        "blender": {
            "command": "uvx",
            "args": ["blender-mcp"]
        }
    }
}
EOF
    echo -e "${GREEN}✓ Created Cursor config at $CURSOR_CONFIG_FILE${NC}"
fi

echo ""
echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1. 📥 Install the Blender addon:"
echo "   - Open Blender"
echo "   - Go to Edit → Preferences → Add-ons"
echo "   - Click 'Install...'"
echo "   - Select: $(pwd)/tools/blender-mcp/addon.py"
echo "   - Enable the addon by checking the box"
echo ""
echo "2. 🔌 Start the connection:"
echo "   - In Blender: Press N to open sidebar"
echo "   - Go to 'BlenderMCP' tab"
echo "   - Click 'Connect to Claude'"
echo ""
echo "3. 🎯 Test it out:"
echo "   - Open Claude Desktop or Cursor"
echo "   - Look for the hammer icon (Blender tools)"
echo "   - Try: 'Create a cube at the origin'"
echo ""
echo "4. 📚 View the documentation:"
echo "   - README: $(pwd)/tools/blender-mcp/README.md"
echo "   - Integration guide: $(pwd)/notes/blender-mcp-integration.md"
echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "🎨 For your geometry nodes workflow, see:"
echo "   - $(pwd)/scripts/blender-mcp-landscape-automation.py"
echo "   - $(pwd)/scripts/blender-mcp-examples.md"
