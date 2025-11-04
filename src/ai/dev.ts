'use server';
import { config } from 'dotenv';
config();

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK at the start.
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Load flows to be available in the dev UI.
import '@/ai/flows/suggest-redistribution-strategy.ts';
