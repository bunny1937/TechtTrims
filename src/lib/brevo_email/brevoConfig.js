import * as brevo from "@getbrevo/brevo";

const brevoClient = new brevo.TransactionalEmailsApi();
brevoClient.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

const brevoContactsApi = new brevo.ContactsApi();
brevoContactsApi.setApiKey(
  brevo.ContactsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

export { brevoClient, brevoContactsApi };
