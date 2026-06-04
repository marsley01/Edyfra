import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="text-6xl">🧭</div>
      <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        We couldn&apos;t find what you were looking for. The link may be old
        or the page may have moved.
      </p>
      <Link
        href="/"
        className={buttonVariants({ variant: "default", size: "default" }) + " bg-amber-500 hover:bg-amber-600 text-black"}
      >
        Back to home
      </Link>
    </div>
  );
}
