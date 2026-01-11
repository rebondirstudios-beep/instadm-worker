# InstaDM Clone - Instagram DM Automation Tool

A powerful Instagram DM automation tool inspired by instadm.ai that helps scale outreach 100x with features like mass messaging, lead generation, and multi-account management.

## Features

- **Super Mass DM** - Send personalized messages to multiple Instagram users
- **Lead Generation** - Find and target potential customers based on criteria
- **Profile Management** - Organize and filter Instagram profiles
- **Multi Login Launcher** - Manage multiple Instagram accounts
- **Proxy Support** - Rotate proxies to avoid detection
- **Success Tracking** - Monitor campaign performance and success rates
- **Message Templates** - Create and reuse message templates
- **Analytics Dashboard** - Track metrics and campaign performance

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Authentication**: Clerk
- **Database**: Supabase with Prisma ORM
- **Payments**: Stripe
- **UI Components**: Radix UI, Lucide React

## Getting Started

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env.local
```

Fill in your environment variables:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

3. Initialize the database:

```bash
npx prisma generate
npx prisma db push
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
src/
├── app/                 # Next.js app router
├── components/          # Reusable UI components
├── lib/                 # Utility functions and configurations
├── types/               # TypeScript type definitions
└── prisma/              # Database schema and migrations
```

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Clerk Authentication](https://clerk.com/docs) - user authentication
- [Supabase](https://supabase.com/docs) - database and backend services
- [Stripe](https://stripe.com/docs) - payment processing

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
