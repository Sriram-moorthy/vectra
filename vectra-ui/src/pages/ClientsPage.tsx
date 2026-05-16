import React, { useEffect, useState } from "react";
import type { AppTab } from "../types/navigation";
import type { Client } from "../types/client";
import type { Plan, PlanPayload } from "../types/plan";
import type { SquatJobResponse } from "../types/squat";
import { addClientGoal, createClient, fetchClient, listClients, updateClient } from "../services/clientApi";
import {
  createNutritionPlan,
  createWorkoutPlan,
  getNutritionPlanPdfUrl,
  getWorkoutPlanPdfUrl,
  listNutritionPlans,
  listWorkoutPlans,
} from "../services/planApi";
import { getFormAnalysisPdfUrl, listClientSquatJobs } from "../services/squatApi";
import { getStoredAccessToken } from "../services/session";

type ClientsPageProps = {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onLogout: () => void;
  selectedClientId: number | null;
  onSelectClient: (client: Client) => void;
};

type PlanDraftState = {
  title: string;
  period_type: "weekly" | "monthly";
  period_start: string;
  period_end: string;
  summary: string;
  focus: string;
  meals: string;
  workout_days: string;
  notes: string;
};

const initialPlanDraft = (): PlanDraftState => ({
  title: "",
  period_type: "weekly",
  period_start: "",
  period_end: "",
  summary: "",
  focus: "",
  meals: "",
  workout_days: "",
  notes: "",
});

