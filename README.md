# Aria – AI Voice CX Agent for Aura Skincare

Browser-based voice support agent. Click **Start Call**, talk to Aria, get order info and policy answers, then see a transcript and a structured JSON summary when the call ends.

**Live demo:** <your-vercel-url>  ·  Use Chrome or Edge (Web Speech API).

## Architecture

```
Mic → Browser SpeechRecognition (STT, en-IN)
        → POST /api/chat → Groq Llama 3.3 70B (system prompt + guardrails)
                              ↳ tool call get_order_details(order_id) → mock order DB → result back to LLM
        ← reply text → Browser speechSynthesis (TTS, Indian English voice) → Speakers
End Call → POST /api/summary → LLM returns JSON {customer_intent, order_id, resolution_status, call_summary}
```

- **State machine:** idle → listening → thinking → speaking, shown live in the UI.
- **Tool calling:** the LLM decides when to call `get_order_details`. The server normalises IDs ("order 101" → ORD-101), returns `NOT_FOUND` / `MISSING_OR_INVALID_FORMAT` errors, and adds eligibility data (can_cancel, return window) so the model doesn't have to compute dates.
- **Guardrails:** brand policies are the only source of truth in the system prompt, with explicit rules: no promises outside policy, Aura-only scope, admit when unsure, ask to repeat when unclear, never guess an order ID.
- **Echo handling:** mic is paused while Aria speaks; an **Interrupt** button stops her speech instantly.
- **Hinglish:** the prompt tells Aria to reply in Hinglish if the customer does.
- **Cost:** entirely free tier (Groq free API key + browser STT/TTS).

## Setup

```bash
npm install
cp .env.example .env.local   # add your free GROQ_API_KEY from console.groq.com
npm run dev                  # http://localhost:3000
```

Deploy: push to GitHub → import in Vercel → add `GROQ_API_KEY` env var → deploy.

## Tell us how you think

1. **Architecture and stack:** *(edit in your own words)* I used a modular STT → LLM → TTS pipeline on Next.js because it is simple to deploy, lets me see and control each step (tools, guardrails, latency), and runs fully on free tiers. Groq gives very fast inference, and browser speech APIs avoid extra vendors and network hops.
2. **Hardest part:** *(edit with your real experience)* Making the loop feel natural: avoiding the agent hearing its own voice, handling silence and unclear audio, and keeping replies short. I solved it by pausing recognition during playback, auto-restarting listening, and a voice-specific prompt.
3. **One more week:** Replace browser STT/TTS with streaming Deepgram + a neural Indian-voice TTS (e.g. Sarvam), add true barge-in with VAD, and stream LLM tokens into TTS sentence by sentence to cut latency.
4. **At 1,000 calls/day:** Server-side streaming STT/TTS, a real order API with auth/OTP verification, call logging and analytics, automated eval tests for policy adherence, rate limiting and fallbacks across LLM providers, human handoff for unresolved calls, and monitoring of latency and cost per call.

## Limitations (honest notes)
- Web Speech API works only in Chrome/Edge and accuracy varies with accents and noise. Use headphones to avoid echo.
- Voice quality depends on the voices installed in the viewer's browser/OS.
- Agent can't actually cancel or refund; the order DB is a mock.
