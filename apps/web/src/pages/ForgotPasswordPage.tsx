import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { authCodeToK5 } from "@liowms/shared";
import { requestPasswordReset } from "../api/auth-client";
import { K5Alert } from "../components/k5-alert";
import { LioBtnPrimary, LioField } from "../components/install-ui";
import { LoginShell } from "../components/login-shell";
import styles from "../components/install-shell.module.css";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [k5Code, setK5Code] = useState<string | undefined>();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(undefined);
    setK5Code(undefined);
    setBusy(true);
    try {
      const result = await requestPasswordReset(email.trim());
      if ("ok" in result && result.ok) {
        setSent(true);
        return;
      }
      if ("code" in result) {
        setK5Code(result.code);
        setErrorMessage(result.message);
      }
    } catch {
      setErrorMessage("Falha de rede. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <LoginShell>
      <h2 className={styles.sectionTitle}>Esqueci minha senha</h2>
      {sent ? (
        <div className={styles.successPanel}>
          <div className={styles.successIcon} aria-hidden>✓</div>
          <p className={styles.sectionLead}>
            Se o e-mail estiver cadastrado, você receberá um link para definir uma nova
            senha. Verifique também a pasta de spam.
          </p>
          <Link className={styles.linkButton} to="/login">
            Voltar ao login
          </Link>
        </div>
      ) : (
        <>
          <p className={styles.sectionLead}>
            Informe o e-mail da sua conta. Enviaremos instruções de redefinição (outbox
            staging em S0.2).
          </p>
          {errorMessage ? (
            <K5Alert
              code={k5Code}
              message={
                k5Code && authCodeToK5(k5Code)
                  ? errorMessage
                  : errorMessage
              }
            />
          ) : null}
          <form onSubmit={onSubmit}>
            <LioField
              id="forgotEmail"
              label="E-mail"
              type="email"
              autoComplete="username"
              value={email}
              onChange={setEmail}
            />
            <div className={styles.actions}>
              <Link className={styles.btnGhost} to="/login">
                Cancelar
              </Link>
              <LioBtnPrimary type="submit" loading={busy} disabled={!email}>
                Enviar link
              </LioBtnPrimary>
            </div>
          </form>
        </>
      )}
    </LoginShell>
  );
}
