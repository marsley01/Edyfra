import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, Dices } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  onSelectUrl?: (url: string) => void;
  seed?: string;
  gender?: string;
}

export function AvatarPicker({ selected, onSelect, onSelectUrl, seed = "user", gender = "" }: AvatarPickerProps) {
  const [shuffleCount, setShuffleCount] = useState(0);

  // Re-emit the URL if the seed/shuffle/gender changes but a style is already selected
  useEffect(() => {
    if (selected && onSelectUrl) {
      const generatedSeed = encodeURIComponent(`${seed}-${gender}-${shuffleCount}`);
      onSelectUrl(`https://api.dicebear.com/7.x/${selected}/svg?seed=${generatedSeed}`);
    }
  }, [selected, seed, gender, shuffleCount, onSelectUrl]);

  const handleSelect = (id: AvatarStyle) => {
    onSelect(id);
    if (onSelectUrl) {
      const generatedSeed = encodeURIComponent(`${seed}-${gender}-${shuffleCount}`);
      onSelectUrl(`https://api.dicebear.com/7.x/${id}/svg?seed=${generatedSeed}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {AVATAR_STYLES.map(({ id, label }) => {
          const generatedSeed = encodeURIComponent(`${seed}-${gender}-${shuffleCount}`);
          const previewUrl = `https://api.dicebear.com/7.x/${id}/svg?seed=${generatedSeed}`;
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleSelect(id)}
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
      
      <Button
        type="button"
        variant="outline"
        onClick={() => setShuffleCount(s => s + 1)}
        className="w-full h-12 rounded-xl border-dashed border-2 hover:border-primary/50 text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2"
      >
        <Dices className="h-5 w-5" />
        <span className="text-xs font-black uppercase tracking-widest">Shuffle Avatars</span>
      </Button>
    </div>
  );
}
