import React, { useEffect, useMemo, useState } from "react";

type Workflow = { id: string; destinationIndex: string; transformId: string };

type TransformInfo = { id: string; tracked: boolean };

type ESListResponse = { transforms?: Array<any> };

const json = (value: unknown) => JSON.stringify(value, null, 2);
const errString = (error: unknown) => (error instanceof Error ? error.message : String(error));

export default function App() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [esTransforms, setEsTransforms] = useState<TransformInfo[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<any | null>(null);
  const [selectedTransform, setSelectedTransform] = useState<any | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const trackedTransformIds = useMemo(
    () => new Set(workflows.map((workflow) => workflow.transformId)),
    [workflows]
  );

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
    const loadTransforms = async () => {
      try {
        const response = await fetch("/es/_transform", {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) {
          throw new Error(`${response.status}`);
        }
        const body: ESListResponse = await response.json();
        const transforms = Array.isArray(body.transforms) ? body.transforms : [];
        setEsTransforms(
          transforms.map((entry: any) => ({
            id: entry.id,
            tracked: trackedTransformIds.has(entry.id),
          }))
        );
      } catch (error) {
        setEsTransforms([]);
        setMessage(`GET /es/_transform -> ${errString(error)}`);
      }
    };

    loadTransforms();
  }, [trackedTransformIds]);

  const runOp = async (path: string, method: "PUT" | "POST" = "POST") => {
    const label = `${method} ${path}`;
    setLoading(label);
    setMessage(null);
    try {
      const response = await fetch(`/api${path}`, {
        method,
        headers: { Accept: "application/json" },
      });
      const body = await response.json().catch(() => ({}));
      console.log("operation", label, body);
      setMessage(`${label} -> ${response.status}`);
    } catch (error) {
      setMessage(`${label} failed -> ${errString(error)}`);
    } finally {
      setLoading(null);
    }
  };

  const viewSchemaForWorkflow = async (workflow: Workflow) => {
    setSelectedTransform(null);
    setSelectedSchema(null);
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
    setSelectedTransform(null);
    setSelectedSchema(null);
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
    setSelectedSchema(null);
    setSelectedTransform(null);
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
    setSelectedSchema(null);
    setSelectedTransform(null);
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
              {workflows.map((workflow) => (
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
                    <button onClick={() => runOp(`/workflows/${workflow.id}/index`, "PUT")}>Apply Index</button>
                    <button onClick={() => runOp(`/workflows/${workflow.id}/transform`, "PUT")}>Put Transform</button>
                    <button onClick={() => runOp(`/workflows/${workflow.id}/transform/preview`, "POST")}>Preview</button>
                    <button onClick={() => runOp(`/workflows/${workflow.id}/transform/start`, "POST")}>Start</button>
                    <button onClick={() => runOp(`/workflows/${workflow.id}/transform/stop?waitForCompletion=true`, "POST")}>Stop</button>
                    <button onClick={() => runOp(`/workflows/${workflow.id}/transform/reset`, "POST")}>Reset</button>
                    <button onClick={() => viewSchemaForWorkflow(workflow)}>View Schema</button>
                    <button onClick={() => viewTransformForWorkflow(workflow)}>View Transform</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Cluster Transforms</h2>
            <div className="section">
              {esTransforms.length === 0 && <div className="muted">No transforms in cluster.</div>}
              {esTransforms.map((transform) => (
                <div key={transform.id} className="row">
                  <div>
                    <div>
                      <strong>{transform.id}</strong>
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      status: {transform.tracked ? "tracked" : "untracked"}
                    </div>
                  </div>
                  <div className="btn-row">
                    <span className={`pill ${transform.tracked ? "ok" : "bad"}`}>
                      {transform.tracked ? "Tracked" : "Untracked"}
                    </span>
                    <button onClick={() => viewClusterTransform(transform.id)}>View</button>
                  </div>
                </div>
              ))}
              {untrackedTransforms.length > 0 && (
                <div className="muted" style={{ marginTop: 12 }}>
                  {untrackedTransforms.length} untracked transform(s) found.
                </div>
              )}
            </div>
          </div>
        </div>

        {(selectedSchema || selectedTransform) && (
          <div className="card" style={{ marginTop: 24 }}>
            <h2>Details</h2>
            <div className="section">
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