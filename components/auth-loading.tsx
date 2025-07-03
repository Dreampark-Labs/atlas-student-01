"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

interface AuthLoadingProps {
  redirectTo?: string;
  timeout?: number; // in milliseconds, default 10 seconds
}

export function AuthLoading({ redirectTo = "/dashboard", timeout = 10000 }: AuthLoadingProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    // Set up timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setHasTimedOut(true);
    }, timeout);

    // Redirect when authentication is loaded and user is signed in
    if (isLoaded && isSignedIn) {
      clearTimeout(timeoutId);
      router.push(redirectTo);
    }

    // If auth is loaded but user is not signed in after timeout, redirect to sign-in
    if (isLoaded && !isSignedIn && hasTimedOut) {
      clearTimeout(timeoutId);
      router.push("/sign-in");
    }

    return () => clearTimeout(timeoutId);
  }, [isLoaded, isSignedIn, redirectTo, router, hasTimedOut, timeout]);

  // If timeout occurred and user is still not signed in, show error
  if (hasTimedOut && (!isLoaded || !isSignedIn)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-lg shadow-xl p-8 border-0">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Timeout</h3>
            <p className="text-gray-600 mb-6">
              We're having trouble signing you in. Please try again.
            </p>
            <button
              onClick={() => router.push("/sign-in")}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-md hover:from-blue-700 hover:to-purple-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-lg shadow-xl p-8 border-0">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Signing you in...</h3>
            <p className="text-gray-600">
              Please wait while we set up your account
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
