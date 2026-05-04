"use server";

import { createClient } from "@/utils/supabase/server";

export interface Student {
  id: string;
  name: string;
  school?: string;
  course?: string;
  username?: string;
  avatar_url?: string;
}

export async function searchStudents(query: string) {
  if (!query || query.length < 2) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("User")
    .select("id, name, educationLevel, county")
    .or(`name.ilike.%${query}%,county.ilike.%${query}%`)
    .limit(20);

  if (error) {
    console.error("Search error:", error);
    throw new Error("Search failed");
  }

  return data.map((user: any) => ({
    id: user.id,
    name: user.name,
    school: user.county,
    course: user.educationLevel,
    username: user.name.toLowerCase().replace(/\s/g, "_"),
    avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`
  }));
}
