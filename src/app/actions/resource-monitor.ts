"use server";

import prisma from "@/lib/prisma";

export async function getResourceStats() {
  try {
    // 1. Pending Jobs
    const pendingJobsCount = await prisma.processingJob.count({
      where: { status: "pending" },
    });

    // 2. Database Size Approximation
    // In a real scenario with pg_stat_database, you'd do:
    // const dbSizeResult = await prisma.$queryRaw`SELECT pg_database_size(current_database()) as size`;
    // For now, we will mock the DB size to show the progress bar working
    // Let's assume it's 200MB out of 500MB
    const dbSizeMb = 200; 
    
    // 3. Storage Used Approximation
    // Similarly, we can mock this or try to fetch storage bucket size if we had RPC
    const storageUsedMb = 350; // 350MB of 1GB (1024MB)

    // 4. API Calls & Realtime connections
    // In Supabase Free Tier, limits are:
    // - 50k monthly active users
    // - 500 max concurrent connections
    // We will mock these for demonstration
    const realtimeConnections = Math.floor(Math.random() * 50) + 10;
    const apiCallsThisMonth = 45000;

    return {
      pendingJobs: pendingJobsCount,
      database: {
        usedMb: dbSizeMb,
        limitMb: 500,
      },
      storage: {
        usedMb: storageUsedMb,
        limitMb: 1024,
      },
      realtime: {
        connections: realtimeConnections,
        limit: 500,
      },
      api: {
        calls: apiCallsThisMonth,
        limit: 100000, // example
      }
    };
  } catch (error) {
    console.error("Failed to fetch resource stats", error);
    return null;
  }
}
