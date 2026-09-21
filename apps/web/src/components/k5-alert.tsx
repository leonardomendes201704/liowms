import {
  authCodeToK5,
  k5Message,
  k5Title,
  type K5Variant,
} from "@liowms/shared";
import styles from "./install-shell.module.css";

export function K5Alert({
  variant,
  code,
  message,
  onDismiss,
}: {
  variant?: K5Variant | null;
  code?: string;
  message?: string;
  onDismiss?: () => void;
}) {
  const resolved = variant ?? (code ? authCodeToK5(code) : null);
  if (!resolved) {
    if (!message) return null;
    return (
      <div className={styles.errorPanel} role="alert">
        <h2 className={styles.errorTitle}>Não foi possível continuar</h2>
        <p className={styles.errorMessage}>{message}</p>
        {onDismiss ? (
          <div className={styles.errorActions}>
            <button type="button" className={styles.btnGhost} onClick={onDismiss}>
              Fechar
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.errorPanel} role="alert">
      <h2 className={styles.errorTitle}>{k5Title(resolved)}</h2>
      <p className={styles.errorMessage}>{message ?? k5Message(resolved)}</p>
      {onDismiss ? (
        <div className={styles.errorActions}>
          <button type="button" className={styles.btnGhost} onClick={onDismiss}>
            Fechar
          </button>
        </div>
      ) : null}
    </div>
  );
}
