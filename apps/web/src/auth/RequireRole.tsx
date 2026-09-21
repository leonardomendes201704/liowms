import { Navigate } from "react-router-dom";
import type { BootstrapRole } from "@liowms/shared";
import { hasBootstrapRole } from "@liowms/shared";
import { useAuth } from "./AuthProvider";
import styles from "../components/install-shell.module.css";

export function RequireRole({
  role,
  children,
  forbiddenTo = "/app/forbidden",
}: {
  role: BootstrapRole;
  children: React.ReactNode;
  forbiddenTo?: string;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <p>Verificando permissões…</p>
      </div>
    );
  }

  if (!user || !hasBootstrapRole(user, role)) {
    return (
      <Navigate to={forbiddenTo} replace state={{ reason: "forbidden" }} />
    );
  }

  return children;
}
