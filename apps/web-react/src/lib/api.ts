const API_BASE = "/api";

export type Role = "user" | "mentor";

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
  passportConsent: boolean | null;
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

export interface Owner {
  id: string;
  name: string;
  businessName: string | null;
  verificationStatus: string;
}

export interface Project {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: string;
  requiredSkills: string[];
  budgetType: "paid" | "stipend" | "unpaid";
  budgetAmount?: number | null;
  deadline?: string | null;
  acceptanceCriteria?: string | null;
  rubric: { criterion: string; description: string; maxScore: number }[] | null;
  status: string;
  mentorId?: string | null;
  createdAt: string;
  owner?: Owner | null;
  milestones?: Milestone[];
  applications?: Application[];
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  dueDate?: string | null;
  status: "pending" | "submitted" | "approved";
  order: number;
}

export interface Application {
  id: string;
  projectId: string;
  applicantId: string;
  pitch: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  applicant?: {
    id: string;
    name: string;
    email: string;
    college: string | null;
    skills: string[];
    linkedin: string | null;
    github: string | null;
    portfolio: string | null;
    resumeKey: string | null;
  } | null;
}

export interface MyApplication extends Application {
  project: { id: string; title: string; status: string; rubric: unknown } | null;
  milestones: Milestone[];
}

export interface VerificationProject {
  id: string;
  title: string;
  status: string;
  requiredSkills: string[];
  owner: { id: string; name: string; businessName: string | null } | null;
  mentor: { id: string; name: string } | null;
}

export interface BusinessRow extends BusinessProfile {
  name: string;
  email: string;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  college: string | null;
  skills: string[];
  resumeKey: string | null;
}

export interface PassportData {
  user: {
    id: string;
    name: string;
    college: string | null;
    city: string | null;
    bio: string | null;
    linkedin: string | null;
    github: string | null;
    portfolio: string | null;
    skills: string[];
  };
  verifiedSkills: {
    id: string;
    skill: string;
    level: string;
    project: { title: string; category: string } | null;
    reviewer: { name: string } | null;
  }[];
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

  // Auth + profile
  async signup(data: {
    email: string;
    password: string;
    name: string;
    role: Role;
    profile?: Record<string, unknown>;
  }) {
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

  // Projects
  getProjects(filters?: { skill?: string; category?: string; status?: string; mine?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.skill) params.set("skill", filters.skill);
    if (filters?.category) params.set("category", filters.category);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.mine) params.set("mine", "1");
    const query = params.toString() ? `?${params}` : "";
    return this.fetch(`/projects${query}`);
  }

  getProject(id: string): Promise<Project> {
    return this.fetch(`/projects/${id}`);
  }

  createProject(data: Partial<Project>) {
    return this.fetch("/projects", { method: "POST", body: JSON.stringify(data) });
  }

  publishProject(id: string) {
    return this.fetch(`/projects/${id}/publish`, { method: "PATCH" });
  }

  // Applications
  applyToProject(projectId: string, pitch: string) {
    return this.fetch(`/applications/${projectId}/apply`, { method: "POST", body: JSON.stringify({ pitch }) });
  }

  getApplications(projectId: string): Promise<Application[]> {
    return this.fetch(`/applications/${projectId}/applications`);
  }

  acceptApplication(applicationId: string) {
    return this.fetch(`/applications/${applicationId}/accept`, { method: "POST" });
  }

  getMyApplications(): Promise<MyApplication[]> {
    return this.fetch("/applications/mine");
  }

  // Submissions
  getProjectSubmissions(projectId: string) {
    return this.fetch(`/submissions/project/${projectId}`);
  }

  getMySubmissions() {
    return this.fetch("/submissions/mine");
  }

  submitWork(data: { milestoneId: string; notes?: string; fileUrls: string[] }) {
    return this.fetch("/submissions/submit", { method: "POST", body: JSON.stringify(data) });
  }

  // Reviews
  reviewSubmission(data: { submissionId: string; rubricScores: { criterion: string; score: number }[]; comments: string; decision: string }) {
    return this.fetch(`/reviews/${data.submissionId}/review`, { method: "POST", body: JSON.stringify(data) });
  }

  // Passport
  getPassport(slug: string): Promise<PassportData> {
    return this.fetch(`/passport/${slug}`);
  }

  // Mentor admin
  adminGetBusinesses(): Promise<BusinessRow[]> {
    return this.fetch("/admin/businesses");
  }

  adminVerifyBusiness(userId: string) {
    return this.fetch(`/admin/businesses/${userId}/verify`, { method: "PATCH" });
  }

  adminGetMentors() {
    return this.fetch("/admin/mentors");
  }

  adminGetUsers(): Promise<UserRow[]> {
    return this.fetch("/admin/users");
  }

  adminGetProjects(): Promise<VerificationProject[]> {
    return this.fetch("/admin/projects");
  }

  adminAssignMentor(projectId: string, mentorId: string) {
    return this.fetch(`/admin/projects/${projectId}/assign-mentor`, {
      method: "PATCH",
      body: JSON.stringify({ mentorId }),
    });
  }

  // AI
  generateBrief(description: string, language: string = "en"): Promise<Brief> {
    return this.fetch("/ai/project-brief", {
      method: "POST",
      body: JSON.stringify({ description, language }),
    });
  }
}

export const api = new ApiClient();
