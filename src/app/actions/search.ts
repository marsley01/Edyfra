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
    .rpc("search_users", { search_term: query });

  if (error) {
    console.error("Search error:", error);
    return [];
  }

  type SearchResult = { id: string; name: string; school?: string; role?: string; avatar?: string };
  return (data as SearchResult[]).map((user) => ({
    id: user.id,
    name: user.name,
    school: user.school,
    course: "",
    username: user.name.toLowerCase().replace(/\s/g, "_"),
    avatar_url: user.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${user.id}`
  }));
}
