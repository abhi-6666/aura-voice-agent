import { NextResponse } from "next/server";

const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const INSTRUCTIONS = `You analyse a customer support call transcript for Aura Skincare. Return ONLY a JSON object with keys:
"customer_intent": one of ORDER_TRACKING, ORDER_CANCELLATION, RETURN_REFUND, SHIPPING_INFO, PRODUCT_INFO, PAYMENT_COD, OUT_OF_SCOPE, OTHER
"order_id": the order ID discussed (e.g. "ORD-101") or null
"resolution_status": one of RESOLVED, PARTIALLY_RESOLVED, UNRESOLVED, OUT_OF_SCOPE
"call_summary": 1-2 sentences describing what the customer asked and the outcome.`;

export async function POST(req) {
  try {
    const { messages } = await req.json();
    const transcript = messages.map((m) => `${m.role === "user" ? "Customer" : "Aria"}: ${m.content}`).join("\n");
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: MODEL, temperature: 0, response_format: { type: "json_object" },
        messages: [{ role: "system", content: INSTRUCTIONS }, { role: "user", content: transcript }],
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return NextResponse.json(JSON.parse(data.choices[0].message.content));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ customer_intent: "OTHER", order_id: null, resolution_status: "UNRESOLVED", call_summary: "Summary could not be generated." });
  }
}
