'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { processSilentJoin } from '@/actions/process-silent-join';
import type { Session } from '@supabase/supabase-js';

/**
 * Callback page after email confirmation (Sign Up in the invite flow).
 * Supabase redirects here with either:
 *  - PKCE: ?code=XXX  (supabase-js auto-exchanges on client init)
 *  - Implicit: #access_token=XXX (supabase-js auto-picks up on client init)
 *
 * Instead of a fixed delay we wait for the SIGNED_IN auth event,
 * with a 10s timeout as safety net.
 */
function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');

  useEffect(() => {
    const inviteToken = searchParams.get('inviteToken');
    const url = searchParams.get('url');

    const finish = async (session: Session) => {
      if (inviteToken && session.user.email) {
        await processSilentJoin(inviteToken, session.user.id, session.user.email);
      }

      const target =
        inviteToken && url
          ? `/editor?inviteToken=${encodeURIComponent(inviteToken)}&url=${encodeURIComponent(url)}`
          : '/dashboard';

      router.replace(target);
    };

    // Check if session already exists (e.g. code was already exchanged).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        finish(data.session);
        return;
      }

      // Wait for supabase-js to finish exchanging the code/hash.
      let settled = false;
      const timeout = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          subscription.unsubscribe();
          setStatus('error');
        }
      }, 10_000);

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session && !settled) {
          settled = true;
          clearTimeout(timeout);
          subscription.unsubscribe();
          finish(session);
        }
      });
    });
  }, [router, searchParams]);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl border border-gray-200 shadow-sm max-w-md">
          <p className="text-gray-700 mb-4">Failed to complete sign up. Please try again.</p>
          <a
            href="/"
            className="inline-flex items-center px-5 py-3 text-white rounded-lg hover:opacity-80 transition-opacity"
            style={{ backgroundColor: '#FE4004' }}
          >
            Back to home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div
          className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3"
          style={{ borderColor: '#FE4004' }}
        />
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div
            className="animate-spin rounded-full h-10 w-10 border-b-2"
            style={{ borderColor: '#FE4004' }}
          />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
