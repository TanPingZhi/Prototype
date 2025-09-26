# ES Manager

ES Manager provides an API-first way to manage Elasticsearch transforms and their destination index schemas via code-defined workflows. The starter workflow ships with a simple random-walk dataset so you can try the service without touching Kibana.

## Prerequisites

- Ubuntu 22.04+ (or WSL Ubuntu) with sudo access
- Docker Engine & Compose Plugin (sudo apt install docker.io docker-compose-plugin)
- Java 17+ (example: sudo apt install openjdk-17-jdk) — only required when building/running the service outside Docker
- (Optional) Git for version control

If you just installed Docker on Ubuntu, add your user to the `docker` group and start a new shell:

    sudo usermod -aG docker $(whoami)
    newgrp docker

## Repository Layout

Prototype/
- docker-compose.yml
- ESManager/
  - .mvn/
  - Dockerfile (builds the Spring Boot service image)
  - mvnw / mvnw.cmd
  - pom.xml
  - src/main/java/com/esmanager
    - config/ (Elasticsearch & Swagger configuration)
    - controller/ (REST API endpoints)
    - model/ (DTOs returned by the API)
    - service/ (Elasticsearch orchestration logic)
    - workflow/ (SPI for workflows + registry support)
    - workflows/randomwalk (Random walk workflow implementation)
  - src/main/resources
    - application.yml
    - workflows/random-walk
      - schema.json (destination index mappings)
      - transform.json (transform definition)
- random-walk-generator/
  - Dockerfile (builds the Python random walk image)
  - random_walk_generator.py
  - requirements.txt

## Quick Start (Docker Compose)

From the repository root run these commands:

    cd /mnt/c/Users/josia/Desktop/Prototype   # adjust if cloned elsewhere
    docker compose up --build

Compose builds and starts three services:

1. elasticsearch — Elasticsearch 8.5 secured with admin / admin123
2. esmanager — the Spring Boot microservice
3. random-walk-generator — a Python worker that streams a random walk sample into the random-walk index every second

Once the containers report healthy, browse Swagger at http://localhost:8080/swagger-ui.html. The API automatically scopes operations to the random-walk workflow.

Stop the stack with CTRL+C (for foreground runs) and docker compose down.

## Random Walk Workflow

- Source index: random-walk (populated continuously by the Python generator)
- Transform ID: random-walk-transform
- Destination index: random-walk-transform-target-index with fields:
  - time5s (date) — timestamp representing the 10-second bucket start
  - close (double) — closing price of the bucket

All workflow artifacts live in src/main/resources/workflows/random-walk/ and are loaded via RandomWalkWorkflow.

## Naming Convention

All workflows must follow this pattern:

- Transform IDs must end with -transform
- Destination indices must end with -transform-target-index

The application validates these names on startup and fails fast if a workflow breaks the rule.

## Operating Workflows via API

Key endpoints published per workflow (replace {workflowId} with random-walk):

- PUT /api/workflows/{workflowId}/index — create or update the destination index schema
- PUT /api/workflows/{workflowId}/transform — create or update the transform definition
- POST /api/workflows/{workflowId}/transform/preview — preview the transform output
- POST /api/workflows/{workflowId}/transform/start — start the transform task
- POST /api/workflows/{workflowId}/transform/stop?waitForCompletion=true
- POST /api/workflows/{workflowId}/transform/reset

Each call returns an OperationResult containing the Elasticsearch response body.

## Local Development (optional)

To run the service without Docker:

    cd ESManager
    ./mvnw clean package
    ./mvnw spring-boot:run

By default the service expects Elasticsearch at http://localhost:9200 with admin / admin123. Override properties via environment variables such as ELASTICSEARCH_HOST.

## Troubleshooting

- open //./pipe/dockerDesktopLinuxEngine: Docker Engine is not running — start Docker Desktop (Windows) or the Docker daemon (Linux)
- 401 Unauthorized: ensure the credentials in docker-compose.yml match the Elasticsearch security settings
- Swagger missing your workflow: confirm RandomWalkWorkflow is annotated with @Component and the schema/transform JSON files exist

## Next Steps

- Add more workflows by copying the random-walk structure into a new package/resources folder
- Extend the random walk generator or replace it with your own data feed
