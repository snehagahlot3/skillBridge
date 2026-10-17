import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FileText, Github, Globe, Linkedin } from "lucide-react";
import { api, budgetLabel, type PublicUser } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Stars, StatusBadge } from "../components/ui";

export default function PublicProfile() {
  const { id } = useParams();
  const { user: viewer } = useAuth();
  const [data, setData] = useState<PublicUser | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getUser(id as string)
      .then(setData)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error || !data) return <div className="p-8 text-red-600">{error || "User not found."}</div>;

  const { user, profile, business, mentor, jobsPosted, jobsCompleted, stats, reviews } = data;
  const isMentor = user.role === "mentor";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-brand-600">SkillBridge</h1>
          <Link to="/" className="btn-ghost">Home</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div className="card">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{user.name}</h2>
                {isMentor && <span className="badge bg-brand-50 text-brand-700">Mentor</span>}
                {business?.verificationStatus === "verified" && <span className="badge-verified">Verified business</span>}
              </div>
              {profile?.college && <p className="text-gray-600 mt-1">{profile.college}{profile.city ? ` · ${profile.city}` : ""}{profile.phone ? ` · ${profile.phone}` : ""}</p>}
              {mentor?.organization && <p className="text-gray-600 mt-1">{mentor.organization}</p>}
              {profile?.bio && <p className="text-gray-600 mt-2">{profile.bio}</p>}
              {mentor?.bio && !profile?.bio && <p className="text-gray-600 mt-2">{mentor.bio}</p>}
              <div className="flex items-center gap-3 mt-3">
                <Stars value={stats.avgRating} />
                <span className="text-sm text-gray-500">({stats.reviewCount} review{stats.reviewCount === 1 ? "" : "s"})</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xl font-bold">{stats.jobsPosted}</p>
                <p className="text-xs text-gray-500">Jobs posted</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xl font-bold">{stats.jobsCompleted}</p>
                <p className="text-xs text-gray-500">Jobs done</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xl font-bold">{isMentor ? stats.jobsMentored : stats.reviewCount}</p>
                <p className="text-xs text-gray-500">{isMentor ? "Jobs mentored" : "Reviews"}</p>
              </div>
            </div>
          </div>

          {profile?.skills && profile.skills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1">
              {profile.skills.map((skill) => (
                <span key={skill} className="badge bg-gray-100 text-gray-700">{skill}</span>
              ))}
            </div>
          )}

          {mentor?.expertise && mentor.expertise.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Expertise</p>
              <div className="flex flex-wrap gap-1">
                {mentor.expertise.map((e) => (
                  <span key={e} className="badge bg-brand-50 text-brand-700">{e}</span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mt-4 flex-wrap">
            {profile?.linkedin && <a href={profile.linkedin} target="_blank" rel="noreferrer" className="text-brand-600 inline-flex items-center gap-1 text-sm"><Linkedin className="w-4 h-4" /> LinkedIn</a>}
            {profile?.github && <a href={profile.github} target="_blank" rel="noreferrer" className="text-gray-700 inline-flex items-center gap-1 text-sm"><Github className="w-4 h-4" /> GitHub</a>}
            {profile?.portfolio && <a href={profile.portfolio} target="_blank" rel="noreferrer" className="text-gray-700 inline-flex items-center gap-1 text-sm"><Globe className="w-4 h-4" /> Portfolio</a>}
            {profile?.resumeKey && viewer && (
              <button onClick={() => api.downloadResume(user.id)} className="text-brand-600 inline-flex items-center gap-1 text-sm hover:underline">
                <FileText className="w-4 h-4" /> Resume{profile.resumeName ? ` (${profile.resumeName})` : ""}
              </button>
            )}
            {profile?.resumeKey && !viewer && (
              <span className="text-gray-400 text-sm inline-flex items-center gap-1">
                <FileText className="w-4 h-4" /> Resume available — sign in to view
              </span>
            )}
          </div>

          {business && (
            <div className="mt-4 rounded-lg bg-brand-50 p-3 text-sm">
              <p className="font-medium text-brand-800">{business.businessName}</p>
              <p className="text-brand-700 mt-1">{business.sector}{business.city ? ` · ${business.city}` : ""}</p>
            </div>
          )}
        </div>

        {jobsPosted.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-lg mb-4">Jobs posted</h3>
            <div className="space-y-2">
              {jobsPosted.map((j) => (
                <Link key={j.id} to={`/jobs/${j.id}`} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 hover:bg-gray-100">
                  <div>
                    <p className="font-medium text-sm">{j.title}</p>
                    <p className="text-xs text-gray-500">{j.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge bg-brand-50 text-brand-700">{budgetLabel(j)}</span>
                    {j.status && <StatusBadge status={j.status} />}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {jobsCompleted.length > 0 && (
          <div className="card">
            <h3 className="font-semibold text-lg mb-4">Jobs completed</h3>
            <div className="space-y-2">
              {jobsCompleted.map((j) => (
                <Link key={j.id} to={`/jobs/${j.id}`} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 hover:bg-gray-100">
                  <div>
                    <p className="font-medium text-sm">{j.title}</p>
                    <p className="text-xs text-gray-500">{j.category}</p>
                  </div>
                  <span className="badge bg-brand-50 text-brand-700">{budgetLabel(j)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <h3 className="font-semibold text-lg mb-4">Reviews</h3>
          <div className="space-y-3">
            {reviews.length === 0 && <p className="text-sm text-gray-500">No reviews yet.</p>}
            {reviews.map((r) => (
              <div key={r.id} className="rounded-lg bg-gray-50 p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{r.reviewerName}</span>
                  <Stars value={r.rating} />
                  {r.jobTitle && <span className="text-xs text-gray-400">on “{r.jobTitle}”</span>}
                </div>
                {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}