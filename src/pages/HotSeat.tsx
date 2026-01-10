import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { HotSeatTimer } from "@/components/HotSeatTimer";
import { WaveformVisualizer } from "@/components/WaveformVisualizer";
import { InterruptionLog } from "@/components/InterruptionLog";

export default function HotSeat() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [isRecording, setIsRecording] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState<"user" | "ai" | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const session = useQuery(
    api.sessions.getPitchSession,
    sessionId ? { sessionId: sessionId as Id<"pitchSessions"> } : "skip"
  );

  const interruptions = useQuery(
    api.sessions.getInterruptions,
    sessionId ? { sessionId: sessionId as Id<"pitchSessions"> } : "skip"
  );

  const startSession = useMutation(api.sessions.startPitchSession);
  const endSession = useMutation(api.sessions.endPitchSession);

  useEffect(() => {
    if (!sessionId) {
      navigate("/war-room");
      return;
    }

    // Start the session when component mounts
    startSession({ sessionId: sessionId as Id<"pitchSessions"> });
  }, [sessionId]);

  useEffect(() => {
    if (!isRecording) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleEndSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up audio analysis
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start visual feedback
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average / 255);

        if (isRecording) {
          requestAnimationFrame(updateAudioLevel);
        }
      };
      updateAudioLevel();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          // Here we would send audio chunks to the backend for processing
          // This connects to the OpenAI Realtime API via Convex actions
          console.log("Audio chunk:", event.data);
        }
      };

      mediaRecorder.start(1000); // Capture in 1-second chunks
      setIsRecording(true);
      setIsSpeaking("user");
      toast.success("Recording started. The Hot Seat is LIVE.");
    } catch (error) {
      console.error("Failed to start recording:", error);
      toast.error("Failed to access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      setIsRecording(false);
      setIsSpeaking(null);
      setAudioLevel(0);
    }
  };

  const handleEndSession = async () => {
    stopRecording();

    if (sessionId) {
      await endSession({ sessionId: sessionId as Id<"pitchSessions"> });
      toast.success("Session ended. Generating your Report Card...");
      navigate(`/report/${sessionId}`);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading session...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(94,106,210,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(94,106,210,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
          {/* Left Column - Timer & Controls */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <HotSeatTimer timeRemaining={timeRemaining} />
            </motion.div>

            {/* Recording Controls */}
            <Card className="glass-card p-6 space-y-4">
              <h3 className="text-lg font-semibold font-mono-terminal">
                CONTROLS
              </h3>

              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  className="w-full glow-electric"
                  size="lg"
                >
                  <Mic className="mr-2" />
                  Start Recording
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  variant="secondary"
                  className="w-full"
                  size="lg"
                >
                  <MicOff className="mr-2" />
                  Pause
                </Button>
              )}

              <Button
                onClick={handleEndSession}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                <StopCircle className="mr-2" />
                End Session
              </Button>
            </Card>

            {/* Session Info */}
            <Card className="glass-card p-6">
              <h3 className="text-sm font-semibold font-mono-terminal text-muted-foreground mb-2">
                SESSION ID
              </h3>
              <p className="text-xs font-mono-terminal break-all">
                {sessionId}
              </p>
            </Card>
          </div>

          {/* Center Column - Waveform */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <WaveformVisualizer
                audioLevel={audioLevel}
                isSpeaking={isSpeaking}
                isRecording={isRecording}
              />
            </motion.div>
          </div>

          {/* Right Column - Interruption Log */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="h-full"
            >
              <InterruptionLog interruptions={interruptions || []} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
