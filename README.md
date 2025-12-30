# The Council

A personal AI advisory platform that brings together multiple LLM perspectives to help you make better decisions.

## Overview

The Council is a multi-LLM advisory platform designed for personal and family use. Rather than relying on a single AI perspective, The Council consults multiple AI advisors—each with distinct personalities and analytical styles—to provide balanced, well-considered guidance on important decisions.

### Three Default Advisors

| Advisor | Role | Model | Style |
|---------|------|-------|-------|
| **The Sage** | Balanced Wisdom | Claude Sonnet 4 | Thoughtful, considers tradeoffs, grounded |
| **The Skeptic** | Devil's Advocate | GPT-4o | Questions assumptions, surfaces risks |
| **The Strategist** | Analytical Framework | Gemini 2.0 Flash | Structured analysis, frameworks, next steps |

## Features

- **Passkey Authentication** - Passwordless login with WebAuthn/biometrics
- **Project Organization** - Group conversations by topic or decision
- **Multi-Model Chat** - Stream responses from Claude, GPT-4o, or Gemini
- **Customizable Personas** - Edit system prompts to tune advisor personalities
- **Edge Deployment** - Fast responses from Cloudflare's global network

## Quick Start

### Prerequisites

- Node.js 20+
- Cloudflare account (free tier works)
- API keys for at least one LLM provider:
  - [Anthropic](https://console.anthropic.com/) (Claude)
  - [OpenAI](https://platform.openai.com/) (GPT-4o)
  - [Google AI](https://aistudio.google.com/) (Gemini)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/ai-council.git
cd ai-council

# Install dependencies
npm install

# Create D1 database
npx wrangler d1 create council-db

# Copy environment template
cp .env.example .env
```

### Configuration

1. **Update `wrangler.toml`** with your D1 database ID:

```toml
[[d1_databases]]
binding = "DB"
database_name = "council-db"
database_id = "your-database-id-here"  # From wrangler d1 create output
```

2. **Set up environment variables** in `.env`:

```bash
# For Drizzle Kit migrations (local development)
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_DATABASE_ID=your-database-id
CLOUDFLARE_D1_TOKEN=your-d1-token
```

3. **Add API keys** via Wrangler secrets (for production):

```bash
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put GOOGLE_AI_API_KEY
npx wrangler secret put BETTER_AUTH_SECRET
```

### Database Setup

```bash
# Generate migration from schema
npx drizzle-kit generate

# Apply migration locally
npx wrangler d1 execute council-db --local --file=drizzle/migrations/0000_*.sql

# Seed default personas
npx wrangler d1 execute council-db --local --command="$(cat src/lib/server/db/seed.sql)"
```

### Development

```bash
# Start dev server with local D1
npm run dev

# Open in browser
open http://localhost:5173
```

### Deployment

```bash
# Apply migrations to production
npx wrangler d1 execute council-db --remote --file=drizzle/migrations/0000_*.sql

# Deploy to Cloudflare Pages
npm run build
npx wrangler pages deploy .svelte-kit/cloudflare
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser/PWA                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   Cloudflare Pages                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   SvelteKit  │  │  Better Auth │  │   Vercel AI SDK  │  │
│  │   + SSR      │  │  + Passkeys  │  │   + Streaming    │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                          │                                  │
│  ┌───────────────────────▼──────────────────────────────┐  │
│  │                  Cloudflare D1                        │  │
│  │              (SQLite at the edge)                     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Anthropic   │  │    OpenAI    │  │  Google AI   │
│   (Claude)   │  │   (GPT-4o)   │  │  (Gemini)    │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | SvelteKit 2 | Full-stack framework with SSR |
| Styling | Tailwind CSS v4 + DaisyUI v5 | Utility CSS + component library |
| Database | Cloudflare D1 | Serverless SQLite at the edge |
| ORM | Drizzle | Type-safe SQL with migrations |
| Auth | Better Auth + Passkeys | WebAuthn passwordless authentication |
| AI | Vercel AI SDK | Multi-provider streaming |
| Hosting | Cloudflare Pages | Edge deployment with D1 bindings |

## Project Structure

```
ai-council/
├── docs/                     # Architecture documentation
│   ├── architecture.md       # System overview
│   ├── database.md          # Schema and relationships
│   ├── authentication.md    # Passkey flows
│   ├── chat-system.md       # Streaming and modes
│   └── api.md               # Endpoint reference
├── drizzle/
│   └── migrations/          # SQL migrations
├── src/
│   ├── lib/
│   │   ├── components/      # Svelte components
│   │   │   ├── chat/        # Chat UI (AdvisorCard, QuestionInput)
│   │   │   └── ui/          # Base components
│   │   ├── server/
│   │   │   ├── ai/          # Provider configuration
│   │   │   ├── db/          # Schema and client
│   │   │   └── services/    # Business logic
│   │   └── auth-client.ts   # Client-side auth
│   ├── routes/
│   │   ├── (auth)/          # Login, register pages
│   │   ├── (app)/           # Authenticated app routes
│   │   └── api/             # API endpoints
│   ├── app.css              # Tailwind + DaisyUI theme
│   └── hooks.server.ts      # Session middleware
├── drizzle.config.ts        # Drizzle Kit config
├── svelte.config.js         # SvelteKit config
├── vite.config.ts           # Vite + Tailwind
└── wrangler.toml            # Cloudflare bindings
```

## Documentation

Detailed documentation is available in the [`docs/`](./docs/) folder:

- **[Architecture Overview](./docs/architecture.md)** - System design and request flow
- **[Database Schema](./docs/database.md)** - Tables, relationships, and migrations
- **[Authentication](./docs/authentication.md)** - Passkey registration and login flows
- **[Chat System](./docs/chat-system.md)** - Streaming implementation and conversation modes
- **[API Reference](./docs/api.md)** - All endpoints with request/response examples

## Conversation Modes

### Quick Answer (Phase 1)
Single advisor responds to your question with their unique perspective.

### Second Opinion (Phase 2)
Primary advisor responds, then a critic reviews and challenges the response.

### Brain Trust (Phase 2)
All advisors respond in parallel, followed by a synthesis highlighting agreements, tensions, and recommended next steps.

## Development

```bash
# Run development server
npm run dev

# Type checking
npm run check

# Storybook for component development
npm run storybook

# Generate database migration
npx drizzle-kit generate

# Apply migration locally
npx wrangler d1 execute council-db --local --file=drizzle/migrations/<name>.sql
```

### AI SDK DevTools

The Council uses AI SDK 6's DevTools for debugging agent flows and LLM calls. In development mode, all model calls are automatically wrapped with DevTools middleware.

**Launch the DevTools viewer:**

```bash
# Start the DevTools viewer (in a separate terminal)
npx @ai-sdk/devtools

# Then open http://localhost:4983 in your browser
```

**Inspect:**
- Input prompts and parameters
- Tool calls and results
- Token usage and timing
- Raw provider request/response data

This is especially useful for debugging Brain Trust mode, where you can see the full context passed to each advisor and how the agent orchestrates tool calls.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOUDFLARE_ACCOUNT_ID` | Dev | For Drizzle Kit |
| `CLOUDFLARE_DATABASE_ID` | Dev | For Drizzle Kit |
| `CLOUDFLARE_D1_TOKEN` | Dev | For Drizzle Kit |
| `ANTHROPIC_API_KEY` | Prod | Claude models |
| `OPENAI_API_KEY` | Prod | GPT models |
| `GOOGLE_AI_API_KEY` | Prod | Gemini models |
| `BETTER_AUTH_SECRET` | Prod | Session encryption |

## Roadmap

- [x] **Phase 1**: Core chat with single advisor (Quick Answer mode)
- [ ] **Phase 2**: Multi-advisor modes (Second Opinion, Brain Trust)
- [ ] **Phase 3**: Document upload and analysis
- [ ] **Phase 4**: RAG with pgvector (migration to Neon)
- [ ] **Phase 5**: Voice input/output

## License

Private project - not for redistribution.

---

Built with care for better decision-making.
