package com.esmanager.model;

import com.fasterxml.jackson.databind.JsonNode;

public record OperationResult(String workflowId, String operation, int status, JsonNode body) {
}
