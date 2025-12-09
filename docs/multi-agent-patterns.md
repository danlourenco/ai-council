# Multi-Agent Patterns for AI Applications

This document explores patterns for coordinating multiple AI agents/LLMs in a single application, with a focus on the Vercel AI SDK and alternatives.

## Table of Contents

- [Overview](#overview)
- [Our Implementation: Brain Trust](#our-implementation-brain-trust)
- [Vercel AI SDK Patterns](#vercel-ai-sdk-patterns)
- [Alternative Approaches](#alternative-approaches)
- [Protocol Landscape](#protocol-landscape)
- [Recommendations](#recommendations)
- [Resources](#resources)

---

## Overview

The "Brain Trust" feature in The Council requires multiple AI advisors (using different LLMs) to respond to a single question sequentially, followed by a synthesis. This is a classic multi-agent orchestration problem.

**Key Requirements:**

- Sequential execution (advisors respond one at a time)
- Shared context (all advisors see the original question)
- Aggregation (synthesis combines all perspectives)
- Streaming support (real-time response display)

---

## Our Implementation: Brain Trust

We implemented manual orchestration using the Vercel AI SDK's `streamText` function.

### Architecture

```
User Question
     │
     ▼
┌─────────────┐
│ Orchestrator │ (ChatView.svelte)
└─────────────┘
     │
     ├──► Advisor 1 (Claude) ──► Response 1
     │
     ├──► Advisor 2 (GPT-4o) ──► Response 2
     │
     ├──► Advisor 3 (Gemini) ──► Response 3
     │
     ▼
┌─────────────┐
│  Synthesis  │ (Claude Sonnet)
└─────────────┘
     │
     ▼
  Final Output
```

### Implementation Details

**Client-side orchestration** (`src/lib/components/chat/ChatView.svelte`):

```typescript
interface BrainTrustState {
  isActive: boolean;
  currentQuestionId: string | null;
  currentQuestionText: string;
  personaQueue: string[];        // Ordered list of advisor IDs
  currentIndex: number;          // Current advisor being queried
  completedResponses: Array<{
    personaId: string;
    messageId: string;
    content: string;
  }>;
  synthesisContent: string;
  synthesisStreaming: boolean;
  error: string | null;
}
```

**Sequential flow:**

```typescript
async function startBrainTrustFlow(questionText: string) {
  // Add user message to UI
  // ...

  // Query each advisor sequentially
  for (let i = 0; i < brainTrust.personaQueue.length; i++) {
    brainTrust.currentIndex = i;
    const personaId = brainTrust.personaQueue[i];

    const advisorResponse = await queryAdvisor(personaId, questionText, currentMessages);

    // Add response to messages, track completion
    // ...
  }

  // All advisors done - trigger synthesis
  triggerSynthesis();
}
```

**Stream parsing** (AI SDK v5 uses SSE format):

```typescript
// AI SDK v5 uses SSE format: data: {...JSON...}
if (line.startsWith('data: ')) {
  const part = JSON.parse(line.slice(6));

  switch (part.type) {
    case 'text-delta':
      responseText += part.delta;
      break;
    case 'start':
      // Extract metadata (conversationId, userMessageId)
      break;
    case 'finish':
      // Extract final metadata
      break;
  }
}
```

### Pros and Cons

**Pros:**

- Full control over execution flow
- Simple to understand and debug
- Works with any LLM provider
- No additional dependencies

**Cons:**

- Manual state management
- Custom stream parsing required
- Error handling complexity
- No built-in retry/fallback mechanisms

---

## Vercel AI SDK Patterns

The AI SDK documentation describes five workflow patterns:

### 1. Sequential (Chains)

Each step's output becomes input for the next step.

```typescript
const step1 = await generateText({ model, prompt: userInput });
const step2 = await generateText({ model, prompt: step1.text });
const step3 = await generateText({ model, prompt: step2.text });
```

**Use case:** Content pipelines, data transformation

### 2. Routing

One LLM decides which path/model to use.

```typescript
const router = await generateText({
  model: smallModel,
  prompt: `Classify this query: ${userInput}`,
});

const handler = router.text === 'complex' ? largeModel : smallModel;
const result = await generateText({ model: handler, prompt: userInput });
```

**Use case:** Cost optimization, specialized handling

### 3. Parallel

Run multiple LLMs simultaneously, aggregate results.

```typescript
const [analysis1, analysis2, analysis3] = await Promise.all([
  generateText({ model: model1, prompt }),
  generateText({ model: model2, prompt }),
  generateText({ model: model3, prompt }),
]);

const synthesis = await generateText({
  model: synthesisModel,
  prompt: `Synthesize: ${analysis1.text}, ${analysis2.text}, ${analysis3.text}`,
});
```

**Use case:** Multi-perspective analysis, consensus building

### 4. Orchestrator-Worker

A primary model coordinates specialized workers.

```typescript
const orchestrator = await generateText({
  model: orchestratorModel,
  tools: {
    delegateToExpert: tool({
      parameters: z.object({ expertType: z.string(), task: z.string() }),
      execute: async ({ expertType, task }) => {
        const expert = experts[expertType];
        return generateText({ model: expert.model, system: expert.prompt, prompt: task });
      },
    }),
  },
  prompt: userInput,
});
```

**Use case:** Complex tasks requiring multiple specializations

### 5. Evaluator-Optimizer

Quality control loops with iteration.

```typescript
let result = await generateText({ model, prompt });
let evaluation = await evaluateQuality(result.text);

while (evaluation.score < threshold && attempts < maxAttempts) {
  result = await generateText({
    model,
    prompt: `Improve this based on feedback: ${evaluation.feedback}\n\n${result.text}`,
  });
  evaluation = await evaluateQuality(result.text);
  attempts++;
}
```

**Use case:** High-quality content generation, code review

### Brain Trust Mapping

Our Brain Trust feature is essentially a **hybrid of Parallel and Orchestrator-Worker**:
- Like Parallel: Multiple models analyze the same input
- Like Orchestrator-Worker: Sequential execution with aggregation
- Added: Streaming support for real-time UI updates

---

## Alternative Approaches

### AI Orchestra

A lightweight TypeScript framework for Vercel AI SDK multi-agent orchestration.

**GitHub:** https://github.com/petrbrzek/ai-orchestra

**Features:**
- Native `streamText` integration
- Agent handoffs (Swarm-like patterns)
- State machine transitions
- Shared context management

**Example:**

```typescript
import { Orchestra } from 'ai-orchestra';

const orchestra = new Orchestra({
  agents: {
    sage: async (ctx, dispatch) => {
      const response = await streamText({
        model: claude,
        system: sagePrompt,
        messages: ctx.messages,
      });
      // Process and potentially hand off to next agent
      return { nextState: 'skeptic', context: updatedCtx };
    },
    skeptic: async (ctx, dispatch) => {
      // ...
    },
    synthesizer: async (ctx, dispatch) => {
      // Final synthesis
      return { nextState: null, context: finalCtx };
    },
  },
  initialState: 'sage',
});
```

**Pros:**
- Cleaner abstraction than manual orchestration
- Built-in state management
- Streaming support

**Cons:**
- Additional dependency
- Less mature than core SDK

### OpenAI Swarm

OpenAI's experimental multi-agent framework.

**GitHub:** https://github.com/openai/swarm

**Features:**
- Agent handoffs via function returns
- Shared conversation context
- Lightweight orchestration

**Limitation:** OpenAI-specific, not compatible with other providers

### LangGraph

LangChain's graph-based agent orchestration.

**Features:**
- Visual workflow definition
- Complex branching/looping
- Built-in persistence

**Limitation:** Heavier dependency, different paradigm than AI SDK

---

## Protocol Landscape

Three emerging protocols for agent communication:

### MCP (Model Context Protocol)

**Creator:** Anthropic (November 2024)

**Purpose:** Standardize how LLMs access tools, APIs, and external data sources.

**What it is:** JSON-RPC over HTTP for tool discovery and invocation.

**What it's NOT:** Inter-agent communication protocol.

**Adoption:** OpenAI, Google, Microsoft (2025)

**Use case:** Connecting LLMs to databases, APIs, file systems

### ACP (Agent Communication Protocol)

**Creator:** IBM Research

**Purpose:** Semantic-rich dialogue between autonomous agents.

**Features:**
- Structured negotiation
- Intent modeling
- Shared ontologies

**Status:** Research/early adoption

**Use case:** Complex multi-agent coordination with semantic understanding

### A2A (Agent2Agent Protocol)

**Creators:** Google, Microsoft

**Purpose:** Cross-platform agent interoperability.

**Features:**
- Agent capability discovery
- Secure messaging
- Platform-agnostic

**Status:** Maturing (2025)

**Use case:** Enterprise workflows across different AI platforms

### Comparison

| Protocol | Focus | Best For |
|----------|-------|----------|
| MCP | Tool/data access | Connecting LLMs to external systems |
| ACP | Semantic dialogue | Complex agent negotiations |
| A2A | Interoperability | Cross-platform workflows |

**For Brain Trust:** None of these protocols are necessary. Our use case is simpler orchestration within a single application.

---

## Recommendations

### For The Council (Current)

**Keep manual orchestration** for now:
1. Simpler architecture
2. Full control over UX (streaming, error handling)
3. No additional dependencies
4. Works with any LLM provider

### Future Considerations

**Consider AI Orchestra if:**
- Adding more complex agent handoff patterns
- Need cleaner state management
- Want Swarm-like delegation

**Consider SDK's Agent class if:**
- Adding tool-calling agents
- Need automatic loop management
- Want built-in stopping conditions

**Consider MCP if:**
- Agents need to access external tools/data
- Want standardized tool integration
- Building for ecosystem compatibility

---

## Resources

### Documentation

- [Vercel AI SDK - Workflow Patterns](https://ai-sdk.dev/docs/agents/workflows)
- [Vercel AI SDK - Agents Foundation](https://ai-sdk.dev/docs/foundations/agents)
- [Anthropic MCP Introduction](https://www.anthropic.com/news/model-context-protocol)

### Libraries

- [AI Orchestra](https://github.com/petrbrzek/ai-orchestra) - Multi-agent for Vercel AI SDK
- [OpenAI Swarm](https://github.com/openai/swarm) - Experimental multi-agent
- [Agent-MCP](https://github.com/rinadelph/Agent-MCP) - MCP-based multi-agent framework

### Articles

- [MCP, ACP, and A2A Comparison](https://camunda.com/blog/2025/05/mcp-acp-a2a-growing-world-inter-agent-communication/)
- [Building AI Agent Workflows with Vercel's AI SDK](https://www.callstack.com/blog/building-ai-agent-workflows-with-vercels-ai-sdk-a-practical-guide)

---

## Changelog

- **2024-12-08:** Initial documentation created
- **2024-12-08:** Implemented manual orchestration for Brain Trust
