// Advanced humanization techniques to avoid Instagram detection
// Implements realistic delays, message variation, session rotation, and behavioral patterns

export interface HumanizationConfig {
  minDelay: number;      // Minimum delay between messages (ms)
  maxDelay: number;      // Maximum delay between messages (ms)
  typingDelay: number;    // Simulated typing time (ms)
  readDelay: number;     // Time before "marking as read" (ms)
  sessionRotation: boolean; // Rotate between sessions
  messageVariation: boolean; // Vary message content slightly
  warmupTime: number;    // Initial warmup period (ms)
  activeHours: { start: number; end: number }; // Active hours for sending
}

export class InstagramHumanizer {
  public readonly config: HumanizationConfig;
  private messageHistory = new Map<string, number[]>();
  private sessionStats = new Map<string, { lastUsed: Date; messageCount: number }>();

  constructor(config: Partial<HumanizationConfig> = {}) {
    this.config = {
      minDelay: 30000,      // 30 seconds minimum
      maxDelay: 180000,     // 3 minutes maximum
      typingDelay: 2000,     // 2 seconds typing simulation
      readDelay: 5000,      // 5 seconds before marking read
      sessionRotation: true,
      messageVariation: true,
      warmupTime: 300000,   // 5 minutes warmup
      activeHours: { start: 9, end: 21 }, // 9 AM - 9 PM
      ...config,
    };
  }

  // Generate realistic typing delay
  private getTypingDelay(): number {
    const baseDelay = this.config.typingDelay;
    const variation = Math.random() * 1000; // ±1 second variation
    return baseDelay + variation;
  }

  // Generate realistic message delay
  private getMessageDelay(): number {
    const { minDelay, maxDelay } = this.config;
    const baseDelay = Math.random() * (maxDelay - minDelay) + minDelay;
    
    // Add gaussian distribution for more natural timing
    const gaussian = () => {
      let u = 0, v = 0;
      while (u === 0) u = Math.random(), v = Math.random();
      return u + v * 1.3 - 0.6;
    };
    
    const factor = Math.abs(gaussian());
    return Math.floor(baseDelay * (0.5 + factor));
  }

  // Vary message content slightly
  private varyMessage(originalMessage: string): string {
    if (!this.config.messageVariation) return originalMessage;

    const variations = [
      // Add/remove common greetings
      (msg: string) => msg.replace(/^(hi|hey|hello)/i, Math.random() > 0.5 ? 'Hey' : 'Hi'),
      
      // Vary punctuation
      (msg: string) => msg.replace(/[.!?]+/g, punct => {
        const punctuations = ['.', '!', '?', '...'];
        return punctuations[Math.floor(Math.random() * punctuations.length)];
      }),
      
      // Add/remove emojis occasionally
      (msg: string) => Math.random() > 0.7 ? 
        msg + (Math.random() > 0.5 ? ' 👋' : ' 👍') : 
        msg.replace(/[👋👍]/g, ''),
      
      // Vary capitalization slightly
      (msg: string) => {
        const words = msg.split(' ');
        return words.map((word, index) => {
          if (index === 0 && Math.random() > 0.3) {
            return word.toLowerCase();
          }
          if (index === words.length - 1 && Math.random() > 0.3) {
            return word.toUpperCase();
          }
          return word;
        }).join(' ');
      },
    ];

    return variations[Math.floor(Math.random() * variations.length)](originalMessage);
  }

  // Check if current time is within active hours
  private isActiveHours(): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const { start, end } = this.config.activeHours;
    
