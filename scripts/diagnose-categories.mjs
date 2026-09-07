import fs from 'node:fs';

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.trim().startsWith('#') && line.includes('='))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    }),
);
const headers = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
};
const base = env.NEXT_PUBLIC_SUPABASE_URL;
const [categoriesResponse, productsResponse, linksResponse] = await Promise.all([
  fetch(`${base}/rest/v1/categories?select=id,name,slug,visible&order=sort_order.asc`, { headers }),
  fetch(`${base}/rest/v1/products?select=id,name,status,deleted_at&deleted_at=is.null`, { headers }),
  fetch(`${base}/rest/v1/product_categories?select=product_id,category_id,categories(name),products(name,status,deleted_at)`, { headers }),
]);
const categories = await categoriesResponse.json();
const products = await productsResponse.json();
const links = await linksResponse.json();
console.log(JSON.stringify({ categories, products, links }, null, 2));
