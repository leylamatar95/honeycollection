export type StoreProduct = {
  id: string | number;
  slug: string;
  name: string;
  code: string;
  category: string;
  type: string;
  color: string;
  sizes: string[];
  style: string;
  event: string;
  fabric: string;
  sleeve: string;
  neck: string;
  fit: string;
  lining: string;
  description: string;
  care: string;
  rentalTerms: string;
  deliveryShippingEnabled: boolean;
  deliveryShippingFee: number;
  deliveryStoreEnabled: boolean;
  price: string;
  priceValue: number;
  priceVisible: boolean;
  new: boolean;
  featured: boolean;
  image: string;
  gallery: string[];
  colorVariants: { name: string; hex: string; images: string[] }[];
};
const money = (value: any) =>
  value == null
    ? ''
    : new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        maximumFractionDigits: 0,
      }).format(Number(value));
export function recordToProduct(x: any): StoreProduct {
  let details: any = {};
  try {
    details = JSON.parse(x.description || '{}');
  } catch {
    details = { description: x.description || '' };
  }
  const media = [...(x.product_media || [])].sort(
      (a: any, b: any) => a.sort_order - b.sort_order,
    ),
    category = x.product_categories?.[0]?.categories?.name;
  const variants = (details.color_variants || []).map((v: any) => ({
    ...v,
    images: media
      .filter((m: any) => {
        try {
          return JSON.parse(m.alt_text || '{}').color === v.name;
        } catch {
          return false;
        }
      })
      .map((m: any) => m.path),
  }));
  const rental = !!x.rental_enabled,
    sale = !!x.sale_enabled,
    price = sale && x.sale_price != null ? x.sale_price : x.rental_price;
  return {
    id: x.id,
    slug: x.slug,
    name: x.name,
    code: x.code,
    category: category || x.category || 'Abiye',
    type:
      [rental && 'Kiralık', sale && 'Satılık'].filter(Boolean).join(' · ') ||
      'Satılık',
    color: details.color || x.color || x.colors?.[0] || '',
    sizes: x.sizes || [],
    style: details.style || x.style || '',
    event: details.event || x.event || '',
    fabric: details.fabric || x.fabric || '',
    sleeve: details.sleeve || x.sleeve || '',
    neck: details.neck || x.neck || '',
    fit: details.fit || x.fit || 'Standart kalıp',
    lining: details.lining || x.lining || 'Tam astarlı',
    description: details.description || '',
    care: details.care_instructions || x.care_instructions || '',
    rentalTerms: details.rental_terms || x.rental_terms || '',
    deliveryShippingEnabled: details.delivery_shipping_enabled !== false,
    deliveryShippingFee: Number(details.delivery_shipping_fee ?? 300),
    deliveryStoreEnabled: details.delivery_store_enabled !== false,
    price: money(price),
    priceValue: Number(price || 0),
    priceVisible: !!x.price_visible,
    new: !!x.new_arrival,
    featured: !!x.featured,
    image: media[0]?.path || x.image_url || x.gallery?.[0] || '/logo.png',
    gallery: media.length
      ? media.map((m: any) => m.path)
      : x.gallery?.length
        ? x.gallery
        : [x.image_url || '/logo.png'],
    colorVariants: variants.length
      ? variants
      : [
          {
            name: details.color || x.colors?.[0] || 'Renk',
            hex: '#d8d0c5',
            images: media.map((m: any) => m.path),
          },
        ],
  };
}
