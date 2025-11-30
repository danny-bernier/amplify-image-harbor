/**
 * @fileoverview Amplify data resource configuration
 * Defines database schema for images, thumbnails, and edited images
 * with proper authorization rules and relationships.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const ownerPermissions = ['create', 'read', 'update', 'delete'] as const;
const authenticatedPermissions = ['read'] as const;

// define database schema here
const schema = a.schema({
  Image: a
    .model({
      title: a.string().default(() => new Date().toISOString()),
      description: a.string(),
      derivedFrom: a.id(), // If this image is a derived/edited variant, `derivedFrom` points to the original Image id
      type: a.enum(['ORIGINAL', 'EDITED']), // type differentiates original images from edited/derived images
      width: a.integer().required(), // Example 1920
      height: a.integer().required(), // Example 1080
      s3Key: a.string().required(),
      tags: a.string().array(), // Simple tag strings
      jsonTags: a.json(), // JSON object for key-value tags only
      created: a.datetime().required(),
      lastUpdated: a.datetime().required(),
      metadata: a.json(), // optional metadata
    })
    .authorization((allow) => [
      allow.owner().to([...ownerPermissions]), // Creates 'owner' field
      allow.authenticated().to([...authenticatedPermissions]), // Anyone who is authenticated
    ]),

  Thumbnail: a
    .model({
      imageId: a.id().required(), // Reference to original Image
      s3Key: a.string().required(), // Thumbnail file path
      size: a.enum(['SMALL', 'MEDIUM', 'LARGE', 'HUGE']), // Different thumbnail sizes
      created: a.datetime().required(),
      lastUpdated: a.datetime().required(),
      metadata: a.json(), // optional metadata
    })
    .authorization((allow) => [
      allow.owner().to([...ownerPermissions]), // Creates 'owner' field
      allow.authenticated().to([...authenticatedPermissions]), // Anyone who is authenticated
    ]),

  Collection: a
    .model({
      title: a.string().default(() => new Date().toISOString()),
      description: a.string(),
      tags: a.string().array(),
      jsonTags: a.json(),
      s3Key: a.string(), // will store a zip file S3 key for the whole collection
      created: a.datetime().required(),
      lastUpdated: a.datetime().required(),
      metadata: a.json(), // optional metadata
    })
    .authorization((allow) => [
      allow.owner().to([...ownerPermissions]),
      allow.authenticated().to([...authenticatedPermissions]),
    ]),

  CollectionImageMap: a
    .model({
      collectionId: a.id().required(), // reference to Collection
      imageId: a.id().required(), // reference to Image
      addedAt: a.datetime().required(),
      position: a.integer(), // optional ordering within the collection
      metadata: a.json(), // optional per-membership metadata
    })
    .authorization((allow) => [
      allow.owner().to([...ownerPermissions]),
      allow.authenticated().to([...authenticatedPermissions]),
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