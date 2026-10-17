import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type Project } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function ProjectDetail() {
  const navigate = useNavigate();
  const params = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [pitch, setPitch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProject() {
    try {
      const data = await api.getProject(params.id as string);
      setProject(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function apply() {
    try {
      await api.applyToProject(project!.id, pitch);
      setApplying(false);
      setPitch("");
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;
  if (!project) return <div className="p-8">Project not found.</div>;

  const isOwner = user?.id === project.ownerId;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-brand-600">SkillBridge</h1>
          <button onClick={() => navigate(-1)} className="btn-ghost">Back</button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="card">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">{project.title}</h2>
              <p className="text-gray-600 mt-2">{project.description}</p>
            </div>
            <span className={`badge ${project.status === "open" ? "badge-verified" : "badge-pending"}`}>{project.status}</span>
          </div>

          <div className="flex gap-2 mb-4 flex-wrap">
            <span className={`badge ${project.budgetType === "paid" ? "badge-paid" : "badge-unpaid"}`}>{project.budgetType}</span>
            {project.owner?.businessName && <span className="badge bg-gray-100 text-gray-700">{project.owner.businessName}</span>}
            {project.owner?.verificationStatus === "verified" && <span className="badge-verified">Verified</span>}
          </div>

          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {project.requiredSkills?.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium text-sm text-gray-700 mb-2">Required skills</h3>
              <div className="flex flex-wrap gap-1">
                {project.requiredSkills.map((skill) => (
                  <span key={skill} className="badge bg-gray-100 text-gray-700">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {project.rubric && project.rubric.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium text-sm text-gray-700 mb-2">Evaluation rubric</h3>
              <div className="space-y-2">
                {project.rubric.map((r) => (
                  <div key={r.criterion} className="rounded-lg bg-gray-50 p-3">
                    <p className="font-medium text-sm">{r.criterion}</p>
                    <p className="text-sm text-gray-600">{r.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {project.milestones && project.milestones.length > 0 && (
            <div className="mb-4">
              <h3 className="font-medium text-sm text-gray-700 mb-2">Milestones</h3>
              <div className="space-y-2">
                {project.milestones.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full ${m.status === "approved" ? "bg-green-500" : m.status === "submitted" ? "bg-yellow-500" : "bg-gray-300"}`} />
                    <span>{m.title}</span>
                    {m.dueDate && <span className="text-gray-500">— {m.dueDate}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {project.status === "open" && !isOwner && (
            <div className="mt-6 border-t pt-4">
              {!applying ? (
                <button onClick={() => setApplying(true)} className="btn-primary">Apply to this project</button>
              ) : (
                <div className="space-y-3">
                  <textarea className="input" rows={4} placeholder="Write a short pitch: why are you a good fit?"
                    value={pitch} onChange={(e) => setPitch(e.target.value)} />
                  <div className="flex gap-2">
                    <button onClick={apply} className="btn-primary" disabled={pitch.trim().length < 20}>Submit application</button>
                    <button onClick={() => setApplying(false)} className="btn-ghost">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
