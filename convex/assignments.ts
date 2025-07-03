import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Helper function to calculate class grade and update it
const updateClassGrade = async (ctx: any, classId: any) => {
  // Get all completed assignments with grades for this class (excluding deleted ones)
  const assignments = await ctx.db
    .query("assignments")
    .withIndex("by_classId", (q: any) => q.eq("classId", classId))
    .filter((q: any) => q.eq(q.field("completed"), true))
    .filter((q: any) => q.neq(q.field("grade"), undefined))
    .filter((q: any) => q.neq(q.field("grade"), null))
    .filter((q: any) => q.neq(q.field("isDeleted"), true))
    .collect()

  const classDoc = await ctx.db.get(classId)
  if (!classDoc) return

  if (assignments.length === 0) {
    // No graded assignments yet, set currentGrade to undefined
    await ctx.db.patch(classId, {
      currentGrade: undefined,
      updatedAt: Date.now(),
    })
    
    // Update term GPA since class grade changed
    await updateTermGPA(ctx, classDoc.termId)
    return
  }

  // Calculate weighted grade based on points
  let totalPoints = 0
  let earnedPoints = 0

  assignments.forEach((assignment: any) => {
    if (assignment.maxPoints && assignment.grade !== undefined) {
      totalPoints += assignment.maxPoints
      earnedPoints += assignment.grade
    } else if (assignment.grade !== undefined) {
      // If no maxPoints, assume it's a percentage grade
      totalPoints += 100
      earnedPoints += assignment.grade
    }
  })

  const currentGrade = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0

  // Update class with calculated grade
  await ctx.db.patch(classId, {
    currentGrade: Math.round(currentGrade * 100) / 100, // Round to 2 decimal places
    updatedAt: Date.now(),
  })

  // Update term GPA since class grade changed
  await updateTermGPA(ctx, classDoc.termId)
}

// Helper function to calculate and update term GPA
const updateTermGPA = async (ctx: any, termId: any) => {
  // Get all classes for this term
  const classes = await ctx.db
    .query("classes")
    .withIndex("by_termId", (q: any) => q.eq("termId", termId))
    .filter((q: any) => q.neq(q.field("isDeleted"), true))
    .collect()

  // Calculate GPA from classes with current grades
  const validGrades = classes
    .filter((c: any) => c.currentGrade !== null && c.currentGrade !== undefined)
    .map((c: any) => c.currentGrade)

  let termGPA = 0
  if (validGrades.length > 0) {
    // Convert percentages to GPA points using standard scale
    const gradePoints = validGrades.map((grade: number) => {
      if (grade >= 97) return 4.0
      if (grade >= 93) return 4.0
      if (grade >= 90) return 3.7
      if (grade >= 87) return 3.3
      if (grade >= 83) return 3.0
      if (grade >= 80) return 2.7
      if (grade >= 77) return 2.3
      if (grade >= 73) return 2.0
      if (grade >= 70) return 1.7
      if (grade >= 67) return 1.3
      if (grade >= 65) return 1.0
      return 0.0
    })
    
    termGPA = gradePoints.reduce((sum: number, points: number) => sum + points, 0) / gradePoints.length
  }

  // Update term with calculated GPA
  const term = await ctx.db.get(termId)
  if (term) {
    await ctx.db.patch(termId, {
      stats: {
        ...term.stats,
        gpa: Math.round(termGPA * 100) / 100, // Round to 2 decimal places
      },
      updatedAt: Date.now(),
    })
  }
}

export const createAssignment = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const assignmentId = await ctx.db.insert("assignments", {
      ...args,
      createdAt: now,
      updatedAt: now,
    })

    // Update class assignment count
    const classDoc = await ctx.db.get(args.classId)
    if (classDoc) {
      await ctx.db.patch(args.classId, {
        assignments: {
          completed: args.completed ? classDoc.assignments.completed + 1 : classDoc.assignments.completed,
          total: classDoc.assignments.total + 1,
        },
        updatedAt: now,
      })
    }

    // Update class grade if assignment is completed and has a grade
    if (args.completed && args.grade !== undefined) {
      await updateClassGrade(ctx, args.classId)
    }

    // Update term stats
    const term = await ctx.db.get(args.termId)
    if (term) {
      await ctx.db.patch(args.termId, {
        stats: {
          ...term.stats,
          pendingTasks: args.completed ? term.stats.pendingTasks : term.stats.pendingTasks + 1,
          completed: args.completed ? term.stats.completed + 1 : term.stats.completed,
        },
        updatedAt: now,
      })
    }

    // Update class grade if assignment has a grade
    if (args.grade !== undefined && args.maxPoints !== undefined) {
      await updateClassGrade(ctx, args.classId)
    }

    return assignmentId
  },
})

