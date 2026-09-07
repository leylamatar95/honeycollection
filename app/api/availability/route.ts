import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const product = requestUrl.searchParams.get('product')?.trim();
  const productId = requestUrl.searchParams.get('productId')?.trim();
  const color = requestUrl.searchParams.get('color')?.trim();
  if (!product) return NextResponse.json({ occupied: [] });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ occupied: [] });
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const today = new Date().toISOString().slice(0, 10);
  const [{ data, error }, { data: operations }, { data: stockProduct }] = await Promise.all([
    sb
      .from('rental_contracts')
      .select('product_name,rental_start,rental_end')
      .in('product_name', color ? [product, `${product} · ${color}`] : [product])
      .in('status', ['signed', 'confirmed', 'active'])
      .gte('rental_end', today),
    sb
      .from('site_content')
      .select('content')
      .eq('section', 'rental_sales_operations')
      .maybeSingle(),
    productId
      ? sb.from('products').select('stock_quantity').eq('id', productId).maybeSingle()
      : sb.from('products').select('stock_quantity').eq('name', product).maybeSingle(),
  ]);
  if (error) return NextResponse.json({ occupied: [], error: 'Müsaitlik bilgisi alınamadı.' }, { status: 500 });
  const adminRentals = Array.isArray(operations?.content?.rentals)
    ? operations.content.rentals.filter(
        (item: any) =>
          item.status !== 'cancelled' &&
          item.end_date >= today &&
          (item.product_id === productId || item.product_name === product) &&
          (!color || !item.color || item.color === color),
      )
    : [];
  const stock = Math.max(0, Number(stockProduct?.stock_quantity || 0));
  const counts = new Map<string, number>();
  const ranges = [
    ...(data || []).map((item) => ({ start: item.rental_start, end: item.rental_end })),
    ...adminRentals.map((item: any) => ({ start: item.start_date, end: item.end_date })),
  ];
  for (const range of ranges) {
    const cursor = new Date(`${range.start}T12:00:00Z`);
    const end = new Date(`${range.end}T12:00:00Z`);
    for (let guard = 0; cursor <= end && guard < 730; guard += 1) {
      const day = cursor.toISOString().slice(0, 10);
      counts.set(day, (counts.get(day) || 0) + 1);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  const occupied = [...counts.entries()]
    .filter(([, count]) => stock === 0 || count >= stock)
    .map(([day]) => ({ start: day, end: day }));
  return NextResponse.json({ occupied, stock }, { headers: { 'cache-control': 'no-store' } });
}
