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
  console.log('⏳ This will take ~30-60 seconds (agent runs 3 advisors sequentially)...\n');

  try {
    const startTime = Date.now();
    const response = await fetch('/api/council', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Response received in ${elapsed}s`);
    console.log('Status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error:', error);
      return;
    }

    // Parse JSON response
    const data = await response.json();
    console.log('\n📦 Response data:', data);

    const synthesis = data.synthesis;

    // Verify
    console.log('\n🔍 Verification:');
    console.log('  Conversation ID:', data.conversationId);
    console.log('  User Message ID:', data.userMessageId);
    console.log('  Synthesis generated:', !!synthesis);

    if (synthesis) {
      console.log('\n📋 Synthesis summary:');
      console.log('  Points of agreement:', synthesis.pointsOfAgreement?.length || 0);
      synthesis.pointsOfAgreement?.forEach((p, i) => {
        console.log(`    ${i + 1}. ${p}`);
      });

      console.log('\n  Key tensions:', synthesis.keyTensions?.length || 0);
      synthesis.keyTensions?.forEach((t, i) => {
        console.log(`    ${i + 1}. ${t.topic}`);
      });

      console.log('\n  Next steps:', synthesis.recommendedNextSteps?.length || 0);
      synthesis.recommendedNextSteps?.forEach((s, i) => {
        console.log(`    ${i + 1}. ${s}`);
      });

      console.log('\n  Advisor responses:', synthesis.rawAdvisorResponses?.length || 0);
      synthesis.rawAdvisorResponses?.forEach((a) => {
        console.log(`    - ${a.advisorName}: ${a.response.slice(0, 60)}...`);
      });

      // Verify all three advisors responded
      const advisorNames = synthesis.rawAdvisorResponses?.map(a => a.advisorName) || [];
      const hasAllAdvisors =
        advisorNames.includes('The Sage') &&
        advisorNames.includes('The Skeptic') &&
        advisorNames.includes('The Strategist');

      console.log('\n  All advisors responded:', hasAllAdvisors ? '✅' : '❌');
    }

    console.log('\n✅ Test completed successfully!');
    console.log(`\n💡 View the conversation at: /chat/${data.conversationId}`);

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
