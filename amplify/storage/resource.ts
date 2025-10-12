import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'imageHarborStorage',
  access: (allow) => ({
    // Protected files are accessible by any authenticated user
    'protected/images/original/*': [
      allow.authenticated.to(['read']),
      allow.entity('identity').to(['write', 'delete']),
    ],
    'protected/images/thumbnail/*': [
      allow.authenticated.to(['read']),
      allow.entity('identity').to(['write', 'delete']),
    ],
    'protected/images/edited/*': [
      allow.authenticated.to(['read']),
      allow.entity('identity').to(['write', 'delete']),
    ],
    // Private files are only accessible by the owner
    'private/images/original/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
    'private/images/thumbnail/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
    'private/images/edited/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
  }),
});
