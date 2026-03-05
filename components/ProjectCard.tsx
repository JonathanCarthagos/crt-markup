'use client';

import { useState } from 'react';
import { CheckCircle2, MessageSquare, Trash2, ExternalLink } from 'lucide-react';

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

interface ProjectCardProps {
  site: SiteWithCounts;
  onOpen: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

const PALETTE = [
  { from: '#FE4004', to: '#ff6b35' },
  { from: '#6366f1', to: '#8b5cf6' },
  { from: '#0ea5e9', to: '#06b6d4' },
  { from: '#10b981', to: '#059669' },
  { from: '#f59e0b', to: '#d97706' },
  { from: '#ec4899', to: '#db2777' },
];

function getColor(url: string) {
  const hash = url.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return PALETTE[hash % PALETTE.length];
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return '';
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Updated today';
  if (days === 1) return 'Updated yesterday';
  return `Updated ${days} days ago`;
}

export function ProjectCard({ site, onOpen, onDelete, isDeleting }: ProjectCardProps) {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);

  const color = getColor(site.url);
  const domain = getDomain(site.url);
  const favicon = getFaviconUrl(site.url);

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all group flex flex-col overflow-hidden"
    >
      {/* Thumbnail */}
      <div
        className="relative h-36 flex items-center justify-center cursor-pointer overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})` }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onOpen}
      >
        {/* Favicon + domain */}
        <div
          className="flex flex-col items-center gap-2 transition-opacity duration-200"
          style={{ opacity: hovered ? 0 : 1 }}
        >
          {favicon && !imgError ? (
            <img
              src={favicon}
              alt={domain}
              width={32}
              height={32}
              className="rounded-md opacity-90"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-8 h-8 rounded-md bg-white/30 flex items-center justify-center text-white font-bold text-sm">
              {domain[0]?.toUpperCase()}
            </div>
          )}
          <span className="text-white/90 text-xs font-medium max-w-[160px] truncate px-2 text-center">
            {domain}
          </span>
        </div>

        {/* Hover overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity duration-200"
          style={{ opacity: hovered ? 1 : 0 }}
        >
          <span className="inline-flex items-center gap-2 px-5 py-2 bg-white rounded-lg text-sm font-semibold text-gray-900 shadow-lg">
            <ExternalLink className="w-4 h-4" />
            Open
          </span>
        </div>

        {/* Shared badge */}
        {site.isShared && (
          <span className="absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/90 text-blue-600 border border-blue-100">
            Shared with me
          </span>
        )}
      </div>

      {/* Info */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{domain}</p>
        <p className="text-xs text-gray-400 mt-0.5">{timeAgo(site.updated_at || site.created_at)}</p>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 mt-auto flex items-center justify-between border-t border-gray-100">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-green-600" title="Resolved">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {site.resolved_count}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500" title="Open comments">
            <MessageSquare className="w-3.5 h-3.5" />
            {site.open_count}
          </span>
        </div>

        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Delete this project and all its comments?')) {
                onDelete();
              }
            }}
            disabled={isDeleting}
            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
            title="Delete project"
          >
            {isDeleting ? (
              <div className="w-3.5 h-3.5 animate-spin rounded-full border-b border-current" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
