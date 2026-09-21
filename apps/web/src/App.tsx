import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";
import { RequireRole } from "./auth/RequireRole";
import { RequireTenantAccess } from "./auth/RequireTenantAccess";
import { InstallWizardPage } from "./pages/InstallWizardPage";
import { AppShellPage } from "./pages/AppShellPage";
import { AppHomeRedirect } from "./pages/AppHomeRedirect";
import { ForbiddenPage } from "./pages/ForbiddenPage";
import { PlatformTenantsPage } from "./pages/PlatformTenantsPage";
import { TenantPlantsPage } from "./pages/TenantPlantsPage";
import { TenantInvitePage } from "./pages/TenantInvitePage";
import { TenantSettingsPage } from "./pages/TenantSettingsPage";
import { TenantAuditPage } from "./pages/TenantAuditPage";
import { TenantLedgerPage } from "./pages/TenantLedgerPage";
import { AppAuditRedirect } from "./pages/AppAuditRedirect";
import { AppLedgerRedirect } from "./pages/AppLedgerRedirect";
import { AppOutboxRedirect } from "./pages/AppOutboxRedirect";
import { TenantOutboxPage } from "./pages/TenantOutboxPage";
import { AppKernelRedirect } from "./pages/AppKernelRedirect";
import { TenantKernelHealthPage } from "./pages/TenantKernelHealthPage";
import { InviteAcceptPage } from "./pages/InviteAcceptPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LoginPage } from "./pages/LoginPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/install/*" element={<InstallWizardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/forgot" element={<ForgotPasswordPage />} />
        <Route path="/login/reset" element={<ResetPasswordPage />} />
        <Route path="/invite/accept" element={<InviteAcceptPage />} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShellPage />
            </RequireAuth>
          }
        >
          <Route index element={<AppHomeRedirect />} />
          <Route path="audit" element={<AppAuditRedirect />} />
          <Route path="ledger" element={<AppLedgerRedirect />} />
          <Route path="outbox" element={<AppOutboxRedirect />} />
          <Route path="kernel" element={<AppKernelRedirect />} />
          <Route path="forbidden" element={<ForbiddenPage />} />
          <Route
            path="platform/tenants"
            element={
              <RequireRole role="super_admin">
                <PlatformTenantsPage />
              </RequireRole>
            }
          />
          <Route
            path="t/:tenantId/plants"
            element={
              <RequireTenantAccess>
                <TenantPlantsPage />
              </RequireTenantAccess>
            }
          />
          <Route
            path="t/:tenantId/invite"
            element={
              <RequireTenantAccess>
                <TenantInvitePage />
              </RequireTenantAccess>
            }
          />
          <Route
            path="t/:tenantId/audit"
            element={
              <RequireTenantAccess>
                <TenantAuditPage />
              </RequireTenantAccess>
            }
          />
          <Route
            path="t/:tenantId/ledger"
            element={
              <RequireTenantAccess>
                <TenantLedgerPage />
              </RequireTenantAccess>
            }
          />
          <Route
            path="t/:tenantId/outbox"
            element={
              <RequireTenantAccess>
                <TenantOutboxPage />
              </RequireTenantAccess>
            }
          />
          <Route
            path="t/:tenantId/kernel"
            element={
              <RequireTenantAccess>
                <TenantKernelHealthPage />
              </RequireTenantAccess>
            }
          />
          <Route
            path="t/:tenantId/settings"
            element={
              <RequireTenantAccess>
                <TenantSettingsPage />
              </RequireTenantAccess>
            }
          />
        </Route>
        <Route path="/" element={<Navigate to="/install" replace />} />
        <Route path="*" element={<Navigate to="/install" replace />} />
      </Routes>
    </AuthProvider>
  );
}
