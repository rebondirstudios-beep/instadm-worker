// AI-powered humanization using Perplexity
// Analyzes message patterns and generates humanized variations

export type MessageContext = 'first_message' | 'follow_up' | 'reminder';

export interface AIHumanizationResult {
  originalMessage: string;
  humanizedMessage: string;
  delay: number;
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high';
  suggestedFollowUp?: string;
}

export interface MessagePattern {
  id: string;
  pattern: string;
  frequency: number;
  lastUsed: Date;
  successRate: number;
}

export class AIHumanizer {
  private apiKey: string;
  private messagePatterns: Map<string, MessagePattern> = new Map();
  private recipientHistory: Map<string, Date[]> = new Map();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Analyze message content and determine humanization strategy
  private async analyzeMessage(message: string, recipient: string): Promise<AIHumanizationResult> {
    try {
      const prompt = `
        Analyze this Instagram message for humanization:
        
        Original message: "${message}"
        Recipient: ${recipient}
        
        Consider:
        1. Relationship context (have we messaged them before?)
        2. Time of day (business hours vs personal time)
        3. Message length and complexity
        4. Emotional tone and intent
        5. Cultural/linguistic patterns
        6. Risk level for detection
        
        Provide:
        - Humanized version of the message
        - Optimal delay before sending (in seconds)
        - Reasoning for your changes
        - Risk assessment (low/medium/high)
        - Suggested follow-up if appropriate
        
        Format response as JSON with these fields:
        {
          "originalMessage": "...",
          "humanizedMessage": "...",
          "delay": ...,
          "reasoning": "...",
          "riskLevel": "low|medium|high",
          "suggestedFollowUp": "..."
        }
      `;

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at Instagram message humanization and anti-detection. Your task is to analyze messages and provide humanized versions that avoid detection while maintaining effectiveness. Consider Instagram\'s detection algorithms, user behavior patterns, and best practices for natural communication. Always provide reasoning for your suggestions.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || '';
      
      try {
        const parsed = JSON.parse(content);
        return {
          originalMessage: message,
          humanizedMessage: parsed.humanizedMessage || message,
          delay: parsed.delay || 30000,
          reasoning: parsed.reasoning || 'Standard humanization applied',
          riskLevel: parsed.riskLevel || 'medium',
          suggestedFollowUp: parsed.suggestedFollowUp,
        };
      } catch {
        // Fallback if JSON parsing fails
        return {
          originalMessage: message,
          humanizedMessage: message,
          delay: 30000,
          reasoning: 'Failed to parse AI response',
          riskLevel: 'medium',
        };
      }
    } catch (error) {
      console.error('AI humanization error:', error);
      return {
        originalMessage: message,
        humanizedMessage: message,
        delay: 60000, // Longer delay on error
        reasoning: 'AI service unavailable',
        riskLevel: 'high',
      };
    }
  }

  // Learn from successful message patterns
  recordSuccess(message: string, recipient: string, delay: number, success: boolean): void {
    const pattern: MessagePattern = {
      id: `${recipient}-${Date.now()}`,
      pattern: message.substring(0, 50), // First 50 chars
      frequency: 1,
      lastUsed: new Date(),
      successRate: success ? 1 : 0,
    };
    
    this.messagePatterns.set(pattern.id, pattern);
    
    // Clean old patterns (keep last 100 per recipient)
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    for (const [id, pattern] of this.messagePatterns.entries()) {
      if (id.startsWith(recipient) && pattern.lastUsed.getTime() < cutoff) {
        this.messagePatterns.delete(id);
      }
    }
  }

