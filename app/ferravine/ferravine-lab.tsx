"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import Link from "next/link";

const SOURCE = "/specimens/ferravine-layer-peel/Ferravine_Layer_Peel_Master_v1.png";
const DURATION = 10;
const FPS = 30;

const LAYERS = [
  {id: "shell", name: "Living armor", short: "SHELL", top: 0, bottom: 37, closedShift: 35, color: "#e5d7c5", detail: "Scarred silver body plates and peeled exterior panels."},
  {id: "fascia", name: "Tendon chassis", short: "FASCIA", top: 25, bottom: 57, closedShift: 16, color: "#cb4b36", detail: "Load-bearing red tendon architecture beneath the body."},
  {id: "nerve", name: "Nerve lattice", short: "NERVE", top: 44, bottom: 74, closedShift: 0, color: "#53e6ef", detail: "Cyan signal mesh spanning the vehicle-shaped organism."},
  {id: "frame", name: "Highlander skeleton", short: "FRAME", top: 61, bottom: 100, closedShift: -21, color: "#bb9a73", detail: "Seats, wheels, radiator, frame, and mechanical organs."},
] as const;

const CUES = [
  {time: 0, label: "SKIN", detail: "Ferravine holds the road-facing body."},
  {time: 1.1, label: "UNFASTEN", detail: "The armor begins to clear its anchors."},
  {time: 2.1, label: "TENDON", detail: "The load-bearing fascia takes the frame."},
  {time: 3.2, label: "SIGNAL", detail: "The nerve mesh becomes legible."},
  {time: 4.3, label: "FRAME", detail: "The Highlander skeleton keeps custody of the shape."},
  {time: 5.2, label: "VIVISECTION", detail: "Four systems remain visible without pretending to be alpha plates."},
  {time: 7.1, label: "REASSEMBLE", detail: "The strata return in reverse load order."},
] as const;

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function ease(value: number) {
  const t = clamp(value);
  return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function fmt(time: number) {
  const seconds = Math.floor(time).toString().padStart(2, "0");
  const frames = Math.floor((time % 1) * FPS).toString().padStart(2, "0");
  return `00:${seconds}:${frames}`;
}

function peelAt(time: number) {
  if (time < 1) return 0;
  if (time < 5) return ease((time - 1) / 4);
  if (time < 7) return 1;
  return 1 - ease((time - 7) / 3);
}

export default function FerravineLab() {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [spread, setSpread] = useState(100);
  const [pulse, setPulse] = useState(true);
  const [labels, setLabels] = useState(true);
  const [inspect, setInspect] = useState(false);
  const [visible, setVisible] = useState<Record<string, boolean>>(() => Object.fromEntries(LAYERS.map(layer => [layer.id, true])));
  const frameRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  const peel = peelAt(time) * spread / 100;
  const cue = useMemo(() => [...CUES].reverse().find(item => time >= item.time) ?? CUES[0], [time]);

  const stop = useCallback(() => {
    setPlaying(false);
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    lastRef.current = null;
  }, []);

  useEffect(() => {
    if (!playing) return;
    const tick = (now: number) => {
      const previous = lastRef.current ?? now;
      lastRef.current = now;
      setTime(current => (current + Math.min((now - previous) / 1000, .08)) % DURATION);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      lastRef.current = null;
    };
  }, [playing]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      setPlaying(value => !value);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) await navigator.share({title: "Ferravine Vivisection · Motion Dungeon", text: "Shell, tendon, nerve, and Highlander frame.", url});
    else await navigator.clipboard.writeText(url);
  };

  const toggleLayer = (id: string) => setVisible(current => ({...current, [id]: !current[id]}));

  return (
    <main className="ferravine-shell">
      <header className="ferravine-topbar">
        <Link className="ferravine-brand" href="/" aria-label="Return to Motion Dungeon">
          <span aria-hidden="true">MD</span>
          <div><strong>Motion Dungeon</strong><small>FERRAVINE / VIVISECTION 01</small></div>
        </Link>
        <div className="ferravine-actions">
          <button onClick={() => void share()}>Share scene</button>
          <a href={SOURCE} download>Source PNG</a>
        </div>
      </header>

      <section className="ferravine-workspace" aria-label="Ferravine layer-peel motion editor">
        <aside className="ferravine-rail ferravine-stack" aria-label="Layer stack">
          <div className="ferravine-rail-title"><span>ANATOMY</span><em>4 BANDS</em></div>
          {LAYERS.map((layer, index) => (
            <button key={layer.id} className={visible[layer.id] ? "active" : ""} onClick={() => toggleLayer(layer.id)} aria-pressed={visible[layer.id]}>
              <span className="layer-index">0{index + 1}</span>
              <i style={{background: layer.color}}/>
              <span><strong>{layer.name}</strong><small>{layer.short}</small></span>
              <b>{visible[layer.id] ? "●" : "○"}</b>
            </button>
          ))}
          <div className="source-lock">
            <span>SOURCE LOCK</span>
            <strong>D286B050</strong>
            <small>1536 × 1024 · candidate master</small>
          </div>
        </aside>

        <section className="ferravine-stage-column">
          <div className={`ferravine-stage ${pulse ? "pulse" : ""} ${inspect ? "inspect" : ""}`} role="img" aria-label="Ferravine, a regular 2024 Toyota Highlander-scale Fleshpunk vehicle candidate, peels from scarred exterior armor through red tendon chassis and cyan nerve lattice to its mechanical frame.">
            <div className="ferravine-grid" aria-hidden="true"/>
            {inspect ? (
              // eslint-disable-next-line @next/next/no-img-element -- exact candidate source inspection is the feature.
              <img className="master-inspect" src={SOURCE} alt=""/>
            ) : LAYERS.map((layer, index) => {
              const revealStart = index === 0 ? 0 : .08 + index * .16;
              const opacity = index === 0 ? 1 : clamp((peel - revealStart) / .25);
              const shift = layer.closedShift * (1 - peel);
              return visible[layer.id] && (
                <div
                  className={`anatomy-layer anatomy-${layer.id}`}
                  key={layer.id}
                  style={{
                    clipPath: `inset(${layer.top}% 0 ${100 - layer.bottom}% 0)`,
                    opacity,
                    transform: `translate3d(0, ${shift}%, 0)`,
                    zIndex: 10 + index,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- repeated exact source bands form the editable composition. */}
                  <img src={SOURCE} alt="" draggable={false}/>
                  {labels && <span className="anatomy-label" style={{top: `${(layer.top + layer.bottom) / 2}%`, color: layer.color}}>{layer.short}<b>0{index + 1}</b></span>}
                </div>
              );
            })}
            <div className="ferravine-readout">
              <span>REGULAR HIGHLANDER · CANDIDATE</span>
              <strong>{inspect ? "SOURCE MASTER" : cue.label}</strong>
              <small>{inspect ? "The exact generated plate, before composition controls." : cue.detail}</small>
            </div>
            <div className="ferravine-meter" aria-hidden="true"><i style={{height: `${Math.max(4, peel * 100)}%`}}/><span>PEEL<br/>{Math.round(peel * 100)}%</span></div>
          </div>

          <div className="ferravine-transport">
            <button className="ferravine-play" onClick={() => setPlaying(value => !value)} aria-label={playing ? "Pause vivisection" : "Play vivisection"}>{playing ? "Ⅱ" : "▶"}</button>
            <output>{fmt(time)}</output>
            <input aria-label="Vivisection timeline position" type="range" min="0" max={DURATION} step={1 / FPS} value={time} onChange={event => {stop(); setTime(Number(event.target.value));}}/>
            <output>{fmt(DURATION)}</output>
            <button onClick={() => {stop(); setTime(0);}} aria-label="Return to first frame">↤</button>
          </div>

          <div className="ferravine-timeline" aria-label="Ferravine timeline tracks">
            <div className="ferravine-ruler">{CUES.slice(0, 6).map(cueItem => <span key={cueItem.label} style={{left: `${cueItem.time / DURATION * 100}%`}}><b>{cueItem.time.toFixed(1)}s</b>{cueItem.label}</span>)}</div>
            {LAYERS.map((layer, index) => <div className="ferravine-track" key={layer.id}><label>{layer.short}</label><div><i className={`ferravine-clip clip-${layer.id}`} style={{left: `${index * 6}%`, width: `${90 - index * 5}%`}}>{layer.name}</i><b style={{left: `${11 + index * 10}%`}}/></div></div>)}
            <div className="ferravine-playhead" style={{left: `calc(84px + (100% - 84px) * ${time / DURATION})`}}/>
          </div>
        </section>

        <aside className="ferravine-rail ferravine-inspector" aria-label="Ferravine scene controls">
          <div className="ferravine-rail-title"><span>INSPECTOR</span><em>FV</em></div>
          <div className="ferravine-node"><i/>LAYER PEEL MASTER</div>
          <label className="ferravine-control"><span>Peel spread <output>{spread}%</output></span><input type="range" min="0" max="140" value={spread} onChange={event => setSpread(Number(event.target.value))}/></label>
          <label className="ferravine-toggle"><span><strong>Nerve pulse</strong><small>signal layer only</small></span><input type="checkbox" checked={pulse} onChange={event => setPulse(event.target.checked)}/><i/></label>
          <label className="ferravine-toggle"><span><strong>Layer labels</strong><small>production overlay</small></span><input type="checkbox" checked={labels} onChange={event => setLabels(event.target.checked)}/><i/></label>
          <label className="ferravine-toggle"><span><strong>Inspect master</strong><small>bypass composition</small></span><input type="checkbox" checked={inspect} onChange={event => setInspect(event.target.checked)}/><i/></label>
          <div className="ferravine-truth">
            <span>TRUTH LOCK</span>
            <p>The four bands are time-addressable crops from one generated master. They are not claimed as transparent alpha plates or accepted vehicle canon.</p>
          </div>
          <div className="ferravine-description">
            <span>ACCESSIBILITY</span>
            <p>{LAYERS.map(layer => layer.detail).join(" ")}</p>
          </div>
        </aside>
      </section>

      <footer className="ferravine-footer"><span/><strong>{playing ? "PLAYING" : "READY"}</strong> · {cue.label} · candidate scene <kbd>SPACE</kbd></footer>
    </main>
  );
}
