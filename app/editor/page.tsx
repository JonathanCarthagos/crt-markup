'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageSquare, X, Smartphone, Monitor, User, Share2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { Comment } from '@/types';
import { supabase } from '@/lib/supabase';
import { FREE_PROJECT_LIMIT } from '@/lib/constants';
import { UserMenu } from '@/components/user-menu';
import { ShareModal } from '@/components/ShareModal';

function EditorContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get('url');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [pendingClick, setPendingClick] = useState<{ x: number; y: number; selector: string } | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [tempUserName, setTempUserName] = useState('');
  const [hoveredComment, setHoveredComment] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'resolved'>('active');
  const [siteId, setSiteId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [iframeDoc, setIframeDoc] = useState<{ width: number; height: number; scrollX: number; scrollY: number }>({
    width: 0,
    height: 0,
    scrollX: 0,
    scrollY: 0,
  });

  const commentsForViewport = comments.filter((comment) => !comment.viewport || comment.viewport === viewport);

  const activeCount = commentsForViewport.filter(c => c.status === 'open').length;
  const resolvedCount = commentsForViewport.filter(c => c.status === 'resolved').length;
  const filteredComments = commentsForViewport
    .filter((c) => (activeTab === 'active' ? c.status === 'open' : c.status === 'resolved'))
    .sort((a, b) => (a.comment_number || 0) - (b.comment_number || 0));

  useEffect(() => {
    const savedName = localStorage.getItem('carthagos_user_name');
    if (savedName) {
      setUserName(savedName);
    }
  }, []);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setIsBootstrapping(false);
        return;
      }

      const sessionUser = data.session?.user ?? null;
      if (!sessionUser) {
        setIsBootstrapping(false);
        return;
      }

      setUserId(sessionUser.id);
      if (!userName && sessionUser.email) {
        setUserName(sessionUser.email.split('@')[0]);
      }
      setIsBootstrapping(false);
    };

    bootstrapAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [userName]);

  useEffect(() => {
    const loadSiteAndComments = async () => {
      if (!url || !userId) return;

      setIsBootstrapping(true);

      const { data: existingSite } = await supabase
        .from('sites')
        .select('id')
        .eq('url', url)
        .eq('created_by', userId)
        .maybeSingle();

      let currentSiteId: string | null = (existingSite?.id as string | undefined) ?? null;
      let ownerMode = true;

      if (!currentSiteId) {
        const { data: guestShares } = await supabase
          .from('site_shares')
          .select('site_id')
          .eq('guest_user_id', userId);

        if (guestShares && guestShares.length > 0) {
          const sharedSiteIds = guestShares.map((s: { site_id: string }) => s.site_id);
          const { data: matchingSite } = await supabase
            .from('sites')
            .select('id')
            .eq('url', url)
            .in('id', sharedSiteIds)
            .maybeSingle();

          if (matchingSite) {
            currentSiteId = matchingSite.id as string;
            ownerMode = false;
          }
        }
      }

      setIsOwner(ownerMode);

      if (!currentSiteId) {
        const { count } = await supabase.from('sites').select('*', { count: 'exact', head: true }).eq('created_by', userId);
        if ((count ?? 0) >= FREE_PROJECT_LIMIT) {
          setLimitReached(true);
          setIsBootstrapping(false);
          return;
        }
        const { data: insertedSite, error: insertSiteError } = await supabase
          .from('sites')
          .insert({
            url,
            created_by: userId,
          })
          .select('id')
          .single();

        if (insertSiteError || !insertedSite) {
          setIsBootstrapping(false);
          return;
        }
        currentSiteId = insertedSite.id as string;
      }

      setSiteId(currentSiteId);

      const { data: dbComments, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('site_id', currentSiteId)
        .order('created_at', { ascending: true });

      if (!commentsError && dbComments) {
        setComments(
          dbComments.map((item: any) => ({
            id: item.id,
            site_id: item.site_id,
            position_x: item.position_x,
            position_y: item.position_y,
            selector: item.selector,
            content: item.content,
            status: item.status,
            browser_info: item.browser_info,
            created_by: item.created_by,
            author_name: item.author_name,
            comment_number: item.comment_number,
            viewport: item.viewport,
            created_at: item.created_at,
            updated_at: item.updated_at,
            timestamp: item.timestamp,
          }))
        );
      }

      setIsBootstrapping(false);
    };

    loadSiteAndComments();
  }, [url, userId]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'CARTHAGOS_SCROLL') {
        const { scrollX, scrollY, docWidth, docHeight } = event.data.data;
        setIframeDoc({
          width: docWidth,
          height: docHeight,
          scrollX: scrollX,
          scrollY: scrollY,
        });
      }
      
      if (event.data.type === 'CARTHAGOS_CLICK') {
        const { x, y, selector, docWidth, docHeight } = event.data.data;
        
        if (docWidth && docHeight) {
          setIframeDoc(prev => ({
            ...prev,
            width: docWidth,
            height: docHeight,
          }));
        }
        
        setPendingClick({ x, y, selector });
        
        if (!userName) {
          setShowNameModal(true);
        } else {
          setIsAddingComment(true);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [userName]);

  const handleSaveName = () => {
    if (!tempUserName.trim()) {
      return;
    }
    const name = tempUserName.trim();
    setUserName(name);
    localStorage.setItem('carthagos_user_name', name);
    setShowNameModal(false);
    setTempUserName('');
    if (pendingClick) {
      setIsAddingComment(true);
    }
  };

  const handleCancelName = () => {
    setShowNameModal(false);
    setTempUserName('');
    setPendingClick(null);
  };

  const handleSaveComment = async () => {
    if (!pendingClick || !newCommentContent.trim() || !siteId || !userId) {
      return;
    }

    setIsSavingComment(true);

    const maxNumber = comments.length > 0
      ? Math.max(...comments.map(c => c.comment_number || 0))
      : 0;
    const nextNumber = maxNumber + 1;

    const payload = {
      site_id: siteId,
      position_x: pendingClick.x,
      position_y: pendingClick.y,
      selector: pendingClick.selector,
      content: newCommentContent.trim(),
      status: 'open',
      author_name: userName || 'Anonymous',
      comment_number: nextNumber,
      timestamp: Date.now(),
      viewport: viewport,
      created_by: userId,
    };

    const { data: insertedComment, error } = await supabase
      .from('comments')
      .insert(payload)
      .select('*')
      .single();

    if (error || !insertedComment) {
      setIsSavingComment(false);
      return;
    }

    const newComment: Comment = {
      id: insertedComment.id,
      site_id: insertedComment.site_id,
      position_x: insertedComment.position_x,
      position_y: insertedComment.position_y,
      selector: insertedComment.selector,
      content: insertedComment.content,
      status: insertedComment.status,
      browser_info: insertedComment.browser_info,
      created_by: insertedComment.created_by,
      author_name: insertedComment.author_name,
      comment_number: insertedComment.comment_number,
      viewport: insertedComment.viewport,
      created_at: insertedComment.created_at,
      updated_at: insertedComment.updated_at,
      timestamp: insertedComment.timestamp,
    };

    setComments((prev) => [...prev, newComment]);
    setNewCommentContent('');
    setPendingClick(null);
    setIsAddingComment(false);
    setIsSavingComment(false);
  };

  const handleCancelComment = () => {
    setPendingClick(null);
    setIsAddingComment(false);
    setNewCommentContent('');
  };

  const handleCommentClick = (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;
    
    setSelectedComment(comment.id);
    
    if (comment.viewport && comment.viewport !== viewport) {
      setViewport(comment.viewport);
    }
    
    setTimeout(() => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'CARTHAGOS_SCROLL_TO',
          data: {
            x: comment.position_x,
            y: comment.position_y,
          }
        }, '*');
      }
      
      setTimeout(() => {
        const pinElement = document.querySelector(`[data-comment-id="${comment.id}"]`) as HTMLElement;
        if (pinElement) {
          pinElement.style.transform = 'translate(-50%, -50%) scale(1.4)';
          pinElement.style.transition = 'transform 0.3s ease';
          setTimeout(() => {
            pinElement.style.transform = 'translate(-50%, -50%) scale(1)';
          }, 600);
        }
      }, 500);
    }, comment.viewport && comment.viewport !== viewport ? 300 : 0);
  };

  const toggleCommentStatus = async (id: string) => {
    const currentComment = comments.find((c) => c.id === id);
    if (!currentComment) return;

    const nextStatus = currentComment.status === 'open' ? 'resolved' : 'open';

    const { error } = await supabase
      .from('comments')
      .update({ status: nextStatus })
      .eq('id', id);

    if (error) return;

    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c))
    );
  };

  const deleteComment = async (id: string) => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id);

    if (error) return;

    setComments((prev) => prev.filter((c) => c.id !== id));
    if (selectedComment === id) {
      setSelectedComment(null);
    }
  };

  if (!url) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">URL not provided</h1>
          <a href="/" className="text-indigo-600 hover:underline">
            Back to home page
          </a>
        </div>
      </div>
    );
  }

  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3" style={{ borderColor: '#FE4004' }}></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-xl border border-gray-200 shadow-sm max-w-md">
          <h1 className="text-2xl font-normal mb-3 text-gray-900" style={{ fontWeight: 400 }}>
            Sign in required
          </h1>
          <p className="text-gray-600 mb-6">
            You need to sign in to review websites and save your comments.
          </p>
          <a
            href="/"
            className="inline-flex items-center px-5 py-3 text-white rounded-lg hover:opacity-80 transition-opacity"
            style={{ backgroundColor: '#FE4004' }}
          >
            Go back to home
          </a>
        </div>
      </div>
    );
  }

  if (limitReached) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-xl border border-gray-200 shadow-sm max-w-md">
          <h1 className="text-2xl font-normal mb-3 text-gray-900" style={{ fontWeight: 400 }}>
            Free plan limit reached
          </h1>
          <p className="text-gray-600 mb-6">
            You can have up to {FREE_PROJECT_LIMIT} projects on the free plan. Upgrade to add more.
          </p>
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

  const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;

  // Clamp comment modal position so it stays visible inside the canvas
  const getCommentModalStyle = (click: { x: number; y: number }): React.CSSProperties => {
    const clampedTop = Math.max(15, Math.min(click.y, 80));
    const clampedLeft = Math.max(20, Math.min(click.x, 80));
    return {
      left: `${clampedLeft}%`,
      top: `${clampedTop}%`,
      transform: 'translate(-50%, -50%)',
    };
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <Image 
              src="/logo.svg" 
              alt="CRT Markup Logo" 
              width={120} 
              height={78}
              className="h-10 w-auto"
            />
            <h1 className="text-xl font-normal text-gray-900" style={{ fontWeight: 400, color: '#FE4004' }}>CRT Markup</h1>
          </Link>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 ml-4">
            <button
              onClick={() => setViewport('desktop')}
              className={`p-2 rounded transition-colors ${viewport === 'desktop' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Desktop"
            >
              <Monitor className={`w-5 h-5 ${viewport === 'desktop' ? 'text-gray-800' : 'text-gray-600'}`} />
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`p-2 rounded transition-colors ${viewport === 'mobile' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Mobile"
            >
              <Smartphone className={`w-5 h-5 ${viewport === 'mobile' ? 'text-gray-800' : 'text-gray-600'}`} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isOwner && siteId ? (
            <button
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#FE4004' }}
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          ) : null}
          <UserMenu />
        </div>
      </header>

      {isOwner && siteId && url && (
        <ShareModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          siteId={siteId}
          siteUrl={url}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center bg-gray-200 p-8 overflow-auto" id="canvas-scroll-container">
          <div
            ref={canvasWrapperRef}
            className={`bg-white shadow-2xl rounded-lg overflow-hidden transition-all duration-300 relative ${
              viewport === 'mobile' ? 'w-[375px]' : 'w-full max-w-full'
            }`}
            style={{ height: viewport === 'mobile' ? '667px' : 'calc(100vh - 200px)' }}
            id="canvas-wrapper"
          >
            <div className="relative w-full h-full">
              <iframe
                ref={iframeRef}
                src={proxyUrl}
                className="w-full h-full border-0"
                title="Preview"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                id="preview-iframe"
              />
              
              {/* Comment pins */}
              {comments
                .filter((comment) => {
                  if (!comment.viewport) return true;
                  return comment.viewport === viewport;
                })
                .map((comment) => {
                const wrapperWidth = canvasWrapperRef.current?.offsetWidth || 1;
                const wrapperHeight = canvasWrapperRef.current?.offsetHeight || 1;
                
                let canvasX: number;
                let canvasY: number;
                
                if (iframeDoc.width > 0 && iframeDoc.height > 0) {
                  const absoluteX = (comment.position_x / 100) * iframeDoc.width;
                  const absoluteY = (comment.position_y / 100) * iframeDoc.height;
                  
                  const viewportX = absoluteX - iframeDoc.scrollX;
                  const viewportY = absoluteY - iframeDoc.scrollY;
                  
                  canvasX = viewportX;
                  canvasY = viewportY;
                } else {
                  canvasX = (comment.position_x / 100) * wrapperWidth;
                  canvasY = (comment.position_y / 100) * wrapperHeight;
                }
                
                const isVisible = canvasX >= -20 && canvasX <= wrapperWidth + 20 && canvasY >= -20 && canvasY <= wrapperHeight + 20;
                
                if (!isVisible) return null;
                
                const pinStyle: React.CSSProperties = {
                  position: 'absolute',
                  left: `${canvasX}px`,
                  top: `${canvasY}px`,
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'auto',
                  zIndex: 40,
                };
                
                return (
                <div
                  key={comment.id}
                  data-comment-id={comment.id}
                  className="cursor-pointer group z-40 pointer-events-auto"
                  style={pinStyle}
                  onClick={() => handleCommentClick(comment.id)}
                  onMouseEnter={() => setHoveredComment(comment.id)}
                  onMouseLeave={() => setHoveredComment(null)}
                >
                  <div className={`w-8 h-8 rounded-full border-2 border-white shadow-lg transition-transform hover:scale-110 flex items-center justify-center ${
                    comment.status === 'open' 
                      ? '' 
                      : 'bg-green-500'
                  }`}
                  style={comment.status === 'open' ? { backgroundColor: '#FE4004' } : {}}
                  >
                    <span className="text-white text-xs font-semibold leading-none">
                      {comment.comment_number || ''}
                    </span>
                  </div>
                  
                  {(hoveredComment === comment.id || selectedComment === comment.id) && (
                    <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl p-3 min-w-[200px] z-50 border border-gray-200 pointer-events-auto">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full border border-white shadow-sm flex items-center justify-center ${
                            comment.status === 'open' ? '' : 'bg-green-500'
                          }`}
                          style={comment.status === 'open' ? { backgroundColor: '#FE4004' } : {}}
                          >
                            <span className="text-white text-[10px] font-semibold leading-none">
                              {comment.comment_number || ''}
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            comment.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {comment.status === 'open' ? 'Open' : 'Resolved'}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteComment(comment.id);
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    {comment.author_name && (
                      <p className="text-xs text-gray-500 mb-1">By {comment.author_name}</p>
                    )}
                    <p className="text-sm text-gray-800">{comment.content}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCommentStatus(comment.id);
                      }}
                      className="mt-2 text-xs hover:underline"
                      style={{ color: '#FE4004' }}
                    >
                      {comment.status === 'open' ? 'Mark as resolved' : 'Reopen'}
                    </button>
                    </div>
                  )}
                </div>
                );
              })}

              {/* New comment modal — clamped to stay visible */}
              {isAddingComment && pendingClick && (
                <div
                  className="absolute bg-white rounded-lg shadow-xl p-4 min-w-[300px] z-50 border border-gray-200"
                  style={getCommentModalStyle(pendingClick)}
                >
                  <h3 className="font-semibold mb-2 text-gray-900" style={{ fontWeight: 400 }}>New Comment</h3>
                  <textarea
                    value={newCommentContent}
                    onChange={(e) => setNewCommentContent(e.target.value)}
                    placeholder="Describe the issue or feedback..."
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none resize-none text-gray-900 placeholder:text-gray-400"
                    style={{ 
                      borderColor: '#d1d5db',
                    } as React.CSSProperties}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#FE4004';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                    }}
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleSaveComment}
                      disabled={!newCommentContent.trim() || isSavingComment}
                      className="flex-1 px-4 py-2 text-white rounded-lg transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium hover:opacity-80"
                      style={{ backgroundColor: '#FE4004' }}
                    >
                      {isSavingComment ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelComment}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Name Modal */}
        {showNameModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FE4004' }}>
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-normal text-gray-900" style={{ fontWeight: 400 }}>What&apos;s your name?</h2>
                </div>
                <button
                  onClick={handleCancelName}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors bg-gray-100"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              
              <p className="text-gray-600 mb-4">
                Enter your name so others can see who left feedback.
              </p>
              
              <div className="mb-4">
                <input
                  type="text"
                  value={tempUserName}
                  onChange={(e) => setTempUserName(e.target.value.slice(0, 50))}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none text-lg transition-colors text-gray-900 placeholder:text-gray-400"
                  style={{ 
                    borderColor: '#d1d5db',
                  } as React.CSSProperties}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#FE4004';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tempUserName.trim()) {
                      handleSaveName();
                    }
                  }}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {tempUserName.length}/50
                </p>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={handleSaveName}
                  disabled={!tempUserName.trim()}
                  className="px-6 py-2 rounded-lg font-semibold text-white transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80"
                  style={{ backgroundColor: '#FE4004' }}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sidebar */}
        <div className="w-[300px] bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comments ({commentsForViewport.length})
            </h2>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'active'
                  ? 'text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <span 
                  className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-semibold"
                  style={{ backgroundColor: activeTab === 'active' ? '#FE4004' : '#9CA3AF' }}
                >
                  {activeCount}
                </span>
                Active
              </span>
              {activeTab === 'active' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: '#FE4004' }} />
              )}
            </button>
            <button
              onClick={() => setActiveTab('resolved')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === 'resolved'
                  ? 'text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <span 
                  className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-semibold"
                  style={{ backgroundColor: activeTab === 'resolved' ? '#22C55E' : '#9CA3AF' }}
                >
                  {resolvedCount}
                </span>
                Resolved
              </span>
              {activeTab === 'resolved' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500" />
              )}
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {commentsForViewport.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No comments yet</p>
                <p className="text-xs mt-1">Click on the site to add</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredComments.map((comment) => (
                  <div
                    key={comment.id}
                    onClick={() => handleCommentClick(comment.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedComment === comment.id
                        ? ''
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={selectedComment === comment.id ? {
                      borderColor: '#FE4004',
                      backgroundColor: '#FFF5F5'
                    } : {}}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center flex-shrink-0 ${
                        comment.status === 'open' 
                          ? '' 
                          : 'bg-green-500'
                      }`}
                      style={comment.status === 'open' ? { backgroundColor: '#FE4004' } : {}}
                      >
                        <span className="text-white text-xs font-semibold">
                          {comment.comment_number || ''}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          {comment.author_name && (
                            <p className="text-sm font-semibold text-gray-900">{comment.author_name}</p>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteComment(comment.id);
                            }}
                            className="text-gray-400 hover:text-red-500 ml-2"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                          <span>
                            {comment.timestamp ? new Date(comment.timestamp).toLocaleString('en-US') : 
                             comment.created_at ? new Date(comment.created_at).toLocaleString('en-US') : 
                             'Now'}
                          </span>
                          {comment.viewport && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                              {comment.viewport === 'desktop' ? (
                                <Monitor className="w-3 h-3" />
                              ) : (
                                <Smartphone className="w-3 h-3" />
                              )}
                              <span className="text-[10px]">{comment.viewport === 'desktop' ? 'Desktop' : 'Mobile'}</span>
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-800 mb-2">{comment.content}</p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCommentStatus(comment.id);
                          }}
                          className={`text-xs px-3 py-1.5 rounded transition-colors ${
                            comment.status === 'open' 
                              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {comment.status === 'open' ? 'Mark as Resolved' : 'Reopen'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredComments.length === 0 && (
                  <div className="text-center text-gray-500 mt-8">
                    <p className="text-sm">
                      {activeTab === 'active' ? 'No active comments' : 'No resolved comments'}
                    </p>
                    <p className="text-xs mt-1">
                      {activeTab === 'active' ? 'All comments have been resolved!' : 'Resolve comments to see them here'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#FE4004' }}></div>
          <p className="text-gray-600">Loading editor...</p>
        </div>
      </div>
    }>
      <EditorContent />
    </Suspense>
  );
}
