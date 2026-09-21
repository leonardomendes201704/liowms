import { Navigate, Route, Routes } from "react-router-dom";
import { InstallWizardPage } from "./pages/InstallWizardPage";
import { LoginPlaceholderPage } from "./pages/LoginPlaceholderPage";

export function App() {
  return (
    <Routes>
      <Route path="/install/*" element={<InstallWizardPage />} />
      <Route path="/login" element={<LoginPlaceholderPage />} />
      <Route path="/" element={<Navigate to="/install" replace />} />
      <Route path="*" element={<Navigate to="/install" replace />} />
    </Routes>
  );
}
