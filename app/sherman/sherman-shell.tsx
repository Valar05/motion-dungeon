"use client";

import dynamic from "next/dynamic";

const ShermanLab = dynamic(() => import("./sherman-lab"), {
  ssr: false,
  loading: () => (
    <main className="sherman-shell" aria-busy="true">
      <p className="eyebrow">Motion Dungeon · Asset Forensics</p>
      <h1>Sherman Model Lab</h1>
      <p>Loading the browser renderer…</p>
    </main>
  ),
});

export default function ShermanShell() {
  return <ShermanLab/>;
}
