"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, type Project } from "@/lib/api";

interface SubmissionRow {
  id: string;
  milestoneId: string;
  studentId: string;
  notes?: string;
  submittedAt: string;
  milestone?: { title: string; status: string };
  student?: { name: string };
}

export default function MentorDashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<{ project: Project; submissions: SubmissionRow[] } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/login");
    api.setToken(token);
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const data = await api.getProjects({ status: "under_review" });
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function openReview(project: Project) {
    try {
      const submissions = await api.getProjectSubmissions(project.id);
      setReviewing({ project, submissions });
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-brand-600">SkillBridge — Mentor Dashboard</h1>
          <button onClick={() => { localStorage.removeItem("token"); router.push("/"); }} className="btn-ghost">Sign out</button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Review Queue</h2>
        <div className="grid gap-4">
          {projects.map((project) => (
            <div key={project.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{project.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                  {project.rubric && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">Rubric:</p>
                      <ul className="text-sm text-gray-600 list-disc list-inside">
                        {project.rubric.map((r) => (
                          <li key={r.criterion}>{r.criterion}: {r.description}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <button onClick={() => openReview(project)} className="btn-primary">Review</button>
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <div className="card text-center text-gray-500">No submissions pending review.</div>
          )}
        </div>
      </main>

      {reviewing && (
        <ReviewModal
          project={reviewing.project}
          submissions={reviewing.submissions}
          onClose={() => setReviewing(null)}
        />
      )}
    </div>
  );
}

function ReviewModal({
  project,
  submissions,
  onClose,
}: {
  project: Project;
  submissions: SubmissionRow[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string>(submissions[0]?.id || "");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState("");
  const [decision, setDecision] = useState<"approved" | "revision" | "rejected">("approved");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const current = submissions.find((s) => s.id === selected);

  async function submitReview() {
    if (!selected) return;
    setLoading(true);
    try {
      const rubricScores = project.rubric?.map((r) => ({
        criterion: r.criterion,
        score: scores[r.criterion] || 3,
      })) || [];
      await api.reviewSubmission({ submissionId: selected, rubricScores, comments, decision });
      setDone(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="card w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <h3 className="font-semibold text-lg mb-4">Review: {project.title}</h3>

        {submissions.length === 0 && <p className="text-gray-500">No submissions found for this project.</p>}

        {submissions.length > 0 && !done && (
          <div className="space-y-4">
            <div>
              <label className="label">Submission</label>
              <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
                {submissions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.milestone?.title || "Milestone"} — {s.student?.name || "Student"}
                  </option>
                ))}
              </select>
            </div>

            {current && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <p className="font-medium mb-1">Student notes</p>
                <p className="text-gray-600">{current.notes || "—"}</p>
              </div>
            )}

            {project.rubric?.map((r) => (
              <div key={r.criterion}>
                <label className="label">{r.criterion}</label>
                <p className="text-sm text-gray-600 mb-1">{r.description}</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((n) => (
                    <button key={n} onClick={() => setScores({ ...scores, [r.criterion]: n })}
                      className={`w-8 h-8 rounded border text-sm ${(scores[r.criterion] || 3) === n ? "bg-brand-600 text-white" : "border-gray-300"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <label className="label">Comments</label>
              <textarea className="input" rows={3} value={comments} onChange={(e) => setComments(e.target.value)} />
            </div>
            <div>
              <label className="label">Decision</label>
              <select className="input" value={decision} onChange={(e) => setDecision(e.target.value as any)}>
                <option value="approved">Approve — verify skills</option>
                <option value="revision">Request revision</option>
                <option value="rejected">Reject</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={submitReview} className="btn-primary" disabled={loading}>
                {loading ? "Submitting..." : "Submit review"}
              </button>
              <button onClick={onClose} className="btn-ghost">Cancel</button>
            </div>
          </div>
        )}

        {done && (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
              Review submitted. Verified skills are created when both the SME confirms delivery and the mentor approves.
            </div>
            <button onClick={onClose} className="btn-primary">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
