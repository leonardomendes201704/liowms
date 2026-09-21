import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AUTH_ERROR_INVALID_TOKEN, authCodeToK5 } from "@liowms/shared";
import { confirmPasswordReset } from "../api/auth-client";
import { K5Alert } from "../components/k5-alert";
import { LioBtnPrimary, LioField } from "../components/install-ui";
import { LoginShell } from "../components/login-shell";
import styles from "../components/install-shell.module.css";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token") ?? "", [params]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [k5Code, setK5Code] = useState<string | undefined>();

  const mismatch = confirm.length > 0 && password !== confirm;
  const weak = password.length > 0 && password.length < 8;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || mismatch || weak) return;
    setErrorMessage(undefined);
    setK5Code(undefined);
    setBusy(true);
    try {
      const result = await confirmPasswordReset(token, password);
      if ("ok" in result && result.ok) {
        navigate("/login", { replace: true });
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

  if (!token) {
    return (
      <LoginShell>
        <K5Alert
          code={AUTH_ERROR_INVALID_TOKEN}
          message="Link de redefinição inválido ou ausente. Solicite um novo e-mail."
        />
        <div className={styles.actions}>
          <Link className={styles.linkButton} to="/login/forgot">
            Solicitar novo link
          </Link>
        </div>
      </LoginShell>
    );
  }

  return (
    <LoginShell>
      <h2 className={styles.sectionTitle}>Nova senha</h2>
      <p className={styles.sectionLead}>
        Escolha uma senha forte com pelo menos 8 caracteres.
      </p>
      {errorMessage ? (
        <K5Alert
          code={k5Code}
          message={
            k5Code && authCodeToK5(k5Code) ? errorMessage : errorMessage
          }
        />
      ) : null}
      <form onSubmit={onSubmit}>
        <LioField
          id="newPassword"
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          masked
          value={password}
          onChange={setPassword}
          hint={weak ? "Mínimo de 8 caracteres" : undefined}
        />
        <LioField
          id="confirmPassword"
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
          masked
          value={confirm}
          onChange={setConfirm}
          hint={mismatch ? "As senhas não coincidem" : undefined}
        />
        <div className={styles.actions}>
          <Link className={styles.btnGhost} to="/login">
            Cancelar
          </Link>
          <LioBtnPrimary
            type="submit"
            loading={busy}
            disabled={!password || mismatch || weak}
          >
            Salvar e entrar
          </LioBtnPrimary>
        </div>
      </form>
    </LoginShell>
  );
}
