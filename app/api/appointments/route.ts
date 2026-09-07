import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
const schema = z.object({
  service: z.string().min(2).max(80),
  date: z.string().date(),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  phone: z
    .string()
    .trim()
    .refine(
      (v) => v.replace(/\D/g, '').length >= 10,
      'Telefon numarası eksik.',
    ),
  email: z.string().trim().email(),
  consent: z.preprocess((v) => v === true || v === 'true', z.literal(true)),
});
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      {
        error:
          'Lütfen ad, soyad, telefon, e-posta, tarih ve onay alanlarını kontrol edin.',
      },
      { status: 400 },
    );
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    return NextResponse.json(
      {
        error:
          'Randevu sistemi henüz mağaza veritabanına bağlanmadı. Lütfen WhatsApp üzerinden iletişime geçin.',
      },
      { status: 503 },
    );
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const [{ data: appointmentSettings }, { data: store }, { data: service }] =
    await Promise.all([
      sb
        .from('site_content')
        .select('content')
        .eq('section', 'appointmentSettings')
        .maybeSingle(),
      sb
        .from('stores')
        .select('id,timezone')
        .eq('active', true)
        .limit(1)
        .maybeSingle(),
      sb
        .from('services')
        .select('id,duration_minutes')
        .eq('active', true)
        .eq('name', parsed.data.service)
        .maybeSingle(),
    ]);
  const allowedTimes = Array.isArray(appointmentSettings?.content?.times)
    ? appointmentSettings.content.times
    : ['10:00', '11:30', '13:00', '14:30', '16:00', '17:30'];
  if (!allowedTimes.includes(parsed.data.time))
    return NextResponse.json(
      { error: 'Seçtiğiniz randevu saati artık müsait değil.' },
      { status: 409 },
    );
  if (!store || !service)
    return NextResponse.json(
      { error: 'Seçtiğiniz hizmet şu anda kullanılamıyor.' },
      { status: 409 },
    );
  const { count: recentCount } = await sb
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('phone', parsed.data.phone)
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());
  if ((recentCount || 0) >= 5)
    return NextResponse.json(
      {
        error:
          'Kısa süre içinde çok sayıda randevu talebi gönderildi. Lütfen bizi arayın.',
      },
      { status: 429 },
    );
  const weekday = new Date(`${parsed.data.date}T12:00:00Z`).getUTCDay();
  const start = new Date(`${parsed.data.date}T${parsed.data.time}:00+03:00`),
    end = new Date(start.getTime() + service.duration_minutes * 60000);
  const [{ data: hours }, { data: blocked }] = await Promise.all([
    sb
      .from('working_hours')
      .select('opens_at,closes_at')
      .eq('store_id', store.id)
      .eq('weekday', weekday)
      .maybeSingle(),
    sb
      .from('blocked_times')
      .select('id')
      .eq('store_id', store.id)
      .lt('starts_at', end.toISOString())
      .gt('ends_at', start.toISOString())
      .limit(1),
  ]);
  const toMinutes = (value: string) => {
    const [h, m] = value.slice(0, 5).split(':').map(Number);
    return h * 60 + m;
  };
  if (
    !hours?.opens_at ||
    !hours?.closes_at ||
    toMinutes(parsed.data.time) < toMinutes(hours.opens_at) ||
    toMinutes(parsed.data.time) + service.duration_minutes >
      toMinutes(hours.closes_at)
  )
    return NextResponse.json(
      { error: 'Seçtiğiniz gün veya saat mağazamız kapalıdır.' },
      { status: 409 },
    );
  if (blocked?.length)
    return NextResponse.json(
      { error: 'Seçtiğiniz tarih ve saat randevuya kapalıdır.' },
      { status: 409 },
    );
  const { data, error } = await sb.rpc('create_public_appointment', {
    p_payload: parsed.data,
  });
  if (error) {
    const message = error.message.includes('capacity')
      ? 'Bu saat az önce doldu. Başka bir saat seçin.'
      : error.message.includes('booking_too_soon')
        ? 'Randevu saati en az 2 saat ileride olmalıdır.'
        : error.message.includes('service_unavailable')
          ? 'Seçtiğiniz hizmet şu anda kullanılamıyor.'
          : error.message.includes('store_unavailable')
            ? 'Mağaza şu anda randevu kabul etmiyor.'
            : 'Randevu şu anda oluşturulamadı.';
    return NextResponse.json({ error: message }, { status: 409 });
  }
  const code = data?.appointment_code ?? data;
  const { getEmailSettings, renderTemplate, sendEmail } =
    await import('@/lib/email');
  const settings = await getEmailSettings(sb);
  const values = {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    email: parsed.data.email,
    service: parsed.data.service,
    date: new Date(`${parsed.data.date}T12:00:00`).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    time: parsed.data.time,
    code: String(code),
    phone: String(
      (
        await sb
          .from('site_content')
          .select('content')
          .eq('section', 'contact')
          .maybeSingle()
      ).data?.content?.phone || '',
    ),
  };
  const email = await sendEmail(
    settings,
    parsed.data.email,
    renderTemplate(
      settings?.appointmentSubject || 'Randevunuz oluşturuldu',
      values,
    ),
    renderTemplate(
      settings?.appointmentTemplate || 'Randevunuz oluşturuldu.',
      values,
    ),
    `appointment-${code}`,
  );
  return NextResponse.json({ code, emailSent: email.sent });
}
