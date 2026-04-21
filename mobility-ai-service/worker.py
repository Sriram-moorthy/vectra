import argparse
import time

from services.job_runner import JobRunner
from services.job_store import JobStore


def process_next_job(job_store: JobStore, job_runner: JobRunner) -> bool:
    job = job_store.claim_next_queued_job()
    if job is None:
        return False

    job_id = job["id"]

    try:
        if job["analysis_type"] != "squat":
            raise ValueError(f"Unsupported analysis type: {job['analysis_type']}")

        result = job_runner.run_squat_job(
            video_path=job["video_path"],
            original_filename=job["original_filename"],
        )
        job_store.mark_job_completed(job_id, result)
    except Exception as exc:
        job_store.mark_job_failed(job_id, str(exc))

    return True


def main():
    parser = argparse.ArgumentParser(description="Vectra async worker")
    parser.add_argument("--db-path", default="jobs.db")
    parser.add_argument("--poll-interval", type=float, default=2.0)
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()

    job_store = JobStore(db_path=args.db_path)
    job_runner = JobRunner()

    if args.once:
        process_next_job(job_store, job_runner)
        return

    while True:
        processed = process_next_job(job_store, job_runner)
        if not processed:
            time.sleep(args.poll_interval)


if __name__ == "__main__":
    main()
