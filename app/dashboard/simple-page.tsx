"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function SimpleDashboard() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const { user } = useUser();

  // Always call hooks at the top level
  const userInfo = useQuery(
    api.users.getUser,
    isLoaded && isSignedIn && userId ? { userId } : "skip"
  );

  // Handle loading states
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Not Signed In</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please sign in to access your dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (userInfo === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Welcome Back!</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Hello, {user?.firstName || 'Student'}!</p>
              <p className="text-sm text-gray-600 mt-2">
                User ID: {userId}
              </p>
              <p className="text-sm text-gray-600">
                Email: {user?.primaryEmailAddress?.emailAddress}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>✅ Authentication: Working</p>
                <p>✅ User Data: {userInfo ? 'Loaded' : 'Loading...'}</p>
                <p>✅ Convex Connection: Working</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {userInfo && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>User Details</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-gray-100 p-4 rounded">
                {JSON.stringify(userInfo, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