export const getAssignmentsByTerm = query({
  args: {
    userId: v.string(),
    termId: v.id("terms"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("assignments")
      .withIndex("by_termId", (q) => q.eq("termId", args.termId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect()
  },
})

export const getAllAssignments = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("assignments")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect()
  },
})

export const getActiveAssignments = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("assignments")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect()
  },
})

export const updateAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
    updates: v.object({
      title: v.optional(v.string()),
      type: v.optional(v.string()),
      dueDate: v.optional(v.string()),
      dueTime: v.optional(v.string()),
      priority: v.optional(v.string()),
      completed: v.optional(v.boolean()),
      grade: v.optional(v.number()),
      maxPoints: v.optional(v.number()),
      description: v.optional(v.string()),
      instructions: v.optional(v.string()),
      rubric: v.optional(v.string()),
      estimatedTime: v.optional(v.string()),
      notes: v.optional(v.string()),
      submissionText: v.optional(v.string()),
      submissionFiles: v.optional(v.array(v.object({
        name: v.string(),
        size: v.number(),
        type: v.string(),
        url: v.optional(v.string()),
        uploadedAt: v.number(),
      }))),
      submittedAt: v.optional(v.number()),
    }),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId)
    if (!assignment) {
      throw new Error("Assignment not found")
    }

    // Validate that the assignment belongs to the user
    if (assignment.userId !== args.userId) {
      throw new Error("You don't have permission to update this assignment")
    }

    const wasCompleted = assignment.completed
    const willBeCompleted = args.updates.completed ?? wasCompleted

    await ctx.db.patch(args.assignmentId, {
      ...args.updates,
      updatedAt: Date.now(),
    })

    // Update class assignment completion count if completion status changed
    if (wasCompleted !== willBeCompleted) {
      const classDoc = await ctx.db.get(assignment.classId)
      if (classDoc) {
        const newCompletedCount = willBeCompleted
          ? classDoc.assignments.completed + 1
          : classDoc.assignments.completed - 1
        
        await ctx.db.patch(assignment.classId, {
          assignments: {
            completed: Math.max(0, newCompletedCount), // Ensure non-negative
            total: classDoc.assignments.total,
          },
          updatedAt: Date.now(),
        })
      }

      // Update term stats
      const term = await ctx.db.get(assignment.termId)
      if (term) {
        const newPendingTasks = willBeCompleted
          ? term.stats.pendingTasks - 1
          : term.stats.pendingTasks + 1
        const newCompleted = willBeCompleted
          ? term.stats.completed + 1
          : term.stats.completed - 1
          
        await ctx.db.patch(assignment.termId, {
          stats: {
            pendingTasks: Math.max(0, newPendingTasks), // Ensure non-negative
            classes: term.stats.classes,
            gpa: term.stats.gpa,
            completed: Math.max(0, newCompleted), // Ensure non-negative
          },
          updatedAt: Date.now(),
        })
      }
    }

    // Update class grade whenever assignment completion or grade changes
    const gradeChanged = args.updates.grade !== undefined || args.updates.maxPoints !== undefined
    const completionChanged = wasCompleted !== willBeCompleted
    
    if (gradeChanged || completionChanged) {
      await updateClassGrade(ctx, assignment.classId)
      // Also update term GPA if termId is available
      if (assignment.termId) {
        await updateTermGPA(ctx, assignment.termId)
      }
    }

    return args.assignmentId
  },
})

export const deleteAssignment = mutation({
  args: { 
    userId: v.string(),
    assignmentId: v.id("assignments") 
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId)
    if (!assignment) {
      throw new Error("Assignment not found")
    }

    // Validate that the assignment belongs to the user
    if (assignment.userId !== args.userId) {
      throw new Error("You don't have permission to delete this assignment")
    }

    // Update class assignment count
    const classDoc = await ctx.db.get(assignment.classId)
    if (classDoc) {
      await ctx.db.patch(assignment.classId, {
        assignments: {
          completed: assignment.completed ? classDoc.assignments.completed - 1 : classDoc.assignments.completed,
          total: classDoc.assignments.total - 1,
        },
        updatedAt: Date.now(),
      })
    }

    // Update term stats
    const term = await ctx.db.get(assignment.termId)
    if (term) {
      await ctx.db.patch(assignment.termId, {
        stats: {
          ...term.stats,
          pendingTasks: assignment.completed ? term.stats.pendingTasks : term.stats.pendingTasks - 1,
          completed: assignment.completed ? term.stats.completed - 1 : term.stats.completed,
        },
        updatedAt: Date.now(),
      })
    }

    return await ctx.db.delete(args.assignmentId)
  },
})

