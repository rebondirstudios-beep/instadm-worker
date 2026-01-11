import { InstagramService } from './instagram'
import { RateLimiter, AntiDetectionMeasures, RateLimitConfig } from './rateLimiter'
import { Campaign, InstagramAccount, Message } from '@/types'

export interface CampaignExecutionResult {
  campaignId: string
  totalMessages: number
  successfulMessages: number
  failedMessages: number
  duration: number // milliseconds
  errors: string[]
}

export class CampaignExecutor {
  private campaign: Campaign
  private accounts: InstagramAccount[]
  private rateLimiters: Map<string, RateLimiter>
  private results: CampaignExecutionResult

  constructor(campaign: Campaign, accounts: InstagramAccount[]) {
    this.campaign = campaign
    this.accounts = accounts
    this.rateLimiters = new Map()
    this.results = {
      campaignId: campaign.id,
      totalMessages: 0,
      successfulMessages: 0,
      failedMessages: 0,
      duration: 0,
      errors: [],
    }
  }

  // Execute the entire campaign
  async execute(): Promise<CampaignExecutionResult> {
    const startTime = Date.now()
    
    try {
      console.log(`Starting campaign execution: ${this.campaign.name}`)
      
      // Initialize rate limiters for each account
      await this.initializeRateLimiters()
      
      // Get target users
      const targetUsers = await this.getTargetUsers()
      console.log(`Found ${targetUsers.length} target users`)
      
      // Execute messages across all accounts
      await this.executeMessages(targetUsers)
      
      console.log(`Campaign completed: ${this.results.successfulMessages}/${this.results.totalMessages} messages sent successfully`)
      
    } catch (error) {
      console.error('Campaign execution failed:', error)
      this.results.errors.push(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      this.results.duration = Date.now() - startTime
    }
    
    return this.results
  }

  // Initialize rate limiters for each account
  private async initializeRateLimiters(): Promise<void> {
    for (const account of this.accounts) {
      const config: RateLimitConfig = {
        messagesPerMinute: this.campaign.settings?.rateLimiting?.messagesPerMinute || 5,
        messagesPerHour: this.campaign.settings?.rateLimiting?.messagesPerHour || 50,
        messagesPerDay: this.campaign.settings?.rateLimiting?.messagesPerDay || 200,
        delayBetweenMessages: this.campaign.settings?.delayBetweenMessages || 30,
        workingHours: {
          start: this.campaign.schedule?.dailyLimits?.startHour || 9,
          end: this.campaign.schedule?.dailyLimits?.endHour || 21,
        },
        timezone: this.campaign.schedule?.timezone || 'UTC',
      }
      
      this.rateLimiters.set(account.id, new RateLimiter(account, config))
    }
  }

  // Get target users based on campaign criteria
  private async getTargetUsers(): Promise<any[]> {
    if (!this.campaign.targetCriteria) return []
    
    const allUsers: any[] = []
    
    // Search by hashtags
    if (this.campaign.targetCriteria.hashtags) {
      for (const hashtag of this.campaign.targetCriteria.hashtags) {
        const users = await this.searchUsersByHashtag(hashtag)
        allUsers.push(...users)
      }
    }
    
    // Search by locations
    if (this.campaign.targetCriteria.locations) {
      for (const location of this.campaign.targetCriteria.locations) {
        const users = await this.searchUsersByLocation(location)
        allUsers.push(...users)
      }
    }
    
    // Apply filters
    const filteredUsers = this.applyFilters(allUsers)
    
    // Remove duplicates and limit results
    const uniqueUsers = this.removeDuplicates(filteredUsers)
    return uniqueUsers.slice(0, 1000) // Limit to 1000 users per campaign
  }

  // Search users by hashtag
  private async searchUsersByHashtag(hashtag: string): Promise<any[]> {
    const account = this.accounts[0] // Use first account for searching
    const instagramService = new InstagramService(account)
    
    try {
      await instagramService.authenticate()
      return await instagramService.searchUsers(hashtag, this.campaign.targetCriteria)
    } catch (error) {
      console.error(`Error searching users for hashtag ${hashtag}:`, error)
      return []
    }
  }

  // Search users by location
  private async searchUsersByLocation(location: string): Promise<any[]> {
    const account = this.accounts[0] // Use first account for searching
    const instagramService = new InstagramService(account)
    
    try {
      await instagramService.authenticate()
      return await instagramService.searchUsers(location, this.campaign.targetCriteria)
    } catch (error) {
      console.error(`Error searching users for location ${location}:`, error)
      return []
    }
  }

  // Apply filters to user list
  private applyFilters(users: any[]): any[] {
    if (!this.campaign.targetCriteria) return users
    
    return users.filter(user => {
      const criteria = this.campaign.targetCriteria!
      
      // Follower count filter
      if (criteria.followerCount) {
        if (criteria.followerCount.min && user.followerCount < criteria.followerCount.min) return false
        if (criteria.followerCount.max && user.followerCount > criteria.followerCount.max) return false
      }
      
      // Following count filter
      if (criteria.followingCount) {
        if (criteria.followingCount.min && user.followingCount < criteria.followingCount.min) return false
        if (criteria.followingCount.max && user.followingCount > criteria.followingCount.max) return false
      }
      
      // Verification filter
      if (criteria.isVerified && !user.isVerified) return false
      
      // Business account filter
      if (criteria.isBusinessAccount && !user.isBusinessAccount) return false
      
      // Profile picture filter
      if (criteria.hasProfilePic && !user.profilePicUrl) return false
      
      return true
    })
  }

  // Remove duplicate users
  private removeDuplicates(users: any[]): any[] {
    const seen = new Set()
    return users.filter(user => {
      if (seen.has(user.username)) return false
      seen.add(user.username)
      return true
    })
  }

  // Execute messages to all target users
  private async executeMessages(targetUsers: any[]): Promise<void> {
    const messagesPerAccount = Math.ceil(targetUsers.length / this.accounts.length)
    
    // Distribute users across accounts
    for (let i = 0; i < this.accounts.length; i++) {
      const account = this.accounts[i]
      const rateLimiter = this.rateLimiters.get(account.id)!
      
      const startIndex = i * messagesPerAccount
      const endIndex = Math.min(startIndex + messagesPerAccount, targetUsers.length)
      const accountUsers = targetUsers.slice(startIndex, endIndex)
      
      // Execute messages for this account
      await this.executeMessagesForAccount(account, rateLimiter, accountUsers)
    }
  }

  // Execute messages for a specific account
  private async executeMessagesForAccount(
    account: InstagramAccount, 
    rateLimiter: RateLimiter, 
    users: any[]
  ): Promise<void> {
    const instagramService = new InstagramService(account)
    
    try {
      // Authenticate account
      const isAuthenticated = await instagramService.authenticate()
      if (!isAuthenticated) {
        throw new Error(`Failed to authenticate account: ${account.username}`)
      }
      
      console.log(`Executing ${users.length} messages with account: ${account.username}`)
      
      for (const user of users) {
        try {
          // Check if we can send a message
          const canSend = await rateLimiter.canSendMessage()
          
          if (!canSend.canSend) {
            if (canSend.reason === 'Outside working hours') {
              console.log(`Account ${account.username} is outside working hours, skipping...`)
              break // Stop for this account
            }
            
            // Wait until we can send
            await rateLimiter.waitForNextSlot()
          }
          
          // Check safety measures
          const safetyMeasures = AntiDetectionMeasures.getSafetyMeasures(rateLimiter)
          if (safetyMeasures.shouldPause) {
            console.log(`Pausing account ${account.username}: ${safetyMeasures.warningMessage}`)
            break
          }
          
          // Personalize message
          const message = this.personalizeMessage(user)
          
          // Check for spammy content
          if (AntiDetectionMeasures.isSpammyMessage(message)) {
            console.warn(`Skipping spammy message to ${user.username}`)
            continue
          }
          
          // Simulate human typing delay
          await AntiDetectionMeasures.simulateTyping(message)
          
          // Send the message
          const success = await instagramService.sendMessage(user.username, message)
          
          // Record the attempt
          rateLimiter.recordMessage(success)
          this.results.totalMessages++
          
          if (success) {
            this.results.successfulMessages++
            console.log(`✓ Message sent to ${user.username} via ${account.username}`)
          } else {
            this.results.failedMessages++
            console.log(`✗ Failed to send message to ${user.username} via ${account.username}`)
          }
          
          // Add random delay between messages
          const delay = safetyMeasures.recommendedDelay * 1000
          await AntiDetectionMeasures.addHumanDelay(delay * 0.8, delay * 1.2)
          
        } catch (error) {
          console.error(`Error sending message to ${user.username}:`, error)
          this.results.failedMessages++
          this.results.errors.push(`Failed to send to ${user.username}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          
          // Record failed attempt
          rateLimiter.recordMessage(false)
          
          // Add extra delay after errors
          await AntiDetectionMeasures.addHumanDelay(5000, 10000)
        }
      }
      
    } catch (error) {
      console.error(`Account ${account.username} failed:`, error)
      this.results.errors.push(`Account ${account.username} failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Personalize message for a specific user
  private personalizeMessage(user: any): string {
    let message = this.campaign.messageTemplate?.content || 'Hello!'
    
    // Replace placeholders
    message = message.replace(/\{username\}/g, user.username || '')
    message = message.replace(/\{fullName\}/g, user.fullName || user.username || '')
    message = message.replace(/\{followerCount\}/g, user.followerCount?.toString() || '0')
    message = message.replace(/\{followingCount\}/g, user.followingCount?.toString() || '0')
    message = message.replace(/\{postsCount\}/g, user.postsCount?.toString() || '0')
    message = message.replace(/\{bio\}/g, user.bio || '')
    
    // Add spin text if enabled
    if (this.campaign.settings?.useSpinText) {
      message = this.addSpinText(message)
    }
    
    return message
  }

  // Add spin text variations
  private addSpinText(text: string): string {
    const spins: { [key: string]: string[] } = {
      'hi': ['hello', 'hey', 'hi there', 'good day'],
      'thanks': ['thank you', 'appreciate it', 'thanks a lot', 'grateful'],
      'awesome': ['great', 'amazing', 'fantastic', 'wonderful', 'excellent'],
      'interested': ['curious', 'fascinated', 'intrigued', 'keen'],
      'check': ['look at', 'see', 'view', 'examine'],
    }
    
    let result = text
    Object.entries(spins).forEach(([original, alternatives]) => {
      const regex = new RegExp(`\\b${original}\\b`, 'gi')
      if (regex.test(result)) {
        const replacement = alternatives[Math.floor(Math.random() * alternatives.length)]
        result = result.replace(regex, replacement)
      }
    })
    
    return result
  }
}

// Campaign scheduler for managing multiple campaigns
export class CampaignScheduler {
  private activeCampaigns: Map<string, CampaignExecutor> = new Map()
  private isRunning = false

  // Add a campaign to the scheduler
  addCampaign(campaign: Campaign, accounts: InstagramAccount[]): void {
    const executor = new CampaignExecutor(campaign, accounts)
    this.activeCampaigns.set(campaign.id, executor)
  }

  // Remove a campaign from the scheduler
  removeCampaign(campaignId: string): void {
    this.activeCampaigns.delete(campaignId)
  }

  // Start the scheduler
  async start(): Promise<void> {
    if (this.isRunning) return
    
    this.isRunning = true
    console.log('Campaign scheduler started')
    
    while (this.isRunning) {
      await this.processCampaigns()
      await new Promise(resolve => setTimeout(resolve, 60000)) // Check every minute
    }
  }

  // Stop the scheduler
  stop(): void {
    this.isRunning = false
    console.log('Campaign scheduler stopped')
  }

  // Process all active campaigns
  private async processCampaigns(): Promise<void> {
    for (const [campaignId, executor] of this.activeCampaigns) {
      try {
        // Check if campaign should run based on schedule
        if (this.shouldRunCampaign(executor['campaign'])) {
          console.log(`Executing campaign: ${campaignId}`)
          const result = await executor.execute()
          
          // Log results
          console.log(`Campaign ${campaignId} completed:`, {
            total: result.totalMessages,
            successful: result.successfulMessages,
            failed: result.failedMessages,
            duration: result.duration,
          })
        }
      } catch (error) {
        console.error(`Error processing campaign ${campaignId}:`, error)
      }
    }
  }

  // Check if a campaign should run based on its schedule
  private shouldRunCampaign(campaign: Campaign): boolean {
    // Check campaign status
    if (campaign.status !== 'active') return false
    
    // Check schedule type
    if (!campaign.schedule) return false
    
    const now = new Date()
    
    switch (campaign.schedule.type) {
      case 'immediate':
        return true // Always run immediate campaigns
      
      case 'scheduled':
        if (campaign.schedule.startDate && now < new Date(campaign.schedule.startDate)) return false
        if (campaign.schedule.endDate && now > new Date(campaign.schedule.endDate)) return false
        return true
      
      case 'recurring':
        // Check if we're within the scheduled time window
        const currentHour = now.getHours()
        const dailyLimits = campaign.schedule.dailyLimits
        
        if (!dailyLimits) return false
        
        return currentHour >= dailyLimits.startHour && currentHour <= dailyLimits.endHour
      
      default:
        return false
    }
  }

  // Get status of all campaigns
  getStatus(): Array<{
    campaignId: string
    campaignName: string
    status: string
    isActive: boolean
  }> {
    return Array.from(this.activeCampaigns.entries()).map(([id, executor]) => ({
      campaignId: id,
      campaignName: executor['campaign'].name,
      status: executor['campaign'].status,
      isActive: this.activeCampaigns.has(id),
    }))
  }
}
