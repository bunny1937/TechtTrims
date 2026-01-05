import * as brevo from "@getbrevo/brevo";

const brevoContactsApi = new brevo.ContactsApi();
brevoContactsApi.setApiKey(
  brevo.ContactsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

const brevoEmailCampaigns = new brevo.EmailCampaignsApi();
brevoEmailCampaigns.setApiKey(
  brevo.EmailCampaignsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

export async function addOrUpdateContact(email, attributes = {}) {
  try {
    const contactData = {
      email: email.toLowerCase().trim(),
      attributes: {
        FIRSTNAME: attributes.name || "",
        SMS: attributes.phone || "",
        GENDER: attributes.gender || "other",
        SIGNUP_DATE: new Date().toISOString(),
        ...attributes,
      },
      listIds: [2], // Replace with your Brevo list ID
      updateEnabled: true,
    };

    await brevoContactsApi.createContact(contactData);
    console.log("Contact added/updated in Brevo:", email);
    return { success: true };
  } catch (error) {
    if (error.response?.body?.code === "duplicate_parameter") {
      console.log("Contact already exists:", email);
      return { success: true, message: "Contact already exists" };
    }

    console.error("Brevo contact error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Remove contact from Brevo
 */
export async function removeContact(email) {
  try {
    await brevoContactsApi.deleteContact(email.toLowerCase().trim());
    console.log("Contact removed from Brevo:", email);
    return { success: true };
  } catch (error) {
    console.error("Brevo remove contact error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send promotional email to a list
 */
export async function sendPromotionalEmail(
  listIds,
  subject,
  htmlContent,
  textContent
) {
  try {
    const emailCampaign = {
      name: `Campaign - ${Date.now()}`,
      subject: subject,
      sender: {
        name: process.env.BREVO_SENDER_NAME || "TechTrims Support",
        email: process.env.BREVO_SENDER_EMAIL || "techtrims2025@gmail.com",
      },
      type: "classic",
      htmlContent: htmlContent,
      recipients: {
        listIds: listIds,
      },
      inlineImageActivation: false,
      mirrorActive: false,
      footer: `[UNSUBSCRIBE]`,
      header: "",
      utmCampaign: "techtrims_promo",
      params: {},
      sendAtBestTime: false,
    };

    const result = await brevoEmailCampaigns.createEmailCampaign(emailCampaign);

    // Schedule to send immediately
    await brevoEmailCampaigns.sendEmailCampaignNow(result.id);

    console.log("Promotional campaign sent:", result.id);
    return { success: true, campaignId: result.id };
  } catch (error) {
    console.error("Brevo campaign error:", error.message);
    return { success: false, error: error.message };
  }
}
