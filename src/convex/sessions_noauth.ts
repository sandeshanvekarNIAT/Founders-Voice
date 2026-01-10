// TEST MODE: Sessions with authentication disabled
// This file bypasses all auth checks for testing purposes

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Helper to get or create test user
async function getTestUser(ctx: any): Promise<Id<"users">> {
  const testUser = await ctx.db
    .query("users")
    .filter((q: any) => q.eq(q.field("email"), "test@example.com"))
    .first();

  if (testUser) {
    return testUser._id;
  }

  // Create test user
  return await ctx.db.insert("users", {
    email: "test@example.com",
    name: "Test User",
    emailVerificationTime: Date.now(),
  });
}

export const createPitchSession = mutation({
  args: {
    title: v.string(),
    pitchContextPdf: v.optional(v.id("_storage")),
    pitchContextText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get or create test user
    const userId = await getTestUser(ctx);

    const sessionId = await ctx.db.insert("pitchSessions", {
      userId,
      title: args.title,
      status: "preparing",
      pitchContextPdf: args.pitchContextPdf,
      pitchContextText: args.pitchContextText,
    });

    // Trigger pre-fetch market context using Tavily
    if (args.pitchContextText) {
      await ctx.scheduler.runAfter(0, internal.tavily.prefetchMarketContext, {
        sessionId,
        pitchContext: args.pitchContextText,
      });
    }

    return sessionId;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getPitchSession = query({
  args: { sessionId: v.id("pitchSessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const startPitchSession = mutation({
  args: { sessionId: v.id("pitchSessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "live",
      startTime: Date.now(),
    });
  },
});

export const endPitchSession = mutation({
  args: { sessionId: v.id("pitchSessions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      status: "completed",
      endTime: Date.now(),
    });

    // Trigger report card generation
    await ctx.scheduler.runAfter(0, internal.ai.generateReportCard, {
      sessionId: args.sessionId,
    });
  },
});

export const addInterruption = mutation({
  args: {
    sessionId: v.id("pitchSessions"),
    triggerType: v.union(
      v.literal("reality_check"),
      v.literal("math_check"),
      v.literal("bs_detector")
    ),
    founderStatement: v.string(),
    vcResponse: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("interruptions", {
      sessionId: args.sessionId,
      timestamp: Date.now(),
      triggerType: args.triggerType,
      founderStatement: args.founderStatement,
      vcResponse: args.vcResponse,
    });
  },
});

export const getInterruptions = query({
  args: { sessionId: v.id("pitchSessions") },
  handler: async (ctx, args) => {
    const interruptions = await ctx.db
      .query("interruptions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    return interruptions;
  },
});

export const getUserSessions = query({
  args: {},
  handler: async (ctx) => {
    // Get test user
    const userId = await getTestUser(ctx);

    const sessions = await ctx.db
      .query("pitchSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);

    return sessions;
  },
});

export const updateTranscript = mutation({
  args: {
    sessionId: v.id("pitchSessions"),
    transcript: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      transcript: args.transcript,
    });
  },
});

export const submitFounderResponse = mutation({
  args: {
    interruptionId: v.id("interruptions"),
    responseText: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.interruptionId, {
      founderResponseText: args.responseText,
      responseTimestamp: Date.now(),
    });
  },
});
