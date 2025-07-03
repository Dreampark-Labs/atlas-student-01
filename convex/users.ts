import { v } from "convex/values"
import { mutation, query, action } from "./_generated/server"
import { internal } from "./_generated/api"

export const createUser = mutation({
  args: {
    userId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()

    if (existingUser) {
      return existingUser._id
    }

    const now = Date.now()
    return await ctx.db.insert("users", {
      ...args,
      preferences: {
        theme: "system",
        language: "en",
        timezone: "America/New_York",
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12h",
      },
      notifications: {
        assignmentReminders: true,
        deadlineAlerts: true,
        emailNotifications: false,
        smsNotifications: false,
      },
      privacy: {
        shareGrades: false,
        shareSchedule: false,
        analytics: true,
      },
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const getUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()
  },
})

export const updateUser = mutation({
  args: {
    userId: v.string(),
    updates: v.object({
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      studentId: v.optional(v.string()),
      major: v.optional(v.string()),
      minor: v.optional(v.string()),
      phone: v.optional(v.string()),
      address: v.optional(v.string()),
      dateOfBirth: v.optional(v.string()),
      expectedGraduation: v.optional(v.string()),
      bio: v.optional(v.string()),
      profilePicture: v.optional(v.string()),
      preferences: v.optional(
        v.object({
          theme: v.string(),
          language: v.string(),
          timezone: v.string(),
          dateFormat: v.string(),
          timeFormat: v.string(),
        }),
      ),
      notifications: v.optional(
        v.object({
          assignmentReminders: v.boolean(),
          deadlineAlerts: v.boolean(),
          emailNotifications: v.boolean(),
          smsNotifications: v.boolean(),
        }),
      ),
      privacy: v.optional(
        v.object({
          shareGrades: v.boolean(),
          shareSchedule: v.boolean(),
          analytics: v.boolean(),
        }),
      ),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()

    if (!user) {
      throw new Error("User not found")
    }

    return await ctx.db.patch(user._id, {
      ...args.updates,
      updatedAt: Date.now(),
    })
  },
})

export const getUserOnboardingStatus = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()
    
    const hasTerms = await ctx.db
      .query("terms")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first() !== null
    
    return {
      hasCompletedOnboarding: user?.hasCompletedOnboarding || false,
      hasTerms,
      isFirstTimeUser: !user?.hasCompletedOnboarding && !hasTerms
    }
  },
})

export const markOnboardingComplete = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()

    const now = Date.now()
    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        hasCompletedOnboarding: true,
        updatedAt: now,
      })
    } else {
      await ctx.db.insert("users", {
        userId: args.userId,
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        hasCompletedOnboarding: true,
        preferences: {
          theme: "system",
          language: "en",
          timezone: "America/New_York",
          dateFormat: "MM/DD/YYYY",
          timeFormat: "12h",
        },
        notifications: {
          assignmentReminders: true,
          deadlineAlerts: true,
          emailNotifications: false,
          smsNotifications: false,
        },
        privacy: {
          shareGrades: false,
          shareSchedule: false,
          analytics: true,
        },
        createdAt: now,
        updatedAt: now,
      })
    }
  },
})

// Ensure user exists in database - call this on authentication
export const ensureUserExists = mutation({
  args: {
    userId: v.string(),
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()

    if (existingUser) {
      return existingUser._id
    }

    // Create new user with default values
    const now = Date.now()
    return await ctx.db.insert("users", {
      userId: args.userId,
      email: args.email || "",
      firstName: args.firstName || "Student",
      lastName: args.lastName || "",
      preferences: {
        theme: "system",
        language: "en",
        timezone: "America/New_York",
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12h",
      },
      notifications: {
        assignmentReminders: true,
        deadlineAlerts: true,
        emailNotifications: false,
        smsNotifications: false,
      },
      privacy: {
        shareGrades: false,
        shareSchedule: false,
        analytics: true,
      },
      hasCompletedOnboarding: false,
      createdAt: now,
      updatedAt: now,
    })
  },
})

// Get user profile for profile page
export const getUserProfile = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()
  },
})

// Update user profile
export const updateUserProfile = mutation({
  args: {
    userId: v.string(),
    updates: v.object({
      firstName: v.optional(v.string()),
      lastName: v.optional(v.string()),
      phone: v.optional(v.string()),
      address: v.optional(v.string()),
      dateOfBirth: v.optional(v.string()),
      studentId: v.optional(v.string()),
      major: v.optional(v.string()),
      minor: v.optional(v.string()),
      expectedGraduation: v.optional(v.string()),
      bio: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()

    if (!user) {
      throw new Error("User not found")
    }

    return await ctx.db.patch(user._id, {
      ...args.updates,
      updatedAt: Date.now(),
    })
  },
})

// Update user settings
export const updateUserSettings = mutation({
  args: {
    userId: v.string(),
    preferences: v.optional(
      v.object({
        theme: v.string(),
        language: v.string(),
        timezone: v.string(),
        dateFormat: v.string(),
        timeFormat: v.string(),
      }),
    ),
    notifications: v.optional(
      v.object({
        assignmentReminders: v.boolean(),
        deadlineAlerts: v.boolean(),
        emailNotifications: v.boolean(),
        smsNotifications: v.boolean(),
      }),
    ),
    privacy: v.optional(
      v.object({
        shareGrades: v.boolean(),
        shareSchedule: v.boolean(),
        analytics: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()

    if (!user) {
      throw new Error("User not found")
    }

    const updates: any = {
      updatedAt: Date.now(),
    }

    if (args.preferences) {
      updates.preferences = args.preferences
    }
    if (args.notifications) {
      updates.notifications = args.notifications
    }
    if (args.privacy) {
      updates.privacy = args.privacy
    }

    return await ctx.db.patch(user._id, updates)
  },
})

// Complete user data deletion
export const deleteAllUserData = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()

    if (!user) {
      throw new Error("User not found")
    }

    try {
      // Delete all assignments for this user
      const assignments = await ctx.db
        .query("assignments")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect()
      
      for (const assignment of assignments) {
        await ctx.db.delete(assignment._id)
      }

      // Delete all classes for this user
      const classes = await ctx.db
        .query("classes")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect()
      
      for (const classItem of classes) {
        await ctx.db.delete(classItem._id)
      }

      // Delete all terms for this user
      const terms = await ctx.db
        .query("terms")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect()
      
      for (const term of terms) {
        await ctx.db.delete(term._id)
      }

      // Finally, delete the user record
      await ctx.db.delete(user._id)

      return { success: true, message: "All user data deleted successfully" }
    } catch (error) {
      console.error("Error deleting user data:", error)
      throw new Error("Failed to delete all user data")
    }
  },
})

// Development only: Reset onboarding status for testing
export const resetOnboardingStatus = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()

    if (!user) {
      throw new Error("User not found")
    }

    return await ctx.db.patch(user._id, {
      hasCompletedOnboarding: false,
      updatedAt: Date.now(),
    })
  },
})

// Action to completely delete user account including Clerk authentication
export const deleteUserAccount = action({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    try {
      // First delete all Convex data
      await ctx.runMutation(internal.users.deleteAllUserData, { userId: args.userId })

      // Note: Clerk user deletion should be handled on the frontend using Clerk's user.delete() method
      // as actions don't have direct access to Clerk's management API with the necessary permissions
      
      return { 
        success: true, 
        message: "Convex data deleted. Please complete account deletion on the frontend." 
      }
    } catch (error) {
      console.error("Error deleting user account:", error)
      return { 
        success: false, 
        message: "Failed to delete user account data" 
      }
    }
  },
})
