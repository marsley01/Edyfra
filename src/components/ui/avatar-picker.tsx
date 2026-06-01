"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const AVATAR_STYLES = [
  { id: "micah", label: "Premium" },
  { id: "lorelei", label: "Aesthetic" },
  { id: "notionists", label: "Minimal" },
  { id: "adventurer", label: "Adventurer" },
  { id: "bottts", label: "Robot" },
  { id: "miniavs", label: "Avatar" },
] as const;

export type AvatarStyle = (typeof AVATAR_STYLES)[number]["id"];

interface AvatarPickerProps {
  selected: AvatarStyle | null;
  onSelect: (style: AvatarStyle) => void;
  seed?: string;
}

export function AvatarPicker({ selected, onSelect, seed = "user" }: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {AVATAR_STYLES.map(({ id, label }) => {
        const previewUrl = `https://api.dicebear.com/7.x/${id}/svg?seed=${seed}`;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={cn(
              "relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
              selected === id
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                : "border-border bg-secondary/50 hover:border-primary/40"
            )}
          >
            <div className="w-16 h-16 rounded-full overflow-hidden bg-background">
              <img
                src={previewUrl}
                alt={label}
                className="w-full h-full object-cover"
              />
            </div>
            <span className={cn(
              "text-[9px] font-black uppercase tracking-widest",
              selected === id ? "text-primary" : "text-muted-foreground"
            )}>
              {label}
            </span>
            {selected === id && (
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
