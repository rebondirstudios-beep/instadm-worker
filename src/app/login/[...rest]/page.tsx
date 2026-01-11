import { SignIn } from "@clerk/nextjs";

export default function LoginCatchAllPage() {
  return (
    <SignIn
      routing="path"
      path="/login"
      redirectUrl="/dashboard"
      appearance={{
        elements: {
          rootBox: "w-full",
          card: "shadow-none border-0 p-0",
        },
      }}
    />
  );
}
