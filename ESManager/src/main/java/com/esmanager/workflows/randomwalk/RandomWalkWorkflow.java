package com.esmanager.workflows.randomwalk;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.esmanager.workflow.ResourceBackedWorkflow;
import org.springframework.stereotype.Component;

@Component
public class RandomWalkWorkflow extends ResourceBackedWorkflow {

    public RandomWalkWorkflow(ObjectMapper objectMapper) {
        super(objectMapper, "workflows/random-walk/schema.json", "workflows/random-walk/transform.json");
    }

    @Override
    public String id() {
        return "random-walk";
    }
}

