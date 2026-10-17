import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-brand-600">SkillBridge</h1>
          <nav className="flex gap-4">
            <Link href="/login" className="btn-ghost">Sign in</Link>
            <Link href="/signup" className="btn-primary">Get started</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Verified talent pipeline for small businesses
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            SMEs post scoped projects. Students deliver real work. Mentor-reviewed evidence goes on a verified Skill Passport.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <Link href="/signup?role=sme" className="card hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">🏭</div>
            <h3 className="font-semibold text-lg mb-2">For SMEs</h3>
            <p className="text-gray-600 text-sm">Post a project, get it done by vetted students, review the outcome.</p>
          </Link>
          <Link href="/signup?role=student" className="card hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">🎓</div>
            <h3 className="font-semibold text-lg mb-2">For Students</h3>
            <p className="text-gray-600 text-sm">Build real projects, get mentor-reviewed evidence, share your Skill Passport.</p>
          </Link>
          <Link href="/signup?role=mentor" className="card hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">🧭</div>
            <h3 className="font-semibold text-lg mb-2">For Mentors</h3>
            <p className="text-gray-600 text-sm">Review student work against rubrics, verify skills, strengthen the talent pipeline.</p>
          </Link>
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-gray-500">Sample data — Phase 1 demo</p>
        </div>
      </main>
    </div>
  );
}
