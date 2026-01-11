// Instagram Basic Display API integration for real message sending
// Note: This requires Instagram Basic Display API access and proper app setup

export interface InstagramSession {
  userId: string;
  username: string;
  accessToken: string;
  expiresAt: Date;
}

export interface InstagramMessage {
  recipient: string;
  text: string;
  threadId?: string;
}

export class InstagramAPIClient {
  private accessToken: string;
  private baseUrl = 'https://graph.instagram.com';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  // Create or get Instagram session
  async createSession(username: string, password: string): Promise<InstagramSession> {
    try {
      // In production, this would use Instagram's OAuth flow
      // For demo, we'll simulate session creation
      const response = await fetch(`${this.baseUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      return {
        userId: data.id,
        username: data.username,
        accessToken: this.accessToken,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
      };
    } catch (error) {
      console.error('Failed to create Instagram session:', error);
      throw error;
    }
  }

  // Send direct message
  async sendMessage(message: InstagramMessage): Promise<{ success: boolean; threadId?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/me/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: message.recipient,
          text: message.text,
          thread_id: message.threadId,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        return {
          success: true,
          threadId: data.thread_id,
        };
      } else {
        return {
          success: false,
          error: data.error?.message || 'Failed to send message',
        };
      }
    } catch (error) {
      console.error('Instagram API send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get user threads (for conversation context)
  async getThreads(limit: number = 10): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/me/threads?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Failed to get threads:', error);
      return [];
    }
  }

  // Validate session is still active
  async validateSession(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

// Rate limiting helper
export class InstagramRateLimiter {
  public static readonly DAILY_LIMIT = 50; // Instagram's daily DM limit
  private static readonly HOURLY_LIMIT = 20; // Recommended hourly limit
  private static readonly MINUTE_DELAY = 60; // Minimum seconds between messages

  static getNextSendTime(lastSentTime: Date): Date {
    const now = new Date();
    const timeDiff = now.getTime() - lastSentTime.getTime();
    const minDelay = this.MINUTE_DELAY * 1000; // 60 seconds in ms
    
    if (timeDiff < minDelay) {
      return new Date(lastSentTime.getTime() + minDelay);
    }
    
    // Check hourly limits
    const hourAgo = new Date(now.getTime() - 3600000);
    if (lastSentTime > hourAgo) {
      // If we sent in the last hour, add more delay
      return new Date(now.getTime() + (this.MINUTE_DELAY * 2000)); // 2 minutes
    }
    
    return now;
  }

  static canSendMessage(lastSentTime: Date, dailyCount: number): boolean {
    const now = new Date();
    const today = now.toDateString();
    
    // Check if we've hit daily limit
    if (dailyCount >= this.DAILY_LIMIT) {
      return false;
    }
    
    // Check minimum delay
    const timeDiff = now.getTime() - lastSentTime.getTime();
    return timeDiff >= this.MINUTE_DELAY * 1000;
  }
}
