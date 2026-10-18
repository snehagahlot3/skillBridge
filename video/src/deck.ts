export type DeckSlide =
  | { kind: "title"; id: string; title: string; subtitle?: string; image?: string; audioUrl: string }
  | { kind: "section"; id: string; index: number; title: string; audioUrl: string }
  | { kind: "content"; id: string; title: string; bullets: string[]; image: string; audioUrl: string };

export type Deck = { fps: number; width: number; height: number; slides: DeckSlide[] };

export const deck: Deck = {
  fps: 30,
  width: 1920,
  height: 1080,
  slides: [
    {
      kind: "title",
      id: "t",
      title: "SkillBridge",
      subtitle: "A jobs marketplace where students deliver real work — guided by mentors and AI",
      image: "s-landing.png",
      audioUrl: "t.wav",
    },
    {
      kind: "content",
      id: "c1",
      title: "Real jobs, real teams",
      bullets: [
        "Small businesses post real projects",
        "Students send quotes for each open position",
        "The best fit wins the seat",
      ],
      image: "s-market.png",
      audioUrl: "c1.wav",
    },
    {
      kind: "content",
      id: "c2",
      title: "Every job is a full project page",
      bullets: [
        "Milestones with due dates and status",
        "A progress timeline of every event",
        "Reference files and handover attachments",
      ],
      image: "s-job-top.png",
      audioUrl: "c2.wav",
    },
    {
      kind: "content",
      id: "c3",
      title: "The AI drafts your job brief",
      bullets: [
        "Describe the idea in plain words",
        "Title, skills, milestones and budget — drafted",
        "Save as draft, or publish instantly",
      ],
      image: "s-post.png",
      audioUrl: "post.wav",
    },
    {
      kind: "content",
      id: "c4",
      title: "Quotes, per position",
      bullets: [
        "Owners compare proposals side by side",
        "Hire per role until the team is complete",
        "The job starts automatically",
      ],
      image: "s-proposals.png",
      audioUrl: "c3.wav",
    },
    {
      kind: "section",
      id: "s1",
      index: 1,
      title: "The AI layer",
      audioUrl: "s1.wav",
    },
    {
      kind: "content",
      id: "c5",
      title: "An assistant that knows the page",
      bullets: [
        "Knows your profile and your own proposal",
        "Sees timeline, milestones, reviews and chats",
        "Auto-detects mentoring, posting or applying",
      ],
      image: "s-ai.png",
      audioUrl: "c4.wav",
    },
    {
      kind: "content",
      id: "c6",
      title: "A GitHub code-review agent",
      bullets: [
        "Reviews commits, pull requests, whole repos",
        "Security-first findings, rated out of five",
        "Comments posted right on GitHub",
      ],
      image: "s-review.png",
      audioUrl: "c5.wav",
    },
    {
      kind: "content",
      id: "c7",
      title: "Team chat, inside the job",
      bullets: [
        "Group room: owner, team and mentor",
        "Private mentor room — owners stay out",
        "Real-time WebSockets with unread counts",
      ],
      image: "s-chat.png",
      audioUrl: "c6.wav",
    },
    {
      kind: "section",
      id: "s2",
      index: 2,
      title: "Trust & operations",
      audioUrl: "s2.wav",
    },
    {
      kind: "content",
      id: "c8",
      title: "Mentors run the queue",
      bullets: [
        "Started jobs float to the top",
        "Claim or release any open job",
        "AI-gated final milestones",
      ],
      image: "s-mentor.png",
      audioUrl: "c7.wav",
    },
    {
      kind: "content",
      id: "c9",
      title: "Reputation that follows you",
      bullets: [
        "Two-way reviews after every job",
        "Public profiles with resume and links",
        "Your rating travels to every quote",
      ],
      image: "s-profile.png",
      audioUrl: "c8.wav",
    },
    {
      kind: "content",
      id: "c10",
      title: "Owners stay in control",
      bullets: [
        "Business verification",
        "Restart, dispute and delist tools",
        "Email updates at every step",
      ],
      image: "s-admin.png",
      audioUrl: "c9.wav",
    },
    {
      kind: "title",
      id: "cta",
      title: "Try it live",
      subtitle: "skillbridge-xgq.pages.dev",
      image: "s-ai.png",
      audioUrl: "cta.wav",
    },
  ],
};