import React from "react";
import { EmailLayout } from "./Common";

interface InviteToVaultEmailProps {
  vaultName: string;
  inviterName: string;
  inviteUrl: string;
  expiryHours: number;
}

export function InviteToVaultEmail({
  vaultName,
  inviterName,
  inviteUrl,
  expiryHours,
}: InviteToVaultEmailProps) {
  return (
    <EmailLayout>
      <div>
        <h2
          style={{
            margin: "0 0 16px 0",
            fontSize: "20px",
            fontWeight: "600",
            color: "#1a1a1a",
          }}
        >
          You've been invited to join a Vault
        </h2>
        <p
          style={{
            margin: "0 0 24px 0",
            fontSize: "16px",
            color: "#374151",
            lineHeight: "24px",
          }}
        >
          <strong>{inviterName}</strong> has invited you to join the{" "}
          <strong>{vaultName}</strong> vault.
        </p>
        <p
          style={{
            margin: "0 0 24px 0",
            fontSize: "16px",
            color: "#374151",
            lineHeight: "24px",
          }}
        >
          Click the button below to accept the invitation and get started:
        </p>
        <table cellPadding="0" cellSpacing="0" style={{ margin: "0 0 24px 0" }}>
          <tr>
            <td>
              <a
                href={inviteUrl}
                style={{
                  display: "inline-block",
                  padding: "14px 32px",
                  backgroundColor: "#26ace2",
                  color: "#ffffff",
                  textDecoration: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "600",
                }}
              >
                Accept Invitation
              </a>
            </td>
          </tr>
        </table>
        <p
          style={{
            margin: "0 0 16px 0",
            fontSize: "14px",
            color: "#6b7280",
            lineHeight: "20px",
          }}
        >
          This invitation will expire in <strong>{expiryHours} hours</strong>.
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: "#6b7280",
            lineHeight: "20px",
          }}
        >
          If you're having trouble clicking the button, copy and paste this link
          into your browser:
          <br />
          <a
            href={inviteUrl}
            style={{
              color: "#26ace2",
              textDecoration: "none",
              wordBreak: "break-all",
            }}
          >
            {inviteUrl}
          </a>
        </p>
      </div>
    </EmailLayout>
  );
}

// Plain text version
export function inviteToVaultTextEmail({
  vaultName,
  inviterName,
  inviteUrl,
  expiryHours,
}: InviteToVaultEmailProps): string {
  return `You've been invited to join a Vault

${inviterName} has invited you to join the ${vaultName} vault.

Click the link below to accept the invitation and get started:
${inviteUrl}

This invitation will expire in ${expiryHours} hours.

If you have any questions, please contact us at support@vaults.com

© ${new Date().getFullYear()} VAULTS. All rights reserved.`;
}
