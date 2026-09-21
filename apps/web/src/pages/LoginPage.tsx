import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AUTH_ERROR_NOT_INSTALLED,
  authCodeToK5,
  type K5Variant,
} from "@liowms/shared";
import { login } from "../api/auth-client";
import { fetchHealth } from "../api/install-client";
import { useAuth } from "../auth/AuthProvider";
import { K5Alert } from "../components/k5-alert";
import { LioBtnPrimary, LioField } from "../components/install-ui";
import { LoginShell } from "../components/login-shell";
import styles from "../components/install-shell.module.css";

function reasonToK5(reason: string | null): K5Variant | null {
  if (reason === "session_expired") return "session_expired";
  return null;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, refresh, setUser } = useAuth();

  const [bootLoading, setBootLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [k5, setK5] = useState<K5Variant | null>(() =>
    reasonToK5(params.get("reason")),
  );
  const [k5Detail, setK5Detail] = useState<string | undefined>();

  const nextPath = useMemo(() => {
    const raw = params.get("next");
    if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
      return decodeURIComponent(raw);
    }
    return "/app";
  }, [params]);

  useEffect(() => {
    if (user) {
      navigate(nextPath, { replace: true });
    }
  }, [user, navigate, nextPath]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const health = await fetchHealth();
        if (cancelled) return;
        if (!health.installed && health.phase !== "installed") {
          setK5("not_installed");
          setK5Detail(undefined);
        }
      } catch {
        if (!cancelled) {
          setK5Detail("Não foi possível verificar o estado da instância.");
        }
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setK5(null);
    setK5Detail(undefined);
    setBusy(true);
    try {
      const result = await login(email.trim(), password);
      if ("ok" in result && result.ok) {
        setUser(result.user);
        await refresh();
        navigate(nextPath, { replace: true });
        return;
      }
      if ("code" in result) {
        const variant = authCodeToK5(result.code);
        if (variant) {
          setK5(variant);
          setK5Detail(result.message);
        } else if (result.code === AUTH_ERROR_NOT_INSTALLED) {
          setK5("not_installed");
          setK5Detail(result.message);
        } else {
          setK5Detail(result.message);
        }
      }
    } catch {
      setK5Detail("Falha de rede ao autenticar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  if (bootLoading) {
    return (
      <LoginShell>
        <div className={styles.loadingScreen}>Carregando…</div>
      </LoginShell>
    );
  }

  return (
    <LoginShell>
      {k5 || k5Detail ? (
        <K5Alert
          variant={k5}
          message={k5Detail}
          onDismiss={() => {
            setK5(null);
            setK5Detail(undefined);
          }}
        />
      ) : null}

      {k5 === "not_installed" ? (
        <div className={styles.actions}>
          <Link className={styles.linkButton} to="/install">
            Abrir assistente de instalação
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <h2 className={styles.sectionTitle}>Entrar</h2>
          <p className={styles.sectionLead}>
            Use o e-mail e a senha do super-admin criados na instalação.
          </p>
          <LioField
            id="loginEmail"
            label="E-mail"
            type="email"
            autoComplete="username"
            value={email}
            onChange={setEmail}
          />
          <LioField
            id="loginPassword"
            label="Senha"
            type="password"
            autoComplete="current-password"
            masked
            value={password}
            onChange={setPassword}
          />
          <p style={{ margin: "0 0 var(--lio-space-md)" }}>
            <Link to="/login/forgot">Esqueci minha senha</Link>
          </p>
          <div className={styles.actions}>
            <LioBtnPrimary type="submit" loading={busy} disabled={!email || !password}>
              Entrar
            </LioBtnPrimary>
          </div>
        </form>
      )}
    </LoginShell>
  );
}
