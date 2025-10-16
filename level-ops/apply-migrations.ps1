# Apply LinkedIn SSO and Email Notifications Migrations
# PowerShell script for Windows users

Write-Host "🚀 Applying LinkedIn SSO and Email Notifications migrations..." -ForegroundColor Cyan
Write-Host ""

# Check if supabase CLI is installed
$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseCmd) {
    Write-Host "❌ Supabase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Navigate to level-ops directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Apply notification preferences migration
Write-Host "📋 Applying migration: create_notification_prefs_table..." -ForegroundColor Yellow

$sql1 = Get-Content "supabase/migrations/20250111_create_notification_prefs_table.sql" -Raw
supabase db execute $sql1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to apply notification preferences migration" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Notification preferences table created" -ForegroundColor Green
Write-Host ""

# Apply vault invites migration
Write-Host "📋 Applying migration: create_vault_invites_table..." -ForegroundColor Yellow

$sql2 = Get-Content "supabase/migrations/20250111_create_vault_invites_table.sql" -Raw
supabase db execute $sql2

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to apply vault invites migration" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Vault invites table created" -ForegroundColor Green
Write-Host ""

Write-Host "🎉 All migrations applied successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Deploy Edge Function: supabase functions deploy send-invite-email" -ForegroundColor White
Write-Host "2. Install packages: npm install resend postmark" -ForegroundColor White
Write-Host "3. Configure environment variables in .env.local" -ForegroundColor White
Write-Host "4. Set up email provider (Resend or Postmark)" -ForegroundColor White
Write-Host "5. Configure LinkedIn OAuth in Supabase Dashboard" -ForegroundColor White
