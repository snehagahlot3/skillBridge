import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <header className="border-b border-line bg-surface sticky top-0 z-40">
        <div className="mx-auto max-w-[1120px] px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-serif text-[22px] font-semibold text-ink tracking-tight hover:opacity-95">
            SkillBridge
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost">
              Sign in
            </Link>
            <Link to="/signup" className="btn-primary">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-6 py-16 md:py-24 flex-1 w-full">
        <div className="max-w-2xl text-left">
          <h1 className="font-serif text-[38px] sm:text-[44px] md:text-[48px] font-semibold text-ink leading-[1.15] mb-5 tracking-tight text-left">
            Real projects for businesses. Real experience for talent.
          </h1>
          <p className="text-[16px] md:text-[18px] text-muted leading-relaxed mb-12 text-left">
            Post a job with a budget. Get quotes with ideas from applicants. Pick the best fit,
            chat directly, and track progress — with mentors guiding the work end to end.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-4">
          <Link to="/signup" className="card-clickable flex flex-col justify-between">
            <div>
              <h2 className="heading-card mb-2">Post a job</h2>
              <p className="text-sm text-muted leading-relaxed">
                Marketing campaigns, content, video editing, web design, software — post it with a
                budget and compare quotes from applicants.
              </p>
            </div>
          </Link>

          <Link to="/signup" className="card-clickable flex flex-col justify-between">
            <div>
              <h2 className="heading-card mb-2">Work on jobs</h2>
              <p className="text-sm text-muted leading-relaxed">
                Submit your quote and ideas, get hired, chat with the business, and build a public
                profile of completed jobs and reviews.
              </p>
            </div>
          </Link>

          <div className="card flex flex-col justify-between">
            <div>
              <h2 className="heading-card mb-2">Mentors guide</h2>
              <p className="text-sm text-muted leading-relaxed">
                Mentors pick live jobs to mentor, track progress, join the conversation, and help
                students deliver quality work. (Mentor accounts are created by admins.)
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}