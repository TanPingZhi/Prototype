import React from "react";
import { OperationOutput } from "../types";

type DetailsPanelProps = {
  operationOutput: OperationOutput | null;
  schema: unknown;
  transform: unknown;
  onClear: () => void;
  format: (value: unknown) => string;
};

export const DetailsPanel: React.FC<DetailsPanelProps> = ({
  operationOutput,
  schema,
  transform,
  onClear,
  format,
}) => {
  if (!operationOutput && !schema && !transform) {
    return null;
  }

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h2>Details</h2>
      <div className="section">
        {operationOutput && (
          <>
            <div className="muted">{operationOutput.label} response</div>
            <pre>{format(operationOutput.body)}</pre>
          </>
        )}
        {schema && (
          <>
            <div className="muted">Target Index Mapping</div>
            <pre>{format(schema)}</pre>
          </>
        )}
        {transform && (
          <>
            <div className="muted">Transform Definition</div>
            <pre>{format(transform)}</pre>
          </>
        )}
        <div className="btn-row">
          <button title="Clear the details panel" onClick={onClear}>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};