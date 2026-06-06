"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateStudentInsight, emailInsightToTeacher } from "@/app/actions/institution-ai";

export function StudentInsightButton({
  studentUserId,
  term,
  year,
  hasExisting,
}: {
  studentUserId: string;
  term: number;
  year: number;
  hasExisting: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [emailing, setEmailing] = useState(false);
  const router = useRouter();

  function onGenerate() {
    startTransition(async () => {
      const res = await generateStudentInsight({ studentUserId, term, year });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Insight generated");
      router.refresh();
    });
  }

  async function onEmail() {
    setEmailing(true);
    const res = await emailInsightToTeacher(studentUserId, term, year);
    setEmailing(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Emailed ${res.count} teachers`);
  }

  return (
    <div className="flex items-center gap-2">
      {hasExisting && (
        <Button variant="outline" size="sm" onClick={onEmail} disabled={emailing} className="border-gray-200">
          {emailing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Mail className="mr-1 h-3.5 w-3.5" />}
          Email teachers
        </Button>
      )}
      <Button
        size="sm"
        onClick={onGenerate}
        disabled={pending}
        className="bg-indigo-600 hover:bg-indigo-700"
      >
        {pending ? (
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="mr-1 h-3.5 w-3.5" />
        )}
        {hasExisting ? "Regenerate" : "Generate insight"}
      </Button>
    </div>
  );
}
