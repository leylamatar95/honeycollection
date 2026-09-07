import fs from 'node:fs';

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.trim().startsWith('#') && line.includes('='))
    .map((line) => {
      const index = line.indexOf('=');
      return [
        line.slice(0, index).trim(),
        line.slice(index + 1).trim().replace(/^['"]|['"]$/g, ''),
      ];
    }),
);

const resendResponse = await fetch('https://api.resend.com/domains', {
  headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
});
const resend = await resendResponse.json().catch(() => ({}));
console.log(
  JSON.stringify({
    resendStatus: resendResponse.status,
    domains: Array.isArray(resend.data)
      ? resend.data.map(({ name, status }) => ({ name, status }))
      : [],
    resendError: resend.message || null,
  }),
);

const settingsResponse = await fetch(
  `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/site_content?section=eq.emailSettings&select=content`,
  {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  },
);
const settings = await settingsResponse.json().catch(() => []);
const content = settings?.[0]?.content || {};

if (process.argv.includes('--use-test-sender') && settings?.[0]) {
  const updateResponse = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/site_content?section=eq.emailSettings`,
    {
      method: 'PATCH',
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: { ...content, fromEmail: 'onboarding@resend.dev' },
        updated_at: new Date().toISOString(),
      }),
    },
  );
  console.log(
    JSON.stringify({
      testSenderUpdated: updateResponse.ok,
      updateStatus: updateResponse.status,
    }),
  );
}
console.log(
  JSON.stringify({
    settingsStatus: settingsResponse.status,
    fromEmail: content.fromEmail || '',
    notificationEmail: content.notificationEmail || '',
    replyTo: content.replyTo || '',
    hasAppointmentSubject: Boolean(content.appointmentSubject),
    hasAppointmentTemplate: Boolean(content.appointmentTemplate),
  }),
);

if (process.argv.includes('--send-test') && content.notificationEmail) {
  const testResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Honey Collection <onboarding@resend.dev>',
      to: [content.notificationEmail],
      subject: 'Honey Collection e-posta testi',
      text: 'Bu mesaj geldiyse Resend API anahtarınız çalışıyor.',
    }),
  });
  const test = await testResponse.json().catch(() => ({}));
  console.log(
    JSON.stringify({
      testStatus: testResponse.status,
      testAccepted: testResponse.ok,
      testError: test.message || null,
    }),
  );
}
