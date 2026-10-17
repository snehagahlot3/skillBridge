import { Link } from "react-router-dom";
import { Briefcase, GraduationCap, Compass } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-brand-600">SkillBridge</h1>
          <nav className="flex gap-2">
            <Link to="/login" className="btn-ghost">Sign in</Link>
            <Link to="/signup" className="btn-primary">Get started</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            One account. Work on projects or get work done.
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Post a project when you need something built. Apply to projects when you want to build.
            Mentor-reviewed work becomes verified evidence on your Skill Passport.
          </p>
          <div className="flex justify-center gap-3">
            <Link to="/signup?role=user" className="btn-primary">Create your account</Link>
            <Link to="/login" className="btn-secondary">Sign in</Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <Link to="/signup?role=user" className="card hover:shadow-md transition-shadow">
            <Briefcase className="w-8 h-8 text-brand-600 mb-3" />
            <h3 className="font-semibold text-lg mb-2">Post a project</h3>
            <p className="text-gray-600 text-sm">
              Describe your problem in plain language — it becomes a scoped brief with required skills, milestones and a review rubric.
            </p>
          </Link>
          <Link to="/signup?role=user" className="card hover:shadow-md transition-shadow">
            <GraduationCap className="w-8 h-8 text-brand-600 mb-3" />
            <h3 className="font-semibold text-lg mb-2">Work on projects</h3>
            <p className="text-gray-600 text-sm">
              Add your resume, LinkedIn, GitHub and skills. Apply to open projects and build a verified track record.
            </p>
          </Link>
          <Link to="/signup?role=mentor" className="card hover:shadow-md transition-shadow">
            <Compass className="w-8 h-8 text-brand-600 mb-3" />
            <h3 className="font-semibold text-lg mb-2">Mentor / admin</h3>
            <p className="text-gray-600 text-sm">
              Review submitted work against rubrics, verify skills and businesses, and assign mentors to projects.
            </p>
          </Link>
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-gray-500">Sample data — Phase 1 demo</p>
        </div>
      </main>
    </div>
  );
}
