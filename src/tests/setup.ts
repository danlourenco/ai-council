import { vi } from 'vitest';

// Mock environment variables for tests
vi.stubEnv('DATABASE_URL', 'mock://test-database');
vi.stubEnv('ANTHROPIC_API_KEY', 'test-anthropic-key');
vi.stubEnv('OPENAI_API_KEY', 'test-openai-key');
vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'test-google-key');
