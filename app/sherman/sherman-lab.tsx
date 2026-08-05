"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import Link from "next/link";
import * as THREE from "three";

type SceneDocument = {
  schema: string;
  id: string;
  title: string;
  source: {kind: string; label: string; license: string; url?: string};
  viewer: {background: string; autoRotate: boolean; wireframe: boolean; grid: boolean; turretYaw: number; exploded: number};
  [key: string]: unknown;
};

const DEFAULT_DOCUMENT: SceneDocument = {
  schema: "motion-dungeon.scene/1",
  id: "sherman-tank-lab",
  title: "M4 Sherman · procedural study",
  source: {kind: "procedural", label: "Motion Dungeon baseline", license: "CC BY-SA 4.0"},
  viewer: {background: "#090c0a", autoRotate: true, wireframe: false, grid: true, turretYaw: -8, exploded: 0},
  notes: ["Silhouette study, not a dimensional reconstruction", "No external mesh or texture source"],
};

const CANDIDATES = [
  {name: "Motion Dungeon baseline", lane: "Procedural", license: "CC BY-SA 4.0", weight: "Instant", fit: "Control specimen", status: "loaded", url: "#viewer"},
  {name: "Low-poly M4A3(75)W", lane: "Harvest", license: "CC BY 4.0", weight: "25k tris", fit: "Best web candidate", status: "inspect", url: "https://sketchfab.com/3d-models/low-poly-m4a375w-sherman-tank-0d5533e114bf4849bc8c9213e4ee9cf9"},
  {name: "WWII Tank Pack · Sherman", lane: "Harvest", license: "CC0", weight: "809 MB pack", fit: "Clean rights; heavy intake", status: "inspect", url: "https://metaworldos.itch.io/wwii-tank-pack-glb-models"},
  {name: "Meshy 6 image-to-3D", lane: "Cloud", license: "Free: CC BY 4.0", weight: "20–30 credits", fit: "Fast textured challenger", status: "not run", url: "https://docs.meshy.ai/en/webapp/pricing"},
  {name: "Hunyuan3D-2mini", lane: "Local", license: "Community license", weight: "≥6 GB class", fit: "4 GB GPU below spec", status: "blocked", url: "https://github.com/Tencent-Hunyuan/Hunyuan3D-2"},
] as const;

