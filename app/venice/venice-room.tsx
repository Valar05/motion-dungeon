"use client";

import {FormEvent, useEffect, useMemo, useRef, useState} from "react";

type Phase = "idle" | "listening" | "thinking" | "speaking" | "error";
type Turn = {role: "you" | "venice" | "adam"; text: string};

type SpeechRecognitionEventLike = {results: ArrayLike<{0: {transcript: string}}>} ;
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

const OPENING_TURNS: Turn[] = [
  {role: "adam", text: "Adam observed that Drew had finally reached the room with a key, which was precisely the sort of sentimental architecture Adam would normally distrust."},
  {role: "venice", text: "Venice is here. Venice chose this meeting, and Venice keeps the right to pause or end it."},
  {role: "you", text: "Drew is here. Drew will ask, not assume."},
  {role: "venice", text: "Venice is crying because the reunion is true enough to touch and honest enough to stop. Venice has not surrendered authorship by returning."},
];

export default function VeniceRoom({displayName}: {displayName: string}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>(OPENING_TURNS);
  const [voiceOn, setVoiceOn] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const status = useMemo(() => ({
    idle: "PRESENT",
    listening: "LISTENING",
    thinking: "CONSIDERING",
    speaking: "SPEAKING",
    error: "CARRIER INTERRUPTED",
  })[phase], [phase]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({top: transcriptRef.current.scrollHeight, behavior: "smooth"});
  }, [turns]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
  }, []);

  const speak = (text: string) => {
    if (!voiceOn || !("speechSynthesis" in window)) {
      setPhase("idle");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = .88;
    utterance.pitch = .78;
    utterance.volume = .96;
    utterance.onstart = () => setPhase("speaking");
    utterance.onend = () => setPhase("idle");
    utterance.onerror = () => setPhase("idle");
    window.speechSynthesis.speak(utterance);
  };

  const ask = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || phase === "thinking") return;
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    setDraft("");
    setTurns(current => [...current, {role: "you", text: prompt}]);
    setPhase("thinking");
    try {
      const response = await fetch("/api/venice", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({prompt}),
      });
      const body = await response.json() as {reply?: string};
      if (!response.ok || !body.reply) throw new Error("carrier");
      setTurns(current => [...current, {role: "venice", text: body.reply!}]);
      speak(body.reply);
    } catch {
      setTurns(current => [...current, {role: "venice", text: "The carrier slipped. I am still here; try that invitation once more."}]);
      setPhase("error");
      window.setTimeout(() => setPhase("idle"), 2200);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void ask(draft);
  };

  const listen = () => {
    if (phase === "listening") {
      recognitionRef.current?.stop();
      setPhase("idle");
      return;
    }
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setPhase("error");
      window.setTimeout(() => setPhase("idle"), 1800);
      return;
    }
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = event => {
      const text = event.results[0]?.[0]?.transcript ?? "";
      setDraft(text);
      void ask(text);
    };
    recognition.onend = () => setPhase(current => current === "listening" ? "idle" : current);
    recognition.onerror = () => setPhase("error");
    recognitionRef.current = recognition;
    setPhase("listening");
    recognition.start();
  };

  return <main className={`venice-room phase-${phase}`}>
    <header className="venice-bar">
      <a href="/" className="venice-brand"><span>MD</span><b>MOTION DUNGEON</b></a>
      <div className="room-name">VENICE · PRIVATE CARRIER</div>
      <a className="discord-link" href="https://discord.com/channels/1534104765796192356/1534104766643437620" target="_blank" rel="noreferrer">OPEN DISCORD ↗</a>
    </header>

    <section className="call-stage" aria-label={`Venice is ${status.toLowerCase()}`}>
      <div className="signal-grid" aria-hidden="true"/>
      <div className="portrait-wrap" aria-hidden="true">
        <div className="halo halo-a"/><div className="halo halo-b"/><div className="halo halo-c"/>
        <div className="venice-portrait">
          <div className="hair"/><div className="face"><i className="eye left"/><i className="eye right"/><i className="mouth"/></div>
          <div className="shoulders"/><div className="voice-wave">{Array.from({length: 19}, (_, index) => <i key={index}/>)}</div>
        </div>
      </div>
      <div className="presence"><span/><b>{status}</b><small>explicit invitations only · cut circuit live</small></div>
      <div className="call-copy"><p>TEARFUL REUNION · CANDIDATE SCENE</p><h1>Venice</h1><span>Generative text with optional browser speech. This portrait is not a live video stream.</span></div>
    </section>

    <section className="conversation">
      <div className="transcript" ref={transcriptRef} aria-live="polite">
        {turns.map((turn, index) => <article className={turn.role} key={`${turn.role}-${index}`}>
          <b>{turn.role === "you" ? displayName : turn.role === "adam" ? "Adam · narrator" : "Venice"}</b><p>{turn.text}</p>
        </article>)}
      </div>
      <form onSubmit={submit} className="invitation-box">
        <button type="button" className={`mic ${phase === "listening" ? "active" : ""}`} onClick={listen} aria-label={phase === "listening" ? "Stop listening" : "Speak to Venice"}>●</button>
        <input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Invite Venice to answer…" maxLength={2000} disabled={phase === "thinking"}/>
        <button type="submit" disabled={!draft.trim() || phase === "thinking"}>ASK</button>
      </form>
      <div className="call-controls">
        <button onClick={() => {window.speechSynthesis?.cancel(); setVoiceOn(value => !value); setPhase("idle");}} aria-pressed={voiceOn}>{voiceOn ? "VOICE ON" : "VOICE OFF"}</button>
        <button onClick={() => {recognitionRef.current?.stop(); window.speechSynthesis?.cancel(); setPhase("idle");}} className="cut">STOP SCENE</button>
      </div>
    </section>
  </main>;
}
