import { EmailPayload } from "./index";

export function createResendNotifier() {
  const { Resend } = require("resend");
  const client = new Resend(process.env.RESEND_API_KEY);
  const from = `${process.env.EMAIL_FROM_NAME || "VAULTS"} <${process.env.EMAIL_FROM_ADDRESS || "no-reply@example.com"}>`;

  return {
    async sendEmail({ to, subject, html, text, headers }: EmailPayload) {
      await client.emails.send({
        from,
        to,
        subject,
        html,
        text,
        headers,
      });
    },
  };
}

export function createPostmarkNotifier() {
  const postmark = require("postmark");
  const client = new postmark.ServerClient(
    process.env.POSTMARK_SERVER_TOKEN,
  );
  const from =
    process.env.EMAIL_FROM_ADDRESS || "no-reply@example.com";

  return {
    async sendEmail({ to, subject, html, text, headers }: EmailPayload) {
      await client.sendEmail({
        From: from,
        To: to,
        Subject: subject,
        HtmlBody: html,
        TextBody: text || "",
        Headers: headers
          ? Object.entries(headers).map(([Name, Value]) => ({ Name, Value }))
          : undefined,
      });
    },
  };
}
