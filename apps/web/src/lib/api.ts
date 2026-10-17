const API_BASE = "/api";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "sme" | "student" | "mentor" | "admin";
}

export interface Project {
  id: string;
  smeId: string;
  title: string;
  description: string;
  category: string;
  requiredSkills: string[];
  budgetType: "paid" | "stipend" | "unpaid";
  budgetAmount?: number;
  deadline?: string;
  acceptanceCriteria?: string;
  rubric: { criterion: string; description: string; maxScore: number }[] | null;
  status: string;
  mentorId?: string;
  createdAt: string;
  sme?: { name: string; businessName?: string; verificationStatus?: string };
  milestones?: Milestone[];
  applications?: Application[];
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  dueDate?: string;
  status: "pending" | "submitted" | "approved";
  order: number;
}

export interface Application {
  id: string;
  projectId: string;
  studentId: string;
  pitch: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  student?: { name: string; college?: string; skills: string[] };
}

export interface Submission {
  id: string;
  milestoneId: string;
  studentId: string;
  notes?: string;
  fileUrls: string[];
  submittedAt: string;
}

export interface Review {
  id: string;
  submissionId: string;
  reviewerId: string;
  reviewerType: "sme" | "mentor";
  rubricScores: { criterion: string; score: number }[];
  comments: string;
  decision: "approved" | "revision" | "rejected";
  createdAt: string;
}

export interface VerifiedSkill {
  id: string;
  studentId: string;
  skill: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  projectId: string;
  reviewId: string;
  createdAt: string;
  project?: { title: string; category: string };
  reviewer?: { name: string };
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async fetch(path: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async signup(data: { email: string; password: string; name: string; role: string; profile?: any }) {
    return this.fetch("/auth/signup", { method: "POST", body: JSON.stringify(data) });
  }

  async login(email: string, password: string) {
    return this.fetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  }

  async getProjects(filters?: { skill?: string; category?: string; status?: string; mine?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.skill) params.set("skill", filters.skill);
    if (filters?.category) params.set("category", filters.category);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.mine) params.set("mine", "1");
    const query = params.toString() ? `?${params}` : "";
    return this.fetch(`/projects${query}`);
  }

  async getProject(id: string) {
    return this.fetch(`/projects/${id}`);
  }

  async createProject(data: Partial<Project>) {
    return this.fetch("/projects", { method: "POST", body: JSON.stringify(data) });
  }

  async publishProject(id: string) {
    return this.fetch(`/projects/${id}/publish`, { method: "PATCH" });
  }

  async applyToProject(projectId: string, pitch: string) {
    return this.fetch(`/applications/${projectId}/apply`, { method: "POST", body: JSON.stringify({ pitch }) });
  }

  async getApplications(projectId: string) {
    return this.fetch(`/applications/${projectId}/applications`);
  }

  async acceptApplication(applicationId: string) {
    return this.fetch(`/applications/${applicationId}/accept`, { method: "POST" });
  }

  async getMyApplications() {
    return this.fetch("/applications/mine");
  }

  async getProjectSubmissions(projectId: string) {
    return this.fetch(`/submissions/project/${projectId}`);
  }

  async getMySubmissions() {
    return this.fetch("/submissions/mine");
  }

  async submitWork(data: { milestoneId: string; notes?: string; fileUrls: string[] }) {
    return this.fetch("/submissions/submit", { method: "POST", body: JSON.stringify(data) });
  }

  async reviewSubmission(data: { submissionId: string; rubricScores: any[]; comments: string; decision: string }) {
    return this.fetch(`/reviews/${data.submissionId}/review`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getPassport(slug: string) {
    return this.fetch(`/passport/students/${slug}/passport`);
  }

  async adminGetSmes() {
    return this.fetch("/admin/smes");
  }

  async adminVerifySme(userId: string) {
    return this.fetch(`/admin/smes/${userId}/verify`, { method: "PATCH" });
  }

  async adminGetMentors() {
    return this.fetch("/admin/mentors");
  }

  async adminGetProjects() {
    return this.fetch("/admin/projects");
  }

  async adminAssignMentor(projectId: string, mentorId: string) {
    return this.fetch(`/admin/projects/${projectId}/assign-mentor`, {
      method: "PATCH",
      body: JSON.stringify({ mentorId }),
    });
  }

  async generateBrief(description: string, language: string = "en") {
    return this.fetch("/ai/project-brief", {
      method: "POST",
      body: JSON.stringify({ description, language }),
    });
  }
}

export const api = new ApiClient();