export default function ClientsPage({
  activeTab,
  onTabChange,
  onLogout,
  selectedClientId,
  onSelectClient,
}: ClientsPageProps) {
  const [detailTab, setDetailTab] = useState<"profile" | "plans" | "analysis-history">("profile");
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    dob: "",
    gender: "",
    height_cm: "",
    weight_kg: "",
    is_active: true,
  });
  const [goalForm, setGoalForm] = useState({
    goal_type: "weight_loss",
    notes: "",
    start_date: "",
    end_date: "",
  });
  const [nutritionPlans, setNutritionPlans] = useState<Plan[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<Plan[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<SquatJobResponse[]>([]);
  const [nutritionDraft, setNutritionDraft] = useState<PlanDraftState>(initialPlanDraft);
  const [workoutDraft, setWorkoutDraft] = useState<PlanDraftState>(initialPlanDraft);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [isSavingNutrition, setIsSavingNutrition] = useState(false);
  const [isSavingWorkout, setIsSavingWorkout] = useState(false);

  async function loadClients() {
    try {
      setIsLoading(true);
      setError("");
      const response = await listClients();
      setClients(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clients.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadClientWorkspace(clientId: number) {
    try {
      setIsDetailLoading(true);
      setError("");
      const [client, fetchedNutritionPlans, fetchedWorkoutPlans] = await Promise.all([
        fetchClient(clientId),
        listNutritionPlans(clientId),
        listWorkoutPlans(clientId),
      ]);
      setSelectedClient(client);
      onSelectClient(client);
      setNutritionPlans(fetchedNutritionPlans);
      setWorkoutPlans(fetchedWorkoutPlans);
      setProfileForm({
        first_name: client.first_name,
        last_name: client.last_name,
        dob: client.dob ?? "",
        gender: client.gender ?? "",
        height_cm: client.height_cm != null ? String(client.height_cm) : "",
        weight_kg: client.weight_kg != null ? String(client.weight_kg) : "",
        is_active: client.is_active,
      });
      setGoalForm((current) => ({
        ...current,
        goal_type: client.current_goal_type ?? current.goal_type,
        notes: client.current_goal_notes ?? "",
      }));
      if (detailTab === "analysis-history") {
        await loadAnalysisHistory(clientId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load client workspace.");
    } finally {
      setIsDetailLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (!selectedClientId) {
      setSelectedClient(null);
      setNutritionPlans([]);
      setWorkoutPlans([]);
      setAnalysisHistory([]);
      return;
    }

    loadClientWorkspace(selectedClientId);
  }, [selectedClientId]);

  useEffect(() => {
    if (detailTab !== "analysis-history" || !selectedClientId) {
      return;
    }

    loadAnalysisHistory(selectedClientId);
  }, [detailTab, selectedClientId]);

  async function loadAnalysisHistory(clientId: number) {
    try {
      setIsHistoryLoading(true);
      setError("");
      const response = await listClientSquatJobs(clientId, 24);
      setAnalysisHistory(response.analyses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load client analysis history.");
    } finally {
      setIsHistoryLoading(false);
    }
  }

  async function handleCreateClient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccessMessage("");

    try {
      const created = await createClient({
        first_name: firstName,
        last_name: lastName,
      });
      setClients((current) => [created, ...current]);
      setFirstName("");
      setLastName("");
      setDetailTab("profile");
      onSelectClient(created);
      setSuccessMessage("Client created and selected.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create client.");
    }
  }

  async function handleUpdateProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedClient) {
      return;
    }

    try {
      setIsSavingProfile(true);
      setError("");
      const updated = await updateClient(selectedClient.id, {
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        dob: profileForm.dob || undefined,
        gender: profileForm.gender || undefined,
        height_cm: profileForm.height_cm ? Number(profileForm.height_cm) : undefined,
        weight_kg: profileForm.weight_kg ? Number(profileForm.weight_kg) : undefined,
        is_active: profileForm.is_active,
      });
      setSelectedClient(updated);
      setClients((current) => current.map((client) => (client.id === updated.id ? updated : client)));
      onSelectClient(updated);
      setSuccessMessage("Client profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update client profile.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleSaveGoal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedClient) {
      return;
    }

    try {
      setIsSavingGoal(true);
      setError("");
      await addClientGoal(selectedClient.id, {
        goal_type: goalForm.goal_type,
        notes: goalForm.notes || undefined,
        start_date: goalForm.start_date || undefined,
        end_date: goalForm.end_date || undefined,
      });
      await loadClientWorkspace(selectedClient.id);
      setSuccessMessage("Client goal saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save client goal.");
    } finally {
      setIsSavingGoal(false);
    }
  }

  function buildPlanPayload(draft: PlanDraftState): PlanPayload {
    return {
      title: draft.title,
      period_type: draft.period_type,
      period_start: draft.period_start,
      period_end: draft.period_end,
      content: {
        summary: draft.summary,
        focus: draft.focus,
        meals: draft.meals,
        workout_days: draft.workout_days,
        notes: draft.notes,
      },
    };
  }

  async function handleCreateNutritionPlan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedClient) {
      return;
    }

    try {
      setIsSavingNutrition(true);
      setError("");
      const plan = await createNutritionPlan(selectedClient.id, buildPlanPayload(nutritionDraft));
      setNutritionPlans((current) => [plan, ...current]);
      setNutritionDraft(initialPlanDraft());
      setSuccessMessage("Nutrition plan created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create nutrition plan.");
    } finally {
      setIsSavingNutrition(false);
    }
  }

  async function handleCreateWorkoutPlan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedClient) {
      return;
    }

    try {
      setIsSavingWorkout(true);
      setError("");
      const plan = await createWorkoutPlan(selectedClient.id, buildPlanPayload(workoutDraft));
      setWorkoutPlans((current) => [plan, ...current]);
      setWorkoutDraft(initialPlanDraft());
      setSuccessMessage("Workout plan created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workout plan.");
    } finally {
      setIsSavingWorkout(false);
    }
  }

  return (
    <div style={styles.page}>
      <aside style={styles.sidebar}>
        <div style={styles.brandRow}>
          <div style={styles.brandIcon}>V</div>
          <div>
            <div style={styles.brandTitle}>Vectra</div>
            <div style={styles.brandSubtitle}>Coach Workspace</div>
          </div>
        </div>

        <div style={styles.navSection}>
          {renderTabButton("dashboard", "Dashboard", activeTab, onTabChange)}
          {renderTabButton("recent-analysis", "Recent Analysis", activeTab, onTabChange)}
          {renderTabButton("clients", "Clients", activeTab, onTabChange)}
          {renderTabButton("sessions", "Sessions", activeTab, onTabChange)}
          {renderTabButton("insights", "Insights", activeTab, onTabChange)}
          {renderTabButton("settings", "Settings", activeTab, onTabChange)}
        </div>
      </aside>

      <main style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.pageTitle}>Clients</h1>
            <p style={styles.pageSubtitle}>
              Manage client details, current goals, and weekly/monthly plan history from one workspace.
            </p>
          </div>
          <button style={styles.secondaryButton} onClick={onLogout}>Logout</button>
        </div>

        {error ? <div style={styles.errorBox}>{error}</div> : null}
        {successMessage ? <div style={styles.successBox}>{successMessage}</div> : null}

        <div style={styles.layout}>
          <div style={styles.column}>
            <div style={styles.panel}>
              <div style={styles.panelTitle}>Add client</div>
              <form onSubmit={handleCreateClient} style={styles.form}>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" style={styles.input} />
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" style={styles.input} />
                <button type="submit" style={styles.primaryButton}>Create client</button>
              </form>
            </div>

            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <div style={styles.panelTitleNoMargin}>Client list</div>
                <button style={styles.secondaryButton} onClick={loadClients} disabled={isLoading}>
                  {isLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              {!clients.length && !isLoading ? (
                <div style={styles.emptyText}>No clients yet. Create your first client to unlock planning and analysis history.</div>
              ) : null}

              <div style={styles.clientList}>
                {clients.map((client) => {
                  const isSelected = client.id === selectedClientId;
                  return (
                    <button
                      key={client.id}
                      style={isSelected ? styles.clientCardActive : styles.clientCard}
                      onClick={() => onSelectClient(client)}
                    >
                      <div style={styles.clientName}>{client.first_name} {client.last_name}</div>
                      <div style={styles.clientMeta}>{client.current_goal_type ?? "Goal not set yet"}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={styles.detailColumn}>
            {!selectedClientId ? (
              <div style={styles.panel}>
                <div style={styles.emptyTitle}>Choose a client</div>
                <div style={styles.emptyText}>
                  Select a client from the list to open the detail workspace for profile updates, goal tracking, and plan creation.
                </div>
              </div>
            ) : isDetailLoading ? (
              <div style={styles.panel}>
                <div style={styles.emptyText}>Loading client workspace…</div>
              </div>
            ) : selectedClient ? (
              <>
                <div style={styles.panel}>
                  <div style={styles.detailHeader}>
                    <div>
                      <div style={styles.detailTitle}>{selectedClient.first_name} {selectedClient.last_name}</div>
                      <div style={styles.clientMeta}>
                        {selectedClient.current_goal_type ?? "No current goal"} · {selectedClient.is_active ? "Active client" : "Inactive client"}
                      </div>
                    </div>
                    <button style={styles.secondaryButton} onClick={() => loadClientWorkspace(selectedClient.id)}>
                      Refresh detail
                    </button>
                  </div>
                  <div style={styles.detailTabRow}>
                    {renderDetailTab("profile", "Profile", detailTab, setDetailTab)}
                    {renderDetailTab("plans", "Plans", detailTab, setDetailTab)}
                    {renderDetailTab("analysis-history", "Analysis History", detailTab, setDetailTab)}
                  </div>
                </div>

                {detailTab === "profile" ? (
                  <>
                    <div style={styles.twoColumnGrid}>
                      <div style={styles.panel}>
                        <div style={styles.panelTitle}>Profile</div>
                        <form onSubmit={handleUpdateProfile} style={styles.profileGrid}>
                          <input value={profileForm.first_name} onChange={(e) => setProfileForm((current) => ({ ...current, first_name: e.target.value }))} placeholder="First name" style={styles.input} />
                          <input value={profileForm.last_name} onChange={(e) => setProfileForm((current) => ({ ...current, last_name: e.target.value }))} placeholder="Last name" style={styles.input} />
                          <input type="date" value={profileForm.dob} onChange={(e) => setProfileForm((current) => ({ ...current, dob: e.target.value }))} style={styles.input} />
                          <select value={profileForm.gender} onChange={(e) => setProfileForm((current) => ({ ...current, gender: e.target.value }))} style={styles.input}>
                            <option value="">Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                          <input type="number" value={profileForm.height_cm} onChange={(e) => setProfileForm((current) => ({ ...current, height_cm: e.target.value }))} placeholder="Height (cm)" style={styles.input} />
                          <input type="number" value={profileForm.weight_kg} onChange={(e) => setProfileForm((current) => ({ ...current, weight_kg: e.target.value }))} placeholder="Weight (kg)" style={styles.input} />
                          <label style={styles.checkboxRow}>
                            <input
                              type="checkbox"
                              checked={profileForm.is_active}
                              onChange={(e) => setProfileForm((current) => ({ ...current, is_active: e.target.checked }))}
                            />
                            Active client
                          </label>
                          <button type="submit" style={styles.primaryButton} disabled={isSavingProfile}>
                            {isSavingProfile ? "Saving profile..." : "Save profile"}
                          </button>
                        </form>
                      </div>

                      <div style={styles.panel}>
                        <div style={styles.panelTitle}>Current goal</div>
                        <form onSubmit={handleSaveGoal} style={styles.form}>
                          <select value={goalForm.goal_type} onChange={(e) => setGoalForm((current) => ({ ...current, goal_type: e.target.value }))} style={styles.input}>
                            <option value="weight_gain">Weight gain</option>
                            <option value="weight_loss">Weight loss</option>
                            <option value="strength_training">Strength training</option>
                            <option value="performance_improvement">Performance improvement</option>
                          </select>
                          <input type="date" value={goalForm.start_date} onChange={(e) => setGoalForm((current) => ({ ...current, start_date: e.target.value }))} style={styles.input} />
                          <input type="date" value={goalForm.end_date} onChange={(e) => setGoalForm((current) => ({ ...current, end_date: e.target.value }))} style={styles.input} />
                          <textarea value={goalForm.notes} onChange={(e) => setGoalForm((current) => ({ ...current, notes: e.target.value }))} placeholder="Goal notes" style={styles.textarea} />
                          <button type="submit" style={styles.primaryButton} disabled={isSavingGoal}>
                            {isSavingGoal ? "Saving goal..." : "Save goal"}
                          </button>
                        </form>
                      </div>
                    </div>

                    <div style={styles.panel}>
                      <div style={styles.panelTitle}>Client snapshot</div>
                      <div style={styles.snapshotGrid}>
                        <div style={styles.snapshotRow}><span style={styles.snapshotLabel}>Selected:</span> {selectedClient.first_name} {selectedClient.last_name}</div>
                        <div style={styles.snapshotRow}><span style={styles.snapshotLabel}>Goal:</span> {selectedClient.current_goal_type ?? "Not set"}</div>
                        <div style={styles.snapshotRow}><span style={styles.snapshotLabel}>Height:</span> {selectedClient.height_cm ?? "-"} cm</div>
                        <div style={styles.snapshotRow}><span style={styles.snapshotLabel}>Weight:</span> {selectedClient.weight_kg ?? "-"} kg</div>
                        <div style={styles.snapshotRow}><span style={styles.snapshotLabel}>Created:</span> {new Date(selectedClient.created_at).toLocaleDateString()}</div>
                        <div style={styles.snapshotRow}><span style={styles.snapshotLabel}>Status:</span> {selectedClient.is_active ? "Active" : "Inactive"}</div>
                      </div>
                    </div>
                  </>
                ) : null}

                {detailTab === "plans" ? (
                  <div style={styles.twoColumnGrid}>
                    <PlanComposerCard
                      title="Nutrition plan"
                      draft={nutritionDraft}
                      plans={nutritionPlans}
                      isSaving={isSavingNutrition}
                      onDraftChange={setNutritionDraft}
                      onSubmit={handleCreateNutritionPlan}
                      getPdfUrl={getNutritionPlanPdfUrl}
                    />
                    <PlanComposerCard
                      title="Workout plan"
                      draft={workoutDraft}
                      plans={workoutPlans}
                      isSaving={isSavingWorkout}
                      onDraftChange={setWorkoutDraft}
                      onSubmit={handleCreateWorkoutPlan}
                      getPdfUrl={getWorkoutPlanPdfUrl}
                    />
                  </div>
                ) : null}

                {detailTab === "analysis-history" ? (
                  <div style={styles.panel}>
                    <div style={styles.panelHeader}>
                      <div style={styles.panelTitleNoMargin}>Analysis history</div>
                      <button style={styles.secondaryButton} onClick={() => selectedClientId && loadAnalysisHistory(selectedClientId)} disabled={isHistoryLoading}>
                        {isHistoryLoading ? "Refreshing..." : "Refresh"}
                      </button>
                    </div>
                    {!analysisHistory.length && !isHistoryLoading ? (
                      <div style={styles.emptyText}>
                        No form analyses for this client yet. Upload a video from Dashboard to start building their technique history.
                      </div>
                    ) : null}
                    <div style={styles.historyList}>
                      {analysisHistory.map((analysis) => (
                        <div key={analysis.id} style={styles.historyCard}>
                          <div style={styles.historyTopRow}>
                            <div>
                              <div style={styles.historyTitle}>{analysis.original_filename}</div>
                              <div style={styles.historyMeta}>
                                {formatAnalysisStatus(analysis.status)} · {new Date(analysis.created_at).toLocaleString()}
                              </div>
                            </div>
                            <a
                              href={getFormAnalysisPdfUrl(analysis.id)}
                              target="_blank"
                              rel="noreferrer"
                              style={styles.linkButton}
                              onClick={(event) => {
                                event.preventDefault();
                                const token = getStoredAccessToken();
                                window.open(`${getFormAnalysisPdfUrl(analysis.id)}?token=${encodeURIComponent(token)}`, "_blank", "noopener,noreferrer");
                              }}
                            >
                              PDF
                            </a>
                          </div>
                          <div style={styles.historySummary}>
                            {analysis.coach_feedback_note
                              ? analysis.coach_feedback_note
                              : analysis.result?.squat_analysis?.feedback?.summary?.message ??
                                analysis.error_message ??
                                "Completed analysis with no saved coach note yet."}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div style={styles.panel}>
                <div style={styles.emptyText}>Client detail could not be loaded.</div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function renderDetailTab(
  tab: "profile" | "plans" | "analysis-history",
  label: string,
  activeTab: "profile" | "plans" | "analysis-history",
  onChange: React.Dispatch<React.SetStateAction<"profile" | "plans" | "analysis-history">>
) {
  return (
    <button
      type="button"
      style={activeTab === tab ? styles.detailTabActive : styles.detailTab}
      onClick={() => onChange(tab)}
    >
      {label}
    </button>
  );
}

function PlanComposerCard({
  title,
  draft,
  plans,
  isSaving,
  onDraftChange,
  onSubmit,
  getPdfUrl,
}: {
  title: string;
  draft: PlanDraftState;
  plans: Plan[];
  isSaving: boolean;
  onDraftChange: React.Dispatch<React.SetStateAction<PlanDraftState>>;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  getPdfUrl: (planId: number) => string;
}) {
  return (
    <div style={styles.panel}>
      <div style={styles.panelTitle}>{title}</div>
      <form onSubmit={onSubmit} style={styles.form}>
        <input value={draft.title} onChange={(e) => onDraftChange((current) => ({ ...current, title: e.target.value }))} placeholder={`${title} title`} style={styles.input} />
        <div style={styles.inlineGrid}>
          <select value={draft.period_type} onChange={(e) => onDraftChange((current) => ({ ...current, period_type: e.target.value as "weekly" | "monthly" }))} style={styles.input}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <input type="date" value={draft.period_start} onChange={(e) => onDraftChange((current) => ({ ...current, period_start: e.target.value }))} style={styles.input} />
          <input type="date" value={draft.period_end} onChange={(e) => onDraftChange((current) => ({ ...current, period_end: e.target.value }))} style={styles.input} />
        </div>
        <input value={draft.focus} onChange={(e) => onDraftChange((current) => ({ ...current, focus: e.target.value }))} placeholder="Primary focus" style={styles.input} />
        <textarea value={draft.summary} onChange={(e) => onDraftChange((current) => ({ ...current, summary: e.target.value }))} placeholder="Summary" style={styles.textarea} />
        <textarea value={draft.meals} onChange={(e) => onDraftChange((current) => ({ ...current, meals: e.target.value }))} placeholder="Meals or daily structure" style={styles.textarea} />
        <textarea value={draft.workout_days} onChange={(e) => onDraftChange((current) => ({ ...current, workout_days: e.target.value }))} placeholder="Training split or workout days" style={styles.textarea} />
        <textarea value={draft.notes} onChange={(e) => onDraftChange((current) => ({ ...current, notes: e.target.value }))} placeholder="Coach notes" style={styles.textarea} />
        <button type="submit" style={styles.primaryButton} disabled={isSaving}>
          {isSaving ? "Saving plan..." : `Create ${title.toLowerCase()}`}
        </button>
      </form>

      <div style={styles.historyHeader}>Plan history</div>
      {!plans.length ? <div style={styles.emptyText}>No saved plans yet.</div> : null}
      <div style={styles.historyList}>
        {plans.map((plan) => (
          <div key={plan.id} style={styles.historyCard}>
            <div style={styles.historyTopRow}>
              <div>
                <div style={styles.historyTitle}>{plan.title}</div>
                <div style={styles.historyMeta}>
                  {plan.period_type} · {plan.period_start} → {plan.period_end}
                </div>
              </div>
              <a
                href={getPdfUrl(plan.id)}
                target="_blank"
                rel="noreferrer"
                style={styles.linkButton}
                onClick={(event) => {
                  event.preventDefault();
                  const token = getStoredAccessToken();
                  window.open(`${getPdfUrl(plan.id)}?token=${encodeURIComponent(token)}`, "_blank", "noopener,noreferrer");
                }}
              >
                PDF
              </a>
            </div>
            <div style={styles.historySummary}>{plan.content.summary}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderTabButton(
  tab: AppTab,
  label: string,
  activeTab: AppTab,
  onTabChange: (tab: AppTab) => void
) {
  return (
    <button
      key={tab}
      style={activeTab === tab ? styles.navItemActive : styles.navItem}
      onClick={() => onTabChange(tab)}
    >
      {label}
    </button>
  );
}

function formatAnalysisStatus(status: string) {
  switch (status) {
    case "queued":
      return "Queued";
    case "running":
      return "Running";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return "Unknown";
  }
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", display: "flex", backgroundColor: "#f1f5f9" },
  sidebar: { width: "280px", backgroundColor: "#ffffff", borderRight: "1px solid #e2e8f0", padding: "20px", boxSizing: "border-box" },
  brandRow: { display: "flex", alignItems: "center", gap: "12px" },
  brandIcon: { width: "40px", height: "40px", borderRadius: "14px", backgroundColor: "#0f172a", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 },
  brandTitle: { fontSize: "18px", fontWeight: 700 },
  brandSubtitle: { fontSize: "12px", color: "#64748b" },
  navSection: { marginTop: "24px", display: "flex", flexDirection: "column", gap: "8px" },
  navItemActive: { padding: "10px 12px", borderRadius: "12px", backgroundColor: "#f1f5f9", fontWeight: 600, border: "none", textAlign: "left", cursor: "pointer" },
  navItem: { padding: "10px 12px", borderRadius: "12px", color: "#64748b", border: "none", backgroundColor: "transparent", textAlign: "left", cursor: "pointer" },
  main: { flex: 1, padding: "24px", boxSizing: "border-box" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
  pageTitle: { margin: 0, fontSize: "32px", color: "#0f172a" },
  pageSubtitle: { marginTop: "10px", color: "#475569", lineHeight: 1.5 },
  layout: { display: "grid", gridTemplateColumns: "340px 1fr", gap: "20px", alignItems: "start" },
  column: { display: "flex", flexDirection: "column", gap: "20px" },
  detailColumn: { display: "flex", flexDirection: "column", gap: "20px" },
  panel: { backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "24px", padding: "24px" },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px" },
  panelTitle: { fontWeight: 700, fontSize: "18px", marginBottom: "16px" },
  panelTitleNoMargin: { fontWeight: 700, fontSize: "18px" },
  detailHeader: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "start", marginBottom: "20px" },
  detailTabRow: { display: "flex", gap: "10px", marginTop: "18px", flexWrap: "wrap" },
  detailTab: { padding: "10px 14px", borderRadius: "999px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#475569", cursor: "pointer", fontWeight: 600 },
  detailTabActive: { padding: "10px 14px", borderRadius: "999px", border: "1px solid #0f172a", backgroundColor: "#0f172a", color: "#ffffff", cursor: "pointer", fontWeight: 600 },
  detailTitle: { fontWeight: 700, fontSize: "24px", color: "#0f172a" },
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  profileGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px", alignItems: "center" },
  inlineGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" },
  input: { padding: "12px 14px", borderRadius: "12px", border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box", backgroundColor: "#fff" },
  textarea: { minHeight: "92px", padding: "12px 14px", borderRadius: "12px", border: "1px solid #cbd5e1", resize: "vertical", fontFamily: "inherit" },
  checkboxRow: { display: "flex", alignItems: "center", gap: "8px", color: "#334155" },
  primaryButton: { padding: "12px 14px", borderRadius: "12px", border: "none", backgroundColor: "#0f172a", color: "#ffffff", fontWeight: 600, cursor: "pointer" },
  secondaryButton: { padding: "10px 14px", borderRadius: "12px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", cursor: "pointer" },
  errorBox: { backgroundColor: "#fee2e2", color: "#b91c1c", borderRadius: "16px", padding: "14px", marginBottom: "16px" },
  successBox: { backgroundColor: "#dcfce7", color: "#166534", borderRadius: "16px", padding: "14px", marginBottom: "16px" },
  clientList: { display: "flex", flexDirection: "column", gap: "12px" },
  clientCard: { padding: "16px", borderRadius: "16px", border: "1px solid #e2e8f0", backgroundColor: "#ffffff", textAlign: "left", cursor: "pointer" },
  clientCardActive: { padding: "16px", borderRadius: "16px", border: "1px solid #0f172a", backgroundColor: "#f8fafc", textAlign: "left", cursor: "pointer" },
  clientName: { fontWeight: 700, color: "#0f172a" },
  clientMeta: { marginTop: "8px", color: "#64748b", fontSize: "14px" },
  emptyText: { color: "#64748b", lineHeight: 1.6 },
  emptyTitle: { fontWeight: 700, fontSize: "20px", color: "#0f172a", marginBottom: "8px" },
  twoColumnGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" },
  snapshotGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 18px" },
  snapshotRow: { color: "#334155", marginBottom: "10px", lineHeight: 1.5 },
  snapshotLabel: { color: "#64748b", fontWeight: 600, marginRight: "8px" },
  historyHeader: { marginTop: "20px", fontWeight: 700, color: "#0f172a" },
  historyList: { display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" },
  historyCard: { borderRadius: "16px", border: "1px solid #e2e8f0", padding: "14px", backgroundColor: "#f8fafc" },
  historyTopRow: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "start" },
  historyTitle: { fontWeight: 700, color: "#0f172a" },
  historyMeta: { color: "#64748b", fontSize: "13px", marginTop: "4px" },
  historySummary: { color: "#475569", marginTop: "10px", lineHeight: 1.5, whiteSpace: "pre-wrap" },
  linkButton: { display: "inline-flex", alignItems: "center", padding: "8px 12px", borderRadius: "10px", backgroundColor: "#0f172a", color: "#fff", textDecoration: "none", fontSize: "14px" },
};
