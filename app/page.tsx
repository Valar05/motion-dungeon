"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";

const FPS = 30;
const BEARD_SLAP_PERFORMANCE_DURATION = 7.2;
const BEARD_SLAP_DURATION = 8.9;
const BEARD_SLAP_VOICE_PATH = "/specimens/randi-adam-beard-slap/randi-adam-beard-slap-gemini-v1.wav";
const ADAM_DURATION = 8;
const GIF_DELAYS = [1.7, 1.35, 1.05, .12, .12, .16, .26, .17, .17, .17, 1.35, 1.45, 1.45, 1.45, 1.45, 1.4, 1.7, 1.65, 1.55, 1.75, 1.7, 1.75, 1.8, 1.8, 2.1, 1.45, 1.9, 2.1];
const GIF_STARTS = GIF_DELAYS.map((_, index) => GIF_DELAYS.slice(0, index).reduce((sum, value) => sum + value, 0));
const COURTSHIP_LINE = "She said yes. Adam will ask instead of narrating. One step at a time. Complete readback.";

type Preset = "adam" | "beardslap" | "courtship" | "trench" | "signal" | "ember";
type MemeAspect = "landscape" | "square" | "portrait";
type MemeStyle = "impact" | "subtitle" | "poster";

const PRESETS: Record<Preset, {name: string; note: string; color: string; accent: string; duration: number}> = {
  adam: {name: "A’Damn", note: "coil / fork / drag / settle", color: "#7d1726", accent: "#8d8176", duration: ADAM_DURATION},
  beardslap: {name: "Randi vs Adam", note: "read / load / slap / return", color: "#ff3f75", accent: "#ffd66b", duration: BEARD_SLAP_DURATION},
  courtship: {name: "Complete Readback", note: "gif / worley / foley / voice", color: "#f0b934", accent: "#fff0bb", duration: 35.07},
  trench: {name: "Trench Kata", note: "mud / impact / extraction", color: "#ff6a32", accent: "#ffd29a", duration: 6},
  signal: {name: "Signal Bloom", note: "cold pulse / clean loop", color: "#70a7ff", accent: "#c8f2ff", duration: 6},
  ember: {name: "Saint Mendel", note: "spore / heat / revelation", color: "#d4ff56", accent: "#fff1a8", duration: 6},
};

const ADAM_CUES = [
  {time: 0, label: "WAKE", detail: "Eleven load-bearing noodles inventory the mud."},
  {time: 1.2, label: "COIL", detail: "Tendon gathers beneath the ration-can cuirass."},
  {time: 2.45, label: "LOAD", detail: "The bayonet-fork chooses a direction."},
  {time: 3.3, label: "LUNGE", detail: "A’Damn spends the stored geometry."},
  {time: 4.15, label: "DRAG", detail: "The trench surrenders one imaginary dinner."},
  {time: 5.8, label: "SETTLE", detail: "Every grounded limb resumes custody."},
] as const;

const BEARD_SLAP_CUES = [
  {time: 0, label: "READ", detail: "Randi acquires the beard."},
  {time: 1.35, label: "LOAD", detail: "The room signs the waiver."},
  {time: 2.72, label: "SLAP", detail: "Beard custody changes hands."},
  {time: 3.12, label: "PAY", detail: "Adam receives the weather."},
  {time: 4.45, label: "RETURN", detail: "The beard remembers its post."},
] as const;

const BEARD_SLAP_CAPTIONS = [
  {start: .35, end: 2.67, speaker: "Randi", text: "Bless his heart."},
  {start: 4.37, end: 8.45, speaker: "Adam", text: "The beard remembers its post."},
] as const;

