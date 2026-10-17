"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function AdminDashboard() {
  const router = useRouter();
  const [smes, setSmes] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/login");
    api.setToken(token);
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [s, m, p] = await Promise.all([api.adminGetSmes(), api.adminGetMentors(), api.adminGetProjects()]);
      setSmes(s);
      setMentors(m);
      setProjects(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function verify(userId: string) {
    try {
      await api.adminVerifySme(userId);
      loadAll();
    } catch (err) {
      console.error(err);
    }
  }

  async function assign(projectId: string, mentorId: string) {
    try {
      await api.adminAssignMentor(projectId, mentorId);
      loadAll();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-brand-600">SkillBridge — Admin</h1>
          <button onClick={() => { localStorage.removeItem("token"); router.push("/"); }} className="btn-ghost">Sign out</button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-10">
        <section>
          <h2 className="text-2xl font-bold mb-4">SME Verification</h2>
          <div className="grid gap-3">
            {smes.map((s) => (
              <div key={s.userId} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium">{s.businessName} <span className="text-gray-500 text-sm">({s.name})</span></p>
                  <p className="text-sm text-gray-500">{s.city} · {s.sector}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={s.verificationStatus === "verified" ? "badge-verified" : "badge-pending"}>{s.verificationStatus}</span>
                  {s.verificationStatus !== "verified" && (
                    <button onClick={() => verify(s.userId)} className="btn-primary">Verify</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Projects &amp; Mentor Assignment</h2>
          <div className="grid gap-3">
            {projects.map((p) => (
              <div key={p.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-sm text-gray-500">SME: {p.sme?.name} · status: {p.status}</p>
                </div>
                <select
                  className="input max-w-xs"
                  value={p.mentor?.id || ""}
                  onChange={(e) => assign(p.id, e.target.value)}
                >
                  <option value="">Assign mentor...</option>
                  {mentors.map((m) => (
                    <option key={m.userId} value={m.userId}>{m.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
