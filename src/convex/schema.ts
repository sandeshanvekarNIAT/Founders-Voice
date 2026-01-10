import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // Founder-Voice tables
    pitchSessions: defineTable({
      userId: v.id("users"),
      title: v.string(),
      status: v.union(
        v.literal("uploading"),
        v.literal("preparing"),
        v.literal("live"),
        v.literal("completed"),
        v.literal("failed")
      ),
      pitchContextPdf: v.optional(v.id("_storage")),
      pitchContextText: v.optional(v.string()),
      marketContext: v.optional(v.string()), // Tavily pre-fetch results (JSON string)
      startTime: v.optional(v.number()),
      endTime: v.optional(v.number()),
      transcript: v.optional(v.string()),
      reportCard: v.optional(
        v.object({
          marketClarity: v.number(),
          techDefensibility: v.number(),
          unitEconomicLogic: v.number(),
          investorReadiness: v.number(),
          overallScore: v.number(),
          insights: v.string(),
          coachabilityDelta: v.number(),
        })
      ),
    })
      .index("by_user", ["userId"])
      .index("by_status", ["status"]),

    interruptions: defineTable({
      sessionId: v.id("pitchSessions"),
      timestamp: v.number(),
      triggerType: v.union(
        v.literal("reality_check"),
        v.literal("math_check"),
        v.literal("bs_detector")
      ),
      founderStatement: v.string(),
      vcResponse: v.string(),
      founderReaction: v.optional(
        v.union(v.literal("defensive"), v.literal("receptive"), v.literal("neutral"))
      ),
    }).index("by_session", ["sessionId"]),

    mentorshipChats: defineTable({
      sessionId: v.id("pitchSessions"),
      userId: v.id("users"),
      messages: v.array(
        v.object({
          role: v.union(v.literal("user"), v.literal("assistant")),
          content: v.string(),
          timestamp: v.number(),
        })
      ),
      focusArea: v.union(
        v.literal("market"),
        v.literal("tech"),
        v.literal("economics"),
        v.literal("readiness")
      ),
    })
      .index("by_session", ["sessionId"])
      .index("by_user", ["userId"])
  },
  {
    schemaValidation: false,
  },
);

export default schema;
