import { WhatsAppPayload } from "./index";

/**
 * WhatsApp notification stub (Cloud API/Twilio)
 * TODO: Implement when WhatsApp notifications are required
 * Requires: WHATSAPP_BUSINESS_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
 *
 * IMPORTANT: WhatsApp messages must use pre-approved message templates.
 * Templates must be submitted to and approved by Meta before use.
 * Users must opt-in to receive WhatsApp messages.
 *
 * See: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
 */
export function createWhatsAppNotifier() {
  if (
    !process.env.WHATSAPP_BUSINESS_ID ||
    !process.env.WHATSAPP_ACCESS_TOKEN ||
    !process.env.WHATSAPP_PHONE_NUMBER_ID
  ) {
    throw new Error(
      "WhatsApp configuration missing. Set WHATSAPP_BUSINESS_ID, WHATSAPP_ACCESS_TOKEN, and WHATSAPP_PHONE_NUMBER_ID.",
    );
  }

  return {
    async sendWhatsApp(payload: WhatsAppPayload): Promise<void> {
      // TODO: Implement WhatsApp Cloud API message sending
      // Must use approved templates only
      throw new Error("WhatsApp notifications not yet implemented");
    },
  };
}
