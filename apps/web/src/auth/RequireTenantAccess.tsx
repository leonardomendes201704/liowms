import { Navigate, useParams } from "react-router-dom";
import { userCanAccessTenant } from "@liowms/shared";
import { useAuth } from "./AuthProvider";
import styles from "../components/install-shell.module.css";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function RequireTenantAccess({ children }: { children: React.ReactNode }) {
  const { tenantId } = useParams<{ tenantId: string }>();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <p>Verificando permissões…</p>
      </div>
    );
  }

  if (!user || !tenantId || !UUID_RE.test(tenantId)) {
    return <Navigate to="/app/forbidden" replace state={{ reason: "cross_tenant" }} />;
  }

  if (!userCanAccessTenant(user, tenantId)) {
    return <Navigate to="/app/forbidden" replace state={{ reason: "cross_tenant" }} />;
  }

  return children;
}
