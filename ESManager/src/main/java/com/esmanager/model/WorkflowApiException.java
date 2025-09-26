package com.esmanager.model;

import com.fasterxml.jackson.databind.JsonNode;

public class WorkflowApiException extends RuntimeException {

    private final String workflowId;
    private final String operation;
    private final int status;
    private final JsonNode body;

    public WorkflowApiException(String workflowId, String operation, int status, String message, Throwable cause, JsonNode body) {
        super(message, cause);
        this.workflowId = workflowId;
        this.operation = operation;
        this.status = status;
        this.body = body;
    }

    public String getWorkflowId() {
        return workflowId;
    }

    public String getOperation() {
        return operation;
    }

    public int getStatus() {
        return status;
    }

    public JsonNode getBody() {
        return body;
    }
}
