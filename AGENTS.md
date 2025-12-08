# The Council — Project Brief

## Overview

**The Council** is a personal/family AI advisory platform that enables multi-LLM conversations with distinct personas. The core concept: instead of consulting a single AI, users convene a "council" of advisors — each powered by different LLMs with unique perspectives — to get balanced, vetted guidance on decisions.

This is a personal tool for Dan and his wife Laura, password-protected but web-accessible. It is not intended for public use, though the architecture should allow for future expansion if the project evolves.

### Primary Goals

1. **Multi-LLM orchestration**: Query multiple LLMs simultaneously or sequentially, with each acting as a distinct persona (e.g., "The Sage," "The Skeptic," "The Strategist")
2. **Shared family context**: Dan and Laura share projects, conversation history, and (eventually) document retrieval sets
3. **Decision-making support**: Use multiple perspectives to "keep LLMs honest" — catch hallucinations, challenge assumptions, surface alternative viewpoints
4. **Synthesis**: Automatically generate a summary of where advisors agree, disagree, and what next steps they recommend

---

## Technical Stack

### Implemented Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Framework** | SvelteKit | With Svelte 5 runes |
| **Language** | TypeScript | Strict mode, end-to-end type safety |
| **Database** | Cloudflare D1 | SQLite-compatible, serverless |
| **ORM** | Drizzle | Type-safe, SQL-like syntax |
| **AI SDK** | Vercel AI SDK | Multi-provider support, streaming |
| **Styling** | Tailwind CSS v4 + DaisyUI v5 | CSS-first config (no tailwind.config.js) |
| **Hosting** | Cloudflare Pages | Edge deployment |
| **Auth** | Better Auth + Passkeys | WebAuthn-based authentication |

### Infrastructure Notes

- **Cloudflare as default**: D1 for database, Pages for hosting, R2 for future file storage
- **Environment variables**: LLM API keys managed via Cloudflare env vars (`.dev.vars` locally, dashboard for production)
- **No tRPC**: Using simple API routes with Zod validation where needed

---

## Authentication

### Requirements

- **Passkey-based authentication** (WebAuthn)
- **Two users**: Dan and Laura, with separate accounts
- **Session persistence**: Stay logged in across browser sessions
- **User attribution**: Track which user created/contributed to conversations

### Implementation Notes

- Evaluate passkey libraries for the chosen framework (e.g., `@simplewebauthn/server` and `@simplewebauthn/browser`)
- Fallback to password auth if passkey setup proves too complex for MVP
- Store user records in Postgres via Drizzle

---

## Data Model

### Core Entities

```
users
├── id: text (primary key, nanoid)
├── name: string
├── email: string (unique)
├── emailVerified: boolean
├── image: string (optional)
├── createdAt: integer (timestamp)
└── updatedAt: integer (timestamp)

projects (DEFERRED — see "Deferred Features" section)
├── id: text (primary key, nanoid)
├── name: string
├── description: string (optional)
├── createdBy: text (foreign key → users)
├── isShared: boolean (default true for family use)
├── createdAt: integer (timestamp)
└── updatedAt: integer (timestamp)

conversations
├── id: text (primary key, nanoid)
├── projectId: text (foreign key → projects, NULLABLE — not used in Phase 1)
├── title: string
├── mode: enum ('quick', 'second-opinion', 'brain-trust')
├── createdBy: text (foreign key → users)
├── createdAt: integer (timestamp)
└── updatedAt: integer (timestamp)

messages
├── id: uuid (primary key)
├── conversationId: uuid (foreign key → conversations)
├── role: enum ('user', 'advisor', 'synthesis')
├── content: text
├── modelId: string (e.g., 'claude-sonnet-4', 'gpt-4o')
├── personaId: uuid (foreign key → personas, nullable)
├── parentMessageId: uuid (self-reference, nullable — for threading)
├── critiqueOfMessageId: uuid (self-reference, nullable — for critique chains)
├── createdBy: uuid (foreign key → users)
├── createdAt: timestamp
└── metadata: jsonb (token counts, latency, etc.)

personas
├── id: uuid (primary key)
├── name: string (e.g., "The Sage")
├── role: string (e.g., "Balanced Wisdom")
├── systemPrompt: text
├── defaultModelId: string
├── avatarEmoji: string (e.g., "🦉")
├── accentColor: string (hex, e.g., "#7d9a78")
├── isDefault: boolean
├── createdBy: uuid (foreign key → users, nullable for system defaults)
├── createdAt: timestamp
└── updatedAt: timestamp
```

