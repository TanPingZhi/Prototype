import React, { useEffect, useMemo, useState } from "react";

type Workflow = { id: string; destinationIndex: string; transformId: string };

type TransformInfo = { id: string; tracked: boolean };

type ESListResponse = { count?: number; transforms?: Array<any> };

const json = (v: any) => JSON.stringify(v, null, 2);

export default function App() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [esTransforms, setEsTransforms] = useState<TransformInfo[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<any | null>(null);
  const [selectedTransform, setSelectedTransform] = useState<any | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const trackedTransformIds = useMemo(
    () => new Set(workflows.map((w) => w.transformId)),
    [workflows]
  );

  useEffect(() => {
    const run = async () => {
      try {
        const r = await fetch("/api/workflows", { headers: { Accept: "application/json" } });
        if (!r.ok) throw new Error(`${r.status}`);
        const data = await r.json();
        if (Array.isArray(data)) {
          setWorkflows(data);
        } else {
          setMessage("GET /api/workflows -> non-array response");
          setWorkflows([]);
        }
      } catch (e: any) {
        setMessage(`GET /api/workflows -> ${e?.message ?? e}`);
        setWorkflows([]);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const r = await fetch("/es/_transform", { headers: { Accept: "application/json" } });
        if (!r.ok) throw new Error(`${r.status}`);
        const data: ESListResponse = await r.json();
        const list = Array.isArray(data.transforms) ? data.transforms : [];
        const items: TransformInfo[] = list.map((t: any) => ({
          id: t.id,
          tracked: trackedTransformIds.has(t.id),
        }));
        setEsTransforms(items);
      } catch (e: any) {
        setMessage(`GET /es/_transform -> ${e?.message ?? e}`);
        setEsTransforms([]);
      }
    };
    run();
  }, [trackedTransformIds]);

  const untracked = esTransforms.filter((t) => !t.tracked);

  const runOp = async (
    path: string,
    method: "PUT" | "POST" = "POST"
  ): Promise<void> => {
    setLoading(`${method} ${path}`);
    setMessage(null);
    try {
      const res = await fetch(`/api${path}`, { method, headers: { Accept: "application/json" } });
      const body = await res.json().catch(() => ({}));
      setMessage(`${method} ${path} -> ${res.status}`);
      console.log("operation", body);
    } catch (e: any) {
      setMessage(`${method} ${path} failed: ${e?.message ?? e}`);
    } finally {
      setLoading(null);
    }
  };

    const viewSchemaForWorkflow = async (w: Workflow) => { setSelectedTransform(null); setSelectedSchema(null); try { const res = await fetch(`/es/${encodeURIComponent(w.destinationIndex)}/_mapping`, { headers: { Accept: "application/json" } }); if (res.ok) { setSelectedSchema(await res.json()); return; } if (res.status === 404) { const r2 = await fetch(`/api/workflows/${encodeURIComponent(w.id)}/schema`, { headers: { Accept: "application/json" } }); if (r2.ok) { setSelectedSchema(await r2.json()); setMessage(`Index ${w.destinationIndex} not found -> showing code-defined schema`); return; } throw new Error(`${r2.status}`); } throw new Error(`${res.status}`); } catch (e) { setMessage(`View schema for ${w.id} -> ${e}` as any); } };

    const viewTransformForWorkflow = async (w: Workflow) => { setSelectedTransform(null); setSelectedSchema(null); try { const res = await fetch(`/es/_transform/${encodeURIComponent(w.transformId)}`, { headers: { Accept: "application/json" } }); if (res.ok) { setSelectedTransform(await res.json()); return; } if (res.status === 404) { const r2 = await fetch(`/api/workflows/${encodeURIComponent(w.id)}/transform`, { headers: { Accept: "application/json" } }); if (r2.ok) { setSelectedTransform(await r2.json()); setMessage(`Transform ${w.transformId} not found -> showing code-defined transform`); return; } throw new Error(`${r2.status}`); } throw new Error(`${res.status}`); } catch (e) { setMessage(`View transform for ${w.id} -> ${e}` as any); } };

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
        {message && <div className="section"><span className="pill warn">{message}</span></div>}
        {loading && <div className="section"><span className="pill ok">{loading}</span></div>}

        <div className="grid">
          <div className="card">
            <h2>Tracked Workflows</h2>
            <div className="section">
              {workflows.length === 0 && (
                <div className="muted">No workflows discovered.</div>
              )}
              {workflows.map((w) => (
                <div key={w.id} className="row">
                  <div>
                    <div>
                      <strong>{w.id}</strong>
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      transform: {w.transformId}
                      <br />
                      dest index: {w.destinationIndex}
                    </div>
                  </div>
                  <div className="btn-row">
                    <button onClick={() => runOp(`/workflows/${w.id}/index`, "PUT")}>Apply Index</button>
                    <button onClick={() => runOp(`/workflows/${w.id}/transform`, "PUT")}>Put Transform</button>
                    <button onClick={() => runOp(`/workflows/${w.id}/transform/preview`, "POST")}>Preview</button>
                    <button onClick={() => runOp(`/workflows/${w.id}/transform/start`, "POST")}>Start</button>
                    <button onClick={() => runOp(`/workflows/${w.id}/transform/stop?waitForCompletion=true`, "POST")}>Stop</button>
                    <button onClick={() => runOp(`/workflows/${w.id}/transform/reset`, "POST")}>Reset</button>
                    <button onClick={() => viewSchemaForWorkflow(w)}>View Schema</button>
                    <button onClick={() => viewTransformForWorkflow(w)}>View Transform</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Cluster Transforms</h2>
            <div className="section">
              {esTransforms.length === 0 && (
                <div className="muted">No transforms in cluster.</div>
              )}

              {esTransforms.map((t) => (
                <div key={t.id} className="row">
                  <div>
                    <div>
                      <strong>{t.id}</strong>
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      status: {t.tracked ? "tracked" : "untracked"}
                    </div>
                  </div>
                  <div className="btn-row">
                    <span className={`pill ${t.tracked ? "ok" : "bad"}`}>
                      {t.tracked ? "Tracked" : "Untracked"}
                    </span>
                    <button onClick={() => viewTransform(t.id)}>View</button>
                  </div>
                </div>
              ))}

              {untracked.length > 0 && (
                <div className="muted" style={{ marginTop: 12 }}>
                  {untracked.length} untracked transform(s) found.
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
                <button onClick={() => { setSelectedSchema(null); setSelectedTransform(null); }}>Clear</button>
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