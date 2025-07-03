import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  users: defineTable({
    userId: v.string(), // AWS Cognito user ID
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    hasCompletedOnboarding: v.optional(v.boolean()),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  terms: defineTable({
    userId: v.string(),
    name: v.string(),
    year: v.number(),
    season: v.string(),
    isActive: v.boolean(),
    stats: v.object({
      pendingTasks: v.number(),
      classes: v.number(),
      gpa: v.number(),
      completed: v.number(),
    }),
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_deleted", ["isDeleted"]),

  classes: defineTable({
    userId: v.string(),
    termId: v.id("terms"),
    name: v.string(),
    code: v.string(),
    professor: v.string(),
    credits: v.number(),
    color: v.string(),
    currentGrade: v.optional(v.number()),
    description: v.optional(v.string()),
    meetingTimes: v.optional(v.string()),
    location: v.optional(v.string()),
    gradingScheme: v.object({
      mode: v.optional(v.string()), // "percentage" (default) or "points"
      categories: v.array(
        v.object({
          name: v.string(),
          weight: v.number(),
          count: v.number(),
          dropLowest: v.optional(v.number()), // Number of lowest grades to drop
        }),
      ),
    }),
    assignments: v.object({
      completed: v.number(),
      total: v.number(),
    }),
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_termId", ["termId"])
    .index("by_deleted", ["isDeleted"]),

  assignments: defineTable({
    userId: v.string(),
    termId: v.id("terms"),
    classId: v.id("classes"),
    className: v.string(),
    classColor: v.string(),
    title: v.string(),
    type: v.string(),
    dueDate: v.string(),
    dueTime: v.string(),
    priority: v.string(),
    completed: v.boolean(),
    grade: v.optional(v.number()),
    maxPoints: v.optional(v.number()),
    description: v.optional(v.string()),
    instructions: v.optional(v.string()),
    rubric: v.optional(v.string()),
    estimatedTime: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Submission data
    submissionText: v.optional(v.string()),
    submissionFiles: v.optional(v.array(v.object({
      name: v.string(),
      size: v.number(),
      type: v.string(),
      url: v.optional(v.string()),
      uploadedAt: v.number(),
      fileId: v.optional(v.string()), // Convex storage ID for secure file access
    }))),
    submittedAt: v.optional(v.number()),
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_termId", ["termId"])
    .index("by_classId", ["classId"])
    .index("by_deleted", ["isDeleted"]),

  files: defineTable({
    userId: v.string(),
    assignmentId: v.optional(v.id("assignments")),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
    uploadedAt: v.number(),
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_assignmentId", ["assignmentId"])
    .index("by_storageId", ["storageId"]),
})
