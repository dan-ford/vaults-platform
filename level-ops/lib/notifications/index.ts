export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
};

export type SmsPayload = { to: string; body: string };
export type WhatsAppPayload = {
  to: string;
  templateName: string;
  components?: any;
};

export interface Notifier {
  sendEmail(p: EmailPayload): Promise<void>;
  sendSms?(p: SmsPayload): Promise<void>;
  sendWhatsApp?(p: WhatsAppPayload): Promise<void>;
}

// Factory chooses provider by env
export function createNotifier(): Notifier {
  // Prefer Resend, fallback Postmark; else throw
  if (process.env.RESEND_API_KEY) {
    const { createResendNotifier } = require("./email");
    return createResendNotifier();
  }
  if (process.env.POSTMARK_SERVER_TOKEN) {
    const { createPostmarkNotifier } = require("./email");
    return createPostmarkNotifier();
  }
  throw new Error("No transactional email provider configured");
}
