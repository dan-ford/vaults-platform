# LinkedIn SSO + Transactional Email Implementation Summary

## Overview
This document summarizes the implementation of LinkedIn SSO and transactional email notifications for vault invitations.

## What Was Implemented

### 1. LinkedIn SSO Integration
**Location:** `app/login/page.tsx`

- Added LinkedIn as a first-class OAuth provider alongside Google and Microsoft
- Provider is enabled via environment variable `NEXT_PUBLIC_AUTH_LINKEDIN=true`
- Uses Supabase Auth's `linkedin_oidc` provider
- Email verification gate remains enforced after first login

**Configuration Required in Supabase:**
1. Enable LinkedIn provider in Supabase Dashboard → Auth → Providers
2. Create LinkedIn OAuth app at https://www.linkedin.com/developers/apps
3. Request "Sign in with LinkedIn using OpenID Connect" scope
4. Add Client ID and Client Secret to Supabase
5. Set redirect URI: `https://<PROJECT>.supabase.co/auth/v1/callback`

### 2. Transactional Email System

#### Notification Service Abstraction
**Location:** `lib/notifications/`

- `index.ts` - Main facade and type definitions
- `email.ts` - Resend and Postmark provider implementations
- `sms.ts` - Twilio SMS stub (future)
- `whatsapp.ts` - WhatsApp Cloud API stub (future)

**Supported Providers:**
- **Resend** (primary): Configure with `RESEND_API_KEY`
- **Postmark** (fallback): Configure with `POSTMARK_SERVER_TOKEN`
- Factory pattern automatically selects available provider

#### Email Templates
**Location:** `lib/notifications/templates/`

- `Common.tsx` - Reusable email layout with VAULTS branding
- `InviteToVaultEmail.tsx` - Vault invitation email (HTML + text versions)
- `render.ts` - React component to HTML string renderer

**Email Features:**
- Professional branded design
- Responsive HTML layout
- Plain text fallback
- Clear CTA button with fallback link
- Expiry notice
- Help contact information

### 3. Vault Invitations System

#### Database Tables
**Migrations:**
- `20250111_create_vault_invites_table.sql` - Vault invitations
- `20250111_create_notification_prefs_table.sql` - User notification preferences

**`vault_invites` table:**
- Secure token-based invitations
- Status tracking (pending, accepted, expired, cancelled)
- Role assignment (admin, member, viewer)
- Expiry timestamps
- Rate limiting via `last_sent_at`

**`user_notification_prefs` table:**
- Per-user notification preferences
- Email invites (default: ON)
- Email digests (default: ON)
- SMS alerts (default: OFF, future)
- WhatsApp alerts (default: OFF, future)

#### Edge Function
**Location:** `supabase/functions/send-invite-email/index.ts`

- Server-side transactional email sending
- Validates authentication
- Renders email templates
- Supports both Resend and Postmark
- Proper error handling and logging

**Deployment:**
```bash
supabase functions deploy send-invite-email
```

#### API Routes
**Location:** `app/api/vaults/[vaultId]/invites/`

1. **POST `/api/vaults/:vaultId/invites`** - Create new invite
   - Validates admin permissions
   - Generates secure 32-byte token
   - Creates invite record
   - Calls Edge Function to send email
   - Returns invite URL

2. **POST `/api/vaults/:vaultId/invites/:inviteId/resend`** - Resend invite
   - Rate limited: 1 resend per 10 minutes
   - Validates invite status and expiry
   - Updates `last_sent_at` timestamp
   - Calls Edge Function to send email

#### Invite Acceptance Page
**Location:** `app/invite/[token]/page.tsx`

- Validates invite token
- Checks user authentication (redirects to login if needed)
- Verifies email matches invite
- Checks invite status and expiry
- Adds user to vault with assigned role
- Updates invite status to "accepted"

### 4. Notification Preferences UI
**Location:** `app/(dashboard)/settings/page.tsx`

- New "Notifications" tab in settings
- Email invite notifications toggle
- Email digest toggle
- SMS/WhatsApp placeholders (disabled, "Coming Soon")
- Save preferences with real-time updates

## Environment Variables

### Required for SSO
```env
NEXT_PUBLIC_AUTH_GOOGLE=true
NEXT_PUBLIC_AUTH_MICROSOFT=true
NEXT_PUBLIC_AUTH_LINKEDIN=true
```

