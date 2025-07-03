import { useUser, useAuth } from "@clerk/nextjs";

// Production user ID from Clerk authentication
export const getCurrentUserId = () => {
  // Check if we're in a React component context
  try {
    const { user } = useUser();
    return user?.id || "anonymous";
  } catch {
    // Fallback for non-React contexts or during SSR
    return "anonymous";
  }
};

// Hook for getting current user data with auth state
export const useCurrentUser = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const { userId } = useAuth();
  
  return {
    userId: userId || user?.id || "anonymous",
    user,
    isLoaded,
    isSignedIn,
    userData: user ? {
      id: user.id,
      name: user.fullName || user.firstName || "User",
      email: user.primaryEmailAddress?.emailAddress || "",
      imageUrl: user.imageUrl,
    } : null
  };
};

// Hook specifically for getting authenticated user ID for Convex queries
export const useAuthenticatedUserId = () => {
  const { userId, isLoaded, isSignedIn } = useAuth();
  
  if (!isLoaded) {
    return undefined; // Still loading
  }
  
  if (!isSignedIn || !userId) {
    return null; // Not signed in
  }
  
  return userId; // Authenticated user ID
};

// Legacy function for backward compatibility
export const getUserData = () => ({
  id: "legacy-user",
  name: "Loading...",
  email: "loading@example.com",
});

// Server-side user ID getter (for API routes)
export const getServerUserId = (clerkUserId?: string) => {
  return clerkUserId || "anonymous";
};
