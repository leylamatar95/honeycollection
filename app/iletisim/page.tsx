'use client';
import { useState } from 'react';
import { SiteHeader, SiteFooter, PageHero } from '@/components/site-shell';
import { useSiteContent } from '@/lib/use-site-content';

export default function Page() {
  const content = useSiteContent();
  const [busy, setBusy] = useState(false),
    [result, setResult] = useState(''),
    [error, setError] = useState('');
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setResult('');
    setError('');
    const form = event.currentTarget;
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const data = await response.json();
      if (!response.ok) return setError(data.error || 'Mesaj gönderilemedi.');
      form.reset();
      setResult('Mesajınızı aldık. En kısa sürede size dönüş yapacağız.');
    } catch {
      setError('Bağlantı kurulamadı. Lütfen tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <SiteHeader />
      <PageHero
        eyebrow="BİZE ULAŞIN"
        title="İletişim"
        text="Ürün, fiyat, müsaitlik ve randevu için danışmanlarımız yanınızda."
      />
      <section className="contact-page">
        <div>
          <h2>{content.legal.officialName}</h2>
          <p>{content.contact.address}</p>
          <p>{content.contact.hours}</p>
          <a href={`tel:${content.contact.phoneHref}`}>
            {content.contact.phone}
          </a>
          <a href={`https://wa.me/${content.contact.whatsapp}`}>
            WhatsApp’tan yazın
          </a>
          <a href={`mailto:${content.contact.email}`}>
            {content.contact.email}
          </a>
        </div>
        <form onSubmit={submit}>
          <label>
            Adınız
            <input name="name" required minLength={2} />
          </label>
          <label>
            E-posta
            <input name="email" required type="email" />
          </label>
          <label>
            Telefon
            <input name="phone" type="tel" />
          </label>
          <label className="contact-honeypot" aria-hidden="true">
            Web sitesi
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          <label>
            Mesajınız
            <textarea
              name="message"
              required
              minLength={10}
              maxLength={3000}
              rows={5}
            />
          </label>
          <button disabled={busy}>
            {busy ? 'Gönderiliyor…' : 'Mesaj Gönder'}
          </button>
          {result && (
            <p className="contact-success" role="status">
              {result}
            </p>
          )}
          {error && (
            <p className="contact-error" role="alert">
              {error}
            </p>
          )}
        </form>
      </section>
      <SiteFooter />
    </>
  );
}
