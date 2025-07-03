"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AuthLoading } from "@/components/auth-loading";

export default function AuthCallbackPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ensureUserExists = useMutation(api.users.ensureUserExists);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleAuthCallback() {
      try {
        // Prevent multiple redirects
        if (hasRedirected) {
          console.log("Already redirected, skipping...");
          return;
        }

        console.log("Auth callback - isLoaded:", isLoaded, "isSignedIn:", isSignedIn, "user:", user?.id);
        console.log("hasRedirected state:", hasRedirected);
        
        if (isLoaded && isSignedIn && user) {
          console.log("Attempting to ensure user exists...");
          
          // Ensure user exists in the database
          const result = await ensureUserExists({
            userId: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined,
          });

          console.log("User creation/verification successful:", result);
          
          // Check for redirect URL parameter
          const redirectUrl = searchParams.get("redirect_url") || "/dashboard";
          console.log("Redirecting to:", redirectUrl);
          
          setHasRedirected(true);
          
          // Direct redirect without setTimeout for better reliability
          router.replace(redirectUrl);
          
        } else if (isLoaded && !isSignedIn) {
          console.log("User not signed in, redirecting to sign-in");
          setHasRedirected(true);
          router.replace("/sign-in");
        }
      } catch (error) {
        console.error("Error in auth callback:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
        
        // Still redirect to dashboard, it will handle the error
        setHasRedirected(true);
        router.replace("/dashboard");
      }
    }

    handleAuthCallback();
  }, [isLoaded, isSignedIn, user, ensureUserExists, router, hasRedirected]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Setup Error</h2>
            <p className="text-gray-600 mb-4">There was an issue setting up your account.</p>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <button
              onClick={() => router.replace("/dashboard")}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <AuthLoading />;
}