    if (start <= end) {
      return currentHour >= start && currentHour < end;
    } else {
      return currentHour >= start || currentHour < end;
    }
  }

  // Get best session for message (load balancing)
  private getBestSession(accountId: string): string {
    const stats = this.sessionStats.get(accountId);
    
    if (!stats) {
      return accountId; // Default to first session
    }
    
    // Choose session with lowest usage
    const sessions = Array.from(this.sessionStats.keys())
      .filter(id => id.startsWith(accountId))
      .sort((a, b) => {
        const statsA = this.sessionStats.get(a)!;
        const statsB = this.sessionStats.get(b)!;
        return statsA.messageCount - statsB.messageCount;
      });
    
    return sessions[0] || accountId;
  }

  // Calculate optimal send time
  private getOptimalSendTime(accountId: string, recipientUsername: string): Date {
    const now = new Date();
    const stats = this.sessionStats.get(accountId);
    
    // Check if we've messaged this recipient before
    const messageHistory = this.messageHistory.get(recipientUsername) || [];
    const lastMessageTime = messageHistory.length > 0 ? 
      new Date(Math.max(...messageHistory)) : 
      new Date(0);
    
    // Avoid messaging the same person too frequently
    const minInterval = 5 * 60 * 1000; // 5 minutes minimum
    const timeSinceLastMessage = now.getTime() - lastMessageTime.getTime();
    
    if (timeSinceLastMessage < minInterval) {
      // Add extra delay if we messaged them recently
      return new Date(now.getTime() + minInterval);
    }
    
    // Add base delay
    const baseDelay = this.getMessageDelay();
    
    // Add extra delay during peak hours (more human-like)
    const currentHour = now.getHours();
    const isPeakHour = currentHour >= 19 && currentHour <= 21; // 7-9 PM
    const peakMultiplier = isPeakHour ? 1.5 : 1.0;
    
    return new Date(now.getTime() + (baseDelay * peakMultiplier));
  }

  // Simulate human typing pattern
  async simulateTyping(accountId: string): Promise<void> {
    const typingTime = this.getTypingDelay();
    
    return new Promise(resolve => {
      setTimeout(resolve, typingTime);
    });
  }

  // Main humanization function
  async humanizeSend(
    accountId: string,
    recipientUsername: string,
    originalMessage: string,
    threadId?: string
  ): Promise<{
    delay: number;
    variedMessage: string;
    sendTime: Date;
    sessionId: string;
  }> {
    // Check active hours
    if (!this.isActiveHours()) {
      const nextActiveHour = this.config.activeHours.start;
      const waitTime = new Date();
      waitTime.setHours(nextActiveHour);
      waitTime.setMinutes(0);
      waitTime.setSeconds(0);
      
      return {
        delay: waitTime.getTime() - Date.now(),
        variedMessage: originalMessage,
        sendTime: waitTime,
        sessionId: this.getBestSession(accountId),
      };
    }

    // Get optimal send time
    const sendTime = this.getOptimalSendTime(accountId, recipientUsername);
    const delay = sendTime.getTime() - Date.now();
    
    // Vary the message
    const variedMessage = this.varyMessage(originalMessage);
    
    // Update message history
    const history = this.messageHistory.get(recipientUsername) || [];
    history.push(Date.now());
    this.messageHistory.set(recipientUsername, history);
    
    // Update session stats
    const stats = this.sessionStats.get(accountId) || { lastUsed: new Date(), messageCount: 0 };
    stats.lastUsed = new Date();
    stats.messageCount++;
    this.sessionStats.set(accountId, stats);
    
    // Simulate typing before sending (optional but realistic)
    if (Math.random() > 0.7) {
      await this.simulateTyping(accountId);
    }
    
    return {
      delay,
      variedMessage,
      sendTime,
      sessionId: this.getBestSession(accountId),
    };
  }

  // Clean old message history (keep last 10 messages per recipient)
  cleanupHistory(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [recipient, timestamps] of this.messageHistory.entries()) {
      const recentTimestamps = timestamps.filter(t => t > cutoff);
      if (recentTimestamps.length > 0) {
        this.messageHistory.set(recipient, recentTimestamps);
      } else {
        this.messageHistory.delete(recipient);
      }
    }
  }

  // Get session statistics
  getSessionStats(accountId: string): { lastUsed: Date; messageCount: number } | null {
    return this.sessionStats.get(accountId) || null;
  }

  // Reset session statistics (for new day/session)
  resetSessionStats(accountId: string): void {
    this.sessionStats.delete(accountId);
  }
}
