'use server';

import { createAdminClient } from '@/lib/supabase-admin';

/**
 * Vincula o usuário ao share após login/signup (usuário existente).
 * Para novos usuários, o trigger link_guest_to_shares já faz isso no INSERT.
 * Usa Service Role para garantir a atualização.
 */
export async function processSilentJoin(
  inviteToken: string,
  userId: string,
  userEmail: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createAdminClient();
    const normalizedEmail = userEmail.trim().toLowerCase();

    const { error } = await admin
      .from('site_shares')
      .update({ guest_user_id: userId })
      .eq('invite_token', inviteToken)
      .eq('guest_email', normalizedEmail)
      .is('guest_user_id', null);

    if (error) {
      console.error('processSilentJoin error:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    console.error('processSilentJoin error:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
