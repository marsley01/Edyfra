"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  MessageSquare,
  MapPin,
  ChevronDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { showError, showSuccess } from "@/lib/toast";

const CONTACT_EMAIL = "edyfraplatform@gmail.com";
const WHATSAPP_CHANNEL = "https://whatsapp.com/channel/0029Vb7GgdmHLHQfoNgSjo1P";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const faqs = [
  {
    q: "How does Edyfra match me with a study partner?",
    a: "We look at your subject, level, and study preferences to find the best tutor or peer for you — in real time. Think of it as a smart study buddy finder.",
  },
  {
    q: "Is Edyfra for high school students only?",
    a: "Nope! Edyfra works for both High School (Form 1 to 4) and University students. Content is separated so everyone learns at the right level.",
  },
  {
    q: "How do I become a tutor on Edyfra?",
    a: "Just apply through the app! We'll review your academic background and credentials. Once approved, you can start earning by helping other students.",
  },
  {
    q: "Can I use Edyfra without internet?",
    a: "You'll need an internet connection to use Edyfra since we match you with study partners and tutors in real time.",
  },
];

type FieldErrors = Partial<Record<"name" | "email" | "subject" | "message", string>>;

export default function ContactPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", website: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FieldErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!form.name.trim() || form.name.trim().length < 2) {
      next.name = "Tell us your name (at least 2 characters).";
    }
    if (!form.email.trim() || !EMAIL_REGEX.test(form.email.trim())) {
      next.email = "That email doesn't look right — double-check the spelling.";
    }
    if (!form.message.trim() || form.message.trim().length < 10) {
      next.message = "Give us a bit more — at least 10 characters so we can help.";
    }
    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) {
      showError({
        title: "A couple of fields need fixing",
        cause: "We can't send your message until the highlighted fields are filled in correctly.",
        fix: "Scroll up, fix what's red, then hit Send again.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) {
        if (res.status === 429) {
          showError({
            title: "Whoa — slow down a sec",
            cause: "You've sent a few messages in a short time.",
            fix: "Give it a minute and try again.",
          });
        } else {
          showError({
            title: "We couldn't send your message",
            cause: data.error || "Something went wrong delivering it.",
            fix: `Try again, or email us directly at ${CONTACT_EMAIL}.`,
          });
        }
        return;
      }
      setSent(true);
      setForm({ name: "", email: "", subject: "", message: "", website: "" });
      showSuccess("Message sent — thank you!", {
        description: "We'll get back to you over email, usually within a day.",
      });
    } catch (err) {
      showError({
        title: "We can't reach our servers right now",
        cause: "Your connection dropped or our servers blinked.",
        fix: `Try again in a moment, or email us at ${CONTACT_EMAIL}.`,
        raw: err,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-background pt-32 pb-48">
      <div className="container-max space-y-32">
        {/* Header */}
        <div className="max-w-3xl space-y-6">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Talk to Us</p>
          <h1 className="text-6xl md:text-8xl font-black tracking-tightest leading-none">
            We&apos;d love to <br /> <span className="text-muted-foreground">hear from you.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed">
            Got a question, feedback, or just want to say hi? Drop us a message and we&apos;ll get back to you as soon as we can.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
          {/* Form Side */}
          <form onSubmit={handleSubmit} className="space-y-12" noValidate>
            {sent ? (
              <div className="rounded-[2rem] border border-emerald-500/30 bg-emerald-500/5 p-8 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h2 className="text-2xl font-black tracking-tightest">Message on its way!</h2>
                <p className="text-muted-foreground font-medium leading-relaxed">
                  Thanks, {form.name?.split(" ")[0] || "friend"}. We&apos;ll reply to the email you gave us — usually within a day.
                </p>
                <Button
                  type="button"
                  onClick={() => setSent(false)}
                  variant="outline"
                  className="h-12 px-6 rounded-full border-2 font-black text-[10px] tracking-widest uppercase"
                >
                  Send another
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field label="Full Name" error={errors.name}>
                      <Input
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        placeholder="e.g. Brian Kimani"
                        className={cn(
                          "h-14 rounded-2xl px-6 border-border bg-secondary",
                          errors.name && "border-red-500/60 focus-visible:ring-red-500",
                        )}
                        required
                        autoComplete="name"
                      />
                    </Field>
                    <Field label="Email Address" error={errors.email}>
                      <Input
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        placeholder="you@example.com"
                        type="email"
                        className={cn(
                          "h-14 rounded-2xl px-6 border-border bg-secondary",
                          errors.email && "border-red-500/60 focus-visible:ring-red-500",
                        )}
                        required
                        autoComplete="email"
                      />
                    </Field>
                  </div>
                  <Field label="Subject" error={errors.subject}>
                    <Input
                      value={form.subject}
                      onChange={(e) => update("subject", e.target.value)}
                      placeholder="What is this about?"
                      className="h-14 rounded-2xl px-6 border-border bg-secondary"
                    />
                  </Field>
                  <Field label="Your Message" error={errors.message}>
                    <Textarea
                      value={form.message}
                      onChange={(e) => update("message", e.target.value)}
                      placeholder="Tell us how we can help..."
                      className={cn(
                        "min-h-[200px] rounded-[2rem] px-6 py-4 border-border bg-secondary resize-none",
                        errors.message && "border-red-500/60 focus-visible:ring-red-500",
                      )}
                      maxLength={5000}
                      required
                    />
                    <p className="text-[10px] text-muted-foreground/70 ml-4 mt-1">
                      {form.message.length}/5000
                    </p>
                  </Field>
                  {/* Honey-pot for bots — hidden from humans, never tab-focused. */}
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    value={form.website}
                    onChange={(e) => update("website", e.target.value)}
                    className="hidden"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-16 px-12 rounded-full bg-foreground text-background font-black text-xs tracking-widest uppercase shadow-2xl transition-all active:scale-95 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      Send Message <Send className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </>
            )}
          </form>

          {/* Info Side */}
          <div className="space-y-16">
            <div className="space-y-8">
              <h3 className="text-2xl font-black tracking-tight">How to Reach Us</h3>
              <div className="space-y-6">
                <ContactRow
                  icon={Mail}
                  label="Email Us"
                  value={CONTACT_EMAIL}
                  href={`mailto:${CONTACT_EMAIL}`}
                />
                <ContactRow
                  icon={MessageSquare}
                  label="WhatsApp Community"
                  value="Join our WhatsApp"
                  href={WHATSAPP_CHANNEL}
                  external
                />
                <ContactRow icon={MapPin} label="Based In" value="Nairobi, Kenya" />
              </div>
            </div>

            {/* FAQ Accordion */}
            <div className="space-y-8">
              <h3 className="text-2xl font-black tracking-tight">Frequently Asked Questions</h3>
              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <div key={i} className="border-b border-border">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full py-6 flex items-center justify-between text-left group"
                      aria-expanded={openFaq === i}
                    >
                      <span className="text-lg font-bold group-hover:text-primary transition-colors">
                        {faq.q}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 text-muted-foreground transition-transform",
                          openFaq === i && "rotate-180",
                        )}
                      />
                    </button>
                    <AnimatePresence>
                      {openFaq === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <p className="pb-8 text-muted-foreground font-medium leading-relaxed">
                            {faq.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-widest ml-4">{label}</label>
      {children}
      {error && (
        <p className="ml-4 text-xs font-bold text-red-500 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
  external,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
}) {
  const body = (
    <div className="flex items-center gap-6 p-6 bg-secondary rounded-[2rem] border border-border/50 hover:border-primary/30 transition-all group">
      <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center text-primary shadow-sm border border-border group-hover:bg-primary group-hover:text-white transition-all">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );

  if (!href) return body;
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="block cursor-pointer"
    >
      {body}
    </Link>
  );
}
