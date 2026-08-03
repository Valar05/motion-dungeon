"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";

const DURATION = 6;
const FPS = 30;

type Preset = "trench" | "signal" | "ember";

const PRESETS: Record<Preset, {name: string; note: string; color: string; accent: string}> = {
  trench: {name: "Trench Kata", note: "mud / impact / extraction", color: "#ff6a32", accent: "#ffd29a"},
  signal: {name: "Signal Bloom", note: "cold pulse / clean loop", color: "#70a7ff", accent: "#c8f2ff"},
  ember: {name: "Saint Mendel", note: "spore / heat / revelation", color: "#d4ff56", accent: "#fff1a8"},
};

function easeInOut(t: number) {
  return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function phase(time: number, start: number, end: number) {
  return Math.min(1, Math.max(0, (time - start) / (end - start)));
}

function fmt(time: number) {
  return `${Math.floor(time / 60).toString().padStart(2, "0")}:${Math.floor(time % 60).toString().padStart(2, "0")}:${Math.floor((time % 1) * FPS).toString().padStart(2, "0")}`;
}

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderAtRef = useRef<(time: number) => void>(() => {});
  const outputSizeRef = useRef<(width?: number, height?: number) => void>(() => {});
  const timeRef = useRef(0);
  const playingRef = useRef(false);
  const exportingRef = useRef(false);
  const lastRef = useRef(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [preset, setPreset] = useState<Preset>("trench");
  const [intensity, setIntensity] = useState(78);
  const [speed, setSpeed] = useState(100);
  const [scanlines, setScanlines] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Live scene · no baked footage");
  const valuesRef = useRef({preset, intensity, speed, scanlines});

  useEffect(() => {
    valuesRef.current = {preset, intensity, speed, scanlines};
  }, [preset, intensity, speed, scanlines]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    const raw = window.location.hash.slice(1);
    if (!raw) return;
    try {
      const shared = JSON.parse(atob(raw));
      queueMicrotask(() => {
        if (shared.preset in PRESETS) setPreset(shared.preset);
        if (Number.isFinite(shared.intensity)) setIntensity(Math.min(100, Math.max(0, shared.intensity)));
        if (Number.isFinite(shared.speed)) setSpeed(Math.min(200, Math.max(25, shared.speed)));
        if (typeof shared.scanlines === "boolean") setScanlines(shared.scanlines);
        setStatus("Shared scene loaded");
      });
    } catch { /* A malformed fragment should not break the studio. */ }
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let cleanup = () => {};

    void (async () => {
      // Three.js creates a LoadingManager at module evaluation time. Loading it
      // only in the browser keeps that work out of Cloudflare Worker startup.
      const THREE = await import("three");
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({antialias: true, alpha: false, preserveDrawingBuffer: true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(mount.clientWidth, mount.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    canvasRef.current = renderer.domElement;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#050507");
    scene.fog = new THREE.FogExp2("#050507", .085);
    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, .1, 100);
    camera.position.set(0, .2, 7);

    const uniforms = {
      uTime: {value: 0},
      uIntensity: {value: .78},
      uColor: {value: new THREE.Color(PRESETS.trench.color)},
      uAccent: {value: new THREE.Color(PRESETS.trench.accent)},
      uImpact: {value: 0},
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      side: THREE.DoubleSide,
      vertexShader: `
        uniform float uTime; uniform float uIntensity; uniform float uImpact;
        varying vec3 vNormal; varying vec3 vPos;
        void main(){
          vNormal = normalize(normalMatrix * normal);
          vec3 p = position;
          float wave = sin(p.y * 8.0 + uTime * 4.0) * .055 * uIntensity;
          p += normal * (wave + uImpact * .08 * sin(p.x * 12.0));
          vPos = p;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
        }`,
      fragmentShader: `
        uniform float uTime; uniform float uIntensity; uniform vec3 uColor; uniform vec3 uAccent; uniform float uImpact;
        varying vec3 vNormal; varying vec3 vPos;
        void main(){
          float rim = pow(1.0 - abs(vNormal.z), 2.2);
          float bands = smoothstep(.18, .95, sin(vPos.y * 12.0 - uTime * 3.0) * .5 + .5);
          vec3 col = mix(uColor * .12, uColor, rim) + uAccent * bands * (.14 + uImpact * .7);
          col += uColor * pow(rim, 5.0) * uIntensity * 2.1;
          gl_FragColor = vec4(col, .93);
        }`,
    });
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.35, .34, 180, 24, 2, 3), material);
    scene.add(knot);

    const ringMaterial = new THREE.MeshBasicMaterial({color: PRESETS.trench.color, transparent: true, opacity: .2, blending: THREE.AdditiveBlending});
    const rings = Array.from({length: 5}, (_, index) => {
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(2.2 + index * .28, .008, 4, 128), ringMaterial.clone());
      mesh.rotation.x = Math.PI / 2;
      scene.add(mesh);
      return mesh;
    });

    const count = 900;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 2.2 + Math.random() * 5;
      const a = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = (Math.random() - .5) * 5;
      positions[i * 3 + 2] = Math.sin(a) * r - 1.5;
    }
    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particlesMaterial = new THREE.PointsMaterial({color: PRESETS.trench.accent, size: .025, transparent: true, opacity: .65, blending: THREE.AdditiveBlending, depthWrite: false});
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    const renderAt = (rawTime: number) => {
      const options = valuesRef.current;
      const t = rawTime * options.speed / 100;
      const active = PRESETS[options.preset];
      const catchT = easeInOut(phase(rawTime, 1.55, 2.25));
      const driveT = easeInOut(phase(rawTime, 2.25, 3.55));
      const brakeT = 1 - easeInOut(phase(rawTime, 3.55, 4.35));
      const impact = Math.sin(Math.PI * phase(rawTime, 2.65, 3.12)) * (rawTime > 2.65 && rawTime < 3.12 ? 1 : 0);
      uniforms.uTime.value = t;
      uniforms.uIntensity.value = options.intensity / 100;
      uniforms.uColor.value.set(active.color);
      uniforms.uAccent.value.set(active.accent);
      uniforms.uImpact.value = impact;
      ringMaterial.color.set(active.color);
      particlesMaterial.color.set(active.accent);
      knot.rotation.x = t * .18 + catchT * .45;
      knot.rotation.y = t * .34 + driveT * 1.1;
      knot.scale.setScalar(.76 + catchT * .18 + driveT * .28 * brakeT + impact * .15);
      particles.rotation.y = -t * .045;
      particles.position.z = Math.sin(t * .3) * .3;
      rings.forEach((ring, index) => {
        const pulse = (rawTime * .55 + index * .18) % 1;
        const size = .55 + pulse * .8 + impact * .18;
        ring.scale.setScalar(size);
        ring.rotation.z = t * (.03 + index * .006);
        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.color.set(active.color);
        mat.opacity = (1 - pulse) * (.08 + options.intensity / 450) + impact * .25;
      });
      camera.position.x = Math.sin(t * .22) * .42 + impact * .12;
      camera.position.y = .15 + Math.cos(t * .27) * .18;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    renderAtRef.current = renderAt;

    const resize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.setSize(mount.clientWidth, mount.clientHeight, false);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
    };
    outputSizeRef.current = (width, height) => {
      if (width && height) {
        renderer.setPixelRatio(1);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      } else resize();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    let frame = 0;
    const animate = (now: number) => {
      if (!lastRef.current) lastRef.current = now;
      const dt = Math.min((now - lastRef.current) / 1000, .05);
      lastRef.current = now;
      if (playingRef.current && !exportingRef.current) {
        timeRef.current = (timeRef.current + dt) % DURATION;
        setTime(timeRef.current);
      }
      renderAt(timeRef.current);
      frame = requestAnimationFrame(animate);
    };
      frame = requestAnimationFrame(animate);
      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        renderer.dispose();
        material.dispose();
        particlesGeometry.dispose();
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
        canvasRef.current = null;
      };
    })().catch(error => {
      if (!disposed) setStatus(error instanceof Error ? error.message : "WebGL scene failed to start");
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Space" && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        setPlaying(value => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const seek = (next: number) => {
    timeRef.current = next;
    setTime(next);
    renderAtRef.current(next);
  };

  const shareUrl = useCallback(() => {
    const payload = btoa(JSON.stringify({preset, intensity, speed, scanlines}));
    return `${window.location.origin}${window.location.pathname}#${payload}`;
  }, [preset, intensity, speed, scanlines]);

  const copyScene = async () => {
    await navigator.clipboard.writeText(shareUrl());
    setStatus("Scene link copied");
  };

  const shareScene = async () => {
    const url = shareUrl();
    if (navigator.share) await navigator.share({title: `Motion Dungeon · ${PRESETS[preset].name}`, text: "Editable procedural motion scene", url});
    else await copyScene();
  };

  const exportMp4 = async () => {
    const canvas = canvasRef.current;
    if (!canvas || exporting) return;
    if (!("VideoEncoder" in window)) {
      setStatus("This browser cannot encode MP4 locally. Use current Chrome or Edge.");
      return;
    }
    setExporting(true);
    exportingRef.current = true;
    setPlaying(false);
    setProgress(0);
    setStatus("Rendering MP4 on this device…");
    const {ArrayBufferTarget, Muxer} = await import("mp4-muxer");
    const width = 1280, height = 720;
    const target = new ArrayBufferTarget();
    const muxer = new Muxer({target, video: {codec: "avc", width, height, frameRate: FPS}, fastStart: "in-memory"});
    let failed = "";
    const config: VideoEncoderConfig = {codec: "avc1.42001f", width, height, bitrate: 6_000_000, framerate: FPS, hardwareAcceleration: "prefer-hardware", latencyMode: "quality"};
    try {
      const support = await VideoEncoder.isConfigSupported(config);
      if (!support.supported) throw new Error("H.264 encoding is unavailable in this browser");
      const encoder = new VideoEncoder({output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: error => { failed = error.message; }});
      encoder.configure(config);
      outputSizeRef.current(width, height);
      for (let frame = 0; frame < DURATION * FPS; frame++) {
        const frameTime = frame / FPS;
        renderAtRef.current(frameTime);
        const videoFrame = new VideoFrame(canvas, {timestamp: Math.round(frameTime * 1_000_000), duration: Math.round(1_000_000 / FPS)});
        encoder.encode(videoFrame, {keyFrame: frame % FPS === 0});
        videoFrame.close();
        if (frame % 8 === 0) {
          setProgress(Math.round(frame / (DURATION * FPS) * 100));
          await new Promise(resolve => requestAnimationFrame(resolve));
        }
      }
      await encoder.flush();
      encoder.close();
      if (failed) throw new Error(failed);
      muxer.finalize();
      const blob = new Blob([target.buffer], {type: "video/mp4"});
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${PRESETS[preset].name.toLowerCase().replaceAll(" ", "-")}.mp4`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setStatus(`MP4 saved · ${(blob.size / 1_048_576).toFixed(1)} MB`);
      setProgress(100);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "MP4 export failed");
    } finally {
      outputSizeRef.current();
      setExporting(false);
      exportingRef.current = false;
      seek(0);
    }
  };

  const ticks = useMemo(() => ["LOAD", "SLIDE", "CATCH", "DRIVE", "BRAKE", "EXTRACT"], []);

  return (
    <main className="studio-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">MD</span>
          <div><h1>Motion Dungeon</h1><p>the useful machinery Flash kept downstairs</p></div>
        </div>
        <div className="header-actions">
          <button className="button ghost" onClick={copyScene}>Copy scene</button>
          <button className="button ghost" onClick={shareScene}>Share</button>
          <button className="button primary" onClick={exportMp4} disabled={exporting}>{exporting ? `${progress}%` : "Render MP4"}</button>
        </div>
      </header>

      <section className="workspace" aria-label="Motion editor">
        <aside className="rail presets" aria-label="Scene presets">
          <div className="rail-heading"><span>Scenes</span><button aria-label="Create scene">+</button></div>
          {(Object.keys(PRESETS) as Preset[]).map(key => (
            <button key={key} className={`preset ${preset === key ? "active" : ""}`} onClick={() => setPreset(key)}>
              <span className="preset-orb" style={{"--orb": PRESETS[key].color} as React.CSSProperties}/>
              <span><strong>{PRESETS[key].name}</strong><small>{PRESETS[key].note}</small></span>
            </button>
          ))}
          <div className="stack-label">STACK</div>
          {["THREE / geometry", "GLSL / surface", "PROC / sparks", "TWEEN / camera"].map((label, i) => <div className="layer" key={label}><span>{i + 1}</span>{label}<i/></div>)}
        </aside>

        <section className="stage-column">
          <div className={`stage ${scanlines ? "scanlines" : ""}`} ref={mountRef}>
            <div className="safe-frame" aria-hidden="true"/>
            <div className="stage-chip">LIVE · WEBGL</div>
            <div className="stage-title"><span>PRESET 01</span><strong>{PRESETS[preset].name}</strong></div>
            <div className="resolution">1280 × 720 / 30</div>
          </div>
          <div className="transport">
            <button className="play" onClick={() => setPlaying(value => !value)} aria-label={playing ? "Pause" : "Play"}>{playing ? "Ⅱ" : "▶"}</button>
            <output>{fmt(time)}</output>
            <input aria-label="Timeline position" type="range" min="0" max={DURATION} step={1 / FPS} value={time} onChange={event => seek(Number(event.target.value))}/>
            <output>{fmt(DURATION)}</output>
            <button onClick={() => seek(0)} aria-label="Return to start">↤</button>
          </div>
          <div className="timeline" aria-label="Timeline tracks">
            <div className="time-ruler">{ticks.map((tick, i) => <span key={tick} style={{left: `${i * 20}%`}}><b>{i}s</b>{tick}</span>)}</div>
            <div className="track"><label>Geometry</label><div className="track-line"><i className="clip geo">Knot deformation</i><i className="key k1"/><i className="key k2"/></div></div>
            <div className="track"><label>Shader</label><div className="track-line"><i className="clip shader">Rim + impact pulse</i><i className="key k3"/></div></div>
            <div className="track"><label>Camera</label><div className="track-line"><i className="clip camera">Orbit / drive / brake</i><i className="key k4"/><i className="key k5"/></div></div>
            <div className="playhead" style={{left: `calc(108px + (100% - 108px) * ${time / DURATION})`}}/>
          </div>
        </section>

        <aside className="rail inspector" aria-label="Scene inspector">
          <div className="rail-heading"><span>Inspector</span><em>01</em></div>
          <div className="node-title"><span style={{background: PRESETS[preset].color}}/>Master signal</div>
          <label className="control"><span>Intensity <output>{intensity}%</output></span><input type="range" min="0" max="100" value={intensity} onChange={e => setIntensity(Number(e.target.value))}/></label>
          <label className="control"><span>Time scale <output>{(speed / 100).toFixed(2)}×</output></span><input type="range" min="25" max="200" value={speed} onChange={e => setSpeed(Number(e.target.value))}/></label>
          <label className="toggle"><span><strong>Scanline pass</strong><small>procedural overlay</small></span><input type="checkbox" checked={scanlines} onChange={e => setScanlines(e.target.checked)}/><i/></label>
          <div className="shader-card"><span>FRAGMENT</span><code>rim = pow(1.0 − N·V, 2.2)<br/>color += impact × accent<br/>glow *= intensity</code></div>
          <div className="render-info"><span>LOCAL OUTPUT</span><strong>MP4 · H.264</strong><small>No upload. No render farm.<br/>The browser encodes it here.</small></div>
        </aside>
      </section>
      <footer><span className="status-dot"/>{status}<kbd>SPACE</kbd><span>play / pause</span></footer>
    </main>
  );
}
