import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'imageHarborStorage',
  access: (allow) => ({
    // Protected files are accessible by any authenticated user
    'protected/images/original/{entity_id}/*': [
      allow.authenticated.to(['read']),
      allow.entity('identity').to(['write', 'delete']),
    ],
    'protected/images/thumbnail/{entity_id}/*': [
      allow.authenticated.to(['read']),
      allow.entity('identity').to(['write', 'delete']),
    ],
    'protected/images/edited/{entity_id}/*': [
      allow.authenticated.to(['read']),
      allow.entity('identity').to(['write', 'delete']),
    ],
    // Private files are only accessible by the owner
    'private/images/original/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
    'private/images/thumbnail/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
    'private/images/edited/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
  }),
});
