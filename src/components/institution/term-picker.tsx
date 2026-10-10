"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

/** Switches the analysed term via the `?term=YYYY-T` search param. */
export function TermPicker({
  terms,
  value,
}: {
  terms: { term: number; year: number; label: string }[];
  value: { term: number; year: number } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  if (terms.length === 0) return null;

  return (
    <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-600">
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
      <span className="uppercase tracking-widest">Term</span>
      <select
        value={value ? `${value.year}-${value.term}` : ""}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          next.set("term", e.target.value);
          next.delete("page");
          startTransition(() => router.push(`${pathname}?${next.toString()}`));
        }}
        className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {terms.map((t) => (
          <option key={`${t.year}-${t.term}`} value={`${t.year}-${t.term}`}>
            {t.label}
          </option>
        ))}
      </select>
    </label>
  );
}

