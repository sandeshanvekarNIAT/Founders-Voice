import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WaveformVisualizerProps {
  audioLevel: number;
  isSpeaking: "user" | "ai" | null;
  isRecording: boolean;
}

export function WaveformVisualizer({
  audioLevel,
  isSpeaking,
  isRecording,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    let animationFrame: number;
    let time = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const centerY = height / 2;
      const amplitude = isSpeaking ? audioLevel * 100 : 20;
      const frequency = isSpeaking === "ai" ? 0.02 : 0.05;

      ctx.beginPath();
      ctx.lineWidth = 3;

      // Set gradient based on who's speaking
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      if (isSpeaking === "user") {
        gradient.addColorStop(0, "rgba(94, 106, 210, 0.3)");
        gradient.addColorStop(0.5, "rgba(94, 106, 210, 1)");
        gradient.addColorStop(1, "rgba(94, 106, 210, 0.3)");
      } else if (isSpeaking === "ai") {
        gradient.addColorStop(0, "rgba(220, 38, 38, 0.3)");
        gradient.addColorStop(0.5, "rgba(220, 38, 38, 1)");
        gradient.addColorStop(1, "rgba(220, 38, 38, 0.3)");
      } else {
        gradient.addColorStop(0, "rgba(94, 106, 210, 0.2)");
        gradient.addColorStop(0.5, "rgba(94, 106, 210, 0.4)");
        gradient.addColorStop(1, "rgba(94, 106, 210, 0.2)");
      }

      ctx.strokeStyle = gradient;

      // Draw waveform
      if (isSpeaking === "ai") {
        // Smooth sine wave when AI speaks
        for (let x = 0; x < width; x++) {
          const y =
            centerY + Math.sin((x + time) * frequency) * amplitude * Math.sin(time * 0.1);
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      } else {
        // More chaotic when user speaks
        for (let x = 0; x < width; x++) {
          const y =
            centerY +
            Math.sin((x + time) * frequency) * amplitude +
            Math.sin((x + time) * frequency * 2) * (amplitude / 2) +
            (Math.random() - 0.5) * audioLevel * 30;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      }

      ctx.stroke();

      // Draw additional harmonics
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const y = centerY + Math.sin((x + time) * frequency * 2) * (amplitude / 2);
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      ctx.globalAlpha = 1;
      time += 2;

      animationFrame = requestAnimationFrame(draw);
    };

    if (isRecording) {
      draw();
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [audioLevel, isSpeaking, isRecording]);

  return (
    <Card className="glass-card h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold font-mono-terminal">
            AUDIO SPECTRUM
          </h3>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{
                scale: isSpeaking ? [1, 1.2, 1] : 1,
              }}
              transition={{
                repeat: isSpeaking ? Infinity : 0,
                duration: 1,
              }}
              className={cn(
                "w-2 h-2 rounded-full",
                isSpeaking === "user" && "bg-primary",
                isSpeaking === "ai" && "bg-destructive",
                !isSpeaking && "bg-muted"
              )}
            />
            <span className="text-xs font-mono-terminal text-muted-foreground">
              {isSpeaking === "user" && "YOU"}
              {isSpeaking === "ai" && "AI VC"}
              {!isSpeaking && "IDLE"}
            </span>
          </div>
        </div>
      </div>

      {/* Waveform Canvas */}
      <div className="flex-1 waveform-container p-6 relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="w-full h-full"
          style={{ filter: "drop-shadow(0 0 10px rgba(94, 106, 210, 0.3))" }}
        />

        {/* Center line */}
        <div className="absolute inset-x-6 top-1/2 h-px bg-border/30" />

        {!isRecording && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-muted-foreground font-mono-terminal text-sm">
              Start recording to see waveform
            </p>
          </div>
        )}
      </div>

      {/* Footer - Audio Level Meter */}
      <div className="p-6 border-t border-border space-y-2">
        <div className="flex justify-between text-xs font-mono-terminal text-muted-foreground">
          <span>LEVEL</span>
          <span>{Math.round(audioLevel * 100)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={cn(
              "h-full transition-all duration-100",
              isSpeaking === "user" && "bg-primary",
              isSpeaking === "ai" && "bg-destructive",
              !isSpeaking && "bg-muted-foreground"
            )}
            style={{ width: `${audioLevel * 100}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
