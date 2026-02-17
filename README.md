# Interview Trainer

A terminal-style interview preparation app that quizzes you on software engineering topics with AI-powered explanations.

## Features

- **Terminal UI** — Retro terminal interface built with xterm.js for a unique, distraction-free experience
- **500+ Questions** — Covers backend, frontend, REST APIs, databases, system design, and more
- **AI Explanations** — Google Gemini integration provides detailed explanations on demand
- **Serverless Architecture** — Deployed on Cloudflare's edge network for fast global access
- **D1 Database** — Questions stored in Cloudflare's distributed SQLite database

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, xterm.js |
| Backend | Cloudflare Pages Functions |
| Database | Cloudflare D1 (SQLite) |
| AI | Google Gemini API |
| Build | Vite |

## Architecture

```
┌─────────────────┐     ┌──────────────────────────────────────┐
│                 │     │         Cloudflare Edge              │
│  React + xterm  │────►│  ┌─────────────┐  ┌──────────────┐   │
│                 │     │  │   Pages     │  │     D1       │   │
└─────────────────┘     │  │  Functions  │──│   Database   │   │
                        │  └─────────────┘  └──────────────┘   │
                        │         │                            │
                        │         ▼                            │
                        │  ┌─────────────┐                     │
                        │  │   Gemini    │                     │
                        │  │     API     │                     │
                        │  └─────────────┘                     │
                        └──────────────────────────────────────┘
```

## Local Development

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your AUTH_PASSWORD and GOOGLE_API_KEY

# Start dev server
npm run dev
```

## Deployment

### 1. Create D1 Database

```bash
# Create the database
npx wrangler d1 create interview-trainer-db

# Copy the database_id from the output and update wrangler.toml

# Run migrations
npx wrangler d1 migrations apply interview-trainer-db --remote
```

### 2. Deploy to Cloudflare Pages

```bash
# Set secrets
npx wrangler pages secret put AUTH_PASSWORD
npx wrangler pages secret put GOOGLE_API_KEY

# Deploy
npm run build && npx wrangler pages deploy dist
```

### 3. Bind Database to Pages Project

In Cloudflare Dashboard → Pages → your project → Settings → Functions → D1 Database bindings:
- Variable name: `DB`
- D1 database: `interview-trainer-db`

## Project Structure

```
src/
├── components/
│   ├── Terminal.jsx    # Quiz UI with xterm.js
│   └── Auth.jsx        # Login form
└── lib/
    └── api.js          # API client

functions/
├── api/
│   ├── auth.js         # POST /api/auth
│   ├── questions.js    # GET /api/questions
│   └── gemini.js       # POST /api/gemini
└── _middleware.js      # Token validation

migrations/             # D1 schema and seed data
```
