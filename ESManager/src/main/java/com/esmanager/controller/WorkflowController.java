package com.esmanager.controller;

import com.esmanager.model.OperationResult;
import com.esmanager.model.WorkflowSummary;
import com.esmanager.service.ElasticsearchWorkflowService;
import com.esmanager.workflow.WorkflowRegistry;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workflows")
public class WorkflowController {

    private final ElasticsearchWorkflowService workflowService;
    private final WorkflowRegistry workflowRegistry;

    @GetMapping
    @Operation(summary = "List registered workflows")
    public List<WorkflowSummary> listWorkflows() {
        return workflowRegistry.workflows().stream()
                .map(workflow -> new WorkflowSummary(workflow.id(), workflow.destinationIndex(), workflow.transformId()))
                .collect(Collectors.toList());
    }

    @PutMapping("/{workflowId}/index")
    @Operation(summary = "Create or update the destination index for the workflow")
    public OperationResult applyIndex(@Parameter(description = "Workflow identifier") @PathVariable String workflowId) {
        return workflowService.applyDestinationIndex(workflowId);
    }

    @PutMapping("/{workflowId}/transform")
    @Operation(summary = "Create or update the transform definition for the workflow")
    public OperationResult putTransform(@Parameter(description = "Workflow identifier") @PathVariable String workflowId) {
        return workflowService.putTransform(workflowId);
    }

    @PostMapping("/{workflowId}/transform/preview")
    @Operation(summary = "Preview the transform output")
    public OperationResult previewTransform(@Parameter(description = "Workflow identifier") @PathVariable String workflowId) {
        return workflowService.previewTransform(workflowId);
    }

    @PostMapping("/{workflowId}/transform/start")
    @Operation(summary = "Start the transform")
    public OperationResult startTransform(@Parameter(description = "Workflow identifier") @PathVariable String workflowId) {
        return workflowService.startTransform(workflowId);
    }

    @PostMapping("/{workflowId}/transform/stop")
    @Operation(summary = "Stop the transform")
    public OperationResult stopTransform(@Parameter(description = "Workflow identifier") @PathVariable String workflowId,
                                         @RequestParam(name = "waitForCompletion", defaultValue = "false") boolean waitForCompletion) {
        return workflowService.stopTransform(workflowId, waitForCompletion);
    }

    @PostMapping("/{workflowId}/transform/reset")
    @Operation(summary = "Reset the transform")
    public OperationResult resetTransform(@Parameter(description = "Workflow identifier") @PathVariable String workflowId) {
        return workflowService.resetTransform(workflowId);
    }
}
