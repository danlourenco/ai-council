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