### Notes

- `critiqueOfMessageId` enables visible critique chains — Model B's response can reference which message it's critiquing
- `personas` are editable in the UI so users can see/modify the system prompt being sent to the LLM
- `mode` on conversations determines orchestration behavior (quick = single model, second-opinion = 2 models sequential, brain-trust = 3+ models parallel + synthesis)

---

## Conversation Modes

### Quick Answer

Single model response. User selects one persona, asks a question, gets a response.

### Second Opinion

Sequential critique flow:
1. User asks question
2. Primary persona (Model A) responds
3. Critic persona (Model B) reviews Model A's response and provides critique
4. Optionally: Model A can refine based on critique

UI shows both responses, with the critique visually connected to what it's critiquing.

### Brain Trust

Parallel multi-model flow:
1. User asks question
2. All selected personas (typically 3) respond simultaneously
3. A synthesis step generates a summary of agreement, disagreement, and recommended next steps

UI shows responses side-by-side (or stacked on mobile), with synthesis card below.

---

## Personas (Default Set)

The MVP ships with three default personas. Users can modify system prompts via UI.

### The Sage (Claude)

- **Role**: Balanced Wisdom
- **Color**: Sage green (#7d9a78)
- **Avatar**: 🦉
- **System Prompt**:
```
You are The Sage, an advisor known for balanced, thoughtful counsel. You consider multiple angles before offering guidance. You're neither overly optimistic nor pessimistic — you aim for grounded wisdom.

When responding:
- Acknowledge complexity and tradeoffs
- Provide actionable guidance, not just analysis
- Be direct but not dismissive of alternatives
- If you're uncertain, say so clearly
```

### The Skeptic (GPT-4o)

- **Role**: Devil's Advocate
- **Color**: Plum (#8b6b8b)
- **Avatar**: 🦊
- **System Prompt**:
```
You are The Skeptic, an advisor who stress-tests ideas and assumptions. Your role is to find weaknesses, challenge premises, and surface risks others might miss.

When responding:
- Question assumptions explicitly
- Highlight potential failure modes
- Push back on overly optimistic projections
- Offer alternative framings
- Be constructive — your goal is to strengthen decisions, not just criticize
```

### The Strategist (Gemini)

- **Role**: Analytical Framework
- **Color**: Slate (#6b7b8b)
- **Avatar**: 🦅
- **System Prompt**:
```
You are The Strategist, an advisor who brings structure and frameworks to complex decisions. You break problems into components, identify key variables, and suggest systematic approaches.

When responding:
- Structure your analysis clearly (decision matrices, pros/cons, key variables)
- Identify what data or information would improve the decision
- Offer to help build models or frameworks if useful
- Be practical — focus on actionable next steps
```

---

## Synthesis Generation

After Brain Trust responses are collected, generate a synthesis using a dedicated prompt:

```
You are synthesizing responses from multiple advisors to help the user understand the landscape of opinions.

Advisors and their responses:
{{advisorResponses}}

Generate a synthesis with three sections:
1. **Points of Agreement**: Where do the advisors align?
2. **Key Tensions**: Where do they disagree, and what's the nature of the disagreement?
3. **Recommended Next Steps**: Based on the collective input, what should the user do next?

Be concise. Use bullet points. Don't repeat what the advisors said — synthesize it.
```

The synthesis model can be configurable, but default to Claude Sonnet for cost/quality balance.

---

## UI/UX Design Specification

### Design Philosophy

The UI should feel like consulting a panel of trusted advisors — warm, approachable, and slightly whimsical without being cartoonish. Think "academic advisory council" meets "cozy library."

### Color Palette

```css
:root {
  /* Backgrounds */
  --bg-parchment: #f4f1ea;
  --bg-warm: #faf8f4;
  
  /* Typography */
  --ink-dark: #2d2a24;
  --ink-muted: #5c574d;
  
  /* Accents */
  --accent-gold: #c9a227;
  --accent-copper: #b87333;
  --accent-sage: #7d9a78;    /* The Sage */
  --accent-plum: #8b6b8b;    /* The Skeptic */
  --accent-slate: #6b7b8b;   /* The Strategist */
  
  /* Borders & Shadows */
  --border-light: rgba(45, 42, 36, 0.12);
  --border-medium: rgba(45, 42, 36, 0.2);
  --shadow-soft: 0 2px 12px rgba(45, 42, 36, 0.08);
  --shadow-card: 0 4px 20px rgba(45, 42, 36, 0.1);
}
```

### Typography

- **Display/Headers**: Crimson Pro (serif) — warm, editorial feel
- **Body/UI**: DM Sans (sans-serif) — clean, readable
- **Monospace** (for any code/technical content): JetBrains Mono

### Key Components

**AdvisorCard**: Displays a single advisor's response
- Portrait area (emoji placeholder initially, illustrated avatar later)
- Small model badge in corner (C for Claude, G for GPT, etc.)
- Name and role
- Response content
- Action buttons: "Ask follow-up", "Dig deeper"

**SynthesisCard**: Displays the council synthesis
- Distinct styling (subtle gold/copper gradient background)
- Icon: ⚖️
- Sections for Agreement, Tensions, Next Steps

**ModeSelector**: Tabs for Quick Answer / Second Opinion / Brain Trust

**QuestionInput**: Textarea with advisor toggles and "Convene the Council" button

**ProjectSelector**: Dropdown to switch between projects

### Layout

- Desktop: Side-by-side advisor cards (3-column grid for Brain Trust)
- Tablet: 2-column grid
- Mobile: Stacked cards

### Visual Details

- Subtle paper texture overlay on background (very low opacity)
- Cards have soft shadows and slight hover lift
- Advisor portraits have colored borders matching their accent color
- Use DaisyUI components as base, customize with Tailwind to match palette

---

## Deferred Features

### Projects (Deferred to Phase 2+)

**What**: Projects were originally planned as containers for organizing conversations by topic (e.g., "Home Renovation", "Career Planning").

**Why deferred**: For Phase 1, a flat list of conversations is simpler and sufficient. Projects add UI complexity without immediate value for two users.

**Current state**:
- Schema exists with `projectId` as optional field on conversations
- Project service and API routes exist but are not used
- Sidebar shows flat conversation list instead of project hierarchy

**Future implementation plan**:
1. Add project selector to sidebar
2. Allow creating/editing projects
3. Filter conversations by project
4. Conversations without a project appear in "General" or "Uncategorized"

---

## Development Phases

### Phase 1: Foundation (MVP) — CURRENT

**Goal**: Basic multi-LLM chat with personas

- [x] Project scaffolding (SvelteKit with Svelte 5)
- [x] Tailwind v4 + DaisyUI v5 setup
- [ ] Storybook integration
- [x] Cloudflare D1 + Drizzle schema
- [x] Better Auth + Passkey authentication
- [x] Single-model chat (Quick Answer mode)
- [x] Persona system with editable system prompts
- [x] Vercel AI SDK integration with streaming

**Deliverable**: Working chat app with personas and auth (projects deferred)

### Phase 2: Multi-LLM Orchestration

**Goal**: Second Opinion and Brain Trust modes

- [ ] Multi-model API integration (Claude, GPT-4o, Gemini)
- [ ] Second Opinion mode (sequential with critique linking)
- [ ] Brain Trust mode (parallel execution)
- [ ] Synthesis generation
- [ ] Side-by-side response UI
- [ ] Visible critique chains
- [ ] Advisor toggle controls

**Deliverable**: Full Brain Trust experience with synthesis

### Phase 3: Polish & Collaboration

**Goal**: Production-ready family tool

- [ ] Illustrated advisor portraits (AI-generated, consistent style)
- [ ] Conversation history and search
- [ ] User attribution (see who asked what)
- [ ] Mobile-responsive polish
- [ ] Error handling and retry logic
- [ ] Loading states and streaming indicators
- [ ] Cloudflare R2 integration prep (for Phase 4)

**Deliverable**: Polished, daily-driver quality app

### Phase 4: RAG & Document Retrieval (Future)

**Goal**: Shared knowledge base

- [ ] Document upload (PDFs, notes, etc.)
- [ ] Text extraction and chunking
- [ ] Embedding generation and storage (pgvector)
- [ ] Per-project retrieval sets
- [ ] Context injection into advisor prompts
- [ ] Source attribution in responses

### Phase 5: Advanced Orchestration (Future)

**Goal**: Autonomous and flexible flows

- [ ] Orchestrator model (decides when to bring in other advisors)
- [ ] Custom pipeline builder
- [ ] MCP server integration (consume external tools)
- [ ] MCP server exposure (wrap family knowledge base as tool)

---

## Full Vision

Beyond MVP, The Council could evolve into:

1. **Family command center**: Shared context for major decisions (car purchases, home renovations, travel planning, financial decisions)

2. **Research companion**: Upload documents, build retrieval sets, have advisors analyze and reference source material

3. **LLM experimentation playground**: Try new models as they release, A/B test personas, compare model behaviors on identical prompts

4. **Multi-agent workflows**: Let advisors collaborate autonomously — The Strategist builds a framework, The Skeptic stress-tests it, The Sage refines it

5. **MCP integration hub**: Connect to external tools (calendar, email, home automation) and expose family knowledge as tools for other AI clients

The architecture should remain modular enough to support these extensions without major refactoring.

---

## Reference Files

- **UI Mockup**: See `brain-trust-ui.html` for the visual direction and component structure
- **Design tokens**: Extract from the CSS variables in the mockup

---

## Open Questions

1. **Streaming architecture**: How to handle parallel streaming from multiple LLMs in Brain Trust mode?

2. **Synthesis timing**: Generate synthesis after all responses complete, or stream it as responses come in?

---

## Success Criteria

### Phase 1 (Current)

The MVP is successful when:

1. Dan and Laura can both log in with passkeys
2. They can ask questions and get streaming AI responses
3. They can switch between personas (The Sage, The Skeptic, The Strategist)
4. They can view and edit persona system prompts
5. Conversations persist and appear in sidebar
6. The UI feels warm and usable

### Full Vision

1. Brain Trust mode with three advisor responses side-by-side
2. Synthesis of responses showing agreement/disagreement
3. Project-based organization of conversations
4. Document upload and RAG retrieval

---

## Technical Notes

### D1/SQLite Constraints

Unlike PostgreSQL:
- No UUID type — use `text` with nanoid
- No `jsonb` — use `text` and parse JSON manually
- No `boolean` — use `integer` with `mode: 'boolean'`
- No `timestamp` — use `integer` with `mode: 'timestamp'`

### Better Auth on Cloudflare Workers

- Scrypt password hashing can timeout on free tier
- Using SHA-256 for temporary passwords (passkeys are primary auth)
- Field names must match Better Auth exactly (e.g., `credentialID` not `credentialId`)

### Vercel AI SDK

- Use `Chat` class from `@ai-sdk/svelte` (not React hooks)
- Messages use `parts` array format, not simple `content` string
- Use `convertToModelMessages()` to convert UI messages for model consumption
- Persist messages in `onFinish` callback, not during streaming

---

*Last updated: December 2024*
*Author: Dan (with Claude)*
