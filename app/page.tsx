"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  GraduationCap, 
  Target, 
  BarChart3, 
  CheckCircle, 
  Users, 
  Clock,
  FileText,
  Star,
  ArrowRight,
  Zap,
  Shield,
  Sparkles,
  Loader2
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useAuthenticatedUserId } from "@/lib/user";
import { generateTermPath } from "@/lib/url-utils";

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const userId = useAuthenticatedUserId();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Query for active term to redirect authenticated users
  const activeTerm = useQuery(
    api.terms.getActiveTerm,
    (isLoaded && isSignedIn && userId) ? { userId } : "skip"
  );

  // Redirect authenticated users to their most recent term
  useEffect(() => {
    if (!isLoaded || isRedirecting) return; // Wait for auth to load and prevent double redirects
    
    if (isSignedIn && userId) {
      // If we have activeTerm data (either term or null)
      if (activeTerm !== undefined) {
        setIsRedirecting(true);
        if (activeTerm) {
          // User has an active term, redirect to it
          const termPath = generateTermPath(activeTerm.name, activeTerm._id);
          router.replace(termPath);
        } else {
          // User has no terms yet, redirect to dashboard for first-time setup
          router.replace('/dashboard');
        }
      }
      // If activeTerm is still undefined, keep waiting for the query
    }
  }, [isLoaded, isSignedIn, activeTerm, userId, router, isRedirecting]);

  // Show loading state while checking auth or redirecting
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading state while waiting for user data and term query
  if (isSignedIn && (userId === undefined || activeTerm === undefined || isRedirecting)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  // If we reach here, user is not signed in - show landing page

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom right, #f8f9fd, #eef1f7)' }}>
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Atlas Student
              </h1>
              <p className="text-xs text-gray-500">by Dreampark Labs</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 rounded-full">
              <Sparkles className="w-3 h-3 mr-1" />
              Beta
            </Badge>
            <Button 
              variant="outline" 
              onClick={() => router.push("/sign-in")}
              className="hidden sm:inline-flex rounded-xl font-semibold px-6 py-3 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150"
            >
              Sign In
            </Button>
            <Button 
              onClick={() => router.push("/sign-up")}
              className="rounded-xl font-semibold px-6 py-3 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-150"
              style={{ background: 'linear-gradient(135deg, #5e60ce, #7400b8)', color: 'white' }}
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <div 
            className="inline-flex items-center px-3 py-1.5 mb-8 text-sm font-semibold rounded-full"
            style={{ backgroundColor: '#e0e7ff', color: '#3730a3' }}
          >
            <Zap className="w-3 h-3 mr-1" />
            Streamline Your Academic Journey
          </div>
          
          <h1 className="text-5xl md:text-6xl font-extrabold mb-8 text-gray-900 leading-tight">
            Master Your Academic Success
          </h1>
          
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Transform how you track assignments, manage grades, and organize your academic life. 
            Atlas Student is your comprehensive productivity platform for academic excellence.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <Button 
              size="lg" 
              onClick={() => router.push("/sign-up")}
              className="text-lg px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-150"
              style={{ background: 'linear-gradient(135deg, #5e60ce, #7400b8)', color: 'white' }}
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => router.push("/sign-in")}
              className="text-lg px-8 py-4 rounded-xl font-semibold border-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150"
            >
              Sign In
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 text-sm text-gray-500 mb-20">
            <div className="flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              Secure & Private
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              Real-time Syncing
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Built for Students
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 text-gray-900">Everything You Need to Excel</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Powerful features designed to help you stay organized, track progress, and achieve your academic goals.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="rounded-2xl border-0 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 ease-in-out" style={{ backgroundColor: 'white' }}>
              <CardHeader className="p-8">
                <div className="text-4xl mb-6">📚</div>
                <CardTitle className="text-xl font-bold mb-3" style={{ color: '#111827' }}>Assignment Tracking</CardTitle>
                <CardDescription className="leading-relaxed" style={{ color: '#4b5563' }}>
                  Never miss a deadline again. Track all your assignments, due dates, and submission status in one place.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="rounded-2xl border-0 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 ease-in-out" style={{ backgroundColor: 'white' }}>
              <CardHeader className="p-8">
                <div className="text-4xl mb-6">📈</div>
                <CardTitle className="text-xl font-bold mb-3" style={{ color: '#111827' }}>Grade Analytics</CardTitle>
                <CardDescription className="leading-relaxed" style={{ color: '#4b5563' }}>
                  Visualize your academic performance with detailed analytics, trends, and insights across all classes.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="rounded-2xl border-0 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 ease-in-out" style={{ backgroundColor: 'white' }}>
              <CardHeader className="p-8">
                <div className="text-4xl mb-6">⏰</div>
                <CardTitle className="text-xl font-bold mb-3" style={{ color: '#111827' }}>Smart Scheduling</CardTitle>
                <CardDescription className="leading-relaxed" style={{ color: '#4b5563' }}>
                  Intelligent scheduling and reminders help you manage your time effectively and stay on track.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="rounded-2xl border-0 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 ease-in-out" style={{ backgroundColor: 'white' }}>
              <CardHeader className="p-8">
                <div className="text-4xl mb-6">🗂️</div>
                <CardTitle className="text-xl font-bold mb-3" style={{ color: '#111827' }}>File Management</CardTitle>
                <CardDescription className="leading-relaxed" style={{ color: '#4b5563' }}>
                  Organize and access all your academic files, submissions, and resources in one secure location.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="rounded-2xl border-0 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 ease-in-out" style={{ backgroundColor: 'white' }}>
              <CardHeader className="p-8">
                <div className="text-4xl mb-6">🎯</div>
                <CardTitle className="text-xl font-bold mb-3" style={{ color: '#111827' }}>Goal Setting</CardTitle>
                <CardDescription className="leading-relaxed" style={{ color: '#4b5563' }}>
                  Set academic goals, track progress, and receive personalized recommendations to improve performance.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="rounded-2xl border-0 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 ease-in-out" style={{ backgroundColor: 'white' }}>
              <CardHeader className="p-8">
                <div className="text-4xl mb-6">⭐</div>
                <CardTitle className="text-xl font-bold mb-3" style={{ color: '#111827' }}>Performance Insights</CardTitle>
                <CardDescription className="leading-relaxed" style={{ color: '#4b5563' }}>
                  Get actionable insights and recommendations to optimize your study habits and academic performance.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6" style={{ background: 'linear-gradient(to right, #5e60ce, #7400b8)' }}>
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
            Ready to Transform Your Academic Journey?
          </h2>
          <p className="text-xl text-blue-100 mb-4 leading-relaxed">
            Join thousands of students who are already achieving academic success with Atlas Student.
          </p>
          <p className="text-blue-200 mb-10 font-medium">
            No credit card required · Cancel anytime
          </p>
          <Button 
            size="lg" 
            onClick={() => router.push("/sign-up")}
            className="bg-white text-purple-700 hover:bg-gray-50 text-lg px-10 py-5 rounded-xl font-semibold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-150"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-16 px-6">
        <div className="container mx-auto">
          <div className="flex items-center justify-left space-x-2 mb-6">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">Atlas Student</span>
          </div>
          <p className="text-gray-400 mb-6 max-w-md leading-relaxed">
            Empowering academic success through intelligent organization and insights.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-6 text-sm">
              <a href="https://dreampark.dev/legal/privacy" className="text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </a>
              <span className="hidden sm:inline text-gray-600">|</span>
              <a href="https://dreampark.dev/legal/terms" className="text-gray-400 hover:text-white transition-colors">
                Terms & Conditions
              </a>
            </div>
            <p className="text-xs text-gray-500">
              © 2025 Atlas Student, a <a href="https://dreampark.dev" className="text-gray-400 hover:text-white transition-colors">Dreampark Labs</a> Software. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
