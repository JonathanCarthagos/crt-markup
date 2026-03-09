/**
 * Supabase Admin client — usa Service Role Key.
 * Apenas para Server Components, Server Actions e API routes.
 * Nunca expor no client.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function createAdminClient() {
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations');
  }
  return createClient(url, serviceKey);
}
