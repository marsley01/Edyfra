"use client";

import { useState, useEffect } from "react";
import { Megaphone, Send, Eye, Clock, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Announcement = {
  id: string;
  title: string;
  body: string;
  date: string;
  reach: number;
  readRate: number;
  isActive: boolean;
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDraft, setShowDraft] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { getInstitutionAnnouncements } = await import("@/app/actions/institution-data");
        const data = await getInstitutionAnnouncements("institution");
        setAnnouncements(data as Announcement[]);
      } catch {
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setSending(true);
    try {
      const { createInstitutionAnnouncement } = await import("@/app/actions/institution-data");
      const result = await createInstitutionAnnouncement(title, body);
      if (result) {
        toast.success("Announcement sent");
        setTitle("");
        setBody("");
        setShowDraft(false);
        const { getInstitutionAnnouncements } = await import("@/app/actions/institution-data");
        const data = await getInstitutionAnnouncements("institution");
        setAnnouncements(data as Announcement[]);
      }
    } catch {
      toast.error("Failed to send announcement");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[#3730A3]" />
      </div>
    );
  }

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
          {showDraft ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showDraft ? "Close" : "New Announcement"}
        </button>
      </div>

      {showDraft && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900">Compose Announcement</h3>
          <div className="mt-4 space-y-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3730A3]/20"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your announcement..."
              rows={4}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3730A3]/20"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Will be sent to all active members</span>
              <button
                onClick={handleSend}
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-lg bg-[#3730A3] px-4 py-2 text-sm font-medium text-white hover:bg-[#3730A3]/90 disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {announcements.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Megaphone className="mb-3 h-10 w-10 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">No announcements yet</p>
          <p className="text-xs text-gray-400">Create your first announcement to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-[#3730A3]" />
                    <h3 className="text-sm font-semibold text-gray-900">{a.title}</h3>
                    {!a.isActive && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">Draft</span>
                    )}
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
      )}
    </div>
  );
}
