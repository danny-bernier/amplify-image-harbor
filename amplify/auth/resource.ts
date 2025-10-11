import { defineAuth } from '@aws-amplify/backend';

// TODO add role attribute [user, admin, etc.] to conditionally show content
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    email: {
      required: true,
      mutable: false, // Users can't change their email
    },
  },
});
