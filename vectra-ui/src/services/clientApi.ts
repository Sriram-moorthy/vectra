import type { Client, ClientPayload, Goal, GoalPayload } from "../types/client";
import { API_BASE_URL } from "./apiConfig";
import { buildAuthHeaders } from "./session";

export async function listClients(): Promise<Client[]> {
  const response = await fetch(`${API_BASE_URL}/clients`, {
    headers: buildAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to load clients (${response.status})`);
  }

  return (await response.json()) as Client[];
}

export async function createClient(payload: ClientPayload): Promise<Client> {
  const response = await fetch(`${API_BASE_URL}/clients`, {
    method: "POST",
    headers: buildAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create client (${response.status}): ${errorText}`);
  }

  return (await response.json()) as Client;
}

export async function fetchClient(clientId: number): Promise<Client> {
  const response = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
    headers: buildAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to load client (${response.status})`);
  }

  return (await response.json()) as Client;
}

export async function updateClient(clientId: number, payload: ClientPayload): Promise<Client> {
  const response = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
    method: "PUT",
    headers: buildAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update client (${response.status}): ${errorText}`);
  }

  return (await response.json()) as Client;
}

export async function addClientGoal(clientId: number, payload: GoalPayload): Promise<Goal> {
  const response = await fetch(`${API_BASE_URL}/clients/${clientId}/goals`, {
    method: "POST",
    headers: buildAuthHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to save client goal (${response.status}): ${errorText}`);
  }

  return (await response.json()) as Goal;
}
