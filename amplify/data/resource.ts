import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const ownerPermissions = ['create', 'read', 'update', 'delete'] as const;
const authenticatedPermissions = ['read'] as const;

// define database schema here
const schema = a.schema({
  Image: a
    .model({
      title: a.string().default(() => new Date().toISOString()),
      description: a.string(),
      width: a.integer().required(), // Example 1920
      height: a.integer().required(), // Example 1080
      s3Key: a.string().required(),
      tags: a.string().array(),
      created: a.datetime().required(),
      lastUpdated: a.datetime().required(),
    })
    .authorization((allow) => [
      allow.owner().to([...ownerPermissions]), // Creates 'owner' field
      allow.authenticated().to([...authenticatedPermissions]), // Anyone who is authenticated
    ]),
  
  Edited: a
    .model({
      imageId: a.id(), // Reference to original image
      s3Key: a.string().required(),
      width: a.integer().required(), // Example 1920
      height: a.integer().required(), // Example 1080
      created: a.datetime().required(),
      lastUpdated: a.datetime().required(),
    })
    .authorization((allow) => [
      allow.owner().to([...ownerPermissions]), // Creates 'owner' field
      allow.authenticated().to([...authenticatedPermissions]), // Anyone who is authenticated
    ]),

  Thumbnail: a
    .model({
      imageId: a.id().required(), // Reference to original Image
      s3Key: a.string().required(), // Thumbnail file path
      size: a.enum(['SMALL', 'MEDIUM', 'LARGE']), // Different thumbnail sizes
      created: a.datetime().required(),
      lastUpdated: a.datetime().required(),
    })
    .authorization((allow) => [
      allow.owner().to([...ownerPermissions]), // Creates 'owner' field
      allow.authenticated().to([...authenticatedPermissions]), // Anyone who is authenticated
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
    apiKeyAuthorizationMode: { expiresInDays: 30 },
  },
});