import { config } from 'dotenv';
config();

// Load flows to be available in the dev UI.
import '@/ai/flows/suggest-redistribution-strategy.ts';
