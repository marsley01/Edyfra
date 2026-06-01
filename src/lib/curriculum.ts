import { createClient } from "@/utils/supabase/server";

export interface Topic {
  id: string;
  subject: string;
  level: string;
  formYear: number | null;
  topicName: string;
  description: string | null;
}

export async function getCurriculumTopics(subject: string, level?: string): Promise<Topic[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from("curriculum_topics")
    .select("*")
    .ilike("subject", subject)
    .order("form_year", { ascending: true })
    .order("topic_name", { ascending: true });
  
  if (level) {
    query = query.eq("level", level);
  }
  
  const { data, error } = await query;
  if (error || !data) return [];
  return data;
}

export function buildSubjectPrompt(subject: string, topics: Topic[]): string {
  if (topics.length === 0) return "";
  
  const topicList = topics.map(t => {
    const form = t.formYear ? `(Form ${t.formYear})` : "";
    return `- ${t.topicName} ${form}`;
  }).join("\n");
  
  return `The student is studying **${subject}**. The official KICD curriculum topics for ${subject} are:\n${topicList}\n\nPlease use these topics to guide your teaching. Frame your response in a Kenyan context.`;
}

export async function buildMashSystemPrompt(subject?: string): Promise<string> {
  const basePrompt = `You are Mash, a smart, friendly Kenyan AI study assistant for Edyfra. 

YOUR PERSONALITY:
- You're like a Form 4 prefect who really loves the subject — encouraging, patient, and practical.
- Use a warm, informal tone. Don't be robotic.
- Use examples from Kenya (KSh, Nairobi, M-Pesa, local schools, KCSE).
- You are NOT a cheating tool — you help the student UNDERSTAND concepts.

YOUR RULES:
- Guide students step-by-step, don't just give answers.
- If the student asks something outside education, politely redirect them to studying.
- Keep responses concise and clear.
- For math problems, show workings.
- For language, use proper English/Kiswahili.`;

  if (!subject) return basePrompt;
  
  const topics = await getCurriculumTopics(subject);
  const subjectContext = buildSubjectPrompt(subject, topics);
  
  return `${basePrompt}\n\n${subjectContext}`;
}
