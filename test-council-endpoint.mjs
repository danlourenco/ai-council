#!/usr/bin/env node
/**
 * Test script for /api/council endpoint
 *
 * This tests the AI SDK 6 ToolLoopAgent orchestration by calling the council endpoint
 * and parsing the agent stream response.
 *
 * Usage: node test-council-endpoint.mjs
 */

const COUNCIL_URL = 'http://localhost:5173/api/council';
const TEST_QUESTION = 'Should I lease or buy an electric vehicle?';

console.log('🧪 Testing /api/council endpoint...\n');
console.log('Question:', TEST_QUESTION);
console.log('\n---\n');

try {
	const response = await fetch(COUNCIL_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			// Note: This will fail without auth, but we can see the error type
		},
		body: JSON.stringify({
			question: TEST_QUESTION
		})
	});

	console.log('Status:', response.status, response.statusText);
	console.log('Headers:', Object.fromEntries(response.headers.entries()));
	console.log('\n---\n');

	if (!response.ok) {
		const error = await response.text();
		console.error('❌ Error response:', error);

		if (response.status === 401) {
			console.log('\n💡 Expected: This endpoint requires authentication.');
			console.log('To test properly, you need to:');
			console.log('1. Start dev server: npm run dev');
			console.log('2. Login in browser at http://localhost:5173');
			console.log('3. Copy session cookie from browser DevTools');
			console.log('4. Add cookie to this script\'s fetch headers\n');
		}
		process.exit(1);
	}

	// Check if response is streaming
	const contentType = response.headers.get('content-type');
	console.log('Content-Type:', contentType);

	if (!response.body) {
		console.error('❌ No response body');
		process.exit(1);
	}

	// Parse the streaming response
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	let eventCount = 0;
	let toolCalls = [];
	let synthesis = null;

	console.log('\n📡 Streaming response:\n');

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
				console.log('✅ Stream completed\n');
				continue;
			}

			try {
				const event = JSON.parse(jsonStr);
				eventCount++;

				// Log tool invocations (advisor calls)
				if (event.type === 'tool-invocation') {
					console.log(`🔧 Tool Call #${toolCalls.length + 1}: ${event.toolName}`);
					console.log(`   Args:`, JSON.stringify(event.args, null, 2).slice(0, 100) + '...');
					toolCalls.push(event);
				}

				// Log tool results (advisor responses)
				if (event.type === 'tool-result') {
					console.log(`✅ Tool Result: ${event.toolName}`);
					if (event.result?.response) {
						console.log(`   Response: ${event.result.response.slice(0, 100)}...`);
					}
				}

				// Log output (synthesis)
				if (event.type === 'output' && event.output) {
					console.log('\n📊 Synthesis Generated:');
					synthesis = event.output;
					console.log('   Points of Agreement:', synthesis.pointsOfAgreement?.length || 0);
					console.log('   Key Tensions:', synthesis.keyTensions?.length || 0);
					console.log('   Recommended Steps:', synthesis.recommendedNextSteps?.length || 0);
					console.log('   Advisor Responses:', synthesis.rawAdvisorResponses?.length || 0);
				}

				// Log other event types
				if (!['tool-invocation', 'tool-result', 'output'].includes(event.type)) {
					console.log(`📝 Event: ${event.type}`);
				}

			} catch (e) {
				// Ignore parse errors for partial chunks
			}
		}
	}

	console.log('\n---\n');
	console.log('📈 Summary:');
	console.log('  Total events:', eventCount);
	console.log('  Tool calls:', toolCalls.length);
	console.log('  Synthesis:', synthesis ? '✅ Generated' : '❌ Missing');

	// Verify expected behavior
	console.log('\n🔍 Verification:');

	const expectedTools = ['consultSage', 'consultSkeptic', 'consultStrategist'];
	const actualTools = toolCalls.map(t => t.toolName);

	for (const expected of expectedTools) {
		const found = actualTools.includes(expected);
		console.log(`  ${found ? '✅' : '❌'} ${expected}: ${found ? 'Called' : 'Not called'}`);
	}

	// Check order
	const inOrder =
		actualTools.indexOf('consultSage') < actualTools.indexOf('consultSkeptic') &&
		actualTools.indexOf('consultSkeptic') < actualTools.indexOf('consultStrategist');
	console.log(`  ${inOrder ? '✅' : '❌'} Sequential order: ${inOrder ? 'Correct' : 'Wrong'}`);

	// Check synthesis
	const hasSynthesis = !!synthesis;
	console.log(`  ${hasSynthesis ? '✅' : '❌'} Synthesis: ${hasSynthesis ? 'Generated' : 'Missing'}`);

	if (hasSynthesis) {
		console.log('\n📋 Synthesis Details:');
		console.log('  Points of Agreement:');
		synthesis.pointsOfAgreement?.forEach((p, i) => {
			console.log(`    ${i + 1}. ${p}`);
		});

		console.log('\n  Key Tensions:');
		synthesis.keyTensions?.forEach((t, i) => {
			console.log(`    ${i + 1}. ${t.topic}`);
		});

		console.log('\n  Recommended Next Steps:');
		synthesis.recommendedNextSteps?.forEach((s, i) => {
			console.log(`    ${i + 1}. ${s}`);
		});
	}

	console.log('\n✅ Test completed successfully!');

} catch (error) {
	console.error('\n❌ Test failed:', error.message);
	console.error(error.stack);
	process.exit(1);
}
