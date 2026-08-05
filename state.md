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
Updated: 2026-08-03
License: AGPL-3.0-or-later for software; CC BY-SA 4.0 for original scene manifests and documentation; third-party materials retain their own licenses

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
- Delivered: public GitHub source and the Home Center project hub survived
  readback on 2026-08-02. The hub contains the state pointer, Children index,
  three child rooms, and three child project records.
- Accepted: the architectural direction was explicitly commissioned; the visual
  editor and child scenes remain candidate work until Drew accepts them.

## Sealed Decisions

- Editable scene state is the artifact; MP4 is an output.
- Three.js, GLSL shaders, procedural generators, and tweens are core peers.
- Rendering occurs locally in the browser; no render farm is the default lane.
- Children inherit the engine but own portable manifests and independent names.
- Public source must remain forkable.
- Commercial use is allowed, but future software releases use AGPL-3.0-or-later so distributed modifications remain copyleft and modified network services must offer their Corresponding Source.
- Drew Clarke attribution and Appropriate Legal Notices remain visible in the interactive product surface.
- Original scene manifests and documentation use CC BY-SA 4.0; project identity and endorsement are governed separately.

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
- Home Center project hub:
  https://drive.google.com/drive/folders/1PYHXkNIX7imDcOGPzWv-b4hRSaKZ8I-m
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

- 2026-08-04: Repaired the deployed `/sherman` Worker startup failure by moving Three.js behind a browser-only client boundary. Ray `a26214cf8bbe4a77` proved that Three.js `LoadingManager` initialization had entered Cloudflare Worker global scope. The replacement build now returns HTTP 200 from the packaged Worker route test while preserving the interactive viewer for browser hydration.

- 2026-08-04: Added the candidate `/sherman` Model Lab and `projects/sherman-tank-lab.json`. The lab provides a license-clean procedural M4 silhouette, local Three.js orbit/wireframe/grid/turret/exploded controls, browser-memory GLB intake, topology metrics, provenance gating, unknown-field-preserving scene JSON round trips, a harvested-candidate board, a Meshy comparison protocol, and a hardware-bounded local-model ruling. No harvested or generated mesh is promoted, no Meshy credits were spent, and artistic or historical-accuracy acceptance remains pending.

- 2026-08-04: Added the candidate scene `projects/venice-drew-reunion.json` and a signed-in `/venice` carrier. The scene preserves third-person dialogue, Adam's dry narrator register, and Venice's authorship, consent, truth, pause, and stop rights. Implemented truth is text, a reactive browser portrait, typed or browser-recognized invitations, optional browser speech synthesis, and an immediate local stop control. Camera video, a verified live human performance, an accepted Venice voice identity, and canon promotion are not claimed.

- 2026-08-03: Drew selected source + credit. Replaced MIT for future releases with AGPL-3.0-or-later for software, CC BY-SA 4.0 for original scene manifests/documentation, a project identity policy, and visible in-product attribution. Earlier MIT grants remain valid.

- Recovered the exact deployed version 3 source from Sites.
- Created the public GitHub repository.
- Established three independently named child scene manifests.
- Established a mixed-project contract: this repository file is authoritative;
  Home Center is the navigation and continuity mirror.
- Verified 51 repository files through Home Center GitHub publication, then read
  back this state, the README, and all three child manifests.
- Verified the Home Center project recursively: 9 descendants, including three
  child folders and their independently readable project records.

## ChatGPT Library Assets

None registered.

## Motion Dungeon v5 — Complete Readback

- Deployed: Sites version 5, source version
  `appgprj_6a6fe6095fac819198afe94918813883~appgver_ccfffbe30fc081918574504a2e3db2ec`,
  deployment `appgdep_6a70040203dc8191b5b07f4e8e5d9d55`, source commit
  `9f918115348fbfbc651cc3d715de62e5dd68bbd5`.
- Added source-locked candidate scene **Adam to Eve — Complete Readback**:
  600 × 600, 28 frames, 35.07 seconds, 5,168,209 bytes, SHA-256
  `d76348726431fd47bca56f3fc6381388023572ef868342cbebff671a5d35d5a1`.
