import { TransformStateMeta } from "../types";

export const describeTransformState = (raw?: string): TransformStateMeta => {
  if (!raw) {
    return { label: "unknown", tone: "warn" };
  }
  const value = raw.toLowerCase();
  if (["started", "indexing", "running"].includes(value)) {
    return { label: value, tone: "ok" };
  }
  if (["stopped", "failed", "aborted"].includes(value)) {
    return { label: value, tone: "bad" };
  }
  if (["stopping", "stopping_early", "aborting", "starting"].includes(value)) {
    return { label: value, tone: "warn" };
  }
  return { label: value, tone: "warn" };
};