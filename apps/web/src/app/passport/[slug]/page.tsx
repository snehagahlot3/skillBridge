"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { api, type VerifiedSkill } from "@/lib/api";

interface PassportData {
  student: { name: string; college?: string; bio?: string };
  verifiedSkills: VerifiedSkill[];
}

export default function PassportPage() {
  const params = useParams();
  const [data, setData] = useState<PassportData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPassport();
  }, []);

  async function loadPassport() {
    try {
      const result = await api.getPassport(params.slug as string);
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!data) return <div className="p-8">Passport not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-brand-600">SkillBridge</h1>
          <span className="badge-verified">Verified</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="card mb-6">
          <h2 className="text-2xl font-bold">{data.student.name}</h2>
          {data.student.college && <p className="text-gray-600">{data.student.college}</p>}
          {data.student.bio && <p className="text-gray-600 mt-2">{data.student.bio}</p>}
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
