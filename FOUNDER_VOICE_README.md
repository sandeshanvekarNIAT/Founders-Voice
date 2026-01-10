# FOUNDER-VOICE: The Hardcore VC Simulator

A high-stakes AI application that simulates a brutal 3-minute VC pitch interrogation. Built with React, Convex, OpenAI Realtime API, and o1-mini reasoning.

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
Generated post-session by OpenAI o1-mini using the Bill Payne Scorecard method:

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
- GPT-4 powered Socratic questioning
- Context-aware based on session performance
- Focus areas: Market, Tech, Economics, Readiness
- Persistent chat history per session

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Routing**: React Router v7
- **Backend**: Convex (real-time, serverless)
- **AI Models**:
  - OpenAI Realtime API (gpt-realtime-mini) - Voice
  - OpenAI GPT-4 - Interruptions & Mentorship
  - OpenAI o1-mini - Report Card Generation
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
    └── ai.ts                # OpenAI integrations
```

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- OpenAI API key with Realtime API access
- Convex account

### Environment Variables

Create a `.env.local` file (or use the existing one) with:

```bash
# Convex (automatically set by Convex)
VITE_CONVEX_URL=<your-convex-deployment-url>

# Required for OpenAI integrations
OPENAI_API_KEY=<your-openai-api-key>
```

**IMPORTANT**: The `OPENAI_API_KEY` must be added to your Convex environment variables:

```bash
npx convex env set OPENAI_API_KEY <your-key>
```

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
