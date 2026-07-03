"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleFavorite, isFavorite } from "@/app/actions/favorites";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  userId: string;
  className?: string;
}

export default function FavoriteButton({ userId, className }: FavoriteButtonProps) {
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      const result = await isFavorite(userId);
      setFavorited(result);
      setLoading(false);
    }
    check();
  }, [userId]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    
    setLoading(true);
    const result = await toggleFavorite(userId);
    if (result.success) {
      setFavorited(result.isFavorited!);
    }
    setLoading(false);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "rounded-full transition-all active:scale-95 w-8 h-8",
        favorited ? "text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10",
        className
      )}
      title={favorited ? "Remove Favorite" : "Add Favorite"}
    >
      <Star className={cn("h-4 w-4", favorited && "fill-current")} />
    </Button>
  );
}
