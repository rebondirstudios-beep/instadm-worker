import { SignUp } from "@clerk/nextjs";

export default function SignupCatchAllPage() {
  return (
    <SignUp
      routing="path"
      path="/signup"
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
