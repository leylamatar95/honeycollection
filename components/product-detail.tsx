'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Maximize2, Truck, Store, X } from 'lucide-react';
import { SiteHeader, SiteFooter } from '@/components/site-shell';
import { recordToProduct } from '@/lib/product-record';
import { Calendar } from '@/components/ui/calendar';
import { tr } from 'date-fns/locale';
import { format, isWithinInterval, parseISO, startOfDay } from 'date-fns';

export function ProductDetail({ slug }: { slug: string }) {
  let cleanSlug = slug;
  try {
    cleanSlug = decodeURIComponent(slug);
  } catch {}
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [zoomOpen, setZoomOpen] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [deliveryMethod, setDeliveryMethod] = useState<'shipping' | 'store'>('shipping');
  const [contractAccepted, setContractAccepted] = useState(false);
  const [occupiedRanges, setOccupiedRanges] = useState<{ start: string; end: string }[]>([]);
  useEffect(() => {
    let active = true;
    fetch(`/api/products?slug=${encodeURIComponent(cleanSlug)}`)
      .then((r) => r.json())
      .then((detailData) => {
        if (!active) return;
        if (detailData.items?.[0]) {
          const p = recordToProduct(detailData.items[0]);
          setProduct(p);
          setActiveImage(p.gallery[0] || '');
          setSelectedColor(p.colorVariants[0]?.name || '');
          setDeliveryMethod(p.deliveryShippingEnabled ? 'shipping' : 'store');
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });

    fetch('/api/products')
      .then((r) => r.json())
      .then((catalogData) => {
        if (active) setRelatedProducts((catalogData.items || []).map(recordToProduct).filter((item: any) => item.image));
      })
      .catch(() => {});
    return () => { active = false; };
  }, [cleanSlug]);
  useEffect(() => {
    if (!product || !selectedColor) return;
    setSelectedDate(undefined);
    fetch(`/api/availability?product=${encodeURIComponent(product.name)}&productId=${encodeURIComponent(String(product.id))}&color=${encodeURIComponent(selectedColor)}`)
      .then((r) => r.json())
      .then((availability) => setOccupiedRanges(availability.occupied || []))
      .catch(() => setOccupiedRanges([]));
  }, [product, selectedColor]);
  if (loading)
    return (
      <>
        <SiteHeader />
        <main className="product-loading" role="status" aria-live="polite">Yükleniyor…</main>
        <SiteFooter />
      </>
    );
  if (!product)
    return (
      <>
        <SiteHeader />
        <main className="product-missing">
          <h1>Ürün bulunamadı</h1>
          <Link href="/koleksiyonlar">Koleksiyonlara dön</Link>
        </main>
        <SiteFooter />
      </>
    );

  const isOccupied = (date: Date) =>
    occupiedRanges.some((range) =>
      isWithinInterval(startOfDay(date), {
        start: startOfDay(parseISO(range.start)),
        end: startOfDay(parseISO(range.end)),
      }),
    );
  const rentalHref = selectedDate
    ? `/kiralama-sozlesmesi?urun=${encodeURIComponent(product.name)}&renk=${encodeURIComponent(selectedColor)}&tarih=${format(selectedDate, 'yyyy-MM-dd')}&teslimat=${deliveryMethod}`
    : '#';
  const selectedVariant = product.colorVariants.find((variant: any) => variant.name === selectedColor);
  const activeGallery = selectedVariant?.images?.length ? selectedVariant.images : product.gallery;
  const selectColor = (variant: any) => {
    setSelectedColor(variant.name);
    setActiveImage(variant.images?.[0] || product.gallery[0] || '');
  };

  return (
    <>
      <SiteHeader />
      <main className="product-detail">
        <section className="product-visual-column">
          <div className="product-gallery">
            <div className="thumbs">
              {activeGallery.map((image: string) => (
                <button key={image} onClick={() => setActiveImage(image)}>
                  <img src={image} alt="" />
                </button>
              ))}
            </div>
            <button className="main-product-image" onClick={() => setZoomOpen(true)}>
              <img src={activeImage} alt={product.name} />
              <Maximize2 />
            </button>
          </div>
          <div className="product-description">
            <p>AÇIKLAMA</p>
            <h2>Ürün hakkında</h2>
            <div>{product.description || 'Bu ürün için açıklama yakında eklenecek.'}</div>
          </div>
        </section>
        <section className="product-copy">
          <p>
            {product.category} · {product.code}
          </p>
          <h1>{product.name}</h1>
          {product.colorVariants.length > 0 && (
            <div className="choice color-choice">
              <b>Renk <span>{selectedColor}</span></b>
              <div className="color-palette" role="group" aria-label="Renk seçimi">
                {product.colorVariants.map((variant: any) => (
                  <button
                    type="button"
                    key={variant.name}
                    className={selectedColor === variant.name ? 'selected' : ''}
                    style={{ '--swatch': variant.hex || '#d8d0c5' } as React.CSSProperties}
                    onClick={() => selectColor(variant)}
                    aria-label={`${variant.name} rengini seç`}
                    aria-pressed={selectedColor === variant.name}
                    title={variant.name}
                  />
                ))}
              </div>
            </div>
          )}
          {product.type.includes('Kiralık') && (
            <fieldset className="delivery-methods">
              <legend>Teslimat Yöntemi</legend>
              {product.deliveryShippingEnabled && <label className={deliveryMethod === 'shipping' ? 'selected' : ''}>
                <input type="radio" name="delivery" value="shipping" checked={deliveryMethod === 'shipping'} onChange={() => setDeliveryMethod('shipping')} />
                <Truck /><span><b>Kargo ile Teslimat</b><small>+{product.deliveryShippingFee} TL</small></span>
              </label>}
              {product.deliveryStoreEnabled && <label className={deliveryMethod === 'store' ? 'selected' : ''}>
                <input type="radio" name="delivery" value="store" checked={deliveryMethod === 'store'} onChange={() => setDeliveryMethod('store')} />
                <Store /><span><b>Mağazadan Teslim / İade</b><small>Ücretsiz</small></span>
              </label>}
            </fieldset>
          )}
          <span>{product.type}</span>
          {product.priceVisible && <strong>{product.price}</strong>}
          {product.type.includes('Kiralık') && <div className="availability-card">
            <div className="availability-heading"><p>MÜSAİTLİK TAKVİMİ · {selectedColor.toLocaleUpperCase('tr-TR')}</p><h2>Tarihinizi seçin</h2><span>Takvim seçtiğiniz renge göre gösterilir. Dolu günler seçilemez.</span></div>
            <Calendar
              mode="single"
              locale={tr}
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < startOfDay(new Date()) || isOccupied(date)}
              modifiers={{ occupied: isOccupied }}
              modifiersClassNames={{ occupied: 'calendar-occupied' }}
              className="rental-calendar"
            />
            <div className="calendar-legend"><span><i /> Müsait</span><span><i /> Dolu</span></div>
            <label className="rental-contract-check">
              <input type="checkbox" checked={contractAccepted} onChange={(event) => setContractAccepted(event.target.checked)} />
              <span><Link href="/kiralama-sozlesmesi">Kiralama Sözleşmesi’ni</Link> okudum ve koşullarını kabul ediyorum.</span>
            </label>
            <Link
              className={`calendar-rent-button${selectedDate && contractAccepted ? '' : ' disabled'}`}
              href={rentalHref}
              aria-disabled={!selectedDate || !contractAccepted}
              onClick={(event) => { if (!selectedDate || !contractAccepted) event.preventDefault(); }}
            >
              {selectedDate ? `${format(selectedDate, 'd MMMM yyyy', { locale: tr })} · Tarihi Seç ve Kirala` : 'Tarihi Seç ve Kirala'}
            </Link>
            <p className="rental-followup-note">Sözleşme formunu tamamladıktan sonra ekibimiz uygunluğu teyit etmek için sizinle iletişime geçecektir.</p>
          </div>}
        </section>
      </main>
      {zoomOpen && (
        <div className="gallery-modal">
          <button onClick={() => setZoomOpen(false)}>
            <X />
          </button>
          <img src={activeImage} alt={product.name} />
        </div>
      )}
      <section className="similar-products">
        <h2>Benzer tasarımlar</h2>
        <div>
          {relatedProducts
            .filter((item) => item.id !== product.id)
            .slice(0, 3)
            .map((item) => (
              <Link key={item.id} href={`/urun/${item.slug}`}>
                <img src={item.image} alt={item.name} />
                <b>{item.name}</b>
              </Link>
            ))}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
