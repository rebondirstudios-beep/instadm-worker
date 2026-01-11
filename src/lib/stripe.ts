import Stripe from 'stripe'

// Initialize Stripe with your secret key
// In production, this should come from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export interface CreateCheckoutSessionParams {
  userId: string
  priceId: string
  successUrl: string
  cancelUrl: string
  customerEmail?: string
}

export interface CreateCustomerParams {
  userId: string
  email: string
  name?: string
}

export interface SubscriptionPlan {
  id: string
  name: string
  priceId: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  limits: {
    accounts: number
    dailyMessages: number
    templates: number
    analytics: 'basic' | 'advanced' | 'custom'
    support: 'email' | 'priority' | 'dedicated'
  }
}

// Subscription plans configuration
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter_monthly',
    amount: 2900, // $29.00 in cents
    currency: 'usd',
    interval: 'month',
    features: [
      '1 Instagram Account',
      '100 DMs per day',
      'Basic Analytics',
      'Email Support',
      'Message Templates',
      'Lead Generation',
    ],
    limits: {
      accounts: 1,
      dailyMessages: 100,
      templates: 10,
      analytics: 'basic',
      support: 'email',
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
    amount: 5900, // $59.00 in cents
    currency: 'usd',
    interval: 'month',
    features: [
      '5 Instagram Accounts',
      '500 DMs per day',
      'Advanced Analytics',
      'Priority Support',
      'Message Templates',
      'Lead Generation',
      'A/B Testing',
      'Custom Scheduling',
    ],
    limits: {
      accounts: 5,
      dailyMessages: 500,
      templates: 50,
      analytics: 'advanced',
      support: 'priority',
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_monthly',
    amount: 12900, // $129.00 in cents
    currency: 'usd',
    interval: 'month',
    features: [
      'Unlimited Instagram Accounts',
      'Unlimited DMs per day',
      'Custom Analytics Dashboard',
      'Dedicated Support',
      'Message Templates',
      'Lead Generation',
      'A/B Testing',
      'Custom Scheduling',
      'API Access',
      'Custom Integrations',
      'White Label Options',
      'Dedicated Account Manager',
    ],
    limits: {
      accounts: -1, // Unlimited
      dailyMessages: -1, // Unlimited
      templates: -1, // Unlimited
      analytics: 'custom',
      support: 'dedicated',
    },
  },
]

// Create a Stripe customer
export async function createCustomer(params: CreateCustomerParams): Promise<Stripe.Customer> {
  try {
    const customer = await stripe.customers.create({
      email: params.email,
      name: params.name,
      metadata: {
        userId: params.userId,
      },
    })
    return customer
  } catch (error) {
    console.error('Error creating Stripe customer:', error)
    throw error
  }
}

// Create a checkout session
export async function createCheckoutSession(params: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
  try {
    const session = await stripe.checkout.sessions.create({
      customer_email: params.customerEmail,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: {
        userId: params.userId,
      },
      subscription_data: {
        metadata: {
          userId: params.userId,
        },
      },
    })
    return session
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw error
  }
}

// Create a portal session for managing subscriptions
export async function createPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })
    return session
  } catch (error) {
    console.error('Error creating portal session:', error)
    throw error
  }
}

// Retrieve subscription details
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    return subscription
  } catch (error) {
    console.error('Error retrieving subscription:', error)
    throw error
  }
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId)
    return subscription
  } catch (error) {
    console.error('Error canceling subscription:', error)
    throw error
  }
}

// Update subscription
export async function updateSubscription(subscriptionId: string, priceId: string): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: (await stripe.subscriptions.retrieve(subscriptionId)).items.data[0].id,
          price: priceId,
        },
      ],
    })
    return subscription
  } catch (error) {
    console.error('Error updating subscription:', error)
    throw error
  }
}

// Handle webhook events
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      const checkoutSession = event.data.object as Stripe.Checkout.Session
      await handleCheckoutSessionCompleted(checkoutSession)
      break
    
    case 'invoice.payment_succeeded':
      const invoice = event.data.object as Stripe.Invoice
      await handleInvoicePaymentSucceeded(invoice)
      break
    
    case 'invoice.payment_failed':
      const failedInvoice = event.data.object as Stripe.Invoice
      await handleInvoicePaymentFailed(failedInvoice)
      break
    
    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object as Stripe.Subscription
      await handleSubscriptionDeleted(deletedSubscription)
      break
    
    case 'customer.subscription.updated':
      const updatedSubscription = event.data.object as Stripe.Subscription
      await handleSubscriptionUpdated(updatedSubscription)
      break
    
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  // Handle successful checkout
  // Update user's subscription status in database
  console.log('Checkout session completed:', session.id)
  
  // Example: Update user record with subscription info
  // await updateUserSubscription(session.metadata?.userId, {
  //   stripeCustomerId: session.customer as string,
  //   stripeSubscriptionId: session.subscription as string,
  //   status: 'active',
  //   plan: getPlanFromPriceId(session.display_items?.[0]?.price?.id),
  // })
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  // Handle successful invoice payment
  console.log('Invoice payment succeeded:', invoice.id)
  
  // Update subscription status if needed
  // await updateSubscriptionStatus(invoice.subscription as string, 'active')
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  // Handle failed invoice payment
  console.log('Invoice payment failed:', invoice.id)
  
  // Update subscription status
  // await updateSubscriptionStatus(invoice.subscription as string, 'past_due')
  
  // Send notification to user
  // await sendPaymentFailedNotification(invoice.customer_email)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  // Handle subscription cancellation
  console.log('Subscription deleted:', subscription.id)
  
  // Update user's subscription status in database
  // await updateUserSubscription(subscription.metadata?.userId, {
  //   status: 'canceled',
  //   canceledAt: new Date(),
  // })
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  // Handle subscription update
  console.log('Subscription updated:', subscription.id)
  
  // Update user's subscription info in database
  // await updateUserSubscription(subscription.metadata?.userId, {
  //   status: subscription.status,
  //   plan: getPlanFromPriceId(subscription.items.data[0]?.price?.id),
  //   currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  // })
}

// Helper function to get plan from price ID
function getPlanFromPriceId(priceId: string): string {
  const plan = SUBSCRIPTION_PLANS.find(p => p.priceId === priceId)
  return plan?.id || 'unknown'
}

// Get plan by ID
export function getPlanById(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find(plan => plan.id === planId)
}
