import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import styles from "../components/install-shell.module.css";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <p>Verificando sessão…</p>
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return (
      <Navigate
        to={`/login?reason=session_expired&next=${next}`}
        replace
      />
    );
  }

  return children;
}
