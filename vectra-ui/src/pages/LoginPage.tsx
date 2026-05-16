import React from "react";

type LoginPageProps = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  authMode: "signin" | "signup";
  error: string;
  isSubmitting: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onModeChange: (mode: "signin" | "signup") => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export default function LoginPage({
  email,
  password,
  firstName,
  lastName,
  authMode,
  error,
  isSubmitting,
  onEmailChange,
  onPasswordChange,
  onFirstNameChange,
  onLastNameChange,
  onModeChange,
  onSubmit,
}: LoginPageProps) {
  const isSignup = authMode === "signup";

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Vectra</h1>
        <p style={styles.subtitle}>Fitness Coach Client Management</p>

        <div style={styles.modeRow}>
          <button
            type="button"
            style={isSignup ? styles.modeButton : styles.modeButtonActive}
            onClick={() => onModeChange("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            style={isSignup ? styles.modeButtonActive : styles.modeButton}
            onClick={() => onModeChange("signup")}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={onSubmit} style={styles.form}>
          {isSignup ? (
            <>
              <input
                value={firstName}
                onChange={(e) => onFirstNameChange(e.target.value)}
                placeholder="First name"
                style={styles.input}
              />
              <input
                value={lastName}
                onChange={(e) => onLastNameChange(e.target.value)}
                placeholder="Last name"
                style={styles.input}
              />
            </>
          ) : null}

          <input
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="Email"
            style={styles.input}
          />

          <input
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="Password"
            style={styles.input}
          />

          {error ? <div style={styles.error}>{error}</div> : null}

          <button type="submit" style={styles.button} disabled={isSubmitting}>
            {isSubmitting
              ? isSignup
                ? "Creating account..."
                : "Signing in..."
              : isSignup
                ? "Create coach account"
                : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
  },
  card: {
    width: "100%",
    maxWidth: "440px",
    backgroundColor: "#ffffff",
    padding: "32px",
    borderRadius: "20px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    border: "1px solid #e2e8f0",
  },
  title: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 700,
  },
  subtitle: {
    marginTop: "8px",
    marginBottom: "24px",
    color: "#64748b",
  },
  modeRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
    marginBottom: "16px",
  },
  modeButton: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    cursor: "pointer",
  },
  modeButtonActive: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #0f172a",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    cursor: "pointer",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  input: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
  },
  error: {
    color: "#dc2626",
    fontSize: "14px",
  },
  button: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "none",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    fontSize: "14px",
    cursor: "pointer",
  },
};
