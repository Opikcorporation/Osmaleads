import { config } from 'dotenv';
config();

// Load flows to be available in the dev UI.
import '@/ai/flows/distribute-leads-flow.ts';
