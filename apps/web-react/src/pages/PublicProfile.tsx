import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FileText, Github, Globe, Linkedin } from "lucide-react";
import { api, budgetLabel, type PublicUser } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Stars, StatusBadge, VerifiedBadge } from "../components/ui";

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
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

  if (loading) return <div className="p-8 text-center text-muted">Loading...</div>;
  if (error || !data) return <div className="p-8 text-center text-ink">{error || "User not found."}</div>;

  const { user, profile, business, mentor, jobsPosted, jobsCompleted, stats, reviews } = data;
  const isMentor = user.role === "mentor";

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <header className="border-b border-line bg-surface sticky top-0 z-40">
        <div className="mx-auto max-w-[1120px] w-full px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-serif text-[22px] font-semibold text-ink tracking-tight hover:opacity-95">
            SkillBridge
          </Link>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate(-1)} className="btn-ghost text-sm">
              Back
            </button>
            {viewer && (
              <Link
                to={viewer.role === "mentor" ? "/mentor" : viewer.role === "admin" ? "/admin" : "/dashboard"}
                className="btn-secondary text-sm"
              >
                My dashboard
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] w-full px-6 py-8 space-y-6 flex-1">
        <div className="card p-6">
          <div className="flex items-start justify-between flex-wrap gap-6">
            <div className="flex-1 min-w-[280px]">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="heading-title">{user.name}</h1>
                {isMentor && <span className="badge-lavender">Mentor</span>}
                {business?.verificationStatus === "verified" && (
                  <VerifiedBadge label="Verified business" />
                )}
              </div>
              {profile?.college && (
                <p className="text-sm text-muted mt-1">
                  {profile.college}{profile.city ? ` · ${profile.city}` : ""}{profile.phone ? ` · ${profile.phone}` : ""}
                </p>
              )}
              {mentor?.organization && <p className="text-sm text-muted mt-1">{mentor.organization}</p>}
              {profile?.bio && <p className="text-sm text-ink mt-2.5 leading-relaxed">{profile.bio}</p>}
              {mentor?.bio && !profile?.bio && <p className="text-sm text-ink mt-2.5 leading-relaxed">{mentor.bio}</p>}
              <div className="flex items-center gap-2 mt-4">
                <Stars value={stats.avgRating} />
                <span className="text-xs text-muted">
                  ({stats.reviewCount} review{stats.reviewCount === 1 ? "" : "s"})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center shrink-0 w-full sm:w-auto">
              <div className="stat-tile">
                <p className="stat-num">{stats.jobsPosted}</p>
                <p className="stat-label">Jobs posted</p>
              </div>
              <div className="stat-tile">
                <p className="stat-num">{stats.jobsCompleted}</p>
                <p className="stat-label">Jobs done</p>
              </div>
              <div className="stat-tile">
                <p className="stat-num">{isMentor ? stats.jobsMentored : stats.reviewCount}</p>
                <p className="stat-label">{isMentor ? "Jobs mentored" : "Reviews"}</p>
              </div>
            </div>
          </div>

          {profile?.skills && profile.skills.length > 0 && (
            <div className="mt-5 pt-4 border-t border-line flex flex-wrap gap-1.5">
              {profile.skills.map((skill) => (
                <span key={skill} className="badge-skill">
                  {skill}
                </span>
              ))}
            </div>
          )}

          {mentor?.expertise && mentor.expertise.length > 0 && (
            <div className="mt-5 pt-4 border-t border-line">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent mb-2">Expertise</p>
              <div className="flex flex-wrap gap-1.5">
                {mentor.expertise.map((e) => (
                  <span key={e} className="badge-lavender">
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-line flex-wrap">
            {profile?.linkedin && (
              <a href={profile.linkedin} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline inline-flex items-center gap-1.5">
                <Linkedin strokeWidth={1.5} className="w-3.5 h-3.5 text-ink" /> LinkedIn
              </a>
            )}
            {profile?.github && (
              <a href={profile.github} target="_blank" rel="noreferrer" className="text-xs text-muted hover:text-ink inline-flex items-center gap-1.5">
                <Github strokeWidth={1.5} className="w-3.5 h-3.5 text-ink" /> GitHub
              </a>
            )}
            {profile?.portfolio && (
              <a href={profile.portfolio} target="_blank" rel="noreferrer" className="text-xs text-muted hover:text-ink inline-flex items-center gap-1.5">
                <Globe strokeWidth={1.5} className="w-3.5 h-3.5 text-ink" /> Portfolio
              </a>
            )}
            {profile?.resumeKey && viewer && (
              <button type="button" onClick={() => api.downloadResume(user.id)} className="text-xs text-accent hover:underline inline-flex items-center gap-1.5">
                <FileText strokeWidth={1.5} className="w-3.5 h-3.5 text-ink" /> Resume{profile.resumeName ? ` (${profile.resumeName})` : ""}
              </button>
            )}
            {profile?.resumeKey && !viewer && (
              <span className="text-xs text-muted inline-flex items-center gap-1.5">
                <FileText strokeWidth={1.5} className="w-3.5 h-3.5 text-ink" /> Resume available — sign in to view
              </span>
            )}
          </div>

          {business && (
            <div className="mt-5 pt-4 border-t border-line">
              <div className="rounded-[8px] bg-bg/70 border border-line p-4 text-sm">
                <p className="font-semibold text-ink">{business.businessName}</p>
                <p className="text-muted mt-0.5">{business.sector}{business.city ? ` · ${business.city}` : ""}</p>
              </div>
            </div>
          )}
        </div>

        {jobsPosted.length > 0 && (
          <div className="card p-6">
            <h3 className="heading-card mb-4">Jobs posted</h3>
            <div className="space-y-2.5">
              {jobsPosted.map((j) => (
                <Link key={j.id} to={`/jobs/${j.id}`} className="flex items-center justify-between rounded-[8px] border border-line bg-surface p-3.5 hover:bg-bg/60 transition-colors">
                  <div>
                    <p className="font-semibold text-sm text-ink">{j.title}</p>
                    <p className="text-xs text-muted mt-0.5">{j.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge-budget">{budgetLabel(j)}</span>
                    {j.status && <StatusBadge status={j.status} />}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {jobsCompleted.length > 0 && (
          <div className="card p-6">
            <h3 className="heading-card mb-4">Jobs completed</h3>
            <div className="space-y-2.5">
              {jobsCompleted.map((j) => (
                <Link key={j.id} to={`/jobs/${j.id}`} className="flex items-center justify-between rounded-[8px] border border-line bg-surface p-3.5 hover:bg-bg/60 transition-colors">
                  <div>
                    <p className="font-semibold text-sm text-ink">{j.title}</p>
                    <p className="text-xs text-muted mt-0.5">{j.category}</p>
                  </div>
                  <span className="badge-budget">{budgetLabel(j)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="card p-6">
          <h3 className="heading-card mb-4">Reviews</h3>
          <div className="space-y-3">
            {reviews.length === 0 && <div className="empty-state">No reviews yet.</div>}
            {reviews.map((r) => (
              <div key={r.id} className="rounded-[8px] border border-line bg-surface p-3.5 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-ink">{r.reviewerName}</span>
                  <Stars value={r.rating} />
                  {r.jobTitle && <span className="text-xs text-muted">on “{r.jobTitle}”</span>}
                </div>
                {r.comment && <p className="text-sm text-muted mt-1 leading-relaxed">{r.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}