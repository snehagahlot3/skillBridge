const API_BASE = "/api"; // dev: Vite proxy -> :8787 | prod: Pages function -> API worker
const WS_BASE =
  (import.meta.env.VITE_API_WS_URL as string | undefined) ??
  (typeof window !== "undefined" && window.location.protocol === "https:"
    ? "wss://skillbridge-api.tanubhavj.workers.dev"
    : "ws://localhost:8787");

export type Role = "user" | "mentor" | "admin";
export type JobStatus =
  | "draft"
  | "open"
  | "awarded"
  | "in_progress"
  | "delivered"
  | "completed"
  | "revision_requested"
  | "disputed"
  | "cancelled"
  | "delisted";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Profile {
  userId: string;
  phone: string | null;
  city: string | null;
  college: string | null;
  bio: string | null;
  skills: string[];
  publicSlug: string | null;
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
  resumeKey: string | null;
  resumeName: string | null;
}

export interface BusinessProfile {
  userId: string;
  businessName: string;
  sector: string | null;
  city: string | null;
  verificationStatus: "unverified" | "pending" | "verified";
  udyamNumber: string | null;
}

export interface MeResponse {
  user: User;
  profile: Profile | null;
  business: BusinessProfile | null;
  mentor: { expertise: string[]; organization: string | null; bio: string | null } | null;
}

export interface JobPosition {
  id: string;
  title: string;
  count: number;
  filled?: number;
}

export interface TeamMember {
  id: string;
  jobId: string;
  userId: string;
  positionId: string;
  positionTitle: string;
  joinedAt: string;
  name?: string;
  email?: string;
}

export interface Job {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: string;
  requiredSkills: string[];
  positions: JobPosition[];
  budgetMin: number | null;
  budgetMax: number | null;
  deadline: string | null;
  acceptanceCriteria: string | null;
  status: JobStatus;
  mentorId: string | null;
  createdAt: string;
  owner?: { id: string; name: string; businessName: string | null; verificationStatus: string; slug: string | null } | null;
  mentor?: { id: string; name: string } | null;
  applicationCount?: number;
  positionFill?: JobPosition[];
  myApplication?: { status: "pending" | "accepted" | "rejected"; positionId: string } | null;
  milestones?: Milestone[];
  applications?: Application[];
  team?: TeamMember[];
  updates?: JobUpdate[];
  reviews?: JobReview[];
  myRole?: "owner" | "team" | "mentor" | "admin" | null;
}

export interface Milestone {
  id: string;
  jobId: string;
  title: string;
  dueDate: string | null;
  status: "pending" | "submitted" | "approved";
  order: number;
}

export interface ApplicantInfo {
  id: string;
  name: string;
  email: string;
  college: string | null;
  city: string | null;
  skills: string[];
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
  resumeKey: string | null;
  slug: string | null;
  avgRating: number | null;
  reviewCount: number;
}

export interface Application {
  id: string;
  jobId: string;
  applicantId: string;
  positionId: string;
  positionTitle?: string | null;
  pitch: string;
  quoteAmount: number | null;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  applicant?: ApplicantInfo | null;
}

export interface MyApplication extends Application {
  job: {
    id: string;
    title: string;
    status: JobStatus;
    budgetMin: number | null;
    budgetMax: number | null;
    mentorId: string | null;
  } | null;
  milestones: Milestone[];
  onTeam: boolean;
}

export interface JobUpdate {
  id: string;
  jobId: string;
  authorId: string | null;
  kind: "update" | "submission" | "approval" | "revision" | "system";
  milestoneId: string | null;
  content: string;
  createdAt: string;
  authorName?: string;
  authorRole?: string;
  milestoneTitle?: string | null;
}

export interface JobReview {
  id: string;
  jobId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewerName?: string;
  revieweeName?: string;
  jobTitle?: string | null;
}

export interface PublicJobCard {
  id: string;
  title: string;
  category: string;
  status?: JobStatus;
  budgetMin: number | null;
  budgetMax: number | null;
}

