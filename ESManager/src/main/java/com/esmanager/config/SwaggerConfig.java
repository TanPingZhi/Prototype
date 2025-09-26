package com.esmanager.config;

import com.esmanager.workflow.TransformWorkflow;
import com.esmanager.workflow.WorkflowRegistry;
import io.swagger.v3.core.util.Json;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.Paths;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.CollectionUtils;
import org.springdoc.core.customizers.OpenApiCustomizer;

import java.util.Objects;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI esManagerOpenAPI() {
        return new OpenAPI().info(new Info()
                .title("ES Manager API")
                .description("API-first service to manage Elasticsearch transforms and destination schemas")
                .version("v1")
                .contact(new Contact().name("ES Manager").email("platform@example.com")));
    }

    @Bean
    public OpenApiCustomizer workflowPathCustomiser(WorkflowRegistry workflowRegistry) {
        return openApi -> {
            Paths originalPaths = openApi.getPaths();
            Paths updatedPaths = new Paths();
            originalPaths.forEach((path, item) -> {
                if (path.contains("{workflowId}")) {
                    for (TransformWorkflow workflow : workflowRegistry.workflows()) {
                        String concretePath = path.replace("{workflowId}", workflow.id());
                        updatedPaths.addPathItem(concretePath, clonePathItem(item, workflow.id()));
                    }
                } else {
                    updatedPaths.addPathItem(path, item);
                }
            });
            openApi.setPaths(updatedPaths);
        };
    }

    private PathItem clonePathItem(PathItem original, String workflowId) {
        PathItem clone = new PathItem();
        cloneOperation(original.getGet(), workflowId).ifPresent(clone::setGet);
        cloneOperation(original.getPut(), workflowId).ifPresent(clone::setPut);
        cloneOperation(original.getPost(), workflowId).ifPresent(clone::setPost);
        cloneOperation(original.getDelete(), workflowId).ifPresent(clone::setDelete);
        cloneOperation(original.getOptions(), workflowId).ifPresent(clone::setOptions);
        cloneOperation(original.getHead(), workflowId).ifPresent(clone::setHead);
        cloneOperation(original.getPatch(), workflowId).ifPresent(clone::setPatch);
        cloneOperation(original.getTrace(), workflowId).ifPresent(clone::setTrace);
        if (!CollectionUtils.isEmpty(original.getParameters())) {
            clone.setParameters(original.getParameters().stream()
                    .filter(parameter -> !"workflowId".equals(parameter.getName()))
                    .toList());
        }
        return clone;
    }

    private java.util.Optional<Operation> cloneOperation(Operation original, String workflowId) {
        if (Objects.isNull(original)) {
            return java.util.Optional.empty();
        }
        Operation cloned = Json.mapper().convertValue(original, Operation.class);
        if (!CollectionUtils.isEmpty(cloned.getParameters())) {
            cloned.setParameters(cloned.getParameters().stream()
                    .filter(parameter -> !"workflowId".equals(parameter.getName()))
                    .toList());
        }
        String summary = cloned.getSummary();
        String suffix = " [" + workflowId + "]";
        if (summary == null || summary.isBlank()) {
            cloned.setSummary("Workflow operation" + suffix);
        } else if (!summary.endsWith(suffix)) {
            cloned.setSummary(summary + suffix);
        }
        cloned.addTagsItem("workflow: " + workflowId);
        String description = cloned.getDescription();
        if (description == null || description.isBlank()) {
            cloned.setDescription("Executes the operation for workflow '" + workflowId + "'.");
        }
        return java.util.Optional.of(cloned);
    }
}
