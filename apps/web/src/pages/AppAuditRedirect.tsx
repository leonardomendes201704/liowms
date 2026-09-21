import { Navigate } from "react-router-dom";
import { hasBootstrapRole, tenantAuditAppPath } from "@liowms/shared";
import { useAuth } from "../auth/AuthProvider";
import styles from "../components/install-shell.module.css";

/** `/app/audit` → tenant-scoped K10 route for the active membership. */
export function AppAuditRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <p>Carregando…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (hasBootstrapRole(user, "super_admin") && user.tenantIds[0]) {
    return (
      <Navigate to={tenantAuditAppPath(user.tenantIds[0])} replace />
    );
  }

  const tenantId = user.tenantIds[0];
  if (tenantId) {
    return <Navigate to={tenantAuditAppPath(tenantId)} replace />;
  }

  return <Navigate to="/app/forbidden" replace state={{ reason: "forbidden" }} />;
}
