"use client";

import { useState } from "react";
import { Megaphone, Send, Eye, Clock, Plus } from "lucide-react";

const sentAnnouncements = [
  {
    id: 1,
    title: "Mid-Term Break Schedule",
    body: "All sessions are suspended during the mid-term break from June 15–22. Please communicate this to your students and plan your lessons accordingly.",
    date: "May 18, 2026",
    reach: 1204,
    readRate: 87,
  },
  {
    id: 2,
    title: "New Biology Curriculum",
    body: "Updated Form 4 Biology content is now available on the platform. Review the new modules covering genetics, ecology, and reproduction.",
    date: "May 15, 2026",
    reach: 847,
    readRate: 73,
  },
  {
    id: 3,
    title: "Tutor Recruitment Drive",
    body: "We are expanding our tutor network. Current institutions can refer qualified tutors and earn referral credits.",
    date: "May 10, 2026",
    reach: 632,
    readRate: 91,
  },
  {
    id: 4,
    title: "Exam Preparation Resources",
    body: "New past paper collections and revision guides have been uploaded for Form 4 candidates preparing for KCSE.",
    date: "May 5, 2026",
    reach: 1567,
    readRate: 95,
  },
];

export default function AnnouncementsPage() {
  const [showDraft, setShowDraft] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Announcements</h2>
          <p className="text-sm text-gray-500">Send and manage announcements to your institution.</p>
        </div>
        <button
          onClick={() => setShowDraft(!showDraft)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#3730A3] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#3730A3]/90"
        >
          <Plus className="h-4 w-4" />
          New Announcement
        </button>
      </div>

      {/* Draft Composer */}
      {showDraft && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900">Compose Announcement</h3>
          <div className="mt-4 space-y-4">
            <input
            placeholder="Announcement title"
            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3730A3]/20"
          />
          <textarea
            placeholder="Write your announcement..."
            rows={4}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3730A3]/20"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Will be sent to all active students and tutors</span>
            <button className="inline-flex items-center gap-2 rounded-lg bg-[#3730A3] px-4 py-2 text-sm font-medium text-white hover:bg-[#3730A3]/90">
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
          </div>
        </div>
      )}

      {/* Sent Announcements */}
      <div className="space-y-3">
        {sentAnnouncements.map((a) => (
          <div key={a.id} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-[#3730A3]" />
                  <h3 className="text-sm font-semibold text-gray-900">{a.title}</h3>
                </div>
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">{a.body}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {a.date}
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {a.reach.toLocaleString()} reached
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-16 rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${a.readRate}%` }}
                  />
                </div>
                <span>{a.readRate}% read</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
