package com.esmanager.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.esmanager.model.OperationResult;
import com.esmanager.model.WorkflowApiException;
import com.esmanager.workflow.TransformWorkflow;
import com.esmanager.workflow.WorkflowRegistry;
import org.apache.http.util.EntityUtils;
import org.elasticsearch.client.Request;
import org.elasticsearch.client.Response;
import org.elasticsearch.client.ResponseException;
import org.elasticsearch.client.RestClient;
import org.springframework.http.HttpStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class ElasticsearchWorkflowService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final WorkflowRegistry workflowRegistry;

    public OperationResult applyDestinationIndex(String workflowId) {
        TransformWorkflow workflow = workflowRegistry.getRequired(workflowId);
        JsonNode schema = workflow.schemaJson();
        String indexPath = "/" + workflow.destinationIndex();
        try {
            Response response = performRequest("PUT", indexPath, schema);
            return toResult(workflowId, "apply-index", response);
        } catch (ResponseException responseException) {
            int statusCode = responseException.getResponse().getStatusLine().getStatusCode();
            if (statusCode == HttpStatus.BAD_REQUEST.value() || statusCode == HttpStatus.CONFLICT.value()) {
                ObjectNode resultNode = objectMapper.createObjectNode();
                resultNode.put("message", "Index already exists; attempted to update settings/mappings instead");
                int effectiveStatus = statusCode;
                JsonNode mappingsNode = schema.path("mappings");
                if (!mappingsNode.isMissingNode() && !mappingsNode.isNull()) {
                    try {
                        Response mappingResponse = performRequest("PUT", indexPath + "/_mapping", mappingsNode);
                        resultNode.set("mappingResponse", toJson(mappingResponse));
                        effectiveStatus = mappingResponse.getStatusLine().getStatusCode();
                    } catch (IOException mappingException) {
                        throw buildException(workflowId, "apply-index", "Failed to update index mappings", mappingException);
                    }
                }
                JsonNode settingsNode = schema.path("settings");
                if (!settingsNode.isMissingNode() && !settingsNode.isNull()) {
                    try {
                        Response settingsResponse = performRequest("PUT", indexPath + "/_settings", settingsNode);
                        resultNode.set("settingsResponse", toJson(settingsResponse));
                        effectiveStatus = settingsResponse.getStatusLine().getStatusCode();
                    } catch (IOException settingsException) {
                        throw buildException(workflowId, "apply-index", "Failed to update index settings", settingsException);
                    }
                }
                return new OperationResult(workflowId, "apply-index", effectiveStatus, resultNode);
            }
            throw buildException(workflowId, "apply-index", "Failed to apply index", responseException);
        } catch (IOException ioException) {
            throw buildException(workflowId, "apply-index", "Failed to apply index", ioException);
        }
    }

    public OperationResult putTransform(String workflowId) {
        TransformWorkflow workflow = workflowRegistry.getRequired(workflowId);
        String path = "/_transform/" + workflow.transformId();
        JsonNode transform = workflow.transformJson();
        try {
            Response response = performRequest("PUT", path, transform);
            return toResult(workflowId, "put-transform", response);
        } catch (ResponseException responseException) {
            if (responseException.getResponse().getStatusLine().getStatusCode() == HttpStatus.CONFLICT.value()) {
                try {
                    Response updateResponse = performRequest("POST", path + "/_update", transform);
                    return toResult(workflowId, "update-transform", updateResponse);
                } catch (IOException updateException) {
                    throw buildException(workflowId, "update-transform", "Failed to update transform", updateException);
                }
            }
            throw buildException(workflowId, "put-transform", "Failed to create transform", responseException);
        } catch (IOException ioException) {
            throw buildException(workflowId, "put-transform", "Failed to create transform", ioException);
        }
    }

    public OperationResult previewTransform(String workflowId) {
        TransformWorkflow workflow = workflowRegistry.getRequired(workflowId);
        JsonNode transform = workflow.transformJson();
        try {
            Response response = performRequest("POST", "/_transform/_preview", transform);
            return toResult(workflowId, "preview-transform", response);
        } catch (IOException ioException) {
            throw buildException(workflowId, "preview-transform", "Failed to preview transform", ioException);
        }
    }

    public OperationResult startTransform(String workflowId) {
        TransformWorkflow workflow = workflowRegistry.getRequired(workflowId);
        String path = "/_transform/" + workflow.transformId() + "/_start";
        try {
            Response response = performRequest("POST", path, null);
            return toResult(workflowId, "start-transform", response);
        } catch (IOException ioException) {
            throw buildException(workflowId, "start-transform", "Failed to start transform", ioException);
        }
    }

    public OperationResult stopTransform(String workflowId, boolean waitForCompletion) {
        TransformWorkflow workflow = workflowRegistry.getRequired(workflowId);
        String path = "/_transform/" + workflow.transformId() + "/_stop";
        if (waitForCompletion) {
            path = path + "?wait_for_completion=true";
        }
        try {
            Response response = performRequest("POST", path, null);
            return toResult(workflowId, "stop-transform", response);
        } catch (IOException ioException) {
            throw buildException(workflowId, "stop-transform", "Failed to stop transform", ioException);
        }
    }

    public OperationResult resetTransform(String workflowId) {
        TransformWorkflow workflow = workflowRegistry.getRequired(workflowId);
        String path = "/_transform/" + workflow.transformId() + "/_reset";
        try {
            Response response = performRequest("POST", path, null);
            return toResult(workflowId, "reset-transform", response);
        } catch (IOException ioException) {
            throw buildException(workflowId, "reset-transform", "Failed to reset transform", ioException);
        }
    }

    private Response performRequest(String method, String path, JsonNode body) throws IOException {
        Request request = new Request(method, path);
        if (Objects.nonNull(body)) {
            request.setJsonEntity(objectMapper.writeValueAsString(body));
        }
        return restClient.performRequest(request);
    }

    private OperationResult toResult(String workflowId, String operation, Response response) throws IOException {
        JsonNode payload = toJson(response);
        int status = response.getStatusLine().getStatusCode();
        return new OperationResult(workflowId, operation, status, payload);
    }

    private JsonNode toJson(Response response) throws IOException {
        if (response.getEntity() == null) {
            return objectMapper.createObjectNode();
        }
        String raw = EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);
        if (raw == null || raw.isBlank()) {
            return objectMapper.createObjectNode();
        }
        return objectMapper.readTree(raw);
    }

    private WorkflowApiException buildException(String workflowId, String operation, String message, Exception exception) {
        JsonNode details = null;
        if (exception instanceof ResponseException responseException) {
            try {
                details = toJson(responseException.getResponse());
            } catch (IOException ignored) {
                // ignore parsing failure, leave details null
            }
            int status = responseException.getResponse().getStatusLine().getStatusCode();
            return new WorkflowApiException(workflowId, operation, status, message, exception, details);
        }
        return new WorkflowApiException(workflowId, operation, HttpStatus.INTERNAL_SERVER_ERROR.value(), message, exception, null);
    }
}