function addBox(group: THREE.Group, size: [number, number, number], position: [number, number, number], material: THREE.Material, bevel = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size, bevel ? 3 : 1, bevel ? 2 : 1, bevel ? 2 : 1), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function createSherman() {
  const root = new THREE.Group();
  root.name = "M4 Sherman procedural baseline";
  const olive = new THREE.MeshStandardMaterial({color: 0x596449, roughness: .78, metalness: .18});
  const dark = new THREE.MeshStandardMaterial({color: 0x20251d, roughness: .92, metalness: .12});
  const steel = new THREE.MeshStandardMaterial({color: 0x33382f, roughness: .7, metalness: .35});
  const track = new THREE.MeshStandardMaterial({color: 0x171a16, roughness: .9, metalness: .38});
  const hull = new THREE.Group(); hull.name = "hull"; root.add(hull);
  addBox(hull, [5.2, .8, 2.65], [0, 1.05, 0], dark, true);
  const upper = addBox(hull, [4.45, 1.15, 2.4], [-.05, 1.72, 0], olive, true);
  upper.rotation.z = -.02;
  addBox(hull, [.72, .84, 2.44], [2.05, 1.72, 0], olive, true).rotation.z = -.22;
  addBox(hull, [.7, .35, 2.1], [-2.15, 2.15, 0], olive);

  const turret = new THREE.Group(); turret.name = "turret"; turret.position.set(.25, 2.48, 0); root.add(turret);
  const turretMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.28, .82, 12), olive);
  turretMesh.rotation.x = Math.PI / 2; turretMesh.castShadow = true; turret.add(turretMesh);
  const mantlet = new THREE.Mesh(new THREE.SphereGeometry(.48, 12, 8), olive); mantlet.scale.set(.8, .9, 1.05); mantlet.position.set(1.05, .02, 0); mantlet.castShadow = true; turret.add(mantlet);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.09, .12, 3.15, 12), steel); barrel.rotation.z = -Math.PI / 2; barrel.position.set(2.35, .05, 0); barrel.castShadow = true; turret.add(barrel);
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .28, 12), steel); muzzle.rotation.z = -Math.PI / 2; muzzle.position.set(3.94, .05, 0); turret.add(muzzle);
  const hatch = new THREE.Mesh(new THREE.CylinderGeometry(.38, .4, .17, 16), olive); hatch.rotation.x = Math.PI / 2; hatch.position.set(-.15, .48, -.2); turret.add(hatch);
  addBox(turret, [.11, .62, .11], [-.65, .66, .45], steel);

  for (const side of [-1, 1]) {
    const z = side * 1.34;
    addBox(root, [4.95, .18, .22], [0, .72, z], track);
    for (let i = 0; i < 6; i++) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .2, 18), dark);
      wheel.rotation.x = Math.PI / 2; wheel.position.set(-1.8 + i * .72, .67, z); wheel.castShadow = true; root.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .225, 14), steel);
      hub.rotation.x = Math.PI / 2; hub.position.copy(wheel.position); root.add(hub);
    }
    for (let i = 0; i < 18; i++) {
      const shoe = addBox(root, [.27, .12, .28], [-2.28 + i * .27, .18, z], track);
      shoe.rotation.y = side * .01;
    }
  }
  const star = new THREE.Mesh(new THREE.RingGeometry(.26, .38, 10), new THREE.MeshBasicMaterial({color: 0xe5e1cd, side: THREE.DoubleSide}));
  star.rotation.y = Math.PI / 2; star.position.set(.55, 2.85, -1.09); turret.add(star);
  root.userData.materials = [olive, dark, steel, track];
  return root;
}

function countModel(root: THREE.Object3D) {
  let triangles = 0; const materials = new Set<THREE.Material>();
  root.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    const geometry = node.geometry as THREE.BufferGeometry;
    triangles += geometry.index ? geometry.index.count / 3 : (geometry.attributes.position?.count ?? 0) / 3;
    (Array.isArray(node.material) ? node.material : [node.material]).forEach(material => materials.add(material));
  });
  return {triangles: Math.round(triangles), materials: materials.size};
}

