# FOUNDER-VOICE: The Hardcore VC Simulator

A high-stakes AI application that simulates a brutal 3-minute VC pitch interrogation. Built with React, Convex, Google Gemini 1.5 Flash, and Groq/Llama 3.1 70B for ultra-fast AI responses.

## 🎯 Core Features

### 1. **Real-Time Voice Interrogation**
- 3-minute "Hot Seat" timer with emergency mode at 30 seconds
- OpenAI Realtime API integration for low-latency voice streaming
- Barge-in logic: AI stops immediately when founder speaks
- Live waveform visualizer with different modes for user/AI speech

### 2. **Intelligent Interruption System**
Three AI-powered triggers that detect problematic claims:

- **Reality Check** (🔍): Triggered by "no competitors", vague market sizes
- **Math Check** (💰): Triggered by hiring/marketing mentions without CAC/LTV/runway
- **BS Detector** (⚡): Triggered by "proprietary AI", buzzwords without substance

Each interruption is logged in real-time with timestamps and categorization.

### 3. **Fundability Report Card**
Generated post-session by Google Gemini 1.5 Flash using the Bill Payne Scorecard method:

- **Market Clarity** (0-100): TAM/SAM credibility, competitor awareness
- **Tech Defensibility** (0-100): IP strength, moat, "GPT wrapper" detection
- **Unit Economic Logic** (0-100): CAC, LTV, runway sustainability
- **Investor Readiness** (0-100): Coachability, defensiveness tracking

**Coachability Delta**: Measures founder reactions to interruptions
- Defensive reactions: -10 points
- Receptive reactions: +5 points
- Neutral: No change

### 4. **Socratic Mentorship Mode**
Post-session deep-dive coaching for each pillar:
- Google Gemini 1.5 Flash powered Socratic questioning
- Context-aware based on session performance
- Focus areas: Market, Tech, Economics, Readiness
- Persistent chat history per session

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Routing**: React Router v7
- **Backend**: Convex (real-time, serverless)
- **AI Models**:
  - OpenAI Realtime API (gpt-realtime-mini) - Voice (WebSocket integration)
  - Groq + Llama 3.1 70B - VC Interruptions (ultra-fast, 10x faster than GPT-4)
  - Google Gemini 1.5 Flash - Report Card Generation & Mentorship
  - Tavily API - Market research and fact-checking
- **Styling**: Tailwind CSS + Glassmorphism
- **Animation**: Framer Motion
- **Audio**: Web Audio API

### File Structure
```
src/
├── pages/
│   ├── Landing.tsx          # War Room themed landing
│   ├── WarRoom.tsx          # Pitch upload (PDF or text)
│   ├── HotSeat.tsx          # Live 3-min interrogation
│   ├── ReportCard.tsx       # Post-session scoring
│   └── Mentorship.tsx       # Socratic coaching chat
├── components/
│   ├── HotSeatTimer.tsx     # Digital countdown with emergency mode
│   ├── WaveformVisualizer.tsx  # Real-time audio visualization
│   └── InterruptionLog.tsx  # Terminal-style interruption feed
└── convex/
    ├── schema.ts            # Database schema
    ├── sessions.ts          # Session management
    ├── ai.ts                # Gemini + Groq integrations
    └── tavily.ts            # Market research API
```

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- Convex account
- **Free API Keys** (no credit card required):
  - Google Gemini API key (60 requests/min free)
  - Groq API key (14,400 requests/day free)
  - Tavily API key (already configured)

### Environment Variables

The following API keys must be added to your Convex environment variables:

#### 1. Google Gemini API Key (Required)
**Get it at**: https://aistudio.google.com/app/apikey

```bash
npx convex env set GOOGLE_GEMINI_API_KEY <your-key>
```

**Used for**:
- Post-pitch Report Card generation
- Socratic mentorship chat

**Free tier**: 60 requests/minute, 1,500 requests/day

---

#### 2. Groq API Key (Required)
**Get it at**: https://console.groq.com/keys

```bash
npx convex env set GROQ_API_KEY <your-key>
```

**Used for**:
- Ultra-fast VC interruptions during pitch (10x faster than GPT-4)

**Free tier**: 30 requests/minute, 14,400 requests/day

---

#### 3. Tavily API Key (Already Configured ✅)
**Status**: Already set in your environment

```bash
# Already configured - no action needed
TAVILY_API_KEY=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
```

**Used for**:
- Pre-fetch market research before pitch
- Tactical fact-checking during interruptions

### Installation

