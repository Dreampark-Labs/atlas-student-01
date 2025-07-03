import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";

// Generate a URL to upload a file to
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    // Return a short-lived upload URL
    return await ctx.storage.generateUploadUrl();
  },
});

// Store file metadata in the database and return the file's ID
export const storeFileMetadata = mutation({
  args: {
    userId: v.string(),
    assignmentId: v.optional(v.id("assignments")),
    fileId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    fileType: v.string(),
  },
  handler: async (ctx, args) => {
    // Store file metadata in the database
    const fileMetadata = await ctx.db.insert("files", {
      userId: args.userId,
      assignmentId: args.assignmentId,
      storageId: args.fileId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      fileType: args.fileType,
      uploadedAt: Date.now(),
    });
    
    return fileMetadata;
  },
});

// Get a file's URL by ID
export const getFileUrl = query({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new ConvexError("File not found");
    }
    
    // Get a URL for the file that's valid for 1 hour
    return await ctx.storage.getUrl(file.storageId);
  },
});

// Delete a file by ID
export const deleteFile = mutation({
  args: {
    fileId: v.id("files"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new ConvexError("File not found");
    }
    
    // Check if user has permission to delete this file
    if (file.userId !== args.userId) {
      throw new ConvexError("Not authorized to delete this file");
    }
    
    // Delete from storage first
    await ctx.storage.delete(file.storageId);
    
    // Then delete the metadata
    await ctx.db.delete(args.fileId);
  },
});

// Get all files for an assignment
export const getAssignmentFiles = query({
  args: {
    assignmentId: v.id("assignments"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user has access to this assignment
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new ConvexError("Assignment not found");
    }
    
    if (assignment.userId !== args.userId) {
      throw new ConvexError("Not authorized to access these files");
    }
    
    // Get all files for this assignment
    const files = await ctx.db
      .query("files")
      .withIndex("by_assignmentId", (q) => 
        q.eq("assignmentId", args.assignmentId)
      )
      .collect();
    
    // Generate URLs for each file
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        const url = await ctx.storage.getUrl(file.storageId);
        return {
          ...file,
          url,
        };
      })
    );
    
    return filesWithUrls;
  },
});

// Get a file's URL by storage ID (string version for HTTP actions)
export const getFileUrlByStorageIdString = query({
  args: {
    storageId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Convert string to Id<"_storage"> - this is safe because Convex storage IDs are strings under the hood
    const storageId = args.storageId as Id<"_storage">;
    
    // Find the file by storage ID
    const file = await ctx.db
      .query("files")
      .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
      .first();
    
    if (!file) {
      throw new ConvexError("File not found");
    }
    
    // Check if user has permission to access this file
    if (file.userId !== args.userId) {
      throw new ConvexError("Not authorized to access this file");
    }
    
    // Get a URL for the file that's valid for 1 hour
    const url = await ctx.storage.getUrl(file.storageId);
    return url;
  },
});

// Get a file's URL by storage ID
export const getFileUrlByStorageId = query({
  args: {
    storageId: v.id("_storage"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the file by storage ID
    const file = await ctx.db
      .query("files")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .first();
    
    if (!file) {
      throw new ConvexError("File not found");
    }
    
    // Check if user has permission to access this file
    if (file.userId !== args.userId) {
      throw new ConvexError("Not authorized to access this file");
    }
    
    // Get a URL for the file that's valid for 1 hour
    return await ctx.storage.getUrl(file.storageId);
  },
});
