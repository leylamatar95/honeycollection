import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type EmailSettings = {
  fromName: string;
  fromEmail: string;
  replyTo: string;
  notificationEmail: string;
  appointmentSubject: string;
  appointmentTemplate: string;
  reminderSubject: string;
  reminderTemplate: string;
  contactReceiptSubject: string;
  contactReceiptTemplate: string;
  rentalSubject?: string;
  rentalTemplate?: string;
};

export async function getEmailSettings(
  sb?: SupabaseClient,
): Promise<EmailSettings | null> {
  const client =
    sb ||
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
  const { data } = await client
    .from('site_content')
    .select('content')
    .eq('section', 'emailSettings')
    .maybeSingle();
  return (data?.content as EmailSettings) || null;
}

export function renderTemplate(
  template: string,
  values: Record<string, string>,
) {
  return String(template || '').replace(
    /{{(\w+)}}/g,
    (_, key) => values[key] ?? '',
  );
}

export async function sendEmail(
  settings: EmailSettings | null,
  to: string,
  subject: string,
  text: string,
  idempotencyKey?: string,
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !settings?.fromEmail || !to)
    return { sent: false, reason: 'not_configured' };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'HoneyCollection/1.0',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: `${settings.fromName || 'Honey Collection'} <${settings.fromEmail}>`,
      to: [to],
      subject,
      text,
      ...(settings.replyTo ? { reply_to: settings.replyTo } : {}),
    }),
  });
  if (!response.ok)
    return {
      sent: false,
      reason: 'provider_error',
      error: await response.text(),
    };
  return { sent: true };
}
