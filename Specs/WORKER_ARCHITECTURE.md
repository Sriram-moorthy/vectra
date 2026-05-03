# Worker Implementation

## Overview

The worker implementation handles squat video processing in the background using the FastAPI API, Azure Queue Storage, and a Container Apps Job worker entrypoint.

## Current Implementation

We now have a queue-driven async job path in place without relying on the old DB polling worker or the Azure Function scaffold.

In the backend, the active worker path is:

- `POST /jobs/squat` uploads the file, creates a queued job in Postgres, and enqueues an Azure Queue message
- `GET /jobs/{job_id}` returns the job status plus result or error
- `queue_worker.py` receives one queue message, claims the job, runs the analysis pipeline, and updates job state
- `services/job_service.py` manages job lifecycle state
- `services/queue_job_processor.py` validates and orchestrates queue processing
- `services/job_runner.py` performs the actual squat processing work

This keeps orchestration, job-state management, and analysis execution separated while still giving us a simple worker entrypoint for local runs and container deployment.

## UI Flow

The React app now uses the async worker flow. I updated DashboardPage.tsx to create a squat job, poll GET /jobs/{id} every 2 seconds, show queued/running/completed/failed status, and render the completed analysis exactly like before once the job finishes.

I also added a shared frontend API base config in apiConfig.ts, switched squatApi.ts to the new POST /jobs/squat + GET /jobs/{id} endpoints, updated authApi.ts to use the same base URL, and added job response types in squat.ts.

Verification: npm run build passed in vectra-ui.

## Local Runtime

For this to work end to end locally, we now need both processes running:

API: `uvicorn app:app --reload`
Worker: `python3 queue_worker.py`

## Failure Handling

The worker uses Azure Queue `dequeue_count` and a poison queue strategy:

- Retryable processing failures are retried from the main queue
- Non-retryable payload or validation failures move directly to `analysis-jobs-poison`
- Messages that reach the configured max dequeue count are moved to the poison queue
- Terminal failures update the job row in Postgres to `failed`