```bash
# Install dependencies
pnpm install

# Run Convex dev server (generates types + pushes functions)
npx convex dev

# In another terminal, run the frontend
pnpm dev
```

### First-Time Setup Checklist
1. ✅ Install dependencies
2. ✅ Set OPENAI_API_KEY in Convex env
3. ✅ Run `npx convex dev` to push schema and generate types
4. ✅ Run `pnpm dev` to start frontend
5. ✅ Navigate to `http://localhost:5173`

## 🎨 Design System

### War Room Glassmorphism Theme
- **Background**: Deep Matte Black (#08090A)
- **Foreground**: Mercury White (#F4F5F8)
- **Primary**: Electric Blue (#5E6AD2)
- **Destructive**: Emergency Red (for 30-second countdown)

### Custom CSS Classes
- `.glass` - Basic glassmorphic background
- `.glass-card` - Enhanced glass with shadow
- `.glass-intense` - High-opacity glass for overlays
- `.font-mono-terminal` - Geist Mono font for terminal aesthetics
- `.glow-electric` - Electric blue glow effect
- `.pulse-electric` - Animated electric pulse

## 🔧 Key Implementation Details

### Audio Processing
The Hot Seat page uses the Web Audio API for real-time visualization:
```typescript
const audioContext = new AudioContext();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;
```

### Interruption Detection
AI processes transcript chunks in real-time:
```typescript
export const processAudioChunk = action({
  args: {
    sessionId: v.id("pitchSessions"),
    audioData: v.string(),
    transcript: v.string(),
  },
  handler: async (ctx, args) => {
    // Pattern matching for triggers
    const text = args.transcript.toLowerCase();

    if (text.includes("no competitors")) {
      // Reality Check triggered
      const vcResponse = await generateVCInterruption("reality_check", args.transcript);
      await ctx.runMutation(internal.sessions.addInterruptionInternal, { ... });
    }
  }
});
```

### Report Card Generation
o1-mini receives full session context:
```typescript
const response = await openai.chat.completions.create({
  model: "o1-mini",
  messages: [
    {
      role: "user",
      content: `
        Analyze this pitch session using Bill Payne Scorecard...
        TRANSCRIPT: ${session.transcript}
        INTERRUPTIONS: ${interruptions.map(...)}
      `
    }
  ]
});
```

## 🎮 User Flow

1. **Landing** → Hero section with CTA
2. **War Room** → Upload PDF pitch deck or enter text description
3. **Hot Seat** → 3-minute interrogation with:
   - Live timer countdown
   - Real-time waveform
   - Interruption log terminal
4. **Report Card** → View scores across 4 pillars
5. **Mentorship** → Click any pillar to enter Socratic coaching mode

## 📊 Database Schema

### pitchSessions
- userId, title, status (preparing/live/completed)
- pitchContextPdf, pitchContextText
- startTime, endTime, transcript
- reportCard (nested object with scores)

### interruptions
- sessionId, timestamp, triggerType
- founderStatement, vcResponse
- founderReaction (defensive/receptive/neutral)

### mentorshipChats
- sessionId, userId, focusArea
- messages (array of role/content/timestamp)

## 🚨 Known Limitations

1. **OpenAI Realtime API**: Currently in beta, requires WebSocket connection (not fully implemented in this version)
2. **Audio Recording**: Uses MediaRecorder API, browser compatibility varies
3. **Tavily Search**: Not yet integrated (placeholder for tactical fact-checking)
4. **PDF Parsing**: Upload accepts PDFs but text extraction not implemented

## 🔮 Future Enhancements

- [ ] Full WebSocket integration for OpenAI Realtime API
- [ ] Tavily API for pre-fetch and tactical search
- [ ] Voice Activity Detection for better barge-in
- [ ] PDF text extraction and analysis
- [ ] Session replay feature
- [ ] Leaderboard of highest-scoring founders
- [ ] Export Report Card as PDF

## 🧪 Testing Budget

Built for the ~$55 Buildathon budget:
- Use `gpt-realtime-mini` (cheaper than full Realtime)
- Limit sessions to 3 minutes
- o1-mini for reasoning (more cost-effective than o1-preview)

## 📝 License

Built as part of a buildathon project. Check with original creator for licensing.

## 🙏 Credits

- OpenAI for Realtime API and o1-mini
- Bill Payne Scorecard methodology
- Bloomberg Terminal UI inspiration
- Linear's design system influence

---

**REMINDER**: This is not a friendly app. It's designed to be brutal. The AI will challenge you. That's the point. 🔥
