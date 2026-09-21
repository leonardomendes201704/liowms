import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";
import { InstallWizardPage } from "./pages/InstallWizardPage";
import { AppShellPage } from "./pages/AppShellPage";
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
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShellPage />
            </RequireAuth>
          }
        />
        <Route path="/" element={<Navigate to="/install" replace />} />
        <Route path="*" element={<Navigate to="/install" replace />} />
      </Routes>
    </AuthProvider>
  );
}
