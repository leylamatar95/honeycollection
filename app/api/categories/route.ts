import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ items: [] });
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const [{ data, error }, { data: links, error: linksError }] = await Promise.all([
    sb.from('categories').select('id,name,slug').eq('visible', true).order('sort_order').order('name'),
    sb
      .from('product_categories')
      .select('category_id,products!inner(status,deleted_at)')
      .eq('products.status', 'published')
      .is('products.deleted_at', null),
  ]);
  const populatedCategoryIds = new Set(
    (links || []).map((item: any) => item.category_id),
  );
  const items = (data || []).filter((category) =>
    populatedCategoryIds.has(category.id),
  );
  const requestError = error || linksError;
  return NextResponse.json(
    { items, error: requestError?.message },
    {
      status: requestError ? 500 : 200,
      headers: { 'cache-control': 'no-store, max-age=0' },
    },
  );
}
