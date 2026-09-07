import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { getEmailSettings, renderTemplate, sendEmail } from '@/lib/email';

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(30).optional(),
  message: z.string().trim().min(10).max(3000),
  website: z.string().max(0).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      {
        error:
          'Lütfen adınızı, geçerli e-posta adresinizi ve mesajınızı kontrol edin.',
      },
      { status: 400 },
    );
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    return NextResponse.json(
      { error: 'Mesaj sistemi şu anda kullanılamıyor.' },
      { status: 503 },
    );
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await sb
    .from('contact_messages')
    .select('id', { count: 'exact', head: true })
    .eq('email', parsed.data.email)
    .gte('created_at', since);
  if ((count || 0) >= 3)
    return NextResponse.json(
      {
        error:
          'Kısa süre içinde çok sayıda mesaj gönderdiniz. Lütfen daha sonra tekrar deneyin.',
      },
      { status: 429 },
    );
  const { data, error } = await sb
    .from('contact_messages')
    .insert({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      message: parsed.data.message,
    })
    .select('id')
    .single();
  if (error || !data)
    return NextResponse.json(
      { error: 'Mesajınız kaydedilemedi. Lütfen tekrar deneyin.' },
      { status: 500 },
    );
  await sb
    .from('notifications')
    .insert({
      kind: 'contact',
      title: 'Yeni iletişim mesajı',
      body: parsed.data.name,
    });
  const settings = await getEmailSettings(sb);
  const values = { name: parsed.data.name };
  await Promise.allSettled([
    sendEmail(
      settings,
      parsed.data.email,
      renderTemplate(
        settings?.contactReceiptSubject || 'Mesajınızı aldık',
        values,
      ),
      renderTemplate(
        settings?.contactReceiptTemplate ||
          'Mesajınızı aldık. En kısa sürede dönüş yapacağız.',
        values,
      ),
      `contact-receipt-${data.id}`,
    ),
    sendEmail(
      settings,
      settings?.notificationEmail || '',
      `Yeni iletişim mesajı · ${parsed.data.name}`,
      `Gönderen: ${parsed.data.name}\nE-posta: ${parsed.data.email}\nTelefon: ${parsed.data.phone || '-'}\n\n${parsed.data.message}`,
      `contact-notify-${data.id}`,
    ),
  ]);
  return NextResponse.json({ ok: true });
}
