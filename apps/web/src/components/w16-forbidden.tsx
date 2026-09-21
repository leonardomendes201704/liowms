import { Link } from "react-router-dom";
import { w16Message, w16Title, type W16Reason } from "@liowms/shared";
import styles from "./install-shell.module.css";

export function W16Forbidden({
  reason = "cross_tenant",
  homeTo = "/app",
}: {
  reason?: W16Reason;
  homeTo?: string;
}) {
  return (
    <div className={styles.errorPanel} role="alert">
      <h2 className={styles.errorTitle}>{w16Title(reason)}</h2>
      <p className={styles.errorMessage}>{w16Message(reason)}</p>
      <div className={styles.errorActions}>
        <Link to={homeTo} className={styles.btnGhost}>
          Voltar à área segura
        </Link>
      </div>
    </div>
  );
}
