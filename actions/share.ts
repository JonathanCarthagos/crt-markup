/**
 * Share actions — project sharing utility functions.
 * Use the authenticated Supabase client (client-side).
 * Security is enforced by RLS policies in the database.
 */

import { supabase } from '@/lib/supabase';
import type { SiteShare } from '@/types';

const MAX_GUESTS = 2;

export interface ShareActionResult<T = null> {
  data: T;
  error: string | null;
}

/**
 * Lists the guests of a project.
 */
export async function listGuests(siteId: string): Promise<ShareActionResult<SiteShare[]>> {
  const { data, error } = await supabase
    .from('site_shares')
    .select('*')
    .eq('site_id', siteId)
    .order('created_at', { ascending: true });

  if (error) {
    return { data: [], error: 'Failed to load guests.' };
  }

  return { data: data as SiteShare[], error: null };
}

/**
 * Adds a guest to a project.
 * Validates the 2-guest limit and prevents inviting the project owner.
 */
export async function addGuest(
  siteId: string,
  guestEmail: string,
): Promise<ShareActionResult<SiteShare | null>> {
  const normalizedEmail = guestEmail.trim().toLowerCase();

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { data: null, error: 'Invalid email address.' };
  }

  // Verify current session
  const { data: sessionData } = await supabase.auth.getSession();
  const currentUser = sessionData.session?.user;
  if (!currentUser) {
    return { data: null, error: 'You must be logged in.' };
  }

  // Prevent inviting yourself
  if (currentUser.email?.toLowerCase() === normalizedEmail) {
    return { data: null, error: 'You cannot invite yourself.' };
  }

  // Check guest limit
  const { count, error: countError } = await supabase
    .from('site_shares')
    .select('*', { count: 'exact', head: true })
    .eq('site_id', siteId);

  if (countError) {
    return { data: null, error: 'Failed to check guest limit.' };
  }

  if ((count ?? 0) >= MAX_GUESTS) {
    return {
      data: null,
      error: `This project has reached the ${MAX_GUESTS}-guest limit.`,
    };
  }

  // Insert the invite.
  // guest_user_id will be null until the guest registers.
  // The trigger `on_auth_user_created_link_guest` links it automatically.
  const { data: inserted, error: insertError } = await supabase
    .from('site_shares')
    .insert({
      site_id: siteId,
      guest_email: normalizedEmail,
      invited_by: currentUser.id,
    })
    .select('*')
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      return { data: null, error: 'This email has already been invited to this project.' };
    }
    return { data: null, error: 'Failed to add guest.' };
  }

  return { data: inserted as SiteShare, error: null };
}

/**
 * Removes a guest by their site_shares record ID.
 */
export async function removeGuest(shareId: string): Promise<ShareActionResult> {
  const { error } = await supabase
    .from('site_shares')
    .delete()
    .eq('id', shareId);

  if (error) {
    return { data: null, error: 'Failed to remove guest.' };
  }

  return { data: null, error: null };
}
