import { google } from 'googleapis';
import { readFile } from 'fs/promises';
import { config } from './config.js';

const HEADERS = [
  'product_id',
  'parent_id',
  'sku',
  'name',
  'type',
  'status',
  'regular_price',
  'sale_price',
  'current_price',
  'stock_status',
  'manage_stock',
  'stock_quantity',
  'categories',
  'attributes',
  'permalink',
  'date_modified_gmt',
  'exported_at',
  'duplicate_sku',
];

let sheetsClient = null;

async function getClient() {
  if (sheetsClient) return sheetsClient;

  const keyFile = JSON.parse(
    await readFile(config.google.serviceAccountFile, 'utf-8')
  );

  const auth = new google.auth.GoogleAuth({
    credentials: keyFile,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

export async function clearPricesTab() {
  const sheets = await getClient();
  await sheets.spreadsheets.values.clear({
    spreadsheetId: config.google.sheetId,
    range: 'Prices!A:R',
  });
  console.log('Cleared Prices tab');
}

export async function writePrices(rows) {
  const sheets = await getClient();

  const values = [HEADERS];
  for (const row of rows) {
    values.push([
      row.product_id,
      row.parent_id,
      row.sku,
      row.name,
      row.type,
      row.status,
      row.regular_price,
      row.sale_price,
      row.current_price,
      row.stock_status,
      row.manage_stock,
      row.stock_quantity,
      row.categories,
      row.attributes,
      row.permalink,
      row.date_modified_gmt,
      row.exported_at,
      row.duplicate_sku || '',
    ]);
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.google.sheetId,
    range: 'Prices!A1',
    valueInputOption: 'RAW',
    requestBody: { values },
  });

  console.log(`Wrote ${rows.length} product rows to Prices tab`);
}

export async function writeStatus({
  lastExportedAt,
  productCount,
  variationCount,
  totalRows,
  sourceStore,
  exportDurationMs,
  success,
  errorMessage,
  duplicateSkuCount,
}) {
  const sheets = await getClient();

  const now = new Date();
  const localTime = now.toLocaleString('en-US', {
    timeZone: config.export.timezone,
  });

  const headers = [
    'last_exported_at',
    'product_count',
    'variation_count',
    'total_rows',
    'source_store',
    'export_duration_ms',
    'success',
    'error_message',
    'duplicate_sku_count',
    'last_local_time',
    'export_timezone',
  ];

  const values = [[
    lastExportedAt,
    productCount,
    variationCount,
    totalRows,
    sourceStore,
    exportDurationMs,
    success ? 'true' : 'false',
    errorMessage || '',
    duplicateSkuCount || 0,
    localTime,
    config.export.timezone,
  ]];

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.google.sheetId,
    range: 'Status!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [headers, ...values] },
  });

  console.log('Wrote status to Status tab');
}

export async function formatSheet() {
  const sheets = await getClient();

  const requests = [
    {
      updateSheetProperties: {
        properties: {
          sheetId: 0,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        fields: 'gridProperties.frozenRowCount',
      },
    },
    {
      repeatCell: {
        range: {
          sheetId: 0,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: true },
          },
        },
        fields: 'userEnteredFormat.textFormat',
      },
    },
    {
      setBasicFilter: {
        filter: {
          range: {
            sheetId: 0,
            startRowIndex: 0,
            endRowIndex: 1,
          },
        },
      },
    },
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: config.google.sheetId,
    requestBody: { requests },
  });

  console.log('Applied sheet formatting (frozen header, bold, filter)');
}
