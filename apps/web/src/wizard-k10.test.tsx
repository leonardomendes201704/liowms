/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  TENANT_AUDIT_HTTP,
  k10AuditTitle,
  tenantAuditAppPath,
} from "@liowms/shared";
import { TenantAuditPage } from "./pages/TenantAuditPage";

const listTenantAuditEvents = vi.fn();

vi.mock("./api/tenant-audit-client", () => ({
  listTenantAuditEvents: (...args: unknown[]) => listTenantAuditEvents(...args),
}));

const tenantId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("K10 audit log UI (WMS-98)", () => {
  beforeEach(() => {
    listTenantAuditEvents.mockResolvedValue({
      events: [
        {
          id: "evt-1",
          tenantId,
          occurredAt: "2026-09-21T10:00:00.000Z",
          actorUserId: "user-admin",
          action: "settings.patch",
          entityType: "config",
          entityKey: "smtp.host",
          beforeJson: { value: "old.example.com" },
          afterJson: { value: "new.example.com" },
        },
      ],
      page: 1,
      limit: 25,
      total: 1,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("exposes audit API path and app route", () => {
    expect(TENANT_AUDIT_HTTP.events).toBe("/api/v1/tenant/audit-events");
    expect(tenantAuditAppPath(tenantId)).toBe(`/app/t/${tenantId}/audit`);
  });

  it("renders table and diff from mocked API", async () => {
    render(
      <MemoryRouter initialEntries={[`/app/t/${tenantId}/audit`]}>
        <Routes>
          <Route
            path="/app/t/:tenantId/audit"
            element={<TenantAuditPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(k10AuditTitle())).toBeTruthy();

    await waitFor(() => {
      expect(listTenantAuditEvents).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({}),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("settings.patch")).toBeTruthy();
    });

    expect(screen.getByText(/old\.example\.com/)).toBeTruthy();
    expect(screen.getByText(/new\.example\.com/)).toBeTruthy();
  });
});
