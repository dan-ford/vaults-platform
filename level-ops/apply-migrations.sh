#!/bin/bash

# Apply LinkedIn SSO and Email Notifications Migrations
# This script applies the database migrations for the new features

echo "🚀 Applying LinkedIn SSO and Email Notifications migrations..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Apply migrations
echo "📋 Applying migration: create_notification_prefs_table..."
supabase db push --file supabase/migrations/20250111_create_notification_prefs_table.sql

if [ $? -ne 0 ]; then
    echo "❌ Failed to apply notification preferences migration"
    exit 1
fi

echo "✅ Notification preferences table created"
echo ""

echo "📋 Applying migration: create_vault_invites_table..."
supabase db push --file supabase/migrations/20250111_create_vault_invites_table.sql

if [ $? -ne 0 ]; then
    echo "❌ Failed to apply vault invites migration"
    exit 1
fi

echo "✅ Vault invites table created"
echo ""

echo "🎉 All migrations applied successfully!"
echo ""
echo "Next steps:"
echo "1. Deploy Edge Function: supabase functions deploy send-invite-email"
echo "2. Install packages: npm install resend postmark"
echo "3. Configure environment variables in .env.local"
echo "4. Set up email provider (Resend or Postmark)"
echo "5. Configure LinkedIn OAuth in Supabase Dashboard"
