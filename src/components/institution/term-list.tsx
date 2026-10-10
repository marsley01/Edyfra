"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/lib/toast";
import { deleteAcademicTerm, setCurrentAcademicTerm, type AcademicTermRow } from "@/app/actions/institution-manage";

/** All academic terms with result counts; switch the current term or remove a calendar entry. */
export function TermList({ terms }: { terms: AcademicTermRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (terms.length === 0) {
    return <p className="text-xs text-gray-500">No terms saved yet. Add the current term above.</p>;
  }

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string) {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        showError({ title: "Couldn't update the calendar", cause: res.error, fix: "Refresh and try again." });
        return;
      }
      showSuccess(success);
      router.refresh();
    });
  }

  return (
    <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
      {terms.map((t) => (
        <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
          <div>
            <p className="text-sm font-bold text-gray-900">
              Term {t.term} {t.year}
              {t.isCurrent && (
                <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                  current
                </span>
              )}
            </p>
            <p className="text-[11px] text-gray-500">
              {format(new Date(t.startDate), "d MMM")} – {format(new Date(t.endDate), "d MMM yyyy")}
              {t.holidayStart && t.holidayEnd
                ? ` · holiday ${format(new Date(t.holidayStart), "d MMM")} – ${format(new Date(t.holidayEnd), "d MMM")}`
                : ""}
              {` · ${t.results} result${t.results === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
            {!t.isCurrent && (
              <>
                <Button
                  size="xs"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => run(() => setCurrentAcademicTerm(t.id), `Term ${t.term} ${t.year} is now current`)}
                >
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Make current
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  disabled={pending}
                  aria-label={`Delete Term ${t.term} ${t.year}`}
                  onClick={() => {
                    if (!confirm(`Remove Term ${t.term} ${t.year} from the calendar? Uploaded results are kept.`)) return;
                    run(() => deleteAcademicTerm(t.id), "Term removed");
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
