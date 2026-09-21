import { useLocation } from "react-router-dom";
import type { W16Reason } from "@liowms/shared";
import { W16Forbidden } from "../components/w16-forbidden";
import styles from "../components/install-shell.module.css";

export function ForbiddenPage() {
  const location = useLocation();
  const reason = (location.state as { reason?: W16Reason } | null)?.reason;

  return (
    <main className={styles.card}>
      <W16Forbidden reason={reason ?? "cross_tenant"} />
    </main>
  );
}
