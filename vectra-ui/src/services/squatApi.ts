import { API_BASE_URL } from "./apiConfig";
import type { SquatJobListResponse, SquatJobResponse } from "../types/squat";

const SQUAT_JOB_ENDPOINT = `${API_BASE_URL}/jobs/squat`;

export async function createSquatJob(file: File): Promise<SquatJobResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(SQUAT_JOB_ENDPOINT, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Squat job creation failed (${response.status}): ${errorText || "Unknown error"}`
    );
  }

  return (await response.json()) as SquatJobResponse;
}

export async function fetchSquatJob(jobId: string): Promise<SquatJobResponse> {
  const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch squat job (${response.status}): ${errorText || "Unknown error"}`
    );
  }

  return (await response.json()) as SquatJobResponse;
}

export async function listSquatJobs(limit = 12): Promise<SquatJobListResponse> {
  const response = await fetch(`${API_BASE_URL}/jobs?limit=${limit}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to load job history (${response.status}): ${errorText || "Unknown error"}`
    );
  }

  return (await response.json()) as SquatJobListResponse;
}
