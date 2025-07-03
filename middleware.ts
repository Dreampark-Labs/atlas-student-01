import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/term(.*)",
  "/settings(.*)",
  "/api/upload(.*)",
  "/api/extract-assignments(.*)",
  "/api/send-notification(.*)"
]);

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/auth-callback(.*)"
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const { pathname } = req.nextUrl;
  
  // For root path, let the page component handle the redirect to avoid middleware loops
  if (pathname === "/") {
    return NextResponse.next();
  }
  
  // Always allow other public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }
  
  // If user is not authenticated and trying to access protected routes, redirect to sign-in
  if (!userId && isProtectedRoute(req)) {
    const signInUrl = new URL("/sign-in", req.url);
    // Add the current path as a redirect parameter so user is taken back after login
    signInUrl.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(signInUrl);
  }
  
  // Allow authenticated users to access any route
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
