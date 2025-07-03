import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const createTerm = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    year: v.number(),
    season: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Set all other terms to inactive
    const existingTerms = await ctx.db
      .query("terms")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect()

    for (const term of existingTerms) {
      if (term.isActive) {
        await ctx.db.patch(term._id, { isActive: false })
      }
    }

    return await ctx.db.insert("terms", {
      ...args,
      isActive: true,
      stats: {
        pendingTasks: 0,
        classes: 0,
        gpa: 0.0,
        completed: 0,
      },
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const getTerms = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("terms")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .order("desc")
      .collect()
  },
})

export const getTerm = query({
  args: { 
    userId: v.string(),
    termId: v.id("terms") 
  },
  handler: async (ctx, args) => {
    const term = await ctx.db.get(args.termId)
    
    // Verify that the term belongs to the requesting user
    if (!term || term.userId !== args.userId) {
      return null
    }
    
    return term
  },
})

export const updateTermActive = mutation({
  args: {
    userId: v.string(),
    termId: v.id("terms"),
  },
  handler: async (ctx, args) => {
    // Verify that the term belongs to the user
    const termToActivate = await ctx.db.get(args.termId)
    if (!termToActivate || termToActivate.userId !== args.userId) {
      throw new Error("Term not found or access denied")
    }

    // Set all terms to inactive for this user
    const allTerms = await ctx.db
      .query("terms")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect()

    for (const term of allTerms) {
      await ctx.db.patch(term._id, { isActive: false })
    }

    // Set the selected term to active
    return await ctx.db.patch(args.termId, { isActive: true })
  },
})

export const updateTermStats = mutation({
  args: {
    userId: v.string(),
    termId: v.id("terms"),
    stats: v.object({
      pendingTasks: v.number(),
      classes: v.number(),
      gpa: v.number(),
      completed: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // Verify that the term belongs to the user
    const term = await ctx.db.get(args.termId)
    if (!term || term.userId !== args.userId) {
      throw new Error("Term not found or access denied")
    }

    return await ctx.db.patch(args.termId, {
      stats: args.stats,
      updatedAt: Date.now(),
    })
  },
})

export const createFirstTerm = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1 // JavaScript months are 0-indexed

    let season = "Fall"
    if (currentMonth >= 1 && currentMonth <= 5) {
      season = "Spring"
    } else if (currentMonth >= 6 && currentMonth <= 8) {
      season = "Summer"
    }

    const now = Date.now()

    return await ctx.db.insert("terms", {
      userId: args.userId,
      name: `${season} ${currentYear}`,
      year: currentYear,
      season: season,
      isActive: true,
      stats: {
        pendingTasks: 0,
        classes: 0,
        gpa: 0.0,
        completed: 0,
      },
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const setActiveTerm = mutation({
  args: {
    userId: v.string(),
    termId: v.id("terms"),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Verify that the term belongs to the user
    const termToActivate = await ctx.db.get(args.termId)
    if (!termToActivate || termToActivate.userId !== args.userId) {
      throw new Error("Term not found or access denied")
    }

    // Set all other terms to inactive for this user
    const existingTerms = await ctx.db
      .query("terms")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect()

    for (const term of existingTerms) {
      if (term.isActive && term._id !== args.termId) {
        await ctx.db.patch(term._id, { isActive: false, updatedAt: now })
      }
    }

    // Set the selected term as active
    await ctx.db.patch(args.termId, { isActive: true, updatedAt: now })
  },
})

export const getActiveTerm = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("terms")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .first()
  },
})

export const getDeletedTerms = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("terms")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isDeleted"), true))
      .order("desc")
      .collect()
  },
})

