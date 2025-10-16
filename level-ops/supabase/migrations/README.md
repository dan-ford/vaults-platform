# Database Migrations

## How to Run Migrations

Since the Supabase MCP server requires elevated privileges for migrations, please run these manually through the Supabase Dashboard:

1. Go to your Supabase project: https://supabase.com/dashboard/project/lkjzxsvytsmnvuorqfdl
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy the contents of the migration file you want to run
5. Paste into the editor
6. Click **Run** or press `Cmd/Ctrl + Enter`

## Pending Migrations

### 20250106_create_profiles_table.sql

**Status:** 🚨 REQUIRED - Blocks Organization Settings functionality

**What it does:**
- Creates `profiles` table for user display information (name, email, avatar)
- Sets up RLS policies (users can view all profiles, only update their own)
- Creates trigger to auto-populate profiles on user signup
- Backfills existing users into profiles table
- Enables realtime for profiles table

**Why needed:**
- Organization Settings page needs to display member names/emails
- Currently blocked because profiles table doesn't exist
- Without this, member management UI shows nothing

**After running:**
- Organization Settings page will be fully functional
- Member list will show names/emails from profiles
- New users will automatically get profiles created on signup
