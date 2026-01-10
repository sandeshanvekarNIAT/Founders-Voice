import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createPitchSession = mutation({
  args: {
    title: v.string(),
    pitchContextPdf: v.optional(v.id("_storage")),
    pitchContextText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const getPitchSession = query({
  args: { sessionId: v.id("pitchSessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    return session;
  },
});

export const startPitchSession = mutation({
  args: { sessionId: v.id("pitchSessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(args.sessionId, {
      status: "live",
      startTime: Date.now(),
    });
  },
});

export const endPitchSession = mutation({
  args: { sessionId: v.id("pitchSessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(args.sessionId, {
      status: "completed",
      endTime: Date.now(),
    });

    // Trigger report card generation using OpenAI o1-mini
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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      throw new Error("Session not found");
    }

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
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const sessions = await ctx.db
      .query("pitchSessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);

    return sessions;
  },
});

// Internal queries/mutations for AI actions
export const getSessionInternal = internalQuery({
  args: { sessionId: v.id("pitchSessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const getInterruptionsInternal = internalQuery({
  args: { sessionId: v.id("pitchSessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("interruptions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const addInterruptionInternal = internalMutation({
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

export const updateReportCard = internalMutation({
  args: {
    sessionId: v.id("pitchSessions"),
    reportCard: v.object({
      marketClarity: v.number(),
      techDefensibility: v.number(),
      unitEconomicLogic: v.number(),
      investorReadiness: v.number(),
      overallScore: v.number(),
      coachabilityDelta: v.number(),
      insights: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      reportCard: args.reportCard,
    });
  },
});

export const updateSessionContext = internalMutation({
  args: {
    sessionId: v.id("pitchSessions"),
    marketContext: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      marketContext: args.marketContext,
    });
  },
});

export const addChatMessage = internalMutation({
  args: {
    sessionId: v.id("pitchSessions"),
    focusArea: v.union(
      v.literal("market"),
      v.literal("tech"),
      v.literal("economics"),
      v.literal("readiness")
    ),
    userMessage: v.string(),
    assistantMessage: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if chat exists
    const existing = await ctx.db
      .query("mentorshipChats")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("focusArea"), args.focusArea))
      .first();

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (existing) {
      // Append to existing chat
      await ctx.db.patch(existing._id, {
        messages: [
          ...existing.messages,
          {
            role: "user" as const,
            content: args.userMessage,
            timestamp: Date.now(),
          },
          {
            role: "assistant" as const,
            content: args.assistantMessage,
            timestamp: Date.now(),
          },
        ],
      });
    } else {
      // Create new chat
      await ctx.db.insert("mentorshipChats", {
        sessionId: args.sessionId,
        userId: session.userId,
        focusArea: args.focusArea,
        messages: [
          {
            role: "user" as const,
            content: args.userMessage,
            timestamp: Date.now(),
          },
          {
            role: "assistant" as const,
            content: args.assistantMessage,
            timestamp: Date.now(),
          },
        ],
      });
    }
  },
});

export const updateInterruptionReaction = internalMutation({
  args: {
    interruptionId: v.id("interruptions"),
    founderReaction: v.union(
      v.literal("defensive"),
      v.literal("receptive"),
      v.literal("neutral")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.interruptionId, {
      founderReaction: args.founderReaction,
    });
  },
});
