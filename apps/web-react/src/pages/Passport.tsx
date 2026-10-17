import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Github, Globe, Linkedin } from "lucide-react";
import { api, type PassportData } from "../lib/api";

export default function Passport() {
  const navigate = useNavigate();
  const params = useParams();
  const [data, setData] = useState<PassportData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await api.getPassport(params.slug as string);
        setData(result);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!data) return <div className="p-8">Passport not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-brand-600">SkillBridge</h1>
          <div className="flex items-center gap-3">
            <span className="badge-verified">Verified</span>
            <button onClick={() => navigate(-1)} className="btn-ghost">Back</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="card mb-6">
          <h2 className="text-2xl font-bold">{data.user.name}</h2>
          {(data.user.college || data.user.city) && (
            <p className="text-gray-600">{[data.user.college, data.user.city].filter(Boolean).join(" · ")}</p>
          )}
          {data.user.bio && <p className="text-gray-600 mt-2">{data.user.bio}</p>}
          {data.user.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {data.user.skills.map((s) => <span key={s} className="badge bg-gray-100 text-gray-700">{s}</span>)}
            </div>
          )}
          <div className="flex gap-3 mt-3">
            {data.user.linkedin && <a href={data.user.linkedin} target="_blank" rel="noreferrer" className="text-brand-600"><Linkedin className="w-5 h-5" /></a>}
            {data.user.github && <a href={data.user.github} target="_blank" rel="noreferrer" className="text-gray-700"><Github className="w-5 h-5" /></a>}
            {data.user.portfolio && <a href={data.user.portfolio} target="_blank" rel="noreferrer" className="text-gray-700"><Globe className="w-5 h-5" /></a>}
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-4">Verified Skills</h3>
        <div className="space-y-4">
          {data.verifiedSkills.map((skill) => (
            <div key={skill.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold">{skill.skill}</h4>
                  <p className="text-sm text-gray-600">{skill.level}</p>
                </div>
                <span className="badge-verified">Mentor-reviewed</span>
              </div>
              {skill.project && (
                <p className="text-sm text-gray-500 mt-2">
                  Project: {skill.project.title} {skill.reviewer && `— Reviewed by ${skill.reviewer.name}`}
                </p>
              )}
            </div>
          ))}
          {data.verifiedSkills.length === 0 && (
            <div className="card text-center text-gray-500">No verified skills yet.</div>
          )}
        </div>
      </main>
    </div>
  );
}
