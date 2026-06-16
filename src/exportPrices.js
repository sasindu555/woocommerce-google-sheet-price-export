import { config } from './config.js';
import { fetchProducts, fetchVariations } from './woocommerce.js';
import { normalizeProducts, detectDuplicateSkus } from './normalizeProduct.js';
import {
  clearPricesTab,
  writePrices,
  writeStatus,
  formatSheet,
} from './googleSheets.js';

async function main() {
  const startTime = Date.now();
  console.log('=== WooCommerce Price Export Started ===');
  console.log(`Source: ${config.wc.baseUrl}`);

  let productCount = 0;
  let variationCount = 0;
  let totalRows = 0;
  let duplicateSkuCount = 0;
  let success = false;
  let errorMessage = '';
  let lastExportedAt = '';

  try {
    const products = await fetchProducts();
    productCount = products.length;

    const variationsByParent = new Map();
    const variableProducts = products.filter((p) => p.type === 'variable');

    if (variableProducts.length > 0) {
      console.log(`Fetching variations for ${variableProducts.length} variable products...`);
      for (const product of variableProducts) {
        const variations = await fetchVariations(product.id);
        if (variations.length > 0) {
          variationsByParent.set(product.id, variations);
          variationCount += variations.length;
        }
        console.log(`  Product ${product.id}: ${variations.length} variations`);
      }
    }

    const rows = normalizeProducts(products, variationsByParent);

    const duplicateSkus = detectDuplicateSkus(rows);
    for (const [, duplicates] of duplicateSkus) {
      if (duplicates.length > 1) duplicateSkuCount++;
    }
    if (duplicateSkuCount > 0) {
      console.warn(`WARNING: ${duplicateSkuCount} duplicate SKUs detected`);
    }

    totalRows = rows.length;

    await clearPricesTab();
    await writePrices(rows);
    await formatSheet();

    lastExportedAt = new Date().toISOString();
    success = true;

    console.log(`Export complete: ${productCount} products, ${variationCount} variations, ${totalRows} total rows`);
  } catch (err) {
    errorMessage = err.message;
    console.error('Export failed:', err.message);
  }

  const duration = Date.now() - startTime;

  await writeStatus({
    lastExportedAt: lastExportedAt || new Date().toISOString(),
    productCount,
    variationCount,
    totalRows,
    sourceStore: config.wc.baseUrl,
    exportDurationMs: duration,
    success,
    errorMessage,
    duplicateSkuCount,
  });

  console.log(`Duration: ${duration}ms`);
  console.log(`=== WooCommerce Price Export ${success ? 'Succeeded' : 'Failed'} ===`);

  if (!success) process.exit(1);
}

main();
