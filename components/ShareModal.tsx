'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Mail, Users } from 'lucide-react';
import { toast } from 'sonner';
import { listGuests, addGuest, removeGuest } from '@/actions/share';
import { supabase } from '@/lib/supabase';
import type { SiteShare } from '@/types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteId: string;
  siteUrl: string;
}

const MAX_GUESTS = 2;

export function ShareModal({ isOpen, onClose, siteId, siteUrl }: ShareModalProps) {
  const [guests, setGuests] = useState<SiteShare[]>([]);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchGuests();
      setEmail('');
    }
  }, [isOpen, siteId]);

  const fetchGuests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await Promise.race([
        listGuests(siteId),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 10_000)
        ),
      ]);
      if (error) {
        toast.error(error);
      } else {
        setGuests(data);
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'timeout') {
        toast.error('Failed to load guests. Please try again.');
      } else {
        toast.error('Failed to load guests.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsInviting(true);
    try {
      const addGuestWithTimeout = () =>
        Promise.race([
          addGuest(siteId, email),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 15_000)
          ),
        ]);
      let data: SiteShare | null = null;
      let error: string | null = null;
      try {
        const result = await addGuestWithTimeout();
        data = result.data;
        error = result.error;
      } catch (err) {
        if (err instanceof Error && err.message === 'timeout') {
          toast.error('Request timed out. Please try again.');
          return;
        }
        throw err;
      }

      if (error) {
        toast.error(error);
        return;
      }

      if (data) {
        setGuests((prev) => [...prev, data]);
        setEmail('');

        const { data: { session } } = await supabase.auth.getSession();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15_000);

        try {
          const res = await fetch('/api/send-invite', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(session?.access_token && {
                Authorization: `Bearer ${session.access_token}`,
              }),
            },
            body: JSON.stringify({
              siteId,
              guestEmail: data.guest_email,
              siteUrl,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            toast.success(`Invite sent to ${data.guest_email}`);
          } else {
            const err = await res.json().catch(() => ({}));
            toast.success(`${data.guest_email} added to the project.`, {
              description: 'Email could not be sent. They can sign in to see shared projects.',
            });
            if (res.status !== 503) {
              console.warn('send-invite failed:', err);
            }
          }
        } catch (fetchErr) {
          clearTimeout(timeoutId);
          toast.success(`${data.guest_email} added to the project.`, {
            description: 'Email could not be sent. They can sign in to see shared projects.',
          });
          console.warn('send-invite error:', fetchErr);
        }
      }
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = async (shareId: string, guestEmail: string) => {
    setRemovingId(shareId);
    const { error } = await removeGuest(shareId);

    if (error) {
      toast.error(error);
    } else {
      setGuests((prev) => prev.filter((g) => g.id !== shareId));
      toast.success(`${guestEmail} removed from this project.`);
    }
    setRemovingId(null);
  };

  const atLimit = guests.length >= MAX_GUESTS;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#FE4004' }}
            >
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Share project</h2>
              <p className="text-xs text-gray-500 truncate max-w-[220px]">{siteUrl}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Invite form */}
          <form onSubmit={handleInvite}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invite by email
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  disabled={atLimit || isInviting}
                  className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 placeholder:text-gray-400"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#FE4004';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={atLimit || isInviting || !email.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 whitespace-nowrap"
                style={{ backgroundColor: '#FE4004' }}
              >
                <UserPlus className="w-4 h-4" />
                {isInviting ? 'Sending...' : 'Invite'}
              </button>
            </div>

            {atLimit && (
              <p className="mt-2 text-xs text-amber-600 font-medium">
                This project has reached the {MAX_GUESTS}-guest limit.
              </p>
            )}
          </form>

          {/* Guest list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Guests
              </label>
              <span className="text-xs text-gray-400">
                {guests.length}/{MAX_GUESTS}
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <div
                  className="animate-spin rounded-full h-6 w-6 border-b-2"
                  style={{ borderColor: '#FE4004' }}
                />
              </div>
            ) : guests.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
                <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No guests yet.</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Add up to {MAX_GUESTS} guests above.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {guests.map((guest) => (
                  <li
                    key={guest.id}
                    className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-gray-600 uppercase">
                        {guest.guest_email[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 truncate">{guest.guest_email}</p>
                        <span
                          className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            guest.guest_user_id
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {guest.guest_user_id ? 'Active' : 'Pending'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(guest.id, guest.guest_email)}
                      disabled={removingId === guest.id}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Remove guest"
                    >
                      {removingId === guest.id ? (
                        <div className="w-3.5 h-3.5 animate-spin rounded-full border-b border-current" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-500 text-center">
            Guests can view, comment, and resolve comments. They cannot delete the project.
          </p>
        </div>
      </div>
    </div>
  );
}
