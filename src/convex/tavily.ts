"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Tavily API types
interface TavilySearchResponse {
  query: string;
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
  }>;
}

// Lazy initialization to avoid errors during module loading
function getTavilyClient() {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "TAVILY_API_KEY is not set. Please add it to your integrations tab."
    );
  }
  return apiKey;
}

// Perform Tavily search
async function tavilySearch(
  query: string,
  searchDepth: "basic" | "advanced" = "basic"
): Promise<TavilySearchResponse> {
  const apiKey = getTavilyClient();

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: searchDepth,
      include_answer: true,
      max_results: 5,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.statusText}`);
  }

  return await response.json();
}

// PRE-FETCH MODE: Scan industry before pitch starts
export const prefetchMarketContext = internalAction({
  args: {
    sessionId: v.id("pitchSessions"),
    pitchContext: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Extract key terms from pitch context for search
      const searchQueries = [
        `${args.pitchContext} competitors market analysis`,
        `${args.pitchContext} market size TAM SAM`,
        `${args.pitchContext} industry trends 2024 2025`,
      ];

      const searchResults: Array<{
        query: string;
        findings: string;
      }> = [];

      // Perform searches for each query
      for (const query of searchQueries) {
        const result = await tavilySearch(query, "basic");

        // Summarize top findings
        const findings = result.results
          .slice(0, 3)
          .map((r) => `${r.title}: ${r.content.slice(0, 200)}...`)
          .join("\n\n");

        searchResults.push({
          query,
          findings,
        });
      }

      // Store market context for later use during the pitch
      await ctx.runMutation(internal.sessions.updateSessionContext, {
        sessionId: args.sessionId,
        marketContext: JSON.stringify(searchResults),
      });

      return {
        success: true,
        contextsFound: searchResults.length,
      };
    } catch (error) {
      console.error("Pre-fetch market context failed:", error);
      return {
        success: false,
        error: String(error),
      };
    }
  },
});

// TACTICAL MODE: Sub-second fact-checking during pitch
export const tacticalFactCheck = internalAction({
  args: {
    sessionId: v.id("pitchSessions"),
    founderClaim: v.string(),
    triggerType: v.union(
      v.literal("reality_check"),
      v.literal("math_check"),
      v.literal("bs_detector")
    ),
  },
  handler: async (ctx, args) => {
    try {
      // Get the pre-fetched market context
      const session: any = await ctx.runQuery(
        internal.sessions.getSessionInternal,
        { sessionId: args.sessionId }
      );

      let searchQuery = "";

      // Customize search based on trigger type
      switch (args.triggerType) {
        case "reality_check":
          // Search for competitors
          searchQuery = `${args.founderClaim} competitors alternatives similar companies`;
          break;

        case "math_check":
          // Search for industry benchmarks
          searchQuery = `${args.founderClaim} CAC LTV industry benchmarks average`;
          break;

        case "bs_detector":
          // Search for technology validation
          searchQuery = `${args.founderClaim} technology real implementation vs buzzword`;
          break;
      }

      // Perform tactical search (basic depth for speed)
      const result = await tavilySearch(searchQuery, "basic");

      // Extract key facts
      const facts = result.results.slice(0, 3).map((r) => ({
        source: r.title,
        fact: r.content.slice(0, 150),
        url: r.url,
      }));

      return {
        success: true,
        query: searchQuery,
        facts,
      };
    } catch (error) {
      console.error("Tactical fact-check failed:", error);
      return {
        success: false,
        error: String(error),
        facts: [],
      };
    }
  },
});

// Search for specific competitors
export const findCompetitors = action({
  args: {
    industry: v.string(),
    product: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const query = `${args.product} ${args.industry} competitors alternatives top companies 2024`;
      const result = await tavilySearch(query, "advanced");

      const competitors = result.results.slice(0, 5).map((r) => ({
        name: r.title,
        description: r.content.slice(0, 200),
        url: r.url,
        relevance: r.score,
      }));

      return {
        success: true,
        competitors,
      };
    } catch (error) {
      console.error("Find competitors failed:", error);
      return {
        success: false,
        competitors: [],
        error: String(error),
      };
    }
  },
});
