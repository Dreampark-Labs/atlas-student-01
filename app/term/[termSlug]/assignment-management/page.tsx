"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import { useAuthenticatedUserId } from "@/lib/user";
import { api } from "@/convex/_generated/api";
import { extractIdFromSlug } from "@/lib/url-utils";
import { Loader2 } from "lucide-react";
import { AssignmentManagement } from "@/components/assignment-management";
import { TermLayout } from "@/components/term-layout";
import { useEffect } from "react";

export default function AssignmentManagementPage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const userId = useAuthenticatedUserId();
  
  const termSlug = params.termSlug as string;
  const slugId = extractIdFromSlug(termSlug);

  // Verify the term belongs to the authenticated user
  const term = useQuery(
    api.terms.getTermBySlug,
    (isLoaded && isSignedIn && userId && slugId) 
      ? { userId, slugId } 
      : "skip"
  );

  // If term doesn't exist or doesn't belong to user, redirect
  useEffect(() => {
    if (isLoaded && term === null) {
      router.push('/dashboard');
    }
  }, [isLoaded, term, router]);

  // Set URL params for proper navigation
  useEffect(() => {
    if (term && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('termId', term._id);
      url.searchParams.set('activeView', 'assignment-management');
      window.history.replaceState({}, '', url.toString());
    }
  }, [term]);

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

  // Render with the shared layout
  return (
    <TermLayout
      currentTerm={term}
      activeView="assignment-management"
      pageTitle="All Assignments"
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Assignments</h1>
        </div>
        <AssignmentManagement
          terms={[]} // Empty array since we only have current term
          currentTerm={{
            id: term._id,
            name: term.name,
            isActive: term.isActive
          }}
          onTermChange={() => {}} // No-op since we're on a specific term page
          userId={userId}
        />
      </div>
    </TermLayout>
  );
}