// Soft delete assignment
export const softDeleteAssignment = mutation({
  args: { 
    userId: v.string(),
    assignmentId: v.id("assignments") 
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId)
    if (!assignment) {
      throw new Error("Assignment not found")
    }

    // Validate that the assignment belongs to the user
    if (assignment.userId !== args.userId) {
      throw new Error("You don't have permission to delete this assignment")
    }

    await ctx.db.patch(args.assignmentId, {
      isDeleted: true,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    })

    // Update class assignment count
    const classDoc = await ctx.db.get(assignment.classId)
    if (classDoc) {
      await ctx.db.patch(assignment.classId, {
        assignments: {
          completed: assignment.completed ? classDoc.assignments.completed - 1 : classDoc.assignments.completed,
          total: classDoc.assignments.total - 1,
        },
        updatedAt: Date.now(),
      })
    }

    // Update term stats
    const term = await ctx.db.get(assignment.termId)
    if (term) {
      await ctx.db.patch(assignment.termId, {
        stats: {
          ...term.stats,
          pendingTasks: assignment.completed ? term.stats.pendingTasks : term.stats.pendingTasks - 1,
          completed: assignment.completed ? term.stats.completed - 1 : term.stats.completed,
        },
        updatedAt: Date.now(),
      })
    }

    return args.assignmentId
  },
})

// Restore assignment
export const restoreAssignment = mutation({
  args: { 
    userId: v.string(),
    assignmentId: v.id("assignments") 
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId)
    if (!assignment || !assignment.isDeleted) {
      throw new Error("Assignment not found or not deleted")
    }

    // Validate that the assignment belongs to the user
    if (assignment.userId !== args.userId) {
      throw new Error("You don't have permission to restore this assignment")
    }

    await ctx.db.patch(args.assignmentId, {
      isDeleted: false,
      deletedAt: undefined,
      updatedAt: Date.now(),
    })

    // Update class assignment count
    const classDoc = await ctx.db.get(assignment.classId)
    if (classDoc) {
      await ctx.db.patch(assignment.classId, {
        assignments: {
          completed: assignment.completed ? classDoc.assignments.completed + 1 : classDoc.assignments.completed,
          total: classDoc.assignments.total + 1,
        },
        updatedAt: Date.now(),
      })
    }

    // Update term stats
    const term = await ctx.db.get(assignment.termId)
    if (term) {
      await ctx.db.patch(assignment.termId, {
        stats: {
          ...term.stats,
          pendingTasks: assignment.completed ? term.stats.pendingTasks : term.stats.pendingTasks + 1,
          completed: assignment.completed ? term.stats.completed + 1 : term.stats.completed,
        },
        updatedAt: Date.now(),
      })
    }

    return args.assignmentId
  },
})

// Permanent delete assignment
export const permanentDeleteAssignment = mutation({
  args: { 
    userId: v.string(),
    assignmentId: v.id("assignments") 
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId)
    if (!assignment) {
      throw new Error("Assignment not found")
    }

    // Validate that the assignment belongs to the user
    if (assignment.userId !== args.userId) {
      throw new Error("You don't have permission to delete this assignment")
    }

    // If not soft deleted, update counts first
    if (!assignment.isDeleted) {
      // Update class assignment count
      const classDoc = await ctx.db.get(assignment.classId)
      if (classDoc) {
        await ctx.db.patch(assignment.classId, {
          assignments: {
            completed: assignment.completed ? classDoc.assignments.completed - 1 : classDoc.assignments.completed,
            total: classDoc.assignments.total - 1,
          },
          updatedAt: Date.now(),
        })
      }

      // Update term stats
      const term = await ctx.db.get(assignment.termId)
      if (term) {
        await ctx.db.patch(assignment.termId, {
          stats: {
            ...term.stats,
            pendingTasks: assignment.completed ? term.stats.pendingTasks : term.stats.pendingTasks - 1,
            completed: assignment.completed ? term.stats.completed - 1 : term.stats.completed,
          },
          updatedAt: Date.now(),
        })
      }
    }

    return await ctx.db.delete(args.assignmentId)
  },
})

// Get deleted assignments
export const getDeletedAssignments = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("assignments")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isDeleted"), true))
      .collect()
  },
})

