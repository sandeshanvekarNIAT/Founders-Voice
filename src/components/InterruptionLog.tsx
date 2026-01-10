import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, DollarSign, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Interruption {
  _id: string;
  timestamp: number;
  triggerType: "reality_check" | "math_check" | "bs_detector";
  founderStatement: string;
  vcResponse: string;
  founderReaction?: "defensive" | "receptive" | "neutral";
}

interface InterruptionLogProps {
  interruptions: Array<Interruption>;
}

const TRIGGER_ICONS = {
  reality_check: AlertTriangle,
  math_check: DollarSign,
  bs_detector: Zap,
};

const TRIGGER_LABELS = {
  reality_check: "REALITY_CHECK",
  math_check: "MATH_CHECK",
  bs_detector: "BS_DETECTOR",
};

const TRIGGER_COLORS = {
  reality_check: "text-chart-2",
  math_check: "text-chart-3",
  bs_detector: "text-destructive",
};

export function InterruptionLog({ interruptions }: InterruptionLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new interruption arrives
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [interruptions.length]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  return (
    <Card className="glass-card h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold font-mono-terminal">
            INTERRUPTION LOG
          </h3>
          <div className="text-xs font-mono-terminal text-muted-foreground">
            {interruptions.length} STRIKES
          </div>
        </div>
      </div>

      {/* Log Content */}
      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {interruptions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-muted-foreground font-mono-terminal text-sm"
              >
                Waiting for triggers...
                <br />
                <span className="text-xs mt-2 block">
                  The AI will interrupt when it detects BS, vague claims, or bad
                  math.
                </span>
              </motion.div>
            ) : (
              interruptions.map((interruption, index) => {
                const Icon = TRIGGER_ICONS[interruption.triggerType];
                const label = TRIGGER_LABELS[interruption.triggerType];
                const colorClass = TRIGGER_COLORS[interruption.triggerType];

                return (
                  <motion.div
                    key={interruption._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="space-y-2"
                  >
                    {/* Trigger Header */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono-terminal text-muted-foreground">
                        [{formatTimestamp(interruption.timestamp)}]
                      </span>
                      <div className={cn("flex items-center gap-1", colorClass)}>
                        <Icon className="w-3 h-3" />
                        <span className="text-xs font-mono-terminal font-bold">
                          {label}
                        </span>
                      </div>
                    </div>

                    {/* Founder Statement */}
                    <div className="ml-4 pl-4 border-l-2 border-border space-y-1">
                      <p className="text-xs font-mono-terminal text-muted-foreground">
                        FOUNDER:
                      </p>
                      <p className="text-sm text-foreground/90">
                        "{interruption.founderStatement}"
                      </p>
                    </div>

                    {/* VC Response */}
                    <div className="ml-4 pl-4 border-l-2 border-primary space-y-1">
                      <p className="text-xs font-mono-terminal text-primary">
                        VC_AI:
                      </p>
                      <p className="text-sm text-foreground/90 font-medium">
                        {interruption.vcResponse}
                      </p>
                    </div>

                    {/* Reaction Badge */}
                    {interruption.founderReaction && (
                      <div className="ml-4 flex items-center gap-2">
                        <span
                          className={cn(
                            "text-xs font-mono-terminal px-2 py-0.5 rounded border",
                            interruption.founderReaction === "defensive" &&
                              "text-destructive border-destructive bg-destructive/10",
                            interruption.founderReaction === "receptive" &&
                              "text-chart-2 border-chart-2 bg-chart-2/10",
                            interruption.founderReaction === "neutral" &&
                              "text-muted-foreground border-muted bg-muted/10"
                          )}
                        >
                          {interruption.founderReaction.toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* Divider */}
                    {index < interruptions.length - 1 && (
                      <div className="my-4 h-px bg-border/50" />
                    )}
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Footer - Legend */}
      <div className="p-6 border-t border-border">
        <div className="space-y-2">
          <p className="text-xs font-mono-terminal text-muted-foreground mb-2">
            TRIGGER TYPES:
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs font-mono-terminal">
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-chart-2" />
              <span className="text-chart-2">REALITY</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-chart-3" />
              <span className="text-chart-3">MATH</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-destructive" />
              <span className="text-destructive">BS</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
