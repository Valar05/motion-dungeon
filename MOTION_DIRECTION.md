# Motion Dungeon — Motion Direction Adapter

Status: ACTIVE ADAPTER
Canonical doctrine: `Valar05/home-center/skills/motion-direction/SKILL.md`
Adopted from Home Center commit: `325cd3a87cf1bbdce9ec62f53a87251cbf1adb0c`

## Role

Motion Dungeon compiles editable animation state into browser playback and media. It does not decide source authority by accident.

Canonical compile input is conceptually:

```text
POSE MASTER
+ DIRECTION PROFILE
+ VISUAL PROFILE / CLEAN CANONICAL ASSET REFERENCES
+ CONTACT MAP
+ SOURCE-ROLE / PROVENANCE LEDGER
+ QUARANTINE LEDGER
-> EDITABLE MOTION DUNGEON STATE
-> PLAYBACK / VIDEO OUTPUT
```

The runtime may realize that state with Three.js, SVG/vector geometry, GLSL/vector shaders, procedural effects, state replacement, and tweens.

## Performance-reference default

When Drew supplies a video of himself performing an action and asks Motion Dungeon to make an animation:

`source_roles = [POSE_REFERENCE, CONTACT_REFERENCE]`

unless the commission explicitly assigns timing authority.

Preserve decisive poses, contact, load, pose order, and physical intent. Source frame/time may remain a pose address. Do not copy recording timing by default.

The direction profile owns timing, spacing, anticipation, holds, acceleration, overshoot, recoil, follow-through, recovery, settle, lag, smears/state substitutions, camera behavior, and style-specific exaggeration.

`DREW GIVES POSES -> WORKER DIRECTS ANIMATION`

## Vector-first rule

Use Vector Noodle first when full-arm silhouette, occlusion, first-person anatomy, canonical vector language, continuous transforms, tween-heavy 2.5D motion, or shader response are load-bearing.

ASCII/UAPL is optional. Use it when abstraction helps rather than because an old contract demanded it.

Small complex forms may use state replacement; load-bearing anatomy may not disappear.

For a first-person single-arm load-bearing action, preserve enough chain to explain force:

`screen edge/root implication -> upper arm -> elbow -> forearm -> wrist -> hand -> contact`

Floating hands are invalid.

## Props

Props are commission-bound, not conversation-sticky.

A previous shovel discussion does not put a shovel in an arm animation.

Before rendering an identified prop, recover the current clean source and inspect silhouette, proportions, components, grip point, and orientation. A generic category approximation is invalid when identity matters.

## Visual canon / quarantine

The runtime receives clean canonical visual references separately from motion evidence.

Rejected/quarantined imagery is negative evidence only. Do not reuse its silhouette, proportions, palette, line treatment, motifs, prop design, UI/art shell, or derived placeholder imagery.

Quarantine is transitive.

A neutral direction profile does not authorize a neutral placeholder art style when canonical Vector Noodle art is required.

## Game-style retarget

A game reference normally enters as `STYLE_REFERENCE`.

It may change timing, spacing, anticipation, hit emphasis, recoil/recovery, pose exaggeration, smear/substitution behavior, camera response, hand/weapon lag, secondary motion, and presentation rhythm.

Do not merely repaint the pose master while preserving source-video timing.

## Review gate

Before promotion, inspect actual pixels and playback for:

1. decisive-pose readability and complete load chain;
2. grip/support/contact/occlusion;
3. timing/spacing/force transfer/recovery;
4. canonical visual lineage with zero quarantine leak;
5. correct prop silhouette/proportions for every included identified object;
6. stale nouns/assets/UI from previous work that lack current commission authority.

A running page and valid hashes cannot prove any of those visual facts.

## Current negative fixture

`examples/fp-shovel/` is rejected and quarantined. See `examples/fp-shovel/REJECTED.md`.

It may be used only to test that the new doctrine prevents the same failures.
