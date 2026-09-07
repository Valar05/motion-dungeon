import assert from "node:assert/strict";

/**
 * JACKIE CHAN TEMPORAL KATA — causal sampling fixture
 *
 * SOURCE OBSERVATION (Drew, preserved as source rather than worker inference):
 * Drew physically "animated in fours"; the motion was carefully exaggerated so
 * that, if discovered, its audio footprint itself provides care.
 *
 * WORKER INFERENCE:
 * - Sampling cadence follows causal bandwidth, not a global frame-rate fashion.
 * - A meaningful hold is authored state, not missing animation.
 * - Contacts/transitions may carry sparse synchronized sound so intention can be
 *   reviewed audio-only; whether that sound actually communicates care remains a
 *   human listening judgment, never a metric claim.
 *
 * Run:
 *   node scripts/jackie-chan-temporal-kata.mjs
 *
 * The script asserts the rule and emits a compact key-sheet fixture that can be
 * transcribed into stepped rig keys, sprite exposures, or Motion Dungeon phases.
 */

const FPS = 24;
const exposureByBandwidth = Object.freeze({ low: 4, medium: 2, high: 1 });

// Generic considerate door-opening action: enough contact to expose the rule,
// intentionally not a reproduction of any specific film choreography.
const beats = [
  { id: "notice", start: 0, end: 12, kind: "hold", pose: "door_closed_attention", audioCue: null },
  { id: "reach", start: 12, end: 20, kind: "change", bandwidth: "low", pose: "reach_handle", audioCue: null },
  { id: "grip", start: 20, end: 24, kind: "change", bandwidth: "medium", pose: "grip_handle", audioCue: "hand_contact" },
  { id: "latch", start: 24, end: 28, kind: "change", bandwidth: "high", pose: "release_latch", audioCue: "latch_click" },
  { id: "swing", start: 28, end: 40, kind: "change", bandwidth: "medium", pose: "open_door", audioCue: "hinge_motion" },
  { id: "clear", start: 40, end: 52, kind: "hold", pose: "hold_door_clear", audioCue: null },
  { id: "release", start: 52, end: 60, kind: "change", bandwidth: "low", pose: "release_handle", audioCue: "hand_release" },
  { id: "settle", start: 60, end: 72, kind: "hold", pose: "door_settled", audioCue: "gentle_stop" },
];

function compileKeySheet(sourceBeats) {
  const rows = [];

  for (const beat of sourceBeats) {
    assert(Number.isInteger(beat.start) && Number.isInteger(beat.end));
    assert(beat.end > beat.start, `${beat.id}: invalid frame interval`);

    if (beat.kind === "hold") {
      rows.push({
        frame: beat.start,
        beat: beat.id,
        pose: beat.pose,
        interpolation: "step",
        exposureFrames: beat.end - beat.start,
        causalBandwidth: "zero",
        audioCue: beat.audioCue,
      });
      continue;
    }

    const exposureFrames = exposureByBandwidth[beat.bandwidth];
    assert(exposureFrames, `${beat.id}: unknown causal bandwidth`);

    for (let frame = beat.start; frame < beat.end; frame += exposureFrames) {
      rows.push({
        frame,
        beat: beat.id,
        pose: beat.pose,
        interpolation: "step",
        exposureFrames: Math.min(exposureFrames, beat.end - frame),
        causalBandwidth: beat.bandwidth,
        audioCue: frame === beat.start ? beat.audioCue : null,
      });
    }
  }

  return rows;
}

function verify(sourceBeats, rows) {
  // Every changing beat obeys 1/2/4 exposure chosen from causal bandwidth.
  for (const beat of sourceBeats.filter((item) => item.kind === "change")) {
    const beatRows = rows.filter((row) => row.beat === beat.id);
    const expected = exposureByBandwidth[beat.bandwidth];
    assert(beatRows.length > 0, `${beat.id}: missing samples`);
    assert(beatRows.every((row) => row.exposureFrames <= expected));
    assert(beatRows.every((row) => row.interpolation === "step"));
  }

  // Holds are one authored pose exposure, never redundant interior keys.
  for (const beat of sourceBeats.filter((item) => item.kind === "hold")) {
    const beatRows = rows.filter((row) => row.beat === beat.id);
    assert.equal(beatRows.length, 1, `${beat.id}: hold was polluted with redundant keys`);
    assert.equal(beatRows[0].exposureFrames, beat.end - beat.start);
  }

  // Sound belongs to the causal edge. No repeated cue is smeared across exposures.
  for (const beat of sourceBeats.filter((item) => item.audioCue)) {
    const audibleRows = rows.filter((row) => row.beat === beat.id && row.audioCue);
    assert.equal(audibleRows.length, 1, `${beat.id}: audio cue must occur once`);
    assert.equal(audibleRows[0].frame, beat.start, `${beat.id}: audio cue drifted from causal edge`);
  }

  // The fixture deliberately exercises all three changing cadences plus real holds.
  assert.deepEqual(new Set(sourceBeats.filter((b) => b.kind === "change").map((b) => exposureByBandwidth[b.bandwidth])), new Set([1, 2, 4]));
  assert(sourceBeats.some((beat) => beat.kind === "hold"));
}

const keySheet = compileKeySheet(beats);
verify(beats, keySheet);

const fixture = {
  schema: "motion-dungeon.causal-temporal-kata/v1",
  fps: FPS,
  doctrine: "Sample causal change at its bandwidth; hold earned state; put sound on the causal edge.",
  sourceObservation: "Drew physically 'animated in fours'; the motion was carefully exaggerated so that, if discovered, its audio footprint itself provides care.",
  workerInference: {
    highBandwidth: "ones",
    mediumBandwidth: "twos",
    lowBandwidth: "fours",
    zeroBandwidth: "one stepped hold exposure",
    audioReviewGate: "Mute picture and listen: contacts and transitions should remain intelligible. Human judgment decides whether the footprint communicates care.",
    pictureReviewGate: "Mute audio and view silhouette/pose only: intention, contact, hold, and release should remain legible without interpolation doing the acting.",
  },
  durationFrames: beats.at(-1).end,
  durationSeconds: beats.at(-1).end / FPS,
  beats,
  keySheet,
};

console.log(JSON.stringify(fixture, null, 2));
console.error(`PASS causal temporal kata: ${keySheet.length} authored exposures across ${fixture.durationFrames} frames`);
