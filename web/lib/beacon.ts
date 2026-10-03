// lib/beacon.ts
// Rotating beacon code (like an authenticator-app code).
// The code is derived from the session's secret + the current 30-second step,
// so it can't be guessed or reused later.
import { createHmac, timingSafeEqual } from "crypto";

export const BEACON_STEP_SECONDS = 30;

const stepOf = (nowMs: number) => Math.floor(nowMs / 1000 / BEACON_STEP_SECONDS);

function codeForStep(secret: string, step: number) {
  const hash = createHmac("sha256", secret).update(String(step)).digest();
  return (hash.readUInt32BE(0) % 1_000_000).toString().padStart(6, "0");
}

// What the lecturer's beacon should broadcast right now
export function generateBeaconCode(secret: string, nowMs = Date.now()) {
  const step = stepOf(nowMs);
  return {
    code: codeForStep(secret, step),
    expiresInSec: (step + 1) * BEACON_STEP_SECONDS - Math.floor(nowMs / 1000),
  };
}

// Accepts the current step and the previous one (covers scan/network delay),
// so a code is valid for 30-60 seconds.
export function verifyBeaconCode(secret: string, code: string, nowMs = Date.now()) {
  const step = stepOf(nowMs);
  const given = Buffer.from(code);
  return [step, step - 1].some((s) => {
    const expected = Buffer.from(codeForStep(secret, s));
    return expected.length === given.length && timingSafeEqual(expected, given);
  });
}
