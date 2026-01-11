import { InstagramAccount, Campaign } from '@/types'

export interface RateLimitConfig {
  messagesPerMinute: number
  messagesPerHour: number
  messagesPerDay: number
  delayBetweenMessages: number // seconds
  workingHours: {
    start: number // 0-23
    end: number // 0-23
  }
  timezone: string
}

export class RateLimiter {
  private account: InstagramAccount
  private config: RateLimitConfig
  private messageHistory: Array<{ timestamp: number; success: boolean }> = []
  private lastMessageTime = 0

  constructor(account: InstagramAccount, config: RateLimitConfig) {
    this.account = account
    this.config = config
  }

  // Check if we can send a message right now
  async canSendMessage(): Promise<{ canSend: boolean; reason?: string; waitTime?: number }> {
    const now = Date.now()
    
    // Check if we're within working hours
    if (!this.isWithinWorkingHours(now)) {
      return {
        canSend: false,
        reason: 'Outside working hours',
        waitTime: this.getTimeUntilNextWorkingPeriod(now),
      }
    }

    // Check daily limit
    const todayMessages = this.getMessagesCount(now, 24 * 60 * 60 * 1000)
    if (todayMessages >= this.config.messagesPerDay) {
      return {
        canSend: false,
        reason: 'Daily limit reached',
        waitTime: this.getTimeUntilNextDay(now),
      }
    }

    // Check hourly limit
    const hourMessages = this.getMessagesCount(now, 60 * 60 * 1000)
    if (hourMessages >= this.config.messagesPerHour) {
      return {
        canSend: false,
        reason: 'Hourly limit reached',
        waitTime: this.getTimeUntilNextHour(now),
      }
    }

    // Check minute limit
    const minuteMessages = this.getMessagesCount(now, 60 * 1000)
    if (minuteMessages >= this.config.messagesPerMinute) {
      return {
        canSend: false,
        reason: 'Minute limit reached',
        waitTime: 60 - (Math.floor(now / 60000) % 60),
      }
    }

    // Check delay between messages
    const timeSinceLastMessage = now - this.lastMessageTime
    if (timeSinceLastMessage < this.config.delayBetweenMessages * 1000) {
      return {
        canSend: false,
        reason: 'Too soon since last message',
        waitTime: Math.ceil((this.config.delayBetweenMessages * 1000 - timeSinceLastMessage) / 1000),
      }
    }

    return { canSend: true }
  }

  // Wait until we can send a message
  async waitForNextSlot(): Promise<void> {
    const check = await this.canSendMessage()
    if (!check.canSend && check.waitTime) {
      // Add some randomness to avoid predictable patterns
      const randomDelay = Math.random() * 2000 // 0-2 seconds random delay
      const totalWait = (check.waitTime * 1000) + randomDelay
      
      console.log(`Rate limiting: waiting ${Math.ceil(totalWait / 1000)}s for account ${this.account.username}`)
      await new Promise(resolve => setTimeout(resolve, totalWait))
    }
  }

  // Record a message attempt
  recordMessage(success: boolean): void {
    this.messageHistory.push({
      timestamp: Date.now(),
      success,
    })
    
    // Keep only last 24 hours of history
    const cutoff = Date.now() - (24 * 60 * 60 * 1000)
    this.messageHistory = this.messageHistory.filter(msg => msg.timestamp > cutoff)
    
    this.lastMessageTime = Date.now()
  }

  // Get success rate for recent messages
  getSuccessRate(timeWindowMs: number = 60 * 60 * 1000): number {
    const cutoff = Date.now() - timeWindowMs
    const recentMessages = this.messageHistory.filter(msg => msg.timestamp > cutoff)
    
    if (recentMessages.length === 0) return 100
    
    const successCount = recentMessages.filter(msg => msg.success).length
    return (successCount / recentMessages.length) * 100
  }

  // Check if account should be paused due to low success rate
  shouldPauseForLowSuccessRate(): boolean {
    const successRate = this.getSuccessRate()
    const recentMessages = this.getMessagesCount(Date.now(), 60 * 60 * 1000)
    
    // Pause if success rate is below 70% and we've sent at least 10 messages in the last hour
    return successRate < 70 && recentMessages >= 10
  }

  // Get recommended delay based on success rate
  getRecommendedDelay(): number {
    const successRate = this.getSuccessRate()
    
    if (successRate < 50) {
      return Math.max(this.config.delayBetweenMessages * 3, 120) // At least 2 minutes
    } else if (successRate < 70) {
      return this.config.delayBetweenMessages * 2
    } else if (successRate < 85) {
      return this.config.delayBetweenMessages * 1.5
    }
    
    return this.config.delayBetweenMessages
  }

  private isWithinWorkingHours(timestamp: number): boolean {
    const date = new Date(timestamp)
    const currentHour = date.getHours()
    
    return currentHour >= this.config.workingHours.start && 
           currentHour <= this.config.workingHours.end
  }

  private getMessagesCount(timestamp: number, windowMs: number): number {
    const cutoff = timestamp - windowMs
    return this.messageHistory.filter(msg => msg.timestamp > cutoff).length
  }

