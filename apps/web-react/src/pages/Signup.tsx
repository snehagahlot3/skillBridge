import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../lib/api";

export default function Signup() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { signup } = useAuth();

  const [role, setRole] = useState<Role>(params.get("role") === "mentor" ? "mentor" : "user");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    college: "",
    skills: "",
    organization: "",
    expertise: "",
    bio: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const profile =
        role === "mentor"
          ? {
              organization: form.organization,
              expertise: form.expertise.split(",").map((s) => s.trim()).filter(Boolean),
              bio: form.bio,
            }
          : {
              college: form.college,
              skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
            };
      const user = await signup({ name: form.name, email: form.email, password: form.password, role, profile });
      navigate(user.role === "mentor" ? "/mentor" : "/dashboard", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Create your account</h1>
        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">I am signing up as a</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setRole("user")}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${role === "user" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-300"}`}>
                User
              </button>
              <button type="button" onClick={() => setRole("mentor")}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${role === "mentor" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-300"}`}>
                Mentor
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {role === "user"
                ? "A user can both post projects and work on them."
                : "Mentors get the admin panel to review work and verify users."}
            </p>
          </div>

          <div>
            <label className="label">Full name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
          </div>

          {role === "user" && (
            <>
              <div>
                <label className="label">College / university (optional)</label>
                <input className="input" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} />
              </div>
              <div>
                <label className="label">Skills (comma-separated)</label>
                <input className="input" placeholder="Excel, Python, CAD" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
              </div>
            </>
          )}

          {role === "mentor" && (
            <>
              <div>
                <label className="label">Organization</label>
                <input className="input" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
              </div>
              <div>
                <label className="label">Expertise (comma-separated)</label>
                <input className="input" placeholder="Data Analysis, Python" value={form.expertise} onChange={(e) => setForm({ ...form, expertise: e.target.value })} />
              </div>
              <div>
                <label className="label">Short bio</label>
                <textarea className="input" rows={2} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              </div>
            </>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-sm text-center text-gray-600">
          Already have an account? <Link to="/login" className="text-brand-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
