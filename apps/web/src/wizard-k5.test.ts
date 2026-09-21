import { describe, expect, it } from "vitest";
import {
  AUTH_ERROR_INVALID_CREDENTIALS,
  AUTH_ERROR_SESSION_REQUIRED,
  authCodeToK5,
  k5Title,
} from "@liowms/shared";

describe("login K5 mapping", () => {
  it("maps auth error codes to K5 variants", () => {
    expect(authCodeToK5(AUTH_ERROR_INVALID_CREDENTIALS)).toBe("invalid_credentials");
    expect(authCodeToK5(AUTH_ERROR_SESSION_REQUIRED)).toBe("session_expired");
  });

  it("provides PT-BR titles for K5", () => {
    expect(k5Title("session_expired")).toMatch(/sessão/i);
  });
});
