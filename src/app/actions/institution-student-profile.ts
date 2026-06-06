"use server";

import { cache } from "react";
import prisma from "@/lib/prisma";
import { requireInstitutionAdmin } from "./institution-guard";

export interface StudentFullProfile {
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    formYear: number | null;
    educationLevel: string | null;
    lastActiveAt: Date | null;
    points: number;
  };
  totalSessions: number;
  totalXp: number;
  membership: {
    joinedAt: Date;
    status: string;
  };
  currentTerm: { term: number; year: number } | null;
  currentResults: Array<{
    id: string;
    subject: string;
    marks: number;
    grade: string | null;
    trend: string;
    flag: string;
    overallStatus: string;
    aiInsight: string | null;
  }>;
  history: Array<{ term: number; year: number; subject: string; marks: number }>;
  sessions: Array<{
    id: string;
    subject: string;
    topic: string | null;
    date: Date;
    duration: number | null;
    partnerName: string | null;
  }>;
  challenges: Array<{
    id: string;
    subject: string;
    score: number;
    completedAt: Date;
  }>;
  mashUsage: number;
  resourceDownloads: number;
  coaching: {
    current: Array<{
      id: string;
      teacherName: string;
      subject: string;
      schedule: string | null;
      startDate: Date;
      endDate: Date;
    }>;
    past: Array<{
      id: string;
      teacherName: string;
      subject: string;
      startDate: Date;
      endDate: Date;
      sessionsAttended: number;
      sessionsScheduled: number;
    }>;
  };
}

export const getStudentFullProfile = cache(
  async (studentUserId: string, institutionId: string): Promise<StudentFullProfile | null> => {
    const [user, member, currentTerm, sessions, challenges, aiMessages, resourcePurchases, coaching] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: studentUserId },
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            formYear: true,
            educationLevel: true,
            lastActiveAt: true,
            points: true,
          },
        }),
        prisma.institutionMember.findFirst({
          where: { institutionId, userId: studentUserId },
          select: { joinedAt: true, status: true },
        }),
        prisma.academicTerm.findFirst({
          where: { institutionId, isCurrent: true },
          select: { term: true, year: true },
        }),
        prisma.session.findMany({
          where: { studentId: studentUserId },
          orderBy: { startedAt: "desc" },
          take: 20,
          include: {
            partner: { select: { name: true } },
          },
        }),
        prisma.dailyChallengeAttempt.findMany({
          where: { userId: studentUserId },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { challenge: { select: { subject: true } } },
        }),
        prisma.aiChatMessage.count({ where: { userId: studentUserId } }),
        prisma.resourcePurchase.count({ where: { userId: studentUserId } }),
        prisma.coachingAssignment.findMany({
          where: { studentUserId, institutionId },
          orderBy: { createdAt: "desc" },
          include: { teacher: { select: { name: true } } },
        }),
      ]);

    if (!user || !member) return null;

    const [currentResults, history, totalSessions, totalXp] = await Promise.all([
      currentTerm
        ? prisma.studentResultsAnalysis.findMany({
            where: { studentUserId, institutionId, term: currentTerm.term, year: currentTerm.year },
            orderBy: { subject: "asc" },
          })
        : Promise.resolve([]),
      prisma.studentResult.findMany({
        where: { studentUserId, institutionId },
        orderBy: [{ year: "asc" }, { term: "asc" }],
        select: { subject: true, marks: true, term: true, year: true },
      }),
      prisma.session.count({ where: { studentId: studentUserId } }),
      user.points, // XP = points
    ]);

    return {
      user,
      totalSessions,
      totalXp,
      membership: { joinedAt: member.joinedAt, status: member.status },
      currentTerm,
      currentResults: currentResults.map((r) => ({
        id: r.id,
        subject: r.subject,
        marks: r.marks,
        grade: null,
        trend: r.trend,
        flag: r.flag,
        overallStatus: r.overallStatus,
        aiInsight: r.aiInsight,
      })),
      history: history.map((h) => ({ subject: h.subject, marks: h.marks, term: h.term, year: h.year })),
      sessions: sessions.map((s) => ({
        id: s.id,
        subject: s.subject,
        topic: s.topic,
        date: s.startedAt ?? new Date(0),
        duration: s.durationMin,
        partnerName: s.partner?.name ?? null,
      })),
      challenges: challenges.map((c) => ({
        id: c.id,
        subject: c.challenge.subject,
        score: c.pointsEarned,
        completedAt: c.createdAt,
      })),
      mashUsage: aiMessages,
      resourceDownloads: resourcePurchases,
      coaching: {
        current: coaching
          .filter((c) => c.status === "ACTIVE" || c.status === "SCHEDULED")
          .map((c) => ({
            id: c.id,
            teacherName: c.teacher.name,
            subject: c.subject,
            schedule: c.schedule,
            startDate: c.startDate,
            endDate: c.endDate,
          })),
        past: coaching
          .filter((c) => c.status === "COMPLETED" || c.status === "CANCELLED")
          .map((c) => ({
            id: c.id,
            teacherName: c.teacher.name,
            subject: c.subject,
            startDate: c.startDate,
            endDate: c.endDate,
            sessionsAttended: c.sessionsAttended,
            sessionsScheduled: c.sessionsScheduled,
          })),
      },
    };
  },
);
