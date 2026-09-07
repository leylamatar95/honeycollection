'use client';
import { useEffect, useState } from 'react';
import { ChevronDown, Menu, Search, X } from 'lucide-react';
import Link from 'next/link';
import '../app/store.css';
import { useSiteContent } from '@/lib/use-site-content';
import { CookieBanner } from '@/components/cookie-banner';

type MenuCategory = { id: string; name: string; slug: string };
const mainLinks = [
  ['Tüm Ürünler', '/koleksiyonlar'],
  ['Özel Dikim', '/ozel-dikim'],
  ['Hakkımızda', '/hakkimizda'],
  ['SSS', '/sss'],
  ['İletişim', '/iletisim'],
];

function useMenuCategories() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  useEffect(() => {
    let active = true;
    const refresh = () =>
      fetch('/api/categories', { cache: 'no-store' })
        .then((response) => response.json())
        .then((data) => {
          if (active) setCategories(data.items || []);
        })
        .catch(() => {});
    refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return categories;
}

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const content = useSiteContent();
  const categories = useMenuCategories();
  const [scrolled, setScrolled] = useState(false),
    [menu, setMenu] = useState(false),
    [mobileCollections, setMobileCollections] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(scrollY > 40);
    addEventListener('scroll', update);
    return () => removeEventListener('scroll', update);
  }, []);
  const categoryLink = (name: string) =>
    `/koleksiyonlar?category=${encodeURIComponent(name)}`;
  return (
    <header className={`store-header ${overlay && !scrolled ? 'overlay' : ''}`}>
      <Link href="/" className="store-logo">
        <img src={content.branding.logo} alt={content.branding.siteName} />
      </Link>
      <nav>
        <Link href={mainLinks[0][1]}>{mainLinks[0][0]}</Link>
        <div className="collections-nav">
          <Link href="/koleksiyonlar">
            Koleksiyonlar <ChevronDown />
          </Link>
          <div className="mega-menu dynamic-category-menu">
            <section>
              <p>KOLEKSİYONLAR</p>
              <Link className="mega-title" href="/koleksiyonlar">
                Tüm Koleksiyonlar
              </Link>
              {categories.map((category) => (
                <Link key={category.id} href={categoryLink(category.name)}>
                  {category.name}
                </Link>
              ))}
              {!categories.length && <small>Kategoriler hazırlanıyor…</small>}
            </section>
            <section className="mega-shortcuts">
              <p>ALIŞVERİŞ</p>
              <Link className="mega-title" href="/koleksiyonlar">
                Tüm Ürünler
              </Link>
              <Link href="/kiralik-abiyeler">Kiralık Abiyeler</Link>
              <Link href="/satilik-abiyeler">Satılık Abiyeler</Link>
              <Link href="/yeni-gelenler">Yeni Gelenler</Link>
              <Link href="/ozel-dikim">Özel Dikim</Link>
            </section>
            <aside>
              <span>HONEY COLLECTION</span>
              <h3>Gecenize eşlik eden silüetleri keşfedin.</h3>
              <Link href="/koleksiyonlar">Tüm ürünleri keşfet</Link>
            </aside>
          </div>
        </div>
        {mainLinks.slice(1).map(([label, href]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="store-actions">
        <Link href="/koleksiyonlar" aria-label="Ara">
          <Search />
        </Link>
        <Link href="/randevu" className="book-link">
          Randevu Al
        </Link>
        <button
          className="store-menu"
          onClick={() => setMenu(true)}
          aria-label="Menüyü aç"
        >
          <Menu />
        </button>
      </div>
      {menu && (
        <div className="mobile-store-menu">
          <button onClick={() => setMenu(false)} aria-label="Menüyü kapat">
            <X />
          </button>
          <img src={content.branding.logo} alt={content.branding.siteName} />
          <nav>
            <Link href="/koleksiyonlar" onClick={() => setMenu(false)}>
              Tüm Ürünler
            </Link>
            <button onClick={() => setMobileCollections(!mobileCollections)}>
              Koleksiyonlar <ChevronDown />
            </button>
            {mobileCollections && (
              <div className="mobile-submenu">
                <Link href="/koleksiyonlar" onClick={() => setMenu(false)}>
                  Tüm Koleksiyonlar
                </Link>
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={categoryLink(category.name)}
                    onClick={() => setMenu(false)}
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            )}
            {mainLinks.slice(1).map(([label, href]) => (
              <Link key={href} href={href} onClick={() => setMenu(false)}>
                {label}
              </Link>
            ))}
          </nav>
          <Link href="/randevu" onClick={() => setMenu(false)}>
            Randevu Al
          </Link>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  const content = useSiteContent();
  return (
    <>
      <footer className="store-footer">
        <div className="footer-intro">
          <img src={content.branding.logo} alt={content.branding.siteName} />
          <p>{content.footer.description}</p>
        </div>
        <div>
          <h3>Koleksiyonlar</h3>
          <Link href="/kiralik-abiyeler">Kiralık Abiyeler</Link>
          <Link href="/satilik-abiyeler">Satılık Abiyeler</Link>
          <Link href="/yeni-gelenler">Yeni Gelenler</Link>
          <Link href="/ozel-dikim">Özel Dikim</Link>
        </div>
        <div>
          <h3>Honey Collection</h3>
          <Link href="/hakkimizda">Hakkımızda</Link>
          <Link href="/sss">SSS</Link>
          <Link href="/iletisim">İletişim</Link>
          <Link href="/randevu">Randevu Al</Link>
          <Link href="/kiralama-sozlesmesi">Kiralama Sözleşmesi</Link>
        </div>
        <div>
          <h3>İletişim</h3>
          <a href={`tel:${content.contact.phoneHref}`}>
            {content.contact.phone}
          </a>
          <a href={`https://wa.me/${content.contact.whatsapp}`}>WhatsApp</a>
          <a href={content.social.instagram} target="_blank" rel="noreferrer">
            Instagram
          </a>
        </div>
        <div className="footer-legal">
          <span>{content.footer.copyright}</span>
          <span>
            <Link href="/kvkk">KVKK</Link>
            <Link href="/gizlilik">Gizlilik</Link>
            <Link href="/cerez-politikasi">Çerezler</Link>
            <Link href="/kullanim-kosullari">Kullanım Koşulları</Link>
          </span>
        </div>
      </footer>
      <CookieBanner />
    </>
  );
}
export function PageHero({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <section className="page-hero">
      <div className="page-hero-heading">
        <p>
          <i aria-hidden="true" />
          {eyebrow}
        </p>
        <h1>{title}</h1>
      </div>
      <div className="page-hero-note">
        <span>{text}</span>
        <b aria-hidden="true">HC</b>
      </div>
    </section>
  );
}
