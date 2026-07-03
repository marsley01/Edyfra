"use server";

import prisma from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

export async function toggleFavorite(favoriteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const existing = await prisma.favoriteUser.findUnique({
      where: {
        userId_favoriteId: {
          userId: user.id,
          favoriteId,
        },
      },
    });

    if (existing) {
      await prisma.favoriteUser.delete({
        where: { id: existing.id },
      });
      return { success: true, isFavorited: false };
    } else {
      await prisma.favoriteUser.create({
        data: {
          userId: user.id,
          favoriteId,
        },
      });
      return { success: true, isFavorited: true };
    }
  } catch (error: any) {
    console.error("Toggle favorite error:", error);
    return { success: false, error: error.message };
  }
}

export async function getFavorites() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  try {
    const favorites = await prisma.favoriteUser.findMany({
      where: { userId: user.id },
      include: {
        favorite: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return favorites;
  } catch (error) {
    console.error("Get favorites error:", error);
    return [];
  }
}

export async function isFavorite(favoriteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  try {
    const existing = await prisma.favoriteUser.findUnique({
      where: {
        userId_favoriteId: {
          userId: user.id,
          favoriteId,
        },
      },
    });
    return !!existing;
  } catch {
    return false;
  }
}
