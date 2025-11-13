/**
 * @fileoverview Amplify authentication resource configuration
 * Defines authentication settings including login methods and user attributes
 * for the Image Harbor application.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

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
