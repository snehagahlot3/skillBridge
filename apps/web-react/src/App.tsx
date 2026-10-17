import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactElement } from "react";
import { useAuth } from "./context/AuthContext";
import type { Role } from "./lib/api";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import JobDetail from "./pages/JobDetail";
import Chat from "./pages/Chat";
import PublicProfile from "./pages/PublicProfile";
import MentorDashboard from "./pages/MentorDashboard";
import AdminDashboard from "./pages/AdminDashboard";

function FullScreenLoader() {
  return <div className="min-h-screen bg-bg flex items-center justify-center text-muted">Loading...</div>;
}

function Protected({ roles, children }: { roles?: Role[]; children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    const home = user.role === "mentor" ? "/mentor" : user.role === "admin" ? "/admin" : "/dashboard";
    return <Navigate to={home} replace />;
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
            <MentorDashboard />
          </Protected>
        }
      />
      <Route
        path="/admin"
        element={
          <Protected roles={["admin"]}>
            <AdminDashboard />
          </Protected>
        }
      />
      <Route
        path="/jobs/:id"
        element={
          <Protected>
            <JobDetail />
          </Protected>
        }
      />
      <Route
        path="/chat/:jobId"
        element={
          <Protected>
            <Chat />
          </Protected>
        }
      />
      <Route path="/users/:id" element={<PublicProfile />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}