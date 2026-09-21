import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { acceptInvite } from "../api/auth-client";
import { LioBtnPrimary, LioField } from "../components/install-ui";
import { LoginShell } from "../components/login-shell";
import styles from "../components/install-shell.module.css";

export function InviteAcceptPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tokenFromUrl = params.get("token") ?? "";

  const [token, setToken] = useState(tokenFromUrl);
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await acceptInvite({
        token: token.trim(),
        password,
        displayName: displayName.trim(),
      });
      if ("code" in result) {
        setError(result.message);
        return;
      }
      if ("ok" in result && result.ok) {
        navigate("/login", { replace: true });
      }
    } catch {
      setError("Não foi possível aceitar o convite.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <LoginShell>
      <h2 className={styles.sectionTitle}>Aceitar convite (K13)</h2>
      <p className={styles.sectionLead}>
        Primeiro acesso ao tenant — defina seu nome e senha.
      </p>
      {error ? (
        <p className={styles.errorMessage} role="alert">{error}</p>
      ) : null}
      <form className={styles.formStack} onSubmit={onSubmit}>
        <LioField
          id="inviteToken"
          label="Token do convite"
          value={token}
          onChange={setToken}
          hint="Cole o token do e-mail ou link de staging."
        />
        <LioField
          id="displayName"
          label="Nome de exibição"
          value={displayName}
          onChange={setDisplayName}
        />
        <LioField
          id="password"
          label="Senha"
          type="password"
          value={password}
          onChange={setPassword}
          masked
          autoComplete="new-password"
        />
        <div className={styles.actions}>
          <LioBtnPrimary
            type="submit"
            loading={busy}
            disabled={!token.trim() || !displayName.trim() || !password}
          >
            Criar conta e continuar
          </LioBtnPrimary>
        </div>
      </form>
      <p className={styles.sectionLead}>
        Já tem conta? <Link to="/login">Fazer login</Link>
      </p>
    </LoginShell>
  );
}