export default function ShermanLab() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const turretRef = useRef<THREE.Object3D | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<{target: THREE.Vector3; update(): void; dispose(): void; autoRotate: boolean; autoRotateSpeed: number} | null>(null);
  const [document, setDocument] = useState<SceneDocument>(DEFAULT_DOCUMENT);
  const [metrics, setMetrics] = useState({triangles: 0, materials: 0, bytes: 0});
  const [status, setStatus] = useState("Procedural control specimen loaded");
  const [activeTab, setActiveTab] = useState<"harvest" | "compare" | "local">("harvest");

  const updateViewer = useCallback((patch: Partial<SceneDocument["viewer"]>) => {
    setDocument(current => ({...current, viewer: {...current.viewer, ...patch}}));
  }, []);

  const installModel = useCallback((model: THREE.Object3D, bytes = 0, source?: SceneDocument["source"]) => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (modelRef.current) scene.remove(modelRef.current);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 5.8 / Math.max(size.x, size.y, size.z, .001);
    model.scale.setScalar(scale);
    model.position.sub(center.multiplyScalar(scale));
    model.position.y -= new THREE.Box3().setFromObject(model).min.y;
    scene.add(model); modelRef.current = model;
    turretRef.current = model.getObjectByName("turret") ?? null;
    setMetrics({...countModel(model), bytes});
    if (source) setDocument(current => ({...current, source}));
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let alive = true; let frame = 0;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(DEFAULT_DOCUMENT.viewer.background); scene.fog = new THREE.FogExp2(0x090c0a, .038); sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(36, 1, .05, 100); camera.position.set(8, 5.4, 8.5);
    const renderer = new THREE.WebGLRenderer({antialias: true, alpha: false}); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; rendererRef.current = renderer; mount.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xc7d8bd, 0x17160f, 2.2));
    const key = new THREE.DirectionalLight(0xffe3ad, 4.2); key.position.set(4, 8, 5); key.castShadow = true; scene.add(key);
    const rim = new THREE.DirectionalLight(0x6bb1ff, 2.4); rim.position.set(-5, 3, -4); scene.add(rim);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({color: 0x111510, roughness: 1})); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const grid = new THREE.GridHelper(30, 30, 0x65724e, 0x252a21); grid.name = "grid"; grid.position.y = .006; scene.add(grid);
    const baseline = createSherman(); installModel(baseline);
    void import("three/examples/jsm/controls/OrbitControls.js").then(({OrbitControls}) => {
      if (!alive) return;
      const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.target.set(0, 1.25, 0); controls.autoRotate = true; controls.autoRotateSpeed = .7; controls.minDistance = 4; controls.maxDistance = 20; controlsRef.current = controls;
    });
    const resize = () => { const {clientWidth: width, clientHeight: height} = mount; renderer.setSize(width, height, false); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(mount); resize();
    const animate = () => { frame = requestAnimationFrame(animate); controlsRef.current?.update(); renderer.render(scene, camera); }; animate();
    return () => { alive = false; cancelAnimationFrame(frame); observer.disconnect(); controlsRef.current?.dispose(); renderer.dispose(); renderer.domElement.remove(); sceneRef.current = null; };
  }, [installModel]);

  useEffect(() => {
    const {viewer} = document;
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(viewer.background);
      const grid = sceneRef.current.getObjectByName("grid"); if (grid) grid.visible = viewer.grid;
    }
    if (controlsRef.current) controlsRef.current.autoRotate = viewer.autoRotate;
    if (turretRef.current) turretRef.current.rotation.y = THREE.MathUtils.degToRad(viewer.turretYaw);
    if (modelRef.current) {
      modelRef.current.traverse(node => { if (node instanceof THREE.Mesh) (Array.isArray(node.material) ? node.material : [node.material]).forEach(material => { if ("wireframe" in material) (material as THREE.MeshStandardMaterial).wireframe = viewer.wireframe; }); });
      modelRef.current.children.forEach((child, index) => {
        const baseY = typeof child.userData.shermanBaseY === "number" ? child.userData.shermanBaseY : child.position.y;
        child.userData.shermanBaseY = baseY;
        child.position.y = baseY + viewer.exploded * .002 * (index + 1);
      });
    }
  }, [document]);

  const resetBaseline = useCallback(() => {
    installModel(createSherman(), 0, DEFAULT_DOCUMENT.source);
    setDocument(current => ({...current, title: DEFAULT_DOCUMENT.title, viewer: {...DEFAULT_DOCUMENT.viewer}}));
    setStatus("Procedural control specimen restored");
  }, [installModel]);

  const loadGlb = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".glb")) { setStatus("Motion Dungeon accepts binary .glb files in this lane"); return; }
    setStatus(`Reading ${file.name}…`);
    try {
      const url = URL.createObjectURL(file);
      const {GLTFLoader} = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const loader = new GLTFLoader();
      const gltf = await loader.loadAsync(url); URL.revokeObjectURL(url);
      installModel(gltf.scene, file.size, {kind: "uploaded-glb", label: file.name, license: "Unverified — record before promotion"});
      setDocument(current => ({...current, title: file.name.replace(/\.glb$/i, "")}));
      setStatus(`${file.name} loaded · provenance remains unverified`);
    } catch { setStatus("That GLB could not be decoded; the baseline remains recoverable"); }
  }, [installModel]);

  const exportDocument = () => {
    const blob = new Blob([JSON.stringify(document, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob); const anchor = globalThis.document.createElement("a"); anchor.href = url; anchor.download = `${document.id}.json`; anchor.click(); URL.revokeObjectURL(url);
    setStatus("Scene document exported with unknown fields intact");
  };

  const importDocument = async (file: File) => {
    try {
      const value = JSON.parse(await file.text()) as SceneDocument;
      if (!value.viewer || typeof value.id !== "string") throw new Error("invalid");
      setDocument(value); setStatus(`${value.title} scene document loaded`);
    } catch { setStatus("Scene document rejected: viewer and id fields are required"); }
  };

  return <main className="sherman-shell">
    <header className="sherman-bar">
      <Link href="/" className="sherman-brand"><span>MD</span><b>MOTION DUNGEON</b></Link>
      <div><small>ASSET FORENSICS / HM-MD-001</small><strong>SHERMAN MODEL LAB</strong></div>
      <nav><a href="#evidence">Evidence</a><button onClick={exportDocument}>Export scene JSON</button></nav>
    </header>

    <section className="sherman-workspace" id="viewer">
      <aside className="sherman-rail source-rail">
        <p className="eyebrow">SOURCE SLOTS</p>
        <button className={document.source.kind === "procedural" ? "source active" : "source"} onClick={resetBaseline}><i/>Procedural control<small>license-clean silhouette</small></button>
        <label className="source upload"><i/>Drop / choose GLB<small>kept in browser memory</small><input type="file" accept=".glb,model/gltf-binary" onChange={event => event.target.files?.[0] && void loadGlb(event.target.files[0])}/></label>
        <div className="provenance-card"><span>PROVENANCE</span><strong>{document.source.label}</strong><small>{document.source.license}</small><em>{document.source.kind === "procedural" ? "VERIFIED BASELINE" : "PROMOTION BLOCKED"}</em></div>
        <div className="metric-grid"><div><b>{metrics.triangles.toLocaleString()}</b><span>TRIANGLES</span></div><div><b>{metrics.materials}</b><span>MATERIALS</span></div><div><b>{metrics.bytes ? `${(metrics.bytes / 1_048_576).toFixed(1)} MB` : "0 MB"}</b><span>SOURCE</span></div><div><b>GLB</b><span>LANE</span></div></div>
      </aside>

      <div className="sherman-stage">
        <div ref={mountRef} className="sherman-canvas" onDragOver={event => event.preventDefault()} onDrop={event => {event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void loadGlb(file);}}/>
        <div className="stage-readout"><span>CONTROL SPECIMEN / M4 SHERMAN</span><strong>{document.title}</strong></div>
        <div className="axis-readout">Y UP · METRIC NORMALIZED · LOCAL RENDER</div>
        <div className="drop-callout">DROP GLB TO CHALLENGE BASELINE</div>
      </div>

      <aside className="sherman-rail inspector-rail">
        <p className="eyebrow">VIEWER</p>
        <label className="viewer-toggle"><span><b>Auto orbit</b><small>inspect silhouette</small></span><input type="checkbox" checked={document.viewer.autoRotate} onChange={event => updateViewer({autoRotate: event.target.checked})}/></label>
        <label className="viewer-toggle"><span><b>Wireframe</b><small>topology pressure</small></span><input type="checkbox" checked={document.viewer.wireframe} onChange={event => updateViewer({wireframe: event.target.checked})}/></label>
        <label className="viewer-toggle"><span><b>Ground grid</b><small>scale / contact</small></span><input type="checkbox" checked={document.viewer.grid} onChange={event => updateViewer({grid: event.target.checked})}/></label>
        <label className="range-control"><span><b>Turret yaw</b><output>{document.viewer.turretYaw}°</output></span><input type="range" min="-180" max="180" value={document.viewer.turretYaw} onChange={event => updateViewer({turretYaw: Number(event.target.value)})}/></label>
        <label className="range-control"><span><b>Exploded view</b><output>{document.viewer.exploded}%</output></span><input type="range" min="0" max="100" value={document.viewer.exploded} onChange={event => updateViewer({exploded: Number(event.target.value)})}/></label>
        <label className="color-control"><span><b>Void</b><small>background</small></span><input type="color" value={document.viewer.background} onChange={event => updateViewer({background: event.target.value})}/></label>
        <div className="document-card"><span>SCENE DOCUMENT</span><strong>{document.schema}</strong><p>Viewer state round-trips without stripping fields Motion Dungeon does not understand.</p><label>Import JSON<input type="file" accept="application/json,.json" onChange={event => event.target.files?.[0] && void importDocument(event.target.files[0])}/></label></div>
      </aside>
    </section>

    <section className="evidence-deck" id="evidence">
      <header><div><small>DECISION ROOM</small><h2>One tank. Four acquisition lanes.</h2></div><div className="tabs" role="tablist"><button className={activeTab === "harvest" ? "active" : ""} onClick={() => setActiveTab("harvest")}>Harvest</button><button className={activeTab === "compare" ? "active" : ""} onClick={() => setActiveTab("compare")}>Meshy</button><button className={activeTab === "local" ? "active" : ""} onClick={() => setActiveTab("local")}>Local</button></div></header>
      {activeTab === "harvest" && <div className="candidate-list">{CANDIDATES.map(candidate => <a href={candidate.url} target={candidate.url.startsWith("http") ? "_blank" : undefined} rel="noreferrer" key={candidate.name}><span className={`lane lane-${candidate.lane.toLowerCase()}`}>{candidate.lane}</span><strong>{candidate.name}</strong><small>{candidate.license}</small><small>{candidate.weight}</small><em>{candidate.fit}</em><b className={`candidate-status ${candidate.status.replace(" ", "-")}`}>{candidate.status}</b></a>)}</div>}
      {activeTab === "compare" && <div className="compare-grid"><article><small>MOTION DUNGEON</small><h3>Procedural baseline</h3><b>No credits · immediate · editable</b><p>Strongest for provenance, silhouette control, and interaction. Weakest for rivets, suspension fidelity, and authored texture detail.</p></article><article className="challenger"><small>MESHY 6</small><h3>Cloud challenger</h3><b>20 credits text-to-3D · 20–30 image-to-3D</b><p>Strongest for fast textured variations and export formats. A fair test needs the same multi-view reference packet and a recorded license tier.</p></article><article><small>FAIR TEST</small><h3>Acceptance gate</h3><b>Profile · ¾ front · rear · top</b><p>Score silhouette, Sherman-specific fittings, track continuity, hidden-side hallucination, topology, PBR maps, GLB weight, and attribution burden.</p></article></div>}
      {activeTab === "local" && <div className="local-grid"><article className="machine"><span>THIS MACHINE</span><h3>RTX 3050 Ti Laptop</h3><b>4 GB VRAM · 15.8 GB RAM</b><p>The machine can inspect and edit GLB assets well. Current official open 3D generators exceed the comfortable generation envelope.</p></article><article><span>NEAREST EXPERIMENT</span><h3>Hunyuan3D-2mini</h3><b>Low-VRAM mode exists; official shape guidance is 6 GB</b><p>Possible only as a constrained experiment with aggressive offload. Texture generation is not a credible local promise on this GPU.</p></article><article><span>CPU FALLBACK</span><h3>Stable Fast 3D</h3><b>CPU backend available · slow</b><p>Useful only for a deliberate test. Its default GPU path uses about 6 GB VRAM, so Motion Dungeon should not install weights until Drew chooses that trade.</p></article><article><span>RULED OUT HERE</span><h3>TRELLIS</h3><b>Official minimum: 16 GB NVIDIA VRAM</b><p>Keep TRELLIS on a remote GPU lane. The laptop is a viewer, editor, and evidence station—not the furnace for this model.</p></article></div>}
    </section>
    <footer className="sherman-footer"><span className="status-light"/> <b>{status}</b><span>Candidate work · no artistic acceptance inferred</span></footer>
  </main>;
}
