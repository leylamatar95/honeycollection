import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { defaultSiteContent } from '@/lib/site-content';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const { emailSettings: privateEmailSettings, ...publicDefaults } =
    defaultSiteContent;
  void privateEmailSettings;
  if (!url || !key) return NextResponse.json(publicDefaults);
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data } = await sb.from('site_content').select('section,content');
  const result: Record<string, any> = { ...publicDefaults };
  for (const row of data || [])
    if (row.section in result)
      result[row.section] = {
        ...(result as any)[row.section],
        ...(row.content || {}),
      };
  return NextResponse.json(result, {
    headers: { 'cache-control': 'no-store, max-age=0' },
  });
}
