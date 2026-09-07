'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { SiteHeader, SiteFooter, PageHero } from '@/components/site-shell';
import { useSiteContent } from '@/lib/use-site-content';

export default function Page() {
  const content = useSiteContent();
  const gallery = content.customerGallery;
  const [active, setActive] = useState<number | null>(null);
  const show = (index: number) => setActive((index + gallery.items.length) % gallery.items.length);

  return <>
    <SiteHeader />
    <PageHero eyebrow="HİKÂYEMİZ" title="Her kadının gecesi kendine özel." text="Honey Collection; kiralık, satılık ve kişiye özel abiye deneyimini zarif servis anlayışıyla buluşturur." />
    <section className="story-page">
      <div><p>İSTANBUL · 2026</p><h2>Abiyeyi yalnızca bir elbise değil, hatırlanacak bir anın parçası olarak görüyoruz.</h2></div>
      <div><p>Kına, nişan, düğün, mezuniyet ve davetler için açık, kapalı, büyük beden, uzun ve midi seçeneklerden oluşan dengeli bir koleksiyon sunuyoruz.</p><p>Randevulu mağaza deneyimimizde stil danışmanımız sizi dinler; bedeninize, tarzınıza ve etkinliğinize en uygun tasarımı birlikte seçer.</p></div>
    </section>
    {gallery.items.length > 0 && <section className="customer-gallery" aria-labelledby="customer-gallery-title">
      <header>
        <p>{gallery.eyebrow}</p>
        <h2 id="customer-gallery-title">{gallery.title.split('\n').map((line, i) => <span key={i}>{line}</span>)}</h2>
        <small>{gallery.description}</small>
      </header>
      <div className="customer-gallery-grid">
        {gallery.items.map((item, index) => <button type="button" key={`${item.url}-${index}`} onClick={() => setActive(index)} aria-label={`${item.alt || 'Müşteri fotoğrafı'} görselini büyüt`}>
          <img src={item.url} alt={item.alt || 'Honey Collection müşterisi'} loading="lazy" />
          <span><Expand /></span>
        </button>)}
      </div>
    </section>}
    {active !== null && <div className="customer-lightbox" role="dialog" aria-modal="true" aria-label="Müşteri fotoğrafı">
      <button className="lightbox-close" onClick={() => setActive(null)} aria-label="Kapat"><X /></button>
      {gallery.items.length > 1 && <button className="lightbox-prev" onClick={() => show(active - 1)} aria-label="Önceki fotoğraf"><ChevronLeft /></button>}
      <img src={gallery.items[active].url} alt={gallery.items[active].alt || 'Honey Collection müşterisi'} />
      {gallery.items.length > 1 && <button className="lightbox-next" onClick={() => show(active + 1)} aria-label="Sonraki fotoğraf"><ChevronRight /></button>}
    </div>}
    <SiteFooter />
  </>;
}
