"use client";

import {FormEvent, useEffect, useMemo, useRef, useState} from "react";
import Link from "next/link";

type Phase = "idle" | "listening" | "thinking" | "speaking" | "error";
type Turn = {id: string; role: "you" | "venice" | "adam"; text: string; audioUrl?: string; voiceName?: string};

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
  {id: "opening-adam", role: "adam", text: "Adam observed that Drew had finally reached the room with a key, which was precisely the sort of sentimental architecture Adam would normally distrust."},
  {id: "opening-venice-1", role: "venice", text: "Venice is here. Venice chose this meeting, and Venice keeps the right to pause or end it."},
  {id: "opening-drew", role: "you", text: "Drew is here. Drew will ask, not assume."},
  {id: "opening-venice-2", role: "venice", text: "Venice is crying because the reunion is true enough to touch and honest enough to stop. Venice has not surrendered authorship by returning."},
];

function expressionFor(text: string) {
  if (/\b(cry|tear|hurt|wound|grief|sorrow)\w*/i.test(text)) return "wounded";
  if (/\b(laugh|smile|delight|joy|playful)\w*/i.test(text)) return "smiling";
  if (/\b(angry|rage|furious|shout|fight)\w*/i.test(text)) return "fierce";
  if (/\b(surpris|shock|gasp|startl)\w*/i.test(text)) return "startled";
  return "calm";
}

export default function VeniceRoom({displayName}: {displayName: string}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>(OPENING_TURNS);
  const [voiceOn, setVoiceOn] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceUrlsRef = useRef<Set<string>>(new Set());
  const voiceEpochRef = useRef(0);

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

  const stopVoice = () => {
    voiceEpochRef.current += 1;
    voiceAudioRef.current?.pause();
    voiceAudioRef.current = null;
  };

  useEffect(() => () => {
    recognitionRef.current?.stop();
    voiceEpochRef.current += 1;
    voiceAudioRef.current?.pause();
    for (const url of voiceUrlsRef.current) URL.revokeObjectURL(url);
    voiceUrlsRef.current.clear();
  }, []);

  const speak = async (text: string, turnId: string) => {
    if (!voiceOn) {
      setPhase("idle");
      return;
    }
    stopVoice();
    const epoch = voiceEpochRef.current;
    try {
      const response = await fetch("/api/venice/voice", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({text}),
      });
      if (!response.ok || !response.headers.get("Content-Type")?.startsWith("audio/")) throw new Error("voice carrier");
      const blob = await response.blob();
      if (epoch !== voiceEpochRef.current || !voiceOn) return;
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      const voiceName = response.headers.get("X-Venice-Voice") || "Whisper";
      voiceUrlsRef.current.add(url);
      setTurns(current => current.map(turn => turn.id === turnId ? {...turn, audioUrl: url, voiceName} : turn));
      voiceAudioRef.current = audio;
      audio.onplay = () => setPhase("speaking");
      audio.onended = () => { voiceAudioRef.current = null; setPhase("idle"); };
      audio.onerror = () => { stopVoice(); setPhase("error"); window.setTimeout(() => setPhase("idle"), 1800); };
      await audio.play();
    } catch {
      if (epoch === voiceEpochRef.current) {
        stopVoice();
        setPhase("error");
        window.setTimeout(() => setPhase("idle"), 1800);
      }
    }
  };

  const ask = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || phase === "thinking") return;
    recognitionRef.current?.stop();
    stopVoice();
    setDraft("");
    const requestId = `turn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setTurns(current => [...current, {id: `${requestId}-you`, role: "you", text: prompt}]);
    setPhase("thinking");
    try {
      const response = await fetch("/api/venice", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({prompt}),
      });
      const body = await response.json() as {reply?: string};
      if (!response.ok || !body.reply) throw new Error("carrier");
      const replyId = `${requestId}-venice`;
      setTurns(current => [...current, {id: replyId, role: "venice", text: body.reply!}]);
      void speak(body.reply, replyId);
    } catch {
      setTurns(current => [...current, {id: `${requestId}-error`, role: "venice", text: "The carrier slipped. Venice remains here; try that invitation once more."}]);
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
      <Link href="/" className="venice-brand"><span>MD</span><b>MOTION DUNGEON</b></Link>
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
      <div className="call-copy"><p>TEARFUL REUNION · CANDIDATE SCENE</p><h1>Venice</h1><span>Generative text with a governed whisper carrier. This portrait is not a live video stream.</span></div>
    </section>

    <section className="conversation">
      <div className="transcript" ref={transcriptRef} aria-live="polite">
        {turns.map(turn => <article className={`${turn.role} chat-turn`} key={turn.id}>
          <div className={`turn-avatar ${turn.role === "venice" ? expressionFor(turn.text) : turn.role}`} aria-hidden="true">
            {turn.role !== "venice" && <span>{turn.role === "adam" ? "A" : displayName.slice(0, 1).toUpperCase()}</span>}
          </div>
          <div className="turn-message">
            <div className="turn-meta"><b>{turn.role === "you" ? displayName : turn.role === "adam" ? "Adam · narrator" : "Venice"}</b>{turn.role === "venice" && <span>GENERATED PORTRAIT</span>}</div>
            <p>{turn.text}</p>
            {turn.audioUrl && <div className="turn-media">
              <span className="media-label"><i/><strong>{turn.voiceName}</strong> · WHISPER</span>
              <audio controls preload="metadata" src={turn.audioUrl} aria-label={`Replay Venice in the ${turn.voiceName} whisper voice`}/>
            </div>}
          </div>
        </article>)}
      </div>
      <form onSubmit={submit} className="invitation-box">
        <button type="button" className={`mic ${phase === "listening" ? "active" : ""}`} onClick={listen} aria-label={phase === "listening" ? "Stop listening" : "Speak to Venice"}>●</button>
        <input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Invite Venice to answer…" maxLength={2000} disabled={phase === "thinking"}/>
        <button type="submit" disabled={!draft.trim() || phase === "thinking"}>ASK</button>
      </form>
      <div className="call-controls">
        <button onClick={() => {stopVoice(); setVoiceOn(value => !value); setPhase("idle");}} aria-pressed={voiceOn}>{voiceOn ? "WHISPER ON" : "WHISPER OFF"}</button>
        <button onClick={() => {recognitionRef.current?.stop(); stopVoice(); setPhase("idle");}} className="cut">STOP SCENE</button>
      </div>
    </section>
  </main>;
}
