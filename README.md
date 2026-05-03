# Vectra

Vectra is a squat video analysis system for coaches and trainers. It combines a React + Vite frontend with a FastAPI backend, MediaPipe-based pose analysis, Azure Blob Storage for media, Azure Database for PostgreSQL for job persistence, and Azure Queue Storage with a Container Apps worker for async processing.

The current product scope is focused on squat analysis.

## What Vectra Does

- Accepts squat videos from the UI
- Classifies the recording as side view, front view, or not sufficient
- Runs side-view analysis for rep detection, depth, and torso lean
- Runs front-view analysis for knee tracking
- Generates annotated analysis frames and serves them through the backend
- Stores media in Azure Blob Storage
- Persists jobs in Azure Database for PostgreSQL
- Dispatches async analysis jobs through Azure Queue Storage and a queue worker
- Includes a simple demo login flow using `admin / admin`

## Architecture

### Frontend

- React
- TypeScript
- Vite

### Backend

- FastAPI
- Python
- OpenCV
- MediaPipe Pose Landmarker

### Infra

- Azure Blob Storage for uploaded videos, extracted frames, and annotated frames
- Azure Database for PostgreSQL Flexible Server for job persistence
- Azure Queue Storage for job dispatch
- Azure Container Apps Job for queue-driven background processing
- Poison queue handling through `analysis-jobs-poison` for terminal failures

## Repository Structure

```text
MobilityDetectionSystem/
├── mobility-ai-service/
│   ├── analyzers/
│   ├── config/
│   ├── repositories/
│   ├── services/
│   ├── shared/
│   ├── tests/
│   ├── app.py
│   ├── queue_worker.py
│   ├── Dockerfile.worker
│   └── local.settings.json
├── vectra-ui/
│   ├── src/
│   └── package.json
├── Specs/
│   ├── BLOB_STORAGE_IMPLEMENTATION.md
│   ├── POSTGRES_IMPLEMENTATION.md
│   ├── QUEUE_STORAGE_IMPLEMENTATION.md
│   └── WORKER_ARCHITECTURE.md
└── README.md
```

## Request Flow

1. A user signs in from the frontend.
2. The frontend uploads a squat video to the backend.
3. The backend stores the uploaded video in Azure Blob Storage.
4. The backend creates a job record in Postgres with status `queued`.
5. The backend pushes a message to Azure Queue Storage.
6. The queue worker pulls one message, claims the job in Postgres, and runs the squat pipeline.
7. Frames are extracted and uploaded to Blob Storage.
8. Pose landmarks are analyzed and squat rules are applied.
9. Annotated output frames are uploaded to Blob Storage.
10. The frontend polls the backend for job status and renders the completed result.

## Worker Behavior

- `app.py` creates jobs and enqueues queue messages.
- `services/job_service.py` manages job state over the Postgres repository.
- `services/queue_job_processor.py` validates queue payloads, claims jobs, and orchestrates analysis execution.
- `services/job_runner.py` performs the actual squat video processing work.
- `queue_worker.py` is the entrypoint used by local runs and the worker container image.

Retry and poison queue behavior:

- The worker receives messages with a visibility timeout controlled by `ANALYSIS_JOB_VISIBILITY_TIMEOUT`.
- Retryable failures are left on the main queue and retried based on Azure Queue `dequeue_count`.
- Non-retryable failures go straight to `analysis-jobs-poison`.
- When `dequeue_count` reaches `ANALYSIS_JOB_MAX_DEQUEUE_COUNT`, the message is moved to the poison queue and the job is marked `failed`.

## Configuration

The backend reads infra settings from environment variables. For local development, `mobility-ai-service/local.settings.json` is auto-loaded by the FastAPI app and the queue worker when those values are not already present in the environment.

### Required Environment Variables

- `AzureWebJobsStorage` or `BLOB_STORAGE_CONNECTION_STRING`
- `QUEUE_STORAGE_CONNECTION_STRING` (optional if `AzureWebJobsStorage` is used)
- `BLOB_UPLOADS_CONTAINER`
- `BLOB_FRAMES_CONTAINER`
- `BLOB_ANNOTATED_FRAMES_CONTAINER`
- `ANALYSIS_JOBS_QUEUE_NAME`
- `ANALYSIS_JOBS_POISON_QUEUE_NAME`
- `ANALYSIS_JOB_VISIBILITY_TIMEOUT`
- `ANALYSIS_JOB_MAX_DEQUEUE_COUNT`
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_SSLMODE`

## Local Setup

### Prerequisites

- Python 3.11 recommended
- Node.js 18+
- npm

### 1. Backend Setup

From [`mobility-ai-service`](/Users/padmakumar0930/Vectra/MobilityDetectionSystem/mobility-ai-service):

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Important note:

- The pose model asset is expected at [`mobility-ai-service/models/pose_landmarker.task`](/Users/padmakumar0930/Vectra/MobilityDetectionSystem/mobility-ai-service/models/pose_landmarker.task).

### 2. Start the FastAPI App

From [`mobility-ai-service`](/Users/padmakumar0930/Vectra/MobilityDetectionSystem/mobility-ai-service):

```bash
source venv/bin/activate
uvicorn app:app --reload
```

Backend URL:

```text
http://localhost:8000
```

### 3. Start the Queue Worker

From [`mobility-ai-service`](/Users/padmakumar0930/Vectra/MobilityDetectionSystem/mobility-ai-service):

Run once:

```bash
source venv/bin/activate
python3 queue_worker.py
```

Run in a simple local loop:

```bash
source venv/bin/activate
while true; do python3 queue_worker.py || true; sleep 5; done
```

### 4. Start the Frontend

From [`vectra-ui`](/Users/padmakumar0930/Vectra/MobilityDetectionSystem/vectra-ui):

```bash
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## API Endpoints

Useful backend endpoints:

- `GET /`
- `POST /login`
- `POST /jobs/squat`
- `GET /jobs/{job_id}`
- `GET /jobs`
- `GET /frames/{filename}`
- `POST /analyze/squat` for direct synchronous processing
- `POST /analyze` for the earlier legacy prototype flow

## Demo Login

```text
username: admin
password: admin
```

Authentication is still demo-only and does not yet use a real user store.

## Testing

### Backend

```bash
cd mobility-ai-service
./venv/bin/python -m unittest tests.test_side_view_squat_logic tests.test_login_service tests.test_job_service
```

### Frontend

```bash
cd vectra-ui
npm run build
```

## Deployment Notes

- `local.settings.json` is for local development only.
- For Azure deployment, configure the same keys as Container Apps and backend environment variables.
- `Dockerfile.worker` builds the worker image that starts `queue_worker.py`.
- Do not rely on checked-in local secrets for production.

## Notes

- The current implementation is focused on squat analysis only.
- Authentication is still demo-only.
- Frame annotation is handled in the backend so it can be reused for future lifts or assessments.
- Async processing is queue-driven and no longer relies on DB polling or Azure Functions.
