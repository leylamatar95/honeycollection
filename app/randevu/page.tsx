'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Phone, X } from 'lucide-react';
import { SiteHeader, SiteFooter, PageHero } from '@/components/site-shell';
import { useSiteContent } from '@/lib/use-site-content';

export default function Page() {
  const content = useSiteContent();
  const [error, setError] = useState('');
  const [appointmentCode, setAppointmentCode] = useState('');
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [service, setService] = useState('');
  const [date, setDate] = useState('');
  const [times, setTimes] = useState<string[]>([]);
  const [availabilityMessage, setAvailabilityMessage] = useState(
    'Tarih seçtiğinizde uygun saatler gösterilir.',
  );

  useEffect(() => {
    fetch('/api/booking-options')
      .then((response) => response.json())
      .then((data) => {
        setServices(data.services || []);
        setService((current) => current || data.services?.[0]?.name || '');
      })
      .catch(() => setAvailabilityMessage('Randevu seçenekleri alınamadı.'));
  }, []);

  useEffect(() => {
    if (!date || !service) return;
    setAvailabilityMessage('Uygun saatler kontrol ediliyor…');
    fetch(
      `/api/booking-options?date=${encodeURIComponent(date)}&service=${encodeURIComponent(service)}`,
    )
      .then((response) => response.json())
      .then((data) => {
        setTimes(data.times || []);
        setAvailabilityMessage(data.message || 'Uygun bir saat seçin.');
      })
      .catch(() => {
        setTimes([]);
        setAvailabilityMessage('Uygun saatler alınamadı.');
      });
  }, [date, service]);

  useEffect(() => {
    if (!appointmentCode) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAppointmentCode('');
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [appointmentCode]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setError('');
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      ...Object.fromEntries(formData),
      consent: formData.get('consent') === 'true',
    };

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Randevu şu anda oluşturulamadı.');
        return;
      }
      setAppointmentCode(String(data.code));
      setEmailSent(data.emailSent === true);
      form.reset();
    } catch {
      setError('Bağlantı kurulamadı. Lütfen tekrar deneyin.');
    } finally {
      setSending(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <SiteHeader />
      <PageHero
        eyebrow="SİZE AYRILAN ZAMAN"
        title="Randevunuzu Oluşturun"
        text="Mağaza ziyaretlerimiz kişisel bir deneyim için randevuyla gerçekleşir."
      />
      <form className="booking-page" onSubmit={submit}>
        <div>
          <label>
            Hizmet
            <select
              name="service"
              required
              value={service}
              onChange={(event) => setService(event.target.value)}
            >
              <option value="">Hizmet seçin</option>
              {services.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tarih
            <input
              name="date"
              type="date"
              min={today}
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label>
            Saat
            <select name="time" required disabled={!times.length}>
              <option value="">Saat seçin</option>
              {times.map((time) => (
                <option key={time}>{time}</option>
              ))}
            </select>
          </label>
          <p
            className={`booking-availability${date && !times.length ? ' closed' : ''}`}
          >
            {availabilityMessage}
          </p>
        </div>
        <div>
          <label>
            Ad
            <input name="firstName" minLength={2} required />
          </label>
          <label>
            Soyad
            <input name="lastName" minLength={2} required />
          </label>
          <label>
            Telefon
            <input
              name="phone"
              type="tel"
              placeholder="05xx xxx xx xx"
              required
            />
          </label>
          <label>
            E-posta
            <input name="email" type="email" required />
          </label>
          <label className="booking-check">
            <input name="consent" type="checkbox" value="true" required />
            <span>
              <Link href="/kvkk" target="_blank">
                KVKK Aydınlatma Metni
              </Link>
              ’ni okudum ve kişisel verilerimin belirtilen amaçlarla işlenmesini
              kabul ediyorum.
            </span>
          </label>
          <button disabled={sending || !times.length}>
            {sending ? 'Randevu oluşturuluyor…' : 'Randevuyu Onayla'}
          </button>
          {error && (
            <p className="booking-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </form>

      {appointmentCode && (
        <div
          className="booking-success-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setAppointmentCode('');
          }}
        >
          <section
            className="booking-success-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-success-title"
          >
            <button
              className="booking-modal-close"
              type="button"
              onClick={() => setAppointmentCode('')}
              aria-label="Pencereyi kapat"
            >
              <X />
            </button>
            <span className="booking-success-icon">
              <Check />
            </span>
            <p className="booking-success-kicker">RANDEVUNUZ ALINDI</p>
            <h2 id="booking-success-title">Randevunuz başarıyla oluşturuldu</h2>
            <p>
              {emailSent
                ? 'Randevu teyit e-postası adresinize gönderildi.'
                : 'Randevunuz kaydedildi fakat teyit e-postası gönderilemedi. Teyit veya değişiklik için bizi arayabilirsiniz.'}
            </p>
            <a
              className="booking-phone"
              href={`tel:${content.contact.phoneHref}`}
            >
              <Phone /> {content.contact.phone}
            </a>
            <button
              className="booking-modal-done"
              type="button"
              onClick={() => setAppointmentCode('')}
            >
              Tamam
            </button>
          </section>
        </div>
      )}
      <SiteFooter />
    </>
  );
}
