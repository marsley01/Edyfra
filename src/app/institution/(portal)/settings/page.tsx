"use client";

import { useState, useEffect } from "react";
import { Save, Building2, Globe, Bell, Image, Loader2, Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    email: "",
    description: "",
    location: "",
    phone: "",
    website: "",
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { getUserInstitution } = await import("@/app/actions/institution-data");
        const membership = await getUserInstitution();
        if (membership) {
          const inst = membership.institution;
          setForm({
            name: inst.name,
            code: inst.code,
            email: inst.email || "",
            description: inst.description || "",
            location: inst.location || "",
            phone: inst.phone || "",
            website: inst.website || "",
          });
        }
      } catch {
        toast.error("Failed to load institution settings");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const { getUserInstitution } = await import("@/app/actions/institution-data");
      const membership = await getUserInstitution();
      if (!membership) {
        toast.error("Not authenticated");
        return;
      }
      const { updateInstitutionProfile } = await import("@/app/actions/institution");
      await updateInstitutionProfile(membership.institution.id, {
        name: form.name,
        description: form.description,
        location: form.location,
        email: form.email,
        phone: form.phone,
        website: form.website,
      });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500">Manage your institution profile and preferences.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Building2 className="h-4 w-4 text-[#3730A3]" />
          Institution Profile
        </h3>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-gray-500">Institution Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3730A3]/20"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Institution Code</label>
              <input value={form.code} disabled className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">
              <Mail className="mr-1 inline h-3 w-3" />
              Email Address
            </label>
            <input
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3730A3]/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3730A3]/20"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-gray-500">
                <MapPin className="mr-1 inline h-3 w-3" />
                Location
              </label>
              <input
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="Nairobi, Kenya"
                className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3730A3]/20"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">
                <Phone className="mr-1 inline h-3 w-3" />
                Phone
              </label>
              <input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+254 700 000 000"
                className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3730A3]/20"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">
              <Globe className="mr-1 inline h-3 w-3" />
              Website
            </label>
            <input
              value={form.website}
              onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
              placeholder="https://school.edu"
              className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3730A3]/20"
            />
          </div>
        </div>
      </div>

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
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg bg-[#3730A3] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#3730A3]/90 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Changes
      </button>
    </div>
  );
}
