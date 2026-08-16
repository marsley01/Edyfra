export type FeatureFlagKey =
  | "ai-tutor"
  | "video-calls"
  | "live-chat"
  | "study-groups"
  | "daily-challenges"
  | "leaderboards"
  | "achievements"
  | "resource-marketplace"
  | "institution-portal"
  | "mpesa-payments"
  | "push-notifications"
  | "community-forum"
  | "news-feed"
  | "analytics-dashboard"
  | "dark-mode";

export interface FeatureFlag {
  key: FeatureFlagKey;
  enabled: boolean;
  description: string;
  dependencies?: FeatureFlagKey[];
  beta?: boolean;
}

const defaultFlags: Record<FeatureFlagKey, FeatureFlag> = {
  "ai-tutor": { key: "ai-tutor", enabled: true, description: "AI-powered tutor assistant (Eddy)" },
  "video-calls": { key: "video-calls", enabled: true, description: "Peer-to-peer video study rooms" },
  "live-chat": { key: "live-chat", enabled: true, description: "Real-time messaging" },
  "study-groups": { key: "study-groups", enabled: true, description: "Group study sessions" },
  "daily-challenges": { key: "daily-challenges", enabled: true, description: "AI-generated daily quizzes" },
  "leaderboards": { key: "leaderboards", enabled: true, description: "XP leaderboard rankings" },
  "achievements": { key: "achievements", enabled: true, description: "Gamified achievement system" },
  "resource-marketplace": { key: "resource-marketplace", enabled: true, description: "Buy/sell study resources" },
  "institution-portal": { key: "institution-portal", enabled: true, description: "School administration dashboard" },
  "mpesa-payments": { key: "mpesa-payments", enabled: true, description: "M-Pesa payment integration" },
  "push-notifications": { key: "push-notifications", enabled: true, description: "Browser push notifications" },
  "community-forum": { key: "community-forum", enabled: true, description: "Community discussion forums" },
  "news-feed": { key: "news-feed", enabled: true, description: "Platform news and announcements" },
  "analytics-dashboard": { key: "analytics-dashboard", enabled: true, description: "Admin analytics and insights" },
  "dark-mode": { key: "dark-mode", enabled: true, description: "Dark mode theme support" },
};

export class FeatureFlagService {
  private flags: Map<FeatureFlagKey, boolean> = new Map();
  private overrides: Map<FeatureFlagKey, boolean> = new Map();

  constructor() {
    for (const [key, flag] of Object.entries(defaultFlags)) {
      this.flags.set(key as FeatureFlagKey, flag.enabled);
    }
  }

  isEnabled(key: FeatureFlagKey, userId?: string): boolean {
    if (this.overrides.has(key)) return this.overrides.get(key)!;
    if (userId) {
      const userOverride = this.getUserOverride(key, userId);
      if (userOverride !== null) return userOverride;
    }
    return this.flags.get(key) ?? false;
  }

  isDisabled(key: FeatureFlagKey, userId?: string): boolean {
    return !this.isEnabled(key, userId);
  }

  enable(key: FeatureFlagKey): void {
    this.flags.set(key, true);
  }

  disable(key: FeatureFlagKey): void {
    this.flags.set(key, false);
  }

  override(key: FeatureFlagKey, enabled: boolean): void {
    this.overrides.set(key, enabled);
  }

  clearOverrides(): void {
    this.overrides.clear();
  }

  getFlag(key: FeatureFlagKey): FeatureFlag | undefined {
    return defaultFlags[key];
  }

  getAllFlags(): FeatureFlag[] {
    return Object.values(defaultFlags);
  }

  getEnabledFlags(): FeatureFlag[] {
    return this.getAllFlags().filter((f) => this.isEnabled(f.key));
  }

  getDisabledFlags(): FeatureFlag[] {
    return this.getAllFlags().filter((f) => this.isDisabled(f.key));
  }

  getEnabledCount(): number {
    return this.getEnabledFlags().length;
  }

  getDisabledCount(): number {
    return this.getDisabledFlags().length;
  }

  private getUserOverride(key: FeatureFlagKey, userId: string): boolean | null {
    try {
      const storage = typeof localStorage !== "undefined" ? localStorage : null;
      if (!storage) return null;
      const raw = storage.getItem(`ff:${userId}:${key}`);
      if (raw === null) return null;
      return raw === "1";
    } catch {
      return null;
    }
  }

  async syncFromDatabase(userId?: string): Promise<void> {
    if (userId) {
      const enabledFlags = this.getEnabledFlags();
      for (const flag of enabledFlags) {
        this.flags.set(flag.key, flag.enabled);
      }
    }
  }
}

export const featureFlags = new FeatureFlagService();
