export default function TestEnvPage() {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secret = process.env.CLERK_SECRET_KEY ? 'SET' : 'MISSING';
  const db = process.env.DATABASE_URL ? 'SET' : 'MISSING';
  
  return (
    <div>
      <h1>Environment Variables Test</h1>
      <p>Clerk Publishable Key: {key ? 'SET' : 'MISSING'}</p>
      <p>Clerk Secret Key: {secret}</p>
      <p>Database URL: {db}</p>
      <p>Key Length: {key?.length || 0}</p>
    </div>
  );
}
