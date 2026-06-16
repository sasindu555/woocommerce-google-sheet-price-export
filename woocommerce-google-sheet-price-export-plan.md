# WooCommerce Scheduled Price Export to Google Sheets

## Goal

Create a separate, reliable way to check WooCommerce product prices even when the main WooCommerce site is down.

The solution exports product pricing data from WooCommerce to a Google Sheet on a schedule, such as every 15 minutes, 30 minutes, or 1 hour.

The Google Sheet becomes an emergency price-checking backup for staff.

---

## Recommended Architecture

```text
WooCommerce Store
   ↓ scheduled export
Node.js Export Script
   ↓ WooCommerce REST API
Product + Variation Prices
   ↓ Google Sheets API
Google Sheet Price Backup
   ↓
Staff can search prices even if WooCommerce is down
```

---

## Why Google Sheets Is a Good First Option

Google Sheets is a practical first version because:

- Staff can easily search by SKU or product name.
- No custom frontend is required at the beginning.
- It is separate from the WooCommerce site.
- It is easy to share with selected users.
- It supports filtering, sorting, and manual review.
- It is faster to implement than a custom database or app.

This is not the most scalable long-term system, but it is a very good emergency backup method.

---

## What Data Should Be Exported

Each row in the Google Sheet should represent one sellable item.

For simple products, export the product itself.

For variable products, export each variation as a separate row.

Recommended columns:

| Column | Description |
|---|---|
| Product ID | WooCommerce product ID |
| Parent ID | Parent product ID for variations |
| SKU | Product or variation SKU |
| Name | Product name |
| Type | simple, variable, variation, grouped, etc. |
| Status | publish, draft, private, etc. |
| Regular Price | Normal price |
| Sale Price | Sale price, if available |
| Current Price | Effective WooCommerce price |
| Stock Status | instock, outofstock, onbackorder |
| Manage Stock | true or false |
| Stock Quantity | Quantity if stock is managed |
| Categories | Product categories |
| Attributes | Variation attributes such as size/color |
| Product URL | WooCommerce product permalink |
| Last Modified GMT | WooCommerce modified date |
| Exported At | Time this row was exported |

---

## Google Sheet Structure

Create one spreadsheet with at least two tabs.

### Tab 1: `Prices`

This tab contains the latest exported product prices.

Suggested headers:

```text
product_id
parent_id
sku
name
type
status
regular_price
sale_price
current_price
stock_status
manage_stock
stock_quantity
categories
attributes
permalink
date_modified_gmt
exported_at
```

### Tab 2: `Status`

This tab shows whether the export is healthy.

Suggested fields:

```text
last_exported_at
product_count
variation_count
total_rows
source_store
export_duration_ms
success
error_message
```

---

## Implementation Options

There are two good implementation choices.

## Option A: Node.js Script + Cron

This is the recommended option.

```text
Node.js script
   ↓
Runs every 15 minutes from a VPS, server cron, or GitHub Actions
   ↓
Fetches WooCommerce products
   ↓
Updates Google Sheet
```

Use this if you want better reliability and control.

## Option B: Google Apps Script

Google Apps Script can fetch WooCommerce data directly and update the sheet.

```text
Google Apps Script trigger
   ↓
Fetch WooCommerce REST API
   ↓
Update same Google Sheet
```

This is simpler to host, but less flexible for larger stores and more advanced error handling.

For a serious WooCommerce store, use **Option A: Node.js + Cron**.

---

# Recommended Plan: Node.js + Google Sheets API

## Step 1: Create WooCommerce API Keys

In WordPress Admin:

```text
WooCommerce → Settings → Advanced → REST API → Add key
```

Create a key with **Read** permissions only.

Save:

```text
Consumer Key
Consumer Secret
```

Do not use write permissions for this exporter.

---

## Step 2: Create a Google Cloud Project

In Google Cloud Console:

1. Create a new project.
2. Enable the **Google Sheets API**.
3. Create a **Service Account**.
4. Generate a JSON key for the service account.
5. Save the file as:

```text
google-service-account.json
```

---

## Step 3: Create the Google Sheet

Create a Google Sheet named something like:

```text
WooCommerce Emergency Price Backup
```

Create two tabs:

```text
Prices
Status
```

Then share the Google Sheet with the service account email.

The service account email will look like this:

```text
woocommerce-price-exporter@your-project.iam.gserviceaccount.com
```

Give it **Editor** access.

---

## Step 4: Create the Project Structure

Recommended repo structure:

```text
woocommerce-google-sheet-price-exporter/
  package.json
  .env.example
  README.md
  google-service-account.example.json
  src/
    config.js
    woocommerce.js
    googleSheets.js
    normalizeProduct.js
    exportPrices.js
  logs/
```

