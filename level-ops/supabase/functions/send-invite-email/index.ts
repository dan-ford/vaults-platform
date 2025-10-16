// Supabase Edge Function: send-invite-email
// Sends transactional vault invitation emails using Resend or Postmark
// Deploy with: supabase functions deploy send-invite-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Email provider implementations
async function sendViaResend(payload: EmailPayload): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");

  const from = `${Deno.env.get("EMAIL_FROM_NAME") || "VAULTS"} <${Deno.env.get("EMAIL_FROM_ADDRESS") || "no-reply@example.com"}>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }
}

async function sendViaPostmark(payload: EmailPayload): Promise<void> {
  const apiKey = Deno.env.get("POSTMARK_SERVER_TOKEN");
  if (!apiKey) throw new Error("POSTMARK_SERVER_TOKEN not configured");

  const from =
    Deno.env.get("EMAIL_FROM_ADDRESS") || "no-reply@example.com";

  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      From: from,
      To: payload.to,
      Subject: payload.subject,
      HtmlBody: payload.html,
      TextBody: payload.text || "",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Postmark API error: ${error}`);
  }
}

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface InviteEmailRequest {
  vaultName: string;
  inviterName: string;
  inviteeEmail: string;
  inviteUrl: string;
  expiryHours: number;
}

function generateInviteEmailHTML({
  vaultName,
  inviterName,
  inviteUrl,
  expiryHours,
}: Omit<InviteEmailRequest, "inviteeEmail">): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 0 40px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">VAULTS</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 40px;">
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #1a1a1a;">
                You've been invited to join a Vault
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151; line-height: 24px;">
                <strong>${inviterName}</strong> has invited you to join the <strong>${vaultName}</strong> vault.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #374151; line-height: 24px;">
                Click the button below to accept the invitation and get started:
              </p>
              <table cellpadding="0" cellspacing="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td>
                    <a href="${inviteUrl}" style="display: inline-block; padding: 14px 32px; background-color: #26ace2; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280; line-height: 20px;">
                This invitation will expire in <strong>${expiryHours} hours</strong>.
              </p>
              <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 20px;">
                If you're having trouble clicking the button, copy and paste this link into your browser:<br>
                <a href="${inviteUrl}" style="color: #26ace2; text-decoration: none; word-break: break-all;">${inviteUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #e5e7eb; background-color: #f9fafb;">
              <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 20px;">
                If you have any questions, please contact us at <a href="mailto:support@vaults.com" style="color: #26ace2; text-decoration: none;">support@vaults.com</a>
              </p>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} VAULTS. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateInviteEmailText({
  vaultName,
  inviterName,
  inviteUrl,
  expiryHours,
}: Omit<InviteEmailRequest, "inviteeEmail">): string {
  return `You've been invited to join a Vault

${inviterName} has invited you to join the ${vaultName} vault.

Click the link below to accept the invitation and get started:
${inviteUrl}

This invitation will expire in ${expiryHours} hours.

If you have any questions, please contact us at support@vaults.com

© ${new Date().getFullYear()} VAULTS. All rights reserved.`;
}

serve(async (req) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    // Verify request is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body: InviteEmailRequest = await req.json();
    const { vaultName, inviterName, inviteeEmail, inviteUrl, expiryHours } =
      body;

    // Validate payload
    if (!vaultName || !inviterName || !inviteeEmail || !inviteUrl || !expiryHours) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Generate email content
    const html = generateInviteEmailHTML({
      vaultName,
      inviterName,
      inviteUrl,
      expiryHours,
    });
    const text = generateInviteEmailText({
      vaultName,
      inviterName,
      inviteUrl,
      expiryHours,
    });

    const emailPayload: EmailPayload = {
      to: inviteeEmail,
      subject: `You've been invited to join a Vault: ${vaultName}`,
      html,
      text,
    };

    // Send email using configured provider
    if (Deno.env.get("RESEND_API_KEY")) {
      await sendViaResend(emailPayload);
    } else if (Deno.env.get("POSTMARK_SERVER_TOKEN")) {
      await sendViaPostmark(emailPayload);
    } else {
      throw new Error("No email provider configured");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error sending invite email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
});
