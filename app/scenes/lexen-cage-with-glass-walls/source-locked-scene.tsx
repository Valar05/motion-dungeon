"use client";

import {ChangeEvent, useEffect, useMemo, useRef, useState} from "react";
import Link from "next/link";

type SceneDocument = Record<string, unknown>;

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback = "—") {
  return typeof value === "string" ? value : fallback;
}

function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(object) : [];
}

function parseDocument(raw: string): SceneDocument | null {
  try {
    const parsed = JSON.parse(raw);
    return object(parsed);
  } catch {
    return null;
  }
}

export default function SourceLockedScene({initialDocument}: {initialDocument: SceneDocument}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sourceRaw = useMemo(() => JSON.stringify(initialDocument, null, 2), [initialDocument]);
  const [raw, setRaw] = useState(sourceRaw);
  const [document, setDocument] = useState<SceneDocument>(initialDocument);
  const [status, setStatus] = useState("Source document loaded · unknown fields preserved");
  const [muted, setMuted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [time, setTime] = useState(0);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const source = object(document.source);
  const media = object(document.media);
  const scene = object(document.scene);
  const artifactExcerpt = object(scene.artifactExcerpt);
  const performance = object(document.performance);
  const acceptance = object(document.acceptance);
  const beats = list(scene.beats);
  const duration = typeof media.durationSeconds === "number" ? media.durationSeconds : 0;

  const play = async () => {
    if (!videoRef.current) return;
    try {
      await videoRef.current.play();
      setStatus(reducedMotion ? "Explicit playback started in reduced-motion mode" : "Playing source-locked take 8");
    } catch {
      setStatus("Playback needs a direct browser gesture");
    }
  };

  const stop = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setTime(0);
    setStatus("Scene stopped · source returned to frame zero");
  };

  const toggleAudio = () => {
    const next = !muted;
    setMuted(next);
    if (videoRef.current) videoRef.current.muted = next;
    setStatus(next ? "Source audio muted" : "Source audio active");
  };

  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const nextRaw = await file.text();
    const parsed = parseDocument(nextRaw);
    if (!parsed) {
      setStatus("Load rejected · the selected file is not valid JSON");
      event.target.value = "";
      return;
    }
    setRaw(JSON.stringify(parsed, null, 2));
    setDocument(parsed);
    setStatus(`${file.name} loaded · complete document retained`);
    event.target.value = "";
  };

  const applyEdits = () => {
    const parsed = parseDocument(raw);
    if (!parsed) {
      setStatus("Edits not applied · repair the JSON first");
      return;
    }
    setDocument(parsed);
    setRaw(JSON.stringify(parsed, null, 2));
    setStatus("Scene document applied · unknown fields survived the round trip");
  };

  const saveDocument = () => {
    const parsed = parseDocument(raw);
    if (!parsed) {
      setStatus("Save blocked · the editor contains invalid JSON");
      return;
    }
    const blob = new Blob([JSON.stringify(parsed, null, 2) + "\n"], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `${text(parsed.id, "motion-dungeon-scene")}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setStatus("Scene document saved locally · full topology preserved");
  };

  const restoreSource = () => {
    setRaw(sourceRaw);
    setDocument(initialDocument);
    setStatus("Governing source document restored");
  };

  return (
    <main className={`lexen-shell${reducedMotion ? " lexen-reduced" : ""}`}>
      <header className="lexen-topbar">
        <Link className="lexen-brand" href="/" aria-label="Return to Motion Dungeon">
          <span>MD</span>
          <strong>MOTION DUNGEON</strong>
        </Link>
        <div className="lexen-route">SCENES / LEXEN / TAKE 8</div>
        <Link className="lexen-back" href="/">Return to studio</Link>
      </header>

      <section className="lexen-hero">
        <div className="lexen-title-block">
          <p className="lexen-kicker">SOURCE-LOCKED SCENE DOCUMENT 01</p>
          <h1>{text(document.title)}</h1>
          <p className="lexen-slug">{text(scene.slugline)}</p>
          <p className="lexen-premise">{text(scene.premise)}</p>
        </div>
        <dl className="lexen-locks">
          <div><dt>CANON</dt><dd>{text(object(acceptance.sourceCanon).state)}</dd></div>
          <div><dt>PERFORMANCE</dt><dd>take {String(performance.take ?? "—")} · {text(object(acceptance.take8Performance).state)}</dd></div>
          <div><dt>IMPLEMENTATION</dt><dd>{text(object(acceptance.motionDungeonImplementation).state)}</dd></div>
          <div><dt>ARTISTIC ACCEPTANCE</dt><dd>{text(object(acceptance.motionDungeonArtisticAcceptance).state)}</dd></div>
        </dl>
      </section>

      <section className="lexen-workspace">
        <aside className="lexen-beats" aria-label="Scene beats">
          <div className="lexen-panel-heading"><span>SCENE PRESSURE</span><b>04 BEATS</b></div>
          {beats.map((beat, index) => (
            <article key={text(beat.id, String(index))}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div><h2>{text(beat.label)}</h2><p>{text(beat.action)}</p></div>
            </article>
          ))}
          <blockquote>“{text(artifactExcerpt.text)}”<cite>LEXEN · ACCEPTED TAKE 8</cite></blockquote>
        </aside>

        <section className="lexen-carrier" aria-label="Source locked video carrier">
          <div className="lexen-video-frame">
            <video
              ref={videoRef}
              src={text(media.path, "")}
              controls
              playsInline
              preload="metadata"
              onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
              onEnded={() => setStatus("Take 8 complete · no loop or retiming applied")}
            >
              <track kind="captions" src={text(media.captionsPath, "")} srcLang="en" label="English" default/>
            </video>
            <div className="lexen-glass" aria-hidden="true"/>
            <div className="lexen-timecode">{time.toFixed(2)} / {duration.toFixed(2)} SEC</div>
            {time > .05 && time < duration && <div className="lexen-caption"><span>LEXEN</span>{text(artifactExcerpt.text)}</div>}
          </div>
          <div className="lexen-transport">
            <button type="button" onClick={play}>PLAY SOURCE</button>
            <button type="button" className="lexen-stop" onClick={stop}>STOP SCENE</button>
            <button type="button" onClick={toggleAudio}>{muted ? "AUDIO OFF" : "AUDIO ON"}</button>
            <label><input type="checkbox" checked={reducedMotion} onChange={(event) => {setReducedMotion(event.target.checked); stop();}}/>REDUCED MOTION</label>
          </div>
          <div className="lexen-proof-strip">
            <span>1080 × 1920</span><span>24 FPS</span><span>{text(media.videoCodec).toUpperCase()} / {text(media.audioCodec).toUpperCase()}</span><span>SHA-256 {text(media.sha256).slice(0, 12)}…</span>
          </div>
        </section>

        <aside className="lexen-inspector">
          <div className="lexen-panel-heading"><span>LOCK INSPECTOR</span><b>READBACK</b></div>
          <section><h2>Governing source</h2><p>{text(source.documentTitle)}</p><code>REV {text(source.revisionId)}</code></section>
          <section><h2>Accepted performance</h2><p>{text(performance.verdict)} · timing and final mouth close carried unchanged.</p><code>MD5 {text(media.md5).slice(0, 12)}…</code></section>
          <section><h2>Motion rule</h2><p>{text(object(document.motion).principle)}</p></section>
          <a href={text(source.url, "#")} target="_blank" rel="noreferrer">Open governing document ↗</a>
          <a href={text(media.sourceUrl, "#")} target="_blank" rel="noreferrer">Open source artifact ↗</a>
        </aside>
      </section>

      <section className="lexen-document-lab">
        <div className="lexen-document-copy">
          <p className="lexen-kicker">EDITABLE CHILD MANIFEST</p>
          <h2>Load. Edit. Save. Keep the unknowns.</h2>
          <p>The carrier round-trips the complete JSON document. Known fields drive the scene; extension fields remain intact instead of disappearing behind a preset button.</p>
          <div className="lexen-document-actions">
            <label className="lexen-file">LOAD JSON<input type="file" accept="application/json,.json" onChange={loadFile}/></label>
            <button type="button" onClick={applyEdits}>APPLY EDITS</button>
            <button type="button" onClick={saveDocument}>SAVE JSON</button>
            <button type="button" onClick={restoreSource}>RESTORE SOURCE</button>
          </div>
          <output>{status}</output>
        </div>
        <textarea aria-label="Editable scene document JSON" value={raw} onChange={(event) => setRaw(event.target.value)} spellCheck={false}/>
      </section>

      <footer className="lexen-footer">
        <span>●</span> SOURCE CANON GOVERNING · TAKE 8 ACCEPTED · MOTION DUNGEON ARTISTIC REVIEW PENDING
      </footer>
    </main>
  );
}