  // Get best practices for message type
  private async getBestPractices(messageType: 'greeting' | 'followup' | 'promotion' | 'question'): Promise<string> {
    const prompt = `
      What are the best practices for Instagram ${messageType} messages to avoid detection and maximize engagement?
      Consider:
      1. Natural language patterns
      2. Optimal timing and frequency
      3. Personalization techniques
      4. Avoid spam triggers
      5. Cultural and contextual awareness
      Provide specific, actionable advice.
    `;

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'You are an Instagram marketing expert. Provide specific, actionable advice for message types.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
        }),
      });

      const data = await response.json();
      return data?.choices?.[0]?.message?.content || 'Standard practices apply';
    } catch (error) {
      console.error('Best practices error:', error);
      return 'Standard practices apply';
    }
  }

  // Generate contextual message variations
  async generateContextualVariations(
    message: string,
    recipient: string,
    context: MessageContext
  ): Promise<string[]> {
    const recipientHistory = this.recipientHistory.get(recipient) || [];
    const messageCount = recipientHistory.length;
    
    let contextPrompt = '';
    if (context === 'first_message') {
      contextPrompt = `Generate 3 natural variations of this first message to "${recipient}":
        Original: "${message}"
        This is message #${messageCount + 1} to this recipient.
        
        Make each variation:
        - Slightly different emotional tone (friendly, professional, casual)
        - Different opening (hi, hey, hello)
        - Different call to action or question
        - Vary length slightly
        - Add/remove appropriate emojis
        - Consider time of day
        
        Return only the variations, no explanations.`;
    } else if (context === 'follow_up') {
      contextPrompt = `Generate a natural follow-up message for "${recipient}" based on previous conversation.
        Previous messages: ${recipientHistory.slice(-3).join(', ')}
        
        Make it:
        - Reference previous conversation naturally
        - Sound like a continuation
        - Not repetitive
        - Appropriate for the relationship stage
        - 1-2 sentences max
      `;
    } else {
      contextPrompt = `Generate a gentle reminder message for "${recipient}".
        Keep it:
        - Friendly and casual
        - Not pushy
        - 1-2 sentences
        - Include a soft call to action if appropriate
      `;
    }

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at Instagram messaging and conversation management. Generate natural, contextually appropriate messages.'
            },
            {
              role: 'user',
              content: contextPrompt
            }
          ],
          temperature: 0.4,
        }),
      });

      const data = await response.json();
      const variationsText = data?.choices?.[0]?.message?.content || '';
      
      try {
        // Extract variations (assuming they're numbered or separated by newlines)
        const variations = variationsText
          .split(/\n\d+\.\s*/)
          .filter((v: string) => v.trim())
          .slice(0, 3);
        
        return variations;
      } catch {
        return [message]; // Fallback to original
      }
    } catch (error) {
      console.error('Contextual variations error:', error);
      return [message]; // Fallback to original
    }
  }

  // Analyze recipient's activity patterns
  async analyzeRecipientBehavior(recipient: string): Promise<{
    messageFrequency: number;
    bestTimeToSend: string;
    preferredTone: string;
    engagementLevel: 'low' | 'medium' | 'high';
  }> {
    // This would analyze recipient's response patterns, online times, etc.
    // For now, return basic analysis
    const recipientHistory = this.recipientHistory.get(recipient) || [];
    const messageFrequency = recipientHistory.length;
    
    // Determine best time to send based on frequency
    const hour = new Date().getHours();
    let bestTimeToSend = '9 AM - 12 PM'; // Default business hours
    let preferredTone = 'professional';
    
    if (messageFrequency === 0) {
      bestTimeToSend = 'Any time is good for first contact';
      preferredTone = 'friendly';
    } else if (messageFrequency > 5) {
      bestTimeToSend = 'Evening hours (6-9 PM) to avoid fatigue';
      preferredTone = 'casual';
    }
    
    return {
      messageFrequency,
      bestTimeToSend,
      preferredTone,
      engagementLevel: messageFrequency > 10 ? 'high' : messageFrequency > 5 ? 'medium' : 'low',
    };
  }

  // Get adaptive delay based on multiple factors
  async getAdaptiveDelay(
    message: string,
    recipient: string,
    timeOfDay: number,
    messageLength: number,
    recentInteractions: number
  ): Promise<number> {
    const recipientAnalysis = await this.analyzeRecipientBehavior(recipient);
    
    // Base delay calculation
    let delay = 30000; // 30 seconds base
    
    // Adjust based on recipient engagement
    switch (recipientAnalysis.engagementLevel) {
      case 'high':
        delay *= 2; // 1 minute for highly engaged users
        break;
      case 'medium':
        delay *= 1.5; // 45 seconds for medium engagement
        break;
      case 'low':
        // Keep base delay for new recipients
        break;
    }
    
    // Adjust based on message length
    if (messageLength > 100) {
      delay *= 1.2; // Longer messages need more time
    }
    
    // Adjust based on time of day
    const hour = timeOfDay;
    if (hour >= 22 || hour <= 6) { // 10 PM - 6 AM
      delay *= 1.5; // 50% longer delays during off-hours
    }
    
    // Adjust based on recent interactions
    if (recentInteractions > 3) {
      delay *= 0.8; // 20% faster for active conversations
    }
    
    return Math.floor(delay);
  }

  // Main AI humanization function
  async humanizeWithAI(
    message: string,
    recipient: string,
    campaignContext?: string
  ): Promise<AIHumanizationResult> {
    // Get contextual variations
    const context: MessageContext =
      campaignContext === 'follow_up' || campaignContext === 'reminder' || campaignContext === 'first_message'
        ? campaignContext
        : 'first_message';
    const variations = await this.generateContextualVariations(message, recipient, context);
    
    // Choose best variation based on AI analysis
    let bestVariation = message;
    let minDelay = 30000;
    
    for (const variation of variations) {
      const analysis = await this.analyzeMessage(variation, recipient);
      
      // Prefer variations with lower risk and appropriate delay
      if (analysis.riskLevel === 'low' && analysis.delay < minDelay) {
        bestVariation = variation;
        minDelay = analysis.delay;
      }
    }
    
    return {
      originalMessage: message,
      humanizedMessage: bestVariation,
      delay: minDelay,
      reasoning: `AI selected variation with ${minDelay/1000}s delay based on risk assessment`,
      riskLevel: 'low',
      suggestedFollowUp: variations[1] !== message ? variations[1] : undefined,
    };
  }
}
