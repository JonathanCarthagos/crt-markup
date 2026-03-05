/**
 * Anonymous session utilities.
 * Stores draft URL and comments in localStorage for unauthenticated users.
 * After login, call migrateAnonSession() to persist to Supabase.
 */

import type { Comment } from '@/types';

const ANON_COMMENTS_KEY = 'carthagos_anon_comments';
const ANON_URL_KEY = 'carthagos_anon_url';

export function saveAnonUrl(url: string): void {
  try {
    localStorage.setItem(ANON_URL_KEY, url);
  } catch {}
}

export function getAnonUrl(): string | null {
  try {
    return localStorage.getItem(ANON_URL_KEY);
  } catch {
    return null;
  }
}

export function saveAnonComment(comment: Comment): void {
  try {
    const existing = getAnonComments();
    existing.push(comment);
    localStorage.setItem(ANON_COMMENTS_KEY, JSON.stringify(existing));
  } catch {}
}

export function getAnonComments(): Comment[] {
  try {
    const raw = localStorage.getItem(ANON_COMMENTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Comment[];
  } catch {
    return [];
  }
}

export function clearAnonSession(): void {
  try {
    localStorage.removeItem(ANON_COMMENTS_KEY);
    localStorage.removeItem(ANON_URL_KEY);
  } catch {}
}
