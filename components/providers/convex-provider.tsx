"use client"

import React from "react"
import { ConvexProvider, ConvexReactClient } from "convex/react"

// Create Convex client with proper error handling
function createConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL

  if (!convexUrl) {
    console.warn("NEXT_PUBLIC_CONVEX_URL is not set - running without database")
    return null
  }

  try {
    new URL(convexUrl)
    return new ConvexReactClient(convexUrl)
  } catch (error) {
    console.error("Invalid Convex URL:", convexUrl, error)
    return null
  }
}

const convex = createConvexClient()

interface ConvexClientProviderProps {
  children: React.ReactNode
}

export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  if (!convex) {
    return <>{children}</>
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>
}
