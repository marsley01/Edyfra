import Link from "next/link";
import { Check, Code2, LineChart, Brain, Users } from "lucide-react";
import { COURSE } from "@/config/course-mode";

const MODULES = [
  { week: "Weeks 1–2", title: "Python & Data Foundations", body: "Python, NumPy, pandas, data cleaning and visualisation with real datasets." },
  { week: "Weeks 3–4", title: "Statistics & Exploratory Analysis", body: "Probability, hypothesis testing, feature engineering and storytelling with data." },
  { week: "Weeks 5–6", title: "Machine Learning", body: "Regression, classification, trees, ensembles, model evaluation with scikit-learn." },
  { week: "Weeks 7–8", title: "Projects & Deployment", body: "Neural network basics, a capstone project, and shipping a model as a working app." },
];

const INCLUDED = [
  "2 months of live teaching",
  "Hands-on coding in every session",
  "Real datasets and a capstone project",
  "Access to Mash AI study help",
  "Certificate of completion",
];

export function CourseLanding() {
  const price = COURSE.priceKes.toLocaleString("en-KE");
  return (
    <>
      <section className="relative overflow-hidden px-4 pb-16 pt-20 text-center md:px-16 md:pt-28">
        <p className="mb-4 text-label-md font-bold uppercase tracking-widest text-brand-orange">
          Now enrolling · {COURSE.duration}
        </p>
        <h1 className="mx-auto max-w-4xl bg-gradient-to-r from-brand-orange to-[#ffc107] bg-clip-text text-4xl font-black tracking-tight text-transparent md:text-7xl md:leading-[1.05]">
          Learn Machine Learning &amp; Data Science
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-lg font-medium text-on-surface-variant md:text-2xl">
          Learn by coding. Two months of live teaching that takes you from Python basics to
          building and deploying real ML projects.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row md:gap-6">
          <a
            href={COURSE.enrollHref}
            target="_blank"
            rel="noreferrer"
            className="primary-glow primary-glow-hover transition-smooth inline-flex w-full items-center justify-center rounded-full bg-brand-orange px-12 py-5 text-title-md font-bold text-deep-void hover:bg-brand-orange-dark sm:w-auto"
          >
            Enrol · KES {price}
          </a>
          <Link
            href="/signup"
            className="glass-panel transition-smooth inline-flex w-full items-center justify-center rounded-full px-12 py-5 text-title-md font-semibold text-on-surface hover:text-brand-orange sm:w-auto"
          >
            Create free account
          </Link>
        </div>
        <p className="mt-8 inline-flex items-center gap-2 text-label-md text-outline">
          <Users className="h-4 w-4" /> Trusted by {COURSE.studentsTrusted} students
        </p>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 md:grid-cols-3 md:px-16">
        {[
          { Icon: Code2, t: "Code every session", d: "No slide-only lectures. You write and run code in class." },
          { Icon: LineChart, t: "Real data", d: "Work on practical datasets, not toy examples." },
          { Icon: Brain, t: "Build a portfolio", d: "Finish with a capstone model you can show employers." },
        ].map(({ Icon, t, d }) => (
          <div key={t} className="glass-panel rounded-xl p-8">
            <Icon className="mb-4 h-7 w-7 text-brand-orange" />
            <h3 className="mb-2 text-title-md font-bold text-on-surface">{t}</h3>
            <p className="text-on-surface-variant">{d}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 md:px-16">
        <h2 className="mb-10 text-center text-3xl font-black text-on-surface md:text-5xl">What you will learn</h2>
        <div className="space-y-4">
          {MODULES.map((m) => (
            <div key={m.title} className="glass-panel rounded-xl p-6">
              <p className="text-label-sm font-bold uppercase tracking-widest text-brand-orange">{m.week}</p>
              <h3 className="mt-1 text-title-md font-bold text-on-surface">{m.title}</h3>
              <p className="mt-1 text-on-surface-variant">{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-xl px-4 py-16 md:px-16">
        <div className="glass-panel rounded-2xl border border-brand-orange/40 p-10 text-center">
          <p className="text-label-md font-bold uppercase tracking-widest text-brand-orange">{COURSE.name}</p>
          <p className="mt-4 text-6xl font-black text-on-surface">KES {price}</p>
          <p className="mt-1 text-outline">for {COURSE.duration} of teaching</p>
          <ul className="mt-8 space-y-3 text-left">
            {INCLUDED.map((i) => (
              <li key={i} className="flex items-start gap-3 text-on-surface">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-energy" /> {i}
              </li>
            ))}
          </ul>
          <a
            href={COURSE.enrollHref}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-brand-orange px-8 py-4 font-bold text-deep-void hover:bg-brand-orange-dark"
          >
            Enrol now
          </a>
        </div>
      </section>
    </>
  );
}
