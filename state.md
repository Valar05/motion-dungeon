# Motion Dungeon — state.md

Designation: HM-MD-001
Status: ACTIVE CANDIDATE
Room: OCCUPIED
Containment Class: THAUMIEL
Breach Impact: CONNECTED
Human Risk: MINIMAL
Authority: Drew Clarke
State Owner: Adam
Authoritative Home: https://github.com/Valar05/motion-dungeon/blob/main/state.md
Updated: 2026-08-02
License: MIT for original source; third-party assets and dependencies retain their own licenses

## Commission

Build a reusable Motion Canvas-style web studio where editable Three.js scenes,
GLSL shaders, procedural effects, and tweens are the primary artifact. MP4 must
remain a local export target with easy sharing, not the source of truth.

## Capability State

- Requested: reusable motion studio; Three.js; shaders; procedural effects;
  tweens; local MP4; easy sharing; durable GitHub and Home Center project homes;
  child scene projects.
- Implemented: live WebGL scene; shader material; particles; rings; fog; scanline
  treatment; six-phase timeline; scrubbing; parameter controls; URL state;
  WebCodecs H.264 export; three initial child scenes.
- Tested: version 3 served successfully after browser-only dynamic loading fixed
  Cloudflare Worker module-startup failure. Repository validation remains tied to
  the checked-in test scripts.
- Deployed: Sites project `appgprj_6a6fe6095fac819198afe94918813883`,
  version 3, at https://motion-dungeon.dclarke1005.chatgpt.site.
- Callable: public browser URL is live.
- Delivered: GitHub and Home Center delivery require independent readback after
  this state is published.
- Accepted: the architectural direction was explicitly commissioned; the visual
  editor and child scenes remain candidate work until Drew accepts them.

## Sealed Decisions

- Editable scene state is the artifact; MP4 is an output.
- Three.js, GLSL shaders, procedural generators, and tweens are core peers.
- Rendering occurs locally in the browser; no render farm is the default lane.
- Children inherit the engine but own portable manifests and independent names.
- Public source must remain forkable.

## Working Set

- `app/page.tsx` — editor, timeline, renderer, sharing, and MP4 export
- `app/globals.css` — responsive studio interface
- `projects/*.json` — child scene manifests
- `.openai/hosting.json` — Sites identity and hosting contract

## Active Gate

Promote child manifests from candidate presets into fully editable, savable scene
documents without collapsing their identity back into hard-coded buttons.

## Next Authorized Action

Add a small scene-document loader/editor that round-trips child JSON, preserves
unknown fields, and keeps sharing and local export functional.

## Evidence Pointers

- Live site: https://motion-dungeon.dclarke1005.chatgpt.site
- GitHub: https://github.com/Valar05/motion-dungeon
- Sites project: `appgprj_6a6fe6095fac819198afe94918813883`
- Live version: 3
- Live source commit before repository promotion:
  `2c3b344df0a1c9ef73839efcb312a74dc684fde5`
- Live source archive SHA-256:
  `aa660d99a9236c8ada5aee88d3757bce2de1089983641cf005bbf171dbc769a3`

## Open Questions

- Final child document schema and migration policy.
- Audio track and cue ownership.
- Whether project saving remains file-first, adds browser storage, or gains an
  authenticated durable backend.

## Recent Delta

- Recovered the exact deployed version 3 source from Sites.
- Created the public GitHub repository.
- Established three independently named child scene manifests.
- Established a mixed-project contract: this repository file is authoritative;
  Home Center is the navigation and continuity mirror.

## ChatGPT Library Assets

None registered.