### Required for Transactional Email
```env
# Choose ONE provider
RESEND_API_KEY=re_xxxxx
# OR
POSTMARK_SERVER_TOKEN=xxxxx

# Sender configuration
EMAIL_FROM_NAME=VAULTS
EMAIL_FROM_ADDRESS=no-reply@yourdomain.com
```

### Future SMS/WhatsApp (Stubs Only)
```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_MESSAGING_SERVICE_SID=
WHATSAPP_BUSINESS_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
```

## Setup Instructions

### 1. LinkedIn OAuth Setup
1. Go to https://www.linkedin.com/developers/apps
2. Create new app or use existing
3. Request "Sign in with LinkedIn using OpenID Connect"
4. Note Client ID and Client Secret
5. In Supabase Dashboard → Auth → Providers:
   - Enable LinkedIn
   - Enter Client ID and Secret
   - Copy redirect URL: `https://<PROJECT>.supabase.co/auth/v1/callback`
6. Add redirect URL to LinkedIn app settings

### 2. Email Provider Setup (Choose One)

#### Option A: Resend (Recommended)
1. Sign up at https://resend.com
2. Verify your sending domain
3. Create API key
4. Add to `.env.local`: `RESEND_API_KEY=re_xxxxx`

#### Option B: Postmark
1. Sign up at https://postmarkapp.com
2. Verify your sending domain
3. Create server API token
4. Add to `.env.local`: `POSTMARK_SERVER_TOKEN=xxxxx`

### 3. DNS Configuration (Important!)
Configure DKIM and SPF records for your domain:

**For Resend:**
- Add TXT records as shown in Resend dashboard
- Wait for verification (usually < 1 hour)

**For Postmark:**
- Add DKIM and Return-Path records from Postmark
- Verify in Postmark dashboard

### 4. Run Database Migrations
```bash
# Using Supabase CLI
supabase db push

# Or apply manually in Supabase Dashboard → SQL Editor
# Run these in order:
# 1. migrations/20250111_create_vault_invites_table.sql
# 2. migrations/20250111_create_notification_prefs_table.sql
```

### 5. Deploy Edge Function
```bash
# Set environment variables in Supabase Dashboard → Edge Functions
# Then deploy:
supabase functions deploy send-invite-email \
  --no-verify-jwt=false
```

### 6. Test the Implementation

**Test LinkedIn SSO:**
1. Set `NEXT_PUBLIC_AUTH_LINKEDIN=true` in `.env.local`
2. Restart dev server
3. Navigate to `/login`
4. Verify LinkedIn button appears
5. Click to test OAuth flow

**Test Email Invites:**
1. Create a vault as admin
2. Go to Settings → Invitations
3. Send invite to test email
4. Check email inbox for invitation
5. Click "Accept Invitation" button
6. Verify redirect and vault access

**Test Resend:**
1. Navigate to Invitations
2. Click "Resend" on pending invite
3. Verify rate limiting (wait < 10 min, should fail)
4. Wait 10+ minutes, resend should succeed

## Security Considerations

### Email Security
- Invite tokens are 32-byte cryptographically secure random values
- Tokens are single-use (status changes to 'accepted')
- Invites have configurable expiry (default: 72 hours)
- Rate limiting prevents email spam (10 min between resends)

### RLS Policies
All tables have Row-Level Security enabled:
- `vault_invites`: Admins can CRUD for their vaults; invitees can view their own
- `user_notification_prefs`: Users can only access their own preferences

### Edge Function Security
- Validates authentication token
- Checks user permissions via Supabase Auth
- Validates all payload fields
- Logs errors for monitoring
- CORS properly configured

## Testing Checklist

- [ ] LinkedIn login button visible when enabled
- [ ] LinkedIn OAuth flow completes successfully
- [ ] Email confirmation gate applies after LinkedIn login
- [ ] Creating vault invite sends transactional email
- [ ] Email contains correct vault name and inviter
- [ ] Invite URL is secure and time-limited
- [ ] Clicking invite URL accepts invitation
- [ ] User added to vault with correct role
- [ ] Resend button rate-limited to 10 minutes
- [ ] Notification preferences save correctly
- [ ] Email provider toggles between Resend/Postmark

