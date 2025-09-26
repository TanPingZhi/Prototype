import React, { useEffect, useState } from "react";

type Workflow = { id: string; destinationIndex: string; transformId: string };

type TransformInfo = {
  id: string;
  tracked: boolean;
  state?: string;
  checkpoint?: number | null;
};

type ESListResponse = { transforms?: Array<any> };

type OperationOutput = { label: string; body: unknown };

const POLL_INTERVAL_MS = 5000;

const json = (value: unknown) => JSON.stringify(value, null, 2);
const errString = (error: unknown) => (error instanceof Error ? error.message : String(error));

const describeTransformState = (raw?: string) => {
  if (!raw) {
    return { label: "unknown", tone: "warn" } as const;
  }
  const value = raw.toLowerCase();
  if (["started", "indexing", "running"].includes(value)) {
    return { label: value, tone: "ok" } as const;
  }
  if (["stopped", "failed", "aborted"].includes(value)) {
    return { label: value, tone: "bad" } as const;
  }
  if (["stopping", "stopping_early", "aborting", "starting"].includes(value)) {
    return { label: value, tone: "warn" } as const;
  }
  return { label: value, tone: "warn" } as const;
};

export default function App() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [esTransforms, setEsTransforms] = useState<TransformInfo[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<any | null>(null);
  const [selectedTransform, setSelectedTransform] = useState<any | null>(null);
  const [operationOutput, setOperationOutput] = useState<OperationOutput | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        const response = await fetch("/api/workflows", {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) {
          throw new Error(`${response.status}`);
        }
        const body = await response.json();
        if (!Array.isArray(body)) {
          throw new Error("unexpected payload");
        }
        setWorkflows(body);
      } catch (error) {
        setWorkflows([]);
        setMessage(`GET /api/workflows -> ${errString(error)}`);
      }
    };

    loadWorkflows();
  }, []);

  useEffect(() => {
    let active = true;

    const fetchTransforms = async () => {
      const headers = { Accept: "application/json" };
      const trackedSet = new Set(workflows.map((workflow) => workflow.transformId));
      try {
        const response = await fetch("/es/_transform", { headers });
        if (!response.ok) {
          throw new Error(`${response.status}`);
        }
        const body: ESListResponse = await response.json();
        const definitions = Array.isArray(body.transforms) ? body.transforms : [];

        const statsMap = new Map<string, { state?: string; checkpoint?: number | null }>();
        try {
          const statsResponse = await fetch("/es/_transform/_stats", { headers });
          if (statsResponse.ok) {
            const statsBody = await statsResponse.json();
            const statsEntries = Array.isArray(statsBody.transforms) ? statsBody.transforms : [];
            for (const entry of statsEntries) {
              const stateObj = entry.state ?? {};
              const taskState = typeof stateObj.task_state === "string" ? stateObj.task_state : undefined;
              const indexerState = typeof stateObj.indexer_state === "string" ? stateObj.indexer_state : undefined;
              let checkpoint: number | null = null;
              if (typeof stateObj.checkpoint === "number") {
                checkpoint = stateObj.checkpoint;
              } else if (entry.checkpointing?.last?.checkpoint != null) {
                checkpoint = entry.checkpointing.last.checkpoint;
              }
              statsMap.set(entry.id, {
                state: taskState ?? indexerState,
                checkpoint,
              });
            }
          } else {
            console.warn(`GET /es/_transform/_stats -> ${statsResponse.status}`);
          }
        } catch (statsError) {
          console.warn("Failed to fetch transform stats", statsError);
        }

        const combined: TransformInfo[] = definitions.map((definition: any) => {
          const stats = statsMap.get(definition.id);
          return {
            id: definition.id,
            tracked: trackedSet.has(definition.id),
            state: stats?.state,
            checkpoint: stats?.checkpoint ?? null,
          };
        });

        if (!active) {
          return;
        }
        setEsTransforms(combined);
      } catch (error) {
        if (!active) {
          return;
        }
        setEsTransforms([]);
        console.warn("GET /es/_transform ->", error);
      }
    };

    fetchTransforms();
    const intervalId = setInterval(fetchTransforms, POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [workflows]);

  const clearAllDetails = () => {
    setSelectedSchema(null);
    setSelectedTransform(null);
    setOperationOutput(null);
  };

  const runOp = async (path: string, method: "PUT" | "POST" = "POST") => {
    const label = `${method} ${path}`;
    setLoading(label);
    setMessage(null);
    const previewRequested = path.endsWith("/transform/preview");
    if (previewRequested) {
      clearAllDetails();
    }
    try {
      const response = await fetch(`/api${path}`, {
        method,
        headers: { Accept: "application/json" },
      });
      const body = await response.json().catch(() => ({}));
      if (previewRequested) {
        setOperationOutput({ label, body });
      } else {
        setOperationOutput(null);
      }
      setMessage(`${label} -> ${response.status}`);
    } catch (error) {
      setMessage(`${label} failed -> ${errString(error)}`);
    } finally {
      setLoading(null);
    }
  };

  const viewSchemaForWorkflow = async (workflow: Workflow) => {
    clearAllDetails();
    setMessage(`Loading schema for ${workflow.id}...`);
    try {
      const liveResponse = await fetch(`/es/${encodeURIComponent(workflow.destinationIndex)}/_mapping`, {
        headers: { Accept: "application/json" },
      });
      if (liveResponse.ok) {
        setSelectedSchema(await liveResponse.json());
        setMessage(`Loaded cluster mapping for ${workflow.destinationIndex}`);
        return;
      }
      if (liveResponse.status !== 404) {
        throw new Error(`${liveResponse.status}`);
      }

      const codeResponse = await fetch(`/api/workflows/${encodeURIComponent(workflow.id)}/schema`, {
        headers: { Accept: "application/json" },
      });
      if (!codeResponse.ok) {
        throw new Error(`${codeResponse.status}`);
      }
      setSelectedSchema(await codeResponse.json());
      setMessage(`Index ${workflow.destinationIndex} missing -> showing workflow schema definition`);
    } catch (error) {
      setMessage(`View schema for ${workflow.id} -> ${errString(error)}`);
    }
  };

  const viewTransformForWorkflow = async (workflow: Workflow) => {
    clearAllDetails();
    setMessage(`Loading transform for ${workflow.id}...`);
    try {
      const liveResponse = await fetch(`/es/_transform/${encodeURIComponent(workflow.transformId)}`, {
        headers: { Accept: "application/json" },
      });
      if (liveResponse.ok) {
        setSelectedTransform(await liveResponse.json());
        setMessage(`Loaded cluster transform ${workflow.transformId}`);
        return;
      }
      if (liveResponse.status !== 404) {
        throw new Error(`${liveResponse.status}`);
      }

      const codeResponse = await fetch(`/api/workflows/${encodeURIComponent(workflow.id)}/transform`, {
        headers: { Accept: "application/json" },
      });
      if (!codeResponse.ok) {
        throw new Error(`${codeResponse.status}`);
      }
      setSelectedTransform(await codeResponse.json());
      setMessage(`Transform ${workflow.transformId} missing -> showing workflow definition`);
    } catch (error) {
      setMessage(`View transform for ${workflow.id} -> ${errString(error)}`);
    }
  };

  const viewClusterTransform = async (transformId: string) => {
    clearAllDetails();
    setMessage(`Loading transform ${transformId}...`);
    try {
      const response = await fetch(`/es/_transform/${encodeURIComponent(transformId)}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`${response.status}`);
      }
      setSelectedTransform(await response.json());
      setMessage(`Loaded cluster transform ${transformId}`);
    } catch (error) {
      setMessage(`View transform ${transformId} -> ${errString(error)}`);
    }
  };

  const clearDetails = () => {
    clearAllDetails();
    setMessage(null);
  };

  const untrackedTransforms = esTransforms.filter((transform) => !transform.tracked);

  return (
    <>
      <header>
        <div>
          <strong>ES Manager UI</strong>
        </div>
        <div className="muted">
          Backend: <span className="kbd">/api</span> • Elastic: <span className="kbd">/es</span>
        </div>
      </header>

      <div className="container">
        {message && (
          <div className="section">
            <span className="pill warn">{message}</span>
          </div>
        )}
        {loading && (
          <div className="section">
            <span className="pill ok">{loading}</span>
          </div>
        )}

        <div className="grid">
          <div className="card">
            <h2>Tracked Workflows</h2>
            <div className="section">
              {workflows.length === 0 && <div className="muted">No workflows discovered.</div>}
              {workflows.map((workflow) => {
                const transformStatus = esTransforms.find(
                  (transform) => transform.id === workflow.transformId
                );
                const stateMeta = describeTransformState(transformStatus?.state);
                const checkpointLabel =
                  typeof transformStatus?.checkpoint === "number"
                    ? `checkpoint ${transformStatus.checkpoint}`
                    : null;

                return (
                  <div key={workflow.id} className="row">
                    <div>
                      <div>
                        <strong>{workflow.id}</strong>
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        transform: {workflow.transformId}
                        <br />
                        dest index: {workflow.destinationIndex}
                      </div>
                    </div>
                    <div className="btn-row">
                      <span className={`pill ${stateMeta.tone}`}>{stateMeta.label}</span>
                      {checkpointLabel && <span className="pill">{checkpointLabel}</span>}
                      <button onClick={() => runOp(`/workflows/${workflow.id}/index`, "PUT")}>
                        Apply Index
                      </button>
                      <button onClick={() => runOp(`/workflows/${workflow.id}/transform`, "PUT")}>
                        Put Transform
                      </button>
                      <button onClick={() => runOp(`/workflows/${workflow.id}/transform/preview`, "POST")}>
                        Preview
                      </button>
                      <button onClick={() => runOp(`/workflows/${workflow.id}/transform/start`, "POST")}>
                        Start
                      </button>
                      <button
                        onClick={() =>
                          runOp(`/workflows/${workflow.id}/transform/stop?waitForCompletion=true`, "POST")
                        }
                      >
                        Stop
                      </button>
                      <button onClick={() => runOp(`/workflows/${workflow.id}/transform/reset`, "POST")}>
                        Reset
                      </button>
                      <button onClick={() => viewSchemaForWorkflow(workflow)}>View Schema</button>
                      <button onClick={() => viewTransformForWorkflow(workflow)}>View Transform</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h2>Cluster Transforms</h2>
            <div className="section">
              {esTransforms.length === 0 && <div className="muted">No transforms in cluster.</div>}
              {esTransforms.map((transform) => {
                const stateMeta = describeTransformState(transform.state);
                const checkpointLabel =
                  typeof transform.checkpoint === "number"
                    ? `checkpoint ${transform.checkpoint}`
                    : null;

                return (
                  <div key={transform.id} className="row">
                    <div>
                      <div>
                        <strong>{transform.id}</strong>
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        managed: {transform.tracked ? "tracked" : "untracked"}
                      </div>
                    </div>
                    <div className="btn-row">
                      <span className={`pill ${stateMeta.tone}`}>{stateMeta.label}</span>
                      <span className={`pill ${transform.tracked ? "ok" : "bad"}`}>
                        {transform.tracked ? "Tracked" : "Untracked"}
                      </span>
                      {checkpointLabel && <span className="pill">{checkpointLabel}</span>}
                      <button onClick={() => viewClusterTransform(transform.id)}>View</button>
                    </div>
                  </div>
                );
              })}
              {untrackedTransforms.length > 0 && (
                <div className="muted" style={{ marginTop: 12 }}>
                  {untrackedTransforms.length} untracked transform(s) found.
                </div>
              )}
            </div>
          </div>
        </div>

        {(selectedSchema || selectedTransform || operationOutput) && (
          <div className="card" style={{ marginTop: 24 }}>
            <h2>Details</h2>
            <div className="section">
              {operationOutput && (
                <>
                  <div className="muted">{operationOutput.label} response</div>
                  <pre>{json(operationOutput.body)}</pre>
                </>
              )}
              {selectedSchema && (
                <>
                  <div className="muted">Target Index Mapping</div>
                  <pre>{json(selectedSchema)}</pre>
                </>
              )}
              {selectedTransform && (
                <>
                  <div className="muted">Transform Definition</div>
                  <pre>{json(selectedTransform)}</pre>
                </>
              )}
              <div className="btn-row">
                <button onClick={clearDetails}>Clear</button>
              </div>
            </div>
          </div>
        )}

        <div className="section" style={{ fontSize: 12 }}>
          Tip: View Swagger at <a href="/api/swagger-ui/index.html" target="_blank" rel="noreferrer">/api/swagger-ui</a>
        </div>
      </div>
    </>
  );
}