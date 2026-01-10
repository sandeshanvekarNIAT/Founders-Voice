"use node";

import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate the Fundability Report Card using o1-mini
export const generateReportCard = action({
  args: { sessionId: v.id("pitchSessions") },
  handler: async (ctx, args) => {
    // Get session data
    const session = await ctx.runQuery(internal.sessions.getSessionInternal, {
      sessionId: args.sessionId,
    });

    if (!session) {
      throw new Error("Session not found");
    }

    // Get all interruptions for context
    const interruptions = await ctx.runQuery(
      internal.sessions.getInterruptionsInternal,
      { sessionId: args.sessionId }
    );

    // Build context for o1-mini
    const context = `
You are a hardcore VC analyst using the Bill Payne Scorecard method. Analyze this pitch session and generate a comprehensive Fundability Report Card.

PITCH CONTEXT:
${session.pitchContextText || "No written context provided"}

TRANSCRIPT:
${session.transcript || "Session ended without transcript"}

INTERRUPTIONS & FOUNDER RESPONSES:
${interruptions.map((i: { triggerType: string; founderStatement: string; vcResponse: string; founderReaction?: string }) => `[${i.triggerType}] Founder: "${i.founderStatement}" | VC: "${i.vcResponse}" | Reaction: ${i.founderReaction || "unknown"}`).join("\n")}

Evaluate on these 4 pillars (0-100 each):
1. MARKET CLARITY: How well-defined is the market? Are TAM/SAM claims credible? Are competitors acknowledged?
2. TECH DEFENSIBILITY: Is there real IP or moat? Or is this just a "GPT wrapper"?
3. UNIT ECONOMIC LOGIC: Do the CAC, LTV, and runway numbers make sense? Is pricing defensible?
4. INVESTOR READINESS: How coachable is the founder? Did they get defensive during interruptions?

Calculate a COACHABILITY DELTA based on founder reactions:
- Defensive reactions: SUBTRACT 10 points from Investor Readiness
- Receptive reactions: ADD 5 points
- Neutral: No change

Provide a JSON response with this structure:
{
  "marketClarity": <0-100>,
  "techDefensibility": <0-100>,
  "unitEconomicLogic": <0-100>,
  "investorReadiness": <0-100>,
  "overallScore": <average of 4 pillars>,
  "coachabilityDelta": <calculated from reactions>,
  "insights": "<brutally honest 3-5 sentence assessment>"
}
`;

    try {
      const response = await openai.chat.completions.create({
        model: "o1-mini",
        messages: [
          {
            role: "user",
            content: context,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      // Parse the JSON response
      const reportCard = JSON.parse(content);

      // Save to database
      await ctx.runMutation(internal.sessions.updateReportCard, {
        sessionId: args.sessionId,
        reportCard,
      });

      return reportCard;
    } catch (error) {
      console.error("Failed to generate report card:", error);
      throw error;
    }
  },
});

// Process audio chunk for interruption detection
export const processAudioChunk = action({
  args: {
    sessionId: v.id("pitchSessions"),
    audioData: v.string(), // Base64 encoded audio
    transcript: v.string(),
  },
  handler: async (ctx, args) => {
    // Analyze transcript for trigger patterns
    const text = args.transcript.toLowerCase();

    let triggerType: "reality_check" | "math_check" | "bs_detector" | null =
      null;
    let vcResponse = "";

    // Reality Check triggers
    if (
      text.includes("no competitors") ||
      text.includes("no competition") ||
      text.includes("first to market") ||
      text.includes("unique in the world")
    ) {
      triggerType = "reality_check";
      vcResponse = await generateVCInterruption(
        "reality_check",
        args.transcript
      );
    }

    // Math Check triggers
    else if (
      text.includes("hiring") ||
      text.includes("marketing spend") ||
      text.includes("runway") ||
      text.includes("burn rate")
    ) {
      triggerType = "math_check";
      vcResponse = await generateVCInterruption("math_check", args.transcript);
    }

    // BS Detector triggers
    else if (
      text.includes("proprietary ai") ||
      text.includes("our ai") ||
      text.includes("machine learning") ||
      text.includes("blockchain")
    ) {
      triggerType = "bs_detector";
      vcResponse = await generateVCInterruption("bs_detector", args.transcript);
    }

    // If triggered, add interruption
    if (triggerType && vcResponse) {
      await ctx.runMutation(internal.sessions.addInterruptionInternal, {
        sessionId: args.sessionId,
        triggerType,
        founderStatement: args.transcript,
        vcResponse,
      });

      return { interrupted: true, vcResponse };
    }

    return { interrupted: false };
  },
});

// Generate VC interruption using GPT-4
async function generateVCInterruption(
  triggerType: string,
  founderStatement: string
): Promise<string> {
  const prompts = {
    reality_check: `The founder just claimed: "${founderStatement}"

You are a hardcore VC. Challenge this claim about market/competitors. Be sharp, direct, and cite real competitors if possible. Keep it to 1-2 sentences.`,

    math_check: `The founder mentioned: "${founderStatement}"

You are a hardcore VC. Ask about the underlying numbers: CAC, LTV, runway, burn rate. Be direct and expect precision. Keep it to 1-2 sentences.`,

    bs_detector: `The founder said: "${founderStatement}"

You are a hardcore VC who hates buzzwords. Call out if this sounds like a "GPT wrapper" or generic tech claim. Demand specifics about the actual IP or moat. Keep it to 1-2 sentences.`,
  };

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content:
          "You are a hardcore Silicon Valley VC conducting a brutal pitch interrogation. Be sharp, direct, and unforgiving.",
      },
      {
        role: "user",
        content: prompts[triggerType as keyof typeof prompts],
      },
    ],
    max_tokens: 100,
    temperature: 0.8,
  });

  return response.choices[0]?.message?.content || "Explain that claim.";
}

// Socratic mentorship chat
export const socraticChat = action({
  args: {
    sessionId: v.id("pitchSessions"),
    focusArea: v.union(
      v.literal("market"),
      v.literal("tech"),
      v.literal("economics"),
      v.literal("readiness")
    ),
    userMessage: v.string(),
    conversationHistory: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(internal.sessions.getSessionInternal, {
      sessionId: args.sessionId,
    });

    if (!session || !session.reportCard) {
      throw new Error("Session or report card not found");
    }

    const systemPrompt = `You are a Socratic mentor helping a founder improve their business model.

CONTEXT FROM THEIR PITCH SESSION:
- Market Clarity Score: ${session.reportCard.marketClarity}/100
- Tech Defensibility Score: ${session.reportCard.techDefensibility}/100
- Unit Economic Logic Score: ${session.reportCard.unitEconomicLogic}/100
- Investor Readiness Score: ${session.reportCard.investorReadiness}/100
- Coachability Delta: ${session.reportCard.coachabilityDelta}

FOCUS AREA: ${args.focusArea}

Your role is to:
1. Ask probing questions (Socratic method)
2. Challenge assumptions constructively
3. Guide them to discover better solutions themselves
4. Reference specific issues from their pitch session
5. Be supportive but intellectually rigorous

Do not give direct answers. Ask questions that make them think deeper.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        ...args.conversationHistory,
        { role: "user", content: args.userMessage },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const assistantMessage = response.choices[0]?.message?.content || "";

    // Save to chat history
    await ctx.runMutation(internal.sessions.addChatMessage, {
      sessionId: args.sessionId,
      focusArea: args.focusArea,
      userMessage: args.userMessage,
      assistantMessage,
    });

    return assistantMessage;
  },
});
