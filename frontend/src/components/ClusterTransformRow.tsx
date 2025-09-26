import React from "react";
import { TransformInfo } from "../types";
import { describeTransformState } from "../utils/transform";
import { StatusPill } from "./StatusPill";

type ClusterTransformRowProps = {
  transform: TransformInfo;
  onView: (id: string) => void;
};

export const ClusterTransformRow: React.FC<ClusterTransformRowProps> = ({ transform, onView }) => {
  const stateMeta = describeTransformState(transform.state);
  const checkpointLabel =
    typeof transform.checkpoint === "number" ? `checkpoint ${transform.checkpoint}` : null;

  return (
    <div className="row">
      <div>
        <div>
          <strong>{transform.id}</strong>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          managed: {transform.tracked ? "tracked" : "untracked"}
        </div>
      </div>
      <div className="btn-row">
        <StatusPill tone={stateMeta.tone}>{stateMeta.label}</StatusPill>
        <span className={`pill ${transform.tracked ? "ok" : "bad"}`}>
          {transform.tracked ? "Tracked" : "Untracked"}
        </span>
        {checkpointLabel && <span className="pill">{checkpointLabel}</span>}
        <button
          title="View this transform definition directly from the cluster"
          onClick={() => onView(transform.id)}
        >
          View
        </button>
      </div>
    </div>
  );
};