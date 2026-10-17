import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactElement } from "react";
import { useAuth } from "./context/AuthContext";
import type { Role } from "./lib/api";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import MentorAdmin from "./pages/MentorAdmin";
import ProjectDetail from "./pages/ProjectDetail";
import Passport from "./pages/Passport";

function FullScreenLoader() {
  return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
}

function Protected({ roles, children }: { roles?: Role[]; children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={user.role === "mentor" ? "/mentor" : "/dashboard"} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/dashboard"
        element={
          <Protected roles={["user"]}>
            <Dashboard />
          </Protected>
        }
      />
      <Route
        path="/mentor"
        element={
          <Protected roles={["mentor"]}>
            <MentorAdmin />
          </Protected>
        }
      />
      <Route
        path="/projects/:id"
        element={
          <Protected>
            <ProjectDetail />
          </Protected>
        }
      />
      <Route path="/passport/:slug" element={<Passport />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
