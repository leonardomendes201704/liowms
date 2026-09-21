import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AUTH_ERROR_INVALID_CREDENTIALS,
  AUTH_ERROR_NOT_INSTALLED,
  AUTH_ERROR_SESSION_REQUIRED,
  authCodeToK5,
  k5Title,
} from "./auth.js";

describe("auth K5 mapping", () => {
  it("maps auth error codes to K5 variants", () => {
    assert.equal(authCodeToK5(AUTH_ERROR_INVALID_CREDENTIALS), "invalid_credentials");
    assert.equal(authCodeToK5(AUTH_ERROR_SESSION_REQUIRED), "session_expired");
    assert.equal(authCodeToK5(AUTH_ERROR_NOT_INSTALLED), "not_installed");
  });

  it("provides PT-BR titles for K5", () => {
    assert.match(k5Title("invalid_credentials"), /incorretos/i);
    assert.match(k5Title("not_installed"), /instalada/i);
  });
});
