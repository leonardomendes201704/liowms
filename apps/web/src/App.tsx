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
        </Route>
        <Route path="/" element={<Navigate to="/install" replace />} />
        <Route path="*" element={<Navigate to="/install" replace />} />
      </Routes>
    </AuthProvider>
  );
}
