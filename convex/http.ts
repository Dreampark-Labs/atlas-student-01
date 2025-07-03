import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

// HTTP action to get file URL with authentication
http.route({
  path: "/get-file-url",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Get the request body
      const body = await request.json();
      const { storageId, userId } = body;

      if (!storageId || !userId) {
        return new Response(
          JSON.stringify({ error: "Missing storageId or userId" }),
          { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      // Call the query to get the file URL (using string version)
      const fileUrl = await ctx.runQuery(api.files.getFileUrlByStorageIdString, {
        storageId: storageId,
        userId: userId,
      });

      return new Response(
        JSON.stringify({ url: fileUrl }),
        { 
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
          }
        }
      );
    } catch (error) {
      console.error("Error in get-file-url HTTP action:", error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to get file URL", 
          details: error instanceof Error ? error.message : "Unknown error" 
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }),
});

// Handle preflight requests
http.route({
  path: "/get-file-url",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }),
});

export default http;
