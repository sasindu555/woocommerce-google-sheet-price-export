import { config } from './config.js';

function authHeader() {
  const credentials = `${config.wc.consumerKey}:${config.wc.consumerSecret}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

async function fetchPage(endpoint, page, perPage) {
  const url = `${config.wc.baseUrl}/wp-json/wc/v3/${endpoint}?page=${page}&per_page=${perPage}`;

  const response = await fetch(url, {
    headers: { Authorization: authHeader() },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`WooCommerce API error (${response.status}): ${text}`);
  }

  return response.json();
}

export async function fetchProducts() {
  const { perPage, includeDrafts } = config.export;
  const allProducts = [];
  let page = 1;

  console.log(`Fetching products from ${config.wc.baseUrl} (per_page=${perPage})`);

  while (true) {
    const products = await fetchPage('products', page, perPage);
    if (products.length === 0) break;

    const filtered = includeDrafts
      ? products
      : products.filter((p) => p.status !== 'draft' && p.status !== 'private');

    allProducts.push(...filtered);
    console.log(`  Page ${page}: fetched ${products.length} products (${filtered.length} after filtering)`);

    if (products.length < perPage) break;
    page++;
  }

  console.log(`Total products fetched: ${allProducts.length}`);
  return allProducts;
}

export async function fetchVariations(productId) {
  const { perPage } = config.export;
  const allVariations = [];
  let page = 1;

  while (true) {
    const variations = await fetchPage(`products/${productId}/variations`, page, perPage);
    if (variations.length === 0) break;

    const filtered = variations.filter((v) => v.status !== 'draft' && v.status !== 'private');
    allVariations.push(...filtered);

    if (variations.length < perPage) break;
    page++;
  }

  return allVariations;
}
