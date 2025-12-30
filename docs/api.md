# API Reference

All API endpoints require authentication unless otherwise noted. Authentication is handled via session cookies set by Better Auth.

## Authentication

### Sign Up
```http
POST /api/auth/sign-up/email
Content-Type: application/json

{
  "email": "dan@example.com",
  "name": "Dan",
  "password": "temporary-password"
}
```

**Response**: `200 OK` with session cookie

### Register Passkey
```http
GET /api/auth/passkey/generate-registration-options

POST /api/auth/passkey/verify-registration
Content-Type: application/json

{
  "credential": { ... WebAuthn credential ... },
  "name": "Dan's MacBook"
}
```

### Authenticate with Passkey
```http
GET /api/auth/passkey/generate-authentication-options

POST /api/auth/passkey/verify-authentication
Content-Type: application/json

{
  "credential": { ... WebAuthn assertion ... }
}
```

**Response**: `200 OK` with session cookie

### Sign Out
```http
POST /api/auth/sign-out
```

### Get Session
```http
GET /api/auth/session
```

**Response**:
```json
{
  "session": {
    "id": "sess_abc123",
    "userId": "user_xyz789",
    "expiresAt": "2025-01-06T12:00:00Z"
  },
  "user": {
    "id": "user_xyz789",
    "name": "Dan",
    "email": "dan@example.com"
  }
}
```

---

## Projects

### List Projects
```http
GET /api/projects
```

**Response**:
```json
[
  {
    "id": "proj_abc123",
    "name": "Home Purchase Decision",
    "description": "Evaluating whether to buy or rent",
    "createdBy": "user_xyz789",
    "isShared": true,
    "createdAt": 1702345678,
    "updatedAt": 1702345678
  }
]
```

### Create Project
```http
POST /api/projects
Content-Type: application/json

{
  "name": "Home Purchase Decision",
  "description": "Evaluating whether to buy or rent",
  "isShared": true
}
```

**Response**: `201 Created`
```json
{
  "id": "proj_abc123",
  "name": "Home Purchase Decision",
  "description": "Evaluating whether to buy or rent",
  "createdBy": "user_xyz789",
  "isShared": true,
  "createdAt": 1702345678,
  "updatedAt": 1702345678
}
```

### Get Project
```http
GET /api/projects/:id
```

### Update Project
```http
PUT /api/projects/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

### Delete Project
```http
DELETE /api/projects/:id
```

**Response**: `200 OK`
```json
{ "success": true }
```

---

## Personas

### List Personas
```http
GET /api/personas
```

**Response**:
```json
[
  {
    "id": "persona_sage",
    "name": "The Sage",
    "role": "Balanced Wisdom",
    "systemPrompt": "You are The Sage...",
    "defaultModelId": "claude-sonnet-4",
    "avatarEmoji": "🦉",
    "accentColor": "#7d9a78",
    "isDefault": true,
    "createdAt": 1702345678,
    "updatedAt": 1702345678
  }
]
```

### Get Persona
```http
GET /api/personas/:id
```

### Update Persona
```http
PUT /api/personas/:id
Content-Type: application/json

{
  "name": "The Sage",
  "role": "Balanced Wisdom",
  "systemPrompt": "Updated system prompt...",
  "defaultModelId": "claude-sonnet-4"
}
```

---

## Chat

### Send Message (Streaming)
```http
POST /api/chat
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "Should I buy or rent a house?" }
  ],
  "personaId": "persona_sage",
  "projectId": "proj_abc123",
  "conversationId": null
}
```

**Response**: Server-Sent Events stream

**Headers**:
- `Content-Type: text/event-stream`
- `X-Conversation-Id: conv_xyz789`

**Stream format** (Vercel AI SDK Data Stream Protocol):
```
0:"Let "
0:"me "
0:"help "
0:"you "
0:"think "
0:"through "
0:"this..."
d:{"finishReason":"stop","usage":{"promptTokens":150,"completionTokens":500}}
```

### Stream Event Types
| Prefix | Type | Description |
|--------|------|-------------|
| `0:` | Text | Streaming text token |
| `d:` | Data | Finish metadata |
| `e:` | Error | Error message |

### Council Session (Brain Trust Mode)

In Brain Trust mode, all three default advisors (The Sage, The Skeptic, The Strategist) are consulted via a unified endpoint. The server-side ToolLoopAgent orchestrates sequential advisor calls and generates a structured synthesis, streaming results in real-time as each advisor completes.

```http
POST /api/council
Content-Type: application/json

