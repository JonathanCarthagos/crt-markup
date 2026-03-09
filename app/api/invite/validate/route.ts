import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * GET /api/invite/validate?token=XXX
 * Valida invite_token e retorna site + comments para modo guest (read-only).
 * Usa Service Role para bypass RLS (usuário não autenticado).
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token?.trim()) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: share, error: shareError } = await admin
      .from('site_shares')
      .select('site_id, guest_email')
      .eq('invite_token', token.trim())
      .maybeSingle();

    if (shareError || !share) {
      return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 });
    }

    const { data: site, error: siteError } = await admin
      .from('sites')
      .select('id, url')
      .eq('id', share.site_id)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { data: comments, error: commentsError } = await admin
      .from('comments')
      .select('id, position_x, position_y, selector, content, status, author_name, comment_number, viewport, created_at')
      .eq('site_id', site.id)
      .order('created_at', { ascending: true });

    if (commentsError) {
      return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 });
    }

    return NextResponse.json({
      siteId: site.id,
      url: site.url,
      comments: comments ?? [],
    });
  } catch (err) {
    console.error('invite/validate error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
