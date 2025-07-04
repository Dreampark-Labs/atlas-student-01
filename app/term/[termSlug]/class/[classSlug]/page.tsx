"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuth, RedirectToSignIn } from "@clerk/nextjs";
import { useAuthenticatedUserId } from "@/lib/user";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { extractIdFromSlug, generateTermPath } from "@/lib/url-utils";
import { Loader2, ArrowLeft } from "lucide-react";
import { ClassAssignmentsView } from "@/components/class-assignments-view";
import { TermLayout } from "@/components/term-layout";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

// Tab label mapping
const TAB_LABELS = {
  assignments: "All Assignments",
  categories: "By Category",
  predictor: "Grade Predictor"
};

export default function ClassAssignments() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const userId = useAuthenticatedUserId();
  const [currentTab, setCurrentTab] = useState("assignments");
  
  const termSlug = params.termSlug as string;
  const classSlug = params.classSlug as string;
  const termSlugId = extractIdFromSlug(termSlug);
  const classSlugId = extractIdFromSlug(classSlug);

  // Verify the term and class belong to the authenticated user
  const term = useQuery(
    api.terms.getTermBySlug,
    (isLoaded && isSignedIn && userId && termSlugId) 
      ? { userId, slugId: termSlugId } 
      : "skip"
  );

  const classData = useQuery(
    api.classes.getClassBySlug,
    (isLoaded && isSignedIn && userId && classSlugId) 
      ? { userId, slugId: classSlugId } 
      : "skip"
  );

  const assignments = useQuery(
    api.assignments.getAssignmentsByClass,
    (isLoaded && isSignedIn && userId && classData?._id) 
      ? { userId, classId: classData._id } 
      : "skip"
  );

  // If term or class doesn't exist or doesn't belong to user, redirect
  useEffect(() => {
    if (isLoaded && (term === null || classData === null)) {
      router.push('/dashboard');
    }
  }, [isLoaded, term, classData, router]);

  // Set URL params for proper navigation state
  useEffect(() => {
    if (term && classData && typeof window !== 'undefined') {
      const currentParams = new URLSearchParams(window.location.search);
      currentParams.set('termId', term._id);
      currentParams.set('activeView', 'class-detail');
      
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}?${currentParams.toString()}`
      );
    }
  }, [term, classData]);

  // Handle back to classes navigation
  const handleBackToClasses = () => {
    if (term) {
      const termPath = generateTermPath(term.name, term._id);
      router.push(`${termPath}/classes`);
    }
  };

  // Handle tab changes
  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
  };

  // Create breadcrumbs for class assignments page
  const breadcrumbs = [
    {
      label: "My Classes",
      onClick: handleBackToClasses
    },
    {
      label: classData?.name || "Class",
      // No click - this is the current class
    },
    {
      label: TAB_LABELS[currentTab as keyof typeof TAB_LABELS] || currentTab,
      // No click - this is the current tab
    }
  ];
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

  if (term === undefined || classData === undefined || assignments === undefined) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading class...</p>
        </div>
      </div>
    );
  }

  if (term === null || classData === null) {
    return null; // Will redirect in useEffect
  }

  // Verify the class belongs to the correct term
  if (classData.termId !== term._id) {
    router.push('/dashboard');
    return null;
  }

  return (
    <TermLayout
      currentTerm={term}
      activeView="class-detail"
      pageTitle={`${classData.name} - Assignments`}
      breadcrumbs={breadcrumbs}
    >
      <div className="space-y-6">
        {/* Back button */}
        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToClasses}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Classes</span>
          </Button>
        </div>

        {/* Class assignments view */}
        <ClassAssignmentsView
          term={term}
          classData={classData}
          assignments={assignments}
          userId={userId}
          onTabChange={handleTabChange}
        />
      </div>
    </TermLayout>
  );
}