export interface PublicUser {
  user: { id: string; name: string; role: Role; createdAt: string };
  profile: {
    phone: string | null;
    city: string | null;
    college: string | null;
    bio: string | null;
    skills: string[];
    linkedin: string | null;
    github: string | null;
    portfolio: string | null;
    resumeKey: string | null;
    resumeName: string | null;
  } | null;
  business: {
    businessName: string;
    sector: string | null;
    city: string | null;
    verificationStatus: string;
  } | null;
  mentor: { expertise: string[]; organization: string | null; bio: string | null } | null;
  jobsPosted: PublicJobCard[];
  jobsCompleted: PublicJobCard[];
  stats: { jobsPosted: number; jobsCompleted: number; jobsMentored: number; avgRating: number | null; reviewCount: number };
  reviews: JobReview[];
}

export interface ChatMessage {
  id: string;
  jobId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  createdAt: string;
}

export interface ChatRoomSummary {
  jobId: string;
  title: string;
  status: JobStatus;
  scope: "group" | "mentor";
  teamNames: string[];
  mentorName: string | null;
  unread: number;
}

export interface Brief {
  title: string;
  summary: string;
  requiredSkills: string[];
  deliverables: string[];
  milestones: { title: string; dueDate: string }[];
  acceptanceCriteria: string;
  estimatedEffort: string;
  suggestedRubric: { criterion: string; description: string; maxScore: number }[];
}

export interface AiRepo {
  id: string;
  owner: string;
  repo: string;
  branch: string;
  status: "active" | "paused";
  lastReviewedSha: string | null;
  createdAt: string;
  lastRun: {
    id: string;
    commitSha: string;
    status: "running" | "done" | "failed";
    rating: number | null;
    summary: string | null;
    createdAt: string;
  } | null;
}

export interface ReviewFinding {
  file: string;
  line: number | null;
  severity: "critical" | "high" | "medium" | "low";
  issue: string;
  suggestion: string;
}

export interface ReviewRun {
  id: string;
  commitSha: string;
  commitMessage: string | null;
  status: "running" | "done" | "failed";
  summary: string | null;
  rating: number | null;
  findings: ReviewFinding[];
  suggestedFixes: string[];
  commentUrl: string | null;
  tokensUsed: number | null;
  createdAt: string;
}

export interface MentorJob extends Job {
  ownerName: string | null;
  teamNames: { userId: string; name: string; positionTitle: string }[];
  applicationCount: number;
}

export interface AdminStats {
  users: number;
  mentors: number;
  blocked: number;
  jobs: number;
  jobsByStatus: Record<string, number>;
  reviews: number;
}

export interface AdminMentorRow {
  id: string;
  name: string;
  email: string;
  status: "active" | "blocked";
  expertise: string[];
  organization: string | null;
  bio: string | null;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  status: "active" | "blocked";
  college: string | null;
  skills: string[];
  resumeKey: string | null;
  businessName: string | null;
  reviewCount: number;
}

export interface AdminBusinessRow {
  userId: string;
  businessName: string;
  sector: string | null;
  city: string | null;
  verificationStatus: string;
  udyamNumber: string | null;
  name: string | null;
  email: string | null;
  status: string | null;
}

export interface AdminJobRow extends Omit<Job, "owner" | "mentor" | "team"> {
  owner: { id: string; name: string } | null;
  mentor: { id: string; name: string } | null;
  teamSize: number;
  team: { userId: string; name: string; positionTitle: string }[];
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  getToken() {
    return this.token;
  }

  private headers(json = true): Record<string, string> {
    const headers: Record<string, string> = {};
    if (json) headers["Content-Type"] = "application/json";
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    return headers;
  }

