import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import ApprovalPage from "./pages/ApprovalPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/UploadPage";
import HistoryPage from "./pages/HistoryPage";
import EmailTemplatePage from "./pages/EmailTemplatePage";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";

function App() {

  return (

    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/email-template" element={<EmailTemplatePage />} />
        </Route>

        <Route
          path="/approval/:token"
          element={<ApprovalPage />}
        />

      </Routes>

    </BrowserRouter>

  );

}

export default App;
