import { Navigate } from "react-router-dom";
import { hasBootstrapRole } from "@liowms/shared";
import { useAuth } from "../auth/AuthProvider";
import styles from "../components/install-shell.module.css";

export function AppHomeRedirect() {
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

  if (hasBootstrapRole(user, "super_admin")) {
    return <Navigate to="/app/platform/tenants" replace />;
  }

  const tenantId = user.tenantIds[0];
  if (tenantId) {
    return <Navigate to={`/app/t/${tenantId}/plants`} replace />;
  }

  return <Navigate to="/app/forbidden" replace state={{ reason: "forbidden" }} />;
}
