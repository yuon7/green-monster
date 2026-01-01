import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables if not already loaded
// Check if process.env is populated (Discord bots usually load envs early)
if (!process.env.SUPABASE_URL) {
  config({ path: path.resolve(process.cwd(), '.env') });
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase URL or Key is missing. Database features will be disabled.');
}

// Create Supabase client
// Note: We use the 'anon' key for now. If RLS is enabled, we rely on policies allowing anon access.
export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

/**
 * Check if database is connected/configured
 */
export const isDbConfigured = (): boolean => {
  return !!supabase;
};
