package com.esmanager.workflow;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WorkflowNamingValidator {

    private final WorkflowRegistry workflowRegistry;

    @PostConstruct
    public void validateNamingConventions() {
        for (TransformWorkflow workflow : workflowRegistry.workflows()) {
            String transformId = workflow.transformId();
            if (!transformId.endsWith("-transform")) {
                throw new IllegalStateException("Workflow '" + workflow.id() + "' transformId must end with '-transform'");
            }
            String destinationIndex = workflow.destinationIndex();
            if (!destinationIndex.endsWith("-transform-target-index")) {
                throw new IllegalStateException("Workflow '" + workflow.id() + "' destination index must end with '-transform-target-index'");
            }
        }
    }
}
