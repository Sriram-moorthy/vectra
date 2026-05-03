# Azure Queue Storage Implementation

## Overview

### Current Implementation

The current implementation is queue-driven. The API creates the job record in Postgres and enqueues a message into Azure Queue Storage. The worker container consumes the queue and processes one message at a time.

This replaced the earlier DB polling worker approach, which was costly and unnecessary.

### Advantages

- No DB polling load
- Lower latency than a fixed DB polling loop
- Clear separation of concerns between API, persistence, queue dispatch, and worker execution
- Retry behavior based on Azure Queue visibility timeout and `dequeue_count`
- Explicit poison queue handling for terminal failures


## Queue Storage Details

We are using the same Storage Account that was already used for blob storage and created dedicated queues for analysis processing.

Resource Group Name - "rg-vectra"
Storage Account - "vectrastorage001"
Queue Name - "analysis-jobs"
Poison Queue Name - "analysis-jobs-poison"
Queue URL - "https://vectrastorage001.queue.core.windows.net/analysis-jobs"
Region - "(Asia) South India"
Performance - "Standard" (Considering Cost)
Redundancy - "LRS" (Considering Cost)

Connection string values should be provided through environment variables and not documented inline.

## Worker Flow

1. API creates the job row with status `queued`
2. API sends a queue message containing `job_id` and `analysis_type`
3. `queue_worker.py` receives one message with a configured visibility timeout
4. `JobService` marks the job `running`
5. `queue_job_processor.py` validates the payload and calls `job_runner.py`
6. On success, the worker marks the job `completed` and deletes the queue message
7. On retryable failure, the worker requeues the DB job state and leaves the queue message undeleted
8. On non-retryable failure or retry exhaustion, the worker moves the payload to `analysis-jobs-poison`, marks the job `failed`, and deletes the original message

## Technical Consideration

### Principles and Patterns

- Follow SOLID principles
- Implement repository pattern for Queue Client
- Keep connection strings in environment variables and move them to Key Vault in future.
- Do not overload app.py file. Maintain single responsibility principle.
- Keep orchestration in `queue_job_processor.py`, analysis execution in `job_runner.py`, and persistence in `job_service.py`
- Use a dedicated worker entrypoint for Container Apps Job deployment
- Maintain clean seperation of concern

### Security and Access

- Front End (UI) should not access Queue

### Not Considered

- KeyVault
