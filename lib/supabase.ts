import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Keep module import-safe during static build when env vars are absent.
const safeUrl = supabaseUrl || 'https://example.supabase.co';
const safeAnonKey = supabaseAnonKey || 'public-anon-key-placeholder';

export const supabase = createClient(safeUrl, safeAnonKey);