{
  "question": "Should I quit my job to start a company?",
  "conversationId": "conv_xyz789"  // Optional - creates new if not provided
}
```

**Request Fields**:
- `question`: The user's question (required)
- `conversationId`: ID of existing conversation (optional - creates new conversation if omitted)

**Response Headers**:
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache, no-transform`
- `X-Conversation-Id`: The conversation ID (created or existing)
- `X-User-Message-Id`: Database ID of the saved user message

**Response Format**: Server-Sent Events (SSE) stream

The endpoint streams events as they occur:

**1. Metadata Event** (sent first):
```
data: {"type":"metadata","conversationId":"conv_xyz789","userMessageId":"msg_user123"}
```

**2. Advisor Response Events** (sent as each advisor completes):
```
data: {"type":"advisor-response","advisor":{"advisorId":"persona_sage","advisorName":"The Sage","advisorRole":"Balanced Wisdom","response":"Starting a company is a profound decision..."}}
```

**3. Synthesis Event** (sent after all advisors complete):
```
data: {"type":"synthesis","synthesis":{"pointsOfAgreement":["..."],"keyTensions":[{"topic":"...","sagePosition":"...","skepticPosition":"...","strategistPosition":"..."}],"recommendedNextSteps":["..."]}}
```

**4. Completion Event**:
```
data: [DONE]
```

**Error Event** (if an error occurs):
```
data: {"type":"error","error":"Error message"}
```

**How it works**:
1. Server-side AI SDK 6 ToolLoopAgent receives the question
2. Agent sequentially calls three tools (one per advisor):
   - `consultSage` - receives only the question
   - `consultSkeptic` - receives question + Sage's response
   - `consultStrategist` - receives question + both prior responses
3. **Streaming via onStepFinish callback**: As each tool execution completes, the `onStepFinish` callback fires
4. Callback immediately streams the advisor response to client via SSE
5. Response is also saved to database immediately
6. After all advisors complete, agent generates structured synthesis using Output.object()
7. Synthesis is streamed to client and saved to database

**Streaming Benefits**:
- Real-time feedback as each advisor completes (via onStepFinish callbacks)
- Better UX - users see progress as it happens
- Each advisor response appears immediately (no waiting for all three)
- Uses idiomatic AI SDK pattern with callbacks instead of manual stream parsing

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message description"
}
```

### Status Codes

| Code | Description |
|------|-------------|
| `400` | Bad Request - Invalid input |
| `401` | Unauthorized - No valid session |
| `403` | Forbidden - Not authorized for resource |
| `404` | Not Found - Resource doesn't exist |
| `500` | Internal Server Error |

### Common Errors

**Unauthorized**:
```json
{ "error": "Unauthorized" }
```

**Project Not Found**:
```json
{ "error": "Project not found" }
```

**Persona Not Found**:
```json
{ "error": "Persona not found" }
```

**Invalid Input**:
```json
{ "error": "Name is required" }
```

---

## Rate Limiting

Currently no rate limiting is implemented (personal/family use only). For production use, consider implementing:

- Per-user request limits
- LLM token budgets
- Cloudflare rate limiting rules

---

## TypeScript Types

```typescript
// User
interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Project
interface Project {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  isShared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Persona
interface Persona {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  defaultModelId: string;
  avatarEmoji: string;
  accentColor: string;
  isDefault: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Message
interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'advisor' | 'synthesis';
  content: string;
  modelId?: string;
  personaId?: string;
  parentMessageId?: string;
  critiqueOfMessageId?: string;
  createdBy: string;
  metadata?: string;
  createdAt: Date;
}

// Conversation
interface Conversation {
  id: string;
  projectId: string;
  title: string;
  mode: 'quick' | 'second-opinion' | 'brain-trust';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```
