import { Link, Outlet, useNavigate } from "react-router-dom";
import { hasBootstrapRole } from "@liowms/shared";
import { useAuth } from "../auth/AuthProvider";
import styles from "../components/install-shell.module.css";

export function AppShellPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = user ? hasBootstrapRole(user, "super_admin") : false;

  async function onLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className={styles.shellWide}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logoMark} aria-hidden />
          <div>
            <p className={styles.brandEyebrow}>LioWMS</p>
            <h1 className={styles.brandTitle}>Administração</h1>
          </div>
        </div>
        <div className={styles.headerActions}>
          {isSuperAdmin ? (
            <Link to="/app/platform/tenants" className={styles.mockLink}>
              Tenants (K6)
            </Link>
          ) : null}
          {user?.tenantIds[0] ? (
            <>
              <Link
                to={`/app/t/${user.tenantIds[0]}/plants`}
                className={styles.mockLink}
              >
                Minhas plantas
              </Link>
              <Link
                to={`/app/t/${user.tenantIds[0]}/settings`}
                className={styles.mockLink}
              >
                Configurações (K9)
              </Link>
            </>
          ) : null}
          <button type="button" className={styles.btnGhost} onClick={onLogout}>
            Sair
          </button>
        </div>
      </header>
      {user ? (
        <p className={styles.sessionMeta}>
          {user.displayName ?? user.email}
          {user.roles.length ? ` · ${user.roles.join(", ")}` : ""}
          {user.tenantIds.length
            ? ` · ${user.tenantIds.length} tenant(s)`
            : null}
        </p>
      ) : null}
      <Outlet />
    </div>
  );
}
