// Test Clerk keys
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
console.log('Clerk Publishable Key:', clerkPublishableKey ? 'SET' : 'MISSING');
console.log('Key value:', clerkPublishableKey?.substring(0, 10) + '...');

export default function Home() {
  return (
    <div>
      <h1>Clerk Key Test</h1>
      <p>Status: {clerkPublishableKey ? 'KEY FOUND' : 'KEY MISSING'}</p>
      <p>Key: {clerkPublishableKey?.substring(0, 20)}...</p>
    </div>
  );
}
