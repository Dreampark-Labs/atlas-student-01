"use client";

import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexReactClient } from "convex/react";

// Provide a fallback for missing environment variables during development
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder-convex-url.com";
const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_placeholder";

const convex = new ConvexReactClient(convexUrl);

export function ConvexClerkProvider({ children }: { children: React.ReactNode }) {
  // If we don't have proper environment variables, show a setup message
  if (!process.env.NEXT_PUBLIC_CONVEX_URL || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Setup Required</h1>
          <p className="text-gray-600 mb-6">
            To use Atlas Student, you need to set up your environment variables:
          </p>
          <div className="text-left bg-gray-100 p-4 rounded text-sm font-mono">
            <div>NEXT_PUBLIC_CONVEX_URL=your_convex_url</div>
            <div>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key</div>
          </div>
          <p className="text-gray-500 text-sm mt-4">
            Add these to your .env.local file
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider
      publishableKey={clerkKey}
      afterSignOutUrl="/"
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
