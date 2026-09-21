import { describe, expect, it } from "vitest";
import {
  INSTALL_ERROR_ALREADY_DONE,
  INSTALL_ERROR_INVALID_DSN,
  installCodeToK4,
  k4Title,
} from "@liowms/shared";

describe("wizard K4 mapping", () => {
  it("maps install error codes to K4 variants", () => {
    expect(installCodeToK4(INSTALL_ERROR_INVALID_DSN)).toBe("db_refused");
    expect(installCodeToK4(INSTALL_ERROR_ALREADY_DONE)).toBe("already_installed");
  });

  it("provides PT-BR titles for K4", () => {
    expect(k4Title("already_installed")).toMatch(/instalada/i);
  });
});
