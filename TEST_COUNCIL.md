# Testing the `/api/council` Endpoint

This document explains how to test the new AI SDK 6 ToolLoopAgent council orchestration.

## Quick Browser Test

1. **Start the dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Login to the app**:
   - Open http://localhost:5173 in your browser
   - Login with your credentials

3. **Open Browser DevTools**:
   - Press F12 or right-click → Inspect
   - Go to the "Console" tab

4. **Run this test code** in the console:

```javascript
// Test the /api/council endpoint
async function testCouncil() {
  console.log('🧪 Testing /api/council endpoint...\n');

  const question = 'Should I lease or buy an electric vehicle?';
  console.log('Question:', question);

  try {
    const response = await fetch('/api/council', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });

    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error:', error);
      return;
    }

    // Parse streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let toolCalls = [];
    let synthesis = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const jsonStr = trimmed.slice(6);
        if (jsonStr === '[DONE]') {
          console.log('✅ Stream completed');
          continue;
        }

        try {
          const event = JSON.parse(jsonStr);

          if (event.type === 'tool-invocation') {
            console.log(`🔧 ${event.toolName} called`);
            toolCalls.push(event.toolName);
          }

          if (event.type === 'tool-result') {
            console.log(`✅ ${event.toolName} completed`);
            if (event.result?.response) {
              console.log(`   Response preview: ${event.result.response.slice(0, 80)}...`);
            }
          }

          if (event.type === 'output' && event.output) {
            console.log('\n📊 Synthesis received!');
            synthesis = event.output;
          }
        } catch (e) {}
      }
    }

    // Verify
    console.log('\n🔍 Verification:');
    console.log('  Tools called:', toolCalls);
    console.log('  Expected order:', toolCalls[0] === 'consultSage' &&
                                      toolCalls[1] === 'consultSkeptic' &&
                                      toolCalls[2] === 'consultStrategist');
    console.log('  Synthesis generated:', !!synthesis);

    if (synthesis) {
      console.log('\n📋 Synthesis summary:');
      console.log('  Points of agreement:', synthesis.pointsOfAgreement?.length || 0);
      console.log('  Key tensions:', synthesis.keyTensions?.length || 0);
      console.log('  Next steps:', synthesis.recommendedNextSteps?.length || 0);
      console.log('  Raw responses:', synthesis.rawAdvisorResponses?.length || 0);
    }

    console.log('\n✅ Test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCouncil();
```

## What to Look For

### ✅ Success Indicators:
- Status: 200
- Three tool calls in order: `consultSage` → `consultSkeptic` → `consultStrategist`
- Each tool completes successfully
- Synthesis object is generated with:
  - `pointsOfAgreement` (array)
  - `keyTensions` (array)
  - `recommendedNextSteps` (array)
  - `rawAdvisorResponses` (array with 3 items)

### ❌ Failure Indicators:
- Status: 401 (not logged in)
- Status: 500 (server error)
- Tools called in wrong order
- Missing tool calls
- No synthesis generated
- Empty `rawAdvisorResponses`

## Expected Behavior

The ToolLoopAgent should:
1. **Call `consultSage`** with just the user question
2. **Call `consultSkeptic`** with the question AND The Sage's response
3. **Call `consultStrategist`** with the question AND both prior responses
4. **Generate synthesis** that references all three perspectives

## Debugging Tips

If the test fails:

1. **Check server logs** - Look for `[council]` prefixed logs in the terminal
2. **Verify API keys** - Make sure all three provider API keys are set
3. **Check personas** - Verify The Sage, The Skeptic, and The Strategist exist in the database
4. **Look for errors** - The agent should log detailed errors if tools fail

## Alternative: Manual UI Test

1. Go to http://localhost:5173/chat
2. Switch to "Brain Trust" mode
3. Select at least 2 advisors
4. Ask a question
5. Watch for three sequential advisor responses + synthesis

Note: This won't work until Phase 5 (ChatView update) is complete.
