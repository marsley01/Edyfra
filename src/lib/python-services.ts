const PYTHON_SERVICES = {
  recommendations: process.env.PYTHON_RECOMMENDATIONS_URL || "http://localhost:8001",
  plagiarism: process.env.PYTHON_PLAGIARISM_URL || "http://localhost:8002",
  moderation: process.env.PYTHON_MODERATION_URL || "http://localhost:8003",
};

async function callService(service: keyof typeof PYTHON_SERVICES, endpoint: string, body: any) {
  try {
    const res = await fetch(`${PYTHON_SERVICES[service]}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function moderateContent(text: string, userId: string, source = "message", sessionId?: string) {
  return callService("moderation", "/moderate", { text, user_id: userId, source, session_id: sessionId });
}

export async function checkPlagiarism(text: string, userId: string, sessionId?: string, subject?: string) {
  return callService("plagiarism", "/check", { text, user_id: userId, session_id: sessionId, subject });
}

export async function getTutorRecommendations(userId: string, subject?: string, limit = 10) {
  return callService("recommendations", "/recommend/tutors", { user_id: userId, role: "student", subject, limit });
}

export async function getResourceRecommendations(userId: string, subject?: string, limit = 10) {
  return callService("recommendations", "/recommend/resources", { user_id: userId, role: "student", subject, limit });
}
