"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get tab from URL parameters or default to general
    const tab = searchParams.get("tab") || "general";
    
    // Redirect to the new URL structure
    router.replace(`/settings/${tab}`);
  }, [router, searchParams]);

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Redirecting to settings...</p>
      </div>
    </div>
  );
}
