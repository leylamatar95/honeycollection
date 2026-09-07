'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Heart, Search } from 'lucide-react';
import { recordToProduct, type StoreProduct } from '@/lib/product-record';
export function CatalogClient({ initialType }: { initialType?: string }) {
  return (
    <Suspense fallback={<div className="catalog-layout" aria-busy="true" />}>
      <CatalogContent initialType={initialType} />
    </Suspense>
  );
}

function CatalogContent({ initialType }: { initialType?: string }) {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<StoreProduct[]>([]),
    [loading, setLoading] = useState(true),
    [query, setQuery] = useState(''),
    [category, setCategory] = useState('Tümü'),
    [type, setType] = useState(initialType || 'Tümü'),
    [sort, setSort] = useState('Yeni'),
    [favorites, setFavorites] = useState<(string | number)[]>([]);
  useEffect(() => {
    fetch('/api/products')
      .then((r) => {
        if (!r.ok) throw new Error('Ürünler alınamadı');
        return r.json();
      })
      .then((d) => {
        setProducts(Array.isArray(d.items) ? d.items.map(recordToProduct) : []);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    setCategory(searchParams.get('category') || 'Tümü');
  }, [searchParams]);
  const items = useMemo(() => {
    const a = products.filter(
      (p) =>
        (type === 'Tümü' || p.type.includes(type)) &&
        (category === 'Tümü' || p.category === category) &&
        p.name.toLowerCase().includes(query.toLowerCase()),
    );
    return [...a].sort((x, y) =>
      sort === 'Fiyat artan'
        ? x.priceValue - y.priceValue
        : sort === 'Fiyat azalan'
          ? y.priceValue - x.priceValue
          : sort === 'Popüler'
            ? Number(y.featured) - Number(x.featured)
            : Number(y.new) - Number(x.new),
    );
  }, [products, query, category, type, sort]);
  const clear = () => {
    setQuery('');
    setCategory('Tümü');
    setType(initialType || 'Tümü');
  };
  return (
    <div className="catalog-layout">
      <section className="catalog-results">
        <div className="catalog-toolbar">
          <div className="catalog-count"><strong>{items.length}</strong><span>ürün</span></div>
          <div className="compact-filters">
            <label className="compact-search" aria-label="Ürün ara"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ürün ara" /></label>
            <FilterSelect label="Kategori" value={category} set={setCategory} values={['Tümü', ...new Set(products.map((p) => p.category))]} />
            <FilterSelect label="Kiralık / Satılık" value={type} set={setType} values={['Tümü', 'Kiralık', 'Satılık']} />
            {(query || category !== 'Tümü' || type !== (initialType || 'Tümü')) && <button onClick={clear}>Temizle</button>}
          </div>
          <label className="catalog-sort"><span>Sırala</span><select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option>Yeni</option>
            <option>Popüler</option>
            <option>Fiyat artan</option>
            <option>Fiyat azalan</option>
          </select></label>
        </div>
        <div className="catalog-grid">
          {items.map((p) => (
            <article className="catalog-card" key={p.id}>
              <div>
                <Link href={`/urun/${p.slug}`}>
                  <img src={p.image} alt={p.name} />
                </Link>
                {p.new && <i>YENİ</i>}
                <button
                  onClick={() =>
                    setFavorites((f) =>
                      f.includes(p.id)
                        ? f.filter((x) => x !== p.id)
                        : [...f, p.id],
                    )
                  }
                  className={favorites.includes(p.id) ? 'fav' : ''}
                >
                  <Heart
                    fill={favorites.includes(p.id) ? 'currentColor' : 'none'}
                  />
                </button>
                <Link className="quick" href={`/urun/${p.slug}`}>
                  Hızlı İncele
                </Link>
              </div>
              <p>{p.category}</p>
              <h3>
                <Link href={`/urun/${p.slug}`}>{p.name}</Link>
              </h3>
              <span>{p.type}</span>
              <small>
                {p.priceVisible
                  ? p.price
                  : 'Fiyat ve uygunluk için iletişime geçin'}
              </small>
            </article>
          ))}
        </div>
        {loading && (
          <div className="no-results" role="status" aria-live="polite">
            Ürünler yükleniyor…
          </div>
        )}
        {!loading && !items.length && (
          <div className="no-results">
            Seçiminize uygun ürün bulunamadı.
            <button onClick={clear}>Filtreleri temizle</button>
          </div>
        )}
      </section>
    </div>
  );
}
function FilterSelect({
  label,
  value,
  set,
  values,
}: {
  label: string;
  value: string;
  set: (x: string) => void;
  values: string[];
}) {
  return (
    <label aria-label={label}>
      <span>{label}</span>
      <select value={value} onChange={(e) => set(e.target.value)}>
        {values.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </label>
  );
}