---

## Step 5: Environment Variables

Create a `.env` file:

```env
WC_BASE_URL=https://yourstore.com
WC_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxxx
WC_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxxx

GOOGLE_SHEET_ID=your_google_sheet_id_here
GOOGLE_SERVICE_ACCOUNT_FILE=./google-service-account.json

EXPORT_PER_PAGE=100
EXPORT_INCLUDE_DRAFTS=false
EXPORT_TIMEZONE=Asia/Colombo
```

The Google Sheet ID is found in the sheet URL:

```text
https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit
```

---

# Codex Prompt 1: Create the Main Exporter

Paste this into Codex:

```text
Create a Node.js 20+ project called woocommerce-google-sheet-price-exporter.

Goal:
Build a scheduled exporter that fetches WooCommerce product prices and writes them to a Google Sheet.

Requirements:
- Use Node.js 20+.
- Use native fetch for WooCommerce API requests.
- Use dotenv for environment variables.
- Use the official googleapis npm package for Google Sheets API access.
- Use a Google service account JSON file for authentication.
- Read config from .env.
- Fetch products from:
  {WC_BASE_URL}/wp-json/wc/v3/products
- Authenticate to WooCommerce using HTTP Basic Auth with WC_CONSUMER_KEY and WC_CONSUMER_SECRET.
- Support pagination using page and per_page query parameters.
- Default per_page should be 100.
- Continue fetching until an empty page is returned or the returned products count is less than per_page.
- Export products into a Google Sheet tab named Prices.
- Write a status summary into a Google Sheet tab named Status.
- Clear the Prices tab before writing fresh rows.
- Add a header row before product rows.
- Never log WC_CONSUMER_SECRET.
- Include clear console logs.
- Include useful error handling.

Export these product fields:
- product_id
- parent_id
- sku
- name
- type
- status
- regular_price
- sale_price
- current_price
- stock_status
- manage_stock
- stock_quantity
- categories
- attributes
- permalink
- date_modified_gmt
- exported_at

Project files:
- package.json
- .env.example
- README.md
- src/config.js
- src/woocommerce.js
- src/googleSheets.js
- src/normalizeProduct.js
- src/exportPrices.js

Add npm scripts:
- "export": "node src/exportPrices.js"
- "dev": "node src/exportPrices.js"
```

---

# Codex Prompt 2: Add Variation Support

After the first version works, paste this into Codex:

```text
Update the WooCommerce Google Sheet exporter to support variable product variations.

Requirements:
- When a product type is "variable", fetch its variations from:
  /wp-json/wc/v3/products/{productId}/variations
- Support pagination for variations.
- Export each variation as a separate row in the Prices sheet.
- Include parent_id for variation rows.
- Include variation attributes in the attributes column.
- Build variation names using the parent product name plus selected attributes.
  Example: "T-Shirt - Size: M, Color: Blue"
- Keep simple products as normal product rows.
- Do not export parent variable products as sellable rows unless they have a valid price or SKU.
- Count variations separately in the Status tab.
```

---

# Codex Prompt 3: Add Status and Stale Export Warning

Paste this into Codex:

```text
Enhance the exporter status reporting.

Requirements:
- Write the following fields to the Status sheet:
  - last_exported_at
  - product_count
  - variation_count
  - total_rows
  - source_store
  - export_duration_ms
  - success
  - error_message
- If the export fails, write failure details to the Status sheet if Google Sheets access is still available.
- Add a stale data formula or note that marks the export as stale if last_exported_at is older than 2 hours.
- Use Asia/Colombo timezone when displaying local export time.
```

---

# Codex Prompt 4: Add Duplicate SKU Detection

Paste this into Codex:

```text
Add duplicate SKU detection to the exporter.

Requirements:
- After collecting all product and variation rows, check for duplicate non-empty SKUs.
- Add a new column called duplicate_sku.
- Set duplicate_sku to "YES" if the SKU appears more than once.
- Otherwise leave it blank.
- Add duplicate_sku_count to the Status sheet.
- Log a warning when duplicate SKUs are detected.
```

---

# Codex Prompt 5: Improve Google Sheet Usability

Paste this into Codex:

```text
Improve the Google Sheet formatting.

Requirements:
- Freeze the first row in the Prices tab.
- Apply bold formatting to the header row.
- Resize columns automatically where possible.
- Add a filter to the Prices tab.
- Format price columns as numbers if possible.
- Keep the implementation simple and reliable.
```

---

## Cron Setup

Run the exporter every 15 minutes.

Example Linux cron:

```bash
*/15 * * * * cd /path/to/woocommerce-google-sheet-price-exporter && /usr/bin/npm run export >> /var/log/wc-price-export.log 2>&1
```

