import crypto from "crypto";

export function computeCv(cr: number, cd: number): number {
  return 2 * cr + cd;
}

export function makeBuildHash(payload: unknown): string {
  const json = JSON.stringify(payload);
  return crypto.createHash("sha256").update(json).digest("hex");
}


