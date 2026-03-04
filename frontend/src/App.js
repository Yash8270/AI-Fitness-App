import React, { useContext } from "react";
import {
  Routes,
  Route,
  BrowserRouter as Router,
  Navigate,
  useLocation,
} from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProgressPage from "./pages/ProgressPage";
import AiActionPage from "./pages/AiActionPage";
import HistoryPage from "./pages/HistoryPage";
import UnderProgress from "./pages/UnderProgress";

import Layout from "./components/layout/Layout";
import Connect_Context from "./context/Connectcontext";

/* =========================
   PROTECTED ROUTE WRAPPER
========================= */
const ProtectedRoute = ({ children }) => {
  const { authdata, loading } = useContext(Connect_Context);

  // ⏳ Wait until auth is resolved
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Loading...
      </div>
    );
  }

  // 🔐 Not logged in → redirect
  if (!authdata?.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Logged in → stay on current route
  return children;
};


/* =========================
   APP ROUTES
========================= */
const AppRoutes = () => {
  const location = useLocation();
  const { authdata } = useContext(Connect_Context);

  const isAuth = authdata?.isAuthenticated;

  // Decide when to show layout (similar to Navbar / Shownav logic)
  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/signup";

  return (
    <>
      {/* Routes */}
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={!isAuth ? <LoginPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/signup"
          element={!isAuth ? <SignupPage /> : <Navigate to="/" replace />}
        />

        {/* Protected */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                {/* <ProgressPage /> */}
                <UnderProgress />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai"
          element={
            <ProtectedRoute>
              <Layout>
                <AiActionPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <Layout>
                <HistoryPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

/* =========================
   APP ROOT
========================= */
const App = () => {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
};

export default App;
