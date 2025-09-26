import React from "react";
import { Workflow, TransformInfo } from "../types";
import { describeTransformState } from "../utils/transform";
import { StatusPill } from "./StatusPill";

type WorkflowActionsProps = {
  workflow: Workflow;
  status?: TransformInfo;
  onRun: (path: string, method?: "PUT" | "POST") => Promise<void> | void;
  onViewSchema: (workflow: Workflow) => void;
  onViewTransform: (workflow: Workflow) => void;
};

export const WorkflowActions: React.FC<WorkflowActionsProps> = ({
  workflow,
  status,
  onRun,
  onViewSchema,
  onViewTransform,
}) => {
  const stateMeta = describeTransformState(status?.state);
  const checkpointLabel =
    typeof status?.checkpoint === "number" ? `checkpoint ${status.checkpoint}` : null;

  const run = (suffix: string, method: "PUT" | "POST" = "POST") =>
    onRun(`/workflows/${workflow.id}${suffix}`, method);

  return (
    <div className="btn-row">
      <StatusPill tone={stateMeta.tone}>{stateMeta.label}</StatusPill>
      {checkpointLabel && <span className="pill">{checkpointLabel}</span>}
      <button
        title="Create or update the destination index schema from this workflow"
        onClick={() => run("/index", "PUT")}
      >
        Apply Index
      </button>
      <button
        title="Create or update the transform definition in Elasticsearch"
        onClick={() => run("/transform", "PUT")}
      >
        Put Transform
      </button>
      <button
        title="Preview the transform output without writing data"
        onClick={() => run("/transform/preview")}
      >
        Preview
      </button>
      <button title="Start the transform task" onClick={() => run("/transform/start")}>
        Start
      </button>
      <button
        title="Stop the transform after the current checkpoint completes"
        onClick={() => run("/transform/stop?waitForCompletion=true")}
      >
        Stop
      </button>
      <button
        title="Reset transform progress (does not delete the destination index)"
        onClick={() => run("/transform/reset")}
      >
        Reset
      </button>
      <button
        title="View the target index schema (live mapping or workflow definition)"
        onClick={() => onViewSchema(workflow)}
      >
        View Schema
      </button>
      <button
        title="View the transform definition (cluster or workflow version)"
        onClick={() => onViewTransform(workflow)}
      >
        View Transform
      </button>
    </div>
  );
};