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
cp .env.example .env.local   
npm run dev                  # http://localhost:3000
```

Deploy: push to GitHub → import in Vercel → add `GROQ_API_KEY` env var → deploy.

## Tell us how you think

**1. Architecture and Tech Stack:**
I built the project using a modular STT → LLM → TTS pipeline with Next.js. I chose this approach because it is easy to manage and deploy, and I can control each stage of the voice interaction. I used Groq for fast LLM responses and browser-based speech APIs for speech recognition and voice output, which helps keep the project simple and cost-effective.

**2. Hardest Part:**
The most challenging part was making the voice conversation feel natural. Sometimes the agent could hear its own voice, had trouble with silence or unclear audio, or gave lengthy responses. I handled this by pausing speech recognition while the agent was speaking, restarting listening automatically, and improving the prompt to make responses shorter and more conversational.

**3. What I Would Improve With One More Week:**
I would integrate streaming speech recognition using Deepgram and a more natural Indian voice using a service like Sarvam. I would also add voice activity detection so users can interrupt the agent while it is speaking, and stream the LLM response into speech generation in smaller parts to reduce waiting time.

**4. How I Would Scale It to 1,000 Calls Per Day:**
I would improve the system with streaming speech processing, a secure order API with OTP verification, and call logs and analytics. I would also add automated tests to check response quality, rate limits, backup LLM providers, and human support for difficult queries. Finally, I would monitor response time and cost per call to keep the system reliable and efficient.
## Limitations (honest notes)
- Web Speech API works only in Chrome/Edge and accuracy varies with accents and noise. Use headphones to avoid echo.
- Voice quality depends on the voices installed in the viewer's browser/OS.
- Agent can't actually cancel or refund; the order DB is a mock.
