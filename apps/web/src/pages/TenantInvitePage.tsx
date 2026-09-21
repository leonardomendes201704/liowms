import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createInvite } from "../api/auth-client";
import { LioBtnPrimary, LioField, LioSelect } from "../components/install-ui";
import styles from "../components/install-shell.module.css";

export function TenantInvitePage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"tenant_admin" | "operator">("tenant_admin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await createInvite({
        email: email.trim(),
        tenantId,
        role,
      });
      if ("code" in result) {
        setError(result.message);
        return;
      }
      if ("ok" in result && result.ok) {
        setMessage(
          "Convite enfileirado. Verifique a caixa de entrada ou a fila K14.",
        );
        setEmail("");
      }
    } catch {
      setError("Não foi possível enviar o convite.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.card}>
      <h2 className={styles.sectionTitle}>Convidar usuário (K13)</h2>
      <p className={styles.sectionLead}>
        Convite escopado ao tenant{" "}
        <code className={styles.inlineCode}>{tenantId}</code>.{" "}
        <Link to={`/app/t/${tenantId}/plants`} className={styles.mockLink}>
          Voltar às plantas
        </Link>
      </p>

      {error ? (
        <p className={styles.errorMessage} role="alert">{error}</p>
      ) : null}
      {message ? (
        <p className={styles.successMessage} role="status">{message}</p>
      ) : null}

      <form className={styles.formStack} onSubmit={onSubmit}>
        <LioField
          id="inviteEmail"
          label="E-mail"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <LioSelect
          id="inviteRole"
          label="Papel"
          value={role}
          onChange={(v) => setRole(v as "tenant_admin" | "operator")}
          options={[
            { value: "tenant_admin", label: "Admin do tenant" },
            { value: "operator", label: "Operador" },
          ]}
        />
        <div className={styles.actions}>
          <LioBtnPrimary
            type="submit"
            loading={busy}
            disabled={!email.trim()}
          >
            Enviar convite
          </LioBtnPrimary>
        </div>
      </form>
    </main>
  );
}
