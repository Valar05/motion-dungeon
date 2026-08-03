# Motion Dungeon

**Created by Drew Clarke.** Motion Dungeon is an editable, browser-native motion studio built around Three.js, GLSL shaders, procedural effects, and explicit tween phases. MP4 is a local output; the scene and its parameters remain the artifact.

Live editor: https://motion-dungeon.dclarke1005.chatgpt.site

## Current capabilities

- live Three.js/WebGL viewport
- GLSL surface deformation and emissive shading
- procedural particles, pulse rings, glow, fog, and scanlines
- scrubbable six-second timeline with named motion phases
- adjustable intensity and time scale
- shareable scene-state URLs
- local 1280×720 H.264 MP4 export in browsers with WebCodecs support

## Children

The first child scene projects live under `projects/`:

- **Trench Kata** — load, slide, catch, drive, brake, extract
- **Signal Bloom** — cold pulse and clean loop
- **Saint Mendel** — spore, heat, and revelation

Each child owns a portable JSON manifest. Children inherit the Motion Dungeon runtime but remain independently nameable, forkable, and replaceable.

## Development

Requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Validation:

```bash
npm test
```

## Project truth

The repository-root `state.md` is authoritative. The Home Center project hub is the durable navigation mirror and must point back to that file rather than maintaining a competing state record.

## License and attribution

Commercial use is allowed.

- Software and configuration are licensed under **AGPL-3.0-or-later**.
- Original scene manifests and documentation are licensed under **CC BY-SA 4.0**.
- Original art and audio are CC BY-SA 4.0 only when the file or its accompanying record says so.
- Third-party dependencies and assets retain their own licenses.

Distributed modifications remain under the AGPL. If users interact with a modified version over a network, those users must be offered its Corresponding Source as required by AGPL section 13. Copyright and legal notices—including attribution to **Drew Clarke**—must be preserved.

See [NOTICE.md](NOTICE.md) for the exact scope and attribution form, [TRADEMARKS.md](TRADEMARKS.md) for project-identity rules, and [LICENSE](LICENSE) for the complete AGPL text.

Versions released before the licensing change on 2026-08-03 remain available under the MIT terms that accompanied those copies. New releases do not revoke rights already granted.
