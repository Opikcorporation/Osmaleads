'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-lead-profile.ts';
import '@/ai/flows/distribute-leads-flow.ts';
