import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export async function POST(request: NextRequest) {
  try {
    const resend = getResend();
    if (!resend) {
      console.error('RESEND_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 503 }
      );
    }

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { siteId, guestEmail, siteUrl } = body;

    if (!siteId || !guestEmail || !siteUrl) {
      return NextResponse.json(
        { error: 'Missing siteId, guestEmail or siteUrl' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(guestEmail).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const { data: site } = await supabase
      .from('sites')
      .select('id, created_by')
      .eq('id', siteId)
      .single();

    if (!site || site.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: share } = await supabase
      .from('site_shares')
      .select('id')
      .eq('site_id', siteId)
      .eq('guest_email', normalizedEmail)
      .maybeSingle();

    if (!share) {
      return NextResponse.json(
        { error: 'Invite not found. Add the guest first.' },
        { status: 404 }
      );
    }

    const inviterName =
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'A team member';

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const fromName = process.env.RESEND_FROM_NAME || 'CRT Markup';

    const { data: resendData, error: resendError } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [normalizedEmail],
      subject: `${inviterName} invited you to a project on CRT Markup`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #111;">You've been invited</h2>
          <p style="color: #444; line-height: 1.6;">
            <strong>${inviterName}</strong> has invited you to collaborate on a project in CRT Markup.
          </p>
          <p style="color: #444; line-height: 1.6;">
            Sign in or create an account to view the project and leave feedback.
          </p>
          <p style="margin: 24px 0;">
            <a
              href="${appUrl}"
              style="display: inline-block; padding: 12px 24px; background-color: #FE4004; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;"
            >
              Open CRT Markup
            </a>
          </p>
          <p style="color: #888; font-size: 12px;">
            If you didn't expect this invite, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (resendError) {
      console.error('Resend error:', resendError);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: resendData?.id });
  } catch (err) {
    console.error('send-invite error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
