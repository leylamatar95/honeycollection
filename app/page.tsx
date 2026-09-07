'use client';
import Link from 'next/link';
import { ArrowRight, Clock3, MapPin, MessageCircle } from 'lucide-react';
import { SiteHeader, SiteFooter } from '@/components/site-shell';
import './home-new.css';
import { useSiteContent } from '@/lib/use-site-content';
import { useEffect, useState } from 'react';
import { recordToProduct, type StoreProduct } from '@/lib/product-record';
export default function Home() {
  const content = useSiteContent();
  const [featured, setFeatured] = useState<StoreProduct[]>([]),
    [liveProducts, setLiveProducts] = useState<StoreProduct[]>([]),
    [homeCategories, setHomeCategories] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => {
        const list = (d.items || []).map(recordToProduct);
        setLiveProducts(list);
        setFeatured(list.filter((x: StoreProduct) => x.featured).slice(0, 4));
        setHomeCategories(d.categories || []);
      })
      .catch(() => {});
  }, []);
  return (
    <>
      <SiteHeader overlay />
      <main className="new-home">
        <section className="fashion-hero">
          <img
            src={content.hero.image}
            alt={`${content.branding.siteName} abiye koleksiyonu`}
          />
          <div />
          <article>
            <p>{content.hero.eyebrow}</p>
            <h1>
              {content.hero.titleBefore}
              <br />
              <em>{content.hero.titleAccent}</em> {content.hero.titleAfter}
            </h1>
            <span>{content.hero.description}</span>
            <nav>
              <Link href="/koleksiyonlar">
                Koleksiyonu Keşfet <ArrowRight />
              </Link>
              <Link href="/randevu">Randevu Al</Link>
            </nav>
          </article>
        </section>
        <section className="home-services">
          <header>
            <p>{content.home.servicesEyebrow}</p>
            <h2>{content.home.servicesTitle}</h2>
          </header>
          <div className={homeCategories.length === 0 ? 'is-loading' : ''}>
            {homeCategories.length === 0 && <p className="home-category-placeholder">Kategoriler hazırlanıyor…</p>}
            {homeCategories.map((category: any) => (
              <article key={category.id}>
                {category.image ? <img src={category.image} alt={category.name} /> : <div className="category-image-empty" aria-hidden="true" />}
                <div>
                  <h3>{category.name}</h3>
                  {category.description && <p>{category.description}</p>}
                  <Link href={`/koleksiyonlar?category=${encodeURIComponent(category.name)}`}>
                    Ürünleri keşfet <ArrowRight />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section
          className={`home-products ${featured.length === 0 ? 'is-loading' : ''}`}
        >
          <header>
            <div>
              <p>{content.home.featuredEyebrow}</p>
              <h2>{content.home.featuredTitle}</h2>
            </div>
            <Link href="/koleksiyonlar">
              Tümünü gör <ArrowRight />
            </Link>
          </header>
          <div>
            {featured.length === 0 && (
              <p className="home-empty-placeholder">
                Öne çıkan ürünler hazırlanıyor…
              </p>
            )}
            {featured.map((p) => (
              <article key={p.id}>
                <Link href={`/urun/${p.slug}`}>
                  <img src={p.image} />
                </Link>
                <p>{p.category}</p>
                <h3>{p.name}</h3>
                <span>{p.type}</span>
                <small>
                  {p.priceVisible
                    ? p.price
                    : 'Fiyat ve uygunluk için iletişime geçin'}
                </small>
              </article>
            ))}
          </div>
        </section>
        <section className="atelier-home">
          <div>
            <p>HONEY ATÖLYE</p>
            <h2>
              Hayalden
              <br />
              <em>size özel bir silüete.</em>
            </h2>
            <Link href="/ozel-dikim">
              Özel dikimi keşfet <ArrowRight />
            </Link>
          </div>
          <ol>
            {['Tasarım görüşmesi', 'Ölçü alımı', 'Prova', 'Teslim'].map(
              (x, i) => (
                <li key={x}>
                  <b>0{i + 1}</b>
                  <span>{x}</span>
                </li>
              ),
            )}
          </ol>
        </section>
        <section className="appointment-home">
          <p>{content.home.appointmentEyebrow}</p>
          <h2>{content.home.appointmentTitle}</h2>
          <span>{content.home.appointmentText}</span>
          <Link href="/randevu">
            Randevunu Oluştur <ArrowRight />
          </Link>
        </section>
        <section className="instagram-home">
          <header>
            <p>{content.social.instagramUser}</p>
            <h2>Bizi Instagram’da takip edin</h2>
            <a
              className="instagram-button"
              href={content.social.instagram}
              target="_blank"
              rel="noreferrer"
            >
              Instagram hesabına git <ArrowRight />
            </a>
          </header>
          <div>
            {liveProducts.slice(0, 5)
              .map((p) => (
                <Link key={p.id} href={`/urun/${p.slug}`}>
                  <img src={p.image} alt={p.name} />
                </Link>
              ))}
            {liveProducts.length === 0 && <p className="instagram-loading">Ürünler hazırlanıyor…</p>}
          </div>
        </section>
        <section className="quote-home">
          <p>MİSAFİRLERİMİZ ANLATIYOR</p>
          <blockquote>
            “Nişan elbisemi seçerken yalnızca bir elbise değil, kendimi en iyi
            hissettiğim görünümü buldum.”
          </blockquote>
          <span>★★★★★ · DİLARA K.</span>
        </section>
        <section className="store-home">
          <div>
            <p>MAĞAZAMIZ</p>
            <h2>
              Sizi ağırlamak
              <br />
              için buradayız.
            </h2>
            <p>
              <MapPin /> {content.contact.address}
            </p>
            <p>
              <Clock3 /> {content.contact.hours}
            </p>
            <a href={content.contact.mapsUrl}>
              Yol Tarifi Al <ArrowRight />
            </a>
          </div>
          <aside>
            <MessageCircle />
            <h3>WhatsApp’tan bize ulaşın.</h3>
            <p>Ürün, fiyat ve müsaitlik için danışmanımıza yazın.</p>
            <a href={`https://wa.me/${content.contact.whatsapp}`}>
              Mesaj Gönder
            </a>
          </aside>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
