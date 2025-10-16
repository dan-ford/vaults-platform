import { SmsPayload } from "./index";

/**
 * SMS notification stub (Twilio)
 * TODO: Implement when SMS notifications are required
 * Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID
 */
export function createTwilioSmsNotifier() {
  if (
    !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_AUTH_TOKEN ||
    !process.env.TWILIO_MESSAGING_SERVICE_SID
  ) {
    throw new Error(
      "Twilio SMS configuration missing. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_MESSAGING_SERVICE_SID.",
    );
  }

  return {
    async sendSms(payload: SmsPayload): Promise<void> {
      // TODO: Implement Twilio SMS sending
      throw new Error("SMS notifications not yet implemented");
    },
  };
}
