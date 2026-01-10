import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Mic, FileText } from "lucide-react";
import { toast } from "sonner";

export default function WarRoom() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [uploadMode, setUploadMode] = useState<"pdf" | "text" | null>(null);
  const [pitchText, setPitchText] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // TEST MODE: Using no-auth versions
  const createSession = useMutation(api.sessions_noauth.createPitchSession);
  const generateUploadUrl = useMutation(api.sessions_noauth.generateUploadUrl);

  // AUTHENTICATION DISABLED FOR TESTING
  // if (!user) {
  //   navigate("/auth");
  //   return null;
  // }

  const handlePdfUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const { storageId } = await result.json();

      const sessionId = await createSession({
        title: file.name,
        pitchContextPdf: storageId,
      });

      toast.success("Pitch deck uploaded! Preparing interrogation...");
      navigate(`/hot-seat/${sessionId}`);
    } catch (error) {
      toast.error("Failed to upload pitch deck");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!pitchText.trim()) {
      toast.error("Please enter your pitch");
      return;
    }

    setIsUploading(true);
    try {
      const sessionId = await createSession({
        title: "Voice Pitch",
        pitchContextText: pitchText,
      });

      toast.success("Pitch submitted! Entering the Hot Seat...");
      navigate(`/hot-seat/${sessionId}`);
    } catch (error) {
      toast.error("Failed to create session");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(94,106,210,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(94,106,210,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)]" />

      <div className="relative z-10 container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-12">
            <motion.h1
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-6xl font-bold mb-4 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent"
            >
              FOUNDER-VOICE
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-muted-foreground font-mono-terminal"
            >
              The Hot Seat Awaits. 3 Minutes. No Mercy.
            </motion.p>
          </div>

          {/* Upload Options */}
          {!uploadMode && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid md:grid-cols-2 gap-6"
            >
              <Card
                className="glass-card p-8 cursor-pointer hover:border-primary transition-all group"
                onClick={() => setUploadMode("pdf")}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold">Upload Pitch Deck</h3>
                  <p className="text-muted-foreground">
                    Upload your PDF pitch deck. The AI will scan it before the
                    interrogation begins.
                  </p>
                </div>
              </Card>

              <Card
                className="glass-card p-8 cursor-pointer hover:border-primary transition-all group"
                onClick={() => setUploadMode("text")}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Mic className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-semibold">Verbal Pitch</h3>
                  <p className="text-muted-foreground">
                    Describe your startup idea. Jump straight into the hot seat.
                  </p>
                </div>
              </Card>
            </motion.div>
          )}

          {/* PDF Upload Mode */}
          {uploadMode === "pdf" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8"
            >
              <Button
                variant="ghost"
                onClick={() => setUploadMode(null)}
                className="mb-4"
              >
                ← Back
              </Button>

              <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
                <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">
                  Drop your pitch deck here
                </h3>
                <p className="text-muted-foreground mb-6">
                  PDF format, max 10MB
                </p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePdfUpload(file);
                  }}
                  className="hidden"
                  id="pdf-upload"
                />
                <Button
                  asChild
                  className="glow-electric"
                  disabled={isUploading}
                >
                  <label htmlFor="pdf-upload" className="cursor-pointer">
                    {isUploading ? "Uploading..." : "Choose File"}
                  </label>
                </Button>
              </div>
            </motion.div>
          )}

          {/* Text Input Mode */}
          {uploadMode === "text" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8"
            >
              <Button
                variant="ghost"
                onClick={() => setUploadMode(null)}
                className="mb-4"
              >
                ← Back
              </Button>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Describe your startup
                  </label>
                  <textarea
                    value={pitchText}
                    onChange={(e) => setPitchText(e.target.value)}
                    placeholder="What problem are you solving? Who are your customers? What's your business model?"
                    className="w-full h-48 bg-input border border-border rounded-lg p-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>

                <Button
                  onClick={handleTextSubmit}
                  className="w-full glow-electric"
                  size="lg"
                  disabled={isUploading || !pitchText.trim()}
                >
                  {isUploading ? "Starting Session..." : "Enter the Hot Seat"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Warning Banner */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 glass p-6 border-l-4 border-destructive"
          >
            <h4 className="font-semibold text-destructive mb-2 flex items-center gap-2">
              <span className="text-2xl">⚠️</span> WARNING
            </h4>
            <p className="text-sm text-muted-foreground font-mono-terminal">
              This is not a friendly demo. The AI is trained to think like a
              hardcore VC. It will interrupt, challenge claims, and test your
              defensiveness. Your "Coachability Delta" will be tracked. Prepare
              to defend every assumption.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
