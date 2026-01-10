import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Shield,
  DollarSign,
  Users,
  Send,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const FOCUS_AREAS = {
  market: {
    label: "Market",
    icon: TrendingUp,
    color: "text-chart-1",
    description: "Improve market clarity and competitive positioning",
  },
  tech: {
    label: "Tech",
    icon: Shield,
    color: "text-chart-2",
    description: "Strengthen technical defensibility and moat",
  },
  economics: {
    label: "Economics",
    icon: DollarSign,
    color: "text-chart-3",
    description: "Optimize unit economics and financial model",
  },
  readiness: {
    label: "Readiness",
    icon: Users,
    color: "text-chart-5",
    description: "Enhance investor readiness and coachability",
  },
};

export default function Mentorship() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusParam = searchParams.get("focus");

  const [focusArea, setFocusArea] = useState<keyof typeof FOCUS_AREAS>(
    (focusParam as keyof typeof FOCUS_AREAS) || "market"
  );
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // TEST MODE: Using no-auth version
  const session = useQuery(
    api.sessions_noauth.getPitchSession,
    sessionId ? { sessionId: sessionId as Id<"pitchSessions"> } : "skip"
  );

  const socraticChat = useAction(api.ai.socraticChat);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationHistory]);

  if (!sessionId) {
    navigate("/war-room");
    return null;
  }

  if (!session || !session.reportCard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          Loading session...
        </div>
      </div>
    );
  }

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage("");
    setIsLoading(true);

    // Add user message to history
    const newHistory = [
      ...conversationHistory,
      { role: "user" as const, content: userMessage },
    ];
    setConversationHistory(newHistory);

    try {
      const response = await socraticChat({
        sessionId: sessionId as Id<"pitchSessions">,
        focusArea,
        userMessage,
        conversationHistory,
      });

      // Add assistant response
      setConversationHistory([
        ...newHistory,
        { role: "assistant" as const, content: response },
      ]);
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to get response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const FocusIcon = FOCUS_AREAS[focusArea].icon;
  const focusConfig = FOCUS_AREAS[focusArea];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(94,106,210,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(94,106,210,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate(`/report/${sessionId}`)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Report
            </Button>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono-terminal">
                SOCRATIC MODE
              </Badge>
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-6 flex-1 min-h-0">
            {/* Left Sidebar - Focus Area Selection */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="glass-card p-4">
                <h3 className="text-sm font-semibold font-mono-terminal mb-4 text-muted-foreground">
                  FOCUS AREA
                </h3>
                <div className="space-y-2">
                  {Object.entries(FOCUS_AREAS).map(([key, config]) => {
                    const Icon = config.icon;
                    const isActive = focusArea === key;

                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setFocusArea(key as keyof typeof FOCUS_AREAS);
                          setConversationHistory([]);
                        }}
                        className={cn(
                          "w-full p-3 rounded-lg flex items-center gap-3 transition-all text-left",
                          isActive
                            ? "bg-primary/20 border border-primary"
                            : "hover:bg-muted/50 border border-transparent"
                        )}
                      >
                        <Icon className={cn("w-4 h-4", config.color)} />
                        <span className="text-sm font-medium">
                          {config.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* Score Display */}
              <Card className="glass-card p-4">
                <h3 className="text-sm font-semibold font-mono-terminal mb-2 text-muted-foreground">
                  CURRENT SCORE
                </h3>
                <div className="flex items-center gap-2">
                  <FocusIcon className={cn("w-5 h-5", focusConfig.color)} />
                  <span className="text-3xl font-bold font-mono-terminal">
                    {Math.round(
                      focusArea === "market"
                        ? session.reportCard.marketClarity
                        : focusArea === "tech"
                          ? session.reportCard.techDefensibility
                          : focusArea === "economics"
                            ? session.reportCard.unitEconomicLogic
                            : session.reportCard.investorReadiness
                    )}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {focusConfig.description}
                </p>
              </Card>
            </div>

            {/* Main Chat Area */}
            <div className="lg:col-span-3 flex flex-col min-h-0">
              <Card className="glass-card flex-1 flex flex-col min-h-0">
                {/* Chat Header */}
                <div className="p-6 border-b border-border flex items-center gap-3">
                  <div
                    className={cn(
                      "p-2 rounded-lg bg-primary/10",
                      focusConfig.color
                    )}
                  >
                    <FocusIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">
                      {focusConfig.label} Mentorship
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Ask questions to improve your business model
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                  <div className="space-y-4">
                    {conversationHistory.length === 0 && (
                      <div className="text-center py-12">
                        <div className="text-4xl mb-4">🤔</div>
                        <p className="text-muted-foreground font-mono-terminal text-sm">
                          Ask a question about your {focusConfig.label.toLowerCase()} strategy.
                          <br />
                          I'll guide you with Socratic questions.
                        </p>
                      </div>
                    )}

                    <AnimatePresence initial={false}>
                      {conversationHistory.map((msg, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className={cn(
                            "flex gap-3",
                            msg.role === "user" ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[80%] rounded-lg p-4",
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "glass border border-border"
                            )}
                          >
                            {msg.role === "assistant" && (
                              <p className="text-xs font-mono-terminal text-muted-foreground mb-2">
                                MENTOR
                              </p>
                            )}
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {msg.content}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-3"
                      >
                        <div className="glass border border-border rounded-lg p-4">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">
                              Thinking...
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-6 border-t border-border">
                  <div className="flex gap-2">
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Ask your question..."
                      className="min-h-[60px] resize-none"
                      disabled={isLoading}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!message.trim() || isLoading}
                      size="icon"
                      className="h-[60px] w-[60px] shrink-0"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
