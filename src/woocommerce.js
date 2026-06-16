import { config } from './config.js';

const FETCH_TIMEOUT = 30_000;

function authHeader() {
  const credentials = `${config.wc.consumerKey}:${config.wc.consumerSecret}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPage(endpoint, page, perPage) {
  const url = `${config.wc.baseUrl}/wp-json/wc/v3/${endpoint}?page=${page}&per_page=${perPage}`;

  const response = await fetchWithTimeout(url, {
    headers: { Authorization: authHeader() },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`WooCommerce API error (${response.status}): ${text}`);
  }

  return response.json();
}

export async function fetchAllVariations(productIds) {
  const { perPage } = config.export;
  const results = new Map();

  async function fetchOne(productId) {
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

    return { productId, variations: allVariations };
  }

  const CONCURRENCY = 10;
  for (let i = 0; i < productIds.length; i += CONCURRENCY) {
    const batch = productIds.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(batch.map(fetchOne));

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        const { productId, variations } = result.value;
        if (variations.length > 0) {
          results.set(productId, variations);
        }
        console.log(`  Product ${result.value.productId}: ${variations.length} variations`);
      } else {
        console.error(`  Failed to fetch variations for a product: ${result.reason?.message || result.reason}`);
      }
    }
  }

  return results;
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

