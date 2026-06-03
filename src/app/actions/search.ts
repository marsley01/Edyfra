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

import prisma from "@/lib/prisma";
import { Role } from "@/generated/client";

export async function searchStudents(query: string) {
  if (!query || query.length < 2) return [];

  const normalizedQuery = query.trim().toLowerCase();

  try {
    const users = await prisma.user.findMany({
      where: {
        role: Role.STUDENT,
        OR: [
          { name: { contains: normalizedQuery, mode: "insensitive" } },
          { county: { contains: normalizedQuery, mode: "insensitive" } },
          {
            studentProfile: {
              subjects: {
                hasSome: [normalizedQuery, normalizedQuery.charAt(0).toUpperCase() + normalizedQuery.slice(1)]
              }
            }
          }
        ]
      },
      take: 20
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      school: user.county || "Kenya",
      course: "",
      username: user.name.toLowerCase().replace(/\s/g, "_"),
      avatar_url: user.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${user.id}`
    }));
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}
