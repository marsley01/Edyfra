"use client";

import { useState } from "react";
import { Save, Building2, Globe, Bell, Shield, Image } from "lucide-react";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500">Manage your institution profile and preferences.</p>
      </div>

      {/* Institution Profile */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Building2 className="h-4 w-4 text-[#3730A3]" />
          Institution Profile
        </h3>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-gray-500">Institution Name</label>
              <input defaultValue="Kenyatta University" className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3730A3]/20" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Institution Code</label>
              <input defaultValue="KU-2026" disabled className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Email Address</label>
            <input defaultValue="admin@ku.ac.ke" className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3730A3]/20" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Description</label>
            <textarea rows={3} defaultValue="Leading public university in Kenya committed to academic excellence and innovation." className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3730A3]/20" />
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Image className="h-4 w-4 text-[#3730A3]" />
          Branding
        </h3>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500">Institution Logo</label>
            <div className="mt-1 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#3730A3] text-2xl font-bold text-white">
                KU
              </div>
              <button className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                Change Logo
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-gray-500">Primary Color</label>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#3730A3]" />
                <span className="text-xs text-gray-500">#3730A3</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Accent Color</label>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-[#4f46e5]" />
                <span className="text-xs text-gray-500">#4f46e5</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Bell className="h-4 w-4 text-[#3730A3]" />
          Notification Preferences
        </h3>
        <div className="mt-4 space-y-3">
          {[
            { label: "New student enrollment", defaultChecked: true },
            { label: "Tutor applications", defaultChecked: true },
            { label: "Session reminders", defaultChecked: true },
            { label: "Weekly engagement digest", defaultChecked: false },
            { label: "System updates", defaultChecked: true },
          ].map((n) => (
            <label key={n.label} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{n.label}</span>
              <input type="checkbox" defaultChecked={n.defaultChecked} className="h-4 w-4 rounded border-gray-300 text-[#3730A3] focus:ring-[#3730A3]" />
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="inline-flex items-center gap-2 rounded-lg bg-[#3730A3] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#3730A3]/90"
      >
        <Save className="h-4 w-4" />
        {saved ? "Saved!" : "Save Changes"}
      </button>
    </div>
  );
}