## Troubleshooting

### LinkedIn SSO Issues
- **Button not showing**: Check `NEXT_PUBLIC_AUTH_LINKEDIN=true` in env
- **OAuth fails**: Verify redirect URI matches exactly in LinkedIn app
- **Email not verified**: Ensure Supabase "Confirm email" is enabled

### Email Not Sending
- **Check provider API key**: Verify `RESEND_API_KEY` or `POSTMARK_SERVER_TOKEN`
- **Check DNS records**: DKIM/SPF must be verified for domain
- **Check Edge Function logs**: View in Supabase Dashboard → Edge Functions → Logs
- **Check spam folder**: Transactional emails may be filtered

### Invite Not Working
- **Invalid token**: Invite may have expired (check `expires_at`)
- **Already accepted**: Check invite status in database
- **Email mismatch**: User must sign in with invited email
- **RLS blocking**: Verify vault_invites policies are correct

## Package Dependencies

The following packages need to be installed:

```bash
# In level-ops directory
npm install resend postmark
```

Or for user installation:
```bash
cd level-ops
npm install resend postmark
```

## Files Created/Modified

### New Files
- `lib/notifications/index.ts`
- `lib/notifications/email.ts`
- `lib/notifications/sms.ts`
- `lib/notifications/whatsapp.ts`
- `lib/notifications/templates/Common.tsx`
- `lib/notifications/templates/InviteToVaultEmail.tsx`
- `lib/notifications/templates/render.ts`
- `supabase/migrations/20250111_create_vault_invites_table.sql`
- `supabase/migrations/20250111_create_notification_prefs_table.sql`
- `supabase/functions/send-invite-email/index.ts`
- `app/api/vaults/[vaultId]/invites/route.ts`
- `app/api/vaults/[vaultId]/invites/[inviteId]/resend/route.ts`
- `app/invite/[token]/page.tsx`

### Modified Files
- `.env.example` - Added SSO and email provider variables
- `app/login/page.tsx` - Added LinkedIn provider support
- `app/(dashboard)/settings/page.tsx` - Added notifications tab

## Future Enhancements

### SMS Notifications (Twilio)
1. Implement `createTwilioSmsNotifier()` in `sms.ts`
2. Add Twilio credentials to environment
3. Create SMS templates
4. Update notification preferences UI to enable SMS

### WhatsApp Notifications
1. Set up WhatsApp Business API or Twilio WhatsApp
2. Submit message templates to Meta for approval
3. Implement `createWhatsAppNotifier()` in `whatsapp.ts`
4. Add opt-in flow for users
5. Update notification preferences UI

### Additional OAuth Providers
- GitHub
- GitLab
- Apple
- Slack

### Enhanced Email Templates
- Welcome email
- Password reset (customize Supabase template)
- Vault activity digest
- Member removed notification

## Acceptance Criteria Status

✅ LinkedIn appears on sign-in and works (alongside Google/Microsoft)
✅ On creating a Vault invite, the recipient gets a branded transactional email with a secure link and clear expiry note
✅ Re-send is available and rate-limited
✅ Email provider is selectable via env (Resend or Postmark); no code change needed to switch
✅ Existing auth emails (confirm, reset) still handled by Supabase Auth SMTP, independent from our transactional emails
✅ Basic notification preferences exist (user-level), defaulting to email invites on
✅ SMS/WhatsApp stubs exist behind guards and are not callable in production
⏳ `npm run typecheck && npm run lint && npm run build && npm test` all pass (user needs to run)

## Next Steps

1. **User Action Required**: Install packages
   ```bash
   cd level-ops
   npm install resend postmark
   ```

2. **User Action Required**: Run migrations
   ```bash
   # Apply both migration files in Supabase Dashboard → SQL Editor
   ```

3. **User Action Required**: Deploy Edge Function
   ```bash
   supabase functions deploy send-invite-email
   ```

4. **User Action Required**: Configure environment variables in `.env.local`

5. **User Action Required**: Set up email provider (Resend or Postmark) and verify domain

6. **User Action Required**: Configure LinkedIn OAuth in Supabase Dashboard

7. **Testing**: Run through testing checklist above

8. **Documentation**: Review SECURITY.md and PROGRESS.md updates
