from pathlib import Path

path = Path("src/main/java/com/esmanager/controller/WorkflowController.java")
text = path.read_text()
if "@RequiredArgsConstructor" not in text:
    text = text.replace("import org.springframework.web.bind.annotation.RestController;\n\n", "import org.springframework.web.bind.annotation.RestController;\n\nimport lombok.RequiredArgsConstructor;\n")
    text = text.replace("@RestController\n@RequestMapping(\"/api/workflows\")\npublic class WorkflowController {", "@RestController\n@RequiredArgsConstructor\n@RequestMapping(\"/api/workflows\")\npublic class WorkflowController {")
    text = text.replace("    private final ElasticsearchWorkflowService workflowService;\n    private final WorkflowRegistry workflowRegistry;\n\n    public WorkflowController(ElasticsearchWorkflowService workflowService, WorkflowRegistry workflowRegistry) {\n        this.workflowService = workflowService;\n        this.workflowRegistry = workflowRegistry;\n    }\n\n", "    private final ElasticsearchWorkflowService workflowService;\n    private final WorkflowRegistry workflowRegistry;\n\n")
    path.write_text(text)
