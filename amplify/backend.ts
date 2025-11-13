/**
 * @fileoverview Amplify backend configuration
 * Defines the main backend configuration including authentication, data,
 * and storage resources for the Amplify application.
 * 
 * @author Danny Bernier
 * @version 1.0.0
 */

import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
defineBackend({
  auth, // Cognito
  data, // DynamoDB
  storage, // S3 Storage
});
