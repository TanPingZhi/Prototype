package com.esmanager.workflow;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class WorkflowRegistry {

    private final Map<String, TransformWorkflow> workflowsById;

    public WorkflowRegistry(List<TransformWorkflow> workflows) {
        Map<String, TransformWorkflow> map = new LinkedHashMap<>();
        for (TransformWorkflow workflow : workflows) {
            TransformWorkflow existing = map.putIfAbsent(workflow.id(), workflow);
            if (existing != null) {
                throw new IllegalStateException("Duplicate workflow id detected: " + workflow.id());
            }
        }
        this.workflowsById = Collections.unmodifiableMap(map);
    }

    public Collection<TransformWorkflow> workflows() {
        return workflowsById.values();
    }

    public Optional<TransformWorkflow> find(String workflowId) {
        return Optional.ofNullable(workflowsById.get(workflowId));
    }

    public TransformWorkflow getRequired(String workflowId) {
        return find(workflowId)
                .orElseThrow(() -> new IllegalArgumentException("Unknown workflow id: " + workflowId));
    }
}
