'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/score-lead-flow.ts';
import '@/ai/flows/distribute-leads-flow.ts';
