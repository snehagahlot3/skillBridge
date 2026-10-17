import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await login(email, password);
      const home = user.role === "mentor" ? "/mentor" : user.role === "admin" ? "/admin" : "/dashboard";
      navigate(home, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold mb-1">Sign in</h1>
        <p className="text-sm text-gray-500 mb-6">Users, mentors and admins sign in here.</p>
        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
          <p className="font-medium text-gray-700">Demo logins</p>
          <p>User — priya@demo.com / demo12345</p>
          <p>Owner — rajesh@demo.com / demo12345</p>
          <p>Mentor — mentor@demo.com / mentor12345</p>
          <p>Admin — admin@demo.com / admin12345</p>
        </div>
        <p className="mt-4 text-sm text-center text-gray-600">
          No account? <Link to="/signup" className="text-brand-600 hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}