'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  MessageSquare,
  ExternalLink,
  Plus,
  ArrowRight,
  Globe,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { FREE_PROJECT_LIMIT } from '@/lib/constants';
import { UserMenu } from '@/components/user-menu';

interface SiteWithCounts {
  id: string;
  url: string;
  created_at: string;
  updated_at: string;
  open_count: number;
  resolved_count: number;
  total_comments: number;
  isShared?: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [sites, setSites] = useState<SiteWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingSiteId, setDeletingSiteId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      if (!uid) {
        router.replace('/');
        return;
      }
      setUserId(uid);
      await loadSites(uid);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const loadSites = async (uid: string) => {
    setIsLoading(true);

    // Fetch owned and shared projects in parallel
    const [{ data: ownedData, error: ownedError }, { data: sharedData }] = await Promise.all([
      supabase
        .from('sites')
        .select('id, url, created_at, updated_at')
        .eq('created_by', uid)
        .order('updated_at', { ascending: false }),
      supabase
        .from('site_shares')
        .select('sites(id, url, created_at, updated_at)')
        .eq('guest_user_id', uid),
    ]);

    if (ownedError) {
      setIsLoading(false);
      return;
    }

    const ownedSites = (ownedData ?? []).map((s) => ({ ...s, isShared: false }));

    // Flatten shared sites e marcar como isShared
    const sharedSites: SiteWithCounts[] = [];
    if (sharedData) {
      for (const row of sharedData) {
        const site = (row as any).sites;
        if (site && !ownedSites.find((o) => o.id === site.id)) {
          sharedSites.push({
            id: site.id,
            url: site.url,
            created_at: site.created_at,
            updated_at: site.updated_at,
            open_count: 0,
            resolved_count: 0,
            total_comments: 0,
            isShared: true,
          });
        }
      }
    }

    const allSites = [...ownedSites, ...sharedSites];

    const sitesWithCounts: SiteWithCounts[] = await Promise.all(
      allSites.map(async (site) => {
        const { count: openCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('site_id', site.id)
          .eq('status', 'open');

        const { count: resolvedCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('site_id', site.id)
          .eq('status', 'resolved');

        return {
          ...site,
          open_count: openCount ?? 0,
          resolved_count: resolvedCount ?? 0,
          total_comments: (openCount ?? 0) + (resolvedCount ?? 0),
        };
      }),
    );

    setSites(sitesWithCounts);
    setIsLoading(false);
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim() || !userId) return;

    if (sites.length >= FREE_PROJECT_LIMIT) return;

    setIsAdding(true);
    let normalizedUrl = newUrl.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    router.push(`/editor?url=${encodeURIComponent(normalizedUrl)}`);
  };

  const handleDeleteSite = async (siteId: string) => {
    if (!userId) return;
    setDeletingSiteId(siteId);

    const { error } = await supabase.from('sites').delete().eq('id', siteId);

    if (!error) {
      setSites((prev) => prev.filter((s) => s.id !== siteId));
    }
    setDeletingSiteId(null);
  };

  const formatUrl = (url: string) => {
    try {
      const u = new URL(url);
      return u.hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const ownedSites = sites.filter((s) => !s.isShared);
  const totalOpen = sites.reduce((sum, s) => sum + s.open_count, 0);
  const totalResolved = sites.reduce((sum, s) => sum + s.resolved_count, 0);
  const atLimit = ownedSites.length >= FREE_PROJECT_LIMIT;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3"
            style={{ borderColor: '#FE4004' }}
          />
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <Image
              src="/logo.svg"
              alt="CRT Markup Logo"
              width={120}
              height={78}
              className="h-10 w-auto"
            />
            <h1
              className="text-2xl font-normal"
              style={{ color: '#FE4004', fontWeight: 400 }}
            >
              CRT Markup
            </h1>
          </Link>
          <UserMenu showDashboardLink={false} />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#FE4004' }}
              >
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">
                  {ownedSites.length}
                </p>
                <p className="text-sm text-gray-500">
                  Project{ownedSites.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" style={{ color: '#FE4004' }} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">
                  {totalOpen}
                </p>
                <p className="text-sm text-gray-500">Open comments</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">
                  {totalResolved}
                </p>
                <p className="text-sm text-gray-500">Resolved</p>
              </div>
            </div>
          </div>
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Your projects</h2>
          {!atLimit && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#FE4004' }}
            >
              <Plus className="w-4 h-4" />
              New project
            </button>
          )}
          {atLimit && (
            <span className="text-sm text-gray-500">
              {FREE_PROJECT_LIMIT}/{FREE_PROJECT_LIMIT} projects (free plan limit)
            </span>
          )}
        </div>

        {/* Add project form */}
        {showAddForm && (
          <form
            onSubmit={handleAddProject}
            className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex gap-3"
          >
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="Enter website URL..."
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none text-sm transition-colors text-gray-900 placeholder:text-gray-400"
              onFocus={(e) => {
                e.target.style.borderColor = '#FE4004';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
              }}
              autoFocus
              disabled={isAdding}
            />
            <button
              type="submit"
              disabled={isAdding || !newUrl.trim()}
              className="px-6 py-2.5 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              style={{ backgroundColor: '#FE4004' }}
            >
              {isAdding ? 'Loading...' : 'Start reviewing'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Projects grid */}
        {sites.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Globe className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No projects yet
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Add a website URL to start collecting feedback.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#FE4004' }}
            >
              <Plus className="w-4 h-4" />
              Add your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sites.map((site) => (
              <div
                key={site.id}
                className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group"
              >
                {/* Card top - clickable */}
                <button
                  onClick={() =>
                    router.push(
                      `/editor?url=${encodeURIComponent(site.url)}`,
                    )
                  }
                  className="w-full text-left p-5 pb-3"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Globe className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {formatUrl(site.url)}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {site.url}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                      {site.isShared && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                          Shared with me
                        </span>
                      )}
                      <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  {/* Comment stats */}
                  <div className="flex items-center gap-4 mt-3">
                    {site.open_count > 0 && (
                      <span className="flex items-center gap-1.5 text-xs">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: '#FE4004' }}
                        />
                        <span className="text-gray-600">
                          {site.open_count} open
                        </span>
                      </span>
                    )}
                    {site.resolved_count > 0 && (
                      <span className="flex items-center gap-1.5 text-xs">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-gray-600">
                          {site.resolved_count} resolved
                        </span>
                      </span>
                    )}
                    {site.total_comments === 0 && (
                      <span className="text-xs text-gray-400">
                        No comments yet
                      </span>
                    )}
                  </div>
                </button>

                {/* Card footer */}
                <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {formatDate(site.updated_at || site.created_at)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {site.total_comments}
                    </span>
                    {!site.isShared && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this project and all its comments?')) {
                            handleDeleteSite(site.id);
                          }
                        }}
                        disabled={deletingSiteId === site.id}
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Plan info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            Free plan: {ownedSites.length}/{FREE_PROJECT_LIMIT} projects used
          </p>
        </div>
      </main>
    </div>
  );
}
