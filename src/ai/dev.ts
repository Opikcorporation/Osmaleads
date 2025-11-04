'use server';
import { config } from 'dotenv';
config();

// Pre-load the firebase-admin module to prevent initialization errors in flows.
import 'firebase-admin';

import '@/ai/flows/distribute-leads-flow.ts';
