import { projectId, publicAnonKey } from '../../utils/supabase/info';

export const supabaseRestUrl = `https://${projectId}.supabase.co/rest/v1`;

export function getSupabaseHeaders(prefer?: string) {
  return {
    apikey: publicAnonKey,
    Authorization: `Bearer ${publicAnonKey}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {})
  };
}
