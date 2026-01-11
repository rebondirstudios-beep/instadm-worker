export interface User {
  id: string
  clerkId: string
  email: string
  createdAt: Date
  updatedAt: Date
  subscription?: Subscription
}

export interface Subscription {
  id: string
  userId: string
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  plan: 'starter' | 'pro' | 'enterprise'
  status: 'active' | 'canceled' | 'past_due'
  currentPeriodEnd?: Date
  createdAt: Date
  updatedAt: Date
}

export interface InstagramAccount {
  id: string
  userId: string
  username: string
  password: string
  proxy?: string
  isActive: boolean
  lastLogin?: Date
  createdAt: Date
  updatedAt: Date
}

export interface Campaign {
  id: string
  userId: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  messageTemplateId?: string
  targetCriteria?: TargetCriteria
  schedule?: CampaignSchedule
  settings?: CampaignSettings
  createdAt: Date
  updatedAt: Date
  messageTemplate?: MessageTemplate
  accounts: CampaignAccount[]
  messages: Message[]
  analytics: Analytics[]
}

export interface TargetCriteria {
  hashtags?: string[]
  locations?: string[]
  followerCount?: {
    min?: number
    max?: number
  }
  followingCount?: {
    min?: number
    max?: number
  }
  accountAge?: {
    min?: number // days
    max?: number // days
  }
  hasProfilePic?: boolean
  isBusinessAccount?: boolean
  isVerified?: boolean
  gender?: 'male' | 'female' | 'any'
  language?: string[]
}

export interface CampaignSchedule {
  type: 'immediate' | 'scheduled' | 'recurring'
  startDate?: Date
  endDate?: Date
  timezone?: string
  dailyLimits?: {
    startHour: number // 0-23
    endHour: number // 0-23
    messagesPerHour: number
    messagesPerDay: number
  }
  daysOfWeek?: number[] // 0-6 (Sunday-Saturday)
}

export interface CampaignSettings {
  delayBetweenMessages?: number // seconds
  useSpinText?: boolean
  randomizeMessageOrder?: boolean
  skipAlreadyContacted?: boolean
  enableFollowUp?: boolean
  followUpDelay?: number // hours
  followUpMessage?: string
  enableProxyRotation?: boolean
  rateLimiting?: {
    messagesPerMinute: number
    messagesPerHour: number
    messagesPerDay: number
  }
}

export interface CampaignAccount {
  id: string
  campaignId: string
  instagramAccountId: string
  createdAt: Date
  campaign: Campaign
  instagramAccount: InstagramAccount
}

export interface MessageTemplate {
  id: string
  userId: string
  name: string
  content: string
  variables?: TemplateVariable[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TemplateVariable {
  name: string
  type: 'text' | 'number' | 'date' | 'custom'
  defaultValue?: string
  required?: boolean
  options?: string[] // for custom type
}

export interface Message {
  id: string
  campaignId: string
  instagramAccountId: string
  recipientUsername: string
  content: string
  status: 'pending' | 'sent' | 'failed' | 'read'
  sentAt?: Date
  error?: string
  createdAt: Date
  campaign: Campaign
  instagramAccount: InstagramAccount
}

export interface Analytics {
  id: string
  userId: string
  campaignId?: string
  metric: string
  value: number
  metadata?: Record<string, any>
  date: Date
  createdAt: Date
  user: User
  campaign?: Campaign
}

export interface Proxy {
  id: string
  host: string
  port: number
  username?: string
  password?: string
  type: 'http' | 'https' | 'socks4' | 'socks5'
  isActive: boolean
  lastUsed?: Date
  createdAt: Date
  updatedAt: Date
}

export interface Lead {
  id: string
  userId: string
  username: string
  fullName?: string
  bio?: string
  followerCount: number
  followingCount: number
  postsCount: number
  isVerified: boolean
  isBusinessAccount: boolean
  profilePicUrl?: string
  lastScraped: Date
  source: string // where this lead was found
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface CampaignStats {
  totalMessages: number
  sentMessages: number
  failedMessages: number
  readMessages: number
  successRate: number
  averageResponseTime?: number
  costPerMessage?: number
  totalCost?: number
}

export interface DashboardStats {
  totalCampaigns: number
  activeCampaigns: number
  totalMessages: number
  sentMessages: number
  successRate: number
  totalAccounts: number
  activeAccounts: number
  totalLeads: number
  newLeadsToday: number
}
