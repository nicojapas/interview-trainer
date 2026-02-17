# Interview Trainer - Web Version

Terminal-style interview prep application with xterm.js frontend and Cloudflare Pages deployment.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env` and set:
- `AUTH_PASSWORD` - Password for accessing the app
- `GOOGLE_API_KEY` - Your Google Gemini API key

3. Run development server:
```bash
npm run dev
```

Visit http://localhost:5173

## Building for Production

```bash
npm run build
```

Output will be in `dist/`

## Deployment to Cloudflare Pages

### Option 1: CLI Deployment

1. Install Wrangler:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

3. Set environment variables:
```bash
npx wrangler pages secret put AUTH_PASSWORD
npx wrangler pages secret put GOOGLE_API_KEY
```

4. Deploy:
```bash
npm run build
npx wrangler pages deploy dist --project-name=interview-trainer
```

### Option 2: GitHub Integration

1. Push this repo to GitHub
2. Go to Cloudflare Dashboard → Pages → Create a project
3. Connect your GitHub repo
4. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Add environment variables in Cloudflare dashboard:
   - `AUTH_PASSWORD`
   - `GOOGLE_API_KEY`

## Project Structure

```
├── src/                    # Frontend React app
│   ├── components/         # Terminal and Auth components
│   ├── lib/                # API client
│   └── App.jsx             # Main app
├── functions/              # Cloudflare Pages Functions
│   ├── api/                # API endpoints
│   └── _middleware.js      # Auth middleware
├── migrations/             # D1 database migrations
└── public/                 # Static assets
```

## Authentication

Simple password-based auth:
- User enters password on login page
- Token stored in localStorage
- All `/api/*` endpoints (except `/api/auth`) require Bearer token
- Token validated by middleware

## API Endpoints

- `POST /api/auth` - Login (returns token)
- `POST /api/gemini` - Get AI explanation (requires auth)
- `GET /api/questions` - Get questions from D1 database
