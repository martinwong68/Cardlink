#!/bin/bash
# Cleanup script to remove conflicting files

echo "Cleaning up unnecessary files..."

# Delete TapHandler component
if [ -f "cardlink/components/TapHandler.tsx" ]; then
    rm "cardlink/components/TapHandler.tsx"
    echo "✓ Deleted TapHandler.tsx"
fi

# Delete API nfc directory
if [ -d "cardlink/app/api/nfc" ]; then
    rm -rf "cardlink/app/api/nfc"
    echo "✓ Deleted app/api/nfc directory"
fi

# Delete tap loading directory
if [ -d "cardlink/app/tap/loading" ]; then
    rm -rf "cardlink/app/tap/loading"
    echo "✓ Deleted app/tap/loading directory"
fi

echo ""
echo "Cleanup complete!"
echo ""
echo "Verifying tap directory structure:"
ls -la cardlink/app/tap/

echo ""
echo "✅ Route conflict should now be resolved!"
