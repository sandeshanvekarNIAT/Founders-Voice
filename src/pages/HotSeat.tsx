import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { HotSeatTimer } from "@/components/HotSeatTimer";
import { WaveformVisualizer } from "@/components/WaveformVisualizer";
import { InterruptionLog } from "@/components/InterruptionLog";
import { VCAudioPlayer, blobToBase64 } from "@/lib/audio-player";

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
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");
  const lastSpeechTimeRef = useRef<number>(Date.now());
  const audioPlayerRef = useRef<VCAudioPlayer>(new VCAudioPlayer());
  const lastInterruptionCountRef = useRef<number>(0);

  // TEST MODE: Using no-auth versions
  const session = useQuery(
    api.sessions_noauth.getPitchSession,
    sessionId ? { sessionId: sessionId as Id<"pitchSessions"> } : "skip"
  );

  const interruptions = useQuery(
    api.sessions_noauth.getInterruptions,
    sessionId ? { sessionId: sessionId as Id<"pitchSessions"> } : "skip"
  );

  const startSession = useMutation(api.sessions_noauth.startPitchSession);
  const endSession = useMutation(api.sessions_noauth.endPitchSession);
  const updateTranscript = useMutation(api.sessions_noauth.updateTranscript);
  const processAudioChunk = useAction(api.ai.processAudioChunk);

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

  // Real-time interruption playback
  useEffect(() => {
    if (!interruptions || !isRecording) return;

    const newCount = interruptions.length;
    if (newCount > lastInterruptionCountRef.current) {
      // New interruption detected!
      const newInterruption = interruptions[newCount - 1];
      console.log("🚨 NEW INTERRUPTION DETECTED:", newInterruption);

      // Play VC interruption with TTS
      playVCInterruption(newInterruption.vcResponse);

      lastInterruptionCountRef.current = newCount;
    }
  }, [interruptions, isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop recording and clean up resources on unmount
      if (mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          // MediaRecorder might already be stopped
        }
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Recognition might already be stopped
        }
      }
    };
  }, []);

  // Play VC interruption with aggressive TTS
  const playVCInterruption = async (text: string) => {
    console.log("🎤 Playing VC interruption:", text);

    // Pause user recording during AI speech (aggressive interruption)
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      console.log("⏸️ User mic paused for VC interruption");
    }

    // Configure audio player callbacks
    audioPlayerRef.current.onStart(() => {
      setIsSpeaking("ai");
      toast.info("VC interrupting...", { duration: 2000 });
    });

    audioPlayerRef.current.onEnd(() => {
      // Resume user recording after AI finishes
      if (mediaRecorderRef.current?.state === "paused") {
        mediaRecorderRef.current.resume();
        console.log("▶️ User mic resumed after VC interruption");
      }
      setIsSpeaking("user");
    });

    audioPlayerRef.current.onError((error) => {
      console.error("❌ TTS error:", error);
      // Resume anyway if error
      if (mediaRecorderRef.current?.state === "paused") {
        mediaRecorderRef.current.resume();
      }
      setIsSpeaking("user");
    });

    // Play the interruption
    try {
      await audioPlayerRef.current.playVCInterruption(text);
    } catch (error) {
      console.error("❌ Failed to play interruption:", error);
    }
  };

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

        // Continue animation loop
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };

      // Start the animation loop
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && sessionId) {
          console.log("📦 Audio chunk captured:", event.data.size, "bytes");

          // Convert blob to base64 for transmission
          try {
            const base64Audio = await blobToBase64(event.data);

            // Calculate pause duration
            const pauseDuration = Date.now() - lastSpeechTimeRef.current;

            // Send to backend for real-time processing
            const result = await processAudioChunk({
              sessionId: sessionId as Id<"pitchSessions">,
              audioData: base64Audio,
              transcript: transcriptRef.current,
            });

            console.log("🔍 Chunk processed:", result);
          } catch (error) {
            console.error("❌ Failed to process audio chunk:", error);
          }
        }
      };

      mediaRecorder.start(500); // Capture in 500ms chunks for aggressive interruptions

      // Set up speech recognition for transcript
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            transcriptRef.current += finalTranscript;
            lastSpeechTimeRef.current = Date.now(); // Track when user last spoke
            console.log("📝 Transcript updated:", finalTranscript);
            console.log("📝 Total transcript length:", transcriptRef.current.length, "characters");
            console.log("📝 Full transcript so far:", transcriptRef.current);
          }
        };

        recognition.onerror = (event: any) => {
          console.error("❌ Speech recognition error:", event.error);
          if (event.error === 'not-allowed') {
            toast.error("Microphone permission denied. Please allow microphone access.");
          } else if (event.error === 'no-speech') {
            console.warn("No speech detected");
          }
        };

        recognition.onstart = () => {
          console.log("🎤 Speech recognition started");
          toast.success("Speech recognition active - your words are being captured!");
        };

        recognition.onend = () => {
          console.log("🎤 Speech recognition ended");
        };

        recognition.start();
        recognitionRef.current = recognition;
      } else {
        console.warn("Speech recognition not supported in this browser");
        toast.error("Speech recognition not supported. Transcript won't be captured.");
      }

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

      // Close AudioContext only if it's not already closed
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      audioContextRef.current = null;

      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Stop speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Error stopping recognition:", e);
        }
      }

      setIsRecording(false);
      setIsSpeaking(null);
      setAudioLevel(0);
    }
  };

  const handleEndSession = async () => {
    stopRecording();

    if (sessionId) {
      // Save transcript to database
      const finalTranscript = transcriptRef.current.trim();

      if (finalTranscript) {
        try {
          await updateTranscript({
            sessionId: sessionId as Id<"pitchSessions">,
            transcript: finalTranscript,
          });
          console.log("Transcript saved successfully:", finalTranscript.length, "characters");
        } catch (error) {
          console.error("Failed to save transcript:", error);
          toast.error("Failed to save transcript, but continuing...");
        }
      } else {
        console.warn("No transcript captured - speech recognition may not be supported or no speech detected");
        toast.warning("No speech detected. Report will be generated from context only.");
        // Save a placeholder to indicate no speech was captured
        try {
          await updateTranscript({
            sessionId: sessionId as Id<"pitchSessions">,
            transcript: "[No speech detected - please ensure microphone is working and browser supports speech recognition]",
          });
        } catch (error) {
          console.error("Failed to save placeholder transcript:", error);
        }
      }

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

              {/* DEBUG: Test interruption button */}
              {isRecording && (
                <Button
                  onClick={() => playVCInterruption("Wait, you said no competitors? That doesn't make sense. I know at least 3 companies doing exactly this.")}
                  variant="outline"
                  className="w-full mt-2"
                  size="sm"
                >
                  🧪 Test Interruption
                </Button>
              )}
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
