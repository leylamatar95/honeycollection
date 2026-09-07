import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEmailSettings, renderTemplate, sendEmail } from '@/lib/email';

async function runReminders(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`)
    return NextResponse.json({ error: 'Yetkisiz işlem.' }, { status: 401 });
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const start = new Date(Date.now() + 20 * 60 * 60 * 1000),
    end = new Date(Date.now() + 28 * 60 * 60 * 1000);
  const [{ data: appointments }, settings, { data: contact }] =
    await Promise.all([
      sb
        .from('appointments')
        .select(
          'id,appointment_code,starts_at,customers(first_name,last_name,email),services(name)',
        )
        .is('reminder_sent_at', null)
        .in('status', ['new', 'confirmed', 'contacted'])
        .gte('starts_at', start.toISOString())
        .lte('starts_at', end.toISOString()),
      getEmailSettings(sb),
      sb
        .from('site_content')
        .select('content')
        .eq('section', 'contact')
        .maybeSingle(),
    ]);
  let sent = 0;
  for (const item of appointments || []) {
    const customer: any = item.customers,
      service: any = item.services,
      date = new Date(item.starts_at);
    const values = {
      firstName: customer?.first_name || '',
      lastName: customer?.last_name || '',
      service: service?.name || '',
      date: date.toLocaleDateString('tr-TR', {
        timeZone: 'Europe/Istanbul',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      time: date.toLocaleTimeString('tr-TR', {
        timeZone: 'Europe/Istanbul',
        hour: '2-digit',
        minute: '2-digit',
      }),
      code: item.appointment_code,
      phone: contact?.content?.phone || '',
    };
    const result = await sendEmail(
      settings,
      customer?.email || '',
      renderTemplate(
        settings?.reminderSubject || 'Randevu hatırlatması',
        values,
      ),
      renderTemplate(
        settings?.reminderTemplate || 'Randevunuzu hatırlatmak isteriz.',
        values,
      ),
      `appointment-reminder-${item.id}`,
    );
    if (result.sent) {
      await sb
        .from('appointments')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', item.id);
      sent++;
    }
  }
  return NextResponse.json({ checked: (appointments || []).length, sent });
}

// Vercel Cron invokes routes with GET. POST remains available for cPanel,
// DirectAdmin and third-party cron services.
export const GET = runReminders;
export const POST = runReminders;
