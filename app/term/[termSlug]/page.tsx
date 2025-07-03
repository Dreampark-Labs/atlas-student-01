"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import { useAuthenticatedUserId } from "@/lib/user";
import { api } from "@/convex/_generated/api";
import { extractIdFromSlug, isAllTermsSlug, generateAllTermsId } from "@/lib/url-utils";
import { Loader2 } from "lucide-react";
import Dashboard from "@/app/dashboard/page";
import { useEffect } from "react";

export default function TermDashboard() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const userId = useAuthenticatedUserId();
  
  const termSlug = params.termSlug as string;
  const isAllTerms = isAllTermsSlug(termSlug);
  
  // For All Terms, we don't need to query a specific term
  const slugId = isAllTerms ? null : extractIdFromSlug(termSlug);

  // Verify the term belongs to the authenticated user (skip for All Terms)
  const term = useQuery(
    api.terms.getTermBySlug,
    (isLoaded && isSignedIn && userId && slugId && !isAllTerms)
      ? { userId, slugId }
      : "skip"
  );

  // For All Terms, verify the slug belongs to this user
  useEffect(() => {
    if (isAllTerms && userId && isLoaded) {
      const expectedSlug = `all-terms-${generateAllTermsId(userId).slice(-8)}`;
      if (termSlug !== expectedSlug) {
        // Redirect to the correct All Terms URL for this user
        router.push(`/term/${expectedSlug}`);
        return;
      }
    }
  }, [isAllTerms, userId, termSlug, router, isLoaded]);

  // If regular term doesn't exist or doesn't belong to user, redirect
  useEffect(() => {
    if (!isAllTerms && isLoaded && term === null) {
      router.push('/dashboard');
    }
  }, [isLoaded, term, router, isAllTerms]);

  // Redirect to sign-in if not authenticated
  if (isLoaded && !isSignedIn) {
    return <RedirectToSignIn />;
  }

  // Show loading state
  if (!isLoaded || userId === undefined) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (userId === null) {
    return <RedirectToSignIn />;
  }

  // Handle All Terms case
  if (isAllTerms) {
    if (!isLoaded || !userId) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      );
    }
    
    // Render the dashboard directly with All Terms view
    // We'll pass a prop or use a context to indicate this is All Terms view
    return <Dashboard />;
  }

  // Handle regular term case
  if (term === undefined) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading term...</p>
        </div>
      </div>
    );
  }

  if (term === null) {
    return null; // Will redirect in useEffect
  }

  // Pass the termId to the dashboard via URL params simulation
  const searchParams = new URLSearchParams();
  searchParams.set('termId', term._id);
  
  // Render the main dashboard with the selected term
  return <Dashboard />;
}
