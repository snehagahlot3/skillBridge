import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    college: "",
    skills: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const profile = {
        college: form.college,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      };
      await signup({ name: form.name, email: form.email, password: form.password, profile });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col items-center justify-center px-4 py-12">
      <Link to="/" className="font-serif text-[26px] font-semibold text-ink tracking-tight mb-8 hover:opacity-95">
        SkillBridge
      </Link>
      <div className="card w-full max-w-md p-8">
        <h1 className="heading-title mb-1">Create your account</h1>
        <p className="text-sm text-muted mb-6 leading-relaxed">
          One account lets you post jobs <em>and</em> work on jobs. Mentor accounts are created by admins.
        </p>
        {error && (
          <div className="mb-4 rounded-[8px] border border-line bg-surface p-3 text-sm text-ink border-l-4 border-l-accent">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div>
            <label className="label">College / university (optional)</label>
            <input className="input" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} />
          </div>
          <div>
            <label className="label">Skills (comma-separated)</label>
            <input className="input" placeholder="Excel, Python, Canva" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-sm text-center text-muted">
          Already have an account? <Link to="/login" className="text-accent hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}