import {
  TransactionalEmailsApi,
  TransactionalEmailsApiApiKeys,
  ContactsApi,
  ContactsApiApiKeys,
} from "@sendinblue/client";

const brevoClient = new TransactionalEmailsApi();
brevoClient.setApiKey(
  TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

const brevoContactsApi = new ContactsApi();
brevoContactsApi.setApiKey(
  ContactsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

// Named exports instead of default
export { brevoClient, brevoContactsApi };
