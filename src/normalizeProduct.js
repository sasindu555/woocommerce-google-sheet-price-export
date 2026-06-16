function getCurrentPrice(product) {
  if (product.sale_price && parseFloat(product.sale_price) > 0) {
    return product.sale_price;
  }
  if (product.price && parseFloat(product.price) > 0) {
    return product.price;
  }
  return product.regular_price || '';
}

function formatCategories(product) {
  if (!product.categories || product.categories.length === 0) return '';
  return product.categories.map((c) => c.name).join(', ');
}

function buildVariationName(product, variation) {
  if (!variation.attributes || variation.attributes.length === 0) return product.name;
  const attrStr = variation.attributes
    .map((a) => `${a.name}: ${a.option}`)
    .join(', ');
  return `${product.name} - ${attrStr}`;
}

function formatAttributes(variation) {
  if (!variation.attributes || variation.attributes.length === 0) return '';
  return variation.attributes.map((a) => `${a.name}: ${a.option}`).join(', ');
}

function normalizeRow(product, parent = null) {
  const now = new Date();
  const exportedAt = now.toISOString();

  return {
    product_id: product.id,
    parent_id: parent ? parent.id : 0,
    sku: product.sku || '',
    name: parent
      ? buildVariationName(parent, product)
      : (product.name || ''),
    type: parent ? 'variation' : (product.type || ''),
    status: product.status || '',
    regular_price: product.regular_price || '',
    sale_price: product.sale_price || '',
    current_price: getCurrentPrice(product),
    stock_status: product.stock_status || '',
    manage_stock: product.manage_stock ? 'true' : 'false',
    stock_quantity: product.manage_stock && product.stock_quantity != null
      ? String(product.stock_quantity)
      : '',
    categories: parent ? formatCategories(parent) : formatCategories(product),
    attributes: product.type === 'variation' || parent
      ? formatAttributes(product)
      : '',
    permalink: product.permalink || '',
    date_modified_gmt: product.date_modified_gmt || '',
    exported_at: exportedAt,
  };
}

export function normalizeProducts(products, variationsByParent) {
  const rows = [];
  const variationParentMap = new Map();
  products.forEach((p) => variationParentMap.set(p.id, p));

  for (const product of products) {
    if (product.type === 'variable') {
      const variations = variationsByParent.get(product.id) || [];
      if (variations.length > 0) {
        for (const variation of variations) {
          rows.push(normalizeRow(variation, product));
        }
      } else if (product.sku || product.regular_price || product.sale_price || product.price) {
        rows.push(normalizeRow(product));
      }
    } else {
      rows.push(normalizeRow(product));
    }
  }

  return rows;
}

export function detectDuplicateSkus(rows) {
  const seen = new Map();
  for (const row of rows) {
    if (!row.sku) continue;
    if (seen.has(row.sku)) {
      seen.get(row.sku).push(row);
      row.duplicate_sku = 'YES';
    } else {
      seen.set(row.sku, [row]);
    }
  }

  for (const [, duplicates] of seen) {
    if (duplicates.length > 1) {
      for (const dup of duplicates) {
        dup.duplicate_sku = 'YES';
      }
    }
  }

  return seen;
}
