# WooCommerce Google Sheet Price Exporter

Scheduled WooCommerce product price export to Google Sheets — emergency price checking backup for staff.

## Setup

### 1. WooCommerce API Keys

In WordPress Admin:

```
WooCommerce → Settings → Advanced → REST API → Add key
```

Create a key with **Read** permissions only.

### 2. Google Cloud Project

1. Create a project in [Google Cloud Console](https://console.cloud.google.com).
2. Enable the **Google Sheets API**.
3. Create a **Service Account**.
4. Generate a JSON key and save as `google-service-account.json`.

### 3. Google Sheet

1. Create a Google Sheet named `WooCommerce Emergency Price Backup`.
2. Create two tabs: `Prices` and `Status`.
3. Share the sheet with the service account email (Editor access).

### 4. Environment

```bash
cp .env.example .env
# Fill in your values
```

### 5. Install & Run

```bash
npm install
npm run export
```

## Cron

Run every 15 minutes:

```bash
*/15 * * * * cd /path/to/project && /usr/bin/npm run export >> /var/log/wc-price-export.log 2>&1
```

## GitHub Actions

See `.github/workflows/export-prices.yml`. Set repository secrets:

- `WC_BASE_URL`
- `WC_CONSUMER_KEY`
- `WC_CONSUMER_SECRET`
- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_JSON`

## Security

- WooCommerce API keys: **read-only** only.
- Never commit `.env` or `google-service-account.json`.
- Store secrets in GitHub Secrets if using Actions.

## Keep Repo Updates

- 2026/08/10
