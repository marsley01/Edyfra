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

export async function searchStudents(query: string): Promise<Student[]> {
  if (!query || query.trim().length < 2) return [];

  const normalizedQuery = query.trim().toLowerCase();

  try {
    const users = await prisma.user.findMany({
      where: {
        role: Role.STUDENT,
        OR: [
          { name: { contains: normalizedQuery, mode: "insensitive" } },
          { county: { contains: normalizedQuery, mode: "insensitive" } },
        ],
      },
      take: 20,
      include: {
        studentProfile: {
          select: {
            subjects: true,
          },
        },
      },
    });

    // Filter by subjects in JS (more reliable than Prisma's array `hasSome` for case sensitivity)
    const subjectNeedles = [
      normalizedQuery,
      normalizedQuery.charAt(0).toUpperCase() + normalizedQuery.slice(1),
    ];
    const matches = users.filter((u) => {
      const subjects = (u.studentProfile?.subjects || []) as string[];
      return subjectNeedles.some((n) =>
        subjects.some((s) => s.toLowerCase().includes(n)),
      );
    });
    const finalUsers = matches.length > 0 ? matches : users;

    return finalUsers.map((user) => ({
      id: user.id,
      name: user.name,
      school: user.county || "Kenya",
      course: "",
      username: user.name.toLowerCase().replace(/\s/g, "_"),
      avatar_url:
        user.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=${user.id}`,
    }));
  } catch (error) {
    console.error("[searchStudents] error:", error);
    // Re-throw so the client can show a useful error state instead of
    // silently returning []. The page handles this in its try/catch.
    throw new Error(
      error instanceof Error ? error.message : "Search failed unexpectedly",
    );
  }
}