// Submit assignment with files and text
export const submitAssignment = mutation({
  args: {
    assignmentId: v.id("assignments"),
    userId: v.string(),
    submissionText: v.optional(v.string()),
    submissionFiles: v.optional(v.array(v.object({
      name: v.string(),
      size: v.number(),
      type: v.string(),
      url: v.optional(v.string()),
      uploadedAt: v.number(),
      fileId: v.optional(v.string()), // Added fileId for Convex storage
    }))),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId)
    if (!assignment) {
      throw new Error("Assignment not found")
    }

    // Verify the user owns this assignment
    if (assignment.userId !== args.userId) {
      throw new Error("Unauthorized: You can only submit your own assignments")
    }

    const wasCompleted = assignment.completed
    const now = Date.now()

    await ctx.db.patch(args.assignmentId, {
      submissionText: args.submissionText,
      submissionFiles: args.submissionFiles,
      submittedAt: now,
      completed: true,
      updatedAt: now,
    })

    // Update class assignment completion count if completion status changed
    if (!wasCompleted) {
      const classDoc = await ctx.db.get(assignment.classId)
      if (classDoc) {
        await ctx.db.patch(assignment.classId, {
          assignments: {
            completed: classDoc.assignments.completed + 1,
            total: classDoc.assignments.total,
          },
          updatedAt: now,
        })
      }

      // Update term stats
      const term = await ctx.db.get(assignment.termId)
      if (term) {
        await ctx.db.patch(assignment.termId, {
          stats: {
            ...term.stats,
            pendingTasks: Math.max(0, term.stats.pendingTasks - 1),
            completed: term.stats.completed + 1,
          },
          updatedAt: now,
        })
      }
    }

    return assignment._id
  },
})

// Get assignments with submitted work (files or text)
export const getSubmittedAssignments = query({
  args: {
    userId: v.string(),
    termId: v.optional(v.id("terms")),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("assignments")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.and(
          q.neq(q.field("isDeleted"), true),
          q.or(
            q.neq(q.field("submissionText"), undefined),
            q.neq(q.field("submissionFiles"), undefined)
          )
        )
      )

    if (args.termId) {
      query = query.filter((q) => q.eq(q.field("termId"), args.termId))
    }

    return await query.collect()
  },
})

export const getAssignmentsByClass = query({
  args: {
    userId: v.string(),
    classId: v.id("classes"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("assignments")
      .withIndex("by_classId", (q) => q.eq("classId", args.classId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect()
  },
})

// Get a single assignment with user validation
export const getAssignment = query({
  args: {
    userId: v.string(),
    assignmentId: v.id("assignments"),
  },
  handler: async (ctx, args) => {
    const assignment = await ctx.db.get(args.assignmentId)
    
    // Verify that the assignment belongs to the requesting user
    if (!assignment || assignment.userId !== args.userId) {
      return null
    }
    
    return assignment
  },
})

// Check and send notifications for assignments
export const checkAndSendNotifications = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date()
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    // Get user's notification preferences
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first()

    if (!user || !user.notifications) {
      return { success: false, error: "User not found or notifications not configured" }
    }

    const { assignmentReminders, deadlineAlerts } = user.notifications

    if (!assignmentReminders && !deadlineAlerts) {
      return { success: false, error: "All notifications are disabled" }
    }

    // Get all incomplete assignments for this user
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("completed"), false))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect()

    const results = []

    for (const assignment of assignments) {
      const dueDate = new Date(`${assignment.dueDate} ${assignment.dueTime || '23:59'}`)
      const hoursUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60))

      // Send deadline alerts for assignments due within 24 hours
      if (deadlineAlerts && dueDate <= oneDayFromNow && dueDate > now) {
        try {
          // For now, we'll simulate this call since we can't use ctx.runMutation in Convex
          // In a production environment, you'd want to use a scheduled function or external cron job
          console.log(`Would send deadline alert for ${assignment.title} due in ${hoursUntilDue} hours`)
          results.push({ 
            type: "deadline_alert", 
            assignment: assignment.title, 
            success: true, 
            note: "Simulated - would trigger notification" 
          })
        } catch (error) {
          results.push({ 
            type: "deadline_alert", 
            assignment: assignment.title, 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error" 
          })
        }
      }

      // Send assignment reminders for assignments due within 3 days (but not within 1 day)
      if (assignmentReminders && dueDate <= threeDaysFromNow && dueDate > oneDayFromNow) {
        try {
          // For now, we'll simulate this call since we can't use ctx.runMutation in Convex
          console.log(`Would send assignment reminder for ${assignment.title} due in ${Math.ceil(hoursUntilDue/24)} days`)
          results.push({ 
            type: "assignment_reminder", 
            assignment: assignment.title, 
            success: true, 
            note: "Simulated - would trigger notification" 
          })
        } catch (error) {
          results.push({ 
            type: "assignment_reminder", 
            assignment: assignment.title, 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error" 
          })
        }
      }
    }

    return { success: true, results, notificationsChecked: assignments.length }
  },
})
