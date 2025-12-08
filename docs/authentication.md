# Authentication System

The Council uses Better Auth with WebAuthn passkeys for secure, passwordless authentication.

## Overview

```mermaid
graph TB
    subgraph "Authentication Methods"
        Passkey[Passkey/WebAuthn]
    end

    subgraph "Better Auth"
        Handler[Auth Handler]
        Session[Session Manager]
        Adapter[Drizzle Adapter]
    end

    subgraph "Storage"
        D1[(D1 Database)]
    end

    Passkey --> Handler
    Handler --> Session
    Handler --> Adapter
    Session --> D1
    Adapter --> D1
```

## Passkey Authentication Flow

### Registration

```mermaid
sequenceDiagram
    participant U as User
    participant B as Browser
    participant S as Server
    participant D as Database
    participant A as Authenticator

    U->>B: Click "Register"
    B->>S: POST /api/auth/sign-up/email
    S->>D: Create user record
    D-->>S: User created
    S-->>B: User created, proceed to passkey

    B->>S: GET /api/auth/passkey/generate-registration-options
    S->>D: Get user
    S-->>B: Registration options (challenge, rpId)

    B->>A: navigator.credentials.create()
    A->>U: Biometric/PIN prompt
    U->>A: Authenticate
    A-->>B: Credential (publicKey, attestation)

    B->>S: POST /api/auth/passkey/verify-registration
    S->>S: Verify attestation
    S->>D: Store passkey credential
    D-->>S: Stored
    S-->>B: Success + session token
```

### Authentication

```mermaid
sequenceDiagram
    participant U as User
    participant B as Browser
    participant S as Server
    participant D as Database
    participant A as Authenticator

    U->>B: Click "Sign in with Passkey"
    B->>S: GET /api/auth/passkey/generate-authentication-options
    S-->>B: Authentication options (challenge)

    B->>A: navigator.credentials.get()
    A->>U: Biometric/PIN prompt
    U->>A: Authenticate
    A-->>B: Assertion (signature, authenticatorData)

    B->>S: POST /api/auth/passkey/verify-authentication
    S->>D: Get passkey by credentialId
    D-->>S: Passkey record
    S->>S: Verify signature with publicKey
    S->>D: Update counter, create session
    D-->>S: Session created
    S-->>B: Success + session cookie
```

## Configuration

### Server-side (`src/lib/server/auth.ts`)

```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { passkey } from '@better-auth/passkey';

export function createAuth(d1: D1Database, baseURL: string) {
  const db = drizzle(d1, { schema });

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications
      }
    }),
    baseURL,
    plugins: [
      passkey({
        rpID: baseURL.includes('localhost') ? 'localhost' : new URL(baseURL).hostname,
        rpName: 'The Council',
        origin: baseURL
      })
    ],
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24       // Update daily
    }
  });
}
```

### Client-side (`src/lib/auth-client.ts`)

```typescript
import { createAuthClient } from 'better-auth/svelte';
import { passkeyClient } from '@better-auth/passkey/client';

export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
  plugins: [passkeyClient()]
});

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  passkey: { registerPasskey, authenticateWithPasskey }
} = authClient;
```

## Session Management

### Server Hooks (`src/hooks.server.ts`)

```typescript
export const handle: Handle = async ({ event, resolve }) => {
  // Initialize database
  const db = createDb(event.platform!.env.DB);
  event.locals.db = db;

  // Initialize auth and get session
  const auth = createAuth(event.platform!.env.DB, event.url.origin);
  const session = await auth.api.getSession({
    headers: event.request.headers
  });

  event.locals.session = session?.session ?? null;
  event.locals.user = session?.user ?? null;

  return resolve(event);
};
```

### Protected Routes

Routes under `(app)` group require authentication:

```typescript
// src/routes/(app)/+layout.server.ts
export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login');
  }
  return { user: locals.user };
};
```

## Security Considerations

### WebAuthn Benefits
- **Phishing-resistant**: Credentials bound to origin
- **No password storage**: Only public keys stored server-side
- **Biometric protection**: Device-level authentication
- **Replay protection**: Challenge-response with counter

### Session Security
- HTTP-only cookies
- 30-day expiration
- Daily session refresh
- IP/User-Agent tracking

### D1/SQLite Constraints
- Using Better Auth's SQLite adapter
- Scrypt hashing avoided (Cloudflare Workers timeout)
- Passkey-only authentication recommended

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/sign-up/email` | Create account with email |
| GET | `/api/auth/passkey/generate-registration-options` | Get WebAuthn registration challenge |
| POST | `/api/auth/passkey/verify-registration` | Verify and store passkey |
| GET | `/api/auth/passkey/generate-authentication-options` | Get WebAuthn auth challenge |
| POST | `/api/auth/passkey/verify-authentication` | Verify passkey and create session |
| POST | `/api/auth/sign-out` | End session |
| GET | `/api/auth/session` | Get current session |
