package com.esmanager.model;

import com.fasterxml.jackson.databind.JsonNode;

public record ApiErrorResponse(String message, String workflowId, String operation, int status, JsonNode details) {
}
