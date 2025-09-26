package com.esmanager.workflow;

import com.fasterxml.jackson.databind.JsonNode;

public interface TransformWorkflow {

    /**
     * Unique identifier for this workflow. Used to scope endpoints and resources.
     */
    String id();

    /**
     * Destination index that the transform writes to. Defaults to <id>-transform-target-index.
     */
    default String destinationIndex() {
        return id() + "-transform-target-index";
    }

    /**
     * Identifier used when storing the transform in Elasticsearch. Defaults to <id>-transform.
     */
    default String transformId() {
        return id() + "-transform";
    }

    /**
     * JSON payload describing the destination index settings/mappings.
     */
    JsonNode schemaJson();

    /**
     * JSON payload describing the transform definition.
     */
    JsonNode transformJson();
}

