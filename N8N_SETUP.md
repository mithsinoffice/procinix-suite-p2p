# n8n Email-to-Invoice Pipeline

n8n owns the Gmail polling + OCR steps. Our API only persists the structured invoice.
This decouples the Node process from Gemini quota limits and gives us a UI for retries.

## Architecture

```
Gmail inbox → n8n Gmail Trigger → n8n filter (has attachment)
            → n8n OCR (Gemini / Mistral / Tesseract / your choice)
            → n8n Code node (shape JSON to our schema)
            → n8n HTTP Request → POST /webhooks/n8n/invoice-ingest
                                 ↓
                            Procinix API persists DRAFT invoice,
                            runs match scoring, writes audit log
```

The in-process 5-minute Gmail poller is **off by default** (`EMAIL_POLLER_ENABLED=false`).
The manual trigger `POST /api/email-poll/trigger` is still mounted for fallback debugging.

## Webhook contract

**URL** `POST {API_BASE}/webhooks/n8n/invoice-ingest`
**Headers**
- `Content-Type: application/json`
- `X-N8N-Secret: <N8N_WEBHOOK_SECRET from server/.env>`

**Body** (all fields validated by Zod, 400 on shape errors):

```json
{
  "tenantId": "63d0e5e2-2a89-427e-abb6-fd315e2873ae",
  "messageId": "{{ $('Gmail Trigger').item.json.id }}",
  "channelType": "EMAIL_INGEST",
  "senderEmail": "vendor@acme.com",
  "subject": "Invoice INV-2024-001",
  "attachmentName": "invoice.pdf",
  "mimeType": "application/pdf",
  "invoice": {
    "invoiceNumber": "INV-2024-001",
    "invoiceDate":   "2024-01-15",
    "dueDate":       "2024-02-14",
    "vendorGSTIN":   "29ABCDE1234F1Z5",
    "vendorPAN":     "ABCDE1234F",
    "irnNumber":     null,
    "subtotal":      10000,
    "cgstAmount":    900,
    "sgstAmount":    900,
    "igstAmount":    0,
    "tdsAmount":     0,
    "totalAmount":   11800,
    "ocrConfidence": 92,
    "lineItems": [
      {
        "description": "Consulting services - Jan 2024",
        "hsnCode":     null,
        "sacCode":     "9983",
        "quantity":    1,
        "uom":         "Nos",
        "unitPrice":   10000,
        "gstRate":     18,
        "amount":      10000
      }
    ]
  }
}
```

### Response codes

| Status | Meaning |
|---|---|
| `201` | Invoice created. Body: `{ invoiceId, status, matchScore, lane, vendor }`. Status is `DRAFT` or `SUBMITTED` (STP auto-submit). |
| `200` + `skipped` field | Dedup hit. One of: `duplicate` (same messageId), `duplicate_invoice` (same vendor + invoiceNumber), `no_vendor_match`. **Mark the n8n step as success — don't retry.** |
| `400` | Body fails Zod validation. Check `issues` for field errors. Don't retry. |
| `401` | Bad / missing `X-N8N-Secret`. Don't retry — fix the n8n credentials. |
| `404` | `tenantId` doesn't exist. Don't retry. |
| `409` | Tenant has no entity or no user configured. Operator action needed. |
| `503` | `N8N_WEBHOOK_SECRET` not configured on the server. |
| `500` | Database write failed. Safe to retry with exponential backoff. |

## n8n workflow recipe

### 1. Gmail Trigger node
- **Authentication**: OAuth2 (n8n's own credential — separate from Procinix's `GMAIL_REFRESH_TOKEN`)
- **Event**: Message Received
- **Filters**: `has:attachment`, optionally `to:ap@yourdomain.com`
- **Format**: `Full`

### 2. IF node — filter out outgoing/sent
- Condition: `{{$json.labelIds}}` does NOT contain `SENT`

### 3. Loop attachments
Use a **Loop Over Items** or **Code** node to iterate `$json.attachments`, filter to PDFs / images.

### 4. OCR node (pick one)
- **Google Gemini** (`@n8n/n8n-nodes-langchain` package) — use **your own** Gemini API key inside n8n, separate quota from the one in `server/.env`
- **Mistral OCR** — free quota for invoices; use the `mistral-ocr-latest` model
- **Self-hosted Tesseract** via `Execute Command` if you want no third-party calls

The OCR node should return parsed fields. Use a **Code** node to coerce them to our schema (see body above).

### 5. HTTP Request node
- **Method**: POST
- **URL**: `{{ $env.PROCINIX_API_BASE }}/webhooks/n8n/invoice-ingest`
- **Authentication**: Generic credential type → **Header Auth**
  - Header name: `X-N8N-Secret`
  - Header value: `={{ $credentials.procinix.secret }}` (store as n8n credential, never inline)
- **Send Headers**: `Content-Type: application/json`
- **Send Body**: JSON, expression-mapped from prior nodes
- **Response Format**: JSON
- **On Error**: Stop workflow (4xx) / Retry with backoff (5xx)

### 6. IF node — dedup branch (optional)
If response `status === 201` → success branch (Slack/email "invoice ingested")
If response has `skipped` → silent success
Else → error branch (alert)

## Where to host n8n

| Option | Pros | Cons |
|---|---|---|
| **n8n Cloud** (n8n.io) | Zero ops, free tier covers low volume | Workflows leave your infra; ~250 executions/mo free |
| **Self-hosted Docker** | Full control, no exec limits, runs alongside the Procinix stack | You operate it |
| **Railway / Render** | Quick deploy, persistent volume for n8n state | Cost scales with traffic |

For the demo, **n8n Cloud** is fastest. To expose `localhost:8787/webhooks/n8n/invoice-ingest` to the internet during dev, use:
```
ngrok http 8787
```
…and use the resulting `https://*.ngrok-free.app` as your `PROCINIX_API_BASE` in n8n.

## Secret rotation

`N8N_WEBHOOK_SECRET` is the only shared secret. To rotate:
1. Generate a new one: `openssl rand -hex 32`
2. Update `server/.env`, restart the API
3. Update the n8n credential
4. Old workflows using the old secret will get 401 — fix them or pause

## Decommissioning the in-process poller

Once n8n is in production:
- Keep `EMAIL_POLLER_ENABLED=false`
- The manual `POST /api/email-poll/trigger` route can be removed (or left for emergencies)
- `GMAIL_REFRESH_TOKEN` in `server/.env` becomes orphaned — safe to delete after a week of stable n8n operation
