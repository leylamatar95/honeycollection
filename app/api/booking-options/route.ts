import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const fallbackTimes = ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30'];
const minutes = (time: string) => {
  const [h, m] = time.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
};

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    return NextResponse.json({ services: [], times: [], open: false });
  const sb = createClient(url, key, { auth: { persistSession: false } }),
    params = new URL(request.url).searchParams;
  const date = params.get('date'),
    serviceName = params.get('service');
  const [{ data: services }, { data: store }, { data: settings }] =
    await Promise.all([
      sb
        .from('services')
        .select('id,name,duration_minutes,capacity')
        .eq('active', true)
        .order('name'),
      sb
        .from('stores')
        .select('id,timezone')
        .eq('active', true)
        .limit(1)
        .maybeSingle(),
      sb
        .from('site_content')
        .select('content')
        .eq('section', 'appointmentSettings')
        .maybeSingle(),
    ]);
  const configuredTimes = Array.isArray(settings?.content?.times)
    ? settings.content.times
    : fallbackTimes;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !store)
    return NextResponse.json({
      services: services || [],
      times: configuredTimes,
      open: !!store,
    });
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const { data: hours } = await sb
    .from('working_hours')
    .select('opens_at,closes_at')
    .eq('store_id', store.id)
    .eq('weekday', weekday)
    .maybeSingle();
  if (!hours?.opens_at || !hours?.closes_at)
    return NextResponse.json({
      services: services || [],
      times: [],
      open: false,
      message: 'Seçtiğiniz gün mağazamız kapalıdır.',
    });
  const service =
    (services || []).find((item) => item.name === serviceName) ||
    (services || [])[0];
  const dayStart = new Date(`${date}T00:00:00+03:00`),
    dayEnd = new Date(`${date}T23:59:59+03:00`);
  const [{ data: blocked }, { data: appointments }] = await Promise.all([
    sb
      .from('blocked_times')
      .select('starts_at,ends_at')
      .eq('store_id', store.id)
      .lt('starts_at', dayEnd.toISOString())
      .gt('ends_at', dayStart.toISOString()),
    service
      ? sb
          .from('appointments')
          .select('starts_at')
          .eq('store_id', store.id)
          .eq('service_id', service.id)
          .gte('starts_at', dayStart.toISOString())
          .lte('starts_at', dayEnd.toISOString())
          .is('archived_at', null)
          .not('status', 'in', '(cancelled,no_show)')
      : Promise.resolve({ data: [] }),
  ]);
  const counts = new Map<string, number>();
  for (const item of appointments || []) {
    const time = new Date(item.starts_at).toLocaleTimeString('tr-TR', {
      timeZone: store.timezone || 'Europe/Istanbul',
      hour: '2-digit',
      minute: '2-digit',
    });
    counts.set(time, (counts.get(time) || 0) + 1);
  }
  const times = configuredTimes.filter((time: string) => {
    const start = new Date(`${date}T${time}:00+03:00`),
      end = new Date(
        start.getTime() + Number(service?.duration_minutes || 60) * 60000,
      );
    const withinHours =
      minutes(time) >= minutes(hours.opens_at) &&
      minutes(time) + Number(service?.duration_minutes || 60) <=
        minutes(hours.closes_at);
    const isBlocked = (blocked || []).some(
      (item) =>
        start < new Date(item.ends_at) && end > new Date(item.starts_at),
    );
    return (
      withinHours &&
      !isBlocked &&
      (counts.get(time) || 0) < Number(service?.capacity || 1) &&
      start > new Date(Date.now() + 2 * 60 * 60 * 1000)
    );
  });
  return NextResponse.json(
    {
      services: services || [],
      times,
      open: true,
      message: times.length
        ? ''
        : 'Bu gün için uygun randevu saati kalmamıştır.',
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
