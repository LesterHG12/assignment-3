import { json } from '@sveltejs/kit';
import { BalancedSynthesizerOrchestrator } from '$lib/orchestrators/BalancedSynthesizerOrchestrator.js';
import { ProgressiveBuilderOrchestrator } from '$lib/orchestrators/ProgressiveBuilderOrchestrator.js';

/**
 * Handle chat POST requests for a single-turn pipeline execution.
 *
 * Parameters: ({ request }) SvelteKit request wrapper.
 * Returns: JSON response with pipeline output or error.
 */
export async function POST({ request }) {
  const body = await request.json();
  const { history, orchestratorType = 'progressive' } = body || {};

  if (!Array.isArray(history)) {
    return json({ error: 'history array is required' }, { status: 400 });
  }

  try {
    // Choose orchestrator based on type parameter
    let orchestrator;
    switch (orchestratorType) {
      case 'balanced':
        orchestrator = new BalancedSynthesizerOrchestrator();
        break;
      case 'progressive':
      default:
        orchestrator = new ProgressiveBuilderOrchestrator();
        break;
    }
    
    const contents = history.map((m) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] }));
    
    const { assistantMessage, frameSet, agent, reasons, individualResponses } = await orchestrator.orchestrate(contents);
    
    return json({ 
      assistantMessage, 
      replierInput: { 
        frameSet, 
        contextCount: history.length, 
        agent, 
        reasons,
        orchestratorType,
        individualResponses // Only present for balanced synthesizer
      } 
    });
  } catch (err) {
    const msg = String(err?.message || err || '').toLowerCase();
    if (msg.includes('gemini_api_key') || msg.includes('gemini') || msg.includes('api key')) {
      return json({ error: 'Gemini API key not found' }, { status: 400 });
    }
    return json({ error: 'Pipeline error', details: String(err?.message || err) }, { status: 500 });
  }
}
