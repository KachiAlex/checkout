#!/bin/bash

# Deploy Supabase Edge Functions
# Usage: ./scripts/deploy-supabase.sh [function-name]

set -e

FUNCTION_NAME=${1:-api}

echo "🚀 Deploying Supabase Edge Function: $FUNCTION_NAME"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase"
    echo "Login with: supabase login"
    exit 1
fi

# Deploy the function
echo "📦 Deploying function..."
supabase functions deploy $FUNCTION_NAME

echo "✅ Deployment complete!"
echo ""
echo "Your function is available at:"
echo "https://$(supabase projects list --json | jq -r '.[0].project_ref').supabase.co/functions/v1/$FUNCTION_NAME"

