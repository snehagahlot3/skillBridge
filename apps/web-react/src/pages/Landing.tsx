import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-brand-600">SkillBridge</h1>
          <nav className="flex gap-4">
            <Link to="/login" className="btn-ghost">Sign in</Link>
            <Link to="/signup" className="btn-primary">Get started</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Real projects for businesses. Real experience for talent.
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Post a job with a budget. Get quotes with ideas from applicants. Pick the best fit,
            chat directly, and track progress — with mentors guiding the work end to end.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <Link to="/signup" className="card hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">🏭</div>
            <h3 className="font-semibold text-lg mb-2">Post a job</h3>
            <p className="text-gray-600 text-sm">
              Marketing campaigns, content, video editing, web design, software — post it with a
              budget and compare quotes from applicants.
            </p>
          </Link>
          <Link to="/signup" className="card hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">🎓</div>
            <h3 className="font-semibold text-lg mb-2">Work on jobs</h3>
            <p className="text-gray-600 text-sm">
              Submit your quote and ideas, get hired, chat with the business, and build a public
              profile of completed jobs and reviews.
            </p>
          </Link>
          <div className="card">
            <div className="text-3xl mb-3">🧭</div>
            <h3 className="font-semibold text-lg mb-2">Mentors guide</h3>
            <p className="text-gray-600 text-sm">
              Mentors pick live jobs to mentor, track progress, join the conversation, and help
              students deliver quality work. (Mentor accounts are created by admins.)
            </p>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-gray-500">Sample data — Phase 1 demo</p>
        </div>
      </main>
    </div>
  );
}