import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fallbackCategories, fallbackProducts } from '@/lib/catalog-fallback';
type ShowcaseItem = {
  id: string;
  show?: boolean;
  image?: string;
  description?: string;
  sort?: number;
};
export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    return NextResponse.json({
      items: fallbackProducts,
      categories: fallbackCategories,
      source: 'fallback',
    });
  const sb = createClient(url, key, { auth: { persistSession: false } }),
    slug = new URL(request.url).searchParams.get('slug');
  let q = sb
    .from('products')
    .select('*,product_media(*),product_categories(categories(id,name,slug))')
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });
  if (slug) q = q.eq('slug', slug);
  const { data, error } = await q;
  if (error) {
    return NextResponse.json({
      items: slug
        ? fallbackProducts.filter((product) => product.slug === slug)
        : fallbackProducts,
      categories: fallbackCategories,
      source: 'fallback',
    });
  }
  if (slug) {
    return NextResponse.json(
      { items: data || [] },
      { headers: { 'cache-control': 'no-store' } },
    );
  }
  const [{ data: categories }, { data: showcase }] = await Promise.all([
    sb
      .from('categories')
      .select('id,name,slug')
      .eq('visible', true)
      .order('sort_order'),
    sb
      .from('site_content')
      .select('content')
      .eq('section', 'category_showcase')
      .maybeSingle(),
  ]);
  const config = (showcase?.content?.items || []) as ShowcaseItem[];
  const hasShowcaseConfig = config.length > 0;
  const publicCategories = (categories || [])
    .map((c) => {
      const saved: Partial<ShowcaseItem> =
        config.find((item) => item.id === c.id) ?? {};
      return {
        ...c,
        ...saved,
        show: hasShowcaseConfig && saved.show !== undefined ? !!saved.show : true,
        image: saved.image || '',
        description: saved.description || `${c.name} koleksiyonunu keşfedin.`,
        sort: saved.sort ?? 0,
      };
    })
    .filter((category) => category.show)
    .sort((a, b) => (a.sort || 0) - (b.sort || 0));
  return NextResponse.json(
    { items: data || [], categories: publicCategories },
    {
      headers: {
        'cache-control': 'no-store',
      },
    },
  );
}
