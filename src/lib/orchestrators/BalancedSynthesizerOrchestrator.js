import { geminiGenerate } from '../gemini.js';
import { CreativeHumoristAgent } from '../agents/CreativeHumoristAgent.js';
import { ComedyProducerAgent } from '../agents/ComedyProducerAgent.js';
import { ComedyResearcherAgent } from '../agents/ComedyResearcherAgent.js';

export class BalancedSynthesizerOrchestrator {
  constructor() {
    this.name = 'balanced_synthesizer';
    this.agents = {
      creative_humorist: new CreativeHumoristAgent(),
      comedy_producer: new ComedyProducerAgent(),
      comedy_researcher: new ComedyResearcherAgent()
    };
  }

  async orchestrate(contents) {
    try {
      // Get responses from all three agents in parallel
      const [humoristResponse, producerResponse, researcherResponse] = await Promise.all([
        this.agents.creative_humorist.respond(contents),
        this.agents.comedy_producer.respond(contents),
        this.agents.comedy_researcher.respond(contents)
      ]);

      // Create synthesis prompt that blends all perspectives
      const synthesisPrompt = `You are a comedy workshop moderator who synthesizes feedback from three different perspectives on joke writing. Your job is to create a balanced, helpful response that incorporates insights from all three voices without losing their unique perspectives.

You have received three different responses to the user's message:

CREATIVE HUMORIST PERSPECTIVE (Diverse joke creation, natural conversation):
${humoristResponse.text || 'No response'}

COMEDY PRODUCER PERSPECTIVE (Audience analysis, venue guidance, performance advice):
${producerResponse.text || 'No response'}

COMEDY RESEARCHER PERSPECTIVE (Cultural psychology, social context, deeper analysis):
${researcherResponse.text || 'No response'}

Your task is to synthesize these perspectives into a coherent, balanced response that:
1. Acknowledges the value of each perspective
2. Highlights key insights from each voice
3. Creates a constructive overall message
4. Maintains the distinct personalities while presenting them as a unified workshop experience
5. Provides actionable next steps that consider all viewpoints

Structure your response as if you're moderating a comedy workshop where all three perspectives are valuable contributors to the creative process.`;

      // Generate synthesized response
      const synthesisResult = await geminiGenerate({
        contents,
        systemPrompt: synthesisPrompt
      });

      // Create frame set showing all perspectives were considered
      const frameSet = {
        frames: {
          synthesis_approach: {
            value: 'balanced_multi_perspective',
            rationale: ['Incorporated creative humor diversity', 'Included audience and venue guidance', 'Added cultural and psychological analysis']
          },
          perspectives_used: {
            value: ['creative_humorist', 'comedy_producer', 'comedy_researcher'],
            rationale: ['All three agents provided input for comprehensive feedback']
          }
        }
      };

      return {
        assistantMessage: synthesisResult.text || 'Unable to synthesize responses',
        frameSet,
        agent: 'balanced_synthesizer',
        reasons: 'Synthesized feedback from creative humorist, comedy producer, and comedy researcher perspectives',
        individualResponses: {
          creative_humorist: humoristResponse.text,
          comedy_producer: producerResponse.text,
          comedy_researcher: researcherResponse.text
        }
      };

    } catch (error) {
      console.error('Error in BalancedSynthesizerOrchestrator:', error);
      return {
        assistantMessage: 'I apologize, but I encountered an issue synthesizing the different perspectives. Please try again.',
        frameSet: { frames: { error: { value: 'synthesis_failed', rationale: [String(error)] } } },
        agent: 'balanced_synthesizer',
        reasons: 'Error during synthesis process'
      };
    }
  }
}
