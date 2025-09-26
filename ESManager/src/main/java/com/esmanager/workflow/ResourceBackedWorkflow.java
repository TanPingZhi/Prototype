package com.esmanager.workflow;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public abstract class ResourceBackedWorkflow implements TransformWorkflow {

    private final ObjectMapper objectMapper;
    private final JsonNode schema;
    private final JsonNode transform;

    protected ResourceBackedWorkflow(ObjectMapper objectMapper, String schemaPath, String transformPath) {
        this.objectMapper = objectMapper;
        this.schema = loadJson(schemaPath);
        this.transform = loadJson(transformPath);
    }

    @Override
    public JsonNode schemaJson() {
        return schema;
    }

    @Override
    public JsonNode transformJson() {
        return transform;
    }

    private JsonNode loadJson(String path) {
        Resource resource = new ClassPathResource(path);
        if (!resource.exists()) {
            throw new IllegalStateException("Missing workflow resource: " + path);
        }
        try (InputStream inputStream = resource.getInputStream()) {
            // Read text to provide clearer error messages when JSON fails to parse
            String raw = new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
            return objectMapper.readTree(raw);
        } catch (IOException ioException) {
            throw new IllegalStateException("Failed to load workflow resource: " + path, ioException);
        }
    }
}