export const softDeleteTerm = mutation({
  args: {
    termId: v.id("terms"),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    console.log(`softDeleteTerm called with termId: ${args.termId}`)
    
    const term = await ctx.db.get(args.termId)
    if (!term) {
      console.error(`Term not found: ${args.termId}`)
      throw new Error("Term not found")
    }

    // Verify the user owns this term
    if (term.userId !== args.userId) {
      throw new Error("You don't have permission to delete this term")
    }

    console.log(`Found term: ${term.name}, isDeleted: ${term.isDeleted}, isActive: ${term.isActive}`)

    if (term.isDeleted) {
      console.error(`Term already deleted: ${args.termId}`)
      throw new Error("Term is already deleted")
    }

    if (term.isActive) {
      console.error(`Cannot delete active term: ${term.name}`)
      throw new Error(`Cannot delete the active term "${term.name}". Please set another term as active first.`)
    }

    console.log(`Attempting to soft delete term: ${term.name} (ID: ${args.termId}), isActive: ${term.isActive}`)

    const now = Date.now()

    try {
      // Get all classes in this term
      const classes = await ctx.db
        .query("classes")
        .withIndex("by_termId", (q) => q.eq("termId", args.termId))
        .filter((q) => q.neq(q.field("isDeleted"), true))
        .collect()

      // Soft delete all classes and their assignments
      for (const classItem of classes) {
        // Get assignments for this class
        const assignments = await ctx.db
          .query("assignments")
          .withIndex("by_classId", (q) => q.eq("classId", classItem._id))
          .filter((q) => q.neq(q.field("isDeleted"), true))
          .collect()

        // Soft delete assignments
        const assignmentUpdates = assignments.map(assignment =>
          ctx.db.patch(assignment._id, {
            isDeleted: true,
            deletedAt: now,
            updatedAt: now,
          })
        )
        await Promise.all(assignmentUpdates)

        // Soft delete the class
        await ctx.db.patch(classItem._id, {
          isDeleted: true,
          deletedAt: now,
          updatedAt: now,
        })
      }

      // Finally, soft delete the term
      const result = await ctx.db.patch(args.termId, {
        isDeleted: true,
        deletedAt: now,
        updatedAt: now,
      })
      
      console.log(`Successfully soft deleted term: ${term.name} (ID: ${args.termId})`)
      return result
    } catch (error) {
      console.error("Error in softDeleteTerm:", error)
      throw new Error("Failed to delete term. Please try again.")
    }
  },
})

export const restoreTerm = mutation({
  args: {
    termId: v.id("terms"),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    const term = await ctx.db.get(args.termId)
    if (!term || !term.isDeleted) {
      throw new Error("Term not found or not deleted")
    }

    // Verify the user owns this term
    if (term.userId !== args.userId) {
      throw new Error("You don't have permission to restore this term")
    }

    const now = Date.now()

    try {
      // Get all deleted classes in this term
      const classes = await ctx.db
        .query("classes")
        .withIndex("by_termId", (q) => q.eq("termId", args.termId))
        .filter((q) => q.eq(q.field("isDeleted"), true))
        .collect()

      // Restore all classes and their assignments
      for (const classItem of classes) {
        // Get deleted assignments for this class
        const assignments = await ctx.db
          .query("assignments")
          .withIndex("by_classId", (q) => q.eq("classId", classItem._id))
          .filter((q) => q.eq(q.field("isDeleted"), true))
          .collect()

        // Restore assignments
        const assignmentUpdates = assignments.map(assignment =>
          ctx.db.patch(assignment._id, {
            isDeleted: undefined,
            deletedAt: undefined,
            updatedAt: now,
          })
        )
        await Promise.all(assignmentUpdates)

        // Restore the class
        await ctx.db.patch(classItem._id, {
          isDeleted: undefined,
          deletedAt: undefined,
          updatedAt: now,
        })
      }

      // Finally, restore the term
      return await ctx.db.patch(args.termId, {
        isDeleted: undefined,
        deletedAt: undefined,
        updatedAt: now,
      })
    } catch (error) {
      console.error("Error in restoreTerm:", error)
      throw new Error("Failed to restore term. Please try again.")
    }
  },
})

export const permanentDeleteTerm = mutation({
  args: {
    termId: v.id("terms"),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    const term = await ctx.db.get(args.termId)
    if (!term) {
      throw new Error("Term not found")
    }

    // Verify the user owns this term
    if (term.userId !== args.userId) {
      throw new Error("You don't have permission to delete this term")
    }

    if (!term.isDeleted) {
      throw new Error("Term must be soft deleted before permanent deletion")
    }

    try {
      // Get all classes in this term (both deleted and not deleted)
      const classes = await ctx.db
        .query("classes")
        .withIndex("by_termId", (q) => q.eq("termId", args.termId))
        .collect()

      // Permanently delete all classes and their assignments
      for (const classItem of classes) {
        // Get all assignments for this class
        const assignments = await ctx.db
          .query("assignments")
          .withIndex("by_classId", (q) => q.eq("classId", classItem._id))
          .collect()

        // Delete all assignments
        const assignmentDeletes = assignments.map(assignment =>
          ctx.db.delete(assignment._id)
        )
        await Promise.all(assignmentDeletes)

        // Delete the class
        await ctx.db.delete(classItem._id)
      }

      // Finally, permanently delete the term
      return await ctx.db.delete(args.termId)
    } catch (error) {
      console.error("Error in permanentDeleteTerm:", error)
      throw new Error("Failed to permanently delete term. Please try again.")
    }
  },
})

export const getTermBySlug = query({
  args: {
    userId: v.string(),
    slugId: v.string()
  },
  handler: async (ctx, args) => {
    // Get all terms for the user
    const terms = await ctx.db
      .query("terms")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect()
    
    // Find the term whose ID ends with the slug ID
    const term = terms.find(term => term._id.endsWith(args.slugId))
    
    return term || null
  },
})
