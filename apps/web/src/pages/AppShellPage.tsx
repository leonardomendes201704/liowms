import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import styles from "../components/install-shell.module.css";

export function AppShellPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function onLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logoMark} aria-hidden />
          <div>
            <p className={styles.brandEyebrow}>LioWMS</p>
            <h1 className={styles.brandTitle}>Área autenticada</h1>
          </div>
        </div>
      </header>
      <main className={styles.card}>
        <h2 className={styles.sectionTitle}>Shell mínimo (S0.2)</h2>
        <p className={styles.sectionLead}>
          Placeholder até o slice S-UX. Sessão ativa para{" "}
          <strong>{user?.displayName ?? user?.email}</strong>
          {user?.roles?.length ? ` · ${user.roles.join(", ")}` : null}.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.btnGhost} onClick={onLogout}>
            Sair
          </button>
        </div>
      </main>
    </div>
  );
}
