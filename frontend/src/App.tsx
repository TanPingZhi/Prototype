import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ClusterTransformRow } from "./components/ClusterTransformRow";
import { DetailsPanel } from "./components/DetailsPanel";
import { WorkflowActions } from "./components/WorkflowActions";
import { ESListResponse, OperationOutput, TransformInfo, Workflow } from "./types";

const POLL_INTERVAL_MS = 5000;

const json = (value: unknown) => JSON.stringify(value, null, 2);
const errString = (error: unknown) => (error instanceof Error ? error.message : String(error));

export default function App() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [transforms, setTransforms] = useState<TransformInfo[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<unknown>(null);
  const [selectedTransform, setSelectedTransform] = useState<unknown>(null);
  const [operationOutput, setOperationOutput] = useState<OperationOutput | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const clearAllDetails = useCallback(() => {
    setSelectedSchema(null);
    setSelectedTransform(null);
    setOperationOutput(null);
  }, []);

  const clearDetails = useCallback(() => {
    clearAllDetails();
    setMessage(null);
  }, [clearAllDetails]);

  useEffect(() => {
    let cancelled = false;

    const loadWorkflows = async () => {
      try {
        const response = await fetch("/api/workflows", { headers: { Accept: "application/json" } });
        if (!response.ok) {
          throw new Error(`${response.status}`);
        }
        const body = await response.json();
        if (!Array.isArray(body)) {
          throw new Error("unexpected payload");
        }
        if (!cancelled) {
          setWorkflows(body);
        }
      } catch (error) {
        if (!cancelled) {
          setWorkflows([]);
          setMessage(`GET /api/workflows -> ${errString(error)}`);
        }
      }
    };

    loadWorkflows();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const headers = { Accept: "application/json" };

    const fetchTransforms = async () => {
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
              const stateField = entry.state;
              let overallState: string | undefined;
              let checkpoint: number | null = null;

              if (typeof stateField === "string") {
                overallState = stateField;
              } else {
                const stateObj = stateField ?? {};
                const taskState = typeof stateObj.task_state === "string" ? stateObj.task_state : undefined;
                const indexerState = typeof stateObj.indexer_state === "string" ? stateObj.indexer_state : undefined;
                overallState = taskState ?? indexerState;
                if (typeof stateObj.checkpoint === "number") {
                  checkpoint = stateObj.checkpoint;
                }
              }

              if (checkpoint === null && entry.checkpointing?.last?.checkpoint != null) {
                checkpoint = entry.checkpointing.last.checkpoint;
              }

              statsMap.set(entry.id, { state: overallState, checkpoint });
            }
          } else {
            console.warn(`GET /es/_transform/_stats -> ${statsResponse.status}`);
          }
        } catch (statsError) {
          console.warn("Failed to fetch transform stats", statsError);
        }

        if (cancelled) {
          return;
        }

        const trackedIds = new Set(workflows.map((workflow) => workflow.transformId));
        const combined: TransformInfo[] = definitions.map((definition: any) => {
          const stats = statsMap.get(definition.id);
          return {
            id: definition.id,
            tracked: trackedIds.has(definition.id),
            state: stats?.state,
            checkpoint: stats?.checkpoint ?? null,
          };
        });

        setTransforms(combined);
      } catch (error) {
        if (!cancelled) {
          setTransforms([]);
          console.warn("GET /es/_transform ->", error);
        }
      }
    };

    fetchTransforms();
    const interval = setInterval(fetchTransforms, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [workflows]);

  const runOp = useCallback(
    async (path: string, method: "PUT" | "POST" = "POST") => {
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
    },
    [clearAllDetails]
  );

  const viewSchemaForWorkflow = useCallback(
    async (workflow: Workflow) => {
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
    },
    [clearAllDetails]
  );

  const viewTransformForWorkflow = useCallback(
    async (workflow: Workflow) => {
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
    },
    [clearAllDetails]
  );

  const viewClusterTransform = useCallback(
    async (transformId: string) => {
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
    },
    [clearAllDetails]
  );

  const untrackedTransforms = useMemo(
    () => transforms.filter((transform) => !transform.tracked),
    [transforms]
  );

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
                const status = transforms.find((transform) => transform.id === workflow.transformId);
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
                    <WorkflowActions
                      workflow={workflow}
                      status={status}
                      onRun={runOp}
                      onViewSchema={viewSchemaForWorkflow}
                      onViewTransform={viewTransformForWorkflow}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h2>Cluster Transforms</h2>
            <div className="section">
              {transforms.length === 0 && <div className="muted">No transforms in cluster.</div>}
              {transforms.map((transform) => (
                <ClusterTransformRow key={transform.id} transform={transform} onView={viewClusterTransform} />
              ))}
              {untrackedTransforms.length > 0 && (
                <div className="muted" style={{ marginTop: 12 }}>
                  {untrackedTransforms.length} untracked transform(s) found.
                </div>
              )}
            </div>
          </div>
        </div>

        <DetailsPanel
          operationOutput={operationOutput}
          schema={selectedSchema}
          transform={selectedTransform}
          onClear={clearDetails}
          format={json}
        />

        <div className="section" style={{ fontSize: 12 }}>
          Tip: View Swagger at <a href="/api/swagger-ui/index.html" target="_blank" rel="noreferrer">/api/swagger-ui</a>
        </div>
      </div>
    </>
  );
}