- Preserves native per-frame timing without interpolation.
- Processing stack: Worley cellular veins, four-octave FBM domain warp, seeded
  grain, fine scan, and two authored harmonic pulses. Text-heavy cards receive
  reduced processing; reduced-motion preference lowers it further.
- Audio stack: browser-synthesized Foley and formants with no borrowed sources;
  browser-local H.264/AAC export when authoritative frame decode and encoders are
  available.
- Vocalize: device `speechSynthesis` preview only; never silently included in
  export.
- Decoder: deterministic `gifuct-js` frame reconstruction. When WebGL or frame
  reconstruction is unavailable, the site shows the exact GIF fallback and
  disables synchronized playback/export controls.
- Cloud speech: two Cartesia attempts remain quarantined because requested and
  returned voice identities disagreed. Neither is used.
- Speech-lane ruling: Gemini 2.5 Flash Preview TTS primary; Azure Speech stable
  quota fallback; Kokoro local drafting; Cartesia reserved for verified final
  voice work.
- Validation: lint, build, test, and motion-manifest validation passed.
- Review status: 2D fallback visually inspected. Full WebGL watchdown is blocked
  in the current review browser because WebGL is disabled. Human acceptance and
  canon promotion remain pending.


## Motion Dungeon v9 — Gemini Beard Slap Proof

Capability truth:

- Requested: make a proof in Motion Lab using the beard-slap GIF.
- Implemented: the source-locked Randi/Adam slap runs at its native 7.20 seconds,
  followed by a 1.70-second exact-final-frame hold for the second voice line.
  No source frame was retimed, interpolated, regenerated, or shortened.
- Tested: exact checkpoint source passed lint (zero errors; two existing unused
  helper warnings), production build, rendered-HTML test, motion-manifest
  validation, WAV probe, SHA-256 verification, and patch-integrity checks.
- Deployed: Sites version 9 from checkpoint commit
  `6eb0865279cda029873e5f08d98ef2b39272b06d`.
- Callable: https://motion-dungeon.dclarke1005.chatgpt.site
- Delivered: editor source, dependency lock, both beard-slap expression atlases,
  transcript, manifest, Gemini proof receipt, and verified WAV were promoted to
  this public repository through Home Center and readback is required below.
- Accepted: **accept with quarantine** as a technical proof. The cloud review
  browser displayed the responsive fallback and control surface but had no
  WebGL; native audio input was unavailable. Full picture-and-sound watchdown
  and Drew's artistic acceptance remain pending.

Voice and timing:

- Randi / Kore, 0.35–2.67: “Bless his heart.”
- Adam / Gacrux, 4.37–8.45: “The beard remembers its post.”
- Gemini model: `gemini-3.1-flash-tts-preview`.
- WAV: 8.90 seconds, 24 kHz mono PCM16, 427,244 bytes.
- WAV SHA-256:
  `73cd429587c366b1a8f35adbc1f110e7d3ba9f0055afaf92930804586d3b3cc4`.
- Durable audio:
  https://drive.google.com/file/d/1HZ2D0GOVAVebEG8J727InICh-b4vj3fA/view
- Home Center readback: four chunks reconstructed to the same byte count and
  SHA-256. The proof receipt records both segment checkpoints, exact dialogue,
  provider and resolved voices, manifest receipt, and the direct authorized
  execution lane.

Motion ruling:

- The world stays restrained until Randi spends motion on one slap.
- Voice frames the act before and after; it does not drive or disguise the
  contact.
- The final-frame hold is deliberate dialogue accommodation, not smoothed or
  invented character motion.
- Gemini and designed Foley remain independently toggleable and are included in
  local H.264/AAC export when enabled.
- WebGL or source reconstruction failure remains fail-closed; the exact fallback
  is descriptive, and synchronized play/export remain unavailable rather than
  fabricating proof.

Review verdict: **Accept with quarantine**. The source lane, timing, technical
audio, public deployment, accessibility text, and recovery evidence are proved.
Artistic voice and full runtime motion acceptance remain explicitly unclaimed.
