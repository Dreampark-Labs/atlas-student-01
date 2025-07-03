"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import { useAuthenticatedUserId } from "@/lib/user";
import { api } from "@/convex/_generated/api";
import { extractIdFromSlug, isAllTermsSlug, generateAllTermsId } from "@/lib/url-utils";
import { Loader2 } from "lucide-react";
import ClassList from "@/components/class-list";
import AllTermsClassList from "@/components/all-terms-class-list";
import { TermLayout } from "@/components/term-layout";
import React, { useEffect } from "react";

export default function ClassManagementPage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const userId = useAuthenticatedUserId();
  
  const termSlug = params.termSlug as string;
  
  // Check if this is the All Terms view
  const isAllTerms = isAllTermsSlug(termSlug);
  const slugId = isAllTerms ? null : extractIdFromSlug(termSlug);

  // Verify the term belongs to the authenticated user (skip for All Terms)
  const term = useQuery(
    api.terms.getTermBySlug,
    (!isAllTerms && isLoaded && isSignedIn && userId && slugId) 
      ? { userId, slugId } 
      : "skip"
  );

  // Get all terms for the term selector
  const terms = useQuery(
    api.terms.getTerms, 
    (isLoaded && isSignedIn && userId) ? { userId } : "skip"
  );

  // Get active and deleted classes for All Terms view
  const allClasses = useQuery(
    api.classes.getAllClasses,
    (isLoaded && isSignedIn && userId && isAllTerms) 
      ? { userId } 
      : "skip"
  );
  
  // Get all assignments across all terms for All Terms view
  const allAssignments = useQuery(
    api.assignments.getAllAssignments,
    (isLoaded && isSignedIn && userId && isAllTerms)
      ? { userId }
      : "skip"
  );

  // If term doesn't exist or doesn't belong to user, redirect
  useEffect(() => {
    // For All Terms, verify the slug matches the expected one for this user
    if (isAllTerms && userId && isLoaded) {
      const expectedSlug = `all-terms-${generateAllTermsId(userId).slice(-8)}`;
      if (termSlug !== expectedSlug) {
        // Redirect to the correct All Terms URL for this user
        router.push(`/term/${expectedSlug}/class-management`);
        return;
      }
    } else if (isLoaded && term === null && !isAllTerms) {
      router.push('/dashboard');
    }
  }, [isLoaded, term, router, isAllTerms, userId, termSlug]);

  // Set URL params for proper navigation
  useEffect(() => {
    if (term && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('termId', term._id);
      url.searchParams.set('activeView', 'class-management');
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

  if (term === undefined || terms === undefined) {
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

  // Convert Convex data to the expected format
  const convertedTerms = terms.map(t => ({
    id: t._id,
    _id: t._id,
    name: t.name,
    year: t.year,
    season: t.season,
    isActive: t.isActive,
    stats: t.stats
  }));

  const convertedCurrentTerm = {
    id: term._id,
    _id: term._id,
    name: term.name,
    year: term.year,
    season: term.season,
    isActive: term.isActive,
    stats: term.stats
  };

  const handleTermChange = async (termId: string) => {
    const selectedTerm = terms.find(t => t._id === termId);
    if (selectedTerm) {
      const termPath = `/term/${selectedTerm.name.toLowerCase().replace(/\s+/g, '-')}-${termId.slice(-8)}/class-management`;
      router.push(termPath);
    }
  };

  // Check for incomplete loading of data for All Terms view
  if (isAllTerms && (allClasses === undefined || allAssignments === undefined)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading all classes...</p>
        </div>
      </div>
    );
  }

  // Create "All Terms" term object for the layout when in All Terms view
  // This must match the expected interface in TermLayoutProps
  const allTermsTerm = {
    _id: generateAllTermsId(userId || ''),
    name: 'All Terms',
    year: new Date().getFullYear(),  // Current year
    season: '', 
    isActive: true,
    stats: {
      classes: allClasses?.length || 0,
      pendingTasks: allAssignments?.filter(a => !a.completed)?.length || 0,
      completed: allAssignments?.filter(a => a.completed)?.length || 0,
      gpa: 0
    }
  };

  // Prepare enriched class data for All Terms view by adding term information
  const enrichedClasses = React.useMemo(() => {
    if (!isAllTerms || !allClasses || !terms) return allClasses;

    // Create a map of termIds to term names for quick lookups
    const termMap = terms.reduce((acc, term) => {
      acc[term._id] = `${term.name} ${term.year}`;
      return acc;
    }, {} as Record<string, string>);

    // Return classes with added term information
    return allClasses.map(classItem => ({
      ...classItem,
      termName: termMap[classItem.termId] || 'Unknown Term'
    }));
  }, [isAllTerms, allClasses, terms]);

  // Render with the shared layout
  return (
    <TermLayout
      currentTerm={isAllTerms ? allTermsTerm : term}
      activeView="class-management"
      pageTitle="My Classes"
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isAllTerms ? "All Classes" : "My Classes"}
          </h1>
          {isAllTerms && (
            <p className="text-muted-foreground mt-2">
              Viewing all classes across all terms, including deleted classes.
            </p>
          )}
        </div>
        
        {isAllTerms ? (
          <AllTermsClassList 
            classes={enrichedClasses} 
            assignments={allAssignments}
            terms={terms} 
          />
        ) : (
          <ClassList />
        )}
      </div>
    </TermLayout>
  );
}
