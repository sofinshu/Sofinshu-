#!/bin/bash

# Batch Enhancement Script for uwu-chan-saas Commands
# Updates all v1-v8 commands with enhanced imports and error handling

echo "🚀 Starting Batch Enhancement of All Commands"
echo "=============================================="

BASE_DIR="/workspace/cad48349-765c-4c08-becd-f0aeb983a551/sessions/agent_29a25391-cf7b-4bb9-9437-2d4d13058374/src/commands"

# Function to update imports in a file
update_imports() {
    local file=$1
    local tier=$2
    
    # Check if file already uses enhanced embeds
    if grep -q "enhancedEmbeds" "$file"; then
        return 0
    fi
    
    # Create backup
    cp "$file" "$file.backup"
    
    # Replace old imports with enhanced ones
    sed -i "s|require('../../utils/embeds')|require('../../utils/enhancedEmbeds')|g" "$file"
    
    # Add enhanced premium guard for non-free tiers
    if [ "$tier" != "free" ]; then
        if ! grep -q "enhancedPremiumGuard" "$file"; then
            sed -i "/require('discord.js')/a\\const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');" "$file"
        fi
    fi
    
    echo "  ✓ Updated: $(basename "$file")"
}

# Process each version
declare -A VERSION_TIERS=(
    ["v1"]="free"
    ["v1_context"]="free"
    ["v2"]="premium"
    ["v3"]="premium"
    ["v4"]="premium"
    ["v5"]="premium"
    ["v6"]="enterprise"
    ["v7"]="enterprise"
    ["v8"]="enterprise"
)

TOTAL=0
for version in "${!VERSION_TIERS[@]}"; do
    tier="${VERSION_TIERS[$version]}"
    version_dir="$BASE_DIR/$version"
    
    if [ -d "$version_dir" ]; then
        count=$(ls "$version_dir"/*.js 2>/dev/null | wc -l)
        TOTAL=$((TOTAL + count))
        echo ""
        echo "🔄 Processing $version ($tier tier): $count commands"
        
        for file in "$version_dir"/*.js; do
            if [ -f "$file" ]; then
                update_imports "$file" "$tier"
            fi
        done
    fi
done

echo ""
echo "✅ Batch Enhancement Complete!"
echo "=============================================="
echo "📊 Total commands processed: $TOTAL"
echo ""
echo "📋 Updates applied:"
echo "  • Updated imports to use enhanced embed utilities"
echo "  • Added enhanced premium guard for paid tiers"
echo "  • Backups created (.backup extension)"
echo ""
echo "📝 Next steps:"
echo "  1. Review enhanced commands"
echo "  2. Test functionality"
echo "  3. Create PR with changes"
