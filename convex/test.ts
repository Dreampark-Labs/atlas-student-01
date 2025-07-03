import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const createTestAssignmentWithFiles = mutation({
  args: {
    userId: v.string(),
    termId: v.id("terms"),
    classId: v.id("classes"),
  },
  handler: async (ctx, args) => {
    // Create a test assignment with file attachments
    const assignmentId = await ctx.db.insert("assignments", {
      userId: args.userId,
      termId: args.termId,
      classId: args.classId,
      className: "Test Class",
      classColor: "#3b82f6",
      title: "Worksheet A Assignment",
      type: "Homework",
      dueDate: "2024-12-31",
      dueTime: "23:59",
      priority: "medium",
      completed: true,
      description:
        "Complete worksheet A problems including calculus derivatives",
      instructions:
        "Solve all problems in worksheet A, show your work for derivatives",
      rubric: "Grade based on correct solutions and clear explanations",
      submissionText: `Completed all worksheet A problems successfully. 

Key solutions:
1. Problem 1: Used chain rule for derivative calculation
2. Problem 2: Applied integration by parts technique
3. Problem 3: McCullough method worked perfectly for this complex equation

The assignment helped me understand advanced calculus concepts better. I referenced several textbook examples and verified my answers using online calculators.`,
      submissionFiles: [
        {
          name: "McCulloughCameronWSA.pdf",
          size: 1024000,
          type: "application/pdf",
          url: "/uploads/test-file-1.pdf",
          uploadedAt: Date.now(),
        },
        {
          name: "WorksheetA_Solutions.docx",
          size: 512000,
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          url: "/uploads/test-file-2.docx",
          uploadedAt: Date.now(),
        },
      ],
      submittedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create a second test assignment with different content
    const assignment2Id = await ctx.db.insert("assignments", {
      userId: args.userId,
      termId: args.termId,
      classId: args.classId,
      className: "Test Class",
      classColor: "#3b82f6",
      title: "Research Paper on Climate Change",
      type: "Essay",
      dueDate: "2024-12-15",
      dueTime: "23:59",
      priority: "high",
      completed: true,
      description:
        "Write a comprehensive research paper on climate change impacts",
      instructions: "Include at least 5 scholarly sources and proper citations",
      rubric:
        "Graded on content quality, citation format, and argument structure",
      submissionText: `Climate Change Research Paper Draft

Abstract:
This paper examines the multifaceted impacts of climate change on global ecosystems. Through analysis of temperature data, sea level measurements, and biodiversity studies, we demonstrate significant environmental changes occurring worldwide.

Introduction:
Climate change represents one of the most pressing challenges of our time. The McCullough Climate Assessment Framework provides a comprehensive approach to understanding these complex systems.

Methodology:
Data collection involved analyzing temperature records from 1850-2024, studying ice core samples, and reviewing peer-reviewed literature on atmospheric carbon dioxide levels.

Results:
Our findings indicate a clear correlation between human activities and rising global temperatures. Excel spreadsheets and data visualizations support these conclusions.`,
      submissionFiles: [
        {
          name: "ClimateResearch_McCullough.docx",
          size: 2048000,
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          url: "/uploads/test-file-3.docx",
          uploadedAt: Date.now(),
        },
        {
          name: "data_analysis.xlsx",
          size: 1536000,
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          url: "/uploads/test-file-4.xlsx",
          uploadedAt: Date.now(),
        },
        {
          name: "bibliography.pdf",
          size: 512000,
          type: "application/pdf",
          url: "/uploads/test-file-5.pdf",
          uploadedAt: Date.now(),
        },
      ],
      submittedAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { assignment1: assignmentId, assignment2: assignment2Id };
  },
});

export const clearTestData = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Clear test assignments
    const assignments = await ctx.db
      .query("assignments")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) =>
        q.or(
          q.eq(q.field("title"), "Worksheet A Assignment"),
          q.eq(q.field("title"), "Research Paper on Climate Change"),
        ),
      )
      .collect();

    for (const assignment of assignments) {
      await ctx.db.delete(assignment._id);
    }

    return { cleared: assignments.length };
  },
});
