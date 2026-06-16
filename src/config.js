import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: resolve(__dirname, '..', '.env') });

function required(key) {
  const value = process.env[key];
  if (!value) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

export const config = {
  wc: {
    baseUrl: required('WC_BASE_URL').replace(/\/+$/, ''),
    consumerKey: required('WC_CONSUMER_KEY'),
    consumerSecret: required('WC_CONSUMER_SECRET'),
  },
  google: {
    sheetId: required('GOOGLE_SHEET_ID'),
    serviceAccountFile: resolve(
      __dirname,
      '..',
      process.env.GOOGLE_SERVICE_ACCOUNT_FILE || './google-service-account.json'
    ),
  },
  export: {
    perPage: parseInt(process.env.EXPORT_PER_PAGE || '100', 10),
    includeDrafts: process.env.EXPORT_INCLUDE_DRAFTS === 'true',
    timezone: process.env.EXPORT_TIMEZONE || 'Asia/Colombo',
  },
};
