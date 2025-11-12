import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'imageHarborStorage',
  access: (allow) => ({
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
