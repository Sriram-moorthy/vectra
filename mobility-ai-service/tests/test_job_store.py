import os
import tempfile
import unittest
from unittest.mock import patch

from services.job_runner import JobRunner
from services.job_store import JobStore
from worker import process_next_job


class JobStoreTests(unittest.TestCase):
    def test_job_lifecycle_moves_from_queued_to_completed(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = os.path.join(temp_dir, "jobs.db")
            video_path = os.path.join(temp_dir, "demo.mp4")
            with open(video_path, "wb") as handle:
                handle.write(b"demo")

            store = JobStore(db_path=db_path)
            job = store.create_job(
                job_id="job-1",
                analysis_type="squat",
                original_filename="demo.mp4",
                stored_filename="job-1_demo.mp4",
                video_path=video_path,
            )

            self.assertEqual(job["status"], "queued")

            running_job = store.claim_next_queued_job()

            self.assertEqual(running_job["id"], "job-1")
            self.assertEqual(running_job["status"], "running")

            completed_job = store.mark_job_completed(
                "job-1",
                {"status": "Video processed", "analysis_type": "squat"},
            )

            self.assertEqual(completed_job["status"], "completed")
            self.assertEqual(completed_job["result"]["analysis_type"], "squat")

    def test_worker_processes_next_job_and_updates_result(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = os.path.join(temp_dir, "jobs.db")
            video_path = os.path.join(temp_dir, "demo.mp4")
            with open(video_path, "wb") as handle:
                handle.write(b"demo")

            store = JobStore(db_path=db_path)
            store.create_job(
                job_id="job-2",
                analysis_type="squat",
                original_filename="demo.mp4",
                stored_filename="job-2_demo.mp4",
                video_path=video_path,
            )

            with patch(
                "services.job_runner.JobRunner.run_squat_job",
                return_value={"status": "Video processed", "filename": "demo.mp4"},
            ):
                processed = process_next_job(store, JobRunner())

            self.assertTrue(processed)
            updated_job = store.get_job("job-2")
            self.assertEqual(updated_job["status"], "completed")
            self.assertEqual(updated_job["result"]["filename"], "demo.mp4")

    def test_worker_marks_job_failed_when_runner_raises(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = os.path.join(temp_dir, "jobs.db")
            video_path = os.path.join(temp_dir, "demo.mp4")
            with open(video_path, "wb") as handle:
                handle.write(b"demo")

            store = JobStore(db_path=db_path)
            store.create_job(
                job_id="job-3",
                analysis_type="squat",
                original_filename="demo.mp4",
                stored_filename="job-3_demo.mp4",
                video_path=video_path,
            )

            with patch(
                "services.job_runner.JobRunner.run_squat_job",
                side_effect=RuntimeError("processing failed"),
            ):
                process_next_job(store, JobRunner())

            failed_job = store.get_job("job-3")
            self.assertEqual(failed_job["status"], "failed")
            self.assertEqual(failed_job["error_message"], "processing failed")

    def test_list_jobs_returns_most_recent_first(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = os.path.join(temp_dir, "jobs.db")
            video_path = os.path.join(temp_dir, "demo.mp4")
            with open(video_path, "wb") as handle:
                handle.write(b"demo")

            store = JobStore(db_path=db_path)
            store.create_job(
                job_id="job-older",
                analysis_type="squat",
                original_filename="older.mp4",
                stored_filename="job-older_older.mp4",
                video_path=video_path,
            )
            store.create_job(
                job_id="job-newer",
                analysis_type="squat",
                original_filename="newer.mp4",
                stored_filename="job-newer_newer.mp4",
                video_path=video_path,
            )

            jobs = store.list_jobs(limit=10)

            self.assertEqual([job["id"] for job in jobs], ["job-newer", "job-older"])


if __name__ == "__main__":
    unittest.main()
