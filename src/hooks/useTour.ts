import { useEffect, useState } from "react";

export function useTour(tourId: string) {
  const [hasSeen, setHasSeen] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const seen = localStorage.getItem(`tour-seen-${tourId}`);
      setHasSeen(seen === "true");
    } catch {
      setHasSeen(true);
    }
  }, [tourId]);

  const markAsSeen = () => {
    try {
      localStorage.setItem(`tour-seen-${tourId}`, "true");
      setHasSeen(true);
    } catch {
      // ignore
    }
  };

  const resetTour = () => {
    try {
      localStorage.removeItem(`tour-seen-${tourId}`);
      setHasSeen(false);
    } catch {
      // ignore
    }
  };

  return {
    hasSeen,
    mounted,
    markAsSeen,
    resetTour,
    showTour: hasSeen === false,
  };
}