Recommended sync intervals:

| Store Type | Recommended Interval |
|---|---:|
| Small catalog, prices rarely change | Every 1 hour |
| Medium catalog | Every 15-30 minutes |
| Prices change often | Every 5-15 minutes |
| Very large catalog | Use incremental sync later |

Start with every **15 minutes**.

---

## GitHub Actions Alternative

You can also run the exporter using GitHub Actions.

Create:

```text
.github/workflows/export-prices.yml
```

Example workflow:

```yaml
name: Export WooCommerce Prices to Google Sheets

on:
  schedule:
    - cron: "*/15 * * * *"
  workflow_dispatch:

jobs:
  export:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm ci

      - name: Create Google service account file
        run: echo '${{ secrets.GOOGLE_SERVICE_ACCOUNT_JSON }}' > google-service-account.json

      - name: Export prices
        run: npm run export
        env:
          WC_BASE_URL: ${{ secrets.WC_BASE_URL }}
          WC_CONSUMER_KEY: ${{ secrets.WC_CONSUMER_KEY }}
          WC_CONSUMER_SECRET: ${{ secrets.WC_CONSUMER_SECRET }}
          GOOGLE_SHEET_ID: ${{ secrets.GOOGLE_SHEET_ID }}
          GOOGLE_SERVICE_ACCOUNT_FILE: ./google-service-account.json
          EXPORT_PER_PAGE: 100
          EXPORT_INCLUDE_DRAFTS: false
          EXPORT_TIMEZONE: Asia/Colombo
```

Use GitHub repository secrets for sensitive values.

Required secrets:

```text
WC_BASE_URL
WC_CONSUMER_KEY
WC_CONSUMER_SECRET
GOOGLE_SHEET_ID
GOOGLE_SERVICE_ACCOUNT_JSON
```

---

## Suggested Sheet Formulas

In the `Status` tab, you can add a stale check.

Example idea:

```text
If last_exported_at is older than 2 hours, show STALE.
Otherwise show OK.
```

Depending on how the exporter writes dates, Codex can add this automatically.

---

## Basic Testing Checklist

Before scheduling the exporter, test manually.

### Test 1: API Access

Confirm WooCommerce API credentials work.

Expected result:

```text
Products are fetched successfully.
```

### Test 2: Google Sheet Access

Confirm the service account can edit the Google Sheet.

Expected result:

```text
Prices and Status tabs are updated.
```

### Test 3: Product Count

Compare product count in WooCommerce and Google Sheets.

Expected result:

```text
Simple products and variations are exported correctly.
```

### Test 4: Search by SKU

Use Google Sheets search/filter by SKU.

Expected result:

```text
Staff can quickly find product prices.
```

### Test 5: WooCommerce Down Scenario

After a successful export, simulate WooCommerce being unavailable.

Expected result:

```text
The Google Sheet still has the latest exported prices.
```

---

## Security Notes

- Use WooCommerce API keys with **read-only** access.
- Do not share the Consumer Secret.
- Do not commit `.env` or `google-service-account.json` to Git.
- Share the Google Sheet only with authorized staff.
- Keep the service account JSON in a secure location.
- If using GitHub Actions, store secrets in GitHub Secrets only.

---

## Limitations

This approach is simple and useful, but it has limitations.

- Prices are only as fresh as the last successful export.
- If the export fails for many hours, the sheet may become stale.
- Google Sheets is not ideal for extremely large catalogs.
- Complex pricing plugins may not be fully reflected unless WooCommerce REST API returns the final price correctly.
- Customer-specific pricing, role-based pricing, coupons, or dynamic discounts may require extra logic.

---

## Future Improvements

After the basic version works, consider adding:

- Email or Slack alert if export fails.
- Stale data warning if export is older than 2 hours.
- Incremental sync based on modified date.
- Separate tabs by category.
- Export price history to another tab.
- Export stock status and stock quantity.
- Add a small internal web search page later.
- Backup export to JSON as well as Google Sheets.

---

## Recommended MVP Scope

Build this first:

```text
1. Node.js exporter
2. WooCommerce product fetch
3. Variation support
4. Google Sheet update
5. Status tab
6. Duplicate SKU detection
7. 15-minute cron
```

Avoid overengineering the first version.

The main goal is simple:

```text
If WooCommerce is down, staff can still open Google Sheets and check the latest exported product prices.
```

---

## Final Recommendation

Use this setup:

```text
WooCommerce REST API
   ↓
Node.js scheduled exporter
   ↓
Google Sheets
   ↓
Staff emergency price checker
```

Run the export every **15 minutes**.

Add a clear stale warning if the last successful export is older than **2 hours**.

This gives you a reliable and low-cost backup pricing method without needing to build a full separate application.
