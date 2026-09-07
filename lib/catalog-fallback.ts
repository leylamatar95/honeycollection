import { categories, products } from '@/lib/catalog';

export const fallbackCategories = categories.map((category, index) => ({
  id: `fallback-${index + 1}`,
  name: category.name,
  slug: category.slug,
  image: index === 0 ? '/hero-honey-collection.webp' : '',
  description: `${category.name} koleksiyonunu keşfedin.`,
  show: true,
  sort: index,
}));

export const fallbackProducts = products.map((product, index) => ({
  id: product.id,
  slug: product.slug,
  name: product.name,
  code: product.code,
  category: product.category,
  status: 'published',
  rental_enabled: product.type.includes('Kiralık'),
  sale_enabled: product.type.includes('Satılık'),
  rental_price: Number(product.price.replace(/\D/g, '')),
  sale_price: Number(product.price.replace(/\D/g, '')),
  price_visible: product.priceVisible,
  sizes: product.sizes,
  new_arrival: product.new,
  featured: product.featured,
  image_url: product.image || '/hero-honey-collection.webp',
  product_media: [],
  product_categories: [],
  description: JSON.stringify({
    color: product.color,
    style: product.style,
    event: product.event,
    fabric: product.fabric,
    sleeve: product.sleeve,
    neck: product.neck,
  }),
  updated_at: new Date(2026, 0, index + 1).toISOString(),
}));
