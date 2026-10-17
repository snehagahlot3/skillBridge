"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [role, setRole] = useState(params.get("role") || "student");
  const [form, setForm] = useState({ name: "", email: "", password: "", businessName: "", college: "", skills: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const profile: any = {};
      if (role === "sme") profile.businessName = form.businessName;
      if (role === "student") {
        profile.college = form.college;
        profile.skills = form.skills.split(",").map((s) => s.trim()).filter(Boolean);
      }
      const res = await api.signup({ email: form.email, password: form.password, name: form.name, role, profile });
      api.setToken(res.token);
      localStorage.setItem("token", res.token);
      router.push(`/dashboard/${role}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Join SkillBridge</h1>
        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">I am a</label>
            <div className="grid grid-cols-3 gap-2">
              {(["sme", "student", "mentor"] as const).map((r) => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize ${role === r ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-300"}`}>
                  {r}
                </button>
              ))}
            </div>
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
          {role === "sme" && (
            <div>
              <label className="label">Business name</label>
              <input className="input" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
            </div>
          )}
          {role === "student" && (
            <>
              <div>
                <label className="label">College</label>
                <input className="input" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} />
              </div>
              <div>
                <label className="label">Skills (comma-separated)</label>
                <input className="input" placeholder="Excel, Python, CAD" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
              </div>
            </>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-sm text-center text-gray-600">
          Already have an account? <Link href="/login" className="text-brand-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
