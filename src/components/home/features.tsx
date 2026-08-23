"use client";

import { motion } from "framer-motion";
import { ArrowRight, Newspaper } from "lucide-react";
import Link from "next/link";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const resourceTags = ["Revision Notes", "Past Papers", "Study Guides"];

export function HomeFeatures() {
  return (
    <section className="px-4 py-20 md:px-16">
      {/* Section heading */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: EASE }}
        className="mx-auto mb-20 max-w-screen-2xl md:text-left"
      >
        <h2 className="mb-3 max-w-3xl text-balance text-headline-lg font-bold md:text-[40px] md:leading-[48px]">
          Built for the way students, tutors, and institutions actually grow.
        </h2>
        <p className="max-w-2xl text-body-md text-on-surface-variant">
          Every section is built around a simple question: what do you need next to keep learning
          moving?
        </p>
      </motion.div>

      {/* Bento grid */}
      <div className="bento-grid mx-auto max-w-screen-2xl">
        {/* Resource Library */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: EASE }}
          className="glass-card group col-span-12 flex cursor-pointer flex-col justify-between p-12 transition-smooth hover:border-brand-orange/50 md:col-span-8"
        >
          <div>
            <div className="mb-6 flex flex-wrap gap-3">
              {resourceTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-surface-container px-3 py-1 text-label-sm text-brand-orange"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h3 className="mb-3 text-title-md font-bold">Resource Library</h3>
            <p className="text-body-md text-on-surface-variant">
              Find past papers, notes, and study guides that match what you are learning instead of
              digging through random files. No cap, it saves hours.
            </p>
          </div>
          <div className="mt-12">
            <Link
              href="/features"
              aria-label="Learn more about the Resource Library"
              className="inline-flex items-center gap-1 text-label-md text-on-surface transition-colors group-hover:text-brand-orange"
            >
              Learn more about Resource Library{" "}
              <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </motion.div>

        {/* Verified Mentors */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.08, ease: EASE }}
          className="glass-card group col-span-12 flex cursor-pointer flex-col justify-between p-12 transition-smooth hover:border-brand-orange/50 md:col-span-4"
        >
          <div>
            <div className="mb-6 flex flex-wrap gap-3">
              {["Mentor", "Peer"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-tertiary/10 px-3 py-1 text-label-sm text-tertiary"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h3 className="mb-3 text-title-md font-bold">Verified Mentors</h3>
            <p className="text-body-md text-on-surface-variant">
              Ask for help from tutors and high-performing peers who understand the Kenyan
              classroom.
            </p>
          </div>
          <div className="mt-12">
            <Link
              href="/dashboard/tutors"
              aria-label="Explore verified mentors"
              className="inline-flex items-center gap-1 text-label-md text-tertiary transition-colors group-hover:text-brand-orange"
            >
              Explore Mentors{" "}
              <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </motion.div>

        {/* Institution Hubs */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: EASE }}
          className="glass-card group col-span-12 flex cursor-pointer flex-col justify-between p-12 transition-smooth hover:border-brand-orange/50 md:col-span-4"
        >
          <div>
            <div className="mb-6 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-label-sm text-outline">School Adoption</span>
                <span className="text-label-md font-bold text-brand-orange">82%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "82%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.3, ease: EASE }}
                  className="h-1.5 rounded-full bg-gradient-to-r from-brand-orange to-brand-orange-dark"
                />
              </div>
            </div>
            <h3 className="mb-3 text-title-md font-bold">Institution Hubs</h3>
            <p className="text-body-md text-on-surface-variant">
              Schools can onboard cohorts, manage tutor rosters, and follow student engagement.
            </p>
          </div>
          <div className="mt-12">
            <Link
              href="/institution"
              aria-label="Learn more about institution hubs"
              className="inline-flex items-center gap-1 text-label-md text-on-surface transition-colors group-hover:text-brand-orange"
            >
              For Institutions{" "}
              <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </motion.div>

        {/* News Room */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.08, ease: EASE }}
          className="glass-card group relative col-span-12 flex cursor-pointer flex-col justify-between gap-6 overflow-hidden p-12 transition-smooth hover:border-brand-orange/50 md:flex-row md:items-center md:col-span-8"
        >
          <div
            aria-hidden="true"
            className="absolute bottom-0 right-0 -z-10 h-64 w-64 translate-x-1/2 translate-y-1/4 rounded-full bg-brand-orange/10 blur-3xl transition-colors group-hover:bg-brand-orange/10"
          />
          <div className="max-w-md">
            <span className="mb-3 block uppercase tracking-[0.18em] text-label-sm text-brand-orange transition-colors group-hover:text-brand-orange">
              News Room
            </span>
            <h3 className="mb-3 text-headline-lg font-bold">Latest from Edyfra.</h3>
            <p className="text-body-md text-on-surface-variant">
              News, platform notes, and study updates worth checking before your next session.
            </p>
          </div>
          <div>
            <Link
              href="/news"
              aria-label="Open the news room"
              className="glass-panel transition-smooth inline-flex items-center gap-3 rounded-full px-6 py-3 text-label-md font-bold hover:border-brand-orange hover:bg-brand-orange hover:text-deep-void"
            >
              Open News Room <Newspaper className="h-[18px] w-[18px]" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
