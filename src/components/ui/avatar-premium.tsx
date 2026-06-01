"use client";

import { motion } from "framer-motion";

interface AvatarProps {
  src?: string | null;
  name?: string;
  seed?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

const sizes = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-24 h-24",
  "2xl": "w-32 h-32",
};

const styles = ["notionists", "avataaars", "bottts", "personas", "pixel-art", "fun-emoji"] as const;

function pickStyle(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
  }
  return styles[Math.abs(hash) % styles.length];
}

export function AvatarPremium({ src, name, seed, size = "md", className = "" }: AvatarProps) {
  const style = seed ? pickStyle(seed) : "notionists";
  const fallbackUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${seed || name || "edyfra"}`;
  const avatarSrc = src || fallbackUrl;

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`relative shrink-0 rounded-full overflow-hidden border-2 border-background shadow-sm bg-secondary ${sizes[size]} ${className}`}
    >
      <img
        src={avatarSrc}
        alt={name || "User Avatar"}
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = fallbackUrl;
        }}
      />
      <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-full" />
    </motion.div>
  );
}