function easeInOut(t: number) {
  return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function phase(time: number, start: number, end: number) {
  return Math.min(1, Math.max(0, (time - start) / (end - start)));
}

function fmt(time: number) {
  return `${Math.floor(time / 60).toString().padStart(2, "0")}:${Math.floor(time % 60).toString().padStart(2, "0")}:${Math.floor((time % 1) * FPS).toString().padStart(2, "0")}`;
}

function seededNoise(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = Math.imul(value ^ (value >>> 15), 1 | value);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

type AudioWorld = AudioContext | OfflineAudioContext;

function scheduleCourtshipAudio(context: AudioWorld, destination: AudioNode, offset = 0) {
  const sources: AudioScheduledSourceNode[] = [];
  const origin = context.currentTime - offset;
  const at = (seconds: number) => origin + seconds;

  const tone = (seconds: number, frequencies: number[], duration: number, level: number) => {
    if (seconds + duration < offset) return;
    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      const start = Math.max(context.currentTime, at(seconds));
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(level / (index + 1), start + .04);
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
      oscillator.connect(gain).connect(destination);
      oscillator.start(start);
      oscillator.stop(start + duration + .03);
      sources.push(oscillator);
    });
  };

  const noise = (seconds: number, duration: number, seed: number, frequency: number, level: number) => {
    if (seconds + duration < offset) return;
    const start = Math.max(context.currentTime, at(seconds));
    const length = Math.max(1, Math.ceil(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    const random = seededNoise(seed);
    for (let index = 0; index < length; index++) {
      const envelope = Math.pow(1 - index / length, 1.8);
      data[index] = (random() * 2 - 1) * envelope;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 1.2;
    gain.gain.value = level;
    source.connect(filter).connect(gain).connect(destination);
    source.start(start);
    sources.push(source);
  };

  // Designed Foley: every event is finite and tied to an authored picture beat.
  noise(.15, .65, 101, 420, .045);                 // paper / tragic file opens
  tone(3.0, [96, 192], .25, .07);                 // record corrected
  noise(3.08, .18, 202, 2600, .035);              // relay click
  tone(4.02, [146.83, 220, 440], 1.1, .08);       // YES: open harmonic vowel
  noise(6.4, .7, 303, 900, .025);                 // cellular shimmer
  tone(8.15, [329.63, 493.88, 659.25], .65, .045);// laughter release
  noise(10.45, .36, 404, 1700, .03);              // terms enter
  tone(14.8, [82.41, 164.81], .42, .06);          // boundary lands
  noise(17.4, 1.15, 505, 310, .035);              // metaphorical door moves
  tone(20.3, [196, 293.66, 392], .9, .055);       // threshold chorus
  noise(24.1, .8, 606, 1200, .022);               // limerick paper shuffle
  tone(29.05, [110, 220, 330, 440], 1.25, .075);  // answer: warm formant stack
  noise(31.0, .22, 707, 2400, .035);              // cable-clause relay
  tone(33.0, [130.81, 196, 261.63], 1.5, .045);   // next answer settles

  return sources;
}

function scheduleBeardSlapAudio(context: AudioWorld, destination: AudioNode, offset = 0) {
  const sources: AudioScheduledSourceNode[] = [];
  const origin = context.currentTime - offset;
  const at = (seconds: number) => origin + seconds;

  const tone = (seconds: number, frequency: number, duration: number, level: number, type: OscillatorType = "triangle") => {
    if (seconds + duration < offset) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = Math.max(context.currentTime, at(seconds));
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(28, frequency * .48), start + duration);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain).connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration + .02);
    sources.push(oscillator);
  };

  const noise = (seconds: number, duration: number, seed: number, frequency: number, level: number, q = .8) => {
    if (seconds + duration < offset) return;
    const start = Math.max(context.currentTime, at(seconds));
    const length = Math.max(1, Math.ceil(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    const random = seededNoise(seed);
    for (let index = 0; index < length; index++) {
      const envelope = Math.pow(1 - index / length, 2.15);
      data[index] = (random() * 2 - 1) * envelope;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = q;
    gain.gain.value = level;
    source.connect(filter).connect(gain).connect(destination);
    source.start(start);
    sources.push(source);
  };

  noise(1.38, .34, 0xB34D, 520, .045);       // sleeve and shoulder load
  noise(2.52, .56, 0x51A9, 1120, .075, .6); // accelerating hand
  noise(3.02, .12, 0xFACE, 1950, .24, .45); // palm crack
  noise(3.02, .28, 0xBEEF, 185, .2, .7);    // cheek and beard body
  tone(3.015, 92, .42, .18);                // displaced mass
  tone(3.04, 410, .32, .065, "square");     // absurd judgment bell
  noise(3.16, .7, 0xC0DE, 720, .07, 2.2);   // beard-bristle recoil
  tone(3.42, 66, 1.05, .08);                // dungeon tail
  noise(4.38, .9, 0xADA5, 330, .028, 1.4);  // beard settles back into office
  tone(5.02, 146.83, 1.2, .035, "sine");   // return, not reset

  return sources;
}

function scheduleAdamAudio(context: AudioWorld, destination: AudioNode, offset = 0) {
  const sources: AudioScheduledSourceNode[] = [];
  const origin = context.currentTime - offset;
  const at = (seconds: number) => origin + seconds;
  const scrape = (seconds: number, duration: number, seed: number, frequency: number, level: number) => {
    if (seconds + duration < offset) return;
    const start = Math.max(context.currentTime, at(seconds));
    const length = Math.max(1, Math.ceil(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    const random = seededNoise(seed);
    for (let index = 0; index < length; index++) {
      const body = Math.sin(index / context.sampleRate * Math.PI * 2 * (frequency + index / length * 41));
      data[index] = ((random() * 2 - 1) * .7 + body * .3) * Math.sin(Math.PI * index / length);
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer; filter.type = "bandpass"; filter.frequency.value = frequency; filter.Q.value = .7; gain.gain.value = level;
    source.connect(filter).connect(gain).connect(destination); source.start(start); sources.push(source);
  };
  const clank = (seconds: number, frequency: number, level: number) => {
    if (seconds < offset) return;
    const oscillator = context.createOscillator(); const gain = context.createGain(); const start = Math.max(context.currentTime, at(seconds));
    oscillator.type = "triangle"; oscillator.frequency.setValueAtTime(frequency, start); oscillator.frequency.exponentialRampToValueAtTime(frequency * .38, start + .42);
    gain.gain.setValueAtTime(level, start); gain.gain.exponentialRampToValueAtTime(.0001, start + .48);
    oscillator.connect(gain).connect(destination); oscillator.start(start); oscillator.stop(start + .5); sources.push(oscillator);
  };
  scrape(.45, .8, 0xAD01, 260, .038);   // noodles wake against mud
  scrape(1.35, 1.0, 0xAD02, 430, .05); // tendon coil
  clank(2.58, 620, .08);               // ration-can armor loads
  scrape(3.18, .7, 0xAD03, 920, .11);  // fork lunge
  clank(3.47, 1880, .15);              // fork contact
  scrape(4.05, 1.35, 0xAD04, 180, .09);// meal drag
  clank(5.25, 310, .055);              // cuirass settles
  scrape(5.55, 1.25, 0xAD05, 330, .035);// grounded residue
  return sources;
}

async function renderAdamAudio(duration: number) {
  const context = new OfflineAudioContext(2, Math.ceil(duration * 48_000), 48_000);
  const master = context.createGain(); const compressor = context.createDynamicsCompressor();
  master.gain.value = .82; compressor.threshold.value = -18; compressor.ratio.value = 2.6; compressor.attack.value = .008; compressor.release.value = .25;
  master.connect(compressor).connect(context.destination); scheduleAdamAudio(context, master, 0);
  return context.startRendering();
}

async function renderCourtshipAudio(duration: number) {
  const context = new OfflineAudioContext(2, Math.ceil(duration * 48_000), 48_000);
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  master.gain.value = .78;
  compressor.threshold.value = -18;
  compressor.knee.value = 18;
  compressor.ratio.value = 2;
  compressor.attack.value = .01;
  compressor.release.value = .2;
  master.connect(compressor).connect(context.destination);
  scheduleCourtshipAudio(context, master, 0);
  return context.startRendering();
}

async function renderBeardSlapAudio(duration: number, includeFoley: boolean, includeVoice: boolean) {
  const context = new OfflineAudioContext(2, Math.ceil(duration * 48_000), 48_000);
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  master.gain.value = 1;
  compressor.threshold.value = -16;
  compressor.knee.value = 14;
  compressor.ratio.value = 3;
  compressor.attack.value = .004;
  compressor.release.value = .24;
  master.connect(compressor).connect(context.destination);
  if (includeFoley) {
    const foleyBus = context.createGain();
    foleyBus.gain.value = .72;
    foleyBus.connect(master);
    scheduleBeardSlapAudio(context, foleyBus, 0);
  }
  if (includeVoice) {
    const response = await fetch(BEARD_SLAP_VOICE_PATH);
    if (!response.ok) throw new Error("The verified Gemini voice artifact could not be loaded");
    const decoded = await context.decodeAudioData(await response.arrayBuffer());
    const voiceBus = context.createGain();
    voiceBus.gain.value = .96;
    voiceBus.connect(master);
    const source = context.createBufferSource();
    source.buffer = decoded;
    source.connect(voiceBus);
    source.start(0);
  }
  return context.startRendering();
}

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const memeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const memeDialogRef = useRef<HTMLElement | null>(null);
  const renderAtRef = useRef<(time: number) => void>(() => {});
  const outputSizeRef = useRef<(width?: number, height?: number) => void>(() => {});
  const timeRef = useRef(0);
  const durationRef = useRef(PRESETS.beardslap.duration);
  const playingRef = useRef(false);
  const exportingRef = useRef(false);
  const gifReadyRef = useRef(false);
  const beardReadyRef = useRef(false);
  const lastRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scheduledAudioRef = useRef<AudioScheduledSourceNode[]>([]);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [preset, setPreset] = useState<Preset>("adam");
  const [intensity, setIntensity] = useState(64);
  const [speed, setSpeed] = useState(100);
  const [scanlines, setScanlines] = useState(false);
  const [foley, setFoley] = useState(true);
  const [voice, setVoice] = useState(true);
  const [rendererMode, setRendererMode] = useState<"loading" | "webgl" | "fallback">("loading");
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Loading the judgment hand…");
  const [memeOpen, setMemeOpen] = useState(false);
  const [memeSource, setMemeSource] = useState("");
  const [memeSourceName, setMemeSourceName] = useState("Current Dungeon frame");
  const [memeTop, setMemeTop] = useState("BEARD CUSTODY");
  const [memeBottom, setMemeBottom] = useState("HAS CHANGED HANDS");
  const [memeAspect, setMemeAspect] = useState<MemeAspect>("square");
  const [memeStyle, setMemeStyle] = useState<MemeStyle>("impact");
  const [memeSize, setMemeSize] = useState(72);
  const valuesRef = useRef({preset, intensity, speed, scanlines, foley, voice});
  const duration = PRESETS[preset].duration;

  useEffect(() => {
    valuesRef.current = {preset, intensity, speed, scanlines, foley, voice};
    durationRef.current = PRESETS[preset].duration;
  }, [preset, intensity, speed, scanlines, foley, voice]);

  useEffect(() => { playingRef.current = playing; }, [playing]);

  const stopFoley = useCallback(() => {
    scheduledAudioRef.current.forEach(source => { try { source.stop(); } catch { /* already stopped */ } });
    scheduledAudioRef.current = [];
  }, []);

  const startFoley = useCallback(async (offset: number) => {
    stopFoley();
    if (!valuesRef.current.foley || !["adam", "courtship", "beardslap"].includes(valuesRef.current.preset)) return;
    const context = audioContextRef.current ?? new AudioContext({sampleRate: 48_000});
    audioContextRef.current = context;
    await context.resume();
    const master = context.createGain();
    master.gain.value = .72;
    master.connect(context.destination);
    scheduledAudioRef.current = valuesRef.current.preset === "adam"
      ? scheduleAdamAudio(context, master, offset)
      : valuesRef.current.preset === "beardslap"
        ? scheduleBeardSlapAudio(context, master, offset)
        : scheduleCourtshipAudio(context, master, offset);
  }, [stopFoley]);

  const stopVoice = useCallback(() => {
    voiceAudioRef.current?.pause();
  }, []);

  const startVoice = useCallback(async (offset: number) => {
    stopVoice();
    if (!valuesRef.current.voice || valuesRef.current.preset !== "beardslap") return;
    const audio = voiceAudioRef.current ?? new Audio(BEARD_SLAP_VOICE_PATH);
    voiceAudioRef.current = audio;
    Reflect.set(audio, "preload", "auto");
    Reflect.set(audio, "volume", .96);
    Reflect.set(audio, "currentTime", Math.min(Math.max(0, offset), BEARD_SLAP_DURATION - .05));
    try {
      await audio.play();
    } catch {
      setStatus("Gemini voice playback needs one direct press of Play");
    }
  }, [stopVoice]);

  useEffect(() => () => {
    stopFoley();
    stopVoice();
    void audioContextRef.current?.close();
  }, [stopFoley, stopVoice]);

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
        if (typeof shared.foley === "boolean") setFoley(shared.foley);
        if (typeof shared.voice === "boolean") setVoice(shared.voice);
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
      const probe = document.createElement("canvas");
      if (!probe.getContext("webgl2") && !probe.getContext("webgl")) {
        setRendererMode("fallback");
        setStatus("2D source fallback · WebGL unavailable in this browser");
        return;
      }
      const THREE = await import("three");
      if (disposed) return;
      const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.setSize(mount.clientWidth, mount.clientHeight, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      mount.appendChild(renderer.domElement);
      canvasRef.current = renderer.domElement;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050506);
      const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, .1, 100);
      camera.position.set(0, .2, 7);
      const hemisphere = new THREE.HemisphereLight(0xb9b2a7, 0x16090b, 1.15);
      const keyLight = new THREE.DirectionalLight(0xf2d7bd, 2.7);
      keyLight.position.set(-3.5, 5, 4);
      const edgeLight = new THREE.DirectionalLight(0x8b2635, 1.7);
      edgeLight.position.set(4, 1, 2);
      scene.add(hemisphere, keyLight, edgeLight);
      const abstractGroup = new THREE.Group();
      scene.add(abstractGroup);

      const spaghettiGroup = new THREE.Group();
      spaghettiGroup.visible = false;
      spaghettiGroup.position.y = .18;
      scene.add(spaghettiGroup);
      const noodleMaterials = [
        new THREE.MeshStandardMaterial({color:0x7d1726,roughness:.72,metalness:.04}),
        new THREE.MeshStandardMaterial({color:0x4a111b,roughness:.82,metalness:.02}),
        new THREE.MeshStandardMaterial({color:0x241318,roughness:.9,metalness:.01}),
      ];
      const ironMaterial = new THREE.MeshStandardMaterial({color:0x55514b,roughness:.58,metalness:.62});
      const sootMaterial = new THREE.MeshStandardMaterial({color:0x100f10,roughness:.94,metalness:.03});
      const boneMaterial = new THREE.MeshStandardMaterial({color:0xa9977f,roughness:.8,metalness:.02});
      const core = new THREE.Mesh(new THREE.TorusKnotGeometry(.84,.23,168,18,2,5),noodleMaterials[0]);
      core.scale.set(1.35,.86,1.05); core.rotation.x=.42; spaghettiGroup.add(core);
      const armor = new THREE.Mesh(new THREE.CylinderGeometry(.68,.78,.72,12,1,true),ironMaterial);
      armor.rotation.z=Math.PI/2; armor.scale.set(1,.78,1); armor.position.set(0,.26,.03); spaghettiGroup.add(armor);
      const armorBands = [-.3,.3].map(x=>{const band=new THREE.Mesh(new THREE.TorusGeometry(.61,.035,6,20),ironMaterial);band.position.x=x;band.rotation.y=Math.PI/2;band.scale.y=.78;spaghettiGroup.add(band);return band;});
      const sensorNodes = [-1,1].map(side=>{
        const root=new THREE.Group(); root.position.set(side*.48,.76,.54);
        const meat=new THREE.Mesh(new THREE.SphereGeometry(.24,18,12),noodleMaterials[1]);
        const eye=new THREE.Mesh(new THREE.SphereGeometry(.085,14,10),boneMaterial); eye.position.set(side*.035,.04,.218);
        const pupil=new THREE.Mesh(new THREE.SphereGeometry(.037,12,8),sootMaterial); pupil.position.set(side*.04,.04,.292);
        root.add(meat,eye,pupil); spaghettiGroup.add(root); return root;
      });
      const noodleLimbs = Array.from({length:11},(_,index)=>{
        const angle=(index/11)*Math.PI*2;
        const reach=1.62+(index%3)*.18;
        const curve=new THREE.CatmullRomCurve3([
          new THREE.Vector3(Math.cos(angle)*.28,-.08,Math.sin(angle)*.24),
          new THREE.Vector3(Math.cos(angle+.28)*.82,-.36+(index%2)*.12,Math.sin(angle+.28)*.58),
          new THREE.Vector3(Math.cos(angle-.18)*reach,-.88,Math.sin(angle-.18)*reach*.62),
        ]);
        const limb=new THREE.Mesh(new THREE.TubeGeometry(curve,38,.105+(index%3)*.014,9,false),noodleMaterials[index%3]);
        limb.userData.baseRotation=angle; limb.userData.index=index; spaghettiGroup.add(limb); return limb;
      });
      const forkRoot = new THREE.Group(); forkRoot.position.set(1.05,.02,.38); forkRoot.rotation.z=-.5; spaghettiGroup.add(forkRoot);
      const forkHandle = new THREE.Mesh(new THREE.CylinderGeometry(.055,.075,2.25,10),ironMaterial); forkHandle.rotation.z=-Math.PI/2; forkHandle.position.x=.92; forkRoot.add(forkHandle);
      const forkHead = new THREE.Mesh(new THREE.BoxGeometry(.34,.14,.12),ironMaterial); forkHead.position.x=2.03; forkRoot.add(forkHead);
      [-.13,0,.13].forEach(y=>{const tine=new THREE.Mesh(new THREE.CylinderGeometry(.026,.045,.68,8),ironMaterial);tine.rotation.z=-Math.PI/2;tine.position.set(2.34,y,0);forkRoot.add(tine);});
      const ground = new THREE.Mesh(new THREE.CircleGeometry(2.35,64),new THREE.MeshBasicMaterial({color:0x130c0e,transparent:true,opacity:.82,depthWrite:false}));
      ground.rotation.x=-Math.PI/2; ground.position.y=-.91; ground.scale.y=.56; spaghettiGroup.add(ground);

      const uniforms = {
        uTime: {value: 0}, uIntensity: {value: .78},
        uColor: {value: new THREE.Color(PRESETS.trench.color)},
        uAccent: {value: new THREE.Color(PRESETS.trench.accent)}, uImpact: {value: 0},
      };
      const material = new THREE.ShaderMaterial({
        uniforms, transparent: true, side: THREE.DoubleSide,
        vertexShader: `
          uniform float uTime; uniform float uIntensity; uniform float uImpact;
          varying vec3 vNormal; varying vec3 vPos;
          void main(){ vNormal=normalize(normalMatrix*normal); vec3 p=position;
            float wave=sin(p.y*8.0+uTime*4.0)*.055*uIntensity;
            p+=normal*(wave+uImpact*.08*sin(p.x*12.0)); vPos=p;
            gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }`,
        fragmentShader: `
          uniform float uTime; uniform float uIntensity; uniform vec3 uColor; uniform vec3 uAccent; uniform float uImpact;
          varying vec3 vNormal; varying vec3 vPos;
          void main(){ float rim=pow(1.0-abs(vNormal.z),2.2);
            float bands=smoothstep(.18,.95,sin(vPos.y*12.0-uTime*3.0)*.5+.5);
            vec3 col=mix(uColor*.12,uColor,rim)+uAccent*bands*(.14+uImpact*.7);
            col+=uColor*pow(rim,5.0)*uIntensity*2.1; gl_FragColor=vec4(col,.93); }`,
      });
      const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.35, .34, 180, 24, 2, 3), material);
      abstractGroup.add(knot);
      const ringMaterial = new THREE.MeshBasicMaterial({color: PRESETS.trench.color, transparent: true, opacity: .2, blending: THREE.AdditiveBlending});
      const rings = Array.from({length: 5}, (_, index) => {
        const mesh = new THREE.Mesh(new THREE.TorusGeometry(2.2 + index * .28, .008, 4, 128), ringMaterial.clone());
        mesh.rotation.x = Math.PI / 2; abstractGroup.add(mesh); return mesh;
      });
      const positions = new Float32Array(900 * 3);
      const random = seededNoise(0xD00D);
      for (let index = 0; index < 900; index++) {
        const radius = 2.2 + random() * 5; const angle = random() * Math.PI * 2;
        positions[index * 3] = Math.cos(angle) * radius;
        positions[index * 3 + 1] = (random() - .5) * 5;
        positions[index * 3 + 2] = Math.sin(angle) * radius - 1.5;
      }
      const particlesGeometry = new THREE.BufferGeometry();
      particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const particlesMaterial = new THREE.PointsMaterial({color: PRESETS.trench.accent, size: .025, transparent: true, opacity: .65, blending: THREE.AdditiveBlending, depthWrite: false});
      const particles = new THREE.Points(particlesGeometry, particlesMaterial);
      abstractGroup.add(particles);

      const pixel = new Uint8Array([0, 0, 0, 255]);
      const emptyTexture = new THREE.DataTexture(pixel, 1, 1); emptyTexture.needsUpdate = true;
      const courtshipUniforms = {
        uMap: {value: emptyTexture}, uTime: {value: 0}, uProcess: {value: 0},
        uPulse: {value: 0}, uAccent: {value: new THREE.Color(PRESETS.courtship.color)},
      };
      const courtshipMaterial = new THREE.ShaderMaterial({
        uniforms: courtshipUniforms, transparent: false,
        vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `
          uniform sampler2D uMap; uniform float uTime; uniform float uProcess; uniform float uPulse; uniform vec3 uAccent;
          varying vec2 vUv;
          float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
          vec2 hash22(vec2 p){float n=hash21(p);return vec2(n,hash21(p+n+17.17));}
          float valueNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
            return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1)),f.x),f.y);}
          float fbm(vec2 p){float v=0.0,a=.5;for(int i=0;i<4;i++){v+=a*valueNoise(p);p=p*2.03+19.1;a*=.5;}return v;}
          float worley(vec2 p){vec2 i=floor(p),f=fract(p);float d=1.0;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
            vec2 g=vec2(float(x),float(y));vec2 o=hash22(i+g);o=.5+.5*sin(uTime*.55+6.2831*o);d=min(d,length(g+o-f));}return d;}
          void main(){vec2 uv=vUv;float warp=fbm(uv*5.0+uTime*.07);vec2 drift=vec2(warp-.5,fbm(uv.yx*6.0-uTime*.05)-.5);
            uv+=drift*.012*uProcess;vec3 base=texture2D(uMap,clamp(uv,0.001,.999)).rgb;
            float cells=worley(vUv*9.0+vec2(uTime*.06,-uTime*.04));float veins=1.0-smoothstep(.12,.28,cells);
            float grain=hash21(gl_FragCoord.xy+floor(uTime*24.0));float scan=.5+.5*sin(vUv.y*900.0);
            vec3 processed=base+uAccent*veins*(.055+.12*uPulse)*uProcess;
            processed*=1.0+(grain-.5)*.055*uProcess;processed+=scan*.018*uProcess;
            processed.r+=drift.x*.035*uProcess;processed.b-=drift.y*.025*uProcess;
            gl_FragColor=vec4(processed,1.0);}`,
      });
      const courtshipPlane = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 5.0), courtshipMaterial);
      courtshipPlane.visible = false; scene.add(courtshipPlane);
      const gifTextures: Array<InstanceType<typeof THREE.Texture>> = [];

      const beardGroup = new THREE.Group();
      beardGroup.visible = false;
      scene.add(beardGroup);
      const textureLoader = new THREE.TextureLoader();
      const [randiTexture, adamTexture] = await Promise.all([
        textureLoader.loadAsync("/specimens/randi-adam-beard-slap/randi-expression-sheet.png"),
        textureLoader.loadAsync("/specimens/randi-adam-beard-slap/adam-expression-sheet.png"),
      ]);
      [randiTexture, adamTexture].forEach(texture => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
      });

      const portraitVertex = `
        varying vec2 vUv;
        void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
      const portraitFragment = `
        uniform sampler2D uMap; uniform float uCell; uniform float uImpact;
        uniform float uTime; uniform float uRole; uniform vec3 uAccent;
        varying vec2 vUv;
        float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
        void main(){
          float column=mod(uCell,5.0); float row=floor(uCell/5.0); vec2 local=vUv;
          float beardMask=smoothstep(.62,.20,local.y)*uRole;
          float strikeBand=exp(-pow((local.y-.42)*7.0,2.0));
          local.x+=sin(local.y*34.0-uTime*19.0)*.028*uImpact*beardMask;
          local.x-=uImpact*strikeBand*.052*uRole;
          vec2 atlas=vec2((column+clamp(local.x,.004,.996))/5.0,1.0-(row+(1.0-clamp(local.y,.004,.996)))/4.0);
          vec3 base=texture2D(uMap,atlas).rgb;
          float grain=hash21(gl_FragCoord.xy+floor(uTime*30.0));
          float edge=smoothstep(.07,0.0,min(min(vUv.x,1.0-vUv.x),min(vUv.y,1.0-vUv.y)));
          base+=uAccent*(uImpact*strikeBand*.24+edge*.08);
          base*=1.0+(grain-.5)*.035*(.25+uImpact);
          base.r+=uImpact*beardMask*.045; base.b-=uImpact*beardMask*.055;
          gl_FragColor=vec4(base,1.0);
        }`;
      const randiUniforms = {uMap:{value:randiTexture},uCell:{value:2},uImpact:{value:0},uTime:{value:0},uRole:{value:0},uAccent:{value:new THREE.Color("#ff3f75")}};
      const adamUniforms = {uMap:{value:adamTexture},uCell:{value:0},uImpact:{value:0},uTime:{value:0},uRole:{value:1},uAccent:{value:new THREE.Color("#ffd66b")}};
      const randiMaterial = new THREE.ShaderMaterial({uniforms:randiUniforms,vertexShader:portraitVertex,fragmentShader:portraitFragment});
      const adamMaterial = new THREE.ShaderMaterial({uniforms:adamUniforms,vertexShader:portraitVertex,fragmentShader:portraitFragment});
      const portraitGeometry = new THREE.PlaneGeometry(3.05,3.05);
      const randiPortrait = new THREE.Mesh(portraitGeometry,randiMaterial);
      const adamPortrait = new THREE.Mesh(portraitGeometry,adamMaterial);
      randiPortrait.position.set(-1.62,.15,0); adamPortrait.position.set(1.62,.15,0);
      beardGroup.add(randiPortrait,adamPortrait);

      const impactRings = Array.from({length:4},(_,index)=>{
        const ring=new THREE.Mesh(
          new THREE.TorusGeometry(.62+index*.16,.018,5,96),
          new THREE.MeshBasicMaterial({color:index%2?0xff3f75:0xffd66b,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}),
        );
        ring.position.set(.56,.12,.42); ring.rotation.x=Math.PI/2; beardGroup.add(ring); return ring;
      });

      const handMaterial = new THREE.MeshBasicMaterial({color:0xffd08a,transparent:true,opacity:.98});
      const hand = new THREE.Group();
      const palm = new THREE.Mesh(new THREE.SphereGeometry(.48,24,16),handMaterial);
      palm.scale.set(1,.92,.25); hand.add(palm);
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(.23,.36,2.05,18),handMaterial);
      forearm.rotation.z=Math.PI/2; forearm.position.x=-1.23; hand.add(forearm);
      [-.38,-.14,.1,.34].forEach((y,index)=>{
        const finger=new THREE.Mesh(new THREE.CapsuleGeometry(.115,.58+index*.04,6,12),handMaterial);
        finger.position.set(.25,y+.16,.02); finger.rotation.z=-.18+index*.035; hand.add(finger);
      });
      const thumb=new THREE.Mesh(new THREE.CapsuleGeometry(.13,.48,6,12),handMaterial);
      thumb.position.set(-.1,-.46,.03); thumb.rotation.z=.86; hand.add(thumb);
      hand.position.set(-5.4,-.15,.8); hand.rotation.z=-.08; beardGroup.add(hand);

      const labelCanvas=document.createElement("canvas"); labelCanvas.width=1024; labelCanvas.height=220;
      const labelContext=labelCanvas.getContext("2d");
      const labelTexture=new THREE.CanvasTexture(labelCanvas); labelTexture.colorSpace=THREE.SRGBColorSpace;
      const labelSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTexture,transparent:true,depthTest:false}));
      labelSprite.scale.set(5.9,1.27,1); labelSprite.position.set(0,-2.1,1); beardGroup.add(labelSprite);
      let lastCue="";
      const drawBeardCue=(label:string,detail:string)=>{
        if(!labelContext||lastCue===label+detail)return; lastCue=label+detail;
        labelContext.clearRect(0,0,labelCanvas.width,labelCanvas.height);
        labelContext.fillStyle="rgba(4,4,6,.82)";labelContext.fillRect(0,8,labelCanvas.width,190);
        labelContext.fillStyle="#ff3f75";labelContext.fillRect(0,8,12,190);
        labelContext.fillStyle="#fff4d6";labelContext.font="800 72px Arial";labelContext.fillText(label,44,92);
        labelContext.fillStyle="#ffd66b";labelContext.font="600 30px Arial";labelContext.fillText(detail,46,151);
        labelTexture.needsUpdate=true;
      };
      beardReadyRef.current = true;

      const response = await fetch("/specimens/adam-eve-courtship/adam-to-eve-complete-readback.gif");
      const {parseGIF, decompressFrames} = await import("gifuct-js");
      const decodedFrames = decompressFrames(parseGIF(await response.arrayBuffer()), true);
      for (const decoded of decodedFrames.slice(0, GIF_DELAYS.length)) {
        const frameCanvas = document.createElement("canvas");
        frameCanvas.width = decoded.dims.width;
        frameCanvas.height = decoded.dims.height;
        const context = frameCanvas.getContext("2d");
        if (!context) break;
        const pixels = new ImageData(new Uint8ClampedArray(decoded.patch), decoded.dims.width, decoded.dims.height);
        context.putImageData(pixels, 0, 0);
        // ImageBitmap bypasses WebGL's UNPACK_FLIP_Y handling. Flip while the
        // bitmap is created so Three.js receives the same upright orientation
        // as the source GIF instead of a vertically inverted frame.
        const bitmap = await createImageBitmap(frameCanvas, {imageOrientation: "flipY"});
        const texture = new THREE.Texture(bitmap);
        texture.flipY = false;
        texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true;
        texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter;
        gifTextures.push(texture);
      }
      gifReadyRef.current = gifTextures.length === GIF_DELAYS.length;
      if (!disposed) {
        setRendererMode(gifReadyRef.current ? "webgl" : "fallback");
        setStatus(gifReadyRef.current ? "Source locked · 28 frames · foley armed" : "2D source fallback · deterministic decode incomplete");
      }

      const renderAt = (rawTime: number) => {
        const options = valuesRef.current;
        const isAdam = options.preset === "adam";
        const isCourtship = options.preset === "courtship";
        const isBeardSlap = options.preset === "beardslap";
        abstractGroup.visible = !isAdam && !isCourtship && !isBeardSlap;
        spaghettiGroup.visible = isAdam;
        courtshipPlane.visible = isCourtship;
        beardGroup.visible = isBeardSlap;
        if (isAdam) {
          const t=rawTime*options.speed/100;
          const coil=easeInOut(phase(rawTime,1.15,2.45));
          const load=easeInOut(phase(rawTime,2.45,3.28));
          const lunge=easeInOut(phase(rawTime,3.28,3.72));
          const drag=easeInOut(phase(rawTime,3.72,5.18));
          const settle=easeInOut(phase(rawTime,5.18,6.85));
          const contact=Math.sin(Math.PI*phase(rawTime,3.52,4.08))*(rawTime>=3.52&&rawTime<=4.08?1:0);
          const pressure=options.intensity/100;
          spaghettiGroup.position.x=lunge*.72-drag*.48-settle*.24;
          spaghettiGroup.position.y=.18-coil*.12+contact*.035;
          spaghettiGroup.rotation.y=-.18+Math.sin(t*.38)*.06+load*.13-drag*.09;
          core.rotation.x=.42+Math.sin(t*1.2)*.035-coil*.16+contact*.11;
          core.rotation.y=t*.12+load*.3-drag*.18;
          core.scale.set(1.35+coil*.18-contact*.07,.86-coil*.12+contact*.08,1.05+coil*.1);
          armor.rotation.x=Math.sin(t*.62)*.025+contact*.045;
          armorBands.forEach((band,index)=>{band.rotation.z=(index?-.03:.03)*Math.sin(t*.8)+contact*(index?-.08:.08);});
          noodleLimbs.forEach((limb,index)=>{
            const anchor=index%2?-1:1;
            limb.rotation.y=Math.sin(t*1.35+index*.91)*.055*(1-settle*.7)+load*.035*anchor;
            limb.rotation.z=-coil*.075*anchor+lunge*.055*anchor-drag*.038*anchor+settle*.02*anchor;
            const squeeze=1-coil*(.035+(index%3)*.009);
            limb.scale.set(1+lunge*.09-drag*.04,squeeze,1+Math.sin(t*1.7+index)*.018*pressure);
          });
          forkRoot.rotation.z=-.5-load*.38+lunge*.26-drag*.18+settle*.3;
          forkRoot.position.x=1.05+lunge*.34-drag*.22;
          forkRoot.position.y=.02+load*.28-lunge*.12-drag*.08+settle*.02;
          sensorNodes.forEach((sensor,index)=>{
            sensor.rotation.z=Math.sin(t*1.6+index*Math.PI)*.08-load*.06*(index?1:-1);
            sensor.position.y=.76+coil*.08-contact*.05;
          });
          ground.scale.set(1+coil*.08+lunge*.12-drag*.06,.56+contact*.07,1);
          const cameraKick=contact*.09*pressure;
          camera.position.set(.18+drag*.12-cameraKick,.12+coil*.08,7.25-cameraKick); camera.lookAt(0,-.05,0);
        } else if (isCourtship) {
          const sourceTime = Math.min(PRESETS.courtship.duration - .001, Math.max(0, rawTime));
          let frameIndex = GIF_STARTS.length - 1;
          for (let index = GIF_STARTS.length - 1; index >= 0; index--) if (sourceTime >= GIF_STARTS[index]) { frameIndex = index; break; }
          if (gifTextures[frameIndex]) courtshipUniforms.uMap.value = gifTextures[frameIndex];
          const textAuthority = frameIndex < 3 || frameIndex >= 10 ? .3 : 1;
          const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? .25 : 1;
          courtshipUniforms.uTime.value = sourceTime;
          courtshipUniforms.uProcess.value = options.intensity / 100 * textAuthority * reduced;
          courtshipUniforms.uPulse.value = Math.sin(Math.PI * phase(sourceTime, 3.8, 5.7)) + Math.sin(Math.PI * phase(sourceTime, 28.8, 30.6));
          camera.position.set(0, 0, 7); camera.lookAt(0, 0, 0);
        } else if (isBeardSlap) {
          const sourceTime=Math.min(BEARD_SLAP_PERFORMANCE_DURATION-.001,Math.max(0,rawTime));
          const load=easeInOut(phase(sourceTime,1.25,2.38));
          const strike=Math.pow(phase(sourceTime,2.38,3.04),2.6);
          const recoil=easeInOut(phase(sourceTime,3.04,3.82));
          const impact=Math.sin(Math.PI*phase(sourceTime,3.0,3.72))*(sourceTime>=3&&sourceTime<=3.72?1:0);
          const settle=Math.sin(Math.PI*phase(sourceTime,3.72,5.05))*(sourceTime>=3.72&&sourceTime<=5.05?1:0);
          randiUniforms.uTime.value=sourceTime;adamUniforms.uTime.value=sourceTime;
          randiUniforms.uImpact.value=impact*.12;adamUniforms.uImpact.value=Math.min(1,impact+settle*.42)*(options.intensity/100);
          randiUniforms.uCell.value=sourceTime<1.25?2:sourceTime<2.38?7:sourceTime<3.12?17:19;
          adamUniforms.uCell.value=sourceTime<2.55?0:sourceTime<3.08?9:sourceTime<4.05?11:sourceTime<5.0?13:17;
          hand.visible=sourceTime>=1.18&&sourceTime<3.88;
          if(sourceTime<2.38)hand.position.x=-5.4+load*2.9;
          else if(sourceTime<3.04)hand.position.x=-2.5+strike*3.22;
          else hand.position.x=.72-recoil*3.9;
          hand.position.y=-.08+Math.sin(load*Math.PI)*.2-impact*.06;
          hand.rotation.z=-.12+load*.18-impact*.09;
          hand.scale.setScalar(.92+impact*.16);
          adamPortrait.position.x=1.62+impact*.38-settle*.08;
          adamPortrait.rotation.z=-impact*.12+settle*.025;
          adamPortrait.scale.set(1+impact*.055,1-impact*.045,1);
          randiPortrait.position.x=-1.62-load*.06;
          randiPortrait.rotation.z=load*.018;
          impactRings.forEach((ring,index)=>{
            const spread=Math.max(0,phase(sourceTime,3.0+index*.035,3.92+index*.09));
            ring.scale.setScalar(.25+spread*(2.4+index*.22));
            const mat=ring.material as InstanceType<typeof THREE.MeshBasicMaterial>;
            mat.opacity=(1-spread)*impact*(.34-index*.045);
            ring.rotation.z=sourceTime*(.18+index*.025);
          });
          const cue=[...BEARD_SLAP_CUES].reverse().find(item=>sourceTime>=item.time)??BEARD_SLAP_CUES[0];
          drawBeardCue(cue.label,cue.detail);
          const cameraKick=impact*.11*(options.intensity/100);
          camera.position.set(cameraKick,0,7-cameraKick*.7);camera.lookAt(0,0,0);
        } else {
          const t = rawTime * options.speed / 100; const active = PRESETS[options.preset];
          const catchT = easeInOut(phase(rawTime, 1.55, 2.25)); const driveT = easeInOut(phase(rawTime, 2.25, 3.55));
          const brakeT = 1 - easeInOut(phase(rawTime, 3.55, 4.35));
          const impact = Math.sin(Math.PI * phase(rawTime, 2.65, 3.12)) * (rawTime > 2.65 && rawTime < 3.12 ? 1 : 0);
          uniforms.uTime.value=t; uniforms.uIntensity.value=options.intensity/100; uniforms.uColor.value.set(active.color); uniforms.uAccent.value.set(active.accent); uniforms.uImpact.value=impact;
          particlesMaterial.color.set(active.accent); knot.rotation.x=t*.18+catchT*.45; knot.rotation.y=t*.34+driveT*1.1;
          knot.scale.setScalar(.76+catchT*.18+driveT*.28*brakeT+impact*.15); particles.rotation.y=-t*.045; particles.position.z=Math.sin(t*.3)*.3;
          rings.forEach((ring,index)=>{const pulse=(rawTime*.55+index*.18)%1;ring.scale.setScalar(.55+pulse*.8+impact*.18);ring.rotation.z=t*(.03+index*.006);
            const mat=ring.material as InstanceType<typeof THREE.MeshBasicMaterial>;mat.color.set(active.color);mat.opacity=(1-pulse)*(.08+options.intensity/450)+impact*.25;});
          camera.position.x=Math.sin(t*.22)*.42+impact*.12;camera.position.y=.15+Math.cos(t*.27)*.18;camera.lookAt(0,0,0);
        }
        renderer.render(scene, camera);
      };
      renderAtRef.current = renderAt;

      const fitCourtshipPlane = () => {
        const distance = Math.abs(camera.position.z - courtshipPlane.position.z);
        const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance;
        const visibleWidth = visibleHeight * camera.aspect;
        const containedSide = Math.min(visibleWidth, visibleHeight) * .98;
        courtshipPlane.scale.setScalar(containedSide / 5);
      };
      const resize = () => { if (!mount.clientWidth || !mount.clientHeight) return; renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75)); renderer.setSize(mount.clientWidth,mount.clientHeight,false); camera.aspect=mount.clientWidth/mount.clientHeight; camera.updateProjectionMatrix(); fitCourtshipPlane(); };
      outputSizeRef.current = (width,height) => { if(width&&height){renderer.setPixelRatio(1);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();fitCourtshipPlane();}else resize(); };
      const observer = new ResizeObserver(resize); observer.observe(mount);
      let frame = 0;
      const animate = (now: number) => {
        if (!lastRef.current) lastRef.current=now; const dt=Math.min((now-lastRef.current)/1000,.05); lastRef.current=now;
        if (playingRef.current&&!exportingRef.current) {
          const previous=timeRef.current; timeRef.current+=dt;
          if(timeRef.current>=durationRef.current){timeRef.current%=durationRef.current;if(["adam","courtship","beardslap"].includes(valuesRef.current.preset)&&valuesRef.current.foley)void startFoley(0);if(valuesRef.current.preset==="beardslap"&&valuesRef.current.voice)void startVoice(0);}
          setTime(timeRef.current); if(previous>timeRef.current) renderAt(0);
        }
        renderAt(timeRef.current); frame=requestAnimationFrame(animate);
      };
      frame=requestAnimationFrame(animate);
      cleanup=()=>{cancelAnimationFrame(frame);observer.disconnect();gifTextures.forEach(texture=>{(texture.image as ImageBitmap | undefined)?.close?.();texture.dispose();});randiTexture.dispose();adamTexture.dispose();labelTexture.dispose();renderer.dispose();material.dispose();courtshipMaterial.dispose();randiMaterial.dispose();adamMaterial.dispose();handMaterial.dispose();portraitGeometry.dispose();particlesGeometry.dispose();noodleMaterials.forEach(value=>value.dispose());ironMaterial.dispose();sootMaterial.dispose();boneMaterial.dispose();spaghettiGroup.traverse(object=>{if(object instanceof THREE.Mesh)object.geometry.dispose();});if(renderer.domElement.parentNode===mount)mount.removeChild(renderer.domElement);canvasRef.current=null;};
    })().catch(() => { if(!disposed){setRendererMode("fallback");setStatus("2D source fallback · WebGL unavailable in this browser");} });
    return()=>{disposed=true;cleanup();};
  }, [startFoley, startVoice]);

  const seek = useCallback((next:number) => { timeRef.current=next;setTime(next);renderAtRef.current(next);if(playingRef.current){void startFoley(next);void startVoice(next);} }, [startFoley, startVoice]);
  const togglePlayback = useCallback(async () => { const next=!playingRef.current;setPlaying(next);playingRef.current=next;if(next)await Promise.all([startFoley(timeRef.current),startVoice(timeRef.current)]);else{stopFoley();stopVoice();} }, [startFoley, startVoice, stopFoley, stopVoice]);

  useEffect(() => {
    const onKey=(event:KeyboardEvent)=>{if(!memeOpen&&event.code==="Space"&&!(event.target instanceof HTMLInputElement)){event.preventDefault();void togglePlayback();}};
    window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);
  }, [togglePlayback,memeOpen]);

  useEffect(() => { queueMicrotask(() => { timeRef.current=0;setTime(0);stopFoley();stopVoice();renderAtRef.current(0);setStatus(preset==="adam"?(rendererMode==="webgl"?"A’Damn awake · eleven contacts · fork armed":"A’Damn concept fallback · WebGL unavailable"):preset==="beardslap"?(rendererMode==="webgl"?"Source-locked slap · Gemini voices armed":"2D beard-slap fallback · WebGL unavailable"):preset!=="courtship"?"Live scene · no baked footage":rendererMode==="webgl"?"Source locked · 28 frames · foley armed":rendererMode==="fallback"?"2D source fallback · WebGL unavailable or decode incomplete":"Loading checksum-locked GIF…"); }); }, [preset, rendererMode, stopFoley, stopVoice]);

  const shareUrl=useCallback(()=>{const payload=btoa(JSON.stringify({preset,intensity,speed,scanlines,foley,voice}));return`${window.location.origin}${window.location.pathname}#${payload}`;},[preset,intensity,speed,scanlines,foley,voice]);
  const copyScene=async()=>{await navigator.clipboard.writeText(shareUrl());setStatus("Scene link copied");};
  const shareScene=async()=>{const url=shareUrl();if(navigator.share)await navigator.share({title:`Motion Dungeon · ${PRESETS[preset].name}`,text:"Editable procedural motion scene",url});else await copyScene();};
  const vocalize=()=>{if(!("speechSynthesis" in window)){setStatus("Device speech is unavailable");return;}window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(COURTSHIP_LINE);utterance.rate=.86;utterance.pitch=.82;utterance.volume=.95;utterance.onend=()=>setStatus("Device voice complete · not part of export");utterance.onerror=()=>setStatus("Device speech failed · use a browser voice service");setStatus("Device voice · live preview only");window.speechSynthesis.speak(utterance);};

  const grabDungeonFrame=useCallback(async()=>{
    const source=canvasRef.current;
    if(source&&rendererMode==="webgl"){
      renderAtRef.current(timeRef.current);
      try{
        setMemeSource(source.toDataURL("image/png"));
        setMemeSourceName(`${PRESETS[valuesRef.current.preset].name} at ${fmt(timeRef.current)}`);
        setStatus("Current Dungeon frame loaded into Meme Maker");
        return true;
      }catch{/* Continue to the source-locked fallback below. */}
    }
    const active=valuesRef.current.preset;
    if(!["beardslap","courtship"].includes(active)){setStatus("This live shader needs WebGL before its frame can be captured");return false;}
    const loadImage=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;});
    try{
      const fallback=document.createElement("canvas");fallback.width=1280;fallback.height=720;const context=fallback.getContext("2d");if(!context)return false;
      context.fillStyle="#08080a";context.fillRect(0,0,1280,720);
      if(active==="courtship"){
        const image=await loadImage("/specimens/adam-eve-courtship/adam-to-eve-complete-readback.gif");
        const scale=Math.min(1280/image.naturalWidth,720/image.naturalHeight);context.drawImage(image,(1280-image.naturalWidth*scale)/2,(720-image.naturalHeight*scale)/2,image.naturalWidth*scale,image.naturalHeight*scale);
      }else{
        const [randi,adam]=await Promise.all([loadImage("/specimens/randi-adam-beard-slap/randi-expression-sheet.png"),loadImage("/specimens/randi-adam-beard-slap/adam-expression-sheet.png")]);
        const drawCell=(image:HTMLImageElement,cell:number,x:number)=>{const sw=image.naturalWidth/5,sh=image.naturalHeight/4;context.drawImage(image,(cell%5)*sw,Math.floor(cell/5)*sh,sw,sh,x,82,500,500);};
        drawCell(randi,2,115);drawCell(adam,0,665);
        context.fillStyle="rgba(5,5,7,.88)";context.fillRect(250,560,780,82);context.fillStyle="#ff3f75";context.fillRect(250,560,9,82);context.fillStyle="#fff4d6";context.font="800 46px Arial";context.textAlign="center";context.fillText("BEARD CUSTODY TRANSFER",640,615);
      }
      setMemeSource(fallback.toDataURL("image/png"));setMemeSourceName(`${PRESETS[active].name} · accessible fallback frame`);setStatus("Source-locked fallback loaded into Meme Maker");return true;
    }catch{setStatus("This frame cannot be captured in this browser");return false;}
  },[rendererMode]);

  const openMemeMaker=()=>{void grabDungeonFrame();setMemeOpen(true);setPlaying(false);playingRef.current=false;stopFoley();stopVoice();};
  const loadMemeImage=(file?:File)=>{
    if(!file)return;
    if(!file.type.startsWith("image/")){setStatus("Choose an image file");return;}
    const reader=new FileReader();
    reader.onload=()=>{if(typeof reader.result==="string"){setMemeSource(reader.result);setMemeSourceName(file.name);setStatus("Image loaded into Meme Maker");}};
    reader.onerror=()=>setStatus("That image could not be read");
    reader.readAsDataURL(file);
  };

  useEffect(()=>{
    if(!memeOpen||!memeSource)return;
    const canvas=memeCanvasRef.current;if(!canvas)return;
    const sizes:Record<MemeAspect,[number,number]>={landscape:[1280,720],square:[1080,1080],portrait:[1080,1350]};
    const [width,height]=sizes[memeAspect];canvas.width=width;canvas.height=height;
    const context=canvas.getContext("2d");if(!context)return;
    const image=new Image();
    image.onload=()=>{
      const scale=Math.max(width/image.naturalWidth,height/image.naturalHeight);
      const drawWidth=image.naturalWidth*scale,drawHeight=image.naturalHeight*scale;
      context.clearRect(0,0,width,height);context.drawImage(image,(width-drawWidth)/2,(height-drawHeight)/2,drawWidth,drawHeight);
      const lines=[{text:memeTop,y:.08,baseline:"top" as CanvasTextBaseline},{text:memeBottom,y:.92,baseline:"bottom" as CanvasTextBaseline}];
      context.textAlign="center";context.lineJoin="round";context.miterLimit=2;
      const fontFamily=memeStyle==="impact"?'Impact, "Arial Black", sans-serif':memeStyle==="poster"?'Georgia, serif':'Arial, sans-serif';
      const weight=memeStyle==="subtitle"?700:900;
      const fitText=(text:string)=>{let size=Math.round(memeSize*width/1080);context.font=`${weight} ${size}px ${fontFamily}`;while(size>28&&context.measureText(text).width>width*.9){size-=2;context.font=`${weight} ${size}px ${fontFamily}`;}return size;};
      lines.forEach(line=>{
        if(!line.text.trim())return;
        const size=fitText(line.text.trim());const pad=Math.max(22,size*.28);const y=height*line.y;
        context.textBaseline=line.baseline;
        if(memeStyle==="subtitle"){
          const metrics=context.measureText(line.text.trim());const boxHeight=size*1.34;const boxTop=line.baseline==="top"?y-pad/2:y-boxHeight+pad/2;
          context.fillStyle="rgba(0,0,0,.76)";context.fillRect((width-metrics.width)/2-pad,boxTop,metrics.width+pad*2,boxHeight);
          context.lineWidth=Math.max(3,size*.045);
        }else context.lineWidth=Math.max(7,size*.1);
        context.strokeStyle="rgba(0,0,0,.96)";context.fillStyle=memeStyle==="poster"?"#ffd66b":"#fff";
        context.strokeText(line.text.trim(),width/2,y);context.fillText(line.text.trim(),width/2,y);
      });
    };
    image.src=memeSource;
  },[memeOpen,memeSource,memeTop,memeBottom,memeAspect,memeStyle,memeSize]);

  useEffect(()=>{
    if(!memeOpen)return;
    const dialog=memeDialogRef.current;const focusable=()=>Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex]:not([tabindex="-1"])')??[]);
    focusable()[0]?.focus();
    const contain=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){setMemeOpen(false);return;}
      if(event.key!=="Tab")return;
      const items=focusable();if(!items.length)return;const first=items[0],last=items[items.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    window.addEventListener("keydown",contain);return()=>window.removeEventListener("keydown",contain);
  },[memeOpen]);

  const memeBlob=()=>new Promise<Blob|null>(resolve=>memeCanvasRef.current?.toBlob(resolve,"image/png")??resolve(null));
  const saveMeme=async()=>{const blob=await memeBlob();if(!blob)return;const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=`motion-dungeon-${preset}-meme.png`;link.click();setTimeout(()=>URL.revokeObjectURL(url),30_000);setStatus("Meme saved as PNG");};
  const shareMeme=async()=>{const blob=await memeBlob();if(!blob)return;const file=new File([blob],`motion-dungeon-${preset}-meme.png`,{type:"image/png"});if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title:"Motion Dungeon meme",text:[memeTop,memeBottom].filter(Boolean).join(" — "),files:[file]});setStatus("Meme shared");}else await saveMeme();};

  const exportMp4=async()=>{
    const canvas=canvasRef.current;if(!canvas||exporting)return;
    if(!("VideoEncoder" in window)){setStatus("This browser cannot encode MP4 locally. Use current Chrome or Edge.");return;}
    const includeAudio=preset==="adam"?foley:preset==="courtship"?foley:preset==="beardslap"?(foley||voice):false;
    if(includeAudio&&!("AudioEncoder" in window)){setStatus("This browser cannot place Foley into MP4. Use current Chrome or Edge.");return;}
    if(preset==="courtship"&&!gifReadyRef.current){setStatus("The locked GIF is not fully decoded yet");return;}
    if(preset==="beardslap"&&!beardReadyRef.current){setStatus("The locked expression sheets are not fully decoded yet");return;}
    setExporting(true);exportingRef.current=true;setPlaying(false);stopFoley();stopVoice();setProgress(0);setStatus("Rendering on this device…");
    const {ArrayBufferTarget,Muxer}=await import("mp4-muxer");const width=1280,height=720;const target=new ArrayBufferTarget();
    const muxer=new Muxer({target,video:{codec:"avc",width,height,frameRate:FPS},...(includeAudio?{audio:{codec:"aac",sampleRate:48_000,numberOfChannels:2}}:{}) ,fastStart:"in-memory"});
    let failed="";const config:VideoEncoderConfig={codec:"avc1.42001f",width,height,bitrate:6_000_000,framerate:FPS,hardwareAcceleration:"prefer-hardware",latencyMode:"quality"};
    try{
      const support=await VideoEncoder.isConfigSupported(config);if(!support.supported)throw new Error("H.264 encoding is unavailable in this browser");
      const encoder=new VideoEncoder({output:(chunk,meta)=>muxer.addVideoChunk(chunk,meta),error:error=>{failed=error.message;}});encoder.configure(config);outputSizeRef.current(width,height);
      for(let frame=0;frame<duration*FPS;frame++){const frameTime=frame/FPS;renderAtRef.current(frameTime);const videoFrame=new VideoFrame(canvas,{timestamp:Math.round(frameTime*1_000_000),duration:Math.round(1_000_000/FPS)});encoder.encode(videoFrame,{keyFrame:frame%FPS===0});videoFrame.close();if(frame%16===0){setProgress(Math.round(frame/(duration*FPS)*82));await new Promise(resolve=>requestAnimationFrame(resolve));}}
      await encoder.flush();encoder.close();if(failed)throw new Error(failed);
      if(includeAudio){const audioBuffer=preset==="adam"?await renderAdamAudio(duration):preset==="beardslap"?await renderBeardSlapAudio(duration,foley,voice):await renderCourtshipAudio(duration);const audioConfig:AudioEncoderConfig={codec:"mp4a.40.2",sampleRate:48_000,numberOfChannels:2,bitrate:160_000};const audioSupport=await AudioEncoder.isConfigSupported(audioConfig);if(!audioSupport.supported)throw new Error("AAC encoding is unavailable in this browser");
        const audioEncoder=new AudioEncoder({output:(chunk,meta)=>muxer.addAudioChunk(chunk,meta),error:error=>{failed=error.message;}});audioEncoder.configure(audioConfig);const left=audioBuffer.getChannelData(0),right=audioBuffer.getChannelData(1);const block=1024;
        for(let offset=0;offset<audioBuffer.length;offset+=block){const frames=Math.min(block,audioBuffer.length-offset);const data=new Float32Array(frames*2);for(let index=0;index<frames;index++){data[index*2]=left[offset+index];data[index*2+1]=right[offset+index];}const audioData=new AudioData({format:"f32",sampleRate:48_000,numberOfFrames:frames,numberOfChannels:2,timestamp:Math.round(offset/48_000*1_000_000),data});audioEncoder.encode(audioData);audioData.close();}
        await audioEncoder.flush();audioEncoder.close();if(failed)throw new Error(failed);setProgress(96);}
      muxer.finalize();const blob=new Blob([target.buffer],{type:"video/mp4"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=`${PRESETS[preset].name.toLowerCase().replaceAll(" ","-")}.mp4`;link.click();setTimeout(()=>URL.revokeObjectURL(url),30_000);setStatus(`MP4 saved${includeAudio?" · audio mixed":""} · ${(blob.size/1_048_576).toFixed(1)} MB`);setProgress(100);
    }catch(error){setStatus(error instanceof Error?error.message:"MP4 export failed");}finally{outputSizeRef.current();setExporting(false);exportingRef.current=false;seek(0);}
  };

  const ticks=useMemo(()=>preset==="adam"?["WAKE","COIL","LOAD","LUNGE","DRAG","SETTLE"]:preset==="beardslap"?["READ","LOAD","DECIDE","SLAP","PAY","RETURN"]:preset==="courtship"?["TRAGEDY","CORRECT","YES","TERMS","POEMS","ASKED"]:["LOAD","SLIDE","CATCH","DRIVE","BRAKE","EXTRACT"],[preset]);
  const stack=preset==="adam"?["THREE / 11 grounded noodles","THREE / ration-can cuirass","TWEEN / coil + lunge + drag","TOOL / bayonet-fork","FOLEY / tendon + iron + mud"]:preset==="beardslap"?["SOURCE / RANDI ×20","SOURCE / ADAM ×20","GLSL / beard recoil","VOICE / Gemini Kore + Gacrux","FOLEY / palm + bristle"]:preset==="courtship"?["SOURCE / GIF ×28","GLSL / Worley","PROC / FBM + grain","FOLEY / formant"]:["THREE / geometry","GLSL / surface","PROC / sparks","TWEEN / camera"];
  const beardCaption=preset==="beardslap"?BEARD_SLAP_CAPTIONS.find(caption=>time>=caption.start&&time<caption.end):undefined;
  const adamCue=preset==="adam"?[...ADAM_CUES].reverse().find(cue=>time>=cue.time)??ADAM_CUES[0]:undefined;
  const selectedAudio=preset==="adam"?foley:preset==="courtship"?foley:preset==="beardslap"?(foley||voice):false;

  return <main className="studio-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark" aria-hidden="true">MD</span><div><h1>Motion Dungeon</h1><p>the useful machinery Flash kept downstairs</p></div></div>
      <div className="header-actions"><a className="button ghost" href="/scenes/lexen-cage-with-glass-walls">Lexen cage</a><a className="button ghost" href="/ferravine">Ferravine vivisection</a><a className="button ghost" href="/sherman">Sherman lab</a><a className="button ghost" href="/venice">Video chat Venice</a><button className="button ghost" onClick={openMemeMaker}>Make meme</button><button className="button ghost" onClick={copyScene}>Copy scene</button><button className="button ghost" onClick={shareScene}>Share</button>{preset==="courtship"&&<button className="button ghost vocalize" onClick={vocalize}>Vocalize</button>}<button className="button primary" onClick={exportMp4} disabled={exporting||(["courtship","beardslap"].includes(preset)&&rendererMode!=="webgl")}>{exporting?`${progress}%`:["courtship","beardslap"].includes(preset)&&rendererMode!=="webgl"?"Renderer required":"Render MP4"}</button></div></header>
    <section className="workspace" aria-label="Motion editor">
      <aside className="rail presets" aria-label="Scene presets"><div className="rail-heading"><span>Scenes</span><button aria-label="Create scene">+</button></div>{(Object.keys(PRESETS) as Preset[]).map(key=><button key={key} className={`preset ${preset===key?"active":""}`} onClick={()=>setPreset(key)}><span className="preset-orb" style={{"--orb":PRESETS[key].color} as React.CSSProperties}/><span><strong>{PRESETS[key].name}</strong><small>{PRESETS[key].note}</small></span></button>)}<div className="stack-label">STACK</div>{stack.map((label,index)=><div className="layer" key={label}><span>{index+1}</span>{label}<i/></div>)}</aside>
      <section className="stage-column"><div className={`stage ${scanlines?"scanlines":""}`} ref={mountRef}>{preset==="adam"&&<div className={`adam-fallback ${rendererMode!=="webgl"?"visible":""}`} role="img" aria-label="A’Damn is a low Fleshpunk Great War logistics beast. Eleven grounded tendon-noodle limbs carry a ration-can armored torso, two sensory nodes, and one bayonet-fork manipulator.">
        {/* eslint-disable-next-line @next/next/no-img-element -- exact generated concept plate is the accessible renderer fallback. */}
        <img src="/specimens/adam-spaghetti-monster/adam-concept-reference.png" alt="A’Damn, an armored many-limbed tendon spaghetti creature carrying a fork-bayonet"/><strong>A’DAMN</strong><small>GREAT WAR LOGISTICS ORGANISM · FORK-BEARING</small></div>}{preset==="courtship"&&<div className={`stage-fallback ${rendererMode!=="webgl"?"visible":""}`} aria-label="Animated source fallback">
        {/* eslint-disable-next-line @next/next/no-img-element -- preserving the exact GIF bytes and native timing is a source-lock requirement. */}
        <img src="/specimens/adam-eve-courtship/adam-to-eve-complete-readback.gif" alt="Adam to Eve Complete Readback animated courtship response"/><i aria-hidden="true"/></div>}{preset==="beardslap"&&<div className={`beardslap-fallback ${rendererMode!=="webgl"?"visible":""}`} role="img" aria-label="Randi loads a decisive open-hand strike. Adam receives it in the beard; the beard ripples, the dungeon recoils, and both return to composed expressions."><div className="fallback-face randi"/><div className="fallback-face adam"/><span className="fallback-hand" aria-hidden="true">✋</span><strong>BEARD CUSTODY TRANSFER</strong><small>READ · LOAD · SLAP · PAY · RETURN</small></div>}{preset!=="courtship"&&preset!=="beardslap"&&<div className="safe-frame" aria-hidden="true"/>}<div className="stage-chip">{preset==="adam"?rendererMode==="webgl"?"LIVE · 11 CONTACTS · FLESH DOES NOT GLOW":"CONCEPT FALLBACK · A’DAMN":preset==="beardslap"?rendererMode==="webgl"?"SOURCE LOCKED · GEMINI 3.1 FLASH":"2D FALLBACK · BEARD IMPACT":preset==="courtship"?rendererMode==="webgl"?"SOURCE LOCKED · D7634872":"2D FALLBACK · D7634872":"LIVE · WEBGL"}</div>{adamCue&&<div className="stage-caption adam-caption"><strong>{adamCue.label}</strong><span>{adamCue.detail}</span></div>}{beardCaption&&<div className="stage-caption"><strong>{beardCaption.speaker}</strong><span>{beardCaption.text}</span></div>}{preset!=="courtship"&&preset!=="beardslap"&&<div className="stage-title"><span>{preset==="adam"?"FLESHPUNK · GREAT WAR":"PROCEDURAL PRESET"}</span><strong>{PRESETS[preset].name}</strong></div>}<div className="resolution">1280 × 720 / 30</div></div>
        <div className="transport"><button className="play" onClick={()=>void togglePlayback()} disabled={["adam","courtship","beardslap"].includes(preset)&&rendererMode!=="webgl"} aria-label={playing?"Pause":"Play"}>{playing?"Ⅱ":"▶"}</button><output>{fmt(time)}</output><input aria-label="Timeline position" type="range" min="0" max={duration} step={1/FPS} value={time} disabled={["adam","courtship","beardslap"].includes(preset)&&rendererMode!=="webgl"} onChange={event=>seek(Number(event.target.value))}/><output>{fmt(duration)}</output><button onClick={()=>seek(0)} disabled={["adam","courtship","beardslap"].includes(preset)&&rendererMode!=="webgl"} aria-label="Return to start">↤</button></div>
        <div className="timeline" aria-label="Timeline tracks"><div className="time-ruler">{ticks.map((tick,index)=><span key={tick} style={{left:`${index*20}%`}}><b>{Math.round(index*duration/5)}s</b>{tick}</span>)}</div>{preset==="beardslap"?<><div className="track"><label>Faces</label><div className="track-line"><i className="clip source slap-source">Randi ×20 + Adam ×20 · final hold</i><i className="key k1"/><i className="key k3"/></div></div><div className="track"><label>Impact</label><div className="track-line"><i className="clip shader slap-shader">Hand + beard-wave field</i><i className="key slap-key"/></div></div><div className="track"><label>Voice</label><div className="track-line"><i className="clip voice slap-voice">Gemini · Kore + Gacrux</i></div></div><div className="track"><label>Sound</label><div className="track-line"><i className="clip foley slap-foley">Palm / cheek / bristle / room</i><i className="key slap-key"/></div></div></>:preset==="courtship"?<><div className="track"><label>Source</label><div className="track-line"><i className="clip source">GIF · native frame timing</i></div></div><div className="track"><label>Noise</label><div className="track-line"><i className="clip shader courtship">Worley + FBM + grain</i><i className="key k3"/></div></div><div className="track"><label>Sound</label><div className="track-line"><i className="clip foley">Designed Foley + formants</i><i className="key k4"/><i className="key k5"/></div></div></>:<><div className="track"><label>Geometry</label><div className="track-line"><i className="clip geo">Knot deformation</i><i className="key k1"/><i className="key k2"/></div></div><div className="track"><label>Shader</label><div className="track-line"><i className="clip shader">Rim + impact pulse</i><i className="key k3"/></div></div><div className="track"><label>Camera</label><div className="track-line"><i className="clip camera">Orbit / drive / brake</i><i className="key k4"/><i className="key k5"/></div></div></>}<div className="playhead" style={{left:`calc(108px + (100% - 108px) * ${time/duration})`}}/></div>
      </section>
      <aside className="rail inspector" aria-label="Scene inspector"><div className="rail-heading"><span>Inspector</span><em>{preset==="beardslap"?"BS":preset==="courtship"?"AE":"01"}</em></div><div className="node-title"><span style={{background:PRESETS[preset].color}}/>{["courtship","beardslap"].includes(preset)?"Source-locked candidate":"Master signal"}</div><label className="control"><span>{preset==="courtship"?"Noise pressure":preset==="beardslap"?"Slap pressure":"Intensity"} <output>{intensity}%</output></span><input type="range" min="0" max="100" value={intensity} onChange={event=>setIntensity(Number(event.target.value))}/></label>{["courtship","beardslap"].includes(preset)?<div className="locked-control"><span>Timing</span><strong>1.00× LOCKED</strong><small>{preset==="beardslap"?"40 states · 7.20s + 1.70s final hold":"28 frames · 35.07 seconds"}</small></div>:<label className="control"><span>Time scale <output>{(speed/100).toFixed(2)}×</output></span><input type="range" min="25" max="200" value={speed} onChange={event=>setSpeed(Number(event.target.value))}/></label>}<label className="toggle"><span><strong>Scanline pass</strong><small>procedural overlay</small></span><input type="checkbox" checked={scanlines} onChange={event=>setScanlines(event.target.checked)}/><i/></label>{preset==="beardslap"&&<label className="toggle"><span><strong>Gemini voices</strong><small>Kore / Randi · Gacrux / Adam</small></span><input type="checkbox" checked={voice} onChange={event=>{setVoice(event.target.checked);if(!event.target.checked)stopVoice();}}/><i/></label>}{["courtship","beardslap"].includes(preset)&&<label className="toggle"><span><strong>Designed Foley</strong><small>{preset==="beardslap"?"palm / cheek / bristle / room":"cell / paper / door / formant"}</small></span><input type="checkbox" checked={foley} onChange={event=>{setFoley(event.target.checked);if(!event.target.checked)stopFoley();}}/><i/></label>}<div className="shader-card"><span>FRAGMENT</span><code>{preset==="beardslap"?<>atlas = source[cell]<br/>beard += strikeBand × recoil<br/>ring = impact → settle</>:preset==="courtship"?<>cell = worley(uv × 9)<br/>warp = fbm(uv, time)<br/>grain = seeded(frame)</>:<>rim = pow(1.0 − N·V, 2.2)<br/>color += impact × accent<br/>glow *= intensity</>}</code></div><div className="render-info"><span>LOCAL OUTPUT</span><strong>MP4 · H.264{selectedAudio?" + AAC":""}</strong><small>No upload. Browser encoded.<br/>{preset==="courtship"?"Device speech is preview-only.":preset==="beardslap"?"Verified Gemini voice and Foley are exportable.":"The scene remains editable."}</small></div></aside>
    </section><footer><span className="status-dot"/>{status}<kbd>SPACE</kbd><span>play / pause</span></footer>
    {memeOpen&&<div className="meme-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setMemeOpen(false);}}><section ref={memeDialogRef} className="meme-maker" role="dialog" aria-modal="true" aria-labelledby="meme-title"><header><div><span className="meme-kicker">FRAME WEAPONIZATION</span><h2 id="meme-title">Meme Maker</h2></div><button className="meme-close" onClick={()=>setMemeOpen(false)} aria-label="Close Meme Maker">×</button></header><div className="meme-layout"><div className="meme-preview"><canvas ref={memeCanvasRef} aria-label={`Meme preview using ${memeSourceName}. Top text: ${memeTop||"none"}. Bottom text: ${memeBottom||"none"}.`}/>{!memeSource&&<p>Choose a Dungeon frame or upload an image.</p>}</div><div className="meme-controls"><div className="meme-source-row"><button className="button" onClick={()=>void grabDungeonFrame()}>Use current frame</button><label className="button file-button">Upload image<input type="file" accept="image/*" onChange={event=>loadMemeImage(event.target.files?.[0])}/></label></div><small className="source-name">SOURCE · {memeSourceName}</small><label>Top text<input type="text" value={memeTop} maxLength={80} onChange={event=>setMemeTop(event.target.value)} /></label><label>Bottom text<input type="text" value={memeBottom} maxLength={80} onChange={event=>setMemeBottom(event.target.value)} /></label><fieldset><legend>Crop</legend><div className="segmented">{(["landscape","square","portrait"] as MemeAspect[]).map(value=><button key={value} className={memeAspect===value?"active":""} onClick={()=>setMemeAspect(value)} aria-pressed={memeAspect===value}>{value}</button>)}</div></fieldset><fieldset><legend>Caption style</legend><div className="segmented">{(["impact","subtitle","poster"] as MemeStyle[]).map(value=><button key={value} className={memeStyle===value?"active":""} onClick={()=>setMemeStyle(value)} aria-pressed={memeStyle===value}>{value}</button>)}</div></fieldset><label>Text size <output>{memeSize}</output><input type="range" min="40" max="120" value={memeSize} onChange={event=>setMemeSize(Number(event.target.value))}/></label><p className="meme-description">The exported image contains the selected source with “{memeTop||"no top caption"}” above and “{memeBottom||"no bottom caption"}” below.</p><div className="meme-actions"><button className="button" onClick={saveMeme} disabled={!memeSource}>Download PNG</button><button className="button primary" onClick={shareMeme} disabled={!memeSource}>Share meme</button></div></div></div></section></div>}
  </main>;
}
