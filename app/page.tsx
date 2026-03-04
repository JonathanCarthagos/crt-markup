'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, MessageSquare, Users, Share2, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { FREE_PROJECT_LIMIT } from '@/lib/constants';
import { Auth } from '@/components/ui/auth-form-1';
import { UserMenu } from '@/components/user-menu';


export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [showAuthComponent, setShowAuthComponent] = useState(false);
  const [projectCount, setProjectCount] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const type = hashParams.get("type");
      const errorCode = hashParams.get("error_code");
      const error = hashParams.get("error");

      const isRecoveryFlow =
        type === "recovery" ||
        errorCode === "otp_expired" ||
        (error === "access_denied" && !!errorCode);

      if (isRecoveryFlow) {
        window.location.replace(`/reset-password${window.location.hash}`);
        return;
      }
    }

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);

      if (uid) {
        router.replace('/dashboard');
        return;
      }
      setIsSessionReady(true);
    };
    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);

      if (uid) {
        const { data: profile } = await supabase.from('profiles').select('name').eq('user_id', uid).maybeSingle();
        const fullName = session?.user?.user_metadata?.full_name;
        if (!profile && fullName) {
          await supabase.from('profiles').insert({ user_id: uid, name: fullName });
        }
        router.replace('/dashboard');
      }
    });

  return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) return;

    if (!userId) {
      setShowAuthComponent(true);
      return;
    }

    if (projectCount >= FREE_PROJECT_LIMIT) {
      setShowLimitModal(true);
      return;
    }

    setIsLoading(true);
    
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    window.location.href = `/editor?url=${encodeURIComponent(normalizedUrl)}`;
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <Image 
              src="/logo.svg" 
              alt="CRT Markup Logo" 
              width={120} 
              height={78}
              className="h-10 w-auto"
            />
            <h1 className="text-2xl font-normal" style={{ color: '#FE4004', fontWeight: 400 }}>CRT Markup</h1>
          </Link>
          {!isSessionReady ? (
            <span className="text-sm text-gray-400">...</span>
          ) : userId ? (
            <UserMenu />
          ) : (
            <button
              onClick={() => setShowAuthComponent(true)}
              className="text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ color: '#FE4004' }}
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-normal text-gray-900 mb-6 leading-tight" style={{ fontWeight: 400 }}>
          The Fastest Way to Approve Web Projects
        </h1>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          A collaborative space for agencies and clients. Collect precise feedback directly on the live site without the chaos.
        </p>

        {/* URL Input Form */}
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter website URL..."
              className="flex-1 px-6 py-4 border-2 border-gray-300 rounded-lg focus:outline-none text-lg transition-colors text-gray-900 placeholder:text-gray-400"
              style={{ 
                borderColor: '#d1d5db',
              } as React.CSSProperties}
              onFocus={(e) => {
                e.target.style.borderColor = '#FE4004';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
              }}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="px-8 py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-white hover:opacity-80"
              style={{ backgroundColor: '#FF3300' }}
            >
              {isLoading ? (
                'Loading...'
              ) : (
                <>
                  Start Reviewing
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-sm text-gray-500">
          Sign in once and keep all your comments synced.{' '}
          <button onClick={() => setShowAuthComponent(true)} className="underline hover:opacity-80 transition-opacity" style={{ color: '#FE4004' }}>
            Sign in
          </button>{' '}
          to start.
        </p>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4" style={{ backgroundColor: '#FE4004' }}>
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Click-to-comment annotations</h3>
            <p className="text-sm text-gray-600">Easily add comments anywhere on the page</p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4" style={{ backgroundColor: '#FE4004' }}>
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Real-time collaboration</h3>
            <p className="text-sm text-gray-600">Work together with your team instantly</p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4" style={{ backgroundColor: '#FE4004' }}>
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Shareable review links</h3>
            <p className="text-sm text-gray-600">Share feedback with a simple link</p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4" style={{ backgroundColor: '#FE4004' }}>
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">No setup required</h3>
            <p className="text-sm text-gray-600">Start reviewing in seconds</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-600">
          <p>Free to use • No credit card required • Instant collaboration</p>
        </div>
      </footer>

      {showAuthComponent && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAuthComponent(false);
            }
          }}
        >
          <Auth onClose={() => setShowAuthComponent(false)} onGoogleSignIn={handleGoogleSignIn} />
        </div>
      )}

      {showLimitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 border border-gray-200 shadow-xl">
            <h2 className="text-xl font-normal text-gray-900 mb-2" style={{ fontWeight: 400 }}>
              Free plan limit reached
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              You can have up to {FREE_PROJECT_LIMIT} projects on the free plan. Upgrade to add more projects.
            </p>
            <button
              type="button"
              onClick={() => setShowLimitModal(false)}
              className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
