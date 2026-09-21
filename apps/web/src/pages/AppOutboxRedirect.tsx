import { Navigate } from "react-router-dom";
import { tenantNotifyAppPath } from "@liowms/shared";
import { useAuth } from "../auth/AuthProvider";
import styles from "../components/install-shell.module.css";

/** `/app/outbox` → tenant-scoped K14 route. */
export function AppOutboxRedirect() {
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

  const tenantId = user.tenantIds[0];
  if (tenantId) {
    return <Navigate to={tenantNotifyAppPath(tenantId)} replace />;
  }

  return <Navigate to="/app/forbidden" replace state={{ reason: "forbidden" }} />;
}
