import json
import os
import sqlite3
from datetime import datetime, UTC
from typing import Any


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()


class JobStore:
    def __init__(self, db_path: str = "jobs.db"):
        self.db_path = db_path
        self._ensure_parent_directory()
        self._initialize()

    def _ensure_parent_directory(self):
        parent_dir = os.path.dirname(self.db_path)
        if parent_dir:
            os.makedirs(parent_dir, exist_ok=True)

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self):
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY,
                    analysis_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    original_filename TEXT NOT NULL,
                    stored_filename TEXT NOT NULL,
                    video_path TEXT NOT NULL,
                    result_json TEXT,
                    error_message TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    started_at TEXT,
                    completed_at TEXT
                )
                """
            )
            connection.commit()

    def create_job(
        self,
        *,
        job_id: str,
        analysis_type: str,
        original_filename: str,
        stored_filename: str,
        video_path: str,
    ) -> dict[str, Any]:
        timestamp = utc_now_iso()

        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO jobs (
                    id,
                    analysis_type,
                    status,
                    original_filename,
                    stored_filename,
                    video_path,
                    created_at,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    job_id,
                    analysis_type,
                    "queued",
                    original_filename,
                    stored_filename,
                    video_path,
                    timestamp,
                    timestamp,
                ),
            )
            connection.commit()

        return self.get_job(job_id)

    def get_job(self, job_id: str) -> dict[str, Any] | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM jobs WHERE id = ?",
                (job_id,),
            ).fetchone()

        if row is None:
            return None

        return self._row_to_job(row)

    def list_jobs(self, *, limit: int = 20) -> list[dict[str, Any]]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT *
                FROM jobs
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()

        return [self._row_to_job(row) for row in rows]

    def claim_next_queued_job(self) -> dict[str, Any] | None:
        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT id
                FROM jobs
                WHERE status = 'queued'
                ORDER BY created_at ASC
                LIMIT 1
                """
            ).fetchone()

            if row is None:
                return None

            now = utc_now_iso()
            cursor = connection.execute(
                """
                UPDATE jobs
                SET status = 'running',
                    started_at = ?,
                    updated_at = ?
                WHERE id = ? AND status = 'queued'
                """,
                (now, now, row["id"]),
            )
            connection.commit()

            if cursor.rowcount != 1:
                return None

        return self.get_job(row["id"])

    def mark_job_completed(self, job_id: str, result: dict[str, Any]) -> dict[str, Any]:
        now = utc_now_iso()

        with self._connect() as connection:
            connection.execute(
                """
                UPDATE jobs
                SET status = 'completed',
                    result_json = ?,
                    error_message = NULL,
                    updated_at = ?,
                    completed_at = ?
                WHERE id = ?
                """,
                (json.dumps(result), now, now, job_id),
            )
            connection.commit()

        return self.get_job(job_id)

    def mark_job_failed(self, job_id: str, error_message: str) -> dict[str, Any]:
        now = utc_now_iso()

        with self._connect() as connection:
            connection.execute(
                """
                UPDATE jobs
                SET status = 'failed',
                    error_message = ?,
                    updated_at = ?,
                    completed_at = ?
                WHERE id = ?
                """,
                (error_message, now, now, job_id),
            )
            connection.commit()

        return self.get_job(job_id)

    def _row_to_job(self, row: sqlite3.Row) -> dict[str, Any]:
        result_json = row["result_json"]

        return {
            "id": row["id"],
            "analysis_type": row["analysis_type"],
            "status": row["status"],
            "original_filename": row["original_filename"],
            "stored_filename": row["stored_filename"],
            "video_path": row["video_path"],
            "result": json.loads(result_json) if result_json else None,
            "error_message": row["error_message"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "started_at": row["started_at"],
            "completed_at": row["completed_at"],
        }
