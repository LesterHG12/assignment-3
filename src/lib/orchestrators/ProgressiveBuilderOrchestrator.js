import { geminiGenerate } from '../gemini.js';
import { CreativeHumoristAgent } from '../agents/CreativeHumoristAgent.js';
import { ComedyProducerAgent } from '../agents/ComedyProducerAgent.js';
import { ComedyResearcherAgent } from '../agents/ComedyResearcherAgent.js';

const SELECTION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    agent: { type: 'STRING' },
    reasons: { type: 'STRING' },
    stage: { type: 'STRING' }
  },
  required: ['agent', 'reasons', 'stage']
};

export class ProgressiveBuilderOrchestrator {
  constructor() {
    this.name = 'progressive_builder';
    this.agents = {
      creative_humorist: new CreativeHumoristAgent(),
      comedy_producer: new ComedyProducerAgent(),
      comedy_researcher: new ComedyResearcherAgent()
    };
  }

  async _respondWith(agentName, contents) {
    const agent = this.agents[agentName] || this.agents.creative_humorist;
    const res = await agent.respond(contents);
    return res?.text || '';
  }

  async orchestrate(contents) {
    // Create routing prompt that analyzes conversation stage and user intent
    const routingPrompt = `You are a comedy writing assistant router that decides which specialist should respond based on the conversation stage and user needs.

Available agents:
- "creative_humorist": Creative humorist who creates diverse joke types naturally (anti-jokes, elaborate setups, simple observations)
- "comedy_producer": Comedy producer who focuses on audience analysis, venue guidance, and performance advice
- "comedy_researcher": Comedy researcher who analyzes cultural psychology, social context, and deeper humor mechanisms

Conversation stages and routing logic:
1. BRAINSTORMING (→ creative_humorist): User is asking for joke ideas, wants to create new content, or is in early creative phase
2. PERFORMANCE (→ comedy_producer): User wants to know about audience, venue, or performance considerations
3. ANALYSIS (→ comedy_researcher): User wants to understand cultural context, psychological factors, or deeper social aspects of humor

Routing heuristics:
- Keywords like "help me write", "give me a joke", "create", "brainstorm" → creative_humorist
- Keywords like "audience", "venue", "performance", "where to perform", "who will laugh" → comedy_producer  
- Keywords like "cultural context", "psychology", "why do people laugh", "social factors", "research" → comedy_researcher
- Early in conversation (few messages) → creative_humorist (default to creative mode)
- User seems frustrated or asking for help → creative_humorist (encouragement)
- User seems to want performance or audience guidance → comedy_producer
- User wants cultural or psychological analysis → comedy_researcher

Analyze the conversation and choose the most appropriate agent. Consider:
- The user's latest message content and intent
- The overall conversation flow and stage
- What type of help the user seems to need most right now

Output strictly as JSON:
{
  "agent": "creative_humorist",
  "reasons": "User is asking for joke ideas and seems to be in brainstorming phase",
  "stage": "BRAINSTORMING"
}`;

    try {
      // Get routing decision from Gemini
      const routingResult = await geminiGenerate({
        contents,
        systemPrompt: routingPrompt,
        config: { 
          responseMimeType: 'application/json',
          responseSchema: SELECTION_SCHEMA 
        }
      });

      let selectedAgent = 'creative_humorist';
      let reasons = 'Defaulted to creative humorist for brainstorming';
      let stage = 'BRAINSTORMING';

      try {
        const parsed = JSON.parse(routingResult.text || '{}');
        selectedAgent = parsed?.agent || 'creative_humorist';
        reasons = parsed?.reasons || reasons;
        stage = parsed?.stage || stage;
      } catch (parseError) {
        console.warn('Failed to parse routing response, using defaults:', parseError);
      }

      // Get response from selected agent
      const agentResponse = await this._respondWith(selectedAgent, contents);

      // Create frame set showing the routing decision
      const frameSet = {
        frames: {
          selected_agent: {
            value: selectedAgent,
            rationale: [reasons]
          },
          conversation_stage: {
            value: stage,
            rationale: [`Routed to ${selectedAgent} based on user intent and conversation flow`]
          },
          routing_approach: {
            value: 'progressive_building',
            rationale: ['Routes to appropriate specialist based on conversation stage and user needs']
          }
        }
      };

      return {
        assistantMessage: agentResponse || 'Unable to generate response',
        frameSet,
        agent: selectedAgent,
        reasons: `${reasons} (Stage: ${stage})`
      };

    } catch (error) {
      console.error('Error in ProgressiveBuilderOrchestrator:', error);
      // Fallback to creative humorist if routing fails
      const fallbackResponse = await this._respondWith('creative_humorist', contents);
      
      return {
        assistantMessage: fallbackResponse || 'I apologize, but I encountered an issue. Let me help you brainstorm some jokes!',
        frameSet: { 
          frames: { 
            error: { value: 'routing_failed', rationale: [String(error)] },
            fallback: { value: 'creative_humorist', rationale: ['Used creative humorist as fallback'] }
          } 
        },
        agent: 'creative_humorist',
        reasons: 'Fallback to creative humorist due to routing error'
      };
    }
  }
}
