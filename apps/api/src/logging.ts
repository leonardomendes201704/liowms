/** Redact DSN passwords and other secrets from log lines. */
const DSN_PASSWORD_RE =
  /(postgres(?:ql)?:\/\/[^:]+:)([^@]+)(@)/gi;

export function redactSecrets(message: string): string {
  return message.replace(DSN_PASSWORD_RE, "$1********$3");
}

export function safeLog(level: "info" | "error", msg: string, extra?: unknown) {
  const line = extra === undefined ? msg : `${msg} ${JSON.stringify(extra)}`;
  const safe = redactSecrets(line);
  if (level === "error") {
    console.error(safe);
  } else {
    console.log(safe);
  }
}
