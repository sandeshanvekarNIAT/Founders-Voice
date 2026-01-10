"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

// Lazy initialization for Google Gemini (for Report Cards & Mentorship)
function getGeminiClient() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_GEMINI_API_KEY is not set. Please set it using: npx convex env set GOOGLE_GEMINI_API_KEY <your-key>\nGet your free key at: https://ai.google.dev/"
    );
  }
  return new GoogleGenerativeAI(apiKey);
}

// Lazy initialization for Groq (for fast VC interruptions)
function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not set. Please set it using: npx convex env set GROQ_API_KEY <your-key>\nGet your free key at: https://console.groq.com/"
    );
  }
  return new Groq({ apiKey });
}

// Generate the Fundability Report Card using Google Gemini 1.5 Flash
export const generateReportCard = internalAction({
  args: { sessionId: v.id("pitchSessions") },
  handler: async (ctx, args): Promise<any> => {
    console.log("🧠 Starting report card generation for session:", args.sessionId);

    // Get session data
    const session: any = await ctx.runQuery(internal.sessions.getSessionInternal, {
      sessionId: args.sessionId,
    });

    if (!session) {
      console.error("❌ Session not found:", args.sessionId);
      throw new Error("Session not found");
    }

    console.log("📝 Session data retrieved:", {
      hasTranscript: !!session.transcript,
      transcriptLength: session.transcript?.length || 0,
      hasPitchContext: !!session.pitchContextText,
    });

    // Get all interruptions for context
    const interruptions = await ctx.runQuery(
      internal.sessions.getInterruptionsInternal,
      { sessionId: args.sessionId }
    );

    console.log("📋 Interruptions retrieved:", interruptions.length);

    // Build context for Gemini
    const prompt = `You are a hardcore VC analyst using the Bill Payne Scorecard method. Analyze this pitch session and generate a comprehensive Fundability Report Card.

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

Provide ONLY a JSON response with this EXACT structure (no markdown, no code blocks, just raw JSON):
{
  "marketClarity": <0-100>,
  "techDefensibility": <0-100>,
  "unitEconomicLogic": <0-100>,
  "investorReadiness": <0-100>,
  "overallScore": <average of 4 pillars>,
  "coachabilityDelta": <calculated from reactions>,
  "insights": "<brutally honest 3-5 sentence assessment>"
}`;

    try {
      console.log("🤖 Initializing Gemini API...");
      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      console.log("📤 Sending request to Gemini...");
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      console.log("📥 Received response from Gemini, length:", text.length);
      console.log("📄 Raw response preview:", text.substring(0, 200));

      // Clean up the response (remove markdown code blocks if present)
      const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();

      console.log("🧹 Cleaned response, parsing JSON...");

      // Parse the JSON response
      const reportCard = JSON.parse(cleanText);

      console.log("✅ Report card parsed successfully:", {
        overallScore: reportCard.overallScore,
        hasInsights: !!reportCard.insights,
      });

      // Save to database
      console.log("💾 Saving report card to database...");
      await ctx.runMutation(internal.sessions.updateReportCard, {
        sessionId: args.sessionId,
        reportCard,
      });

      console.log("🎉 Report card generation complete!");
      return reportCard;
    } catch (error: any) {
      console.error("❌ Failed to generate report card:", error);
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      // Create a fallback report card
      console.log("🔄 Creating fallback report card...");
      const fallbackReportCard: any = {
        marketClarity: 50,
        techDefensibility: 50,
        unitEconomicLogic: 50,
        investorReadiness: 50,
        overallScore: 50,
        coachabilityDelta: 0,
        insights: `Unable to generate full analysis due to technical error. Based on available data: ${
          session.transcript
            ? "Transcript captured successfully"
            : "No transcript available"
        }. ${
          session.pitchContextText
            ? "Pitch context provided"
            : "No pitch context provided"
        }. Please review your session data and try again.`,
      };

      // Save fallback to database so user isn't stuck
      await ctx.runMutation(internal.sessions.updateReportCard, {
        sessionId: args.sessionId,
        reportCard: fallbackReportCard,
      });

      console.log("⚠️ Fallback report card saved");
      return fallbackReportCard;
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

      // Use Tavily for tactical fact-checking
      const factCheck: any = await ctx.runAction(internal.tavily.tacticalFactCheck, {
        sessionId: args.sessionId,
        founderClaim: args.transcript,
        triggerType: "reality_check",
      });

      vcResponse = await generateVCInterruption(
        "reality_check",
        args.transcript,
        factCheck.success ? factCheck.facts : undefined
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

      // Use Tavily for industry benchmarks
      const factCheck: any = await ctx.runAction(internal.tavily.tacticalFactCheck, {
        sessionId: args.sessionId,
        founderClaim: args.transcript,
        triggerType: "math_check",
      });

      vcResponse = await generateVCInterruption(
        "math_check",
        args.transcript,
        factCheck.success ? factCheck.facts : undefined
      );
    }

    // BS Detector triggers
    else if (
      text.includes("proprietary ai") ||
      text.includes("our ai") ||
      text.includes("machine learning") ||
      text.includes("blockchain")
    ) {
      triggerType = "bs_detector";

      // Use Tavily for technology validation
      const factCheck: any = await ctx.runAction(internal.tavily.tacticalFactCheck, {
        sessionId: args.sessionId,
        founderClaim: args.transcript,
        triggerType: "bs_detector",
      });

      vcResponse = await generateVCInterruption(
        "bs_detector",
        args.transcript,
        factCheck.success ? factCheck.facts : undefined
      );
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

// Generate VC interruption using Groq + Llama 3.1 70B (ultra-fast for real-time)
async function generateVCInterruption(
  triggerType: string,
  founderStatement: string,
  tavilyFacts?: Array<{ source: string; fact: string; url: string }>
): Promise<string> {
  // Build context with Tavily facts if available
  const factsContext = tavilyFacts && tavilyFacts.length > 0
    ? `\n\nREAL MARKET DATA (from Tavily search):\n${tavilyFacts.map((f) => `- ${f.source}: ${f.fact}`).join("\n")}`
    : "";

  const prompts = {
    reality_check: `The founder just claimed: "${founderStatement}"${factsContext}

You are a hardcore VC. Challenge this claim about market/competitors. ${tavilyFacts ? "Use the real market data above to cite specific competitors or facts." : "Be sharp and direct."} Keep it to 1-2 sentences.`,

    math_check: `The founder mentioned: "${founderStatement}"${factsContext}

You are a hardcore VC. Ask about the underlying numbers: CAC, LTV, runway, burn rate. ${tavilyFacts ? "Reference industry benchmarks from the data above if relevant." : "Be direct and expect precision."} Keep it to 1-2 sentences.`,

    bs_detector: `The founder said: "${founderStatement}"${factsContext}

You are a hardcore VC who hates buzzwords. Call out if this sounds like a "GPT wrapper" or generic tech claim. ${tavilyFacts ? "Use the real data above to validate or challenge the technology claim." : "Demand specifics about the actual IP or moat."} Keep it to 1-2 sentences.`,
  };

  try {
    const groq = getGroqClient();

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a hardcore Silicon Valley VC conducting a brutal pitch interrogation. Be sharp, direct, and unforgiving. When given market data, cite it specifically.",
        },
        {
          role: "user",
          content: prompts[triggerType as keyof typeof prompts],
        },
      ],
      model: "llama-3.1-70b-versatile", // Fast and powerful
      temperature: 0.8,
      max_tokens: 150,
    });

    return chatCompletion.choices[0]?.message?.content || "Explain that claim.";
  } catch (error) {
    console.error("Groq API error:", error);
    // Fallback to a generic response if Groq fails
    return "That's an interesting claim. Can you provide more specifics?";
  }
}

// Socratic mentorship chat using Google Gemini 1.5 Flash
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
  handler: async (ctx, args): Promise<string> => {
    const session: any = await ctx.runQuery(internal.sessions.getSessionInternal, {
      sessionId: args.sessionId,
    });

    if (!session || !session.reportCard) {
      throw new Error("Session or report card not found");
    }

    const systemContext = `You are a Socratic mentor helping a founder improve their business model.

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

    // Build conversation history for Gemini
    const conversationText = args.conversationHistory
      .map((msg) => `${msg.role === "user" ? "Founder" : "Mentor"}: ${msg.content}`)
      .join("\n\n");

    const fullPrompt = `${systemContext}

CONVERSATION SO FAR:
${conversationText}

Founder: ${args.userMessage}

Mentor (respond with Socratic questions):`;

    try {
      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      const assistantMessage = response.text().trim();

      // Save to chat history
      await ctx.runMutation(internal.sessions.addChatMessage, {
        sessionId: args.sessionId,
        focusArea: args.focusArea,
        userMessage: args.userMessage,
        assistantMessage,
      });

      return assistantMessage;
    } catch (error) {
      console.error("Gemini API error:", error);
      throw error;
    }
  },
});
