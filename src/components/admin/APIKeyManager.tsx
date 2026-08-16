"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { showError, showSuccess } from "@/lib/toast";
import {
  KeyRound, Plus, Loader2, Copy, Check, RefreshCw, Ban, Activity, AlertTriangle, CalendarClock,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const AVAILABLE_SCOPES = [
  "subjects.read",
  "tutors.read",
  "tutors.match",
  "rooms.read",
  "sessions.book",
  "resources.read",
  "ai.query",
  "institutions.read",
  "analytics.read",
  "webhooks.send",
] as const;

interface GatewayKey {
  id: string;
  name: string;
  app_name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  rate_limit_per_hour: number;
  monthly_call_limit: number;
  calls_this_month: number;
  last_used_at: string | null;
  expires_at: string | null;
  rotating_from: string | null;
  rotation_grace_until: string | null;
  created_at: string;
}

interface UsagePoint {
  day: string;
  calls: number;
  errors: number;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-KE");
}

export function APIKeyManager() {
  const [keys, setKeys] = useState<GatewayKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedKey, setSelectedKey] = useState<GatewayKey | null>(null);
  const [usage, setUsage] = useState<UsagePoint[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    app_name: "",
    scopes: ["subjects.read", "resources.read"] as string[],
    rate_limit_per_hour: 200,
    monthly_call_limit: 20000,
    expires_at: "",
  });

  const fetchAbortRef = useRef<AbortController | null>(null);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/api-keys");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setKeys(data.keys ?? []);
    } catch (error) {
      console.error(error);
      showError({
        title: "Couldn't load API keys",
        cause: "A hiccup on our side blocked the load.",
        fix: "Try again, or refresh the page.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAbortRef.current?.abort();
    const ctrl = new AbortController();
    fetchAbortRef.current = ctrl;
    fetchKeys();
    return () => ctrl.abort();
  }, [fetchKeys]);

  const fetchUsage = useCallback(async (keyId: string) => {
    setUsageLoading(true);
    try {
      const res = await fetch(`/api/admin/api-keys?id=${encodeURIComponent(keyId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setUsage(data.usage ?? []);
    } catch (error) {
      console.error(error);
      setUsage([]);
    } finally {
      setUsageLoading(false);
    }
  }, []);

  const selectKey = (key: GatewayKey) => {
    setSelectedKey(key);
    fetchUsage(key.id);
  };

  const toggleScope = (scope: string) => {
    setForm((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.app_name.trim()) {
      showError({
        title: "Missing details",
        cause: "Name and partner platform are required.",
        fix: "Fill both fields, then create the key.",
      });
      return;
    }
    if (form.scopes.length === 0) {
      showError({
        title: "No scopes selected",
        cause: "A key needs at least one permission.",
        fix: "Pick at least one scope.",
      });
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          app_name: form.app_name.trim(),
          scopes: form.scopes,
          rate_limit_per_hour: form.rate_limit_per_hour,
          monthly_call_limit: form.monthly_call_limit,
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showError({
          title: "Couldn't create the key",
          cause: data.error || "The server rejected the request.",
          fix: "Adjust the details and try again.",
        });
        return;
      }
      setRevealedKey(data.key.key);
      setCreateOpen(false);
      setForm({ ...form, name: "", app_name: "", expires_at: "" });
      fetchKeys();
    } catch (error) {
      console.error(error);
      showError({
        title: "Couldn't create the key",
        cause: "A network problem blocked the request.",
        fix: "Check your connection and try again.",
      });
    } finally {
      setCreating(false);
    }
  };

  const copyKey = async () => {
    if (!revealedKey) return;
    try {
      await navigator.clipboard.writeText(revealedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showError({ title: "Couldn't copy", fix: "Select and copy the key manually." });
    }
  };

  const handleRotate = async (key: GatewayKey) => {
    try {
      const res = await fetch(`/api/admin/api-keys?id=${encodeURIComponent(key.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rotate" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setRevealedKey(data.key.key);
      showSuccess("Key rotated", { description: "Old key stays valid for 7 days." });
      fetchKeys();
    } catch (error) {
      console.error(error);
      showError({
        title: "Rotation failed",
        cause: "The server couldn't rotate the key.",
        fix: "Try again shortly.",
      });
    }
  };

  const handleRevoke = async (key: GatewayKey) => {
    if (!confirm(`Revoke "${key.name}"? Requests using this key will be rejected immediately.`)) return;
    try {
      const res = await fetch(`/api/admin/api-keys?id=${encodeURIComponent(key.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showSuccess("Key revoked");
      fetchKeys();
    } catch (error) {
      console.error(error);
      showError({
        title: "Revocation failed",
        cause: "The server couldn't revoke the key.",
        fix: "Try again shortly.",
      });
    }
  };

  const activeKeys = keys.filter((k) => k.is_active);
  const revokedKeys = keys.filter((k) => !k.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" /> API Keys
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Keys authenticate external platforms against the Edyfra API Gateway.
            Each key is scoped, rate-limited, and revoked independently.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-1.5" /> Create Key
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Active keys" value={String(activeKeys.length)} />
        <SummaryCard label="Revoked keys" value={String(revokedKeys.length)} />
        <SummaryCard label="Calls this month" value={formatNumber(keys.reduce((s, k) => s + (k.calls_this_month || 0), 0))} />
        <SummaryCard label="AI scope keys" value={String(keys.filter((k) => k.scopes?.includes("ai.query")).length)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Keys list */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : keys.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No API keys yet. Create one to connect an external platform.
              </CardContent>
            </Card>
          ) : (
            <>
              <KeySection title="Active" keys={activeKeys} onSelect={selectKey} onRotate={handleRotate} onRevoke={handleRevoke} selectedId={selectedKey?.id} />
              {revokedKeys.length > 0 && (
                <KeySection title="Revoked" keys={revokedKeys} onSelect={selectKey} onRotate={handleRotate} onRevoke={handleRevoke} selectedId={selectedKey?.id} />
              )}
            </>
          )}
        </div>

        {/* Usage chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Usage — last 30 days
            </CardTitle>
            <CardDescription className="text-xs">
              {selectedKey ? `Calls per day for "${selectedKey.name}"` : "Select a key to view its traffic."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usageLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : !selectedKey ? (
              <div className="py-24 text-center text-sm text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-3 opacity-40" />
                Pick a key on the left to see its call volume.
              </div>
            ) : usage.length === 0 ? (
              <div className="py-24 text-center text-sm text-muted-foreground">
                No requests logged for this key yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={usage} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="calls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary, #7c3aed)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary, #7c3aed)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #27272a)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12 }} />
                  <Area type="monotone" dataKey="calls" name="Calls" stroke="var(--primary, #7c3aed)" fill="url(#calls)" strokeWidth={2} />
                  <Area type="monotone" dataKey="errors" name="Errors" stroke="#ef4444" fill="none" strokeWidth={1.5} strokeDasharray="4 3" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              The full key is shown once — copy it now. Scopes, rate limits, and expiry can't be changed after creation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="key-name">Key name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g. Kenya Library App"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="key-app">Partner platform</Label>
                <Input
                  id="key-app"
                  placeholder="e.g. kenyalibrary"
                  value={form.app_name}
                  onChange={(e) => setForm({ ...form, app_name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Scopes</Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_SCOPES.map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => toggleScope(scope)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      form.scopes.includes(scope)
                        ? "bg-primary/15 text-primary border-primary/40"
                        : "bg-muted/30 text-muted-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {scope}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="key-rate">Rate limit / hour</Label>
                <Input
                  id="key-rate"
                  type="number"
                  min={1}
                  value={form.rate_limit_per_hour}
                  onChange={(e) => setForm({ ...form, rate_limit_per_hour: Number(e.target.value) || 200 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="key-monthly">Monthly limit</Label>
                <Input
                  id="key-monthly"
                  type="number"
                  min={1}
                  value={form.monthly_call_limit}
                  onChange={(e) => setForm({ ...form, monthly_call_limit: Number(e.target.value) || 20000 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="key-expiry">Expires (optional)</Label>
                <Input
                  id="key-expiry"
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Create Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revealed key dialog */}
      <Dialog open={!!revealedKey} onOpenChange={(open) => { if (!open) { setRevealedKey(null); setCopied(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" /> Your API Key
            </DialogTitle>
            <DialogDescription>
              Copy it now — for security this key will never be shown again. Store it somewhere safe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-muted/40 border border-border font-mono text-xs break-all text-foreground select-all">
              {revealedKey}
            </div>
            <Button onClick={copyKey} className="w-full">
              {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
              {copied ? "Copied" : "Copy key"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-xl font-black text-foreground mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function KeySection({
  title, keys, onSelect, onRotate, onRevoke, selectedId,
}: {
  title: string;
  keys: GatewayKey[];
  onSelect: (key: GatewayKey) => void;
  onRotate: (key: GatewayKey) => void;
  onRevoke: (key: GatewayKey) => void;
  selectedId?: string;
}) {
  if (keys.length === 0) return null;
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">{title}</p>
      {keys.map((key) => {
        const rotating = key.is_active && !!key.rotation_grace_until;
        const expired = key.expires_at && new Date(key.expires_at) < new Date();
        const selected = key.id === selectedId;
        return (
          <Card
            key={key.id}
            className={`cursor-pointer transition-all hover:border-primary/40 ${
              selected ? "border-primary/60 ring-1 ring-primary/30" : ""
            }`}
            onClick={() => onSelect(key)}
          >
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm text-foreground truncate">{key.name}</p>
                    <Badge variant={key.is_active ? "default" : "secondary"} className="text-[10px]">
                      {key.is_active ? "Active" : "Revoked"}
                    </Badge>
                    {rotating && (
                      <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/40">
                        <RefreshCw className="h-3 w-3 mr-1" /> Rotating
                      </Badge>
                    )}
                    {expired && key.is_active && (
                      <Badge variant="outline" className="text-[10px] text-red-500 border-red-500/40">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Expired
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {key.app_name} · prefix <span className="font-mono">{key.key_prefix}…</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {key.is_active && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={(e) => { e.stopPropagation(); onRotate(key); }}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" /> Rotate
                    </Button>
                  )}
                  {key.is_active && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10"
                      onClick={(e) => { e.stopPropagation(); onRevoke(key); }}
                    >
                      <Ban className="h-3 w-3 mr-1" /> Revoke
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {key.scopes.map((scope) => (
                  <span key={scope} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                    {scope}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-muted-foreground">
                <span>Hourly limit: <strong className="text-foreground">{formatNumber(key.rate_limit_per_hour)}</strong></span>
                <span>Monthly: <strong className="text-foreground">{formatNumber(key.calls_this_month)} / {formatNumber(key.monthly_call_limit)}</strong></span>
                <span>Created: <strong className="text-foreground">{formatDate(key.created_at)}</strong></span>
                <span>
                  {key.rotation_grace_until && key.is_active ? (
                    <span className="inline-flex items-center gap-1 text-amber-500">
                      <CalendarClock className="h-3 w-3" /> Grace till {formatDate(key.rotation_grace_until)}
                    </span>
                  ) : (
                    <>Expires: <strong className="text-foreground">{formatDate(key.expires_at)}</strong></>
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}