  private async fetch(path: string, options: RequestInit = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...this.headers(), ...(options.headers as Record<string, string>) },
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(typeof error.error === "string" ? error.error : `HTTP ${res.status}`);
    }
    return res.json();
  }

  // ---- auth + profile ----
  async signup(data: { email: string; password: string; name: string; profile?: Record<string, unknown> }) {
    return this.fetch("/auth/signup", { method: "POST", body: JSON.stringify(data) });
  }

  async login(email: string, password: string) {
    return this.fetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  }

  getMe(): Promise<MeResponse> {
    return this.fetch("/profile/me");
  }

  updateProfile(data: Partial<Profile>) {
    return this.fetch("/profile", { method: "PATCH", body: JSON.stringify(data) });
  }

  updateBusiness(data: { businessName: string; sector?: string; city?: string; udyamNumber?: string }) {
    return this.fetch("/profile/business", { method: "PUT", body: JSON.stringify(data) });
  }

  async uploadResume(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/profile/resume`, {
      method: "POST",
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      body: form,
    });
    if (!res.ok) throw new Error("Resume upload failed");
    return res.json();
  }

  async downloadResume(userId: string) {
    const res = await fetch(`${API_BASE}/profile/resume/${userId}`, {
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    });
    if (!res.ok) throw new Error("Could not load resume");
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), "_blank");
  }

  // ---- jobs ----
  getJobs(filters?: { skill?: string; category?: string; status?: string; mine?: boolean }): Promise<Job[]> {
    const params = new URLSearchParams();
    if (filters?.skill) params.set("skill", filters.skill);
    if (filters?.category) params.set("category", filters.category);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.mine) params.set("mine", "1");
    const query = params.toString() ? `?${params}` : "";
    return this.fetch(`/jobs${query}`);
  }

  getJob(id: string): Promise<Job> {
    return this.fetch(`/jobs/${id}`);
  }

  createJob(data: {
    title: string;
    description: string;
    category: string;
    requiredSkills: string[];
    positions?: { title: string; count: number }[];
    budgetMin?: number;
    budgetMax?: number;
    deadline?: string;
    acceptanceCriteria?: string;
    milestones?: { title: string; dueDate?: string }[];
  }) {
    return this.fetch("/jobs", { method: "POST", body: JSON.stringify(data) });
  }

  publishJob(id: string) {
    return this.fetch(`/jobs/${id}/publish`, { method: "PATCH" });
  }

  updateJob(id: string, data: {
    title?: string;
    description?: string;
    category?: string;
    requiredSkills?: string[];
    budgetMin?: number;
    budgetMax?: number;
    deadline?: string;
    acceptanceCriteria?: string;
  }): Promise<Job> {
    return this.fetch(`/jobs/${id}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  cancelJob(id: string) {
    return this.fetch(`/jobs/${id}/cancel`, { method: "PATCH" });
  }

  addMilestones(id: string, milestones: { title: string; dueDate?: string }[]) {
    return this.fetch(`/jobs/${id}/milestones`, { method: "POST", body: JSON.stringify({ milestones }) });
  }

  startJob(id: string) {
    return this.fetch(`/jobs/${id}/start`, { method: "POST" });
  }

  deliverJob(id: string, content: string) {
    return this.fetch(`/jobs/${id}/deliver`, { method: "POST", body: JSON.stringify({ content }) });
  }

  acceptJob(id: string) {
    return this.fetch(`/jobs/${id}/accept`, { method: "POST" });
  }

  revisionJob(id: string, content: string) {
    return this.fetch(`/jobs/${id}/revision`, { method: "POST", body: JSON.stringify({ content }) });
  }

  disputeJob(id: string, content: string) {
    return this.fetch(`/jobs/${id}/dispute`, { method: "POST", body: JSON.stringify({ content }) });
  }

  getJobUpdates(jobId: string): Promise<JobUpdate[]> {
    return this.fetch(`/jobs/${jobId}/updates`);
  }

  postJobUpdate(jobId: string, content: string) {
    return this.fetch(`/jobs/${jobId}/updates`, { method: "POST", body: JSON.stringify({ content }) });
  }

  // ---- applications (quotes per position) ----
  applyToJob(jobId: string, positionId: string, pitch: string, quoteAmount: number) {
    return this.fetch(`/applications/${jobId}/apply`, {
      method: "POST",
      body: JSON.stringify({ positionId, pitch, quoteAmount }),
    });
  }

  updateApplication(applicationId: string, pitch: string, quoteAmount: number) {
    return this.fetch(`/applications/${applicationId}`, {
      method: "PATCH",
      body: JSON.stringify({ pitch, quoteAmount }),
    });
  }

  getJobApplications(jobId: string): Promise<{ applications: Application[]; team: TeamMember[] }> {
    return this.fetch(`/applications/${jobId}/applications`);
  }

  acceptApplication(applicationId: string): Promise<{ ok: boolean; teamComplete: boolean }> {
    return this.fetch(`/applications/${applicationId}/accept`, { method: "POST" });
  }

  getMyApplications(): Promise<MyApplication[]> {
    return this.fetch("/applications/mine");
  }

  // ---- milestones ----
  submitMilestone(id: string, content: string) {
    return this.fetch(`/milestones/${id}/submit`, { method: "POST", body: JSON.stringify({ content }) });
  }

  approveMilestone(id: string) {
    return this.fetch(`/milestones/${id}/approve`, { method: "POST" });
  }

  revisionMilestone(id: string, content: string) {
    return this.fetch(`/milestones/${id}/revision`, { method: "POST", body: JSON.stringify({ content }) });
  }

  // ---- reviews ----
  submitReview(jobId: string, revieweeId: string, rating: number, comment?: string) {
    return this.fetch(`/reviews/jobs/${jobId}/review`, {
      method: "POST",
      body: JSON.stringify({ revieweeId, rating, comment }),
    });
  }

  getUserReviews(userId: string): Promise<JobReview[]> {
    return this.fetch(`/reviews/users/${userId}/reviews`);
  }

  // ---- public profile ----
  getUser(userId: string): Promise<PublicUser> {
    return this.fetch(`/users/${userId}`);
  }

  // ---- chat (scope: "group" = owner+team+mentor, "mentor" = private mentor<->team) ----
  getChatRooms(): Promise<ChatRoomSummary[]> {
    return this.fetch("/chat/rooms");
  }

  getMessages(jobId: string, scope: "group" | "mentor" = "group"): Promise<{ messages: ChatMessage[] }> {
    return this.fetch(`/chat/${jobId}/messages?scope=${scope}`);
  }

  sendMessage(jobId: string, text: string, scope: "group" | "mentor" = "group"): Promise<{ message: ChatMessage }> {
    return this.fetch(`/chat/${jobId}/messages?scope=${scope}`, { method: "POST", body: JSON.stringify({ text }) });
  }

  markRead(jobId: string, scope: "group" | "mentor" = "group") {
    return this.fetch(`/chat/${jobId}/read?scope=${scope}`, { method: "POST" });
  }

  chatSocketUrl(jobId: string, scope: "group" | "mentor" = "group"): string {
    return `${WS_BASE}/api/chat/ws/${jobId}?scope=${scope}&token=${this.token ?? ""}`;
  }

  // ---- mentor ----
  getMentorQueue(): Promise<MentorJob[]> {
    return this.fetch("/mentor/queue");
  }

  claimJob(id: string) {
    return this.fetch(`/mentor/jobs/${id}/claim`, { method: "POST" });
  }

  getMentorJobs(): Promise<MentorJob[]> {
    return this.fetch("/mentor/jobs");
  }

  getMentorJob(id: string): Promise<MentorJob & { milestones: Milestone[]; updates: JobUpdate[]; applications: Application[] }> {
    return this.fetch(`/mentor/jobs/${id}`);
  }

  releaseJob(id: string) {
    return this.fetch(`/mentor/jobs/${id}/release`, { method: "POST" });
  }

  // ---- admin ----
  adminGetStats(): Promise<AdminStats> {
    return this.fetch("/admin/stats");
  }

  adminCreateMentor(data: { name: string; email: string; password: string; expertise: string[]; organization?: string; bio?: string }) {
    return this.fetch("/admin/mentors", { method: "POST", body: JSON.stringify(data) });
  }

  adminGetMentors(): Promise<AdminMentorRow[]> {
    return this.fetch("/admin/mentors");
  }

  adminBlockMentor(userId: string) {
    return this.fetch(`/admin/mentors/${userId}/block`, { method: "PATCH" });
  }

  adminUnblockMentor(userId: string) {
    return this.fetch(`/admin/mentors/${userId}/unblock`, { method: "PATCH" });
  }

  adminGetUsers(): Promise<AdminUserRow[]> {
    return this.fetch("/admin/users");
  }

  adminBlockUser(userId: string) {
    return this.fetch(`/admin/users/${userId}/block`, { method: "PATCH" });
  }

  adminUnblockUser(userId: string) {
    return this.fetch(`/admin/users/${userId}/unblock`, { method: "PATCH" });
  }

  adminGetBusinesses(): Promise<AdminBusinessRow[]> {
    return this.fetch("/admin/businesses");
  }

  adminVerifyBusiness(userId: string) {
    return this.fetch(`/admin/businesses/${userId}/verify`, { method: "PATCH" });
  }

  adminCreateBusinessOwner(data: { name: string; email: string; password: string; businessName: string; sector?: string; city?: string }) {
    return this.fetch("/admin/businesses", { method: "POST", body: JSON.stringify(data) });
  }

  adminDeleteMentor(userId: string) {
    return this.fetch(`/admin/mentors/${userId}`, { method: "DELETE" });
  }

  adminDeleteUser(userId: string) {
    return this.fetch(`/admin/users/${userId}`, { method: "DELETE" });
  }

  adminGetJobs(): Promise<AdminJobRow[]> {
    return this.fetch("/admin/jobs");
  }

  adminDelistJob(id: string) {
    return this.fetch(`/admin/jobs/${id}/delist`, { method: "PATCH" });
  }

  adminRelistJob(id: string) {
    return this.fetch(`/admin/jobs/${id}/relist`, { method: "PATCH" });
  }

  adminAssignMentor(id: string, mentorId: string | null) {
    return this.fetch(`/admin/jobs/${id}/mentor`, { method: "PATCH", body: JSON.stringify({ mentorId }) });
  }

  adminRemoveMember(id: string, userId: string) {
    return this.fetch(`/admin/jobs/${id}/remove-member`, { method: "POST", body: JSON.stringify({ userId }) });
  }

  // ---- ai ----
  aiChat(
    mode: "owner" | "student",
    message: string,
    history?: { role: "user" | "assistant"; content: string }[],
    jobId?: string
  ): Promise<{ reply: string }> {
    return this.fetch("/ai/chat", {
      method: "POST",
      body: JSON.stringify({ mode, message, history, jobId }),
    });
  }

  aiGithubConnect(data: { owner: string; repo: string; token: string; branch?: string }) {
    return this.fetch("/ai/github/repos", { method: "POST", body: JSON.stringify(data) });
  }

  aiGithubRepos(): Promise<AiRepo[]> {
    return this.fetch("/ai/github/repos");
  }

  aiGithubReview(repoId: string): Promise<ReviewRun> {
    return this.fetch(`/ai/github/repos/${repoId}/review`, { method: "POST" });
  }

  aiGithubRuns(repoId: string): Promise<ReviewRun[]> {
    return this.fetch(`/ai/github/repos/${repoId}/runs`);
  }

  aiGithubDelete(repoId: string) {
    return this.fetch(`/ai/github/repos/${repoId}`, { method: "DELETE" });
  }

  generateBrief(description: string, language: string = "en"): Promise<Brief> {
    return this.fetch("/ai/project-brief", {
      method: "POST",
      body: JSON.stringify({ description, language }),
    });
  }
}

export const api = new ApiClient();

export function budgetLabel(job: { budgetMin: number | null; budgetMax: number | null }): string {
  if (job.budgetMin != null && job.budgetMax != null) return `₹${job.budgetMin.toLocaleString("en-IN")} – ₹${job.budgetMax.toLocaleString("en-IN")}`;
  if (job.budgetMax != null) return `₹${job.budgetMax.toLocaleString("en-IN")}`;
  if (job.budgetMin != null) return `₹${job.budgetMin.toLocaleString("en-IN")}`;
  return "Budget TBD";
}