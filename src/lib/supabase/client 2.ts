import { createClient } from '@jsr/supabase__supabase-js';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  supabaseClient = createClient(
    `https://${projectId}.supabase.co`,
    publicAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  return supabaseClient;
}
