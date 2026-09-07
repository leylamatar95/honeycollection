import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  let icon = '/favicon.svg';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { data } = await sb
      .from('site_content')
      .select('content')
      .eq('section', 'branding')
      .maybeSingle();
    const savedIcon = String(data?.content?.favicon || '').trim();
    if (savedIcon.startsWith('/') || /^https?:\/\//i.test(savedIcon)) icon = savedIcon;
  }

  return NextResponse.redirect(new URL(icon, request.url), {
    headers: { 'cache-control': 'no-store, max-age=0' },
  });
}
