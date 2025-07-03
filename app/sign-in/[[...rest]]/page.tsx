"use client";

import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") || "/auth-callback";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="text-gray-600 mt-2">
            Sign in to access your Atlas Student dashboard
          </p>
        </div>
        
        <div className="flex justify-center">
          <SignIn
            forceRedirectUrl={redirectUrl}
            signUpUrl="/sign-up"
            appearance={{
              elements: {
                formButtonPrimary: "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
                card: "shadow-xl border-0",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                footerActionLink: "text-blue-600 hover:text-blue-700 font-medium",
                footerAction: "text-center mt-4", // Style the footer action
                footerActionText: "text-gray-600 text-sm" // Style the footer text
              }
            }}
          />
        </div>
        
        {/* Remove any duplicate sign-up links by not including them manually */}
      </div>
    </div>
  );
}
