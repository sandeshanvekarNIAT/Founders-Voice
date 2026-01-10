import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface HotSeatTimerProps {
  timeRemaining: number;
}

export function HotSeatTimer({ timeRemaining }: HotSeatTimerProps) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const isEmergency = timeRemaining <= 30;
  const percentage = (timeRemaining / 180) * 100;

  return (
    <Card
      className={cn(
        "glass-card p-8 transition-all duration-300",
        isEmergency && "border-destructive glow-emergency"
      )}
    >
      <div className="space-y-6">
        {/* Timer Label */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold font-mono-terminal tracking-wider text-muted-foreground">
            HOT SEAT TIMER
          </h2>
          {isEmergency && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-destructive text-xs font-bold font-mono-terminal"
            >
              EMERGENCY
            </motion.div>
          )}
        </div>

        {/* Digital Timer Display */}
        <div className="text-center">
          <motion.div
            key={timeRemaining}
            initial={{ scale: 1.1, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "text-8xl font-bold font-mono-terminal tabular-nums transition-colors duration-300",
              isEmergency ? "text-destructive" : "text-primary"
            )}
          >
            {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </motion.div>

          <p
            className={cn(
              "mt-4 text-sm font-mono-terminal transition-colors duration-300",
              isEmergency ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {isEmergency ? "TIME IS RUNNING OUT" : "REMAINING"}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={cn(
                "h-full transition-all duration-1000 ease-linear",
                isEmergency
                  ? "bg-gradient-to-r from-destructive to-destructive/50"
                  : "bg-gradient-to-r from-primary to-primary/50"
              )}
              style={{ width: `${percentage}%` }}
              initial={{ width: "100%" }}
              animate={{ width: `${percentage}%` }}
            />
          </div>

          <div className="flex justify-between text-xs font-mono-terminal text-muted-foreground">
            <span>0:00</span>
            <span>3:00</span>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              repeat: Infinity,
              duration: 2,
            }}
            className={cn(
              "w-3 h-3 rounded-full",
              isEmergency ? "bg-destructive" : "bg-primary"
            )}
          />
          <span className="text-sm font-mono-terminal">
            {isEmergency ? "FINAL COUNTDOWN" : "SESSION ACTIVE"}
          </span>
        </div>
      </div>
    </Card>
  );
}
