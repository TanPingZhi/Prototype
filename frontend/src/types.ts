export type Workflow = {
  id: string;
  destinationIndex: string;
  transformId: string;
};

export type TransformInfo = {
  id: string;
  tracked: boolean;
  state?: string;
  checkpoint?: number | null;
};

export type ESListResponse = {
  transforms?: Array<any>;
};

export type OperationOutput = {
  label: string;
  body: unknown;
};

export type Tone = "ok" | "warn" | "bad";

export type TransformStateMeta = {
  label: string;
  tone: Tone;
};