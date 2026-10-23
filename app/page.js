"use client";
import { useEffect, useRef, useState } from "react";
import { ORDERS } from "../lib/orders";

const GREETING = "Hello! This is Aria from Aura Skincare. How can I help you today?";
const LABELS = { idle: "Idle", listening: "Listening", thinking: "Thinking", speaking: "Speaking" };

export default function Home() {
  const [status, setStatus] = useState("idle");
  const [inCall, setInCall] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [summary, setSummary] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const [live, setLive] = useState("");
  const [error, setError] = useState("");

  const active = useRef(false);   // is a call in progress
  const recRef = useRef(null);    // current SpeechRecognition instance
  const history = useRef([]);     // [{role, content}] sent to the LLM

  useEffect(() => { window.speechSynthesis?.getVoices(); }, []); // prime voice list

  const add = (role, text) => {
    history.current.push({ role, content: text });
    setTranscript((t) => [...t, { role, text, time: new Date().toLocaleTimeString() }]);
  };

  // --- TTS: browser speechSynthesis, prefer an Indian English voice ---
  const speak = (text) => new Promise((resolve) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const v = voices.find((x) => x.lang.replace("_", "-") === "en-IN" && /female|heera|neerja|veena|google/i.test(x.name))
      || voices.find((x) => x.lang.replace("_", "-") === "en-IN")
      || voices.find((x) => x.lang.startsWith("en"));
    if (v) u.voice = v;
    u.lang = v?.lang || "en-IN";
    u.rate = 1.05;
    u.onend = resolve;
    u.onerror = resolve;
    setStatus("speaking");
    synth.speak(u);
  });

  // --- STT: browser SpeechRecognition (Chrome/Edge). Paused while the agent speaks to avoid echo. ---
  const listen = () => {
    if (!active.current) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    recRef.current = rec;
    let finalText = "";
    rec.onstart = () => setStatus("listening");
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript;
      }
      setLive(finalText + interim);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Microphone access is blocked. Allow it in your browser settings and start the call again.");
        endCall();
      }
    };
    rec.onend = () => {
      setLive("");
      if (!active.current) return;
      if (finalText.trim()) respond(finalText.trim());
      else setTimeout(listen, 250); // silence / nothing heard: keep listening
    };
    try { rec.start(); } catch {}
  };

  const respond = async (text) => {
    add("user", text);
    setStatus("thinking");
    let reply;
    try {
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.current }),
      });
      reply = (await r.json()).reply;
    } catch {
      reply = "Sorry, I'm having trouble connecting. Could you please say that again?";
    }
    if (!active.current) return; // call ended while thinking
    add("assistant", reply);
    await speak(reply);
    if (active.current) listen();
  };

  const startCall = async () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError("Speech recognition isn't supported here. Please open this page in Chrome or Edge."); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
    } catch { setError("Microphone permission was denied. Allow it and try again."); return; }
    setError(""); setSummary(null); setTranscript([]); history.current = [];
    active.current = true; setInCall(true);
    add("assistant", GREETING);
    await speak(GREETING);
    listen();
  };

  const endCall = async () => {
    active.current = false;
    setInCall(false); setStatus("idle"); setLive("");
    recRef.current?.abort();
    window.speechSynthesis.cancel();
    const msgs = history.current;
    if (!msgs.some((m) => m.role === "user")) {
      setSummary({ customer_intent: "NONE", order_id: null, resolution_status: "NO_CONVERSATION", call_summary: "The customer ended the call without speaking." });
      return;
    }
    setSummarizing(true);
    try {
      const r = await fetch("/api/summary", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs }),
      });
      setSummary(await r.json());
    } finally { setSummarizing(false); }
  };

  return (
    <main className="wrap">
      <h1>Aria · Aura Skincare voice support</h1>
      <p className="sub">Click Start Call, allow the microphone, and talk naturally. Works best in Chrome or Edge with headphones.</p>

      <div className="card">
        <div className="row">
          <button className="start" onClick={startCall} disabled={inCall}>Start Call</button>
          <button className="end" onClick={endCall} disabled={!inCall}>End Call</button>
          <span className={`badge ${status}`}><span className="dot" />{LABELS[status]}</span>
          {status === "speaking" && (
            <button className="ghost" onClick={() => window.speechSynthesis.cancel()}>Interrupt</button>
          )}
        </div>
        <div className="live">{live ? `You: ${live}` : ""}</div>
        {error && <div className="err">{error}</div>}
      </div>

      <div className="grid">
        <div className="card">
          <h2>Test orders</h2>
          {Object.values(ORDERS).map((o) => (
            <div className="order" key={o.order_id}>
              <b>{o.order_id}</b> · {o.customer}<br />
              {o.product} · ₹{o.value_inr} · <b>{o.status}</b><br />
              <span style={{ color: "#6b6b6b" }}>{o.tracking ? `${o.tracking}. ` : ""}{o.notes}</span>
            </div>
          ))}
          <p className="hint">Try: "Where is ORD-101?", "Can I return ORD-102?", "Cancel ORD-103", "Book me a flight to Goa", "Track ORD-999".</p>
        </div>

        <div className="card">
          <h2>Call log</h2>
          <div className="log">
            {transcript.length === 0 && <span className="hint">The transcript appears here during the call.</span>}
            {transcript.map((m, i) => (
              <div className="msg" key={i}>
                <b className={m.role}>{m.role === "user" ? "Customer" : "Aria"}</b> <span className="time">{m.time}</span><br />{m.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {(summary || summarizing) && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>Call outcome</h2>
          {summarizing ? <span className="hint">Generating summary…</span> : <pre>{JSON.stringify(summary, null, 2)}</pre>}
        </div>
      )}
    </main>
  );
}
