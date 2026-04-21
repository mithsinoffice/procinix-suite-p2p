# Procinix Suite - P2P Automation ERP

Enterprise Procure-to-Pay automation platform with AI-powered invoice ingestion, master data management, and approval workflows.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Radix UI
- **Backend:** Node.js (raw `http.createServer`), MySQL 2
- **Database:** Azure MySQL
- **AI/ML:** Claude (Anthropic), Gemini (Google AI) for OCR and agent processing
- **Email:** IMAP polling for invoice ingestion, SMTP for notifications

## Local Development

```bash
# Install dependencies
npm install

# Copy environment config
cp .env.example .env.mysql.local
# Edit .env.mysql.local with your database credentials

# Start dev server (API + Vite)
npm run dev
```

The API server starts on port 8787 and the Vite dev server on port 3000 with proxy to the API.

## Production Build

```bash
npm run build       # Build React app to build/
npm run start       # Start production server (serves API + static files)
```

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Description |
|---|---|
| `MYSQL_HOST` | Azure MySQL server hostname |
| `MYSQL_DATABASE` | Database name (e.g., `p2p_schema_mt`) |
| `API_SECRET_KEY` | Bearer token for API authentication |
| `ANTHROPIC_API_KEY` | Claude API key for AI invoice processing |
| `GOOGLE_AI_API_KEY` | Gemini API key for OCR extraction |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins |

## Deployment

Configured for Railway (see `railway.json`) and Heroku-compatible platforms (see `Procfile`).

```bash
# Railway
railway up

# Any platform
NODE_ENV=production node server/index.mjs
```

Health check endpoint: `GET /health`
