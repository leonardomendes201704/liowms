import type { ReactNode } from "react";
import styles from "./install-shell.module.css";

const STEP_LABELS = [
  "Idioma e fuso",
  "Banco de dados",
  "Administrador",
  "Conclusão",
] as const;

interface LioWizardStepperProps {
  activeStep: 1 | 2 | 3 | 4;
}

export function LioWizardStepper({ activeStep }: LioWizardStepperProps) {
  return (
    <nav className={styles.stepper} aria-label="Passos da instalação">
      <ol className={styles.stepperList}>
        {STEP_LABELS.map((label, index) => {
          const step = (index + 1) as 1 | 2 | 3 | 4;
          const state =
            step < activeStep ? "done" : step === activeStep ? "current" : "upcoming";
          return (
            <li key={label} className={styles.stepperItem} data-state={state}>
              <span className={styles.stepperIndex}>{step}</span>
              <span className={styles.stepperLabel}>{label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface LioBtnPrimaryProps {
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

export function LioBtnPrimary({
  children,
  type = "button",
  disabled,
  loading,
  onClick,
}: LioBtnPrimaryProps) {
  return (
    <button
      type={type}
      className={styles.btnPrimary}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? <span className={styles.btnSpinner} aria-hidden /> : null}
      <span>{loading ? "Aguarde…" : children}</span>
    </button>
  );
}

interface LioFieldProps {
  id: string;
  label: string;
  hint?: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  masked?: boolean;
}

export function LioField({
  id,
  label,
  hint,
  type = "text",
  value,
  onChange,
  autoComplete,
  masked,
}: LioFieldProps) {
  return (
    <label className={styles.field} htmlFor={id}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        id={id}
        className={masked ? `${styles.fieldInput} ${styles.fieldMasked}` : styles.fieldInput}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <span className={styles.fieldHint}>{hint}</span> : null}
    </label>
  );
}

interface LioSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

export function LioSelect({ id, label, value, onChange, options }: LioSelectProps) {
  return (
    <label className={styles.field} htmlFor={id}>
      <span className={styles.fieldLabel}>{label}</span>
      <select
        id={id}
        className={styles.fieldInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface LioErrorPanelProps {
  title: string;
  message: string;
  logExcerpt?: string[];
  onRetry?: () => void;
  secondaryAction?: ReactNode;
}

export function LioErrorPanel({
  title,
  message,
  logExcerpt,
  onRetry,
  secondaryAction,
}: LioErrorPanelProps) {
  return (
    <div className={styles.errorPanel} role="alert">
      <h2 className={styles.errorTitle}>{title}</h2>
      <p className={styles.errorMessage}>{message}</p>
      {logExcerpt && logExcerpt.length > 0 ? (
        <pre className={styles.errorLog}>{logExcerpt.slice(0, 3).join("\n")}</pre>
      ) : null}
      <div className={styles.errorActions}>
        {onRetry ? (
          <LioBtnPrimary onClick={onRetry}>Tentar novamente</LioBtnPrimary>
        ) : null}
        {secondaryAction}
      </div>
    </div>
  );
}

export function InstallShell({
  step,
  mockRef,
  children,
}: {
  step: 1 | 2 | 3 | 4;
  mockRef: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logoMark} aria-hidden />
          <div>
            <p className={styles.brandEyebrow}>LioWMS</p>
            <h1 className={styles.brandTitle}>Assistente de instalação</h1>
          </div>
        </div>
        <a
          className={styles.mockLink}
          href={mockRef}
          target="_blank"
          rel="noreferrer"
        >
          Referência visual (MinIO)
        </a>
      </header>
      <LioWizardStepper activeStep={step} />
      <main className={styles.card}>{children}</main>
    </div>
  );
}