  private getTimeUntilNextWorkingPeriod(timestamp: number): number {
    const date = new Date(timestamp)
    const currentHour = date.getHours()
    
    if (currentHour < this.config.workingHours.start) {
      return (this.config.workingHours.start - currentHour) * 60 * 60
    } else if (currentHour > this.config.workingHours.end) {
      return ((24 - currentHour) + this.config.workingHours.start) * 60 * 60
    }
    
    return 0
  }

  private getTimeUntilNextDay(timestamp: number): number {
    const tomorrow = new Date(timestamp)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    
    return Math.floor((tomorrow.getTime() - timestamp) / 1000)
  }

  private getTimeUntilNextHour(timestamp: number): number {
    const nextHour = new Date(timestamp)
    nextHour.setMinutes(0, 0, 0)
    nextHour.setHours(nextHour.getHours() + 1)
    
    return Math.floor((nextHour.getTime() - timestamp) / 1000)
  }

  // Get current usage statistics
  getUsageStats(): {
    messagesToday: number
    messagesThisHour: number
    messagesThisMinute: number
    successRate: number
    isWithinWorkingHours: boolean
    recommendedDelay: number
  } {
    const now = Date.now()
    
    return {
      messagesToday: this.getMessagesCount(now, 24 * 60 * 60 * 1000),
      messagesThisHour: this.getMessagesCount(now, 60 * 60 * 1000),
      messagesThisMinute: this.getMessagesCount(now, 60 * 1000),
      successRate: this.getSuccessRate(),
      isWithinWorkingHours: this.isWithinWorkingHours(now),
      recommendedDelay: this.getRecommendedDelay(),
    }
  }
}

export class AntiDetectionMeasures {
  private static readonly USER_AGENTS = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    'Mozilla/5.0 (Android 12; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0',
  ]

  private static readonly SCREEN_RESOLUTIONS = [
    { width: 375, height: 667 },  // iPhone SE
    { width: 390, height: 844 },  // iPhone 12
    { width: 428, height: 926 },  // iPhone 12 Pro Max
    { width: 768, height: 1024 }, // iPad
    { width: 360, height: 640 },  // Android
  ]

  // Generate random user agent
  static getRandomUserAgent(): string {
    return this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)]
  }

  // Generate random screen resolution
  static getRandomScreenResolution(): { width: number; height: number } {
    return this.SCREEN_RESOLUTIONS[Math.floor(Math.random() * this.SCREEN_RESOLUTIONS.length)]
  }

  // Add random delay to simulate human behavior
  static async addHumanDelay(minMs: number = 1000, maxMs: number = 5000): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  // Generate random typing speed
  static getRandomTypingSpeed(): number {
    // Characters per second (human typing speed is typically 40-80 WPM)
    return Math.random() * (80 - 40) + 40
  }

  // Simulate typing delay for a message
  static async simulateTyping(message: string): Promise<void> {
    const typingSpeed = this.getRandomTypingSpeed()
    const messageLength = message.length
    const typingTime = (messageLength / typingSpeed) * 1000 // Convert to milliseconds
    
    // Add some randomness
    const randomFactor = 0.8 + Math.random() * 0.4 // 0.8x to 1.2x the base time
    const totalDelay = typingTime * randomFactor
    
    await new Promise(resolve => setTimeout(resolve, totalDelay))
  }

  // Check if message looks spammy
  static isSpammyMessage(message: string): boolean {
    const spamIndicators = [
      /click here/i,
      /buy now/i,
      /limited time/i,
      /act fast/i,
      /free money/i,
      /make money/i,
      /guaranteed/i,
      /!!!{3,}/, // Multiple exclamation marks
      /\$(\d{1,3}(,\d{3})*(\.\d+)?)\s*(million|billion|thousand)/i,
    ]

    return spamIndicators.some(indicator => indicator.test(message))
  }

  // Generate random session ID
  static generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  // Check if account activity looks suspicious
  static isSuspiciousActivity(rateLimiter: RateLimiter): boolean {
    const stats = rateLimiter.getUsageStats()
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      stats.successRate < 30, // Very low success rate
      stats.messagesThisMinute > 10, // Too many messages per minute
      stats.messagesThisHour > 200, // Too many messages per hour
    ]

    return suspiciousPatterns.some(pattern => pattern)
  }

  // Get recommended safety measures based on account health
  static getSafetyMeasures(rateLimiter: RateLimiter): {
    recommendedDelay: number
    shouldPause: boolean
    warningMessage?: string
  } {
    const stats = rateLimiter.getUsageStats()
    const successRate = stats.successRate

    if (successRate < 30) {
      return {
        recommendedDelay: 300, // 5 minutes
        shouldPause: true,
        warningMessage: 'Very low success rate. Account may be at risk.',
      }
    } else if (successRate < 50) {
      return {
        recommendedDelay: 180, // 3 minutes
        shouldPause: false,
        warningMessage: 'Low success rate. Consider reducing activity.',
      }
    } else if (successRate < 70) {
      return {
        recommendedDelay: 90, // 1.5 minutes
        shouldPause: false,
        warningMessage: 'Moderate success rate. Monitor closely.',
      }
    }

    return {
      recommendedDelay: rateLimiter.getRecommendedDelay(),
      shouldPause: false,
    }
  }
}
