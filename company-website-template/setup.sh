#!/usr/bin/env bash
#
# setup.sh — Initialize a new company website from the Cardlink template.
#
# Usage:
#   ./setup.sh
#
# This interactive script:
# 1. Asks for your company details
# 2. Creates .env.local with the correct values
# 3. Installs dependencies
# 4. Verifies the connection to your Cardlink instance
#

set -e

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║   Cardlink Company Website — Setup Wizard     ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""

# ─── Collect configuration ────────────────────────────────────────

read -rp "Enter your Cardlink app URL (e.g. https://myapp.vercel.app): " CARDLINK_URL
if [ -z "$CARDLINK_URL" ]; then
  echo "❌ Cardlink URL is required."
  exit 1
fi
# Remove trailing slash
CARDLINK_URL="${CARDLINK_URL%/}"

read -rp "Enter your Company ID (UUID from Cardlink dashboard): " COMPANY_ID
if [ -z "$COMPANY_ID" ]; then
  echo "❌ Company ID is required."
  exit 1
fi

read -rp "Enter your Supabase URL (e.g. https://xxx.supabase.co): " SUPABASE_URL
read -rp "Enter your Supabase anon key: " SUPABASE_KEY

# ─── Create .env.local ───────────────────────────────────────────

cat > .env.local << EOF
# ─── Company Configuration ───────────────────────────────────────
# Your company ID from Cardlink (UUID)
NEXT_PUBLIC_COMPANY_ID=${COMPANY_ID}

# ─── Cardlink API ────────────────────────────────────────────────
# URL of your Cardlink app (where the dashboard runs)
NEXT_PUBLIC_CARDLINK_API_URL=${CARDLINK_URL}

# ─── Supabase (Direct Access — read-only public data) ───────────
# These are the SAME Supabase credentials used by the Cardlink app.
# The anon key only has access to public RLS-allowed data.
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_KEY}
EOF

echo ""
echo "✅ Created .env.local"

# ─── Install dependencies ────────────────────────────────────────

echo ""
echo "📦 Installing dependencies..."
npm install

# ─── Verify connection ───────────────────────────────────────────

echo ""
echo "🔗 Verifying connection to Cardlink..."

# Test the website API
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "${CARDLINK_URL}/api/public/website?company_id=${COMPANY_ID}" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Website API: Connected successfully"
elif [ "$HTTP_CODE" = "000" ]; then
  echo "⚠️  Website API: Could not reach ${CARDLINK_URL}"
  echo "   Make sure your Cardlink app is running and accessible."
else
  echo "⚠️  Website API: Got HTTP ${HTTP_CODE}"
  echo "   Make sure your company ID is correct and website settings are published."
fi

# Test the store API
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "${CARDLINK_URL}/api/public/store/products?company_id=${COMPANY_ID}" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Store API: Connected (store is published)"
elif [ "$HTTP_CODE" = "404" ]; then
  echo "ℹ️  Store API: Store not published yet (enable in Cardlink → Store Settings)"
else
  echo "ℹ️  Store API: HTTP ${HTTP_CODE}"
fi

# Test the booking API
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  "${CARDLINK_URL}/api/public/booking/services?company_id=${COMPANY_ID}" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Booking API: Connected"
else
  echo "ℹ️  Booking API: HTTP ${HTTP_CODE}"
fi

# ─── Done ─────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════"
echo "  Setup complete! Run your website:"
echo ""
echo "    npm run dev"
echo ""
echo "  Then open http://localhost:3000"
echo ""
echo "  To customize with AI, see AI_PROMPT.md"
echo "═══════════════════════════════════════════════"
echo ""
