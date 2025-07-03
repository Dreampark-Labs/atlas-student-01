import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const createClass = mutation({
  args: {
    userId: v.string(),
    termId: v.id("terms"),
    name: v.string(),
    code: v.string(),
    professor: v.string(),
    credits: v.number(),
    color: v.string(),
    description: v.optional(v.string()),
    meetingTimes: v.optional(v.string()),
    location: v.optional(v.string()),
    gradingScheme: v.object({
      categories: v.array(
        v.object({
          name: v.string(),
          weight: v.number(),
          count: v.number(),
        }),
      ),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    
    // Create the class
    const classId = await ctx.db.insert("classes", {
      ...args,
      assignments: {
        completed: 0,
        total: 0,
      },
      createdAt: now,
      updatedAt: now,
    })

    // Update the term's class count
    const term = await ctx.db.get(args.termId)
    if (term) {
      await ctx.db.patch(args.termId, {
        stats: {
          ...term.stats,
          classes: term.stats.classes + 1,
        },
        updatedAt: now,
      })
    }

    return classId
  },
})

export const getClassesByTerm = query({
  args: {
    userId: v.string(),
    termId: v.id("terms"),
    includeDeleted: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const classes = await ctx.db
      .query("classes")
      .withIndex("by_termId", (q) => q.eq("termId", args.termId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect()
    
    if (args.includeDeleted) {
      return classes
    }
    
    return classes.filter(c => !c.isDeleted)
  },
})

export const getDeletedClasses = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("classes")
      .withIndex("by_deleted", (q) => q.eq("isDeleted", true))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect()
  },
})

export const getActiveClasses = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("classes")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect()
  },
})

export const getAllClasses = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("classes")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect()
  },
})

export const getClass = query({
  args: { 
    userId: v.string(),
    classId: v.id("classes") 
  },
  handler: async (ctx, args) => {
    const classDoc = await ctx.db.get(args.classId)
    
    // Verify that the class belongs to the requesting user
    if (!classDoc || classDoc.userId !== args.userId) {
      return null
    }
    
    return classDoc
  },
})

export const getClassBySlug = query({
  args: {
    userId: v.string(),
    slugId: v.string()
  },
  handler: async (ctx, args) => {
    // Get all classes for the user
    const classes = await ctx.db
      .query("classes")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect()
    
    // Find the class whose ID ends with the slug ID
    const classDoc = classes.find(cls => cls._id.endsWith(args.slugId))
    
    return classDoc || null
  },
})

export const updateClass = mutation({
  args: {
    classId: v.id("classes"),
    userId: v.string(),
    updates: v.object({
      name: v.optional(v.string()),
      code: v.optional(v.string()),
      professor: v.optional(v.string()),
      credits: v.optional(v.number()),
      color: v.optional(v.string()),
      currentGrade: v.optional(v.number()),
      description: v.optional(v.string()),
      meetingTimes: v.optional(v.string()),
      location: v.optional(v.string()),
      gradingScheme: v.optional(v.object({
        mode: v.optional(v.string()),
        categories: v.array(
          v.object({
            name: v.string(),
            weight: v.number(),
            count: v.number(),
            dropLowest: v.optional(v.number()),
          }),
        ),
      })),
      assignments: v.optional(
        v.object({
          completed: v.number(),
          total: v.number(),
        }),
      ),
    }),
  },
  handler: async (ctx, args) => {
    const classDoc = await ctx.db.get(args.classId)
    if (!classDoc) {
      throw new Error("Class not found")
    }

    // Verify the user owns this class
    if (classDoc.userId !== args.userId) {
      throw new Error("You don't have permission to update this class")
    }

    return await ctx.db.patch(args.classId, {
      ...args.updates,
      updatedAt: Date.now(),
    })
  },
})

export const softDeleteClass = mutation({
  args: { 
    userId: v.string(),
    classId: v.id("classes") 
  },
  handler: async (ctx, args) => {
    const classDoc = await ctx.db.get(args.classId)
    if (!classDoc) {
      throw new Error("Class not found")
    }

    // Verify the user owns this class
    if (classDoc.userId !== args.userId) {
      throw new Error("You don't have permission to delete this class")
    }

    if (classDoc.isDeleted) {
      throw new Error("Class is already deleted")
    }

    const now = Date.now()

    try {
      // Get assignments before soft deleting them
      const assignments = await ctx.db
        .query("assignments")
        .withIndex("by_classId", (q) => q.eq("classId", args.classId))
        .filter((q) => q.neq(q.field("isDeleted"), true))
        .collect()

      // Batch update assignments to avoid too many individual operations
      const assignmentUpdates = assignments.map(assignment => 
        ctx.db.patch(assignment._id, {
          isDeleted: true,
          deletedAt: now,
          updatedAt: now,
        })
      )

      // Wait for all assignment updates to complete
      await Promise.all(assignmentUpdates)

      // Update term stats in a single operation
      const term = await ctx.db.get(classDoc.termId)
      if (term) {
        const completedAssignments = assignments.filter(a => a.completed).length
        const pendingAssignments = assignments.filter(a => !a.completed).length

        await ctx.db.patch(classDoc.termId, {
          stats: {
            ...term.stats,
            classes: Math.max(0, term.stats.classes - 1),
            completed: Math.max(0, term.stats.completed - completedAssignments),
            pendingTasks: Math.max(0, term.stats.pendingTasks - pendingAssignments),
          },
          updatedAt: now,
        })
      }

      // Finally, soft delete the class
      return await ctx.db.patch(args.classId, {
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
      })
    } catch (error) {
      console.error("Error in softDeleteClass:", error)
      throw new Error("Failed to delete class. Please try again.")
    }
  },
})

