import { NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "../../../lib/prompt";
import { getOrderDetails } from "../../../lib/orders";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const tools = [{
  type: "function",
  function: {
    name: "get_order_details",
    description: "Look up an Aura Skincare order by ID. Returns status, product, value, tracking and cancel/return eligibility.",
    parameters: {
      type: "object",
      properties: { order_id: { type: "string", description: "Order ID such as ORD-101" } },
      required: ["order_id"],
    },
  },
}];

async function callGroq(messages) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages, tools, tool_choice: "auto", temperature: 0.3, max_tokens: 220 }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  return (await res.json()).choices[0].message;
}

export async function POST(req) {
  try {
    const { messages } = await req.json();
    const convo = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];
    // Tool loop: the model may call get_order_details; we run it and feed the result back.
    for (let i = 0; i < 3; i++) {
      const msg = await callGroq(convo);
      if (!msg.tool_calls?.length) return NextResponse.json({ reply: (msg.content || "").trim() });
      convo.push({ role: "assistant", content: msg.content || "", tool_calls: msg.tool_calls });
      for (const tc of msg.tool_calls) {
        let args = {};
        try { args = JSON.parse(tc.function.arguments || "{}"); } catch {}
        convo.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(getOrderDetails(args.order_id)) });
      }
    }
    return NextResponse.json({ reply: "Sorry, I'm having a little trouble with that. Could you please repeat your request?" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ reply: "Sorry, I'm facing a technical issue right now. Could you please say that again?" });
  }
}
