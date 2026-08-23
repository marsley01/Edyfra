"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUp, Bot } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const mockMessages = [
  {
    role: "student",
    text: "I keep getting confused with quadratic equations — I never know when to factorise vs use the formula.",
  },
  {
    role: "mash",
    text: "Great question. Let's figure out which method fits best. Can you show me the equation you're working on right now?",
  },
  {
    role: "student",
    text: "It's 2x² + 5x - 3 = 0",
  },
  {
    role: "mash",
    text: "Perfect. Before I show you the answer — check the coefficient of x². What does that tell you about which method to try first?",
  },
];

export function MashSpotlight() {
  return (
    <section className="px-4 py-20 md:px-16">
      <div className="mx-auto max-w-screen-2xl">
        <div className="grid grid-cols-1 items-center gap-20 lg:grid-cols-2">
          {/* Left — Copy */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
            className="space-y-lg"
          >
            <span className="block uppercase tracking-[0.18em] text-label-sm text-brand-orange">
              AI Study Companion
            </span>
            <h2 className="text-headline-lg font-bold md:text-[48px] md:leading-[56px]">
              Meet Mash — <br />
              your AI study companion.
            </h2>
            <p className="max-w-md text-body-lg text-on-surface-variant">
              Mash steps in when no partner is available, guides you through tough questions
              without giving you the answers, and remembers your subject so every conversation
              feels personal. No cap, it&apos;s a lifesaver.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <Link
                href="/signup"
                className="primary-glow-hover transition-smooth inline-flex items-center justify-center rounded-full bg-white px-12 py-6 text-title-md font-bold text-deep-void hover:bg-brand-orange"
              >
                Try Mash
              </Link>
              <div className="flex items-center gap-3 text-label-md text-emerald-energy">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-energy" />
                Always available
              </div>
            </div>
          </motion.div>

          {/* Right — Mock Chat */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
            className="glass-card relative flex h-[500px] flex-col p-3 md:p-6"
          >
            {/* Chat Header */}
            <div className="mb-6 flex items-center gap-3 border-b border-glass-stroke pb-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange to-brand-orange-dark shadow-lg">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="text-title-md font-bold">Mash AI</h4>
                <span className="text-label-sm text-emerald-energy">Online</span>
              </div>
            </div>

            {/* Messages */}
            <div className="mb-6 flex flex-1 flex-col gap-6 overflow-y-auto pr-3">
              {mockMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className={`flex ${msg.role === "student" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-body-md shadow-lg md:p-6 ${
                      msg.role === "student"
                        ? "chat-bubble-user self-end text-on-surface"
                        : "chat-bubble-ai self-start shadow-brand-orange/20"
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Input Bar (visual only) */}
            <div className="relative mt-auto pt-sm">
              <input
                aria-hidden="true"
                tabIndex={-1}
                className="w-full rounded-full border border-glass-stroke bg-surface-container py-6 pl-6 pr-12 text-body-md text-on-surface placeholder:text-outline-variant"
                placeholder="Ask Mash anything..."
                type="text"
                readOnly
              />
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                className="absolute right-xs top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-brand-orange text-deep-void transition-colors hover:bg-brand-orange-dark"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