export const restoreClass = mutation({
  args: {
    classId: v.id("classes"),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    const classDoc = await ctx.db.get(args.classId)
    if (!classDoc || !classDoc.isDeleted) {
      throw new Error("Class not found or not deleted")
    }

    // Verify the user owns this class
    if (classDoc.userId !== args.userId) {
      throw new Error("You don't have permission to restore this class")
    }

    const now = Date.now()

    // Get deleted assignments for this class
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_classId", (q) => q.eq("classId", args.classId))
      .filter((q) => q.eq(q.field("isDeleted"), true))
      .collect()

    // Batch restore assignments
    const assignmentUpdates = assignments.map(assignment => 
      ctx.db.patch(assignment._id, {
        isDeleted: undefined,
        deletedAt: undefined,
        updatedAt: now,
      })
    )

    // Wait for all assignment updates to complete
    await Promise.all(assignmentUpdates)

    // Update term stats in a single operation
    const term = await ctx.db.get(classDoc.termId)
    if (term) {
      const completedAssignments = assignments.filter(a => a.completed).length
      const pendingAssignments = assignments.filter(a => !a.completed).length

      await ctx.db.patch(classDoc.termId, {
        stats: {
          ...term.stats,
          classes: term.stats.classes + 1,
          completed: term.stats.completed + completedAssignments,
          pendingTasks: term.stats.pendingTasks + pendingAssignments,
        },
        updatedAt: now,
      })
    }

    // Finally, restore the class
    return await ctx.db.patch(args.classId, {
      isDeleted: undefined,
      deletedAt: undefined,
      updatedAt: now,
    })
  },
})

export const permanentDeleteClass = mutation({
  args: {
    classId: v.id("classes"),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    const classDoc = await ctx.db.get(args.classId)
    if (!classDoc) {
      throw new Error("Class not found")
    }

    // Verify the user owns this class
    if (classDoc.userId !== args.userId) {
      throw new Error("You don't have permission to delete this class")
    }

    // Permanently delete all assignments in this class
    const assignments = await ctx.db
      .query("assignments")
      .withIndex("by_classId", (q) => q.eq("classId", args.classId))
      .collect()

    for (const assignment of assignments) {
      await ctx.db.delete(assignment._id)
    }

    // No need to update term stats if class is already soft deleted
    // If it's not soft deleted, we need to update stats
    if (!classDoc.isDeleted) {
      const term = await ctx.db.get(classDoc.termId)
      if (term) {
        const completedAssignments = assignments.filter(a => a.completed && !a.isDeleted).length
        const pendingAssignments = assignments.filter(a => !a.completed && !a.isDeleted).length

        await ctx.db.patch(classDoc.termId, {
          stats: {
            ...term.stats,
            classes: Math.max(0, term.stats.classes - 1),
            completed: Math.max(0, term.stats.completed - completedAssignments),
            pendingTasks: Math.max(0, term.stats.pendingTasks - pendingAssignments),
          },
          updatedAt: Date.now(),
        })
      }
    }

    // Permanently delete the class
    return await ctx.db.delete(args.classId)
  },
})

export const updateGradingScheme = mutation({
  args: {
    classId: v.id("classes"),
    userId: v.string(),
    gradingScheme: v.object({
      mode: v.optional(v.string()),
      categories: v.array(
        v.object({
          name: v.string(),
          weight: v.number(),
          count: v.number(),
          dropLowest: v.optional(v.number()),
        }),
      ),
    }),
  },
  handler: async (ctx, args) => {
    const classDoc = await ctx.db.get(args.classId)
    if (!classDoc) {
      throw new Error("Class not found")
    }

    // Verify the user owns this class
    if (classDoc.userId !== args.userId) {
      throw new Error("You don't have permission to update this class")
    }

    return await ctx.db.patch(args.classId, {
      gradingScheme: args.gradingScheme,
      updatedAt: Date.now(),
    })
  },
})
