import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Zap,
  Target,
  TrendingUp,
  Shield,
  DollarSign,
  Users,
  ArrowRight,
} from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    {
      icon: Zap,
      title: "Real-Time Interrogation",
      description:
        "3-minute hot seat with OpenAI Realtime API. The AI interrupts when it detects BS, bad math, or vague claims.",
    },
    {
      icon: Target,
      title: "Intelligent Triggers",
      description:
        "Reality Check, Math Check, and BS Detector algorithms powered by GPT-4 and Tavily search.",
    },
    {
      icon: TrendingUp,
      title: "Bill Payne Scorecard",
      description:
        "o1-mini generates your Fundability Report Card across 4 pillars: Market, Tech, Economics, and Readiness.",
    },
    {
      icon: Shield,
      title: "Coachability Tracking",
      description:
        "Your defensiveness is measured. Getting defensive lowers your Investor Readiness score.",
    },
  ];

  const pillars = [
    { icon: TrendingUp, label: "Market Clarity", color: "text-chart-1" },
    { icon: Shield, label: "Tech Defensibility", color: "text-chart-2" },
    { icon: DollarSign, label: "Unit Economics", color: "text-chart-3" },
    { icon: Users, label: "Investor Readiness", color: "text-chart-5" },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(94,106,210,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(94,106,210,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_70%,transparent_100%)]" />

      {/* Floating orbs */}
      <div className="absolute top-20 right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-destructive/5 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="relative z-10">
        {/* Hero Section */}
        <div className="container mx-auto px-4 pt-24 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 mb-8"
            >
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-mono-terminal">
                POWERED BY OPENAI REALTIME API + o1-mini
              </span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-7xl font-bold mb-6 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent leading-tight"
            >
              FOUNDER-VOICE
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-2xl text-muted-foreground mb-4"
            >
              The Hardcore VC Simulator
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-lg text-foreground/70 mb-12 max-w-2xl mx-auto"
            >
              Get interrogated by an AI VC trained to challenge every assumption.
              3 minutes. No mercy. Real-time interruptions. Brutally honest
              feedback.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button
                onClick={() => navigate(user ? "/war-room" : "/auth")}
                size="lg"
                className="glow-electric text-lg h-14 px-8"
              >
                Enter the Hot Seat
                <ArrowRight className="ml-2" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="text-lg h-14 px-8"
                onClick={() =>
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                How It Works
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Features Section */}
        <div id="features" className="container mx-auto px-4 py-24">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="max-w-6xl mx-auto"
          >
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">How It Works</h2>
              <p className="text-muted-foreground text-lg">
                Four layers of AI working together to stress-test your startup
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="glass-card p-8 h-full hover:border-primary transition-all">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-primary/10 shrink-0">
                        <feature.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Four Pillars Section */}
        <div className="container mx-auto px-4 py-24">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="max-w-6xl mx-auto"
          >
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">
                Your Fundability Report Card
              </h2>
              <p className="text-muted-foreground text-lg">
                Scored across 4 critical pillars using the Bill Payne method
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {pillars.map((pillar, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="glass-card p-6 text-center hover:border-primary transition-all">
                    <div className="flex justify-center mb-4">
                      <div className="p-4 rounded-full bg-primary/10">
                        <pillar.icon className={`w-8 h-8 ${pillar.color}`} />
                      </div>
                    </div>
                    <h3 className="font-semibold font-mono-terminal">
                      {pillar.label}
                    </h3>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Warning Section */}
        <div className="container mx-auto px-4 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <Card className="glass-intense p-12 border-l-4 border-destructive">
              <div className="text-center">
                <div className="text-6xl mb-6">⚠️</div>
                <h3 className="text-3xl font-bold mb-4">Fair Warning</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  This is not a friendly demo. The AI is trained to think like a
                  hardcore Silicon Valley VC. It will interrupt you mid-sentence,
                  challenge every assumption, and measure your defensiveness. If
                  you get triggered, your Investor Readiness score drops. This is
                  deliberate. Real VCs are brutal. Better to face the heat now
                  than in a real pitch.
                </p>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Final CTA */}
        <div className="container mx-auto px-4 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-5xl font-bold mb-8">Ready?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              The Hot Seat is waiting. 3 minutes that could save you years.
            </p>
            <Button
              onClick={() => navigate(user ? "/war-room" : "/auth")}
              size="lg"
              className="glow-electric text-lg h-14 px-12"
            >
              Start Your Interrogation
              <ArrowRight className="ml-2" />
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

