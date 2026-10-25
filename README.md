# Aria – AI Voice CX Agent for Aura Skincare

Browser-based voice support agent. Click **Start Call**, talk to Aria, get order info and policy answers, then see a transcript and a structured JSON summary when the call ends.

**Live demo:**https://aura-voice-agent-omega.vercel.app/  ·  Use Chrome or Edge (Web Speech API).

## Architecture

CLIENT (browser)
  Mic -> STT (Web Speech API) -> React UI (state machine) -> TTS (speechSynthesis) -> Speakers

SERVER (Next.js on Vercel)
  /api/chat    -> system prompt + history -> LLM -> tool loop -> reply
  /api/summary -> transcript -> LLM (JSON mode) -> structured outcome

AI + TOOLS
  Groq openai/gpt-oss-120b -> get_order_details(order_id) -> Mock order DB

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

## Tell us how you think

### 1. Why did you choose your particular architecture and technology stack?
I split the voice agent into three simple steps: the browser listens to the customer and turns speech into text, an AI model decides what to reply (and looks up the order if needed), and the browser reads the reply out loud. I chose this because it's easy to understand and debug. If something goes wrong, I can see exactly which step failed. I used Next.js because the website and the backend sit in one project, and my API key stays safely on the server. I used Groq because it's free and replies quickly, which matters on a voice call. The whole thing costs nothing to run, which suited this assignment.

### 2. What was the most difficult part of the assignment, and how did you solve it?
The hardest part was making the whole thing work reliably once it was deployed, not just on my laptop. My first AI model gave a "model not found" error, and the app only said "technical issue". I found the real problem by reading the error logs, and then I made the model name a setting (`GROQ_MODEL`) so I could change it without touching the code. I switched to `openai/gpt-oss-120b`. I also had to turn off Vercel's login protection so evaluators can open the app without signing in. Another challenge was stopping the agent from hearing its own voice, so I pause listening while it speaks.

### 3. If you had one more week, what would you improve first and why?
I would improve the voice quality and speed first, because that's what a customer notices immediately. Right now the voice depends on the browser, so it sounds different on different computers. I would use a better speech-to-text service and a natural Indian-sounding voice. I would also let customers interrupt Aria while she's speaking, and start speaking as soon as the first sentence is ready, so there are fewer awkward pauses.

### 4. Imagine this agent is handling 1,000 customer conversations a day. What would need to change or improve?
- Connect it to the real order system instead of my mock data, and verify the customer (for example with an OTP) before sharing order details.
- Move speech processing to the server so quality doesn't depend on each customer's browser.
- Save call logs and track things like response time, cost per call, and how many issues get resolved.
- Add automatic tests to check the agent follows the policies, so a prompt change can't break them.
- Add backups if the AI service goes down, and a way to hand tricky calls to a human.
## Limitations (honest notes)
- Web Speech API works only in Chrome/Edge and accuracy varies with accents and noise. Use headphones to avoid echo.
- Voice quality depends on the voices installed in the viewer's browser/OS.
- Agent can't actually cancel or refund; the order DB is a mock.
