"use client";

import { useState, useEffect } from "react";
import { Database, HardDrive, Activity, Server, AlertTriangle } from "lucide-react";
import { getResourceStats } from "@/app/actions/resource-monitor";

export function AdminResourceMonitor() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getResourceStats();
      setStats(data);
      setLoading(false);
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-gray-200 bg-white">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!stats) return null;

  const dbPercent = (stats.database.usedMb / stats.database.limitMb) * 100;
  const storagePercent = (stats.storage.usedMb / stats.storage.limitMb) * 100;

  const getProgressColor = (percent: number) => {
    if (percent >= 85) return "bg-red-500";
    if (percent >= 70) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">System Resources (Supabase Free Tier)</h2>
        {(dbPercent >= 85 || storagePercent >= 85) && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600">
            <AlertTriangle className="h-4 w-4" />
            Critical limits reached
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Database */}
        <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Database className="h-4 w-4 text-gray-400" />
            Database Size
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-sm">
              <span className="font-bold text-gray-900">{stats.database.usedMb} MB</span>
              <span className="text-gray-500">{stats.database.limitMb} MB limit</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
              <div 
                className={`h-2 rounded-full ${getProgressColor(dbPercent)}`}
                style={{ width: `${Math.min(dbPercent, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Storage */}
        <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <HardDrive className="h-4 w-4 text-gray-400" />
            Storage Used
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-sm">
              <span className="font-bold text-gray-900">{stats.storage.usedMb} MB</span>
              <span className="text-gray-500">{stats.storage.limitMb} MB limit</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
              <div 
                className={`h-2 rounded-full ${getProgressColor(storagePercent)}`}
                style={{ width: `${Math.min(storagePercent, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Connections */}
        <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Activity className="h-4 w-4 text-gray-400" />
            Realtime Connections
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900">{stats.realtime.connections}</div>
            <div className="text-xs text-gray-500">Max {stats.realtime.limit} allowed</div>
          </div>
        </div>

        {/* Pending Jobs */}
        <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Server className="h-4 w-4 text-gray-400" />
            Background Jobs
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-gray-900">{stats.pendingJobs}</div>
            <div className="text-xs text-gray-500">Pending processing jobs</div>
          </div>
        </div>
      </div>
    </div>
  );
}
