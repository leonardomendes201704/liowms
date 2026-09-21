import type { ReactNode } from "react";
import styles from "./install-shell.module.css";

const GALLERY = "http://127.0.0.1:9200/gallery/OBJ-LIOWMS-001/design/concepts";
export const MOCK_K5 = `${GALLERY}/k5-login.png`;

export function LoginShell({
  mockRef = MOCK_K5,
  children,
}: {
  mockRef?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logoMark} aria-hidden />
          <div>
            <p className={styles.brandEyebrow}>LioWMS</p>
            <h1 className={styles.brandTitle}>Acesso à instância</h1>
          </div>
        </div>
        <a
          className={styles.mockLink}
          href={mockRef}
          target="_blank"
          rel="noreferrer"
        >
          Referência visual (MinIO K5)
        </a>
      </header>
      <main className={styles.card}>{children}</main>
    </div>
  );
}
